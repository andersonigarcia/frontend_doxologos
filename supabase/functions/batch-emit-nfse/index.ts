// supabase/functions/batch-emit-nfse/index.ts
// Fase 3B: Enfileira emissões de NFSe em lote via background_tasks_queue
// Não chama a prefeitura diretamente — delega ao pg_cron/process-background-queue
// para processar em cadência segura e evitar rate-limit do BHISS.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

declare const Deno: any;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Cliente com auth do usuário para validar posse dos bookings
        const supabaseUser = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        );

        // Cliente de serviço para inserir na fila sem restrições de RLS
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Buscar professional_id do usuário autenticado
        const { data: professional, error: profError } = await supabaseUser
            .from('professionals')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

        if (profError || !professional) {
            return new Response(
                JSON.stringify({ error: 'Professional record not found' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const { booking_ids } = await req.json();

        if (!booking_ids || !Array.isArray(booking_ids) || booking_ids.length === 0) {
            return new Response(
                JSON.stringify({ error: 'booking_ids must be a non-empty array' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        if (booking_ids.length > 100) {
            return new Response(
                JSON.stringify({ error: 'Maximum of 100 bookings per batch request' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 1) Validar que os bookings pertencem a esse profissional e estão confirmados
        const { data: validBookings, error: bErr } = await supabaseUser
            .from('bookings')
            .select('id, status')
            .in('id', booking_ids)
            .eq('professional_id', professional.id)
            .eq('status', 'confirmed');

        if (bErr) {
            return new Response(
                JSON.stringify({ error: 'Error validating bookings', details: bErr.message }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const validIds = new Set((validBookings || []).map((b: any) => b.id));

        // 2) Verificar quais já têm NFSe emitida com sucesso (idempotência)
        const { data: existingEmissions } = await supabaseAdmin
            .from('nfse_emissions')
            .select('booking_id, status')
            .in('booking_id', Array.from(validIds));

        const alreadyEmitted = new Set(
            (existingEmissions || [])
                .filter((e: any) => e.status === 'issued')
                .map((e: any) => e.booking_id)
        );

        // 3) Separar os elegíveis para enfileirar
        const toEnqueue = Array.from(validIds).filter(id => !alreadyEmitted.has(id));
        const skipped = booking_ids.filter((id: string) => !validIds.has(id));

        if (toEnqueue.length === 0) {
            return new Response(
                JSON.stringify({
                    success: true,
                    enqueued: 0,
                    already_emitted: alreadyEmitted.size,
                    skipped: skipped.length,
                    message: 'Nenhum booking elegível para emissão neste lote.'
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 4) Inserir tarefas na fila de background
        const tasks = toEnqueue.map((booking_id: string) => ({
            task_type: 'emit_nfse',
            payload: JSON.stringify({ booking_id }),
            status: 'pending',
            created_at: new Date().toISOString(),
        }));

        const { error: queueErr } = await supabaseAdmin
            .from('background_tasks_queue')
            .insert(tasks);

        if (queueErr) {
            console.error('Erro ao inserir na fila:', queueErr);
            return new Response(
                JSON.stringify({ error: 'Error queuing NFSe tasks', details: queueErr.message }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        console.log(`[batch-emit-nfse] Enfileiradas ${toEnqueue.length} emissões para profissional ${professional.id}`);

        return new Response(
            JSON.stringify({
                success: true,
                enqueued: toEnqueue.length,
                already_emitted: alreadyEmitted.size,
                skipped: skipped.length,
                message: `${toEnqueue.length} NFSe(s) enfileiradas com sucesso. Serão processadas automaticamente em breve.`
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (err: any) {
        console.error('Unexpected error:', err);
        return new Response(
            JSON.stringify({ error: 'Internal server error', message: err.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
