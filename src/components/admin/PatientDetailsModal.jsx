import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, User, Mail, Phone, Calendar, DollarSign, TrendingUp, Clock,
    FileText, Save, History, ChevronDown, ChevronUp, AlertCircle, Loader2,
    CalendarPlus, Sparkles, Brain
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TimelineView } from '@/components/common/TimelineView';
import { supabase } from '@/lib/customSupabaseClient';
import { getPatientNotesHistory } from '@/services/patientService';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { ScheduleNextSessionModal } from '@/components/professional/ScheduleNextSessionModal';

/**
 * PatientDetailsModal - Modal com detalhes completos do paciente e prontuário estruturado
 *
 * @component
 * @param {Object} props.patient - Dados do paciente (inclui campos estruturados de prontuário)
 * @param {boolean} props.isOpen - Estado de abertura do modal
 * @param {Function} props.onClose - Callback para fechar modal
 * @param {Function} props.onSaveNotes - Callback para salvar prontuário
 * @param {Object} [props.currentProfessional] - Dados do profissional autenticado
 * @param {Array} [props.services] - Lista de serviços para agendamento
 * @param {Function} [props.onBookingCreated] - Callback quando nova sessão é agendada
 */
export const PatientDetailsModal = ({
    patient,
    isOpen,
    onClose,
    onSaveNotes,
    currentProfessional = null,
    services = [],
    onBookingCreated = null
}) => {
    const { toast } = useToast();
    const { settings } = useSystemSettings();
    const showTriage = settings?.prontuario_show_emotional_triage !== false;

    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [assessmentData, setAssessmentData] = useState(null);
    const [assessmentLoading, setAssessmentLoading] = useState(false);

    // Carregar triagem prévia (GAD-7 / Autoavaliação) do paciente se o toggle estiver ativo
    useEffect(() => {
        if (!isOpen || !patient || !showTriage) {
            setAssessmentData(null);
            return;
        }

        async function fetchAssessment() {
            setAssessmentLoading(true);
            try {
                let query = supabase
                    .from('assessment_leads')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (patient.email) {
                    query = query.eq('patient_email', patient.email.trim().toLowerCase());
                } else if (patient.phone) {
                    const cleanPhone = String(patient.phone).replace(/\D/g, '');
                    query = query.ilike('patient_phone', `%${cleanPhone.slice(-8)}%`);
                } else {
                    setAssessmentData(null);
                    return;
                }

                const { data, error } = await query;
                if (!error && data && data.length > 0) {
                    setAssessmentData(data[0]);
                } else {
                    setAssessmentData(null);
                }
            } catch (err) {
                console.warn('Erro ao carregar triagem:', err);
            } finally {
                setAssessmentLoading(false);
            }
        }

        fetchAssessment();
    }, [patient, isOpen, showTriage]);

    // ── Estado do formulário de prontuário ────────────────────────────────────
    const [form, setForm] = useState({
        chief_complaint: '',
        session_development: '',
        homework: '',
        notes: '',
        session_date: new Date().toISOString().split('T')[0],
    });
    const [isSaving, setIsSaving] = useState(false);

    // ── Timer de Sessão (contabiliza tempo decorrido quando o modal está aberto) ──
    const [sessionSeconds, setSessionSeconds] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(true);

    useEffect(() => {
        if (!isOpen) {
            setSessionSeconds(0);
            setIsTimerRunning(true);
            return;
        }
        setIsTimerRunning(true);
    }, [isOpen, patient?.email]);

    useEffect(() => {
        if (!isOpen || !isTimerRunning) return;
        const interval = setInterval(() => {
            setSessionSeconds(prev => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [isOpen, isTimerRunning]);

    const formatSessionTimer = (totalSec) => {
        const hrs = Math.floor(totalSec / 3600);
        const mins = Math.floor((totalSec % 3600) / 60);
        const secs = totalSec % 60;
        const pad = (n) => String(n).padStart(2, '0');
        return hrs > 0 ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
    };

    // ── Histórico de sessões ──────────────────────────────────────────────────
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [expandedEntry, setExpandedEntry] = useState(null);

    // Sync form quando o paciente muda (apenas ao abrir o modal)
    useEffect(() => {
        if (patient && isOpen) {
            setForm(prev => {
                // Só carrega os dados se os campos estiverem vazios (evita sobrescrever após um save onde limpamos de propósito)
                // ou se o email do paciente mudou
                if (prev.lastLoadedEmail !== patient.email) {
                    return {
                        chief_complaint: patient.chief_complaint || '',
                        session_development: patient.session_development || '',
                        homework: patient.homework || '',
                        homework_visible_to_patient: patient.homework_visible_to_patient || false,
                        notes: patient.notes || '',
                        session_date: patient.session_date || new Date().toISOString().split('T')[0],
                        lastLoadedEmail: patient.email
                    };
                }
                // Se for o mesmo paciente, apenas atualiza as notas gerais (que são persistentes)
                return { ...prev, notes: patient.notes || '' };
            });
        }
    }, [patient, isOpen]);

    // Carregar histórico ao abrir aba
    const loadHistory = useCallback(async () => {
        if (!patient?.email) return;
        setHistoryLoading(true);
        try {
            const historyData = await getPatientNotesHistory(patient.email);
            setHistory(historyData || []);
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
                homework_visible_to_patient: form.homework_visible_to_patient,
                session_date: form.session_date,
            });
            toast({ title: '✅ Prontuário salvo', description: 'Sessão registrada no histórico.' });
            // Limpar todos os campos para a próxima sessão
            setForm(prev => ({ ...prev, chief_complaint: '', session_development: '', homework: '', notes: '', homework_visible_to_patient: false }));
            // Recarregar histórico
            await loadHistory();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    const tabTriggerClass = "data-[state=active]:border-b-2 data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 data-[state=active]:shadow-none bg-transparent rounded-none px-2 py-3 font-semibold text-slate-500 hover:text-slate-800 transition-colors text-xs sm:text-sm";
    const fieldClass = "w-full border border-slate-200/90 rounded-xl p-3 text-sm bg-slate-50/70 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all resize-none font-sans";

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 pointer-events-none"
                    >
                        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-4xl max-h-[90vh] overflow-hidden pointer-events-auto flex flex-col font-sans">

                            {/* Header */}
                            <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-center justify-between shrink-0 border-b border-slate-800">
                                <div className="flex items-center gap-3.5">
                                    <div className="w-11 h-11 bg-white/10 rounded-xl flex items-center justify-center text-white border border-white/10 shrink-0">
                                        <User className="w-5 h-5 text-slate-200" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">{patient.name}</h2>
                                        <p className="text-slate-400 text-xs font-medium flex items-center gap-1.5 mt-0.5">
                                            <span>Prontuário & Registro de Sessões</span>
                                            <span className="text-slate-600">•</span>
                                            <span className="text-slate-300">Sigilo CFP Res. 001/2009</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Timer de Sessão */}
                                    <div
                                        data-testid="session-timer"
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs font-mono text-emerald-400"
                                        title="Timer de Sessão (clique para pausar/retomar)"
                                    >
                                        <Clock className={`w-3.5 h-3.5 ${isTimerRunning ? 'animate-pulse text-emerald-400' : 'text-amber-400'}`} />
                                        <span className="text-slate-400 font-sans hidden md:inline">Sessão:</span>
                                        <span className="font-bold tracking-wider">{formatSessionTimer(sessionSeconds)}</span>
                                        <button
                                            type="button"
                                            onClick={() => setIsTimerRunning(prev => !prev)}
                                            className="ml-1 text-[10px] font-sans px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-slate-200 transition-colors"
                                        >
                                            {isTimerRunning ? 'Pausar' : 'Retomar'}
                                        </button>
                                    </div>
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => setIsScheduleModalOpen(true)}
                                        className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-8 px-3 flex items-center gap-1.5 shadow-xs transition-colors"
                                    >
                                        <CalendarPlus className="w-3.5 h-3.5" />
                                        <span className="hidden sm:inline">Agendar Próxima</span>
                                        <span className="sm:hidden">Agendar</span>
                                    </Button>
                                    <button
                                        id="btn-close-patient-modal"
                                        onClick={onClose}
                                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                                        aria-label="Fechar modal"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <Tabs defaultValue="prontuario" className="flex flex-col flex-1 overflow-hidden">
                                {/* Navegação das Abas */}
                                <div className="px-6 pt-1 border-b border-slate-200/80 shrink-0 bg-white">
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
                                        {/* Bloco de Triagem Emocional Prévia (Controlado por Toggle do Admin) */}
                                        {showTriage && assessmentData && (
                                            <div className="mb-5 p-4 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-purple-50/40 to-slate-50">
                                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                                                            <Brain className="w-4 h-4" />
                                                        </span>
                                                        <div>
                                                            <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                                                                Triagem Prévia: {assessmentData.assessment_title || 'Autoavaliação Psicométrica (GAD-7)'}
                                                            </h4>
                                                            <p className="text-[11px] text-slate-500">Dados autodeclarados pelo paciente antes da 1ª sessão</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                                                            assessmentData.severity === 'severe'
                                                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                                                : assessmentData.severity === 'moderate'
                                                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                        }`}>
                                                            Gravidade {assessmentData.severity === 'severe' ? 'Severa' : assessmentData.severity === 'moderate' ? 'Moderada' : assessmentData.severity === 'mild' ? 'Leve' : 'Mínima'}
                                                        </span>
                                                        <span className="text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                                                            Escore: {assessmentData.score} / {assessmentData.max_score || 21}
                                                        </span>
                                                    </div>
                                                </div>

                                                <p className="text-xs text-slate-600">
                                                    Preenchido em <strong>{new Date(assessmentData.created_at).toLocaleDateString('pt-BR')}</strong>.
                                                    {assessmentData.functional_impact && (
                                                        <span className="ml-1 text-slate-700 font-medium">
                                                            Impacto relatado nas atividades cotidianas: <em>{assessmentData.functional_impact}</em>
                                                        </span>
                                                    )}
                                                </p>

                                                {assessmentData.answers && Object.keys(assessmentData.answers).length > 0 && (
                                                    <div className="mt-2.5 pt-2 border-t border-indigo-100">
                                                        <details className="text-xs text-slate-600 cursor-pointer">
                                                            <summary className="font-semibold text-indigo-700 hover:text-indigo-800 select-none">
                                                                Ver respostas dos sintomas declarados na autoavaliação
                                                            </summary>
                                                            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 bg-white/90 rounded-lg border border-slate-200">
                                                                {Object.entries(assessmentData.answers).map(([key, val]) => (
                                                                    <div key={key} className="text-[11px] text-slate-700">
                                                                        <span className="font-bold text-slate-900">{key}:</span> {String(val)}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </details>
                                                    </div>
                                                )}
                                            </div>
                                        )}

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
                                            <div className="flex items-center space-x-2 mt-2">
                                                <input
                                                    type="checkbox"
                                                    id="homework_visible"
                                                    checked={form.homework_visible_to_patient}
                                                    onChange={e => setForm(f => ({ ...f, homework_visible_to_patient: e.target.checked }))}
                                                    className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer"
                                                />
                                                <label htmlFor="homework_visible" className="text-xs text-gray-600 cursor-pointer select-none font-medium">
                                                    Liberar visualização desta tarefa para o paciente
                                                </label>
                                            </div>
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

                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setIsScheduleModalOpen(true)}
                                                className="flex items-center gap-2 rounded-xl border-slate-300 hover:border-slate-900 text-slate-800 font-bold px-4 h-10 shadow-xs"
                                            >
                                                <CalendarPlus className="w-4 h-4 text-emerald-600" />
                                                Agendar Próxima Sessão
                                            </Button>

                                            <Button
                                                id="btn-save-prontuario"
                                                onClick={handleSaveNotes}
                                                disabled={isSaving || (!form.chief_complaint.trim() && !form.session_development.trim() && !form.notes.trim())}
                                                className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 h-10 shadow-xs transition-colors"
                                            >
                                                {isSaving
                                                    ? <><Loader2 className="w-4 h-4 animate-spin text-white" />Salvando...</>
                                                    : <><Save className="w-4 h-4 text-emerald-400" />Salvar Sessão no Histórico</>
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

            {/* Modal de Agendamento da Próxima Sessão */}
            <ScheduleNextSessionModal
                isOpen={isScheduleModalOpen}
                onClose={() => setIsScheduleModalOpen(false)}
                patient={patient}
                currentProfessional={currentProfessional}
                services={services}
                onBookingCreated={(newBooking) => {
                    if (onBookingCreated) onBookingCreated(newBooking);
                    toast({ title: '✅ Agenda atualizada', description: 'Próxima consulta gravada com sucesso.' });
                }}
            />
        </AnimatePresence>
    );
};

export default PatientDetailsModal;
