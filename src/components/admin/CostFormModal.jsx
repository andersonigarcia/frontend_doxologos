import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

export function CostFormModal({ open, onClose, onSuccess }) {
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.description || !formData.amount) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Preencha todos os campos obrigatórios' });
            return;
        }

        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();

            const { error } = await supabase.from('platform_costs').insert([{
                ...formData,
                amount: parseFloat(formData.amount),
                recurrence_period: formData.is_recurring ? formData.recurrence_period : null,
                created_by: user?.id
            }]);

            if (error) throw error;

            toast({ title: 'Sucesso', description: 'Custo adicionado com sucesso' });
            onSuccess?.();
            onClose();
            setFormData({ category: 'server', description: '', amount: '', cost_date: new Date().toISOString().split('T')[0], is_recurring: false, recurrence_period: '' });
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
                    <DialogTitle>Adicionar Custo</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Categoria *</label>
                        <select value={formData.category} onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#2d8659]" required>
                            <option value="server">Servidor</option>
                            <option value="marketing">Marketing</option>
                            <option value="tools">Ferramentas</option>
                            <option value="salaries">Salários</option>
                            <option value="other">Outros</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Descrição *</label>
                        <input type="text" value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#2d8659]" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Valor *</label>
                            <input type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#2d8659]" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Data *</label>
                            <input type="date" value={formData.cost_date} onChange={(e) => setFormData(prev => ({ ...prev, cost_date: e.target.value }))}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#2d8659]" required />
                        </div>
                    </div>
                    <div>
                        <label className="flex items-center gap-2">
                            <input type="checkbox" checked={formData.is_recurring} onChange={(e) => setFormData(prev => ({ ...prev, is_recurring: e.target.checked }))} />
                            <span className="text-sm font-medium">Custo Recorrente</span>
                        </label>
                    </div>
                    {formData.is_recurring && (
                        <div>
                            <label className="block text-sm font-medium mb-2">Período</label>
                            <select value={formData.recurrence_period} onChange={(e) => setFormData(prev => ({ ...prev, recurrence_period: e.target.value }))}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#2d8659]" required>
                                <option value="">Selecione</option>
                                <option value="monthly">Mensal</option>
                                <option value="quarterly">Trimestral</option>
                                <option value="yearly">Anual</option>
                            </select>
                        </div>
                    )}
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
                        <Button type="submit" className="bg-[#2d8659] hover:bg-[#236b47]" disabled={loading}>
                            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : 'Adicionar'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default CostFormModal;
