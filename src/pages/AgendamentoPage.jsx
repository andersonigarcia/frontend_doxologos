
import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, ArrowLeft, Calendar, User, Clock, CreditCard, Check, CalendarX, Shield, Zap, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const AgendamentoPage = () => {
    const { toast } = useToast();
    const navigate = useNavigate();
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

    const fetchData = useCallback(async () => {
        const { data: profsData, error: profsError } = await supabase
            .from('professionals')
            .select('*');
        
        if (profsError) {
            console.error('Erro ao buscar profissionais:', profsError);
            toast({ variant: 'destructive', title: 'Erro ao buscar profissionais', description: profsError.message });
        } else {
            setProfessionals(profsData || []);
        }

        const { data: servicesData, error: servicesError } = await supabase.from('services').select('*');
        if (servicesError) toast({ variant: 'destructive', title: 'Erro ao buscar serviços' });
        else setServices(servicesData || []);

        const { data: availData, error: availError } = await supabase.from('availability').select('*');
        if (availError) toast({ variant: 'destructive', title: 'Erro ao buscar horários' });
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
        if (blockedError) toast({ variant: 'destructive', title: 'Erro ao buscar datas bloqueadas' });
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
            toast({ variant: 'destructive', title: 'Erro ao buscar horários ocupados' });
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
        
        return times;
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
        setIsSubmitting(true);
        const tempPassword = Math.random().toString(36).slice(-8);
        const { data: { user: authUser }, error: getUserError } = await supabase.auth.getUser();

        let userId;

        if (getUserError && getUserError.message !== "User not found") {
            toast({ variant: "destructive", title: "Erro de Autenticação", description: getUserError.message });
            return;
        }

        if (authUser) {
            userId = authUser.id;
        }

        // Get service details to capture current price
        const serviceDetails = services.find(s => s.id === selectedService);
        const valorConsulta = parseFloat(serviceDetails?.price || 0);

        // Store patient contact info directly on booking for unauthenticated users and send magic link
        const bookingData = { 
            professional_id: selectedProfessional, 
            service_id: selectedService, 
            user_id: userId, 
            booking_date: selectedDate, 
            booking_time: selectedTime, 
            status: 'pending_payment', 
            patient_name: patientData.name, 
            patient_email: patientData.email, 
            patient_phone: patientData.phone,
            valor_consulta: valorConsulta // Valor histórico da consulta
        };

        if (!authUser) {
          // send magic link so patient can later access area
          try {
            await supabase.auth.signInWithOtp({ email: patientData.email });
            toast({ title: 'Magic link enviado', description: 'Verifique seu email para completar o cadastro.' });
          } catch (e) {
            // Magic link failed silently
          }
        }
        const { data: bookingInsertData, error: bookingError } = await supabase.from('bookings').insert([bookingData]).select().single();

        if (bookingError) {
          toast({ variant: 'destructive', title: 'Erro ao criar agendamento', description: bookingError.message });
          return;
        }

        const bookingId = bookingInsertData?.id;

        try {
          // Call backend Edge Function to create Mercado Pago preference
          const resp = await fetch('/functions/mp-create-preference', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ booking_id: bookingId, payer: { email: patientData.email, name: patientData.name, phone: patientData.phone } })
          });

          if (!resp.ok) {
            const txt = await resp.text();
            console.error('Erro ao criar preferência de pagamento');
            toast({ title: 'Agendamento criado', description: 'Não foi possível iniciar o pagamento. Tente novamente mais tarde.' });
            setStep(5);
            return;
          }

          const json = await resp.json();
          const initPoint = json.init_point || json.mp?.init_point;
          if (initPoint) {
            // Redirect user to Mercado Pago checkout
            window.location.href = initPoint;
            return;
          } else {
            toast({ title: 'Agendamento criado', description: 'Pagamento deverá ser realizado manualmente.' });
            setStep(5);
            return;
          }
        } catch (err) {
          console.error('Error creating MP preference', err);
          toast({ title: 'Agendamento criado', description: 'Erro ao iniciar pagamento.' });
          setStep(5);
        } finally {
          setIsSubmitting(false);
        }
    };
      
    const renderStepContent = () => {
        switch (step) {
          case 1:
            return (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-lg p-8">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold mb-3 flex items-center justify-center"><CreditCard className="w-8 h-8 mr-3 text-[#2d8659]" />Escolha o Serviço</h2>
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
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">Data</label>
                  <input type="date" value={selectedDate} onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime(''); }} min={new Date().toISOString().split('T')[0]} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent" />
                </div>
                {selectedDate && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-lg font-semibold text-gray-900">Horários Disponíveis</label>
                      <p className="text-sm text-gray-600">
                        {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { 
                          weekday: 'long', 
                          day: 'numeric', 
                          month: 'long',
                          timeZone: 'UTC' 
                        })}
                      </p>
                    </div>
                    {isLoadingTimes ? (
                      <div className="flex items-center justify-center py-8">
                        <motion.div 
                          className="w-8 h-8 border-4 border-[#2d8659] border-t-transparent rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                        <span className="ml-3 text-gray-600">Carregando horários...</span>
                      </div>
                    ) : availableTimes.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {availableTimes.map((time) => {
                          const isBooked = bookedSlots.includes(time);
                          return (
                            <motion.button 
                              key={time} 
                              onClick={() => !isBooked && setSelectedTime(time)} 
                              disabled={isBooked}
                              className={`p-4 rounded-lg border-2 transition-all duration-300 font-medium relative group ${
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
                              <div className="text-lg">{time}</div>
                              {!isBooked && selectedTime !== time && (
                                <div className="absolute inset-0 flex items-center justify-center bg-[#2d8659] text-white rounded-lg opacity-0 group-hover:opacity-90 transition-opacity">
                                  <Clock className="w-5 h-5" />
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
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <CalendarX className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-500 font-medium mb-2">Nenhum horário disponível para esta data</p>
                        <p className="text-sm text-gray-400">Por favor, selecione outra data</p>
                      </div>
                    )}
                  </div>
                )}
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
                    <input type="text" required value={patientData.name} onChange={(e) => setPatientData({...patientData, name: e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <input type="email" required value={patientData.email} onChange={(e) => setPatientData({...patientData, email: e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Telefone</label>
                    <input type="tel" required value={patientData.phone} onChange={(e) => setPatientData({...patientData, phone: e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent" />
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
                    whileHover={!isSubmitting && patientData.name && patientData.email && patientData.phone ? { scale: 1.02, y: -1 } : {}}
                    whileTap={!isSubmitting && patientData.name && patientData.email && patientData.phone ? { scale: 0.98 } : {}}
                    className="flex-1"
                  >
                    <Button 
                      onClick={handleBooking} 
                      disabled={!patientData.name || !patientData.email || !patientData.phone || isSubmitting} 
                      className={`w-full bg-[#2d8659] hover:bg-[#236b47] transition-all duration-300 flex items-center justify-center min-h-[50px] ${
                        isSubmitting ? 'cursor-not-allowed opacity-75' : ''
                      }`}
                      title={!patientData.name || !patientData.email || !patientData.phone ? 'Preencha todos os campos obrigatórios' : ''}
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
            <nav className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <Link to="/" className="flex items-center space-x-2">
                  <Heart className="w-8 h-8 text-[#2d8659]" />
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
