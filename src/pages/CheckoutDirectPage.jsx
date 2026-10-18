import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { CreditCard, Lock, CheckCircle, ArrowLeft, Smartphone, AlertTriangle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import MercadoPagoService from '@/lib/mercadoPagoService';
import { paymentOrchestrator } from '@/lib/payment';
import { logger } from '@/lib/logger';
import analytics from '@/lib/analytics';

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
    const checkoutTrackedRef = useRef(false);

    const checkoutTotal = type === 'evento'
        ? Number(inscricao?.evento?.valor || parseFloat(valorParam) || 0)
        : packageId
            ? Number(packageData?.gross_amount || parseFloat(valorParam) || 0)
            : Number(booking?.valor_consulta || booking?.services?.price || valorParam || 0);

    useEffect(() => {
        if (!checkoutTrackedRef.current && (booking || packageData || inscricao)) {
            checkoutTrackedRef.current = true;
            try {
                analytics.trackEvent('checkout_start', {
                    event_category: 'Checkout',
                    booking_id: bookingId || inscricaoId || packageId || null,
                    checkout_type: type || (packageId ? 'package' : 'booking'),
                    payment_method: 'credit_card',
                    value: checkoutTotal || undefined
                });
                analytics.trackEvent('begin_checkout', {
                    event_category: 'Ecommerce',
                    value: checkoutTotal || undefined,
                    currency: 'BRL',
                    items: [{
                        item_id: bookingId || inscricaoId || packageId || 'consulta',
                        item_name: type === 'evento' ? (inscricao?.evento?.titulo || 'Inscrição em Evento') : (packageId ? 'Pacote de Consultas' : 'Consulta Psicológica'),
                        price: checkoutTotal || undefined,
                        quantity: 1
                    }]
                });
                analytics.trackFunnelStep('booking', 5, {
                    step_name: 'checkout_start',
                    booking_id: bookingId || inscricaoId || packageId || null,
                    value: checkoutTotal || undefined
                });
            } catch (err) {
                console.warn('CheckoutDirectPage.analytics error:', err);
            }
        }
    }, [booking, packageData, inscricao, checkoutTotal, bookingId, inscricaoId, packageId, type]);

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

    // Detecção dinâmica de bandeira e resiliência
    const [cardBrand, setCardBrand] = useState(null);
    const [paymentError, setPaymentError] = useState(null);
    const lastBinRef = useRef('');

    // Reserva prioritária de horário (15 minutos para evitar perda de vaga)
    const [remainingSeconds, setRemainingSeconds] = useState(15 * 60);

    useEffect(() => {
        const itemCreatedAt = booking?.created_at || inscricao?.created_at || packageData?.created_at;
        if (itemCreatedAt) {
            const createdMs = new Date(itemCreatedAt).getTime();
            const elapsedSec = Math.floor((Date.now() - createdMs) / 1000);
            const reservationWindowSec = 15 * 60;
            const left = reservationWindowSec - elapsedSec;
            setRemainingSeconds(left > 0 ? left : 300);
        }
    }, [booking, inscricao, packageData]);

    useEffect(() => {
        if (remainingSeconds <= 0) return;
        const interval = setInterval(() => {
            setRemainingSeconds((prev) => (prev > 1 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(interval);
    }, [remainingSeconds]);

    const formatTimer = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Telemetria oficial antifraude do Mercado Pago
    useEffect(() => {
        const existingSecurityScript = document.querySelector('script[src*="mercadopago.com/v2/security.js"]');
        if (!existingSecurityScript) {
            const secScript = document.createElement('script');
            secScript.src = 'https://www.mercadopago.com/v2/security.js';
            secScript.setAttribute('view', 'checkout');
            secScript.async = true;
            document.body.appendChild(secScript);
        }
    }, []);

    const getPixCheckoutUrl = () => {
        const params = new URLSearchParams();
        if (bookingId) params.set('booking_id', bookingId);
        if (type) params.set('type', type);
        if (inscricaoId) params.set('inscricao_id', inscricaoId);
        if (packageId) params.set('package_id', packageId);
        if (valorParam) params.set('valor', valorParam);
        if (tituloParam) params.set('titulo', tituloParam);
        if (payerEmail) params.set('email', payerEmail);
        return `/checkout?${params.toString()}`;
    };

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
        // Inicializar Mercado Pago (carrega dinamicamente o SDK sob demanda se necessário)
        const initMP = () => {
            try {
                if (window.MercadoPago) {
                    const publicKey = import.meta.env.VITE_MP_PUBLIC_KEY || 'APP_USR-398a9c5c-782e-4b5a-a666-2d667e860173';
                    const mercadopago = new window.MercadoPago(publicKey, {
                        locale: 'pt-BR'
                    });
                    setMp(mercadopago);
                    console.log('✅ Mercado Pago SDK inicializado');
                }
            } catch (err) {
                console.error('❌ Erro ao inicializar Mercado Pago:', err);
                toast({
                    variant: 'destructive',
                    title: 'Erro',
                    description: 'Não foi possível inicializar o sistema de pagamento.'
                });
            }
        };

        if (window.MercadoPago) {
            initMP();
        } else {
            const script = document.createElement('script');
            script.src = 'https://sdk.mercadopago.com/js/v2';
            script.async = true;
            script.onload = () => {
                initMP();
            };
            script.onerror = () => {
                console.error('❌ Mercado Pago SDK não carregado');
                toast({
                    variant: 'destructive',
                    title: 'Erro',
                    description: 'Não foi possível carregar o sistema de pagamento.'
                });
            };
            document.body.appendChild(script);
        }
    }, [toast]);

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

    const handleCardNumberChange = async (e) => {
        const formatted = formatCardNumber(e.target.value);
        setCardNumber(formatted);
        if (paymentError) setPaymentError(null);

        const clean = formatted.replace(/\D/g, '');
        if (clean.length >= 6 && mp) {
            const bin = clean.substring(0, 6);
            if (bin !== lastBinRef.current) {
                lastBinRef.current = bin;
                try {
                    const response = await mp.getPaymentMethods({ bin });
                    if (response && response.results && response.results.length > 0) {
                        const method = response.results[0];
                        setCardBrand({
                            id: method.id,
                            name: method.name,
                            thumbnail: method.secure_thumbnail || method.thumbnail
                        });
                    }
                } catch (binErr) {
                    console.warn('Erro ao detectar bandeira pelo BIN:', binErr);
                }
            }
        } else if (clean.length < 6) {
            lastBinRef.current = '';
            setCardBrand(null);
        }
    };

    const handleExpirationChange = (e) => {
        setExpirationDate(formatExpirationDate(e.target.value));
        if (paymentError) setPaymentError(null);
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
        setPaymentError(null);

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

            if (import.meta.env.DEV) console.log('🔵 Criando token do cartão...');
            const token = await mp.createCardToken(cardData);

            if (!token || !token.id) {
                throw new Error('Erro ao processar dados do cartão');
            }

            if (import.meta.env.DEV) console.log('✅ Token criado com sucesso');

            // Resolução precisa da bandeira do cartão (Visa, Elo, Mastercard, Hipercard, Amex, etc.)
            let paymentMethodId = cardBrand?.id || token.payment_method_id;
            if (!paymentMethodId && cardNumber.replace(/\D/g, '').length >= 6 && mp) {
                try {
                    const bin = cardNumber.replace(/\D/g, '').substring(0, 6);
                    const binRes = await mp.getPaymentMethods({ bin });
                    if (binRes?.results?.[0]?.id) {
                        paymentMethodId = binRes.results[0].id;
                    }
                } catch (err) {
                    console.warn('Fallback BIN error:', err);
                }
            }

            // Telemetria do dispositivo (Device Session ID gerado pelo security.js do MP)
            const deviceId = window.MP_DEVICE_SESSION_ID || null;

            // Estruturar dados do pagador com nome dividido e telefone para mitigar risco antifraude
            const nameParts = (cardholderName || booking?.patient_name || packageData?.patient_name || 'Paciente').trim().split(/\s+/);
            const firstName = nameParts[0] || 'Paciente';
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Doxologos';

            const rawPhone = booking?.patient_phone || inscricao?.patient_phone || packageData?.patient_phone || '';
            const cleanPhone = (rawPhone || '').replace(/\D/g, '');
            let phoneObj = undefined;
            if (cleanPhone.length >= 10) {
                phoneObj = {
                    area_code: cleanPhone.substring(0, 2),
                    number: cleanPhone.substring(2)
                };
            }

            const paymentData = {
                token: token.id,
                payment_method_id: paymentMethodId || 'master',
                amount: amount,
                installments: parseInt(installments),
                description: type === 'evento'
                    ? `Evento - ${inscricao?.evento?.titulo}`
                    : packageId
                        ? `Pacote de Consultas (${packageData?.total_sessions || ''} sessões)`
                        : `Consulta - ${booking?.services?.name}`,
                payer: {
                    email,
                    first_name: firstName,
                    last_name: lastName,
                    phone: phoneObj,
                    identification: {
                        type: docType,
                        number: docNumber.replace(/\D/g, '')
                    }
                },
                device_id: deviceId,
                booking_id: bookingId || null,
                inscricao_id: inscricaoId || null,
                package_id: packageId || null,
                paymentMethod: 'credit_card'
            };

            console.log('💳 Processando pagamento com método:', paymentData.payment_method_id);

            const getRejectionTitle = (msg) => {
                const lower = (msg || '').toLowerCase();
                if (lower.includes('banco') || lower.includes('segurança') || lower.includes('autoriz') || lower.includes('recusad')) {
                    return 'Não autorizado pelo seu banco';
                }
                return 'Não foi possível concluir no cartão';
            };

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
                        const errorMsg = err.message || 'Não foi possível processar o pagamento com cartão.';
                        setPaymentError(errorMsg);
                        toast({
                            variant: 'destructive',
                            title: getRejectionTitle(errorMsg),
                            description: errorMsg
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

                            try {
                                analytics.trackBookingCompleted(
                                    bookingId || packageId,
                                    booking?.professional_id || packageData?.professional_id,
                                    booking?.service_id || 'consulta',
                                    checkoutTotal,
                                    'credit_card'
                                );
                            } catch (trackErr) {
                                console.warn('CheckoutDirectPage.analytics completion error', trackErr);
                            }

                            if (type === 'evento') {
                                navigate(`/checkout/success?type=evento&inscricao_id=${inscricaoId}`);
                            } else if (packageId) {
                                navigate(`/checkout/success?package_id=${packageId}`);
                            } else {
                                navigate(`/checkout/success?booking_id=${bookingId}`);
                            }
                        } else if (statusUpdate.status === 'rejected') {
                            const friendlyMsg = paymentOrchestrator.getErrorMessage(statusUpdate);
                            setPaymentError(friendlyMsg);
                            toast({
                                variant: 'destructive',
                                title: getRejectionTitle(friendlyMsg),
                                description: friendlyMsg
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
            const errorMsg = error.message || 'Ocorreu um erro ao processar o pagamento.';
            setPaymentError(errorMsg);
            const lower = (errorMsg || '').toLowerCase();
            const isBankDecline = lower.includes('banco') || lower.includes('segurança') || lower.includes('autoriz') || lower.includes('recusad');
            toast({
                variant: 'destructive',
                title: isBankDecline ? 'Não autorizado pelo seu banco' : 'Não foi possível concluir no cartão',
                description: errorMsg
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

                {/* Banner de Reserva Prioritária de Horário */}
                {remainingSeconds > 0 ? (
                    <div className="mb-6 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs sm:text-sm text-emerald-950 shadow-xs">
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-emerald-700 animate-pulse flex-shrink-0" />
                            <span>Sua vaga está <strong>100% reservada</strong> para conclusão do seu pagamento:</span>
                        </div>
                        <span className="font-mono font-bold text-emerald-800 bg-white px-2.5 py-1 rounded-md border border-emerald-200 shadow-xs">
                            {formatTimer(remainingSeconds)}
                        </span>
                    </div>
                ) : (
                    <div className="mb-6 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs sm:text-sm text-amber-950 shadow-xs">
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-700 flex-shrink-0" />
                            <span>Tempo de reserva prioritária expirando. Conclua seu pagamento agora para garantir seu horário.</span>
                        </div>
                    </div>
                )}

                <div className="grid md:grid-cols-3 gap-6">
                    {/* Formulário */}
                    <div className="md:col-span-2 space-y-4">
                        {paymentError && (
                            <div className="p-5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-xl shadow-sm space-y-4">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1 text-sm space-y-1">
                                        <p className="font-bold text-amber-950 text-base">Seu banco não autorizou a tentativa no cartão</p>
                                        <p className="text-amber-900 leading-relaxed">{paymentError}</p>
                                        <p className="text-xs text-amber-800 pt-1">
                                            A plataforma Doxologos está funcionando perfeitamente. Esta recusa é uma restrição do banco emissor do cartão por motivos de segurança do próprio banco para compras online.
                                        </p>
                                    </div>
                                </div>
                                <div className="p-4 bg-white/95 rounded-xl border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="text-center sm:text-left">
                                        <div className="flex items-center gap-2 justify-center sm:justify-start">
                                            <span className="font-bold text-gray-900 text-sm">Sua vaga continua reservada!</span>
                                            <span className="font-mono font-bold text-xs bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-200">
                                                {formatTimer(remainingSeconds)}
                                            </span>
                                        </div>
                                        <span className="text-xs text-gray-600 block mt-1">
                                            Pague agora via PIX com aprovação instantânea e garanta seu atendimento sem depender de liberação bancária do cartão.
                                        </span>
                                    </div>
                                    <Button
                                        type="button"
                                        onClick={() => navigate(getPixCheckoutUrl())}
                                        className="w-full sm:w-auto bg-[#2d8659] hover:bg-[#236b47] text-white font-semibold shadow-sm flex items-center justify-center gap-2 px-5 py-2.5 text-sm flex-shrink-0"
                                    >
                                        <Smartphone className="w-4 h-4" />
                                        Pagar com PIX Agora
                                    </Button>
                                </div>
                            </div>
                        )}

                        <Card className="p-6">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Número do Cartão */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-medium">
                                            Número do Cartão
                                        </label>
                                        {cardBrand && (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                {cardBrand.thumbnail && (
                                                    <img src={cardBrand.thumbnail} alt={cardBrand.name} className="h-3.5 object-contain" />
                                                )}
                                                {cardBrand.name}
                                            </span>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={cardNumber}
                                            onChange={handleCardNumberChange}
                                            placeholder="0000 0000 0000 0000"
                                            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent font-mono tracking-wider"
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

                            <div className="mt-4 pt-4 border-t text-center">
                                <p className="text-xs text-gray-500 mb-2">Prefere aprovação instantânea via PIX?</p>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => navigate(getPixCheckoutUrl())}
                                    className="w-full text-xs text-[#2d8659] border-[#2d8659]/30 hover:bg-[#2d8659]/10 flex items-center justify-center gap-1.5"
                                >
                                    <Smartphone className="w-3.5 h-3.5" />
                                    Pagar com PIX
                                </Button>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckoutDirectPage;
