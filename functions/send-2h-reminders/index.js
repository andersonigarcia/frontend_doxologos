/**
 * Função Serverless: Envio de Lembretes 2h Antes
 * Executa automaticamente via Netlify Scheduled Functions
 * Documentação: https://docs.netlify.com/functions/scheduled-functions/
 */

import { createClient } from '@supabase/supabase-js';
import { BookingEmailManager } from '../../src/lib/bookingEmailManager.js';

// Configuração de Schedule (Netlify nativo)
// Esta função será executada automaticamente a cada 15 minutos
export const config = {
    schedule: "*/15 * * * *"  // Cron: a cada 15 minutos
};

// Inicializar Supabase
const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // Usar service role key para acesso total
);

/**
 * Handler principal da função serverless
 */
export async function handler(event, context) {
    console.log('🔔 Iniciando processo de envio de lembretes 2h antes...');

    try {
        // Buscar consultas que precisam de lembrete
        const bookingsToRemind = await getBookingsNeedingReminder();

        if (bookingsToRemind.length === 0) {
            console.log('✅ Nenhuma consulta precisa de lembrete no momento');
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'Nenhuma consulta precisa de lembrete',
                    count: 0
                })
            };
        }

        console.log(`📧 Encontradas ${bookingsToRemind.length} consultas para enviar lembrete`);

        // Processar cada consulta
        const results = await Promise.allSettled(
            bookingsToRemind.map(booking => processBookingReminder(booking))
        );

        // Contar sucessos e falhas
        const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        const failed = results.length - successful;

        console.log(`✅ Lembretes enviados: ${successful} sucesso, ${failed} falhas`);

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: 'Processamento concluído',
                total: bookingsToRemind.length,
                successful,
                failed,
                results: results.map((r, i) => ({
                    bookingId: bookingsToRemind[i].id,
                    status: r.status,
                    success: r.status === 'fulfilled' ? r.value.success : false,
                    error: r.status === 'rejected' ? r.reason.message : null
                }))
            })
        };

    } catch (error) {
        console.error('❌ Erro no processo de lembretes:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: 'Erro ao processar lembretes',
                message: error.message
            })
        };
    }
}

/**
 * Busca consultas que precisam de lembrete 2h antes
 */
async function getBookingsNeedingReminder() {
    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const twoHours15Later = new Date(now.getTime() + 2.25 * 60 * 60 * 1000);

    // Formatar para comparação
    const currentDate = now.toISOString().split('T')[0];
    const startTime = twoHoursLater.toTimeString().split(' ')[0].substring(0, 5);
    const endTime = twoHours15Later.toTimeString().split(' ')[0].substring(0, 5);

    console.log(`🔍 Buscando consultas entre ${startTime} e ${endTime} para hoje (${currentDate})`);

    const { data, error } = await supabase
        .from('bookings')
        .select(`
      id,
      booking_date,
      booking_time,
      patient_name,
      patient_email,
      patient_phone,
      meeting_link,
      reminder_2h_sent,
      reminder_2h_patient_sent,
      reminder_2h_professional_sent,
      professionals (
        id,
        name,
        email
      ),
      services (
        id,
        name
      )
    `)
        .eq('status', 'confirmed')
        .eq('booking_date', currentDate)
        .gte('booking_time', startTime)
        .lte('booking_time', endTime)
        .or('reminder_2h_sent.is.null,reminder_2h_sent.eq.false');

    if (error) {
        console.error('❌ Erro ao buscar consultas:', error);
        throw error;
    }

    return data || [];
}

/**
 * Processa o envio de lembrete para uma consulta
 */
async function processBookingReminder(booking) {
    console.log(`📨 Processando lembrete para consulta ${booking.id} - ${booking.patient_name}`);

    const emailManager = new BookingEmailManager();
    const results = {
        bookingId: booking.id,
        patientSent: false,
        professionalSent: false,
        success: false,
        errors: []
    };

    try {
        // Preparar dados do booking
        const bookingData = {
            id: booking.id,
            patient_name: booking.patient_name,
            patient_email: booking.patient_email,
            patient_phone: booking.patient_phone,
            professional_name: booking.professionals?.name,
            professional_email: booking.professionals?.email,
            service_name: booking.services?.name,
            appointment_date: booking.booking_date,
            appointment_time: booking.booking_time,
            booking_date: booking.booking_date,
            booking_time: booking.booking_time,
            meeting_link: booking.meeting_link
        };

        // Enviar lembrete para o paciente (se ainda não foi enviado)
        if (!booking.reminder_2h_patient_sent) {
            try {
                const patientResult = await emailManager.sendReminder2Hours(bookingData, false);
                if (patientResult.success) {
                    results.patientSent = true;
                    console.log(`✅ Lembrete enviado para paciente: ${booking.patient_email}`);

                    // Atualizar flag no banco
                    await supabase
                        .from('bookings')
                        .update({ reminder_2h_patient_sent: true })
                        .eq('id', booking.id);
                } else {
                    results.errors.push(`Paciente: ${patientResult.error}`);
                    console.error(`❌ Falha ao enviar para paciente: ${patientResult.error}`);
                }
            } catch (error) {
                results.errors.push(`Paciente: ${error.message}`);
                console.error(`❌ Erro ao enviar para paciente:`, error);
            }
        } else {
            console.log(`ℹ️ Lembrete para paciente já foi enviado anteriormente`);
            results.patientSent = true; // Já foi enviado
        }

        // Enviar lembrete para o profissional (se ainda não foi enviado)
        if (!booking.reminder_2h_professional_sent && bookingData.professional_email) {
            try {
                const professionalResult = await emailManager.sendProfessionalReminder2Hours(bookingData, false);
                if (professionalResult.success) {
                    results.professionalSent = true;
                    console.log(`✅ Lembrete enviado para profissional: ${bookingData.professional_email}`);

                    // Atualizar flag no banco
                    await supabase
                        .from('bookings')
                        .update({ reminder_2h_professional_sent: true })
                        .eq('id', booking.id);
                } else {
                    results.errors.push(`Profissional: ${professionalResult.error}`);
                    console.error(`❌ Falha ao enviar para profissional: ${professionalResult.error}`);
                }
            } catch (error) {
                results.errors.push(`Profissional: ${error.message}`);
                console.error(`❌ Erro ao enviar para profissional:`, error);
            }
        } else if (!bookingData.professional_email) {
            console.log(`⚠️ Email do profissional não disponível`);
            results.errors.push('Email do profissional ausente');
        } else {
            console.log(`ℹ️ Lembrete para profissional já foi enviado anteriormente`);
            results.professionalSent = true; // Já foi enviado
        }

        // Marcar como enviado se ambos foram enviados
        if (results.patientSent && results.professionalSent) {
            await supabase
                .from('bookings')
                .update({
                    reminder_2h_sent: true,
                    reminder_2h_sent_at: new Date().toISOString()
                })
                .eq('id', booking.id);

            results.success = true;
            console.log(`✅ Consulta ${booking.id} processada com sucesso`);
        } else {
            console.log(`⚠️ Consulta ${booking.id} processada parcialmente`);
        }

        return results;

    } catch (error) {
        console.error(`❌ Erro ao processar consulta ${booking.id}:`, error);
        results.errors.push(error.message);
        return results;
    }
}

// Para testes locais
if (process.env.NODE_ENV === 'development') {
    handler({}, {}).then(result => {
        console.log('Resultado:', JSON.parse(result.body));
    });
}
