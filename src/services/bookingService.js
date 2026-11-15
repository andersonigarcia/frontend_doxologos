import { supabase } from '@/lib/customSupabaseClient';
import bookingEmailManager from '@/lib/bookingEmailManager';

/**
 * Whitelist oficial de colunas existentes na tabela public.bookings do PostgreSQL.
 * Campos inexistentes (ex: meeting_platform, service_name) NÃO devem ser enviados ao banco.
 */
export const ALLOWED_BOOKING_FIELDS = [
  'id',
  'professional_id',
  'service_id',
  'patient_name',
  'patient_email',
  'patient_phone',
  'booking_date',
  'booking_time',
  'status',
  'user_id',
  'valor_consulta',
  'meeting_link',
  'meeting_password',
  'meeting_id',
  'meeting_start_url',
  'meeting_provider',
  'reschedule_count',
  'rescheduled_from_id',
  'valor_repasse_profissional',
  'payment_status',
  'marketplace_payment_id',
  'package_id',
  'created_by_admin_id',
  'business_model',
  'session_status',
  'upsell_sent',
  'created_at',
  'updated_at'
];

/**
 * Status válidos para um agendamento.
 */
export const VALID_BOOKING_STATUSES = [
  'pending_payment',
  'confirmed',
  'completed',
  'cancelled',
  'rescheduled',
  // Status legados / complementares suportados
  'paid',
  'pending',
  'awaiting_payment',
  'cancelled_by_patient',
  'cancelled_by_professional',
  'no_show_unjustified'
];

/**
 * Sanitiza o payload de agendamento para conter apenas colunas válidas da tabela bookings.
 * @param {Object} rawData
 * @returns {Object} Payload seguro para inserção/atualização
 */
export function sanitizeBookingPayload(rawData = {}) {
  const sanitized = {};

  for (const field of ALLOWED_BOOKING_FIELDS) {
    if (field in rawData && rawData[field] !== undefined) {
      let value = rawData[field];

      if (['patient_name', 'patient_email', 'patient_phone'].includes(field)) {
        sanitized[field] = value !== null ? String(value).trim() : null;
      } else if (field === 'booking_time') {
        let timeStr = String(value || '').trim();
        if (/^\d:\d\d/.test(timeStr)) {
          timeStr = `0${timeStr}`;
        }
        // A coluna booking_time no PostgreSQL é VARCHAR(5), aceitando estritamente 'HH:mm'.
        // Trunca segundos se fornecidos (ex: '21:00:00' -> '21:00') para evitar erro Postgres 22001 (value too long)
        sanitized[field] = timeStr.length > 5 ? timeStr.slice(0, 5) : timeStr;
      } else if (field === 'status') {
        sanitized[field] = value || 'pending_payment';
      } else if (['reschedule_count', 'valor_consulta', 'valor_repasse_profissional'].includes(field)) {
        sanitized[field] = typeof value === 'number' ? value : (Number(value) || 0);
      } else {
        sanitized[field] = value;
      }
    }
  }

  // Garantir status padrão caso omitido
  if (!sanitized.status) {
    sanitized.status = 'pending_payment';
  }

  return sanitized;
}

/**
 * Busca um agendamento por ID com relações opcionais.
 * @param {string} id - ID do agendamento
 * @param {Object} [options]
 * @param {boolean} [options.includeRelations=true] - Se deve incluir professional, service e payment
 * @param {string} [options.userId] - Filtro de segurança opcional por user_id do paciente
 * @returns {Promise<Object>} Dados do agendamento
 */
export async function getBookingById(id, { includeRelations = true, userId = null } = {}) {
  if (!id) {
    throw new Error('ID do agendamento é obrigatório.');
  }

  let query = supabase.from('bookings');

  if (includeRelations) {
    query = query.select(`
      *,
      professional:professionals(id, name, specialty, image_url, personal_meet_link),
      service:services(id, name, price, duration_minutes),
      payment:payments(id, mp_payment_id, status, amount)
    `);
  } else {
    query = query.select('*');
  }

  query = query.eq('id', id);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query.single();

  if (error) {
    throw new Error(`Erro ao buscar agendamento: ${error.message}`);
  }

  if (!data) {
    throw new Error('Agendamento não encontrado.');
  }

  return data;
}

/**
 * Cria um novo agendamento de forma segura e sanitizada.
 * @param {Object} rawPayload - Dados do agendamento
 * @returns {Promise<Object>} Agendamento criado
 */
export async function createBooking(rawPayload) {
  const sanitized = sanitizeBookingPayload(rawPayload);

  const { data, error } = await supabase
    .from('bookings')
    .insert([sanitized])
    .select()
    .single();

  if (error) {
    throw new Error(`Falha ao criar agendamento: ${error.message}`);
  }

  return data;
}

/**
 * Cria agendamentos filhos em lote (para pacotes de sessões).
 * @param {Array<Object>} childBookingsArray
 * @returns {Promise<Array<Object>>} Agendamentos criados
 */
export async function createChildBookings(childBookingsArray = []) {
  if (!Array.isArray(childBookingsArray) || childBookingsArray.length === 0) {
    return [];
  }

  const sanitizedList = childBookingsArray.map(sanitizeBookingPayload);

  const { data, error } = await supabase
    .from('bookings')
    .insert(sanitizedList)
    .select();

  if (error) {
    throw new Error(`Falha ao criar agendamentos do pacote: ${error.message}`);
  }

  return data || [];
}

/**
 * Atualiza o status de um agendamento e opcionalmente dispara e-mails de notificação de forma resiliente.
 * @param {string} id - ID do agendamento
 * @param {string} newStatus - Novo status
 * @param {Object} [options]
 * @param {boolean} [options.notify=false] - Se deve disparar e-mail de notificação
 * @param {Object} [options.bookingData] - Dados do agendamento para o e-mail (evita re-query)
 * @param {string} [options.cancellationReason] - Motivo do cancelamento (se aplicável)
 * @returns {Promise<Object>} Resultado da atualização
 */
export async function updateBookingStatus(id, newStatus, { notify = false, bookingData = null, cancellationReason = '' } = {}) {
  if (!id) throw new Error('ID do agendamento é obrigatório.');
  if (!VALID_BOOKING_STATUSES.includes(newStatus)) {
    throw new Error(`Status de agendamento inválido: ${newStatus}`);
  }

  const { data, error } = await supabase
    .from('bookings')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Falha ao atualizar status do agendamento: ${error.message}`);
  }

  // Notificações resilientes (falhas no e-mail nunca quebram o status do banco)
  if (notify && (bookingData || data)) {
    const info = bookingData || data;
    try {
      const emailPayload = {
        id,
        patient_name: info.patient_name,
        patient_email: info.patient_email,
        patient_phone: info.patient_phone,
        booking_date: info.booking_date,
        booking_time: info.booking_time,
        service_name: info.service?.name || 'Consulta',
        professional_name: info.professional?.name || 'Profissional',
        professional_id: info.professional_id || info.professional?.id,
        user_id: info.professional?.user_id,
        professional_email: info.professional?.email,
        meeting_link: info.meeting_link
      };

      if (newStatus === 'confirmed' || newStatus === 'paid') {
        await bookingEmailManager.sendPaymentApproved(emailPayload);
      } else if (newStatus === 'completed') {
        await bookingEmailManager.sendThankYou(emailPayload);
      } else if (newStatus === 'no_show_unjustified') {
        await bookingEmailManager.sendCancellation(emailPayload, 'Consulta marcada como falta injustificada (sem reembolso)');
      } else if (newStatus.includes('cancelled')) {
        await bookingEmailManager.sendCancellation(emailPayload, cancellationReason || 'Cancelado');
      }
    } catch (emailErr) {
      console.warn('bookingService: Erro não-crítico ao enviar notificação de status:', emailErr);
    }
  }

  return data;
}

/**
 * Reagenda uma consulta com histórico auditável.
 * @param {string} id - ID do agendamento original
 * @param {Object} params
 * @param {string} params.newDate - Nova data (YYYY-MM-DD)
 * @param {string} params.newTime - Novo horário (HH:mm ou HH:mm:ss)
 * @param {number} [params.attemptsUsed=0] - Quantidade de reagendamentos já efetuados
 * @param {string} [params.rescheduledFromId] - ID raiz do agendamento original
 * @param {string} [params.userId] - ID do usuário autenticado para auditoria
 * @returns {Promise<Object>} Agendamento atualizado
 */
export async function rescheduleBooking(id, { newDate, newTime, attemptsUsed = 0, rescheduledFromId = null, userId = null } = {}) {
  if (!id) throw new Error('ID do agendamento é obrigatório.');
  if (!newDate || !newTime) throw new Error('Nova data e horário são obrigatórios.');

  const nextCount = attemptsUsed + 1;
  const rootId = rescheduledFromId || id;
  let timeFormatted = String(newTime || '').trim();
  if (/^\d:\d\d/.test(timeFormatted)) {
    timeFormatted = `0${timeFormatted}`;
  }
  timeFormatted = timeFormatted.length > 5 ? timeFormatted.slice(0, 5) : timeFormatted;

  const { data, error } = await supabase
    .from('bookings')
    .update({
      booking_date: newDate,
      booking_time: timeFormatted,
      reschedule_count: nextCount,
      rescheduled_from_id: rootId,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Falha ao reagendar consulta: ${error.message}`);
  }

  // Gravar histórico de reagendamento de forma tolerante a falhas
  try {
    await supabase
      .from('booking_reschedule_history')
      .insert([{
        booking_id: id,
        new_booking_date: newDate,
        new_booking_time: timeFormatted,
        attempt_number: nextCount,
        status: 'success',
        metadata: {
          triggered_by: 'booking_service',
          user_id: userId
        }
      }]);
  } catch (historyErr) {
    console.warn('bookingService: Erro ao registrar histórico de reagendamento:', historyErr);
  }

  return data;
}

/**
 * Lista agendamentos com filtros flexíveis de domínio.
 * @param {Object} [filters]
 * @param {string} [filters.professionalId] - ID do profissional
 * @param {string} [filters.userId] - ID do paciente
 * @param {string|Array<string>} [filters.status] - Status ou lista de status
 * @param {string} [filters.startDate] - Data inicial (YYYY-MM-DD)
 * @param {string} [filters.endDate] - Data final (YYYY-MM-DD)
 * @param {number} [filters.limit=100] - Quantidade máxima de resultados
 * @returns {Promise<Array<Object>>} Lista de agendamentos
 */
export async function listBookings({
  professionalId,
  userId,
  status,
  startDate,
  endDate,
  limit = 100,
  includeRelations = false
} = {}) {
  const selectClause = includeRelations
    ? `*,
       professional:professionals(id, name, specialty, image_url, personal_meet_link),
       service:services(id, name, price, duration_minutes),
       payment:payments(id, mp_payment_id, status, qr_code, qr_code_base64, ticket_url, amount)`
    : '*';

  let query = supabase
    .from('bookings')
    .select(selectClause)
    .order('booking_date', { ascending: false })
    .order('booking_time', { ascending: true });

  if (professionalId) {
    query = query.eq('professional_id', professionalId);
  }

  if (userId) {
    query = query.eq('user_id', userId);
  }

  if (status) {
    if (Array.isArray(status)) {
      query = query.in('status', status);
    } else {
      query = query.eq('status', status);
    }
  }

  if (startDate) {
    query = query.gte('booking_date', startDate);
  }

  if (endDate) {
    query = query.lte('booking_date', endDate);
  }

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Erro ao listar agendamentos: ${error.message}`);
  }

  return data || [];
}

/**
 * Lista agendamentos do paciente com relações completas (profissionais, serviços, pagamentos).
 * @param {string} userId - ID do usuário paciente
 * @param {Object} [options]
 * @returns {Promise<Array<Object>>}
 */
export async function listPatientBookings(userId, options = {}) {
  if (!userId) return [];
  return listBookings({
    userId,
    includeRelations: true,
    limit: options.limit || 200,
    ...options
  });
}

