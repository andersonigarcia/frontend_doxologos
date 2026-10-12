

import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { StrategicCockpitModule } from '@/components/admin/StrategicCockpitModule';
import { FinancialControlModule } from '@/components/admin/FinancialControlModule';
import { SystemSettingsManager } from '@/components/admin/SystemSettingsManager';
import { PatientAnalyticsDashboard } from '@/components/admin/PatientAnalyticsDashboard';
import { useAdminData } from '@/hooks/useAdminData';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, LogOut, Briefcase, Trash2, Edit, Users, UserPlus, CalendarX, Star, Check, ShieldOff, MessageCircle, DollarSign, Loader2, ChevronDown, ChevronUp, ShieldCheck, Stethoscope, UserCircle, Menu, X, Ticket, TrendingUp, LayoutDashboard, Activity, List, LayoutGrid, Settings, Newspaper, Filter, AlertTriangle, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DoxologosLogo from '@/components/brand/DoxologosLogo';
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
import { updateBookingStatus } from '@/services/bookingService';
import { secureLog } from '@/lib/secureLogger';
import { useLoadingState, useItemLoadingState } from '@/hooks/useLoadingState';
import { LoadingOverlay, LoadingButton, LoadingSpinner, LoadingInput } from '@/components/LoadingOverlay';
import UserBadge from '@/components/UserBadge';
import { ChangePasswordModal } from '@/components/auth/ChangePasswordModal';
import { SecurityPasswordBanner } from '@/components/auth/SecurityPasswordBanner';
const EventRegistrationsDashboard = lazy(() => import('@/components/admin/EventRegistrationsDashboard'));
const BlogManagementDashboard = lazy(() => import('@/components/admin/BlogManagementDashboard'));
const BookResourcesAdminSection = lazy(() => import('@/components/admin/BookResourcesAdminSection'));
const AssessmentLeadsSection = lazy(() => import('@/components/admin/AssessmentLeadsSection'));
// Fase 5 - Dashboard Profissional
import ProfessionalListPage from '@/pages/admin/ProfessionalListPage';
import {
    AdminBookingsTab,
    AdminEventsTab,
    AdminServicesTab,
    AdminProfessionalsTab,
    AdminPaymentsTab,
    AdminTestimonialsTab
} from '@/components/admin/tabs';

import { DashboardCard } from '@/components/shared/DashboardCard';
import { StatCard } from '@/components/common/StatCard';
import { TimelineView } from '@/components/common/TimelineView';
import { QuickActions } from '@/components/common/QuickActions';
const RevenueChart = lazy(() => import('@/components/admin/RevenueChart').then(m => ({ default: m.RevenueChart })));
const AppointmentCalendar = lazy(() => import('@/components/admin/AppointmentCalendar').then(m => ({ default: m.AppointmentCalendar })));
const PatientList = lazy(() => import('@/components/admin/PatientList').then(m => ({ default: m.PatientList })));
const PatientDetailsModal = lazy(() => import('@/components/admin/PatientDetailsModal').then(m => ({ default: m.PatientDetailsModal })));
const FinancialDashboard = lazy(() => import('@/components/admin/FinancialDashboard').then(m => ({ default: m.FinancialDashboard })));
const ProfessionalPaymentsList = lazy(() => import('@/components/admin/ProfessionalPaymentsList').then(m => ({ default: m.ProfessionalPaymentsList })));
const PaymentFormModal = lazy(() => import('@/components/admin/PaymentFormModal').then(m => ({ default: m.PaymentFormModal })));
const PaymentDetailsModal = lazy(() => import('@/components/admin/PaymentDetailsModal').then(m => ({ default: m.PaymentDetailsModal })));
const ProfitLossDashboard = lazy(() => import('@/components/admin/ProfitLossDashboard').then(m => ({ default: m.ProfitLossDashboard })));
const LedgerTable = lazy(() => import('@/components/admin/LedgerTable').then(m => ({ default: m.LedgerTable })));
const LedgerStats = lazy(() => import('@/components/admin/LedgerStats').then(m => ({ default: m.LedgerStats })));
const LedgerCharts = lazy(() => import('@/components/admin/LedgerCharts').then(m => ({ default: m.LedgerCharts })));
const DashboardGrowth = lazy(() => import('@/components/admin/growth/DashboardGrowth').then(m => ({ default: m.DashboardGrowth })));
const AvailabilityManager = lazy(() => import('@/components/admin/availability/AvailabilityManager').then(m => ({ default: m.AvailabilityManager })));
const CostFormModal = lazy(() => import('@/components/admin/CostFormModal').then(m => ({ default: m.CostFormModal })));
const RefundRequestDashboard = lazy(() => import('@/components/admin/RefundRequestDashboard'));
const NfseResilienceDashboard = lazy(() => import('@/components/admin/NfseResilienceDashboard'));
import { ProtectedAction } from '@/components/auth/ProtectedAction';
import { EmergencyBookingModal } from '@/components/admin/EmergencyBookingModal';
import { auditLogger, AuditAction } from '@/lib/auditLogger';
import { useProfessionalStats } from '@/hooks/useProfessionalStats';
import { useMonthlyRevenue } from '@/hooks/useMonthlyRevenue';
import { usePatientData } from '@/hooks/usePatientData';
import { cn } from '@/lib/utils';
import { tabsConfig } from '@/config/tabsConfig';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const SettingsToggle = () => {
    const { settings, updateSetting, loading, error } = useSystemSettings();

    if (loading) return <div className="text-sm text-gray-500">Carregando configurações...</div>;
    if (error) return <div className="text-sm text-red-500">Não foi possível carregar configurações.</div>;

    return (
        <div className="flex items-center space-x-2">
            <Switch
                id="lead-magnet-toggle"
                checked={settings.lead_magnet_enabled ?? false}
                onCheckedChange={(checked) => updateSetting('lead_magnet_enabled', checked)}
            />
            <Label htmlFor="lead-magnet-toggle" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Ativar Isca Digital (Guia de Ansiedade)
            </Label>
        </div>
    );
};


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
    const [isEmergencyBookingModalOpen, setIsEmergencyBookingModalOpen] = useState(false);

    // P-03: Dados e fetching centralizados no hook useAdminData
    const {
        bookings, services, professionals, availability,
        blockedDates, events, reviews, loading,
        selectedAvailProfessional, setSelectedAvailProfessional,
        refreshData: fetchAllData,
    } = useAdminData({ user, userRole });
    const [isSavingProfessionalProfile, setIsSavingProfessionalProfile] = useState(false);
    const [passwordFormData, setPasswordFormData] = useState({ newPassword: '', confirmPassword: '' });
    const [isSavingPassword, setIsSavingPassword] = useState(false);

    const [isEditingService, setIsEditingService] = useState(false);
    const [serviceFormData, setServiceFormData] = useState({ id: null, name: '', price: '', professional_payout: '', duration_minutes: '50' });

    const [isEditingProfessional, setIsEditingProfessional] = useState(false);
    const [professionalFormData, setProfessionalFormData] = useState({ id: null, name: '', services_ids: [], email: '', password: '', mini_curriculum: '', description: '', image_url: '', whatsapp: '', phone: '' });


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
        ativo: true,
        // Financial split fields
        platform_fee_type: 'percentage',
        platform_fee_value: 20.00
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
    const [activeModule, setActiveModule] = useState('cockpit');
    const [activeTab, setActiveTab] = useState('dashboard');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [bookingView, setBookingView] = useState('list'); // 'list' ou 'calendar'
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [expandedZoomCards, setExpandedZoomCards] = useState({});

    const currentProfessional = useMemo(() => {
        if (!user) return null;
        return professionals.find((prof) => prof?.user_id === user.id || prof?.id === user.id) || null;
    }, [professionals, user]);

    const isAdminView = userRole === 'admin';
    const isProfessionalView = false;

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
    }, [userRole, activeTab]);

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
                        services_ids: currentProfessional.services_ids || prev.services_ids || [],
                        whatsapp: currentProfessional.whatsapp || prev.whatsapp || '',
                        phone: currentProfessional.phone || prev.phone || ''
                    };
                }
                return {
                    ...currentProfessional,
                    password: '',
                    services_ids: currentProfessional.services_ids || [],
                    whatsapp: currentProfessional.whatsapp || '',
                    phone: currentProfessional.phone || ''
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
                    services_ids: Array.isArray(profData.services_ids) ? profData.services_ids : [],
                    whatsapp: profData.whatsapp || profData.phone || '',
                    phone: profData.phone || profData.whatsapp || ''
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
                    user_id: createdUserId,
                    whatsapp: profData.whatsapp || profData.phone || '',
                    phone: profData.phone || profData.whatsapp || ''
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

    const handleSaveAvailability = async (options = {}) => {
        const replicateMonths = options?.replicateMonths || false;
        const professionalId = userRole === 'admin'
            ? selectedAvailProfessional
            : selectedAvailProfessional || professionals[0]?.id;

        if (!professionalId) {
            toast({ variant: "destructive", title: "Erro", description: "Selecione um profissional." });
            return;
        }

        await withLoading('saveAvailability', async () => {
            try {
                // Determina a lista de [mês, ano] para salvar (1 mês ou 3 meses se replicateMonths = true)
                const targetPeriods = [];
                if (replicateMonths) {
                    for (let i = 0; i < 3; i++) {
                        let m = selectedMonth + i;
                        let y = selectedYear;
                        if (m > 12) {
                            m = m - 12;
                            y = y + 1;
                        }
                        targetPeriods.push({ month: m, year: y });
                    }
                } else {
                    targetPeriods.push({ month: selectedMonth, year: selectedYear });
                }

                const monthNames = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

                for (const period of targetPeriods) {
                    // 1. Deletar registros existentes para este profissional no mês/ano específico
                    const { error: deleteError } = await supabase
                        .from('availability')
                        .delete()
                        .eq('professional_id', professionalId)
                        .eq('month', period.month)
                        .eq('year', period.year);

                    if (deleteError) {
                        secureLog.error('Erro ao limpar disponibilidade existente:', deleteError?.message || deleteError);
                        toast({ variant: "destructive", title: "Erro ao atualizar disponibilidade", description: deleteError.message });
                        return;
                    }

                    // 2. Montar lista de inserção com horários limpos e normalizados (08:00)
                    const availabilityToInsert = [];
                    for (const day in professionalAvailability) {
                        const times = professionalAvailability[day];
                        if (times && times.length > 0) {
                            const validTimes = times
                                .filter(time => time && typeof time === 'string' && time.trim() !== '')
                                .map(time => {
                                    const trimmed = time.trim();
                                    return trimmed.length === 4 ? `0${trimmed}` : trimmed;
                                })
                                .filter((time, index, array) => array.indexOf(time) === index); // Remove duplicatas

                            if (validTimes.length > 0) {
                                availabilityToInsert.push({
                                    professional_id: professionalId,
                                    day_of_week: day,
                                    available_times: validTimes,
                                    month: period.month,
                                    year: period.year
                                });
                            }
                        }
                    }

                    // 3. Inserir novos registros
                    if (availabilityToInsert.length > 0) {
                        const { error: insertError } = await supabase
                            .from('availability')
                            .insert(availabilityToInsert);

                        if (insertError) {
                            secureLog.error('Erro ao inserir disponibilidade:', insertError?.message || insertError);
                            toast({ variant: "destructive", title: "Erro ao salvar disponibilidade", description: insertError.message });
                            return;
                        }
                    }
                }

                if (replicateMonths) {
                    toast({
                        title: '🚀 Agenda replicada com sucesso!',
                        description: `Sua disponibilidade foi salva e replicada para os próximos 3 meses.`
                    });
                } else {
                    toast({
                        title: 'Disponibilidade salva!',
                        description: `Agenda de ${monthNames[selectedMonth]}/${selectedYear} atualizada com sucesso.`
                    });
                }

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
                const cancellationReason = isAdminUser ? 'Cancelado pela administração' : 'Cancelado pelo profissional';
                await updateBookingStatus(bookingId, newStatus, {
                    notify: true,
                    bookingData,
                    cancellationReason
                });

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
            'pending': 'Pendente Pagamento',
            'pending_payment': 'Pendente Pagamento',
            'awaiting_payment': 'Aguardando Pagamento',
            'confirmed': 'Confirmado',
            'paid': 'Pago',
            'completed': 'Concluído (Atendido)',
            'cancelled': 'Cancelado',
            'cancelled_by_patient': 'Cancelado pelo Paciente',
            'cancelled_by_professional': 'Cancelado pelo Profissional',
            'expired': 'Expirado (Sem Pagamento)',
            'no_show_unjustified': 'Falta Injustificada',
            'refunded': 'Reembolsado',
            'partially_refunded': 'Parcialmente Reembolsado'
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

            // Filtro por status (normalizando equivalências de status)
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
                    if (currentStatus !== targetStatus) {
                        return false;
                    }
                }
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
                case 'paid':
                    totals.confirmedValue += amountForStatus;
                    break;
                case 'completed':
                case 'no_show_unjustified':
                    // Falta injustificada do paciente: receita retida e repasse devido ao profissional
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

    const totals = useMemo(() => {
        return calculateTotals(bookings || []);
    }, [bookings, userRole]);

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
                image_url: '',
                personal_meet_link: '',
                whatsapp: '',
                phone: ''
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
            services_ids: prof.services_ids || [],
            whatsapp: prof.whatsapp || '',
            phone: prof.phone || ''
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
            result = await supabase
                .from('eventos')
                .insert([sanitizedEventData])
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

        toast({ title: `Evento ${isEditingEvent ? 'atualizado' : 'criado'} com sucesso!` });
        resetEventForm();
        fetchAllData();
    };
    const resetEventForm = () => {
        // Helper: gera datetime-local padrão inteligente
        const getSmartDefaultDateTime = (hoursFromNow = 0, roundToNext = 'hour') => {
            const now = new Date();
            now.setHours(now.getHours() + hoursFromNow);

            // Arredondar para próxima hora ou meia hora
            if (roundToNext === 'hour') {
                now.setMinutes(0, 0, 0);
                now.setHours(now.getHours() + 1); // Próxima hora cheia
            } else if (roundToNext === 'halfhour') {
                const minutes = now.getMinutes();
                if (minutes < 30) {
                    now.setMinutes(30, 0, 0);
                } else {
                    now.setMinutes(0, 0, 0);
                    now.setHours(now.getHours() + 1);
                }
            }

            return now.toISOString().slice(0, 16);
        };

        // Valores padrão inteligentes
        const defaultDataInicio = getSmartDefaultDateTime(24, 'hour'); // Amanhã, próxima hora cheia
        const defaultDataFim = getSmartDefaultDateTime(26, 'hour'); // 2h depois do início
        const defaultDataLimiteInscricao = getSmartDefaultDateTime(23, 'hour'); // 1h antes do evento
        const defaultDataInicioExibicao = getSmartDefaultDateTime(0, 'hour'); // Agora (próxima hora)
        const defaultDataFimExibicao = getSmartDefaultDateTime(24, 'hour'); // Até o início do evento

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
            data_inicio: defaultDataInicio,
            data_fim: defaultDataFim,
            professional_id: '',
            limite_participantes: '30', // Valor padrão sugerido
            data_limite_inscricao: defaultDataLimiteInscricao,
            valor: 0,
            vagas_disponiveis: 0, // 0 = ilimitado
            link_slug: '',
            data_inicio_exibicao: defaultDataInicioExibicao,
            data_fim_exibicao: defaultDataFimExibicao,
            meeting_link: '',
            meeting_password: '',
            meeting_id: '',
            meeting_start_url: '',
            meeting_link_release_minutes: 60, // Default 60 min
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
            meeting_link_release_minutes: event.meeting_link_release_minutes ?? 60,
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
                <header className="bg-[#f8f6f0] border-b border-[#e4ded5] shadow-xs"><nav className="container mx-auto px-4 py-4 flex items-center justify-between"><Link to="/" className="flex items-center space-x-2"><DoxologosLogo className="h-9 w-auto" /></Link><Link to="/"><Button variant="outline" className="border-[#1b3c37] text-[#1b3c37] hover:bg-[#1b3c37] hover:text-[#f0ebe1]"><ArrowLeft className="w-4 h-4 mr-2" /> Voltar</Button></Link></nav></header>
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
                            <DoxologosLogo className="h-9 w-auto" />
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
                            <DoxologosLogo className="h-8 w-auto" />
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
                                {userRole === 'admin' && (
                                    <Link
                                        to="/admin/dashboard"
                                        className="block px-2 py-2 rounded-md text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        <LayoutDashboard className="w-4 h-4 mr-2 inline" /> Dashboard Gerencial
                                    </Link>
                                )}
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

            <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
                {/* Sidebar Lateral Navegável nos 5 Módulos Estruturados */}
                <div className="hidden md:block flex-shrink-0">
                    <AdminSidebar
                        activeModule={activeModule}
                        setActiveModule={setActiveModule}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        userRole={userRole}
                        userName={displayName}
                        pendingAlertsCount={professionalStats?.pendingAppointments?.length || 0}
                        onOpenChangePassword={() => setIsChangePasswordOpen(true)}
                    />
                </div>

                <div className="flex-1 min-w-0 p-4 md:p-8 pt-24 md:pt-28 overflow-y-auto">
                    <div className="container mx-auto max-w-7xl">
                        <SecurityPasswordBanner onOpenChangePassword={() => setIsChangePasswordOpen(true)} />
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Painel de Controle</h1>
                            <p className="text-sm text-gray-500 mt-1">Bem-vindo, <span className="font-semibold text-gray-800">{displayName}</span>. Gerencie a operação, relatórios e configurações da plataforma.</p>
                        </div>
                    </div>

                    <Tabs id="admin-tabs" value={activeTab} onValueChange={setActiveTab} className="w-full">

                        {/* Dashboard Tab - Cockpit Estratégico ou Visão do Profissional */}
                        <TabsContent value="dashboard" className="mt-6">
                            <Suspense fallback={<div className="p-8 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-[#2d8659]" /></div>}>
                            {isAdminView ? (
                                <StrategicCockpitModule
                                    summaryData={{
                                        receita_consultas: totals.totalValue,
                                        consultas_confirmadas: totals.totalBookings,
                                        total_professionals: professionals.length
                                    }}
                                    financialData={{
                                        monthlyRevenue: totals.totalValue,
                                        takeRatePct: 20,
                                        netMargin: totals.totalPlatformFee
                                    }}
                                    alertsData={{
                                        pendingAppointmentsCount: (bookings || []).filter(b => {
                                            const s = (b.status || '').toLowerCase();
                                            return ['pending', 'pending_payment', 'pendente', 'awaiting_payment'].includes(s);
                                        }).length
                                    }}
                                    onNavigateTab={setActiveTab}
                                />
                            ) : (
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
                            )}
                        </Suspense>
</TabsContent>

                        {/* Financial Control Tab - DRE & Controladoria Unificada */}
                        <TabsContent value="financial-control" className="mt-6">
                            <Suspense fallback={<div className="p-8 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-[#2d8659]" /></div>}>
                                <FinancialControlModule
                                    financialData={{ monthlyRevenue: totals.totalValue }}
                                    bookings={bookings}
                                    userRole={userRole}
                                    onNavigateTab={setActiveTab}
                                />
                            </Suspense>
                        </TabsContent>

                        {/* Bookings Tab */}
                        <TabsContent value="bookings" className="mt-6">
                            <Suspense fallback={<div className="p-8 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-[#2d8659]" /></div>}>
                                <AdminBookingsTab
                                    bookings={bookings}
                                    services={services}
                                    professionals={professionals}
                                    userRole={userRole}
                                    currentProfessional={currentProfessional}
                                    onRefresh={fetchAllData}
                                    onOpenEmergencyModal={() => setIsEmergencyBookingModalOpen(true)}
                                />
                            </Suspense>
                        </TabsContent>

                        <TabsContent value="availability" className="mt-6">
<Suspense fallback={<div className="p-8 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-[#2d8659]" /></div>}>
                            <AvailabilityManager
                                userRole={userRole}
                                professionals={professionals}
                                selectedAvailProfessional={selectedAvailProfessional}
                                setSelectedAvailProfessional={setSelectedAvailProfessional}
                                selectedMonth={selectedMonth}
                                setSelectedMonth={setSelectedMonth}
                                selectedYear={selectedYear}
                                setSelectedYear={setSelectedYear}
                                professionalAvailability={professionalAvailability}
                                setProfessionalAvailability={setProfessionalAvailability}
                                handleSaveAvailability={handleSaveAvailability}
                                isLoadingSave={isLoading('saveAvailability')}
                                newBlockedDate={newBlockedDate}
                                setNewBlockedDate={setNewBlockedDate}
                                handleAddBlockedDate={handleAddBlockedDate}
                                handleDeleteBlockedDate={handleDeleteBlockedDate}
                                professionalBlockedDates={professionalBlockedDates}
                            />
                        </Suspense>
</TabsContent>


                        <TabsContent value="reviews" className="mt-6">
<Suspense fallback={<div className="p-8 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-[#2d8659]" /></div>}>
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <h2 className="text-2xl font-bold mb-6 flex items-center"><Star className="w-6 h-6 mr-2 text-[#2d8659]" /> Avaliações</h2>
                                <div className="space-y-4">
                                    {reviews.map(review => (
                                        <div key={review.id} className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5 hover:shadow-md transition-all">
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
                                                        <Button size="icon" className="rounded-full" variant={review.is_approved ? "default" : "outline"} onClick={() => handleReviewApproval(review.id, !review.is_approved)}>
                                                            {review.is_approved ? <ShieldOff className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Suspense>
</TabsContent>


                        {/* Patients Tab - Admin e Profissional */}
                        <TabsContent value="patients" className="mt-6">
<Suspense fallback={<div className="p-8 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-[#2d8659]" /></div>}>
                            <div className="space-y-6">
                                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                            <Users className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900">Gestão de Pacientes</h2>
                                            <p className="text-sm text-gray-600">Visualize e gerencie os pacientes da plataforma</p>
                                        </div>
                                    </div>

                                    <PatientList
                                        patients={patientData.patients}
                                        onPatientClick={handlePatientClick}
                                        loading={patientData.loading}
                                    />
                                </div>
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
</Suspense>
</TabsContent>

                        {/* Financial Dashboard Tab - Professional View Only */}
                        {
                            isProfessionalView && (
                                <TabsContent value="financeiro" className="mt-6">
<Suspense fallback={<div className="p-8 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-[#2d8659]" /></div>}>
                                    <FinancialDashboard professionalId={currentProfessional?.id} />
                                </Suspense>
</TabsContent>
                            )
                        }

                        <TabsContent value="payments" className="mt-6">
                            <Suspense fallback={<div className="p-8 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-[#2d8659]" /></div>}>
                                <AdminPaymentsTab professionals={professionals} />
                            </Suspense>
                        </TabsContent>

                        {/* P&L Dashboard Tab - Admin Only */}
                        {
                            userRole === 'admin' && (
                                <TabsContent value="profit-loss" className="mt-6">
<Suspense fallback={<div className="p-8 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-[#2d8659]" /></div>}>
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
                                </Suspense>
</TabsContent>
                            )
                        }

                        {/* Ledger Tab - Admin Only */}
                        {
                            userRole === 'admin' && (
                                <TabsContent value="livro-caixa" className="mt-6">
<Suspense fallback={<div className="p-8 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-[#2d8659]" /></div>}>
                                    <LedgerStats />
                                    <LedgerCharts />
                                    <LedgerTable />
                                </Suspense>
</TabsContent>
                            )
                        }

                        {
                            userRole === 'admin' && (
                                <TabsContent value="nfse" className="mt-6">
                                    <Suspense fallback={<div className="p-8 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-[#2d8659]" /></div>}>
                                        <NfseResilienceDashboard />
                                    </Suspense>
                                </TabsContent>
                            )
                        }

                        {
                            (userRole === 'admin' || userRole === 'professional') && (
                                <TabsContent value="professionals" className="mt-6">
                                    <Suspense fallback={<div className="p-8 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-[#2d8659]" /></div>}>
                                        <AdminProfessionalsTab
                                            userRole={userRole}
                                            professionals={professionals}
                                            services={services}
                                            onRefresh={fetchAllData}
                                        />
                                    </Suspense>
                                </TabsContent>
                            )
                        }

                        {
                            userRole === 'admin' && (
                                <TabsContent value="services" className="mt-6">
                                    <Suspense fallback={<div className="p-8 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-[#2d8659]" /></div>}>
                                        <AdminServicesTab
                                            services={services}
                                            professionals={professionals}
                                            onRefresh={fetchAllData}
                                        />
                                    </Suspense>
                                </TabsContent>
                            )
                        }

                        {
                            userRole === 'admin' && (
                                <TabsContent value="events" className="mt-6">
                                    <Suspense fallback={<div className="p-8 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-[#2d8659]" /></div>}>
                                        <AdminEventsTab
                                            events={events}
                                            professionals={professionals}
                                            onRefresh={fetchAllData}
                                        />
                                    </Suspense>
                                </TabsContent>
                            )
                        }

                        {/* Aba Growth / Tráfego (Novo) */}
                        {
                            userRole === 'admin' && (
                                <TabsContent value="growth" className="mt-6">
<Suspense fallback={<div className="p-8 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-[#2d8659]" /></div>}>
                                    <DashboardGrowth />
                                </Suspense>
</TabsContent>
                            )
                        }

                        {
                            userRole === 'admin' && (
                                <TabsContent value="event-registrations" className="mt-6">
<Suspense fallback={<div className="p-8 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-[#2d8659]" /></div>}>
                                    <EventRegistrationsDashboard events={events} userRole={userRole} />
                                </Suspense>
</TabsContent>
                            )
                        }

                        {/* Depoimentos Section */}
                        {
                            userRole === 'admin' && (
                                <TabsContent value="testimonials" className="mt-6">
                                    <Suspense fallback={<div className="p-8 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-[#2d8659]" /></div>}>
                                        <AdminTestimonialsTab />
                                    </Suspense>
                                </TabsContent>
                            )
                        }

                        {
                            userRole === 'admin' && (
                                <TabsContent value="refunds" className="mt-6">
<Suspense fallback={<div className="p-8 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-[#2d8659]" /></div>}>
                                    <RefundRequestDashboard />
                                </Suspense>
</TabsContent>
                            )
                        }
                        {
                            userRole === 'admin' && (
                                <TabsContent value="settings" className="mt-6">
<Suspense fallback={<div className="p-8 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-[#2d8659]" /></div>}>
                                    <div className="space-y-6">
                                        <SecurityPasswordBanner onOpenChangePassword={() => setIsChangePasswordOpen(true)} />
                                        <SystemSettingsManager userRole={userRole} />

                                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                            <h3 className="font-semibold text-lg mb-4 text-slate-900">Marketing & Lead Magnets</h3>
                                            <SettingsToggle />
                                        </div>
                                    </div>
                                </Suspense>
</TabsContent>
                            )
                        }
                        {
                            userRole === 'admin' && (
                                <TabsContent value="blog" className="mt-6">
<Suspense fallback={<div className="p-8 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-[#2d8659]" /></div>}>
                                    <BlogManagementDashboard />
                                </Suspense>
</TabsContent>
                            )
                        }
                        {
                            userRole === 'admin' && (
                                <TabsContent value="book-resources" className="mt-6">
<Suspense fallback={<div className="p-8 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-[#2d8659]" /></div>}>
                                    <BookResourcesAdminSection />
                                </Suspense>
</TabsContent>
                            )
                        }
                        <TabsContent value="assessment-leads" className="mt-6">
                            <Suspense fallback={<div className="p-8 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-[#2d8659]" /></div>}>
                                <AssessmentLeadsSection currentUserId={user?.id} />
                            </Suspense>
                        </TabsContent>
                    </Tabs>

                </div>
            </div>
        </div>

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                onConfirm={confirmDialog.onConfirm}
                title={confirmDialog.title}
                message={confirmDialog.message}
                warningMessage={confirmDialog.warningMessage}
                type={confirmDialog.type}
            />

            <EmergencyBookingModal
                isOpen={isEmergencyBookingModalOpen}
                onClose={() => setIsEmergencyBookingModalOpen(false)}
                professionals={professionals}
                services={services}
                onBookingCreated={fetchAllData}
            />

            <ChangePasswordModal
                isOpen={isChangePasswordOpen}
                onClose={() => setIsChangePasswordOpen(false)}
            />
        </>
    );
};

export default AdminPage;
