import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2 } from 'lucide-react';
import { formatNumberToCurrencyInput, parseCurrencyToNumber } from '@/utils/formatParams';

export function ManualLedgerEntryModal({ open, onClose, onSuccess, entryToEdit = null }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        entry_type: 'DEBIT', // or CREDIT
        account_code: 'CASH_BANK',
        amount: '',
        description: ''
    });

    React.useEffect(() => {
        if (open) {
            if (entryToEdit) {
                setFormData({
                    entry_type: entryToEdit.entry_type,
                    account_code: entryToEdit.account_code,
                    amount: entryToEdit.amount,
                    description: entryToEdit.description.replace(' (Manual)', '')
                });
            } else {
                setFormData({
                    entry_type: 'DEBIT',
                    account_code: 'CASH_BANK',
                    amount: '',
                    description: ''
                });
            }
        }
    }, [open, entryToEdit]);

    // Helper functions for currency (simplified here if imports fail)
    const handleAmountChange = (e) => {
        let value = e.target.value.replace(/\D/g, '');
        const numberValue = Number(value) / 100;
        setFormData({ ...formData, amount: numberValue });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { amount, entry_type, account_code, description } = formData;

            // Validate
            if (!amount || amount <= 0) throw new Error('Valor inválido');
            if (!description) throw new Error('Descrição obrigatória');

            const finalDescription = description.includes('(Manual)') ? description : `${description} (Manual)`;

            if (entryToEdit) {
                const { error } = await supabase
                    .from('payment_ledger_entries')
                    .update({
                        entry_type,
                        account_code,
                        amount,
                        description: finalDescription,
                    })
                    .eq('id', entryToEdit.id);

                if (error) throw error;
                toast({ title: 'Sucesso', description: 'Lançamento atualizado.' });

            } else {
                const transactionId = crypto.randomUUID();
                const { error } = await supabase
                    .from('payment_ledger_entries')
                    .insert({
                        transaction_id: transactionId,
                        entry_type,
                        account_code,
                        amount,
                        description: finalDescription,
                        metadata: { source: 'manual_reconciliation' }
                    });

                if (error) throw error;
                toast({ title: 'Sucesso', description: 'Lançamento registrado.' });
            }

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
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{entryToEdit ? 'Editar Lançamento' : 'Novo Lançamento (Conciliação)'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Tipo</Label>
                            <select
                                className="w-full border rounded p-2 text-sm"
                                value={formData.entry_type}
                                onChange={e => setFormData({ ...formData, entry_type: e.target.value })}
                            >
                                <option value="DEBIT">Débito (Entrada/Ativo)</option>
                                <option value="CREDIT">Crédito (Saída/Passivo)</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label>Conta</Label>
                            <select
                                className="w-full border rounded p-2 text-sm"
                                value={formData.account_code}
                                onChange={e => setFormData({ ...formData, account_code: e.target.value })}
                            >
                                <option value="CASH_BANK">Caixa / Banco</option>
                                <option value="REVENUE_GROSS">Receita Bruta</option>
                                <option value="LIABILITY_PROFESSIONAL">Obrigação Profissional</option>
                                <option value="EXPENSE_FEE">Taxa Bancária</option>
                                <option value="EXPENSE_OPERATIONAL">Despesa Operacional</option>
                                <option value="EQUITY_ADJUSTMENT">Ajuste de Capital</option>
                            </select>
                        </div>
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
                            placeholder="Ex: Ajuste de centavos, Taxa extra..."
                            required
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {entryToEdit ? 'Salvar Alterações' : 'Registrar'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
