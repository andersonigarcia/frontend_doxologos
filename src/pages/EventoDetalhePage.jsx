
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Users, User, Mail, Smartphone, ArrowLeft, Check, AlertTriangle, Heart, Lock } from 'lucide-react';
import emailService from '@/lib/emailService';
import emailTemplates from '@/lib/emailTemplates'; // NOVO: Templates para eventos

const EventoDetalhePage = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { user, signIn } = useAuth();
    const { toast } = useToast();

    const [event, setEvent] = useState(null);
    const [inscricoesCount, setInscricoesCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isUserRegistered, setIsUserRegistered] = useState(false);
    
    const [step, setStep] = useState(1);
    const [patientData, setPatientData] = useState({ name: '', email: '', phone: '', password: '', acceptTerms: false });
    const [emailError, setEmailError] = useState('');
    const [emailStatus, setEmailStatus] = useState(null); // 'new' | 'existing' | null
    const [isProcessing, setIsProcessing] = useState(false);

    // Função para aplicar máscara no telefone
    const formatPhone = (value) => {
        const cleaned = value.replace(/\D/g, '');
        if (cleaned.length <= 10) {
            return cleaned.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
        }
        return cleaned.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    };

    // Função para validar email em tempo real
    const validateEmail = (email) => {
        if (!email) {
            setEmailError('');
            return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setEmailError('Email inválido');
            setEmailStatus(null);
            return false;
        }
        setEmailError('');
        return true;
    };

    // Função para verificar se email já existe
    const checkEmailExists = async (email) => {
        if (!validateEmail(email)) {
            setEmailStatus(null);
            return;
        }

    const trimmedEmail = email.trim();
    const normalizedEmail = trimmedEmail.toLowerCase();

        try {
            const { data: userId, error } = await supabase.rpc('get_user_id_by_email', {
                user_email: normalizedEmail,
            });

            if (error) {
                console.warn('Não foi possível verificar email via RPC, usando fallback:', error);
                const { data: inscricao } = await supabase
                    .from('inscricoes_eventos')
                    .select('user_id')
                    .eq('patient_email', trimmedEmail)
                    .limit(1)
                    .maybeSingle();

                setEmailStatus(inscricao ? 'existing' : 'new');
                return;
            }

            setEmailStatus(userId ? 'existing' : 'new');
        } catch (error) {
            console.error('Erro ao verificar email existente:', error);
            setEmailStatus(null);
        }
    };

    // Debounce para verificação de email
    useEffect(() => {
        const timer = setTimeout(() => {
            if (patientData.email && !emailError) {
                checkEmailExists(patientData.email);
            }
        }, 800);
        return () => clearTimeout(timer);
    }, [patientData.email, emailError]);

    // Função para realizar cadastro
    useEffect(() => {
        const fetchEvent = async () => {
            setLoading(true);
            console.log('🔍 Buscando evento com slug:', slug);
            
            const { data, error } = await supabase
                .from('eventos')
                .select('*')
                .eq('link_slug', slug)
                .single();

            console.log('📦 Resposta do Supabase:', { data, error });

            if (error || !data) {
                console.error('❌ Erro ao buscar evento:', error);
                setError(error?.message || 'Evento não encontrado.');
                toast({ variant: 'destructive', title: 'Erro', description: 'Este evento não existe ou não está mais disponível.' });
            } else {
                // Buscar profissional separadamente se existe professional_id
                if (data.professional_id) {
                    const { data: professionalData } = await supabase
                        .from('professionals')
                        .select('name, specialty, image_url')
                        .eq('id', data.professional_id)
                        .single();
                    
                    data.professional = professionalData;
                }

                // Buscar contagem de inscrições
                const { count, error: inscricoesError } = await supabase
                    .from('inscricoes_eventos')
                    .select('*', { count: 'exact', head: true })
                    .eq('evento_id', data.id)
                    .in('status', ['pending', 'confirmed']);

                if (inscricoesError) {
                    console.error('Erro ao contar inscrições do evento:', inscricoesError);
                }

                setEvent(data);
                setInscricoesCount(count || 0);
            }
            setLoading(false);
        };
        fetchEvent();
    }, [slug, toast]);

    useEffect(() => {
        if (user && event) {
            // Não preencher automaticamente - deixar campos vazios para o cliente digitar
            // setPatientData({ name: user.user_metadata?.name || '', email: user.email, phone: '' });
            
            const checkRegistration = async () => {
                const { data, error } = await supabase
                    .from('inscricoes_eventos')
                    .select('id')
                    .eq('evento_id', event.id)
                    .eq('user_id', user.id)
                    .single();
                
                if (data) {
                    setIsUserRegistered(true);
                }
            };
            checkRegistration();
        }
    }, [user, event]);
    
    const handleRegistration = async () => {
        setIsProcessing(true);

        const trimmedEmail = patientData.email.trim();
        const normalizedEmail = trimmedEmail.toLowerCase();
        
        // Validar campos obrigatórios
        if (!patientData.name.trim()) {
            toast({ variant: "destructive", title: "Nome obrigatório", description: "Por favor, informe seu nome completo." });
            setIsProcessing(false);
            return;
        }
        
        if (!trimmedEmail) {
            toast({ variant: "destructive", title: "Email obrigatório", description: "Por favor, informe seu email." });
            setIsProcessing(false);
            return;
        }
        
        // Validar formato do email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
            toast({ variant: "destructive", title: "Email inválido", description: "Por favor, informe um email válido." });
            setIsProcessing(false);
            return;
        }

        if (!patientData.password || patientData.password.length < 6) {
            toast({ variant: "destructive", title: "Senha obrigatória", description: "A senha deve ter no mínimo 6 caracteres." });
            setIsProcessing(false);
            return;
        }

        if (!patientData.acceptTerms) {
            toast({ variant: "destructive", title: "Aceite os termos", description: "Você precisa aceitar os termos para continuar." });
            setIsProcessing(false);
            return;
        }

        try {
            let userId;
            let existingUserId = null;

            try {
                const { data: rpcUserId, error: rpcError } = await supabase.rpc('get_user_id_by_email', {
                    user_email: normalizedEmail,
                });

                if (rpcError) {
                    console.warn('Não foi possível consultar usuário via RPC:', rpcError);
                } else {
                    existingUserId = rpcUserId ?? null;
                }
            } catch (lookupError) {
                console.error('Erro inesperado ao consultar usuário via RPC:', lookupError);
            }

            if (!existingUserId) {
                const { data: existingInscricao, error: inscricaoLookupError } = await supabase
                    .from('inscricoes_eventos')
                    .select('user_id')
                    .eq('patient_email', trimmedEmail)
                    .limit(1)
                    .maybeSingle();

                if (inscricaoLookupError) {
                    console.warn('Falha ao verificar inscrições existentes:', inscricaoLookupError);
                }

                existingUserId = existingInscricao?.user_id ?? null;
            }

            const emailExists = !!existingUserId;
            
            if (emailExists) {
                // Email já existe - tentar fazer login
                const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                    email: trimmedEmail,
                    password: patientData.password
                });

                if (signInData?.user && !signInError) {
                    // Login bem-sucedido
                    userId = signInData.user.id;
                    if (!userId && existingUserId) {
                        userId = existingUserId;
                    }
                    toast({ 
                        title: "Login realizado!", 
                        description: "Continuando com sua inscrição no evento..."
                    });
                } else {
                    // Senha incorreta
                    toast({ 
                        variant: "destructive",
                        title: "Credenciais inválidas", 
                        description: "Este email já possui cadastro. A senha informada está incorreta.",
                        action: (
                            <a 
                                href={`/recuperar-senha?email=${encodeURIComponent(patientData.email)}`}
                                className="text-sm underline"
                            >
                                Esqueceu sua senha?
                            </a>
                        )
                    });
                    setIsProcessing(false);
                    return;
                }
            } else {
                // Email novo - criar conta
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email: trimmedEmail,
                    password: patientData.password,
                    options: {
                        data: {
                            name: patientData.name.trim(),
                            phone: patientData.phone.trim(),
                            role: 'patient'
                        }
                    }
                });

                if (authError) {
                    toast({ 
                        variant: "destructive", 
                        title: "Erro ao criar conta", 
                        description: authError.message 
                    });
                    setIsProcessing(false);
                    return;
                }

                userId = authData.user.id;

                // Fazer login automático
                const { error: autoSignInError } = await supabase.auth.signInWithPassword({
                    email: trimmedEmail,
                    password: patientData.password
                });

                if (autoSignInError) {
                    console.error('Erro ao fazer login automático:', autoSignInError);
                }

                toast({ 
                    title: "🎉 Bem-vindo!", 
                    description: "Criamos sua conta e você já está inscrito! Enviamos um email com os detalhes do evento."
                });
            }

            // ========================================
            // VALIDAÇÃO DE VAGAS DISPONÍVEIS
            // ========================================
            if (event.vagas_disponiveis && event.vagas_disponiveis > 0) {
                const { count: vagasOcupadas, error: countError } = await supabase
                    .from('inscricoes_eventos')
                    .select('*', { count: 'exact', head: true })
                    .eq('evento_id', event.id)
                    .eq('status', 'confirmed');

                if (countError) {
                    console.error('Erro ao contar vagas:', countError);
                }

                if (vagasOcupadas >= event.vagas_disponiveis) {
                    toast({ 
                        variant: "destructive", 
                        title: "Evento esgotado! 😢", 
                        description: "Todas as vagas foram preenchidas. Entre em contato para lista de espera."
                    });
                    setIsProcessing(false);
                    return;
                }

                console.log(`✅ Vagas disponíveis: ${event.vagas_disponiveis - vagasOcupadas} de ${event.vagas_disponiveis}`);
            }

            // ========================================
            // REGISTRAR INSCRIÇÃO NO EVENTO
            // ========================================
            const statusInicial = event.valor === 0 ? 'confirmed' : 'pending';
            const paymentStatusInicial = event.valor === 0 ? null : 'pending';

            const { data: inscricaoData, error } = await supabase.from('inscricoes_eventos').insert([
                { 
                    evento_id: event.id, 
                    user_id: userId, 
                    patient_name: patientData.name.trim(), 
                    patient_email: trimmedEmail,
                    status: statusInicial, // 'confirmed' (gratuito) ou 'pending' (pago)
                    payment_status: paymentStatusInicial, // null (gratuito) ou 'pending' (pago)
                    valor_pago: event.valor || 0
                }
            ]).select();

            if (error) {
                toast({ variant: "destructive", title: "Erro na inscrição", description: error.message });
                setIsProcessing(false);
                return;
            }

            const inscricao = inscricaoData[0];
            console.log('✅ Inscrição registrada:', inscricao);

            // ========================================
            // ENVIAR EMAIL BASEADO NO TIPO DE EVENTO
            // ========================================
            
            if (event.valor === 0) {
                // ========================================
                // EVENTO GRATUITO: Enviar link Zoom imediatamente
                // ========================================
                try {
                    const emailHtml = emailTemplates.eventoGratuitoConfirmado(inscricao, event);
                    
                    await emailService.sendEmail({
                        to: trimmedEmail,
                        subject: `✅ Inscrição Confirmada - ${event.titulo}`,
                        html: emailHtml,
                        type: 'eventRegistration'
                    });

                    // Marcar email como enviado
                    await supabase
                        .from('inscricoes_eventos')
                        .update({ 
                            zoom_link_sent: true, 
                            zoom_link_sent_at: new Date().toISOString() 
                        })
                        .eq('id', inscricao.id);

                    console.log('✅ Email gratuito com link Zoom enviado');
                } catch (emailError) {
                    console.error('⚠️ Erro ao enviar email (não crítico):', emailError);
                }
            } else {
                // ========================================
                // EVENTO PAGO: Gerar PIX e enviar QR Code
                // ========================================
                try {
                    console.log('💳 Gerando pagamento PIX para evento...');
                    
                    // Chamar Edge Function para gerar PIX
                    const { data: pixData, error: pixError } = await supabase.functions.invoke('mp-create-payment', {
                        body: {
                            transaction_amount: parseFloat(event.valor),
                            description: `Inscrição - ${event.titulo}`,
                            payment_method_id: 'pix',
                            payer: {
                                email: trimmedEmail,
                                first_name: patientData.name.split(' ')[0],
                                last_name: patientData.name.split(' ').slice(1).join(' ') || patientData.name.split(' ')[0]
                            },
                            external_reference: `EVENTO_${inscricao.id}`, // CRÍTICO: Prefixo EVENTO_
                            notification_url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mp-webhook`
                        }
                    });

                    if (pixError || !pixData) {
                        throw new Error('Erro ao gerar pagamento PIX');
                    }

                    console.log('✅ PIX gerado com sucesso:', pixData.id);

                    // Atualizar inscrição com payment_id
                    await supabase
                        .from('inscricoes_eventos')
                        .update({ payment_id: pixData.id })
                        .eq('id', inscricao.id);

                    // Enviar email com QR Code PIX
                    const pixQrCode = pixData.point_of_interaction.transaction_data.qr_code_base64;
                    const pixCode = pixData.point_of_interaction.transaction_data.qr_code;

                    const emailHtml = emailTemplates.eventoPagoAguardandoPagamento(inscricao, event, {
                        qr_code_base64: pixQrCode,
                        qr_code: pixCode
                    });

                    await emailService.sendEmail({
                        to: trimmedEmail,
                        subject: `💳 Pagamento Pendente - ${event.titulo}`,
                        html: emailHtml,
                        type: 'eventPayment'
                    });

                    console.log('✅ Email com QR Code PIX enviado');
                } catch (pixOrEmailError) {
                    console.error('❌ Erro ao processar pagamento PIX:', pixOrEmailError);
                    toast({
                        variant: "destructive",
                        title: "Erro ao gerar pagamento",
                        description: "Sua inscrição foi registrada, mas houve erro no pagamento. Entre em contato."
                    });
                }
            }

            // ========================================
            // FINALIZAÇÃO E FEEDBACK
            // ========================================
            if (event.valor > 0) {
                // Evento pago: mostrar confirmação de pagamento pendente
                setStep(3);
                toast({ 
                    title: "📧 Inscrição registrada!", 
                    description: "Enviamos um email com o QR Code PIX. Após o pagamento, você receberá o link da sala Zoom."
                });
            } else {
                // Evento gratuito: confirmar imediatamente
                setStep(3);
                toast({ 
                    title: "✅ Inscrição confirmada!", 
                    description: "Enviamos um email com o link da sala Zoom e instruções de acesso."
                });
            }

        } catch (error) {
            console.error('Erro no processo de inscrição:', error);
            toast({ 
                variant: "destructive", 
                title: "Erro ao processar inscrição", 
                description: error.message 
            });
        } finally {
            setIsProcessing(false);
        }
    };

    if (loading) return <div className="flex justify-center items-center min-h-screen">Carregando evento...</div>;
    if (error) return <div className="flex justify-center items-center min-h-screen text-red-500">{error}</div>;
    if (!event) return null;

    const vagasRestantes = event.limite_participantes - inscricoesCount;
    const isSoldOut = vagasRestantes <= 0;
    const isPastDeadline = new Date(event.data_limite_inscricao) < new Date();

    const renderContent = () => {
        if (step === 3) { // Confirmação
            const isEventoPago = event.valor > 0;
            
            return (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-6">
                    <Check className="w-16 h-16 mx-auto text-green-500 bg-green-100 rounded-full p-3 mb-4" />
                    
                    <div>
                        <h2 className="text-3xl font-bold mb-4">
                            {isEventoPago ? '📧 Inscrição Registrada!' : '✅ Inscrição Confirmada!'}
                        </h2>
                        
                        {isEventoPago ? (
                            <div className="space-y-3 text-gray-600">
                                <p className="text-lg">Enviamos um <strong>email com as informações para pagamento</strong>.</p>
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left">
                                    <p className="text-sm font-semibold text-amber-800 mb-2">⏰ Próximos passos:</p>
                                    <ol className="text-sm space-y-1 list-decimal list-inside text-amber-900">
                                        <li>Acesse a <strong>Área do Paciente</strong> no site</li>
                                        <li>Escolha o evento e realize o pagamento </li>
                                        <li>Aguarde a confirmação automática (até 5 minutos)</li>
                                        <li>O <strong>link da sala Zoom</strong> será disponibilizado na Área do Paciente</li>
                                    </ol>
                                </div>
                                <p className="text-sm text-gray-500 mt-4">
                                    💡 Valor: <strong>R$ {parseFloat(event.valor).toFixed(2).replace('.', ',')}</strong>
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3 text-gray-600">
                                <p className="text-lg">Sua vaga está <strong className="text-green-600">confirmada</strong>! 🎉</p>
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left">
                                    <p className="text-sm font-semibold text-green-800 mb-2">📧 Email enviado com:</p>
                                    <ul className="text-sm space-y-1 list-disc list-inside text-green-900">
                                        <li><strong>Link da sala Zoom</strong></li>
                                        <li>Senha de acesso</li>
                                        <li>Instruções para primeiro acesso</li>
                                        <li>Checklist de preparação</li>
                                    </ul>
                                </div>
                                <p className="text-sm text-gray-500 mt-4">
                                    💚 Evento gratuito - Nenhum pagamento necessário
                                </p>
                            </div>
                        )}
                    </div>
                    
                    <div className="pt-4">
                        <Link to="/">
                            <Button className="bg-[#2d8659] hover:bg-[#236b47]">
                                Voltar para a Página Inicial
                            </Button>
                        </Link>
                    </div>
                </motion.div>
            );
        }
        
        // Formulário de Inscrição Express (único formulário)
        return (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <h2 className="text-2xl font-bold mb-6">Confirme seus dados para inscrição</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Nome Completo *</label>
                        <div className="flex items-center gap-2 p-3 border rounded-lg focus-within:border-[#2d8659] transition-colors">
                            <User className="w-5 h-5 text-gray-500"/>
                            <input
                                type="text"
                                placeholder="Digite seu nome completo"
                                value={patientData.name}
                                onChange={(e) => setPatientData({...patientData, name: e.target.value})}
                                className="flex-1 outline-none bg-transparent"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Email *</label>
                        <div className={`flex items-center gap-2 p-3 border rounded-lg transition-colors ${
                            emailError ? 'border-red-500' : 'focus-within:border-[#2d8659]'
                        }`}>
                            <Mail className={`w-5 h-5 ${emailError ? 'text-red-500' : 'text-gray-500'}`}/>
                            <input
                                type="email"
                                placeholder="seu@email.com"
                                value={patientData.email}
                                onChange={(e) => {
                                    setPatientData({...patientData, email: e.target.value});
                                    validateEmail(e.target.value);
                                }}
                                onBlur={(e) => validateEmail(e.target.value)}
                                className="flex-1 outline-none bg-transparent"
                                required
                            />
                        </div>
                        {emailError && (
                            <p className="text-red-500 text-xs mt-1">{emailError}</p>
                        )}
                        {emailStatus === 'existing' && !emailError && (
                            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg mt-2">
                                <p className="text-sm text-blue-800 font-medium mb-1">
                                    ✓ Detectamos que você já tem conta
                                </p>
                                <p className="text-xs text-blue-600">
                                    Digite sua senha para continuar. 
                                    <a 
                                        href={`/recuperar-senha?email=${encodeURIComponent(patientData.email)}`}
                                        target="_blank"
                                        className="ml-1 underline hover:text-blue-800"
                                    >
                                        Esqueceu sua senha?
                                    </a>
                                </p>
                            </div>
                        )}
                        {emailStatus === 'new' && !emailError && (
                            <div className="bg-green-50 border border-green-200 p-3 rounded-lg mt-2">
                                <p className="text-sm text-green-800 font-medium mb-1">
                                    ✓ Email disponível
                                </p>
                                <p className="text-xs text-green-600">
                                    Criaremos sua conta automaticamente. Escolha uma senha para acessar futuramente.
                                </p>
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Telefone (opcional)</label>
                        <div className="flex items-center gap-2 p-3 border rounded-lg focus-within:border-[#2d8659] transition-colors">
                            <Smartphone className="w-5 h-5 text-gray-500"/>
                            <input
                                type="tel"
                                placeholder="(00) 00000-0000"
                                value={patientData.phone}
                                onChange={(e) => setPatientData({...patientData, phone: formatPhone(e.target.value)})}
                                className="flex-1 outline-none bg-transparent"
                                maxLength={15}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Senha * 
                            {emailStatus === 'existing' && (
                                <span className="text-blue-600 text-xs ml-2">(Use sua senha cadastrada)</span>
                            )}
                            {emailStatus === 'new' && (
                                <span className="text-green-600 text-xs ml-2">(Crie uma senha segura)</span>
                            )}
                        </label>
                        <div className={`flex items-center gap-2 p-3 border rounded-lg transition-colors ${
                            patientData.password && patientData.password.length < 6 ? 'border-red-500' : 'focus-within:border-[#2d8659]'
                        }`}>
                            <Lock className={`w-5 h-5 ${patientData.password && patientData.password.length < 6 ? 'text-red-500' : 'text-gray-500'}`}/>
                            <input
                                type="password"
                                placeholder={emailStatus === 'existing' ? 'Digite sua senha' : 'Mínimo 6 caracteres'}
                                value={patientData.password}
                                onChange={(e) => setPatientData({...patientData, password: e.target.value})}
                                className="flex-1 outline-none bg-transparent"
                                required
                            />
                        </div>
                        {patientData.password && patientData.password.length < 6 && (
                            <p className="text-red-500 text-xs mt-1">A senha deve ter no mínimo 6 caracteres</p>
                        )}
                    </div>
                    <div className="flex items-start gap-2">
                        <input
                            type="checkbox"
                            id="acceptTerms"
                            checked={patientData.acceptTerms}
                            onChange={(e) => setPatientData({...patientData, acceptTerms: e.target.checked})}
                            className="mt-1"
                        />
                        <label htmlFor="acceptTerms" className="text-sm text-gray-600">
                            Li e aceito os{' '}
                            <a href="/termos-e-condicoes" target="_blank" className="text-[#2d8659] hover:underline font-medium">
                                termos e condições
                            </a>
                            {' '}*
                        </label>
                    </div>
                </div>
                <div className="mt-8">
                    {isUserRegistered ? (
                         <div className="text-center p-4 bg-blue-100 text-blue-800 rounded-lg flex items-center justify-center gap-2"><Check className="w-5 h-5"/> Você já está inscrito neste evento.</div>
                    ) : isSoldOut || isPastDeadline ? (
                        <div className="text-center p-4 bg-red-100 text-red-800 rounded-lg flex items-center justify-center gap-2"><AlertTriangle className="w-5 h-5"/> Inscrições encerradas.</div>
                    ) : (
                        <Button 
                            onClick={handleRegistration} 
                            disabled={isProcessing}
                            className="w-full bg-[#2d8659] hover:bg-[#236b47] text-lg py-6"
                        >
                            {isProcessing ? 'Processando...' : 'Confirmar Inscrição e Pagar'}
                        </Button>
                    )}
                </div>
            </motion.div>
        );
    };

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#2d8659] mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando evento...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !event) {
        return (
            <div className="min-h-screen bg-gray-50">
                <header className="bg-white shadow-sm sticky top-0 z-20">
                    <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
                        <Link to="/" className="flex items-center space-x-2">
                            <Heart className="w-8 h-8 text-[#2d8659]" />
                            <span className="text-2xl font-bold gradient-text">Doxologos</span>
                        </Link>
                        <Link to="/">
                            <Button variant="outline" className="border-[#2d8659] text-[#2d8659]">
                                <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                            </Button>
                        </Link>
                    </nav>
                </header>
                <main className="py-12 md:py-20">
                    <div className="container mx-auto px-4 max-w-2xl text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-xl shadow-lg p-8"
                        >
                            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                            <h1 className="text-3xl font-bold mb-4">Evento não encontrado</h1>
                            <p className="text-gray-600 mb-6">
                                {error || 'Este evento não existe ou não está mais disponível.'}
                            </p>
                            <Link to="/#eventos">
                                <Button className="bg-[#2d8659] hover:bg-[#236b47]">
                                    Ver Todos os Eventos
                                </Button>
                            </Link>
                        </motion.div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <>
            <Helmet>
                <title>{event.titulo} - Doxologos</title>
                <meta name="description" content={event.descricao} />
            </Helmet>
            <div className="min-h-screen bg-gray-50">
                <header className="bg-white shadow-sm sticky top-0 z-20">
                    <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
                        <Link to="/" className="flex items-center space-x-2"><Heart className="w-8 h-8 text-[#2d8659]" /><span className="text-2xl font-bold gradient-text">Doxologos</span></Link>
                        <Link to="/"><Button variant="outline" className="border-[#2d8659] text-[#2d8659]"><ArrowLeft className="w-4 h-4 mr-2" /> Voltar</Button></Link>
                    </nav>
                </header>
                <main className="py-12 md:py-20">
                    <div className="container mx-auto px-4 max-w-6xl">
                        <div className="grid lg:grid-cols-5 gap-8 lg:gap-12">
                            <div className="lg:col-span-3">
                                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                                    <span className="inline-block bg-[#2d8659]/10 text-[#2d8659] font-semibold px-3 py-1 rounded-full text-sm mb-4">{event.tipo_evento}</span>
                                    <h1 className="text-4xl md:text-5xl font-bold mb-6">{event.titulo}</h1>
                                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-gray-600 mb-6">
                                        <div className="flex items-center"><Calendar className="w-5 h-5 mr-2 text-[#2d8659]" /> {new Date(event.data_inicio).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                                        <div className="flex items-center"><Clock className="w-5 h-5 mr-2 text-[#2d8659]" /> {new Date(event.data_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - {new Date(event.data_fim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                                        <div className="flex items-center"><Users className="w-5 h-5 mr-2 text-[#2d8659]" /> {vagasRestantes > 0 ? `${vagasRestantes} vagas restantes` : 'Vagas esgotadas'}</div>
                                    </div>
                                    {event.valor > 0 && (
                                        <div className="bg-gradient-to-r from-[#2d8659]/10 to-[#2d8659]/5 border-l-4 border-[#2d8659] p-4 rounded-lg mb-6">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm text-gray-600 font-medium">Investimento</p>
                                                    <p className="text-3xl font-bold text-[#2d8659]">
                                                        R$ {parseFloat(event.valor).toFixed(2).replace('.', ',')}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-gray-500">Pagamento via PIX</p>
                                                    <p className="text-xs text-gray-500">Confirmação imediata</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {event.valor === 0 && (
                                        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg mb-6">
                                            <p className="text-green-700 font-semibold text-lg">🎉 Evento Gratuito!</p>
                                            <p className="text-green-600 text-sm">Inscreva-se e garanta sua vaga</p>
                                        </div>
                                    )}
                                    <div className="prose max-w-none text-gray-700">
                                        <p>{event.descricao}</p>
                                    </div>

                                    {event.professional && (
                                        <div className="mt-10 pt-8 border-t">
                                            <h3 className="text-2xl font-bold mb-4">Ministrado por</h3>
                                            <div className="flex items-center gap-4">
                                                <img 
                                                    className="w-20 h-20 rounded-full object-cover" 
                                                    alt={`Foto de ${event.professional.name}`} 
                                                    src={event.professional.image_url || "https://images.unsplash.com/photo-1560439450-6b5a38bc9dd5?w=400&h=400&fit=crop&crop=face"} 
                                                />
                                                <div>
                                                    <h4 className="text-xl font-bold">{event.professional.name}</h4>
                                                    <p className="text-[#2d8659] font-semibold">{event.professional.specialty}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            </div>
                            <div className="lg:col-span-2">
                                <div className="sticky top-28 bg-white rounded-xl shadow-lg p-8">
                                    {renderContent()}
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
};

export default EventoDetalhePage;
