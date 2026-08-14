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
    Filter,
    Calendar,
    Building2,
    Plus
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
            'CASH_BANK': { label: 'Conta Banco / Caixa', bgClass: 'bg-blue-50 text-blue-800 border-blue-200' },
            'REVENUE_GROSS': { label: 'Receita Bruta (Legado)', bgClass: 'bg-purple-50 text-purple-800 border-purple-200' },
            'REVENUE_SERVICE': { label: 'Receita Plataforma', bgClass: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
            'LIABILITY_PROFESSIONAL': { label: 'A Pagar (Profissional)', bgClass: 'bg-amber-50 text-amber-800 border-amber-200' },
            'EXPENSE_FEE': { label: 'Taxas Gateway', bgClass: 'bg-rose-50 text-rose-800 border-rose-200' },
            'EXPENSE_OPERATIONAL': { label: 'Despesas Operacionais', bgClass: 'bg-rose-50 text-rose-800 border-rose-200' },
            'EQUITY_ADJUSTMENT': { label: 'Ajuste Capital', bgClass: 'bg-indigo-50 text-indigo-800 border-indigo-200' }
        };
        return map[code] || { label: code, bgClass: 'bg-slate-100 text-slate-700 border-slate-200' };
    };

    const getTypeParams = (type) => {
        if (type === 'DEBIT') return {
            color: 'text-emerald-800 bg-emerald-100/80 border-emerald-200 font-bold',
            icon: ArrowDownCircle,
            label: 'Entrada (+)'
        };
        return {
            color: 'text-slate-700 bg-slate-100/90 border-slate-200/90 font-semibold',
            icon: ArrowUpCircle,
            label: 'Saída/Obrigação (-)'
        };
    };

    const handleExport = async () => {
        try {
            toast({ title: 'Aguarde', description: 'Gerando arquivo de exportação...' });

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

            const headers = ['Data', 'Descrição', 'Conta', 'Cod. Conta', 'Tipo', 'Valor', 'Fonte', 'ID Transação'];
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

            const csvContent = [
                headers.join(';'),
                ...rows.map(row => row.join(';'))
            ].join('\n');

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
            <CardHeader className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
                            <FileText className="w-5 h-5 text-[#2d8659]" />
                            Livro Caixa (Ledger)
                        </CardTitle>
                        <p className="text-xs text-slate-500 mt-1">
                            Registro contábil de todas as movimentações financeiras da plataforma.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" onClick={handleCreate} className="bg-[#2d8659] hover:bg-[#236b47] text-white rounded-xl shadow-xs font-semibold text-xs h-9 px-4">
                            <Plus className="w-4 h-4 mr-1.5" />
                            Novo Lançamento
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleExport} className="rounded-xl border-slate-200 hover:bg-slate-50 font-semibold text-xs h-9">
                            <Download className="w-4 h-4 mr-1.5" />
                            Exportar CSV
                        </Button>
                    </div>
                </div>

                {/* Área de Filtros Refinada */}
                <div className="mt-4 p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                        <label className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" /> Início
                        </label>
                        <Input
                            type="date"
                            className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:ring-2 focus:ring-[#2d8659]/30"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" /> Fim
                        </label>
                        <Input
                            type="date"
                            className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:ring-2 focus:ring-[#2d8659]/30"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" /> Conta
                        </label>
                        <select
                            className="w-full bg-white border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-3 py-2 h-9 focus:outline-none focus:ring-2 focus:ring-[#2d8659]/30 cursor-pointer"
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
                        <label className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                            <Filter className="w-3.5 h-3.5 text-slate-400" /> Tipo
                        </label>
                        <select
                            className="w-full bg-white border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-3 py-2 h-9 focus:outline-none focus:ring-2 focus:ring-[#2d8659]/30 cursor-pointer"
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                        >
                            <option value="">Todos os Tipos</option>
                            <option value="DEBIT">Entradas (Debit)</option>
                            <option value="CREDIT">Saídas (Credit)</option>
                        </select>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="px-6 pb-6">
                <div className="rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
                    <Table>
                        <TableHeader className="bg-slate-50/90">
                            <TableRow className="border-b border-slate-200">
                                <TableHead className="text-[11px] font-bold text-slate-500 uppercase py-3">Data & Hora</TableHead>
                                <TableHead className="text-[11px] font-bold text-slate-500 uppercase py-3">Descrição</TableHead>
                                <TableHead className="text-[11px] font-bold text-slate-500 uppercase py-3">Conta Contábil</TableHead>
                                <TableHead className="text-[11px] font-bold text-slate-500 uppercase py-3">Tipo</TableHead>
                                <TableHead className="text-[11px] font-bold text-slate-500 uppercase py-3 text-right">Valor</TableHead>
                                <TableHead className="w-[80px] py-3"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-28 text-slate-500">
                                        <div className="flex items-center justify-center gap-2 text-xs font-semibold">
                                            <RefreshCw className="w-4 h-4 animate-spin text-[#2d8659]" />
                                            Carregando registros contábeis...
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : entries.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-28 text-slate-500 text-xs">
                                        Nenhum registro contábil encontrado para os filtros selecionados.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                entries.map((entry) => {
                                    const typeInfo = getTypeParams(entry.entry_type);
                                    const accInfo = getAccountParams(entry.account_code);
                                    const TypeIcon = typeInfo.icon;
                                    const isManual = entry.metadata?.source === 'manual_reconciliation';

                                    return (
                                        <TableRow key={entry.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
                                            <TableCell className="font-mono text-xs text-slate-500 whitespace-nowrap py-3.5">
                                                {formatDate(entry.created_at)}
                                            </TableCell>
                                            <TableCell className="text-xs font-semibold text-slate-800 py-3.5 max-w-xs truncate" title={entry.description}>
                                                {entry.description}
                                            </TableCell>
                                            <TableCell className="py-3.5">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold border shadow-2xs ${accInfo.bgClass}`}>
                                                    {accInfo.label}
                                                </span>
                                            </TableCell>
                                            <TableCell className="py-3.5">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] border ${typeInfo.color}`}>
                                                    <TypeIcon className="w-3.5 h-3.5 mr-1 shrink-0" />
                                                    {typeInfo.label}
                                                </span>
                                            </TableCell>
                                            <TableCell className={`text-right font-extrabold text-xs py-3.5 ${entry.entry_type === 'DEBIT' ? 'text-emerald-700' : 'text-slate-800'}`}>
                                                {entry.entry_type === 'DEBIT' ? '+ ' : ''}{formatCurrency(entry.amount)}
                                            </TableCell>
                                            <TableCell className="py-3.5 text-right">
                                                {isManual && (
                                                    <div className="flex gap-1 justify-end">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                                                            onClick={() => handleEdit(entry)}
                                                            title="Editar Lançamento Manual"
                                                        >
                                                            <Edit className="w-3.5 h-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-rose-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                                                            onClick={() => {
                                                                setEntryToDelete(entry);
                                                                setIsDeleteAlertOpen(true);
                                                            }}
                                                            title="Excluir Lançamento"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
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

                {/* Paginação Estilizada */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-2">
                    <div className="text-xs text-slate-500 font-medium">
                        Total de <strong>{totalCount}</strong> lançamentos registrados
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl border-slate-200 text-xs font-semibold h-8"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || loading}
                        >
                            <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                            Anterior
                        </Button>
                        <span className="text-xs font-bold text-slate-700 px-2">
                            Página {page} de {totalPages || 1}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl border-slate-200 text-xs font-semibold h-8"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages || loading}
                        >
                            Próximo
                            <ChevronRight className="w-3.5 h-3.5 ml-1" />
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
