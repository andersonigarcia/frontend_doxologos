/**
 * Serviço Canônico de Pacientes e Prontuários (Fase 4 - Domain Unification)
 * Single Source of Truth (SSOT) para notas clínicas, tarefas de casa (homework) e histórico.
 */

import { supabase } from '@/lib/customSupabaseClient';

/**
 * Colunas permitidas na tabela public.patient_notes
 */
export const ALLOWED_PATIENT_NOTE_FIELDS = [
  'chief_complaint',
  'created_at',
  'homework',
  'homework_visible_to_patient',
  'id',
  'notes',
  'patient_email',
  'patient_name',
  'professional_id',
  'session_date',
  'session_development',
  'updated_at'
];

/**
 * Colunas permitidas na tabela public.patient_notes_history
 */
export const ALLOWED_PATIENT_HISTORY_FIELDS = [
  'chief_complaint',
  'homework',
  'homework_visible_to_patient',
  'id',
  'notes',
  'patient_email',
  'patient_note_id',
  'professional_id',
  'saved_at',
  'session_date',
  'session_development'
];

/**
 * Sanitiza o payload garantindo que apenas colunas válidas da tabela patient_notes sejam enviadas
 * @param {Record<string, any>} payload
 * @returns {Record<string, any>}
 */
export function sanitizePatientNotePayload(payload) {
  if (!payload || typeof payload !== 'object') return {};

  const sanitized = {};
  for (const [key, value] of Object.entries(payload)) {
    if (ALLOWED_PATIENT_NOTE_FIELDS.includes(key)) {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Busca as tarefas de casa (homework) visíveis para o paciente logado
 * Utilizado por componentes como PatientAcompanhamento
 * @param {string} patientEmail
 * @returns {Promise<any[]>}
 */
export async function getPatientHomeworkTasks(patientEmail) {
  if (!patientEmail) return [];

  // RLS garante que o paciente só consiga ler se auth.email() = patient_email E homework_visible_to_patient = true
  const { data, error } = await supabase
    .from('patient_notes_history')
    .select('id, session_date, homework, professional_id')
    .eq('patient_email', patientEmail)
    .order('session_date', { ascending: false });

  if (error) {
    console.error('[patientService] Erro ao buscar tarefas do paciente:', error);
    throw error;
  }

  return data || [];
}

/**
 * Carrega histórico estruturado de sessões do paciente via Edge Function ou fallback
 * @param {string} patientEmail
 * @returns {Promise<any[]>}
 */
export async function getPatientNotesHistory(patientEmail) {
  if (!patientEmail) return [];

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    if (token) {
      const { data, error } = await supabase.functions.invoke('patient-notes-manager', {
        body: { action: 'list_history', patient_email: patientEmail },
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!error && data?.history) {
        return data.history;
      }
    }
  } catch (err) {
    console.warn('[patientService] Falha ao invocar patient-notes-manager, tentando fallback direto:', err);
  }

  // Fallback direto via Supabase se a Edge Function falhar ou não houver token
  const { data, error } = await supabase
    .from('patient_notes_history')
    .select('*')
    .eq('patient_email', patientEmail)
    .order('session_date', { ascending: false });

  if (error) {
    console.error('[patientService] Erro no fallback de histórico:', error);
    return [];
  }

  return data || [];
}

/**
 * Salva uma anotação de sessão ou prontuário clínico
 * @param {string} patientEmail
 * @param {string} notes
 * @param {Object} sessionDetails
 * @returns {Promise<any>}
 */
export async function savePatientSessionNote(patientEmail, notes, sessionDetails = {}) {
  if (!patientEmail) throw new Error('[patientService] E-mail do paciente é obrigatório.');

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;

  if (token) {
    const { data, error } = await supabase.functions.invoke('patient-notes-manager', {
      body: {
        action: 'save_session_note',
        patient_email: patientEmail,
        notes,
        ...sessionDetails
      },
      headers: { Authorization: `Bearer ${token}` }
    });

    if (error) throw error;
    return data;
  }

  throw new Error('[patientService] Sessão não autenticada para salvar prontuário.');
}
