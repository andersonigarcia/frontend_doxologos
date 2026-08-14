import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { CreditCard, Lock, CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import MercadoPagoService from '@/lib/mercadoPagoService';
import { paymentOrchestrator } from '@/lib/payment';
import { logger } from '@/lib/logger';

const CheckoutDirectPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();

    const bookingId = searchParams.get('booking_id');
    const type = searchParams.get('type');
    const inscricaoId = searchParams.get('inscricao_id');
    const packageId = searchParams.get('package_id') || location.state?.packageId;
    const emailParam = searchParams.get('email');
    const valorParam = searchParams.get('valor');
    const tituloParam = searchParams.get('titulo');

    const [booking, setBooking] = useState(null);
    const [inscricao, setInscricao] = useState(null);
    const [packageData, setPackageData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [stopMonitoring, setStopMonitoring] = useState(null);

    // Estado do formulário
    const [cardNumber, setCardNumber] = useState('');
    const [cardholderName, setCardholderName] = useState('');
    const [expirationDate, setExpirationDate] = useState('');
    const [securityCode, setSecurityCode] = useState('');
    const [installments, setInstallments] = useState(1);
    const [docType, setDocType] = useState('CPF');
    const [docNumber, setDocNumber] = useState('');
    const [payerEmail, setPayerEmail] = useState('');
    const [acceptedTcle, setAcceptedTcle] = useState(false);

    // Mercado Pago
    const [mp, setMp] = useState(null);

    useEffect(() => {
        return () => {
            if (stopMonitoring) stopMonitoring();
        };
    }, [stopMonitoring]);

    useEffect(() => {
        if (emailParam && !payerEmail) {
            setPayerEmail(emailParam);
        }
    }, [emailParam, payerEmail]);

    useEffect(() => {
        // Inicializar Mercado Pago
        if (window.MercadoPago) {
            const mercadopago = new window.MercadoPago('APP_USR-4fdd0ea3-c204-438a-9eea-4f503bca869d', {
                locale: 'pt-BR'
            });
            setMp(mercadopago);
            console.log('✅ Mercado Pago SDK inicializado');
        } else {
            console.error('❌ Mercado Pago SDK não carregado');
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível carregar o sistema de pagamento.'
            });
        }
    }, []);

    useEffect(() => {
        if (type === 'evento' && inscricaoId) {
            fetchInscricao();
        } else if (packageId) {
            fetchPackage();
        } else if (bookingId) {
            fetchBooking();
        } else {
            setLoading(false);
        }
    }, [bookingId, inscricaoId, packageId, type]);

    const fetchPackage = async () => {
        try {
            if (location.state?.packageId) {
                setPackageData({
                    id: location.state.packageId,
                    gross_amount: location.state.totalAmount,
                    patient_name: location.state.patientName,
                    patient_email: location.state.patientEmail,
                    total_sessions: location.state.sessionCount,
                    service_name: location.state.serviceName,
                    professional_name: location.state.professionalName
                });
                setCardholderName(location.state.patientName || '');
                setPayerEmail((current) => current || location.state.patientEmail || '');
            } else {
                const { data, error } = await supabase
                    .from('packages')
                    .select('*, professionals:professional_id(name)')
                    .eq('id', packageId)
                    .single();

                if (error) throw error;

                setPackageData(data);
                setCardholderName(data.patient_name || '');
                setDocNumber(data.patient_cpf || '');
                setPayerEmail((current) => current || data.patient_email || '');
            }
        } catch (error) {
            console.error('Erro ao carregar pacote:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível carregar os dados do pacote'
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchBooking = async () => {
        try {
            const { data, error } = await supabase
                .from('bookings')
                .select('*, services:service_id(*)')
                .eq('id', bookingId)
                .single();

            if (error) throw error;

            setBooking(data);
            setCardholderName(data.patient_name || '');
            setDocNumber(data.patient_cpf || '');
            setPayerEmail((current) => current || data.patient_email || '');
        } catch (error) {
            console.error('Erro ao carregar booking:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível carregar os dados do agendamento'
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchInscricao = async () => {
        try {
            const { data, error } = await supabase
                .from('inscricoes_eventos')
                .select('*, evento:eventos(*)')
                .eq('id', inscricaoId)
                .single();

            if (error) throw error;

            setInscricao(data);
            setCardholderName(data.patient_name || '');
            setDocNumber(data.patient_cpf || '');
            setPayerEmail((current) => current || data.patient_email || '');
        } catch (error) {
            console.error('Erro ao carregar inscrição:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível carregar os dados da inscrição'
            });
        } finally {
            setLoading(false);
        }
    };

    const formatCardNumber = (value) => {
        const cleaned = value.replace(/\D/g, '');
        const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
        return formatted.substring(0, 19);
    };

    const formatExpirationDate = (value) => {
        const cleaned = value.replace(/\D/g, '');
        if (cleaned.length >= 2) {
            return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
        }
        return cleaned;
    };

    const handleCardNumberChange = (e) => {
        setCardNumber(formatCardNumber(e.target.value));
    };

    const handleExpirationChange = (e) => {
        setExpirationDate(formatExpirationDate(e.target.value));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!acceptedTcle) {
            toast({
                variant: 'destructive',
                title: 'Aceite do TCLE é Obrigatório',
                description: 'De acordo com a Resolução CFP nº 11/2018, você deve aceitar os Termos e o TCLE antes de finalizar o pagamento.'
            });
            return;
        }

        if (!mp) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Sistema de pagamento não inicializado'
            });
            return;
        }

        setProcessing(true);

        try {
            if (!cardNumber || !cardholderName || !expirationDate || !securityCode || !docNumber) {
                throw new Error('Preencha todos os campos do cartão');
            }

            let amount = 0;
            if (type === 'evento') {
                amount = inscricao?.evento?.valor || parseFloat(valorParam) || 0;
            } else if (packageId) {
                amount = packageData?.gross_amount || parseFloat(valorParam) || 0;
            } else {
                amount = booking?.valor_consulta || booking?.services?.price || parseFloat(valorParam) || 0;
            }

            if (!amount || amount <= 0) {
                throw new Error('Valor do pagamento inválido. Por favor, retorne à página anterior.');
            }

            amount = parseFloat(amount.toFixed(2));
            console.log('💰 Valor do pagamento:', amount);

            const email = payerEmail?.trim().toLowerCase();

            if (!email) {
                throw new Error('Informe um e-mail válido para continuar.');
            }

            const [month, year] = expirationDate.split('/');
            const cardData = {
                cardNumber: cardNumber.replace(/\s/g, ''),
                cardholderName: cardholderName,
                cardExpirationMonth: month,
                cardExpirationYear: '20' + year,
                securityCode: securityCode,
                identificationType: docType,
                identificationNumber: docNumber.replace(/\D/g, '')
            };

            console.log('🔵 Criando token do cartão...');
            const token = await mp.createCardToken(cardData);

            if (!token || !token.id) {
                throw new Error('Erro ao processar dados do cartão');
            }

            console.log('✅ Token criado:', token.id);

            const paymentData = {
                token: token.id,
                payment_method_id: token.payment_method_id,
                amount: amount,
                installments: parseInt(installments),
                description: type === 'evento'
                    ? `Evento - ${inscricao?.evento?.titulo}`
                    : packageId
                        ? `Pacote de Consultas (${packageData?.total_sessions || ''} sessões)`
                        : `Consulta - ${booking?.services?.name}`,
                payer: {
                    email,
                    identification: {
                        type: docType,
                        number: docNumber.replace(/\D/g, '')
                    }
                },
                booking_id: bookingId || null,
                inscricao_id: inscricaoId || null,
                package_id: packageId || null,
                paymentMethod: 'credit_card'
            };

            console.log('💳 Processando pagamento...');

            const result = await paymentOrchestrator.processPayment(
                'credit_card',
                paymentData,
                {
                    onSuccess: (res) => {
                        console.log('✅ Pagamento iniciado via Orquestrador:', res);
                        toast({
                            title: 'Processando...',
                            description: 'Aguardando confirmação do banco.'
                        });
                    },
                    onError: (err) => {
                        console.error('❌ Erro no orquestrador:', err);
                        toast({
                            variant: 'destructive',
                            title: 'Erro no pagamento',
                            description: err.message || 'Não foi possível processar.'
                        });
                        setProcessing(false);
                        if (stopMonitoring) stopMonitoring();
                    },
                    onStatusChange: (statusUpdate) => {
                        console.log('🔄 Status atualizado:', statusUpdate);

                        if (statusUpdate.status === 'approved' || statusUpdate.status === 'authorized') {
                            toast({
                                title: 'Pagamento Aprovado! 🎉',
                                description: 'Seu pagamento foi confirmado com sucesso.'
                            });
                            setProcessing(false);

                            if (type === 'evento') {
                                navigate(`/checkout-success?type=evento&inscricao_id=${inscricaoId}`);
                            } else if (packageId) {
                                navigate(`/checkout-success?package_id=${packageId}`);
                            } else {
                                navigate(`/checkout-success?booking_id=${bookingId}`);
                            }
                        } else if (statusUpdate.status === 'rejected') {
                            toast({
                                variant: 'destructive',
                                title: 'Pagamento Recusado ❌',
                                description: statusUpdate.status_detail || 'Não foi possível autorizar a transação.'
                            });
                            setProcessing(false);
                        }
                    }
                }
            );

            if (result && result.stopMonitoring) {
                setStopMonitoring(() => result.stopMonitoring);
            }

        } catch (error) {
            console.error('❌ Erro no checkout:', error);
            toast({
                variant: 'destructive',
                title: 'Erro no pagamento',
                description: error.message || 'Ocorreu um erro ao processar o pagamento.'
            });
            setProcessing(false);
        }
    };

    let total = 0;
    if (type === 'evento') {
        total = inscricao?.evento?.valor || parseFloat(valorParam) || 0;
    } else if (packageId) {
        total = packageData?.gross_amount || parseFloat(valorParam) || 0;
    } else {
        total = booking?.valor_consulta || booking?.services?.price || parseFloat(valorParam) || 0;
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2d8659]"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                    <Button
                        variant="ghost"
                        onClick={() => navigate(-1)}
                        className="mb-4"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Voltar
                    </Button>
                    <h1 className="text-3xl font-bold mb-2">Pagamento com Cartão</h1>
                    <p className="text-gray-600">Preencha os dados do seu cartão de crédito</p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    {/* Formulário */}
                    <div className="md:col-span-2">
                        <Card className="p-6">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Número do Cartão */}
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Número do Cartão
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={cardNumber}
                                            onChange={handleCardNumberChange}
                                            placeholder="0000 0000 0000 0000"
                                            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent"
                                            maxLength="19"
                                            required
                                        />
                                        <CreditCard className="absolute right-3 top-3 text-gray-400" />
                                    </div>
                                </div>

                                {/* Nome no Cartão */}
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Nome no Cartão
                                    </label>
                                    <input
                                        type="text"
                                        value={cardholderName}
                                        onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
                                        placeholder="NOME COMPLETO"
                                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent"
                                        required
                                    />
                                </div>

                                {/* Validade e CVV */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            Validade
                                        </label>
                                        <input
                                            type="text"
                                            value={expirationDate}
                                            onChange={handleExpirationChange}
                                            placeholder="MM/AA"
                                            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent"
                                            maxLength="5"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            CVV
                                        </label>
                                        <input
                                            type="text"
                                            value={securityCode}
                                            onChange={(e) => setSecurityCode(e.target.value.replace(/\D/g, ''))}
                                            placeholder="123"
                                            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent"
                                            maxLength="4"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* CPF e Email */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            CPF do Titular
                                        </label>
                                        <input
                                            type="text"
                                            value={docNumber}
                                            onChange={(e) => setDocNumber(e.target.value)}
                                            placeholder="000.000.000-00"
                                            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            E-mail
                                        </label>
                                        <input
                                            type="email"
                                            value={payerEmail}
                                            onChange={(e) => setPayerEmail(e.target.value)}
                                            placeholder="seu@email.com"
                                            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Parcelas */}
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Parcelamento
                                    </label>
                                    <select
                                        value={installments}
                                        onChange={(e) => setInstallments(e.target.value)}
                                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent bg-white"
                                    >
                                        <option value="1">1x de {MercadoPagoService.formatCurrency(total)} à vista</option>
                                        {total >= 100 && <option value="2">2x de {MercadoPagoService.formatCurrency(total / 2)}</option>}
                                        {total >= 150 && <option value="3">3x de {MercadoPagoService.formatCurrency(total / 3)}</option>}
                                    </select>
                                </div>

                                {/* Checkbox TCLE / Política de Cancelamento (CFP Resolução 11/2018) */}
                                <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200/80 my-4">
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={acceptedTcle}
                                            onChange={(e) => setAcceptedTcle(e.target.checked)}
                                            className="mt-1 h-4 w-4 rounded border-amber-300 text-[#2d8659] focus:ring-[#2d8659]"
                                        />
                                        <span className="text-xs text-amber-900 leading-relaxed">
                                            Li e concordo com o <strong>Termo de Consentimento Livre e Esclarecido (TCLE) de Atendimento Psicológico Online</strong> (Resolução CFP nº 11/2018) e com a <strong>Política de Cancelamento e Reagendamento</strong> (com até 24h de antecedência). Entendo que meus dados clínicos e de atendimento estão protegidos por sigilo profissional e pela LGPD.{' '}
                                            <Link to="/termos-e-condicoes" target="_blank" className="underline font-semibold hover:text-[#2d8659]">
                                                Ver termos completos
                                            </Link>
                                        </span>
                                    </label>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={processing || !acceptedTcle}
                                    className="w-full bg-[#2d8659] hover:bg-[#236b47] py-6 text-lg disabled:opacity-50"
                                >
                                    {processing ? (
                                        'Processando...'
                                    ) : (
                                        <>
                                            <Lock className="w-5 h-5 mr-2" />
                                            Pagar {MercadoPagoService.formatCurrency(total)}
                                        </>
                                    )}
                                </Button>
                            </form>
                        </Card>
                    </div>

                    {/* Resumo */}
                    <div className="md:col-span-1">
                        <Card className="p-6 sticky top-6">
                            <h3 className="font-bold text-lg mb-4">Resumo do Pedido</h3>

                            {type === 'evento' && inscricao && (
                                <div className="space-y-3 mb-4">
                                    <p className="text-sm text-gray-600">Evento</p>
                                    <p className="font-semibold">{inscricao.evento?.titulo}</p>
                                </div>
                            )}

                            {packageData && (
                                <div className="space-y-3 mb-4">
                                    <p className="text-sm text-gray-600 font-medium">Pacote de Consultas</p>
                                    <p className="font-semibold text-gray-900">{packageData.service_name || 'Psicoterapia'}</p>
                                    <p className="text-xs text-[#2d8659] font-bold">{packageData.total_sessions} Sessões Agendadas</p>
                                </div>
                            )}

                            {booking && (
                                <div className="space-y-3 mb-4">
                                    <p className="text-sm text-gray-600">Serviço</p>
                                    <p className="font-semibold">{booking.services?.name}</p>
                                </div>
                            )}

                            <div className="border-t pt-4">
                                <div className="flex justify-between items-center text-lg font-bold">
                                    <p>Total</p>
                                    <p className="text-[#2d8659]">
                                        {MercadoPagoService.formatCurrency(total)}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-3">
                                <div className="flex items-start gap-2">
                                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm text-green-900">
                                        <p className="font-semibold mb-1">Pagamento Seguro</p>
                                        <p className="text-xs">
                                            Seus dados são protegidos com criptografia de ponta a ponta.
                                        </p>
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

export default CheckoutDirectPage;
