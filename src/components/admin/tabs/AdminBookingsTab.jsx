import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import {
    Calendar,
    List,
    LayoutGrid,
    Filter,
    AlertTriangle,
    Edit,
    Trash2,
    ChevronDown,
    ChevronUp,
    Clock,
    User,
    Mail,
    Phone,
    Video,
    DollarSign,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ClinicalEvolutionCopilotModal } from '@/components/telemedicina/ClinicalEvolutionCopilotModal';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import ConfirmDialog from '@/components/ConfirmDialog';
import { supabase } from '@/lib/customSupabaseClient';
import { secureLog } from '@/lib/secureLogger';
import { updateBookingStatus } from '@/services/bookingService';
import { auditLogger, AuditAction, LogLevel } from '@/lib/auditLogger';
import { bookingEmailManager } from '@/lib/bookingEmailManager';
import { useItemLoadingState } from '@/hooks/useLoadingState';
import { LoadingButton, LoadingSpinner, LoadingInput } from '@/components/LoadingOverlay';

const AppointmentCalendar = lazy(() =>
    import('@/components/admin/AppointmentCalendar').then(m => ({ default: m.AppointmentCalendar }))
);

export const sanitizeCurrencyInput = (value) => {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[^0-9.,-]/g, '');
};

export const parseCurrencyToNumber = (value) => {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const sanitized = sanitizeCurrencyInput(value);
    if (!sanitized) return null;
    const normalized = sanitized.replace(/\./g, '').replace(',', '.');
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
};

export const formatNumberToCurrencyInput = (value) => {
    if (value === null || value === undefined || value === '') return '';
    const numberValue = typeof value === 'string' ? parseCurrencyToNumber(value) : value;
    if (!Number.isFinite(numberValue)) return '';
    return numberValue.toFixed(2).replace('.', ',');
};

export function AdminBookingsTab({
    bookings = [],
    services = [],
    professionals = [],
    userRole = 'admin',
    currentProfessional = null,
    onRefresh,
    onOpenEmergencyModal
}) {
    const { toast } = useToast();
    const { isItemLoading, withItemLoading, isAnyItemLoading } = useItemLoadingState();

    const isAdminView = userRole === 'admin';

    const [bookingView, setBookingView] = useState('list'); // 'list' | 'cards' | 'calendar'
    const [showFilters, setShowFilters] = useState(false);
    const [bookingSortField, setBookingSortField] = useState('default');
    const [bookingSortOrder, setBookingSortOrder] = useState('asc');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [expandedZoomCards, setExpandedZoomCards] = useState({});
    const [selectedCopilotBooking, setSelectedCopilotBooking] = useState(null);

    const [bookingFilters, setBookingFilters] = useState({
        service_id: '',
        professional_id: '',
        status: '',
        date_from: '',
        date_to: '',
        search: ''
    });

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
        meeting_link: '',
        valor_consulta: '',
        valor_repasse_profissional: ''
    });

    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        warningMessage: '',
        type: 'danger',
        onConfirm: () => {}
    });

    const professionalServiceIdSet = useMemo(() => {
        if (!currentProfessional?.services_ids) return new Set();
        return new Set(currentProfessional.services_ids);
    }, [currentProfessional]);

    const handleBookingSort = (field) => {
        if (bookingSortField === field) {
            setBookingSortOrder(bookingSortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setBookingSortField(field);
            setBookingSortOrder(field === 'date' ? 'desc' : 'asc');
        }
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
        setCurrentPage(1);
    };

    const getFilteredBookings = () => {
        return bookings.filter(booking => {
            if (bookingFilters.service_id && booking.service_id !== bookingFilters.service_id) {
                return false;
            }
            if (bookingFilters.professional_id && booking.professional_id !== bookingFilters.professional_id) {
                return false;
            }
            if (bookingFilters.status) {
                const targetStatus = bookingFilters.status.toLowerCase();
                const currentStatus = (booking.status || '').toLowerCase();
                const PENDING_STATUSES = ['pending', 'pending_payment', 'pendente', 'awaiting_payment'];
                const CONFIRMED_STATUSES = ['confirmed', 'paid'];

                if (PENDING_STATUSES.includes(targetStatus)) {
                    if (!PENDING_STATUSES.includes(currentStatus)) return false;
                } else if (targetStatus === 'confirmed') {
                    if (!CONFIRMED_STATUSES.includes(currentStatus)) return false;
                } else {
                    if (currentStatus !== targetStatus) return false;
                }
            }
            if (bookingFilters.date_from && booking.booking_date < bookingFilters.date_from) {
                return false;
            }
            if (bookingFilters.date_to && booking.booking_date > bookingFilters.date_to) {
                return false;
            }
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

    const getSortedBookings = (bookingsToSort) => {
        const statusPriority = {
            'confirmed': 1,
            'paid': 1,
            'pending_payment': 2,
            'pending': 2,
            'awaiting_payment': 2,
            'completed': 3,
            'cancelled_by_patient': 4,
            'cancelled_by_professional': 4,
            'cancelled': 4,
            'expired': 5,
            'no_show_unjustified': 6,
            'refunded': 7,
            'partially_refunded': 7
        };

        const sorted = [...bookingsToSort];

        if (bookingSortField === 'default') {
            return sorted.sort((a, b) => {
                const dateComparison = new Date(b.booking_date) - new Date(a.booking_date);
                if (dateComparison !== 0) return dateComparison;
                return (a.booking_time || '').localeCompare(b.booking_time || '');
            });
        }

        return sorted.sort((a, b) => {
            let comparison = 0;
            switch (bookingSortField) {
                case 'status': {
                    const priorityA = statusPriority[a.status] || 99;
                    const priorityB = statusPriority[b.status] || 99;
                    comparison = priorityA - priorityB;
                    break;
                }
                case 'date': {
                    const dateA = new Date(`${a.booking_date}T${a.booking_time || '00:00'}`);
                    const dateB = new Date(`${b.booking_date}T${b.booking_time || '00:00'}`);
                    comparison = dateA - dateB;
                    break;
                }
                case 'professional': {
                    const profA = professionals.find(p => p.id === a.professional_id)?.name || '';
                    const profB = professionals.find(p => p.id === b.professional_id)?.name || '';
                    comparison = profA.localeCompare(profB);
                    break;
                }
                default:
                    comparison = 0;
            }
            return bookingSortOrder === 'asc' ? comparison : -comparison;
        });
    };

    const getPaginatedBookings = (bookingsList) => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return bookingsList.slice(startIndex, startIndex + itemsPerPage);
    };

    const getTotalPages = (bookingsList) => {
        return Math.max(1, Math.ceil(bookingsList.length / itemsPerPage));
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [bookingFilters, bookingSortField, bookingSortOrder]);

    const calculateTotals = (bookingsList) => {
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
            const amountForStatus = isAdminView ? patientValue : professionalValue;

            totals.totalValue += patientValue;
            totals.totalProfessionalValue += professionalValue;
            totals.totalPlatformFee += platformFee;

            switch (booking.status) {
                case 'confirmed':
                case 'paid':
                    totals.confirmedValue += amountForStatus;
                    break;
                case 'completed':
                case 'no_show_unjustified':
                    totals.completedValue += amountForStatus;
                    break;
                case 'pending':
                case 'pending_payment':
                case 'awaiting_payment':
                    totals.pendingValue += amountForStatus;
                    break;
                case 'cancelled':
                case 'cancelled_by_patient':
                case 'cancelled_by_professional':
                case 'expired':
                case 'refunded':
                case 'partially_refunded':
                    totals.cancelledValue += amountForStatus;
                    break;
                default:
                    break;
            }
        });

        return totals;
    };

    const getStatusLabel = (status) => {
        const labels = {
            'pending': 'Pendente Pagamento',
            'pending_payment': 'Pendente Pagamento',
            'awaiting_payment': 'Aguardando Pagamento',
            'confirmed': 'Confirmado',
            'paid': 'Pago',
            'completed': 'Concluído (Atendido)',
            'cancelled': 'Cancelado',
            'cancelled_by_patient': 'Cancelado pelo Paciente',
            'cancelled_by_professional': 'Cancelado pelo Profissional',
            'expired': 'Expirado',
            'no_show_unjustified': 'Falta Injustificada',
            'refunded': 'Reembolsado',
            'partially_refunded': 'Parcialmente Reembolsado'
        };
        return labels[status] || status;
    };

    const statusColors = {
        'pending': 'bg-amber-50 text-amber-800 border-amber-200/90',
        'pending_payment': 'bg-amber-50 text-amber-800 border-amber-200/90',
        'awaiting_payment': 'bg-amber-50 text-amber-800 border-amber-200/90',
        'confirmed': 'bg-emerald-50 text-emerald-800 border-emerald-200/90',
        'paid': 'bg-emerald-50 text-emerald-800 border-emerald-200/90',
        'completed': 'bg-blue-50 text-blue-800 border-blue-200/90',
        'cancelled': 'bg-rose-50 text-rose-800 border-rose-200/90',
        'cancelled_by_patient': 'bg-rose-50 text-rose-800 border-rose-200/90',
        'cancelled_by_professional': 'bg-slate-100 text-slate-700 border-slate-200',
        'expired': 'bg-slate-100 text-slate-600 border-slate-200',
        'no_show_unjustified': 'bg-amber-100/90 text-amber-900 border-amber-300',
        'refunded': 'bg-purple-50 text-purple-800 border-purple-200/90',
        'partially_refunded': 'bg-purple-50 text-purple-800 border-purple-200/90'
    };

    const handleQuickStatusChange = async (bookingId, newStatus, bookingData) => {
        if (!isAdminView) {
            const allowedStatuses = new Set(['cancelled_by_professional', 'completed', 'no_show_unjustified']);
            if (!allowedStatuses.has(newStatus)) {
                toast({
                    variant: 'destructive',
                    title: 'Ação não permitida',
                    description: 'Profissionais só podem cancelar, marcar falta injustificada ou concluir consultas.'
                });
                return;
            }

            if (newStatus === 'completed' && bookingData.status !== 'confirmed') {
                toast({
                    variant: 'destructive',
                    title: 'Conclua apenas após confirmação',
                    description: 'Uma consulta só pode ser concluída depois de confirmada.'
                });
                return;
            }
        }

        if (newStatus === bookingData.status) return;

        await withItemLoading('status', bookingId, async () => {
            try {
                const cancellationReason = isAdminView ? 'Cancelado pela administração' : 'Cancelado pelo profissional';
                await updateBookingStatus(bookingId, newStatus, {
                    notify: true,
                    bookingData,
                    cancellationReason
                });

                toast({
                    title: 'Status atualizado!',
                    description: `Agendamento marcado como ${getStatusLabel(newStatus)}`
                });

                onRefresh?.();
            } catch (error) {
                secureLog.error('Erro ao atualizar status:', error?.message || error);
                toast({
                    variant: 'destructive',
                    title: 'Erro ao atualizar status',
                    description: error.message
                });
            }
        });
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
                        patient_phone: bookingEditData.patient_phone,
                        meeting_link: bookingEditData.meeting_link?.trim() || null,
                        meeting_start_url: bookingEditData.meeting_link?.trim() || null
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
                    const targetProfId = isAdminView ? bookingEditData.professional_id : editingBooking.professional_id;
                    const profObj = professionals.find(p => p.id === targetProfId);
                    const emailData = {
                        patient_name: bookingEditData.patient_name,
                        patient_email: bookingEditData.patient_email,
                        patient_phone: bookingEditData.patient_phone || editingBooking?.patient_phone,
                        booking_date: bookingEditData.booking_date,
                        booking_time: bookingEditData.booking_time,
                        service_name: selectedService?.name || 'Consulta',
                        professional_name: profObj?.name || 'Profissional',
                        professional_id: targetProfId,
                        user_id: profObj?.user_id,
                        professional_email: profObj?.email,
                        meeting_link: bookingEditData.meeting_link || editingBooking?.meeting_link
                    };

                    if (statusChanged && (bookingEditData.status === 'confirmed' || bookingEditData.status === 'paid')) {
                        await bookingEmailManager.sendPaymentApproved(emailData);
                    }

                    if (statusChanged && (bookingEditData.status.includes('cancelled') || bookingEditData.status === 'no_show_unjustified')) {
                        const reason = bookingEditData.status === 'no_show_unjustified'
                            ? 'Consulta marcada como falta injustificada (sem reembolso)'
                            : (isAdminView ? 'Cancelado pela administração' : 'Cancelado pelo profissional');
                        await bookingEmailManager.sendCancellation(emailData, reason);
                    }

                    if (statusChanged && bookingEditData.status === 'completed') {
                        await bookingEmailManager.sendThankYou(emailData);
                    }

                    if (dateChanged && !bookingEditData.status.includes('cancelled')) {
                        const rescheduleReason = isAdminView ? 'Alterado pela administração' : 'Alterado pelo profissional';
                        await bookingEmailManager.sendRescheduled(emailData, oldDate, oldTime, rescheduleReason);
                    }
                } catch (emailError) {
                    secureLog.error('Erro ao enviar email de atualização de agendamento:', emailError?.message || emailError);
                }

                toast({ title: 'Agendamento atualizado com sucesso!' });
                setEditingBooking(null);
                onRefresh?.();
            } catch (error) {
                secureLog.error('Erro ao atualizar agendamento:', error?.message || error);
                toast({
                    variant: 'destructive',
                    title: 'Erro ao atualizar',
                    description: error.message
                });
            }
        });
    };

    const handleDeleteBooking = (booking) => {
        if (!booking) return;

        const dateLabel = booking.booking_date
            ? new Date(`${booking.booking_date}T00:00:00`).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
            : 'data não informada';
        const timeLabel = booking.booking_time ? `${booking.booking_time}h` : 'horário indefinido';

        const isFinancialOrClinicalRecord = ['confirmed', 'paid', 'completed', 'no_show_unjustified'].includes(
            String(booking.status || '').toLowerCase()
        );
        const warningMessage = isFinancialOrClinicalRecord
            ? 'Por integridade contábil, fiscal (NFS-e) e sigilo clínico, agendamentos pagos/confirmados/concluídos não são excluídos fisicamente — eles serão CANCELADOS preservando o histórico.'
            : '';

        setConfirmDialog({
            isOpen: true,
            title: isFinancialOrClinicalRecord ? 'Cancelar Agendamento (Preservar Histórico)' : 'Excluir Agendamento Pendente',
            message: isFinancialOrClinicalRecord
                ? `Deseja cancelar o agendamento de ${booking.patient_name || 'Paciente'} em ${dateLabel} às ${timeLabel}?`
                : `Deseja excluir o agendamento pendente de ${booking.patient_name || 'Paciente'} em ${dateLabel} às ${timeLabel}?`,
            warningMessage,
            type: 'danger',
            onConfirm: async () => {
                await withItemLoading('delete', booking.id, async () => {
                    if (isFinancialOrClinicalRecord) {
                        const result = await updateBookingStatus(booking.id, 'cancelled', {
                            bookingData: booking,
                            cancellationReason: 'Cancelado pelo administrador (preservação de trilha contábil/fiscal)'
                        });
                        if (result?.error) {
                            secureLog.error('Erro ao cancelar agendamento:', result.error?.message || result.error);
                            toast({ variant: 'destructive', title: 'Erro ao cancelar agendamento', description: result.error?.message || 'Falha ao cancelar.' });
                            return;
                        }
                        await auditLogger.log(AuditAction.BOOKING_CANCEL, {
                            level: LogLevel.WARNING,
                            resourceType: 'booking',
                            resourceId: booking.id,
                            details: { previous_status: booking.status, method: 'soft_delete_cancel' }
                        });
                        toast({ title: 'Agendamento cancelado com histórico preservado!' });
                        onRefresh?.();
                        return;
                    }

                    const { error } = await supabase.from('bookings').delete().eq('id', booking.id);
                    if (error) {
                        secureLog.error('Erro ao excluir agendamento:', error?.message || error);
                        toast({ variant: 'destructive', title: 'Erro ao excluir agendamento', description: error.message });
                        return;
                    }
                    await auditLogger.log(AuditAction.BOOKING_DELETE, {
                        level: LogLevel.WARNING,
                        resourceType: 'booking',
                        resourceId: booking.id,
                        details: { previous_status: booking.status }
                    });
                    toast({ title: 'Agendamento excluído com sucesso!' });
                    onRefresh?.();
                });
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const toggleZoomExpansion = (bookingId) => {
        setExpandedZoomCards(prev => ({
            ...prev,
            [bookingId]: !prev[bookingId]
        }));
    };

    const filteredBookings = getFilteredBookings();
    const sortedBookings = getSortedBookings(filteredBookings);
    const paginatedBookings = getPaginatedBookings(sortedBookings);
    const totalPages = getTotalPages(sortedBookings);
    const filteredTotals = calculateTotals(filteredBookings);

    const quickStatusOptions = [
        { value: 'pending_payment', label: 'Pendente Pagamento' },
        { value: 'confirmed', label: 'Confirmado' },
        { value: 'completed', label: 'Concluído' },
        { value: 'cancelled_by_patient', label: 'Cancelado pelo Paciente' },
        { value: 'cancelled_by_professional', label: 'Cancelado pelo Profissional' },
        { value: 'no_show_unjustified', label: 'Falta Injustificada' }
    ];

    return (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-4 sm:p-6 space-y-5 font-sans">
            {/* Header e Toolbar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 tracking-tight">
                        <Calendar className="w-5 h-5 text-slate-900" />
                        Gestão Operacional de Agendamentos
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Filtre, ordene e gerencie todas as consultas em tempo real com controle financeiro.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200/80 text-xs">
                        <button
                            onClick={() => setBookingView('list')}
                            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-semibold text-xs ${
                                bookingView === 'list' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <List className="w-3.5 h-3.5" /> Tabela
                        </button>
                        <button
                            onClick={() => setBookingView('cards')}
                            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-semibold text-xs ${
                                bookingView === 'cards' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <LayoutGrid className="w-3.5 h-3.5" /> Cards
                        </button>
                        <button
                            onClick={() => setBookingView('calendar')}
                            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-semibold text-xs ${
                                bookingView === 'calendar' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <Calendar className="w-3.5 h-3.5" /> Calendário
                        </button>
                    </div>

                    <Button
                        onClick={() => setShowFilters(!showFilters)}
                        variant="outline"
                        size="sm"
                        className="text-xs h-8 border-slate-200 text-slate-700 hover:bg-slate-50"
                    >
                        <Filter className="w-3.5 h-3.5 mr-1 text-slate-500" />
                        {showFilters ? 'Ocultar Filtros' : 'Filtros Avançados'}
                        {(() => {
                            const activeCount = Object.values(bookingFilters).filter(v => v !== '').length;
                            return activeCount > 0 ? (
                                <span className="ml-1.5 bg-slate-900 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                                    {activeCount}
                                </span>
                            ) : null;
                        })()}
                    </Button>

                    {isAdminView && onOpenEmergencyModal && (
                        <Button
                            onClick={onOpenEmergencyModal}
                            variant="outline"
                            size="sm"
                            className="text-xs h-8 border-slate-200 text-slate-700 hover:bg-slate-50 font-bold"
                        >
                            <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-500" />
                            Encaixe de Urgência
                        </Button>
                    )}
                </div>
            </div>

            {/* Pipeline Status Bar */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-wrap lg:flex-nowrap items-center justify-between gap-4 text-xs">
                {isAdminView && (
                    <div className="flex items-center gap-1.5 border-r border-slate-200 pr-4">
                        <span className="text-slate-500">Valor Grade:</span>
                        <span className="font-extrabold text-slate-900 tabular-nums">
                            R$ {filteredTotals.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                )}
                <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-medium">A Receber:</span>
                    <span className="font-bold text-blue-700 tabular-nums">
                        R$ {filteredTotals.confirmedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-medium">Recebidos:</span>
                    <span className="font-bold text-emerald-700 tabular-nums">
                        R$ {filteredTotals.completedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-medium">Pendentes:</span>
                    <span className="font-bold text-amber-700 tabular-nums">
                        R$ {filteredTotals.pendingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>
                {filteredTotals.cancelledValue > 0 && (
                    <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 font-medium">Cancelados:</span>
                        <span className="font-bold text-rose-700 tabular-nums">
                            R$ {filteredTotals.cancelledValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                )}
            </div>

            {/* Sorting bar */}
            {bookingView !== 'calendar' && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/70 p-2.5 rounded-xl border border-slate-200/80 text-xs">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <span className="text-slate-500 font-bold text-[11px] whitespace-nowrap">Ordenar por:</span>
                        <div className="flex flex-wrap gap-1">
                            <Button
                                onClick={() => handleBookingSort('default')}
                                variant="ghost"
                                size="sm"
                                className={`h-7 px-2.5 text-xs rounded-lg ${bookingSortField === 'default' ? 'bg-slate-900 text-white font-semibold shadow-xs' : 'text-slate-600 hover:bg-slate-200'}`}
                            >
                                Padrão
                            </Button>
                            <Button
                                onClick={() => handleBookingSort('status')}
                                variant="ghost"
                                size="sm"
                                className={`h-7 px-2.5 text-xs rounded-lg ${bookingSortField === 'status' ? 'bg-slate-900 text-white font-semibold shadow-xs' : 'text-slate-600 hover:bg-slate-200'}`}
                            >
                                Status {bookingSortField === 'status' && (bookingSortOrder === 'asc' ? '↑' : '↓')}
                            </Button>
                            <Button
                                onClick={() => handleBookingSort('date')}
                                variant="ghost"
                                size="sm"
                                className={`h-7 px-2.5 text-xs rounded-lg ${bookingSortField === 'date' ? 'bg-slate-900 text-white font-semibold shadow-xs' : 'text-slate-600 hover:bg-slate-200'}`}
                            >
                                Data {bookingSortField === 'date' && (bookingSortOrder === 'asc' ? '↑' : '↓')}
                            </Button>
                            {isAdminView && (
                                <Button
                                    onClick={() => handleBookingSort('professional')}
                                    variant="ghost"
                                    size="sm"
                                    className={`h-7 px-2.5 text-xs rounded-lg ${bookingSortField === 'professional' ? 'bg-slate-900 text-white font-semibold shadow-xs' : 'text-slate-600 hover:bg-slate-200'}`}
                                >
                                    Profissional {bookingSortField === 'professional' && (bookingSortOrder === 'asc' ? '↑' : '↓')}
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <span className="text-[11px] text-slate-500">Exibir:</span>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => {
                                setItemsPerPage(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="bg-white border border-slate-200 rounded-lg text-xs py-1 px-2 font-bold text-slate-700"
                        >
                            <option value="10">10 por página</option>
                            <option value="20">20 por página</option>
                            <option value="50">50 por página</option>
                        </select>
                    </div>
                </div>
            )}

            {/* Painel de Filtros Avançados */}
            {showFilters && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                        {isAdminView && (
                            <div>
                                <label className="block text-xs font-medium mb-1 text-gray-600">Profissional</label>
                                <select
                                    value={bookingFilters.professional_id}
                                    onChange={(e) => setBookingFilters({ ...bookingFilters, professional_id: e.target.value })}
                                    className="w-full input text-sm"
                                >
                                    <option value="">Todos os profissionais</option>
                                    {professionals.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-medium mb-1 text-gray-600">Serviço</label>
                            <select
                                value={bookingFilters.service_id}
                                onChange={(e) => setBookingFilters({ ...bookingFilters, service_id: e.target.value })}
                                className="w-full input text-sm"
                            >
                                <option value="">Todos os serviços</option>
                                {services.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
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
                                <option value="no_show_unjustified">Falta Injustificada</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1 text-gray-600">De</label>
                            <input
                                type="date"
                                value={bookingFilters.date_from}
                                onChange={(e) => setBookingFilters({ ...bookingFilters, date_from: e.target.value })}
                                className="w-full input text-sm"
                            />
                        </div>
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
                    <div className="mt-4 flex justify-end">
                        <Button onClick={clearFilters} variant="outline" size="sm" className="text-gray-600 hover:text-gray-800">
                            Limpar Filtros
                        </Button>
                    </div>
                </div>
            )}

            {/* Conteúdo: Tabela vs Cards vs Calendário */}
            {bookingView === 'calendar' ? (
                <Suspense fallback={<div className="p-8 flex justify-center items-center"><LoadingSpinner size="md" className="text-slate-800" /></div>}>
                    <AppointmentCalendar
                        bookings={filteredBookings}
                        professionals={professionals}
                        services={services}
                        userRole={userRole}
                    />
                </Suspense>
            ) : (
                <>
                    {bookings.length === 0 ? (
                        <div className="text-center py-12">
                            <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                            <p className="text-gray-500 text-lg">Nenhum agendamento encontrado</p>
                        </div>
                    ) : filteredBookings.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500 text-lg mb-2">Nenhum agendamento encontrado com os filtros aplicados</p>
                            <Button onClick={clearFilters} variant="outline" className="mt-4">
                                Limpar Filtros
                            </Button>
                        </div>
                    ) : bookingView === 'list' ? (
                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left text-slate-700">
                                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                                        <tr>
                                            <th className="p-3">Data & Horário</th>
                                            <th className="p-3">Paciente</th>
                                            <th className="p-3">Profissional & Serviço</th>
                                            <th className="p-3">Financeiro</th>
                                            <th className="p-3">Status</th>
                                            <th className="p-3 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {paginatedBookings.map((b) => {
                                            const patientValue = Number(b.valor_consulta ?? b.service?.price ?? 0) || 0;
                                            const professionalValue = Number(
                                                b.valor_repasse_profissional ?? b.service?.professional_payout ?? b.valor_consulta ?? patientValue
                                            ) || 0;
                                            const platformFee = Math.max(patientValue - professionalValue, 0);

                                            return (
                                                <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="p-3 whitespace-nowrap">
                                                        <span className="font-bold text-slate-900 block tabular-nums">
                                                            {new Date(`${b.booking_date}T00:00:00`).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                                        </span>
                                                        <span className="text-slate-500 text-[11px] flex items-center gap-1">
                                                            <Clock className="w-3 h-3 text-slate-400" /> {b.booking_time}h
                                                        </span>
                                                    </td>
                                                    <td className="p-3">
                                                        <span className="font-semibold text-slate-900 block">{b.patient_name || 'Paciente'}</span>
                                                        {b.patient_email && <span className="text-slate-500 text-[11px] block">{b.patient_email}</span>}
                                                        {b.patient_phone && <span className="text-slate-500 text-[11px] block">{b.patient_phone}</span>}
                                                    </td>
                                                    <td className="p-3">
                                                        <span className="font-medium text-slate-800 block">
                                                            {b.service?.name || services.find(s => s.id === b.service_id)?.name || 'Consulta'}
                                                        </span>
                                                        <span className="text-slate-500 text-[11px]">
                                                            {professionals.find(p => p.id === b.professional_id)?.name || 'Profissional'}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 whitespace-nowrap">
                                                        {isAdminView ? (
                                                            <div>
                                                                <span className="font-bold text-slate-900 tabular-nums">R$ {patientValue.toFixed(2)}</span>
                                                                <span className="text-slate-400 block text-[10px] tabular-nums">
                                                                    Repasse: R$ {professionalValue.toFixed(2)} | Taxa: R$ {platformFee.toFixed(2)}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <span className="font-bold text-emerald-700 tabular-nums">R$ {professionalValue.toFixed(2)}</span>
                                                                <span className="text-slate-400 block text-[10px]">Repasse Líquido</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-3 whitespace-nowrap">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusColors[b.status] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                                                            {getStatusLabel(b.status)}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-right whitespace-nowrap">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <Link
                                                                to={`/sala-espera/${b.id}`}
                                                                title="Entrar na Sala de Teleconsulta"
                                                                className="inline-flex items-center justify-center h-7 w-7 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-2xs"
                                                            >
                                                                <Video className="w-3.5 h-3.5" />
                                                            </Link>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                title="Copiloto IA: Evolução Clínica (CFP)"
                                                                className="h-7 w-7 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                                                                onClick={() => setSelectedCopilotBooking(b)}
                                                            >
                                                                <Sparkles className="w-3.5 h-3.5" />
                                                            </Button>
                                                            <select
                                                                value={b.status}
                                                                onChange={(e) => handleQuickStatusChange(b.id, e.target.value, b)}
                                                                className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-1 font-medium text-slate-700"
                                                                disabled={isItemLoading('status', b.id)}
                                                            >
                                                                {quickStatusOptions.map(opt => (
                                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                                ))}
                                                            </select>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-7 w-7"
                                                                onClick={() => {
                                                                    setEditingBooking(b);
                                                                    setBookingEditData({
                                                                        booking_date: b.booking_date,
                                                                        booking_time: b.booking_time,
                                                                        status: b.status,
                                                                        professional_id: b.professional_id || '',
                                                                        service_id: b.service_id || '',
                                                                        patient_name: b.patient_name || '',
                                                                        patient_email: b.patient_email || '',
                                                                        patient_phone: b.patient_phone || '',
                                                                        meeting_link: b.meeting_link || '',
                                                                        valor_consulta: formatNumberToCurrencyInput(b.valor_consulta ?? ''),
                                                                        valor_repasse_profissional: formatNumberToCurrencyInput(b.valor_repasse_profissional ?? '')
                                                                    });
                                                                }}
                                                            >
                                                                <Edit className="w-3.5 h-3.5 text-blue-600" />
                                                            </Button>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-7 w-7 hover:bg-red-50"
                                                                onClick={() => handleDeleteBooking(b)}
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        /* Cards View */
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {paginatedBookings.map((b) => {
                                const patientValue = Number(b.valor_consulta ?? b.service?.price ?? 0) || 0;
                                const professionalValue = Number(
                                    b.valor_repasse_profissional ?? b.service?.professional_payout ?? b.valor_consulta ?? patientValue
                                ) || 0;

                                return (
                                    <div key={b.id} className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-slate-900 text-sm">{b.patient_name || 'Paciente'}</h3>
                                                <p className="text-xs text-slate-500">
                                                    {b.service?.name || services.find(s => s.id === b.service_id)?.name || 'Consulta'}
                                                </p>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusColors[b.status] || 'bg-gray-100 text-gray-800'}`}>
                                                {getStatusLabel(b.status)}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-4 text-xs text-slate-600 border-t border-slate-100 pt-2">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                                <span className="tabular-nums">{new Date(`${b.booking_date}T00:00:00`).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5 text-slate-500" />
                                                <span className="tabular-nums">{b.booking_time}h</span>
                                            </span>
                                            <span className="font-bold text-slate-900 ml-auto tabular-nums">
                                                {isAdminView ? `R$ ${patientValue.toFixed(2)}` : `R$ ${professionalValue.toFixed(2)}`}
                                            </span>
                                        </div>

                                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                                            <Link
                                                to={`/sala-espera/${b.id}`}
                                                className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-bold hover:underline bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200"
                                            >
                                                <Video className="w-3.5 h-3.5" /> Entrar na Sala
                                            </Link>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setSelectedCopilotBooking(b)}
                                                className="text-xs text-emerald-700 hover:bg-emerald-50 font-bold gap-1 h-7"
                                            >
                                                <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Evolução IA (CFP)
                                            </Button>
                                        </div>

                                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                                            <select
                                                value={b.status}
                                                onChange={(e) => handleQuickStatusChange(b.id, e.target.value, b)}
                                                className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-1 font-medium text-slate-700"
                                            >
                                                {quickStatusOptions.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    setEditingBooking(b);
                                                    setBookingEditData({
                                                        booking_date: b.booking_date,
                                                        booking_time: b.booking_time,
                                                        status: b.status,
                                                        professional_id: b.professional_id || '',
                                                        service_id: b.service_id || '',
                                                        patient_name: b.patient_name || '',
                                                        patient_email: b.patient_email || '',
                                                        patient_phone: b.patient_phone || '',
                                                        meeting_link: b.meeting_link || '',
                                                        valor_consulta: formatNumberToCurrencyInput(b.valor_consulta ?? ''),
                                                        valor_repasse_profissional: formatNumberToCurrencyInput(b.valor_repasse_profissional ?? '')
                                                    });
                                                }}
                                            >
                                                Editar
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => handleDeleteBooking(b)}
                                            >
                                                Excluir
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Paginação */}
                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-2 mt-6 pt-4 border-t">
                            <Button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                variant="outline"
                                size="sm"
                            >
                                ← Anterior
                            </Button>
                            <span className="text-xs font-bold text-slate-600">
                                Página {currentPage} de {totalPages}
                            </span>
                            <Button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                variant="outline"
                                size="sm"
                            >
                                Próxima →
                            </Button>
                        </div>
                    )}
                </>
            )}

            {/* Modal de Edição de Agendamento */}
            {editingBooking && (
                <Dialog open={Boolean(editingBooking)} onOpenChange={(open) => !open && setEditingBooking(null)}>
                    <DialogContent className="max-w-xl">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Edit className="w-5 h-5 text-slate-800" /> Editar Agendamento
                            </DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 text-xs">
                            <div>
                                <label className="block font-medium mb-1 text-slate-700">Nome do Paciente *</label>
                                <input
                                    type="text"
                                    value={bookingEditData.patient_name}
                                    onChange={e => setBookingEditData({ ...bookingEditData, patient_name: e.target.value })}
                                    className="w-full input"
                                    readOnly={!isAdminView}
                                />
                            </div>
                            {isAdminView && (
                                <>
                                    <div>
                                        <label className="block font-medium mb-1 text-slate-700">Email</label>
                                        <input
                                            type="email"
                                            value={bookingEditData.patient_email}
                                            onChange={e => setBookingEditData({ ...bookingEditData, patient_email: e.target.value })}
                                            className="w-full input"
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-medium mb-1 text-slate-700">Telefone</label>
                                        <input
                                            type="tel"
                                            value={bookingEditData.patient_phone}
                                            onChange={e => setBookingEditData({ ...bookingEditData, patient_phone: e.target.value })}
                                            className="w-full input"
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-medium mb-1 text-slate-700">Status *</label>
                                        <select
                                            value={bookingEditData.status}
                                            onChange={e => setBookingEditData({ ...bookingEditData, status: e.target.value })}
                                            className="w-full input"
                                        >
                                            {quickStatusOptions.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block font-medium mb-1 text-slate-700">Profissional *</label>
                                        <select
                                            value={bookingEditData.professional_id}
                                            onChange={e => setBookingEditData({ ...bookingEditData, professional_id: e.target.value })}
                                            className="w-full input"
                                        >
                                            {professionals.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            )}
                            <div>
                                <label className="block font-medium mb-1 text-slate-700">Serviço *</label>
                                <select
                                    value={bookingEditData.service_id}
                                    onChange={e => setBookingEditData({ ...bookingEditData, service_id: e.target.value })}
                                    className="w-full input"
                                >
                                    {services.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block font-medium mb-1 text-slate-700">Data *</label>
                                <input
                                    type="date"
                                    value={bookingEditData.booking_date}
                                    onChange={e => setBookingEditData({ ...bookingEditData, booking_date: e.target.value })}
                                    className="w-full input"
                                />
                            </div>
                            <div>
                                <label className="block font-medium mb-1 text-slate-700">Horário *</label>
                                <input
                                    type="time"
                                    value={bookingEditData.booking_time}
                                    onChange={e => setBookingEditData({ ...bookingEditData, booking_time: e.target.value })}
                                    className="w-full input"
                                />
                            </div>
                            {isAdminView && (
                                <>
                                    <div>
                                        <label className="block font-medium mb-1 text-slate-700">Valor Consulta (R$)</label>
                                        <input
                                            type="text"
                                            value={bookingEditData.valor_consulta}
                                            onChange={e => setBookingEditData({ ...bookingEditData, valor_consulta: sanitizeCurrencyInput(e.target.value) })}
                                            className="w-full input"
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-medium mb-1 text-slate-700">Repasse Profissional (R$)</label>
                                        <input
                                            type="text"
                                            value={bookingEditData.valor_repasse_profissional}
                                            onChange={e => setBookingEditData({ ...bookingEditData, valor_repasse_profissional: sanitizeCurrencyInput(e.target.value) })}
                                            className="w-full input"
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditingBooking(null)}>Cancelar</Button>
                            <LoadingButton
                                isLoading={isItemLoading('edit', editingBooking.id)}
                                loadingText="Salvando..."
                                onClick={handleUpdateBooking}
                                className="bg-slate-900 hover:bg-slate-800 text-white"
                            >
                                Salvar Alterações
                            </LoadingButton>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmDialog.onConfirm}
                title={confirmDialog.title}
                message={confirmDialog.message}
                warningMessage={confirmDialog.warningMessage}
                type={confirmDialog.type}
            />

            <ClinicalEvolutionCopilotModal
                isOpen={Boolean(selectedCopilotBooking)}
                onClose={() => setSelectedCopilotBooking(null)}
                booking={selectedCopilotBooking}
                professional={currentProfessional || professionals.find(p => p.id === selectedCopilotBooking?.professional_id)}
                onSaved={onRefresh}
            />
        </div>
    );
}

export default AdminBookingsTab;
