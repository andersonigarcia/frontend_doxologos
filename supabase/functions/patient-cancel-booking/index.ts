// Supabase Edge Function - patient-cancel-booking
// Cancels a booking on behalf of the authenticated patient and, when eligible,
// generates a financial credit linked to the original payment.

// @ts-ignore: Remote Deno URL import for Supabase Edge Functions
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-ignore: Remote Deno URL import for Supabase Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

type BookingRecord = {
  id: string;
  user_id: string;
  booking_date: string;
  booking_time: string;
  status: string;
  reschedule_count: number | null;
  service_id: string | null;
  professional_id: string | null;
};

type PaymentRecord = {
  id: string;
  status: string;
  amount: string | number;
  currency: string | null;
  mp_payment_id: string | null;
  payment_method: string | null;
  created_at: string;
};

const SUCCESS_PAYMENT_STATUSES = new Set([
  'approved',
  'authorized',
  'settled',
  'paid',
]);

const MIN_HOURS_FOR_CREDIT = 24;

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const resolveSupabaseConfig = () => {
  const supabaseUrl =
    Deno.env.get('SUPABASE_URL') ??
    `https://${Deno.env.get('SUPABASE_REFERENCE_ID')}.supabase.co`;
  const serviceKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceKey) {
    throw jsonResponse(500, {
      error: 'Supabase credentials not configured',
    });
  }

  return { supabaseUrl, serviceKey };
};

const toNumber = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return NaN;
  if (typeof value === 'number') return value;
  return Number(value);
};

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
    console.error('Invalid JSON payload', error);
    return jsonResponse(400, { error: 'Invalid JSON payload' });
  }

  const bookingId = payload.booking_id as string | undefined;
  const cancellationReason = payload.reason as string | undefined;

  if (!bookingId) {
    return jsonResponse(400, { error: 'booking_id is required' });
  }

  let supabaseUrl: string;
  let serviceKey: string;
  try {
    ({ supabaseUrl, serviceKey } = resolveSupabaseConfig());
  } catch (response) {
    if (response instanceof Response) return response;
    throw response;
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse(401, { error: 'Authentication required' });
  }

  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    return jsonResponse(401, { error: 'Authentication required' });
  }

  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    console.warn('Failed to validate auth token', authError?.message);
    return jsonResponse(401, { error: 'Invalid authentication token' });
  }

  try {
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select(
        `id, user_id, booking_date, booking_time, status, reschedule_count, service_id, professional_id`
      )
      .eq('id', bookingId)
      .maybeSingle();

    if (bookingError) {
      console.error('Failed to load booking', bookingError);
      return jsonResponse(500, {
        error: 'Failed to load booking',
        details: bookingError.message,
      });
    }

    if (!booking) {
      return jsonResponse(404, { error: 'Booking not found' });
    }

    if (booking.user_id !== user.id) {
      return jsonResponse(403, {
        error: 'You are not allowed to cancel this booking',
      });
    }

    if (booking.status?.startsWith('cancelled')) {
      return jsonResponse(409, {
        error: 'Booking already cancelled',
        booking_id: booking.id,
      });
    }

    const bookingDateTime = new Date(`${booking.booking_date}T${booking.booking_time}`);
    const now = new Date();
    const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    const eligibleForCredit = hoursUntilBooking >= MIN_HOURS_FOR_CREDIT;

    const { data: paymentProfiles, error: paymentError } = await supabaseAdmin
      .from('payments')
      .select('id, status, amount, currency, mp_payment_id, payment_method, created_at')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false });

    if (paymentError) {
      console.error('Failed to load payments for booking', paymentError);
      return jsonResponse(500, {
        error: 'Failed to load payments',
        details: paymentError.message,
      });
    }

    const paymentRecords = (paymentProfiles ?? []) as PaymentRecord[];
    const payment = paymentRecords.find((record) =>
      SUCCESS_PAYMENT_STATUSES.has((record.status || '').toLowerCase())
    );

    const shouldCreateCredit = Boolean(payment) && eligibleForCredit;

    const { data: updatedBookings, error: cancelError } = await supabaseAdmin
      .from('bookings')
      .update({
        status: 'cancelled_by_patient',
        updated_at: now.toISOString(),
      })
      .eq('id', bookingId)
      .eq('user_id', user.id)
      .not('status', 'like', 'cancelled%')
      .select('id, booking_date, booking_time, service_id, professional_id, reschedule_count')
      .limit(1);

    if (cancelError) {
      console.error('Failed to cancel booking', cancelError);
      return jsonResponse(500, {
        error: 'Failed to cancel booking',
        details: cancelError.message,
      });
    }

    if (!updatedBookings || updatedBookings.length === 0) {
      return jsonResponse(409, {
        error: 'Booking cancellation conflict',
      });
    }

    const updatedBooking = updatedBookings[0] as BookingRecord;

    const metadataBase = {
      triggered_by: 'patient_portal',
      cancelled_at: now.toISOString(),
      cancellation_reason: cancellationReason ?? null,
      hours_until_booking: Number.isFinite(hoursUntilBooking) ? hoursUntilBooking : null,
    } as Record<string, unknown>;

    let creditRecord: Record<string, unknown> | null = null;

    if (shouldCreateCredit && payment) {
      const creditAmount = toNumber(payment.amount);
      if (!Number.isFinite(creditAmount) || creditAmount <= 0) {
        console.warn('Skipping credit creation due to invalid amount', payment);
      } else {
        const creditPayload = {
          user_id: user.id,
          original_booking_id: booking.id,
          original_payment_id: payment.id,
          source_type: 'cancellation',
          source_reason: cancellationReason ?? null,
          amount: creditAmount,
          currency: payment.currency ?? 'BRL',
          status: 'available',
          metadata: {
            ...metadataBase,
            payment_method: payment.payment_method,
            mp_payment_id: payment.mp_payment_id,
            policy: `cancelled_with_${MIN_HOURS_FOR_CREDIT}h_notice`,
          },
        };

        const { data: insertedCredit, error: creditError } = await supabaseAdmin
          .from('financial_credits')
          .insert(creditPayload)
          .select('*')
          .single();

        if (creditError) {
          console.error('Credit creation failed', creditError);
          return jsonResponse(500, {
            error: 'Failed to create financial credit',
            details: creditError.message,
          });
        }

        creditRecord = insertedCredit;

        const historyPayload = {
          booking_id: booking.id,
          previous_booking_date: booking.booking_date,
          previous_booking_time: booking.booking_time,
          new_booking_date: booking.booking_date,
          new_booking_time: booking.booking_time,
          attempt_number: booking.reschedule_count ?? 0,
          status: 'credit_generated',
          metadata: {
            ...metadataBase,
            credit_id: insertedCredit.id,
            credit_amount: creditAmount,
            credit_currency: payment.currency ?? 'BRL',
            payment_id: payment.id,
          },
        };

        const { error: historyError } = await supabaseAdmin
          .from('booking_reschedule_history')
          .insert(historyPayload);

        if (historyError) {
          console.error('Failed to log booking history for credit', historyError);
        }
      }
    }

    const { error: historyLogError } = await supabaseAdmin.from('booking_reschedule_history').insert({
      booking_id: booking.id,
      previous_booking_date: booking.booking_date,
      previous_booking_time: booking.booking_time,
      new_booking_date: booking.booking_date,
      new_booking_time: booking.booking_time,
      attempt_number: booking.reschedule_count ?? 0,
      status: 'cancelled_by_patient',
      metadata: {
        ...metadataBase,
        credit_created: Boolean(creditRecord),
        credit_id: creditRecord ? creditRecord.id : null,
      },
    });

    if (historyLogError) {
      console.error('Failed to log cancellation history', historyLogError);
    }

    return jsonResponse(200, {
      booking_id: booking.id,
      booking_status: 'cancelled_by_patient',
      credit_created: Boolean(creditRecord),
      credit: creditRecord,
      credit_eligibility: {
        eligible: eligibleForCredit,
        has_successful_payment: Boolean(payment),
        policy_applied: eligibleForCredit && payment ? `${MIN_HOURS_FOR_CREDIT}h_notice` : null,
        hours_until_booking: hoursUntilBooking,
      },
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    console.error('Unhandled error in patient-cancel-booking', error);
    return jsonResponse(500, {
      error: 'Unhandled error cancelling booking',
      details: (error as Error).message,
    });
  }
});
