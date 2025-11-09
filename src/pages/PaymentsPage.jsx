import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
    CreditCard, DollarSign, TrendingUp, AlertCircle, CheckCircle, 
    Clock, Filter, Download, RefreshCw, Eye, ArrowLeft,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RotateCcw,
    UploadCloud, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import MercadoPagoService from '@/lib/mercadoPagoService';
import { submitManualRefund, MAX_MANUAL_REFUND_PROOF_SIZE, fetchManualRefunds, getManualRefundProof } from '@/lib/manualRefundService';

const VIEWER_ROLES = new Set(['admin', 'professional', 'finance_admin', 'finance_supervisor', 'finance_team']);
const MANUAL_REFUND_ROLES = new Set(['admin', 'finance_admin', 'finance_supervisor', 'finance_team']);

const PaymentsPage = () => {
    const { toast } = useToast();
    const { user, userRole } = useAuth();
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [filters, setFilters] = useState({
        status: '',
        payment_method: '',
        date_from: '',
        date_to: '',
        payer_email: ''
    });
    const [stats, setStats] = useState({
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
        totalAmount: 0,
        approvedAmount: 0
    });
    const fileInputRef = useRef(null);
    const [manualRefundDialogOpen, setManualRefundDialogOpen] = useState(false);
    const [manualRefundPayment, setManualRefundPayment] = useState(null);
    const [manualRefundForm, setManualRefundForm] = useState(() => createInitialManualRefundForm());
    const [manualRefundFile, setManualRefundFile] = useState(null);
    const [manualRefundLoading, setManualRefundLoading] = useState(false);
    const [manualRefundError, setManualRefundError] = useState(null);
    const [refundsByPayment, setRefundsByPayment] = useState({});
    const [refundErrorsByPayment, setRefundErrorsByPayment] = useState({});
    const [refundsLoadingPaymentId, setRefundsLoadingPaymentId] = useState(null);
    const [proofDownloadId, setProofDownloadId] = useState(null);

    const canViewPayments = userRole ? VIEWER_ROLES.has(userRole) : false;
    const canPerformManualRefund = userRole ? MANUAL_REFUND_ROLES.has(userRole) : false;

    const fetchPayments = useCallback(async () => {
        setLoading(true);
        try {
            const result = await MercadoPagoService.listPayments(filters);
            
            if (result.success) {
                setPayments(result.data);
                calculateStats(result.data);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Erro ao carregar pagamentos',
                    description: result.error
                });
            }
        } catch (error) {
            console.error('Erro ao buscar pagamentos:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível carregar os pagamentos'
            });
        } finally {
            setLoading(false);
        }
    }, [filters, toast]);

    useEffect(() => {
        if (user && canViewPayments) {
            fetchPayments();
        }
    }, [user, canViewPayments, fetchPayments]);

    // Resetar para primeira página quando filtros mudarem
    useEffect(() => {
        setCurrentPage(1);
    }, [filters]);

    // Calcular paginação
    const totalPages = Math.ceil(payments.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedPayments = payments.slice(startIndex, endIndex);

    const goToPage = (page) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    };

    const selectedPaymentRefunds = selectedPayment?.id ? refundsByPayment[selectedPayment.id] : null;
    const selectedPaymentRefundsLoading = selectedPayment?.id ? refundsLoadingPaymentId === selectedPayment.id : false;
    const selectedPaymentRefundsError = selectedPayment?.id ? refundErrorsByPayment[selectedPayment.id] : null;

    useEffect(() => {
        if (!selectedPayment) {
            return;
        }

        const updated = payments.find((payment) => payment.id === selectedPayment.id);
        if (updated && updated !== selectedPayment) {
            setSelectedPayment(updated);
        } else if (!updated) {
            setSelectedPayment(null);
        }
    }, [payments, selectedPayment]);

    const calculateStats = (paymentsData) => {
        const stats = {
            total: paymentsData.length,
            approved: paymentsData.filter(p => p.status === 'approved').length,
            pending: paymentsData.filter(p => p.status === 'pending' || p.status === 'in_process').length,
            rejected: paymentsData.filter(p => p.status === 'rejected' || p.status === 'cancelled').length,
            totalAmount: paymentsData.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0),
            approvedAmount: paymentsData.filter(p => p.status === 'approved').reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
        };
        setStats(stats);
    };

    const openManualRefundDialog = (payment) => {
        if (!payment || !canPerformManualRefund) {
            return;
        }

        const formattedAmount = MercadoPagoService.formatCurrency(payment.amount);
        const defaultMessage = [
            'Olá,',
            '',
            `Informamos que o reembolso do pagamento ${payment.mp_payment_id || payment.id} foi registrado.`,
            `Valor reembolsado: ${formattedAmount}.`,
            '',
            'Em breve o valor estará disponível no seu extrato.',
            '',
            'Atenciosamente,',
            'Equipe Financeira Doxologos'
        ].join('\n');

        const normalizedCurrency = payment.currency ? String(payment.currency).toUpperCase() : 'BRL';
        const allowedCurrency = ['BRL', 'USD', 'EUR'].includes(normalizedCurrency) ? normalizedCurrency : 'BRL';

        setManualRefundPayment(payment);
        setManualRefundForm({
            amount: payment.amount != null ? String(payment.amount) : '',
            currency: allowedCurrency,
            reason: '',
            notificationEmail: payment.payer_email || '',
            notificationSubject: 'Seu reembolso foi processado',
            notificationMessage: defaultMessage,
            notificationCc: '',
        });
        setManualRefundFile(null);
        setManualRefundError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        setManualRefundDialogOpen(true);
    };

    const closeManualRefundDialog = () => {
        setManualRefundDialogOpen(false);
        setManualRefundPayment(null);
        setManualRefundForm(createInitialManualRefundForm());
        setManualRefundFile(null);
        setManualRefundError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleManualRefundFieldChange = (field) => (event) => {
        const value = event?.target?.value ?? '';
        setManualRefundForm((prev) => ({
            ...prev,
            [field]: field === 'currency' ? value.toUpperCase() : value,
        }));
    };

    const handleManualRefundFileChange = (event) => {
        const file = event?.target?.files?.[0] ?? null;

        if (!file) {
            setManualRefundFile(null);
            return;
        }

        if (file.size > MAX_MANUAL_REFUND_PROOF_SIZE) {
            setManualRefundError(`O comprovante deve ter até ${formatFileSize(MAX_MANUAL_REFUND_PROOF_SIZE)}.`);
            if (event.target) {
                event.target.value = '';
            }
            setManualRefundFile(null);
            return;
        }

        setManualRefundError(null);
        setManualRefundFile(file);
    };

    const loadManualRefunds = useCallback(async (paymentId, options = {}) => {
        const { force = false } = options;

        if (!paymentId || !canPerformManualRefund) {
            return;
        }

        if (!force && refundsByPayment[paymentId]) {
            return;
        }

        setRefundsLoadingPaymentId(paymentId);
        setRefundErrorsByPayment((prev) => ({ ...prev, [paymentId]: null }));

        try {
            const refunds = await fetchManualRefunds(paymentId);
            setRefundsByPayment((prev) => ({ ...prev, [paymentId]: refunds }));
        } catch (error) {
            console.error('Erro ao carregar reembolsos manuais:', error);
            setRefundErrorsByPayment((prev) => ({
                ...prev,
                [paymentId]: error?.message || 'Não foi possível carregar os reembolsos manuais.',
            }));
        } finally {
            setRefundsLoadingPaymentId((current) => (current === paymentId ? null : current));
        }
    }, [canPerformManualRefund, refundsByPayment]);

    useEffect(() => {
        if (canPerformManualRefund && selectedPayment?.id) {
            loadManualRefunds(selectedPayment.id);
        }
    }, [canPerformManualRefund, selectedPayment, loadManualRefunds]);

    const handleManualRefundSubmit = async (event) => {
        event.preventDefault();

        if (!manualRefundPayment) {
            setManualRefundError('Selecione um pagamento válido para registrar o reembolso.');
            return;
        }

        if (!manualRefundFile) {
            setManualRefundError('Anexe o comprovante do reembolso para seguir.');
            return;
        }

        if (manualRefundFile.size > MAX_MANUAL_REFUND_PROOF_SIZE) {
            setManualRefundError(`O comprovante deve ter até ${formatFileSize(MAX_MANUAL_REFUND_PROOF_SIZE)}.`);
            return;
        }

        const reason = manualRefundForm.reason.trim();
        if (!reason) {
            setManualRefundError('Informe o motivo do reembolso.');
            return;
        }

        const amountValue = parseAmountInput(manualRefundForm.amount);
        if (manualRefundForm.amount && (amountValue === null || amountValue <= 0)) {
            setManualRefundError('Informe um valor de reembolso válido.');
            return;
        }

        setManualRefundLoading(true);
        setManualRefundError(null);

        try {
            const paymentId = manualRefundPayment.id;
            const proofBase64 = await readFileAsDataUrl(manualRefundFile);
            const proofChecksum = await computeSHA256Hex(manualRefundFile);

            const metadata = {};
            if (manualRefundPayment.booking_id) {
                metadata.booking_id = manualRefundPayment.booking_id;
            }
            if (manualRefundPayment.mp_payment_id) {
                metadata.mercadopago_payment_id = manualRefundPayment.mp_payment_id;
            }

            const notificationPayload = {};
            const recipient = manualRefundForm.notificationEmail.trim();
            if (recipient) {
                notificationPayload.recipient_email = recipient;
            }

            const ccList = manualRefundForm.notificationCc
                .split(/[,;\n]/)
                .map((item) => item.trim())
                .filter(Boolean);
            if (ccList.length > 0) {
                notificationPayload.cc_emails = ccList;
            }

            const subject = manualRefundForm.notificationSubject.trim();
            if (subject) {
                notificationPayload.subject = subject;
            }

            const message = manualRefundForm.notificationMessage.trim();
            if (message) {
                notificationPayload.message = message;
            }

            const payload = {
                payment_id: manualRefundPayment.id,
                amount: amountValue ?? null,
                currency: manualRefundForm.currency.trim() ? manualRefundForm.currency.trim().toUpperCase() : null,
                reason,
                proof_base64: proofBase64,
                proof_filename: manualRefundFile.name,
                proof_checksum: proofChecksum,
            };

            if (Object.keys(metadata).length > 0) {
                payload.metadata = metadata;
            }

            if (Object.keys(notificationPayload).length > 0) {
                payload.notification = notificationPayload;
            }

            await submitManualRefund(payload);

            toast({
                title: 'Reembolso manual registrado',
                description: 'O pagamento foi marcado como reembolsado com sucesso.',
            });

            closeManualRefundDialog();
            fetchPayments();
            setRefundsByPayment((prev) => {
                const next = { ...prev };
                delete next[paymentId];
                return next;
            });
            if (canPerformManualRefund) {
                loadManualRefunds(paymentId, { force: true });
            }
        } catch (error) {
            console.error('Erro ao registrar reembolso manual:', error);
            setManualRefundError(error?.message || 'Não foi possível registrar o reembolso manual.');
        } finally {
            setManualRefundLoading(false);
        }
    };

    const handleManualRefundProofDownload = async (entry) => {
        const refundId = entry?.refund?.id;
        if (!refundId) {
            return;
        }

        setProofDownloadId(refundId);

        try {
            const { signed_url: signedUrl } = await getManualRefundProof(refundId);

            if (!signedUrl) {
                toast({
                    variant: 'destructive',
                    title: 'Link indisponível',
                    description: 'Não foi possível gerar o link temporário do comprovante.',
                });
                return;
            }

            window.open(signedUrl, '_blank', 'noopener');
        } catch (error) {
            console.error('Erro ao gerar link do comprovante de reembolso manual:', error);
            toast({
                variant: 'destructive',
                title: 'Erro ao abrir comprovante',
                description: error?.message || 'Não foi possível gerar o link do comprovante.',
            });
        } finally {
            setProofDownloadId(null);
        }
    };

    const clearFilters = () => {
        setFilters({
            status: '',
            payment_method: '',
            date_from: '',
            date_to: '',
            payer_email: ''
        });
    };

    const exportToCSV = () => {
        const csv = [
            ['Data', 'ID Pagamento', 'Paciente', 'Email', 'Método', 'Valor', 'Status'].join(','),
            ...payments.map(p => [
                new Date(p.created_at).toLocaleDateString('pt-BR'),
                p.mp_payment_id || '',
                p.payer_name || p.booking?.patient_name || '',
                p.payer_email || p.booking?.patient_email || '',
                MercadoPagoService.getPaymentMethodLabel(p.payment_method),
                p.amount,
                MercadoPagoService.getStatusLabel(p.status)
            ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pagamentos_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    if (!user || !canViewPayments) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Card className="p-8 text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Acesso Negado</h2>
                    <p className="text-gray-600 mb-4">Você não tem permissão para acessar esta página</p>
                    <Link to="/"><Button>Voltar para Home</Button></Link>
                </Card>
            </div>
        );
    }

    return (
        <>
            <Helmet>
                <title>Gerenciamento de Pagamentos - Doxologos</title>
            </Helmet>

            <div className="min-h-screen bg-gray-50 py-8 px-4">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <Link to="/admin" className="inline-flex items-center text-[#2d8659] hover:text-[#236b47] mb-4">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Voltar para Admin
                        </Link>
                        <h1 className="text-4xl font-bold mb-2 flex items-center">
                            <CreditCard className="w-10 h-10 mr-3 text-[#2d8659]" />
                            Gerenciamento de Pagamentos
                        </h1>
                        <p className="text-gray-600">Acompanhe e gerencie todos os pagamentos da plataforma</p>
                    </div>

                    {/* Cards de Estatísticas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <Card className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Total de Pagamentos</p>
                                    <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                                </div>
                                <DollarSign className="w-12 h-12 text-blue-500 opacity-50" />
                            </div>
                        </Card>

                        <Card className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Aprovados</p>
                                    <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
                                </div>
                                <CheckCircle className="w-12 h-12 text-green-500 opacity-50" />
                            </div>
                        </Card>

                        <Card className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Pendentes</p>
                                    <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
                                </div>
                                <Clock className="w-12 h-12 text-yellow-500 opacity-50" />
                            </div>
                        </Card>

                        <Card className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Valor Aprovado</p>
                                    <p className="text-2xl font-bold text-[#2d8659]">
                                        {MercadoPagoService.formatCurrency(stats.approvedAmount)}
                                    </p>
                                </div>
                                <TrendingUp className="w-12 h-12 text-[#2d8659] opacity-50" />
                            </div>
                        </Card>
                    </div>

                    {/* Filtros */}
                    <Card className="p-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold flex items-center">
                                <Filter className="w-5 h-5 mr-2" />
                                Filtros
                            </h3>
                            <div className="flex gap-2">
                                <Button onClick={clearFilters} variant="outline" size="sm">
                                    Limpar Filtros
                                </Button>
                                <Button onClick={exportToCSV} variant="outline" size="sm">
                                    <Download className="w-4 h-4 mr-2" />
                                    Exportar CSV
                                </Button>
                                <Button onClick={fetchPayments} variant="outline" size="sm">
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Atualizar
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Status</label>
                                <select
                                    value={filters.status}
                                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                                    className="w-full input"
                                >
                                    <option value="">Todos</option>
                                    <option value="pending">Pendente</option>
                                    <option value="approved">Aprovado</option>
                                    <option value="in_process">Em Processamento</option>
                                    <option value="rejected">Rejeitado</option>
                                    <option value="cancelled">Cancelado</option>
                                    <option value="refunded">Reembolsado</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Método</label>
                                <select
                                    value={filters.payment_method}
                                    onChange={(e) => setFilters({...filters, payment_method: e.target.value})}
                                    className="w-full input"
                                >
                                    <option value="">Todos</option>
                                    <option value="pix">PIX</option>
                                    <option value="credit_card">Cartão de Crédito</option>
                                    <option value="debit_card">Cartão de Débito</option>
                                    <option value="bank_transfer">Boleto</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Data Inicial</label>
                                <input
                                    type="date"
                                    value={filters.date_from}
                                    onChange={(e) => setFilters({...filters, date_from: e.target.value})}
                                    className="w-full input"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Data Final</label>
                                <input
                                    type="date"
                                    value={filters.date_to}
                                    onChange={(e) => setFilters({...filters, date_to: e.target.value})}
                                    className="w-full input"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Email do Pagador</label>
                                <input
                                    type="text"
                                    placeholder="email@exemplo.com"
                                    value={filters.payer_email}
                                    onChange={(e) => setFilters({...filters, payer_email: e.target.value})}
                                    className="w-full input"
                                />
                            </div>
                        </div>
                    </Card>

                    {/* Lista de Pagamentos */}
                    <Card className="p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">
                                Pagamentos ({payments.length})
                            </h3>
                            <div className="flex items-center gap-2">
                                <label className="text-sm text-gray-600">Itens por página:</label>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => {
                                        setItemsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="border rounded px-2 py-1 text-sm"
                                >
                                    <option value="5">5</option>
                                    <option value="10">10</option>
                                    <option value="20">20</option>
                                    <option value="50">50</option>
                                </select>
                            </div>
                        </div>

                        {loading ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2d8659] mx-auto"></div>
                                <p className="mt-4 text-gray-600">Carregando pagamentos...</p>
                            </div>
                        ) : payments.length === 0 ? (
                            <div className="text-center py-12">
                                <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500">Nenhum pagamento encontrado</p>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-4">
                                    {paginatedPayments.map((payment) => (
                                    <motion.div
                                        key={payment.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="border rounded-lg p-4 hover:shadow-md transition-all"
                                    >
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${MercadoPagoService.getStatusColor(payment.status)}`}>
                                                        {MercadoPagoService.getStatusLabel(payment.status)}
                                                    </span>
                                                    <span className="text-sm text-gray-600">
                                                        {MercadoPagoService.getPaymentMethodLabel(payment.payment_method)}
                                                    </span>
                                                </div>

                                                <p className="font-semibold text-lg">
                                                    {payment.payer_name || payment.booking?.patient_name || 'Não informado'}
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    {payment.payer_email || payment.booking?.patient_email}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {new Date(payment.created_at).toLocaleDateString('pt-BR')} às {' '}
                                                    {new Date(payment.created_at).toLocaleTimeString('pt-BR')}
                                                </p>
                                            </div>

                                            <div className="flex flex-col items-end gap-2">
                                                <p className="text-2xl font-bold text-[#2d8659]">
                                                    {MercadoPagoService.formatCurrency(payment.amount)}
                                                </p>

                                                <div className="flex gap-2">
                                                    {canPerformManualRefund && payment.status !== 'refunded' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-[#2d8659] border-[#2d8659] hover:bg-emerald-50"
                                                            onClick={() => openManualRefundDialog(payment)}
                                                        >
                                                            <RotateCcw className="w-4 h-4 mr-1" />
                                                            Reembolso Manual
                                                        </Button>
                                                    )}
                                                    <Dialog
                                                        open={selectedPayment?.id === payment.id}
                                                        onOpenChange={(open) => {
                                                            if (open) {
                                                                setSelectedPayment(payment);
                                                            } else if (selectedPayment?.id === payment.id) {
                                                                setSelectedPayment(null);
                                                            }
                                                        }}
                                                    >
                                                        <DialogTrigger asChild>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => setSelectedPayment(payment)}
                                                            >
                                                                <Eye className="w-4 h-4 mr-1" />
                                                                Detalhes
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                                            <DialogHeader>
                                                                <DialogTitle>Detalhes do Pagamento</DialogTitle>
                                                            </DialogHeader>
                                                            {selectedPayment?.id === payment.id && (
                                                                <div className="space-y-4">
                                                                    <div className="grid grid-cols-2 gap-4">
                                                                        <div>
                                                                            <p className="text-sm text-gray-600">ID MP</p>
                                                                            <p className="font-semibold">{selectedPayment.mp_payment_id}</p>
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-sm text-gray-600">Status</p>
                                                                            <span className={`px-2 py-1 rounded text-xs ${MercadoPagoService.getStatusColor(selectedPayment.status)}`}>
                                                                                {MercadoPagoService.getStatusLabel(selectedPayment.status)}
                                                                            </span>
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-sm text-gray-600">Valor</p>
                                                                            <p className="font-semibold">{MercadoPagoService.formatCurrency(selectedPayment.amount)}</p>
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-sm text-gray-600">Método</p>
                                                                            <p className="font-semibold">{MercadoPagoService.getPaymentMethodLabel(selectedPayment.payment_method)}</p>
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-sm text-gray-600">Pagador</p>
                                                                            <p className="font-semibold">{selectedPayment.payer_name || 'Não informado'}</p>
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-sm text-gray-600">Email</p>
                                                                            <p className="font-semibold">{selectedPayment.payer_email}</p>
                                                                        </div>
                                                                        {selectedPayment.fee_amount && (
                                                                            <div>
                                                                                <p className="text-sm text-gray-600">Taxa MP</p>
                                                                                <p className="font-semibold">{MercadoPagoService.formatCurrency(selectedPayment.fee_amount)}</p>
                                                                            </div>
                                                                        )}
                                                                        {selectedPayment.net_amount && (
                                                                            <div>
                                                                                <p className="text-sm text-gray-600">Valor Líquido</p>
                                                                                <p className="font-semibold">{MercadoPagoService.formatCurrency(selectedPayment.net_amount)}</p>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {selectedPayment.payment_url && (
                                                                        <div>
                                                                            <p className="text-sm text-gray-600 mb-2">Link de Pagamento</p>
                                                                            <a 
                                                                                href={selectedPayment.payment_url} 
                                                                                target="_blank" 
                                                                                rel="noopener noreferrer"
                                                                                className="text-blue-600 hover:underline break-all"
                                                                            >
                                                                                {selectedPayment.payment_url}
                                                                            </a>
                                                                        </div>
                                                                    )}

                                                                    {selectedPayment.status_detail && (
                                                                        <div>
                                                                            <p className="text-sm text-gray-600 mb-1">Detalhe do Status</p>
                                                                            <p className="text-sm">{selectedPayment.status_detail}</p>
                                                                        </div>
                                                                    )}

                                                                    {canPerformManualRefund && (
                                                                        <div className="mt-6 border-t border-gray-200 pt-4">
                                                                            <div className="flex items-center justify-between mb-3">
                                                                                <h4 className="flex items-center text-sm font-semibold text-gray-900 gap-2">
                                                                                    <RotateCcw className="h-4 w-4" />
                                                                                    Reembolsos Manuais
                                                                                </h4>
                                                                                {selectedPayment?.id && (
                                                                                    <Button
                                                                                        type="button"
                                                                                        size="sm"
                                                                                        variant="ghost"
                                                                                        className="text-[#2d8659] hover:bg-emerald-50"
                                                                                        onClick={() => loadManualRefunds(selectedPayment.id, { force: true })}
                                                                                        disabled={selectedPaymentRefundsLoading}
                                                                                    >
                                                                                        <RefreshCw className={`h-4 w-4 ${selectedPaymentRefundsLoading ? 'animate-spin' : ''}`} />
                                                                                    </Button>
                                                                                )}
                                                                            </div>

                                                                            {selectedPaymentRefundsLoading ? (
                                                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                                    Carregando reembolsos...
                                                                                </div>
                                                                            ) : selectedPaymentRefundsError ? (
                                                                                <div className="flex flex-col gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                                                                    <span>{selectedPaymentRefundsError}</span>
                                                                                    {selectedPayment?.id && (
                                                                                        <div>
                                                                                            <Button
                                                                                                type="button"
                                                                                                size="sm"
                                                                                                variant="outline"
                                                                                                className="border-red-200 text-red-700 hover:bg-red-100"
                                                                                                onClick={() => loadManualRefunds(selectedPayment.id, { force: true })}
                                                                                            >
                                                                                                Tentar novamente
                                                                                            </Button>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            ) : Array.isArray(selectedPaymentRefunds) && selectedPaymentRefunds.length > 0 ? (
                                                                                <div className="space-y-3">
                                                                                    {selectedPaymentRefunds.map((entry) => {
                                                                                        const refund = entry?.refund;
                                                                                        if (!refund) {
                                                                                            return null;
                                                                                        }

                                                                                        const processedBy = entry?.processed_by;
                                                                                        const notification = entry?.notification;
                                                                                        const isDownloadingProof = proofDownloadId === refund.id;

                                                                                        return (
                                                                                            <div key={refund.id} className="rounded-md border border-gray-200 bg-gray-50 p-4">
                                                                                                <div className="flex flex-wrap items-start justify-between gap-4">
                                                                                                    <div>
                                                                                                        <p className="text-base font-semibold text-gray-900">
                                                                                                            {MercadoPagoService.formatCurrency(refund.amount)} {refund.currency || 'BRL'}
                                                                                                        </p>
                                                                                                        <p className="text-xs text-gray-500">Registrado em {formatDateTime(refund.created_at)}</p>
                                                                                                    </div>
                                                                                                    <div className="flex gap-2">
                                                                                                        <Button
                                                                                                            type="button"
                                                                                                            size="sm"
                                                                                                            variant="outline"
                                                                                                            className="border-[#2d8659] text-[#2d8659] hover:bg-emerald-50"
                                                                                                            onClick={() => handleManualRefundProofDownload(entry)}
                                                                                                            disabled={isDownloadingProof}
                                                                                                        >
                                                                                                            {isDownloadingProof ? (
                                                                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                                                                            ) : (
                                                                                                                <Download className="h-4 w-4 mr-1" />
                                                                                                            )}
                                                                                                            {isDownloadingProof ? 'Gerando link...' : 'Ver comprovante'}
                                                                                                        </Button>
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div className="mt-3 space-y-2 text-sm text-gray-700">
                                                                                                    {refund.reason && (
                                                                                                        <p><span className="font-medium">Motivo:</span> {refund.reason}</p>
                                                                                                    )}
                                                                                                    {processedBy && (
                                                                                                        <p>
                                                                                                            <span className="font-medium">Responsável:</span>{' '}
                                                                                                            {processedBy.full_name || processedBy.email || processedBy.id}
                                                                                                            {processedBy.email && processedBy.full_name ? ` (${processedBy.email})` : ''}
                                                                                                        </p>
                                                                                                    )}
                                                                                                    {notification && (
                                                                                                        <div className="rounded-md bg-white/80 p-2 text-xs">
                                                                                                            <p className="font-semibold text-gray-800">Notificação</p>
                                                                                                            <p>Status: <span className="font-medium">{formatNotificationStatus(notification.status)}</span> (tentativas: {notification.attempts})</p>
                                                                                                            {notification.recipient_email && (
                                                                                                                <p>Destinatário: {notification.recipient_email}</p>
                                                                                                            )}
                                                                                                            {notification.cc_emails && notification.cc_emails.length > 0 && (
                                                                                                                <p>CC: {notification.cc_emails.join(', ')}</p>
                                                                                                            )}
                                                                                                            {notification.sent_at && (
                                                                                                                <p>Enviado em: {formatDateTime(notification.sent_at)}</p>
                                                                                                            )}
                                                                                                            {notification.last_error && (
                                                                                                                <p className="text-red-600">Último erro: {notification.last_error}</p>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            ) : (
                                                                                <p className="text-sm text-gray-600">Nenhum reembolso manual registrado para este pagamento até o momento.</p>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </DialogContent>
                                                    </Dialog>

                                                    {/* {payment.status === 'approved' && !payment.refund_id && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-gray-400"
                                                            disabled
                                                            title="Utilize o reembolso manual para registrar devoluções"
                                                        >
                                                            <RefreshCw className="w-4 h-4 mr-1" />
                                                            Reembolsar
                                                        </Button>
                                                    )} */}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            <Dialog
                                open={manualRefundDialogOpen}
                                onOpenChange={(open) => {
                                    if (!open) {
                                        if (manualRefundLoading) {
                                            return;
                                        }
                                        closeManualRefundDialog();
                                    }
                                }}
                            >
                                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle>Registrar reembolso manual</DialogTitle>
                                        <DialogDescription>
                                            Marque o pagamento selecionado como reembolsado após concluir a devolução do valor junto ao meio de pagamento.
                                        </DialogDescription>
                                    </DialogHeader>

                                    {manualRefundPayment ? (
                                        <form onSubmit={handleManualRefundSubmit} className="space-y-6">
                                            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                                                Confirme que o valor já foi devolvido no provedor de pagamento antes de registrar o reembolso manual.
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Pagamento ID</p>
                                                    <p className="mt-1 break-all text-sm font-semibold text-gray-900">{manualRefundPayment.id}</p>
                                                </div>
                                                {manualRefundPayment.mp_payment_id && (
                                                    <div>
                                                        <p className="text-xs font-medium uppercase tracking-wider text-gray-500">ID Mercado Pago</p>
                                                        <p className="mt-1 break-all text-sm font-semibold text-gray-900">{manualRefundPayment.mp_payment_id}</p>
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Valor original</p>
                                                    <p className="mt-1 text-sm font-semibold text-gray-900">{MercadoPagoService.formatCurrency(manualRefundPayment.amount)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Status atual</p>
                                                    <span className={`mt-1 inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold border ${MercadoPagoService.getStatusColor(manualRefundPayment.status)}`}>
                                                        {MercadoPagoService.getStatusLabel(manualRefundPayment.status)}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Valor a reembolsar (opcional)</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={manualRefundForm.amount}
                                                        onChange={handleManualRefundFieldChange('amount')}
                                                        className="w-full input"
                                                        placeholder="Valor na moeda selecionada"
                                                        disabled={manualRefundLoading}
                                                    />
                                                    <p className="mt-1 text-xs text-gray-500">Deixe em branco para reembolsar o valor total do pagamento.</p>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Moeda</label>
                                                    <select
                                                        value={manualRefundForm.currency}
                                                        onChange={handleManualRefundFieldChange('currency')}
                                                        className="w-full input"
                                                        disabled={manualRefundLoading}
                                                    >
                                                        <option value="BRL">Real (BRL)</option>
                                                        <option value="USD">Dólar (USD)</option>
                                                        <option value="EUR">Euro (EUR)</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Motivo do reembolso *</label>
                                                <textarea
                                                    value={manualRefundForm.reason}
                                                    onChange={handleManualRefundFieldChange('reason')}
                                                    className="w-full input"
                                                    rows={3}
                                                    placeholder="Descreva o motivo do reembolso"
                                                    disabled={manualRefundLoading}
                                                />
                                            </div>

                                            <div className="space-y-3">
                                                <label className="block text-sm font-medium text-gray-700">Comprovante do reembolso *</label>
                                                <div className="flex items-center gap-3">
                                                    <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-600 hover:border-[#2d8659] hover:text-[#2d8659]">
                                                        <UploadCloud className="h-4 w-4" />
                                                        Selecionar arquivo
                                                        <input
                                                            ref={fileInputRef}
                                                            type="file"
                                                            accept=".pdf,image/*"
                                                            className="hidden"
                                                            onChange={handleManualRefundFileChange}
                                                            disabled={manualRefundLoading}
                                                        />
                                                    </label>
                                                    {manualRefundFile && (
                                                        <div className="text-sm text-gray-600">
                                                            <p className="font-medium">{manualRefundFile.name}</p>
                                                            <p className="text-xs">{formatFileSize(manualRefundFile.size)}</p>
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500">Aceitamos PDF ou imagens (PNG, JPG, WEBP). Tamanho máximo de {formatFileSize(MAX_MANUAL_REFUND_PROOF_SIZE)}.</p>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700">Email do destinatário (opcional)</label>
                                                        <input
                                                            type="email"
                                                            value={manualRefundForm.notificationEmail}
                                                            onChange={handleManualRefundFieldChange('notificationEmail')}
                                                            className="w-full input"
                                                            placeholder={manualRefundPayment.payer_email || 'cliente@exemplo.com'}
                                                            disabled={manualRefundLoading}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700">Emails em cópia (opcional)</label>
                                                        <input
                                                            type="text"
                                                            value={manualRefundForm.notificationCc}
                                                            onChange={handleManualRefundFieldChange('notificationCc')}
                                                            className="w-full input"
                                                            placeholder="email1@exemplo.com, email2@exemplo.com"
                                                            disabled={manualRefundLoading}
                                                        />
                                                        <p className="mt-1 text-xs text-gray-500">Separe múltiplos emails por vírgula ou ponto e vírgula.</p>
                                                    </div>
                                                </div>
                                                <div>
                                                        <label className="block text-sm font-medium text-gray-700">Assunto do email (opcional)</label>
                                                        <input
                                                            type="text"
                                                            value={manualRefundForm.notificationSubject}
                                                            onChange={handleManualRefundFieldChange('notificationSubject')}
                                                            className="w-full input"
                                                            placeholder="Seu reembolso foi processado"
                                                            disabled={manualRefundLoading}
                                                        />
                                                    </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Mensagem do email (opcional)</label>
                                                    <textarea
                                                        value={manualRefundForm.notificationMessage}
                                                        onChange={handleManualRefundFieldChange('notificationMessage')}
                                                        className="w-full input"
                                                        rows={5}
                                                        disabled={manualRefundLoading}
                                                    />
                                                    <p className="mt-1 text-xs text-gray-500">Se vazio, o sistema usará a mensagem padrão da equipe financeira.</p>
                                                </div>
                                            </div>

                                            {manualRefundError && (
                                                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                                    {manualRefundError}
                                                </div>
                                            )}

                                            <DialogFooter className="flex justify-end gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={closeManualRefundDialog}
                                                    disabled={manualRefundLoading}
                                                >
                                                    Cancelar
                                                </Button>
                                                <Button type="submit" disabled={manualRefundLoading}>
                                                    {manualRefundLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                    Registrar reembolso
                                                </Button>
                                            </DialogFooter>
                                        </form>
                                    ) : (
                                        <p className="text-sm text-gray-600">Selecione um pagamento para registrar o reembolso manual.</p>
                                    )}
                                </DialogContent>
                            </Dialog>

                            {/* Paginação */}
                            {totalPages > 1 && (
                                <div className="mt-6 flex items-center justify-between border-t pt-4">
                                    <div className="text-sm text-gray-600">
                                        Mostrando {startIndex + 1} a {Math.min(endIndex, payments.length)} de {payments.length} pagamentos
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => goToPage(1)}
                                            disabled={currentPage === 1}
                                            className="h-8 w-8 p-0"
                                        >
                                            <ChevronsLeft className="h-4 w-4" />
                                        </Button>
                                        
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => goToPage(currentPage - 1)}
                                            disabled={currentPage === 1}
                                            className="h-8 w-8 p-0"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>

                                        <div className="flex items-center gap-1">
                                            {[...Array(totalPages)].map((_, index) => {
                                                const page = index + 1;
                                                // Mostrar apenas páginas próximas à atual
                                                if (
                                                    page === 1 ||
                                                    page === totalPages ||
                                                    (page >= currentPage - 1 && page <= currentPage + 1)
                                                ) {
                                                    return (
                                                        <Button
                                                            key={page}
                                                            variant={currentPage === page ? "default" : "outline"}
                                                            size="sm"
                                                            onClick={() => goToPage(page)}
                                                            className={`h-8 w-8 p-0 ${
                                                                currentPage === page 
                                                                    ? 'bg-[#2d8659] hover:bg-[#236b47]' 
                                                                    : ''
                                                            }`}
                                                        >
                                                            {page}
                                                        </Button>
                                                    );
                                                } else if (
                                                    page === currentPage - 2 ||
                                                    page === currentPage + 2
                                                ) {
                                                    return <span key={page} className="px-1">...</span>;
                                                }
                                                return null;
                                            })}
                                        </div>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => goToPage(currentPage + 1)}
                                            disabled={currentPage === totalPages}
                                            className="h-8 w-8 p-0"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => goToPage(totalPages)}
                                            disabled={currentPage === totalPages}
                                            className="h-8 w-8 p-0"
                                        >
                                            <ChevronsRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                        )}
                    </Card>
                </div>
            </div>
        </>
    );
};

export default PaymentsPage;

function createInitialManualRefundForm() {
    return {
        amount: '',
        currency: 'BRL',
        reason: '',
        notificationEmail: '',
        notificationSubject: '',
        notificationMessage: '',
        notificationCc: '',
    };
}

function formatFileSize(bytes) {
    if (typeof bytes !== 'number' || Number.isNaN(bytes)) {
        return '';
    }

    const thresh = 1024;
    if (Math.abs(bytes) < thresh) {
        return `${bytes} B`;
    }

    const units = ['KB', 'MB', 'GB', 'TB'];
    let u = -1;
    let value = bytes;

    do {
        value /= thresh;
        u += 1;
    } while (Math.abs(value) >= thresh && u < units.length - 1);

    return `${value.toFixed(1)} ${units[u]}`;
}

function parseAmountInput(value) {
    if (value === undefined || value === null) {
        return null;
    }

    const trimmed = String(value).trim();
    if (!trimmed) {
        return null;
    }

    const noSpaces = trimmed.replace(/\s+/g, '');
    const normalized = noSpaces.includes(',')
        ? noSpaces.replace(/\./g, '').replace(',', '.')
        : noSpaces;

    const amount = Number(normalized);
    if (!Number.isFinite(amount)) {
        return null;
    }

    return Number(amount.toFixed(2));
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
            } else {
                reject(new Error('Não foi possível processar o arquivo selecionado.'));
            }
        };
        reader.onerror = () => reject(new Error('Falha ao ler o arquivo de comprovante.'));
        reader.readAsDataURL(file);
    });
}

async function computeSHA256Hex(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function formatDateTime(value) {
    if (!value) {
        return '';
    }

    try {
        return new Intl.DateTimeFormat('pt-BR', {
            dateStyle: 'short',
            timeStyle: 'short',
        }).format(new Date(value));
    } catch (_error) {
        return value;
    }
}

function formatNotificationStatus(status) {
    if (!status) {
        return '';
    }

    const map = {
        pending: 'Pendente',
        sent: 'Enviada',
        error: 'Erro',
    };

    return map[status] || status;
}
