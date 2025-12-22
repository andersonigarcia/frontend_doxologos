import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, Calendar, DollarSign, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { usePendingPaymentAmount } from '@/hooks/usePaymentCalculation';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

/**
 * PaymentFormModal - Modal para criar/editar pagamentos
 * 
 * @param {Object} props
 * @param {boolean} props.open - Se o modal está aberto
 * @param {Function} props.onClose - Callback para fechar
 * @param {Object} props.payment - Pagamento para editar (opcional)
 * @param {Array} props.professionals - Lista de profissionais
 * @param {Function} props.onSuccess - Callback após sucesso
 */
export function PaymentFormModal({
    open,
    onClose,
    payment = null,
    professionals = [],
    onSuccess
}) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [uploadingProof, setUploadingProof] = useState(false);

    const [formData, setFormData] = useState({
        professional_id: '',
        period_start: '',
        period_end: '',
        payment_method: '',
        payment_date: '',
        payment_proof_url: '',
        notes: '',
        status: 'pending'
    });

    const { totalAmount, bookings, totalBookings, loading: calculatingAmount } = usePendingPaymentAmount(
        formData.professional_id,
        formData.period_start,
        formData.period_end,
        payment?.id // Passar ID do pagamento para excluir verificação de "já pago" para seus próprios bookings
    );

    useEffect(() => {
        if (payment) {
            setFormData({
                professional_id: payment.professional_id || '',
                period_start: payment.period_start || '',
                period_end: payment.period_end || '',
                payment_method: payment.payment_method || '',
                payment_date: payment.payment_date || '',
                payment_proof_url: payment.payment_proof_url || '',
                notes: payment.notes || '',
                status: payment.status || 'pending'
            });
        } else {
            // Apenas define padrão se NÃO estiver editando
            const today = new Date();
            const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

            setFormData({
                professional_id: '',
                period_start: firstDayLastMonth.toISOString().split('T')[0],
                period_end: lastDayLastMonth.toISOString().split('T')[0],
                payment_method: '',
                payment_date: '',
                payment_proof_url: '',
                notes: '',
                status: 'pending'
            });
        }
    }, [payment, open]);

    const handleUploadProof = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploadingProof(true);

            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `payment-proofs/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('documents')
                .getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, payment_proof_url: publicUrl }));

            toast({
                title: 'Comprovante enviado',
                description: 'O comprovante foi anexado com sucesso'
            });
        } catch (error) {
            console.error('Error uploading proof:', error);
            toast({
                variant: 'destructive',
                title: 'Erro ao enviar comprovante',
                description: error.message
            });
        } finally {
            setUploadingProof(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.professional_id || !formData.period_start || !formData.period_end) {
            toast({
                variant: 'destructive',
                title: 'Campos obrigatórios',
                description: 'Preencha profissional e período'
            });
            return;
        }

        // Permitir salvar mesmo com valor 0 se estiver editando, mas alertar se for novo
        if (totalAmount <= 0 && !payment) {
            toast({
                variant: 'destructive',
                title: 'Valor inválido',
                description: 'Não há agendamentos para este período'
            });
            return;
        }

        try {
            setLoading(true);

            const { data: { user } } = await supabase.auth.getUser();

            const paymentData = {
                professional_id: formData.professional_id,
                period_start: formData.period_start,
                period_end: formData.period_end,
                total_bookings: totalBookings,
                total_amount: totalAmount,
                payment_method: formData.payment_method || null,
                payment_date: formData.payment_date || null,
                payment_proof_url: formData.payment_proof_url || null,
                notes: formData.notes || null,
                status: formData.status,
                created_by: user?.id,
                paid_by: formData.status === 'paid' ? user?.id : null
            };

            let paymentId;

            if (payment) {
                // Atualizar
                const { error } = await supabase
                    .from('professional_payments')
                    .update(paymentData)
                    .eq('id', payment.id);

                if (error) throw error;
                paymentId = payment.id;

                // Atualizar relacionamentos com bookings
                // Primeiro remove os existentes para recriar (evita duplicação ou inconsistência)
                if (bookings.length > 0) {
                    const { error: deleteError } = await supabase
                        .from('payment_bookings')
                        .delete()
                        .eq('payment_id', paymentId);

                    if (deleteError) throw deleteError;

                    const paymentBookings = bookings.map(b => ({
                        payment_id: paymentId,
                        booking_id: b.id,
                        amount: parseFloat(b.valor_repasse_profissional || 0)
                    }));

                    const { error: bookingsError } = await supabase
                        .from('payment_bookings')
                        .insert(paymentBookings);

                    if (bookingsError) throw bookingsError;
                }
            } else {
                // Criar
                const { data, error } = await supabase
                    .from('professional_payments')
                    .insert([paymentData])
                    .select()
                    .single();

                if (error) throw error;
                paymentId = data.id;

                // Criar relacionamentos com bookings
                if (bookings.length > 0) {
                    const paymentBookings = bookings.map(b => ({
                        payment_id: paymentId,
                        booking_id: b.id,
                        amount: parseFloat(b.valor_repasse_profissional || 0)
                    }));

                    const { error: bookingsError } = await supabase
                        .from('payment_bookings')
                        .insert(paymentBookings);

                    if (bookingsError) throw bookingsError;
                }
            }

            toast({
                title: payment ? 'Pagamento atualizado' : 'Pagamento criado',
                description: `Pagamento ${payment ? 'atualizado' : 'criado'} com sucesso`
            });

            onSuccess?.();
            onClose();
        } catch (error) {
            console.error('Error saving payment:', error);
            toast({
                variant: 'destructive',
                title: 'Erro ao salvar',
                description: error.message
            });
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value || 0);
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-[#2d8659]" />
                        {payment ? 'Editar Pagamento' : 'Novo Pagamento'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Profissional */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Profissional *
                        </label>
                        <select
                            value={formData.professional_id}
                            onChange={(e) => setFormData(prev => ({ ...prev, professional_id: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent"
                            required
                            disabled={!!payment}
                        >
                            <option value="">Selecione um profissional</option>
                            {professionals.map(prof => (
                                <option key={prof.id} value={prof.id}>
                                    {prof.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Período */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Data Inicial *
                            </label>
                            <input
                                type="date"
                                value={formData.period_start}
                                onChange={(e) => setFormData(prev => ({ ...prev, period_start: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent"
                                required
                                disabled={!!payment}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Data Final *
                            </label>
                            <input
                                type="date"
                                value={formData.period_end}
                                onChange={(e) => setFormData(prev => ({ ...prev, period_end: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent"
                                required
                                disabled={!!payment}
                            />
                        </div>
                    </div>

                    {/* Valor Calculado */}
                    {formData.professional_id && formData.period_start && formData.period_end && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-blue-900">Valor Calculado</p>
                                    <p className="text-xs text-blue-600 mt-1">
                                        {totalBookings} consulta(s) no período
                                    </p>
                                </div>
                                <p className="text-2xl font-bold text-blue-900">
                                    {calculatingAmount ? (
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    ) : (
                                        formatCurrency(totalAmount)
                                    )}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Método de Pagamento */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Método de Pagamento
                        </label>
                        <select
                            value={formData.payment_method}
                            onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent"
                        >
                            <option value="">Selecione</option>
                            <option value="pix">PIX</option>
                            <option value="transferencia">Transferência Bancária</option>
                            <option value="dinheiro">Dinheiro</option>
                            <option value="outro">Outro</option>
                        </select>
                    </div>

                    {/* Data de Pagamento */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Data do Pagamento
                        </label>
                        <input
                            type="date"
                            value={formData.payment_date}
                            onChange={(e) => setFormData(prev => ({ ...prev, payment_date: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent"
                        />
                    </div>

                    {/* Upload Comprovante */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Comprovante de Pagamento
                        </label>
                        {!formData.payment_proof_url ? (
                            <div className="flex items-center gap-4">
                                <label className="flex-1 cursor-pointer">
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-[#2d8659] transition-colors">
                                        <div className="flex items-center justify-center gap-2 text-gray-600">
                                            <Upload className="w-5 h-5" />
                                            <span className="text-sm">
                                                {uploadingProof ? 'Enviando...' : 'Clique para enviar'}
                                            </span>
                                        </div>
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*,application/pdf"
                                        onChange={handleUploadProof}
                                        className="hidden"
                                        disabled={uploadingProof}
                                    />
                                </label>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 bg-gray-50 border rounded-lg p-2">
                                <div className="flex-1 overflow-hidden">
                                    {formData.payment_proof_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                        <div className="relative group">
                                            <img
                                                src={formData.payment_proof_url}
                                                alt="Comprovante"
                                                className="h-20 w-auto object-contain rounded border cursor-pointer hover:opacity-90"
                                                onClick={() => window.open(formData.payment_proof_url, '_blank')}
                                            />
                                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                                <span className="text-white text-xs font-medium">Ver</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <a
                                            href={formData.payment_proof_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm truncate"
                                        >
                                            <FileText className="w-4 h-4" />
                                            Ver documento
                                        </a>
                                    )}
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => setFormData(prev => ({ ...prev, payment_proof_url: '' }))}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Notas */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Observações
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent"
                            placeholder="Adicione observações sobre este pagamento..."
                        />
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Status
                        </label>
                        <select
                            value={formData.status}
                            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent"
                        >
                            <option value="pending">Pendente</option>
                            <option value="paid">Pago</option>
                            <option value="cancelled">Cancelado</option>
                        </select>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="bg-[#2d8659] hover:bg-[#236b47]"
                            disabled={loading || calculatingAmount}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                payment ? 'Atualizar' : 'Criar Pagamento'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default PaymentFormModal;
