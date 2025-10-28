import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
    CreditCard, DollarSign, TrendingUp, AlertCircle, CheckCircle, 
    XCircle, Clock, Filter, Download, RefreshCw, Eye, ArrowLeft,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import MercadoPagoService from '@/lib/mercadoPagoService';

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
        if (user && (userRole === 'admin' || userRole === 'professional')) {
            fetchPayments();
        }
    }, [user, userRole, fetchPayments]);

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

    const handleRefund = async (payment) => {
        if (!window.confirm(`Confirma o reembolso de ${MercadoPagoService.formatCurrency(payment.amount)}?`)) {
            return;
        }

        const result = await MercadoPagoService.refundPayment(payment.mp_payment_id);
        
        if (result.success) {
            toast({
                title: 'Reembolso solicitado',
                description: 'O reembolso foi processado com sucesso'
            });
            fetchPayments();
        } else {
            toast({
                variant: 'destructive',
                title: 'Erro ao reembolsar',
                description: result.error
            });
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

    if (!user || (userRole !== 'admin' && userRole !== 'professional')) {
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
                                                    <Dialog>
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
                                                        <DialogContent className="max-w-2xl">
                                                            <DialogHeader>
                                                                <DialogTitle>Detalhes do Pagamento</DialogTitle>
                                                            </DialogHeader>
                                                            {selectedPayment && (
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
                                                                </div>
                                                            )}
                                                        </DialogContent>
                                                    </Dialog>

                                                    {payment.status === 'approved' && !payment.refund_id && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-red-600 hover:bg-red-50"
                                                            onClick={() => handleRefund(payment)}
                                                        >
                                                            <RefreshCw className="w-4 h-4 mr-1" />
                                                            Reembolsar
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

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
