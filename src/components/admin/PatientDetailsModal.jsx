import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Mail, Phone, Calendar, DollarSign, TrendingUp, Clock, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TimelineView } from '@/components/common/TimelineView';
import { cn } from '@/lib/utils';

/**
 * PatientDetailsModal - Modal com detalhes completos do paciente
 * 
 * @component
 * @param {Object} props
 * @param {Object} props.patient - Dados do paciente
 * @param {boolean} props.isOpen - Estado de abertura do modal
 * @param {Function} props.onClose - Callback para fechar modal
 * @param {Function} props.onSaveNotes - Callback para salvar observações
 */
export const PatientDetailsModal = ({
    patient,
    isOpen,
    onClose,
    onSaveNotes
}) => {
    const { toast } = useToast();
    const [notes, setNotes] = useState(patient?.notes || '');
    const [isSaving, setIsSaving] = useState(false);

    // Sync notes when patient changes
    useEffect(() => {
        if (patient?.notes !== undefined) {
            setNotes(patient.notes);
        } else {
            setNotes('');
        }
    }, [patient?.notes, patient?.email]);

    if (!patient) return null;

    // Calcular estatísticas
    const stats = {
        totalBookings: patient.totalBookings || 0,
        completedBookings: patient.completedBookings || 0,
        cancelledBookings: patient.cancelledBookings || 0,
        pendingBookings: patient.pendingBookings || 0,
        totalSpent: patient.totalSpent || 0,
        averageSpent: patient.totalBookings > 0 ? patient.totalSpent / patient.completedBookings : 0,
    };

    // Preparar dados para timeline
    const timelineItems = (patient.bookings || []).map(booking => ({
        id: booking.id,
        date: booking.booking_date,
        time: booking.booking_time,
        title: booking.service?.name || 'Serviço',
        description: `Status: ${getStatusLabel(booking.status)}`,
        status: booking.status,
        metadata: {
            value: booking.valor_repasse_profissional,
            duration: booking.duration,
        }
    }));

    // Função para obter label de status
    function getStatusLabel(status) {
        const labels = {
            'pending': 'Pendente',
            'confirmed': 'Confirmado',
            'paid': 'Pago',
            'completed': 'Concluído',
            'cancelled': 'Cancelado',
            'cancelled_by_patient': 'Cancelado pelo Paciente',
            'cancelled_by_professional': 'Cancelado pelo Profissional',
            'awaiting_payment': 'Aguardando Pagamento',
        };
        return labels[status] || status;
    }

    // Salvar observações
    const handleSaveNotes = async () => {
        if (!onSaveNotes) return;

        setIsSaving(true);
        try {
            await onSaveNotes(patient.email, notes);
            toast({
                title: 'Observações salvas',
                description: 'As observações do paciente foram atualizadas com sucesso.',
            });
        } catch (error) {
            console.error('Erro ao salvar observações:', error);
            toast({
                variant: 'destructive',
                title: 'Erro ao salvar',
                description: error.message || 'Não foi possível salvar as observações.',
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden pointer-events-auto">
                            {/* Header */}
                            <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 text-white p-6 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                        <User className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold">{patient.name}</h2>
                                        <p className="text-emerald-50 text-sm font-medium">Detalhes do Paciente</p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <Tabs defaultValue="overview" className="flex flex-col flex-1 overflow-hidden h-[calc(90vh-100px)]">
                                {/* Navegação das Abas */}
                                <div className="px-6 pt-2 border-b border-gray-200 shrink-0 bg-white">
                                    <TabsList className="bg-transparent w-full justify-start rounded-none h-auto p-0 gap-6">
                                        <TabsTrigger 
                                            value="overview" 
                                            className="data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-700 data-[state=active]:shadow-none bg-transparent rounded-none px-2 py-3 font-semibold text-gray-500 hover:text-gray-700"
                                        >
                                            Visão Geral
                                        </TabsTrigger>
                                        <TabsTrigger 
                                            value="history" 
                                            className="data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-700 data-[state=active]:shadow-none bg-transparent rounded-none px-2 py-3 font-semibold text-gray-500 hover:text-gray-700"
                                        >
                                            Histórico Clínico
                                        </TabsTrigger>
                                        <TabsTrigger 
                                            value="notes" 
                                            className="data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-700 data-[state=active]:shadow-none bg-transparent rounded-none px-2 py-3 font-semibold text-gray-500 hover:text-gray-700"
                                        >
                                            Anotações
                                        </TabsTrigger>
                                    </TabsList>
                                </div>

                                {/* Content das Abas */}
                                <div className="p-6 overflow-y-auto flex-1 bg-white">
                                    <TabsContent value="overview" className="m-0 focus:outline-none">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                            <div className="flex items-center gap-3 p-5 bg-gray-50 border border-gray-100 rounded-2xl">
                                                <Mail className="w-5 h-5 text-emerald-600" />
                                                <div>
                                                    <p className="text-xs text-gray-500 font-medium">Email</p>
                                                    <p className="font-semibold text-gray-900">{patient.email || 'Não informado'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 p-5 bg-gray-50 border border-gray-100 rounded-2xl">
                                                <Phone className="w-5 h-5 text-emerald-600" />
                                                <div>
                                                    <p className="text-xs text-gray-500 font-medium">Telefone</p>
                                                    <p className="font-semibold text-gray-900">{patient.phone || 'Não informado'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                            <TrendingUp className="w-5 h-5 text-emerald-600" />
                                            Métricas do Paciente
                                        </h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Calendar className="w-4 h-4 text-blue-600" />
                                                    <p className="text-xs text-blue-600 font-bold uppercase tracking-wide">Total</p>
                                                </div>
                                                <p className="text-2xl font-bold text-blue-900">{stats.totalBookings}</p>
                                                <p className="text-xs text-blue-600 font-medium mt-1">consultas agendadas</p>
                                            </div>
                                            <div className="p-5 bg-green-50/50 rounded-2xl border border-green-100">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <TrendingUp className="w-4 h-4 text-green-600" />
                                                    <p className="text-xs text-green-600 font-bold uppercase tracking-wide">Completas</p>
                                                </div>
                                                <p className="text-2xl font-bold text-green-900">{stats.completedBookings}</p>
                                                <p className="text-xs text-green-600 font-medium mt-1">finalizadas com sucesso</p>
                                            </div>
                                            <div className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <DollarSign className="w-4 h-4 text-emerald-600" />
                                                    <p className="text-xs text-emerald-600 font-bold uppercase tracking-wide">Total Gasto</p>
                                                </div>
                                                <p className="text-xl font-bold text-emerald-900">
                                                    R$ {stats.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                            <div className="p-5 bg-purple-50/50 rounded-2xl border border-purple-100">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Clock className="w-4 h-4 text-purple-600" />
                                                    <p className="text-xs text-purple-600 font-bold uppercase tracking-wide">Média</p>
                                                </div>
                                                <p className="text-xl font-bold text-purple-900">
                                                    R$ {stats.averageSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="history" className="m-0 focus:outline-none">
                                        <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100">
                                            <TimelineView
                                                items={timelineItems}
                                                groupBy="date"
                                                emptyMessage="Nenhuma consulta registrada para este paciente."
                                            />
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="notes" className="m-0 focus:outline-none flex flex-col h-full">
                                        <div className="flex-1 flex flex-col">
                                            <label className="text-sm font-bold text-gray-700 mb-2">Anotações Internas (Visível apenas para a Clínica)</label>
                                            <textarea
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                placeholder="Adicione o histórico clínico, observações importantes ou lembretes sobre este paciente..."
                                                className="w-full flex-1 min-h-[250px] p-5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none bg-gray-50 hover:bg-gray-100 transition-all focus:bg-white text-sm"
                                            />
                                            <div className="flex justify-end mt-4">
                                                <Button
                                                    onClick={handleSaveNotes}
                                                    disabled={isSaving || !notes.trim()}
                                                    className="rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold px-6 shadow-sm"
                                                >
                                                    {isSaving ? 'Salvando...' : 'Salvar Observações'}
                                                </Button>
                                            </div>
                                        </div>
                                    </TabsContent>
                                </div>

                                {/* Footer Fixo do Modal */}
                                <div className="p-4 sm:p-6 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
                                    <div className="text-sm text-gray-500 font-medium">
                                        Paciente desde: <span className="text-gray-900 font-bold">{patient.firstBookingDate ? new Date(patient.firstBookingDate).toLocaleDateString('pt-BR') : 'Recente'}</span>
                                    </div>
                                    <Button
                                        variant="outline"
                                        onClick={onClose}
                                        className="rounded-xl font-semibold border-gray-200 shadow-sm w-full sm:w-auto"
                                    >
                                        Fechar Janela
                                    </Button>
                                </div>
                            </Tabs>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default PatientDetailsModal;
