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
import {
    FileText,
    ArrowDownCircle,
    ArrowUpCircle,
    RefreshCw,
    Download,
    Trash2,
    Edit
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

    // Values for modals
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [entryToEdit, setEntryToEdit] = useState(null);

    // Values for delete
    const [entryToDelete, setEntryToDelete] = useState(null);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

    useEffect(() => {
        fetchLedger();
    }, [refreshKey]);

    const fetchLedger = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('payment_ledger_entries')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            setEntries(data || []);
        } catch (error) {
            console.error('Error fetching ledger:', error);
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

    const getTypeParams = (type) => {
        if (type === 'DEBIT') return {
            color: 'text-red-700 bg-red-50 border-red-200',
            icon: ArrowDownCircle,
            label: 'Débito'
        };
        return {
            color: 'text-green-700 bg-green-50 border-green-200',
            icon: ArrowUpCircle,
            label: 'Crédito'
        };
    };

    return (
        <Card className={className}>
            <CardHeader className="flex flex-row items-center justify-between">
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
                    <Button variant="outline" size="sm" onClick={() => setRefreshKey(k => k + 1)}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Atualizar
                    </Button>
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
                            {loading && entries.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24 text-gray-500">
                                        Carregando registros...
                                    </TableCell>
                                </TableRow>
                            ) : entries.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24 text-gray-500">
                                        Nenhum registro encontrado no livro caixa.
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
                                                <Badge variant="outline" className="font-mono text-xs">
                                                    {entry.account_code}
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
