
import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, ArrowLeft, Calendar, User, Clock, CreditCard, Check, CalendarX, Shield, Zap, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useBookingTracking, useFormTracking } from '@/hooks/useAnalytics';
import { BookingEmailManager } from '@/lib/bookingEmailManager';
import { useComponentErrorTracking } from '@/hooks/useErrorTracking';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { zoomService } from '@/lib/zoomService';
import { secureLog } from '@/lib/secureLogger';

const AgendamentoPage = () => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const { user: authUser } = useAuth();
    const [step, setStep] = useState(1);
    const [professionals, setProfessionals] = useState([]);
    const [services, setServices] = useState([]);
    const [availability, setAvailability] = useState({});
    const [blockedDates, setBlockedDates] = useState([]);
    const [bookedSlots, setBookedSlots] = useState([]);
    
    const [selectedProfessional, setSelectedProfessional] = useState('');
    const [selectedService, setSelectedService] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTime, setSelectedTime] = useState('');
    const [patientData, setPatientData] = useState({ name: '', email: '', phone: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingTimes, setIsLoadingTimes] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [emailError, setEmailError] = useState('');

    // Função para formatar telefone com máscara (00) 00000-0000
    const formatPhoneNumber = (value) => {
        // Remove tudo que não é dígito
        const numbers = value.replace(/\D/g, '');
        
        // Aplica a máscara
        if (numbers.length <= 2) {
            return numbers;
        } else if (numbers.length <= 7) {
            return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
        } else if (numbers.length <= 11) {
            return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
        }
        // Limita a 11 dígitos
        return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    };

    // Função para validar email
    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    // Handler para mudança de telefone com máscara
    const handlePhoneChange = (e) => {
        const formatted = formatPhoneNumber(e.target.value);
        setPatientData({...patientData, phone: formatted});
    };

    // Handler para mudança de email com validação
    const handleEmailChange = (e) => {
        const email = e.target.value;
        setPatientData({...patientData, email});
        
        if (email && !validateEmail(email)) {
            setEmailError('Por favor, insira um email válido');
        } else {
            setEmailError('');
        }
    };

    // Analytics and Error Tracking Hooks
    const { trackBookingStart, trackBookingStep, trackBookingComplete, trackBookingAbandon } = useBookingTracking();
    const { trackFormStart, trackFormSubmit, trackFormError } = useFormTracking('booking');
    const { trackComponentError, trackAsyncError } = useComponentErrorTracking('AgendamentoPage');

    const fetchData = useCallback(async () => {
        const { data: profsData, error: profsError } = await supabase
            .from('professionals')
            .select('*');
        
    if (profsError) {
      console.error('Erro ao buscar profissionais:', profsError);
      toast({
        variant: 'destructive',
        title: 'Não conseguimos carregar os profissionais',
        description: 'Atualize a página ou tente novamente em alguns minutos. Se continuar, fale conosco pelo WhatsApp.'
      });
        } else {
            setProfessionals(profsData || []);
        }

        const { data: servicesData, error: servicesError } = await supabase.from('services').select('*');
    if (servicesError) {
      console.error('Erro ao buscar serviços:', servicesError);
      toast({
        variant: 'destructive',
        title: 'Não conseguimos carregar os serviços',
        description: 'Tente novamente em instantes. Caso o erro persista, entre em contato com nossa equipe.'
      });
    }
        else setServices(servicesData || []);

        const { data: availData, error: availError } = await supabase.from('availability').select('*');
    if (availError) {
      console.error('Erro ao buscar horários disponíveis:', availError);
      toast({
        variant: 'destructive',
        title: 'Agenda indisponível no momento',
        description: 'Estamos ajustando os horários. Volte em alguns minutos ou escolha outro profissional.'
      });
    }
        else {
          const availabilityMap = {};
          (availData || []).forEach(avail => {
            if (!availabilityMap[avail.professional_id]) {
              availabilityMap[avail.professional_id] = {};
            }
            availabilityMap[avail.professional_id][avail.day_of_week] = avail.available_times;
          });
          setAvailability(availabilityMap);
        }

    const { data: blockedData, error: blockedError } = await supabase.from('blocked_dates').select('*');
    if (blockedError) {
      console.error('Erro ao buscar datas bloqueadas:', blockedError);
      toast({
        variant: 'destructive',
        title: 'Não foi possível validar as datas',
        description: 'Recarregue a página para atualizar a agenda. Persistindo, fale conosco.'
      });
    }
        else setBlockedDates(blockedData || []);

    }, [toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const fetchBookedSlots = useCallback(async () => {
        if (!selectedProfessional || !selectedDate) {
            setBookedSlots([]);
            return;
        }
        const { data, error } = await supabase
            .from('bookings')
            .select('booking_time')
            .eq('professional_id', selectedProfessional)
            .eq('booking_date', selectedDate)
            .in('status', ['confirmed', 'pending_payment']);
        
    if (error) {
      console.error('Erro ao buscar horários ocupados:', error);
      toast({
        variant: 'destructive',
        title: 'Não foi possível atualizar os horários',
        description: 'Verifique sua conexão ou tente outro horário. Nosso time pode ajudar pelo WhatsApp.'
      });
            setBookedSlots([]);
        } else {
            setBookedSlots(data.map(b => b.booking_time));
        }
    }, [selectedProfessional, selectedDate, toast]);

    useEffect(() => {
        fetchBookedSlots();
    }, [fetchBookedSlots]);

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

    // Simular loading de horários quando data ou profissional mudam
    useEffect(() => {
        if (selectedDate && selectedProfessional) {
            setIsLoadingTimes(true);
            const timer = setTimeout(() => {
                setIsLoadingTimes(false);
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [selectedDate, selectedProfessional]);

    const handleBooking = async () => {
        console.log('🚀 [handleBooking] INÍCIO - Iniciando processo de agendamento');
        console.log('🚀 [handleBooking] Dados do formulário:', {
            selectedDate,
            selectedTime,
            selectedService,
            selectedProfessional,
            patientData,
            authUser: !!authUser
        });
        
        setIsSubmitting(true);
        
        try {
            // 1. Usar o usuário do contexto (já autenticado ou null)
            let userId;

            console.log('👤 [handleBooking] Verificando autenticação...');
            
            if (authUser) {
                // Usuário já autenticado
                userId = authUser.id;
                console.log('✅ [handleBooking] Usuário autenticado:', userId);
            } else {
                console.log('⚠️ [handleBooking] Usuário NÃO autenticado - criando/buscando pelo email...');
                // 2. Usuário não autenticado - buscar ou criar pelo email
                
                // Primeiro, tentar criar o usuário com signUp
                const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
                
                const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                    email: patientData.email,
                    password: tempPassword,
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
                    // Se o erro for "User already registered", buscar user_id existente
                    if (signUpError.message?.includes('already registered') || signUpError.message?.includes('already exists')) {
                        
                        // IMPORTANTE: Buscar user_id usando função RPC do Supabase
                        // Se a função RPC não existir, usa workaround (bookings anteriores)
                        
                        // Tentar usar função RPC primeiro
                        const { data: rpcUserId, error: rpcError } = await supabase
                            .rpc('get_user_id_by_email', { user_email: patientData.email });

                        if (!rpcError && rpcUserId) {
                            userId = rpcUserId;
                            console.log('✅ user_id encontrado via RPC:', userId);
                        } else {
                            console.log('⚠️ RPC falhou, usando workaround...');
                            // Workaround: Buscar user_id de agendamentos anteriores deste email
                            const { data: existingBooking } = await supabase
                                .from('bookings')
                                .select('user_id')
                                .eq('patient_email', patientData.email)
                                .not('user_id', 'is', null)
                                .limit(1)
                                .single();

                            if (existingBooking && existingBooking.user_id) {
                                userId = existingBooking.user_id;
                                console.log('✅ user_id encontrado via workaround:', userId);
                            } else {
                                // Se não encontrou user_id, ENVIAR magic link e pedir para fazer login
                                console.log('❌ user_id não encontrado, enviando magic link...');
                                
                                const { error: otpError } = await supabase.auth.signInWithOtp({ 
                                    email: patientData.email,
                                    options: {
                                        emailRedirectTo: `${window.location.origin}/area-do-paciente`
                                    }
                                });

                if (otpError) {
                  console.error('Erro ao enviar magic link:', otpError);
                  toast({ 
                    variant: 'destructive', 
                    title: 'Não conseguimos enviar o link de acesso', 
                    description: 'Confirme se o email está correto e tente novamente em alguns minutos. Se nada chegar, fale conosco pelo WhatsApp.' 
                  });
                                } else {
                                    toast({ 
                                        variant: 'default',
                    title: 'Email de acesso enviado', 
                    description: 'Procure pelo remetente contato@doxologos.com.br e clique no link para retomar seu agendamento.' 
                                    });
                                }
                                
                                console.log('❌ [handleBooking] RETURN: user_id não encontrado, magic link enviado');
                                setIsSubmitting(false);
                                return;
                            }
                        }
                        
                        // Se chegou aqui, user_id foi encontrado - continuar com agendamento
            toast({ 
              title: 'Bem-vindo de volta!', 
              description: 'Localizamos seu cadastro e vamos continuar de onde você parou.' 
            });
                        
                    } else {
                        console.error('Erro ao criar usuário:', signUpError);
                        console.log('❌ [handleBooking] RETURN: Erro ao criar cadastro');
            toast({ 
              variant: 'destructive', 
              title: 'Não foi possível criar seu acesso', 
              description: 'Use outro email ou tente novamente em alguns minutos. Persistindo, fale com nossa equipe para concluir o agendamento.' 
            });
                        setIsSubmitting(false);
                        return;
                    }
                } else {
                    // Usuário criado com sucesso
                    userId = signUpData.user?.id;
                    
                    // Enviar email de confirmação (magic link)
          toast({ 
            title: 'Cadastro criado!', 
            description: 'Enviamos um email de confirmação. Confirme sua conta para acompanhar o agendamento.' 
          });
                }
            }

            console.log('💰 [handleBooking] Buscando detalhes do serviço...');
            
            // 3. Get service details to capture current price
            const serviceDetails = services.find(s => s.id === selectedService);
            const valorConsulta = parseFloat(serviceDetails?.price || 0);
            
            console.log('💰 [handleBooking] Serviço encontrado:', { 
                serviceName: serviceDetails?.name, 
                price: valorConsulta 
            });

            console.log('📝 [handleBooking] Preparando dados do agendamento...');
            
            // 4. Preparar dados do agendamento
            const bookingData = { 
                professional_id: selectedProfessional, 
                service_id: selectedService, 
                booking_date: selectedDate, 
                booking_time: selectedTime, 
                status: 'pending_payment', 
                patient_name: patientData.name, 
                patient_email: patientData.email, 
                patient_phone: patientData.phone,
                valor_consulta: valorConsulta
            };
            
            // Adicionar user_id se disponível
            if (userId) {
                bookingData.user_id = userId;
            }
            
            console.log('✅ [handleBooking] bookingData preparado:', bookingData);
            console.log('🎯 [handleBooking] Iniciando criação do Zoom...');

            // 4.5. Criar sala do Zoom ANTES de inserir o agendamento
            let zoomMeetingData = null;
            try {
                console.log('🎥 Criando sala do Zoom...');
                console.log('🎥 Dados do agendamento:', {
                    booking_date: selectedDate,
                    booking_time: selectedTime,
                    patient_name: patientData.name,
                    service_name: selectedService?.name,
                    professional_name: selectedProfessional?.name
                });

                zoomMeetingData = await zoomService.createBookingMeeting({
                    booking_date: selectedDate,
                    booking_time: selectedTime,
                    patient_name: patientData.name,
                    service_name: selectedService?.name || 'Consulta',
                    professional_name: selectedProfessional?.name || 'Profissional'
                });

                if (zoomMeetingData) {
                    secureLog.success('Sala do Zoom criada com sucesso!');
                    secureLog.info('Link:', zoomMeetingData.meeting_link);
                    secureLog.sensitive('Senha:', zoomMeetingData.meeting_password);
                    // Adicionar dados do Zoom ao booking
                    bookingData.meeting_link = zoomMeetingData.meeting_link;
                    bookingData.meeting_password = zoomMeetingData.meeting_password;
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

            // 5. Criar o agendamento
            console.log('💾 Dados do agendamento antes de inserir no banco:', {
                ...bookingData,
                has_meeting_link: !!bookingData.meeting_link,
                has_meeting_password: !!bookingData.meeting_password,
                has_meeting_id: !!bookingData.meeting_id,
                has_meeting_start_url: !!bookingData.meeting_start_url
            });

            const { data: bookingInsertData, error: bookingError } = await supabase.from('bookings').insert([bookingData]).select().single();

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
                setIsSubmitting(false);
                return;
            }

            const bookingId = bookingInsertData?.id;

            // 5.5. Enviar email de confirmação do agendamento
            try {
                console.log('📧 Preparando envio de email de confirmação...');
                const emailManager = new BookingEmailManager();
                
                const bookingDetails = {
                    id: bookingId,
                    patient_name: patientData.name,
                    patient_email: patientData.email,
                    patient_phone: patientData.phone,
                    service_name: selectedService?.name || 'Consulta',
                    professional_name: selectedProfessional?.name || 'Profissional',
                    appointment_date: selectedDate,
                    appointment_time: selectedTime,
                    status: 'pending',
                    meeting_link: zoomMeetingData?.meeting_link,
                    meeting_password: zoomMeetingData?.meeting_password
                };

                console.log('📧 Enviando email para:', patientData.email);
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
            setIsSubmitting(false);
        }
    };
      
    const renderStepContent = () => {
        switch (step) {
          case 1:
            return (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-lg p-8">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold mb-3 flex items-center justify-center" id="step-1-title"><CreditCard className="w-8 h-8 mr-3 text-[#2d8659]" aria-hidden="true" />Escolha o Serviço</h2>
                  <p className="text-gray-600 text-lg">Selecione o tipo de atendimento que você precisa</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {services.map((service) => {
                    const professionalCount = professionals.filter(prof => 
                      prof.services_ids && prof.services_ids.includes(service.id)
                    ).length;
                    
                    return (
                      <button 
                        key={service.id} 
                        onClick={() => { setSelectedService(service.id); setStep(2); }} 
                        className={`p-6 rounded-lg border-2 transition-all hover:shadow-lg text-left group hover:scale-[1.02] ${
                          selectedService === service.id 
                            ? 'border-[#2d8659] bg-gradient-to-br from-[#2d8659]/5 to-[#2d8659]/10 shadow-md' 
                            : 'border-gray-200 hover:border-[#2d8659] bg-white'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <h3 className="font-bold text-xl mb-2 text-gray-900 group-hover:text-[#2d8659] transition-colors">
                              {service.name}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {service.duration_minutes >= 60 
                                  ? `${Math.floor(service.duration_minutes / 60)}h${service.duration_minutes % 60 > 0 ? ` ${service.duration_minutes % 60}min` : ''}` 
                                  : `${service.duration_minutes}min`
                                }
                              </span>
                              <span className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                {professionalCount} {professionalCount === 1 ? 'profissional' : 'profissionais'}
                              </span>
                            </div>
                            {service.description && (
                              <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                                {service.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="text-2xl font-bold text-[#2d8659]">
                            R$ {parseFloat(service.price).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                          </div>
                          <div className="bg-[#2d8659] text-white px-3 py-1 rounded-full text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                            Selecionar
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-1">Como funciona?</h4>
                      <p className="text-sm text-blue-800">
                        Após selecionar o serviço, você poderá escolher o profissional, data e horário de sua preferência. 
                        O pagamento é seguro e o link da consulta será enviado após a confirmação.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          case 2:
            const availableProfessionals = professionals.filter(prof => 
              prof.services_ids && prof.services_ids.includes(selectedService)
            );
            const selectedServiceData = services.find(s => s.id === selectedService);
            
            return (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-lg p-8">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold mb-3 flex items-center justify-center"><User className="w-8 h-8 mr-3 text-[#2d8659]" />Escolha o Profissional</h2>
                  <p className="text-gray-600 text-lg">Selecione o profissional que irá atendê-lo</p>
                </div>
                
                <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Serviço selecionado:</p>
                      <p className="font-bold text-[#2d8659] text-lg">{selectedServiceData?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Duração: {selectedServiceData?.duration_minutes >= 60 
                        ? `${Math.floor(selectedServiceData.duration_minutes / 60)}h${selectedServiceData.duration_minutes % 60 > 0 ? ` ${selectedServiceData.duration_minutes % 60}min` : ''}` 
                        : `${selectedServiceData?.duration_minutes}min`}</p>
                      <p className="font-bold text-[#2d8659]">R$ {parseFloat(selectedServiceData?.price || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                    </div>
                  </div>
                </div>
                
                {availableProfessionals.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <User className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 mb-4 font-medium">Nenhum profissional disponível para este serviço</p>
                    <Button onClick={() => setStep(1)} variant="outline" className="border-[#2d8659] text-[#2d8659]">
                      <ArrowLeft className="w-4 h-4 mr-2" />Escolher outro serviço
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {availableProfessionals.map((prof) => (
                      <button 
                        key={prof.id} 
                        onClick={() => { setSelectedProfessional(prof.id); setStep(3); }} 
                        className={`p-6 rounded-lg border-2 transition-all hover:shadow-lg text-left group hover:scale-[1.02] ${
                          selectedProfessional === prof.id 
                            ? 'border-[#2d8659] bg-gradient-to-br from-[#2d8659]/5 to-[#2d8659]/10 shadow-md' 
                            : 'border-gray-200 hover:border-[#2d8659] bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            {prof.image_url ? (
                              <img 
                                src={prof.image_url} 
                                alt={prof.name} 
                                className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 group-hover:border-[#2d8659] transition-colors" 
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#2d8659] to-[#236b47] flex items-center justify-center text-white font-bold text-xl">
                                {prof.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-xl mb-2 text-gray-900 group-hover:text-[#2d8659] transition-colors">
                              {prof.name}
                            </h3>
                            {prof.mini_curriculum && (
                              <p className="text-gray-600 text-sm mb-3 line-clamp-3">
                                {prof.mini_curriculum.length > 120 
                                  ? `${prof.mini_curriculum.substring(0, 120)}...` 
                                  : prof.mini_curriculum
                                }
                              </p>
                            )}
                            {prof.email && (
                              <p className="text-xs text-gray-500 mb-2">📧 {prof.email}</p>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">
                                ✓ Especialista em {selectedServiceData?.name}
                              </span>
                              <div className="bg-[#2d8659] text-white px-3 py-1 rounded-full text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                Selecionar
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                <Button onClick={() => setStep(1)} variant="outline" className="mt-6">Voltar</Button>
              </motion.div>
            );
          case 3:
            const availableTimes = getAvailableTimesForDate();
            return (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-lg p-8">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold mb-3 flex items-center justify-center"><Clock className="w-8 h-8 mr-3 text-[#2d8659]" />Escolha Data e Horário</h2>
                  <p className="text-gray-600 text-lg">Selecione o melhor dia e horário para sua consulta</p>
                </div>
                
                <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-[#2d8659] rounded-full flex items-center justify-center flex-shrink-0">
                        {professionals.find(p => p.id === selectedProfessional)?.image_url ? (
                          <img 
                            src={professionals.find(p => p.id === selectedProfessional)?.image_url} 
                            alt="Profissional" 
                            className="w-12 h-12 rounded-full object-cover" 
                          />
                        ) : (
                          <User className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Profissional:</p>
                        <p className="font-bold text-[#2d8659]">{professionals.find(p => p.id === selectedProfessional)?.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Serviço:</p>
                        <p className="font-bold text-blue-600">{services.find(s => s.id === selectedService)?.name}</p>
                        <p className="text-sm text-gray-600">
                          {services.find(s => s.id === selectedService)?.duration_minutes >= 60 
                            ? `${Math.floor(services.find(s => s.id === selectedService).duration_minutes / 60)}h${services.find(s => s.id === selectedService).duration_minutes % 60 > 0 ? ` ${services.find(s => s.id === selectedService).duration_minutes % 60}min` : ''}` 
                            : `${services.find(s => s.id === selectedService)?.duration_minutes}min`
                          } • R$ {parseFloat(services.find(s => s.id === selectedService)?.price || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Layout em Grid: Calendário e Horários lado a lado */}
                <div className="grid lg:grid-cols-2 gap-6 mb-6">
                  {/* Calendário Visual */}
                  <div>
                    <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
                      {/* Header do Calendário */}
                      <div className="bg-gradient-to-r from-[#2d8659] to-[#236b47] text-white px-4 py-3">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={prevMonth}
                            disabled={isPrevMonthDisabled()}
                            className={`p-1.5 rounded-lg transition-all ${
                              isPrevMonthDisabled() 
                                ? 'opacity-30 cursor-not-allowed' 
                                : 'hover:bg-white/20 active:scale-95'
                            }`}
                            aria-label="Mês anterior"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          
                          <h3 className="text-lg font-bold capitalize">
                            {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                          </h3>
                          
                          <button
                            onClick={nextMonth}
                            className="p-1.5 rounded-lg hover:bg-white/20 active:scale-95 transition-all"
                            aria-label="Próximo mês"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Dias da Semana */}
                      <div className="grid grid-cols-7 gap-1 px-3 py-2 bg-gray-50">
                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                          <div key={day} className="text-center text-xs font-semibold text-gray-600 py-1">
                            {day}
                          </div>
                        ))}
                      </div>
                      
                      {/* Grade de Dias */}
                      <div className="grid grid-cols-7 gap-1.5 p-3">
                        {getDaysInMonth(currentMonth).map((date, index) => {
                          if (!date) {
                            return <div key={`empty-${index}`} className="aspect-square" />;
                          }
                          
                          const dateString = formatDateToString(date);
                          const isSelected = selectedDate === dateString;
                          const isDisabled = isDateDisabled(date);
                          const isToday = date.toDateString() === new Date().toDateString();
                          
                          return (
                            <motion.button
                              key={dateString}
                              onClick={() => {
                                if (!isDisabled) {
                                  setSelectedDate(dateString);
                                  setSelectedTime('');
                                }
                              }}
                              disabled={isDisabled}
                              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm font-medium transition-all ${
                                isDisabled
                                  ? 'text-gray-300 cursor-not-allowed bg-gray-50'
                                  : isSelected
                                  ? 'bg-[#2d8659] text-white shadow-lg scale-105'
                                  : isToday
                                  ? 'bg-blue-100 text-blue-700 border-2 border-blue-400 hover:bg-blue-200'
                                  : 'text-gray-700 hover:bg-[#2d8659]/10 hover:scale-105 border border-gray-200'
                              }`}
                              whileHover={!isDisabled ? { scale: 1.05 } : {}}
                              whileTap={!isDisabled ? { scale: 0.95 } : {}}
                            >
                              <span className="text-base">{date.getDate()}</span>
                              {isToday && !isSelected && (
                                <span className="text-[9px] text-blue-600 font-bold">Hoje</span>
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                      
                      {/* Legenda */}
                      <div className="flex items-center justify-center gap-4 px-3 py-2 bg-gray-50 border-t text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 bg-blue-100 border-2 border-blue-400 rounded"></div>
                          <span className="text-gray-600">Hoje</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 bg-[#2d8659] rounded"></div>
                          <span className="text-gray-600">Selecionado</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 bg-gray-50 rounded border"></div>
                          <span className="text-gray-600">Disponível</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Horários Disponíveis */}
                  <div className="flex flex-col">
                    {selectedDate ? (
                      <>
                        <div className="mb-4">
                          <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-4 border border-blue-200">
                            <p className="text-base font-semibold text-[#2d8659] text-center">
                              📅 {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { 
                                weekday: 'long', 
                                day: 'numeric', 
                                month: 'long',
                                timeZone: 'UTC' 
                              })}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex-1 bg-white rounded-xl shadow-md border border-gray-200 p-4">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2" id="available-times-label">
                            ⏰ Horários Disponíveis
                          </h3>
                          
                          {/* Indicador de duração do serviço */}
                          {selectedService && services.find(s => s.id === selectedService) && (
                            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="flex items-center gap-2 text-sm">
                                <Clock className="w-4 h-4 text-blue-600" />
                                <span className="text-gray-700">
                                  Duração do serviço: 
                                  <span className="font-semibold text-blue-600 ml-1">
                                    {services.find(s => s.id === selectedService)?.duration_minutes >= 60 
                                      ? `${Math.floor(services.find(s => s.id === selectedService).duration_minutes / 60)}h${services.find(s => s.id === selectedService).duration_minutes % 60 > 0 ? ` ${services.find(s => s.id === selectedService).duration_minutes % 60}min` : ''}` 
                                      : `${services.find(s => s.id === selectedService)?.duration_minutes} minutos`
                                    }
                                  </span>
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 mt-1 ml-6">
                                Os horários exibidos garantem tempo suficiente para o atendimento completo.
                              </p>
                            </div>
                          )}
                          
                          {isLoadingTimes ? (
                            <div className="flex flex-col items-center justify-center py-12">
                              <motion.div 
                                className="w-8 h-8 border-4 border-[#2d8659] border-t-transparent rounded-full"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              />
                              <span className="mt-3 text-gray-600">Carregando horários...</span>
                            </div>
                          ) : availableTimes.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-2" role="radiogroup" aria-labelledby="available-times-label">
                              {availableTimes.map((time) => {
                                const isBooked = bookedSlots.includes(time);
                                return (
                                  <motion.button 
                                    key={time} 
                                    onClick={() => !isBooked && setSelectedTime(time)} 
                                    disabled={isBooked}
                                    className={`p-3 rounded-lg border-2 transition-all duration-300 font-medium relative group ${
                                      isBooked 
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200 line-through' 
                                        : selectedTime === time 
                                          ? 'border-[#2d8659] bg-[#2d8659] text-white shadow-lg' 
                                          : 'border-gray-200 hover:border-[#2d8659] hover:bg-green-50 hover:shadow-md'
                                    }`}
                                    whileHover={!isBooked ? { scale: 1.02, y: -2 } : {}}
                                    whileTap={!isBooked ? { scale: 0.98 } : {}}
                                    title={isBooked ? 'Horário não disponível' : `Agendar para ${time}`}
                                  >
                                    <div className="text-base">{time}</div>
                                    {!isBooked && selectedTime !== time && (
                                      <div className="absolute inset-0 flex items-center justify-center bg-[#2d8659] text-white rounded-lg opacity-0 group-hover:opacity-90 transition-opacity">
                                        <Clock className="w-4 h-4" />
                                      </div>
                                    )}
                                    {isBooked && (
                                      <div className="text-xs text-gray-400 mt-1">Ocupado</div>
                                    )}
                                  </motion.button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-center py-12">
                              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CalendarX className="w-8 h-8 text-gray-400" />
                              </div>
                              <p className="text-gray-500 font-medium mb-2">Nenhum horário disponível</p>
                              <p className="text-sm text-gray-400">Selecione outra data</p>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center p-8">
                        <div className="text-center">
                          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-500 font-medium">Selecione uma data</p>
                          <p className="text-sm text-gray-400 mt-1">Os horários disponíveis aparecerão aqui</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-4 mt-6">
                  <Button onClick={() => setStep(2)} variant="outline">Voltar</Button>
                  {selectedDate && selectedTime && <Button onClick={() => setStep(4)} className="bg-[#2d8659] hover:bg-[#236b47]">Continuar</Button>}
                </div>
              </motion.div>
            );
          case 4:
            const serviceDetails = services.find(s => s.id === selectedService);
            return (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-lg p-8">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold mb-3">Confirmação e Dados Pessoais</h2>
                  <p className="text-gray-600 text-lg">Revise os detalhes e preencha seus dados para finalizar</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Nome Completo</label>
                    <input 
                      type="text" 
                      required 
                      value={patientData.name} 
                      onChange={(e) => setPatientData({...patientData, name: e.target.value})} 
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent"
                      placeholder="Seu nome completo" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <input 
                      type="email" 
                      required 
                      value={patientData.email} 
                      onChange={handleEmailChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent ${
                        emailError ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="seu@email.com" 
                    />
                    {emailError && (
                      <p className="text-red-500 text-sm mt-1">{emailError}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Telefone</label>
                    <input 
                      type="tel" 
                      required 
                      value={patientData.phone} 
                      onChange={handlePhoneChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent"
                      placeholder="(00) 00000-0000"
                      maxLength="15"
                    />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-[#2d8659]/5 to-blue-50 p-8 rounded-xl border border-[#2d8659]/20 mt-8">
                  <h3 className="font-bold text-xl mb-6 flex items-center text-[#2d8659]">
                    <CheckCircle className="w-6 h-6 mr-2" />
                    Resumo do Agendamento
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#2d8659] rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Profissional</p>
                          <p className="font-bold text-gray-900">{professionals.find(p => p.id === selectedProfessional)?.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Serviço</p>
                          <p className="font-bold text-gray-900">{serviceDetails?.name}</p>
                          <p className="text-sm text-gray-600">
                            Duração: {serviceDetails?.duration_minutes >= 60 
                              ? `${Math.floor(serviceDetails.duration_minutes / 60)}h${serviceDetails.duration_minutes % 60 > 0 ? ` ${serviceDetails.duration_minutes % 60}min` : ''}` 
                              : `${serviceDetails?.duration_minutes}min`
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Data</p>
                          <p className="font-bold text-gray-900">
                            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { 
                              weekday: 'long', 
                              day: 'numeric', 
                              month: 'long', 
                              year: 'numeric',
                              timeZone: 'UTC' 
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                          <Clock className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Horário</p>
                          <p className="font-bold text-gray-900">{selectedTime}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 mt-6 pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-green-600" />
                        <span className="text-sm text-gray-600">Pagamento seguro</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600 mb-1">Valor total:</p>
                        <p className="text-3xl font-bold text-[#2d8659]">
                          R$ {parseFloat(serviceDetails?.price || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start gap-3">
                      <Zap className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-blue-900 mb-1">Próximos passos</h4>
                        <p className="text-sm text-blue-800">
                          Após o pagamento, você receberá por email e WhatsApp o link da sala de consulta. 
                          A sessão começará pontualmente no horário agendado.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 mt-6">
                  <Button onClick={() => setStep(3)} variant="outline">Voltar</Button>
                  <motion.div
                    whileHover={!isSubmitting && patientData.name && patientData.email && patientData.phone && !emailError ? { scale: 1.02, y: -1 } : {}}
                    whileTap={!isSubmitting && patientData.name && patientData.email && patientData.phone && !emailError ? { scale: 0.98 } : {}}
                    className="flex-1"
                  >
                    <Button 
                      onClick={handleBooking} 
                      disabled={!patientData.name || !patientData.email || !patientData.phone || emailError || isSubmitting} 
                      className={`w-full bg-[#2d8659] hover:bg-[#236b47] transition-all duration-300 flex items-center justify-center min-h-[50px] ${
                        isSubmitting ? 'cursor-not-allowed opacity-75' : ''
                      }`}
                      title={
                        !patientData.name || !patientData.email || !patientData.phone 
                          ? 'Preencha todos os campos obrigatórios' 
                          : emailError 
                            ? 'Digite um email válido' 
                            : ''
                      }
                    >
                      {isSubmitting ? (
                        <>
                          <motion.div 
                            className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          />
                          Processando...
                        </>
                      ) : (
                        'Ir para Pagamento'
                      )}
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            );
          case 5:
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
        { id: 4, label: 'Dados' },
      ];

      const handleStepClick = (clickedStep) => {
        // Permite navegar para qualquer step anterior ou o atual
        if (clickedStep <= step) {
            // Ao voltar para step 1, limpa as seleções posteriores
            if (clickedStep === 1) {
                setSelectedService('');
                setSelectedProfessional('');
                setSelectedDate('');
                setSelectedTime('');
            }
            // Ao voltar para step 2, limpa seleções de data/hora
            else if (clickedStep === 2) {
                setSelectedProfessional('');
                setSelectedDate('');
                setSelectedTime('');
            }
            // Ao voltar para step 3, limpa apenas data/hora
            else if (clickedStep === 3) {
                setSelectedDate('');
                setSelectedTime('');
            }
            setStep(clickedStep);
        }
      };
      
      // Função para verificar se um step é acessível
      const canAccessStep = (stepNumber) => {
        if (stepNumber === 1) return true;
        if (stepNumber === 2) return selectedService !== '';
        if (stepNumber === 3) return selectedService !== '' && selectedProfessional !== '';
        if (stepNumber === 4) return selectedService !== '' && selectedProfessional !== '' && selectedDate !== '' && selectedTime !== '';
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
              {step < 5 && (
                <div className="mb-12">
                  <div className="relative">
                    {/* Linha de progresso */}
                    <div className="absolute top-5 left-0 w-full h-0.5 bg-gray-200 -z-10"></div>
                    <div 
                      className="absolute top-5 left-0 h-0.5 bg-[#2d8659] -z-10 transition-all duration-500 ease-out"
                      style={{ width: `${((step - 1) / (progressSteps.length - 1)) * 100}%` }}
                    ></div>
                    
                    <div className="flex items-center justify-between">
                      {progressSteps.map((s, index) => {
                        const isCompleted = step > s.id;
                        const isCurrent = step === s.id;
                        const canAccess = canAccessStep(s.id);
                        const isClickable = s.id <= step;
                        
                        return (
                          <div key={s.id} className="flex flex-col items-center relative">
                            <button 
                              onClick={() => handleStepClick(s.id)} 
                              disabled={!isClickable}
                              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 relative group ${
                                isCompleted 
                                  ? 'bg-[#2d8659] text-white shadow-lg hover:bg-[#236b47] hover:scale-110' 
                                  : isCurrent 
                                    ? 'bg-[#2d8659] text-white shadow-lg ring-4 ring-[#2d8659]/30 animate-glow' 
                                    : canAccess 
                                      ? 'bg-gray-300 text-gray-600 hover:bg-gray-400 cursor-pointer' 
                                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              }`}
                              title={isClickable ? `Ir para ${s.label}` : `Complete as etapas anteriores`}
                            >
                              {isCompleted ? (
                                <CheckCircle className="w-5 h-5" />
                              ) : (
                                s.id
                              )}
                              
                              {/* Tooltip on hover */}
                              {isClickable && (
                                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                  {isCompleted ? `✓ ${s.label} concluído` : `Voltar para ${s.label}`}
                                </div>
                              )}
                            </button>
                            <p className={`mt-3 text-xs text-center md:text-sm transition-colors font-medium ${
                              isCompleted || isCurrent 
                                ? 'text-[#2d8659]' 
                                : 'text-gray-500'
                            }`}>
                              {s.label}
                            </p>
                            
                            {/* Indicador de seleção */}
                            {((s.id === 1 && selectedService) || 
                              (s.id === 2 && selectedProfessional) || 
                              (s.id === 3 && selectedDate && selectedTime) ||
                              (s.id === 4 && patientData.name)) && (
                              <div className="mt-1 w-2 h-2 bg-green-500 rounded-full"></div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Resumo das seleções */}
                    {step > 1 && (
                      <div className="mt-6 flex flex-wrap gap-2 justify-center">
                        {selectedService && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                            <CreditCard className="w-3 h-3" />
                            {services.find(s => s.id === selectedService)?.name}
                          </span>
                        )}
                        {selectedProfessional && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            <User className="w-3 h-3" />
                            {professionals.find(p => p.id === selectedProfessional)?.name}
                          </span>
                        )}
                        {selectedDate && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                            <Calendar className="w-3 h-3" />
                            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { 
                              day: 'numeric', 
                              month: 'short',
                              timeZone: 'UTC' 
                            })}
                          </span>
                        )}
                        {selectedTime && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                            <Clock className="w-3 h-3" />
                            {selectedTime}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Conteúdo da etapa atual */}
              {renderStepContent()}
            </div>
          </div>
        </>
      );
    };

    export default AgendamentoPage;
