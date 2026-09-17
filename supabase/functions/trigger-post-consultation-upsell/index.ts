import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    // Procurar consultas que começaram há 2 horas (exemplo: agora são 14h, procuramos consultas de 12h)
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const twoHours15Ago = new Date(now.getTime() - 2.25 * 60 * 60 * 1000);

    const currentDate = twoHoursAgo.toISOString().split('T')[0];
    const startTime = twoHours15Ago.toTimeString().split(' ')[0].substring(0, 5);
    const endTime = twoHoursAgo.toTimeString().split(' ')[0].substring(0, 5);

    console.log(`Buscando consultas finalizadas entre ${startTime} e ${endTime} para hoje (${currentDate}) para envio de Upsell`);

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        id, booking_date, booking_time, patient_name, patient_email, patient_phone,
        upsell_sent,
        professionals ( id, name, user_id ),
        services ( id, name )
      `)
      .eq('status', 'confirmed')
      .eq('booking_date', currentDate)
      .gte('booking_time', startTime)
      .lte('booking_time', endTime)
      .or('upsell_sent.is.null,upsell_sent.eq.false');

    if (error) throw error;
    
    if (!bookings || bookings.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'Nenhuma consulta para upsell no período.' }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const promises: Promise<any>[] = [];

    for (const booking of bookings) {
      let patientSent = booking.upsell_sent;
      
      if (!patientSent && booking.patient_email) {
        promises.push(
          supabase.functions.invoke('send-email', {
            body: { 
              to: booking.patient_email, 
              subject: '🎁 Uma oferta especial para o seu acompanhamento - Doxologos', 
              html: `
                <!DOCTYPE html>
                <html lang="pt-BR">
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width,initial-scale=1.0">
                </head>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f7fa; line-height: 1.6; color: #1f2937;">
                  <div style="max-width: 600px; margin: 0 auto; background: white; padding: 0; border-radius: 16px; border: 1px solid #f3f4f6; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden;">
                    <div style="background: #2d8659; color: white; padding: 25px 30px; text-align: center;">
                      <h1 style="margin: 0; font-size: 24px; font-weight: 600;">💙 Doxologos Psicologia</h1>
                    </div>
                    <div style="padding: 30px;">
                      <h2 style="color: #2d8659; font-size: 22px; margin: 0 0 10px 0;">🎉 Como foi sua sessão?</h2>
                      <p style="font-size: 16px; color: #4b5563; margin: 0 0 25px 0;">
                        Olá <strong>${booking.patient_name}</strong>,
                      </p>
                      <p style="font-size: 16px; color: #4b5563; margin: 0 0 20px 0;">
                        Esperamos que sua consulta com <strong>${booking.professionals?.name}</strong> tenha sido ótima. 
                        Para manter o seu acompanhamento, preparamos uma opção especial para você: o <strong>Pacote Mensal</strong>.
                      </p>
                      
                      <div style="background: #f0fdf4; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #10b981;">
                        <h3 style="margin: 0 0 12px 0; color: #065f46; font-size: 18px;">🎁 Benefícios do Pacote:</h3>
                        <ul style="margin: 0; padding-left: 20px; color: #065f46; line-height: 1.8;">
                          <li>✓ <strong>4 Consultas</strong> já garantidas</li>
                          <li>✓ Mais praticidade: não precisa pagar a cada sessão</li>
                          <li>✓ Continuidade no tratamento</li>
                        </ul>
                      </div>

                      <p style="text-align: center; margin-top: 30px;">
                        <a href="${baseUrl}/area-do-paciente" style="display: inline-block; padding: 14px 32px; background: #f59e0b; color: white !important; text-decoration: none; border-radius: 9999px; font-weight: 600; margin: 10px 5px; font-size: 15px;">Adquirir Pacote Mensal</a>
                      </p>

                      <p style="margin-top: 25px; font-size: 14px; color: #6b7280; line-height: 1.6;">
                        Estamos à disposição para ajudar.<br>
                        <strong>Abraços,<br>Equipe Doxologos</strong>
                      </p>
                    </div>
                  </div>
                </body>
                </html>
              `, 
              type: 'upsell_package_offer' 
            }
          }).then(async (res) => {
             if (!res.error) {
               await supabase.from('bookings').update({ upsell_sent: true }).eq('id', booking.id);
             }
          })
        );
      }
    }

    await Promise.allSettled(promises);

    return new Response(JSON.stringify({ success: true, processedBookings: bookings.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("Erro no processamento:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
