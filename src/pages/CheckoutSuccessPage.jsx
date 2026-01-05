import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { CheckCircle, Calendar, Download, Home, User, ExternalLink, Mail, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import analytics from '@/lib/analytics';
import { logger } from '@/lib/logger';

const CheckoutSuccessPage = () => {
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [booking, setBooking] = useState(null);
    const [payment, setPayment] = useState(null);
    const [loading, setLoading] = useState(true);

    // Pegar dados do state (quando vem do CheckoutPage)
    const stateBookingId = location.state?.bookingId;
    const statePaymentId = location.state?.paymentId;

    const paymentId = statePaymentId || searchParams.get('payment_id');
    const externalReference = stateBookingId || searchParams.get('external_reference'); // booking_id

    useEffect(() => {
        const fetchPaymentAndBooking = async () => {
            try {
                // Buscar agendamento primeiro
                const bookingId = externalReference || payment?.booking_id;
                if (bookingId) {
                    const { data: bookingData, error: bookingError } = await supabase
                        .from('bookings')
                        .select(`
                            *,
                            professional:professionals(name, specialty),
                            service:services(name, price, duration_minutes)
                        `)
                        .eq('id', bookingId)
                        .single();
                    
                    if (bookingError) {
                        console.error('Erro ao buscar booking:', bookingError);
                    }
                    
                    if (bookingData) {
                        setBooking(bookingData);
                        
                        // Track successful booking conversion
                        logger.success('Booking completed successfully', {
                            bookingId: bookingData.id,
                            professionalId: bookingData.professional_id,
                            serviceId: bookingData.service_id,
                            amount: bookingData.service?.price
                        });
                        
                        analytics.trackBookingCompleted(
                            bookingData.id,
                            bookingData.professional_id,
                            bookingData.service_id,
                            bookingData.service?.price || 0
                        );
                    }
                }

                // Buscar pagamento
                if (paymentId) {
                    const { data: paymentData, error: paymentError } = await supabase
                        .from('payments')
                        .select('*')
                        .eq('mp_payment_id', paymentId)
                        .single();
                    
                    if (paymentError) {
                        console.error('Erro ao buscar pagamento:', paymentError);
                    }
                    
                    if (paymentData) {
                        setPayment(paymentData);
                    }
                }
            } catch (error) {
                console.error('Erro ao buscar dados:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPaymentAndBooking();
    }, [paymentId, externalReference, payment?.booking_id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2d8659]"></div>
            </div>
        );
    }

    return (
        <>
            <Helmet>
                <title>Pagamento Aprovado - Doxologos</title>
            </Helmet>

            <div className="min-h-screen bg-gradient-to-b from-green-50 to-white py-12">
                <div className="container mx-auto px-4 max-w-2xl">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="bg-white rounded-2xl shadow-xl p-8"
                    >
                        {/* Success Icon */}
                        <div className="text-center mb-8">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                                className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-100 mb-4"
                            >
                                <CheckCircle className="w-16 h-16 text-green-600" />
                            </motion.div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                Pagamento Confirmado!
                            </h1>
                            <p className="text-gray-600">
                                Sua consulta foi agendada com sucesso
                            </p>
                        </div>

                        {/* Payment Details */}
                        {payment && (
                            <div className="bg-gray-50 rounded-lg p-6 mb-6">
                                <h3 className="font-semibold text-gray-900 mb-4">Detalhes do Pagamento</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">ID do Pagamento:</span>
                                        <span className="font-mono">{payment.mp_payment_id}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Método:</span>
                                        <span className="capitalize">{payment.payment_method_id?.replace('_', ' ')}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Valor:</span>
                                        <span className="font-semibold text-green-600">
                                            R$ {payment.transaction_amount?.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Data:</span>
                                        <span>{new Date(payment.date_approved || payment.created_at).toLocaleString('pt-BR')}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Booking Details */}
                        {booking && (
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 mb-6 border border-blue-200">
                                <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                                    <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                                    Detalhes da Sua Consulta
                                </h3>
                                <div className="space-y-4">
                                    <div className="bg-white rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div>
                                                <p className="font-semibold text-lg text-gray-900">{booking.professional?.name}</p>
                                                <p className="text-sm text-gray-600">{booking.professional?.specialty || booking.service?.name}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-bold text-green-600">
                                                    R$ {(booking.service?.price || payment?.amount || 0).toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div className="border-t pt-3 space-y-2">
                                            <div className="flex items-center text-gray-700">
                                                <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                                                <span className="font-medium">
                                                    {new Date(booking.booking_date).toLocaleDateString('pt-BR', {
                                                        weekday: 'long',
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric'
                                                    })}
                                                </span>
                                            </div>
                                            <div className="flex items-center text-gray-700">
                                                <Clock className="w-4 h-4 mr-2 text-blue-600" />
                                                <span className="font-medium">{booking.booking_time}</span>
                                                {booking.service?.duration_minutes && (
                                                    <span className="ml-2 text-sm text-gray-500">
                                                        ({booking.service.duration_minutes} minutos)
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Zoom Link - Destaque especial */}
                                    {booking.zoom_link && (
                                        <motion.div
                                            initial={{ scale: 0.95, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ delay: 0.3 }}
                                            className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg p-4 shadow-lg"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <p className="font-semibold mb-1 flex items-center">
                                                        <ExternalLink className="w-4 h-4 mr-2" />
                                                        Link da Videochamada
                                                    </p>
                                                    <p className="text-sm text-green-50 mb-3">
                                                        Acesse este link no dia e horário da consulta
                                                    </p>
                                                    <a
                                                        href={booking.zoom_link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center bg-white text-green-600 px-4 py-2 rounded-lg font-medium hover:bg-green-50 transition-colors"
                                                    >
                                                        Acessar Sala
                                                        <ExternalLink className="w-4 h-4 ml-2" />
                                                    </a>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Next Steps */}
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-500 rounded-lg p-5 mb-6">
                            <h4 className="font-semibold text-amber-900 mb-3 flex items-center">
                                <Mail className="w-5 h-5 mr-2" />
                                Próximos Passos
                            </h4>
                            <ul className="text-sm text-amber-900 space-y-2">
                                <li className="flex items-start">
                                    <span className="text-amber-600 mr-2">✓</span>
                                    <span>Você receberá um <strong>e-mail de confirmação</strong> com todos os detalhes</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-amber-600 mr-2">✓</span>
                                    <span>Um <strong>lembrete será enviado</strong> 24 horas antes da consulta</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-amber-600 mr-2">✓</span>
                                    <span>O <strong>link da videochamada</strong> está disponível na sua Área do Paciente</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-amber-600 mr-2">✓</span>
                                    <span>Em caso de dúvidas, <strong>entre em contato</strong> conosco pelo WhatsApp</span>
                                </li>
                            </ul>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button
                                onClick={() => navigate('/area-do-paciente')}
                                className="flex-1 bg-gradient-to-r from-[#2d8659] to-[#1e6b44] hover:from-[#236b47] hover:to-[#175334] text-white shadow-lg h-12"
                            >
                                <User className="w-5 h-5 mr-2" />
                                Ir para Área do Paciente
                            </Button>
                            <Link to="/" className="flex-1">
                                <Button
                                    variant="outline"
                                    className="w-full border-2 border-gray-300 hover:bg-gray-50 h-12"
                                >
                                    <Home className="w-5 h-5 mr-2" />
                                    Voltar ao Início
                                </Button>
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </div>
        </>
    );
};

export default CheckoutSuccessPage;
