import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Mail, Phone, Calendar, DollarSign, TrendingUp, Clock, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
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
                            <div className="bg-gradient-to-r from-[#2d8659] to-[#3da76f] text-white p-6 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                        <User className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold">{patient.name}</h2>
                                        <p className="text-white/80 text-sm">Detalhes do Paciente</p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                                {/* Informações de Contato */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                                        <Mail className="w-5 h-5 text-[#2d8659]" />
                                        <div>
                                            <p className="text-xs text-gray-500">Email</p>
                                            <p className="font-medium text-gray-900">{patient.email || 'Não informado'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                                        <Phone className="w-5 h-5 text-[#2d8659]" />
                                        <div>
                                            <p className="text-xs text-gray-500">Telefone</p>
                                            <p className="font-medium text-gray-900">{patient.phone || 'Não informado'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Estatísticas */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Calendar className="w-4 h-4 text-blue-600" />
                                            <p className="text-xs text-blue-600 font-medium">Total</p>
                                        </div>
                                        <p className="text-2xl font-bold text-blue-900">{stats.totalBookings}</p>
                                        <p className="text-xs text-blue-600">consultas</p>
                                    </div>

                                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                        <div className="flex items-center gap-2 mb-1">
                                            <TrendingUp className="w-4 h-4 text-green-600" />
                                            <p className="text-xs text-green-600 font-medium">Completas</p>
                                        </div>
                                        <p className="text-2xl font-bold text-green-900">{stats.completedBookings}</p>
                                        <p className="text-xs text-green-600">finalizadas</p>
                                    </div>

                                    <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                                        <div className="flex items-center gap-2 mb-1">
                                            <DollarSign className="w-4 h-4 text-emerald-600" />
                                            <p className="text-xs text-emerald-600 font-medium">Total Gasto</p>
                                        </div>
                                        <p className="text-xl font-bold text-emerald-900">
                                            R$ {stats.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>

                                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Clock className="w-4 h-4 text-purple-600" />
                                            <p className="text-xs text-purple-600 font-medium">Média</p>
                                        </div>
                                        <p className="text-xl font-bold text-purple-900">
                                            R$ {stats.averageSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>

                                {/* Histórico de Consultas */}
                                <div className="mb-6">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-[#2d8659]" />
                                        Histórico de Consultas
                                    </h3>
                                    <TimelineView
                                        items={timelineItems}
                                        groupBy="date"
                                        emptyMessage="Nenhuma consulta registrada"
                                    />
                                </div>

                                {/* Observações */}
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-[#2d8659]" />
                                        Observações do Profissional
                                    </h3>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Adicione observações sobre o paciente..."
                                        className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent resize-none"
                                    />
                                    <div className="flex justify-end mt-2">
                                        <Button
                                            onClick={handleSaveNotes}
                                            disabled={isSaving || !notes.trim()}
                                            className="bg-[#2d8659] hover:bg-[#236b47]"
                                        >
                                            {isSaving ? 'Salvando...' : 'Salvar Observações'}
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                                <div className="text-sm text-gray-600">
                                    Primeira consulta: {patient.firstBookingDate ?
                                        new Date(patient.firstBookingDate).toLocaleDateString('pt-BR') :
                                        'N/A'
                                    }
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={onClose}
                                >
                                    Fechar
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default PatientDetailsModal;
