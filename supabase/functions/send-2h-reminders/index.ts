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

function patientReminder2HoursTemplate(booking: any, baseUrl: string) {
  const content = `
    <h2 style="color: #f59e0b; font-size: 24px; margin: 0 0 10px 0;">⏰ Sua Consulta Começa em 2 Horas!</h2>
    <p>Olá <strong>${booking.patient_name}</strong>,</p>
    <p>Este é um lembrete de que sua consulta está próxima. Prepare-se para um momento de acolhimento e cuidado!</p>
    
    <div style="background: #fef3c7; padding: 25px; margin: 25px 0; border-radius: 8px; border-left: 4px solid #f59e0b;">
      <p><strong>⏰ Horário:</strong> ${booking.booking_time}</p>
      <p><strong>📅 Hoje:</strong> ${formatDate(booking.booking_date)}</p>
      <p><strong>👨‍⚕️ Profissional:</strong> ${booking.professionals?.name}</p>
    </div>

    ${booking.meeting_link ? `
      <div style="background: #dbeafe; padding: 30px; margin: 25px 0; border-radius: 8px; border-left: 4px solid #3b82f6; text-align: center;">
        <h3 style="margin: 0 0 15px 0; color: #1e40af; font-size: 20px;">🎥 Acesse a Sala da Consulta</h3>
        <a href="${booking.meeting_link}" class="btn" style="background: #3b82f6; font-size: 18px;">🔗 Entrar na Consulta</a>
      </div>
    ` : ''}
  `;
  return baseTemplate(content, "⏰ Sua Consulta é Daqui a 2 Horas - Doxologos", "#2d8659", baseUrl);
}

function professionalReminder2HoursTemplate(booking: any, baseUrl: string) {
  const content = `
    <h2 style="color: #2d8659; font-size: 22px; margin: 0 0 10px 0;">⏰ Consulta em 2 Horas</h2>
    <p>Olá <strong>${booking.professionals?.name}</strong>,</p>
    <p>Lembrete da sua próxima consulta:</p>
    
    <div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 16px; border: 1px solid #e5e7eb;">
      <p><strong>⏰ Horário:</strong> ${booking.booking_time}</p>
      <p><strong>👤 Paciente:</strong> ${booking.patient_name}</p>
      <p><strong>🩺 Serviço:</strong> ${booking.services?.name || 'Consulta'}</p>
      ${booking.patient_phone ? `<p><strong>📱 Telefone:</strong> ${booking.patient_phone}</p>` : ''}
      ${booking.patient_email ? `<p><strong>📧 Email:</strong> ${booking.patient_email}</p>` : ''}
    </div>

    ${booking.meeting_link ? `
      <div style="background: #dbeafe; padding: 25px; margin: 25px 0; border-radius: 8px; border-left: 4px solid #3b82f6; text-align: center;">
        <a href="${booking.meeting_link}" class="btn" style="background: #3b82f6; font-size: 16px;">🔗 Acessar Sala Google Meet</a>
      </div>
    ` : ''}
  `;
  return baseTemplate(content, `⏰ Consulta em 2h - ${booking.patient_name} - Doxologos`, "#2d8659", baseUrl);
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

    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const twoHours15Later = new Date(now.getTime() + 2.25 * 60 * 60 * 1000);

    const currentDate = now.toISOString().split('T')[0];
    const startTime = twoHoursLater.toTimeString().split(' ')[0].substring(0, 5);
    const endTime = twoHours15Later.toTimeString().split(' ')[0].substring(0, 5);

    console.log(`Buscando consultas entre ${startTime} e ${endTime} para hoje (${currentDate})`);

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        id, booking_date, booking_time, patient_name, patient_email, patient_phone, meeting_link,
        reminder_2h_sent, reminder_2h_patient_sent, reminder_2h_professional_sent,
        professionals ( id, name, user_id ),
        services ( id, name )
      `)
      .eq('status', 'confirmed')
      .eq('booking_date', currentDate)
      .gte('booking_time', startTime)
      .lte('booking_time', endTime)
      .or('reminder_2h_sent.is.null,reminder_2h_sent.eq.false');

    if (error) throw error;
    
    if (!bookings || bookings.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'Nenhuma consulta nas próximas 2h.' }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const promises: Promise<any>[] = [];

    for (const booking of bookings) {
      let patientSent = booking.reminder_2h_patient_sent;
      let profSent = booking.reminder_2h_professional_sent;
      
      // 1. Send Patient Reminder
      if (!patientSent && booking.patient_email) {
        const html = patientReminder2HoursTemplate(booking, baseUrl);
        promises.push(
          supabase.functions.invoke('send-email', {
            body: { to: booking.patient_email, subject: '⏰ LEMBRETE: Sua consulta é daqui a 2 horas! - Doxologos', html, type: 'booking_reminder_2h' }
          }).then(async (res) => {
             if (!res.error) {
               patientSent = true;
               await supabase.from('bookings').update({ reminder_2h_patient_sent: true }).eq('id', booking.id);
             }
          })
        );
      } else {
        patientSent = true;
      }

      // 2. Send Professional Reminder
      if (!profSent && booking.professionals?.user_id) {
         const { data: authData } = await supabase.auth.admin.getUserById(booking.professionals.user_id);
         const profEmail = authData?.user?.email;
         if (profEmail) {
           const html = professionalReminder2HoursTemplate(booking, baseUrl);
           promises.push(
             supabase.functions.invoke('send-email', {
               body: { to: profEmail, subject: `⏰ LEMBRETE: Consulta em 2 horas - ${booking.patient_name} - Doxologos`, html, type: 'professional_reminder_2h' }
             }).then(async (res) => {
                if (!res.error) {
                  profSent = true;
                  await supabase.from('bookings').update({ reminder_2h_professional_sent: true }).eq('id', booking.id);
                }
             })
           );
         }
      } else {
        profSent = true;
      }
      
      // We will lazily update the overall flag via a separate cron or when both complete
    }

    await Promise.allSettled(promises);

    // Final check for all bookings to set reminder_2h_sent to true if both sent
    for (const booking of bookings) {
      const { data: freshBooking } = await supabase.from('bookings').select('reminder_2h_patient_sent, reminder_2h_professional_sent').eq('id', booking.id).single();
      if (freshBooking?.reminder_2h_patient_sent && freshBooking?.reminder_2h_professional_sent) {
        await supabase.from('bookings').update({ reminder_2h_sent: true, reminder_2h_sent_at: new Date().toISOString() }).eq('id', booking.id);
      }
    }

    return new Response(JSON.stringify({ success: true, processedBookings: bookings.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("Erro no processamento:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
