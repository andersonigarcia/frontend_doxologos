import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- Templates ---
function baseTemplate(content: string, title: string = "Doxologos", brandColor: string = "#2d8659", baseUrl: string = "https://doxologos.com.br", supportEmail: string = "doxologos@doxologos.com.br") {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f7fa; line-height: 1.6; color: #1f2937; }
    .container { max-width: 600px; margin: 0 auto; background: white; padding: 0; border-radius: 16px; border: 1px solid #f3f4f6; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden; }
    .header { background: ${brandColor}; color: white; padding: 25px 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .content { padding: 30px; }
    .btn { display: inline-block; padding: 14px 32px; background: ${brandColor}; color: white !important; text-decoration: none; border-radius: 9999px; font-weight: 600; margin: 10px 5px; }
    .footer { background: #f8f9fa; padding: 20px 30px; text-align: center; font-size: 13px; color: #6b7280; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💙 Doxologos Psicologia</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p><strong>Doxologos Psicologia</strong></p>
      <p>📧 ${supportEmail} | 🌐 <a href="${baseUrl}" style="color: ${brandColor};">${baseUrl}</a></p>
    </div>
  </div>
</body>
</html>`;
}

function formatDate(dateString: string) {
  try {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateString;
  }
}

function patientReminderTemplate(booking: any, baseUrl: string) {
  const content = `
    <h2 style="color: #2d8659; font-size: 22px; margin: 0 0 10px 0;">⏰ Sua Consulta é Amanhã!</h2>
    <p>Olá <strong>${booking.patient_name}</strong>,</p>
    <p>Este é um lembrete amigável de que sua consulta está agendada para <strong>amanhã</strong>!</p>
    
    <div style="background: #fef3c7; padding: 20px; margin: 20px 0; border-radius: 6px; border-left: 4px solid #f59e0b;">
      <p><strong>📅 Data:</strong> ${formatDate(booking.booking_date)}</p>
      <p><strong>⏰ Horário:</strong> ${booking.booking_time}</p>
      <p><strong>👨‍⚕️ Profissional:</strong> ${booking.professionals?.name}</p>
      <p><strong>🩺 Serviço:</strong> ${booking.services?.name}</p>
    </div>

    <div style="background: #dbeafe; padding: 25px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #3b82f6; text-align: center;">
      <h3>🔗 Aonde eu entro?</h3>
      <p>O link para a sala de consulta (Google Meet) já está disponível na sua Área do Paciente!</p>
      <a href="${baseUrl}/area-do-paciente" class="btn">Acessar Minha Área</a>
    </div>
  `;
  return baseTemplate(content, "Lembrete de Consulta - Doxologos", "#2d8659", baseUrl);
}

function professionalDailySummaryTemplate(professionalName: string, bookings: any[], baseUrl: string) {
  const sortedBookings = [...bookings].sort((a, b) => a.booking_time.localeCompare(b.booking_time));
  
  const bookingsHtml = sortedBookings.map(booking => `
    <div style="background: white; border-left: 4px solid #2d8659; padding: 15px; margin-bottom: 15px; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <p style="margin: 0 0 5px 0;"><strong>⏰ ${booking.booking_time}</strong> - ${booking.services?.name || 'Consulta'}</p>
      <p style="margin: 0 0 5px 0; color: #4b5563;">👤 <strong>Paciente:</strong> ${booking.patient_name}</p>
      ${booking.patient_phone ? `<p style="margin: 0 0 5px 0; color: #4b5563;">📱 <strong>Telefone:</strong> ${booking.patient_phone}</p>` : ''}
      ${booking.patient_email ? `<p style="margin: 0; color: #4b5563;">📧 <strong>Email:</strong> ${booking.patient_email}</p>` : ''}
      ${booking.meeting_link ? `<p style="margin: 5px 0 0 0; font-size: 13px;"><a href="${booking.meeting_link}" style="color: #2563eb;">🔗 Link da Reunião</a></p>` : ''}
    </div>
  `).join('');

  const content = `
    <h2 style="color: #1f2937; font-size: 22px; margin: 0 0 10px 0;">Olá, ${professionalName}!</h2>
    <p>Aqui está o resumo dos seus agendamentos para <strong>amanhã</strong>. Você tem ${bookings.length} consulta(s) confirmada(s).</p>
    
    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
      <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px;">📅 Sua Agenda:</h3>
      ${bookingsHtml}
    </div>
  `;
  return baseTemplate(content, "📅 Resumo da sua Agenda de Amanhã - Doxologos", "#2d8659", baseUrl);
}

// --- Handler ---
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const baseUrl = Deno.env.get('FRONTEND_URL') || 'https://doxologos.com.br';
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials missing');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    console.log(`Buscando consultas confirmadas para amanhã (${dateStr})...`);

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        id, booking_date, booking_time, patient_name, patient_email, patient_phone, meeting_link,
        reminder_24h_sent,
        professionals ( id, name, user_id ),
        services ( id, name )
      `)
      .eq('status', 'confirmed')
      .eq('booking_date', dateStr);

    if (error) throw error;
    
    if (!bookings || bookings.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'Nenhuma consulta para amanhã.' }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const emailPromises: Promise<any>[] = [];
    const professionalsMap = new Map<string, { email: string, name: string, bookings: any[] }>();

    for (const booking of bookings) {
      // 1. Queue Patient Reminder (if not sent)
      if (!booking.reminder_24h_sent && booking.patient_email) {
        const html = patientReminderTemplate(booking, baseUrl);
        emailPromises.push(
          supabase.functions.invoke('send-email', {
            body: {
              to: booking.patient_email,
              subject: '⏰ Lembrete: Sua Consulta é Amanhã! - Doxologos',
              html,
              type: 'booking_reminder'
            }
          }).then(async (res) => {
             if(res.error) throw res.error;
             await supabase.from('bookings').update({ reminder_24h_sent: true }).eq('id', booking.id);
          })
        );
      }

      // 2. Group by Professional
      if (booking.professionals?.user_id) {
        if (!professionalsMap.has(booking.professionals.user_id)) {
           const { data: authData } = await supabase.auth.admin.getUserById(booking.professionals.user_id);
           if (authData?.user?.email) {
             professionalsMap.set(booking.professionals.user_id, {
               email: authData.user.email,
               name: booking.professionals.name,
               bookings: []
             });
           }
        }
        
        const profData = professionalsMap.get(booking.professionals.user_id);
        if (profData) {
           profData.bookings.push(booking);
        }
      }
    }

    // 3. Queue Professional Summary Emails
    for (const [_, profData] of professionalsMap) {
      if (profData.bookings.length > 0) {
        const html = professionalDailySummaryTemplate(profData.name, profData.bookings, baseUrl);
        emailPromises.push(
          supabase.functions.invoke('send-email', {
            body: {
              to: profData.email,
              subject: '📅 Sua Agenda para Amanhã - Doxologos',
              html,
              type: 'professional_daily_summary'
            }
          })
        );
      }
    }

    await Promise.allSettled(emailPromises);

    return new Response(JSON.stringify({ success: true, processedBookings: bookings.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("Erro no processamento:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
