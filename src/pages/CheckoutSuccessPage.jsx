import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { CheckCircle, Calendar, Download, Home, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const CheckoutSuccessPage = () => {
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    const [booking, setBooking] = useState(null);
    const [payment, setPayment] = useState(null);
    const [loading, setLoading] = useState(true);

    const paymentId = searchParams.get('payment_id');
    const externalReference = searchParams.get('external_reference'); // booking_id

    useEffect(() => {
        const fetchPaymentAndBooking = async () => {
            try {
                // Buscar pagamento
                if (paymentId) {
                    const { data: paymentData } = await supabase
                        .from('payments')
                        .select('*')
                        .eq('mp_payment_id', paymentId)
                        .single();
                    
                    if (paymentData) {
                        setPayment(paymentData);
                    }
                }

                // Buscar agendamento
                const bookingId = externalReference || payment?.booking_id;
                if (bookingId) {
                    const { data: bookingData } = await supabase
                        .from('bookings')
                        .select(`
                            *,
                            professional:professionals(name, image_url),
                            service:services(name, price)
                        `)
                        .eq('id', bookingId)
                        .single();
                    
                    if (bookingData) {
                        setBooking(bookingData);
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
                            <div className="bg-blue-50 rounded-lg p-6 mb-6">
                                <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                                    <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                                    Sua Consulta
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex items-center">
                                        {booking.professional?.image_url && (
                                            <img
                                                src={booking.professional.image_url}
                                                alt={booking.professional.name}
                                                className="w-12 h-12 rounded-full object-cover mr-3"
                                            />
                                        )}
                                        <div>
                                            <p className="font-semibold">{booking.professional?.name}</p>
                                            <p className="text-sm text-gray-600">{booking.service?.name}</p>
                                        </div>
                                    </div>
                                    <div className="border-t pt-3 space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Data:</span>
                                            <span className="font-semibold">
                                                {new Date(booking.booking_date).toLocaleDateString('pt-BR', {
                                                    weekday: 'long',
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Horário:</span>
                                            <span className="font-semibold">{booking.booking_time}</span>
                                        </div>
                                        {booking.zoom_meeting_url && (
                                            <div className="mt-3 p-3 bg-blue-100 rounded">
                                                <p className="text-xs text-blue-800 mb-2">Link da videochamada:</p>
                                                <a
                                                    href={booking.zoom_meeting_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm text-blue-600 hover:underline break-all"
                                                >
                                                    {booking.zoom_meeting_url}
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Next Steps */}
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                            <h4 className="font-semibold text-yellow-900 mb-2">Próximos Passos</h4>
                            <ul className="text-sm text-yellow-800 space-y-1">
                                <li>• Você receberá um e-mail de confirmação com todos os detalhes</li>
                                <li>• Um lembrete será enviado 24 horas antes da consulta</li>
                                <li>• O link da videochamada estará disponível na sua área do paciente</li>
                                <li>• Em caso de dúvidas, entre em contato conosco</li>
                            </ul>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Link to={user ? "/paciente" : "/"} className="flex-1">
                                <Button className="w-full bg-[#2d8659] hover:bg-[#236b47]">
                                    {user ? (
                                        <>
                                            <User className="w-4 h-4 mr-2" />
                                            Área do Paciente
                                        </>
                                    ) : (
                                        <>
                                            <Home className="w-4 h-4 mr-2" />
                                            Voltar ao Início
                                        </>
                                    )}
                                </Button>
                            </Link>
                            {booking && (
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => {
                                        const bookingDetails = `
Confirmação de Agendamento - Doxologos

Profissional: ${booking.professional?.name}
Serviço: ${booking.service?.name}
Data: ${new Date(booking.booking_date).toLocaleDateString('pt-BR')}
Horário: ${booking.booking_time}
Valor: R$ ${booking.service?.price || payment?.transaction_amount}

${booking.zoom_meeting_url ? `Link da videochamada:\n${booking.zoom_meeting_url}` : ''}

ID do Pagamento: ${payment?.mp_payment_id || 'N/A'}
                                        `.trim();

                                        navigator.clipboard.writeText(bookingDetails);
                                        alert('Detalhes copiados para a área de transferência!');
                                    }}
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    Copiar Detalhes
                                </Button>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>
        </>
    );
};

export default CheckoutSuccessPage;
