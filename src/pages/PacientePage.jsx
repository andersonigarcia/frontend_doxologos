
import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, LogOut, Calendar, Clock, AlertTriangle, CheckCircle, XCircle, Star, Edit, Copy, ExternalLink, CreditCard, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronDown, ChevronUp, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { logger } from '@/lib/logger';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { QRCodeSVG } from 'qrcode.react';
import UserBadge from '@/components/UserBadge';

const MAX_RESCHEDULE_ATTEMPTS = 2;
const ALLOWED_PAYMENT_STATUSES = ['approved', 'authorized', 'settled', 'paid'];

const PacientePage = () => {
    const { toast } = useToast();
    const { user, signIn, signOut } = useAuth();
    const [loginData, setLoginData] = useState({ email: '', password: '' });
    const [bookings, setBookings] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const [reviewingBooking, setReviewingBooking] = useState(null);
    const [reviewData, setReviewData] = useState({ rating: 0, comment: '' });
    
    // Estados de paginação
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);
    
    // Estado para controlar visibilidade dos detalhes do Zoom
    const [expandedZoom, setExpandedZoom] = useState({});
    
    // Estados de ordenação
    const [sortField, setSortField] = useState('default'); // 'default', 'date', 'status'
    const [sortOrder, setSortOrder] = useState('asc'); // 'asc' ou 'desc'
    
    // Estado para reagendamento
    const [reschedulingBooking, setReschedulingBooking] = useState(null);
    const [availableSlots, setAvailableSlots] = useState([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [selectedNewSlot, setSelectedNewSlot] = useState(null);

    const [creditSummary, setCreditSummary] = useState({ balance: null, credits: [] });
    const [creditLoading, setCreditLoading] = useState(false);
    const [creditError, setCreditError] = useState(null);

    const formatCurrency = useCallback((value, currency = 'BRL') => {
        const numericValue = Number(value || 0);
        const safeNumber = Number.isFinite(numericValue) ? numericValue : 0;
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency,
        }).format(safeNumber);
    }, []);

    const loadCreditSummary = useCallback(async () => {
        if (!user) {
            return;
        }

        setCreditLoading(true);
        setCreditError(null);

        try {
            const { data, error } = await supabase.functions.invoke('financial-credit-manager', {
                body: { action: 'list' },
            });

            if (error) {
                throw new Error(error.message || 'Erro ao consultar créditos');
            }

            if (data?.error) {
                throw new Error(data.error);
            }

            setCreditSummary({
                balance: data?.balance ?? null,
                credits: Array.isArray(data?.credits) ? data.credits : [],
            });
        } catch (err) {
            logger.error('Erro ao carregar créditos do paciente', err);
            setCreditError(err instanceof Error ? err.message : 'Erro ao carregar créditos');
        } finally {
            setCreditLoading(false);
        }
    }, [user]);

    const resolvePaymentRecord = (booking) => {
        if (!booking) return null;
        if (Array.isArray(booking.payment)) {
            return booking.payment[0] || null;
        }
        return booking.payment || null;
    };
    
    // Função para ordenar bookings
    const getSortedBookings = (bookingsToSort) => {
        const statusPriority = {
            'confirmed': 1,
            'paid': 1,
            'pending_payment': 2,
            'completed': 3,
            'cancelled_by_patient': 4,
            'cancelled_by_professional': 4
        };
        
        const sorted = [...bookingsToSort].sort((a, b) => {
            if (sortField === 'status') {
                const priorityA = statusPriority[a.status] || 5;
                const priorityB = statusPriority[b.status] || 5;
                const statusCompare = priorityA - priorityB;
                if (statusCompare !== 0) return sortOrder === 'asc' ? statusCompare : -statusCompare;
            }
            
            if (sortField === 'date' || sortField === 'default') {
                const dateA = new Date(a.booking_date + 'T' + a.booking_time);
                const dateB = new Date(b.booking_date + 'T' + b.booking_time);
                const dateCompare = dateA - dateB;
                if (dateCompare !== 0) {
                    return sortField === 'default' || sortOrder === 'desc' ? -dateCompare : dateCompare;
                }
            }
            
            // Ordenação secundária por status se estiver ordenando por data
            if (sortField === 'date') {
                const priorityA = statusPriority[a.status] || 5;
                const priorityB = statusPriority[b.status] || 5;
                return priorityA - priorityB;
            }
            
            return 0;
        });
        
        // Aplica ordenação default: confirmados > pendentes > cancelados, depois por data decrescente
        if (sortField === 'default') {
            return sorted.sort((a, b) => {
                const priorityA = statusPriority[a.status] || 5;
                const priorityB = statusPriority[b.status] || 5;
                const statusCompare = priorityA - priorityB;
                if (statusCompare !== 0) return statusCompare;
                
                // Mesma prioridade, ordena por data decrescente (mais recente primeiro)
                const dateA = new Date(a.booking_date + 'T' + a.booking_time);
                const dateB = new Date(b.booking_date + 'T' + b.booking_time);
                return dateB - dateA;
            });
        }
        
        return sorted;
    };
    
    const handleSort = (field) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder(field === 'date' ? 'desc' : 'asc');
        }
    };

    // Funções de paginação
    const sortedBookings = getSortedBookings(bookings);
    const totalPages = Math.ceil(sortedBookings.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedBookings = sortedBookings.slice(startIndex, endIndex);

    const goToPage = (page) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    };

    // Função para alternar visibilidade dos detalhes do Zoom
    const toggleZoomDetails = (bookingId) => {
        setExpandedZoom(prev => ({
            ...prev,
            [bookingId]: !prev[bookingId]
        }));
    };

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        const { data: bookingsData, error: bookingsError } = await supabase
            .from('bookings')
            .select(`
                *,
                meeting_link,
                meeting_password,
                meeting_id,
                meeting_start_url,
                professional:professionals(name),
                service:services(name),
                payment:payments(id, mp_payment_id, status, qr_code, qr_code_base64, ticket_url, amount)
            `)
            .eq('user_id', user.id)
            .order('booking_date', { ascending: false });

        if (bookingsError) {
            toast({ variant: 'destructive', title: 'Erro ao buscar agendamentos', description: bookingsError.message });
        } else {
            setBookings(bookingsData);
        }

        const { data: reviewsData, error: reviewsError } = await supabase
            .from('reviews')
            .select('booking_id')
            .eq('patient_id', user.id);
        
        if (reviewsError) {
            logger.apiError('fetchReviews', reviewsError, { userId: user.id });
        } else {
            setReviews(reviewsData.map(r => r.booking_id));
        }

        setLoading(false);
    }, [user, toast]);

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user, fetchData]);

    useEffect(() => {
        if (user) {
            loadCreditSummary();
        } else {
            setCreditSummary({ balance: null, credits: [] });
        }
    }, [user, loadCreditSummary]);

    const handleLogin = async (e) => {
        e.preventDefault();
        await signIn(loginData.email, loginData.password);
    };

    const handleLogout = async () => {
        await signOut();
        setLoginData({ email: '', password: '' });
    };

    const cancelBooking = async (bookingId) => {
        try {
            const { data, error } = await supabase.functions.invoke('patient-cancel-booking', {
                body: { booking_id: bookingId },
            });

            if (error) {
                throw new Error(error.message || 'Falha ao cancelar agendamento');
            }

            if (data?.error) {
                throw new Error(data.error);
            }

            const creditCreated = Boolean(data?.credit_created);
            const creditCurrency = data?.credit?.currency || 'BRL';
            const creditAmountRaw = data?.credit?.amount;
            const creditAmountNumber = Number(creditAmountRaw);
            const creditMessage = creditCreated && Number.isFinite(creditAmountNumber)
                ? `${new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: creditCurrency,
                }).format(creditAmountNumber)} foi liberado para você.`
                : null;

            toast({
                title: 'Agendamento cancelado com sucesso.',
                description: creditMessage ? `Um crédito de ${creditMessage}` : undefined,
            });

            await loadCreditSummary();
            fetchData();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro desconhecido ao cancelar';
            toast({
                variant: 'destructive',
                title: 'Erro ao cancelar',
                description: message,
            });
        }
    };

    /**
     * Verifica se o agendamento pode ser reagendado (mínimo 24h de antecedência)
     */
    const canReschedule = (booking) => {
        if (!booking) return false;

        if (booking.status === 'cancelled_by_patient' || booking.status === 'cancelled_by_professional') {
            return false;
        }

        const attemptsUsed = booking.reschedule_count || 0;
        if (attemptsUsed >= MAX_RESCHEDULE_ATTEMPTS) {
            return false;
        }

        const paymentRecord = resolvePaymentRecord(booking);
        const paymentStatus = paymentRecord?.status?.toLowerCase();
        if (!paymentStatus || !ALLOWED_PAYMENT_STATUSES.includes(paymentStatus)) {
            return false;
        }

        const bookingDateTime = new Date(`${booking.booking_date}T${booking.booking_time}`);
        const now = new Date();
        const hoursDifference = (bookingDateTime - now) / (1000 * 60 * 60);

        return hoursDifference > 24;
    };

    const getRescheduleRestrictionMessage = (booking) => {
        if (!booking) return null;

        if (booking.status === 'cancelled_by_patient' || booking.status === 'cancelled_by_professional') {
            return 'Agendamentos cancelados não podem ser reagendados automaticamente.';
        }

        const attemptsUsed = booking.reschedule_count || 0;
        if (attemptsUsed >= MAX_RESCHEDULE_ATTEMPTS) {
            return 'Limite de reagendamentos atingido. Entre em contato com nossa equipe para mais suporte.';
        }

        const paymentRecord = resolvePaymentRecord(booking);
        const paymentStatus = paymentRecord?.status?.toLowerCase();
        if (!paymentStatus || !ALLOWED_PAYMENT_STATUSES.includes(paymentStatus)) {
            return 'O reagendamento ficará disponível após a confirmação do pagamento.';
        }

        const bookingDateTime = new Date(`${booking.booking_date}T${booking.booking_time}`);
        const now = new Date();
        const hoursDifference = (bookingDateTime - now) / (1000 * 60 * 60);

        if (hoursDifference <= 24) {
            return 'O reagendamento só é permitido com pelo menos 24 horas de antecedência.';
        }

        return null;
    };

    /**
     * Busca horários disponíveis para reagendamento
     */
    const fetchAvailableSlots = async (professionalId, serviceId) => {
        setLoadingSlots(true);
        try {
            logger.info('Fetching available slots for reschedule', { professionalId, serviceId });

            const { data: availabilityRows, error: availabilityError } = await supabase
                .from('availability')
                .select('day_of_week, available_times, month, year')
                .eq('professional_id', professionalId);

            if (availabilityError) throw availabilityError;

            const availabilityByDay = (availabilityRows || []).reduce((acc, row) => {
                const dayKey = row?.day_of_week?.toLowerCase();
                if (!dayKey) return acc;

                if (!acc[dayKey]) {
                    acc[dayKey] = [];
                }

                acc[dayKey].push({
                    month: row?.month || null,
                    year: row?.year || null,
                    times: Array.isArray(row?.available_times) ? row.available_times : []
                });
                return acc;
            }, {});

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const endDate = new Date(today);
            endDate.setDate(endDate.getDate() + 30);

            const dateToISO = (date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            const normalizeTimeString = (time) => {
                if (!time) return null;
                if (typeof time === 'object' && time.time) {
                    time = time.time;
                }
                if (typeof time !== 'string') return null;

                const parts = time.split(':');
                if (parts.length === 1) {
                    return `${parts[0].padStart(2, '0')}:00`;
                }

                const hours = parts[0]?.padStart(2, '0') || '00';
                const minutes = parts[1]?.padStart(2, '0') || '00';
                return `${hours}:${minutes}`;
            };

            const normalizeTimeWithSeconds = (time) => {
                if (!time) return null;
                if (typeof time === 'string' && time.length === 8) {
                    return time;
                }
                const normalized = normalizeTimeString(time);
                return normalized ? `${normalized}:00` : null;
            };

            const { data: existingBookings, error: bookingsError } = await supabase
                .from('bookings')
                .select('booking_date, booking_time')
                .eq('professional_id', professionalId)
                .in('status', ['confirmed', 'paid', 'pending_payment'])
                .gte('booking_date', dateToISO(today))
                .lte('booking_date', dateToISO(endDate));

            if (bookingsError) throw bookingsError;

            const { data: blockedRows, error: blockedError } = await supabase
                .from('blocked_dates')
                .select('blocked_date, start_time, end_time')
                .eq('professional_id', professionalId)
                .gte('blocked_date', dateToISO(today))
                .lte('blocked_date', dateToISO(endDate));

            if (blockedError) throw blockedError;

            const bookedSlots = new Set(
                (existingBookings || []).map((booking) => {
                    const normalizedTime = normalizeTimeWithSeconds(booking?.booking_time);
                    return normalizedTime ? `${booking.booking_date}T${normalizedTime}` : null;
                }).filter(Boolean)
            );

            const blockedByDate = (blockedRows || []).reduce((acc, row) => {
                if (!row?.blocked_date) return acc;
                if (!acc[row.blocked_date]) {
                    acc[row.blocked_date] = [];
                }
                acc[row.blocked_date].push(row);
                return acc;
            }, {});

            const weekdayMap = {
                0: 'sunday',
                1: 'monday',
                2: 'tuesday',
                3: 'wednesday',
                4: 'thursday',
                5: 'friday',
                6: 'saturday'
            };

            const slots = [];
            const cursor = new Date(today);
            while (cursor <= endDate) {
                const slotDate = new Date(cursor);
                const dateStr = dateToISO(slotDate);
                const dayName = weekdayMap[slotDate.getDay()];
                const dayAvailability = availabilityByDay[dayName];

                if (Array.isArray(dayAvailability) && dayAvailability.length > 0) {
                    const slotMonth = slotDate.getMonth() + 1;
                    const slotYear = slotDate.getFullYear();
                    const timesForDay = [];

                    dayAvailability.forEach((entry) => {
                        const matchesMonth = !entry.month || entry.month === slotMonth;
                        const matchesYear = !entry.year || entry.year === slotYear;
                        if (!matchesMonth || !matchesYear) return;

                        entry.times.forEach((time) => {
                            const normalized = normalizeTimeString(time);
                            if (normalized && !timesForDay.includes(normalized)) {
                                timesForDay.push(normalized);
                            }
                        });
                    });

                    timesForDay.sort((a, b) => a.localeCompare(b));

                    const blockedForDate = blockedByDate[dateStr] || [];

                    timesForDay.forEach((time) => {
                        const timeWithSeconds = normalizeTimeWithSeconds(time);
                        const timeWithoutSeconds = normalizeTimeString(time);
                        if (!timeWithSeconds || !timeWithoutSeconds) return;

                        const slotDateTime = new Date(`${dateStr}T${timeWithSeconds}`);
                        const hoursFromNow = (slotDateTime - new Date()) / (1000 * 60 * 60);
                        if (hoursFromNow <= 24) return;

                        if (bookedSlots.has(`${dateStr}T${timeWithSeconds}`)) return;

                        const isBlocked = blockedForDate.some((block) => {
                            if (!block.start_time || !block.end_time) {
                                return true;
                            }
                            return timeWithSeconds >= block.start_time && timeWithSeconds < block.end_time;
                        });

                        if (isBlocked) return;

                        slots.push({
                            date: dateStr,
                            time: timeWithoutSeconds,
                            timeWithSeconds,
                            display: `${slotDate.toLocaleDateString('pt-BR', {
                                weekday: 'short',
                                day: '2-digit',
                                month: 'short'
                            })} às ${timeWithoutSeconds}`
                        });
                    });
                }

                cursor.setDate(cursor.getDate() + 1);
            }

            slots.sort((a, b) => {
                const aDate = new Date(`${a.date}T${a.timeWithSeconds || `${a.time}:00`}`);
                const bDate = new Date(`${b.date}T${b.timeWithSeconds || `${b.time}:00`}`);
                return aDate - bDate;
            });

            setAvailableSlots(slots);
            logger.success('Available slots loaded', { count: slots.length });
        } catch (error) {
            logger.error('Error fetching available slots', error);
            toast({
                variant: 'destructive',
                title: 'Erro ao buscar horários',
                description: 'Não foi possível carregar os horários disponíveis.'
            });
        } finally {
            setLoadingSlots(false);
        }
    };

    /**
     * Inicia o processo de reagendamento
     */
    const startReschedule = async (booking) => {
        setReschedulingBooking(booking);
        setSelectedNewSlot(null);
        await fetchAvailableSlots(booking.professional_id, booking.service_id);
    };

    /**
     * Confirma o reagendamento
     */
    const confirmReschedule = async () => {
        if (!selectedNewSlot || !reschedulingBooking) return;

        const attemptsUsed = reschedulingBooking.reschedule_count || 0;
        if (attemptsUsed >= MAX_RESCHEDULE_ATTEMPTS) {
            toast({
                variant: 'destructive',
                title: 'Limite atingido',
                description: 'Este agendamento já foi reagendado o número máximo de vezes permitido.'
            });
            return;
        }

        const paymentRecord = resolvePaymentRecord(reschedulingBooking);
        const paymentStatus = paymentRecord?.status?.toLowerCase();
        if (!paymentStatus || !ALLOWED_PAYMENT_STATUSES.includes(paymentStatus)) {
            toast({
                variant: 'destructive',
                title: 'Pagamento pendente',
                description: 'O reagendamento só é liberado após a confirmação do pagamento.'
            });
            return;
        }

        const bookingDateTime = new Date(`${reschedulingBooking.booking_date}T${reschedulingBooking.booking_time}`);
        const now = new Date();
        const hoursDifference = (bookingDateTime - now) / (1000 * 60 * 60);
        if (hoursDifference <= 24) {
            toast({
                variant: 'destructive',
                title: 'Prazo expirado',
                description: 'Só é possível reagendar com pelo menos 24 horas de antecedência.'
            });
            return;
        }

        const newBookingTime = selectedNewSlot.time;
        const newBookingTimeWithSeconds = selectedNewSlot.timeWithSeconds || `${selectedNewSlot.time}:00`;

        try {
            logger.info('Confirming reschedule', {
                bookingId: reschedulingBooking.id,
                newDate: selectedNewSlot.date,
                newTime: newBookingTime
            });

            const nextCount = attemptsUsed + 1;
            const rescheduleRootId = reschedulingBooking.rescheduled_from_id || reschedulingBooking.id;

            const { error } = await supabase
                .from('bookings')
                .update({
                    booking_date: selectedNewSlot.date,
                    booking_time: newBookingTime,
                    reschedule_count: nextCount,
                    rescheduled_from_id: rescheduleRootId,
                    updated_at: new Date().toISOString()
                })
                .eq('id', reschedulingBooking.id);

            if (error) throw error;

            const historyPayload = {
                booking_id: reschedulingBooking.id,
                previous_booking_date: reschedulingBooking.booking_date,
                previous_booking_time: reschedulingBooking.booking_time,
                new_booking_date: selectedNewSlot.date,
                new_booking_time: newBookingTimeWithSeconds,
                attempt_number: nextCount,
                status: 'success',
                metadata: {
                    triggered_by: 'patient_portal',
                    user_id: user?.id || null
                }
            };

            const { error: historyError } = await supabase
                .from('booking_reschedule_history')
                .insert([historyPayload]);

            if (historyError) {
                logger.error('Failed to log reschedule history', historyError);
            }

            logger.success('Booking rescheduled successfully', {
                bookingId: reschedulingBooking.id
            });

            toast({
                title: '✅ Reagendamento confirmado!',
                description: `Seu horário foi alterado para ${new Date(selectedNewSlot.date).toLocaleDateString('pt-BR')} às ${newBookingTime}.`
            });

            setReschedulingBooking(null);
            setSelectedNewSlot(null);
            setAvailableSlots([]);
            fetchData();
        } catch (error) {
            logger.error('Error rescheduling booking', error);
            toast({
                variant: 'destructive',
                title: 'Erro ao reagendar',
                description: 'Não foi possível reagendar o horário. Tente novamente.'
            });
        }
    };

    const handleReviewSubmit = async () => {
        if (reviewData.rating === 0) {
            toast({ variant: 'destructive', title: 'Por favor, selecione uma nota.' });
            return;
        }
        const { error } = await supabase.from('reviews').insert([{
            booking_id: reviewingBooking.id,
            patient_id: user.id,
            professional_id: reviewingBooking.professional.id,
            rating: reviewData.rating,
            comment: reviewData.comment,
        }]);

        if (error) {
            toast({ variant: 'destructive', title: 'Erro ao enviar avaliação', description: error.message });
        } else {
            toast({ title: 'Avaliação enviada com sucesso!' });
            setReviewingBooking(null);
            setReviewData({ rating: 0, comment: '' });
            fetchData();
        }
    };

    const availableCreditAmount = creditSummary.balance ? Number(creditSummary.balance.available_amount) || 0 : 0;
    const reservedCreditAmount = creditSummary.balance ? Number(creditSummary.balance.reserved_amount) || 0 : 0;
    const availableCreditsList = (creditSummary.credits || []).filter((credit) => credit.status === 'available');
    const hasCreditInfo = availableCreditAmount > 0 || reservedCreditAmount > 0;

    if (!user) {
        return (
            <>
                <Helmet><title>Área do Paciente - Doxologos</title></Helmet>
                <header className="bg-white shadow-sm">
                    <nav className="container mx-auto px-3 md:px-4 py-3 md:py-4">
                        <div className="flex items-center justify-between gap-3">
                            <Link to="/" className="flex items-center space-x-2">
                                <img src="/favicon.svg" alt="Doxologos Logo" className="w-7 md:w-8 h-7 md:h-8" />
                                <span className="text-xl md:text-2xl font-bold gradient-text">Doxologos</span>
                            </Link>
                            <Link to="/">
                                <Button variant="outline" className="border-[#2d8659] text-[#2d8659] text-sm md:text-base">
                                    <ArrowLeft className="w-4 h-4 mr-1 md:mr-2" /> Voltar
                                </Button>
                            </Link>
                        </div>
                    </nav>
                </header>
                <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
                        <h2 className="text-3xl font-bold mb-6 text-center">Área do Paciente</h2>
                        <p className="text-center text-gray-600 mb-6">Acesse para ver seus agendamentos.</p>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div><label className="block text-sm font-medium mb-2">Email</label><input type="email" required value={loginData.email} onChange={(e) => setLoginData({...loginData, email: e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent"/></div>
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-medium">Senha</label>
                                    <Link to="/recuperar-senha" className="text-sm text-[#2d8659] hover:underline">
                                        Esqueci minha senha
                                    </Link>
                                </div>
                                <input type="password" required value={loginData.password} onChange={(e) => setLoginData({...loginData, password: e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent"/>
                            </div>
                            <Button type="submit" className="w-full bg-[#2d8659] hover:bg-[#236b47]">Entrar</Button>
                        </form>
                    </motion.div>
                </div>
            </>
        );
    }
    
    return (
        <>
            <Helmet><title>Meus Agendamentos - Doxologos</title></Helmet>
            <header className="fixed top-0 w-full bg-white/95 backdrop-blur-sm shadow-sm z-50">
                <nav className="container mx-auto px-3 md:px-4 py-3 md:py-4">
                    {/* Desktop Header */}
                    <div className="hidden md:flex items-center justify-between gap-4">
                        <Link to="/" className="flex items-center space-x-2">
                            <img src="/favicon.svg" alt="Doxologos Logo" className="w-8 h-8" />
                            <span className="text-2xl font-bold gradient-text">Doxologos</span>
                        </Link>
                        <div className="flex items-center gap-4 flex-wrap justify-end">
                            <Link to="/minhas-inscricoes">
                                <Button variant="outline" className="border-[#2d8659] text-[#2d8659]">
                                    <Calendar className="w-4 h-4 mr-2" /> Meus Eventos
                                </Button>
                            </Link>
                            <div className="h-6 w-px bg-gray-300"></div>
                            <UserBadge
                                user={user}
                                userRole="patient"
                                onLogout={handleLogout}
                                layout="row"
                                showLogoutButton={true}
                            />
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
                                userRole="patient"
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
                                    to="/minhas-inscricoes"
                                    className="block px-2 py-2 rounded-md text-sm font-medium text-[#2d8659] hover:bg-gray-50 transition-colors"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <Calendar className="w-4 h-4 mr-2 inline" /> Meus Eventos
                                </Link>
                            </div>
                        </motion.div>
                    )}
                </nav>
            </header>
            <div className="min-h-screen bg-gray-50 py-8 md:py-12 pt-28 md:pt-24">
                <div className="container mx-auto px-3 md:px-4 max-w-4xl">
                    <h1 className="text-4xl font-bold mb-2">Área do Paciente</h1>
                    <p className="text-gray-500 mb-8">Gerencie seus agendamentos e consultas</p>
                    {creditError && (
                        <div className="mb-6">
                            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                                Não foi possível carregar seus créditos no momento. Tente novamente mais tarde.
                            </div>
                        </div>
                    )}
                    {hasCreditInfo && (
                        <div className="mb-6">
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                                <div className="flex items-start gap-3">
                                    <CreditCard className="w-6 h-6 text-emerald-600 mt-1" />
                                    <div className="flex-1">
                                        <p className="font-semibold text-emerald-900">Créditos disponíveis para novas consultas</p>
                                        <p className="text-sm text-emerald-800 mt-1">
                                            Você possui <strong>{formatCurrency(availableCreditAmount)}</strong> que pode ser aplicado no próximo agendamento.
                                        </p>
                                        {reservedCreditAmount > 0 && (
                                            <p className="text-xs text-emerald-700 mt-2">
                                                {formatCurrency(reservedCreditAmount)} estão reservados enquanto um pagamento está em andamento.
                                            </p>
                                        )}
                                        {creditLoading && (
                                            <p className="text-xs text-emerald-600 mt-2">Atualizando informações de crédito...</p>
                                        )}
                                        {availableCreditsList.length > 0 && (
                                            <ul className="mt-3 space-y-2">
                                                {availableCreditsList.slice(0, 3).map((credit) => {
                                                    const creditDate = credit.created_at ? new Date(credit.created_at) : null;
                                                    const formattedDate = creditDate && !Number.isNaN(creditDate.getTime())
                                                        ? creditDate.toLocaleDateString('pt-BR')
                                                        : 'Data indisponível';
                                                    const sourceLabel = credit.source_type === 'cancellation'
                                                        ? 'Crédito por cancelamento'
                                                        : credit.source_reason || `Origem: ${credit.source_type || 'manual'}`;
                                                    const currencyCode = credit.currency || 'BRL';
                                                    return (
                                                        <li
                                                            key={credit.id}
                                                            className="flex items-center justify-between bg-white/70 border border-emerald-100 rounded-lg px-3 py-2 text-sm text-emerald-900"
                                                        >
                                                            <span className="pr-3 truncate">
                                                                {formattedDate} • {sourceLabel}
                                                            </span>
                                                            <span className="font-semibold whitespace-nowrap">
                                                                {formatCurrency(credit.amount, currencyCode)}
                                                            </span>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        )}
                                        {availableCreditsList.length > 3 && (
                                            <p className="text-xs text-emerald-700 mt-2">
                                                Você possui {availableCreditsList.length - 3} crédito(s) adicional(is). Todos ficam disponíveis na tela de pagamento.
                                            </p>
                                        )}
                                        <p className="text-xs text-emerald-800 mt-3">
                                            Durante o checkout, selecione a opção 'Usar crédito' para aplicar o saldo automaticamente.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                            <h2 className="text-2xl font-bold flex items-center">
                                <Calendar className="w-6 h-6 mr-2 text-[#2d8659]" /> 
                                Meus Agendamentos ({bookings.length})
                            </h2>
                            {bookings.length > 0 && (
                                <div className="flex flex-wrap gap-2 items-center">
                                    <div className="flex gap-2">
                                        <Button 
                                            onClick={() => handleSort('default')} 
                                            variant="outline" 
                                            size="sm"
                                            className={sortField === 'default' ? 'bg-[#2d8659] text-white hover:bg-[#236b47]' : ''}
                                        >
                                            Padrão
                                        </Button>
                                        <Button 
                                            onClick={() => handleSort('status')} 
                                            variant="outline" 
                                            size="sm"
                                            className={sortField === 'status' ? 'bg-[#2d8659] text-white hover:bg-[#236b47]' : ''}
                                        >
                                            Status {sortField === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                                        </Button>
                                        <Button 
                                            onClick={() => handleSort('date')} 
                                            variant="outline" 
                                            size="sm"
                                            className={sortField === 'date' ? 'bg-[#2d8659] text-white hover:bg-[#236b47]' : ''}
                                        >
                                            Data {sortField === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                                        </Button>
                                    </div>
                                    
                                    {/* Seletor de itens por página */}
                                    <div className="flex items-center gap-2 border-l pl-2">
                                        <label className="text-sm text-gray-600">Itens:</label>
                                        <select
                                            value={itemsPerPage}
                                            onChange={(e) => {
                                                setItemsPerPage(Number(e.target.value));
                                                setCurrentPage(1);
                                            }}
                                            className="border rounded px-2 py-1 text-sm"
                                        >
                                            <option value="5">5</option>
                                            <option value="10">10</option>
                                            <option value="20">20</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                        {loading ? <p>Carregando seus agendamentos...</p> : bookings.length === 0 ? (
                            <div className="text-center py-10">
                                <p className="text-gray-500 mb-4">Você ainda não tem agendamentos.</p>
                                <Link to="/agendamento"><Button className="bg-[#2d8659] hover:bg-[#236b47]">Agendar sua primeira consulta</Button></Link>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {paginatedBookings.map((booking) => {
                                    const rescheduleAttemptsUsed = booking.reschedule_count || 0;
                                    const rescheduleAttemptsRemaining = Math.max(0, MAX_RESCHEDULE_ATTEMPTS - rescheduleAttemptsUsed);
                                    const isEligibleForReschedule = canReschedule(booking);
                                    const restrictionMessage = isEligibleForReschedule ? null : getRescheduleRestrictionMessage(booking);

                                    return (
                                        <div key={booking.id} className="border rounded-lg p-4 transition-all hover:shadow-md">
                                        <div className="flex flex-col sm:flex-row justify-between sm:items-start mb-3">
                                            <div>
                                                <h3 className="font-bold text-lg">{booking.service.name}</h3>
                                                <p className="text-sm text-gray-600">com {booking.professional.name}</p>
                                            </div>
                                            <span className={`mt-2 sm:mt-0 px-3 py-1 rounded-full text-sm font-medium ${
                                                booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                                booking.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                                booking.status.includes('cancelled') ? 'bg-red-100 text-red-800' :
                                                'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {booking.status === 'confirmed' ? 'Confirmado' :
                                                booking.status === 'completed' ? 'Concluído' :
                                                booking.status.includes('cancelled') ? 'Cancelado' : 'Pendente'}
                                            </span>
                                        </div>
                                        <div className="grid md:grid-cols-2 gap-2 text-sm mb-4">
                                            <p className="flex items-center"><Calendar className="w-4 h-4 mr-2" /> {new Date(booking.booking_date).toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                            <p className="flex items-center"><Clock className="w-4 h-4 mr-2" /> {booking.booking_time}</p>
                                        </div>

                                        {/* Exibir Link do Zoom para consultas confirmadas ou pagas - VERSÃO MINIMIZADA */}
                                        {(booking.status === 'confirmed' || booking.status === 'paid') && booking.meeting_link && (
                                            <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-lg mb-4 overflow-hidden">
                                                {/* Cabeçalho sempre visível */}
                                                <div className="p-4">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="font-semibold text-blue-900 flex items-center">
                                                            🎥 Consulta Online
                                                        </h4>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => toggleZoomDetails(booking.id)}
                                                            className="text-blue-700 hover:text-blue-900"
                                                        >
                                                            {expandedZoom[booking.id] ? (
                                                                <>
                                                                    <ChevronUp className="w-4 h-4 mr-1" />
                                                                    Ocultar
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <ChevronDown className="w-4 h-4 mr-1" />
                                                                    Ver detalhes
                                                                </>
                                                            )}
                                                        </Button>
                                                    </div>
                                                    
                                                    {/* Botão principal sempre visível */}
                                                    <div className="mt-3">
                                                        <a 
                                                            href={booking.meeting_link} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                                                        >
                                                            🔗 Entrar na Sala Zoom
                                                        </a>
                                                    </div>
                                                </div>

                                                {/* Detalhes expandíveis */}
                                                {expandedZoom[booking.id] && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.3 }}
                                                        className="px-4 pb-4 space-y-3"
                                                    >
                                                        {booking.meeting_password && (
                                                            <div className="bg-white p-3 rounded border border-blue-200">
                                                                <p className="text-sm text-gray-600 mb-1">🔑 Senha de acesso:</p>
                                                                <code className="text-base font-mono font-bold text-blue-900 bg-blue-100 px-3 py-1 rounded">
                                                                    {booking.meeting_password}
                                                                </code>
                                                            </div>
                                                        )}
                                                        <div className="text-xs text-blue-800 space-y-1 bg-white p-3 rounded border border-blue-200">
                                                            <p>💡 <strong>Dica:</strong> Entre 5 minutos antes do horário agendado</p>
                                                            <p>📱 Baixe o Zoom: <a href="https://zoom.us/download" target="_blank" rel="noopener noreferrer" className="underline">zoom.us/download</a></p>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </div>
                                        )}

                                        {booking.status === 'pending_payment' && (
                                            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-500 rounded-r-lg p-4 mb-4">
                                                <div className="flex items-start gap-3 mb-3">
                                                    <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1"/>
                                                    <div className="flex-1">
                                                        <h4 className="font-semibold text-amber-900 mb-1">
                                                            Pagamento Pendente
                                                        </h4>
                                                        <p className="text-sm text-amber-800 mb-3">
                                                            Complete o pagamento para confirmar seu agendamento
                                                        </p>
                                                        
                                                        {/* Exibir QR Code PIX se disponível */}
                                                        {booking.payment?.[0]?.qr_code && (
                                                            <div className="bg-white rounded-lg p-4 border-2 border-amber-200">
                                                                <div className="flex flex-col md:flex-row gap-4 items-start">
                                                                    {/* QR Code */}
                                                                    <div className="flex flex-col items-center">
                                                                        <div className="bg-white p-3 rounded-lg border-2 border-gray-200">
                                                                            <QRCodeSVG 
                                                                                value={booking.payment[0].qr_code} 
                                                                                size={160}
                                                                                level="H"
                                                                            />
                                                                        </div>
                                                                        <p className="text-xs text-gray-600 mt-2 text-center">
                                                                            Escaneie com seu app bancário
                                                                        </p>
                                                                    </div>
                                                                    
                                                                    {/* Informações do Pagamento */}
                                                                    <div className="flex-1 space-y-3">
                                                                        <div>
                                                                            <p className="text-sm font-medium text-gray-700 mb-1">
                                                                                💰 Valor
                                                                            </p>
                                                                            <p className="text-2xl font-bold text-green-600">
                                                                                R$ {(booking.payment[0].amount || 0).toFixed(2)}
                                                                            </p>
                                                                        </div>
                                                                        
                                                                        <div>
                                                                            <p className="text-sm font-medium text-gray-700 mb-2">
                                                                                📱 Código PIX Copia e Cola
                                                                            </p>
                                                                            <div className="flex gap-2">
                                                                                <input 
                                                                                    type="text" 
                                                                                    value={booking.payment[0].qr_code}
                                                                                    readOnly
                                                                                    className="flex-1 text-xs font-mono p-2 bg-gray-50 border rounded truncate"
                                                                                />
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="outline"
                                                                                    onClick={() => {
                                                                                        navigator.clipboard.writeText(booking.payment[0].qr_code);
                                                                                        toast({
                                                                                            title: "Código copiado!",
                                                                                            description: "Cole no seu app bancário para pagar"
                                                                                        });
                                                                                    }}
                                                                                >
                                                                                    <Copy className="w-4 h-4" />
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                        
                                                                        {booking.payment[0].ticket_url && (
                                                                            <div>
                                                                                <a
                                                                                    href={booking.payment[0].ticket_url}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                                                                                >
                                                                                    <ExternalLink className="w-4 h-4 mr-1" />
                                                                                    Ver comprovante no Mercado Pago
                                                                                </a>
                                                                            </div>
                                                                        )}
                                                                        
                                                                        <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
                                                                            <p>💡 <strong>Dica:</strong> Após pagar, a confirmação pode levar alguns segundos</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                        
                                                        {/* Caso não tenha QR Code (pagamento antigo ou outro método) */}
                                                        {!booking.payment?.[0]?.qr_code && (
                                                            <div className="flex items-center gap-2 mt-2">
                                                                <Link to={`/checkout?booking_id=${booking.id}`}>
                                                                    <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                                                                        <CreditCard className="w-4 h-4 mr-2" />
                                                                        Realizar Pagamento
                                                                    </Button>
                                                                </Link>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {booking.status === 'confirmed' && !booking.meeting_link && (
                                            <div className="flex items-center gap-2 bg-green-50 border-l-4 border-green-400 p-3 rounded-r-lg">
                                                <CheckCircle className="w-5 h-5 text-green-600"/>
                                                <p className="text-sm text-green-800">Seu agendamento está confirmado! O link da consulta será disponibilizado em breve.</p>
                                            </div>
                                        )}
                                        <div className="mt-4 space-y-2">
                                            <p className="text-xs text-gray-500">
                                                Reagendamentos realizados: {rescheduleAttemptsUsed} de {MAX_RESCHEDULE_ATTEMPTS}
                                            </p>
                                            {isEligibleForReschedule && rescheduleAttemptsRemaining > 0 && (
                                                <p className="text-xs text-green-600">
                                                    Você ainda pode reagendar {rescheduleAttemptsRemaining} vez{rescheduleAttemptsRemaining > 1 ? 'es' : ''}.
                                                </p>
                                            )}
                                            {!isEligibleForReschedule && restrictionMessage && (
                                                <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded">
                                                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                                    <span>{restrictionMessage}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {booking.status === 'completed' && !reviews.includes(booking.id) && (
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button size="sm" onClick={() => setReviewingBooking(booking)}><Star className="w-4 h-4 mr-1" /> Avaliar Atendimento</Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader><DialogTitle>Avaliar Atendimento</DialogTitle></DialogHeader>
                                                        <div className="py-4 space-y-4">
                                                            <div>
                                                                <label className="font-medium">Sua nota</label>
                                                                <div className="flex gap-1 mt-2">
                                                                    {[...Array(5)].map((_, i) => (
                                                                        <Star key={i} onClick={() => setReviewData({...reviewData, rating: i + 1})} className={`w-8 h-8 cursor-pointer ${i < reviewData.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label className="font-medium">Seu comentário (opcional)</label>
                                                                <textarea value={reviewData.comment} onChange={e => setReviewData({...reviewData, comment: e.target.value})} rows="4" className="w-full input mt-2" placeholder="Como foi sua experiência?"></textarea>
                                                            </div>
                                                        </div>
                                                        <DialogFooter>
                                                            <DialogClose asChild><Button variant="outline" onClick={() => setReviewData({ rating: 0, comment: '' })}>Cancelar</Button></DialogClose>
                                                            <Button onClick={handleReviewSubmit}>Enviar Avaliação</Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                            )}
                                            {booking.status !== 'cancelled_by_patient' && new Date(booking.booking_date) > new Date() && (
                                                <Button size="sm" variant="outline" onClick={() => cancelBooking(booking.id)} className="border-red-600 text-red-600 hover:bg-red-50 hover:text-red-700">
                                                    <XCircle className="w-4 h-4 mr-1" /> Cancelar
                                                </Button>
                                            )}
                                            {isEligibleForReschedule && (
                                                <Dialog open={reschedulingBooking?.id === booking.id} onOpenChange={(open) => !open && setReschedulingBooking(null)}>
                                                    <DialogTrigger asChild>
                                                        <Button size="sm" variant="outline" onClick={() => startReschedule(booking)}>
                                                            <Calendar className="w-4 h-4 mr-1" /> Reagendar
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                                        <DialogHeader>
                                                            <DialogTitle>Reagendar Consulta</DialogTitle>
                                                        </DialogHeader>
                                                        <div className="space-y-4">
                                                            <div className="bg-gray-50 p-4 rounded-lg">
                                                                <h4 className="font-semibold mb-2">Agendamento Atual:</h4>
                                                                <p className="text-sm text-gray-600">
                                                                    <strong>Data:</strong> {new Date(booking.booking_date).toLocaleDateString('pt-BR')} às {booking.booking_time.slice(0, 5)}
                                                                </p>
                                                                <p className="text-sm text-gray-600">
                                                                    <strong>Profissional:</strong> {booking.professional?.name}
                                                                </p>
                                                            </div>
                                                            
                                                            <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg">
                                                                <p className="text-sm text-blue-800">
                                                                    <strong>ℹ️ Importante:</strong> Apenas horários com mais de 24h de antecedência estão disponíveis.
                                                                </p>
                                                            </div>
                                                            
                                                            <div>
                                                                <h4 className="font-semibold mb-3">Selecione o novo horário:</h4>
                                                                {loadingSlots ? (
                                                                    <div className="text-center py-8">
                                                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2d8659] mx-auto"></div>
                                                                        <p className="text-sm text-gray-600 mt-2">Carregando horários disponíveis...</p>
                                                                    </div>
                                                                ) : availableSlots.length === 0 ? (
                                                                    <div className="text-center text-gray-600 py-8">
                                                                        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                                                                        <p className="font-medium">Nenhum horário disponível</p>
                                                                        <p className="text-sm mt-2">Não há horários disponíveis nos próximos 30 dias com a agenda deste profissional.</p>
                                                                        <p className="text-sm mt-2">Entre em contato conosco para mais opções.</p>
                                                                    </div>
                                                                ) : (
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto border rounded-lg p-2">
                                                                        {availableSlots.map((slot, index) => (
                                                                            <button
                                                                                key={index}
                                                                                onClick={() => setSelectedNewSlot(slot)}
                                                                                className={`p-3 text-left rounded-lg border-2 transition-all ${
                                                                                    selectedNewSlot?.date === slot.date && selectedNewSlot?.time === slot.time
                                                                                        ? 'border-[#2d8659] bg-green-50'
                                                                                        : 'border-gray-200 hover:border-[#2d8659] hover:bg-gray-50'
                                                                                }`}
                                                                            >
                                                                                <div className="flex items-center">
                                                                                    <Calendar className="w-4 h-4 mr-2 text-[#2d8659]" />
                                                                                    <span className="text-sm font-medium">{slot.display}</span>
                                                                                </div>
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <DialogFooter>
                                                            <DialogClose asChild>
                                                                <Button variant="outline">Cancelar</Button>
                                                            </DialogClose>
                                                            <Button 
                                                                onClick={confirmReschedule} 
                                                                disabled={!selectedNewSlot}
                                                                className="bg-[#2d8659] hover:bg-[#236b47]"
                                                            >
                                                                Confirmar Reagendamento
                                                            </Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                            )}
                                        </div>
                                        </div>
                                    );
                                })}

                                {/* Paginação */}
                                {totalPages > 1 && (
                                    <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-4">
                                        <div className="text-sm text-gray-600">
                                            Mostrando {startIndex + 1} a {Math.min(endIndex, bookings.length)} de {bookings.length} agendamentos
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => goToPage(1)}
                                                disabled={currentPage === 1}
                                                className="h-8 w-8 p-0"
                                            >
                                                <ChevronsLeft className="h-4 w-4" />
                                            </Button>
                                            
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => goToPage(currentPage - 1)}
                                                disabled={currentPage === 1}
                                                className="h-8 w-8 p-0"
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                            </Button>

                                            <div className="flex items-center gap-1">
                                                {[...Array(totalPages)].map((_, index) => {
                                                    const page = index + 1;
                                                    // Mostrar apenas páginas próximas à atual
                                                    if (
                                                        page === 1 ||
                                                        page === totalPages ||
                                                        (page >= currentPage - 1 && page <= currentPage + 1)
                                                    ) {
                                                        return (
                                                            <Button
                                                                key={page}
                                                                variant={currentPage === page ? "default" : "outline"}
                                                                size="sm"
                                                                onClick={() => goToPage(page)}
                                                                className={`h-8 w-8 p-0 ${
                                                                    currentPage === page 
                                                                        ? 'bg-[#2d8659] hover:bg-[#236b47]' 
                                                                        : ''
                                                                }`}
                                                            >
                                                                {page}
                                                            </Button>
                                                        );
                                                    } else if (
                                                        page === currentPage - 2 ||
                                                        page === currentPage + 2
                                                    ) {
                                                        return <span key={page} className="px-1">...</span>;
                                                    }
                                                    return null;
                                                })}
                                            </div>

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => goToPage(currentPage + 1)}
                                                disabled={currentPage === totalPages}
                                                className="h-8 w-8 p-0"
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => goToPage(totalPages)}
                                                disabled={currentPage === totalPages}
                                                className="h-8 w-8 p-0"
                                            >
                                                <ChevronsRight className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default PacientePage;
