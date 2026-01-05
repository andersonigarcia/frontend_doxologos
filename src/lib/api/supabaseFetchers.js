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

/**
 * Fetches availability map organized by professional and day of week
 * @param {Object} options - Filtering options
 * @param {number} options.month - Month to filter (1-12). Defaults to current month.
 * @param {number} options.year - Year to filter. Defaults to current year.
 * @param {number} options.includeNextMonths - Number of additional months to include. Defaults to 2 (total 3 months for booking calendars)
 * @returns {Promise<Object>} Availability map organized by professional_id -> day_of_week -> availability data
 */
export async function fetchAvailabilityMap(options = {}) {
  const currentDate = new Date();
  const currentMonth = options.month || (currentDate.getMonth() + 1);
  const currentYear = options.year || currentDate.getFullYear();
  // Default to 2 additional months (current + 2 = 3 months total) for booking calendars
  const includeNextMonths = options.includeNextMonths !== undefined ? options.includeNextMonths : 2;

  const { data, error } = await supabase.from('availability').select('*');
  if (error) throw error;

  const availabilityMap = {};
  const rawData = ensureData(data);

  // Filter data by month/year range
  const filteredData = rawData.filter((slot) => {
    if (!slot.month || !slot.year) return false;

    // Calculate month difference
    const slotMonthIndex = (slot.year * 12) + slot.month;
    const currentMonthIndex = (currentYear * 12) + currentMonth;
    const maxMonthIndex = currentMonthIndex + includeNextMonths;

    return slotMonthIndex >= currentMonthIndex && slotMonthIndex <= maxMonthIndex;
  });

  // Organize filtered data
  filteredData.forEach((slot) => {
    if (!availabilityMap[slot.professional_id]) {
      availabilityMap[slot.professional_id] = {};
    }

    const dayKey = slot.day_of_week;

    // If includeNextMonths is enabled, store as array to support multiple months
    if (includeNextMonths > 0) {
      if (!availabilityMap[slot.professional_id][dayKey]) {
        availabilityMap[slot.professional_id][dayKey] = [];
      }
      availabilityMap[slot.professional_id][dayKey].push({
        times: slot.available_times,
        month: slot.month,
        year: slot.year,
      });
    } else {
      // Single month mode: just store the times with metadata
      availabilityMap[slot.professional_id][dayKey] = {
        times: slot.available_times,
        month: slot.month,
        year: slot.year,
      };
    }
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
