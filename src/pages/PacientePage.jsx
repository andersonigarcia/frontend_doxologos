
import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Heart, ArrowLeft, LogOut, Calendar, Clock, AlertTriangle, CheckCircle, XCircle, Star, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';

const PacientePage = () => {
    const { toast } = useToast();
    const { user, signIn, signOut } = useAuth();
    const [loginData, setLoginData] = useState({ email: '', password: '' });
    const [bookings, setBookings] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    const [reviewingBooking, setReviewingBooking] = useState(null);
    const [reviewData, setReviewData] = useState({ rating: 0, comment: '' });

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        const { data: bookingsData, error: bookingsError } = await supabase
            .from('bookings')
            .select(`*, professional:professionals(name), service:services(name)`)
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
            console.error("Error fetching reviews:", reviewsError);
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

    const handleLogin = async (e) => {
        e.preventDefault();
        await signIn(loginData.email, loginData.password);
    };

    const handleLogout = async () => {
        await signOut();
        setLoginData({ email: '', password: '' });
    };

    const cancelBooking = async (bookingId) => {
        const { error } = await supabase
            .from('bookings')
            .update({ status: 'cancelled_by_patient' })
            .eq('id', bookingId);

        if (error) {
            toast({ variant: "destructive", title: "Erro ao cancelar", description: error.message });
        } else {
            toast({ title: "Agendamento cancelado com sucesso." });
            fetchData();
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

    if (!user) {
        return (
            <>
                <Helmet><title>Área do Paciente - Doxologos</title></Helmet>
                <header className="bg-white shadow-sm">
                    <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
                        <Link to="/" className="flex items-center space-x-2"><Heart className="w-8 h-8 text-[#2d8659]" /><span className="text-2xl font-bold gradient-text">Doxologos</span></Link>
                        <Link to="/"><Button variant="outline" className="border-[#2d8659] text-[#2d8659]"><ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Início</Button></Link>
                    </nav>
                </header>
                <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
                        <h2 className="text-3xl font-bold mb-6 text-center">Área do Paciente</h2>
                        <p className="text-center text-gray-600 mb-6">Acesse para ver seus agendamentos.</p>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div><label className="block text-sm font-medium mb-2">Email</label><input type="email" required value={loginData.email} onChange={(e) => setLoginData({...loginData, email: e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent"/></div>
                            <div><label className="block text-sm font-medium mb-2">Senha</label><input type="password" required value={loginData.password} onChange={(e) => setLoginData({...loginData, password: e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent"/></div>
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
                <nav className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <Link to="/" className="flex items-center space-x-2">
                            <Heart className="w-8 h-8 text-[#2d8659]" />
                            <span className="text-2xl font-bold gradient-text">Doxologos</span>
                        </Link>
                        <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-600">Olá, {user.user_metadata?.full_name || user.email.split('@')[0]}</span>
                            <Button onClick={handleLogout} variant="outline" className="border-[#2d8659] text-[#2d8659]">
                                <LogOut className="w-4 h-4 mr-2" /> Sair
                            </Button>
                        </div>
                    </div>
                </nav>
            </header>
            <div className="min-h-screen bg-gray-50 py-12 pt-24">
                <div className="container mx-auto px-4 max-w-4xl">
                    <h1 className="text-4xl font-bold mb-2">Área do Paciente</h1>
                    <p className="text-gray-500 mb-8">Gerencie seus agendamentos e consultas</p>
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <h2 className="text-2xl font-bold mb-6 flex items-center"><Calendar className="w-6 h-6 mr-2 text-[#2d8659]" /> Meus Agendamentos</h2>
                        {loading ? <p>Carregando seus agendamentos...</p> : bookings.length === 0 ? (
                            <div className="text-center py-10">
                                <p className="text-gray-500 mb-4">Você ainda não tem agendamentos.</p>
                                <Link to="/agendamento"><Button className="bg-[#2d8659] hover:bg-[#236b47]">Agendar sua primeira consulta</Button></Link>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {bookings.map((booking) => (
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
                                        {booking.status === 'pending_payment' && (
                                            <div className="flex items-center gap-2 bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-r-lg">
                                                <AlertTriangle className="w-5 h-5 text-yellow-600"/>
                                                <p className="text-sm text-yellow-800">Aguardando confirmação de pagamento.</p>
                                            </div>
                                        )}
                                        {booking.status === 'confirmed' && (
                                            <div className="flex items-center gap-2 bg-green-50 border-l-4 border-green-400 p-3 rounded-r-lg">
                                                <CheckCircle className="w-5 h-5 text-green-600"/>
                                                <p className="text-sm text-green-800">Seu agendamento está confirmado! O link será enviado por e-mail.</p>
                                            </div>
                                        )}
                                        <div className="mt-4 flex flex-wrap gap-2">
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
                                             <Button size="sm" variant="outline" onClick={() => toast({ title: 'Em breve!', description: 'A função de reagendamento será implementada em breve.' })}>Reagendar</Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default PacientePage;
