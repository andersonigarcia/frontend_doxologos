import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Clock, Calendar, Copy, CheckCircle, AlertCircle, RefreshCw, Home, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { QRCodeSVG } from 'qrcode.react';
import analytics from '@/lib/analytics';
import { logger } from '@/lib/logger';

const CheckoutPendingPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [booking, setBooking] = useState(null);
    const [payment, setPayment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [checking, setChecking] = useState(false);
    const [copied, setCopied] = useState(false);

    const paymentId = searchParams.get('payment_id');
    const externalReference = searchParams.get('external_reference');
    const preferenceId = searchParams.get('preference_id');

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
                            professional:professionals(name, image_url),
                            service:services(name, price)
                        `)
                        .eq('id', bookingId)
                        .single();
                    
                    if (bookingData) {
                        setBooking(bookingData);
                        
                        // Track pending payment
                        logger.info('Payment pending - PIX', {
                            bookingId: bookingData.id,
                            paymentId,
                            amount: bookingData.service?.price
                        });
                        
                        analytics.trackEvent('payment_pending', {
                            event_category: 'Checkout',
                            event_label: 'PIX',
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

    // Auto-check payment status every 5 seconds
    useEffect(() => {
        if (!payment?.mp_payment_id) return;

        const interval = setInterval(async () => {
            try {
                const { data: updatedPayment } = await supabase
                    .from('payments')
                    .select('status')
                    .eq('mp_payment_id', payment.mp_payment_id)
                    .single();

                if (updatedPayment?.status === 'approved') {
                    // Payment approved! Redirect to success
                    navigate(`/checkout/success?payment_id=${payment.mp_payment_id}&external_reference=${booking?.id}`);
                } else if (updatedPayment?.status === 'rejected' || updatedPayment?.status === 'cancelled') {
                    // Payment failed, redirect to failure
                    navigate(`/checkout/failure?payment_id=${payment.mp_payment_id}&external_reference=${booking?.id}`);
                }
            } catch (error) {
                console.error('Erro ao verificar status:', error);
            }
        }, 5000);

        // Stop checking after 10 minutes
        const timeout = setTimeout(() => clearInterval(interval), 600000);

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, [payment?.mp_payment_id, booking?.id, navigate]);

    const handleManualCheck = async () => {
        setChecking(true);
        try {
            const { data: updatedPayment } = await supabase
                .from('payments')
                .select('status')
                .eq('mp_payment_id', payment.mp_payment_id)
                .single();

            if (updatedPayment?.status === 'approved') {
                navigate(`/checkout/success?payment_id=${payment.mp_payment_id}&external_reference=${booking?.id}`);
            } else if (updatedPayment?.status === 'rejected' || updatedPayment?.status === 'cancelled') {
                navigate(`/checkout/failure?payment_id=${payment.mp_payment_id}&external_reference=${booking?.id}`);
            } else {
                alert('O pagamento ainda está pendente. Aguarde a confirmação.');
            }
        } catch (error) {
            console.error('Erro ao verificar:', error);
            alert('Erro ao verificar pagamento. Tente novamente.');
        } finally {
            setChecking(false);
        }
    };

    const handleCopyPix = () => {
        if (payment?.qr_code) {
            navigator.clipboard.writeText(payment.qr_code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const isPix = payment?.payment_method_id === 'pix';
    const isBoleto = payment?.payment_method_id === 'boleto';

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
            </div>
        );
    }

    return (
        <>
            <Helmet>
                <title>Aguardando Pagamento - Doxologos</title>
            </Helmet>

            <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-white py-12">
                <div className="container mx-auto px-4 max-w-2xl">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="bg-white rounded-2xl shadow-xl p-8"
                    >
                        {/* Pending Icon */}
                        <div className="text-center mb-8">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                                className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-yellow-100 mb-4"
                            >
                                <Clock className="w-16 h-16 text-yellow-600" />
                            </motion.div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                Aguardando Pagamento
                            </h1>
                            <p className="text-gray-600">
                                {isPix && 'Escaneie o QR Code ou copie o código PIX'}
                                {isBoleto && 'Boleto gerado com sucesso'}
                                {!isPix && !isBoleto && 'Seu pagamento está sendo processado'}
                            </p>
                        </div>

                        {/* PIX QR Code */}
                        {isPix && payment?.qr_code && (
                            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-6 mb-6">
                                <h3 className="font-semibold text-gray-900 mb-4 text-center">
                                    Pagamento via PIX
                                </h3>
                                
                                {/* QR Code */}
                                <div className="flex justify-center mb-4">
                                    <div className="bg-white p-4 rounded-lg shadow-lg">
                                        <QRCodeSVG value={payment.qr_code} size={200} />
                                    </div>
                                </div>

                                {/* Copy PIX Code */}
                                <div className="space-y-3">
                                    <p className="text-sm text-gray-600 text-center">
                                        Ou copie o código PIX abaixo:
                                    </p>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={payment.qr_code}
                                            readOnly
                                            className="flex-1 px-3 py-2 text-xs border rounded bg-white font-mono"
                                        />
                                        <Button
                                            onClick={handleCopyPix}
                                            variant={copied ? 'default' : 'outline'}
                                            className={copied ? 'bg-green-600 hover:bg-green-700' : ''}
                                        >
                                            {copied ? (
                                                <CheckCircle className="w-4 h-4" />
                                            ) : (
                                                <Copy className="w-4 h-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                {/* Instructions */}
                                <div className="mt-4 pt-4 border-t space-y-2 text-sm text-gray-600">
                                    <p className="font-semibold text-gray-900">Como pagar:</p>
                                    <ol className="list-decimal list-inside space-y-1">
                                        <li>Abra o app do seu banco</li>
                                        <li>Escolha pagar via PIX</li>
                                        <li>Escaneie o QR Code ou cole o código copiado</li>
                                        <li>Confirme o pagamento</li>
                                    </ol>
                                    <p className="text-xs text-yellow-700 mt-3">
                                        ⚠️ O pagamento via PIX é confirmado em poucos segundos. 
                                        Esta página será atualizada automaticamente.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Boleto Info */}
                        {isBoleto && (
                            <div className="bg-blue-50 rounded-lg p-6 mb-6">
                                <h3 className="font-semibold text-gray-900 mb-4">Boleto Bancário</h3>
                                <div className="space-y-3 text-sm">
                                    <p className="text-gray-600">
                                        O boleto foi gerado e enviado para seu e-mail. 
                                        Você também pode acessá-lo através do link abaixo:
                                    </p>
                                    {payment?.external_resource_url && (
                                        <a
                                            href={payment.external_resource_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block w-full"
                                        >
                                            <Button variant="outline" className="w-full">
                                                Ver/Imprimir Boleto
                                            </Button>
                                        </a>
                                    )}
                                    <div className="mt-4 pt-4 border-t text-xs text-gray-600 space-y-1">
                                        <p>• O boleto tem validade de 3 dias</p>
                                        <p>• A confirmação do pagamento pode levar até 2 dias úteis</p>
                                        <p>• Você receberá um e-mail quando o pagamento for confirmado</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Payment Details */}
                        {payment && (
                            <div className="bg-gray-50 rounded-lg p-6 mb-6">
                                <h3 className="font-semibold text-gray-900 mb-4">Detalhes do Pagamento</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Valor:</span>
                                        <span className="font-semibold text-green-600">
                                            R$ {payment.transaction_amount?.toFixed(2)}
                                        </span>
                                    </div>
                                    {payment.mp_payment_id && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">ID:</span>
                                            <span className="font-mono text-xs">{payment.mp_payment_id}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Status:</span>
                                        <span className="capitalize text-yellow-600">Pendente</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Booking Info */}
                        {booking && (
                            <div className="bg-blue-50 rounded-lg p-6 mb-6">
                                <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                                    <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                                    Reserva de Horário
                                </h3>
                                <div className="flex items-center mb-3">
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
                                <div className="space-y-2 text-sm border-t pt-3">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Data:</span>
                                        <span className="font-semibold">
                                            {new Date(booking.booking_date).toLocaleDateString('pt-BR')}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Horário:</span>
                                        <span className="font-semibold">{booking.booking_time}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Warning */}
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                            <div className="flex items-start">
                                <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                                <div className="text-sm text-yellow-800">
                                    <p className="font-semibold mb-1">Importante:</p>
                                    <p>
                                        Seu horário está reservado por 24 horas. 
                                        Complete o pagamento para confirmar definitivamente sua consulta.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            {payment?.mp_payment_id && (
                                <Button
                                    onClick={handleManualCheck}
                                    disabled={checking}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    {checking ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                            Verificando...
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="w-4 h-4 mr-2" />
                                            Verificar Pagamento
                                        </>
                                    )}
                                </Button>
                            )}
                            <Link to={user ? "/paciente" : "/"} className="flex-1">
                                <Button variant="outline" className="w-full">
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
                        </div>

                        {/* Auto-check indicator */}
                        <div className="mt-4 text-center text-xs text-gray-500">
                            <p className="flex items-center justify-center">
                                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                Verificando automaticamente o status do pagamento...
                            </p>
                        </div>
                    </motion.div>
                </div>
            </div>
        </>
    );
};

export default CheckoutPendingPage;
