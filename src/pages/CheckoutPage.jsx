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
import { safeRedirect } from '@/lib/securityUtils';

const CheckoutPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    
    const bookingId = searchParams.get('booking_id');
    const type = searchParams.get('type'); // 'booking' ou 'evento'
    const inscricaoId = searchParams.get('inscricao_id');
    const valorParam = searchParams.get('valor');
    const tituloParam = searchParams.get('titulo');
    
    const [booking, setBooking] = useState(null);
    const [inscricao, setInscricao] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [selectedMethod, setSelectedMethod] = useState('pix');
    const [preference, setPreference] = useState(null);
    const [paymentStatus, setPaymentStatus] = useState(null);
    const [pixPayment, setPixPayment] = useState(null); // Armazena dados do pagamento PIX
    const [pollingInterval, setPollingInterval] = useState(null); // ID do interval para polling
    const [creditState, setCreditState] = useState({ credits: [], balance: null });
    const [creditLoading, setCreditLoading] = useState(false);
    const [usingCredit, setUsingCredit] = useState(false);
    const [selectedCreditId, setSelectedCreditId] = useState(null);
    const [creditError, setCreditError] = useState(null);

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
            description: 'Temporariamente indisponível',
            available: false
        }
    ];

    useEffect(() => {
        if (type === 'evento' && inscricaoId) {
            fetchInscricao();
        } else if (bookingId) {
            fetchBooking();
        } else {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Informações de pagamento não encontradas'
            });
            navigate('/');
        }
    }, [bookingId, inscricaoId, type]);

    useEffect(() => {
        if (booking && type !== 'evento') {
            loadCreditData();
        }
    }, [booking, type]);

    const bookingTotal = type === 'evento'
        ? Number(inscricao?.evento?.valor || parseFloat(valorParam) || 0)
        : Number(booking?.valor_consulta || booking?.service?.price || valorParam || 0);

    const availableCredits = type === 'evento'
        ? []
        : (creditState.credits || []).filter((credit) => {
            if (!credit || credit.status !== 'available') return false;
            const amountNumber = Number(credit.amount);
            if (Number.isNaN(amountNumber)) return false;
            return amountNumber > 0;
        });

    const selectedCredit = availableCredits.find((credit) => credit.id === selectedCreditId) || null;
    const selectedCreditAmount = selectedCredit ? Number(selectedCredit.amount) : 0;
    const creditCoversTotal = usingCredit && selectedCredit && selectedCreditAmount >= bookingTotal && bookingTotal > 0;
    const creditAppliedAmount = creditCoversTotal ? Math.min(selectedCreditAmount, bookingTotal) : 0;

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

    const loadCreditData = async () => {
        if (type === 'evento') return;
        setCreditLoading(true);
        setCreditError(null);
        try {
            const { data, error } = await supabase.functions.invoke('financial-credit-manager', {
                body: {
                    action: 'list',
                },
            });

            if (error) {
                throw new Error(error.message || 'Erro ao consultar créditos');
            }

            if (data?.error) {
                throw new Error(data.error);
            }

            setCreditState({
                credits: Array.isArray(data?.credits) ? data.credits : [],
                balance: data?.balance ?? null,
            });
        } catch (error) {
            console.error('Erro ao carregar créditos disponíveis:', error);
            setCreditError(error instanceof Error ? error.message : 'Erro ao carregar créditos');
        } finally {
            setCreditLoading(false);
        }
    };

    const fetchInscricao = async () => {
        try {
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
        } catch (error) {
            console.error('Erro ao buscar inscrição:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível carregar a inscrição'
            });
            navigate('/');
        } finally {
            setLoading(false);
        }
    };

    const generateReservationToken = () => {
        if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
            return crypto.randomUUID();
        }
        return `credit-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    };

    const processCreditCheckout = async () => {
        if (!bookingId || !selectedCredit || !creditCoversTotal) {
            throw new Error('Configuração de crédito inválida.');
        }

        const creditAmount = Number(selectedCredit.amount);
        if (!Number.isFinite(creditAmount) || creditAmount < bookingTotal || bookingTotal <= 0) {
            throw new Error('Crédito selecionado insuficiente para cobrir o agendamento.');
        }

        const reservationToken = generateReservationToken();
        let reserved = false;

        try {
            const reserveResponse = await supabase.functions.invoke('financial-credit-manager', {
                body: {
                    action: 'reserve',
                    credit_id: selectedCredit.id,
                    reservation_token: reservationToken,
                    reservation_note: `booking:${bookingId}`,
                },
            });

            if (reserveResponse.error) {
                throw new Error(reserveResponse.error.message || 'Erro ao reservar crédito');
            }

            if (reserveResponse.data?.error) {
                throw new Error(reserveResponse.data.error);
            }

            reserved = true;

            const consumeResponse = await supabase.functions.invoke('financial-credit-manager', {
                body: {
                    action: 'consume',
                    credit_id: selectedCredit.id,
                    reservation_token: reservationToken,
                    used_booking_id: bookingId,
                    consumption_note: 'checkout_credit_full',
                },
            });

            if (consumeResponse.error) {
                throw new Error(consumeResponse.error.message || 'Erro ao consumir crédito');
            }

            if (consumeResponse.data?.error) {
                throw new Error(consumeResponse.data.error);
            }

            const creditCurrency = consumeResponse.data?.credit?.currency || 'BRL';

            const { error: bookingError } = await supabase
                .from('bookings')
                .update({
                    status: 'confirmed',
                    updated_at: new Date().toISOString(),
                })
                .eq('id', bookingId);

            if (bookingError) {
                throw new Error('Não foi possível atualizar o status do agendamento');
            }

            const { error: paymentRecordError } = await supabase
                .from('payments')
                .insert({
                    booking_id: bookingId,
                    status: 'approved',
                    status_detail: 'credit_applied',
                    payment_method: 'financial_credit',
                    payment_type: 'financial_credit',
                    amount: bookingTotal,
                    currency: creditCurrency,
                    description: 'Pagamento realizado com crédito financeiro',
                    raw_payload: consumeResponse.data?.credit ?? null,
                });

            if (paymentRecordError) {
                console.warn('Falha ao registrar pagamento com crédito', paymentRecordError);
            }

            toast({
                title: 'Crédito aplicado com sucesso!',
                description: 'Seu agendamento foi confirmado utilizando o crédito disponível.',
            });

            navigate('/checkout/success', {
                state: {
                    bookingId,
                    paymentStatus: 'approved',
                    paymentMethod: 'financial_credit',
                },
            });
        } catch (error) {
            if (reserved) {
                try {
                    await supabase.functions.invoke('financial-credit-manager', {
                        body: {
                            action: 'release',
                            credit_id: selectedCredit.id,
                            reservation_token: reservationToken,
                        },
                    });
                } catch (releaseError) {
                    console.error('Falha ao liberar crédito após erro:', releaseError);
                }
            }

            throw error instanceof Error ? error : new Error('Falha ao processar pagamento com crédito');
        }
    };

    const handlePayment = async () => {
        if (processing) return;
        setProcessing(true);

        try {
            if (creditCoversTotal && bookingId) {
                await processCreditCheckout();
                return;
            }

            let amount, description, payerInfo, referenceId;

            if (type === 'evento') {
                // Dados do evento
                amount = inscricao?.evento?.valor || parseFloat(valorParam) || 0;
                description = `Evento - ${inscricao?.evento?.titulo || tituloParam || 'Evento Doxologos'}`;
                payerInfo = {
                    name: inscricao.patient_name,
                    email: inscricao.patient_email,
                    phone: {
                        area_code: inscricao.patient_phone?.substring(0, 2) || '11',
                        number: inscricao.patient_phone?.substring(2) || '999999999'
                    }
                };
                referenceId = inscricaoId;
            } else {
                // Dados do booking (original)
                amount = booking.valor_consulta || booking.service?.price || 0;
                description = `Consulta - ${booking.service?.name || 'Atendimento Psicológico'}`;
                payerInfo = {
                    name: booking.patient_name,
                    email: booking.patient_email,
                    phone: {
                        area_code: booking.patient_phone?.substring(0, 2) || '11',
                        number: booking.patient_phone?.substring(2) || '999999999'
                    }
                };
                referenceId = bookingId;
            }

            if (!amount || amount <= 0) {
                throw new Error('Valor inválido para pagamento');
            }

            const requestPayload = {
                [type === 'evento' ? 'inscricao_id' : 'booking_id']: referenceId,
                amount: amount,
                description: description,
                payer: payerInfo
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

                // Configurar payment_methods baseado no método selecionado
                let paymentMethodConfig = {
                    excluded_payment_methods: [],
                    excluded_payment_types: [],
                    installments: 12
                };

                // Configurar exclusões baseado no método selecionado
                if (selectedMethod === 'credit_card') {
                    // Apenas cartão de crédito
                    paymentMethodConfig.excluded_payment_types = ['debit_card', 'ticket', 'bank_transfer', 'atm'];
                } else if (selectedMethod === 'debit_card') {
                    // Apenas cartão de débito
                    paymentMethodConfig.excluded_payment_types = ['credit_card', 'ticket', 'bank_transfer', 'atm'];
                } else if (selectedMethod === 'bank_transfer') {
                    // Apenas boleto
                    paymentMethodConfig.excluded_payment_types = ['credit_card', 'debit_card', 'atm'];
                }

                // Adicionar configuração de payment_methods ao payload
                const preferencePayload = {
                    ...requestPayload,
                    payment_methods: paymentMethodConfig,
                    selected_payment_method: selectedMethod // Adicionar método selecionado para referência
                };

                const result = await MercadoPagoService.createPreference(preferencePayload);

                if (result.success) {
                    setPreference(result);
                    
                    // Redirecionamento seguro - valida URL antes de redirecionar
                    safeRedirect(result.init_point, '/');
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
                        
                        // Atualizar status no Supabase (passa o paymentId)
                        await updateBookingPaymentStatus(paymentId);
                        
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

    // Atualiza status do pagamento no booking ou inscrição
    const updateBookingPaymentStatus = async (paymentId) => {
        try {
            console.log('💾 Atualizando status do pagamento...', paymentId);
            
            // 1. Atualizar status do pagamento na tabela payments
            const { error: paymentError } = await supabase
                .from('payments')
                .update({ 
                    status: 'approved',
                    status_detail: 'accredited'
                })
                .eq('mp_payment_id', paymentId.toString());

            if (paymentError) {
                console.error('❌ Erro ao atualizar pagamento:', paymentError);
            } else {
                console.log('✅ Status do pagamento atualizado para approved');
            }
            
            if (type === 'evento') {
                // 2. Atualizar status da inscrição no evento
                const { error: inscricaoError } = await supabase
                    .from('inscricoes_eventos')
                    .update({ 
                        status_pagamento: 'confirmado'
                    })
                    .eq('id', inscricaoId);

                if (inscricaoError) {
                    console.error('❌ Erro ao atualizar inscrição:', inscricaoError);
                } else {
                    console.log('✅ Status da inscrição atualizado para confirmado');
                }
            } else {
                // 2. Atualizar status do booking para 'confirmed'
                const { error: bookingError } = await supabase
                    .from('bookings')
                    .update({ 
                        status: 'confirmed'
                    })
                    .eq('id', bookingId);

                if (bookingError) {
                    console.error('❌ Erro ao atualizar booking:', bookingError);
                } else {
                    console.log('✅ Status do booking atualizado para confirmed');
                }
            }
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
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

    if (!booking && !inscricao) {
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
                        {type !== 'evento' && (
                            <Card className="p-6 mb-6">
                                <h2 className="text-xl font-bold mb-4 flex items-center">
                                    <CreditCard className="w-5 h-5 mr-2 text-green-600" />
                                    Créditos financeiros disponíveis
                                </h2>

                                {creditLoading ? (
                                    <div className="flex items-center text-sm text-gray-600">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#2d8659] mr-2"></div>
                                        Carregando créditos...
                                    </div>
                                ) : creditError ? (
                                    <p className="text-sm text-red-600">{creditError}</p>
                                ) : availableCredits.length === 0 ? (
                                    <p className="text-sm text-gray-600">
                                        Nenhum crédito disponível no momento. Cancelamentos com antecedência de 24h geram créditos automáticos.
                                    </p>
                                ) : (
                                    <div className="space-y-4">
                                        <label className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                className="form-checkbox h-5 w-5 text-[#2d8659]"
                                                checked={usingCredit}
                                                onChange={(event) => {
                                                    const enabled = event.target.checked;
                                                    setUsingCredit(enabled);
                                                    if (!enabled) {
                                                        setSelectedCreditId(null);
                                                    } else if (!selectedCreditId && availableCredits.length === 1) {
                                                        setSelectedCreditId(availableCredits[0].id);
                                                    }
                                                }}
                                                disabled={processing}
                                            />
                                            <div>
                                                <p className="font-semibold">Desejo utilizar meus créditos nesta consulta</p>
                                                <p className="text-xs text-gray-600">
                                                    Saldo disponível: {MercadoPagoService.formatCurrency(creditState.balance?.available_amount || 0)}
                                                </p>
                                            </div>
                                        </label>

                                        {usingCredit && (
                                            <div className="space-y-3">
                                                {availableCredits.map((credit) => {
                                                    const amountNumber = Number(credit.amount);
                                                    const covers = amountNumber >= bookingTotal;
                                                    return (
                                                        <button
                                                            key={credit.id}
                                                            type="button"
                                                            className={`w-full text-left border rounded-lg p-3 transition ${
                                                                selectedCreditId === credit.id
                                                                    ? 'border-[#2d8659] bg-[#2d8659]/5'
                                                                    : 'border-gray-200 hover:border-[#2d8659]/40'
                                                            } ${!covers ? 'opacity-60 cursor-not-allowed' : ''}`}
                                                            onClick={() => covers && setSelectedCreditId(credit.id)}
                                                            disabled={!covers || processing}
                                                        >
                                                            <div className="flex justify-between items-center">
                                                                <div>
                                                                    <p className="font-semibold text-sm">Crédito #{credit.id.slice(0, 8)}</p>
                                                                    <p className="text-xs text-gray-600">Origem: {credit.source_type || 'indefinido'}</p>
                                                                </div>
                                                                <span className="font-semibold text-[#2d8659]">
                                                                    {MercadoPagoService.formatCurrency(amountNumber)}
                                                                </span>
                                                            </div>
                                                            {credit.metadata?.policy && (
                                                                <p className="text-[11px] text-gray-500 mt-1">Regra: {credit.metadata.policy}</p>
                                                            )}
                                                            {!covers && (
                                                                <p className="text-xs text-yellow-700 mt-2">Valor insuficiente para cobrir o total desta consulta.</p>
                                                            )}
                                                        </button>
                                                    );
                                                })}

                                                {selectedCredit && !creditCoversTotal && (
                                                    <div className="text-xs text-red-600">
                                                        O crédito selecionado não cobre o valor total da consulta. Escolha outro crédito ou desmarque o uso de créditos.
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </Card>
                        )}

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
                                        disabled={!method.available || processing || creditCoversTotal}
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

                            {(selectedMethod === 'credit_card' || selectedMethod === 'debit_card') && !preference && (
                                <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
                                    <h4 className="font-semibold text-green-900 mb-2 flex items-center">
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Nova Opção: Formulário de Cartão Direto
                                    </h4>
                                    <ul className="text-sm text-green-800 space-y-1 mb-3">
                                        <li>✅ Pague sem sair do site</li>
                                        <li>✅ Formulário integrado e seguro</li>
                                        <li>✅ Tokenização via Mercado Pago SDK</li>
                                        <li>✅ Melhor experiência do usuário</li>
                                    </ul>
                                    <p className="text-xs text-green-700 italic">
                                        Ou escolha a opção tradicional via redirect do Mercado Pago
                                    </p>
                                </div>
                            )}

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

                        {creditCoversTotal ? (
                            <Button
                                onClick={handlePayment}
                                disabled={processing}
                                size="lg"
                                className="w-full bg-[#2d8659] hover:bg-[#236b47]"
                            >
                                {processing ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                        Confirmando crédito...
                                    </>
                                ) : (
                                    'Confirmar uso do crédito'
                                )}
                            </Button>
                        ) : (!pixPayment && !preference && (
                            <>
                                {/* Botão especial para cartão direto */}
                                {(selectedMethod === 'credit_card' || selectedMethod === 'debit_card') && (
                                    <div className="space-y-3">
                                        <Button
                                            onClick={() => {
                                                // Redirecionar para página de cartão direto com os dados
                                                const params = new URLSearchParams({
                                                    ...(bookingId && { booking_id: bookingId }),
                                                    ...(inscricaoId && { inscricao_id: inscricaoId }),
                                                    ...(type && { type }),
                                                    ...(valorParam && { valor: valorParam }),
                                                    ...(tituloParam && { titulo: tituloParam }),
                                                });
                                                navigate(`/checkout-direct?${params.toString()}`);
                                            }}
                                            size="lg"
                                            className="w-full bg-[#2d8659] hover:bg-[#236b47]"
                                        >
                                            <CreditCard className="w-5 h-5 mr-2" />
                                            Pagar com Cartão (Formulário Direto)
                                        </Button>
                                        
                                        <div className="text-center">
                                            <p className="text-xs text-gray-500 mb-2">ou</p>
                                        </div>
                                        
                                        <Button
                                            onClick={handlePayment}
                                            disabled={processing}
                                            size="lg"
                                            variant="outline"
                                            className="w-full"
                                        >
                                            {processing ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#2d8659] mr-2"></div>
                                                    Redirecionando...
                                                </>
                                            ) : (
                                                <>
                                                    Pagar via Mercado Pago (Redirect)
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                )}
                                
                                {/* Botão padrão para outros métodos */}
                                {selectedMethod !== 'credit_card' && selectedMethod !== 'debit_card' && (
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
                            </>
                        ))}
                    </div>

                    {/* Resumo do Pedido */}
                    <div>
                        <Card className="p-6 sticky top-8">
                            <h3 className="text-lg font-bold mb-4">Resumo do Pedido</h3>

                            <div className="space-y-4">
                                {type === 'evento' ? (
                                    <>
                                        <div>
                                            <p className="text-sm text-gray-600">Evento</p>
                                            <p className="font-semibold">{inscricao?.evento?.titulo || tituloParam}</p>
                                        </div>

                                        <div>
                                            <p className="text-sm text-gray-600">Participante</p>
                                            <p className="font-semibold">{inscricao?.patient_name}</p>
                                        </div>

                                        <div>
                                            <p className="text-sm text-gray-600">Data do Evento</p>
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                <p className="font-semibold">
                                                    {inscricao?.evento?.data_inicio && new Date(inscricao.evento.data_inicio).toLocaleDateString('pt-BR')}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="border-t pt-4">
                                            <div className="flex justify-between items-center mb-2">
                                                <p className="text-gray-600">Valor da Inscrição</p>
                                                <p className="font-semibold">
                                                    {MercadoPagoService.formatCurrency(inscricao?.evento?.valor || parseFloat(valorParam))}
                                                </p>
                                            </div>
                                            <div className="flex justify-between items-center text-lg font-bold">
                                                <p>Total</p>
                                                <p className="text-[#2d8659]">
                                                    {MercadoPagoService.formatCurrency(inscricao?.evento?.valor || parseFloat(valorParam))}
                                                </p>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <p className="text-sm text-gray-600">Serviço</p>
                                            <p className="font-semibold">{booking?.service?.name}</p>
                                        </div>

                                        <div>
                                            <p className="text-sm text-gray-600">Profissional</p>
                                            <p className="font-semibold">{booking?.professional?.name}</p>
                                        </div>

                                        <div>
                                            <p className="text-sm text-gray-600">Data e Horário</p>
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                <p className="font-semibold">
                                                    {booking && new Date(booking.booking_date).toLocaleDateString('pt-BR')}
                                                </p>
                                            </div>
                                            <p className="text-sm">{booking?.booking_time}</p>
                                        </div>

                                        <div className="border-t pt-4">
                                            <div className="flex justify-between items-center mb-2">
                                                <p className="text-gray-600">Subtotal</p>
                                                <p className="font-semibold">
                                                    {MercadoPagoService.formatCurrency(bookingTotal)}
                                                </p>
                                            </div>
                                            {creditCoversTotal && (
                                                <div className="flex justify-between items-center mb-2 text-green-700">
                                                    <p>Crédito aplicado</p>
                                                    <p>-{MercadoPagoService.formatCurrency(creditAppliedAmount)}</p>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center text-lg font-bold">
                                                <p>Total</p>
                                                <p className="text-[#2d8659]">
                                                    {MercadoPagoService.formatCurrency(creditCoversTotal ? 0 : bookingTotal)}
                                                </p>
                                            </div>
                                        </div>
                                    </>
                                )}

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
