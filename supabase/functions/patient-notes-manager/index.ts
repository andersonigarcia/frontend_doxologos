import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Create Supabase client with user's auth token
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                global: {
                    headers: { Authorization: req.headers.get('Authorization')! },
                },
            }
        )

        // Get the authenticated user
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized - Invalid or missing authentication token' }),
                {
                    status: 401,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        // Get the professional record for this user
        const { data: professional, error: professionalError } = await supabaseClient
            .from('professionals')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle()

        if (professionalError) {
            console.error('Error fetching professional:', professionalError)
            return new Response(
                JSON.stringify({ error: 'Error fetching professional data' }),
                {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        if (!professional) {
            return new Response(
                JSON.stringify({ error: 'Professional record not found for this user' }),
                {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        // Parse request body
        const { action, patient_email, patient_name, notes } = await req.json()

        // Validate required fields
        if (!action) {
            return new Response(
                JSON.stringify({ error: 'Missing required field: action' }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        if (!patient_email) {
            return new Response(
                JSON.stringify({ error: 'Missing required field: patient_email' }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        // Handle GET action - retrieve notes for a patient
        if (action === 'get') {
            const { data, error } = await supabaseClient
                .from('patient_notes')
                .select('*')
                .eq('professional_id', professional.id)
                .eq('patient_email', patient_email)
                .maybeSingle()

            if (error) {
                console.error('Error fetching patient notes:', error)
                return new Response(
                    JSON.stringify({ error: 'Error fetching patient notes' }),
                    {
                        status: 500,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    }
                )
            }

            return new Response(
                JSON.stringify({
                    success: true,
                    notes: data?.notes || '',
                    patient_name: data?.patient_name || null,
                    created_at: data?.created_at || null,
                    updated_at: data?.updated_at || null
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                }
            )
        }

        // Handle SAVE action - create or update notes for a patient
        if (action === 'save') {
            if (notes === undefined || notes === null) {
                return new Response(
                    JSON.stringify({ error: 'Missing required field: notes' }),
                    {
                        status: 400,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    }
                )
            }

            // If notes are empty, delete the record
            if (notes.trim() === '') {
                const { error: deleteError } = await supabaseClient
                    .from('patient_notes')
                    .delete()
                    .eq('professional_id', professional.id)
                    .eq('patient_email', patient_email)

                if (deleteError) {
                    console.error('Error deleting patient notes:', deleteError)
                    return new Response(
                        JSON.stringify({ error: 'Error deleting patient notes' }),
                        {
                            status: 500,
                            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                        }
                    )
                }

                return new Response(
                    JSON.stringify({
                        success: true,
                        message: 'Notes deleted successfully'
                    }),
                    {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    }
                )
            }

            // Upsert the notes
            const { data, error } = await supabaseClient
                .from('patient_notes')
                .upsert({
                    professional_id: professional.id,
                    patient_email: patient_email,
                    patient_name: patient_name || null,
                    notes: notes.trim(),
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'professional_id,patient_email'
                })
                .select()
                .single()

            if (error) {
                console.error('Error saving patient notes:', error)
                return new Response(
                    JSON.stringify({ error: 'Error saving patient notes' }),
                    {
                        status: 500,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    }
                )
            }

            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'Notes saved successfully',
                    data: data
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                }
            )
        }

        // Invalid action
        return new Response(
            JSON.stringify({ error: `Invalid action: ${action}. Supported actions: get, save` }),
            {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )

    } catch (error) {
        console.error('Unexpected error:', error)
        return new Response(
            JSON.stringify({
                error: 'Internal server error',
                message: error.message
            }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    }
})
