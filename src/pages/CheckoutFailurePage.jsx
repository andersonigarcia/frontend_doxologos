import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { XCircle, AlertCircle, RefreshCw, Home, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import analytics from '@/lib/analytics';
import { logger } from '@/lib/logger';

const CheckoutFailurePage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [booking, setBooking] = useState(null);
    const [payment, setPayment] = useState(null);
    const [loading, setLoading] = useState(true);

    const paymentId = searchParams.get('payment_id');
    const externalReference = searchParams.get('external_reference');
    const collectionStatus = searchParams.get('collection_status'); // rejected, cancelled, etc.

    useEffect(() => {
        const fetchData = async () => {
            try {
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

                const bookingId = externalReference || payment?.booking_id;
                if (bookingId) {
                    const { data: bookingData } = await supabase
                        .from('bookings')
                        .select(`
                            *,
                            professional:professionals(name),
                            service:services(name, price)
                        `)
                        .eq('id', bookingId)
                        .single();
                    
                    if (bookingData) {
                        setBooking(bookingData);
                        
                        // Track payment failure
                        logger.error('Payment failed', {
                            bookingId: bookingData.id,
                            paymentId,
                            collectionStatus,
                            amount: bookingData.service?.price
                        });
                        
                        analytics.trackEvent('payment_failed', {
                            event_category: 'Checkout',
                            event_label: collectionStatus || 'unknown',
                            value: bookingData.service?.price || 0,
                            custom_parameter_1: bookingData.id,
                            custom_parameter_2: paymentId
                        });
                    }
                }
            } catch (error) {
                console.error('Erro ao buscar dados:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [paymentId, externalReference, payment?.booking_id]);

    const getFailureMessage = () => {
        if (payment?.status_detail) {
            const messages = {
                'cc_rejected_insufficient_amount': 'Saldo insuficiente no cartão',
                'cc_rejected_bad_filled_card_number': 'Número do cartão inválido',
                'cc_rejected_bad_filled_date': 'Data de validade inválida',
                'cc_rejected_bad_filled_security_code': 'Código de segurança inválido',
                'cc_rejected_call_for_authorize': 'Pagamento rejeitado, entre em contato com o banco',
                'cc_rejected_card_disabled': 'Cartão desabilitado',
                'cc_rejected_duplicated_payment': 'Pagamento duplicado',
                'cc_rejected_max_attempts': 'Número máximo de tentativas excedido',
                'cc_rejected_other_reason': 'Pagamento rejeitado pelo banco',
            };
            return messages[payment.status_detail] || 'Pagamento rejeitado';
        }

        if (collectionStatus === 'cancelled') {
            return 'Pagamento cancelado pelo usuário';
        }

        return 'Não foi possível processar o pagamento';
    };

    const handleRetry = () => {
        if (booking?.id) {
            navigate(`/checkout?booking_id=${booking.id}`);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            </div>
        );
    }

    return (
        <>
            <Helmet>
                <title>Pagamento Não Aprovado - Doxologos</title>
            </Helmet>

            <div className="min-h-screen bg-gradient-to-b from-red-50 to-white py-12">
                <div className="container mx-auto px-4 max-w-2xl">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="bg-white rounded-2xl shadow-xl p-8"
                    >
                        {/* Error Icon */}
                        <div className="text-center mb-8">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                                className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-red-100 mb-4"
                            >
                                <XCircle className="w-16 h-16 text-red-600" />
                            </motion.div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                Pagamento Não Aprovado
                            </h1>
                            <p className="text-gray-600">
                                {getFailureMessage()}
                            </p>
                        </div>

                        {/* Payment Details */}
                        {payment && (
                            <div className="bg-red-50 rounded-lg p-6 mb-6">
                                <h3 className="font-semibold text-gray-900 mb-4">Detalhes da Tentativa</h3>
                                <div className="space-y-2 text-sm">
                                    {payment.mp_payment_id && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">ID:</span>
                                            <span className="font-mono">{payment.mp_payment_id}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Status:</span>
                                        <span className="capitalize text-red-600">
                                            {payment.status === 'rejected' ? 'Rejeitado' : 
                                             payment.status === 'cancelled' ? 'Cancelado' : 
                                             payment.status}
                                        </span>
                                    </div>
                                    {payment.payment_method_id && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Método:</span>
                                            <span className="capitalize">{payment.payment_method_id.replace('_', ' ')}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Valor:</span>
                                        <span className="font-semibold">
                                            R$ {payment.transaction_amount?.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Booking Info */}
                        {booking && (
                            <div className="bg-gray-50 rounded-lg p-6 mb-6">
                                <h3 className="font-semibold text-gray-900 mb-3">Reserva Mantida</h3>
                                <p className="text-sm text-gray-600 mb-3">
                                    Sua consulta ainda está reservada por mais 24 horas. 
                                    Complete o pagamento para confirmar seu agendamento.
                                </p>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Profissional:</span>
                                        <span className="font-semibold">{booking.professional?.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Serviço:</span>
                                        <span>{booking.service?.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Data:</span>
                                        <span>{new Date(booking.booking_date).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Horário:</span>
                                        <span>{booking.booking_time}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Common Issues */}
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                            <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
                                <HelpCircle className="w-5 h-5 mr-2" />
                                Problemas Comuns e Soluções
                            </h4>
                            <ul className="text-sm text-blue-800 space-y-1">
                                <li>• <strong>Saldo insuficiente:</strong> Verifique o limite do seu cartão</li>
                                <li>• <strong>Dados incorretos:</strong> Confira o número, validade e CVV</li>
                                <li>• <strong>Cartão bloqueado:</strong> Entre em contato com seu banco</li>
                                <li>• <strong>Limite excedido:</strong> Tente outro cartão ou método de pagamento</li>
                            </ul>
                        </div>

                        {/* Warning */}
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                            <div className="flex items-start">
                                <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-yellow-800">
                                    <strong>Importante:</strong> Se não completar o pagamento em 24 horas, 
                                    seu horário será liberado e você precisará reagendar.
                                </p>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            {booking && (
                                <Button
                                    onClick={handleRetry}
                                    className="flex-1 bg-[#2d8659] hover:bg-[#236b47]"
                                >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Tentar Novamente
                                </Button>
                            )}
                            <Link to="/" className={booking ? 'flex-1' : 'w-full'}>
                                <Button variant="outline" className="w-full">
                                    <Home className="w-4 h-4 mr-2" />
                                    Voltar ao Início
                                </Button>
                            </Link>
                        </div>

                        {/* Support */}
                        <div className="mt-6 text-center text-sm text-gray-600">
                            <p>
                                Precisa de ajuda? Entre em contato conosco pelo WhatsApp:{' '}
                                <a 
                                    href="https://wa.me/5511999999999" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-[#2d8659] hover:underline font-semibold"
                                >
                                    (11) 99999-9999
                                </a>
                            </p>
                        </div>
                    </motion.div>
                </div>
            </div>
        </>
    );
};

export default CheckoutFailurePage;
