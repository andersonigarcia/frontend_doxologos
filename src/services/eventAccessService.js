import { supabase } from '@/lib/customSupabaseClient';

function normalizeErrorMessage(error) {
  if (!error) return 'Erro desconhecido ao buscar dados do evento';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (error?.error) return error.error;
  if (error?.message) return error.message;
  return 'Erro ao buscar acesso ao evento';
}

export async function fetchEventMeeting(eventoId) {
  if (!eventoId) {
    throw new Error('Evento inválido');
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData?.session;

  if (!session?.access_token) {
    throw new Error('Faça login para acessar o evento');
  }

  const { data, error } = await supabase.functions.invoke('event-get-meeting', {
    body: { eventoId },
    headers: {
      Authorization: `Bearer ${session.access_token}`
    }
  });

  if (error) {
    throw new Error(normalizeErrorMessage(error));
  }

  if (!data) {
    throw new Error('Dados de reunião não retornados');
  }

  if (data.error) {
    throw new Error(normalizeErrorMessage(data.error));
  }

  return {
    meetingLink: data.meetingLink,
    meetingPassword: data.meetingPassword || null,
    meetingId: data.meetingId || null,
    hostStartUrl: data.hostStartUrl || null
  };
}
