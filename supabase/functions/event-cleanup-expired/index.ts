// Supabase Edge Function (Deno) - event-cleanup-expired
// Env expected: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Purpose: Cancel pending event registrations and bookings (15 min for same-day bookings, 24h for standard).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export default async function handler(req: Request) {
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
        // Regra Dinâmica por Antecedência da Consulta:
        // - Antecedência < 12h (ou mesmo dia): 15 minutos (15 * 60 * 1000)
        // - Antecedência 12h a 48h: 2 horas (2 * 60 * 60 * 1000)
        // - Antecedência > 48h: 6 horas (6 * 60 * 60 * 1000)
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
                if (leadTimeMs < 12 * 60 * 60 * 1000) {
                    // Menos de 12h de antecedência (ou mesmo dia) -> 15 minutos
                    allowedWindowMs = 15 * 60 * 1000;
                } else if (leadTimeMs < 48 * 60 * 60 * 1000) {
                    // Entre 12h e 48h de antecedência -> 2 horas
                    allowedWindowMs = 2 * 60 * 60 * 1000;
                } else {
                    // Mais de 48h de antecedência -> 6 horas
                    allowedWindowMs = 6 * 60 * 60 * 1000;
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
}
