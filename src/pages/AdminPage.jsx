
import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Heart, ArrowLeft, Calendar, Clock, LogOut, Briefcase, Trash2, Edit, Users, UserPlus, CalendarX, Star, Check, ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

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
    const [professionalFormData, setProfessionalFormData] = useState({ id: null, name: '', specialty: '', email: '', password: '', mini_curriculum: '', description: '', image_url: '' });

    const [selectedAvailProfessional, setSelectedAvailProfessional] = useState('');
    const [professionalAvailability, setProfessionalAvailability] = useState({});
    const [professionalBlockedDates, setProfessionalBlockedDates] = useState([]);
    const [newBlockedDate, setNewBlockedDate] = useState({ date: '', start_time: '', end_time: '', reason: '' });

    const [eventFormData, setEventFormData] = useState({ id: null, titulo: '', descricao: '', tipo_evento: 'Workshop', data_inicio: '', data_fim: '', professional_id: '', limite_participantes: '', data_limite_inscricao: '', link_slug: '' });
    const [isEditingEvent, setIsEditingEvent] = useState(false);

    const [editingBooking, setEditingBooking] = useState(null);
    const [bookingEditData, setBookingEditData] = useState({ booking_date: '', booking_time: '', status: '' });

    const fetchAllData = useCallback(async () => {

        setLoading(true);
        const isAdmin = userRole === 'admin';
        const professionalId = user?.id;
    

        
        const promises = [
            isAdmin ? supabase.from('bookings').select('*, professional:professionals(name), service:services(name)') : supabase.from('bookings').select('*, service:services(name)').eq('professional_id', professionalId),
            supabase.from('services').select('*'),
            supabase.from('professionals').select('*'),
            supabase.from('availability').select('*'),
            supabase.from('blocked_dates').select('*'),
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
            console.error('❌ [AdminPage] Erro ao buscar profissionais:', profsRes.error);
        }
        

        
        setBookings(bookingsRes.data || []);
        setServices(servicesRes.data || []);
        setProfessionals(profsRes.data || []);
        if (profsRes.data && profsRes.data.length > 0) {
            // Para admin, usa o primeiro profissional da lista
            // Para professional, encontra o registro que corresponde ao user_id
            let profIdToSelect;
            if (isAdmin) {
                profIdToSelect = profsRes.data[0].id;
            } else {
                const currentProfessional = profsRes.data.find(p => p.user_id === professionalId);
                profIdToSelect = currentProfessional ? currentProfessional.id : null;
            }
            if (profIdToSelect) {
                setSelectedAvailProfessional(profIdToSelect);
            }
        }
        // Mapear profissionais aos eventos e reviews
        const eventsWithProfessionals = (eventsRes.data || []).map(event => {
            const professional = (profsRes.data || []).find(p => p.id === event.professional_id);
            return {
                ...event,
                professional: professional ? { name: professional.name } : null,
                // Simular contagem de inscrições por enquanto
                inscricoes_eventos: [{ count: 0 }]
            };
        });
        
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

    useEffect(() => {
        const profId = userRole === 'admin' ? selectedAvailProfessional : user?.id;
        if (profId) {
            setProfessionalAvailability(availability[profId] || { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] });
            setProfessionalBlockedDates(blockedDates.filter(d => d.professional_id === profId));
        }
    }, [selectedAvailProfessional, availability, blockedDates, user, userRole]);

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
        for (const day in professionalAvailability) {
            await supabase.from('availability').upsert({ professional_id: professionalId, day_of_week: day, available_times: professionalAvailability[day] }, { onConflict: 'professional_id, day_of_week' });
        }
        toast({ title: "Disponibilidade atualizada!" });
        fetchAllData();
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
        const { error } = await supabase.from('bookings').update(bookingEditData).eq('id', editingBooking.id);
        if (error) { toast({ variant: 'destructive', title: 'Erro ao atualizar agendamento', description: error.message }); }
        else { toast({ title: 'Agendamento atualizado!' }); setEditingBooking(null); fetchAllData(); }
    };

    const handleReviewApproval = async (reviewId, isApproved) => {
        const { error } = await supabase.from('reviews').update({ is_approved: isApproved }).eq('id', reviewId);
        if (error) { toast({ variant: 'destructive', title: 'Erro ao atualizar avaliação' }); }
        else { toast({ title: `Avaliação ${isApproved ? 'aprovada' : 'reprovada'}.` }); fetchAllData(); }
    };

    const resetServiceForm = () => { setIsEditingService(false); setServiceFormData({ id: null, name: '', price: '', duration_minutes: 50 }); };
    const resetProfessionalForm = () => { setIsEditingProfessional(false); setProfessionalFormData({ id: null, name: '', specialty: '', email: '', password: '', mini_curriculum: '', description: '', image_url: '' }); };
    
    const handleEditService = (service) => { setIsEditingService(true); setServiceFormData(service); };
    const handleDeleteService = async (serviceId) => {
        const { error } = await supabase.from('services').delete().eq('id', serviceId);
        if (error) toast({ variant: "destructive", title: "Erro ao deletar serviço" }); else { toast({ title: "Serviço deletado." }); fetchAllData(); }
    };
    
    const handleEditProfessional = (prof) => { setIsEditingProfessional(true); setProfessionalFormData({...prof, password: ''}); };
    const handleDeleteProfessional = async (profId) => { toast({ variant: "destructive", title: "Funcionalidade desativada", description: "A exclusão de usuários precisa de permissões elevadas." }); };

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
    const resetEventForm = () => { setIsEditingEvent(false); setEventFormData({ id: null, titulo: '', descricao: '', tipo_evento: 'Workshop', data_inicio: '', data_fim: '', professional_id: '', limite_participantes: '', data_limite_inscricao: '', link_slug: '' }); };
    const handleEditEvent = (event) => { setIsEditingEvent(true); setEventFormData({ ...event, data_inicio: new Date(event.data_inicio).toISOString().slice(0, 16), data_fim: new Date(event.data_fim).toISOString().slice(0, 16), data_limite_inscricao: new Date(event.data_limite_inscricao).toISOString().slice(0, 16) }); };
    const handleDeleteEvent = async (eventId) => {
        const { error } = await supabase.from('eventos').delete().eq('id', eventId);
        if (error) toast({ variant: "destructive", title: "Erro ao deletar evento" }); else { toast({ title: "Evento deletado." }); fetchAllData(); }
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
            { value: 'professionals', label: 'Profissionais', icon: Users },
            { value: 'availability', label: 'Disponibilidade', icon: Clock },
            { value: 'services', label: 'Serviços', icon: Briefcase },
            { value: 'events', label: 'Eventos', icon: Calendar },
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
                                <h2 className="text-2xl font-bold mb-6 flex items-center"><Calendar className="w-6 h-6 mr-2 text-[#2d8659]" /> Agendamentos</h2>
                                <div className="space-y-4">
                                {bookings.map(b => (
                                    <div key={b.id} className="border rounded-lg p-4 flex justify-between items-center">
                                        <div>
                                            <p><strong>Paciente:</strong> {b.patient_name || b.patient_email || 'N/A'}</p>
                                            {userRole === 'admin' && <p><strong>Profissional:</strong> {b.professional?.name || 'N/A'}</p>}
                                            <p><strong>Serviço:</strong> {b.service?.name || 'N/A'}</p>
                                            <p><strong>Data:</strong> {new Date(b.booking_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})} às {b.booking_time}</p>
                                            <p><strong>Status:</strong> {b.status}</p>
                                        </div>
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button size="icon" variant="ghost" onClick={() => { setEditingBooking(b); setBookingEditData({ booking_date: b.booking_date, booking_time: b.booking_time, status: b.status }); }}><Edit className="w-4 h-4" /></Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader><DialogTitle>Editar Agendamento</DialogTitle></DialogHeader>
                                                <div className="space-y-4 py-4">
                                                    <div><label>Data</label><input type="date" value={bookingEditData.booking_date} onChange={e => setBookingEditData({...bookingEditData, booking_date: e.target.value})} className="w-full input" /></div>
                                                    <div><label>Horário</label><input type="time" value={bookingEditData.booking_time} onChange={e => setBookingEditData({...bookingEditData, booking_time: e.target.value})} className="w-full input" /></div>
                                                    <div><label>Status</label><select value={bookingEditData.status} onChange={e => setBookingEditData({...bookingEditData, status: e.target.value})} className="w-full input"><option value="pending_payment">Pendente</option><option value="confirmed">Confirmado</option><option value="completed">Concluído</option><option value="cancelled_by_patient">Cancelado (Paciente)</option><option value="cancelled_by_professional">Cancelado (Profissional)</option></select></div>
                                                </div>
                                                <DialogFooter><DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose><Button onClick={handleUpdateBooking}>Salvar</Button></DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                ))}
                                </div>
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
                        
                        {userRole === 'admin' && (
                        <TabsContent value="professionals" className="mt-6">
                           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6">
                                    <h2 className="text-2xl font-bold mb-6 flex items-center"><Users className="w-6 h-6 mr-2 text-[#2d8659]" /> Profissionais</h2>
                                    <div className="space-y-4">
                                        {professionals.map(prof => (
                                            <div key={prof.id} className="border rounded-lg p-4 flex justify-between items-center">
                                                <div><h3 className="font-bold text-lg">{prof.name}</h3><p className="text-sm text-gray-500">{prof.specialty}</p></div>
                                                <div className="flex gap-2"><Button size="icon" variant="ghost" onClick={() => handleEditProfessional(prof)}><Edit className="w-4 h-4" /></Button><Button size="icon" variant="ghost" onClick={() => handleDeleteProfessional(prof.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-white rounded-xl shadow-lg p-6">
                                    <h2 className="text-2xl font-bold mb-6">{isEditingProfessional ? 'Editar Profissional' : 'Novo Profissional'}</h2>
                                    <form onSubmit={handleProfessionalSubmit} className="space-y-4 text-sm">
                                        <input name="name" value={professionalFormData.name} onChange={e => setProfessionalFormData({...professionalFormData, name: e.target.value})} placeholder="Nome Completo" className="w-full input" required />
                                        <input name="specialty" value={professionalFormData.specialty} onChange={e => setProfessionalFormData({...professionalFormData, specialty: e.target.value})} placeholder="Especialidade" className="w-full input" />
                                        <input name="email" value={professionalFormData.email} onChange={e => setProfessionalFormData({...professionalFormData, email: e.target.value})} type="email" placeholder="Email de acesso" className="w-full input" disabled={isEditingProfessional} required={!isEditingProfessional} />
                                        {!isEditingProfessional && <input name="password" value={professionalFormData.password} onChange={e => setProfessionalFormData({...professionalFormData, password: e.target.value})} type="password" placeholder="Senha de acesso" className="w-full input" required />}
                                        <textarea name="mini_curriculum" value={professionalFormData.mini_curriculum} onChange={e => setProfessionalFormData({...professionalFormData, mini_curriculum: e.target.value})} placeholder="Mini-currículo" className="w-full input" rows="5"></textarea>
                                        <div className="flex gap-2"><Button type="submit" className="w-full bg-[#2d8659] hover:bg-[#236b47]">{isEditingProfessional ? 'Salvar' : 'Criar'}</Button>{isEditingProfessional && <Button type="button" variant="outline" onClick={resetProfessionalForm}>Cancelar</Button>}</div>
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
                                    <div className="space-y-4">
                                    {Object.keys(professionalAvailability).map(day => (
                                        <div key={day}>
                                            <h3 className="font-bold capitalize mb-2">{day.replace('monday', 'Segunda').replace('tuesday', 'Terça').replace('wednesday', 'Quarta').replace('thursday', 'Quinta').replace('friday', 'Sexta').replace('saturday', 'Sábado').replace('sunday', 'Domingo')}</h3>
                                            <input type="text" value={professionalAvailability[day]?.join(', ')} onChange={(e) => setProfessionalAvailability({...professionalAvailability, [day]: e.target.value.split(',').map(t => t.trim()).filter(t => t)})} placeholder="Ex: 09:00, 10:00, 11:00" className="w-full input"/>
                                        </div>
                                    ))}
                                    </div>
                                    <Button onClick={handleSaveAvailability} className="mt-6 bg-[#2d8659] hover:bg-[#236b47]">Salvar Horários</Button>
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
                                        {services.map(service => (
                                            <div key={service.id} className="border rounded-lg p-4 flex justify-between items-center">
                                                <div><h3 className="font-bold text-lg">{service.name}</h3><p className="text-sm text-gray-500">R$ {service.price} - {service.duration_minutes} min</p></div>
                                                <div className="flex gap-2"><Button size="icon" variant="ghost" onClick={() => handleEditService(service)}><Edit className="w-4 h-4" /></Button><Button size="icon" variant="ghost" onClick={() => handleDeleteService(service.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-white rounded-xl shadow-lg p-6">
                                    <h2 className="text-2xl font-bold mb-6">{isEditingService ? 'Editar Serviço' : 'Novo Serviço'}</h2>
                                    <form onSubmit={handleServiceSubmit} className="space-y-4 text-sm">
                                        <input name="name" value={serviceFormData.name} onChange={e => setServiceFormData({...serviceFormData, name: e.target.value})} placeholder="Nome do Serviço" className="w-full input" required />
                                        <input name="price" value={serviceFormData.price} onChange={e => setServiceFormData({...serviceFormData, price: e.target.value})} type="number" placeholder="Preço" className="w-full input" required />
                                        <input name="duration_minutes" value={serviceFormData.duration_minutes} onChange={e => setServiceFormData({...serviceFormData, duration_minutes: e.target.value})} type="number" placeholder="Duração (minutos)" className="w-full input" required />
                                        <div className="flex gap-2"><Button type="submit" className="w-full bg-[#2d8659] hover:bg-[#236b47]">{isEditingService ? 'Salvar' : 'Criar'}</Button>{isEditingService && <Button type="button" variant="outline" onClick={resetServiceForm}>Cancelar</Button>}</div>
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
                                    {events.map(event => (
                                        <div key={event.id} className="border rounded-lg p-4 mb-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-bold text-lg">{event.titulo}</h3>
                                                    <p className="text-sm text-gray-500">{new Date(event.data_inicio).toLocaleString('pt-BR')}</p>
                                                    <div className="flex items-center text-xs mt-2 gap-4"><span className="flex items-center"><Users className="w-4 h-4 mr-1"/>{event.inscricoes_eventos[0].count} / {event.limite_participantes}</span></div>
                                                </div>
                                                <div className="flex gap-2"><Button size="icon" variant="ghost" onClick={() => handleEditEvent(event)}><Edit className="w-4 h-4" /></Button><Button size="icon" variant="ghost" onClick={() => handleDeleteEvent(event.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="bg-white rounded-xl shadow-lg p-6">
                                    <h2 className="text-2xl font-bold mb-6">{isEditingEvent ? 'Editar Evento' : 'Novo Evento'}</h2>
                                    <form onSubmit={handleEventSubmit} className="space-y-4 text-sm">
                                        <input name="titulo" value={eventFormData.titulo} onChange={e => setEventFormData({...eventFormData, titulo: e.target.value})} placeholder="Título do Evento" className="w-full input" required />
                                        <textarea name="descricao" value={eventFormData.descricao} onChange={e => setEventFormData({...eventFormData, descricao: e.target.value})} placeholder="Descrição" className="w-full input" rows="3"></textarea>
                                        <select name="tipo_evento" value={eventFormData.tipo_evento} onChange={e => setEventFormData({...eventFormData, tipo_evento: e.target.value})} className="w-full input"><option>Workshop</option><option>Palestra</option></select>
                                        <select name="professional_id" value={eventFormData.professional_id} onChange={e => setEventFormData({...eventFormData, professional_id: e.target.value})} className="w-full input" required>
                                            <option value="">Selecione o Profissional</option>
                                            {professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium mb-1">Data/Hora Início</label>
                                                <input type="datetime-local" name="data_inicio" value={eventFormData.data_inicio} onChange={e => setEventFormData({...eventFormData, data_inicio: e.target.value})} className="w-full input" required/>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">Data/Hora Fim</label>
                                                <input type="datetime-local" name="data_fim" value={eventFormData.data_fim} onChange={e => setEventFormData({...eventFormData, data_fim: e.target.value})} className="w-full input" required/>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">Limite de Vagas</label>
                                                <input type="number" name="limite_participantes" value={eventFormData.limite_participantes} onChange={e => setEventFormData({...eventFormData, limite_participantes: e.target.value})} placeholder="Ex: 20" className="w-full input" min="1" max="500" required/>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">Limite para Inscrição</label>
                                                <input type="datetime-local" name="data_limite_inscricao" value={eventFormData.data_limite_inscricao} onChange={e => setEventFormData({...eventFormData, data_limite_inscricao: e.target.value})} className="w-full input" required/>
                                            </div>
                                        </div>
                                        <input name="link_slug" value={eventFormData.link_slug} onChange={e => setEventFormData({...eventFormData, link_slug: e.target.value})} placeholder="Link" className="w-full input" required/>
                                        <div className="flex gap-2"><Button type="submit" className="w-full bg-[#2d8659] hover:bg-[#236b47]">{isEditingEvent ? 'Salvar' : 'Criar'}</Button>{isEditingEvent && <Button type="button" variant="outline" onClick={resetEventForm}>Cancelar</Button>}</div>
                                    </form>
                                </div>
                            </div>
                        </TabsContent>
                        )}
                    </Tabs>
                </div>
            </div>
        </>
    );
};

export default AdminPage;
