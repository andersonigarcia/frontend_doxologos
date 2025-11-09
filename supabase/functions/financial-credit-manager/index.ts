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

type Action =
  | 'list'
  | 'create'
  | 'reserve'
  | 'release'
  | 'consume';

type JsonValue = Record<string, unknown> | null;

type CreditRecord = {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  metadata: Record<string, unknown> | null;
  reserved_at: string | null;
};

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

  const supabaseUrl =
    Deno.env.get('SUPABASE_URL') ??
    `https://${Deno.env.get('SUPABASE_REFERENCE_ID')}.supabase.co`;
  const serviceRoleKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Supabase credentials not configured');
    return jsonResponse(500, {
      error: 'Supabase credentials not configured',
    });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const authHeader = req.headers.get('Authorization');
  let authUser: Awaited<ReturnType<typeof supabaseAdmin.auth.getUser>>['data']['user'] =
    null;

  if (authHeader) {
    const token = authHeader.replace('Bearer ', '').trim();
    if (token.length > 0) {
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (error) {
        console.warn('Failed to validate auth token', error.message);
      } else {
        authUser = data.user;
      }
    }
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch (error) {
    console.error('Invalid JSON payload', error);
    return jsonResponse(400, { error: 'Invalid JSON payload' });
  }

  const action = body.action as Action | undefined;
  if (!action) {
    return jsonResponse(400, { error: 'Action is required' });
  }

  const functionKeyHeader = req.headers.get('x-function-key');
  const functionKeyEnv = Deno.env.get('FINANCIAL_CREDITS_FUNCTION_KEY') ?? '';
  const isPrivileged =
    (authUser?.user_metadata?.role === 'admin') ||
    (functionKeyHeader && functionKeyHeader === functionKeyEnv);

  const ensureAuthenticated = () => {
    if (!authUser) {
      throw jsonResponse(401, { error: 'Authentication required' });
    }
    return authUser;
  };

  const fetchCredit = async (creditId: string) => {
    const { data, error } = await supabaseAdmin
      .from('financial_credits')
      .select('*')
      .eq('id', creditId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching credit', error);
      throw jsonResponse(500, { error: 'Error fetching credit', details: error.message });
    }

    if (!data) {
      throw jsonResponse(404, { error: 'Credit not found' });
    }

    return data as CreditRecord & Record<string, unknown>;
  };

  try {
    switch (action) {
      case 'list': {
        const user = ensureAuthenticated();
        const statusFilter = body.status as string | undefined;
        const query = supabaseAdmin
          .from('financial_credits')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (statusFilter) {
          query.eq('status', statusFilter);
        }

        const { data: credits, error } = await query;
        if (error) {
          console.error('Error listing credits', error);
          return jsonResponse(500, { error: 'Error listing credits', details: error.message });
        }

        const { data: balanceRow, error: balanceError } = await supabaseAdmin
          .from('user_credit_balances')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (balanceError) {
          console.error('Error loading balances', balanceError);
        }

        const balance = balanceRow ?? {
          user_id: user.id,
          available_amount: 0,
          reserved_amount: 0,
          used_amount: 0,
          expired_amount: 0,
        };

        return jsonResponse(200, { credits: credits ?? [], balance });
      }

      case 'create': {
        if (!isPrivileged) {
          return jsonResponse(403, {
            error: 'Admin or function key required to create credits',
          });
        }

        const userId = body.user_id as string | undefined;
        const amountRaw = body.amount as number | string | undefined;
        const sourceType = body.source_type as string | undefined;

        if (!userId || !amountRaw || !sourceType) {
          return jsonResponse(400, {
            error: 'user_id, amount and source_type are required',
          });
        }

        const amount = Number(amountRaw);
        if (Number.isNaN(amount) || amount <= 0) {
          return jsonResponse(400, { error: 'amount must be a positive number' });
        }

        const payload: Record<string, unknown> = {
          user_id: userId,
          amount,
          source_type: sourceType,
          status: 'available',
        };

        const optionalFields: Record<string, keyof typeof body> = {
          original_booking_id: 'original_booking_id',
          original_payment_id: 'original_payment_id',
          source_reason: 'source_reason',
          expires_at: 'expires_at',
          currency: 'currency',
        };

        Object.entries(optionalFields).forEach(([key, bodyKey]) => {
          const value = body[bodyKey];
          if (value !== undefined && value !== null && value !== '') {
            payload[key] = value;
          }
        });

        const metadata = body.metadata as JsonValue | undefined;
        if (metadata && typeof metadata === 'object') {
          payload.metadata = metadata;
        }

        const { data, error } = await supabaseAdmin
          .from('financial_credits')
          .insert(payload)
          .select('*')
          .single();

        if (error) {
          console.error('Error creating credit', error);
          return jsonResponse(500, { error: 'Error creating credit', details: error.message });
        }

        return jsonResponse(201, { credit: data });
      }

      case 'reserve': {
        const user = ensureAuthenticated();
        const creditId = body.credit_id as string | undefined;
        const reservationToken = body.reservation_token as string | undefined;
        const reservationNote = body.reservation_note as string | undefined;
        const reservationExpiresAt = body.reservation_expires_at as string | undefined;

        if (!creditId) {
          return jsonResponse(400, { error: 'credit_id is required' });
        }

        if (!reservationToken) {
          return jsonResponse(400, { error: 'reservation_token is required' });
        }

        const credit = await fetchCredit(creditId);

        if (credit.user_id !== user.id) {
          return jsonResponse(403, { error: 'Credit does not belong to this user' });
        }

        if (credit.status !== 'available') {
          return jsonResponse(409, { error: 'Credit must be available to reserve' });
        }

        const metadata =
          credit.metadata && typeof credit.metadata === 'object'
            ? { ...credit.metadata }
            : {};
        metadata.reservation_token = reservationToken;
        metadata.reserved_by = user.id;
        if (reservationNote) metadata.reservation_note = reservationNote;

        const updatePayload: Record<string, unknown> = {
          status: 'reserved',
          reserved_at: new Date().toISOString(),
          metadata,
        };

        if (reservationExpiresAt) {
          updatePayload.metadata = { ...metadata, reservation_expires_at: reservationExpiresAt };
        }

        const { data, error } = await supabaseAdmin
          .from('financial_credits')
          .update(updatePayload)
          .eq('id', creditId)
          .eq('status', 'available')
          .select('*')
          .single();

        if (error) {
          console.error('Error reserving credit', error);
          return jsonResponse(500, { error: 'Error reserving credit', details: error.message });
        }

        return jsonResponse(200, { credit: data });
      }

      case 'release': {
        const user = ensureAuthenticated();
        const creditId = body.credit_id as string | undefined;
        const reservationToken = body.reservation_token as string | undefined;

        if (!creditId) {
          return jsonResponse(400, { error: 'credit_id is required' });
        }

        const credit = await fetchCredit(creditId);

        if (credit.user_id !== user.id) {
          return jsonResponse(403, { error: 'Credit does not belong to this user' });
        }

        if (credit.status !== 'reserved') {
          return jsonResponse(409, { error: 'Only reserved credits can be released' });
        }

        const metadata =
          credit.metadata && typeof credit.metadata === 'object'
            ? { ...credit.metadata }
            : {};

        if (reservationToken && metadata.reservation_token && metadata.reservation_token !== reservationToken) {
          return jsonResponse(409, { error: 'Reservation token mismatch' });
        }

        delete metadata.reservation_token;
        delete metadata.reservation_note;
        delete metadata.reserved_by;
        delete metadata.reservation_expires_at;

        const { data, error } = await supabaseAdmin
          .from('financial_credits')
          .update({
            status: 'available',
            reserved_at: null,
            metadata,
          })
          .eq('id', creditId)
          .eq('status', 'reserved')
          .select('*')
          .single();

        if (error) {
          console.error('Error releasing credit', error);
          return jsonResponse(500, { error: 'Error releasing credit', details: error.message });
        }

        return jsonResponse(200, { credit: data });
      }

      case 'consume': {
        const creditId = body.credit_id as string | undefined;
        const usedBookingId = body.used_booking_id as string | undefined;
        const usedPaymentId = body.used_payment_id as string | undefined;
        const consumptionNote = body.consumption_note as string | undefined;
        const reservationToken = body.reservation_token as string | undefined;

        if (!creditId) {
          return jsonResponse(400, { error: 'credit_id is required' });
        }

        const credit = await fetchCredit(creditId);

        if (!['available', 'reserved'].includes(credit.status)) {
          return jsonResponse(409, { error: 'Credit must be available or reserved to consume' });
        }

        if (!isPrivileged) {
          const user = ensureAuthenticated();

          if (credit.user_id !== user.id) {
            return jsonResponse(403, { error: 'Credit does not belong to this user' });
          }

          if (credit.status !== 'reserved') {
            return jsonResponse(409, { error: 'Credit must be reserved before consumption' });
          }

          const metadata =
            credit.metadata && typeof credit.metadata === 'object'
              ? { ...credit.metadata }
              : {};

          if (!reservationToken || metadata.reservation_token !== reservationToken) {
            return jsonResponse(409, { error: 'Reservation token required for consumption' });
          }

          if (!usedBookingId) {
            return jsonResponse(400, { error: 'used_booking_id is required when consuming with user credentials' });
          }
        }

        const metadata =
          credit.metadata && typeof credit.metadata === 'object'
            ? { ...credit.metadata }
            : {};

        delete metadata.reservation_token;
        delete metadata.reservation_note;
        delete metadata.reserved_by;
        delete metadata.reservation_expires_at;

        if (consumptionNote) {
          metadata.consumption_note = consumptionNote;
        }

        const updatePayload: Record<string, unknown> = {
          status: 'used',
          used_at: new Date().toISOString(),
          metadata,
          reserved_at: null,
        };

        if (usedBookingId) updatePayload.used_booking_id = usedBookingId;
        if (usedPaymentId) updatePayload.used_payment_id = usedPaymentId;

        const { data, error } = await supabaseAdmin
          .from('financial_credits')
          .update(updatePayload)
          .eq('id', creditId)
          .in('status', ['available', 'reserved'])
          .select('*')
          .single();

        if (error) {
          console.error('Error consuming credit', error);
          return jsonResponse(500, { error: 'Error consuming credit', details: error.message });
        }

        return jsonResponse(200, { credit: data });
      }

      default:
        return jsonResponse(400, { error: `Unsupported action: ${action}` });
    }
  } catch (responseOrError) {
    if (responseOrError instanceof Response) {
      return responseOrError;
    }

    const error = responseOrError as Error;
    console.error('Unhandled error financial-credit-manager', error);
    return jsonResponse(500, { error: 'Unhandled error', details: error.message });
  }
});
