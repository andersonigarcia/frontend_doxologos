import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, User, Mail, Phone, Calendar, DollarSign, TrendingUp, Clock,
    FileText, Save, History, ChevronDown, ChevronUp, AlertCircle, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TimelineView } from '@/components/common/TimelineView';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * PatientDetailsModal - Modal com detalhes completos do paciente e prontuário estruturado
 *
 * @component
 * @param {Object} props.patient - Dados do paciente (inclui campos estruturados de prontuário)
 * @param {boolean} props.isOpen - Estado de abertura do modal
 * @param {Function} props.onClose - Callback para fechar modal
 * @param {Function} props.onSaveNotes - Callback para salvar prontuário
 */
export const PatientDetailsModal = ({ patient, isOpen, onClose, onSaveNotes }) => {
    const { toast } = useToast();

    // ── Estado do formulário de prontuário ────────────────────────────────────
    const [form, setForm] = useState({
        chief_complaint: '',
        session_development: '',
        homework: '',
        notes: '',
        session_date: new Date().toISOString().split('T')[0],
    });
    const [isSaving, setIsSaving] = useState(false);

    // ── Histórico de sessões ──────────────────────────────────────────────────
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [expandedEntry, setExpandedEntry] = useState(null);

    // Sync form quando o paciente muda
    useEffect(() => {
        if (patient) {
            setForm({
                chief_complaint: patient.chief_complaint || '',
                session_development: patient.session_development || '',
                homework: patient.homework || '',
                notes: patient.notes || '',
                session_date: patient.session_date || new Date().toISOString().split('T')[0],
            });
        }
    }, [patient?.email, patient?.notes, patient?.chief_complaint]);

    // Carregar histórico ao abrir aba
    const loadHistory = useCallback(async () => {
        if (!patient?.email) return;
        setHistoryLoading(true);
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData?.session?.access_token;
            if (!token) return;

            const { data, error } = await supabase.functions.invoke('patient-notes-manager', {
                body: { action: 'list_history', patient_email: patient.email },
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!error && data?.history) {
                setHistory(data.history);
            }
        } catch (err) {
            console.error('Erro ao carregar histórico:', err);
        } finally {
            setHistoryLoading(false);
        }
    }, [patient?.email]);

    if (!patient) return null;

    // Estatísticas do paciente
    const stats = {
        totalBookings: patient.totalBookings || 0,
        completedBookings: patient.completedBookings || 0,
        totalSpent: patient.totalSpent || 0,
        averageSpent: patient.completedBookings > 0 ? patient.totalSpent / patient.completedBookings : 0,
    };

    // Timeline de consultas
    const timelineItems = (patient.bookings || []).map(booking => ({
        id: booking.id,
        date: booking.booking_date,
        time: booking.booking_time,
        title: booking.service?.name || 'Serviço',
        description: `Status: ${getStatusLabel(booking.status)}`,
        status: booking.status,
        metadata: { value: booking.valor_repasse_profissional },
    }));

    function getStatusLabel(status) {
        const labels = {
            'pending': 'Pendente', 'confirmed': 'Confirmado', 'paid': 'Pago',
            'completed': 'Concluído', 'cancelled': 'Cancelado',
            'cancelled_by_patient': 'Cancelado pelo Paciente',
            'cancelled_by_professional': 'Cancelado pelo Profissional',
            'awaiting_payment': 'Aguardando Pagamento',
        };
        return labels[status] || status;
    }

    // Salvar prontuário
    const handleSaveNotes = async () => {
        if (!onSaveNotes) return;
        setIsSaving(true);
        try {
            await onSaveNotes(patient.email, form.notes, {
                chief_complaint: form.chief_complaint,
                session_development: form.session_development,
                homework: form.homework,
                session_date: form.session_date,
            });
            toast({ title: '✅ Prontuário salvo', description: 'Sessão registrada no histórico.' });
            // Limpar campos para próxima sessão, mantendo só notas livres
            setForm(prev => ({ ...prev, chief_complaint: '', session_development: '', homework: '' }));
            // Recarregar histórico
            await loadHistory();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    const tabTriggerClass = "data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-700 data-[state=active]:shadow-none bg-transparent rounded-none px-2 py-3 font-semibold text-gray-500 hover:text-gray-700";
    const fieldClass = "w-full border border-gray-200 rounded-xl p-3 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all resize-none";

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden pointer-events-auto flex flex-col">

                            {/* Header */}
                            <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 text-white p-6 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                        <User className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold">{patient.name}</h2>
                                        <p className="text-emerald-50 text-sm font-medium">Prontuário do Paciente</p>
                                    </div>
                                </div>
                                <button
                                    id="btn-close-patient-modal"
                                    onClick={onClose}
                                    className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <Tabs defaultValue="prontuario" className="flex flex-col flex-1 overflow-hidden">
                                {/* Navegação das Abas */}
                                <div className="px-6 pt-2 border-b border-gray-200 shrink-0 bg-white">
                                    <TabsList className="bg-transparent w-full justify-start rounded-none h-auto p-0 gap-6">
                                        <TabsTrigger value="overview" className={tabTriggerClass}>Visão Geral</TabsTrigger>
                                        <TabsTrigger value="prontuario" className={tabTriggerClass}>
                                            <FileText className="w-4 h-4 mr-1.5" />Prontuário
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="historico"
                                            className={tabTriggerClass}
                                            onClick={loadHistory}
                                        >
                                            <History className="w-4 h-4 mr-1.5" />Histórico de Sessões
                                        </TabsTrigger>
                                        <TabsTrigger value="consultas" className={tabTriggerClass}>Consultas</TabsTrigger>
                                    </TabsList>
                                </div>

                                {/* Content */}
                                <div className="p-6 overflow-y-auto flex-1 bg-white">

                                    {/* ── Visão Geral ─────────────────────────────────── */}
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
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {[
                                                { label: 'Total', value: stats.totalBookings, suffix: 'consultas', color: 'blue', Icon: Calendar },
                                                { label: 'Completas', value: stats.completedBookings, suffix: 'finalizadas', color: 'green', Icon: TrendingUp },
                                                { label: 'Total Gasto', value: `R$ ${stats.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, color: 'emerald', Icon: DollarSign },
                                                { label: 'Média', value: `R$ ${stats.averageSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, color: 'purple', Icon: Clock },
                                            ].map(({ label, value, suffix, color, Icon }) => (
                                                <div key={label} className={`p-5 bg-${color}-50/50 rounded-2xl border border-${color}-100`}>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Icon className={`w-4 h-4 text-${color}-600`} />
                                                        <p className={`text-xs text-${color}-600 font-bold uppercase tracking-wide`}>{label}</p>
                                                    </div>
                                                    <p className={`text-xl font-bold text-${color}-900`}>{value}</p>
                                                    {suffix && <p className={`text-xs text-${color}-600 font-medium mt-1`}>{suffix}</p>}
                                                </div>
                                            ))}
                                        </div>
                                    </TabsContent>

                                    {/* ── Prontuário (Sessão Atual) ────────────────────── */}
                                    <TabsContent value="prontuario" className="m-0 focus:outline-none">
                                        <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-sm text-amber-800">
                                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                            <p>Registre as anotações da <strong>sessão atual</strong>. Ao salvar, um snapshot imutável é gravado no Histórico.</p>
                                        </div>

                                        {/* Data da sessão */}
                                        <div className="mb-5">
                                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
                                                Data da Sessão
                                            </label>
                                            <input
                                                type="date"
                                                id="input-session-date"
                                                value={form.session_date}
                                                onChange={e => setForm(f => ({ ...f, session_date: e.target.value }))}
                                                className={fieldClass + ' max-w-xs'}
                                            />
                                        </div>

                                        {/* Queixa Principal */}
                                        <div className="mb-5">
                                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
                                                Queixa Principal
                                            </label>
                                            <textarea
                                                id="input-chief-complaint"
                                                value={form.chief_complaint}
                                                onChange={e => setForm(f => ({ ...f, chief_complaint: e.target.value }))}
                                                placeholder="O que trouxe o paciente nesta sessão? Quais sintomas ou dificuldades relatou?"
                                                rows={3}
                                                className={fieldClass}
                                            />
                                        </div>

                                        {/* Desenvolvimento da Sessão */}
                                        <div className="mb-5">
                                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
                                                Desenvolvimento da Sessão
                                            </label>
                                            <textarea
                                                id="input-session-development"
                                                value={form.session_development}
                                                onChange={e => setForm(f => ({ ...f, session_development: e.target.value }))}
                                                placeholder="Descreva o conteúdo abordado, técnicas utilizadas, dinâmicas da sessão..."
                                                rows={4}
                                                className={fieldClass}
                                            />
                                        </div>

                                        {/* Dever de Casa / Tarefas */}
                                        <div className="mb-5">
                                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
                                                Tarefas / Dever de Casa
                                            </label>
                                            <textarea
                                                id="input-homework"
                                                value={form.homework}
                                                onChange={e => setForm(f => ({ ...f, homework: e.target.value }))}
                                                placeholder="Exercícios, leituras ou práticas combinadas para o período entre sessões..."
                                                rows={2}
                                                className={fieldClass}
                                            />
                                        </div>

                                        {/* Observações Livres */}
                                        <div className="mb-6">
                                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
                                                Observações Gerais
                                            </label>
                                            <textarea
                                                id="input-notes-free"
                                                value={form.notes}
                                                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                                placeholder="Anotações livres, lembretes, alertas para próximas sessões..."
                                                rows={3}
                                                className={fieldClass}
                                            />
                                        </div>

                                        <div className="flex justify-end">
                                            <Button
                                                id="btn-save-prontuario"
                                                onClick={handleSaveNotes}
                                                disabled={isSaving || (!form.chief_complaint.trim() && !form.session_development.trim() && !form.notes.trim())}
                                                className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold px-6 shadow-sm"
                                            >
                                                {isSaving
                                                    ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</>
                                                    : <><Save className="w-4 h-4" />Salvar Sessão no Histórico</>
                                                }
                                            </Button>
                                        </div>
                                    </TabsContent>

                                    {/* ── Histórico de Sessões ─────────────────────────── */}
                                    <TabsContent value="historico" className="m-0 focus:outline-none">
                                        {historyLoading ? (
                                            <div className="flex items-center justify-center py-12 gap-3 text-gray-400">
                                                <Loader2 className="w-6 h-6 animate-spin" />
                                                <span>Carregando histórico...</span>
                                            </div>
                                        ) : history.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
                                                <History className="w-12 h-12 opacity-30" />
                                                <p className="font-medium">Nenhuma sessão registrada ainda.</p>
                                                <p className="text-sm">As sessões salvas no Prontuário aparecerão aqui.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {history.map((entry) => (
                                                    <div key={entry.id} className="border border-gray-200 rounded-xl overflow-hidden">
                                                        {/* Header da entrada */}
                                                        <button
                                                            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                                                            onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
                                                                    <FileText className="w-4 h-4 text-emerald-600" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-semibold text-gray-900 text-sm">
                                                                        Sessão de {entry.session_date
                                                                            ? new Date(entry.session_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
                                                                            : 'Data não informada'}
                                                                    </p>
                                                                    <p className="text-xs text-gray-400">
                                                                        Salvo em {new Date(entry.saved_at).toLocaleString('pt-BR')}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            {expandedEntry === entry.id
                                                                ? <ChevronUp className="w-4 h-4 text-gray-400" />
                                                                : <ChevronDown className="w-4 h-4 text-gray-400" />
                                                            }
                                                        </button>

                                                        {/* Conteúdo expandido */}
                                                        {expandedEntry === entry.id && (
                                                            <div className="p-5 space-y-4 bg-white">
                                                                {entry.chief_complaint && (
                                                                    <div>
                                                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Queixa Principal</p>
                                                                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{entry.chief_complaint}</p>
                                                                    </div>
                                                                )}
                                                                {entry.session_development && (
                                                                    <div>
                                                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Desenvolvimento</p>
                                                                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{entry.session_development}</p>
                                                                    </div>
                                                                )}
                                                                {entry.homework && (
                                                                    <div>
                                                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Tarefas / Dever de Casa</p>
                                                                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{entry.homework}</p>
                                                                    </div>
                                                                )}
                                                                {entry.notes && (
                                                                    <div>
                                                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Observações Gerais</p>
                                                                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{entry.notes}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </TabsContent>

                                    {/* ── Timeline de Consultas ────────────────────────── */}
                                    <TabsContent value="consultas" className="m-0 focus:outline-none">
                                        <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100">
                                            <TimelineView
                                                items={timelineItems}
                                                groupBy="date"
                                                emptyMessage="Nenhuma consulta registrada para este paciente."
                                            />
                                        </div>
                                    </TabsContent>
                                </div>
                            </Tabs>

                            {/* Footer */}
                            <div className="p-4 sm:p-6 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
                                <div className="text-sm text-gray-500 font-medium">
                                    Paciente desde:{' '}
                                    <span className="text-gray-900 font-bold">
                                        {patient.firstBookingDate
                                            ? new Date(patient.firstBookingDate).toLocaleDateString('pt-BR')
                                            : 'Recente'}
                                    </span>
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={onClose}
                                    className="rounded-xl font-semibold border-gray-200 shadow-sm w-full sm:w-auto"
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
