// Supabase Edge Function (Deno) - event-cleanup-expired
// Env expected: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Purpose: Cancel pending event registrations and bookings (15 min for same-day bookings, 24h for standard).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
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

        console.log('🔍 Iniciando limpeza de inscrições e agendamentos expirados...');

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const cutoff15m = new Date(Date.now() - 15 * 60 * 1000).toISOString();

        // 1. Limpeza de Inscrições de Eventos
        const { data: expiredRegistrations } = await supabase
            .from('inscricoes_eventos')
            .select('id, patient_email, created_at, evento_id')
            .eq('status', 'pending')
            .lt('created_at', cutoff24h);

        let eventCount = 0;
        if (expiredRegistrations && expiredRegistrations.length > 0) {
            const idsToCancel = expiredRegistrations.map(r => r.id);
            await supabase
                .from('inscricoes_eventos')
                .update({
                    status: 'cancelled',
                    payment_status: 'expired',
                    updated_at: new Date().toISOString()
                })
                .in('id', idsToCancel);
            eventCount = idsToCancel.length;
        }

        // 2. Limpeza de Agendamentos (Bookings) e Pacotes Pendentes:
        // Nova Matriz Dinâmica de SLA Doxologos por Antecedência da Consulta:
        // - Express (< 3h antecedência): 15 minutos (15 * 60 * 1000)
        // - Próximo dia (3h a 24h antecedência): 30 minutos (30 * 60 * 1000)
        // - Padrão (> 24h antecedência): 60 minutos (60 * 60 * 1000)
        const { data: pendingBookings } = await supabase
            .from('bookings')
            .select('id, package_id, patient_email, patient_name, booking_date, booking_time, created_at')
            .or('status.eq.pending,payment_status.eq.pending');

        const expiredBookingIds: string[] = [];
        const affectedPackageIds = new Set<string>();

        if (pendingBookings && pendingBookings.length > 0) {
            const nowMs = Date.now();

            for (const b of pendingBookings) {
                const createdAtMs = new Date(b.created_at).getTime();

                // Formatar data/hora agendada da consulta
                let bookingTimeStr = b.booking_time || '00:00';
                if (bookingTimeStr.length === 5) bookingTimeStr += ':00';
                const bookingDateTimeMs = new Date(`${b.booking_date}T${bookingTimeStr}`).getTime();

                // Antecedência da consulta em relação ao momento de criação
                const leadTimeMs = bookingDateTimeMs - createdAtMs;

                // Janela de tolerância para pagamento conforme antecedência
                let allowedWindowMs: number;
                if (leadTimeMs < 3 * 60 * 60 * 1000) {
                    // Menos de 3h de antecedência (Express) -> 15 minutos
                    allowedWindowMs = 15 * 60 * 1000;
                } else if (leadTimeMs < 24 * 60 * 60 * 1000) {
                    // Entre 3h e 24h de antecedência -> 30 minutos
                    allowedWindowMs = 30 * 60 * 1000;
                } else {
                    // Mais de 24h de antecedência -> 60 minutos (1 hora)
                    allowedWindowMs = 60 * 60 * 1000;
                }

                const expiredAtMs = createdAtMs + allowedWindowMs;

                if (nowMs > expiredAtMs) {
                    expiredBookingIds.push(b.id);
                    if (b.package_id) {
                        affectedPackageIds.add(b.package_id);
                    }
                }
            }
        }

        let bookingCount = 0;
        if (expiredBookingIds.length > 0) {
            await supabase
                .from('bookings')
                .update({
                    status: 'cancelled',
                    payment_status: 'expired',
                    updated_at: new Date().toISOString()
                })
                .in('id', expiredBookingIds);
            bookingCount = expiredBookingIds.length;
        }

        // 3. Limpeza de Pacotes Pendentes Expirados
        let packageCount = 0;
        if (affectedPackageIds.size > 0) {
            const packageIdList = Array.from(affectedPackageIds);
            await supabase
                .from('packages')
                .update({
                    status: 'cancelled',
                    updated_at: new Date().toISOString()
                })
                .in('id', packageIdList)
                .eq('status', 'pending');
            packageCount = packageIdList.length;
        }

        console.log(`✅ Limpeza concluída: ${eventCount} eventos, ${bookingCount} agendamentos e ${packageCount} pacotes liberados.`);

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Cleanup completed successfully',
                expired_events: eventCount,
                expired_bookings: bookingCount,
                expired_packages: packageCount
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('❌ Erro geral na função de limpeza:', error);
        return new Response(
            JSON.stringify({
                error: 'Internal server error',
                details: (error as Error).message,
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
