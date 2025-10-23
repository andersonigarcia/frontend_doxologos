
import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, ArrowLeft, Calendar, User, Clock, CreditCard, Check } from 'lucide-react';
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

    const handleBooking = async () => {
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
            console.warn('magic link failed', e);
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
            console.error('create preference failed', txt);
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
        }
    };
      
    const renderStepContent = () => {
        switch (step) {
          case 1:
            return (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-3xl font-bold mb-6 flex items-center"><CreditCard className="w-8 h-8 mr-3 text-[#2d8659]" />Escolha o Serviço</h2>
                <div className="space-y-4">
                  {services.map((service) => (
                    <button key={service.id} onClick={() => { setSelectedService(service.id); setStep(2); }} className={`w-full p-6 rounded-lg border-2 transition-all hover:shadow-lg text-left ${selectedService === service.id ? 'border-[#2d8659] bg-[#2d8659]/5' : 'border-gray-200 hover:border-[#2d8659]'}`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-bold text-xl mb-1">{service.name}</h3>
                          <p className="text-gray-600">{service.duration_minutes >= 60 ? `${Math.floor(service.duration_minutes / 60)}h${service.duration_minutes % 60 > 0 ? ` ${service.duration_minutes % 60}min` : ''}` : `${service.duration_minutes}min`}</p>
                        </div>
                        <div className="text-2xl font-bold text-[#2d8659]">R$ {parseFloat(service.price).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            );
          case 2:
            const availableProfessionals = professionals.filter(prof => 
              prof.services_ids && prof.services_ids.includes(selectedService)
            );
            return (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-3xl font-bold mb-6 flex items-center"><User className="w-8 h-8 mr-3 text-[#2d8659]" />Escolha o Profissional</h2>
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Serviço selecionado:</strong> {services.find(s => s.id === selectedService)?.name}
                  </p>
                </div>
                {availableProfessionals.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">Nenhum profissional disponível para este serviço.</p>
                    <Button onClick={() => setStep(1)} variant="outline">Escolher outro serviço</Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {availableProfessionals.map((prof) => (
                      <button key={prof.id} onClick={() => { setSelectedProfessional(prof.id); setStep(3); }} className={`w-full p-6 rounded-lg border-2 transition-all hover:shadow-lg text-left ${selectedProfessional === prof.id ? 'border-[#2d8659] bg-[#2d8659]/5' : 'border-gray-200 hover:border-[#2d8659]'}`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-bold text-xl mb-2">{prof.name}</h3>
                            {prof.mini_curriculum && (
                              <p className="text-gray-600 text-sm">{prof.mini_curriculum.substring(0, 100)}...</p>
                            )}
                          </div>
                          {prof.image_url && (
                            <img src={prof.image_url} alt={prof.name} className="w-12 h-12 rounded-full object-cover ml-4" />
                          )}
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
                <h2 className="text-3xl font-bold mb-6 flex items-center"><Clock className="w-8 h-8 mr-3 text-[#2d8659]" />Escolha Data e Horário</h2>
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Serviço:</strong> {services.find(s => s.id === selectedService)?.name} | 
                    <strong> Profissional:</strong> {professionals.find(p => p.id === selectedProfessional)?.name}
                  </p>
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">Data</label>
                  <input type="date" value={selectedDate} onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime(''); }} min={new Date().toISOString().split('T')[0]} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent" />
                </div>
                {selectedDate && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Horários Disponíveis</label>
                    {availableTimes.length > 0 ? (
                      <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                        {availableTimes.map((time) => {
                          const isBooked = bookedSlots.includes(time);
                          return (
                            <button 
                              key={time} 
                              onClick={() => !isBooked && setSelectedTime(time)} 
                              disabled={isBooked}
                              className={`p-3 rounded-lg border-2 transition-all ${
                                isBooked 
                                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed border-gray-200 line-through' 
                                  : selectedTime === time 
                                    ? 'border-[#2d8659] bg-[#2d8659] text-white' 
                                    : 'border-gray-200 hover:border-[#2d8659]'
                              }`}
                            >
                              {time}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-500">Nenhum horário disponível para esta data. Por favor, selecione outra.</p>
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
                <h2 className="text-3xl font-bold mb-6">Seus Dados e Confirmação</h2>
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
                <div className="bg-gray-50 p-6 rounded-lg mt-6">
                  <h3 className="font-bold text-lg mb-4">Resumo do Agendamento</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Profissional:</strong> {professionals.find(p => p.id === selectedProfessional)?.name}</p>
                    <p><strong>Serviço:</strong> {serviceDetails?.name}</p>
                    <p><strong>Data:</strong> {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>
                    <p><strong>Horário:</strong> {selectedTime}</p>
                    <p className="text-xl font-bold text-[#2d8659] mt-4">Total: R$ {parseFloat(serviceDetails?.price || 0).toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex gap-4 mt-6">
                  <Button onClick={() => setStep(3)} variant="outline">Voltar</Button>
                  <Button onClick={handleBooking} disabled={!patientData.name || !patientData.email || !patientData.phone} className="bg-[#2d8659] hover:bg-[#236b47] flex-1">Ir para Pagamento</Button>
                </div>
              </motion.div>
            );
          case 5:
            return (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-lg p-8 text-center">
                <Check className="w-16 h-16 mx-auto text-green-500 bg-green-100 rounded-full p-3 mb-4" />
                <h2 className="text-3xl font-bold mb-4">Agendamento Recebido!</h2>
                <p className="text-gray-600 mb-6">Seu agendamento foi registrado e está pendente de pagamento. Você será redirecionado para o checkout do Mercado Pago. Caso prefira, verifique o e-mail para instruções.</p>
                <p className="text-sm text-gray-500 mb-8">Após a confirmação do pagamento, o sistema irá gerar automaticamente o link da sala (Zoom) e enviá-lo por e-mail e WhatsApp para você e para o profissional.</p>
                <Button onClick={() => navigate('/area-do-paciente')} className="bg-[#2d8659] hover:bg-[#236b47]">Acessar Área do Paciente</Button>
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
        if (clickedStep < step) {
            setStep(clickedStep);
        }
      };

      return (
        <>
          <Helmet>
            <title>Agendamento - Doxologos Clínica Online</title>
            <meta name="description" content="Agende sua consulta online com nossos profissionais qualificados." />
          </Helmet>
          <header className="bg-white shadow-sm">
            <nav className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <Link to="/" className="flex items-center space-x-2">
                  <Heart className="w-8 h-8 text-[#2d8659]" />
                  <span className="text-2xl font-bold gradient-text">Doxologos</span>
                </Link>
                <Link to="/">
                  <Button variant="outline" className="border-[#2d8659] text-[#2d8659]">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                  </Button>
                </Link>
              </div>
            </nav>
          </header>
          <div className="min-h-screen bg-gray-50 py-12">
            <div className="container mx-auto px-4 max-w-4xl">
              {step < 5 && (
                <div className="mb-12">
                  <div className="flex items-center">
                    {progressSteps.map((s, index) => (
                      <React.Fragment key={s.id}>
                        <button onClick={() => handleStepClick(s.id)} disabled={s.id >= step} className="flex flex-col items-center cursor-pointer disabled:cursor-default">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${step >= s.id ? 'bg-[#2d8659] text-white' : 'bg-gray-300 text-gray-600'}`}>
                            {s.id}
                          </div>
                          <p className={`mt-2 text-xs text-center md:text-sm transition-colors ${step >= s.id ? 'text-[#2d8659]' : 'text-gray-500'}`}>{s.label}</p>
                        </button>
                        {index < progressSteps.length - 1 && (
                          <div className={`flex-1 h-1 mx-2 transition-colors ${step > s.id ? 'bg-[#2d8659]' : 'bg-gray-300'}`} />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
              {renderStepContent()}
            </div>
          </div>
        </>
      );
    };

    export default AgendamentoPage;
