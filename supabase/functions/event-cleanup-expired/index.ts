// Supabase Edge Function (Deno) - event-cleanup-expired
// Env expected: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Purpose: Cancel pending event registrations older than 24 hours.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export default async function handler(req: Request) {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !supabaseKey) {
            console.error('❌ Supabase credentials missing');
            return new Response(
                JSON.stringify({ error: 'Supabase credentials missing' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        console.log('🔍 Iniciando limpeza de inscrições expiradas...');

        // Calcular data limite (24 horas atrás)
        const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        console.log(`⏰ Data limite para expiração: ${cutoffDate}`);

        // Buscar inscrições pendentes antigas
        const { data: expiredRegistrations, error: fetchError } = await supabase
            .from('inscricoes_eventos')
            .select('id, patient_email, created_at, evento_id')
            .eq('status', 'pending')
            .lt('created_at', cutoffDate);

        if (fetchError) {
            console.error('❌ Erro ao buscar inscrições:', fetchError);
            throw fetchError;
        }

        console.log(`📋 Encontradas ${expiredRegistrations?.length || 0} inscrições para cancelar.`);

        const results = {
            processed: 0,
            errors: [] as string[]
        };

        if (expiredRegistrations && expiredRegistrations.length > 0) {
            const idsToCancel = expiredRegistrations.map(r => r.id);

            // Atualizar status para 'cancelled' e payment_status para 'expired'
            const { error: updateError } = await supabase
                .from('inscricoes_eventos')
                .update({
                    status: 'cancelled',
                    payment_status: 'expired',
                    updated_at: new Date().toISOString()
                })
                .in('id', idsToCancel);

            if (updateError) {
                console.error('❌ Erro ao atualizar status:', updateError);
                throw updateError;
            }

            results.processed = idsToCancel.length;
            console.log(`✅ ${idsToCancel.length} inscrições canceladas com sucesso.`);
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Cleanup completed successfully',
                ...results
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('❌ Erro geral na função:', error);
        return new Response(
            JSON.stringify({
                error: 'Internal server error',
                details: (error as Error).message,
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
}
