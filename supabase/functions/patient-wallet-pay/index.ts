import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

declare const Deno: { env: { get(key: string): string | undefined; } };

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed. Use POST.' });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch (error) {
    return jsonResponse(400, { error: 'Invalid JSON payload' });
  }

  const bookingId = payload.booking_id as string | undefined;

  if (!bookingId) {
    return jsonResponse(400, { error: 'booking_id is required' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? `https://${Deno.env.get('SUPABASE_REFERENCE_ID')}.supabase.co`;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceKey) {
    return jsonResponse(500, { error: 'Supabase credentials not configured' });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse(401, { error: 'Authentication required' });
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    return jsonResponse(401, { error: 'Invalid authentication token' });
  }

  try {
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select('id, user_id, status, services:service_id(price)')
      .eq('id', bookingId)
      .maybeSingle();

    if (bookingError || !booking) {
      return jsonResponse(404, { error: 'Booking not found' });
    }

    if (booking.user_id !== user.id) {
      return jsonResponse(403, { error: 'Unauthorized to pay for this booking' });
    }

    if (booking.status === 'confirmed' || booking.status === 'paid') {
      return jsonResponse(400, { error: 'Booking is already paid' });
    }

    const price = Number(booking.services?.price) || 0;
    if (price <= 0) {
      return jsonResponse(400, { error: 'Invalid booking price' });
    }

    // Attempt to deduct the full amount using RPC
    const { data: walletResult, error: walletError } = await supabaseAdmin.rpc('process_wallet_transaction', {
      p_patient_id: user.id,
      p_amount: -price,
      p_type: 'debit_payment',
      p_description: 'Pagamento integral via carteira',
      p_booking_id: bookingId
    });

    if (walletError || (walletResult && walletResult.success === false)) {
      return jsonResponse(400, { 
        error: 'Saldo insuficiente na carteira', 
        details: walletError?.message || walletResult?.error 
      });
    }

    // Update booking status
    const { error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({
        status: 'confirmed',
        payment_status: 'approved',
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('Failed to update booking status', updateError);
    }

    // Record payment
    const { error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        booking_id: bookingId,
        status: 'approved',
        amount: price,
        wallet_balance_used: price,
        payment_method: 'wallet',
        payment_type: 'wallet',
        currency: 'BRL',
        description: 'Pagamento integral com saldo da carteira',
      });

    if (paymentError) {
      console.error('Failed to create payment record', paymentError);
    }
    
    // Invoke orchestrator for email
    const orchestratorEnabled = (Deno.env.get('POST_PAYMENT_ORCHESTRATOR') || 'false').toLowerCase() === 'true';
    if (orchestratorEnabled) {
      supabaseAdmin.functions.invoke('post-payment-orchestrator', {
        body: { booking_id: bookingId }
      }).catch(e => console.error(e));
    }

    return jsonResponse(200, { success: true, booking_id: bookingId });
  } catch (error) {
    console.error('Wallet payment error', error);
    return jsonResponse(500, { error: 'Failed to process wallet payment', details: (error as Error).message });
  }
});
