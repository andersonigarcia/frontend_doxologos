/**
 * useAdminData — Centraliza o fetch de todos os dados necessários para o AdminPage
 *
 * P-03: Extraído de AdminPage.jsx (originalmente fetchAllData + 7 useState).
 * Benefícios:
 *  - AdminPage.jsx reduz responsabilidade (não gerencia mais fetch + normalização)
 *  - Hook é testável isoladamente
 *  - Outros componentes futuros podem consumir os mesmos dados sem prop drilling
 *
 * NOTA: fetchAllData é intencional como um fetch único manual (não TanStack Query)
 * pois envolve lógica condicional complexa baseada em role (admin vs professional)
 * e normalização de dados que seria difícil de separar em queries independentes
 * sem refatoração mais profunda do schema. Retry manual via refreshData().
 */
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { secureLog } from '@/lib/secureLogger';

// ---------- helpers de normalização (extraídos de AdminPage) ----------

function parseCurrencyToNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const sanitized = String(value).replace(/[^0-9.,-]/g, '');
    if (!sanitized) return null;
    const normalized = sanitized.replace(/\./g, '').replace(',', '.');
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

function normalizeService(service) {
    const patientValue = parseCurrencyToNumber(service.price);
    const payoutValue = parseCurrencyToNumber(
        service.professional_payout === undefined || service.professional_payout === null
            ? service.price
            : service.professional_payout
    );
    return {
        ...service,
        price: Number.isFinite(patientValue) ? patientValue : 0,
        professional_payout: Number.isFinite(payoutValue)
            ? payoutValue
            : Number.isFinite(patientValue) ? patientValue : 0,
        duration_minutes: Number.isFinite(Number.parseInt(service.duration_minutes, 10))
            ? Number.parseInt(service.duration_minutes, 10)
            : service.duration_minutes,
    };
}

function normalizeBooking(booking, serviceMap) {
    const joinedService = booking.service
        ? {
            ...booking.service,
            price: parseCurrencyToNumber(booking.service.price) ?? 0,
            professional_payout: parseCurrencyToNumber(
                booking.service.professional_payout ?? booking.service.price
            ) ?? 0,
            duration_minutes: Number.parseInt(booking.service.duration_minutes, 10) || booking.service.duration_minutes,
        }
        : null;

    const resolvedService = serviceMap.get(booking.service_id) || joinedService;
    const patientValue = parseCurrencyToNumber(booking.valor_consulta) ?? parseCurrencyToNumber(resolvedService?.price) ?? 0;
    const professionalValue = parseCurrencyToNumber(booking.valor_repasse_profissional) ?? parseCurrencyToNumber(resolvedService?.professional_payout ?? resolvedService?.price ?? patientValue) ?? patientValue;

    return {
        ...booking,
        valor_consulta: patientValue,
        valor_repasse_profissional: professionalValue,
        service: resolvedService ? { ...resolvedService } : joinedService,
    };
}

// ---------- hook público ----------

export function useAdminData({ user, userRole }) {
    const [bookings, setBookings] = useState([]);
    const [services, setServices] = useState([]);
    const [professionals, setProfessionals] = useState([]);
    const [availability, setAvailability] = useState({});
    const [blockedDates, setBlockedDates] = useState([]);
    const [events, setEvents] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAvailProfessional, setSelectedAvailProfessional] = useState('');

    const fetchAllData = useCallback(async () => {
        setLoading(true);
        const isAdmin = userRole === 'admin';
        const professionalId = user?.id;

        // Resolver o professional record id (pode diferir do user.id)
        let professionalsRecordId = null;
        if (!isAdmin && professionalId) {
            const { data: profData } = await supabase
                .from('professionals')
                .select('id')
                .eq('user_id', professionalId)
                .maybeSingle();
            professionalsRecordId = profData?.id;
        }
        if (!isAdmin && !professionalsRecordId && professionalId) {
            professionalsRecordId = professionalId;
        }

        const professionalFilterId = isAdmin ? null : professionalsRecordId;

        const reviewSelect = `
      *,
      bookings:bookings!left(
        id,
        professional_id,
        patient_name,
        patient_email,
        booking_date,
        booking_time,
        professional:professionals(id, name)
      )
    `;

        // --- Montar promises condicionais por role ---
        let reviewsPromise;
        if (isAdmin) {
            reviewsPromise = supabase.from('reviews').select(reviewSelect).order('created_at', { ascending: false }).range(0, 99);
        } else if (professionalFilterId) {
            reviewsPromise = (async () => {
                const [directRes, bookingRes] = await Promise.all([
                    supabase.from('reviews').select(reviewSelect).eq('professional_id', professionalFilterId).eq('is_approved', true).order('created_at', { ascending: false }),
                    supabase.from('reviews')
                        .select(`
                            *,
                            bookings:bookings!inner(
                                id,
                                professional_id,
                                patient_name,
                                patient_email,
                                booking_date,
                                booking_time,
                                professional:professionals(id, name)
                            )
                        `)
                        .eq('is_approved', true)
                        .eq('bookings.professional_id', professionalFilterId)
                        .order('created_at', { ascending: false })
                        .range(0, 99),
                ]);
                const firstError = directRes.error || bookingRes.error || null;
                const merged = [...(directRes.data || []), ...(bookingRes.data || [])];
                const unique = [];
                const seen = new Set();
                merged.forEach((r) => { if (r?.id && !seen.has(r.id)) { seen.add(r.id); unique.push(r); } });
                return { data: unique, error: firstError };
            })();
        } else {
            reviewsPromise = Promise.resolve({ data: [], error: null });
        }

        const eventsPromise = isAdmin
            ? supabase.from('eventos').select('*').order('data_inicio', { ascending: false }).range(0, 99)
            : professionalFilterId
                ? supabase.from('eventos').select('*').eq('professional_id', professionalFilterId).order('data_inicio', { ascending: false }).range(0, 99)
                : Promise.resolve({ data: [], error: null });

        const bookingsSelect = '*, meeting_link, meeting_password, meeting_id, meeting_start_url, professional:professionals(name), service:services(id, name, price, duration_minutes, professional_payout)';
        const bookingsPromise = isAdmin
            ? supabase.from('bookings').select(bookingsSelect).order('booking_date', { ascending: false }).order('booking_time', { ascending: false }).range(0, 99)
            : professionalFilterId
                ? supabase.from('bookings').select(bookingsSelect).eq('professional_id', professionalFilterId).order('booking_date', { ascending: false }).order('booking_time', { ascending: false }).range(0, 99)
                : Promise.resolve({ data: [], error: null });

        const servicesPromise = supabase.from('services').select('*');

        const professionalsPromise = isAdmin
            ? supabase.from('professionals').select('*')
            : supabase.from('professionals').select('*').or(`user_id.eq.${professionalId},id.eq.${professionalId}`);

        const availabilityPromise = isAdmin
            ? supabase.from('availability').select('*')
            : professionalFilterId
                ? supabase.from('availability').select('*').eq('professional_id', professionalFilterId)
                : Promise.resolve({ data: [], error: null });

        const blockedDatesPromise = isAdmin
            ? supabase.from('blocked_dates').select('*')
            : professionalFilterId
                ? supabase.from('blocked_dates').select('*').eq('professional_id', professionalFilterId)
                : Promise.resolve({ data: [], error: null });

        const [bookingsRes, servicesRes, profsRes, availRes, blockedDatesRes, eventsRes, reviewsRes] = await Promise.all([
            bookingsPromise, servicesPromise, professionalsPromise,
            availabilityPromise, blockedDatesPromise, eventsPromise, reviewsPromise,
        ]);

        if (profsRes.error) secureLog.error('Erro ao buscar profissionais:', profsRes.error?.message);
        if (reviewsRes.error) secureLog.error('Erro ao buscar avaliações:', reviewsRes.error?.message);

        // Enriquecer profissionais com emails via Edge Function (somente admin)
        const rawProfessionals = profsRes.data || [];
        let enrichedProfessionals = rawProfessionals;

        if (rawProfessionals.length > 0) {
            if (isAdmin) {
                try {
                    const { data, error } = await supabase.functions.invoke('admin-list-users');
                    if (!error && data?.users) {
                        const emailById = new Map(data.users.map((u) => [u.id, u.email]));
                        enrichedProfessionals = rawProfessionals.map((p) => {
                            const lookupId = p.user_id || p.id;
                            const email = p.email || emailById.get(lookupId) || null;
                            return email ? { ...p, email } : p;
                        });
                    } else {
                        secureLog.warn('Não foi possível carregar emails via admin-list-users.', { error });
                    }
                } catch (err) {
                    secureLog.error('Erro ao enriquecer emails dos profissionais:', err?.message);
                }
            } else if (user?.email) {
                enrichedProfessionals = rawProfessionals.map((p) => {
                    const matchesCurrentUser = p.user_id === user.id || p.id === user.id;
                    return !p.email && matchesCurrentUser ? { ...p, email: user.email } : p;
                });
            }
        }

        // Normalizar serviços
        const normalizedServices = (servicesRes.data || []).map(normalizeService);
        const serviceMap = new Map(normalizedServices.map((s) => [s.id, s]));

        // Normalizar agendamentos
        const normalizedBookings = (bookingsRes.data || []).map((b) => normalizeBooking(b, serviceMap));

        // Setar profissionais + selectedAvailProfessional
        setProfessionals(enrichedProfessionals);
        if (enrichedProfessionals.length > 0) {
            setSelectedAvailProfessional(enrichedProfessionals[0].id);
        } else if (!isAdmin && professionalId) {
            secureLog.warn('Nenhum registro de profissional encontrado para o usuário atual.');
        }

        // Mapear profissionais nos eventos + contagem inscrições
        const eventsWithProfessionals = await Promise.all(
            (eventsRes.data || []).map(async (event) => {
                const professional = enrichedProfessionals.find((p) => p.id === event.professional_id);
                let inscricoesCount = 0;
                try {
                    const { count, error } = await supabase
                        .from('inscricoes_eventos')
                        .select('*', { count: 'exact', head: true })
                        .eq('evento_id', event.id)
                        .in('status', ['pending', 'confirmed']);
                    if (!error) inscricoesCount = count || 0;
                } catch { /* silenciar */ }
                return {
                    ...event,
                    professional: professional ? { name: professional.name } : null,
                    inscricoes_eventos: [{ count: inscricoesCount }],
                };
            })
        );

        // Normalizar avaliações
        const reviewsWithProfessionals = (reviewsRes.data || []).map((review) => {
            const bookingRelation = Array.isArray(review.bookings) ? review.bookings[0] : review.bookings;
            const professionalFromBooking = bookingRelation?.professional;
            const fallbackProfessional = enrichedProfessionals.find(
                (p) => p.id === (bookingRelation?.professional_id ?? review.professional_id)
            );
            const resolvedProfessional = professionalFromBooking
                ? { id: professionalFromBooking.id, name: professionalFromBooking.name }
                : fallbackProfessional
                    ? { id: fallbackProfessional.id, name: fallbackProfessional.name }
                    : review.professional || null;

            return {
                ...review,
                bookings: bookingRelation,
                patient_name: review.patient_name || bookingRelation?.patient_name || review.patient_email || bookingRelation?.patient_email || null,
                patient_email: review.patient_email || bookingRelation?.patient_email || null,
                professional: resolvedProfessional,
            };
        }).filter(review => {
            // SECURITY: Filtro redundante no frontend para garantir que profissionais
            // não vejam avaliações de outros, mesmo que a query falhe em filtrar.
            if (isAdmin) return true;
            if (!professionalFilterId) return false;

            const reviewProfId = review.professional_id;
            const bookingProfId = review.bookings?.professional_id;

            return reviewProfId === professionalFilterId || bookingProfId === professionalFilterId;
        });

        // Mapear availability
        const availabilityMap = {};
        (availRes.data || []).forEach((avail) => {
            if (!availabilityMap[avail.professional_id]) {
                availabilityMap[avail.professional_id] = { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] };
            }
            availabilityMap[avail.professional_id][avail.day_of_week] = avail.available_times;
        });

        setServices(normalizedServices);
        setBookings(normalizedBookings);
        setEvents(eventsWithProfessionals);
        setBlockedDates(blockedDatesRes.data || []);
        setReviews(isAdmin ? reviewsWithProfessionals : reviewsWithProfessionals.filter((r) => r.is_approved));
        setAvailability(availabilityMap);
        setLoading(false);
    }, [user, userRole]);

    useEffect(() => {
        if (user) fetchAllData();
    }, [user, fetchAllData]);

    return {
        bookings, services, professionals, availability,
        blockedDates, events, reviews, loading,
        selectedAvailProfessional, setSelectedAvailProfessional,
        refreshData: fetchAllData,
    };
}

export default useAdminData;
