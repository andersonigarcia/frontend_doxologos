import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

export function CostFormModal({ open, onClose, onSuccess, cost }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        category: 'server',
        description: '',
        amount: '',
        cost_date: new Date().toISOString().split('T')[0],
        is_recurring: false,
        recurrence_period: ''
    });

    // Preencher formulário quando editando
    useEffect(() => {
        if (cost) {
            setFormData({
                category: cost.category || 'server',
                description: cost.description || '',
                amount: cost.amount?.toString() || '',
                cost_date: cost.cost_date || new Date().toISOString().split('T')[0],
                is_recurring: cost.is_recurring || false,
                recurrence_period: cost.recurrence_period || ''
            });
        } else {
            setFormData({
                category: 'server',
                description: '',
                amount: '',
                cost_date: new Date().toISOString().split('T')[0],
                is_recurring: false,
                recurrence_period: ''
            });
        }
    }, [cost, open]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.description || !formData.amount) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Preencha todos os campos obrigatórios' });
            return;
        }

        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();

            const costData = {
                ...formData,
                amount: parseFloat(formData.amount),
                recurrence_period: formData.is_recurring ? formData.recurrence_period : null,
            };

            if (cost) {
                // Atualizar custo existente
                const { error } = await supabase
                    .from('platform_costs')
                    .update(costData)
                    .eq('id', cost.id);

                if (error) throw error;
                toast({ title: 'Sucesso', description: 'Custo atualizado com sucesso' });
            } else {
                // Criar novo custo
                const { error } = await supabase
                    .from('platform_costs')
                    .insert([{ ...costData, created_by: user?.id }]);

                if (error) throw error;
                toast({ title: 'Sucesso', description: 'Custo adicionado com sucesso' });
            }

            onSuccess?.();
            onClose();
        } catch (error) {
            console.error('Error saving cost:', error);
            toast({ variant: 'destructive', title: 'Erro', description: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{cost ? 'Editar Custo' : 'Adicionar Custo'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Categoria *</label>
                        <select value={formData.category} onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                            className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900" required>
                            <option value="server">Servidor</option>
                            <option value="marketing">Marketing</option>
                            <option value="tools">Ferramentas</option>
                            <option value="salaries">Salários</option>
                            <option value="other">Outros</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Descrição *</label>
                        <input type="text" value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Valor *</label>
                            <input type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900" required />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Data *</label>
                            <input type="date" value={formData.cost_date} onChange={(e) => setFormData(prev => ({ ...prev, cost_date: e.target.value }))}
                                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900" required />
                        </div>
                    </div>
                    <div>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" className="rounded text-slate-900 focus:ring-slate-900" checked={formData.is_recurring} onChange={(e) => setFormData(prev => ({ ...prev, is_recurring: e.target.checked }))} />
                            <span className="text-xs font-semibold text-slate-700">Custo Recorrente</span>
                        </label>
                    </div>
                    {formData.is_recurring && (
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Período</label>
                            <select value={formData.recurrence_period} onChange={(e) => setFormData(prev => ({ ...prev, recurrence_period: e.target.value }))}
                                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900" required>
                                <option value="">Selecione</option>
                                <option value="monthly">Mensal</option>
                                <option value="quarterly">Trimestral</option>
                                <option value="yearly">Anual</option>
                            </select>
                        </div>
                    )}
                    <DialogFooter>
                        <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading} className="text-xs">Cancelar</Button>
                        <Button type="submit" size="sm" className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs" disabled={loading}>
                            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : (cost ? 'Atualizar' : 'Adicionar')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default CostFormModal;
