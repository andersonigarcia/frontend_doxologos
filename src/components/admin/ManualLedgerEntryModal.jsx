import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ShieldCheck } from 'lucide-react';
import { createDoubleEntryManualTransaction, LEDGER_ACCOUNTS } from '@/services/ledgerService';

export function ManualLedgerEntryModal({ open, onClose, onSuccess }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        debitAccount: 'CASH_BANK',
        creditAccount: 'REVENUE_SERVICE',
        amount: '',
        description: ''
    });

    useEffect(() => {
        if (open) {
            setFormData({
                debitAccount: 'CASH_BANK',
                creditAccount: 'REVENUE_SERVICE',
                amount: '',
                description: ''
            });
        }
    }, [open]);

    const handleAmountChange = (e) => {
        const value = e.target.value.replace(/\D/g, '');
        const numberValue = Number(value) / 100;
        setFormData({ ...formData, amount: numberValue });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await createDoubleEntryManualTransaction({
                debitAccount: formData.debitAccount,
                creditAccount: formData.creditAccount,
                amount: formData.amount,
                description: formData.description
            });

            toast({
                title: 'Partida dobrada registrada',
                description: 'Lançamento de Débito e Crédito gravado de forma imutável no Livro Caixa.'
            });
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Erro', description: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>Novo Lançamento (Partidas Dobradas)</DialogTitle>
                    <DialogDescription className="text-xs flex items-center gap-1.5 text-slate-600">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        Todo lançamento manual gera Débito e Crédito balanceados e é imutável (correções via estorno).
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Conta Debitada (DEBIT)</Label>
                        <select
                            className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-white"
                            value={formData.debitAccount}
                            onChange={e => setFormData({ ...formData, debitAccount: e.target.value })}
                        >
                            {LEDGER_ACCOUNTS.map(acc => (
                                <option key={acc.code} value={acc.code}>{acc.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <Label>Conta Creditada (CREDIT — Contrapartida)</Label>
                        <select
                            className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-white"
                            value={formData.creditAccount}
                            onChange={e => setFormData({ ...formData, creditAccount: e.target.value })}
                        >
                            {LEDGER_ACCOUNTS.map(acc => (
                                <option key={acc.code} value={acc.code}>{acc.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <Label>Valor (R$)</Label>
                        <Input
                            value={formData.amount ? formData.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''}
                            onChange={handleAmountChange}
                            placeholder="0,00"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Descrição / Motivo</Label>
                        <Input
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Ex: Conciliação bancária, Taxa extra..."
                            required
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Registrar Partida Dobrada
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
