import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Download, BookOpen, Sparkles, CheckCircle, Clock,
    ChevronRight, AlertCircle, User, Mail, Loader2,
    QrCode, RefreshCw, ShoppingBag, Lock
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import {
    getResourceBySlug,
    registerFreeDownload,
    createResourcePayment,
    checkPaymentStatus,
    confirmPaidDelivery,
    checkUserPaidAccess,
} from '@/services/bookResourceService';
import DoxologosLogo from '@/components/brand/DoxologosLogo';

// ================================================================
// Constantes de UX
// ================================================================
const POLLING_INTERVAL_MS = 3000; // checa pagamento a cada 3 segundos
const POLLING_MAX_ATTEMPTS = 100; // ~5 minutos de polling

// ================================================================
// Componente Principal
// ================================================================
export default function BookResourcePage() {
    const { slug } = useParams();
    const [searchParams] = useSearchParams();
    const { toast } = useToast();
    const { user } = useAuth();

    // Estado do recurso
    const [resource, setResource] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    // Estado do lead capture (download gratuito sem login)
    const [showLeadForm, setShowLeadForm] = useState(false);
    const [leadName, setLeadName] = useState('');
    const [leadEmail, setLeadEmail] = useState('');
    const [downloadingFree, setDownloadingFree] = useState(false);
    const [freeDownloaded, setFreeDownloaded] = useState(false);

    // Estado do checkout pago
    const [buyingUpgrade, setBuyingUpgrade] = useState(false);
    const [pixData, setPixData] = useState(null);
    const [downloadRecordId, setDownloadRecordId] = useState(null);
    const [paymentState, setPaymentState] = useState('idle'); // idle | pending | approved | failed
    const [paidDownloadUrl, setPaidDownloadUrl] = useState(null);
    const [hasPaidAccess, setHasPaidAccess] = useState(false);
    const [alreadyCheckedAccess, setAlreadyCheckedAccess] = useState(false);

    // Polling
    const pollingRef = useRef(null);
    const pollingAttempts = useRef(0);

    // Capturar UTM params da URL
    const utm = {
        source: searchParams.get('utm_source') || 'book_qrcode',
        medium: searchParams.get('utm_medium') || 'print',
        campaign: searchParams.get('utm_campaign') || 'book_companion',
    };

    // ================================================================
    // 1. Carregar recurso pelo slug
    // ================================================================
    useEffect(() => {
        if (!slug) return;

        const load = async () => {
            setLoading(true);
            const { data, error } = await getResourceBySlug(slug);

            if (error || !data) {
                setNotFound(true);
            } else {
                setResource(data);

                // Se usuário logado, verificar acesso pago já existente
                if (user?.id && data.has_paid_version) {
                    const { hasAccess, download } = await checkUserPaidAccess(data.id, user.id);
                    if (hasAccess) {
                        setHasPaidAccess(true);
                        setPaidDownloadUrl(download?.resource?.paid_file_url || data.paid_file_url);
                    }
                }
                setAlreadyCheckedAccess(true);
            }
            setLoading(false);
        };

        load();
    }, [slug, user?.id]);

    // Cleanup polling ao desmontar
    useEffect(() => () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
    }, []);

    // ================================================================
    // 2. Download Gratuito
    // ================================================================
    const handleFreeDownload = useCallback(async () => {
        if (!resource) return;

        // Usuário logado: baixa direto
        if (user) {
            setDownloadingFree(true);
            await registerFreeDownload({
                resourceId: resource.id,
                freeFileUrl: resource.free_file_url,
                userId: user.id,
                leadEmail: user.email,
                utm,
            });
            triggerDownload(resource.free_file_url, resource.title);
            setFreeDownloaded(true);
            setDownloadingFree(false);
            return;
        }

        // Não logado: exibir formulário de lead
        if (!showLeadForm) {
            setShowLeadForm(true);
            return;
        }

        // Validação do formulário
        if (!leadEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(leadEmail)) {
            toast({ variant: 'destructive', title: 'E-mail inválido', description: 'Por favor, informe um e-mail válido.' });
            return;
        }

        setDownloadingFree(true);
        await registerFreeDownload({
            resourceId: resource.id,
            freeFileUrl: resource.free_file_url,
            userId: null,
            leadEmail,
            leadName,
            utm,
        });
        triggerDownload(resource.free_file_url, resource.title);
        setFreeDownloaded(true);
        setDownloadingFree(false);
    }, [resource, user, showLeadForm, leadEmail, leadName, utm, toast]);

    // ================================================================
    // 3. Compra do Upgrade Clínico
    // ================================================================
    const handleBuyUpgrade = useCallback(async () => {
        if (!resource || !resource.has_paid_version) return;

        if (!user) {
            toast({
                title: 'Faça login para comprar',
                description: 'Acesse sua conta ou crie uma gratuitamente para adquirir o material clínico.',
                action: <Link to="/agendamento" className="underline text-sm">Entrar</Link>,
            });
            return;
        }

        setBuyingUpgrade(true);
        setPaymentState('idle');

        const { pixData: pix, downloadRecordId: recordId, error } = await createResourcePayment({
            resource,
            userId: user.id,
            payerEmail: user.email,
            payerName: user.user_metadata?.full_name || user.email,
        });

        if (error || !pix) {
            toast({ variant: 'destructive', title: 'Erro ao iniciar pagamento', description: error?.message || 'Tente novamente em instantes.' });
            setBuyingUpgrade(false);
            return;
        }

        setPixData(pix);
        setDownloadRecordId(recordId);
        setPaymentState('pending');
        setBuyingUpgrade(false);

        // Iniciar polling ativo
        startPolling(pix.payment_id, recordId);
    }, [resource, user, toast]);

    // ================================================================
    // 4. Polling de Status do Pagamento (Canal 2 de Redundância)
    // ================================================================
    const startPolling = useCallback((paymentId, recordId) => {
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingAttempts.current = 0;

        pollingRef.current = setInterval(async () => {
            pollingAttempts.current += 1;

            if (pollingAttempts.current > POLLING_MAX_ATTEMPTS) {
                clearInterval(pollingRef.current);
                return;
            }

            const { status } = await checkPaymentStatus(paymentId);

            if (status === 'approved') {
                clearInterval(pollingRef.current);
                setPaymentState('approved');

                // Confirmar entrega e disparar notificações
                const { downloadUrl } = await confirmPaidDelivery({
                    downloadRecordId: recordId,
                    paymentId,
                    resource,
                    payerEmail: user.email,
                    payerName: user.user_metadata?.full_name || user.email,
                    userId: user.id,
                });

                setPaidDownloadUrl(downloadUrl || resource.paid_file_url);
                setHasPaidAccess(true);

                toast({
                    title: 'Pagamento aprovado!',
                    description: 'Seu material clínico foi liberado. O link também foi enviado ao seu e-mail.',
                });

            } else if (status === 'rejected' || status === 'cancelled') {
                clearInterval(pollingRef.current);
                setPaymentState('failed');
                toast({ variant: 'destructive', title: 'Pagamento não aprovado', description: 'Tente novamente ou use outro método.' });
            }
        }, POLLING_INTERVAL_MS);
    }, [resource, user, toast]);

    // ================================================================
    // Verificação manual de pagamento (botão de fallback)
    // ================================================================
    const handleManualCheck = useCallback(async () => {
        if (!pixData?.payment_id) return;
        const { status } = await checkPaymentStatus(pixData.payment_id);
        if (status === 'approved') {
            clearInterval(pollingRef.current);
            setPaymentState('approved');
            const { downloadUrl } = await confirmPaidDelivery({
                downloadRecordId,
                paymentId: pixData.payment_id,
                resource,
                payerEmail: user?.email,
                payerName: user?.user_metadata?.full_name,
                userId: user?.id,
            });
            setPaidDownloadUrl(downloadUrl || resource.paid_file_url);
            setHasPaidAccess(true);
        } else {
            toast({ title: 'Pagamento ainda não confirmado', description: 'Aguarde alguns segundos e tente novamente.' });
        }
    }, [pixData, downloadRecordId, resource, user, toast]);

    // ================================================================
    // Helper: disparar download direto no navegador
    // ================================================================
    const triggerDownload = (url, filename) => {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || 'material-doxologos.pdf';
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    // ================================================================
    // Renders de estado
    // ================================================================

    if (loading) return <LoadingState />;
    if (notFound) return <NotFoundState />;

    return (
        <>
            <Helmet>
                <title>{resource.title} — Doxologos</title>
                <meta name="description" content={resource.description || `Material complementar do livro: ${resource.title}`} />
                <meta name="robots" content="noindex" />
            </Helmet>

            <div className="min-h-screen bg-gradient-to-br from-[#0f2d1f] via-[#1a4a30] to-[#0d2419]">
                {/* Header */}
                <header className="sticky top-0 z-10 backdrop-blur-md bg-black/20 border-b border-white/10">
                    <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
                        <Link to="/" className="flex items-center gap-2">
                            <DoxologosLogo size={28} />
                        </Link>
                        <span className="text-emerald-300 text-xs font-medium bg-emerald-900/40 px-3 py-1 rounded-full border border-emerald-700/40">
                            Material do Livro
                        </span>
                    </div>
                </header>

                <main className="max-w-lg mx-auto px-4 pb-24 pt-6">

                    {/* ── Bloco 1: Hero — Identificação do recurso ── */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="mb-6"
                    >
                        <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium mb-3">
                            <BookOpen className="w-3.5 h-3.5" />
                            {resource.chapter_number && <span>Capítulo {resource.chapter_number}</span>}
                            {resource.chapter_number && resource.book_title && <span className="text-white/40">·</span>}
                            {resource.book_title && <span className="text-white/60">{resource.book_title}</span>}
                        </div>
                        <h1 className="text-2xl font-bold text-white leading-tight mb-2">{resource.title}</h1>
                        {resource.description && (
                            <p className="text-white/70 text-sm leading-relaxed">{resource.description}</p>
                        )}
                        {resource.chapter_context && (
                            <p className="text-emerald-300/80 text-xs mt-3 italic">{resource.chapter_context}</p>
                        )}
                    </motion.div>

                    {/* ── Bloco 2: Download Gratuito ── */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        className="mb-4"
                    >
                        <Card className="bg-white/5 border border-white/10 backdrop-blur-sm overflow-hidden">
                            <CardContent className="p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                        <Download className="w-4 h-4 text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="text-white font-semibold text-sm">Material Gratuito</p>
                                        <p className="text-white/50 text-xs">Incluído com o livro</p>
                                    </div>
                                    <span className="ml-auto bg-emerald-500/20 text-emerald-300 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-500/30">
                                        GRÁTIS
                                    </span>
                                </div>

                                {/* Formulário de lead (se não logado e não ainda baixado) */}
                                <AnimatePresence>
                                    {showLeadForm && !freeDownloaded && !user && (
                                        <motion.div
                                            key="lead-form"
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="mb-4 space-y-3 overflow-hidden"
                                        >
                                            <p className="text-white/70 text-xs">Informe seus dados para receber o material:</p>
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                                <Input
                                                    id="book-lead-name"
                                                    type="text"
                                                    placeholder="Seu nome (opcional)"
                                                    value={leadName}
                                                    onChange={e => setLeadName(e.target.value)}
                                                    className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-emerald-500"
                                                />
                                            </div>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                                <Input
                                                    id="book-lead-email"
                                                    type="email"
                                                    placeholder="Seu melhor e-mail *"
                                                    value={leadEmail}
                                                    onChange={e => setLeadEmail(e.target.value)}
                                                    required
                                                    className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-emerald-500"
                                                />
                                            </div>
                                            <p className="text-white/30 text-[10px]">
                                                Ao continuar, você concorda em receber comunicações da Doxologos.
                                            </p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Botão de download gratuito */}
                                {freeDownloaded ? (
                                    <div className="flex items-center gap-3 bg-emerald-900/30 rounded-lg p-3 border border-emerald-700/30">
                                        <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-emerald-300 font-medium text-sm">Download iniciado!</p>
                                            <p className="text-white/50 text-xs">Verifique seus downloads.</p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-emerald-400 hover:text-emerald-300 text-xs shrink-0"
                                            onClick={() => triggerDownload(resource.free_file_url, resource.title)}
                                        >
                                            Baixar novamente
                                        </Button>
                                    </div>
                                ) : (
                                    <Button
                                        id="btn-free-download"
                                        onClick={handleFreeDownload}
                                        disabled={downloadingFree}
                                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold h-12 text-base transition-all"
                                    >
                                        {downloadingFree ? (
                                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Preparando...</>
                                        ) : showLeadForm && !user ? (
                                            <><Download className="w-4 h-4 mr-2" /> {resource.free_file_label || 'Baixar Agora'}</>
                                        ) : (
                                            <><Download className="w-4 h-4 mr-2" /> {resource.free_file_label || 'Baixar Material Gratuito'}</>
                                        )}
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* ── Bloco 3: Upgrade Clínico (apenas se o recurso tiver versão paga) ── */}
                    {resource.has_paid_version && (
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.2 }}
                            className="mb-6"
                        >
                            <Card className="!bg-transparent bg-gradient-to-br from-amber-900/30 to-amber-800/20 border border-amber-700/30 backdrop-blur-sm overflow-hidden">
                                <CardContent className="p-5">
                                    {/* Header do upgrade */}
                                    <div className="flex items-start gap-3 mb-4">
                                        <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                                            <Sparkles className="w-4.5 h-4.5 text-amber-400" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-amber-300 font-bold text-sm">Versão Clínica Profissional</p>
                                            <p className="text-white/60 text-xs mt-0.5">Para psicólogos e terapeutas</p>
                                        </div>
                                        <span className="bg-amber-500 text-black text-xs font-black px-2.5 py-1 rounded-full whitespace-nowrap">
                                            R$ {Number(resource.paid_price_brl).toFixed(2).replace('.', ',')}
                                        </span>
                                    </div>

                                    {/* Bridge text */}
                                    {resource.bridge_text && (
                                        <p className="text-white/70 text-xs leading-relaxed mb-4 italic">
                                            {resource.bridge_text}
                                        </p>
                                    )}

                                    {/* Diferenciais da versão clínica */}
                                    <ul className="space-y-2 mb-5">
                                        {[
                                            'PDF vetorial de alta definição para impressão em consultório',
                                            'Guia do terapeuta com perguntas de condução clínica',
                                            'Licença de uso com pacientes — uso profissional liberado',
                                        ].map((item, i) => (
                                            <li key={i} className="flex items-start gap-2 text-xs text-white/70">
                                                <CheckCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>

                                    {/* ── Estado: já possui acesso ── */}
                                    {hasPaidAccess && paidDownloadUrl ? (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 bg-amber-900/30 rounded-lg p-3 border border-amber-700/30">
                                                <CheckCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                                                <p className="text-amber-300 font-medium text-sm">Material clínico liberado!</p>
                                            </div>
                                            <Button
                                                id="btn-paid-download"
                                                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold h-12"
                                                onClick={() => triggerDownload(paidDownloadUrl, resource.paid_title || resource.title)}
                                            >
                                                <Download className="w-4 h-4 mr-2" /> Baixar Versão Clínica
                                            </Button>
                                        </div>
                                    ) : paymentState === 'pending' && pixData ? (
                                        /* ── Estado: aguardando PIX ── */
                                        <PixWaitingState
                                            pixData={pixData}
                                            onManualCheck={handleManualCheck}
                                        />
                                    ) : paymentState === 'approved' ? (
                                        /* ── Estado: aprovado (transição) ── */
                                        <div className="flex items-center gap-3 bg-emerald-900/30 rounded-lg p-3 border border-emerald-700/30">
                                            <CheckCircle className="w-5 h-5 text-emerald-400" />
                                            <p className="text-emerald-300 font-semibold text-sm">Pagamento aprovado! Liberando material...</p>
                                            <Loader2 className="w-4 h-4 text-emerald-400 animate-spin ml-auto" />
                                        </div>
                                    ) : paymentState === 'failed' ? (
                                        /* ── Estado: falha ── */
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 bg-red-900/30 rounded-lg p-3 border border-red-700/30">
                                                <AlertCircle className="w-5 h-5 text-red-400" />
                                                <p className="text-red-300 text-sm">Pagamento não confirmado. Tente novamente.</p>
                                            </div>
                                            <Button
                                                id="btn-retry-upgrade"
                                                onClick={handleBuyUpgrade}
                                                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold h-12"
                                            >
                                                Tentar novamente
                                            </Button>
                                        </div>
                                    ) : (
                                        /* ── Estado: inicial (CTA de compra) ── */
                                        <Button
                                            id="btn-buy-upgrade"
                                            onClick={handleBuyUpgrade}
                                            disabled={buyingUpgrade}
                                            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold h-12 text-base transition-all"
                                        >
                                            {buyingUpgrade ? (
                                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Preparando pagamento...</>
                                            ) : (
                                                <><ShoppingBag className="w-4 h-4 mr-2" /> {resource.paid_file_label || 'Adquirir Versão Clínica'}</>
                                            )}
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {/* ── Bloco 4: Ponte para a Plataforma ── */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.3 }}
                    >
                        <div className="text-center mb-6">
                            <p className="text-white/40 text-xs mb-4">Quer aprofundar este tema com acompanhamento profissional?</p>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <Link
                                    to="/agendamento"
                                    id="btn-agendar-consulta"
                                    className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white text-sm font-medium py-3 px-4 rounded-xl transition-all"
                                >
                                    Agendar Consulta <ChevronRight className="w-4 h-4" />
                                </Link>
                                <Link
                                    to="/quem-somos"
                                    id="btn-conhecer-doxologos"
                                    className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-sm font-medium py-3 px-4 rounded-xl transition-all"
                                >
                                    Conhecer a Doxologos <ChevronRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>

                        <p className="text-center text-white/20 text-[10px]">
                            © Doxologos Psicologia — Material exclusivo para leitores do livro
                        </p>
                    </motion.div>
                </main>
            </div>
        </>
    );
}

// ================================================================
// Sub-componente: Tela de espera do PIX com QR Code + polling visual
// ================================================================
function PixWaitingState({ pixData, onManualCheck }) {
    const [copied, setCopied] = useState(false);

    const copyCode = () => {
        navigator.clipboard.writeText(pixData.qr_code || '');
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 bg-blue-900/30 rounded-lg p-3 border border-blue-700/30">
                <Clock className="w-4 h-4 text-blue-400 flex-shrink-0 animate-pulse" />
                <p className="text-blue-300 text-xs font-medium">Aguardando confirmação do PIX...</p>
                <Loader2 className="w-3 h-3 text-blue-400 animate-spin ml-auto" />
            </div>

            {/* QR Code do PIX */}
            {(pixData.qr_code_base64 || pixData.qr_code) && (
                <div className="flex flex-col items-center gap-3 bg-white rounded-xl p-4">
                    {pixData.qr_code_base64 ? (
                        <img
                            src={`data:image/png;base64,${pixData.qr_code_base64}`}
                            alt="QR Code PIX"
                            className="w-44 h-44 object-contain"
                        />
                    ) : (
                        <QRCodeSVG value={pixData.qr_code} size={176} />
                    )}
                    <p className="text-gray-500 text-xs text-center">
                        Escaneie com o app do seu banco
                    </p>
                </div>
            )}

            {/* Copia e Cola */}
            {pixData.qr_code && (
                <Button
                    id="btn-copy-pix"
                    variant="outline"
                    className="w-full !bg-transparent border-white/20 text-white/70 hover:text-white hover:border-white/40 text-sm"
                    onClick={copyCode}
                >
                    {copied ? (
                        <><CheckCircle className="w-4 h-4 mr-2 text-emerald-400" /> Código copiado!</>
                    ) : (
                        <><QrCode className="w-4 h-4 mr-2" /> Copiar código PIX</>
                    )}
                </Button>
            )}

            {/* Fallback de verificação manual */}
            <Button
                id="btn-manual-check"
                variant="ghost"
                className="w-full text-white/40 hover:text-white/70 text-xs"
                onClick={onManualCheck}
            >
                <RefreshCw className="w-3 h-3 mr-1.5" /> Já paguei, verificar agora
            </Button>

            <p className="text-white/30 text-[10px] text-center">
                O material é liberado automaticamente em segundos após o pagamento.
            </p>
        </div>
    );
}

// ================================================================
// Sub-componente: Estado de Loading
// ================================================================
function LoadingState() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0f2d1f] via-[#1a4a30] to-[#0d2419] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
                <p className="text-white/50 text-sm">Carregando material...</p>
            </div>
        </div>
    );
}

// ================================================================
// Sub-componente: Recurso não encontrado
// ================================================================
function NotFoundState() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0f2d1f] via-[#1a4a30] to-[#0d2419] flex items-center justify-center px-4">
            <div className="text-center max-w-sm">
                <Lock className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <h1 className="text-white text-xl font-bold mb-2">Material não encontrado</h1>
                <p className="text-white/50 text-sm mb-6">
                    Este link pode estar incorreto ou o material não está mais disponível. Verifique o QR Code no livro.
                </p>
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium py-3 px-6 rounded-xl transition-all"
                >
                    Ir para a Doxologos <ChevronRight className="w-4 h-4" />
                </Link>
            </div>
        </div>
    );
}
