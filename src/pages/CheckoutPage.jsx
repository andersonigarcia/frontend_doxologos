import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { CreditCard, Smartphone, Barcode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import MercadoPagoService from '@/lib/mercadoPagoService';
import { logger } from '@/lib/logger.js';
import { isFeatureEnabled } from '@/lib/paymentFeatureFlags';
import ExistingPaymentModal from '@/components/payment/ExistingPaymentModal';
import { paymentOrchestrator } from '@/lib/payment';
import analytics from '@/lib/analytics';
import {
    CheckoutHeader,
    CheckoutMobileMiniSummary,
    CheckoutOrderSummary,
    CheckoutWalletCard,
    CheckoutPayerEmailCard,
    CheckoutPaymentMethodSelector,
    CheckoutPixDisplay,
    CheckoutTcleCard,
    CheckoutStickyCtaMobile
} from '@/components/checkout';

const CheckoutPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();

    const bookingId = searchParams.get('booking_id');
    const type = searchParams.get('type'); // 'booking' ou 'evento'
    const inscricaoId = searchParams.get('inscricao_id');
    const packageId = searchParams.get('package_id') || location.state?.packageId;
    const valorParam = searchParams.get('valor');
    const tituloParam = searchParams.get('titulo');

    const [booking, setBooking] = useState(null);
    const [inscricao, setInscricao] = useState(null);
    const [packageData, setPackageData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [selectedMethod, setSelectedMethod] = useState('pix');
    const [paymentStatus, setPaymentStatus] = useState(null);
    const [pixPayment, setPixPayment] = useState(null); // Armazena dados do pagamento PIX
    const [pollingInterval, setPollingInterval] = useState(null); // ID do interval para polling
    const [creditState, setCreditState] = useState({ credits: [], balance: null });
    const [creditLoading, setCreditLoading] = useState(false);
    const [usingCredit, setUsingCredit] = useState(false);
    const [creditError, setCreditError] = useState(null);
    const [existingPayment, setExistingPayment] = useState(null);
    const [showExistingPaymentModal, setShowExistingPaymentModal] = useState(false);
    const [shouldForceNewPayment, setShouldForceNewPayment] = useState(false);
    const [stopMonitoring, setStopMonitoring] = useState(null); // Função para parar monitoramento
    const [payerEmail, setPayerEmail] = useState(''); // E-mail editável pelo usuário no checkout
    const [payerEmailError, setPayerEmailError] = useState(''); // Mensagem de erro do campo e-mail
    const [acceptedTcle, setAcceptedTcle] = useState(false); // Aceite do TCLE Telepsicologia / CFP Resolução 11/2018
    const checkoutTrackedRef = useRef(false);
    const pixDisplayRef = useRef(null);
    const tcleCardRef = useRef(null);

    useEffect(() => {
        if (pixPayment && pixDisplayRef.current?.scrollIntoView) {
            pixDisplayRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [pixPayment]);

    // Helper de validação de e-mail (RFC básico + domínio com pelo menos 2 chars)
    const isValidEmail = (email) => {
        if (!email || typeof email !== 'string') return false;
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
    };

    const buildLogContext = (extra = {}) => ({
        bookingId: bookingId || null,
        inscricaoId: inscricaoId || null,
        packageId: packageId || null,
        type: type || (packageId ? 'package' : 'booking'),
        selectedMethod,
        ...extra
    });

    const getFreshSession = async () => {
        const { data: sessionData } = await supabase.auth.getSession();
        let session = sessionData?.session || null;

        if (!session) {
            return null;
        }

        const expiresAt = session.expires_at ? Number(session.expires_at) : null;
        const needsRefresh = expiresAt && expiresAt <= Math.floor(Date.now() / 1000) + 30;

        if (!needsRefresh) {
            return session;
        }

        const { data: refreshed, error } = await supabase.auth.refreshSession();
        if (error) {
            logger.error('CheckoutPage.refreshSession:error', error, buildLogContext());
            return session;
        }

        return refreshed.session ?? session;
    };

    const isPixHighlightEnabled = isFeatureEnabled('CRO_DEFAULT_PIX_HIGHLIGHT');

    const paymentMethods = [
        {
            id: 'pix',
            name: 'PIX',
            icon: <Smartphone className="w-6 h-6" />,
            description: isPixHighlightEnabled ? '⚡ Aprovação imediata (3s)' : 'Aprovação imediata',
            badge: isPixHighlightEnabled ? 'Mais rápido' : null,
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
            description: 'Temporariamente indisponível',
            available: false
        }
    ];

    useEffect(() => {
        if (type === 'evento' && inscricaoId) {
            fetchInscricao();
        } else if (packageId) {
            fetchPackage();
        } else if (bookingId) {
            fetchBooking();
        } else {
            toast({
                variant: 'destructive',
                title: 'Agendamento não localizado',
                description: 'Não encontramos as informações desta consulta. Vamos te direcionar para escolher um horário disponível.'
            });
            navigate('/');
        }
    }, [bookingId, inscricaoId, packageId, type, valorParam, tituloParam]);

    // Cleanup: Parar monitoramento quando componente desmontar
    useEffect(() => {
        return () => {
            if (stopMonitoring) {
                logger.info('CheckoutPage.cleanup:stopping-monitoring', buildLogContext());
                stopMonitoring();
            }
            if (pollingInterval) {
                clearInterval(pollingInterval);
            }
        };
    }, [stopMonitoring, pollingInterval]);

    useEffect(() => {
        if ((booking || packageData) && type !== 'evento') {
            loadCreditData();
        }
    }, [booking, packageData, type]);

    const bookingTotal = type === 'evento'
        ? Number(inscricao?.evento?.valor || parseFloat(valorParam) || 0)
        : packageId
            ? Number(packageData?.gross_amount || parseFloat(valorParam) || 0)
            : Number(booking?.valor_consulta || booking?.service?.price || valorParam || 0);

    const availableCreditAmount = type === 'evento' ? 0 : (creditState.balance?.available_amount || 0);
    const creditCoversTotal = usingCredit && availableCreditAmount >= bookingTotal && bookingTotal > 0;

    // Tracking de funil: checkout_start disparado uma vez após carregar os dados e calcular o total
    useEffect(() => {
        if (!checkoutTrackedRef.current && (booking || packageData || inscricao)) {
            checkoutTrackedRef.current = true;
            try {
                analytics.trackEvent('checkout_start', {
                    event_category: 'Checkout',
                    booking_id: bookingId || inscricaoId || packageId || null,
                    service_id: booking?.service_id || (packageId ? 'package' : 'consulta'),
                    checkout_type: type || (packageId ? 'package' : 'booking'),
                    payment_method: selectedMethod || 'unknown',
                    value: bookingTotal || undefined
                });
                analytics.trackEvent('begin_checkout', {
                    event_category: 'Ecommerce',
                    value: bookingTotal || undefined,
                    currency: 'BRL',
                    items: [{
                        item_id: bookingId || inscricaoId || packageId || 'consulta',
                        item_name: type === 'evento' ? (inscricao?.evento?.titulo || 'Inscrição em Evento') : (packageId ? 'Pacote de Consultas' : 'Consulta Psicológica'),
                        price: bookingTotal || undefined,
                        quantity: 1
                    }]
                });
                analytics.trackFunnelStep('booking', 5, {
                    step_name: 'checkout_start',
                    booking_id: bookingId || inscricaoId || packageId || null,
                    value: bookingTotal || undefined
                });
            } catch (err) {
                logger.warn('CheckoutPage.analytics:checkout_start error', err);
            }
        }
    }, [booking, packageData, inscricao, bookingTotal, bookingId, inscricaoId, packageId, type, selectedMethod]);

    const fetchPackage = async () => {
        try {
            logger.info('CheckoutPage.fetchPackage:start', buildLogContext({ packageId }));
            if (location.state?.packageId && location.state?.totalAmount) {
                setPackageData({
                    id: location.state.packageId,
                    gross_amount: location.state.totalAmount,
                    patient_name: location.state.patientName,
                    patient_email: location.state.patientEmail,
                    total_sessions: location.state.sessionCount,
                    service_name: location.state.serviceName,
                    professional_name: location.state.professionalName
                });
                if (location.state.patientEmail) {
                    setPayerEmail((current) => current || location.state.patientEmail);
                }
            } else {
                const { data, error } = await supabase
                    .from('packages')
                    .select('*, professionals:professional_id(name)')
                    .eq('id', packageId)
                    .single();

                if (error) throw error;

                if (!data) {
                    throw new Error('Pacote não encontrado');
                }

                if (data.status === 'paid' || data.status === 'completed') {
                    logger.info('CheckoutPage.fetchPackage:already-paid', buildLogContext({ packageId, status: data.status }));
                    navigate('/paciente');
                    return;
                }

                setPackageData(data);
                if (data.patient_email) {
                    setPayerEmail((current) => current || data.patient_email);
                }
                logger.success('CheckoutPage.fetchPackage:success', buildLogContext({ packageId, status: data.status }));
            }
        } catch (error) {
            logger.error('CheckoutPage.fetchPackage:error', error, buildLogContext({ packageId }));
            toast({
                variant: 'destructive',
                title: 'Dados do pacote indisponíveis',
                description: 'Não conseguimos carregar as sessões do pacote no momento. Por favor, tente novamente ou fale com nosso suporte.'
            });
            navigate('/');
        } finally {
            setLoading(false);
        }
    };

    const fetchBooking = async () => {
        try {
            logger.info('CheckoutPage.fetchBooking:start', buildLogContext({ bookingId }));
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
                logger.info('CheckoutPage.fetchBooking:already-paid', buildLogContext({ bookingId, status: data.status }));
                navigate(`/paciente`);
                return;
            }

            setBooking(data);
            if (data.patient_email) {
                setPayerEmail((current) => current || data.patient_email);
            }
            logger.success('CheckoutPage.fetchBooking:success', buildLogContext({ bookingId, status: data.status }));
        } catch (error) {
            logger.error('CheckoutPage.fetchBooking:error', error, buildLogContext({ bookingId }));
            if (!valorParam) {
                toast({
                    variant: 'destructive',
                    title: 'Consulta não localizada',
                    description: 'Houve uma instabilidade ao recuperar os detalhes do agendamento. Vamos retornar para você escolher seu horário com calma.'
                });
                navigate('/');
            } else {
                logger.warn('CheckoutPage.fetchBooking:fallback-valor', buildLogContext({ valorParam }));
                setBooking({
                    id: bookingId,
                    valor_consulta: parseFloat(valorParam),
                    service: { name: 'Consulta Psicológica', price: parseFloat(valorParam) },
                    booking_date: new Date().toISOString().split('T')[0],
                    booking_time: '14:00'
                });
            }
        } finally {
            setLoading(false);
        }
    };

    const loadCreditData = async () => {
        if (type === 'evento') return;
        setCreditLoading(true);
        setCreditError(null);
        try {
            logger.info('CheckoutPage.loadCreditData:start', buildLogContext());
            const session = await getFreshSession();

            if (!session) {
                logger.warn('CheckoutPage.loadCreditData:no-session', buildLogContext());
                setCreditError('Faça login na sua conta para utilizar créditos disponíveis.');
                setCreditState({ credits: [], balance: null });
                return;
            }

            const { data: walletData, error } = await supabase
                .from('patient_wallets')
                .select('balance')
                .eq('id', session.user.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw new Error(error.message || 'Erro ao consultar saldo da carteira');
            }

            setCreditState({
                balance: { available_amount: walletData?.balance || 0, reserved_amount: 0 },
                credits: []
            });
            logger.success('CheckoutPage.loadCreditData:success', buildLogContext({
                hasBalance: Boolean(walletData?.balance)
            }));
        } catch (error) {
            logger.error('CheckoutPage.loadCreditData:error', error, buildLogContext());
            setCreditError(error instanceof Error ? error.message : 'Erro ao carregar saldo da carteira');
        } finally {
            setCreditLoading(false);
        }
    };

    const fetchInscricao = async () => {
        try {
            logger.info('CheckoutPage.fetchInscricao:start', buildLogContext({ inscricaoId }));
            const { data, error } = await supabase
                .from('inscricoes_eventos')
                .select(`
                    *,
                    evento:eventos(titulo, descricao, valor, data_inicio)
                `)
                .eq('id', inscricaoId)
                .single();

            if (error) throw error;

            if (!data) {
                throw new Error('Inscrição não encontrada');
            }

            // Verificar se já foi pago
            if (data.status_pagamento === 'confirmado' || data.status_pagamento === 'pago') {
                toast({
                    title: 'Pagamento já realizado',
                    description: 'Este evento já foi pago'
                });
                navigate(`/`);
                return;
            }

            setInscricao(data);
            if (data.email) {
                setPayerEmail((current) => current || data.email);
            }
            logger.success('CheckoutPage.fetchInscricao:success', buildLogContext({ inscricaoId, status_pagamento: data.status_pagamento }));
        } catch (error) {
            logger.error('CheckoutPage.fetchInscricao:error', error, buildLogContext({ inscricaoId }));
            toast({
                variant: 'destructive',
                title: 'Inscrição não localizada',
                description: 'Não encontramos as informações deste evento. Por favor, tente novamente a partir da página do evento.'
            });
            navigate('/');
        } finally {
            setLoading(false);
        }
    };

    // Helper para formatar data ignorando timezone (exibe exatamente o que está no banco)
    const formatDateSafe = (dateString) => {
        if (!dateString) return '';
        if (dateString.includes('T')) {
            return new Date(dateString).toLocaleDateString('pt-BR');
        }
        const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('pt-BR');
    };

    const handlePayment = async (forceParam) => {
        const force = forceParam === true;

        if (!acceptedTcle) {
            toast({
                variant: 'destructive',
                title: 'Precisamos do seu consentimento',
                description: 'Por favor, confirme que está de acordo com as normas éticas de atendimento online para continuarmos.'
            });
            return;
        }

        if (processing) return;
        setProcessing(true);
        setPaymentStatus(null);

        try {
            logger.info('CheckoutPage.handlePayment:start', buildLogContext({
                creditCoversTotal,
                bookingTotal,
                selectedMethod,
                type,
                force
            }));

            // Verificar pagamentos duplicados (apenas se feature flag ativada)
            if (!force && !shouldForceNewPayment && isFeatureEnabled('PAYMENT_IDEMPOTENCY_CHECK') && bookingId && type !== 'evento') {
                const existing = await MercadoPagoService.checkExistingPayment(bookingId);

                if (existing) {
                    if (existing.status === 'approved') {
                        toast({
                            title: 'Pagamento já aprovado',
                            description: 'Este agendamento já foi pago com sucesso.'
                        });
                        try {
                            analytics.trackBookingCompleted(
                                bookingId || packageId,
                                booking?.professional_id || packageData?.professional_id,
                                booking?.service_id || 'booking',
                                bookingTotal,
                                existing.payment_method_id || 'unknown'
                            );
                        } catch (trackErr) {
                            logger.warn('CheckoutPage.existingPayment:analytics error', trackErr);
                        }
                        navigate('/checkout/success', {
                            state: { bookingId, packageId, paymentId: existing.mp_payment_id }
                        });
                        setProcessing(false);
                        return;
                    }

                    if ((existing.status === 'pending' || existing.status === 'in_process') &&
                        isFeatureEnabled('PAYMENT_DUPLICATE_MODAL')) {
                        setExistingPayment(existing);
                        setShowExistingPaymentModal(true);
                        setProcessing(false);
                        return;
                    }
                }
            }

            const session = await getFreshSession();
            const referenceId = bookingId || inscricaoId || packageId;

            let amount = 0;
            if (type === 'evento') {
                amount = inscricao?.valor || parseFloat(valorParam) || 0;
            } else if (packageId) {
                amount = packageData?.gross_amount || parseFloat(valorParam) || 0;
            } else {
                amount = booking?.valor_consulta || booking?.service?.price || parseFloat(valorParam) || 0;
            }

            try {
                analytics.trackEvent('payment_initiated', {
                    event_category: 'Checkout',
                    payment_method: usingCredit && creditCoversTotal ? 'wallet' : selectedMethod,
                    booking_id: referenceId,
                    checkout_type: type || (packageId ? 'package' : 'booking'),
                    value: amount
                });
            } catch (trackingError) {
                logger.warn('CheckoutPage.analytics:payment_initiated error', trackingError);
            }

            const description = packageId
                ? `Pacote de Consultas (${packageData?.total_sessions || ''} sessões)`
                : booking
                    ? `Consulta Online - Agendamento ${referenceId}`
                    : (inscricao?.evento?.titulo || tituloParam || `Pagamento de Evento - Inscrição ${referenceId}`);

            const resolvedEmail = payerEmail.trim()
                || session?.user?.email
                || packageData?.patient_email
                || booking?.patient_email
                || inscricao?.email
                || '';

            const payerInfo = {
                email: resolvedEmail,
                first_name: session?.user?.user_metadata?.full_name?.split(' ')[0] || packageData?.patient_name?.split(' ')[0] || booking?.patient_name?.split(' ')[0] || inscricao?.nome?.split(' ')[0] || '',
                last_name: session?.user?.user_metadata?.full_name?.split(' ').slice(1).join(' ') || packageData?.patient_name?.split(' ').slice(1).join(' ') || booking?.patient_name?.split(' ').slice(1).join(' ') || inscricao?.nome?.split(' ').slice(1).join(' ') || ''
            };

            if (!isValidEmail(payerInfo.email)) {
                const emailDisplay = payerInfo.email ? `"${payerInfo.email}"` : '(vazio)';
                setPayerEmailError(
                    `O e-mail ${emailDisplay} é inválido. Corrija-o acima para continuar.`
                );
                toast({
                    variant: 'destructive',
                    title: 'E-mail inválido',
                    description: `O e-mail ${emailDisplay} não é válido. Por favor, corrija o campo acima.`
                });
                setProcessing(false);
                return;
            }

            setPayerEmailError('');

            let wallet_used = 0;
            if (usingCredit && type !== 'evento') {
                wallet_used = Math.min(amount, availableCreditAmount);
            }

            const sessionData = await getFreshSession();
            const paymentData = {
                ...(type === 'evento' ? { inscricao_id: referenceId } : packageId ? { package_id: packageId } : { booking_id: referenceId }),
                amount: amount,
                wallet_used: wallet_used,
                description: description,
                payer: payerInfo,
                user_id: sessionData?.user?.id
            };

            logger.info('CheckoutPage.handlePayment:using-orchestrator', buildLogContext({
                referenceId,
                amount,
                selectedMethod
            }));

            // Usar PaymentOrchestrator
            const result = await paymentOrchestrator.processPayment(
                selectedMethod,
                paymentData,
                {
                    onStatusChange: (statusUpdate) => {
                        logger.info('CheckoutPage.handlePayment:status-change', buildLogContext({
                            status: statusUpdate.status,
                            statusDetail: statusUpdate.statusDetail
                        }));

                        setPaymentStatus({
                            status: statusUpdate.status,
                            detail: statusUpdate.statusDetail
                        });
                    },
                    onSuccess: (paymentResult) => {
                        logger.success('CheckoutPage.handlePayment:success', buildLogContext({
                            paymentId: paymentResult.paymentId
                        }));

                        toast({
                            title: 'Pagamento aprovado!',
                            description: 'Seu pagamento foi confirmado com sucesso.'
                        });

                        try {
                            analytics.trackBookingCompleted(
                                bookingId || packageId,
                                booking?.professional_id || packageData?.professional_id,
                                booking?.service_id || 'booking',
                                bookingTotal,
                                selectedMethod || 'credit_card'
                            );
                        } catch (trackErr) {
                            logger.warn('CheckoutPage.onSuccess:analytics error', trackErr);
                        }

                        navigate('/checkout/success', {
                            state: {
                                bookingId: bookingId,
                                inscricaoId: inscricaoId,
                                packageId: packageId,
                                paymentId: paymentResult.paymentId,
                                paymentStatus: 'approved'
                            }
                        });
                    },
                    onError: (error) => {
                        logger.error('CheckoutPage.handlePayment:payment-error', null, buildLogContext({
                            error: error.message || error.error
                        }));

                        const friendlyMessage = error.message
                            || MercadoPagoService.getFriendlyStatusMessage(error.statusDetail, error.status)
                            || 'Não foi possível processar o pagamento. Tente novamente.';

                        toast({
                            variant: 'destructive',
                            title: 'Pagamento não aprovado',
                            description: friendlyMessage
                        });
                    }
                }
            );

            if (result.success) {
                if (result.qrCode) {
                    setPixPayment(result);
                    try {
                        analytics.trackEvent('pix_generated', {
                            event_category: 'Checkout',
                            payment_method: 'pix',
                            checkout_type: type || (packageId ? 'package' : 'booking'),
                            value: amount
                        });
                    } catch (trackingError) {
                        logger.warn('CheckoutPage.analytics:pix_generated error', trackingError);
                    }
                }

                if (result.stopMonitoring) {
                    setStopMonitoring(() => result.stopMonitoring);
                }

                logger.success('CheckoutPage.handlePayment:orchestrator-success', buildLogContext({
                    paymentId: result.paymentId,
                    method: selectedMethod
                }));

                if (selectedMethod === 'pix') {
                    toast({
                        title: 'QR Code gerado!',
                        description: 'Escaneie o código para efetuar o pagamento.'
                    });
                }
            } else {
                throw new Error(result.error || 'Erro ao processar pagamento');
            }

        } catch (error) {
            logger.error('CheckoutPage.handlePayment:error', error, buildLogContext());

            let friendlyMsg = error.message || '';
            if (friendlyMsg.includes('payer.email must be valid email') || friendlyMsg.includes('4050')) {
                friendlyMsg = 'Identificamos um detalhe no e-mail informado. Por favor, confira o formato (ex: seu@email.com) para podermos enviar a confirmação da consulta.';
                setPayerEmailError('E-mail com formato inválido — confira antes de pagar.');
            } else if (friendlyMsg.includes('Mercado Pago API error') || friendlyMsg.includes('bad_request')) {
                friendlyMsg = 'Tivemos uma oscilação temporária de conexão com o sistema bancário. Seus horários continuam reservados; você pode tentar novamente ou pagar via PIX com aprovação instantânea.';
            } else if (!friendlyMsg || friendlyMsg.includes('Erro ao processar')) {
                friendlyMsg = 'Não conseguimos concluir o pagamento neste momento. Seus horários continuam reservados por alguns minutos — tente novamente ou fale com nossa equipe no WhatsApp.';
            }

            toast({
                variant: 'destructive',
                title: 'Não conseguimos concluir esta tentativa',
                description: friendlyMsg
            });
        } finally {
            setProcessing(false);
        }
    };

    const startPaymentPolling = (paymentId) => {
        logger.info('CheckoutPage.startPaymentPolling:start', buildLogContext({ paymentId }));

        if (pollingInterval) {
            clearInterval(pollingInterval);
        }

        const intervalId = setInterval(async () => {
            try {
                const statusResult = await MercadoPagoService.checkPaymentStatus(paymentId);

                if (statusResult.success) {
                    logger.info('CheckoutPage.startPaymentPolling:status', buildLogContext({
                        paymentId,
                        status: statusResult.status,
                        status_detail: statusResult.status_detail
                    }));

                    if (statusResult.status === 'approved') {
                        logger.success('CheckoutPage.startPaymentPolling:approved', buildLogContext({ paymentId }));
                        clearInterval(intervalId);
                        setPollingInterval(null);

                        await updateBookingPaymentStatus(paymentId);

                        try {
                            analytics.trackBookingCompleted(
                                bookingId || packageId,
                                booking?.professional_id || packageData?.professional_id,
                                booking?.service_id || 'booking',
                                bookingTotal,
                                'pix'
                            );
                        } catch (trackErr) {
                            logger.warn('CheckoutPage.startPaymentPolling:analytics error', trackErr);
                        }

                        navigate('/checkout/success', {
                            state: {
                                bookingId: booking?.id || bookingId,
                                packageId: packageId,
                                inscricaoId: inscricaoId,
                                paymentId: paymentId,
                                paymentStatus: 'approved'
                            }
                        });

                    } else if (statusResult.status === 'rejected' || statusResult.status === 'cancelled') {
                        logger.warn('CheckoutPage.startPaymentPolling:rejected', buildLogContext({
                            paymentId,
                            status: statusResult.status,
                            status_detail: statusResult.status_detail
                        }));
                        clearInterval(intervalId);
                        setPollingInterval(null);

                        const friendlyMessage = MercadoPagoService.getFriendlyStatusMessage(
                            statusResult.status_detail,
                            statusResult.status
                        );

                        setPaymentStatus({
                            status: statusResult.status,
                            detail: statusResult.status_detail,
                        });

                        toast({
                            variant: 'destructive',
                            title: 'Pagamento não aprovado',
                            description: friendlyMessage
                        });
                    }
                }
            } catch (error) {
                logger.error('CheckoutPage.startPaymentPolling:error', error, buildLogContext({ paymentId }));
            }
        }, 3000);

        setPollingInterval(intervalId);
    };

    const updateBookingPaymentStatus = async (paymentId) => {
        try {
            logger.info('CheckoutPage.updateBookingPaymentStatus:start', buildLogContext({ paymentId }));

            const { error: paymentError } = await supabase
                .from('payments')
                .update({
                    status: 'approved',
                    status_detail: 'accredited'
                })
                .eq('mp_payment_id', paymentId.toString());

            if (paymentError) {
                logger.error('CheckoutPage.updateBookingPaymentStatus:payment-error', paymentError, buildLogContext({ paymentId }));
            } else {
                logger.success('CheckoutPage.updateBookingPaymentStatus:payment-updated', buildLogContext({ paymentId }));
            }

            if (type === 'evento') {
                const { error: inscricaoError } = await supabase
                    .from('inscricoes_eventos')
                    .update({ status_pagamento: 'confirmado' })
                    .eq('id', inscricaoId);

                if (inscricaoError) {
                    logger.error('CheckoutPage.updateBookingPaymentStatus:inscricao-error', inscricaoError, buildLogContext({ paymentId, inscricaoId }));
                } else {
                    logger.success('CheckoutPage.updateBookingPaymentStatus:inscricao-updated', buildLogContext({ paymentId, inscricaoId }));
                }
            } else if (packageId) {
                const { error: pkgError } = await supabase
                    .from('packages')
                    .update({ status: 'paid' })
                    .eq('id', packageId);

                const { error: childError } = await supabase
                    .from('bookings')
                    .update({ status: 'confirmed' })
                    .eq('package_id', packageId);

                if (pkgError || childError) {
                    logger.error('CheckoutPage.updateBookingPaymentStatus:package-error', pkgError || childError, buildLogContext({ paymentId, packageId }));
                } else {
                    logger.success('CheckoutPage.updateBookingPaymentStatus:package-updated', buildLogContext({ paymentId, packageId }));
                }
            } else {
                const { error: bookingError } = await supabase
                    .from('bookings')
                    .update({ status: 'confirmed' })
                    .eq('id', bookingId);

                if (bookingError) {
                    logger.error('CheckoutPage.updateBookingPaymentStatus:booking-error', bookingError, buildLogContext({ paymentId, bookingId }));
                } else {
                    logger.success('CheckoutPage.updateBookingPaymentStatus:booking-updated', buildLogContext({ paymentId, bookingId }));
                }
            }
        } catch (error) {
            logger.error('CheckoutPage.updateBookingPaymentStatus:error', error, buildLogContext({ paymentId }));
        }
    };

    const navigateToDirectCard = () => {
        if (!acceptedTcle) {
            setAcceptedTcle(true);
        }
        const params = new URLSearchParams({
            ...(bookingId && { booking_id: bookingId }),
            ...(inscricaoId && { inscricao_id: inscricaoId }),
            ...(packageId && { package_id: packageId }),
            ...(type && { type }),
            ...(valorParam && { valor: valorParam }),
            ...(tituloParam && { titulo: tituloParam }),
        });
        navigate(`/checkout-direct?${params.toString()}`);
    };

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

    if (!booking && !inscricao && !packageData) {
        return null;
    }

    const friendlyCheckoutMessage = paymentStatus
        ? MercadoPagoService.getFriendlyStatusMessage(paymentStatus.detail, paymentStatus.status)
        : null;

    const fallbackEmail = booking?.patient_email || packageData?.patient_email || inscricao?.email || '';

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
            {/* Header com navegação e marca */}
            <CheckoutHeader onBack={() => navigate(-1)} />

            <div className="max-w-4xl mx-auto pt-4 sm:pt-8 pb-36 md:pb-12 px-4">
                {/* Header da Página */}
                <div className="text-center mb-6 sm:mb-8">
                    <h1 className="text-2xl sm:text-4xl font-bold mb-2">Finalizar Pagamento</h1>
                    <p className="text-gray-600 text-sm sm:text-base">Complete sua reserva com segurança e rapidez</p>
                </div>

                {/* Mini-resumo do Pedido no Mobile (Visível acima do fold) */}
                <CheckoutMobileMiniSummary
                    type={type}
                    packageData={packageData}
                    booking={booking}
                    inscricao={inscricao}
                    tituloParam={tituloParam}
                    bookingTotal={bookingTotal}
                    formatCurrency={MercadoPagoService.formatCurrency}
                />

                {friendlyCheckoutMessage && (
                    <div className="mb-6">
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                            <p className="font-semibold mb-1">Não conseguimos aprovar o pagamento anterior.</p>
                            <p>{friendlyCheckoutMessage}</p>
                        </div>
                    </div>
                )}

                <div className="grid md:grid-cols-3 gap-6">
                    {/* Coluna Principal: Opções e Ações */}
                    <div className="md:col-span-2">
                        {/* Créditos da Carteira */}
                        {type !== 'evento' && availableCreditAmount > 0 && (
                            <CheckoutWalletCard
                                creditLoading={creditLoading}
                                creditError={creditError}
                                usingCredit={usingCredit}
                                setUsingCredit={setUsingCredit}
                                processing={processing}
                                availableCreditAmount={availableCreditAmount}
                                creditCoversTotal={creditCoversTotal}
                                bookingTotal={bookingTotal}
                                formatCurrency={MercadoPagoService.formatCurrency}
                            />
                        )}

                        {/* E-mail para Confirmação Bancária */}
                        {!creditCoversTotal && (
                            <CheckoutPayerEmailCard
                                payerEmail={payerEmail}
                                setPayerEmail={setPayerEmail}
                                payerEmailError={payerEmailError}
                                setPayerEmailError={setPayerEmailError}
                                processing={processing}
                                fallbackEmail={fallbackEmail}
                                isValidEmail={isValidEmail}
                            />
                        )}

                        {/* Seletor de Meio de Pagamento */}
                        <CheckoutPaymentMethodSelector
                            paymentMethods={paymentMethods}
                            selectedMethod={selectedMethod}
                            onSelectMethod={(methodId) => {
                                setSelectedMethod(methodId);
                                try {
                                    analytics.trackEvent('payment_method_selected', {
                                        event_category: 'Checkout',
                                        payment_method: methodId,
                                        booking_id: bookingId || inscricaoId || packageId || null
                                    });
                                } catch (err) {
                                    // Silencioso
                                }
                            }}
                            processing={processing}
                            creditCoversTotal={creditCoversTotal}
                        />

                        {/* QR Code e Código Copia e Cola do PIX */}
                        {pixPayment && selectedMethod === 'pix' && (
                            <CheckoutPixDisplay
                                containerRef={pixDisplayRef}
                                pixPayment={pixPayment}
                                paymentStatus={paymentStatus}
                                onCopyPix={(copied) => {
                                    try {
                                        analytics.trackEvent('pix_code_copied', {
                                            event_category: 'Checkout',
                                            payment_method: 'pix',
                                            checkout_type: type || (packageId ? 'package' : 'booking'),
                                            copied: Boolean(copied)
                                        });
                                    } catch (trackingError) {
                                        logger.warn('CheckoutPage.analytics:pix_code_copied error', trackingError);
                                    }

                                    if (copied) {
                                        toast({
                                            title: '✅ Código PIX Copiado!',
                                            description: 'Abra o app do seu banco e escolha a opção PIX Copia e Cola.',
                                        });
                                    } else {
                                        toast({
                                            variant: 'destructive',
                                            title: 'Não foi possível copiar automaticamente',
                                            description: 'Toque e segure no campo do código PIX acima para copiar manualmente.',
                                        });
                                    }
                                }}
                            />
                        )}

                        {/* Consentimento TCLE / CFP Resolução 11/2018 */}
                        {!pixPayment && (
                            <div ref={tcleCardRef}>
                                <CheckoutTcleCard
                                    acceptedTcle={acceptedTcle}
                                    setAcceptedTcle={setAcceptedTcle}
                                />
                            </div>
                        )}

                        {/* Botões Principais Desktop */}
                        {creditCoversTotal ? (
                            <Button
                                onClick={handlePayment}
                                disabled={processing || !acceptedTcle}
                                size="lg"
                                className="w-full bg-[#2d8659] hover:bg-[#236b47]"
                            >
                                {processing ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                        Confirmando seu crédito...
                                    </>
                                ) : (
                                    'Confirmar uso do meu crédito'
                                )}
                            </Button>
                        ) : (!pixPayment && (
                            <>
                                {(selectedMethod === 'credit_card' || selectedMethod === 'debit_card') && (
                                    <div className="space-y-3">
                                        <Button
                                            onClick={navigateToDirectCard}
                                            size="lg"
                                            disabled={processing || !acceptedTcle}
                                            className="w-full bg-[#2d8659] hover:bg-[#236b47]"
                                        >
                                            <CreditCard className="w-5 h-5 mr-2" />
                                            Pagar com Cartão de Crédito
                                        </Button>

                                        <div className="text-center">
                                            <p className="text-xs text-gray-500 mb-2">ou</p>
                                        </div>

                                        <Button
                                            onClick={handlePayment}
                                            disabled={processing || !acceptedTcle}
                                            size="lg"
                                            variant="outline"
                                            className="w-full"
                                        >
                                            {processing ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#2d8659] mr-2"></div>
                                                    Conectando com segurança...
                                                </>
                                            ) : (
                                                'Pagar em ambiente seguro do Mercado Pago'
                                            )}
                                        </Button>
                                    </div>
                                )}

                                {selectedMethod !== 'credit_card' && selectedMethod !== 'debit_card' && (
                                    <Button
                                        onClick={handlePayment}
                                        disabled={processing || !acceptedTcle}
                                        size="lg"
                                        aria-label={selectedMethod === 'pix' ? 'Gerar código PIX para pagamento imediato' : 'Continuar para pagamento'}
                                        className="w-full bg-[#2d8659] hover:bg-[#236b47] min-h-[48px] font-bold text-base shadow-lg shadow-[#2d8659]/20"
                                    >
                                        {processing ? (
                                            <>
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                                Gerando PIX com segurança...
                                            </>
                                        ) : selectedMethod === 'pix' ? (
                                            <>
                                                <Smartphone className="w-5 h-5 mr-2" />
                                                Gerar QR Code PIX (Aprovação Instantânea)
                                            </>
                                        ) : (
                                            'Continuar para Pagamento'
                                        )}
                                    </Button>
                                )}
                            </>
                        ))}
                    </div>

                    {/* Coluna Lateral: Resumo do Pedido */}
                    <div>
                        <CheckoutOrderSummary
                            type={type}
                            packageData={packageData}
                            booking={booking}
                            inscricao={inscricao}
                            tituloParam={tituloParam}
                            valorParam={valorParam}
                            bookingTotal={bookingTotal}
                            creditCoversTotal={creditCoversTotal}
                            availableCreditAmount={availableCreditAmount}
                            formatDateSafe={formatDateSafe}
                            formatCurrency={MercadoPagoService.formatCurrency}
                        />
                    </div>
                </div>
            </div>

            {/* Barra Sticky Unificada de Ação no Mobile */}
            {!pixPayment && (
                <CheckoutStickyCtaMobile
                    bookingTotal={bookingTotal}
                    creditCoversTotal={creditCoversTotal}
                    selectedMethod={selectedMethod}
                    processing={processing}
                    onPay={() => {
                        if (!acceptedTcle) {
                            tcleCardRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
                            document.getElementById('tcle-checkbox')?.focus?.();
                            toast({
                                title: 'Confirme os termos antes de continuar',
                                description: 'Marque a caixa de sigilo ético e termos de cuidado acima para gerar seu pagamento.'
                            });
                            return;
                        }
                        handlePayment();
                    }}
                    onPayDirectCard={navigateToDirectCard}
                    formatCurrency={MercadoPagoService.formatCurrency}
                />
            )}

            {/* Modal de Pagamento Existente */}
            {showExistingPaymentModal && existingPayment && (
                <ExistingPaymentModal
                    payment={existingPayment}
                    onContinue={() => {
                        if (existingPayment?.qr_code && existingPayment?.payment_type === 'pix') {
                            setPixPayment({
                                paymentId: existingPayment.mp_payment_id,
                                payment_id: existingPayment.mp_payment_id,
                                qrCode: existingPayment.qr_code,
                                qr_code: existingPayment.qr_code,
                                success: true
                            });
                            startPaymentPolling(existingPayment.mp_payment_id);
                            setShowExistingPaymentModal(false);
                            toast({
                                title: 'Pagamento restaurado',
                                description: 'QR Code recuperado com sucesso.'
                            });
                        } else if (existingPayment?.status === 'pending' && existingPayment?.external_resource_url) {
                            window.location.href = existingPayment.external_resource_url;
                        } else {
                            setShowExistingPaymentModal(false);
                            toast({
                                title: 'Continuando',
                                description: 'Por favor, aguarde a verificação do pagamento.'
                            });
                        }
                    }}
                    onNewPayment={async () => {
                        setShowExistingPaymentModal(false);
                        setExistingPayment(null);
                        setShouldForceNewPayment(true);
                        setTimeout(() => handlePayment(true), 100);
                    }}
                    onClose={() => setShowExistingPaymentModal(false)}
                />
            )}
        </div>
    );
};

export default CheckoutPage;
