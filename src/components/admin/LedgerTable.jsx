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
import { FileText, ArrowDownCircle, ArrowUpCircle, RefreshCw, Download } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { formatCurrency } from '@/utils/formatParams';

export function LedgerTable({ className = '' }) {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

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
                .limit(50); // Pagination in next iteration

            if (error) throw error;
            setEntries(data || []);
        } catch (error) {
            console.error('Error fetching ledger:', error);
        } finally {
            setLoading(false);
        }
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
                    <Button variant="outline" size="sm" onClick={() => setRefreshKey(k => k + 1)}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Atualizar
                    </Button>
                    <Button variant="outline" size="sm" disabled>
                        <Download className="w-4 h-4 mr-2" />
                        Exportar
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
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && entries.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24 text-gray-500">
                                        Carregando registros...
                                    </TableCell>
                                </TableRow>
                            ) : entries.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24 text-gray-500">
                                        Nenhum registro encontrado no livro caixa.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                entries.map((entry) => {
                                    const typeInfo = getTypeParams(entry.entry_type);
                                    const TypeIcon = typeInfo.icon;

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
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
