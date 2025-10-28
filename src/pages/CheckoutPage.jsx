import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { CreditCard, Smartphone, Barcode, Calendar, Lock, CheckCircle, XCircle, Clock, ArrowLeft, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import MercadoPagoService from '@/lib/mercadoPagoService';
import { QRCodeSVG } from 'qrcode.react';

const CheckoutPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    
    const bookingId = searchParams.get('booking_id');
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [selectedMethod, setSelectedMethod] = useState('pix');
    const [preference, setPreference] = useState(null);
    const [paymentStatus, setPaymentStatus] = useState(null);
    const [pixPayment, setPixPayment] = useState(null); // Armazena dados do pagamento PIX
    const [pollingInterval, setPollingInterval] = useState(null); // ID do interval para polling

    const paymentMethods = [
        {
            id: 'pix',
            name: 'PIX',
            icon: <Smartphone className="w-6 h-6" />,
            description: 'Aprovação imediata',
            available: true
        },
        {
            id: 'credit_card',
            name: 'Cartão de Crédito',
            icon: <CreditCard className="w-6 h-6" />,
            description: 'Parcelamento em até 12x',
            available: true
        },
        {
            id: 'debit_card',
            name: 'Cartão de Débito',
            icon: <CreditCard className="w-6 h-6" />,
            description: 'Débito em conta',
            available: true
        },
        {
            id: 'bank_transfer',
            name: 'Boleto Bancário',
            icon: <Barcode className="w-6 h-6" />,
            description: 'Vencimento em 3 dias',
            available: true
        }
    ];

    useEffect(() => {
        if (bookingId) {
            fetchBooking();
        } else {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'ID do agendamento não informado'
            });
            navigate('/');
        }
    }, [bookingId]);

    const fetchBooking = async () => {
        try {
            const { data, error } = await supabase
                .from('bookings')
                .select(`
                    *,
                    service:services(name, price),
                    professional:professionals(name)
                `)
                .eq('id', bookingId)
                .single();

            if (error) throw error;

            if (!data) {
                throw new Error('Agendamento não encontrado');
            }

            // Verificar se já foi pago
            if (data.status === 'confirmed' || data.status === 'paid') {
                navigate(`/paciente`);
                return;
            }

            setBooking(data);
        } catch (error) {
            console.error('Erro ao buscar agendamento:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível carregar o agendamento'
            });
            navigate('/');
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async () => {
        setProcessing(true);

        try {
            const amount = booking.valor_consulta || booking.service?.price || 0;

            if (!amount || amount <= 0) {
                throw new Error('Valor inválido para pagamento');
            }

            const requestPayload = {
                booking_id: bookingId,
                amount: amount,
                description: `Consulta - ${booking.service?.name || 'Atendimento Psicológico'}`,
                payer: {
                    name: booking.patient_name,
                    email: booking.patient_email,
                    phone: {
                        area_code: booking.patient_phone?.substring(0, 2) || '',
                        number: booking.patient_phone?.substring(2) || ''
                    }
                }
            };

            // Se for PIX, usar pagamento direto (sem redirecionamento)
            if (selectedMethod === 'pix') {
                console.log('🔵 Criando pagamento PIX direto...');
                const result = await MercadoPagoService.createPixPayment(requestPayload);

                if (result.success) {
                    console.log('✅ Pagamento PIX criado:', result);
                    setPixPayment(result);
                    
                    // Iniciar polling do status do pagamento
                    startPaymentPolling(result.payment_id);
                    
                    toast({
                        title: 'QR Code gerado!',
                        description: 'Escaneie o código para efetuar o pagamento.'
                    });
                } else {
                    throw new Error(result.error || 'Erro ao criar pagamento PIX');
                }
            } else {
                // Para outros métodos, usar preferência (redirecionamento)
                console.log('💳 Criando preferência para', selectedMethod);

                const result = await MercadoPagoService.createPreference(requestPayload);

                if (result.success) {
                    setPreference(result);
                    window.location.href = result.init_point;
                } else {
                    throw new Error(result.error || 'Erro ao processar pagamento');
                }
            }

        } catch (error) {
            console.error('Erro ao processar pagamento:', error);
            toast({
                variant: 'destructive',
                title: 'Erro ao processar pagamento',
                description: error.message
            });
        } finally {
            setProcessing(false);
        }
    };

    // Inicia polling para verificar status do pagamento
    const startPaymentPolling = (paymentId) => {
        console.log('🔄 Iniciando polling do pagamento:', paymentId);
        
        // Limpar interval anterior se existir
        if (pollingInterval) {
            clearInterval(pollingInterval);
        }

        // Verificar status a cada 3 segundos
        const intervalId = setInterval(async () => {
            try {
                const statusResult = await MercadoPagoService.checkPaymentStatus(paymentId);
                
                if (statusResult.success) {
                    console.log('📊 Status atual:', statusResult.status);
                    
                    if (statusResult.status === 'approved') {
                        console.log('✅ Pagamento aprovado!');
                        clearInterval(intervalId);
                        setPollingInterval(null);
                        
                        // Atualizar status no Supabase
                        await updateBookingPaymentStatus('confirmed');
                        
                        // Redirecionar para página de sucesso
                        navigate('/checkout/success', { 
                            state: { 
                                bookingId: booking.id,
                                paymentId: paymentId,
                                paymentStatus: 'approved'
                            } 
                        });
                        
                    } else if (statusResult.status === 'rejected' || statusResult.status === 'cancelled') {
                        console.log('❌ Pagamento rejeitado/cancelado');
                        clearInterval(intervalId);
                        setPollingInterval(null);
                        
                        toast({
                            variant: 'destructive',
                            title: 'Pagamento não aprovado',
                            description: 'O pagamento não foi concluído. Tente novamente.'
                        });
                    }
                }
            } catch (error) {
                console.error('Erro ao verificar status:', error);
            }
        }, 3000); // 3 segundos

        setPollingInterval(intervalId);
    };

    // Atualiza status do pagamento no booking
    const updateBookingPaymentStatus = async (status) => {
        try {
            // Atualizar apenas o status do booking para 'confirmed' quando o pagamento for aprovado
            const { error } = await supabase
                .from('bookings')
                .update({ 
                    status: 'confirmed'
                })
                .eq('id', booking.id);

            if (error) throw error;
            
            console.log('✅ Status do booking atualizado para confirmed');
        } catch (error) {
            console.error('Erro ao atualizar status do booking:', error);
        }
    };

    // Limpar interval ao desmontar componente
    useEffect(() => {
        return () => {
            if (pollingInterval) {
                clearInterval(pollingInterval);
            }
        };
    }, [pollingInterval]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2d8659] mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando...</p>
                </div>
            </div>
        );
    }

    if (!booking) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
            {/* Header com navegação */}
            <header className="bg-white shadow-sm sticky top-0 z-50">
                <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <Link to="/" className="flex items-center space-x-2">
                        <Heart className="w-8 h-8 text-[#2d8659]" />
                        <span className="text-2xl font-bold gradient-text">Doxologos</span>
                    </Link>
                    <Button 
                        variant="outline" 
                        className="border-[#2d8659] text-[#2d8659]"
                        onClick={() => navigate(-1)}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" /> 
                        Voltar
                    </Button>
                </nav>
            </header>

            <div className="max-w-4xl mx-auto py-8 px-4">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold mb-2">Finalizar Pagamento</h1>
                    <p className="text-gray-600">Complete seu agendamento</p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    {/* Métodos de Pagamento */}
                    <div className="md:col-span-2">
                        <Card className="p-6 mb-6">
                            <h2 className="text-xl font-bold mb-4 flex items-center">
                                <Lock className="w-5 h-5 mr-2 text-green-600" />
                                Escolha o método de pagamento
                            </h2>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {paymentMethods.map((method) => (
                                    <button
                                        key={method.id}
                                        onClick={() => setSelectedMethod(method.id)}
                                        disabled={!method.available || processing}
                                        className={`p-4 rounded-lg border-2 transition-all ${
                                            selectedMethod === method.id
                                                ? 'border-[#2d8659] bg-[#2d8659]/5'
                                                : 'border-gray-200 hover:border-[#2d8659]/50'
                                        } ${!method.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="text-[#2d8659]">{method.icon}</div>
                                            <div className="text-left">
                                                <p className="font-semibold">{method.name}</p>
                                                <p className="text-xs text-gray-600">{method.description}</p>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {selectedMethod === 'pix' && !preference && (
                                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <p className="text-sm text-blue-900">
                                        ✨ <strong>PIX é instantâneo!</strong> Após o pagamento, seu agendamento será confirmado automaticamente.
                                    </p>
                                </div>
                            )}

                            {selectedMethod === 'bank_transfer' && !preference && (
                                <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                    <p className="text-sm text-yellow-900">
                                        ⏱️ <strong>Atenção:</strong> O boleto pode levar até 2 dias úteis para compensar.
                                    </p>
                                </div>
                            )}
                        </Card>

                        {/* QR Code do PIX */}
                        {pixPayment && selectedMethod === 'pix' && (
                            <Card className="p-6">
                                <h3 className="text-lg font-bold mb-4 text-center">
                                    Pague com PIX
                                </h3>
                                
                                <div className="flex flex-col items-center">
                                    <div className="bg-white p-4 rounded-lg border-2 mb-4">
                                        <QRCodeSVG 
                                            value={pixPayment.qr_code}
                                            size={256}
                                            level="M"
                                        />
                                    </div>
                                    <p className="text-sm text-gray-600 text-center mb-4">
                                        Escaneie o QR Code com o app do seu banco
                                    </p>
                                    
                                    <div className="w-full bg-gray-50 p-4 rounded-lg">
                                        <p className="text-xs text-gray-600 mb-2">Ou copie o código PIX:</p>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={pixPayment.qr_code}
                                                readOnly
                                                className="flex-1 input text-xs font-mono"
                                            />
                                            <Button
                                                size="sm"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(pixPayment.qr_code);
                                                    toast({ title: 'Código copiado!' });
                                                }}
                                            >
                                                Copiar
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="mt-6 text-center">
                                        <div className="flex items-center justify-center gap-2 text-yellow-600 mb-2">
                                            <Clock className="w-5 h-5 animate-pulse" />
                                            <p className="font-semibold">Aguardando pagamento...</p>
                                        </div>
                                        <p className="text-sm text-gray-600">
                                            Verificando pagamento automaticamente...
                                        </p>
                                        <p className="text-xs text-gray-500 mt-2">
                                            O status será atualizado em alguns segundos após o pagamento
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        )}

                        {!pixPayment && !preference && (
                            <Button
                                onClick={handlePayment}
                                disabled={processing}
                                size="lg"
                                className="w-full bg-[#2d8659] hover:bg-[#236b47]"
                            >
                                {processing ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                        Processando...
                                    </>
                                ) : (
                                    <>
                                        Continuar para Pagamento
                                    </>
                                )}
                            </Button>
                        )}
                    </div>

                    {/* Resumo do Pedido */}
                    <div>
                        <Card className="p-6 sticky top-8">
                            <h3 className="text-lg font-bold mb-4">Resumo do Pedido</h3>

                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-gray-600">Serviço</p>
                                    <p className="font-semibold">{booking.service?.name}</p>
                                </div>

                                <div>
                                    <p className="text-sm text-gray-600">Profissional</p>
                                    <p className="font-semibold">{booking.professional?.name}</p>
                                </div>

                                <div>
                                    <p className="text-sm text-gray-600">Data e Horário</p>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-gray-400" />
                                        <p className="font-semibold">
                                            {new Date(booking.booking_date).toLocaleDateString('pt-BR')}
                                        </p>
                                    </div>
                                    <p className="text-sm">{booking.booking_time}</p>
                                </div>

                                <div className="border-t pt-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="text-gray-600">Subtotal</p>
                                        <p className="font-semibold">
                                            {MercadoPagoService.formatCurrency(booking.valor_consulta || booking.service?.price)}
                                        </p>
                                    </div>
                                    <div className="flex justify-between items-center text-lg font-bold">
                                        <p>Total</p>
                                        <p className="text-[#2d8659]">
                                            {MercadoPagoService.formatCurrency(booking.valor_consulta || booking.service?.price)}
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                    <div className="flex items-start gap-2">
                                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                        <div className="text-sm text-green-900">
                                            <p className="font-semibold mb-1">Pagamento Seguro</p>
                                            <p className="text-xs">
                                                Seus dados são protegidos pelo Mercado Pago, líder em segurança digital na América Latina.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckoutPage;
