// Supabase Edge Function (Deno) - send-whatsapp-reminder
// Módulo CRM de Lembretes Anti-No-Show via WhatsApp (Arquitetura Plugável)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function formatPhoneE164(phone?: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10 || cleaned.length === 11) {
    return `55${cleaned}`;
  }
  return cleaned;
}

function formatDateBr(dateStr?: string): string {
  if (!dateStr) return '';
  if (dateStr.includes('T')) {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  }
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${d.toString().padStart(2, '0')}/${m.toString().padStart(2, '0')}/${y}`;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Configurações do Provedor de WhatsApp (Plugável)
  const IS_ENABLED = (Deno.env.get('WHATSAPP_REMINDERS_ENABLED') || 'false').toLowerCase() === 'true';
  const API_URL = Deno.env.get('WHATSAPP_API_URL');
  const API_KEY = Deno.env.get('WHATSAPP_API_KEY');
  const INSTANCE_ID = Deno.env.get('WHATSAPP_INSTANCE_ID');

  try {
    const body = await req.json();
    const { booking_id, inscricao_id, reminder_type = '24h', custom_message } = body;

    if (!booking_id && !inscricao_id) {
      return new Response(
        JSON.stringify({ error: 'É necessário fornecer booking_id ou inscricao_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let recipientName = '';
    let recipientPhone = '';
    let bookingDate = '';
    let bookingTime = '';
    let psychologistName = '';
    let zoomLink = '';
    let targetBookingId = booking_id || null;
    let targetInscricaoId = inscricao_id || null;

    if (booking_id) {
      const { data: booking, error: bError } = await supabase
        .from('bookings')
        .select(`
          id,
          patient_name,
          patient_phone,
          booking_date,
          booking_time,
          zoom_meeting_url,
          professional:professionals (name, whatsapp, phone)
        `)
        .eq('id', booking_id)
        .single();

      if (bError || !booking) {
        return new Response(
          JSON.stringify({ error: `Agendamento ${booking_id} não encontrado` }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      recipientName = booking.patient_name || 'Paciente';
      recipientPhone = formatPhoneE164(booking.patient_phone || booking.professional?.phone);
      bookingDate = formatDateBr(booking.booking_date);
      bookingTime = booking.booking_time || '';
      psychologistName = booking.professional?.name || 'Psicólogo(a)';
      zoomLink = booking.zoom_meeting_url || 'https://novo.doxologos.com.br/area-do-paciente';

    } else if (inscricao_id) {
      const { data: inscricao, error: iError } = await supabase
        .from('inscricoes_eventos')
        .select(`
          id,
          patient_name,
          phone,
          eventos (titulo, data_inicio, meeting_link)
        `)
        .eq('id', inscricao_id)
        .single();

      if (iError || !inscricao) {
        return new Response(
          JSON.stringify({ error: `Inscrição ${inscricao_id} não encontrada` }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      recipientName = inscricao.patient_name || 'Participante';
      recipientPhone = formatPhoneE164(inscricao.phone);
      bookingDate = formatDateBr(inscricao.eventos?.data_inicio);
      psychologistName = inscricao.eventos?.titulo || 'Workshop';
      zoomLink = inscricao.eventos?.meeting_link || 'https://novo.doxologos.com.br/workshops';
    }

    // 2. Construção da Mensagem Empática (Tom Doxologos Saúde Mental)
    let messageText = custom_message;

    if (!messageText) {
      if (reminder_type === '24h') {
        messageText = `Olá, ${recipientName}! 💜 Lembramos que sua consulta de psicologia com ${psychologistName} está agendada para amanhã (${bookingDate}) às ${bookingTime}.\n\nPara confirmar sua presença ou em caso de dúvidas, acesse a Área do Paciente: https://novo.doxologos.com.br/area-do-paciente`;
      } else if (reminder_type === '1h') {
        messageText = `Olá, ${recipientName}! ⏳ Sua teleconsulta com ${psychologistName} começará em 1 hora (${bookingTime}).\n\nPrepare um local reservado e tranquilo. Link de acesso à sala Zoom: ${zoomLink}`;
      } else if (reminder_type === '10min') {
        messageText = `🔔 Seu atendimento com ${psychologistName} vai começar em 10 minutos!\n\nClique no link para acessar a consulta online: ${zoomLink}`;
      } else if (reminder_type === 'confirmation') {
        messageText = `✅ Seu agendamento foi confirmado com sucesso!\n\nPsicólogo(a): ${psychologistName}\nData: ${bookingDate} às ${bookingTime}\nLink de acesso Zoom: ${zoomLink}`;
      } else {
        messageText = `Olá, ${recipientName}! Lembrete de consulta de psicologia com ${psychologistName} em ${bookingDate} às ${bookingTime}. Link: ${zoomLink}`;
      }
    }

    // URL para envio manual 1-Click via WhatsApp Web (Sem Custos)
    const waMeUrl = recipientPhone
      ? `https://wa.me/${recipientPhone}?text=${encodeURIComponent(messageText)}`
      : '';

    console.log(`📱 Processando lembrete WhatsApp (${reminder_type}) para ${recipientName} (${recipientPhone || 'Sem telefone'})...`);

    let status = 'logged_only';
    let providerResponse: any = { mode: 'logged_only_ready_for_dispatch', wa_me_url: waMeUrl };

    // 3. Despacho via API do Provedor (Se habilitado e configurado)
    if (IS_ENABLED && API_URL && recipientPhone) {
      try {
        console.log(`📡 Enviando WhatsApp via Provedor API (${API_URL})...`);
        const payload = {
          number: recipientPhone,
          phone: recipientPhone,
          message: messageText,
          text: messageText,
          instance: INSTANCE_ID,
        };

        const res = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(API_KEY ? { 'Authorization': `Bearer ${API_KEY}`, 'apikey': API_KEY } : {}),
          },
          body: JSON.stringify(payload),
        });

        const resData = await res.json().catch(() => ({}));
        if (res.ok) {
          status = 'sent';
          providerResponse = resData;
          console.log(`✅ Lembrete WhatsApp enviado via API para ${recipientPhone}!`);
        } else {
          status = 'failed';
          providerResponse = { error: 'API Provider error', details: resData, httpStatus: res.status };
          console.error(`❌ Erro do provedor WhatsApp:`, resData);
        }
      } catch (apiErr: any) {
        status = 'failed';
        providerResponse = { error: apiErr.message || 'Falha de conexão com provedor' };
        console.error(`❌ Exceção na API do WhatsApp:`, apiErr);
      }
    } else {
      console.log(`ℹ️ Módulo operando em Modo Preparado / Gratuito (WHATSAPP_REMINDERS_ENABLED=false ou sem API_URL). Lembrete registrado no log com link wa.me.`);
    }

    // 4. Registro no Banco de Dados (`whatsapp_reminder_logs`)
    const { data: logRecord, error: logErr } = await supabase
      .from('whatsapp_reminder_logs')
      .insert({
        booking_id: targetBookingId,
        inscricao_id: targetInscricaoId,
        reminder_type,
        recipient_phone: recipientPhone || 'N/A',
        recipient_name: recipientName,
        message_body: messageText,
        wa_me_url: waMeUrl,
        status,
        provider_response: providerResponse,
        sent_at: status === 'sent' ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (logErr) {
      console.error('❌ Erro ao salvar log de WhatsApp no banco:', logErr);
    }

    // 5. Atualizar coluna de rastreamento no agendamento
    if (booking_id && (status === 'sent' || status === 'logged_only')) {
      const updateField: any = {};
      if (reminder_type === '24h') updateField.whatsapp_24h_sent_at = new Date().toISOString();
      if (reminder_type === '1h') updateField.whatsapp_1h_sent_at = new Date().toISOString();
      if (reminder_type === '10min') updateField.whatsapp_10min_sent_at = new Date().toISOString();

      if (Object.keys(updateField).length > 0) {
        await supabase.from('bookings').update(updateField).eq('id', booking_id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        status,
        reminder_type,
        wa_me_url: waMeUrl,
        message: status === 'sent'
          ? 'Lembrete enviado via WhatsApp API'
          : 'Lembrete registrado! Pronto para envio automático quando o provedor for contratado, ou via link gratuito wa.me.',
        log: logRecord,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('❌ Exceção no módulo send-whatsapp-reminder:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Erro interno ao processar lembrete WhatsApp' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
