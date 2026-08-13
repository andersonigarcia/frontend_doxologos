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

        // 2. Limpeza de Agendamentos (Bookings): 15min para consultas no mesmo dia, 24h para demais
        const { data: pendingBookings } = await supabase
            .from('bookings')
            .select('id, patient_email, patient_name, booking_date, booking_time, created_at')
            .or('status.eq.pending,payment_status.eq.pending');

        const expiredBookingIds: string[] = [];

        if (pendingBookings && pendingBookings.length > 0) {
            for (const b of pendingBookings) {
                const isSameDay = b.booking_date === todayStr;
                const createdAtTime = new Date(b.created_at).getTime();

                // 15 minutos para same-day, 24h para agendamentos futuros
                const limitTime = isSameDay ? (Date.now() - 15 * 60 * 1000) : (Date.now() - 24 * 60 * 60 * 1000);

                if (createdAtTime < limitTime) {
                    expiredBookingIds.push(b.id);
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

        console.log(`✅ Limpeza concluída: ${eventCount} eventos e ${bookingCount} agendamentos liberados.`);

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Cleanup completed successfully',
                expired_events: eventCount,
                expired_bookings: bookingCount
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
