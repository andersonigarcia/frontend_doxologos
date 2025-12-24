
import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  Heart,
  ArrowLeft,
  Calendar,
  User,
  Clock,
  CreditCard,
  Check,
  CheckCircle,
  Video,
  Globe,
  ShieldCheck,
  Lock,
  RefreshCcw,
  ChevronRight,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useBookingTracking, useFormTracking } from '@/hooks/useAnalytics';
import { BookingEmailManager } from '@/lib/bookingEmailManager';
import { useComponentErrorTracking } from '@/hooks/useErrorTracking';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { zoomService } from '@/lib/zoomService';
import { secureLog } from '@/lib/secureLogger';
import analytics from '@/lib/analytics';
import { useBookingData } from '@/hooks/booking/useBookingData';
import { usePatientForm, formatPhoneNumber, validateEmail } from '@/hooks/booking/usePatientForm';
import BookingStepper from '@/components/booking/BookingStepper';

// Lazy load heavy components for better performance
const ProfessionalStep = lazy(() => import('@/components/booking/ProfessionalStep'));
const DateTimeStep = lazy(() => import('@/components/booking/DateTimeStep'));
const PatientAccountStep = lazy(() => import('@/components/booking/PatientAccountStep'));
const PaymentSummaryStep = lazy(() => import('@/components/booking/PaymentSummaryStep'));

import { useBookedSlots } from '@/hooks/booking/useBookedSlots';

const MIN_PASSWORD_LENGTH = 8;
const generateGoogleMeetLink = () => 'https://meet.google.com/new';

// Skeleton Loader for lazy-loaded components
const StepLoader = () => (
  <div className="bg-white rounded-xl shadow-lg p-8">
    <div className="animate-pulse space-y-4">
      {/* Title skeleton */}
      <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto" />
      <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" />

      {/* Content skeletons */}
      <div className="space-y-3 mt-8">
        <div className="h-24 bg-gray-200 rounded" />
        <div className="h-24 bg-gray-200 rounded" />
        <div className="h-24 bg-gray-200 rounded" />
      </div>

      {/* Button skeleton */}
      <div className="flex gap-4 mt-8">
        <div className="h-12 bg-gray-200 rounded flex-1" />
        <div className="h-12 bg-gray-200 rounded flex-1" />
      </div>
    </div>
  </div>
);

// Personalized Greeting Component
const PersonalizedGreeting = ({ userName }) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Bom dia', emoji: '☀️', color: 'from-yellow-50 to-orange-50', border: 'border-yellow-200' };
    if (hour < 18) return { text: 'Boa tarde', emoji: '🌤️', color: 'from-blue-50 to-cyan-50', border: 'border-blue-200' };
    return { text: 'Boa noite', emoji: '🌙', color: 'from-indigo-50 to-purple-50', border: 'border-indigo-200' };
  };

  const greeting = getGreeting();

  return (
    <div className={`bg-gradient-to-r ${greeting.color} border ${greeting.border} rounded-lg p-4 mb-6`}>
      <p className="text-lg font-semibold text-gray-900">
        {greeting.emoji} {greeting.text}{userName ? `, ${userName}` : ''}!
      </p>
      <p className="text-sm text-gray-700">
        Vamos encontrar o melhor horário para sua consulta.
      </p>
    </div>
  );
};

// Progress Celebration Component
const ProgressCelebration = ({ step }) => {
  const messages = {
    2: { emoji: '👏', text: 'Ótimo começo!', detail: 'Você está a apenas 3 passos de garantir sua consulta!' },
    3: { emoji: '🎯', text: 'Quase lá!', detail: 'Falta pouco para concluir seu agendamento!' },
    4: { emoji: '🎉', text: 'Excelente!', detail: 'Último passo para confirmar sua consulta!' },
  };

  const message = messages[step];
  if (!message) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 mb-6"
    >
      <div className="flex items-center gap-3">
        <span className="text-3xl">{message.emoji}</span>
        <div>
          <p className="font-bold text-green-900">{message.text}</p>
          <p className="text-sm text-green-700">{message.detail}</p>
        </div>
      </div>
    </motion.div>
  );
};

// Welcome Message for First-Time Users
const WelcomeMessage = ({ isFirstBooking }) => {
  if (!isFirstBooking) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">👋</span>
        <div>
          <h4 className="font-bold text-blue-900 mb-1">Bem-vindo à Doxologos!</h4>
          <p className="text-sm text-blue-800">
            Estamos felizes em ter você aqui. Vamos tornar seu primeiro agendamento super fácil!
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs text-blue-700">
            <CheckCircle className="w-4 h-4" />
            <span>Processo 100% online e seguro</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Live Activity Notification (Social Proof)
const LiveActivity = ({ currentStep }) => {
  const [activity, setActivity] = useState(null);
  const [show, setShow] = useState(false);

  const activities = [
    { name: 'Mais um paciente', action: 'agendou', time: '5 minutos', service: 'Psicoterapia' },
    { name: 'Mais um paciente', action: 'confirmou', time: '12 minutos', service: 'Terapia de Casal' },
    { name: 'Mais um paciente', action: 'agendou', time: '8 minutos', service: 'Psicoterapia' },
    { name: 'Mais um paciente', action: 'agendou', time: '15 minutos', service: 'Psicoterapia' },
  ];

  useEffect(() => {
    const showActivity = () => {
      const randomActivity = activities[Math.floor(Math.random() * activities.length)];
      setActivity(randomActivity);
      setShow(true);

      setTimeout(() => setShow(false), 5000);
    };

    const interval = setInterval(showActivity, 45000); // Every 45s
    const timeout = setTimeout(showActivity, 3000); // Show after 3s initially

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  // Hide on steps 4 (patient data) and 5 (payment summary) to prevent overlap
  if (!show || !activity || currentStep >= 4) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="fixed bottom-32 left-4 md:bottom-6 md:left-6 bg-white shadow-2xl rounded-lg p-3 max-w-xs z-30 border border-gray-200"
    >
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 font-medium truncate">
            <strong>{activity.name}</strong> {activity.action}
          </p>
          <p className="text-xs text-gray-600">
            {activity.service} • há {activity.time}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

const MEETING_OPTIONS = [
  {
    id: 'google_meet',
    label: 'Google Meet',
    icon: Globe,
    description: 'Link enviado pelo time da Doxologos ou pelo profissional.',
    highlights: [
      'Ideal se você já utiliza o Google Workspace',
      'Link compartilhado por email e WhatsApp após confirmação',
      'Funciona direto no navegador e aplicativos Google'
    ]
  }
];

const AgendamentoPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user: authUser, resetPassword } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedProfessional, setSelectedProfessional] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [meetingPlatform, setMeetingPlatform] = useState('google_meet');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [supportsMeetingPlatform, setSupportsMeetingPlatform] = useState(false);

  // Engagement features state
  const [isFirstBooking, setIsFirstBooking] = useState(true);
  const [userName, setUserName] = useState('');

  const { bookedSlots, isLoadingSlots } = useBookedSlots({
    professionalId: selectedProfessional,
    date: selectedDate,
    toast,
  });

  const {
    professionals = [],
    services = [],
    availability = {},
    blockedDates = [],
    testimonials = [],
  } = useBookingData({ toast });

  const {
    patientData,
    register,
    formState: patientFormState,
    emailError,
    passwordError,
    setPasswordError,
    isExistingPatient,
    setIsExistingPatient,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    toggleExistingPatient,
    handlePasswordResetRequest,
    // Novos estados de validação de email
    isCheckingEmail,
    emailExists,
    emailCheckError,
  } = usePatientForm({ authUser, resetPassword, toast });
  const formErrors = patientFormState?.errors || {};

  const whatsappSupportNumber = '5531971982947';
  const servicePriceRange = useMemo(() => {
    if (!services || services.length === 0) return null;
    const parsedPrices = services
      .map(service => Number(service.price))
      .filter(price => !Number.isNaN(price) && price > 0);
    if (parsedPrices.length === 0) return null;
    const min = Math.min(...parsedPrices);
    const max = Math.max(...parsedPrices);
    return { min, max };
  }, [services]);

  const selectedServiceDetails = useMemo(() => {
    if (!selectedService) return null;
    return services.find((service) => service.id === selectedService) || null;
  }, [selectedService, services]);

  const hasScheduleSelection = Boolean(selectedService && selectedProfessional && selectedDate && selectedTime);

  const whatsappSupportMessage = 'Olá! Estou no agendamento e tenho uma dúvida.';
  const whatsappSupportLink = `https://wa.me/${whatsappSupportNumber}?text=${encodeURIComponent(whatsappSupportMessage)}`;

  const handleServiceSelect = (serviceId) => {
    setSelectedService(serviceId);
    setSelectedProfessional('');
    setSelectedDate('');
    setSelectedTime('');
  };

  const handleProfessionalSelect = (professionalId) => {
    setSelectedProfessional(professionalId);
    setSelectedDate('');
    setSelectedTime('');
  };

  const handleDateSelect = (dateString) => {
    setSelectedDate(dateString);
    setSelectedTime('');
  };


  useEffect(() => {
    let isMounted = true;

    const verifyMeetingPlatformColumn = async () => {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .limit(1);

        if (!isMounted) {
          return;
        }

        if (error) {
          setSupportsMeetingPlatform(false);
          console.warn('⚠️ [Agendamento] Falha ao consultar bookings para detectar meeting_platform:', error);
          return;
        }

        const firstRow = Array.isArray(data) ? data[0] : null;
        if (firstRow && Object.prototype.hasOwnProperty.call(firstRow, 'meeting_platform')) {
          setSupportsMeetingPlatform(true);
        } else if (firstRow) {
          setSupportsMeetingPlatform(false);
        } else {
          // Nenhum registro disponível; assumimos suporte apenas se o metadado vier na resposta
          setSupportsMeetingPlatform(false);
        }
      } catch (columnError) {
        if (isMounted) {
          setSupportsMeetingPlatform(false);
          console.warn('⚠️ [Agendamento] Falha ao verificar suporte a meeting_platform:', columnError);
        }
      }
    };

    verifyMeetingPlatformColumn();

    return () => {
      isMounted = false;
    };
  }, []);

  // Analytics and Error Tracking Hooks
  const { trackBookingStart, trackBookingStep, trackBookingComplete, trackBookingAbandon } = useBookingTracking();
  const { trackFormStart, trackFormSubmit, trackFormError } = useFormTracking('booking');
  const { trackComponentError, trackAsyncError } = useComponentErrorTracking('AgendamentoPage');

  // Prefetch availability data for next step to improve performance
  useEffect(() => {
    const prefetchAvailability = async () => {
      if (step === 2 && selectedProfessional && !selectedDate) {
        try {
          // Prefetch availability data
          await supabase
            .from('availability')
            .select('*')
            .eq('professional_id', selectedProfessional);

          console.log('✅ Prefetched availability data');
        } catch (error) {
          // Silent fail - not critical
          console.log('Prefetch failed (non-critical)');
        }
      }
    };

    prefetchAvailability();
  }, [step, selectedProfessional, selectedDate]);

  // Check if user is first-time booker and get name
  useEffect(() => {
    const checkBookingHistory = async () => {
      if (authUser) {
        try {
          const { data } = await supabase
            .from('bookings')
            .select('id')
            .eq('user_id', authUser.id)
            .limit(1);

          setIsFirstBooking(!data || data.length === 0);
          setUserName(authUser.user_metadata?.full_name?.split(' ')[0] || '');
        } catch (error) {
          console.log('Error checking booking history:', error);
        }
      }
    };

    checkBookingHistory();
  }, [authUser]);

  const handleSupportWhatsappClick = () => {
    analytics.trackEvent('whatsapp_click', {
      event_category: 'booking',
      event_label: 'cta_duvidas_agendamento',
      step
    });
    if (typeof window !== 'undefined') {
      window.open(whatsappSupportLink, '_blank', 'noopener,noreferrer');
    }
  };

  const handleProceedToSummary = async () => {
    // Se for paciente existente, validar senha antes de prosseguir
    if (!authUser && isExistingPatient) {
      if (!patientData.password || patientData.password.length < MIN_PASSWORD_LENGTH) {
        setPasswordError(`A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
        toast({
          variant: 'destructive',
          title: 'Senha muito curta',
          description: `Informe uma senha com pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`
        });
        return;
      }

      // Tentar autenticar para validar a senha
      try {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: patientData.email,
          password: patientData.password
        });

        if (signInError) {
          console.error('Erro ao validar senha do paciente existente:', signInError);
          setPasswordError('Senha incorreta. Verifique sua senha ou utilize a opção de recuperação.');
          toast({
            variant: 'destructive',
            title: 'Senha incorreta',
            description: 'A senha informada não está correta. Tente novamente ou clique em "Esqueci minha senha".'
          });
          return;
        }

        // Senha validada com sucesso
        setPasswordError('');
        toast({
          title: 'Senha validada!',
          description: 'Suas credenciais foram confirmadas. Prosseguindo para o resumo.'
        });
      } catch (error) {
        console.error('Erro ao validar senha:', error);
        setPasswordError('Erro ao validar senha. Tente novamente.');
        toast({
          variant: 'destructive',
          title: 'Erro na validação',
          description: 'Não foi possível validar sua senha. Tente novamente.'
        });
        return;
      }
    }

    // Se chegou aqui, pode prosseguir
    setStep(5);
  };

  const topTestimonials = useMemo(() => testimonials.slice(0, 3), [testimonials]);

  const paymentSecurityHighlights = useMemo(() => ([
    {
      icon: ShieldCheck,
      title: 'Pagamento processado pelo Mercado Pago',
      description: 'Utilizamos a mesma plataforma certificada por milhões de brasileiros para garantir transações seguras e rastreáveis.'
    },
    {
      icon: Lock,
      title: 'Dados protegidos conforme LGPD',
      description: 'Suas informações ficam armazenadas com criptografia e controles auditados para atender às exigências da Lei Geral de Proteção de Dados.'
    },
    {
      icon: RefreshCcw,
      title: 'Flexibilidade para reagendar com 24h de antecedência',
      description: 'Se precisar ajustar a consulta, basta acessar a Área do Paciente até 24 horas antes e escolher um novo horário disponível.'
    }
  ]), []);

  const canProceedToSummary = useMemo(() => {
    if (!hasScheduleSelection) {
      return false;
    }

    if (!authUser && (!patientData.name || !patientData.email || !patientData.phone || emailError)) {
      return false;
    }

    if (authUser) {
      return Boolean(meetingPlatform);
    }

    if (isExistingPatient) {
      return Boolean(
        patientData.password &&
        patientData.password.length >= MIN_PASSWORD_LENGTH &&
        meetingPlatform
      );
    }

    return (
      Boolean(patientData.password) &&
      Boolean(patientData.confirmPassword) &&
      patientData.password.length >= MIN_PASSWORD_LENGTH &&
      patientData.password === patientData.confirmPassword &&
      Boolean(meetingPlatform)
    );
  }, [
    authUser,
    emailError,
    hasScheduleSelection,
    isExistingPatient,
    meetingPlatform,
    patientData.confirmPassword,
    patientData.email,
    patientData.name,
    patientData.password,
    patientData.phone,
  ]);

  const canSubmitBooking = useMemo(
    () => canProceedToSummary && Boolean(patientData.acceptTerms),
    [canProceedToSummary, patientData.acceptTerms]
  );

  const submitButtonTitle = useMemo(() => {
    if (!authUser && (!patientData.name || !patientData.email || !patientData.phone)) {
      return 'Preencha todos os campos obrigatórios';
    }

    if (!authUser && emailError) {
      return 'Digite um email válido';
    }

    if (!patientData.acceptTerms) {
      return 'Aceite os termos e condições';
    }

    if (!meetingPlatform) {
      return 'Selecione a plataforma da consulta';
    }

    if (authUser) {
      return '';
    }

    if (!patientData.password) {
      return 'Informe uma senha para acessar a área do paciente';
    }

    if (patientData.password.length < MIN_PASSWORD_LENGTH) {
      return `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres`;
    }

    if (!isExistingPatient && !patientData.confirmPassword) {
      return 'Confirme sua senha';
    }

    if (!isExistingPatient && patientData.password !== patientData.confirmPassword) {
      return 'As senhas precisam ser iguais';
    }

    return '';
  }, [patientData.name, patientData.email, patientData.phone, patientData.password, patientData.confirmPassword, patientData.acceptTerms, emailError, authUser, isExistingPatient, meetingPlatform]);

  const formatPatientName = (name) => {
    if (!name) return 'Paciente atendido';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return 'Paciente atendido';
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  };

  const getRatingValue = (testimonial) => {
    const ratingNumber = Number(testimonial?.rating);
    if (!Number.isFinite(ratingNumber) || ratingNumber <= 0) return 5;
    return Math.min(5, Math.max(1, Math.round(ratingNumber)));
  };

  const getTestimonialComment = (testimonial) => {
    return (testimonial?.comment || testimonial?.feedback || 'Atendimento acolhedor, profissional e com resultados reais.');
  };

  const getProfessionalName = (testimonial) => {
    const professionalData = testimonial?.professionals;
    if (!professionalData) return null;
    if (Array.isArray(professionalData)) {
      return professionalData[0]?.name || null;
    }
    if (typeof professionalData === 'object') {
      return professionalData.name || null;
    }
    if (typeof professionalData === 'string') {
      return professionalData;
    }
    return null;
  };

  const getAvailableTimesForDate = () => {
    if (!selectedDate || !selectedProfessional || !availability[selectedProfessional]) return [];

    const dayOfWeek = new Date(selectedDate + 'T00:00:00').getUTCDay();
    const dayMapping = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayKey = dayMapping[dayOfWeek];
    let times = availability[selectedProfessional]?.[dayKey] || [];

    // Aplicar bloqueios de data
    const professionalBlockedDates = blockedDates.filter(d => d.professional_id === selectedProfessional && d.blocked_date === selectedDate);
    if (professionalBlockedDates.length > 0) {
      professionalBlockedDates.forEach(block => {
        if (!block.start_time || !block.end_time) { // Dia todo
          times = [];
        } else { // Intervalo
          times = times.filter(time => time < block.start_time || time >= block.end_time);
        }
      });
    }

    // Filtrar horários baseado na duração do serviço
    if (selectedService) {
      const service = services.find(s => s.id === selectedService);
      if (service && service.duration_minutes) {
        const serviceDurationMinutes = service.duration_minutes;

        // Função para converter horário "HH:MM" em minutos desde meia-noite
        const timeToMinutes = (timeStr) => {
          const [hours, minutes] = timeStr.split(':').map(Number);
          return hours * 60 + minutes;
        };

        // Função para adicionar minutos a um horário
        const addMinutesToTime = (timeStr, minutes) => {
          const totalMinutes = timeToMinutes(timeStr) + minutes;
          const hours = Math.floor(totalMinutes / 60);
          const mins = totalMinutes % 60;
          return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
        };

        // Filtrar horários que têm espaço suficiente para o serviço
        times = times.filter(time => {
          const startMinutes = timeToMinutes(time);
          const endMinutes = startMinutes + serviceDurationMinutes;

          // Verificar se há conflito com agendamentos existentes
          // Um conflito ocorre se qualquer horário reservado está no intervalo [start, end)
          const hasConflict = bookedSlots.some(bookedTime => {
            const bookedMinutes = timeToMinutes(bookedTime);
            // O horário reservado conflita se está dentro do período do novo serviço
            return bookedMinutes >= startMinutes && bookedMinutes < endMinutes;
          });

          if (hasConflict) return false;

          // Verificar se o término do serviço não ultrapassa horários disponíveis
          // que já estão ocupados
          const sortedTimes = [...times].sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
          const currentIndex = sortedTimes.indexOf(time);

          // Para cada slot de tempo entre o início e o fim do serviço,
          // verificar se está ocupado
          for (let i = currentIndex + 1; i < sortedTimes.length; i++) {
            const nextTime = sortedTimes[i];
            const nextMinutes = timeToMinutes(nextTime);

            // Se o próximo slot está depois do fim do serviço, não há problema
            if (nextMinutes >= endMinutes) break;

            // Se o próximo slot está ocupado e dentro do período do serviço, há conflito
            if (bookedSlots.includes(nextTime)) {
              return false;
            }
          }

          return true;
        });
      }
    }

    return times;
  };

  const availableTimes = useMemo(
    () => getAvailableTimesForDate(),
    [selectedDate, selectedProfessional, availability, selectedService, services, bookedSlots, blockedDates]
  );

  // Funções do calendário
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Adicionar dias vazios do mês anterior
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Adicionar dias do mês atual
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const isDateDisabled = (date) => {
    if (!date) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const formatDateToString = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const isPrevMonthDisabled = () => {
    const today = new Date();
    const currentYear = currentMonth.getFullYear();
    const currentMonthNum = currentMonth.getMonth();
    return currentYear < today.getFullYear() ||
      (currentYear === today.getFullYear() && currentMonthNum <= today.getMonth());
  };


  const handleBooking = async () => {
    console.log('🚀 [handleBooking] INÍCIO - Iniciando processo de agendamento');
    console.log('🚀 [handleBooking] Dados do formulário:', {
      selectedDate,
      selectedTime,
      selectedService,
      selectedProfessional,
      patientData: {
        ...patientData,
        password: patientData.password ? '***' : '',
        confirmPassword: patientData.confirmPassword ? '***' : ''
      },
      authUser: !!authUser,
      isExistingPatient
    });

    setIsSubmitting(true);
    setPasswordError('');

    // Validar aceitação dos termos
    if (!patientData.acceptTerms) {
      toast({
        variant: 'destructive',
        title: 'Aceite os termos',
        description: 'Você precisa aceitar os termos e condições para continuar.'
      });
      setIsSubmitting(false);
      return;
    }

    if (!selectedDate || !selectedTime) {
      toast({
        variant: 'destructive',
        title: 'Escolha data e horário',
        description: 'Selecione um dia e horário disponíveis para continuar.'
      });
      setIsSubmitting(false);
      return;
    }

    const selectedDateTime = new Date(`${selectedDate}T${selectedTime}:00`);
    if (Number.isNaN(selectedDateTime.getTime())) {
      toast({
        variant: 'destructive',
        title: 'Horário inválido',
        description: 'Não conseguimos interpretar a data escolhida. Tente novamente.'
      });
      setIsSubmitting(false);
      return;
    }

    const minimumAdvance = new Date();
    minimumAdvance.setHours(minimumAdvance.getHours() + 24);
    if (selectedDateTime < minimumAdvance) {
      toast({
        variant: 'destructive',
        title: 'Antecedência mínima',
        description: 'Consultas precisam ser agendadas com pelo menos 24 horas de antecedência.'
      });
      setIsSubmitting(false);
      return;
    }

    try {
      if (!authUser) {
        if (!patientData.password || patientData.password.length < MIN_PASSWORD_LENGTH) {
          setPasswordError(`A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
          toast({
            variant: 'destructive',
            title: 'Senha muito curta',
            description: `Crie uma senha com pelo menos ${MIN_PASSWORD_LENGTH} caracteres para acessar a área do paciente.`
          });
          return;
        }

        if (!isExistingPatient && patientData.password !== patientData.confirmPassword) {
          setPasswordError('As senhas precisam ser iguais.');
          toast({
            variant: 'destructive',
            title: 'Senhas não conferem',
            description: 'Digite a mesma senha nos dois campos para continuar.'
          });
          return;
        }
      }

      let userId;

      console.log('👤 [handleBooking] Verificando autenticação...');

      if (authUser) {
        userId = authUser.id;
        console.log('✅ [handleBooking] Usuário autenticado:', userId);
      } else if (isExistingPatient) {
        console.log('👤 [handleBooking] Paciente existente - tentando login com senha informada...');
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: patientData.email,
          password: patientData.password
        });

        if (signInError) {
          console.error('Erro ao autenticar paciente existente:', signInError);
          setPasswordError('Não foi possível validar sua senha. Você pode recuperar o acesso com o link abaixo.');
          toast({
            variant: 'destructive',
            title: 'Senha incorreta',
            description: 'Confirme sua senha ou utilize a opção de recuperação para continuar.'
          });
          return;
        }

        userId = signInData.user?.id;
        setIsExistingPatient(true);
        toast({
          title: 'Login confirmado!',
          description: 'Reconhecemos seu cadastro e vamos prosseguir com o agendamento.'
        });
      } else {
        console.log('👤 [handleBooking] Usuário não autenticado - criando conta com senha informada...');
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: patientData.email,
          password: patientData.password,
          options: {
            data: {
              full_name: patientData.name,
              phone: patientData.phone,
              role: 'user'
            },
            emailRedirectTo: `${window.location.origin}/area-do-paciente`
          }
        });

        if (signUpError) {
          if (signUpError.message?.includes('already registered') || signUpError.message?.includes('already exists')) {
            console.log('⚠️ [handleBooking] Email já cadastrado - tentando login automático...');
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email: patientData.email,
              password: patientData.password
            });

            if (signInError) {
              console.error('Erro ao autenticar paciente já cadastrado:', signInError);
              setIsExistingPatient(true);
              setPasswordError('Este email já possui cadastro. Faça login informando sua senha ou recupere o acesso.');
              toast({
                variant: 'destructive',
                title: 'Email já cadastrado',
                description: 'Se não lembrar a senha, clique em "Esqueci minha senha" para receber um novo acesso.'
              });
              return;
            }

            userId = signInData.user?.id;
            toast({
              title: 'Bem-vindo de volta!',
              description: 'Localizamos seu cadastro e fizemos login para continuar.'
            });
          } else {
            console.error('Erro ao criar usuário:', signUpError);
            toast({
              variant: 'destructive',
              title: 'Não foi possível criar seu acesso',
              description: 'Use outro email ou tente novamente em alguns minutos.'
            });
            return;
          }
        } else {
          userId = signUpData.user?.id || signUpData.session?.user?.id;
          toast({
            title: 'Cadastro criado!',
            description: 'Enviamos um email para confirmar seu acesso à Área do Paciente.'
          });

          try {
            if (!signUpData.session) {
              console.log('🔐 [handleBooking] Criando sessão pós-cadastro para garantir acesso imediato...');
              const { data: autoSignInData, error: autoSignInError } = await supabase.auth.signInWithPassword({
                email: patientData.email,
                password: patientData.password
              });

              if (autoSignInError) {
                console.warn('⚠️ [handleBooking] Não foi possível criar sessão automática após cadastro:', autoSignInError.message);
              } else {
                const sessionUserId = autoSignInData.session?.user?.id || autoSignInData.user?.id;
                if (sessionUserId) {
                  userId = sessionUserId;
                  console.log('✅ [handleBooking] Sessão autenticada após cadastro:', sessionUserId);
                }
              }
            }
          } catch (autoSignInException) {
            console.warn('⚠️ [handleBooking] Tentativa de sessão automática falhou:', autoSignInException);
          }
        }
      }

      if (!userId) {
        console.log('⚠️ [handleBooking] userId não disponível imediatamente - tentando recuperar via RPC...');
        try {
          const { data: rpcUserId } = await supabase.rpc('get_user_id_by_email', { user_email: patientData.email });
          if (rpcUserId) {
            userId = rpcUserId;
            console.log('✅ user_id recuperado via RPC:', userId);
          }
        } catch (rpcError) {
          console.warn('Não foi possível recuperar user_id via RPC:', rpcError);
        }
      }

      console.log('💰 [handleBooking] Buscando detalhes do serviço...');

      // 3. Get service details to capture current price
      const serviceDetails = services.find(s => s.id === selectedService);
      const professionalDetails = professionals.find(p => p.id === selectedProfessional);
      const valorConsulta = parseFloat(serviceDetails?.price || 0);
      const valorRepasseProfissionalRaw = parseFloat(
        serviceDetails?.professional_payout ?? serviceDetails?.price ?? 0
      );
      const valorRepasseProfissional = Number.isFinite(valorRepasseProfissionalRaw)
        ? valorRepasseProfissionalRaw
        : valorConsulta;

      console.log('💰 [handleBooking] Serviço encontrado:', {
        serviceName: serviceDetails?.name,
        price: valorConsulta,
        professionalPayout: valorRepasseProfissional,
        platformFee: Math.max(valorConsulta - valorRepasseProfissional, 0)
      });

      console.log('📝 [handleBooking] Preparando dados do agendamento...');

      const authMetadata = authUser?.user_metadata || {};
      const normalizedPatientEmail = (patientData.email || authUser?.email || '').trim();
      const normalizedPatientName = (patientData.name || authMetadata.full_name || authMetadata.name || '').trim();
      const safePatientName = normalizedPatientName || (authUser?.email ? authUser.email.split('@')[0] : 'Paciente Doxologos');
      const rawPatientPhone = (patientData.phone || authMetadata.phone || authMetadata.phone_number || '').trim();
      const safePatientPhone = rawPatientPhone ? formatPhoneNumber(rawPatientPhone) : '';

      if (!normalizedPatientEmail || !validateEmail(normalizedPatientEmail)) {
        console.error('❌ [handleBooking] Email do paciente ausente ou inválido. Abortando fluxo para evitar erros no envio de email.');
        toast({
          variant: 'destructive',
          title: 'Email obrigatório para o agendamento',
          description: 'Não identificamos um email válido para enviar a confirmação. Faça login novamente ou informe o email na etapa anterior.'
        });
        setIsSubmitting(false);
        return;
      }

      // 4. Preparar dados do agendamento
      const bookingData = {
        professional_id: selectedProfessional,
        service_id: selectedService,
        booking_date: selectedDate,
        booking_time: selectedTime,
        status: 'pending_payment',
        patient_name: safePatientName,
        patient_email: normalizedPatientEmail,
        patient_phone: safePatientPhone,
        valor_consulta: valorConsulta,
        valor_repasse_profissional: valorRepasseProfissional
      };

      if (supportsMeetingPlatform) {
        bookingData.meeting_platform = meetingPlatform;
      }

      if (meetingPlatform === 'google_meet') {
        const generatedMeetLink = generateGoogleMeetLink();
        bookingData.meeting_link = generatedMeetLink;
        bookingData.meeting_password = null;
        bookingData.meeting_id = null;
        bookingData.meeting_start_url = generatedMeetLink;
        console.log('🎥 Link Google Meet gerado para o agendamento:', generatedMeetLink);
      }

      // Adicionar user_id se disponível
      if (userId) {
        bookingData.user_id = userId;
      }

      console.log('✅ [handleBooking] bookingData preparado:', {
        ...bookingData,
        user_id: bookingData.user_id ? '***' : null
      });
      console.log('🎯 [handleBooking] Estratégia da sala virtual selecionada:', meetingPlatform, 'suporte coluna:', supportsMeetingPlatform);

      // 4.5. Criar sala do Zoom ANTES de inserir o agendamento (apenas para Zoom)
      let zoomMeetingData = null;
      if (meetingPlatform === 'zoom') {
        try {
          console.log('🎥 Criando sala do Zoom...', {
            booking_date: selectedDate,
            booking_time: selectedTime,
            patient_name: safePatientName,
            service_name: serviceDetails?.name,
            professional_name: professionalDetails?.name
          });

          zoomMeetingData = await zoomService.createBookingMeeting({
            booking_date: selectedDate,
            booking_time: selectedTime,
            patient_name: safePatientName,
            service_name: serviceDetails?.name || 'Consulta',
            professional_name: professionalDetails?.name || 'Profissional',
            professional_email: professionalDetails?.email,
            duration: 60
          });

          if (zoomMeetingData) {
            secureLog.success('Sala do Zoom criada com sucesso!');
            secureLog.info('Link:', zoomMeetingData.meeting_link);
            // Adicionar dados do Zoom ao booking
            bookingData.meeting_link = zoomMeetingData.meeting_link;
            bookingData.meeting_password = zoomMeetingData.meeting_password || null;
            bookingData.meeting_id = zoomMeetingData.meeting_id;
            bookingData.meeting_start_url = zoomMeetingData.start_url;
          } else {
            console.warn('⚠️ createBookingMeeting retornou null - Zoom não configurado ou erro na criação');
            toast({
              title: 'Vamos finalizar o link da sala',
              description: 'Não conseguimos gerar a sala do Zoom agora. Nossa equipe enviará o link completo por email assim que estiver pronto.',
              variant: 'default'
            });
          }
        } catch (zoomError) {
          console.error('❌ Erro ao criar sala do Zoom:', zoomError);
          console.error('❌ Detalhes do erro:', {
            name: zoomError.name,
            message: zoomError.message,
            stack: zoomError.stack
          });

          // Mostrar aviso ao usuário mas não bloquear o fluxo
          toast({
            title: 'Link do encontro em validação',
            description: 'Ainda não geramos a sala do Zoom. Você receberá o link confirmado por email em breve.',
            variant: 'default'
          });
        }
      } else {
        console.log('ℹ️ Paciente preferiu Google Meet. Pular criação automática do Zoom.');
      }

      // 5. Criar o agendamento
      console.log('💾 Dados do agendamento antes de inserir no banco:', {
        ...bookingData,
        has_meeting_link: !!bookingData.meeting_link,
        has_meeting_password: !!bookingData.meeting_password,
        has_meeting_id: !!bookingData.meeting_id,
        has_meeting_start_url: !!bookingData.meeting_start_url
      });

      let insertPayload = { ...bookingData };
      let bookingInsertData = null;
      let bookingError = null;

      const attemptInsert = async (payload) => supabase.from('bookings').insert([payload]).select().single();

      let insertResult = await attemptInsert(insertPayload);
      bookingInsertData = insertResult.data;
      bookingError = insertResult.error;

      if (!bookingError && insertPayload.meeting_platform && supportsMeetingPlatform === false) {
        setSupportsMeetingPlatform(true);
      }

      if (
        insertPayload.meeting_platform &&
        bookingError &&
        bookingError.message &&
        bookingError.message.toLowerCase().includes('meeting_platform')
      ) {
        console.warn('⚠️ Coluna meeting_platform indisponível no banco. Reenviando sem essa informação.');
        const { meeting_platform, ...fallbackPayload } = insertPayload;
        insertResult = await attemptInsert(fallbackPayload);
        bookingInsertData = insertResult.data;
        bookingError = insertResult.error;
        if (!bookingError) {
          setSupportsMeetingPlatform(false);
        }
      }

      console.log('💾 Resultado do insert:', {
        success: !bookingError,
        data: bookingInsertData,
        error: bookingError,
        meeting_link_saved: bookingInsertData?.meeting_link,
        meeting_password_saved: bookingInsertData?.meeting_password
      });

      if (bookingError) {
        console.error('Erro ao criar agendamento:', bookingError);
        toast({
          variant: 'destructive',
          title: 'Não conseguimos concluir o agendamento',
          description: 'Revise os dados e tente mais uma vez. Se o erro continuar, chame nossa equipe para concluir manualmente.'
        });
        return;
      }

      const bookingId = bookingInsertData?.id;

      // 5.5. Enviar email de confirmação do agendamento
      try {
        console.log('📧 Preparando envio de email de confirmação...');
        const emailManager = new BookingEmailManager();

        const bookingDetails = {
          id: bookingId,
          patient_name: safePatientName,
          patient_email: normalizedPatientEmail,
          patient_phone: safePatientPhone,
          service_name: serviceDetails?.name || 'Consulta',
          professional_name: professionalDetails?.name || 'Profissional',
          appointment_date: selectedDate,
          appointment_time: selectedTime,
          status: 'pending',
          meeting_link: zoomMeetingData?.meeting_link,
          meeting_password: zoomMeetingData?.meeting_password,
          meeting_platform: bookingInsertData?.meeting_platform || (supportsMeetingPlatform ? bookingData.meeting_platform : undefined)
        };

        console.log('📧 Enviando email para:', normalizedPatientEmail);
        await emailManager.sendBookingConfirmation(bookingDetails);
        console.log('✅ Email de confirmação enviado com sucesso!');
      } catch (emailError) {
        // Não bloquear o fluxo se o email falhar
        console.error('⚠️ Erro ao enviar email (não crítico):', emailError);
      }

      // 6. Redirecionar para checkout
      console.log('✅ [handleBooking] Agendamento criado com sucesso! Redirecionando para checkout...');

      // Redirecionar para página de checkout
      navigate(`/checkout?booking_id=${bookingId}`);

    } catch (error) {
      console.error('Erro geral no processo de agendamento:', error);
      toast({
        variant: 'destructive',
        title: 'Erro inesperado no agendamento',
        description: 'Nossa equipe foi notificada. Atualize a página e tente novamente ou entre em contato para concluir o atendimento.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <ProfessionalStep
            services={services}
            professionals={professionals}
            servicePriceRange={servicePriceRange}
            selectedService={selectedService}
            selectedProfessional={selectedProfessional}
            onSelectService={handleServiceSelect}
            onSelectProfessional={handleProfessionalSelect}
            onNext={() => setStep(2)}
            availability={availability}
            displayMode="service-only"
          />
        );
      case 2:
        return (
          <ProfessionalStep
            services={services}
            professionals={professionals}
            servicePriceRange={servicePriceRange}
            selectedService={selectedService}
            selectedProfessional={selectedProfessional}
            onSelectService={handleServiceSelect}
            onSelectProfessional={handleProfessionalSelect}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
            availability={availability}
            displayMode="professional-only"
          />
        );
      case 3:
        return (
          <DateTimeStep
            professionals={professionals}
            selectedProfessional={selectedProfessional}
            selectedServiceDetails={selectedServiceDetails}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            onSelectDate={handleDateSelect}
            onSelectTime={setSelectedTime}
            currentMonth={currentMonth}
            onPrevMonth={prevMonth}
            onNextMonth={nextMonth}
            isPrevMonthDisabled={isPrevMonthDisabled}
            isDateDisabled={isDateDisabled}
            getDaysInMonth={getDaysInMonth}
            formatDateToString={formatDateToString}
            availableTimes={availableTimes}
            bookedSlots={bookedSlots}
            isLoadingTimes={isLoadingSlots}
            topTestimonials={topTestimonials}
            onBack={() => setStep(2)}
            onNext={() => setStep(4)}
          />
        );
      case 4:
        return (
          <>
            <PatientAccountStep
              authUser={authUser}
              patientData={patientData}
              register={register}
              errors={formErrors}
              emailError={emailError}
              passwordError={passwordError}
              isExistingPatient={isExistingPatient}
              minPasswordLength={MIN_PASSWORD_LENGTH}
              showPassword={showPassword}
              showConfirmPassword={showConfirmPassword}
              meetingPlatform={meetingPlatform}
              meetingOptions={MEETING_OPTIONS}
              onToggleExistingPatient={toggleExistingPatient}
              onToggleShowPassword={() => setShowPassword((prev) => !prev)}
              onToggleShowConfirmPassword={() => setShowConfirmPassword((prev) => !prev)}
              onPasswordResetRequest={handlePasswordResetRequest}
              onSelectMeetingPlatform={setMeetingPlatform}
              // Novos props de validação de email
              isCheckingEmail={isCheckingEmail}
              emailExists={emailExists}
              emailCheckError={emailCheckError}
            />
            <div className="flex flex-col sm:flex-row gap-4 mt-6">
              <Button onClick={() => setStep(3)} variant="outline">
                Voltar
              </Button>
              <Button
                onClick={handleProceedToSummary}
                disabled={!canProceedToSummary}
                className="bg-[#2d8659] hover:bg-[#236b47] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuar
              </Button>
            </div>
          </>
        );
      case 5:
        return (
          <PaymentSummaryStep
            professionals={professionals}
            selectedProfessional={selectedProfessional}
            serviceDetails={selectedServiceDetails}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            meetingPlatform={meetingPlatform}
            paymentSecurityHighlights={paymentSecurityHighlights}
            acceptTermsField={register('acceptTerms')}
            acceptTermsError={formErrors.acceptTerms?.message}
            onBack={() => setStep(4)}
            onSubmit={handleBooking}
            onSupport={handleSupportWhatsappClick}
            isSubmitting={isSubmitting}
            canSubmit={canSubmitBooking}
            submitButtonTitle={submitButtonTitle}
          />
        );
      case 6:
        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-4xl font-bold mb-4 text-gray-900">Agendamento Confirmado!</h2>
            <p className="text-xl text-gray-600 mb-8">Seu agendamento foi registrado com sucesso</p>

            <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-xl border border-blue-200 mb-8">
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2 justify-center">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">Agendamento salvo</span>
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <CreditCard className="w-5 h-5 text-green-600" />
                  <span className="font-medium">Pagamento processando</span>
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <CheckCircle className="w-5 h-5 text-purple-600" />
                  <span className="font-medium">Email será enviado</span>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 bg-yellow-600 rounded-full"></div>
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-yellow-900 mb-2">Próximos passos:</h4>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>• Você será redirecionado para o pagamento</li>
                    <li>• Após confirmação, receberá email com detalhes</li>
                    <li>• Link da consulta será enviado por email e WhatsApp</li>
                    <li>• Lembre-se: a sessão começa pontualmente no horário marcado</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <Button onClick={() => navigate('/')} variant="outline" className="border-[#2d8659] text-[#2d8659]">
                <ArrowLeft className="w-4 h-4 mr-2" />Voltar ao Início
              </Button>
              <Button onClick={() => navigate('/area-do-paciente')} className="bg-[#2d8659] hover:bg-[#236b47]">
                Acessar Área do Paciente
              </Button>
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  const progressSteps = [
    { id: 1, label: 'Serviço' },
    { id: 2, label: 'Profissional' },
    { id: 3, label: 'Data/Hora' },
    { id: 4, label: 'Dados do Paciente' },
    { id: 5, label: 'Pagamento' },
  ];

  const selectionLabels = useMemo(() => {
    const serviceList = Array.isArray(services) ? services : [];
    const professionalList = Array.isArray(professionals) ? professionals : [];
    const serviceLabel = selectedService ? serviceList.find((service) => service.id === selectedService)?.name : null;
    const professionalLabel = selectedProfessional
      ? professionalList.find((professional) => professional.id === selectedProfessional)?.name
      : null;
    const dateLabel = selectedDate
      ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      })
      : null;

    return {
      serviceLabel,
      professionalLabel,
      dateLabel,
      timeLabel: selectedTime || null,
    };
  }, [selectedDate, selectedProfessional, selectedService, selectedTime, services, professionals]);

  const handleStepClick = (clickedStep) => {
    if (clickedStep <= step) {
      if (clickedStep === 1) {
        setSelectedService('');
        setSelectedProfessional('');
        setSelectedDate('');
        setSelectedTime('');
      }
      setStep(clickedStep);
    }
  };

  const canAccessStep = (stepNumber) => {
    if (stepNumber === 1) return true;
    if (stepNumber === 2) return Boolean(selectedService);
    if (stepNumber === 3) return Boolean(selectedService && selectedProfessional);
    if (stepNumber === 4) return hasScheduleSelection;
    if (stepNumber === 5) return canProceedToSummary;
    return false;
  };

  return (
    <>
      <Helmet>
        <title>Agendamento - Doxologos Clínica Online</title>
        <meta name="description" content="Agende sua consulta online com nossos profissionais qualificados." />
      </Helmet>
      <header className="fixed top-0 w-full bg-white/95 backdrop-blur-sm shadow-sm z-50">
        <nav className="container mx-auto px-4 py-4" role="navigation" aria-label="Navegação principal">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2" aria-label="Doxologos - Voltar à página inicial">
              <Heart className="w-8 h-8 text-[#2d8659]" aria-hidden="true" />
              <span className="text-2xl font-bold gradient-text">Doxologos</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link to="/" className="text-gray-700 hover:text-[#2d8659] transition-colors">
                ← Voltar ao Site
              </Link>
            </div>
          </div>
        </nav>
      </header>
      <div className="min-h-screen bg-gray-50 py-12 pt-24">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Personalized Greeting */}
          <PersonalizedGreeting userName={userName} />

          {step <= progressSteps.length && (
            <BookingStepper
              steps={progressSteps}
              currentStep={step}
              onStepClick={handleStepClick}
              canAccessStep={canAccessStep}
              selections={selectionLabels}
            />
          )}

          {/* Welcome Message for First-Time Users */}
          {step === 1 && <WelcomeMessage isFirstBooking={isFirstBooking} />}

          {/* Progress Celebration */}
          <ProgressCelebration step={step} />

          {/* Conteúdo da etapa atual */}
          <Suspense fallback={<StepLoader />}>
            {renderStepContent()}
          </Suspense>
        </div>
      </div>

      {/* Live Activity Notification */}
      <LiveActivity currentStep={step} />

      {/* Floating Summary Card - Mobile Only */}
      {(selectedService || selectedProfessional || selectedDate || selectedTime) && step < 5 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-2xl p-4 z-50 md:hidden"
        >
          <div className="container mx-auto max-w-md">
            {/* Selection Summary */}
            <div className="text-sm space-y-1.5 mb-3">
              {selectedServiceDetails && (
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#2d8659] flex-shrink-0" />
                  <span className="font-semibold text-gray-900 truncate">{selectedServiceDetails.name}</span>
                  {selectedServiceDetails.price && (
                    <span className="ml-auto font-bold text-[#2d8659] whitespace-nowrap">
                      R$ {parseFloat(selectedServiceDetails.price).toLocaleString('pt-BR', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  )}
                </div>
              )}
              {selectedProfessional && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span className="text-gray-700 truncate">
                    {professionals.find((p) => p.id === selectedProfessional)?.name || 'Profissional'}
                  </span>
                </div>
              )}
              {selectedDate && selectedTime && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-600 flex-shrink-0" />
                  <span className="text-gray-700">
                    {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('pt-BR', {
                      day: 'numeric',
                      month: 'short',
                      timeZone: 'UTC',
                    })}{' '}
                    às {selectedTime}
                  </span>
                </div>
              )}
            </div>

            {/* Continue Button */}
            <Button
              onClick={() => {
                if (step === 1 && selectedService) {
                  setStep(2);
                } else if (step === 2 && selectedProfessional) {
                  setStep(3);
                } else if (step === 3 && selectedDate && selectedTime) {
                  setStep(4);
                }
              }}
              disabled={(
                (step === 1 && !selectedService) ||
                (step === 2 && !selectedProfessional) ||
                (step === 3 && (!selectedDate || !selectedTime))
              )}
              className="w-full bg-[#2d8659] hover:bg-[#236b47] disabled:opacity-50 disabled:cursor-not-allowed h-12 text-base font-semibold"
            >
              Continuar <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </div>
        </motion.div>
      )}
    </>
  );
};

export default AgendamentoPage;
