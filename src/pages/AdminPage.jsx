

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, LogOut, Briefcase, Trash2, Edit, Users, UserPlus, CalendarX, Star, Check, ShieldOff, MessageCircle, DollarSign, Loader2, ChevronDown, ChevronUp, ShieldCheck, Stethoscope, UserCircle, Menu, X, Ticket, TrendingUp, LayoutDashboard, Activity, List, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import ConfirmDialog from '@/components/ConfirmDialog';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { bookingEmailManager } from '@/lib/bookingEmailManager';
import { secureLog } from '@/lib/secureLogger';
import { useLoadingState, useItemLoadingState } from '@/hooks/useLoadingState';
import { LoadingOverlay, LoadingButton, LoadingSpinner, LoadingInput } from '@/components/LoadingOverlay';
import UserBadge from '@/components/UserBadge';
import EventRegistrationsDashboard from '@/components/admin/EventRegistrationsDashboard';
// Fase 5 - Dashboard Profissional
import { DashboardCard } from '@/components/shared/DashboardCard';
import { StatCard } from '@/components/common/StatCard';
import { TimelineView } from '@/components/common/TimelineView';
import { QuickActions } from '@/components/common/QuickActions';
import { RevenueChart } from '@/components/admin/RevenueChart';
import { AppointmentCalendar } from '@/components/admin/AppointmentCalendar';
import { PatientList } from '@/components/admin/PatientList';
import { PatientDetailsModal } from '@/components/admin/PatientDetailsModal';
import { FinancialDashboard } from '@/components/admin/FinancialDashboard';
import { ProfessionalPaymentsList } from '@/components/admin/ProfessionalPaymentsList';
import { PaymentFormModal } from '@/components/admin/PaymentFormModal';
import { PaymentDetailsModal } from '@/components/admin/PaymentDetailsModal';
import { ProfitLossDashboard } from '@/components/admin/ProfitLossDashboard';
import { LedgerTable } from '@/components/admin/LedgerTable';
import { LedgerStats } from '@/components/admin/LedgerStats';
import { CostFormModal } from '@/components/admin/CostFormModal';
import { ProtectedAction } from '@/components/auth/ProtectedAction';
import { auditLogger, AuditAction } from '@/lib/auditLogger';
import { useProfessionalStats } from '@/hooks/useProfessionalStats';
import { useMonthlyRevenue } from '@/hooks/useMonthlyRevenue';
import { usePatientData } from '@/hooks/usePatientData';
import { cn } from '@/lib/utils';
import { tabsConfig } from '@/config/tabsConfig';



const ROLE_DISPLAY = {
    admin: { label: 'Administrador', classes: 'bg-purple-100 text-purple-800 border-purple-200', Icon: ShieldCheck },
    professional: { label: 'Profissional', classes: 'bg-blue-100 text-blue-800 border-blue-200', Icon: Stethoscope },
    patient: { label: 'Paciente', classes: 'bg-gray-100 text-gray-800 border-gray-200', Icon: UserCircle },
    user: { label: 'Usuário', classes: 'bg-gray-100 text-gray-800 border-gray-200', Icon: UserCircle }
};

const MIN_PROFESSIONAL_PASSWORD_LENGTH = 6;

const sanitizeCurrencyInput = (value) => {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[^0-9.,-]/g, '');
};

const parseCurrencyToNumber = (value) => {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }

    const sanitized = sanitizeCurrencyInput(value);
    if (!sanitized) {
        return null;
    }

    const normalized = sanitized.replace(/\./g, '').replace(',', '.');
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
};

const formatNumberToCurrencyInput = (value) => {
    if (value === null || value === undefined || value === '') {
        return '';
    }

    const numberValue = typeof value === 'string' ? parseCurrencyToNumber(value) : value;
    if (!Number.isFinite(numberValue)) {
        return '';
    }

    return numberValue.toFixed(2).replace('.', ',');
};

const AdminPage = () => {
    const { toast } = useToast();
    const { user, userRole, signIn, signOut, updatePassword } = useAuth();
    const [loginData, setLoginData] = useState({ email: '', password: '' });
    const [bookings, setBookings] = useState([]);
    const [services, setServices] = useState([]);
    const [availability, setAvailability] = useState({});
    const [blockedDates, setBlockedDates] = useState([]);
    const [events, setEvents] = useState([]);
    const [professionals, setProfessionals] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSavingProfessionalProfile, setIsSavingProfessionalProfile] = useState(false);
    const [passwordFormData, setPasswordFormData] = useState({ newPassword: '', confirmPassword: '' });
    const [isSavingPassword, setIsSavingPassword] = useState(false);

    const [isEditingService, setIsEditingService] = useState(false);
    const [serviceFormData, setServiceFormData] = useState({ id: null, name: '', price: '', professional_payout: '', duration_minutes: '50' });

    const [isEditingProfessional, setIsEditingProfessional] = useState(false);
    const [professionalFormData, setProfessionalFormData] = useState({ id: null, name: '', services_ids: [], email: '', password: '', mini_curriculum: '', description: '', image_url: '' });

    const [selectedAvailProfessional, setSelectedAvailProfessional] = useState('');
    const [professionalAvailability, setProfessionalAvailability] = useState({});
    const [professionalBlockedDates, setProfessionalBlockedDates] = useState([]);
    const [newBlockedDate, setNewBlockedDate] = useState({ date: '', start_time: '', end_time: '', reason: '' });
    const [focusedDay, setFocusedDay] = useState('monday');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const [eventFormData, setEventFormData] = useState({
        id: null,
        titulo: '',
        descricao: '',
        tipo_evento: 'Workshop',
        data_inicio: '',
        data_fim: '',
        professional_id: '',
        limite_participantes: '',
        data_limite_inscricao: '',
        valor: 0,
        link_slug: '',
        data_inicio_exibicao: '',
        data_fim_exibicao: '',
        vagas_disponiveis: 0,
        meeting_link: '',
        meeting_password: '',
        meeting_id: '',
        meeting_start_url: '',
        ativo: true
    });
    const [isEditingEvent, setIsEditingEvent] = useState(false);
    const [eventFormErrors, setEventFormErrors] = useState({});
    const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
    const [showManualZoomFields, setShowManualZoomFields] = useState(false);
    const [isFreeEvent, setIsFreeEvent] = useState(true);

    const generateUniqueSlug = (title) => {
        const baseSlug = title
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');

        const timestamp = Date.now().toString().slice(-6);
        return `${baseSlug}-${timestamp}`;
    };

    const slugifyTitle = (title) => {
        if (!title) return '';
        return title
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    };

    const parseDateTime = (value) => {
        if (!value) return null;
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    const normalizeDateTime = (value) => {
        if (!value) return null;
        return value.length === 16 ? `${value}:00` : value;
    };

    const sanitizeNullableText = (value) => {
        if (value === null || value === undefined) return null;
        const trimmed = String(value).trim();
        return trimmed.length > 0 ? trimmed : null;
    };

    const clearEventError = (field) => {
        if (eventFormErrors[field]) {
            setEventFormErrors((prev) => ({ ...prev, [field]: undefined }));
        }
    };

    const [editingBooking, setEditingBooking] = useState(null);
    const [bookingEditData, setBookingEditData] = useState({
        booking_date: '',
        booking_time: '',
        status: '',
        professional_id: '',
        service_id: '',
        patient_name: '',
        patient_email: '',
        patient_phone: '',
        valor_consulta: '',
        valor_repasse_profissional: ''
    });

    const [bookingFilters, setBookingFilters] = useState({
        service_id: '',
        professional_id: '',
        status: '',
        date_from: '',
        date_to: '',
        search: ''
    });
    const [showFilters, setShowFilters] = useState(false);

    const [bookingSortField, setBookingSortField] = useState('default');
    const [bookingSortOrder, setBookingSortOrder] = useState('asc');
    const [activeTab, setActiveTab] = useState('bookings');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [bookingView, setBookingView] = useState('list'); // 'list' ou 'calendar'

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [expandedZoomCards, setExpandedZoomCards] = useState({});

    const currentProfessional = useMemo(() => {
        if (!user) return null;
        return professionals.find((prof) => prof?.user_id === user.id || prof?.id === user.id) || null;
    }, [professionals, user]);

    const isAdminView = userRole === 'admin';
    const isProfessionalView = userRole === 'professional';

    const professionalServiceIds = useMemo(() => {
        if (!isProfessionalView) return [];
        const ids = currentProfessional?.services_ids;
        return Array.isArray(ids) ? ids : [];
    }, [isProfessionalView, currentProfessional]);

    const professionalServiceIdSet = useMemo(() => new Set(professionalServiceIds), [professionalServiceIds]);
    const servicePricingPreview = useMemo(() => {
        const patientValue = parseCurrencyToNumber(serviceFormData.price);
        const payoutValue = parseCurrencyToNumber(
            serviceFormData.professional_payout === '' ? serviceFormData.price : serviceFormData.professional_payout
        );

        const safePatientValue = Number.isFinite(patientValue) ? patientValue : 0;
        const safePayoutValue = Number.isFinite(payoutValue) ? payoutValue : safePatientValue;

        return {
            patientValue: safePatientValue,
            professionalValue: safePayoutValue,
            platformFee: Math.max(safePatientValue - safePayoutValue, 0)
        };
    }, [serviceFormData.price, serviceFormData.professional_payout]);

    const priceNumber = Number(eventFormData.valor);
    const hasPaidValue = Number.isFinite(priceNumber) && priceNumber > 0;

    // Sistema de Loading Global
    const { isLoading, withLoading, isAnyLoading } = useLoadingState();
    const { isItemLoading, withItemLoading, isAnyItemLoading } = useItemLoadingState();

    // Estados para modais de confirmação
    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        warningMessage: '',
        onConfirm: null,
        type: 'danger'
    });

    const fetchAllData = useCallback(async () => {

        setLoading(true);
        const isAdmin = userRole === 'admin';
        const professionalId = user?.id;

        // Se for profissional, buscar o professional_id associado
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
            secureLog.debug('Usando fallback de professionalId para consultas vinculadas ao profissional atual.', { professionalId });
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

        let reviewsPromise;
        if (isAdmin) {
            reviewsPromise = supabase
                .from('reviews')
                .select(reviewSelect)
                .order('created_at', { ascending: false });
        } else if (professionalFilterId) {
            reviewsPromise = (async () => {
                const [directRes, bookingRes] = await Promise.all([
                    supabase
                        .from('reviews')
                        .select(reviewSelect)
                        .eq('professional_id', professionalFilterId)
                        .eq('is_approved', true)
                        .order('created_at', { ascending: false }),
                    supabase
                        .from('reviews')
                        .select(reviewSelect)
                        .eq('is_approved', true)
                        .eq('bookings.professional_id', professionalFilterId)
                        .order('created_at', { ascending: false })
                ]);

                const firstError = directRes.error || bookingRes.error || null;
                const mergedData = [...(directRes.data || []), ...(bookingRes.data || [])];

                if (mergedData.length === 0) {
                    return { data: [], error: firstError };
                }

                const uniqueById = [];
                const seenIds = new Set();
                mergedData.forEach(review => {
                    if (review?.id && !seenIds.has(review.id)) {
                        seenIds.add(review.id);
                        uniqueById.push(review);
                    }
                });

                return { data: uniqueById, error: firstError };
            })();
        } else {
            reviewsPromise = Promise.resolve({ data: [], error: null });
        }

        const eventsPromise = isAdmin
            ? supabase
                .from('eventos')
                .select('*')
                .order('data_inicio', { ascending: false })
            : professionalFilterId
                ? supabase
                    .from('eventos')
                    .select('*')
                    .eq('professional_id', professionalFilterId)
                    .order('data_inicio', { ascending: false })
                : Promise.resolve({ data: [], error: null });

        const bookingsPromise = isAdmin
            ? supabase.from('bookings').select('*, meeting_link, meeting_password, meeting_id, meeting_start_url, professional:professionals(name), service:services(id, name, price, duration_minutes, professional_payout)')
            : professionalFilterId
                ? supabase.from('bookings').select('*, meeting_link, meeting_password, meeting_id, meeting_start_url, professional:professionals(name), service:services(id, name, price, duration_minutes, professional_payout)').eq('professional_id', professionalFilterId)
                : Promise.resolve({ data: [], error: null });

        const servicesPromise = supabase.from('services').select('*');

        const professionalsPromise = isAdmin
            ? supabase.from('professionals').select('*')
            : supabase
                .from('professionals')
                .select('*')
                .or(`user_id.eq.${professionalId},id.eq.${professionalId}`);

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

        const promises = [
            bookingsPromise,
            servicesPromise,
            professionalsPromise,
            availabilityPromise,
            blockedDatesPromise,
            eventsPromise,
            reviewsPromise
        ];

        const [bookingsRes, servicesRes, profsRes, availRes, blockedDatesRes, eventsRes, reviewsRes] = await Promise.all(promises);

        if (profsRes.error) {
            secureLog.error('Erro ao buscar profissionais:', profsRes.error?.message || profsRes.error);
            secureLog.debug('Detalhes do erro ao buscar profissionais', profsRes.error);
        }

        if (reviewsRes.error) {
            secureLog.error('Erro ao buscar avaliações:', reviewsRes.error?.message || reviewsRes.error);
            secureLog.debug('Detalhes do erro ao buscar avaliações', reviewsRes.error);
        }

        const rawProfessionals = profsRes.data || [];
        let enrichedProfessionals = rawProfessionals;

        if (rawProfessionals.length > 0) {
            if (isAdmin) {
                try {
                    const { data: sessionData } = await supabase.auth.getSession();
                    const accessToken = sessionData?.session?.access_token;

                    if (accessToken) {
                        const response = await fetch(
                            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-list-users`,
                            {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${accessToken}`,
                                    'Content-Type': 'application/json'
                                }
                            }
                        );

                        if (response.ok) {
                            const { users: authUsers } = await response.json();
                            const emailById = new Map(authUsers.map(authUser => [authUser.id, authUser.email]));

                            enrichedProfessionals = rawProfessionals.map(professional => {
                                const lookupId = professional.user_id || professional.id;
                                const resolvedEmail = professional.email || emailById.get(lookupId) || null;

                                return resolvedEmail
                                    ? { ...professional, email: resolvedEmail }
                                    : professional;
                            });
                        } else {
                            secureLog.warn('Não foi possível carregar emails via função admin-list-users.', { status: response.status });
                        }
                    } else {
                        secureLog.warn('Token de sessão ausente ao tentar enriquecer emails dos profissionais.');
                    }
                } catch (error) {
                    secureLog.error('Erro ao enriquecer emails dos profissionais:', error?.message || error);
                    secureLog.debug('Detalhes do erro ao enriquecer emails dos profissionais', error);
                }
            } else if (user?.email) {
                enrichedProfessionals = rawProfessionals.map(professional => {
                    const matchesCurrentUser = professional.user_id === user.id || professional.id === user.id;
                    if (!professional.email && matchesCurrentUser) {
                        return { ...professional, email: user.email };
                    }
                    return professional;
                });
            }
        }

        const normalizedServices = (servicesRes.data || []).map((service) => {
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
                    : (Number.isFinite(patientValue) ? patientValue : 0),
                duration_minutes: Number.isFinite(Number.parseInt(service.duration_minutes, 10))
                    ? Number.parseInt(service.duration_minutes, 10)
                    : service.duration_minutes
            };
        });

        const serviceMap = new Map(normalizedServices.map((service) => [service.id, service]));

        const normalizedBookings = (bookingsRes.data || []).map((booking) => {
            const joinedService = booking.service
                ? {
                    ...booking.service,
                    price: Number.isFinite(parseCurrencyToNumber(booking.service.price))
                        ? parseCurrencyToNumber(booking.service.price)
                        : 0,
                    professional_payout: Number.isFinite(
                        parseCurrencyToNumber(
                            booking.service.professional_payout === undefined || booking.service.professional_payout === null
                                ? booking.service.price
                                : booking.service.professional_payout
                        )
                    )
                        ? parseCurrencyToNumber(
                            booking.service.professional_payout === undefined || booking.service.professional_payout === null
                                ? booking.service.price
                                : booking.service.professional_payout
                        )
                        : 0,
                    duration_minutes: Number.isFinite(Number.parseInt(booking.service.duration_minutes, 10))
                        ? Number.parseInt(booking.service.duration_minutes, 10)
                        : booking.service.duration_minutes
                }
                : null;

            const resolvedService = serviceMap.get(booking.service_id) || joinedService;

            const patientValueRaw = parseCurrencyToNumber(booking.valor_consulta);
            const fallbackPatientValue = parseCurrencyToNumber(resolvedService?.price);
            const patientValue = Number.isFinite(patientValueRaw)
                ? patientValueRaw
                : (Number.isFinite(fallbackPatientValue) ? fallbackPatientValue : 0);

            const payoutValueRaw = parseCurrencyToNumber(booking.valor_repasse_profissional);
            const fallbackPayoutValue = parseCurrencyToNumber(
                resolvedService?.professional_payout ?? resolvedService?.price ?? patientValue
            );
            const professionalValue = Number.isFinite(payoutValueRaw)
                ? payoutValueRaw
                : (Number.isFinite(fallbackPayoutValue) ? fallbackPayoutValue : patientValue);

            return {
                ...booking,
                valor_consulta: patientValue,
                valor_repasse_profissional: professionalValue,
                service: resolvedService ? { ...resolvedService } : joinedService
            };
        });

        setServices(normalizedServices);
        setBookings(normalizedBookings);
        setProfessionals(enrichedProfessionals);
        if (enrichedProfessionals.length > 0) {
            // Para admin, usa o primeiro profissional da lista
            // Para professional, usa sempre o registro encontrado para o usuário logado
            const profIdToSelect = isAdmin ? enrichedProfessionals[0].id : enrichedProfessionals[0].id;
            if (profIdToSelect) {
                setSelectedAvailProfessional(profIdToSelect);
            }
        } else if (!isAdmin && professionalId) {
            secureLog.warn('Nenhum registro de profissional encontrado para o usuário atual.');
            secureLog.debug('Profissional sem registro associado', { professionalId });
        }
        // Mapear profissionais aos eventos e carregar contagem de inscrições
        const eventsWithProfessionals = await Promise.all((eventsRes.data || []).map(async (event) => {
            const professional = enrichedProfessionals.find(p => p.id === event.professional_id);

            // Tentar buscar contagem real de inscrições
            let inscricoesCount = 0;
            try {
                const { count, error } = await supabase
                    .from('inscricoes_eventos')
                    .select('*', { count: 'exact', head: true })
                    .eq('evento_id', event.id)
                    .in('status', ['pending', 'confirmed']);

                if (!error) {
                    inscricoesCount = count || 0;
                }
            } catch (error) {

            }

            return {
                ...event,
                professional: professional ? { name: professional.name } : null,
                inscricoes_eventos: [{ count: inscricoesCount }]
            };
        }));

        setEvents(eventsWithProfessionals);
        setBlockedDates(blockedDatesRes.data || []);

        const reviewsWithProfessionals = (reviewsRes.data || []).map(review => {
            const bookingRelation = Array.isArray(review.bookings) ? review.bookings[0] : review.bookings;
            const professionalFromBooking = bookingRelation?.professional;
            const fallbackProfessional = enrichedProfessionals.find(p => p.id === (bookingRelation?.professional_id ?? review.professional_id));
            const resolvedProfessional = professionalFromBooking
                ? { id: professionalFromBooking.id, name: professionalFromBooking.name }
                : fallbackProfessional
                    ? { id: fallbackProfessional.id, name: fallbackProfessional.name }
                    : review.professional || null;

            const resolvedPatientName = review.patient_name
                || bookingRelation?.patient_name
                || review.patient_email
                || bookingRelation?.patient_email
                || null;

            const resolvedPatientEmail = review.patient_email || bookingRelation?.patient_email || null;

            return {
                ...review,
                bookings: bookingRelation,
                patient_name: resolvedPatientName,
                patient_email: resolvedPatientEmail,
                professional: resolvedProfessional
            };
        });

        const filteredReviews = isAdmin
            ? reviewsWithProfessionals
            : reviewsWithProfessionals.filter(review => review.is_approved);

        setReviews(filteredReviews);

        const availabilityMap = {};
        (availRes.data || []).forEach(avail => {
            if (!availabilityMap[avail.professional_id]) {
                availabilityMap[avail.professional_id] = { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] };
            }
            availabilityMap[avail.professional_id][avail.day_of_week] = avail.available_times;
        });
        setAvailability(availabilityMap);

        setLoading(false);
    }, [user, userRole]);

    useEffect(() => { if (user) fetchAllData(); }, [user, fetchAllData]);

    // Auto-inicializar edição para profissionais
    useEffect(() => {
        if (userRole === 'professional' && professionals.length > 0) {
            const currentProfessional = professionals[0]; // Já filtrado para o profissional atual
            if (currentProfessional && !isEditingProfessional) {
                handleEditProfessional(currentProfessional);
            }
        }
    }, [professionals, userRole, isEditingProfessional]);

    useEffect(() => {
        const profId = userRole === 'admin' ? selectedAvailProfessional : professionals[0]?.id;

        if (profId) {
            // Carregar disponibilidade específica do mês/ano selecionados
            const fetchMonthlyAvailability = async () => {
                try {
                    const { data: availData, error } = await supabase
                        .from('availability')
                        .select('*')
                        .eq('professional_id', profId)
                        .eq('month', selectedMonth)
                        .eq('year', selectedYear);

                    if (!error && availData) {
                        const monthlyAvailability = {
                            monday: [],
                            tuesday: [],
                            wednesday: [],
                            thursday: [],
                            friday: [],
                            saturday: [],
                            sunday: []
                        };

                        availData.forEach(item => {
                            if (item.available_times) {
                                monthlyAvailability[item.day_of_week] = item.available_times;
                            }
                        });

                        setProfessionalAvailability(monthlyAvailability);
                    } else {
                        // Se não há dados para este mês/ano, inicializar vazio
                        setProfessionalAvailability({
                            monday: [],
                            tuesday: [],
                            wednesday: [],
                            thursday: [],
                            friday: [],
                            saturday: [],
                            sunday: []
                        });
                    }
                } catch (error) {
                    secureLog.error('Erro ao carregar disponibilidade mensal:', error?.message || error);
                    secureLog.debug('Detalhes do erro ao carregar disponibilidade mensal', error);
                }
            };

            fetchMonthlyAvailability();
            setProfessionalBlockedDates(blockedDates.filter(d => d.professional_id === profId));
        } else {
            // Limpar quando não há profissional selecionado
            setProfessionalAvailability({
                monday: [],
                tuesday: [],
                wednesday: [],
                thursday: [],
                friday: [],
                saturday: [],
                sunday: []
            });
            setProfessionalBlockedDates([]);
        }
    }, [selectedAvailProfessional, user, userRole, selectedMonth, selectedYear, blockedDates]);

    // Definir tabsConfig ANTES de usá-lo em useEffect

    // Hook de estatísticas do profissional (usado apenas para profissionais)
    const professionalStats = useProfessionalStats(
        isProfessionalView ? currentProfessional?.id : null
    );

    // Hook de receita mensal (usado apenas para profissionais)
    const monthlyRevenue = useMonthlyRevenue(
        isProfessionalView ? currentProfessional?.id : null,
        6 // Últimos 6 meses
    );

    // Hook de dados de pacientes (usado apenas para profissionais)
    const patientData = usePatientData(
        isProfessionalView ? currentProfessional?.id : null
    );

    // Estado para modal de detalhes do paciente
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);

    // Estado para modais de pagamento
    const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
    const [isPaymentDetailsOpen, setIsPaymentDetailsOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [paymentBookings, setPaymentBookings] = useState([]);
    const [paymentRefreshKey, setPaymentRefreshKey] = useState(0);

    // Estado para modal de custos (P&L)
    const [isCostFormOpen, setIsCostFormOpen] = useState(false);
    const [selectedCost, setSelectedCost] = useState(null);
    const [costDeleteConfirmOpen, setCostDeleteConfirmOpen] = useState(false);
    const [costToDelete, setCostToDelete] = useState(null);
    const [costRefreshKey, setCostRefreshKey] = useState(0);

    // Handler para salvar observações do paciente
    const handleSavePatientNotes = async (patientEmail, notes) => {
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const accessToken = sessionData?.session?.access_token;

            if (!accessToken) {
                throw new Error('Sessão expirada. Faça login novamente.');
            }

            const { data, error } = await supabase.functions.invoke('patient-notes-manager', {
                body: {
                    action: 'save',
                    patient_email: patientEmail,
                    patient_name: selectedPatient?.name || null,
                    notes
                },
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            // Atualizar o paciente selecionado com as novas observações
            if (selectedPatient) {
                setSelectedPatient(prev => ({ ...prev, notes }));
            }

            return data;
        } catch (error) {
            console.error('Erro ao salvar observações:', error);
            throw error;
        }
    };

    // Handler para abrir modal de paciente e carregar observações
    const handlePatientClick = async (patient) => {
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const accessToken = sessionData?.session?.access_token;

            if (!accessToken) {
                throw new Error('Sessão expirada');
            }

            // Carregar observações do paciente
            const { data } = await supabase.functions.invoke('patient-notes-manager', {
                body: {
                    action: 'get',
                    patient_email: patient.email
                },
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            setSelectedPatient({
                ...patient,
                notes: data?.notes || ''
            });
            setIsPatientModalOpen(true);
        } catch (error) {
            console.error('Erro ao carregar observações do paciente:', error);
            // Abrir modal mesmo se falhar ao carregar observações
            setSelectedPatient({
                ...patient,
                notes: ''
            });
            setIsPatientModalOpen(true);
        }
    };


    useEffect(() => {
        const currentTabs = tabsConfig[userRole] || [];
        if (!currentTabs.find(tab => tab.value === activeTab)) {
            setActiveTab(currentTabs[0]?.value || 'bookings');
        }
    }, [userRole, activeTab, tabsConfig]);

    useEffect(() => {
        if (!currentProfessional) {
            if (userRole !== 'admin') {
                setIsEditingProfessional(false);
            }
            return;
        }

        if (userRole !== 'admin') {
            setIsEditingProfessional(true);
            setProfessionalFormData(prev => {
                if (prev?.id === currentProfessional.id) {
                    return {
                        ...prev,
                        email: currentProfessional.email || prev.email,
                        services_ids: currentProfessional.services_ids || prev.services_ids || []
                    };
                }
                return {
                    ...currentProfessional,
                    password: '',
                    services_ids: currentProfessional.services_ids || []
                };
            });
        }
    }, [userRole, currentProfessional]);

    const handleLogin = async (e) => { e.preventDefault(); await signIn(loginData.email, loginData.password); };
    const handleLogout = async () => { await signOut(); setLoginData({ email: '', password: '' }); };

    const handleServiceSubmit = async (e) => {
        e.preventDefault();

        const trimmedName = (serviceFormData.name || '').trim();
        const priceNumber = parseCurrencyToNumber(serviceFormData.price);
        const payoutInput = serviceFormData.professional_payout === ''
            ? serviceFormData.price
            : serviceFormData.professional_payout;
        const payoutNumber = parseCurrencyToNumber(payoutInput);
        const durationNumber = Number.parseInt(serviceFormData.duration_minutes, 10);

        if (!trimmedName) {
            toast({ variant: 'destructive', title: 'Nome do serviço é obrigatório' });
            return;
        }

        if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
            toast({ variant: 'destructive', title: 'Informe um valor válido cobrado do paciente.' });
            return;
        }

        if (!Number.isFinite(payoutNumber) || payoutNumber < 0) {
            toast({ variant: 'destructive', title: 'Informe um repasse válido para o profissional.' });
            return;
        }

        if (payoutNumber > priceNumber) {
            toast({ variant: 'destructive', title: 'O repasse não pode ser maior que o valor cobrado.' });
            return;
        }

        if (!Number.isFinite(durationNumber) || durationNumber <= 0) {
            toast({ variant: 'destructive', title: 'Informe a duração em minutos.' });
            return;
        }

        const payload = {
            name: trimmedName,
            price: priceNumber,
            professional_payout: payoutNumber,
            duration_minutes: durationNumber
        };

        let result;
        if (isEditingService) {
            result = await supabase.from('services').update(payload).eq('id', serviceFormData.id);
        } else {
            result = await supabase.from('services').insert([payload]);
        }

        if (result.error) {
            secureLog.error('Erro ao salvar serviço:', result.error?.message || result.error);
            secureLog.debug('Detalhes do erro ao salvar serviço', result.error);
            toast({
                variant: "destructive",
                title: "Erro ao salvar serviço",
                description: result.error.message
            });
        } else {
            toast({ title: `Serviço ${isEditingService ? 'atualizado' : 'criado'} com sucesso!` });
            resetServiceForm();
            fetchAllData();
        }
    };

    const handleProfessionalSubmit = async (e) => {
        e.preventDefault();
        const { id, email, password, ...profData } = professionalFormData;
        const isSelfUpdate = userRole !== 'admin';
        const trimmedEmail = (email || '').trim();

        if (!trimmedEmail) {
            toast({ variant: 'destructive', title: 'Email obrigatório', description: 'Informe um email válido para continuar.' });
            return;
        }

        if (isEditingProfessional) {
            if (!id) {
                toast({ variant: 'destructive', title: 'Registro não encontrado', description: 'Não foi possível localizar seu cadastro.' });
                return;
            }

            const trimmedAdminPassword = userRole === 'admin' ? (professionalFormData.password || '').trim() : '';

            if (trimmedAdminPassword && trimmedAdminPassword.length < MIN_PROFESSIONAL_PASSWORD_LENGTH) {
                toast({
                    variant: 'destructive',
                    title: 'Senha muito curta',
                    description: `A nova senha deve ter pelo menos ${MIN_PROFESSIONAL_PASSWORD_LENGTH} caracteres.`
                });
                return;
            }

            try {
                setIsSavingProfessionalProfile(true);

                const updates = {
                    ...profData,
                    services_ids: Array.isArray(profData.services_ids) ? profData.services_ids : []
                };

                const { error } = await supabase
                    .from('professionals')
                    .update(updates)
                    .eq('id', id);

                if (error) {
                    toast({ variant: 'destructive', title: 'Erro ao atualizar profissional', description: error.message });
                    return;
                }

                const currentUserEmail = (user?.email || '').trim();
                const hasEmailChanged = isSelfUpdate && user && trimmedEmail.toLowerCase() !== currentUserEmail.toLowerCase();

                if (hasEmailChanged) {
                    const { error: emailUpdateError } = await supabase.auth.updateUser({ email: trimmedEmail });
                    if (emailUpdateError) {
                        toast({
                            variant: 'destructive',
                            title: 'Erro ao atualizar email',
                            description: emailUpdateError.message || 'Não foi possível atualizar o email de acesso.'
                        });
                    } else {
                        toast({
                            title: 'Confirme o novo email',
                            description: 'Enviamos um link de confirmação para o novo endereço. Conclua o processo para finalizar a alteração.'
                        });
                    }
                }

                if (userRole === 'admin' && trimmedAdminPassword) {
                    const adminTargetUserId = professionalFormData.user_id || professionalFormData.id;

                    if (!adminTargetUserId) {
                        toast({
                            variant: 'destructive',
                            title: 'Usuário não associado',
                            description: 'Não foi possível localizar o usuário de autenticação para atualizar a senha.'
                        });
                    } else {
                        try {
                            const { data: sessionData } = await supabase.auth.getSession();
                            const accessToken = sessionData?.session?.access_token;

                            if (!accessToken) {
                                toast({
                                    variant: 'destructive',
                                    title: 'Sessão expirada',
                                    description: 'Faça login novamente para concluir a redefinição de senha do profissional.'
                                });
                            } else {
                                const response = await fetch(
                                    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-update-user`,
                                    {
                                        method: 'POST',
                                        headers: {
                                            'Authorization': `Bearer ${accessToken}`,
                                            'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify({
                                            userId: adminTargetUserId,
                                            userData: { password: trimmedAdminPassword }
                                        })
                                    }
                                );

                                const payload = await response.json().catch(() => ({}));

                                if (!response.ok) {
                                    toast({
                                        variant: 'destructive',
                                        title: 'Erro ao atualizar senha',
                                        description: payload?.error || 'Não foi possível redefinir a senha do profissional.'
                                    });
                                } else {
                                    toast({
                                        title: 'Senha redefinida!',
                                        description: 'O profissional já pode acessar com a nova senha informada.'
                                    });
                                }
                            }
                        } catch (passwordError) {
                            secureLog.error('Erro inesperado ao redefinir senha do profissional:', passwordError?.message || passwordError);
                            secureLog.debug('Detalhes do erro inesperado ao redefinir senha do profissional', passwordError);
                            toast({
                                variant: 'destructive',
                                title: 'Erro inesperado',
                                description: 'Não foi possível atualizar a senha do profissional.'
                            });
                        }
                    }
                }

                toast({
                    title: isSelfUpdate ? 'Dados atualizados!' : 'Profissional atualizado!',
                    description: isSelfUpdate ? 'Seu perfil profissional foi salvo com sucesso.' : undefined
                });

                if (!isSelfUpdate) {
                    resetProfessionalForm();
                }

                await fetchAllData();
            } catch (error) {
                secureLog.error('Erro inesperado ao atualizar profissional:', error?.message || error);
                secureLog.debug('Detalhes do erro inesperado ao atualizar profissional', error);
                toast({ variant: 'destructive', title: 'Erro inesperado', description: 'Não foi possível atualizar o cadastro.' });
            } finally {
                setIsSavingProfessionalProfile(false);
            }
        } else {
            try {
                setIsSavingProfessionalProfile(true);
                let createdUserId = null;

                if (userRole === 'admin') {
                    const { data: sessionData } = await supabase.auth.getSession();
                    const accessToken = sessionData?.session?.access_token;

                    if (!accessToken) {
                        toast({
                            variant: 'destructive',
                            title: 'Sessão expirada',
                            description: 'Faça login novamente para criar novos profissionais.'
                        });
                        return;
                    }

                    const response = await fetch(
                        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`,
                        {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${accessToken}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                email: trimmedEmail,
                                password,
                                userMetadata: {
                                    role: 'professional',
                                    full_name: profData.name
                                },
                                appMetadata: {
                                    role: 'professional'
                                }
                            })
                        }
                    );

                    const payload = await response.json();

                    if (!response.ok) {
                        toast({
                            variant: 'destructive',
                            title: 'Erro ao criar usuário',
                            description: payload?.error || 'Não foi possível criar o usuário profissional.'
                        });
                        return;
                    }

                    createdUserId = payload?.user?.id || null;

                    if (!createdUserId) {
                        toast({
                            variant: 'destructive',
                            title: 'Erro ao criar usuário',
                            description: 'Usuário criado, mas não foi possível obter o identificador.'
                        });
                        return;
                    }
                } else {
                    const { data: authData, error: signUpError } = await supabase.auth.signUp({
                        email: trimmedEmail,
                        password,
                        options: { data: { full_name: profData.name, role: 'professional' } }
                    });

                    if (signUpError) {
                        toast({ variant: 'destructive', title: 'Erro ao criar usuário', description: signUpError.message });
                        return;
                    }

                    if (!authData.user) {
                        toast({ variant: 'destructive', title: 'Erro ao criar profissional', description: 'Não foi possível criar o usuário.' });
                        return;
                    }

                    createdUserId = authData.user.id;
                }

                const professionalPayload = {
                    ...profData,
                    services_ids: Array.isArray(profData.services_ids) ? profData.services_ids : [],
                    user_id: createdUserId
                };

                const { error: profError } = await supabase
                    .from('professionals')
                    .insert([professionalPayload]);

                if (profError) {
                    toast({ variant: 'destructive', title: 'Erro ao criar profissional', description: profError.message });
                    return;
                }

                toast({ title: 'Profissional criado com sucesso!' });
                resetProfessionalForm();
                await fetchAllData();
            } catch (error) {
                secureLog.error('Erro inesperado ao criar profissional:', error?.message || error);
                secureLog.debug('Detalhes do erro inesperado ao criar profissional', error);
                toast({ variant: 'destructive', title: 'Erro inesperado', description: 'Não foi possível criar o profissional.' });
            } finally {
                setIsSavingProfessionalProfile(false);
            }
        }
    };

    const handleProfessionalPasswordChange = async (e) => {
        e.preventDefault();
        const trimmedNewPassword = passwordFormData.newPassword?.trim() || '';
        const trimmedConfirmPassword = passwordFormData.confirmPassword?.trim() || '';

        if (trimmedNewPassword.length < 6) {
            toast({
                variant: 'destructive',
                title: 'Senha muito curta',
                description: 'A nova senha deve ter pelo menos 6 caracteres.'
            });
            return;
        }

        if (trimmedNewPassword !== trimmedConfirmPassword) {
            toast({
                variant: 'destructive',
                title: 'Senhas diferentes',
                description: 'Confirme a nova senha digitando o mesmo valor nos dois campos.'
            });
            return;
        }

        try {
            setIsSavingPassword(true);
            const { error } = await updatePassword(trimmedNewPassword);
            if (!error) {
                setPasswordFormData({ newPassword: '', confirmPassword: '' });
            }
        } catch (error) {
            secureLog.error('Erro inesperado ao atualizar senha do profissional:', error?.message || error);
            secureLog.debug('Detalhes do erro inesperado ao atualizar senha do profissional', error);
            toast({ variant: 'destructive', title: 'Erro inesperado', description: 'Não foi possível atualizar a senha.' });
        } finally {
            setIsSavingPassword(false);
        }
    };

    const handleSaveAvailability = async () => {
        const professionalId = userRole === 'admin'
            ? selectedAvailProfessional
            : selectedAvailProfessional || professionals[0]?.id;

        if (!professionalId) {
            toast({ variant: "destructive", title: "Erro", description: "Selecione um profissional." });
            return;
        }

        await withLoading('saveAvailability', async () => {
            try {
                // 1. Primeiro, deletar registros existentes para este profissional no mês/ano selecionados
                const { error: deleteError } = await supabase
                    .from('availability')
                    .delete()
                    .eq('professional_id', professionalId)
                    .eq('month', selectedMonth)
                    .eq('year', selectedYear);

                if (deleteError) {
                    secureLog.error('Erro ao limpar disponibilidade existente:', deleteError?.message || deleteError);
                    secureLog.debug('Detalhes do erro ao limpar disponibilidade existente', deleteError);
                    toast({ variant: "destructive", title: "Erro ao atualizar disponibilidade", description: deleteError.message });
                    return;
                }

                // 2. Inserir novos registros apenas para dias com horários
                const availabilityToInsert = [];
                for (const day in professionalAvailability) {
                    const times = professionalAvailability[day];
                    if (times && times.length > 0) {
                        // Validar e limpar horários
                        const validTimes = times
                            .filter(time => time && time.trim() !== '')
                            .map(time => time.trim())
                            .filter((time, index, array) => array.indexOf(time) === index); // Remove duplicatas

                        if (validTimes.length > 0) {
                            availabilityToInsert.push({
                                professional_id: professionalId,
                                day_of_week: day,
                                available_times: validTimes,
                                month: selectedMonth,
                                year: selectedYear
                            });
                        }
                    }
                }

                // 3. Inserir novos registros se houver
                if (availabilityToInsert.length > 0) {
                    const { error: insertError } = await supabase
                        .from('availability')
                        .insert(availabilityToInsert);

                    if (insertError) {
                        secureLog.error('Erro ao inserir disponibilidade:', insertError?.message || insertError);
                        secureLog.debug('Detalhes do erro ao inserir disponibilidade', insertError);
                        toast({ variant: "destructive", title: "Erro ao salvar disponibilidade", description: insertError.message });
                        return;
                    }
                }

                const monthNames = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                toast({ title: `Disponibilidade de ${monthNames[selectedMonth]}/${selectedYear} atualizada com sucesso!` });
                await fetchAllData();
            } catch (error) {
                secureLog.error('Erro inesperado ao salvar disponibilidade:', error?.message || error);
                secureLog.debug('Detalhes do erro inesperado ao salvar disponibilidade', error);
                toast({ variant: "destructive", title: "Erro inesperado", description: "Não foi possível salvar a disponibilidade." });
            }
        });
    };

    const handleAddBlockedDate = async () => {
        if (!newBlockedDate.date) { toast({ variant: 'destructive', title: 'Data é obrigatória' }); return; }
        const professionalId = userRole === 'admin'
            ? selectedAvailProfessional
            : selectedAvailProfessional || professionals[0]?.id;
        const dataToInsert = { professional_id: professionalId, blocked_date: newBlockedDate.date, reason: newBlockedDate.reason };
        if (newBlockedDate.start_time) dataToInsert.start_time = newBlockedDate.start_time;
        if (newBlockedDate.end_time) dataToInsert.end_time = newBlockedDate.end_time;

        const { error } = await supabase.from('blocked_dates').insert([dataToInsert]);
        if (error) { toast({ variant: 'destructive', title: 'Erro ao bloquear data', description: error.message }); }
        else { toast({ title: 'Data bloqueada com sucesso!' }); setNewBlockedDate({ date: '', start_time: '', end_time: '', reason: '' }); fetchAllData(); }
    };

    const handleDeleteBlockedDate = async (id) => {
        const { error } = await supabase.from('blocked_dates').delete().eq('id', id);
        if (error) { toast({ variant: 'destructive', title: 'Erro ao deletar bloqueio' }); }
        else { toast({ title: 'Bloqueio removido' }); fetchAllData(); }
    };

    const handleUpdateBooking = async () => {
        if (!editingBooking) return;

        const baseRequiredMissing = !bookingEditData.service_id || !bookingEditData.booking_date || !bookingEditData.booking_time;
        const adminRequiredMissing = isAdminView && (!bookingEditData.professional_id || !bookingEditData.patient_name);

        if (baseRequiredMissing || adminRequiredMissing) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Preencha todos os campos obrigatórios.' });
            return;
        }

        const selectedService = services.find(s => s.id === bookingEditData.service_id);
        if (!selectedService) {
            toast({ variant: 'destructive', title: 'Serviço inválido', description: 'Selecione um serviço válido.' });
            return;
        }

        let patientValueNumber = parseCurrencyToNumber(bookingEditData.valor_consulta);
        let professionalValueNumber = parseCurrencyToNumber(
            bookingEditData.valor_repasse_profissional === ''
                ? bookingEditData.valor_consulta
                : bookingEditData.valor_repasse_profissional
        );

        if (!isAdminView) {
            patientValueNumber = Number(selectedService.price) || 0;
            professionalValueNumber = Number(selectedService.professional_payout ?? selectedService.price) || patientValueNumber;
        }

        if (!Number.isFinite(patientValueNumber) || patientValueNumber < 0) {
            toast({ variant: 'destructive', title: 'Informe um valor de consulta válido.' });
            return;
        }

        if (!Number.isFinite(professionalValueNumber) || professionalValueNumber < 0) {
            toast({ variant: 'destructive', title: 'Informe um repasse válido para o profissional.' });
            return;
        }

        if (professionalValueNumber > patientValueNumber) {
            toast({ variant: 'destructive', title: 'O repasse não pode exceder o valor cobrado do paciente.' });
            return;
        }

        await withItemLoading('edit', editingBooking.id, async () => {
            try {
                const oldStatus = editingBooking.status;
                const oldDate = editingBooking.booking_date;
                const oldTime = editingBooking.booking_time;
                const statusChanged = isAdminView ? oldStatus !== bookingEditData.status : false;
                const dateChanged = oldDate !== bookingEditData.booking_date || oldTime !== bookingEditData.booking_time;

                const updatePayload = {
                    booking_date: bookingEditData.booking_date,
                    booking_time: bookingEditData.booking_time,
                    service_id: bookingEditData.service_id,
                    valor_consulta: Number.isFinite(patientValueNumber) ? patientValueNumber : null,
                    valor_repasse_profissional: Number.isFinite(professionalValueNumber) ? professionalValueNumber : null
                };

                if (isAdminView) {
                    Object.assign(updatePayload, {
                        status: bookingEditData.status,
                        professional_id: bookingEditData.professional_id,
                        patient_name: bookingEditData.patient_name,
                        patient_email: bookingEditData.patient_email,
                        patient_phone: bookingEditData.patient_phone
                    });
                }

                const { error } = await supabase
                    .from('bookings')
                    .update(updatePayload)
                    .eq('id', editingBooking.id);

                if (error) {
                    toast({ variant: 'destructive', title: 'Erro ao atualizar agendamento', description: error.message });
                    return;
                }

                try {
                    const emailData = {
                        patient_name: bookingEditData.patient_name,
                        patient_email: bookingEditData.patient_email,
                        booking_date: bookingEditData.booking_date,
                        booking_time: bookingEditData.booking_time,
                        service_name: selectedService?.name || 'Consulta',
                        professional_name: professionals.find(p => p.id === (isAdminView ? bookingEditData.professional_id : editingBooking.professional_id))?.name || 'Profissional'
                    };

                    if (statusChanged && (bookingEditData.status === 'confirmed' || bookingEditData.status === 'paid')) {
                        await bookingEmailManager.sendPaymentApproved(emailData);
                        secureLog.success('📧 Email de confirmação/pagamento enviado');
                    }

                    if (statusChanged && (bookingEditData.status.includes('cancelled') || bookingEditData.status === 'no_show_unjustified')) {
                        let reason = null;
                        if (bookingEditData.status === 'no_show_unjustified') {
                            reason = 'Consulta marcada como falta injustificada (sem reembolso)';
                        } else if (isAdminView) {
                            reason = oldStatus === 'pending_payment'
                                ? 'Cancelado pela administração antes do pagamento'
                                : 'Cancelado pela administração';
                        } else {
                            reason = 'Cancelado pelo profissional';
                        }

                        await bookingEmailManager.sendCancellation(emailData, reason);
                        secureLog.success('📧 Email de cancelamento enviado');
                    }

                    if (statusChanged && bookingEditData.status === 'completed') {
                        await bookingEmailManager.sendThankYou(emailData);
                        secureLog.success('📧 Email de agradecimento enviado');
                    }

                    if (dateChanged && !bookingEditData.status.includes('cancelled')) {
                        const rescheduleReason = isAdminView ? 'Alterado pela administração' : 'Alterado pelo profissional';
                        await bookingEmailManager.sendRescheduled(emailData, oldDate, oldTime, rescheduleReason);
                        secureLog.success('📧 Email de reagendamento enviado');
                    }
                } catch (emailError) {
                    secureLog.error('Erro ao enviar email de atualização de agendamento:', emailError?.message || emailError);
                    secureLog.debug('Detalhes do erro ao enviar email de atualização de agendamento', emailError);
                    toast({
                        variant: 'default',
                        title: 'Agendamento atualizado',
                        description: 'Atenção: O email de notificação não pôde ser enviado.'
                    });
                }

                toast({ title: 'Agendamento atualizado com sucesso!' });
                setEditingBooking(null);
                await fetchAllData();
            } catch (error) {
                secureLog.error('Erro ao atualizar agendamento:', error?.message || error);
                secureLog.debug('Detalhes do erro ao atualizar agendamento', error);
                toast({
                    variant: 'destructive',
                    title: 'Erro ao atualizar',
                    description: error.message
                });
            }
        });
    };

    const handleDeleteBooking = (booking) => {
        if (!booking) {
            return;
        }

        const dateLabel = booking.booking_date
            ? new Date(`${booking.booking_date}T00:00:00`).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
            : 'data não informada';
        const timeLabel = booking.booking_time ? `${booking.booking_time}h` : 'horário indefinido';

        let warningMessage = '';
        if (['confirmed', 'paid', 'completed'].includes(booking.status)) {
            warningMessage = 'Este agendamento já estava confirmado/pago. Considere alterar o status para cancelado se precisar manter o histórico.';
        }

        setConfirmDialog({
            isOpen: true,
            title: 'Excluir Agendamento',
            message: `Deseja excluir o agendamento de ${booking.patient_name || 'Paciente'} em ${dateLabel} às ${timeLabel}?`,
            warningMessage,
            type: 'danger',
            onConfirm: async () => {
                await withItemLoading('delete', booking.id, async () => {
                    const { error } = await supabase.from('bookings').delete().eq('id', booking.id);
                    if (error) {
                        secureLog.error('Erro ao excluir agendamento:', error?.message || error);
                        secureLog.debug('Detalhes do erro ao excluir agendamento', error);
                        toast({ variant: 'destructive', title: 'Erro ao excluir agendamento', description: error.message });
                        return;
                    }

                    toast({ title: 'Agendamento excluído com sucesso!' });
                    await fetchAllData();
                });

                setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
            },
        });
    };

    // Função para mudança rápida de status
    const handleQuickStatusChange = async (bookingId, newStatus, bookingData) => {
        const isAdminUser = isAdminView;
        if (!isAdminUser) {
            const allowedStatuses = new Set(['cancelled_by_professional', 'completed', 'no_show_unjustified']);
            if (!allowedStatuses.has(newStatus)) {
                toast({ variant: 'destructive', title: 'Ação não permitida', description: 'Profissionais só podem cancelar, marcar falta injustificada ou concluir consultas.' });
                return;
            }

            if (newStatus === 'completed' && bookingData.status !== 'confirmed') {
                toast({ variant: 'destructive', title: 'Conclua apenas após confirmação', description: 'Uma consulta só pode ser concluída depois de confirmada.' });
                return;
            }
        }

        if (newStatus === bookingData.status) {
            return;
        }

        await withItemLoading('status', bookingId, async () => {
            try {
                const { error } = await supabase
                    .from('bookings')
                    .update({ status: newStatus })
                    .eq('id', bookingId);

                if (error) throw error;

                // Enviar email de notificação baseado no novo status
                try {
                    const emailData = {
                        patient_name: bookingData.patient_name,
                        patient_email: bookingData.patient_email,
                        booking_date: bookingData.booking_date,
                        booking_time: bookingData.booking_time,
                        service_name: bookingData.service?.name || 'Consulta',
                        professional_name: bookingData.professional?.name || 'Profissional'
                    };

                    if (newStatus === 'confirmed' || newStatus === 'paid') {
                        await bookingEmailManager.sendPaymentApproved(emailData);
                    } else if (newStatus === 'completed') {
                        await bookingEmailManager.sendThankYou(emailData);
                    } else if (newStatus === 'no_show_unjustified') {
                        await bookingEmailManager.sendCancellation(emailData, 'Consulta marcada como falta injustificada (sem reembolso)');
                    } else if (newStatus.includes('cancelled')) {
                        const cancellationReason = isAdminUser ? 'Cancelado pela administração' : 'Cancelado pelo profissional';
                        await bookingEmailManager.sendCancellation(emailData, cancellationReason);
                    }
                } catch (emailError) {
                    secureLog.error('Erro ao enviar email na atualização rápida de status:', emailError?.message || emailError);
                    secureLog.debug('Detalhes do erro ao enviar email na atualização rápida de status', emailError);
                }

                toast({
                    title: 'Status atualizado!',
                    description: `Agendamento marcado como ${getStatusLabel(newStatus)}`
                });

                await fetchAllData();
            } catch (error) {
                secureLog.error('Erro ao atualizar status:', error?.message || error);
                secureLog.debug('Detalhes do erro ao atualizar status', error);
                toast({
                    variant: 'destructive',
                    title: 'Erro ao atualizar status',
                    description: error.message
                });
            }
        });
    };

    const getStatusLabel = (status) => {
        const labels = {
            'pending_payment': 'Pendente Pagamento',
            'confirmed': 'Confirmado',
            'paid': 'Pago',
            'completed': 'Concluído',
            'cancelled_by_patient': 'Cancelado pelo Paciente',
            'cancelled_by_professional': 'Cancelado pelo Profissional',
            'no_show_unjustified': 'Falta injustificada'
        };
        return labels[status] || status;
    };

    // Função para toggle da expansão dos dados do Zoom
    const toggleZoomExpansion = (bookingId) => {
        setExpandedZoomCards(prev => ({
            ...prev,
            [bookingId]: !prev[bookingId]
        }));
    };

    const handleReviewApproval = async (reviewId, isApproved) => {
        const { error } = await supabase.from('reviews').update({ is_approved: isApproved }).eq('id', reviewId);
        if (error) { toast({ variant: 'destructive', title: 'Erro ao atualizar avaliação' }); }
        else { toast({ title: `Avaliação ${isApproved ? 'aprovada' : 'reprovada'}.` }); fetchAllData(); }
    };

    // Função para ordenar bookings
    const getSortedBookings = (bookingsToSort) => {
        const statusPriority = {
            'confirmed': 1,
            'paid': 1,
            'pending_payment': 2,
            'completed': 3,
            'cancelled_by_patient': 4,
            'cancelled_by_professional': 4,
            'no_show_unjustified': 4
        };

        const now = new Date();

        const sorted = [...bookingsToSort].sort((a, b) => {
            if (bookingSortField === 'status') {
                const priorityA = statusPriority[a.status] || 5;
                const priorityB = statusPriority[b.status] || 5;
                const statusCompare = priorityA - priorityB;
                if (statusCompare !== 0) return bookingSortOrder === 'asc' ? statusCompare : -statusCompare;
            }

            if (bookingSortField === 'professional') {
                const nameA = a.professional?.name || '';
                const nameB = b.professional?.name || '';
                const nameCompare = nameA.localeCompare(nameB);
                if (nameCompare !== 0) return bookingSortOrder === 'asc' ? nameCompare : -nameCompare;
            }

            if (bookingSortField === 'date' || bookingSortField === 'default') {
                const dateA = new Date(a.booking_date + 'T' + a.booking_time);
                const dateB = new Date(b.booking_date + 'T' + b.booking_time);

                // Para ordenação padrão, prioriza por status primeiro
                if (bookingSortField === 'default') {
                    const priorityA = statusPriority[a.status] || 5;
                    const priorityB = statusPriority[b.status] || 5;
                    const statusCompare = priorityA - priorityB;

                    if (statusCompare !== 0) {
                        // Dentro do mesmo status, agendamentos próximos primeiro
                        if (priorityA === priorityB) {
                            // Se ambos estão no futuro, mais próximo primeiro
                            if (dateA >= now && dateB >= now) {
                                return dateA - dateB;
                            }
                            // Se ambos estão no passado, mais recente primeiro
                            if (dateA < now && dateB < now) {
                                return dateB - dateA;
                            }
                            // Se um está no futuro e outro no passado, futuro primeiro
                            return dateA >= now ? -1 : 1;
                        }
                        return statusCompare;
                    }

                    // Mesmo status: agendamentos próximos (futuros) primeiro, depois passados recentes
                    if (dateA >= now && dateB >= now) {
                        return dateA - dateB; // Futuro: mais próximo primeiro
                    }
                    if (dateA < now && dateB < now) {
                        return dateB - dateA; // Passado: mais recente primeiro
                    }
                    return dateA >= now ? -1 : 1; // Futuro antes de passado
                }

                // Para ordenação manual por data
                const dateCompare = dateA - dateB;
                if (dateCompare !== 0) {
                    return bookingSortOrder === 'desc' ? -dateCompare : dateCompare;
                }
            }

            // Ordenação secundária por status se estiver ordenando por data ou profissional
            if (bookingSortField === 'date' || bookingSortField === 'professional') {
                const priorityA = statusPriority[a.status] || 5;
                const priorityB = statusPriority[b.status] || 5;
                return priorityA - priorityB;
            }

            return 0;
        });

        return sorted;
    };

    const handleBookingSort = (field) => {
        if (bookingSortField === field) {
            setBookingSortOrder(bookingSortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setBookingSortField(field);
            setBookingSortOrder(field === 'date' ? 'desc' : 'asc');
        }
    };

    // Função para filtrar agendamentos
    const getFilteredBookings = () => {
        return bookings.filter(booking => {
            // Filtro por serviço
            if (bookingFilters.service_id && booking.service_id !== bookingFilters.service_id) {
                return false;
            }

            // Filtro por profissional
            if (bookingFilters.professional_id && booking.professional_id !== bookingFilters.professional_id) {
                return false;
            }

            // Filtro por status
            if (bookingFilters.status && booking.status !== bookingFilters.status) {
                return false;
            }

            // Filtro por período - data inicial
            if (bookingFilters.date_from && booking.booking_date < bookingFilters.date_from) {
                return false;
            }

            // Filtro por período - data final
            if (bookingFilters.date_to && booking.booking_date > bookingFilters.date_to) {
                return false;
            }

            // Filtro por busca de texto (nome do paciente ou email)
            if (bookingFilters.search) {
                const searchTerm = bookingFilters.search.toLowerCase();
                const patientName = (booking.patient_name || '').toLowerCase();
                const patientEmail = (booking.patient_email || '').toLowerCase();

                if (!patientName.includes(searchTerm) && !patientEmail.includes(searchTerm)) {
                    return false;
                }
            }

            return true;
        });
    };

    const clearFilters = () => {
        setBookingFilters({
            service_id: '',
            professional_id: '',
            status: '',
            date_from: '',
            date_to: '',
            search: ''
        });
        setCurrentPage(1); // Resetar página ao limpar filtros
    };

    // Função para paginar resultados
    const getPaginatedBookings = (bookingsList) => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return bookingsList.slice(startIndex, endIndex);
    };

    // Calcular total de páginas
    const getTotalPages = (bookingsList) => {
        return Math.ceil(bookingsList.length / itemsPerPage);
    };

    // Resetar página quando filtros mudarem
    useEffect(() => {
        setCurrentPage(1);
    }, [bookingFilters, bookingSortField, bookingSortOrder]);

    useEffect(() => {
        if (userRole !== 'admin' && bookingSortField === 'professional') {
            setBookingSortField('default');
        }
    }, [userRole, bookingSortField]);

    // Funções para calcular totalizadores
    const calculateTotals = (bookingsList) => {
        const isAdminUser = userRole === 'admin';
        const totals = {
            totalBookings: bookingsList.length,
            totalValue: 0,
            totalProfessionalValue: 0,
            totalPlatformFee: 0,
            confirmedValue: 0,
            completedValue: 0,
            pendingValue: 0,
            cancelledValue: 0
        };

        bookingsList.forEach((booking) => {
            const patientValue = Number(booking.valor_consulta ?? booking.service?.price ?? 0) || 0;
            const professionalValue = Number(
                booking.valor_repasse_profissional ?? booking.service?.professional_payout ?? booking.valor_consulta ?? 0
            ) || 0;
            const platformFee = Math.max(patientValue - professionalValue, 0);

            const amountForStatus = isAdminUser ? patientValue : professionalValue;

            totals.totalValue += patientValue;
            totals.totalProfessionalValue += professionalValue;
            totals.totalPlatformFee += platformFee;

            switch (booking.status) {
                case 'confirmed':
                    totals.confirmedValue += amountForStatus;
                    break;
                case 'completed':
                    totals.completedValue += amountForStatus;
                    break;
                case 'pending_payment':
                    totals.pendingValue += amountForStatus;
                    break;
                case 'cancelled_by_patient':
                case 'cancelled_by_professional':
                case 'no_show_unjustified':
                    totals.cancelledValue += amountForStatus;
                    break;
                default:
                    break;
            }
        });

        return totals;
    };

    const resetServiceForm = () => {
        setIsEditingService(false);
        setServiceFormData({ id: null, name: '', price: '', professional_payout: '', duration_minutes: '50' });
    };
    const resetProfessionalForm = useCallback(() => {
        if (userRole === 'admin') {
            setIsEditingProfessional(false);
            setProfessionalFormData({
                id: null,
                name: '',
                services_ids: [],
                email: '',
                password: '',
                mini_curriculum: '',
                description: '',
                image_url: ''
            });
            return;
        }

        if (currentProfessional) {
            setIsEditingProfessional(true);
            setProfessionalFormData({
                ...currentProfessional,
                password: '',
                services_ids: currentProfessional.services_ids || []
            });
        }
    }, [userRole, currentProfessional]);

    const handleEditService = (service) => {
        if (!service) return;

        setIsEditingService(true);
        setServiceFormData({
            id: service.id,
            name: service.name || '',
            price: formatNumberToCurrencyInput(service.price),
            professional_payout: formatNumberToCurrencyInput(service.professional_payout ?? service.price),
            duration_minutes: service.duration_minutes ? String(service.duration_minutes) : '50'
        });
    };
    const handleDeleteService = async (serviceId) => {
        const service = services.find(s => s.id === serviceId);
        if (!service) return;

        try {
            // Verificar agendamentos usando este serviço
            const { data: bookingsData } = await supabase
                .from('bookings')
                .select('id')
                .eq('service_id', serviceId);

            let warningMessage = '';
            if (bookingsData?.length > 0) {
                warningMessage = `Este serviço possui ${bookingsData.length} agendamento(s) associado(s).\nOs agendamentos serão mantidos mas ficarão sem serviço vinculado.`;
            }

            setConfirmDialog({
                isOpen: true,
                title: 'Excluir Serviço',
                message: `Tem certeza que deseja excluir o serviço "${service.name}"?`,
                warningMessage,
                type: 'danger',
                onConfirm: async () => {
                    const { error } = await supabase.from('services').delete().eq('id', serviceId);
                    if (error) {
                        secureLog.error('Erro ao excluir serviço:', error?.message || error);
                        secureLog.debug('Detalhes do erro ao excluir serviço', error);
                        toast({ variant: "destructive", title: "Erro ao excluir serviço", description: error.message });
                    } else {
                        toast({ title: "Serviço excluído com sucesso!" });
                        fetchAllData();
                    }
                    setConfirmDialog({ ...confirmDialog, isOpen: false });
                }
            });
        } catch (error) {
            secureLog.error('Erro inesperado ao preparar exclusão de serviço:', error?.message || error);
            secureLog.debug('Detalhes do erro inesperado ao preparar exclusão de serviço', error);
            toast({ variant: "destructive", title: "Erro inesperado", description: "Não foi possível verificar o serviço." });
        }
    };

    const handleEditProfessional = (prof) => {
        setIsEditingProfessional(true);
        setProfessionalFormData({
            ...prof,
            password: '',
            services_ids: prof.services_ids || []
        });
    };
    const handleDeleteProfessional = async (profId) => {
        const professional = professionals.find(p => p.id === profId);
        if (!professional) return;

        try {
            // 1. Verificar dependências
            const { data: bookingsData } = await supabase
                .from('bookings')
                .select('id')
                .eq('professional_id', profId);

            const { data: eventsData } = await supabase
                .from('eventos')
                .select('id')
                .eq('professional_id', profId);

            const { data: reviewsData } = await supabase
                .from('reviews')
                .select('id')
                .eq('professional_id', profId);

            const { data: availabilityData } = await supabase
                .from('availability')
                .select('id')
                .eq('professional_id', profId);

            const { data: blockedDatesData } = await supabase
                .from('blocked_dates')
                .select('id')
                .eq('professional_id', profId);

            const hasBookings = bookingsData?.length > 0;
            const hasEvents = eventsData?.length > 0;
            const hasReviews = reviewsData?.length > 0;
            const hasAvailability = availabilityData?.length > 0;
            const hasBlockedDates = blockedDatesData?.length > 0;

            let warningMessage = '';
            if (hasBookings || hasEvents || hasReviews || hasAvailability || hasBlockedDates) {
                const items = [];
                if (hasBookings) items.push(`${bookingsData.length} agendamento(s)`);
                if (hasEvents) items.push(`${eventsData.length} evento(s)`);
                if (hasReviews) items.push(`${reviewsData.length} avaliação(ões)`);
                if (hasAvailability) items.push('configurações de disponibilidade');
                if (hasBlockedDates) items.push(`${blockedDatesData.length} data(s) bloqueada(s)`);

                warningMessage = `Este profissional possui registros associados:\n• ${items.join('\n• ')}\n\nTodos esses registros serão removidos junto com o profissional.`;
            }

            // 2. Mostrar modal de confirmação
            setConfirmDialog({
                isOpen: true,
                title: 'Excluir Profissional',
                message: `Tem certeza que deseja excluir o profissional "${professional.name}"?`,
                warningMessage,
                type: 'danger',
                onConfirm: async () => {
                    await executeProfessionalDeletion(profId, {
                        bookings: bookingsData || [],
                        events: eventsData || [],
                        reviews: reviewsData || [],
                        availability: availabilityData || [],
                        blockedDates: blockedDatesData || []
                    });
                    setConfirmDialog({ ...confirmDialog, isOpen: false });
                }
            });
        } catch (error) {
            secureLog.error('Erro ao verificar dependências antes de excluir profissional:', error?.message || error);
            secureLog.debug('Detalhes do erro ao verificar dependências do profissional', error);
            toast({
                variant: "destructive",
                title: "Erro",
                description: "Não foi possível verificar os dados do profissional."
            });
        }
    };

    const executeProfessionalDeletion = async (profId, dependencies) => {
        try {
            // Excluir dependências em ordem (foreign keys)
            if (dependencies.reviews.length > 0) {
                await supabase.from('reviews').delete().eq('professional_id', profId);
            }
            if (dependencies.bookings.length > 0) {
                await supabase.from('bookings').delete().eq('professional_id', profId);
            }
            if (dependencies.availability.length > 0) {
                await supabase.from('availability').delete().eq('professional_id', profId);
            }
            if (dependencies.blockedDates.length > 0) {
                await supabase.from('blocked_dates').delete().eq('professional_id', profId);
            }
            if (dependencies.events.length > 0) {
                // Para eventos, apenas remover a referência ao profissional
                await supabase.from('eventos').update({ professional_id: null }).eq('professional_id', profId);
            }

            // Finalmente, excluir o profissional
            const { error } = await supabase.from('professionals').delete().eq('id', profId);

            if (error) {
                secureLog.error('Erro ao excluir profissional:', error?.message || error);
                secureLog.debug('Detalhes do erro ao excluir profissional', error);
                toast({
                    variant: "destructive",
                    title: "Erro ao excluir profissional",
                    description: error.message
                });
            } else {
                toast({
                    title: "Profissional excluído com sucesso!",
                    description: "Todos os registros associados foram removidos."
                });
                fetchAllData();
            }
        } catch (error) {
            secureLog.error('Erro inesperado ao excluir profissional:', error?.message || error);
            secureLog.debug('Detalhes do erro inesperado ao excluir profissional', error);
            toast({
                variant: "destructive",
                title: "Erro inesperado",
                description: "Não foi possível excluir o profissional completamente."
            });
        }
    };

    const handleEventSubmit = async (e) => {
        e.preventDefault();

        const errors = {};
        const trimmedTitle = eventFormData.titulo?.trim() || '';
        const trimmedDescription = eventFormData.descricao?.trim() || '';
        const professionalId = eventFormData.professional_id;
        const startDate = parseDateTime(eventFormData.data_inicio);
        const endDate = parseDateTime(eventFormData.data_fim);
        const signupDeadlineDate = parseDateTime(eventFormData.data_limite_inscricao);
        const displayStartDate = parseDateTime(eventFormData.data_inicio_exibicao);
        const displayEndDate = parseDateTime(eventFormData.data_fim_exibicao);

        const limit = Number.parseInt(eventFormData.limite_participantes, 10);
        const rawVagas = eventFormData.vagas_disponiveis;
        const vagasDisponiveis = rawVagas === '' || rawVagas === null || rawVagas === undefined
            ? 0
            : Number.parseInt(rawVagas, 10);
        const rawValor = eventFormData.valor;
        const valor = rawValor === '' || rawValor === null || rawValor === undefined
            ? (isFreeEvent ? 0 : Number.NaN)
            : Number.parseFloat(rawValor);

        if (!trimmedTitle) {
            errors.titulo = 'Informe um título para o evento.';
        }

        if (!professionalId) {
            errors.professional_id = 'Selecione um profissional responsável.';
        }

        if (!startDate) {
            errors.data_inicio = 'Informe a data e hora de início.';
        }

        if (!endDate) {
            errors.data_fim = 'Informe a data e hora de término.';
        }

        if (startDate && endDate && endDate <= startDate) {
            errors.data_fim = 'A data e hora de término devem ser posteriores ao início.';
        }

        if (!Number.isFinite(limit) || limit <= 0) {
            errors.limite_participantes = 'Defina o limite de vagas (mínimo 1).';
        }

        if (!Number.isFinite(vagasDisponiveis) || vagasDisponiveis < 0) {
            errors.vagas_disponiveis = 'Informe as vagas disponíveis na sala (zero para ilimitado).';
        }

        if (!Number.isFinite(valor) || valor < 0 || (!isFreeEvent && valor === 0)) {
            errors.valor = isFreeEvent
                ? 'Defina um valor válido (use 0 para evento gratuito).'
                : 'Informe o valor cobrado (maior que zero).';
        }

        if (!signupDeadlineDate) {
            errors.data_limite_inscricao = 'Informe a data limite para inscrições.';
        } else if (startDate && signupDeadlineDate >= startDate) {
            errors.data_limite_inscricao = 'O limite de inscrição precisa ocorrer antes do início do evento.';
        }

        if (displayStartDate && displayEndDate && displayEndDate < displayStartDate) {
            errors.data_fim_exibicao = 'O fim da exibição deve ser posterior ao início.';
        }

        if (displayStartDate && startDate && displayStartDate > startDate) {
            errors.data_inicio_exibicao = 'A exibição deve começar antes do evento iniciar.';
        }

        if (displayEndDate && startDate && displayEndDate < startDate) {
            errors.data_fim_exibicao = 'Mantenha o evento visível pelo menos até o início.';
        }

        const existingEvent = isEditingEvent ? events.find(evt => evt.id === eventFormData.id) : null;
        const existingRegistrations = existingEvent?.inscricoes_eventos?.[0]?.count || 0;

        if (!errors.limite_participantes && isEditingEvent && Number.isFinite(limit) && existingRegistrations > 0 && limit < existingRegistrations) {
            errors.limite_participantes = `Já existem ${existingRegistrations} inscrições. Ajuste o limite para pelo menos esse total.`;
        }

        if (!errors.vagas_disponiveis && isEditingEvent && Number.isFinite(vagasDisponiveis) && vagasDisponiveis > 0 && existingRegistrations > 0 && vagasDisponiveis < existingRegistrations) {
            errors.vagas_disponiveis = `Já existem ${existingRegistrations} inscrições. Defina vagas suficientes na sala.`;
        }

        if (Object.keys(errors).length > 0) {
            setEventFormErrors(errors);
            const firstErrorKey = Object.keys(errors)[0];
            toast({
                variant: 'destructive',
                title: 'Revise os campos do evento',
                description: errors[firstErrorKey]
            });
            return;
        }

        setEventFormErrors({});

        let finalLinkSlug = (eventFormData.link_slug || '').trim().toLowerCase();
        const originalSlug = (eventFormData.link_slug || '').trim().toLowerCase();

        if (!finalLinkSlug) {
            finalLinkSlug = generateUniqueSlug(trimmedTitle);
            setEventFormData(prev => ({ ...prev, link_slug: finalLinkSlug }));
            toast({
                title: 'Slug gerado automaticamente',
                description: `Link do evento: ${finalLinkSlug}`
            });
        } else {
            const slugRegex = /^[a-z0-9-]+$/;
            if (!slugRegex.test(finalLinkSlug)) {
                const message = 'Use apenas letras minúsculas, números e hífens no slug.';
                setEventFormErrors(prev => ({ ...prev, link_slug: message }));
                toast({
                    variant: 'destructive',
                    title: 'Slug inválido',
                    description: message
                });
                return;
            }

            const shouldCheckSlug = !isEditingEvent || finalLinkSlug !== originalSlug;
            if (shouldCheckSlug) {
                const { data: slugMatches, error: slugCheckError } = await supabase
                    .from('eventos')
                    .select('id')
                    .eq('link_slug', finalLinkSlug)
                    .limit(1);

                if (slugCheckError) {
                    secureLog.error('Erro ao validar slug de evento:', slugCheckError?.message || slugCheckError);
                    secureLog.debug('Detalhes do erro ao validar slug de evento', slugCheckError);
                    toast({
                        variant: 'destructive',
                        title: 'Erro ao validar slug',
                        description: slugCheckError.message || 'Não foi possível validar o link. Tente novamente.'
                    });
                    return;
                }

                if (slugMatches && slugMatches.length > 0 && (!isEditingEvent || slugMatches[0].id !== eventFormData.id)) {
                    finalLinkSlug = generateUniqueSlug(trimmedTitle);
                    setEventFormData(prev => ({ ...prev, link_slug: finalLinkSlug }));
                    toast({
                        title: 'Slug ajustado automaticamente',
                        description: `Já existia um evento com este link. Usamos: ${finalLinkSlug}`
                    });
                }
            }
        }

        const sanitizedMeetingFields = {
            meeting_link: sanitizeNullableText(eventFormData.meeting_link),
            meeting_password: sanitizeNullableText(eventFormData.meeting_password),
            meeting_id: sanitizeNullableText(eventFormData.meeting_id),
            meeting_start_url: sanitizeNullableText(eventFormData.meeting_start_url)
        };

        const sanitizedEventData = {
            titulo: trimmedTitle,
            descricao: trimmedDescription || null,
            tipo_evento: eventFormData.tipo_evento || 'Workshop',
            professional_id: professionalId,
            data_inicio: normalizeDateTime(eventFormData.data_inicio),
            data_fim: normalizeDateTime(eventFormData.data_fim),
            data_limite_inscricao: normalizeDateTime(eventFormData.data_limite_inscricao),
            limite_participantes: limit,
            vagas_disponiveis: Number.isFinite(vagasDisponiveis) ? vagasDisponiveis : 0,
            valor: Number.isFinite(valor) ? valor : 0,
            data_inicio_exibicao: eventFormData.data_inicio_exibicao ? normalizeDateTime(eventFormData.data_inicio_exibicao) : null,
            data_fim_exibicao: eventFormData.data_fim_exibicao ? normalizeDateTime(eventFormData.data_fim_exibicao) : null,
            ativo: eventFormData.ativo === undefined ? true : !!eventFormData.ativo,
            link_slug: finalLinkSlug,
            ...sanitizedMeetingFields
        };

        let result;
        if (isEditingEvent) {
            const { id } = eventFormData;
            result = await supabase
                .from('eventos')
                .update(sanitizedEventData)
                .eq('id', id)
                .select();
        } else {
            let zoomData = null;
            try {
                const { default: zoomService } = await import('../lib/zoomService');
                const durationMinutes = startDate && endDate ? Math.max(1, Math.ceil((endDate - startDate) / 60000)) : 60;

                zoomData = await zoomService.createMeeting({
                    topic: `Evento: ${trimmedTitle}`,
                    startTime: sanitizedEventData.data_inicio,
                    duration: durationMinutes,
                    timezone: 'America/Sao_Paulo',
                    agenda: sanitizedEventData.descricao || '',
                    settings: {
                        join_before_host: false,
                        waiting_room: true,
                        approval_type: 0,
                        mute_upon_entry: true,
                        auto_recording: 'none'
                    }
                });

                if (!zoomData) {
                    secureLog.warn('Não foi possível criar a sala Zoom automaticamente.');
                }
            } catch (error) {
                secureLog.error('Erro ao criar sala Zoom:', error?.message || error);
                secureLog.debug('Detalhes do erro ao criar sala Zoom', error);
                // Não bloquear criação do evento se Zoom falhar
            }

            const zoomMeetingFields = zoomData
                ? {
                    meeting_link: zoomData.join_url,
                    meeting_password: zoomData.password,
                    meeting_id: zoomData.id?.toString(),
                    meeting_start_url: zoomData.start_url
                }
                : null;

            result = await supabase
                .from('eventos')
                .insert([{ ...sanitizedEventData, ...(zoomMeetingFields || {}) }])
                .select();
        }

        if (result.error) {
            secureLog.error('Erro ao salvar evento:', result.error?.message || result.error);
            secureLog.debug('Detalhes do erro ao salvar evento', result.error);
            toast({
                variant: 'destructive',
                title: 'Erro ao salvar evento',
                description: result.error.message
            });
            return;
        }

        const zoomMessage = !isEditingEvent && result.data?.[0]?.meeting_link ? ' (Sala Zoom criada ✅)' : '';
        toast({ title: `Evento ${isEditingEvent ? 'atualizado' : 'criado'} com sucesso!${zoomMessage}` });
        resetEventForm();
        fetchAllData();
    };
    const resetEventForm = () => {
        setIsEditingEvent(false);
        setEventFormErrors({});
        setSlugManuallyEdited(false);
        setShowManualZoomFields(false);
        setIsFreeEvent(true);
        setEventFormData({
            id: null,
            titulo: '',
            descricao: '',
            tipo_evento: 'Workshop',
            data_inicio: '',
            data_fim: '',
            professional_id: '',
            limite_participantes: '',
            data_limite_inscricao: '',
            valor: 0,
            vagas_disponiveis: 0, // 0 = ilimitado
            link_slug: '',
            data_inicio_exibicao: '',
            data_fim_exibicao: '',
            meeting_link: '',
            meeting_password: '',
            meeting_id: '',
            meeting_start_url: '',
            ativo: true
        });
    };
    const handleEditEvent = (event) => {
        const formatDateForInput = (value) => {
            if (!value) return '';
            const parsed = new Date(value);
            return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 16);
        };

        setIsEditingEvent(true);
        setEventFormErrors({});
        setEventFormData({
            ...event,
            data_inicio: formatDateForInput(event.data_inicio),
            data_fim: formatDateForInput(event.data_fim),
            data_limite_inscricao: formatDateForInput(event.data_limite_inscricao),
            data_inicio_exibicao: formatDateForInput(event.data_inicio_exibicao),
            data_fim_exibicao: formatDateForInput(event.data_fim_exibicao),
            professional_id: event.professional_id || '',
            limite_participantes: event.limite_participantes != null ? String(event.limite_participantes) : '',
            vagas_disponiveis: event.vagas_disponiveis != null ? Number(event.vagas_disponiveis) : 0,
            valor: event.valor != null ? Number(event.valor) : 0,
            link_slug: event.link_slug || '',
            meeting_link: event.meeting_link || '',
            meeting_password: event.meeting_password || '',
            meeting_id: event.meeting_id || '',
            meeting_start_url: event.meeting_start_url || '',
            ativo: event.ativo !== undefined ? event.ativo : true
        });
        setSlugManuallyEdited(Boolean(event.link_slug));
        setShowManualZoomFields(Boolean(event.meeting_link || event.meeting_start_url));
        setIsFreeEvent(!(Number(event.valor) > 0));
    };
    const handleDeleteEvent = async (eventId) => {
        const event = events.find(e => e.id === eventId);
        if (!event) return;

        try {
            // Verificar se há inscrições para este evento (com tratamento de erro)
            let inscricoesData = [];
            try {
                const { data, error } = await supabase
                    .from('inscricoes_eventos')
                    .select('id')
                    .eq('evento_id', eventId);

                if (!error) {
                    inscricoesData = data || [];
                }
            } catch (error) {
                secureLog.error('Erro ao carregar inscrições do evento:', error?.message || error);
                secureLog.debug('Detalhes do erro ao carregar inscrições do evento', error);
                inscricoesData = [];
            }

            let warningMessage = '';
            if (inscricoesData?.length > 0) {
                warningMessage = `Este evento possui ${inscricoesData.length} inscrição(ões).\nAs inscrições também serão excluídas.`;
            }

            setConfirmDialog({
                isOpen: true,
                title: 'Excluir Evento',
                message: `Tem certeza que deseja excluir o evento "${event.titulo}"?`,
                warningMessage,
                type: 'danger',
                onConfirm: async () => {
                    // Excluir inscrições primeiro se existir
                    if (inscricoesData?.length > 0) {
                        try {
                            const { error: inscricoesError } = await supabase
                                .from('inscricoes_eventos')
                                .delete()
                                .eq('evento_id', eventId);

                            if (inscricoesError) {
                                secureLog.error('Erro ao excluir inscrições do evento:', inscricoesError?.message || inscricoesError);
                                secureLog.debug('Detalhes do erro ao excluir inscrições do evento', inscricoesError);
                                toast({ variant: "destructive", title: "Erro ao excluir inscrições do evento" });
                                setConfirmDialog({ ...confirmDialog, isOpen: false });
                                return;
                            }
                        } catch (error) {
                            secureLog.error('Erro inesperado ao excluir inscrições do evento:', error?.message || error);
                            secureLog.debug('Detalhes do erro inesperado ao excluir inscrições do evento', error);
                        }
                    }

                    const { error } = await supabase.from('eventos').delete().eq('id', eventId);
                    if (error) {
                        secureLog.error('Erro ao excluir evento:', error?.message || error);
                        secureLog.debug('Detalhes do erro ao excluir evento', error);
                        toast({ variant: "destructive", title: "Erro ao excluir evento", description: error.message });
                    } else {
                        toast({ title: "Evento excluído com sucesso!" });
                        fetchAllData();
                    }
                    setConfirmDialog({ ...confirmDialog, isOpen: false });
                }
            });
        } catch (error) {
            secureLog.error('Erro inesperado ao preparar exclusão de evento:', error?.message || error);
            secureLog.debug('Detalhes do erro inesperado ao preparar exclusão de evento', error);
            toast({ variant: "destructive", title: "Erro inesperado", description: "Não foi possível verificar o evento." });
        }
    };

    if (!user) {
        return (
            <>
                <Helmet><title>Área Administrativa - Doxologos</title></Helmet>
                <header className="bg-white shadow-sm"><nav className="container mx-auto px-4 py-4 flex items-center justify-between"><Link to="/" className="flex items-center space-x-2"><img src="/favicon.svg" alt="Doxologos Logo" className="w-8 h-8" /><span className="text-2xl font-bold gradient-text">Doxologos</span></Link><Link to="/"><Button variant="outline" className="border-[#2d8659] text-[#2d8659]"><ArrowLeft className="w-4 h-4 mr-2" /> Voltar</Button></Link></nav></header>
                <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
                        <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">Acesso Restrito</h2>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div><label className="block text-sm font-medium mb-2 text-gray-600">Email</label><input type="email" required value={loginData.email} onChange={(e) => setLoginData({ ...loginData, email: e.target.value })} className="w-full input" /></div>
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-medium text-gray-600">Senha</label>
                                    <Link to="/recuperar-senha" className="text-sm text-[#2d8659] hover:underline">
                                        Esqueci minha senha
                                    </Link>
                                </div>
                                <input type="password" required value={loginData.password} onChange={(e) => setLoginData({ ...loginData, password: e.target.value })} className="w-full input" />
                            </div>
                            <Button type="submit" className="w-full bg-[#2d8659] hover:bg-[#236b47]">Entrar</Button>
                        </form>
                    </motion.div>
                </div>
            </>
        );
    }


    const currentTabs = tabsConfig[userRole] || [];
    const hasEventsTab = currentTabs.some(tab => tab.value === 'events');

    const rawRole = userRole || user?.user_metadata?.role || user?.app_metadata?.role || 'user';
    const normalizedRole = typeof rawRole === 'string' ? rawRole.toLowerCase() : 'user';
    const roleConfig = ROLE_DISPLAY[normalizedRole] || ROLE_DISPLAY.user;
    const RoleIcon = roleConfig.Icon;
    const displayName = user?.user_metadata?.full_name || user?.user_metadata?.fullName || user?.email?.split('@')[0] || 'Usuário';

    return (
        <>
            <Helmet><title>Painel de Controle - Doxologos</title></Helmet>
            <header className="fixed top-0 w-full bg-white/95 backdrop-blur-sm shadow-sm z-40">
                <nav className="container mx-auto px-4 py-3 md:py-4">
                    {/* Desktop Header */}
                    <div className="hidden md:flex items-center justify-between gap-4">
                        <Link to="/" className="flex items-center space-x-2">
                            <img src="/favicon.svg" alt="Doxologos Logo" className="w-8 h-8" />
                            <span className="text-2xl font-bold gradient-text">Doxologos</span>
                        </Link>
                        <div className="flex items-center justify-end gap-4 flex-wrap">
                            <Link to="/" className="inline-flex items-center text-sm font-medium text-[#2d8659] hover:text-[#236b47] transition-colors">
                                <ArrowLeft className="w-4 h-4 mr-1" /> Voltar ao Site
                            </Link>
                            <div className="h-6 w-px bg-gray-300"></div>
                            <UserBadge
                                user={user}
                                userRole={userRole}
                                onLogout={handleLogout}
                                layout="row"
                                showLogoutButton={true}
                            />
                            {hasEventsTab && (
                                <Button
                                    variant="outline"
                                    className="border-[#2d8659] text-[#2d8659] hidden sm:inline-flex"
                                    onClick={() => {
                                        setActiveTab('events');
                                        window.requestAnimationFrame(() => {
                                            const tabsElement = document.getElementById('admin-tabs');
                                            if (tabsElement) {
                                                tabsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                            }
                                        });
                                    }}
                                >
                                    <Calendar className="w-4 h-4 mr-2" /> Meus Eventos
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Mobile Header */}
                    <div className="flex md:hidden items-center justify-between">
                        <Link to="/" className="flex items-center space-x-2">
                            <img src="/favicon.svg" alt="Doxologos Logo" className="w-7 h-7" />
                            <span className="text-xl font-bold gradient-text">Doxologos</span>
                        </Link>
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            {mobileMenuOpen ? (
                                <X className="w-6 h-6 text-[#2d8659]" />
                            ) : (
                                <Menu className="w-6 h-6 text-[#2d8659]" />
                            )}
                        </button>
                    </div>

                    {/* Mobile Menu */}
                    {mobileMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="md:hidden mt-3 pb-3 border-t border-gray-200 pt-3"
                        >
                            <UserBadge
                                user={user}
                                userRole={userRole}
                                onLogout={() => {
                                    handleLogout();
                                    setMobileMenuOpen(false);
                                }}
                                layout="column"
                                showLogoutButton={true}
                                compact={true}
                            />
                            <div className="border-t border-gray-200 mt-3 pt-3 space-y-2 px-3">
                                <Link
                                    to="/"
                                    className="block px-2 py-2 rounded-md text-sm font-medium text-[#2d8659] hover:bg-gray-50 transition-colors"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2 inline" /> Voltar ao Site
                                </Link>
                                {hasEventsTab && (
                                    <Button
                                        variant="outline"
                                        className="w-full border-[#2d8659] text-[#2d8659] justify-start"
                                        onClick={() => {
                                            setActiveTab('events');
                                            setMobileMenuOpen(false);
                                            window.requestAnimationFrame(() => {
                                                const tabsElement = document.getElementById('admin-tabs');
                                                if (tabsElement) {
                                                    tabsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                }
                                            });
                                        }}
                                    >
                                        <Calendar className="w-4 h-4 mr-2" /> Meus Eventos
                                    </Button>
                                )}
                            </div>
                        </motion.div>
                    )}
                </nav>
            </header>
            <div className="min-h-screen bg-gray-50 py-8 md:py-12 pt-28 md:pt-32">
                <div className="container mx-auto px-3 md:px-4">
                    <h1 className="text-4xl font-bold mb-2">Painel de Controle</h1>
                    <p className="text-gray-500 mb-8">Bem-vindo, {displayName}. Utilize os atalhos acima para navegar rapidamente.</p>

                    {/* Quick Access Links - Apenas para Admin */}
                    {userRole === 'admin' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                            <Link to="/admin/usuarios" className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-6 shadow-lg hover:shadow-xl transition-all hover:scale-105">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold mb-1">Gestão de Usuários</h3>
                                        <p className="text-purple-100 text-sm">Gerenciar contas e permissões</p>
                                    </div>
                                    <Users className="w-10 h-10 opacity-80" />
                                </div>
                            </Link>
                            <Link to="/admin/pagamentos" className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-6 shadow-lg hover:shadow-xl transition-all hover:scale-105">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold mb-1">Pagamentos</h3>
                                        <p className="text-green-100 text-sm">Gerenciar transações</p>
                                    </div>
                                    <DollarSign className="w-10 h-10 opacity-80" />
                                </div>
                            </Link>
                            <Link to="/admin/depoimentos" className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-6 shadow-lg hover:shadow-xl transition-all hover:scale-105">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold mb-1">Depoimentos</h3>
                                        <p className="text-blue-100 text-sm">Moderar avaliações</p>
                                    </div>
                                    <MessageCircle className="w-10 h-10 opacity-80" />
                                </div>
                            </Link>
                        </div>
                    )}

                    <Tabs id="admin-tabs" value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="flex flex-wrap h-auto justify-start p-1 bg-gray-100 rounded-lg">
                            {currentTabs.map(tab => (
                                <TabsTrigger key={tab.value} value={tab.value} className="flex-1 min-w-[120px] data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                    <tab.icon className="w-4 h-4 mr-2" />{tab.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        {/* Dashboard Tab - Profissionais */}
                        <TabsContent value="dashboard" className="mt-6">
                            <div className="space-y-6">
                                {/* Header */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                                            <LayoutDashboard className="w-8 h-8 text-[#2d8659]" />
                                            Dashboard
                                        </h2>
                                        <p className="text-gray-600 mt-1">Visão geral da sua atividade profissional</p>
                                    </div>
                                </div>

                                {/* Métricas Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <StatCard
                                        label="Consultas Hoje"
                                        value={professionalStats.totalAppointments}
                                        format="number"
                                        loading={professionalStats.loading}
                                        comparison={`${professionalStats.confirmedToday} confirmadas`}
                                    />

                                    <StatCard
                                        label="Pendentes"
                                        value={professionalStats.pendingAppointments?.length || 0}
                                        format="number"
                                        loading={professionalStats.loading}
                                        comparison="aguardando confirmação"
                                    />

                                    <StatCard
                                        label="Receita do Mês"
                                        value={professionalStats.monthlyRevenue}
                                        format="currency"
                                        loading={professionalStats.loading}
                                        comparison="total faturado"
                                    />

                                    <StatCard
                                        label="Avaliação Média"
                                        value={professionalStats.averageRating}
                                        format="number"
                                        loading={professionalStats.loading}
                                        comparison={professionalStats.averageRating > 0 ? `${professionalStats.averageRating.toFixed(1)} ⭐` : 'Sem avaliações'}
                                    />
                                </div>

                                {/* Gráfico de Receita Mensal */}
                                <RevenueChart
                                    data={monthlyRevenue.data}
                                    loading={monthlyRevenue.loading}
                                    title="Receita Mensal"
                                />

                                {/* Ações Rápidas */}
                                <QuickActions
                                    title="Ações Rápidas"
                                    layout="grid"
                                    columns={3}
                                    actions={[
                                        {
                                            id: 'view-bookings',
                                            label: 'Ver Agendamentos',
                                            description: 'Gerenciar suas consultas',
                                            icon: Calendar,
                                            onClick: () => setActiveTab('bookings'),
                                            variant: 'default',
                                        },
                                        {
                                            id: 'manage-availability',
                                            label: 'Disponibilidade',
                                            description: 'Configurar horários',
                                            icon: Clock,
                                            onClick: () => setActiveTab('availability'),
                                            variant: 'outline',
                                        },
                                        {
                                            id: 'view-reviews',
                                            label: 'Avaliações',
                                            description: 'Ver feedback dos pacientes',
                                            icon: Star,
                                            onClick: () => setActiveTab('reviews'),
                                            variant: 'outline',
                                            badge: reviews.length > 0 ? reviews.length : undefined,
                                        },
                                    ]}
                                />

                                {/* Próximas Consultas do Dia */}
                                <div className="bg-white rounded-xl shadow-lg p-6">
                                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <Activity className="w-5 h-5 text-[#2d8659]" />
                                        Consultas de Hoje
                                    </h3>

                                    {professionalStats.loading ? (
                                        <div className="flex items-center justify-center py-12">
                                            <LoadingSpinner />
                                        </div>
                                    ) : (
                                        <TimelineView
                                            items={professionalStats.todayAppointments.map(appointment => ({
                                                id: appointment.id,
                                                date: appointment.booking_date,
                                                time: appointment.booking_time,
                                                title: appointment.patient_name || 'Paciente',
                                                description: appointment.service?.name || 'Consulta',
                                                status: appointment.status === 'confirmed' || appointment.status === 'paid'
                                                    ? 'confirmed'
                                                    : appointment.status === 'completed'
                                                        ? 'completed'
                                                        : appointment.status.includes('cancelled')
                                                            ? 'cancelled'
                                                            : 'pending',
                                                actions: [
                                                    {
                                                        label: 'Ver Detalhes',
                                                        onClick: () => {
                                                            setActiveTab('bookings');
                                                            // Scroll to booking would go here
                                                        },
                                                        variant: 'primary'
                                                    }
                                                ]
                                            }))}
                                            groupBy="none"
                                            emptyMessage="Nenhuma consulta agendada para hoje"
                                        />
                                    )}
                                </div>

                                {/* Consultas Pendentes */}
                                {professionalStats.pendingAppointments && professionalStats.pendingAppointments.length > 0 && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl shadow-sm p-6">
                                        <h3 className="text-xl font-bold text-amber-900 mb-4 flex items-center gap-2">
                                            <Clock className="w-5 h-5 text-amber-600" />
                                            Consultas Pendentes ({professionalStats.pendingAppointments.length})
                                        </h3>

                                        <TimelineView
                                            items={professionalStats.pendingAppointments.slice(0, 5).map(appointment => ({
                                                id: appointment.id,
                                                date: appointment.booking_date,
                                                time: appointment.booking_time,
                                                title: appointment.patient_name || 'Paciente',
                                                description: appointment.service?.name || 'Consulta',
                                                status: 'pending',
                                                actions: [
                                                    {
                                                        label: 'Gerenciar',
                                                        onClick: () => setActiveTab('bookings'),
                                                        variant: 'primary'
                                                    }
                                                ]
                                            }))}
                                            groupBy="date"
                                            emptyMessage="Nenhuma consulta pendente"
                                        />

                                        {professionalStats.pendingAppointments.length > 5 && (
                                            <div className="mt-4 text-center">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setActiveTab('bookings')}
                                                    className="text-amber-700 border-amber-300 hover:bg-amber-100"
                                                >
                                                    Ver todas as {professionalStats.pendingAppointments.length} pendentes
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="bookings" className="mt-6">

                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-bold flex items-center">
                                        <Calendar className="w-6 h-6 mr-2 text-[#2d8659]" />
                                        Agendamentos
                                        <span className="ml-2 text-lg text-gray-500">({getFilteredBookings().length}/{bookings.length})</span>
                                    </h2>

                                    <div className="flex items-center gap-2">
                                        {/* View Toggle */}
                                        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                                            <Button
                                                variant={bookingView === 'list' ? 'default' : 'ghost'}
                                                size="sm"
                                                onClick={() => setBookingView('list')}
                                                className={cn(
                                                    'h-8 px-3',
                                                    bookingView === 'list' && 'bg-white shadow-sm'
                                                )}
                                            >
                                                <List className="w-4 h-4 mr-1" />
                                                Lista
                                            </Button>
                                            <Button
                                                variant={bookingView === 'calendar' ? 'default' : 'ghost'}
                                                size="sm"
                                                onClick={() => setBookingView('calendar')}
                                                className={cn(
                                                    'h-8 px-3',
                                                    bookingView === 'calendar' && 'bg-white shadow-sm'
                                                )}
                                            >
                                                <LayoutGrid className="w-4 h-4 mr-1" />
                                                Calendário
                                            </Button>
                                        </div>

                                        <Button
                                            onClick={() => setShowFilters(!showFilters)}
                                            variant="outline"
                                            size="sm"
                                            className="flex items-center"
                                        >
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 2v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                            </svg>
                                            {showFilters ? 'Ocultar' : 'Mostrar'} Filtros
                                            {(() => {
                                                const activeFilters = Object.values(bookingFilters).filter(value => value !== '').length;
                                                return activeFilters > 0 ? (
                                                    <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                                        {activeFilters}
                                                    </span>
                                                ) : null;
                                            })()}
                                        </Button>
                                    </div>
                                </div>

                                {/* Totalizadores */}
                                {(() => {
                                    const filteredBookings = getFilteredBookings();
                                    const totals = calculateTotals(filteredBookings);

                                    const gridColsClass = userRole === 'admin'
                                        ? 'xl:grid-cols-6'
                                        : (totals.cancelledValue > 0 ? 'xl:grid-cols-5' : 'xl:grid-cols-4');

                                    return (
                                        <div className={`grid grid-cols-1 md:grid-cols-2 ${gridColsClass} gap-4 mb-6`}>
                                            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                                                <div className="flex items-center">
                                                    <Calendar className="w-8 h-8 text-blue-600 mr-3" />
                                                    <div>
                                                        <p className="text-sm text-blue-600 font-medium">Total de Agendamentos</p>
                                                        <p className="text-2xl font-bold text-blue-900">{totals.totalBookings}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {userRole === 'admin' && (
                                                <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                                                    <div className="flex items-center">
                                                        <svg className="w-8 h-8 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                                        </svg>
                                                        <div>
                                                            <p className="text-sm text-green-600 font-medium">Valor total cobrado</p>
                                                            <p className="text-2xl font-bold text-green-900">
                                                                R$ {totals.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                                                <div className="flex items-center">
                                                    <DollarSign className="w-8 h-8 text-blue-600 mr-3" />
                                                    <div>
                                                        <p className="text-sm text-blue-600 font-medium">{userRole === 'admin' ? 'Total repassado' : 'A faturar'}</p>
                                                        <p className="text-2xl font-bold text-blue-900">
                                                            R$ {totals.totalProfessionalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {userRole === 'admin' && (
                                                <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                                                    <div className="flex items-center">
                                                        <ShieldCheck className="w-8 h-8 text-purple-600 mr-3" />
                                                        <div>
                                                            <p className="text-sm text-purple-600 font-medium">Taxa da plataforma</p>
                                                            <p className="text-2xl font-bold text-purple-900">
                                                                R$ {totals.totalPlatformFee.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 p-4 rounded-lg border border-emerald-200">
                                                <div className="flex items-center">
                                                    <svg className="w-8 h-8 text-emerald-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <div>
                                                        <p className="text-sm text-emerald-600 font-medium">Total a Receber</p>
                                                        <p className="text-2xl font-bold text-emerald-900">
                                                            R$ {totals.completedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200">
                                                <div className="flex items-center">
                                                    <svg className="w-8 h-8 text-yellow-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <div>
                                                        <p className="text-sm text-yellow-600 font-medium">Pendentes</p>
                                                        <p className="text-2xl font-bold text-yellow-900">
                                                            R$ {totals.pendingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {totals.cancelledValue > 0 && (
                                                <div className="bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
                                                    <div className="flex items-center">
                                                        <svg className="w-8 h-8 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                        <div>
                                                            <p className="text-sm text-red-600 font-medium">Cancelados</p>
                                                            <p className="text-2xl font-bold text-red-900">
                                                                R$ {totals.cancelledValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                {/* Calendar View */}
                                {bookingView === 'calendar' ? (
                                    <AppointmentCalendar
                                        appointments={getFilteredBookings()}
                                        onDateClick={(date, dayAppointments) => {
                                            // Ao clicar em um dia, volta para lista e filtra por essa data
                                            setBookingView('list');
                                            const dateStr = date.toISOString().split('T')[0];
                                            setBookingFilters(prev => ({
                                                ...prev,
                                                date_from: dateStr,
                                                date_to: dateStr
                                            }));
                                        }}
                                        onAppointmentClick={(appointment) => {
                                            // Pode adicionar lógica para abrir modal de detalhes
                                            console.log('Appointment clicked:', appointment);
                                        }}
                                    />
                                ) : (
                                    <>
                                        {/* Ordenação de Agendamentos */}
                                        {bookings.length > 0 && (
                                            <div className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-200">
                                                <h3 className="font-semibold mb-3 flex items-center text-blue-900">
                                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                                                    </svg>
                                                    Ordenação
                                                </h3>
                                                <div className="flex flex-wrap gap-2">
                                                    <Button
                                                        onClick={() => handleBookingSort('default')}
                                                        variant="outline"
                                                        size="sm"
                                                        className={bookingSortField === 'default' ? 'bg-[#2d8659] text-white hover:bg-[#236b47] border-[#2d8659]' : 'bg-white'}
                                                    >
                                                        📋 Padrão (Status + Data)
                                                    </Button>
                                                    <Button
                                                        onClick={() => handleBookingSort('status')}
                                                        variant="outline"
                                                        size="sm"
                                                        className={bookingSortField === 'status' ? 'bg-[#2d8659] text-white hover:bg-[#236b47] border-[#2d8659]' : 'bg-white'}
                                                    >
                                                        🎯 Status {bookingSortField === 'status' && (bookingSortOrder === 'asc' ? '↑' : '↓')}
                                                    </Button>
                                                    <Button
                                                        onClick={() => handleBookingSort('date')}
                                                        variant="outline"
                                                        size="sm"
                                                        className={bookingSortField === 'date' ? 'bg-[#2d8659] text-white hover:bg-[#236b47] border-[#2d8659]' : 'bg-white'}
                                                    >
                                                        📅 Data {bookingSortField === 'date' && (bookingSortOrder === 'asc' ? '↑' : '↓')}
                                                    </Button>
                                                    {userRole === 'admin' && (
                                                        <Button
                                                            onClick={() => handleBookingSort('professional')}
                                                            variant="outline"
                                                            size="sm"
                                                            className={bookingSortField === 'professional' ? 'bg-[#2d8659] text-white hover:bg-[#236b47] border-[#2d8659]' : 'bg-white'}
                                                        >
                                                            👤 Profissional {bookingSortField === 'professional' && (bookingSortOrder === 'asc' ? '↑' : '↓')}
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Seção de Filtros - Recolhível */}
                                        {showFilters && (
                                            <div className="bg-gray-50 rounded-lg p-4 mb-6 border animate-in slide-in-from-top-2 duration-200">
                                                <h3 className="font-semibold text-gray-700 mb-4 flex items-center">
                                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 2v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                                    </svg>
                                                    Filtros Avançados
                                                </h3>                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                                                    {/* Busca por nome/email */}
                                                    <div>
                                                        <label className="block text-xs font-medium mb-1 text-gray-600">Buscar Paciente</label>
                                                        <input
                                                            type="text"
                                                            placeholder="Nome ou email..."
                                                            value={bookingFilters.search}
                                                            onChange={(e) => setBookingFilters({ ...bookingFilters, search: e.target.value })}
                                                            className="w-full input text-sm"
                                                        />
                                                    </div>

                                                    {/* Filtro por Serviço */}
                                                    <div>
                                                        <label className="block text-xs font-medium mb-1 text-gray-600">Serviço</label>
                                                        <select
                                                            value={bookingFilters.service_id}
                                                            onChange={(e) => setBookingFilters({ ...bookingFilters, service_id: e.target.value })}
                                                            className="w-full input text-sm"
                                                        >
                                                            <option value="">Todos os serviços</option>
                                                            {services.map(service => (
                                                                <option key={service.id} value={service.id}>{service.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    {/* Filtro por Profissional */}
                                                    <div>
                                                        <label className="block text-xs font-medium mb-1 text-gray-600">Profissional</label>
                                                        <select
                                                            value={bookingFilters.professional_id}
                                                            onChange={(e) => setBookingFilters({ ...bookingFilters, professional_id: e.target.value })}
                                                            className="w-full input text-sm"
                                                        >
                                                            <option value="">Todos os profissionais</option>
                                                            {professionals.map(prof => (
                                                                <option key={prof.id} value={prof.id}>{prof.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    {/* Filtro por Status */}
                                                    <div>
                                                        <label className="block text-xs font-medium mb-1 text-gray-600">Status</label>
                                                        <select
                                                            value={bookingFilters.status}
                                                            onChange={(e) => setBookingFilters({ ...bookingFilters, status: e.target.value })}
                                                            className="w-full input text-sm"
                                                        >
                                                            <option value="">Todos os status</option>
                                                            <option value="pending_payment">Pendente Pagamento</option>
                                                            <option value="confirmed">Confirmado</option>
                                                            <option value="completed">Concluído</option>
                                                            <option value="cancelled_by_patient">Cancelado (Paciente)</option>
                                                            <option value="cancelled_by_professional">Cancelado (Profissional)</option>
                                                            <option value="no_show_unjustified">Falta injustificada</option>
                                                        </select>
                                                    </div>

                                                    {/* Filtro por Período - Data Inicial */}
                                                    <div>
                                                        <label className="block text-xs font-medium mb-1 text-gray-600">De</label>
                                                        <input
                                                            type="date"
                                                            value={bookingFilters.date_from}
                                                            onChange={(e) => setBookingFilters({ ...bookingFilters, date_from: e.target.value })}
                                                            className="w-full input text-sm"
                                                        />
                                                    </div>

                                                    {/* Filtro por Período - Data Final */}
                                                    <div>
                                                        <label className="block text-xs font-medium mb-1 text-gray-600">Até</label>
                                                        <input
                                                            type="date"
                                                            value={bookingFilters.date_to}
                                                            onChange={(e) => setBookingFilters({ ...bookingFilters, date_to: e.target.value })}
                                                            className="w-full input text-sm"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Botão para limpar filtros */}
                                                <div className="mt-4 flex justify-end">
                                                    <Button
                                                        onClick={clearFilters}
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-gray-600 hover:text-gray-800"
                                                    >
                                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                        Limpar Filtros
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        {(() => {
                                            const filteredBookings = getFilteredBookings();
                                            const sortedBookings = getSortedBookings(filteredBookings);
                                            const paginatedBookings = getPaginatedBookings(sortedBookings);
                                            const totalPages = getTotalPages(sortedBookings);

                                            if (bookings.length === 0) {
                                                return (
                                                    <div className="text-center py-12">
                                                        <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                                                        <p className="text-gray-500 text-lg">Nenhum agendamento encontrado</p>
                                                    </div>
                                                );
                                            }

                                            if (filteredBookings.length === 0) {
                                                return (
                                                    <div className="text-center py-12">
                                                        <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                        </svg>
                                                        <p className="text-gray-500 text-lg mb-2">Nenhum agendamento encontrado com os filtros aplicados</p>
                                                        <p className="text-gray-400 text-sm">Tente ajustar os filtros ou limpar para ver todos os agendamentos</p>
                                                        <Button onClick={clearFilters} variant="outline" className="mt-4">
                                                            Limpar Filtros
                                                        </Button>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div>
                                                    {/* Info de paginação */}
                                                    <div className="flex items-center justify-between mb-4 text-sm text-gray-600">
                                                        <span>
                                                            Mostrando <strong>{((currentPage - 1) * itemsPerPage) + 1}</strong> a <strong>{Math.min(currentPage * itemsPerPage, sortedBookings.length)}</strong> de <strong>{sortedBookings.length}</strong> agendamento(s)
                                                        </span>
                                                        <select
                                                            value={itemsPerPage}
                                                            onChange={(e) => {
                                                                setItemsPerPage(Number(e.target.value));
                                                                setCurrentPage(1);
                                                            }}
                                                            className="input text-sm py-1"
                                                        >
                                                            <option value="5">5 por página</option>
                                                            <option value="10">10 por página</option>
                                                            <option value="20">20 por página</option>
                                                            <option value="50">50 por página</option>
                                                        </select>
                                                    </div>

                                                    <div className="space-y-2">
                                                        {paginatedBookings.map((b, index) => {
                                                            const statusColors = {
                                                                'pending_payment': 'bg-yellow-100 text-yellow-800 border-yellow-200',
                                                                'confirmed': 'bg-green-100 text-green-800 border-green-200',
                                                                'paid': 'bg-green-100 text-green-800 border-green-200',
                                                                'completed': 'bg-blue-100 text-blue-800 border-blue-200',
                                                                'cancelled_by_patient': 'bg-red-100 text-red-800 border-red-200',
                                                                'cancelled_by_professional': 'bg-gray-100 text-gray-800 border-gray-200',
                                                                'no_show_unjustified': 'bg-orange-100 text-orange-800 border-orange-200'
                                                            };

                                                            const statusLabels = {
                                                                'pending_payment': 'Pendente Pagamento',
                                                                'confirmed': 'Confirmado',
                                                                'paid': 'Pago',
                                                                'completed': 'Concluído',
                                                                'cancelled_by_patient': 'Cancelado pelo Paciente',
                                                                'cancelled_by_professional': 'Cancelado pelo Profissional',
                                                                'no_show_unjustified': 'Falta injustificada'
                                                            };

                                                            // Usa valor histórico se disponível, senão usa preço atual do serviço
                                                            const patientValue = Number(b.valor_consulta ?? b.service?.price ?? 0) || 0;
                                                            const professionalValue = Number(
                                                                b.valor_repasse_profissional ?? b.service?.professional_payout ?? b.valor_consulta ?? patientValue
                                                            ) || 0;
                                                            const platformFeeValue = Math.max(patientValue - professionalValue, 0);
                                                            const professionalChipLabel = isAdminView ? 'Profissional' : 'Você recebe';

                                                            const bookingService = services.find(service => service.id === b.service_id) || null;

                                                            let availableServices;
                                                            if (isAdminView) {
                                                                availableServices = services;
                                                            } else {
                                                                const uniqueServices = [];
                                                                const seenServiceIds = new Set();
                                                                const pushService = (service) => {
                                                                    if (service && service.id && !seenServiceIds.has(service.id)) {
                                                                        uniqueServices.push(service);
                                                                        seenServiceIds.add(service.id);
                                                                    }
                                                                };

                                                                pushService(bookingService);
                                                                services.forEach((service) => {
                                                                    if (professionalServiceIdSet.has(service.id)) {
                                                                        pushService(service);
                                                                    }
                                                                });

                                                                availableServices = uniqueServices;
                                                            }

                                                            const quickStatusOptions = isAdminView
                                                                ? [
                                                                    { value: 'pending_payment', label: statusLabels['pending_payment'] },
                                                                    { value: 'confirmed', label: statusLabels['confirmed'] },
                                                                    { value: 'completed', label: statusLabels['completed'] },
                                                                    { value: 'cancelled_by_patient', label: statusLabels['cancelled_by_patient'] },
                                                                    { value: 'cancelled_by_professional', label: statusLabels['cancelled_by_professional'] },
                                                                    { value: 'no_show_unjustified', label: statusLabels['no_show_unjustified'] }
                                                                ]
                                                                : (() => {
                                                                    const options = [
                                                                        { value: b.status, label: `${statusLabels[b.status] || b.status} (atual)`, disabled: true }
                                                                    ];

                                                                    if (b.status !== 'completed') {
                                                                        options.push({ value: 'completed', label: statusLabels['completed'], disabled: b.status !== 'confirmed' });
                                                                    }

                                                                    if (b.status !== 'cancelled_by_professional') {
                                                                        options.push({ value: 'cancelled_by_professional', label: statusLabels['cancelled_by_professional'], disabled: false });
                                                                    }

                                                                    if (b.status !== 'no_show_unjustified') {
                                                                        options.push({ value: 'no_show_unjustified', label: statusLabels['no_show_unjustified'], disabled: false });
                                                                    }

                                                                    return options;
                                                                })();

                                                            const hasEnabledQuickStatusOption = quickStatusOptions.some(option => !option.disabled && option.value !== b.status);
                                                            const quickStatusSelectDisabled = isAnyItemLoading() || (!isAdminView && !hasEnabledQuickStatusOption);

                                                            const serviceOptionLabel = (service) => {
                                                                if (!service) return '';
                                                                if (isAdminView) {
                                                                    const priceNumber = Number(service.price) || 0;
                                                                    return `${service.name} - R$ ${priceNumber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                                                                }
                                                                return service.name;
                                                            };

                                                            return (
                                                                <div key={b.id} className={`relative border rounded-lg p-6 hover:shadow-md transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                                                    } hover:bg-blue-50 ${(isItemLoading('status', b.id) || isItemLoading('edit', b.id)) ? 'opacity-75' : ''}`}>

                                                                    {/* Overlay de Loading com novo componente */}
                                                                    <LoadingOverlay
                                                                        isLoading={isItemLoading('status', b.id) || isItemLoading('edit', b.id)}
                                                                        message={isItemLoading('status', b.id) ? 'Atualizando status...' : 'Salvando alterações...'}
                                                                    />

                                                                    <div className="flex justify-between items-start mb-4">
                                                                        <div className="flex-1">
                                                                            <div className="flex items-center gap-3 mb-3">
                                                                                <h3 className="font-semibold text-lg text-gray-900">
                                                                                    {b.patient_name || 'Nome não informado'}
                                                                                </h3>
                                                                                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[b.status] || 'bg-gray-100 text-gray-800'}`}>
                                                                                    {statusLabels[b.status] || b.status}
                                                                                </span>
                                                                                {(patientValue > 0 || professionalValue > 0) && (
                                                                                    <div className="flex flex-wrap gap-2">
                                                                                        {patientValue > 0 && userRole === 'admin' && (
                                                                                            <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800 border border-green-200">
                                                                                                Paciente: R$ {patientValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                                            </span>
                                                                                        )}
                                                                                        {professionalValue > 0 && (
                                                                                            <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                                                                                                {professionalChipLabel}: R$ {professionalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                                            </span>
                                                                                        )}
                                                                                        {userRole === 'admin' && platformFeeValue > 0 && (
                                                                                            <span className="px-3 py-1 rounded-full text-sm font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                                                                                                Taxa: R$ {platformFeeValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                            </div>

                                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
                                                                                <div>
                                                                                    <span className="text-gray-500 block">Profissional</span>
                                                                                    <span className="font-medium">{b.professional?.name || 'N/A'}</span>
                                                                                </div>
                                                                                <div>
                                                                                    <span className="text-gray-500 block">Serviço</span>
                                                                                    <span className="font-medium">{b.service?.name || 'N/A'}</span>
                                                                                    {b.service?.duration_minutes && (
                                                                                        <span className="text-blue-600 block text-xs">
                                                                                            {b.service.duration_minutes >= 60
                                                                                                ? `${Math.floor(b.service.duration_minutes / 60)}h${b.service.duration_minutes % 60 > 0 ? ` ${b.service.duration_minutes % 60}min` : ''}`
                                                                                                : `${b.service.duration_minutes}min`
                                                                                            }
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <div>
                                                                                    <span className="text-gray-500 block">Financeiro</span>
                                                                                    {(userRole === 'admin' ? patientValue : professionalValue) > 0 ? (
                                                                                        <div className="space-y-1">
                                                                                            {userRole === 'admin' && patientValue > 0 && (
                                                                                                <span className="font-bold text-green-700 block">
                                                                                                    Paciente: R$ {patientValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                                                </span>
                                                                                            )}
                                                                                            {professionalValue > 0 && (
                                                                                                <span className="font-semibold text-blue-700 block">
                                                                                                    {professionalChipLabel}: R$ {professionalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                                                </span>
                                                                                            )}
                                                                                            {userRole === 'admin' && (
                                                                                                <span className="text-xs text-purple-700 block">
                                                                                                    Taxa plataforma: R$ {platformFeeValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    ) : (
                                                                                        <span className="text-orange-500 block text-xs">Valor não definido</span>
                                                                                    )}
                                                                                </div>
                                                                                <div>
                                                                                    <span className="text-gray-500 block">Data e Horário</span>
                                                                                    <span className="font-medium">
                                                                                        {new Date(b.booking_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                                                                    </span>
                                                                                    <span className="block text-blue-600">{b.booking_time}h</span>
                                                                                </div>
                                                                                <div>
                                                                                    <span className="text-gray-500 block">Contato</span>
                                                                                    <span className="font-medium block text-xs">{b.patient_email || 'N/A'}</span>
                                                                                    <span className="block text-xs">{b.patient_phone || 'N/A'}</span>
                                                                                </div>
                                                                            </div>

                                                                            {/* Exibir dados do Zoom para consultas confirmadas ou pagas */}
                                                                            {(b.status === 'confirmed' || b.status === 'paid') && b.meeting_link && (
                                                                                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
                                                                                    {/* Header clicável */}
                                                                                    <button
                                                                                        onClick={() => toggleZoomExpansion(b.id)}
                                                                                        className="w-full p-4 flex items-center justify-between hover:bg-blue-100 transition-colors"
                                                                                    >
                                                                                        <h4 className="font-semibold text-blue-900 flex items-center">
                                                                                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                                                            </svg>
                                                                                            Acesso à sala
                                                                                        </h4>
                                                                                        {expandedZoomCards[b.id] ? (
                                                                                            <ChevronUp className="w-5 h-5 text-blue-700" />
                                                                                        ) : (
                                                                                            <ChevronDown className="w-5 h-5 text-blue-700" />
                                                                                        )}
                                                                                    </button>

                                                                                    {/* Conteúdo colapsável com animação */}
                                                                                    <div
                                                                                        className={`transition-all duration-300 ease-in-out ${expandedZoomCards[b.id]
                                                                                            ? 'max-h-96 opacity-100'
                                                                                            : 'max-h-0 opacity-0'
                                                                                            } overflow-hidden`}
                                                                                    >
                                                                                        <div className="px-4 pb-4 space-y-2 text-sm border-t border-blue-200 pt-3">
                                                                                            <div>
                                                                                                <span className="text-gray-600 font-medium">Link da Reunião:</span>
                                                                                                <a
                                                                                                    href={b.meeting_link}
                                                                                                    target="_blank"
                                                                                                    rel="noopener noreferrer"
                                                                                                    className="block text-blue-600 hover:text-blue-800 underline break-all"
                                                                                                >
                                                                                                    {b.meeting_link}
                                                                                                </a>
                                                                                            </div>
                                                                                            {b.meeting_password && (
                                                                                                <div>
                                                                                                    <span className="text-gray-600 font-medium">Senha: </span>
                                                                                                    <span className="font-mono bg-white px-2 py-1 rounded border border-blue-300 text-blue-900">
                                                                                                        {b.meeting_password}
                                                                                                    </span>
                                                                                                </div>
                                                                                            )}
                                                                                            {b.meeting_start_url && (
                                                                                                <div>
                                                                                                    <span className="text-gray-600 font-medium">Link do Anfitrião:</span>
                                                                                                    <a
                                                                                                        href={b.meeting_start_url}
                                                                                                        target="_blank"
                                                                                                        rel="noopener noreferrer"
                                                                                                        className="block text-green-600 hover:text-green-800 underline break-all"
                                                                                                    >
                                                                                                        {b.meeting_start_url}
                                                                                                    </a>
                                                                                                    <span className="text-xs text-gray-500 italic">
                                                                                                        ⚠️ Use este link para iniciar a reunião como anfitrião
                                                                                                    </span>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        <div className="flex gap-2 ml-4 flex-col items-end">
                                                                            {/* Mudança rápida de status */}
                                                                            <div className="w-48 relative">
                                                                                <label className="block text-xs text-gray-600 mb-1">
                                                                                    Status Rápido:
                                                                                    {isItemLoading('status', b.id) && (
                                                                                        <LoadingSpinner size="xs" className="inline-block ml-1 text-[#2d8659]" />
                                                                                    )}
                                                                                </label>
                                                                                <LoadingInput isLoading={isItemLoading('status', b.id)}>
                                                                                    <select
                                                                                        value={b.status}
                                                                                        onChange={(e) => handleQuickStatusChange(b.id, e.target.value, b)}
                                                                                        disabled={quickStatusSelectDisabled}
                                                                                        className={`w-full text-sm px-2 py-1 border rounded focus:ring-2 focus:ring-[#2d8659] focus:border-transparent transition-all ${quickStatusSelectDisabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : 'cursor-pointer'
                                                                                            } ${isItemLoading('status', b.id) ? 'ring-2 ring-[#2d8659] ring-opacity-50' : ''}`}
                                                                                    >
                                                                                        {quickStatusOptions.map((option) => (
                                                                                            <option
                                                                                                key={option.value}
                                                                                                value={option.value}
                                                                                                disabled={option.disabled}
                                                                                            >
                                                                                                {option.label}
                                                                                            </option>
                                                                                        ))}
                                                                                    </select>
                                                                                </LoadingInput>
                                                                            </div>

                                                                            <div className="flex gap-2">
                                                                                <Dialog>
                                                                                    <DialogTrigger asChild>
                                                                                        <Button
                                                                                            size="sm"
                                                                                            variant="outline"
                                                                                            disabled={isAnyItemLoading()}
                                                                                            onClick={() => {
                                                                                                setEditingBooking(b);
                                                                                                const resolvedProfessionalId = isAdminView
                                                                                                    ? (b.professional_id || '')
                                                                                                    : (currentProfessional?.id || b.professional_id || '');

                                                                                                setBookingEditData({
                                                                                                    booking_date: b.booking_date,
                                                                                                    booking_time: b.booking_time,
                                                                                                    status: b.status,
                                                                                                    professional_id: resolvedProfessionalId,
                                                                                                    service_id: b.service_id || '',
                                                                                                    patient_name: b.patient_name || '',
                                                                                                    patient_email: b.patient_email || '',
                                                                                                    patient_phone: b.patient_phone || '',
                                                                                                    valor_consulta: formatNumberToCurrencyInput(b.valor_consulta ?? ''),
                                                                                                    valor_repasse_profissional: formatNumberToCurrencyInput(
                                                                                                        b.valor_repasse_profissional ?? b.valor_consulta ?? ''
                                                                                                    )
                                                                                                });
                                                                                            }}
                                                                                            className={`hover:bg-blue-50 transition-all ${isAnyItemLoading() ? 'opacity-50 cursor-not-allowed' : ''
                                                                                                }`}
                                                                                        >
                                                                                            {isItemLoading('edit', b.id) ? (
                                                                                                <LoadingSpinner size="sm" className="mr-1" />
                                                                                            ) : (
                                                                                                <Edit className="w-4 h-4 mr-1" />
                                                                                            )}
                                                                                            Editar
                                                                                        </Button>
                                                                                    </DialogTrigger>
                                                                                    <DialogContent className="max-w-2xl">
                                                                                        <DialogHeader>
                                                                                            <DialogTitle className="flex items-center">
                                                                                                <Edit className="w-5 h-5 mr-2" />
                                                                                                Editar Agendamento
                                                                                            </DialogTitle>
                                                                                        </DialogHeader>
                                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                                                                                            <div>
                                                                                                <label className="block text-sm font-medium mb-1">Nome do Paciente *</label>
                                                                                                <input
                                                                                                    type="text"
                                                                                                    value={bookingEditData.patient_name}
                                                                                                    onChange={e => {
                                                                                                        if (!isAdminView) return;
                                                                                                        setBookingEditData({ ...bookingEditData, patient_name: e.target.value });
                                                                                                    }}
                                                                                                    className={`w-full input ${!isAdminView ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                                                                                    placeholder="Nome completo"
                                                                                                    required
                                                                                                    readOnly={!isAdminView}
                                                                                                />
                                                                                            </div>
                                                                                            {isAdminView && (
                                                                                                <>
                                                                                                    <div>
                                                                                                        <label className="block text-sm font-medium mb-1">Email</label>
                                                                                                        <input
                                                                                                            type="email"
                                                                                                            value={bookingEditData.patient_email}
                                                                                                            onChange={e => setBookingEditData({ ...bookingEditData, patient_email: e.target.value })}
                                                                                                            className="w-full input"
                                                                                                            placeholder="email@exemplo.com"
                                                                                                        />
                                                                                                    </div>
                                                                                                    <div>
                                                                                                        <label className="block text-sm font-medium mb-1">Telefone</label>
                                                                                                        <input
                                                                                                            type="tel"
                                                                                                            value={bookingEditData.patient_phone}
                                                                                                            onChange={e => setBookingEditData({ ...bookingEditData, patient_phone: e.target.value })}
                                                                                                            className="w-full input"
                                                                                                            placeholder="(11) 99999-9999"
                                                                                                        />
                                                                                                    </div>
                                                                                                </>
                                                                                            )}
                                                                                            {isAdminView && (
                                                                                                <div>
                                                                                                    <label className="block text-sm font-medium mb-1">Status *</label>
                                                                                                    <select
                                                                                                        value={bookingEditData.status}
                                                                                                        onChange={e => setBookingEditData({ ...bookingEditData, status: e.target.value })}
                                                                                                        className="w-full input"
                                                                                                    >
                                                                                                        <option value="pending_payment">Pendente Pagamento</option>
                                                                                                        <option value="confirmed">Confirmado</option>
                                                                                                        <option value="completed">Concluído</option>
                                                                                                        <option value="cancelled_by_patient">Cancelado (Paciente)</option>
                                                                                                        <option value="cancelled_by_professional">Cancelado (Profissional)</option>
                                                                                                        <option value="no_show_unjustified">Falta injustificada</option>
                                                                                                    </select>
                                                                                                </div>
                                                                                            )}
                                                                                            {isAdminView && (
                                                                                                <div>
                                                                                                    <label className="block text-sm font-medium mb-1">Profissional *</label>
                                                                                                    <select
                                                                                                        value={bookingEditData.professional_id}
                                                                                                        onChange={e => setBookingEditData({ ...bookingEditData, professional_id: e.target.value })}
                                                                                                        className="w-full input"
                                                                                                        required
                                                                                                    >
                                                                                                        <option value="">Selecione um profissional</option>
                                                                                                        {professionals.map(prof => (
                                                                                                            <option key={prof.id} value={prof.id}>{prof.name}</option>
                                                                                                        ))}
                                                                                                    </select>
                                                                                                </div>
                                                                                            )}
                                                                                            <div>
                                                                                                <label className="block text-sm font-medium mb-1">Serviço *</label>
                                                                                                <select
                                                                                                    value={bookingEditData.service_id}
                                                                                                    onChange={e => {
                                                                                                        const nextServiceId = e.target.value;
                                                                                                        const matchedService = services.find(service => service.id === nextServiceId);
                                                                                                        setBookingEditData(prev => ({
                                                                                                            ...prev,
                                                                                                            service_id: nextServiceId,
                                                                                                            valor_consulta: matchedService
                                                                                                                ? formatNumberToCurrencyInput(matchedService.price)
                                                                                                                : prev.valor_consulta,
                                                                                                            valor_repasse_profissional: matchedService
                                                                                                                ? formatNumberToCurrencyInput(matchedService.professional_payout ?? matchedService.price)
                                                                                                                : prev.valor_repasse_profissional
                                                                                                        }));
                                                                                                    }}
                                                                                                    className="w-full input"
                                                                                                    required
                                                                                                >
                                                                                                    <option value="">Selecione um serviço</option>
                                                                                                    {availableServices.map(service => (
                                                                                                        <option key={service.id} value={service.id}>
                                                                                                            {serviceOptionLabel(service)}
                                                                                                        </option>
                                                                                                    ))}
                                                                                                </select>
                                                                                            </div>
                                                                                            <div>
                                                                                                <label className="block text-sm font-medium mb-1">Data *</label>
                                                                                                <input
                                                                                                    type="date"
                                                                                                    value={bookingEditData.booking_date}
                                                                                                    onChange={e => setBookingEditData({ ...bookingEditData, booking_date: e.target.value })}
                                                                                                    className="w-full input"
                                                                                                    required
                                                                                                />
                                                                                            </div>
                                                                                            <div>
                                                                                                <label className="block text-sm font-medium mb-1">Horário *</label>
                                                                                                <input
                                                                                                    type="time"
                                                                                                    value={bookingEditData.booking_time}
                                                                                                    onChange={e => setBookingEditData({ ...bookingEditData, booking_time: e.target.value })}
                                                                                                    className="w-full input"
                                                                                                    required
                                                                                                />
                                                                                            </div>
                                                                                            {isAdminView && (
                                                                                                <>
                                                                                                    <div>
                                                                                                        <label className="block text-sm font-medium mb-1">Valor da Consulta (R$)</label>
                                                                                                        <input
                                                                                                            type="text"
                                                                                                            value={bookingEditData.valor_consulta}
                                                                                                            onChange={e => setBookingEditData(prev => ({
                                                                                                                ...prev,
                                                                                                                valor_consulta: sanitizeCurrencyInput(e.target.value)
                                                                                                            }))}
                                                                                                            className="w-full input"
                                                                                                            placeholder="150,00"
                                                                                                        />
                                                                                                        <p className="text-xs text-gray-500 mt-1">
                                                                                                            Valor histórico cobrado do paciente no momento do agendamento
                                                                                                        </p>
                                                                                                    </div>
                                                                                                    <div>
                                                                                                        <label className="block text-sm font-medium mb-1">Repasse ao Profissional (R$)</label>
                                                                                                        <input
                                                                                                            type="text"
                                                                                                            value={bookingEditData.valor_repasse_profissional}
                                                                                                            onChange={e => setBookingEditData(prev => ({
                                                                                                                ...prev,
                                                                                                                valor_repasse_profissional: sanitizeCurrencyInput(e.target.value)
                                                                                                            }))}
                                                                                                            className="w-full input"
                                                                                                            placeholder="150,00"
                                                                                                        />
                                                                                                        <p className="text-xs text-gray-500 mt-1">
                                                                                                            Utilize este campo para ajustar o valor repassado ao profissional quando necessário.
                                                                                                        </p>
                                                                                                    </div>
                                                                                                </>
                                                                                            )}
                                                                                        </div>
                                                                                        <DialogFooter>
                                                                                            <DialogClose asChild>
                                                                                                <Button
                                                                                                    variant="outline"
                                                                                                    disabled={isItemLoading('edit', editingBooking?.id)}
                                                                                                >
                                                                                                    Cancelar
                                                                                                </Button>
                                                                                            </DialogClose>
                                                                                            <LoadingButton
                                                                                                isLoading={isItemLoading('edit', editingBooking?.id)}
                                                                                                loadingText="Salvando..."
                                                                                                onClick={handleUpdateBooking}
                                                                                                className="bg-[#2d8659] hover:bg-[#236b47] text-white px-4 py-2 rounded-md"
                                                                                            >
                                                                                                Salvar Alterações
                                                                                            </LoadingButton>
                                                                                        </DialogFooter>
                                                                                    </DialogContent>
                                                                                </Dialog>
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="destructive"
                                                                                    disabled={isAnyItemLoading()}
                                                                                    onClick={() => handleDeleteBooking(b)}
                                                                                    className={`flex items-center ${isAnyItemLoading() ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                                >
                                                                                    {isItemLoading('delete', b.id) ? (
                                                                                        <LoadingSpinner size="sm" className="mr-1" />
                                                                                    ) : (
                                                                                        <Trash2 className="w-4 h-4 mr-1" />
                                                                                    )}
                                                                                    Excluir
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}

                                                        {/* Navegação de Páginas */}
                                                        {totalPages > 1 && (
                                                            <div className="flex justify-center items-center gap-2 mt-6 pt-4 border-t">
                                                                <Button
                                                                    onClick={() => setCurrentPage(currentPage - 1)}
                                                                    disabled={currentPage === 1}
                                                                    variant="outline"
                                                                    size="sm"
                                                                >
                                                                    ← Anterior
                                                                </Button>

                                                                <div className="flex gap-1">
                                                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                                                        <Button
                                                                            key={page}
                                                                            onClick={() => setCurrentPage(page)}
                                                                            variant={currentPage === page ? "default" : "outline"}
                                                                            size="sm"
                                                                            className={currentPage === page ? "bg-[#2d8659] hover:bg-[#236b47]" : ""}
                                                                        >
                                                                            {page}
                                                                        </Button>
                                                                    ))}
                                                                </div>

                                                                <Button
                                                                    onClick={() => setCurrentPage(currentPage + 1)}
                                                                    disabled={currentPage === totalPages}
                                                                    variant="outline"
                                                                    size="sm"
                                                                >
                                                                    Próxima →
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="reviews" className="mt-6">
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <h2 className="text-2xl font-bold mb-6 flex items-center"><Star className="w-6 h-6 mr-2 text-[#2d8659]" /> Avaliações</h2>
                                <div className="space-y-4">
                                    {reviews.map(review => (
                                        <div key={review.id} className="border rounded-lg p-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="flex items-center mb-1">
                                                        {[...Array(5)].map((_, i) => <Star key={i} className={`w-5 h-5 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />)}
                                                    </div>
                                                    <p className="italic">"{review.comment}"</p>
                                                    <p className="text-sm text-gray-500 mt-2">- {review.patient_name || 'Anônimo'} sobre {userRole === 'admin' ? review.professional?.name : 'seu atendimento'} em {new Date(review.created_at).toLocaleDateString()}</p>
                                                </div>
                                                {userRole === 'admin' && (
                                                    <div className="flex gap-2">
                                                        <Button size="icon" variant={review.is_approved ? "default" : "outline"} onClick={() => handleReviewApproval(review.id, !review.is_approved)}>
                                                            {review.is_approved ? <ShieldOff className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </TabsContent>


                        {/* Patients Tab - Professional View Only */}
                        {isProfessionalView && (
                            <TabsContent value="patients" className="mt-6">
                                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                            <Users className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900">Gestão de Pacientes</h2>
                                            <p className="text-sm text-gray-600">Visualize e gerencie seus pacientes</p>
                                        </div>
                                    </div>

                                    <PatientList
                                        patients={patientData.patients}
                                        onPatientClick={handlePatientClick}
                                        loading={patientData.loading}
                                    />
                                </div>

                                <PatientDetailsModal
                                    patient={selectedPatient}
                                    isOpen={isPatientModalOpen}
                                    onClose={() => {
                                        setIsPatientModalOpen(false);
                                        setSelectedPatient(null);
                                    }}
                                    onSaveNotes={handleSavePatientNotes}
                                />
                            </TabsContent>
                        )}

                        {/* Financial Dashboard Tab - Professional View Only */}
                        {isProfessionalView && (
                            <TabsContent value="financeiro" className="mt-6">
                                <FinancialDashboard professionalId={currentProfessional?.id} />
                            </TabsContent>
                        )}

                        <TabsContent value="payments" className="mt-6">
                            <ProfessionalPaymentsList
                                key={paymentRefreshKey}
                                onCreatePayment={() => {
                                    setSelectedPayment(null);
                                    setIsPaymentFormOpen(true);
                                }}
                                onViewDetails={async (payment) => {
                                    setSelectedPayment(payment);

                                    // Buscar bookings relacionados ao pagamento
                                    try {
                                        const { data: bookings, error } = await supabase
                                            .from('payment_bookings')
                                            .select(`
                                                booking_id,
                                                amount,
                                                bookings (
                                                    id,
                                                    booking_date,
                                                    booking_time,
                                                    patient_name,
                                                    valor_repasse_profissional
                                                )
                                            `)
                                            .eq('payment_id', payment.id);

                                        if (error) throw error;

                                        // Extrair bookings do relacionamento
                                        const bookingsList = (bookings || []).map(pb => pb.bookings).filter(Boolean);
                                        setPaymentBookings(bookingsList);
                                    } catch (error) {
                                        console.error('Error fetching payment bookings:', error);
                                        setPaymentBookings([]);
                                    }

                                    setIsPaymentDetailsOpen(true);
                                }}
                                onMarkAsPaid={async (payment) => {
                                    setSelectedPayment(payment);
                                    setIsPaymentFormOpen(true);
                                }}
                                onDelete={async (payment) => {
                                    try {
                                        // Deletar pagamento (cascade vai deletar payment_bookings automaticamente)
                                        const { error } = await supabase
                                            .from('professional_payments')
                                            .delete()
                                            .eq('id', payment.id);

                                        if (error) throw error;

                                        toast({
                                            title: 'Pagamento excluído',
                                            description: `Pagamento de ${payment.professional?.name} foi excluído com sucesso.`
                                        });

                                        // Forçar refresh da lista
                                        setPaymentRefreshKey(prev => prev + 1);
                                    } catch (error) {
                                        console.error('Error deleting payment:', error);
                                        toast({
                                            title: 'Erro ao excluir',
                                            description: error.message || 'Não foi possível excluir o pagamento',
                                            variant: 'destructive'
                                        });
                                    }
                                }}
                            />

                            {/* Payment Form Modal */}
                            <PaymentFormModal
                                open={isPaymentFormOpen}
                                onClose={() => {
                                    setIsPaymentFormOpen(false);
                                    setSelectedPayment(null);
                                }}
                                payment={selectedPayment}
                                professionals={professionals}
                                onSuccess={() => {
                                    setPaymentRefreshKey(prev => prev + 1);
                                    toast({
                                        title: 'Sucesso',
                                        description: selectedPayment ? 'Pagamento atualizado' : 'Pagamento criado'
                                    });
                                }}
                            />

                            {/* Payment Details Modal */}
                            <PaymentDetailsModal
                                open={isPaymentDetailsOpen}
                                onClose={() => {
                                    setIsPaymentDetailsOpen(false);
                                    setSelectedPayment(null);
                                    setPaymentBookings([]);
                                }}
                                payment={selectedPayment}
                                bookings={paymentBookings}
                            />
                        </TabsContent>

                        {/* P&L Dashboard Tab - Admin Only */}
                        {userRole === 'admin' && (
                            <TabsContent value="profit-loss" className="mt-6">
                                <ProfitLossDashboard
                                    onAddCost={() => {
                                        setSelectedCost(null);
                                        setIsCostFormOpen(true);
                                    }}
                                    onEditCost={(cost) => {
                                        setSelectedCost(cost);
                                        setIsCostFormOpen(true);
                                    }}
                                    onDeleteCost={(cost) => {
                                        setCostToDelete(cost);
                                        setCostDeleteConfirmOpen(true);
                                    }}
                                    key={costRefreshKey}
                                />

                                {/* Cost Form Modal */}
                                <CostFormModal
                                    open={isCostFormOpen}
                                    onClose={() => {
                                        setIsCostFormOpen(false);
                                        setSelectedCost(null);
                                    }}
                                    cost={selectedCost}
                                    onSuccess={() => {
                                        setCostRefreshKey(prev => prev + 1);
                                        toast({
                                            title: 'Sucesso',
                                            description: selectedCost ? 'Custo atualizado' : 'Custo adicionado'
                                        });
                                    }}
                                />

                                {/* Delete Cost Confirmation Dialog */}
                                <AlertDialog open={costDeleteConfirmOpen} onOpenChange={setCostDeleteConfirmOpen}>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                            <AlertDialogDescription className="space-y-2">
                                                <p>Tem certeza que deseja excluir este custo?</p>
                                                {costToDelete && (
                                                    <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-1 text-sm">
                                                        <p><strong>Categoria:</strong> {costToDelete.category}</p>
                                                        <p><strong>Descrição:</strong> {costToDelete.description}</p>
                                                        <p><strong>Valor:</strong> R$ {costToDelete.amount?.toFixed(2)}</p>
                                                        <p><strong>Data:</strong> {new Date(costToDelete.cost_date).toLocaleDateString('pt-BR')}</p>
                                                    </div>
                                                )}
                                                <p className="text-red-600 font-medium mt-4">
                                                    ⚠️ Esta ação não pode ser desfeita.
                                                </p>
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel onClick={() => setCostToDelete(null)}>
                                                Cancelar
                                            </AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={async () => {
                                                    if (costToDelete) {
                                                        try {
                                                            const { error } = await supabase
                                                                .from('platform_costs')
                                                                .delete()
                                                                .eq('id', costToDelete.id);

                                                            if (error) throw error;

                                                            toast({
                                                                title: 'Custo excluído',
                                                                description: `Custo "${costToDelete.description}" foi excluído com sucesso.`
                                                            });

                                                            setCostRefreshKey(prev => prev + 1);
                                                            setCostToDelete(null);
                                                        } catch (error) {
                                                            console.error('Error deleting cost:', error);
                                                            toast({
                                                                title: 'Erro ao excluir',
                                                                description: error.message || 'Não foi possível excluir o custo',
                                                                variant: 'destructive'
                                                            });
                                                        }
                                                    }
                                                }}
                                                className="bg-red-600 hover:bg-red-700"
                                            >
                                                Excluir Custo
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </TabsContent>
                        )}

                        {/* Ledger Tab - Admin Only */}
                        {userRole === 'admin' && (
                            <TabsContent value="livro-caixa" className="mt-6">
                                <LedgerStats />
                                <LedgerTable />
                            </TabsContent>
                        )}

                        {(userRole === 'admin' || userRole === 'professional') && (
                            <TabsContent value="professionals" className="mt-6">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6">
                                        <h2 className="text-2xl font-bold mb-6 flex items-center">
                                            <Users className="w-6 h-6 mr-2 text-[#2d8659]" />
                                            {userRole === 'admin' ? 'Profissionais' : 'Meu Perfil'}
                                        </h2>
                                        <div className="space-y-4">
                                            {professionals.map((prof, index) => (
                                                <div key={prof.id} className={`border rounded-lg p-6 hover:shadow-md transition-all ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                                    } hover:bg-blue-50`}>
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-3 mb-3">
                                                                {prof.image_url && (
                                                                    <img
                                                                        src={prof.image_url}
                                                                        alt={prof.name}
                                                                        className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                                                                    />
                                                                )}
                                                                <div>
                                                                    <h3 className="font-bold text-lg text-gray-900">{prof.name}</h3>
                                                                    {prof.email && (
                                                                        <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                                                                            📧 {prof.email}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                                <div>
                                                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Serviços</h4>
                                                                    {prof.services_ids && prof.services_ids.length > 0 ? (
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {prof.services_ids.map(serviceId => {
                                                                                const service = services.find(s => s.id === serviceId);
                                                                                return service ? (
                                                                                    <span key={serviceId} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                                                                        {service.name}
                                                                                    </span>
                                                                                ) : null;
                                                                            })}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-orange-500 text-sm">Nenhum serviço atribuído</span>
                                                                    )}
                                                                </div>

                                                                {prof.mini_curriculum && (
                                                                    <div>
                                                                        <h4 className="text-sm font-medium text-gray-700 mb-2">Minicurrículo</h4>
                                                                        <p className="text-sm text-gray-600 line-clamp-3">
                                                                            {prof.mini_curriculum.length > 150
                                                                                ? `${prof.mini_curriculum.substring(0, 150)}...`
                                                                                : prof.mini_curriculum
                                                                            }
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex gap-2 ml-4">
                                                            <Button size="icon" variant="ghost" onClick={() => handleEditProfessional(prof)} title="Editar profissional">
                                                                <Edit className="w-4 h-4" />
                                                            </Button>
                                                            {userRole === 'admin' && (
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    onClick={() => handleDeleteProfessional(prof.id)}
                                                                    className="hover:bg-red-50"
                                                                    title="Excluir profissional"
                                                                >
                                                                    <Trash2 className="w-4 h-4 text-red-500" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="bg-white rounded-xl shadow-lg p-6">
                                        <h2 className="text-2xl font-bold mb-6">
                                            {userRole === 'admin'
                                                ? (isEditingProfessional ? 'Editar Profissional' : 'Novo Profissional')
                                                : 'Editar Meu Perfil'
                                            }
                                        </h2>
                                        <form onSubmit={handleProfessionalSubmit} className="space-y-4 text-sm">
                                            <div>
                                                <label className="block text-xs font-medium mb-1 text-gray-600">Nome do Profissional</label>
                                                <input
                                                    name="name"
                                                    value={professionalFormData.name}
                                                    onChange={e => setProfessionalFormData({ ...professionalFormData, name: e.target.value })}
                                                    placeholder="Ex: Dr. João Silva"
                                                    className="w-full input"
                                                    required
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium mb-1 text-gray-600">Serviços que Atende</label>
                                                <div className="border rounded-lg p-3 max-h-32 overflow-y-auto bg-gray-50">
                                                    {services.length === 0 ? (
                                                        <p className="text-xs text-gray-500">Nenhum serviço cadastrado</p>
                                                    ) : (
                                                        services.map(service => (
                                                            <label key={service.id} className="flex items-center space-x-2 mb-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={professionalFormData.services_ids.includes(service.id)}
                                                                    onChange={(e) => {
                                                                        const serviceId = service.id;
                                                                        const currentServices = professionalFormData.services_ids;

                                                                        if (e.target.checked) {
                                                                            setProfessionalFormData({
                                                                                ...professionalFormData,
                                                                                services_ids: [...currentServices, serviceId]
                                                                            });
                                                                        } else {
                                                                            setProfessionalFormData({
                                                                                ...professionalFormData,
                                                                                services_ids: currentServices.filter(id => id !== serviceId)
                                                                            });
                                                                        }
                                                                    }}
                                                                    className="rounded"
                                                                />
                                                                <span className="text-sm">{service.name}</span>
                                                                <span className="text-xs text-gray-500">R$ {parseFloat(service.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                            </label>
                                                        ))
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">Selecione um ou mais serviços que este profissional pode atender</p>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium mb-1 text-gray-600">Email</label>
                                                <input
                                                    name="email"
                                                    value={professionalFormData.email}
                                                    onChange={e => setProfessionalFormData({ ...professionalFormData, email: e.target.value })}
                                                    type="email"
                                                    placeholder="joao@clinica.com"
                                                    className="w-full input"
                                                    disabled={userRole === 'admin' && isEditingProfessional}
                                                    required
                                                />
                                            </div>

                                            {(userRole === 'admin' || !isEditingProfessional) && (
                                                <div>
                                                    <label className="block text-xs font-medium mb-1 text-gray-600">Senha</label>
                                                    <input
                                                        name="password"
                                                        value={professionalFormData.password}
                                                        onChange={e => setProfessionalFormData({ ...professionalFormData, password: e.target.value })}
                                                        type="password"
                                                        placeholder={isEditingProfessional ? 'Defina uma nova senha (opcional)' : '******'}
                                                        className="w-full input"
                                                        required={!isEditingProfessional}
                                                    />
                                                    {isEditingProfessional && userRole === 'admin' && (
                                                        <p className="text-xs text-gray-500 mt-1">{`Deixe em branco para manter a senha atual (mínimo ${MIN_PROFESSIONAL_PASSWORD_LENGTH} caracteres).`}</p>
                                                    )}
                                                </div>
                                            )}

                                            <div>
                                                <label className="block text-xs font-medium mb-1 text-gray-600">Foto do Profissional</label>

                                                {/* Upload de arquivo local */}
                                                <div className="mb-3">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={async (e) => {
                                                            const file = e.target.files[0];
                                                            if (file) {
                                                                // Verificar tamanho do arquivo (máximo 5MB)
                                                                if (file.size > 5 * 1024 * 1024) {
                                                                    toast({
                                                                        variant: 'destructive',
                                                                        title: 'Arquivo muito grande',
                                                                        description: 'Por favor, selecione uma imagem menor que 5MB'
                                                                    });
                                                                    return;
                                                                }

                                                                try {
                                                                    toast({ title: 'Fazendo upload...', description: 'Processando e enviando imagem...' });

                                                                    // Gerar nome único para o arquivo
                                                                    const fileExt = file.name.split('.').pop();
                                                                    const fileName = `professional_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
                                                                    const filePath = `professionals/${fileName}`;

                                                                    // Processar e comprimir imagem antes do upload
                                                                    const canvas = document.createElement('canvas');
                                                                    const ctx = canvas.getContext('2d');
                                                                    const img = new Image();

                                                                    img.onload = async () => {
                                                                        // Redimensionar para alta qualidade (800px max)
                                                                        const maxSize = 800;
                                                                        let { width, height } = img;

                                                                        if (width > height) {
                                                                            if (width > maxSize) {
                                                                                height = (height * maxSize) / width;
                                                                                width = maxSize;
                                                                            }
                                                                        } else {
                                                                            if (height > maxSize) {
                                                                                width = (width * maxSize) / height;
                                                                                height = maxSize;
                                                                            }
                                                                        }

                                                                        canvas.width = width;
                                                                        canvas.height = height;

                                                                        ctx.imageSmoothingEnabled = true;
                                                                        ctx.imageSmoothingQuality = 'high';
                                                                        ctx.drawImage(img, 0, 0, width, height);

                                                                        // Converter para blob com boa qualidade
                                                                        canvas.toBlob(async (blob) => {
                                                                            if (!blob) {
                                                                                toast({ variant: 'destructive', title: 'Erro ao processar imagem' });
                                                                                return;
                                                                            }

                                                                            // Remover imagem anterior se existir
                                                                            if (professionalFormData.image_url && professionalFormData.image_url.includes('supabase')) {
                                                                                const oldPath = professionalFormData.image_url.split('/').slice(-2).join('/');
                                                                                await supabase.storage.from('professional-photos').remove([oldPath]);
                                                                            }

                                                                            // Upload para Supabase Storage
                                                                            const { data, error } = await supabase.storage
                                                                                .from('professional-photos')
                                                                                .upload(filePath, blob, {
                                                                                    cacheControl: '3600',
                                                                                    upsert: false
                                                                                });

                                                                            if (error) {
                                                                                secureLog.error('Erro no upload da foto do profissional:', error?.message || error);
                                                                                secureLog.debug('Detalhes do erro no upload da foto do profissional', error);
                                                                                toast({
                                                                                    variant: 'destructive',
                                                                                    title: 'Erro no upload',
                                                                                    description: 'Não foi possível fazer upload da imagem: ' + error.message
                                                                                });
                                                                                return;
                                                                            }

                                                                            // Obter URL pública
                                                                            const { data: urlData } = supabase.storage
                                                                                .from('professional-photos')
                                                                                .getPublicUrl(filePath);

                                                                            if (urlData?.publicUrl) {
                                                                                setProfessionalFormData({
                                                                                    ...professionalFormData,
                                                                                    image_url: urlData.publicUrl
                                                                                });

                                                                                toast({
                                                                                    title: 'Upload concluído!',
                                                                                    description: `Imagem de alta qualidade salva (${Math.round(width)}x${Math.round(height)}px)`
                                                                                });
                                                                            } else {
                                                                                toast({
                                                                                    variant: 'destructive',
                                                                                    title: 'Erro ao obter URL',
                                                                                    description: 'Upload realizado mas não foi possível obter a URL'
                                                                                });
                                                                            }
                                                                        }, 'image/jpeg', 0.85);
                                                                    };

                                                                    img.onerror = () => {
                                                                        toast({
                                                                            variant: 'destructive',
                                                                            title: 'Erro ao processar imagem',
                                                                            description: 'Não foi possível carregar o arquivo selecionado'
                                                                        });
                                                                    };

                                                                    img.src = URL.createObjectURL(file);

                                                                } catch (error) {
                                                                    secureLog.error('Erro no upload da foto do profissional:', error?.message || error);
                                                                    secureLog.debug('Detalhes do erro no upload da foto do profissional', error);
                                                                    toast({
                                                                        variant: 'destructive',
                                                                        title: 'Erro no upload',
                                                                        description: 'Não foi possível processar a imagem: ' + error.message
                                                                    });
                                                                }
                                                            }
                                                        }}
                                                        className="w-full p-2 border border-gray-300 rounded-lg text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#2d8659] file:text-white hover:file:bg-[#236b47] file:cursor-pointer"
                                                    />
                                                    <p className="text-xs text-gray-500 mt-1">Upload seguro para Supabase Storage com alta qualidade (até 5MB)</p>
                                                </div>

                                                {/* Campo de URL alternativo */}
                                                <div className="mb-3">
                                                    <input
                                                        name="image_url"
                                                        value={professionalFormData.image_url && professionalFormData.image_url.startsWith('data:') ? '' : professionalFormData.image_url}
                                                        onChange={e => setProfessionalFormData({ ...professionalFormData, image_url: e.target.value })}
                                                        type="url"
                                                        placeholder="Ou cole o link direto: https://exemplo.com/foto.jpg"
                                                        className="w-full input text-sm"
                                                    />
                                                    <p className="text-xs text-gray-500 mt-1">Alternativa: cole um link direto para a imagem</p>
                                                </div>

                                                {/* Preview da imagem */}
                                                {professionalFormData.image_url && (
                                                    <div className="flex items-center gap-3 mt-3">
                                                        <img
                                                            src={professionalFormData.image_url}
                                                            alt="Preview"
                                                            className="w-20 h-20 rounded-full object-cover border-2 border-gray-200 shadow-sm"
                                                            onError={(e) => {
                                                                e.target.style.display = 'none';
                                                            }}
                                                        />
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-700">Preview da foto</p>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => setProfessionalFormData({ ...professionalFormData, image_url: '' })}
                                                                className="mt-1 text-xs"
                                                            >
                                                                Remover foto
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium mb-1 text-gray-600">Mini-currículo</label>
                                                <textarea
                                                    name="mini_curriculum"
                                                    value={professionalFormData.mini_curriculum}
                                                    onChange={e => setProfessionalFormData({ ...professionalFormData, mini_curriculum: e.target.value })}
                                                    placeholder="Formação, experiências, especializações..."
                                                    className="w-full input"
                                                    rows="5"
                                                ></textarea>
                                            </div>

                                            <div className="flex gap-2">
                                                <Button type="submit" className="w-full bg-[#2d8659] hover:bg-[#236b47]" disabled={isSavingProfessionalProfile}>
                                                    {isSavingProfessionalProfile && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                    {userRole === 'admin'
                                                        ? (isEditingProfessional ? 'Salvar' : 'Criar')
                                                        : 'Salvar Alterações'
                                                    }
                                                </Button>
                                                {userRole === 'admin' && isEditingProfessional && (
                                                    <Button type="button" variant="outline" onClick={resetProfessionalForm}>
                                                        Cancelar
                                                    </Button>
                                                )}
                                            </div>
                                        </form>
                                    </div>
                                </div>

                                {userRole !== 'admin' && (
                                    <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
                                        <h3 className="text-xl font-semibold mb-2">Alterar senha de acesso</h3>
                                        <p className="text-sm text-gray-600 mb-4">
                                            Defina uma nova senha segura para acessar o painel profissional.
                                        </p>
                                        <form onSubmit={handleProfessionalPasswordChange} className="space-y-4 text-sm max-w-xl">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium mb-1 text-gray-600">Nova senha</label>
                                                    <input
                                                        type="password"
                                                        value={passwordFormData.newPassword}
                                                        onChange={(e) => setPasswordFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                                                        placeholder="Mínimo de 6 caracteres"
                                                        className="w-full input"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium mb-1 text-gray-600">Confirmar nova senha</label>
                                                    <input
                                                        type="password"
                                                        value={passwordFormData.confirmPassword}
                                                        onChange={(e) => setPasswordFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                                        placeholder="Repita a nova senha"
                                                        className="w-full input"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <Button type="submit" className="bg-[#2d8659] hover:bg-[#236b47]" disabled={isSavingPassword}>
                                                {isSavingPassword && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                Atualizar senha
                                            </Button>
                                        </form>
                                    </div>
                                )}
                            </TabsContent>
                        )}

                        <TabsContent value="availability" className="mt-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-white rounded-xl shadow-lg p-6">
                                    <h2 className="text-2xl font-bold mb-6 flex items-center"><Clock className="w-6 h-6 mr-2 text-[#2d8659]" /> Horários Semanais</h2>
                                    {userRole === 'admin' && (
                                        <select value={selectedAvailProfessional} onChange={(e) => setSelectedAvailProfessional(e.target.value)} className="w-full input mb-6">
                                            {professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    )}

                                    {/* Seletores de Mês e Ano */}
                                    <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                        <h4 className="font-semibold text-sm mb-3 text-blue-800 flex items-center">
                                            📅 Período
                                        </h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium mb-1 text-gray-600">Mês</label>
                                                <select
                                                    value={selectedMonth}
                                                    onChange={(e) => {
                                                        setSelectedMonth(parseInt(e.target.value));
                                                    }}
                                                    className="w-full input text-sm"
                                                >
                                                    <option value={1}>Janeiro</option>
                                                    <option value={2}>Fevereiro</option>
                                                    <option value={3}>Março</option>
                                                    <option value={4}>Abril</option>
                                                    <option value={5}>Maio</option>
                                                    <option value={6}>Junho</option>
                                                    <option value={7}>Julho</option>
                                                    <option value={8}>Agosto</option>
                                                    <option value={9}>Setembro</option>
                                                    <option value={10}>Outubro</option>
                                                    <option value={11}>Novembro</option>
                                                    <option value={12}>Dezembro</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1 text-gray-600">Ano</label>
                                                <select
                                                    value={selectedYear}
                                                    onChange={(e) => {
                                                        setSelectedYear(parseInt(e.target.value));
                                                    }}
                                                    className="w-full input text-sm"
                                                >
                                                    {Array.from({ length: 3 }, (_, i) => {
                                                        const year = new Date().getFullYear() + i;
                                                        return <option key={year} value={year}>{year}</option>
                                                    })}
                                                </select>
                                            </div>
                                        </div>
                                        <p className="text-xs text-blue-600 mt-2">
                                            Gerenciando: {['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][selectedMonth]} de {selectedYear}
                                        </p>
                                    </div>

                                    {/* Seção de Horários Comuns no topo */}
                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                                        <h4 className="font-medium text-sm mb-3 text-blue-800 flex items-center">
                                            <Clock className="w-4 h-4 mr-2" />
                                            Horários Comuns (clique para adicionar ao dia selecionado)
                                        </h4>

                                        {/* Seletor do dia para adicionar horários */}
                                        <div className="mb-3">
                                            <label className="block text-xs font-medium mb-2 text-blue-700">Adicionar horários em:</label>
                                            <select
                                                value={focusedDay}
                                                onChange={(e) => setFocusedDay(e.target.value)}
                                                className="input text-sm w-full max-w-xs"
                                            >
                                                <option value="monday">Segunda-feira</option>
                                                <option value="tuesday">Terça-feira</option>
                                                <option value="wednesday">Quarta-feira</option>
                                                <option value="thursday">Quinta-feira</option>
                                                <option value="friday">Sexta-feira</option>
                                                <option value="saturday">Sábado</option>
                                                <option value="sunday">Domingo</option>
                                            </select>
                                        </div>

                                        {/* Botões de horários comuns */}
                                        <div className="flex flex-wrap gap-2">
                                            {['06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'].map(time => {
                                                const currentTimes = professionalAvailability[focusedDay] || [];
                                                const isAlreadyAdded = currentTimes.includes(time);

                                                return (
                                                    <button
                                                        key={time}
                                                        type="button"
                                                        onClick={() => {
                                                            if (!isAlreadyAdded) {
                                                                const newTimes = [...currentTimes, time].sort();
                                                                setProfessionalAvailability({
                                                                    ...professionalAvailability,
                                                                    [focusedDay]: newTimes
                                                                });
                                                            }
                                                        }}
                                                        disabled={isAlreadyAdded}
                                                        className={`px-3 py-1 text-xs border rounded transition-colors ${isAlreadyAdded
                                                            ? 'bg-green-100 text-green-700 border-green-300 cursor-not-allowed'
                                                            : 'hover:bg-blue-100 border-blue-300 text-blue-700'
                                                            }`}
                                                        title={isAlreadyAdded ? 'Horário já adicionado' : `Adicionar ${time} na ${focusedDay === 'monday' ? 'Segunda' : focusedDay === 'tuesday' ? 'Terça' : focusedDay === 'wednesday' ? 'Quarta' : focusedDay === 'thursday' ? 'Quinta' : focusedDay === 'friday' ? 'Sexta' : focusedDay === 'saturday' ? 'Sábado' : 'Domingo'}`}
                                                    >
                                                        {time} {isAlreadyAdded && '✓'}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <p className="text-xs text-blue-600 mt-2">
                                            💡 Dica: Selecione o dia da semana acima e clique nos horários para adicioná-los rapidamente.
                                        </p>
                                    </div>
                                    <div className="space-y-4">
                                        {Object.keys(professionalAvailability).map(day => {
                                            const dayName = day
                                                .replace('monday', 'Segunda-feira')
                                                .replace('tuesday', 'Terça-feira')
                                                .replace('wednesday', 'Quarta-feira')
                                                .replace('thursday', 'Quinta-feira')
                                                .replace('friday', 'Sexta-feira')
                                                .replace('saturday', 'Sábado')
                                                .replace('sunday', 'Domingo');

                                            const currentTimes = professionalAvailability[day] || [];

                                            return (
                                                <div key={day} className={`border rounded-lg p-3 transition-colors ${focusedDay === day ? 'border-blue-500 bg-blue-50' : ''
                                                    }`}>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <h3 className={`font-bold text-sm ${focusedDay === day ? 'text-blue-800' : ''
                                                            }`}>
                                                            {dayName} {focusedDay === day && '⭐'}
                                                        </h3>
                                                        <span className="text-xs text-gray-500">
                                                            {currentTimes.length > 0 ? `${currentTimes.length} horário(s)` : 'Sem horários'}
                                                        </span>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={currentTimes.join(', ') || ''}
                                                        onFocus={() => setFocusedDay(day)}
                                                        onChange={(e) => {
                                                            const inputValue = e.target.value;
                                                            const times = inputValue.split(',').map(t => t.trim()).filter(t => t);

                                                            // Validar formato de horário (HH:MM) em tempo real
                                                            const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
                                                            const processedTimes = times.map(time => {
                                                                if (time && !timeRegex.test(time)) {
                                                                    // Tentar formatar automaticamente
                                                                    const numericOnly = time.replace(/[^0-9]/g, '');
                                                                    if (numericOnly.length === 3) {
                                                                        return numericOnly.charAt(0) + ':' + numericOnly.slice(1, 3);
                                                                    } else if (numericOnly.length === 4) {
                                                                        return numericOnly.slice(0, 2) + ':' + numericOnly.slice(2, 4);
                                                                    }
                                                                }
                                                                return time;
                                                            });

                                                            // Remover duplicatas e ordenar
                                                            const uniqueTimes = [...new Set(processedTimes)]
                                                                .filter(time => time)
                                                                .sort();

                                                            setProfessionalAvailability({
                                                                ...professionalAvailability,
                                                                [day]: uniqueTimes
                                                            });
                                                        }}
                                                        placeholder="Ex: 09:00, 10:00, 14:00, 15:30"
                                                        className={`w-full input text-sm transition-colors ${focusedDay === day ? 'ring-2 ring-blue-500 border-blue-500' : ''
                                                            }`}
                                                        title="Digite os horários separados por vírgula no formato HH:MM"
                                                    />
                                                    {currentTimes.length > 0 && (
                                                        <div className="mt-2 flex flex-wrap gap-1">
                                                            {currentTimes.map((time, index) => (
                                                                <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                                                    {time}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const newTimes = currentTimes.filter((_, i) => i !== index);
                                                                            setProfessionalAvailability({
                                                                                ...professionalAvailability,
                                                                                [day]: newTimes
                                                                            });
                                                                        }}
                                                                        className="ml-1 text-green-600 hover:text-green-800"
                                                                    >
                                                                        ×
                                                                    </button>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <LoadingButton
                                        isLoading={isLoading('saveAvailability')}
                                        loadingText="Salvando..."
                                        onClick={handleSaveAvailability}
                                        className="mt-6 w-full bg-[#2d8659] hover:bg-[#236b47] text-white py-2 rounded-md"
                                    >
                                        Salvar Horários
                                    </LoadingButton>
                                </div>
                                <div className="bg-white rounded-xl shadow-lg p-6">
                                    <h2 className="text-2xl font-bold mb-6 flex items-center"><CalendarX className="w-6 h-6 mr-2 text-[#2d8659]" /> Datas e Horários Bloqueados</h2>
                                    <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2">
                                        {professionalBlockedDates.map(d => (
                                            <div key={d.id} className="border rounded-lg p-3 flex justify-between items-center text-sm">
                                                <div>
                                                    <p className="font-semibold">{new Date(d.blocked_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} {d.start_time && d.end_time ? `das ${d.start_time} às ${d.end_time}` : '(Dia todo)'}</p>
                                                    <p className="text-gray-500">{d.reason}</p>
                                                </div>
                                                <Button size="icon" variant="ghost" onClick={() => handleDeleteBlockedDate(d.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="space-y-3 border-t pt-6">
                                        <h3 className="font-bold">Adicionar Bloqueio</h3>
                                        <input type="date" value={newBlockedDate.date} onChange={e => setNewBlockedDate({ ...newBlockedDate, date: e.target.value })} className="w-full input" />
                                        <div className="grid grid-cols-2 gap-2">
                                            <input type="time" value={newBlockedDate.start_time} onChange={e => setNewBlockedDate({ ...newBlockedDate, start_time: e.target.value })} className="w-full input" />
                                            <input type="time" value={newBlockedDate.end_time} onChange={e => setNewBlockedDate({ ...newBlockedDate, end_time: e.target.value })} className="w-full input" />
                                        </div>
                                        <input type="text" value={newBlockedDate.reason} onChange={e => setNewBlockedDate({ ...newBlockedDate, reason: e.target.value })} placeholder="Motivo (ex: Feriado)" className="w-full input" />
                                        <Button onClick={handleAddBlockedDate} className="w-full bg-[#2d8659] hover:bg-[#236b47]">Bloquear Período</Button>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        {userRole === 'admin' && (
                            <TabsContent value="services" className="mt-6">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6">
                                        <h2 className="text-2xl font-bold mb-6 flex items-center"><Briefcase className="w-6 h-6 mr-2 text-[#2d8659]" /> Serviços</h2>
                                        <div className="space-y-4">
                                            {services.map((service, index) => {
                                                // Contar quantos profissionais têm este serviço
                                                const professionalsCount = professionals.filter(prof =>
                                                    prof.services_ids && prof.services_ids.includes(service.id)
                                                ).length;

                                                return (
                                                    <div key={service.id} className={`border rounded-lg p-5 hover:shadow-md transition-all ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                                        } hover:bg-blue-50`}>
                                                        <div className="flex justify-between items-start">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-3 mb-2">
                                                                    <h3 className="font-bold text-lg text-gray-900">{service.name}</h3>
                                                                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                                                        {professionalsCount} {professionalsCount === 1 ? 'profissional' : 'profissionais'}
                                                                    </span>
                                                                </div>
                                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                                                    <div>
                                                                        <span className="text-gray-500 block">Valor cobrado (paciente)</span>
                                                                        <span className="font-bold text-green-600">
                                                                            R$ {parseFloat(service.price).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                        </span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-gray-500 block">Repasse ao profissional</span>
                                                                        <span className="font-semibold text-blue-600">
                                                                            R$ {parseFloat(service.professional_payout ?? service.price).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                        </span>
                                                                        <span className="text-xs text-gray-500 block mt-1">
                                                                            {(() => {
                                                                                const patientAmount = parseCurrencyToNumber(service.price) ?? 0;
                                                                                const payoutAmount = parseCurrencyToNumber(
                                                                                    service.professional_payout === undefined || service.professional_payout === null
                                                                                        ? service.price
                                                                                        : service.professional_payout
                                                                                ) ?? 0;
                                                                                const fee = Math.max(patientAmount - payoutAmount, 0);
                                                                                return `Taxa plataforma: R$ ${fee.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                                                            })()}
                                                                        </span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-gray-500 block">Duração</span>
                                                                        <span className="font-medium">
                                                                            {service.duration_minutes >= 60
                                                                                ? `${Math.floor(service.duration_minutes / 60)}h${service.duration_minutes % 60 > 0 ? ` ${service.duration_minutes % 60}min` : ''}`
                                                                                : `${service.duration_minutes}min`
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                {professionalsCount > 0 && (
                                                                    <div className="mt-3">
                                                                        <span className="text-xs text-gray-500 block mb-1">Profissionais que atendem:</span>
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {professionals
                                                                                .filter(prof => prof.services_ids && prof.services_ids.includes(service.id))
                                                                                .map(prof => (
                                                                                    <span key={prof.id} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                                                                        {prof.name}
                                                                                    </span>
                                                                                ))
                                                                            }
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex gap-2 ml-4">
                                                                <Button size="icon" variant="ghost" onClick={() => handleEditService(service)} title="Editar serviço">
                                                                    <Edit className="w-4 h-4" />
                                                                </Button>
                                                                <Button size="icon" variant="ghost" onClick={() => handleDeleteService(service.id)} className="hover:bg-red-50" title="Excluir serviço">
                                                                    <Trash2 className="w-4 h-4 text-red-500" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div className="bg-white rounded-xl shadow-lg p-6">
                                        <h2 className="text-2xl font-bold mb-6">{isEditingService ? 'Editar Serviço' : 'Novo Serviço'}</h2>
                                        <form onSubmit={handleServiceSubmit} className="space-y-4 text-sm">
                                            <div>
                                                <label className="block text-xs font-medium mb-1 text-gray-600">Nome do Serviço</label>
                                                <input
                                                    name="name"
                                                    value={serviceFormData.name}
                                                    onChange={e => setServiceFormData({ ...serviceFormData, name: e.target.value })}
                                                    placeholder="Ex: Consulta Psicológica, Terapia de Casal"
                                                    className="w-full input"
                                                    required
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium mb-1 text-gray-600">Valor cobrado do paciente (R$)</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">R$</span>
                                                    <input
                                                        name="price"
                                                        value={serviceFormData.price}
                                                        onChange={e => {
                                                            const value = sanitizeCurrencyInput(e.target.value);
                                                            setServiceFormData(prev => ({ ...prev, price: value }));
                                                        }}
                                                        type="text"
                                                        placeholder="150,00"
                                                        className="w-full input pl-8"
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium mb-1 text-gray-600">Repasse ao profissional (R$)</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">R$</span>
                                                    <input
                                                        name="professional_payout"
                                                        value={serviceFormData.professional_payout}
                                                        onChange={e => {
                                                            const value = sanitizeCurrencyInput(e.target.value);
                                                            setServiceFormData(prev => ({ ...prev, professional_payout: value }));
                                                        }}
                                                        type="text"
                                                        placeholder="150,00"
                                                        className="w-full input pl-8"
                                                    />
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Caso deixe em branco, será usado o mesmo valor cobrado do paciente.
                                                </p>
                                            </div>

                                            <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-xs text-gray-600">
                                                <p className="flex justify-between">
                                                    <span>Paciente paga</span>
                                                    <span className="font-semibold text-gray-900">R$ {servicePricingPreview.patientValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </p>
                                                <p className="flex justify-between mt-1">
                                                    <span>Profissional recebe</span>
                                                    <span className="font-semibold text-blue-700">R$ {servicePricingPreview.professionalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </p>
                                                <p className="flex justify-between mt-1">
                                                    <span>Taxa estimada da plataforma</span>
                                                    <span className="font-semibold text-emerald-700">R$ {servicePricingPreview.platformFee.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </p>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium mb-1 text-gray-600">Duração</label>
                                                <div className="relative">
                                                    <input
                                                        name="duration_minutes"
                                                        value={serviceFormData.duration_minutes}
                                                        onChange={e => {
                                                            const value = e.target.value.replace(/[^0-9]/g, '');
                                                            setServiceFormData(prev => ({ ...prev, duration_minutes: value }));
                                                        }}
                                                        type="text"
                                                        placeholder="50"
                                                        className="w-full input pr-12"
                                                        required
                                                    />
                                                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">min</span>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">Duração em minutos (ex: 50 para 50min, 90 para 1h30min)</p>
                                            </div>

                                            <div className="flex gap-2">
                                                <Button type="submit" className="w-full bg-[#2d8659] hover:bg-[#236b47]">
                                                    {isEditingService ? 'Salvar' : 'Criar'}
                                                </Button>
                                                {isEditingService && (
                                                    <Button type="button" variant="outline" onClick={resetServiceForm}>
                                                        Cancelar
                                                    </Button>
                                                )}
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </TabsContent>
                        )}

                        {userRole === 'admin' && (
                            <TabsContent value="events" className="mt-6">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6">
                                        <h2 className="text-2xl font-bold mb-6 flex items-center"><Calendar className="w-6 h-6 mr-2 text-[#2d8659]" /> Eventos</h2>
                                        {events.map((event, index) => {
                                            const dataInicio = new Date(event.data_inicio);
                                            const dataFim = new Date(event.data_fim);
                                            const dataExpiracao = new Date(event.data_limite_inscricao);
                                            const isExpired = dataExpiracao < new Date();
                                            const inscricoes = event.inscricoes_eventos?.[0]?.count || 0;

                                            return (
                                                <div key={event.id} className={`border rounded-lg p-6 mb-4 hover:shadow-md transition-all ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                                    } hover:bg-blue-50`}>
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-3 mb-3">
                                                                <h3 className="font-bold text-lg text-gray-900">{event.titulo}</h3>
                                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${isExpired ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                                                    }`}>
                                                                    {isExpired ? 'Expirado' : 'Aberto'}
                                                                </span>
                                                                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                                                    {event.tipo_evento}
                                                                </span>

                                                                {/* Novo badge: Status Ativo/Inativo */}
                                                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${event.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                                                                    }`}>
                                                                    {event.ativo ? '✅ Ativo' : '⏸️ Inativo'}
                                                                </span>

                                                                {/* Novo badge: Status de Exibição */}
                                                                {event.data_inicio_exibicao && event.data_fim_exibicao && (
                                                                    (() => {
                                                                        const agora = new Date();
                                                                        const inicioExibicao = new Date(event.data_inicio_exibicao);
                                                                        const fimExibicao = new Date(event.data_fim_exibicao);

                                                                        let statusExibicao = '';
                                                                        let corExibicao = '';

                                                                        if (agora < inicioExibicao) {
                                                                            statusExibicao = '🕒 Aguardando';
                                                                            corExibicao = 'bg-yellow-100 text-yellow-800';
                                                                        } else if (agora >= inicioExibicao && agora <= fimExibicao) {
                                                                            statusExibicao = '👁️ Exibindo';
                                                                            corExibicao = 'bg-purple-100 text-purple-800';
                                                                        } else {
                                                                            statusExibicao = '🚫 Oculto';
                                                                            corExibicao = 'bg-gray-100 text-gray-600';
                                                                        }

                                                                        return (
                                                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${corExibicao}`}>
                                                                                {statusExibicao}
                                                                            </span>
                                                                        );
                                                                    })()
                                                                )}
                                                            </div>

                                                            {event.descricao && (
                                                                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                                                    {event.descricao.length > 120
                                                                        ? `${event.descricao.substring(0, 120)}...`
                                                                        : event.descricao
                                                                    }
                                                                </p>
                                                            )}

                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                                                                <div>
                                                                    <span className="text-gray-500 block">Início</span>
                                                                    <span className="font-medium">
                                                                        {dataInicio.toLocaleDateString('pt-BR')} às {dataInicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-500 block">Fim</span>
                                                                    <span className="font-medium">
                                                                        {dataFim.toLocaleDateString('pt-BR')} às {dataFim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-500 block">Inscrições até</span>
                                                                    <span className={`font-medium ${isExpired ? 'text-red-600' : 'text-green-600'}`}>
                                                                        {dataExpiracao.toLocaleDateString('pt-BR')} às {dataExpiracao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                </div>

                                                                {/* Novas informações de exibição */}
                                                                {event.data_inicio_exibicao && (
                                                                    <div>
                                                                        <span className="text-gray-500 block">Exibe de</span>
                                                                        <span className="font-medium text-blue-600">
                                                                            {new Date(event.data_inicio_exibicao).toLocaleDateString('pt-BR')} às {new Date(event.data_inicio_exibicao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                {event.data_fim_exibicao && (
                                                                    <div>
                                                                        <span className="text-gray-500 block">Exibe até</span>
                                                                        <span className="font-medium text-blue-600">
                                                                            {new Date(event.data_fim_exibicao).toLocaleDateString('pt-BR')} às {new Date(event.data_fim_exibicao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                                                                <div className="flex items-center gap-4">
                                                                    <span className="flex items-center text-sm text-gray-600">
                                                                        <Users className="w-4 h-4 mr-1" />
                                                                        {inscricoes} / {event.limite_participantes} inscritos
                                                                    </span>
                                                                    {event.link_slug && (
                                                                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                                                            Link: {event.link_slug}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2 ml-4">
                                                            <Button size="icon" variant="ghost" onClick={() => handleEditEvent(event)} title="Editar evento">
                                                                <Edit className="w-4 h-4" />
                                                            </Button>
                                                            <Button size="icon" variant="ghost" onClick={() => handleDeleteEvent(event.id)} className="hover:bg-red-50" title="Excluir evento">
                                                                <Trash2 className="w-4 h-4 text-red-500" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="bg-white rounded-xl shadow-lg p-6">
                                        <h2 className="text-2xl font-bold mb-6">{isEditingEvent ? 'Editar Evento' : 'Novo Evento'}</h2>
                                        <form onSubmit={handleEventSubmit} className="space-y-6 text-sm">
                                            <section className="rounded-2xl border border-gray-100 bg-gray-50/60 p-5 space-y-4">
                                                <div>
                                                    <h3 className="text-base font-semibold text-gray-800">Informações principais</h3>
                                                    <p className="text-xs text-gray-500">Título, descrição e quem conduz o evento.</p>
                                                </div>
                                                <div className="space-y-3">
                                                    <input
                                                        name="titulo"
                                                        value={eventFormData.titulo || ''}
                                                        onChange={e => {
                                                            const value = e.target.value;
                                                            setEventFormData(prev => {
                                                                const next = { ...prev, titulo: value };
                                                                if (!slugManuallyEdited) {
                                                                    next.link_slug = slugifyTitle(value);
                                                                }
                                                                return next;
                                                            });
                                                            clearEventError('titulo');
                                                        }}
                                                        placeholder="Título do Evento"
                                                        className={`w-full input ${eventFormErrors.titulo ? 'border-red-500 focus:ring-red-300' : ''}`}
                                                        aria-invalid={eventFormErrors.titulo ? 'true' : 'false'}
                                                        required
                                                    />
                                                    {eventFormErrors.titulo && (
                                                        <p className="text-xs text-red-500">{eventFormErrors.titulo}</p>
                                                    )}
                                                    <textarea
                                                        name="descricao"
                                                        value={eventFormData.descricao || ''}
                                                        onChange={e => setEventFormData(prev => ({ ...prev, descricao: e.target.value }))}
                                                        placeholder="Descrição do conteúdo, público e diferenciais"
                                                        className="w-full input"
                                                        rows="3"
                                                    />
                                                    <div className="grid gap-3 md:grid-cols-2">
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-600 mb-1">Formato</label>
                                                            <select
                                                                name="tipo_evento"
                                                                value={eventFormData.tipo_evento || 'Workshop'}
                                                                onChange={e => setEventFormData(prev => ({ ...prev, tipo_evento: e.target.value }))}
                                                                className="w-full input"
                                                            >
                                                                <option value="Workshop">Workshop</option>
                                                                <option value="Palestra">Palestra</option>
                                                                <option value="Masterclass">Masterclass</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-600 mb-1">Profissional responsável</label>
                                                            <select
                                                                name="professional_id"
                                                                value={eventFormData.professional_id || ''}
                                                                onChange={e => {
                                                                    setEventFormData(prev => ({ ...prev, professional_id: e.target.value }));
                                                                    clearEventError('professional_id');
                                                                }}
                                                                className={`w-full input ${eventFormErrors.professional_id ? 'border-red-500 focus:ring-red-300' : ''}`}
                                                                aria-invalid={eventFormErrors.professional_id ? 'true' : 'false'}
                                                                required
                                                            >
                                                                <option value="">Selecione o profissional</option>
                                                                {professionals.map(p => (
                                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                                ))}
                                                            </select>
                                                            {eventFormErrors.professional_id && (
                                                                <p className="text-xs text-red-500 mt-1">{eventFormErrors.professional_id}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </section>

                                            <section className="rounded-2xl border border-gray-100 p-5 space-y-5">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <h3 className="text-base font-semibold text-gray-800">Agenda e inscrições</h3>
                                                        <p className="text-xs text-gray-500">Defina datas, limite de vagas e valor do evento.</p>
                                                    </div>
                                                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                                                        <input
                                                            type="checkbox"
                                                            className="h-4 w-4 text-[#2d8659]"
                                                            checked={isFreeEvent}
                                                            onChange={(e) => {
                                                                setIsFreeEvent(e.target.checked);
                                                                setEventFormData(prev => ({ ...prev, valor: e.target.checked ? 0 : '' }));
                                                                clearEventError('valor');
                                                            }}
                                                        />
                                                        Evento gratuito
                                                    </label>
                                                </div>
                                                <div className="grid gap-4 md:grid-cols-2">
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-600 mb-1">Data/Hora Início</label>
                                                        <input
                                                            type="datetime-local"
                                                            name="data_inicio"
                                                            value={eventFormData.data_inicio || ''}
                                                            onChange={e => {
                                                                setEventFormData(prev => ({ ...prev, data_inicio: e.target.value }));
                                                                clearEventError('data_inicio');
                                                                clearEventError('data_fim');
                                                            }}
                                                            className={`w-full input ${eventFormErrors.data_inicio ? 'border-red-500 focus:ring-red-300' : ''}`}
                                                            aria-invalid={eventFormErrors.data_inicio ? 'true' : 'false'}
                                                            required
                                                        />
                                                        {eventFormErrors.data_inicio && (
                                                            <p className="text-xs text-red-500 mt-1">{eventFormErrors.data_inicio}</p>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-600 mb-1">Data/Hora Fim</label>
                                                        <input
                                                            type="datetime-local"
                                                            name="data_fim"
                                                            value={eventFormData.data_fim || ''}
                                                            onChange={e => {
                                                                setEventFormData(prev => ({ ...prev, data_fim: e.target.value }));
                                                                clearEventError('data_fim');
                                                            }}
                                                            className={`w-full input ${eventFormErrors.data_fim ? 'border-red-500 focus:ring-red-300' : ''}`}
                                                            aria-invalid={eventFormErrors.data_fim ? 'true' : 'false'}
                                                            required
                                                        />
                                                        {eventFormErrors.data_fim && (
                                                            <p className="text-xs text-red-500 mt-1">{eventFormErrors.data_fim}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="grid gap-4 md:grid-cols-2">
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-600 mb-1">Limite de participantes</label>
                                                        <input
                                                            type="number"
                                                            name="limite_participantes"
                                                            value={eventFormData.limite_participantes || ''}
                                                            onChange={e => {
                                                                setEventFormData(prev => ({ ...prev, limite_participantes: e.target.value }));
                                                                clearEventError('limite_participantes');
                                                            }}
                                                            placeholder="Ex: 25"
                                                            className={`w-full input ${eventFormErrors.limite_participantes ? 'border-red-500 focus:ring-red-300' : ''}`}
                                                            aria-invalid={eventFormErrors.limite_participantes ? 'true' : 'false'}
                                                            min="1"
                                                            max="500"
                                                            required
                                                        />
                                                        {eventFormErrors.limite_participantes && (
                                                            <p className="text-xs text-red-500 mt-1">{eventFormErrors.limite_participantes}</p>
                                                        )}
                                                        <p className="text-[11px] text-gray-500 mt-1">Ajuste conforme a lotação máxima do evento.</p>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-600 mb-1">Vagas simultâneas na sala</label>
                                                        <input
                                                            type="number"
                                                            name="vagas_disponiveis"
                                                            value={eventFormData.vagas_disponiveis || 0}
                                                            onChange={e => {
                                                                const parsedValue = parseInt(e.target.value, 10);
                                                                setEventFormData(prev => ({ ...prev, vagas_disponiveis: Number.isNaN(parsedValue) ? 0 : parsedValue }));
                                                                clearEventError('vagas_disponiveis');
                                                            }}
                                                            placeholder="0 = ilimitado"
                                                            className={`w-full input ${eventFormErrors.vagas_disponiveis ? 'border-red-500 focus:ring-red-300' : ''}`}
                                                            aria-invalid={eventFormErrors.vagas_disponiveis ? 'true' : 'false'}
                                                            min="0"
                                                            max="1000"
                                                        />
                                                        {eventFormErrors.vagas_disponiveis && (
                                                            <p className="text-xs text-red-500 mt-1">{eventFormErrors.vagas_disponiveis}</p>
                                                        )}
                                                        <p className="text-[11px] text-gray-500 mt-1">Use zero para manter o acesso ilimitado.</p>
                                                    </div>
                                                </div>
                                                <div className="grid gap-4 md:grid-cols-2">
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-600 mb-1">Valor do evento</label>
                                                        <div className={`input flex items-center ${isFreeEvent ? 'bg-gray-100 text-gray-400' : ''}`}>
                                                            <span className="text-xs text-gray-500 mr-2">R$</span>
                                                            <input
                                                                type="number"
                                                                name="valor"
                                                                value={isFreeEvent ? 0 : eventFormData.valor || ''}
                                                                onChange={e => {
                                                                    const parsedValue = parseFloat(e.target.value);
                                                                    setEventFormData(prev => ({ ...prev, valor: Number.isNaN(parsedValue) ? '' : parsedValue }));
                                                                    clearEventError('valor');
                                                                }}
                                                                placeholder="Ex: 97,00"
                                                                className="flex-1 bg-transparent outline-none"
                                                                disabled={isFreeEvent}
                                                                min="0"
                                                                step="0.01"
                                                            />
                                                        </div>
                                                        {eventFormErrors.valor && (
                                                            <p className="text-xs text-red-500 mt-1">{eventFormErrors.valor}</p>
                                                        )}
                                                        <p className="text-[11px] text-gray-500 mt-1">
                                                            {isFreeEvent ? 'Marque como pago para definir o valor.' : 'Será cobrado no checkout após a inscrição.'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-600 mb-1">Limite para inscrições</label>
                                                        <input
                                                            type="datetime-local"
                                                            name="data_limite_inscricao"
                                                            value={eventFormData.data_limite_inscricao || ''}
                                                            onChange={e => {
                                                                setEventFormData(prev => ({ ...prev, data_limite_inscricao: e.target.value }));
                                                                clearEventError('data_limite_inscricao');
                                                            }}
                                                            className={`w-full input ${eventFormErrors.data_limite_inscricao ? 'border-red-500 focus:ring-red-300' : ''}`}
                                                            aria-invalid={eventFormErrors.data_limite_inscricao ? 'true' : 'false'}
                                                            required
                                                        />
                                                        {eventFormErrors.data_limite_inscricao && (
                                                            <p className="text-xs text-red-500 mt-1">{eventFormErrors.data_limite_inscricao}</p>
                                                        )}
                                                        <p className="text-[11px] text-gray-500 mt-1">Após essa data o botão “Inscrever” é ocultado.</p>
                                                    </div>
                                                </div>
                                            </section>

                                            <section className="rounded-2xl border border-gray-100 p-5 space-y-4">
                                                <div>
                                                    <h3 className="text-base font-semibold text-gray-800">Visibilidade no site</h3>
                                                    <p className="text-xs text-gray-500">Controle quando o card aparece e se está ativo.</p>
                                                </div>
                                                <div className="grid gap-4 md:grid-cols-2">
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-600 mb-1">Início da exibição</label>
                                                        <input
                                                            type="datetime-local"
                                                            name="data_inicio_exibicao"
                                                            value={eventFormData.data_inicio_exibicao || ''}
                                                            onChange={e => {
                                                                setEventFormData(prev => ({ ...prev, data_inicio_exibicao: e.target.value }));
                                                                clearEventError('data_inicio_exibicao');
                                                                clearEventError('data_fim_exibicao');
                                                            }}
                                                            className={`w-full input ${eventFormErrors.data_inicio_exibicao ? 'border-red-500 focus:ring-red-300' : ''}`}
                                                            aria-invalid={eventFormErrors.data_inicio_exibicao ? 'true' : 'false'}
                                                        />
                                                        {eventFormErrors.data_inicio_exibicao && (
                                                            <p className="text-xs text-red-500 mt-1">{eventFormErrors.data_inicio_exibicao}</p>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-600 mb-1">Fim da exibição</label>
                                                        <input
                                                            type="datetime-local"
                                                            name="data_fim_exibicao"
                                                            value={eventFormData.data_fim_exibicao || ''}
                                                            onChange={e => {
                                                                setEventFormData(prev => ({ ...prev, data_fim_exibicao: e.target.value }));
                                                                clearEventError('data_fim_exibicao');
                                                            }}
                                                            className={`w-full input ${eventFormErrors.data_fim_exibicao ? 'border-red-500 focus:ring-red-300' : ''}`}
                                                            aria-invalid={eventFormErrors.data_fim_exibicao ? 'true' : 'false'}
                                                        />
                                                        {eventFormErrors.data_fim_exibicao && (
                                                            <p className="text-xs text-red-500 mt-1">{eventFormErrors.data_fim_exibicao}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2">
                                                    <input
                                                        type="checkbox"
                                                        id="evento_ativo"
                                                        name="ativo"
                                                        checked={eventFormData.ativo === true}
                                                        onChange={e => setEventFormData(prev => ({ ...prev, ativo: e.target.checked }))}
                                                        className="w-4 h-4 text-[#2d8659] border-2 border-gray-300 rounded focus:ring-[#2d8659] focus:ring-2"
                                                    />
                                                    <label htmlFor="evento_ativo" className="text-sm font-medium text-gray-700 cursor-pointer">
                                                        Evento ativo e visível para pacientes
                                                    </label>
                                                </div>
                                            </section>

                                            <section className="rounded-2xl border border-gray-100 p-5 space-y-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <h3 className="text-base font-semibold text-gray-800">Sala Zoom e links</h3>
                                                        <p className="text-xs text-gray-500">Usamos criação automática, mas você pode informar manualmente.</p>
                                                    </div>
                                                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                                                        <input
                                                            type="checkbox"
                                                            className="h-4 w-4 text-[#2d8659]"
                                                            checked={showManualZoomFields}
                                                            onChange={(e) => {
                                                                setShowManualZoomFields(e.target.checked);
                                                                if (!e.target.checked) {
                                                                    setEventFormData(prev => ({
                                                                        ...prev,
                                                                        meeting_link: '',
                                                                        meeting_password: '',
                                                                        meeting_id: '',
                                                                        meeting_start_url: ''
                                                                    }));
                                                                }
                                                            }}
                                                        />
                                                        Preencher manualmente
                                                    </label>
                                                </div>
                                                {!showManualZoomFields && (
                                                    <div className="rounded-lg border border-dashed border-[#2d8659]/50 bg-[#2d8659]/5 p-4 text-xs text-gray-600">
                                                        <p className="font-medium text-gray-800">Criação automática habilitada</p>
                                                        <p>
                                                            Ao salvar um novo evento, tentaremos criar a sala Zoom com os dados acima.
                                                            Caso prefira informar o link manualmente, ative a opção “Preencher manualmente”.
                                                        </p>
                                                    </div>
                                                )}
                                                {showManualZoomFields && (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-xs font-medium mb-1">Link para participantes</label>
                                                            <input
                                                                type="url"
                                                                value={eventFormData.meeting_link || ''}
                                                                onChange={(e) => setEventFormData(prev => ({ ...prev, meeting_link: e.target.value }))}
                                                                placeholder="https://zoom.us/j/123456"
                                                                className="w-full input"
                                                            />
                                                            <p className="text-xs text-gray-500 mt-1">Mostrado apenas para inscritos confirmados.</p>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium mb-1">Senha da reunião</label>
                                                            <input
                                                                type="text"
                                                                value={eventFormData.meeting_password || ''}
                                                                onChange={(e) => setEventFormData(prev => ({ ...prev, meeting_password: e.target.value }))}
                                                                placeholder="Opcional"
                                                                className="w-full input"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium mb-1">ID da reunião</label>
                                                            <input
                                                                type="text"
                                                                value={eventFormData.meeting_id || ''}
                                                                onChange={(e) => setEventFormData(prev => ({ ...prev, meeting_id: e.target.value }))}
                                                                placeholder="Ex: 123 456 789"
                                                                className="w-full input"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium mb-1">Link do anfitrião</label>
                                                            <input
                                                                type="url"
                                                                value={eventFormData.meeting_start_url || ''}
                                                                onChange={(e) => setEventFormData(prev => ({ ...prev, meeting_start_url: e.target.value }))}
                                                                placeholder="https://zoom.us/s/host"
                                                                className="w-full input"
                                                            />
                                                            <p className="text-xs text-gray-500 mt-1">Visível apenas no painel administrativo.</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </section>

                                            <section className="rounded-2xl border border-gray-100 p-5 space-y-4">
                                                <div>
                                                    <h3 className="text-base font-semibold text-gray-800">Link do evento e publicação</h3>
                                                    <p className="text-xs text-gray-500">Use um slug amigável. Deixe vazio para gerar automaticamente.</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <input
                                                        name="link_slug"
                                                        value={eventFormData.link_slug || ''}
                                                        onChange={e => {
                                                            const value = e.target.value.toLowerCase();
                                                            setSlugManuallyEdited(true);
                                                            setEventFormData(prev => ({ ...prev, link_slug: value }));
                                                            clearEventError('link_slug');
                                                        }}
                                                        placeholder="workshop-ansiedade"
                                                        className={`flex-1 input ${eventFormErrors.link_slug ? 'border-red-500 focus:ring-red-300' : ''}`}
                                                        aria-invalid={eventFormErrors.link_slug ? 'true' : 'false'}
                                                        pattern="[a-z0-9-]+"
                                                        title="Use apenas letras minúsculas, números e hífens"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() => {
                                                            const slug = generateUniqueSlug(eventFormData.titulo || 'evento');
                                                            setSlugManuallyEdited(true);
                                                            setEventFormData(prev => ({ ...prev, link_slug: slug }));
                                                            clearEventError('link_slug');
                                                            toast({ title: 'Slug gerado!', description: slug });
                                                        }}
                                                        disabled={!eventFormData.titulo}
                                                    >
                                                        Gerar
                                                    </Button>
                                                </div>
                                                {eventFormErrors.link_slug && (
                                                    <p className="text-xs text-red-500">{eventFormErrors.link_slug}</p>
                                                )}
                                                <p className="text-xs text-gray-500">
                                                    {eventFormData.link_slug ? `URL pública: /evento/${eventFormData.link_slug}` : 'Slug será sugerido com base no título.'}
                                                </p>

                                                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between rounded-xl bg-gray-50 p-4 text-xs text-gray-600">
                                                    <div>
                                                        <p className="font-semibold text-gray-800">Resumo rápido</p>
                                                        <p>{eventFormData.data_inicio ? 'Início em ' + new Date(eventFormData.data_inicio).toLocaleString('pt-BR') : 'Defina a data de início.'}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p>{isFreeEvent ? 'Evento gratuito' : hasPaidValue ? `Valor previsto: R$ ${priceNumber.toFixed(2)}` : 'Informe o valor cobrado antes de publicar.'}</p>
                                                        <p>{eventFormData.professional_id ? 'Profissional selecionado' : 'Selecione um profissional'}</p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-2 border-t pt-4 md:flex-row md:items-center md:justify-end">
                                                    {isEditingEvent && (
                                                        <Button type="button" variant="outline" onClick={resetEventForm}>
                                                            Cancelar edição
                                                        </Button>
                                                    )}
                                                    <Button type="submit" className="bg-[#2d8659] hover:bg-[#236b47]">
                                                        {isEditingEvent ? 'Salvar alterações' : 'Criar evento'}
                                                    </Button>
                                                </div>
                                            </section>
                                        </form>
                                    </div>
                                </div>
                            </TabsContent>
                        )}

                        {userRole === 'admin' && (
                            <TabsContent value="event-registrations" className="mt-6">
                                <EventRegistrationsDashboard events={events} userRole={userRole} />
                            </TabsContent>
                        )}

                        {/* Depoimentos Section */}
                        {userRole === 'admin' && (
                            <TabsContent value="testimonials" className="mt-6">
                                <div className="bg-white rounded-xl shadow-lg p-8">
                                    <div className="text-center mb-8">
                                        <h2 className="text-2xl font-bold mb-4 flex items-center justify-center">
                                            <MessageCircle className="w-6 h-6 mr-2 text-[#2d8659]" />
                                            Gestão de Depoimentos
                                        </h2>
                                        <p className="text-gray-600 mb-6">
                                            Gerencie todos os depoimentos enviados pelos usuários, modere conteúdo e
                                            controle quais aparecem no site principal.
                                        </p>

                                        <div className="grid md:grid-cols-2 gap-6 mb-8">
                                            <div className="bg-blue-50 p-6 rounded-lg">
                                                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mx-auto mb-4">
                                                    <MessageCircle className="w-6 h-6 text-blue-600" />
                                                </div>
                                                <h3 className="font-semibold text-lg mb-2">Página de Depoimentos</h3>
                                                <p className="text-gray-600 text-sm mb-4">
                                                    Local público onde usuários podem enviar seus depoimentos sobre a clínica.
                                                </p>
                                                <Button
                                                    onClick={() => window.open('/depoimento', '_blank')}
                                                    variant="outline"
                                                    className="w-full border-blue-200 text-blue-700 hover:bg-blue-50"
                                                >
                                                    Ver Página Pública
                                                </Button>
                                            </div>

                                            <div className="bg-green-50 p-6 rounded-lg">
                                                <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto mb-4">
                                                    <Star className="w-6 h-6 text-green-600" />
                                                </div>
                                                <h3 className="font-semibold text-lg mb-2">Painel de Moderação</h3>
                                                <p className="text-gray-600 text-sm mb-4">
                                                    Gerencie todos os depoimentos: aprovar, editar, organizar e controlar exibição.
                                                </p>
                                                <Button
                                                    onClick={() => window.open('/admin/depoimentos', '_blank')}
                                                    className="w-full bg-[#2d8659] hover:bg-[#236b47]"
                                                >
                                                    Acessar Gestão
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 p-6 rounded-lg">
                                            <h4 className="font-semibold mb-3">Funcionalidades Disponíveis:</h4>
                                            <div className="grid md:grid-cols-2 gap-3 text-sm text-gray-700">
                                                <div className="flex items-center gap-2">
                                                    <Check className="w-4 h-4 text-green-600" />
                                                    <span>Aprovar/Ocultar depoimentos</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Check className="w-4 h-4 text-green-600" />
                                                    <span>Editar texto e correções</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Check className="w-4 h-4 text-green-600" />
                                                    <span>Adicionar depoimentos externos</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Check className="w-4 h-4 text-green-600" />
                                                    <span>Sistema de busca e filtros</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Check className="w-4 h-4 text-green-600" />
                                                    <span>Controle de exibição no site</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Check className="w-4 h-4 text-green-600" />
                                                    <span>Moderação completa de conteúdo</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>
                        )}
                    </Tabs>
                </div>
            </div >

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                onConfirm={confirmDialog.onConfirm}
                title={confirmDialog.title}
                message={confirmDialog.message}
                warningMessage={confirmDialog.warningMessage}
                type={confirmDialog.type}
            />
        </>
    );
};

export default AdminPage;
