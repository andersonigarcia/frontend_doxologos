import React, { useState, useEffect } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    FileText,
    ArrowDownCircle,
    ArrowUpCircle,
    RefreshCw,
    Download,
    Trash2,
    Edit,
    ChevronLeft,
    ChevronRight,
    Filter
} from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from '@/lib/customSupabaseClient';
import { ManualLedgerEntryModal } from '@/components/admin/ManualLedgerEntryModal';
import { formatCurrency } from '@/utils/formatParams';
import { useToast } from '@/components/ui/use-toast';

export function LedgerTable({ className = '' }) {
    const { toast } = useToast();
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    // Filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [accountFilter, setAccountFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');

    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [totalCount, setTotalCount] = useState(0);

    // Values for modals
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [entryToEdit, setEntryToEdit] = useState(null);

    // Values for delete
    const [entryToDelete, setEntryToDelete] = useState(null);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

    useEffect(() => {
        fetchLedger();
    }, [refreshKey, page, startDate, endDate, accountFilter, typeFilter]);

    // Reset page when filters change
    useEffect(() => {
        setPage(1);
    }, [startDate, endDate, accountFilter, typeFilter]);

    const buildQuery = (query) => {
        if (startDate) query = query.gte('created_at', `${startDate}T00:00:00`);
        if (endDate) query = query.lte('created_at', `${endDate}T23:59:59`);
        if (accountFilter) query = query.eq('account_code', accountFilter);
        if (typeFilter) query = query.eq('entry_type', typeFilter);
        return query;
    };

    const fetchLedger = async () => {
        setLoading(true);
        try {
            // 1. Get exact count first
            let countQuery = supabase
                .from('payment_ledger_entries')
                .select('*', { count: 'exact', head: true });

            countQuery = buildQuery(countQuery);
            const { count, error: countError } = await countQuery;
            if (countError) throw countError;
            setTotalCount(count || 0);

            // 2. Get paginated data
            let dataQuery = supabase
                .from('payment_ledger_entries')
                .select('*')
                .order('created_at', { ascending: false })
                .range((page - 1) * pageSize, page * pageSize - 1);

            dataQuery = buildQuery(dataQuery);
            const { data, error } = await dataQuery;

            if (error) throw error;
            setEntries(data || []);
        } catch (error) {
            console.error('Error fetching ledger:', error);
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar o livro caixa.' });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!entryToDelete) return;

        try {
            const { error } = await supabase
                .from('payment_ledger_entries')
                .delete()
                .eq('id', entryToDelete.id);

            if (error) throw error;

            toast({ title: 'Sucesso', description: 'Lançamento excluído.' });
            setRefreshKey(prev => prev + 1);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao excluir lançamento.' });
        } finally {
            setIsDeleteAlertOpen(false);
            setEntryToDelete(null);
        }
    };

    const handleEdit = (entry) => {
        setEntryToEdit(entry);
        setIsManualModalOpen(true);
    };

    const handleCreate = () => {
        setEntryToEdit(null);
        setIsManualModalOpen(true);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getAccountParams = (code) => {
        const map = {
            'CASH_BANK': { label: 'Conta Banco / Caixa', variant: 'outline' },
            'REVENUE_GROSS': { label: 'Receita Bruta (Legado)', variant: 'secondary' },
            'REVENUE_SERVICE': { label: 'Receita Plataforma', variant: 'success' },
            'LIABILITY_PROFESSIONAL': { label: 'A Pagar (Profissional)', variant: 'warning' },
            'EXPENSE_FEE': { label: 'Taxas', variant: 'destructive' },
            'EXPENSE_OPERATIONAL': { label: 'Despesas', variant: 'destructive' },
            'EQUITY_ADJUSTMENT': { label: 'Ajuste Capital', variant: 'default' }
        };
        return map[code] || { label: code, variant: 'outline' };
    };

    const getTypeParams = (type) => {
        if (type === 'DEBIT') return {
            color: 'text-green-700 bg-green-50 border-green-200',
            icon: ArrowDownCircle,
            label: 'Entrada (+)'
        };
        return {
            color: 'text-gray-700 bg-gray-50 border-gray-200',
            icon: ArrowUpCircle,
            label: 'Saída/Obrigação (-)'
        };
    };

    const handleExport = async () => {
        try {
            toast({ title: 'Aguarde', description: 'Gerando arquivo de exportação...' });

            // Fetch ALL matching records for export (ignoring pagination)
            let query = supabase
                .from('payment_ledger_entries')
                .select('*')
                .order('created_at', { ascending: false });

            query = buildQuery(query);

            const { data, error } = await query;

            if (error) throw error;

            if (!data || data.length === 0) {
                toast({ title: 'Aviso', description: 'Não há dados para exportar com os filtros atuais.' });
                return;
            }

            // CSV Header
            const headers = ['Data', 'Descrição', 'Conta', 'Cod. Conta', 'Tipo', 'Valor', 'Fonte', 'ID Transação'];

            // CSV Rows
            const rows = data.map(entry => [
                new Date(entry.created_at).toLocaleString('pt-BR'),
                `"${(entry.description || '').replace(/"/g, '""')}"`,
                getAccountParams(entry.account_code).label,
                entry.account_code,
                entry.entry_type === 'DEBIT' ? 'Entrada' : 'Saída',
                (entry.amount || 0).toFixed(2).replace('.', ','),
                entry.metadata?.source || 'system',
                entry.transaction_id
            ]);

            // Combine
            const csvContent = [
                headers.join(';'),
                ...rows.map(row => row.join(';'))
            ].join('\n');

            // Download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `ledger_export_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast({ title: 'Sucesso', description: 'Exportação concluída.' });

        } catch (error) {
            console.error('Export error:', error);
            toast({ variant: 'destructive', title: 'Erro', description: 'Falha na exportação.' });
        }
    };

    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <Card className={className}>
            <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <FileText className="w-5 h-5 text-gray-500" />
                            Livro Caixa (Ledger)
                        </CardTitle>
                        <p className="text-sm text-gray-500 mt-1">
                            Registro contábil de todas as movimentações financeiras
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700 text-white">
                            + Lançamento
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleExport}>
                            <Download className="w-4 h-4 mr-2" />
                            Exportar
                        </Button>
                    </div>
                </div>

                {/* Filters Area */}
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Início</label>
                        <Input
                            type="date"
                            className="bg-white"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Fim</label>
                        <Input
                            type="date"
                            className="bg-white"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Conta</label>
                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={accountFilter}
                            onChange={(e) => setAccountFilter(e.target.value)}
                        >
                            <option value="">Todas as Contas</option>
                            <option value="CASH_BANK">Conta Banco / Caixa</option>
                            <option value="LIABILITY_PROFESSIONAL">A Pagar (Profissional)</option>
                            <option value="REVENUE_SERVICE">Receita Plataforma</option>
                            <option value="EXPENSE_OPERATIONAL">Despesas</option>
                            <option value="EXPENSE_FEE">Taxas</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Tipo</label>
                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                        >
                            <option value="">Todos</option>
                            <option value="DEBIT">Entradas (Debit)</option>
                            <option value="CREDIT">Saídas (Credit)</option>
                        </select>
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Descrição</TableHead>
                                <TableHead>Conta</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                                <TableHead className="w-[100px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24 text-gray-500">
                                        <div className="flex items-center justify-center gap-2">
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            Carregando registros...
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : entries.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24 text-gray-500">
                                        Nenhum registro encontrado com os filtros selecionados.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                entries.map((entry) => {
                                    const typeInfo = getTypeParams(entry.entry_type);
                                    const TypeIcon = typeInfo.icon;
                                    const isManual = entry.metadata?.source === 'manual_reconciliation';

                                    return (
                                        <TableRow key={entry.id}>
                                            <TableCell className="font-medium text-xs text-gray-600">
                                                {formatDate(entry.created_at)}
                                            </TableCell>
                                            <TableCell>{entry.description}</TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={getAccountParams(entry.account_code).variant}
                                                    className="font-normal text-xs whitespace-nowrap"
                                                >
                                                    {getAccountParams(entry.account_code).label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${typeInfo.color}`}>
                                                    <TypeIcon className="w-3 h-3 mr-1" />
                                                    {typeInfo.label}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(entry.amount)}
                                            </TableCell>
                                            <TableCell>
                                                {isManual && (
                                                    <div className="flex gap-2 justify-end">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-gray-500 hover:text-blue-600"
                                                            onClick={() => handleEdit(entry)}
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-gray-500 hover:text-red-600"
                                                            onClick={() => {
                                                                setEntryToDelete(entry);
                                                                setIsDeleteAlertOpen(true);
                                                            }}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-500">
                        Total: <strong>{totalCount}</strong> registros
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || loading}
                        >
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            Anterior
                        </Button>
                        <span className="text-sm font-medium px-2">
                            Página {page} de {totalPages || 1}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages || loading}
                        >
                            Próximo
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                </div>

            </CardContent>

            <ManualLedgerEntryModal
                open={isManualModalOpen}
                onClose={() => setIsManualModalOpen(false)}
                onSuccess={() => setRefreshKey(k => k + 1)}
                entryToEdit={entryToEdit}
            />

            <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Lançamento?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isso removerá permanentemente o lançamento manual do Livro Caixa.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setEntryToDelete(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}
