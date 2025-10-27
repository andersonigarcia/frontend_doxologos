
import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Heart, ArrowLeft, Calendar, Clock, LogOut, Briefcase, Trash2, Edit, Users, UserPlus, CalendarX, Star, Check, ShieldOff, MessageCircle, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import ConfirmDialog from '@/components/ConfirmDialog';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { bookingEmailManager } from '@/lib/bookingEmailManager';

const AdminPage = () => {
    const { toast } = useToast();
    const { user, userRole, signIn, signOut } = useAuth();
    const [loginData, setLoginData] = useState({ email: '', password: '' });
    const [bookings, setBookings] = useState([]);
    const [services, setServices] = useState([]);
    const [availability, setAvailability] = useState({});
    const [blockedDates, setBlockedDates] = useState([]);
    const [events, setEvents] = useState([]);
    const [professionals, setProfessionals] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isEditingService, setIsEditingService] = useState(false);
    const [serviceFormData, setServiceFormData] = useState({ id: null, name: '', price: '', duration_minutes: 50 });

    const [isEditingProfessional, setIsEditingProfessional] = useState(false);
    const [professionalFormData, setProfessionalFormData] = useState({ id: null, name: '', services_ids: [], email: '', password: '', mini_curriculum: '', description: '', image_url: '' });

    const [selectedAvailProfessional, setSelectedAvailProfessional] = useState('');
    const [professionalAvailability, setProfessionalAvailability] = useState({});
    const [professionalBlockedDates, setProfessionalBlockedDates] = useState([]);
    const [newBlockedDate, setNewBlockedDate] = useState({ date: '', start_time: '', end_time: '', reason: '' });
    const [focusedDay, setFocusedDay] = useState('monday'); // Controla o dia focado para adicionar horários
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
        link_slug: '',
        data_inicio_exibicao: '',
        data_fim_exibicao: '',
        ativo: true
    });
    const [isEditingEvent, setIsEditingEvent] = useState(false);

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
        valor_consulta: ''
    });
    
    // Estados para filtros de agendamentos
    const [bookingFilters, setBookingFilters] = useState({
        service_id: '',
        professional_id: '',
        status: '',
        date_from: '',
        date_to: '',
        search: ''
    });
    const [showFilters, setShowFilters] = useState(false);
    
    // Estados de ordenação
    const [bookingSortField, setBookingSortField] = useState('default'); // 'default', 'date', 'status', 'professional'
    const [bookingSortOrder, setBookingSortOrder] = useState('asc'); // 'asc' ou 'desc'
    
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
    

        
        const promises = [
            isAdmin ? supabase.from('bookings').select('*, meeting_link, meeting_password, meeting_id, meeting_start_url, professional:professionals(name), service:services(name)') : supabase.from('bookings').select('*, meeting_link, meeting_password, meeting_id, meeting_start_url, professional:professionals(name), service:services(name)').eq('professional_id', professionalId),
            supabase.from('services').select('*'),
            isAdmin ? supabase.from('professionals').select('*') : supabase.from('professionals').select('*').eq('id', professionalId),
            isAdmin ? supabase.from('availability').select('*') : supabase.from('availability').select('*').eq('professional_id', professionalId),
            isAdmin ? supabase.from('blocked_dates').select('*') : supabase.from('blocked_dates').select('*').eq('professional_id', professionalId),
        ];

        if (isAdmin) {
            // Buscar eventos sem JOIN por enquanto - faremos a associação depois
            promises.push(supabase.from('eventos').select('*').order('data_inicio', { ascending: false }));
            promises.push(supabase.from('reviews').select('*'));
        } else {
            promises.push(Promise.resolve({ data: [], error: null })); // events
            promises.push(supabase.from('reviews').select('*').eq('professional_id', professionalId)); // reviews
        }

        const [bookingsRes, servicesRes, profsRes, availRes, blockedDatesRes, eventsRes, reviewsRes] = await Promise.all(promises);
        
        if (profsRes.error) {
            console.error('Erro ao buscar profissionais:', profsRes.error);
        }
        

        
        setBookings(bookingsRes.data || []);
        setServices(servicesRes.data || []);
        setProfessionals(profsRes.data || []);
        if (profsRes.data && profsRes.data.length > 0) {
            // Para admin, usa o primeiro profissional da lista
            // Para professional, usa sempre o próprio ID
            let profIdToSelect;
            if (isAdmin) {
                profIdToSelect = profsRes.data[0].id;
            } else {
                // Para professional, usa sempre o próprio ID (já filtrado na query)
                profIdToSelect = profsRes.data.length > 0 ? profsRes.data[0].id : professionalId;
            }
            if (profIdToSelect) {
                setSelectedAvailProfessional(profIdToSelect);
            }
        }
        // Mapear profissionais aos eventos e carregar contagem de inscrições
        const eventsWithProfessionals = await Promise.all((eventsRes.data || []).map(async (event) => {
            const professional = (profsRes.data || []).find(p => p.id === event.professional_id);
            
            // Tentar buscar contagem real de inscrições
            let inscricoesCount = 0;
            try {
                const { count, error } = await supabase
                    .from('inscricoes_eventos')
                    .select('*', { count: 'exact' })
                    .eq('evento_id', event.id);
                    
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
        
        const reviewsWithProfessionals = (reviewsRes.data || []).map(review => {
            const professional = (profsRes.data || []).find(p => p.id === review.professional_id);
            return {
                ...review,
                professional: professional ? { name: professional.name } : null
            };
        });
        
        setEvents(eventsWithProfessionals);
        setBlockedDates(blockedDatesRes.data || []);
        setReviews(reviewsWithProfessionals);

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
        const profId = userRole === 'admin' ? selectedAvailProfessional : user?.id;
        
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
                    console.error('Erro ao carregar disponibilidade mensal:', error);
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

    const handleLogin = async (e) => { e.preventDefault(); await signIn(loginData.email, loginData.password); };
    const handleLogout = async () => { await signOut(); setLoginData({ email: '', password: '' }); };

    const handleServiceSubmit = async (e) => {
        e.preventDefault();
        
        let result;
        if (isEditingService) {
            // Para edição, usar campos específicos
            const { name, price, duration_minutes } = serviceFormData;
            result = await supabase.from('services').update({ name, price, duration_minutes }).eq('id', serviceFormData.id);
        } else {
            // Para inserção, remover o id
            const { id, ...serviceDataWithoutId } = serviceFormData;
            result = await supabase.from('services').insert([serviceDataWithoutId]);
        }
        
        if (result.error) {
            console.error('Erro ao salvar serviço:', result.error);
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
        if (isEditingProfessional) {
            const { error } = await supabase.from('professionals').update(profData).eq('id', id);
            if (error) { toast({ variant: "destructive", title: "Erro ao atualizar profissional", description: error.message }); }
            else { toast({ title: "Profissional atualizado!" }); resetProfessionalForm(); fetchAllData(); }
        } else {
            const { data: authData, error: signUpError } = await supabase.auth.signUp({ email, password, options: { data: { full_name: profData.name, role: 'professional' } } });
            if (signUpError) { toast({ variant: "destructive", title: "Erro ao criar usuário", description: signUpError.message }); return; }
            if(!authData.user) { toast({ variant: 'destructive', title: 'Erro ao criar profissional', description: "Não foi possível criar o usuário." }); return; }
            const { error: profError } = await supabase.from('professionals').insert([{ ...profData, user_id: authData.user.id }]);
            if (profError) { toast({ variant: "destructive", title: "Erro ao criar profissional", description: profError.message }); }
            else { toast({ title: "Profissional criado com sucesso!" }); resetProfessionalForm(); fetchAllData(); }
        }
    };

    const handleSaveAvailability = async () => {
        const professionalId = userRole === 'admin' ? selectedAvailProfessional : user.id;
        
        if (!professionalId) {
            toast({ variant: "destructive", title: "Erro", description: "Selecione um profissional." });
            return;
        }

        try {
            // 1. Primeiro, deletar registros existentes para este profissional no mês/ano selecionados
            const { error: deleteError } = await supabase
                .from('availability')
                .delete()
                .eq('professional_id', professionalId)
                .eq('month', selectedMonth)
                .eq('year', selectedYear);

            if (deleteError) {
                console.error('Erro ao limpar disponibilidade existente:', deleteError);
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
                    console.error('Erro ao inserir disponibilidade:', insertError);
                    toast({ variant: "destructive", title: "Erro ao salvar disponibilidade", description: insertError.message });
                    return;
                }
            }

            const monthNames = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
            toast({ title: `Disponibilidade de ${monthNames[selectedMonth]}/${selectedYear} atualizada com sucesso!` });
            fetchAllData();
        } catch (error) {
            console.error('Erro inesperado ao salvar disponibilidade:', error);
            toast({ variant: "destructive", title: "Erro inesperado", description: "Não foi possível salvar a disponibilidade." });
        }
    };

    const handleAddBlockedDate = async () => {
        if (!newBlockedDate.date) { toast({ variant: 'destructive', title: 'Data é obrigatória' }); return; }
        const professionalId = userRole === 'admin' ? selectedAvailProfessional : user.id;
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
        
        // Validar dados obrigatórios
        if (!bookingEditData.professional_id || !bookingEditData.service_id || !bookingEditData.patient_name) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Preencha todos os campos obrigatórios.' });
            return;
        }
        
        // Capturar valores antigos antes da atualização
        const oldStatus = editingBooking.status;
        const oldDate = editingBooking.booking_date;
        const oldTime = editingBooking.booking_time;
        const statusChanged = oldStatus !== bookingEditData.status;
        const dateChanged = oldDate !== bookingEditData.booking_date || oldTime !== bookingEditData.booking_time;
        
        const { error } = await supabase
            .from('bookings')
            .update({
                booking_date: bookingEditData.booking_date,
                booking_time: bookingEditData.booking_time,
                status: bookingEditData.status,
                professional_id: bookingEditData.professional_id,
                service_id: bookingEditData.service_id,
                patient_name: bookingEditData.patient_name,
                patient_email: bookingEditData.patient_email,
                patient_phone: bookingEditData.patient_phone,
                valor_consulta: parseFloat(bookingEditData.valor_consulta) || null
            })
            .eq('id', editingBooking.id);
            
        if (error) { 
            toast({ variant: 'destructive', title: 'Erro ao atualizar agendamento', description: error.message }); 
            return;
        }
        
        // Enviar e-mails apropriados baseados nas alterações
        try {
            const emailData = {
                patient_name: bookingEditData.patient_name,
                patient_email: bookingEditData.patient_email,
                booking_date: bookingEditData.booking_date,
                booking_time: bookingEditData.booking_time,
                service_name: services.find(s => s.id === bookingEditData.service_id)?.name || 'Consulta',
                professional_name: professionals.find(p => p.id === bookingEditData.professional_id)?.name || 'Profissional'
            };
            
            // Se o status mudou para 'confirmed' ou 'paid'
            if (statusChanged && (bookingEditData.status === 'confirmed' || bookingEditData.status === 'paid')) {
                await bookingEmailManager.sendPaymentApproved(emailData);
                console.log('📧 Email de confirmação/pagamento enviado');
            }
            
            // Se o status mudou para cancelado
            if (statusChanged && bookingEditData.status.includes('cancelled')) {
                const reason = oldStatus === 'pending_payment' ? 'Cancelado pela administração' : null;
                await bookingEmailManager.sendCancellation(emailData, reason);
                console.log('📧 Email de cancelamento enviado');
            }
            
            // Se o status mudou para completed
            if (statusChanged && bookingEditData.status === 'completed') {
                await bookingEmailManager.sendThankYou(emailData);
                console.log('📧 Email de agradecimento enviado');
            }
            
            // Se a data/hora foi alterada (independente do status)
            if (dateChanged && !bookingEditData.status.includes('cancelled')) {
                await bookingEmailManager.sendRescheduled(emailData, oldDate, oldTime, 'Alterado pela administração');
                console.log('📧 Email de reagendamento enviado');
            }
        } catch (emailError) {
            console.error('❌ Erro ao enviar email:', emailError);
            // Não bloqueia a atualização se o email falhar
            toast({ 
                variant: 'default', 
                title: 'Agendamento atualizado', 
                description: 'Atenção: O email de notificação não pôde ser enviado.' 
            });
        }
        
        toast({ title: 'Agendamento atualizado com sucesso!' }); 
        setEditingBooking(null); 
        fetchAllData();
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
            'cancelled_by_professional': 4
        };
        
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
                const dateCompare = dateA - dateB;
                if (dateCompare !== 0) {
                    return bookingSortField === 'default' || bookingSortOrder === 'desc' ? -dateCompare : dateCompare;
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
        
        // Aplica ordenação default: confirmados > pendentes > cancelados, depois por data decrescente
        if (bookingSortField === 'default') {
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
    };
    
    // Funções para calcular totalizadores
    const calculateTotals = (bookingsList) => {
        const totals = {
            totalBookings: bookingsList.length,
            totalValue: 0,
            confirmedValue: 0,
            completedValue: 0,
            pendingValue: 0,
            cancelledValue: 0
        };
        
        bookingsList.forEach(booking => {
            // Usa valor histórico se disponível, senão usa preço atual do serviço
            const servicePrice = booking.valor_consulta 
                ? parseFloat(booking.valor_consulta) 
                : (booking.service?.price ? parseFloat(booking.service.price) : 0);
            
            // Totaliza todos os serviços independente do status
            totals.totalValue += servicePrice;
            
            // Separa por status para análise detalhada
            switch (booking.status) {
                case 'confirmed':
                    totals.confirmedValue += servicePrice;
                    break;
                case 'completed':
                    totals.completedValue += servicePrice;
                    break;
                case 'pending_payment':
                    totals.pendingValue += servicePrice;
                    break;
                case 'cancelled_by_patient':
                case 'cancelled_by_professional':
                    totals.cancelledValue += servicePrice;
                    break;
            }
        });
        
        return totals;
    };

    const resetServiceForm = () => { 
        setIsEditingService(false); 
        setServiceFormData({ id: null, name: '', price: '', duration_minutes: '' }); 
    };
    const resetProfessionalForm = () => { 
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
    };
    
    const handleEditService = (service) => { setIsEditingService(true); setServiceFormData(service); };
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
                        console.error('Erro ao excluir serviço:', error);
                        toast({ variant: "destructive", title: "Erro ao excluir serviço", description: error.message });
                    } else {
                        toast({ title: "Serviço excluído com sucesso!" });
                        fetchAllData();
                    }
                    setConfirmDialog({ ...confirmDialog, isOpen: false });
                }
            });
        } catch (error) {
            console.error('Erro inesperado:', error);
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
            console.error('Erro ao verificar dependências:', error);
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
                console.error('Erro ao excluir profissional:', error);
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
            console.error('Erro inesperado:', error);
            toast({ 
                variant: "destructive", 
                title: "Erro inesperado", 
                description: "Não foi possível excluir o profissional completamente." 
            });
        }
    };

    const handleEventSubmit = async (e) => {
        e.preventDefault();
        
        // Validações básicas
        if (!eventFormData.titulo?.trim()) {
            toast({ variant: "destructive", title: "Título é obrigatório" });
            return;
        }
        if (!eventFormData.professional_id) {
            toast({ variant: "destructive", title: "Selecione um profissional" });
            return;
        }
        if (!eventFormData.data_inicio || !eventFormData.data_fim) {
            toast({ variant: "destructive", title: "Datas de início e fim são obrigatórias" });
            return;
        }
        
        let result;
        if (isEditingEvent) {
            // Para edição, usar todos os campos incluindo o id
            const { id, ...updateData } = eventFormData;
            result = await supabase.from('eventos').update(updateData).eq('id', id);
        } else {
            // Para inserção, remover o id para deixar o banco gerar automaticamente
            const { id, ...eventDataWithoutId } = eventFormData;
            result = await supabase.from('eventos').insert([eventDataWithoutId]);
        }
        
        if (result.error) {
            console.error('Erro ao salvar evento:', result.error);
            toast({ 
                variant: "destructive", 
                title: "Erro ao salvar evento", 
                description: result.error.message 
            });
        } else {
            toast({ title: `Evento ${isEditingEvent ? 'atualizado' : 'criado'} com sucesso!` });
            resetEventForm();
            fetchAllData();
        }
    };
    const resetEventForm = () => { 
        setIsEditingEvent(false); 
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
            link_slug: '',
            data_inicio_exibicao: '',
            data_fim_exibicao: '',
            ativo: true
        }); 
    };
    const handleEditEvent = (event) => { 
        setIsEditingEvent(true); 
        setEventFormData({ 
            ...event, 
            data_inicio: new Date(event.data_inicio).toISOString().slice(0, 16), 
            data_fim: new Date(event.data_fim).toISOString().slice(0, 16), 
            data_limite_inscricao: new Date(event.data_limite_inscricao).toISOString().slice(0, 16),
            // Tratar campos de exibição (podem ser null)
            data_inicio_exibicao: event.data_inicio_exibicao ? new Date(event.data_inicio_exibicao).toISOString().slice(0, 16) : '',
            data_fim_exibicao: event.data_fim_exibicao ? new Date(event.data_fim_exibicao).toISOString().slice(0, 16) : '',
            // Garantir que professional_id nunca seja null
            professional_id: event.professional_id || '',
            // Garantir que ativo tenha valor padrão
            ativo: event.ativo !== undefined ? event.ativo : true
        }); 
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
                                console.error('Erro ao excluir inscrições:', inscricoesError);
                                toast({ variant: "destructive", title: "Erro ao excluir inscrições do evento" });
                                setConfirmDialog({ ...confirmDialog, isOpen: false });
                                return;
                            }
                        } catch (error) {

                        }
                    }

                    const { error } = await supabase.from('eventos').delete().eq('id', eventId);
                    if (error) {
                        console.error('Erro ao excluir evento:', error);
                        toast({ variant: "destructive", title: "Erro ao excluir evento", description: error.message });
                    } else {
                        toast({ title: "Evento excluído com sucesso!" });
                        fetchAllData();
                    }
                    setConfirmDialog({ ...confirmDialog, isOpen: false });
                }
            });
        } catch (error) {
            console.error('Erro inesperado:', error);
            toast({ variant: "destructive", title: "Erro inesperado", description: "Não foi possível verificar o evento." });
        }
    };

    if (!user) {
        return (
            <>
                <Helmet><title>Área Administrativa - Doxologos</title></Helmet>
                <header className="bg-white shadow-sm"><nav className="container mx-auto px-4 py-4 flex items-center justify-between"><Link to="/" className="flex items-center space-x-2"><Heart className="w-8 h-8 text-[#2d8659]" /><span className="text-2xl font-bold gradient-text">Doxologos</span></Link><Link to="/"><Button variant="outline" className="border-[#2d8659] text-[#2d8659]"><ArrowLeft className="w-4 h-4 mr-2" /> Voltar</Button></Link></nav></header>
                <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
                        <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">Acesso Restrito</h2>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div><label className="block text-sm font-medium mb-2 text-gray-600">Email</label><input type="email" required value={loginData.email} onChange={(e) => setLoginData({...loginData, email: e.target.value})} className="w-full input"/></div>
                            <div><label className="block text-sm font-medium mb-2 text-gray-600">Senha</label><input type="password" required value={loginData.password} onChange={(e) => setLoginData({...loginData, password: e.target.value})} className="w-full input"/></div>
                            <Button type="submit" className="w-full bg-[#2d8659] hover:bg-[#236b47]">Entrar</Button>
                        </form>
                    </motion.div>
                </div>
            </>
        );
    }
    
    const tabsConfig = {
        admin: [
            { value: 'bookings', label: 'Agendamentos', icon: Calendar },
            { value: 'reviews', label: 'Avaliações', icon: Star },
            { value: 'payments', label: 'Pagamentos', icon: DollarSign },
            { value: 'professionals', label: 'Profissionais', icon: Users },
            { value: 'availability', label: 'Disponibilidade', icon: Clock },
            { value: 'services', label: 'Serviços', icon: Briefcase },
            { value: 'events', label: 'Eventos', icon: Calendar },
            { value: 'testimonials', label: 'Depoimentos', icon: MessageCircle },
        ],
        professional: [
            { value: 'bookings', label: 'Agendamentos', icon: Calendar },
            { value: 'reviews', label: 'Avaliações', icon: Star },
            { value: 'availability', label: 'Disponibilidade', icon: Clock },
        ]
    };
    const currentTabs = tabsConfig[userRole] || [];

    return (
        <>
            <Helmet><title>Painel de Controle - Doxologos</title></Helmet>
            <header className="bg-white shadow-sm"><nav className="container mx-auto px-4 py-4 flex items-center justify-between"><Link to="/" className="flex items-center space-x-2"><Heart className="w-8 h-8 text-[#2d8659]" /><span className="text-2xl font-bold gradient-text">Doxologos</span></Link><Button onClick={handleLogout} variant="outline" className="border-[#2d8659] text-[#2d8659]"><LogOut className="w-4 h-4 mr-2" /> Sair</Button></nav></header>
            <div className="min-h-screen bg-gray-50 py-12">
                <div className="container mx-auto px-4">
                    <h1 className="text-4xl font-bold mb-2">Painel de Controle</h1>
                    <p className="text-gray-500 mb-8">Bem-vindo, {user.user_metadata?.full_name || user.email}. Seu perfil é: <span className="font-semibold text-[#2d8659]">{userRole}</span></p>

                    <Tabs defaultValue="bookings" className="w-full">
                        <TabsList className="flex flex-wrap h-auto justify-start p-1 bg-gray-100 rounded-lg">
                            {currentTabs.map(tab => (
                                <TabsTrigger key={tab.value} value={tab.value} className="flex-1 min-w-[120px] data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                    <tab.icon className="w-4 h-4 mr-2"/>{tab.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                        
                        <TabsContent value="bookings" className="mt-6">
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-bold flex items-center">
                                        <Calendar className="w-6 h-6 mr-2 text-[#2d8659]" /> 
                                        Agendamentos 
                                        <span className="ml-2 text-lg text-gray-500">({getFilteredBookings().length}/{bookings.length})</span>
                                    </h2>
                                    
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
                                
                                {/* Totalizadores */}
                                {(() => {
                                    const filteredBookings = getFilteredBookings();
                                    const totals = calculateTotals(filteredBookings);
                                    
                                    return (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
                                            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                                                <div className="flex items-center">
                                                    <Calendar className="w-8 h-8 text-blue-600 mr-3" />
                                                    <div>
                                                        <p className="text-sm text-blue-600 font-medium">Total de Agendamentos</p>
                                                        <p className="text-2xl font-bold text-blue-900">{totals.totalBookings}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                                                <div className="flex items-center">
                                                    <svg className="w-8 h-8 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                                    </svg>
                                                    <div>
                                                        <p className="text-sm text-green-600 font-medium">Valor Total</p>
                                                        <p className="text-2xl font-bold text-green-900">
                                                            R$ {totals.totalValue.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 p-4 rounded-lg border border-emerald-200">
                                                <div className="flex items-center">
                                                    <svg className="w-8 h-8 text-emerald-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <div>
                                                        <p className="text-sm text-emerald-600 font-medium">Concluídos</p>
                                                        <p className="text-2xl font-bold text-emerald-900">
                                                            R$ {totals.completedValue.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
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
                                                            R$ {totals.pendingValue.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
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
                                                                R$ {totals.cancelledValue.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                                
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
                                            <Button 
                                                onClick={() => handleBookingSort('professional')} 
                                                variant="outline" 
                                                size="sm"
                                                className={bookingSortField === 'professional' ? 'bg-[#2d8659] text-white hover:bg-[#236b47] border-[#2d8659]' : 'bg-white'}
                                            >
                                                👤 Profissional {bookingSortField === 'professional' && (bookingSortOrder === 'asc' ? '↑' : '↓')}
                                            </Button>
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
                                                onChange={(e) => setBookingFilters({...bookingFilters, search: e.target.value})}
                                                className="w-full input text-sm"
                                            />
                                        </div>
                                        
                                        {/* Filtro por Serviço */}
                                        <div>
                                            <label className="block text-xs font-medium mb-1 text-gray-600">Serviço</label>
                                            <select
                                                value={bookingFilters.service_id}
                                                onChange={(e) => setBookingFilters({...bookingFilters, service_id: e.target.value})}
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
                                                onChange={(e) => setBookingFilters({...bookingFilters, professional_id: e.target.value})}
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
                                                onChange={(e) => setBookingFilters({...bookingFilters, status: e.target.value})}
                                                className="w-full input text-sm"
                                            >
                                                <option value="">Todos os status</option>
                                                <option value="pending_payment">Pendente Pagamento</option>
                                                <option value="confirmed">Confirmado</option>
                                                <option value="completed">Concluído</option>
                                                <option value="cancelled_by_patient">Cancelado (Paciente)</option>
                                                <option value="cancelled_by_professional">Cancelado (Profissional)</option>
                                            </select>
                                        </div>
                                        
                                        {/* Filtro por Período - Data Inicial */}
                                        <div>
                                            <label className="block text-xs font-medium mb-1 text-gray-600">De</label>
                                            <input
                                                type="date"
                                                value={bookingFilters.date_from}
                                                onChange={(e) => setBookingFilters({...bookingFilters, date_from: e.target.value})}
                                                className="w-full input text-sm"
                                            />
                                        </div>
                                        
                                        {/* Filtro por Período - Data Final */}
                                        <div>
                                            <label className="block text-xs font-medium mb-1 text-gray-600">Até</label>
                                            <input
                                                type="date"
                                                value={bookingFilters.date_to}
                                                onChange={(e) => setBookingFilters({...bookingFilters, date_to: e.target.value})}
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
                                        <div className="space-y-2">
                                            {getSortedBookings(filteredBookings).map((b, index) => {
                                            const statusColors = {
                                                'pending_payment': 'bg-yellow-100 text-yellow-800 border-yellow-200',
                                                'confirmed': 'bg-green-100 text-green-800 border-green-200',
                                                'completed': 'bg-blue-100 text-blue-800 border-blue-200',
                                                'cancelled_by_patient': 'bg-red-100 text-red-800 border-red-200',
                                                'cancelled_by_professional': 'bg-gray-100 text-gray-800 border-gray-200'
                                            };
                                            
                                            const statusLabels = {
                                                'pending_payment': 'Pendente Pagamento',
                                                'confirmed': 'Confirmado',
                                                'completed': 'Concluído',
                                                'cancelled_by_patient': 'Cancelado pelo Paciente',
                                                'cancelled_by_professional': 'Cancelado pelo Profissional'
                                            };
                                            
                                            // Usa valor histórico se disponível, senão usa preço atual do serviço
                                            const servicePrice = b.valor_consulta 
                                                ? parseFloat(b.valor_consulta) 
                                                : (b.service?.price ? parseFloat(b.service.price) : 0);
                                            
                                            return (
                                                <div key={b.id} className={`border rounded-lg p-6 hover:shadow-md transition-all duration-200 ${
                                                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                                } hover:bg-blue-50`}>
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-3 mb-3">
                                                                <h3 className="font-semibold text-lg text-gray-900">
                                                                    {b.patient_name || 'Nome não informado'}
                                                                </h3>
                                                                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[b.status] || 'bg-gray-100 text-gray-800'}`}>
                                                                    {statusLabels[b.status] || b.status}
                                                                </span>
                                                                {servicePrice > 0 && (
                                                                    <span className="px-3 py-1 rounded-full text-sm font-bold bg-green-100 text-green-800 border border-green-200">
                                                                        R$ {servicePrice.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                                                    </span>
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
                                                                    <span className="text-gray-500 block">Valor</span>
                                                                    <span className="font-bold text-green-700">
                                                                        {servicePrice > 0 
                                                                            ? `R$ ${servicePrice.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` 
                                                                            : 'N/A'
                                                                        }
                                                                    </span>
                                                                    {b.service?.name && servicePrice === 0 && (
                                                                        <span className="text-orange-500 block text-xs">Valor não definido</span>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-500 block">Data e Horário</span>
                                                                    <span className="font-medium">
                                                                        {new Date(b.booking_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
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
                                                                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                                                                    <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
                                                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                                        </svg>
                                                                        Acesso ao Zoom
                                                                    </h4>
                                                                    <div className="space-y-2 text-sm">
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
                                                            )}
                                                        </div>
                                                        
                                                        <div className="flex gap-2 ml-4">
                                                            <Dialog>
                                                                <DialogTrigger asChild>
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
                                                                                valor_consulta: b.valor_consulta || ''
                                                                            }); 
                                                                        }}
                                                                        className="hover:bg-blue-50"
                                                                    >
                                                                        <Edit className="w-4 h-4 mr-1" />
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
                                                                                onChange={e => setBookingEditData({...bookingEditData, patient_name: e.target.value})} 
                                                                                className="w-full input" 
                                                                                placeholder="Nome completo"
                                                                                required
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-sm font-medium mb-1">Email</label>
                                                                            <input 
                                                                                type="email" 
                                                                                value={bookingEditData.patient_email} 
                                                                                onChange={e => setBookingEditData({...bookingEditData, patient_email: e.target.value})} 
                                                                                className="w-full input" 
                                                                                placeholder="email@exemplo.com"
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-sm font-medium mb-1">Telefone</label>
                                                                            <input 
                                                                                type="tel" 
                                                                                value={bookingEditData.patient_phone} 
                                                                                onChange={e => setBookingEditData({...bookingEditData, patient_phone: e.target.value})} 
                                                                                className="w-full input" 
                                                                                placeholder="(11) 99999-9999"
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-sm font-medium mb-1">Status *</label>
                                                                            <select 
                                                                                value={bookingEditData.status} 
                                                                                onChange={e => setBookingEditData({...bookingEditData, status: e.target.value})} 
                                                                                className="w-full input"
                                                                            >
                                                                                <option value="pending_payment">Pendente Pagamento</option>
                                                                                <option value="confirmed">Confirmado</option>
                                                                                <option value="completed">Concluído</option>
                                                                                <option value="cancelled_by_patient">Cancelado (Paciente)</option>
                                                                                <option value="cancelled_by_professional">Cancelado (Profissional)</option>
                                                                            </select>
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-sm font-medium mb-1">Profissional *</label>
                                                                            <select 
                                                                                value={bookingEditData.professional_id} 
                                                                                onChange={e => setBookingEditData({...bookingEditData, professional_id: e.target.value})} 
                                                                                className="w-full input"
                                                                                required
                                                                            >
                                                                                <option value="">Selecione um profissional</option>
                                                                                {professionals.map(prof => (
                                                                                    <option key={prof.id} value={prof.id}>{prof.name}</option>
                                                                                ))}
                                                                            </select>
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-sm font-medium mb-1">Serviço *</label>
                                                                            <select 
                                                                                value={bookingEditData.service_id} 
                                                                                onChange={e => setBookingEditData({...bookingEditData, service_id: e.target.value})} 
                                                                                className="w-full input"
                                                                                required
                                                                            >
                                                                                <option value="">Selecione um serviço</option>
                                                                                {services.map(service => (
                                                                                    <option key={service.id} value={service.id}>
                                                                                        {service.name} - R$ {parseFloat(service.price).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                                                                    </option>
                                                                                ))}
                                                                            </select>
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-sm font-medium mb-1">Data *</label>
                                                                            <input 
                                                                                type="date" 
                                                                                value={bookingEditData.booking_date} 
                                                                                onChange={e => setBookingEditData({...bookingEditData, booking_date: e.target.value})} 
                                                                                className="w-full input" 
                                                                                required
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-sm font-medium mb-1">Horário *</label>
                                                                            <input 
                                                                                type="time" 
                                                                                value={bookingEditData.booking_time} 
                                                                                onChange={e => setBookingEditData({...bookingEditData, booking_time: e.target.value})} 
                                                                                className="w-full input" 
                                                                                required
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-sm font-medium mb-1">Valor da Consulta (R$)</label>
                                                                            <input 
                                                                                type="number" 
                                                                                step="0.01"
                                                                                min="0"
                                                                                value={bookingEditData.valor_consulta} 
                                                                                onChange={e => setBookingEditData({...bookingEditData, valor_consulta: e.target.value})} 
                                                                                className="w-full input" 
                                                                                placeholder="150.00"
                                                                            />
                                                                            <p className="text-xs text-gray-500 mt-1">
                                                                                Valor histórico preservado no momento do agendamento
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <DialogFooter>
                                                                        <DialogClose asChild>
                                                                            <Button variant="outline">Cancelar</Button>
                                                                        </DialogClose>
                                                                        <Button onClick={handleUpdateBooking} className="bg-[#2d8659] hover:bg-[#236b47]">
                                                                            Salvar Alterações
                                                                        </Button>
                                                                    </DialogFooter>
                                                                </DialogContent>
                                                            </Dialog>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                            })}
                                        </div>
                                    );
                                })()}
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

                        <TabsContent value="payments" className="mt-6">
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-bold flex items-center">
                                        <DollarSign className="w-6 h-6 mr-2 text-[#2d8659]" /> 
                                        Pagamentos
                                    </h2>
                                </div>
                                <div className="text-center py-12">
                                    <DollarSign className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                                    <h3 className="text-xl font-semibold mb-2">Gerenciamento de Pagamentos</h3>
                                    <p className="text-gray-600 mb-6">
                                        Acesse o painel completo de pagamentos para visualizar transações, 
                                        processar reembolsos e gerar relatórios.
                                    </p>
                                    <Link to="/admin/pagamentos">
                                        <Button className="bg-[#2d8659] hover:bg-[#236b47]">
                                            <DollarSign className="w-4 h-4 mr-2" />
                                            Ir para Página de Pagamentos
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </TabsContent>
                        
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
                                            <div key={prof.id} className={`border rounded-lg p-6 hover:shadow-md transition-all ${
                                                index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
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
                                                onChange={e => setProfessionalFormData({...professionalFormData, name: e.target.value})} 
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
                                                            <span className="text-xs text-gray-500">R$ {parseFloat(service.price).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
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
                                                onChange={e => setProfessionalFormData({...professionalFormData, email: e.target.value})} 
                                                type="email" 
                                                placeholder="joao@clinica.com" 
                                                className="w-full input" 
                                                disabled={isEditingProfessional}
                                                required={!isEditingProfessional} 
                                            />
                                        </div>
                                        
                                        {!isEditingProfessional && (
                                            <div>
                                                <label className="block text-xs font-medium mb-1 text-gray-600">Senha</label>
                                                <input 
                                                    name="password" 
                                                    value={professionalFormData.password} 
                                                    onChange={e => setProfessionalFormData({...professionalFormData, password: e.target.value})} 
                                                    type="password" 
                                                    placeholder="******" 
                                                    className="w-full input" 
                                                    required 
                                                />
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
                                                                            console.error('Erro no upload:', error);
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
                                                                console.error('Erro no upload:', error);
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
                                                    onChange={e => setProfessionalFormData({...professionalFormData, image_url: e.target.value})} 
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
                                                            onClick={() => setProfessionalFormData({...professionalFormData, image_url: ''})}
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
                                                onChange={e => setProfessionalFormData({...professionalFormData, mini_curriculum: e.target.value})} 
                                                placeholder="Formação, experiências, especializações..." 
                                                className="w-full input" 
                                                rows="5"
                                            ></textarea>
                                        </div>
                                        
                                        <div className="flex gap-2">
                                            <Button type="submit" className="w-full bg-[#2d8659] hover:bg-[#236b47]">
                                                {userRole === 'admin' 
                                                    ? (isEditingProfessional ? 'Salvar' : 'Criar')
                                                    : 'Salvar Alterações'
                                                }
                                            </Button>
                                            {isEditingProfessional && (
                                                <Button type="button" variant="outline" onClick={resetProfessionalForm}>
                                                    Cancelar
                                                </Button>
                                            )}
                                        </div>
                                    </form>
                                </div>
                            </div>
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
                                                    {Array.from({length: 3}, (_, i) => {
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
                                            {['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'].map(time => {
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
                                                        className={`px-3 py-1 text-xs border rounded transition-colors ${
                                                            isAlreadyAdded 
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
                                            <div key={day} className={`border rounded-lg p-3 transition-colors ${
                                                focusedDay === day ? 'border-blue-500 bg-blue-50' : ''
                                            }`}>
                                                <div className="flex justify-between items-center mb-2">
                                                    <h3 className={`font-bold text-sm ${
                                                        focusedDay === day ? 'text-blue-800' : ''
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
                                                    className={`w-full input text-sm transition-colors ${
                                                        focusedDay === day ? 'ring-2 ring-blue-500 border-blue-500' : ''
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
                                    <Button onClick={handleSaveAvailability} className="mt-6 w-full bg-[#2d8659] hover:bg-[#236b47]">
                                        Salvar Horários
                                    </Button>
                                </div>
                                <div className="bg-white rounded-xl shadow-lg p-6">
                                    <h2 className="text-2xl font-bold mb-6 flex items-center"><CalendarX className="w-6 h-6 mr-2 text-[#2d8659]" /> Datas e Horários Bloqueados</h2>
                                    <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2">
                                        {professionalBlockedDates.map(d => (
                                            <div key={d.id} className="border rounded-lg p-3 flex justify-between items-center text-sm">
                                                <div>
                                                    <p className="font-semibold">{new Date(d.blocked_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})} {d.start_time && d.end_time ? `das ${d.start_time} às ${d.end_time}` : '(Dia todo)'}</p>
                                                    <p className="text-gray-500">{d.reason}</p>
                                                </div>
                                                <Button size="icon" variant="ghost" onClick={() => handleDeleteBlockedDate(d.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="space-y-3 border-t pt-6">
                                        <h3 className="font-bold">Adicionar Bloqueio</h3>
                                        <input type="date" value={newBlockedDate.date} onChange={e => setNewBlockedDate({...newBlockedDate, date: e.target.value})} className="w-full input" />
                                        <div className="grid grid-cols-2 gap-2">
                                            <input type="time" value={newBlockedDate.start_time} onChange={e => setNewBlockedDate({...newBlockedDate, start_time: e.target.value})} className="w-full input" />
                                            <input type="time" value={newBlockedDate.end_time} onChange={e => setNewBlockedDate({...newBlockedDate, end_time: e.target.value})} className="w-full input" />
                                        </div>
                                        <input type="text" value={newBlockedDate.reason} onChange={e => setNewBlockedDate({...newBlockedDate, reason: e.target.value})} placeholder="Motivo (ex: Feriado)" className="w-full input" />
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
                                                <div key={service.id} className={`border rounded-lg p-5 hover:shadow-md transition-all ${
                                                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                                } hover:bg-blue-50`}>
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-3 mb-2">
                                                                <h3 className="font-bold text-lg text-gray-900">{service.name}</h3>
                                                                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                                                    {professionalsCount} {professionalsCount === 1 ? 'profissional' : 'profissionais'}
                                                                </span>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                                <div>
                                                                    <span className="text-gray-500 block">Preço</span>
                                                                    <span className="font-bold text-green-600">
                                                                        R$ {parseFloat(service.price).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
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
                                                onChange={e => setServiceFormData({...serviceFormData, name: e.target.value})} 
                                                placeholder="Ex: Consulta Psicológica, Terapia de Casal" 
                                                className="w-full input" 
                                                required 
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-xs font-medium mb-1 text-gray-600">Preço</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">R$</span>
                                                <input 
                                                    name="price" 
                                                    value={serviceFormData.price} 
                                                    onChange={e => {
                                                        const value = e.target.value.replace(/[^0-9.,]/g, '');
                                                        setServiceFormData({...serviceFormData, price: value});
                                                    }} 
                                                    type="text" 
                                                    placeholder="150,00" 
                                                    className="w-full input pl-8" 
                                                    required 
                                                />
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-xs font-medium mb-1 text-gray-600">Duração</label>
                                            <div className="relative">
                                                <input 
                                                    name="duration_minutes" 
                                                    value={serviceFormData.duration_minutes} 
                                                    onChange={e => {
                                                        const value = e.target.value.replace(/[^0-9]/g, '');
                                                        setServiceFormData({...serviceFormData, duration_minutes: value});
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
                                            <div key={event.id} className={`border rounded-lg p-6 mb-4 hover:shadow-md transition-all ${
                                                index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                            } hover:bg-blue-50`}>
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-3">
                                                            <h3 className="font-bold text-lg text-gray-900">{event.titulo}</h3>
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                                isExpired ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                                            }`}>
                                                                {isExpired ? 'Expirado' : 'Aberto'}
                                                            </span>
                                                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                                                {event.tipo_evento}
                                                            </span>
                                                            
                                                            {/* Novo badge: Status Ativo/Inativo */}
                                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                                                event.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
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
                                                                    {dataInicio.toLocaleDateString('pt-BR')} às {dataInicio.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-500 block">Fim</span>
                                                                <span className="font-medium">
                                                                    {dataFim.toLocaleDateString('pt-BR')} às {dataFim.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-500 block">Inscrições até</span>
                                                                <span className={`font-medium ${isExpired ? 'text-red-600' : 'text-green-600'}`}>
                                                                    {dataExpiracao.toLocaleDateString('pt-BR')} às {dataExpiracao.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
                                                                </span>
                                                            </div>
                                                            
                                                            {/* Novas informações de exibição */}
                                                            {event.data_inicio_exibicao && (
                                                                <div>
                                                                    <span className="text-gray-500 block">Exibe de</span>
                                                                    <span className="font-medium text-blue-600">
                                                                        {new Date(event.data_inicio_exibicao).toLocaleDateString('pt-BR')} às {new Date(event.data_inicio_exibicao).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {event.data_fim_exibicao && (
                                                                <div>
                                                                    <span className="text-gray-500 block">Exibe até</span>
                                                                    <span className="font-medium text-blue-600">
                                                                        {new Date(event.data_fim_exibicao).toLocaleDateString('pt-BR')} às {new Date(event.data_fim_exibicao).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        
                                                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                                                            <div className="flex items-center gap-4">
                                                                <span className="flex items-center text-sm text-gray-600">
                                                                    <Users className="w-4 h-4 mr-1"/>
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
                                    <form onSubmit={handleEventSubmit} className="space-y-4 text-sm">
                                        <input name="titulo" value={eventFormData.titulo || ''} onChange={e => setEventFormData({...eventFormData, titulo: e.target.value})} placeholder="Título do Evento" className="w-full input" required />
                                        <textarea name="descricao" value={eventFormData.descricao || ''} onChange={e => setEventFormData({...eventFormData, descricao: e.target.value})} placeholder="Descrição" className="w-full input" rows="3"></textarea>
                                        <select name="tipo_evento" value={eventFormData.tipo_evento || 'Workshop'} onChange={e => setEventFormData({...eventFormData, tipo_evento: e.target.value})} className="w-full input"><option>Workshop</option><option>Palestra</option></select>
                                        <select name="professional_id" value={eventFormData.professional_id || ''} onChange={e => setEventFormData({...eventFormData, professional_id: e.target.value})} className="w-full input" required>
                                            <option value="">Selecione o Profissional</option>
                                            {professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium mb-1">Data/Hora Início</label>
                                                <input type="datetime-local" name="data_inicio" value={eventFormData.data_inicio || ''} onChange={e => setEventFormData({...eventFormData, data_inicio: e.target.value})} className="w-full input" required/>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">Data/Hora Fim</label>
                                                <input type="datetime-local" name="data_fim" value={eventFormData.data_fim || ''} onChange={e => setEventFormData({...eventFormData, data_fim: e.target.value})} className="w-full input" required/>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">Limite de Vagas</label>
                                                <input type="number" name="limite_participantes" value={eventFormData.limite_participantes || ''} onChange={e => setEventFormData({...eventFormData, limite_participantes: e.target.value})} placeholder="Ex: 20" className="w-full input" min="1" max="500" required/>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">Limite para Inscrição</label>
                                                <input type="datetime-local" name="data_limite_inscricao" value={eventFormData.data_limite_inscricao || ''} onChange={e => setEventFormData({...eventFormData, data_limite_inscricao: e.target.value})} className="w-full input" required/>
                                            </div>
                                        </div>

                                        {/* Nova seção: Período de Exibição */}
                                        <div className="border-t pt-4 mt-4">
                                            <h4 className="text-sm font-semibold text-gray-700 mb-3">📅 Período de Exibição na Página Principal</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium mb-1 text-gray-600">Início da Exibição</label>
                                                    <input 
                                                        type="datetime-local" 
                                                        name="data_inicio_exibicao" 
                                                        value={eventFormData.data_inicio_exibicao || ''} 
                                                        onChange={e => setEventFormData({...eventFormData, data_inicio_exibicao: e.target.value})} 
                                                        className="w-full input"
                                                        title="Data e hora que o evento começará a aparecer na página principal"
                                                    />
                                                    <p className="text-xs text-gray-500 mt-1">Quando começar a mostrar o evento</p>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium mb-1 text-gray-600">Fim da Exibição</label>
                                                    <input 
                                                        type="datetime-local" 
                                                        name="data_fim_exibicao" 
                                                        value={eventFormData.data_fim_exibicao || ''} 
                                                        onChange={e => setEventFormData({...eventFormData, data_fim_exibicao: e.target.value})} 
                                                        className="w-full input"
                                                        title="Data e hora que o evento deixará de aparecer na página principal"
                                                    />
                                                    <p className="text-xs text-gray-500 mt-1">Quando parar de mostrar o evento</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Nova seção: Status Ativo */}
                                        <div className="border-t pt-4 mt-4">
                                            <div className="flex items-center gap-3">
                                                <input 
                                                    type="checkbox" 
                                                    id="evento_ativo"
                                                    name="ativo" 
                                                    checked={eventFormData.ativo === true} 
                                                    onChange={e => setEventFormData({...eventFormData, ativo: e.target.checked})} 
                                                    className="w-4 h-4 text-[#2d8659] border-2 border-gray-300 rounded focus:ring-[#2d8659] focus:ring-2"
                                                />
                                                <label htmlFor="evento_ativo" className="text-sm font-medium text-gray-700 cursor-pointer">
                                                    ✅ Evento Ativo (visível na página principal)
                                                </label>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2 ml-7">
                                                Desmarque para ocultar o evento temporariamente, mesmo dentro do período de exibição
                                            </p>
                                        </div>

                                        <input name="link_slug" value={eventFormData.link_slug || ''} onChange={e => setEventFormData({...eventFormData, link_slug: e.target.value})} placeholder="Link do evento (URL amigável)" className="w-full input" required/>
                                        <div className="flex gap-2"><Button type="submit" className="w-full bg-[#2d8659] hover:bg-[#236b47]">{isEditingEvent ? 'Salvar' : 'Criar'}</Button>{isEditingEvent && <Button type="button" variant="outline" onClick={resetEventForm}>Cancelar</Button>}</div>
                                    </form>
                                </div>
                            </div>
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
        </>
    );
};

export default AdminPage;
