import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Star, Send, MessageCircle, Heart, CheckCircle, User, Mail, Calendar } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { useToast } from '../components/ui/use-toast';
import { supabase } from '../lib/customSupabaseClient';

const DepoimentoPage = () => {
    const [formData, setFormData] = useState({
        patient_name: '',
        patient_email: '',
        booking_id: '',
        rating: 5,
        comment: ''
    });
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        fetchUserBookings();
    }, []);

    const fetchUserBookings = async () => {
        try {
            // Para demonstração, vamos buscar alguns agendamentos recentes
            // Em produção, você filtraria pelo usuário logado
            const { data, error } = await supabase
                .from('bookings')
                .select(`
                    id,
                    patient_name,
                    patient_email,
                    booking_date,
                    booking_time,
                    professionals(name)
                `)
                .eq('status', 'confirmed')
                .order('booking_date', { ascending: false })
                .limit(10);

            if (error) throw error;
            setBookings(data || []);
        } catch (error) {
            console.error('Erro ao buscar agendamentos:', error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleRatingChange = (rating) => {
        setFormData(prev => ({
            ...prev,
            rating
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.patient_name || !formData.comment) {
            toast({
                variant: 'destructive',
                title: 'Campos obrigatórios',
                description: 'Por favor, preencha seu nome e escreva seu comentário.'
            });
            return;
        }

        setIsSubmitting(true);
        setLoading(true);

        try {
            let insertData = {
                rating: formData.rating,
                comment: formData.comment,
                is_approved: false, // Depoimentos públicos precisam de aprovação
                patient_name: formData.patient_name,
                patient_email: formData.patient_email
            };

            // Se um agendamento foi selecionado, adicionar os dados relacionados
            if (formData.booking_id) {
                const selectedBooking = bookings.find(b => b.id === formData.booking_id);
                if (selectedBooking) {
                    insertData.booking_id = formData.booking_id;
                    insertData.patient_id = selectedBooking.patient_id || null;
                    insertData.professional_id = selectedBooking.professional_id || null;
                }
            } else {
                // Para depoimentos sem agendamento, usar null nos campos relacionais
                insertData.booking_id = null;
                insertData.patient_id = null; 
                insertData.professional_id = null;
            }

            const { error } = await supabase
                .from('reviews')
                .insert([insertData]);

            if (error) throw error;

            setSubmitted(true);
            toast({
                title: 'Depoimento enviado!',
                description: 'Obrigado pelo seu feedback. Ele será analisado pela nossa equipe.'
            });

        } catch (error) {
            console.error('Erro ao enviar depoimento:', error);
            toast({
                variant: 'destructive',
                title: 'Erro ao enviar depoimento',
                description: 'Tente novamente em alguns momentos ou entre em contato conosco.'
            });
        } finally {
            setLoading(false);
            setIsSubmitting(false);
        }
    };

    const renderStars = (rating, interactive = false) => {
        return (
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        onClick={() => interactive && handleRatingChange(star)}
                        className={`${interactive ? 'hover:scale-110 transition-transform cursor-pointer' : 'cursor-default'}`}
                        disabled={!interactive}
                    >
                        <Star 
                            className={`w-6 h-6 ${
                                star <= rating 
                                    ? 'text-yellow-500 fill-current' 
                                    : 'text-gray-300'
                            }`} 
                        />
                    </button>
                ))}
            </div>
        );
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-green-50/50 to-white flex items-center justify-center px-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="text-center max-w-md mx-auto"
                >
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">Depoimento Enviado!</h1>
                    <p className="text-gray-600 mb-8">
                        Obrigado por compartilhar sua experiência conosco. Seu depoimento será analisado 
                        pela nossa equipe e poderá aparecer no site após a aprovação.
                    </p>
                    <Button 
                        onClick={() => {
                            setSubmitted(false);
                            setFormData({
                                patient_name: '',
                                patient_email: '',
                                booking_id: '',
                                rating: 5,
                                comment: ''
                            });
                        }}
                        variant="outline"
                        className="mr-4"
                    >
                        Enviar Outro Depoimento
                    </Button>
                    <Button 
                        onClick={() => navigate('/')}
                        className="bg-[#2d8659] hover:bg-[#236b47]"
                    >
                        Voltar ao Site
                    </Button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-green-50/50 to-white">
            {/* Header com Logo */}
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

            {/* Hero Section */}
            <section className="py-20 px-4 pt-32">
                <div className="max-w-4xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-[#2d8659]/10 rounded-full mb-6">
                            <MessageCircle className="w-10 h-10 text-[#2d8659]" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-6">
                            <span className="gradient-text">Compartilhe</span><br />
                            <span className="text-gray-800">sua experiência</span>
                        </h1>
                        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                            Sua opinião é muito importante para nós! Conte como foi sua experiência 
                            e ajude outras pessoas a conhecer nosso trabalho.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Form Section */}
            <section className="pb-20 px-4">
                <div className="max-w-2xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                    >
                        <Card className="p-8">
                            <form onSubmit={handleSubmit} className="space-y-6" role="form" aria-labelledby="testimonial-form-title">
                                <div>
                                    <h2 className="text-2xl font-bold mb-2">Deixe seu Depoimento</h2>
                                    <p className="text-gray-600 mb-6">
                                        Queremos ouvir sua experiência! Seja de uma consulta, evento, palestra ou qualquer interação conosco.
                                    </p>
                                </div>

                                {/* Rating */}
                                <div>
                                    <label className="block text-sm font-medium mb-3">
                                        Como você avalia nossa clínica? *
                                    </label>
                                    <div className="flex items-center gap-4">
                                        {renderStars(formData.rating, true)}
                                        <span className="text-sm text-gray-600 ml-2">
                                            {formData.rating === 1 && 'Muito insatisfeito'}
                                            {formData.rating === 2 && 'Insatisfeito'}
                                            {formData.rating === 3 && 'Neutro'}
                                            {formData.rating === 4 && 'Satisfeito'}
                                            {formData.rating === 5 && 'Muito satisfeito'}
                                        </span>
                                    </div>
                                </div>

                                {/* Nome */}
                                <div>
                                    <label htmlFor="patient_name" className="block text-sm font-medium mb-2">
                                        Seu Nome *
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <input
                                            type="text"
                                            id="patient_name"
                                            name="patient_name"
                                            value={formData.patient_name}
                                            onChange={handleInputChange}
                                            className="input pl-10"
                                            placeholder="Digite seu nome"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Email */}
                                <div>
                                    <label htmlFor="patient_email" className="block text-sm font-medium mb-2">
                                        Seu Email (opcional)
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <input
                                            type="email"
                                            id="patient_email"
                                            name="patient_email"
                                            value={formData.patient_email}
                                            onChange={handleInputChange}
                                            className="input pl-10"
                                            placeholder="seu.email@exemplo.com"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Seu email não será exibido publicamente, é apenas para nossa referência.
                                    </p>
                                </div>

                                {/* Seleção de Agendamento - Opcional */}
                                <div>
                                    <label htmlFor="booking_id" className="block text-sm font-medium mb-2">
                                        Agendamento Relacionado (opcional)
                                    </label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <select
                                            id="booking_id"
                                            name="booking_id"
                                            value={formData.booking_id}
                                            onChange={handleInputChange}
                                            className="input pl-10"
                                        >
                                            <option value="">Não relacionado a um agendamento específico</option>
                                            {bookings.map((booking) => (
                                                <option key={booking.id} value={booking.id}>
                                                    {booking.patient_name} - {new Date(booking.booking_date).toLocaleDateString('pt-BR')} às {booking.booking_time} com {booking.professionals?.name || 'Profissional'}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Se for sobre uma consulta específica, selecione o agendamento. Caso contrário, deixe em branco.
                                    </p>
                                </div>

                                {/* Comentário */}
                                <div>
                                    <label htmlFor="comment" className="block text-sm font-medium mb-2">
                                        Seu Depoimento *
                                    </label>
                                    <textarea
                                        id="comment"
                                        name="comment"
                                        value={formData.comment}
                                        onChange={handleInputChange}
                                        rows={6}
                                        className="input resize-none"
                                        placeholder="Conte sua experiência conosco... Como foi o atendimento? O que mais te impressionou? Como nossos serviços ajudaram você?"
                                        required
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Mínimo de 20 caracteres. Seja sincero e detalhado!
                                    </p>
                                </div>

                                {/* Disclaimer */}
                                <div className="bg-blue-50 p-4 rounded-lg">
                                    <div className="flex items-start gap-3">
                                        <Heart className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                        <div className="text-sm">
                                            <p className="font-medium text-blue-900 mb-1">Privacidade e Moderação</p>
                                            <p className="text-blue-800">
                                                Seu depoimento será analisado pela nossa equipe antes de ser publicado no site. 
                                                Respeitamos sua privacidade e apenas informações que você autorizar serão exibidas.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <motion.div
                                    whileHover={!isSubmitting ? { scale: 1.02, y: -1 } : {}}
                                    whileTap={!isSubmitting ? { scale: 0.98 } : {}}
                                >
                                    <Button
                                        type="submit"
                                        disabled={isSubmitting || !formData.patient_name || !formData.comment || formData.comment.length < 20}
                                        className={`w-full py-4 px-6 text-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center ${
                                            isSubmitting 
                                                ? 'bg-gray-400 cursor-not-allowed' 
                                                : 'bg-[#2d8659] hover:bg-[#236b47]'
                                        }`}
                                        title={!formData.patient_name || !formData.comment || formData.comment.length < 20 ? 'Preencha todos os campos obrigatórios (mínimo 20 caracteres no comentário)' : ''}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <motion.div 
                                                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
                                                    animate={{ rotate: 360 }}
                                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                />
                                                Enviando...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="w-5 h-5 mr-2" />
                                                Enviar Depoimento
                                            </>
                                        )}
                                    </Button>
                                </motion.div>
                            </form>
                        </Card>
                    </motion.div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-16 bg-gray-50">
                <div className="max-w-4xl mx-auto text-center px-4">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                    >
                        <h2 className="text-3xl font-bold mb-4">Outras Formas de Nos Contatar</h2>
                        <p className="text-gray-600 mb-8">
                            Além do depoimento, você pode entrar em contato conosco através de:
                        </p>
                        <div className="grid md:grid-cols-3 gap-6">
                            <Card className="p-6">
                                <MessageCircle className="w-8 h-8 text-[#2d8659] mx-auto mb-3" />
                                <h3 className="font-semibold mb-2">WhatsApp</h3>
                                <p className="text-gray-600 text-sm">Fale diretamente conosco</p>
                            </Card>
                            <Card className="p-6">
                                <Mail className="w-8 h-8 text-[#2d8659] mx-auto mb-3" />
                                <h3 className="font-semibold mb-2">Email</h3>
                                <p className="text-gray-600 text-sm">contato@doxologos.com.br</p>
                            </Card>
                            <Card className="p-6">
                                <Heart className="w-8 h-8 text-[#2d8659] mx-auto mb-3" />
                                <h3 className="font-semibold mb-2">Presencialmente</h3>
                                <p className="text-gray-600 text-sm">Durante sua consulta</p>
                            </Card>
                        </div>
                    </motion.div>
                </div>
            </section>
        </div>
    );
};

export default DepoimentoPage;