// Supabase Edge Function - Mercado Pago Refund
// Location: functions/mp-refund/index.js
// Env required: MP_ACCESS_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const mpAccessToken = process.env.MP_ACCESS_TOKEN;

import { loadLocalEnv } from '../load-config.js';
loadLocalEnv();

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false } });

export default async function handler(req, res) {
  try {
    const body = await req.json();
    const { payment_id, amount } = body;

    if (!payment_id) {
      return res.status(400).json({ error: 'payment_id required' });
    }

    console.log(`Processing refund for payment: ${payment_id}`);

    // Buscar payment no banco
    const { data: payment, error: paymentErr } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('mp_payment_id', payment_id)
      .single();

    if (paymentErr || !payment) {
      return res.status(404).json({ error: 'payment not found' });
    }

    // Verificar se já foi reembolsado
    if (payment.refund_id || payment.refund_status === 'approved') {
      return res.status(400).json({ 
        error: 'payment already refunded',
        refund_id: payment.refund_id 
      });
    }

    // Verificar se o status permite reembolso
    if (payment.status !== 'approved') {
      return res.status(400).json({ 
        error: 'only approved payments can be refunded',
        current_status: payment.status 
      });
    }

    // Preparar payload do reembolso
    const refundPayload = amount ? { amount: Number(amount) } : {};

    console.log('Calling MP refund API:', {
      payment_id,
      refund_amount: amount || 'full'
    });

    // Chamar API do Mercado Pago para criar reembolso
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}/refunds`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(refundPayload)
    });

    if (!mpRes.ok) {
      const errorText = await mpRes.text();
      console.error('MP refund failed:', errorText);
      return res.status(502).json({ 
        error: 'mercadopago refund error', 
        details: errorText 
      });
    }

    const refundData = await mpRes.json();
    console.log('MP refund created:', refundData);

    // Atualizar payment record com informações do reembolso
    const { error: updateErr } = await supabaseAdmin
      .from('payments')
      .update({
        refund_id: refundData.id?.toString(),
        refund_amount: refundData.amount || amount || payment.amount,
        refund_status: refundData.status,
        refund_date: new Date().toISOString(),
        status: 'refunded',
        updated_at: new Date().toISOString()
      })
      .eq('id', payment.id);

    if (updateErr) {
      console.error('Error updating payment with refund info:', updateErr);
    }

    // Atualizar status do booking se houver
    if (payment.booking_id) {
      const { error: bookingErr } = await supabaseAdmin
        .from('bookings')
        .update({
          status: 'cancelled_by_professional',
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.booking_id);

      if (bookingErr) {
        console.error('Error updating booking status:', bookingErr);
      }
    }

    return res.status(200).json({
      success: true,
      refund_id: refundData.id,
      status: refundData.status,
      amount: refundData.amount,
      message: 'Refund processed successfully'
    });

  } catch (err) {
    console.error('Refund error:', err);
    return res.status(500).json({ 
      error: 'internal error', 
      details: err.message 
    });
  }
}
