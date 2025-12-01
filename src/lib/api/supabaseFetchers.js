import { supabase } from '@/lib/customSupabaseClient';

const ensureData = (response, fallback = []) => response ?? fallback;

export async function fetchProfessionals() {
  const { data, error } = await supabase.from('professionals').select('*');
  if (error) throw error;
  return ensureData(data);
}

export async function fetchServices() {
  const { data, error } = await supabase.from('services').select('*');
  if (error) throw error;
  return ensureData(data);
}

export async function fetchAvailabilityMap() {
  const { data, error } = await supabase.from('availability').select('*');
  if (error) throw error;
  const availabilityMap = {};
  ensureData(data).forEach((slot) => {
    if (!availabilityMap[slot.professional_id]) {
      availabilityMap[slot.professional_id] = {};
    }
    availabilityMap[slot.professional_id][slot.day_of_week] = slot.available_times;
  });
  return availabilityMap;
}

export async function fetchBlockedDates() {
  const { data, error } = await supabase.from('blocked_dates').select('*');
  if (error) throw error;
  return ensureData(data);
}

export async function fetchApprovedReviews({ limit = 5, columns } = {}) {
  const selectColumns =
    columns ||
    `*,
        professionals(name),
        bookings(patient_name, patient_email)
      `;
  const { data, error } = await supabase
    .from('reviews')
    .select(selectColumns)
    .eq('is_approved', true)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ensureData(data);
}

export async function fetchActiveEventsWithProfessionals() {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('eventos')
    .select('*')
    .eq('status', 'aberto')
    .eq('ativo', true)
    .gt('data_limite_inscricao', nowIso)
    .lte('data_inicio_exibicao', nowIso)
    .gte('data_fim_exibicao', nowIso)
    .order('data_inicio', { ascending: true });

  if (error) throw error;

  const events = ensureData(data);
  const professionalIds = [...new Set(events.map((event) => event.professional_id).filter(Boolean))];

  if (!professionalIds.length) {
    return events;
  }

  const { data: professionalData, error: professionalError } = await supabase
    .from('professionals')
    .select('id, name')
    .in('id', professionalIds);

  if (professionalError) throw professionalError;

  return events.map((event) => ({
    ...event,
    professional: professionalData?.find((prof) => prof.id === event.professional_id) || null,
  }));
}
