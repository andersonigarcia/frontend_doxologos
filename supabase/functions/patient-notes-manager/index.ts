import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                global: {
                    headers: { Authorization: req.headers.get('Authorization')! },
                },
            }
        )

        // Admin client para bypass de RLS nas limpezas
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized - Invalid or missing authentication token' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const { data: professional, error: professionalError } = await supabaseClient
            .from('professionals')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle()

        if (professionalError) {
            return new Response(
                JSON.stringify({ error: 'Error fetching professional data' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        if (!professional) {
            return new Response(
                JSON.stringify({ error: 'Professional record not found for this user' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const body = await req.json()
        const { action, patient_email, patient_name, notes, chief_complaint, session_development, homework, session_date, homework_visible_to_patient } = body

        if (!action) {
            return new Response(
                JSON.stringify({ error: 'Missing required field: action' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        if (!patient_email) {
            return new Response(
                JSON.stringify({ error: 'Missing required field: patient_email' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // ─── GET: buscar nota atual ────────────────────────────────────────────
        if (action === 'get') {
            const { data, error } = await supabaseClient
                .from('patient_notes')
                .select('*')
                .eq('professional_id', professional.id)
                .eq('patient_email', patient_email)
                .maybeSingle()

            if (error) {
                return new Response(
                    JSON.stringify({ error: 'Error fetching patient notes' }),
                    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            return new Response(
                JSON.stringify({
                    success: true,
                    notes: data?.notes || '',
                    chief_complaint: data?.chief_complaint || '',
                    session_development: data?.session_development || '',
                    homework: data?.homework || '',
                    session_date: data?.session_date || null,
                    patient_name: data?.patient_name || null,
                    created_at: data?.created_at || null,
                    updated_at: data?.updated_at || null
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // ─── LIST_HISTORY: retornar snapshots anteriores ──────────────────────
        if (action === 'list_history') {
            const { data, error } = await supabaseAdmin
                .from('patient_notes_history')
                .select('id, chief_complaint, session_development, homework, notes, session_date, saved_at, homework_visible_to_patient')
                .eq('professional_id', professional.id)
                .eq('patient_email', patient_email)
                .order('session_date', { ascending: false })
                .limit(20)

            if (error) {
                console.error('Erro ao listar histórico:', error)
                return new Response(
                    JSON.stringify({ error: 'Error fetching notes history' }),
                    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            return new Response(
                JSON.stringify({ success: true, history: data || [] }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // ─── SAVE: upsert nota + gravar snapshot no histórico ─────────────────
        if (action === 'save') {
            const hasContent = (
                (notes && notes.trim()) ||
                (chief_complaint && chief_complaint.trim()) ||
                (session_development && session_development.trim()) ||
                (homework && homework.trim())
            )

            // Se tudo vazio, apagar registro atual (mas preservar histórico)
            if (!hasContent) {
                await supabaseClient
                    .from('patient_notes')
                    .delete()
                    .eq('professional_id', professional.id)
                    .eq('patient_email', patient_email)

                return new Response(
                    JSON.stringify({ success: true, message: 'Notes deleted successfully' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            const upsertPayload = {
                professional_id: professional.id,
                patient_email,
                patient_name: patient_name || null,
                notes: notes?.trim() || null,
                chief_complaint: chief_complaint?.trim() || null,
                session_development: session_development?.trim() || null,
                homework: homework?.trim() || null,
                homework_visible_to_patient: Boolean(homework_visible_to_patient),
                session_date: session_date || new Date().toISOString().split('T')[0],
                updated_at: new Date().toISOString()
            }

            const { data, error } = await supabaseClient
                .from('patient_notes')
                .upsert(upsertPayload, { onConflict: 'professional_id,patient_email' })
                .select()
                .single()

            if (error) {
                console.error('Error saving patient notes:', error)
                return new Response(
                    JSON.stringify({ error: 'Error saving patient notes', details: error }),
                    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            // Gravar snapshot imutável no histórico (Bypass RLS para garantir gravação)
            const { error: histErr } = await supabaseAdmin
                .from('patient_notes_history')
                .insert({
                    patient_note_id: data.id,
                    professional_id: professional.id,
                    patient_email,
                    chief_complaint: chief_complaint?.trim() || null,
                    session_development: session_development?.trim() || null,
                    homework: homework?.trim() || null,
                    homework_visible_to_patient: Boolean(homework_visible_to_patient),
                    notes: notes?.trim() || null,
                    session_date: session_date || new Date().toISOString().split('T')[0],
                })

            if (histErr) {
                console.error('Erro ao gravar histórico (não bloqueante):', histErr)
            }

            // Após gravar no histórico, limpa os campos estruturados da tabela principal 
            // Usamos supabaseAdmin para ignorar possíveis bloqueios de RLS no UPDATE
            const { error: updateErr } = await supabaseAdmin
                .from('patient_notes')
                .update({
                    chief_complaint: null,
                    session_development: null,
                    homework: null,
                    notes: null,
                    homework_visible_to_patient: false,
                })
                .eq('id', data.id);
            
            if (updateErr) {
                console.error('Erro ao limpar patient_notes:', updateErr);
            }

            return new Response(
                JSON.stringify({ success: true, message: 'Notes saved successfully', data, updateErr }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        return new Response(
            JSON.stringify({ error: `Invalid action: ${action}. Supported: get, save, list_history` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Unexpected error:', error)
        return new Response(
            JSON.stringify({ error: 'Internal server error', message: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
