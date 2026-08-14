import { supabase } from '@/lib/customSupabaseClient';

/**
 * Service dedicated to isolated attendance and room presence tracking for events.
 * Operates independently from 1-on-1 patient session booking services.
 */

export async function registerCheckIn(eventoId, inscricaoId = null) {
  if (!eventoId) {
    throw new Error('ID do evento é obrigatório para check-in');
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData?.session;

  if (!session?.user?.id) {
    throw new Error('Usuário precisa estar autenticado para registrar presença');
  }

  const userId = session.user.id;

  const { data, error } = await supabase
    .from('presenca_eventos')
    .insert([
      {
        evento_id: eventoId,
        user_id: userId,
        inscricao_id: inscricaoId,
        check_in_at: new Date().toISOString(),
        last_heartbeat_at: new Date().toISOString(),
        duration_seconds: 0,
        source: 'web'
      }
    ])
    .select('id, check_in_at')
    .single();

  if (error) {
    console.error('Erro ao registrar check-in no evento:', error);
    throw new Error(error.message || 'Falha ao registrar entrada na sala');
  }

  return data;
}

export async function sendHeartbeat(presenceId, durationSecondsIncrement = 30) {
  if (!presenceId) return null;

  const now = new Date().toISOString();

  // Retrieve current record to increment duration cleanly
  const { data: current } = await supabase
    .from('presenca_eventos')
    .select('duration_seconds')
    .eq('id', presenceId)
    .maybeSingle();

  const currentDuration = current?.duration_seconds || 0;

  const { data, error } = await supabase
    .from('presenca_eventos')
    .update({
      last_heartbeat_at: now,
      duration_seconds: currentDuration + durationSecondsIncrement,
      updated_at: now
    })
    .eq('id', presenceId)
    .select('id, duration_seconds')
    .maybeSingle();

  if (error) {
    console.warn('Erro ao atualizar heartbeat de presença:', error);
  }

  return data;
}

export async function registerCheckOut(presenceId) {
  if (!presenceId) return null;

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('presenca_eventos')
    .update({
      check_out_at: now,
      last_heartbeat_at: now,
      updated_at: now
    })
    .eq('id', presenceId)
    .select('id, check_in_at, check_out_at, duration_seconds')
    .maybeSingle();

  if (error) {
    console.error('Erro ao registrar check-out no evento:', error);
  }

  return data;
}
