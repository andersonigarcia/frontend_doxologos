import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CreditCard, Lock, CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import MercadoPagoService from '@/lib/mercadoPagoService';

const CheckoutDirectPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    
    const bookingId = searchParams.get('booking_id');
    const type = searchParams.get('type');
    const inscricaoId = searchParams.get('inscricao_id');
    
    const [booking, setBooking] = useState(null);
    const [inscricao, setInscricao] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    
    // Estado do formulário
    const [cardNumber, setCardNumber] = useState('');
    const [cardholderName, setCardholderName] = useState('');
    const [expirationDate, setExpirationDate] = useState('');
    const [securityCode, setSecurityCode] = useState('');
    const [installments, setInstallments] = useState(1);
    const [docType, setDocType] = useState('CPF');
    const [docNumber, setDocNumber] = useState('');
    
    // Mercado Pago
    const [mp, setMp] = useState(null);
    const [cardForm, setCardForm] = useState(null);

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
        } else if (bookingId) {
            fetchBooking();
        }
    }, [bookingId, inscricaoId, type]);

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
        return formatted.substring(0, 19); // 16 dígitos + 3 espaços
    };

    const formatExpirationDate = (value) => {
        const cleaned = value.replace(/\D/g, '');
        if (cleaned.length >= 2) {
            return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
        }
        return cleaned;
    };

    const formatCPF = (value) => {
        const cleaned = value.replace(/\D/g, '');
        if (cleaned.length <= 11) {
            return cleaned
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d{1,2})/, '$1-$2')
                .replace(/(-\d{2})\d+?$/, '$1');
        }
        return cleaned.substring(0, 11);
    };

    const handleCardNumberChange = (e) => {
        setCardNumber(formatCardNumber(e.target.value));
    };

    const handleExpirationChange = (e) => {
        setExpirationDate(formatExpirationDate(e.target.value));
    };

    const handleDocNumberChange = (e) => {
        setDocNumber(formatCPF(e.target.value));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
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
            // Validações básicas
            if (!cardNumber || !cardholderName || !expirationDate || !securityCode || !docNumber) {
                throw new Error('Preencha todos os campos do cartão');
            }

            // Obter valor do pagamento
            let amount = 0;
            if (type === 'evento') {
                amount = inscricao?.evento?.valor || parseFloat(valorParam) || 0;
            } else {
                amount = booking?.valor_consulta || booking?.services?.price || parseFloat(valorParam) || 0;
            }

            // Validar valor
            if (!amount || amount <= 0) {
                throw new Error('Valor do pagamento inválido. Por favor, retorne à página anterior.');
            }

            // Garantir que é número com 2 casas decimais
            amount = parseFloat(amount.toFixed(2));

            console.log('💰 Valor do pagamento:', amount);

            const email = type === 'evento'
                ? inscricao?.patient_email
                : booking?.patient_email;
            
            if (!email) {
                throw new Error('Email não encontrado. Por favor, retorne à página anterior.');
            }

            // Criar token do cartão
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

            // Enviar para Edge Function processar pagamento
            const paymentData = {
                token: token.id,
                amount: amount,
                installments: parseInt(installments),
                description: type === 'evento' 
                    ? `Evento - ${inscricao?.evento?.titulo}`
                    : `Consulta - ${booking?.services?.name}`,
                payer: {
                    email: email,
                    identification: {
                        type: docType,
                        number: docNumber.replace(/\D/g, '')
                    }
                },
                booking_id: bookingId,
                inscricao_id: inscricaoId
            };

            console.log('💳 Processando pagamento...');

            const result = await MercadoPagoService.processCardPayment(paymentData);

            if (result.success) {
                console.log('✅ Pagamento aprovado!');
                toast({
                    title: 'Pagamento aprovado!',
                    description: 'Seu pagamento foi processado com sucesso.'
                });
                
                // Redirecionar para página de sucesso
                const referenceId = bookingId || inscricaoId;
                const referenceType = type || 'booking';
                navigate(`/checkout/success?external_reference=${referenceId}&type=${referenceType}`);
            } else {
                throw new Error(result.error || 'Erro ao processar pagamento');
            }

        } catch (error) {
            console.error('Erro no pagamento:', error);
            toast({
                variant: 'destructive',
                title: 'Erro no pagamento',
                description: error.message || 'Não foi possível processar o pagamento'
            });
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2d8659]"></div>
            </div>
        );
    }

    // Calcular total para exibição
    let total = 0;
    if (type === 'evento') {
        total = inscricao?.evento?.valor || parseFloat(valorParam) || 0;
    } else {
        total = booking?.valor_consulta || booking?.services?.price || parseFloat(valorParam) || 0;
    }

    // Se ainda for 0, tentar pegar do parâmetro
    if (total === 0 && valorParam) {
        total = parseFloat(valorParam);
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4">
                {/* Header */}
                <div className="mb-6">
                    <Button
                        variant="outline"
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

                                {/* CPF */}
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        CPF do Titular
                                    </label>
                                    <input
                                        type="text"
                                        value={docNumber}
                                        onChange={handleDocNumberChange}
                                        placeholder="000.000.000-00"
                                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent"
                                        maxLength="14"
                                        required
                                    />
                                </div>

                                {/* Parcelas */}
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Parcelas
                                    </label>
                                    <select
                                        value={installments}
                                        onChange={(e) => setInstallments(e.target.value)}
                                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent"
                                    >
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                                            <option key={n} value={n}>
                                                {n}x de {MercadoPagoService.formatCurrency(total / n)}
                                                {n === 1 ? ' sem juros' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full bg-[#2d8659] hover:bg-[#236b47] py-6 text-lg"
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
