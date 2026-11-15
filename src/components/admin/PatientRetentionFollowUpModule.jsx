import React, { useState, useMemo } from 'react';
import {
    Activity,
    Users,
    Calendar,
    AlertTriangle,
    Clock,
    XCircle,
    CheckCircle2,
    TrendingUp,
    UserCheck,
    UserX,
    MessageCircle,
    ArrowRight,
    Search,
    Filter,
    Download,
    Copy,
    Check,
    HeartHandshake,
    ShieldCheck,
    Sparkles,
    CalendarPlus,
    HelpCircle,
    ChevronDown,
    ChevronUp,
    PhoneCall,
    Mail
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { usePatientRetentionQuery } from '@/hooks/queries/usePatientRetentionQuery';

const STATUS_LABELS = {
    pendente: { label: 'Pendente de Contato', color: 'bg-slate-100 text-slate-700 border-slate-300' },
    contatado: { label: 'Mensagem Enviada', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    reagendado: { label: 'Reagendado (Sucesso)', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    pausa: { label: 'Pausa Terapêutica', color: 'bg-amber-100 text-amber-800 border-amber-200' },
    concluido: { label: 'Alta / Concluído', color: 'bg-purple-100 text-purple-800 border-purple-200' }
};

export function PatientRetentionFollowUpModule({
    bookings = [],
    professionals = [],
    onNavigateTab
}) {
    const { toast } = useToast();
    const {
        summary,
        patients,
        adminStatusMap,
        updatePatientStatus
    } = usePatientRetentionQuery({ initialBookings: bookings });

    // Filtros
    const [selectedSegment, setSelectedSegment] = useState('all'); // 'all' | 'single_session' | 'over_30d' | 'critical_60d' | 'recent_no_next' | 'recovered'
    const [selectedProfessional, setSelectedProfessional] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showPlaybook, setShowPlaybook] = useState(false);

    // Modal de Acolhimento Humanizado
    const [selectedPatientForModal, setSelectedPatientForModal] = useState(null);
    const [selectedTemplateKey, setSelectedTemplateKey] = useState('firstSessionCare');
    const [customMessage, setCustomMessage] = useState('');
    const [copiedText, setCopiedText] = useState(false);

    // Filtragem dinâmica dos pacientes
    const filteredPatients = useMemo(() => {
        return patients.filter(p => {
            // Segmento
            if (selectedSegment === 'recovered') {
                if (p.followUpStatus !== 'reagendado') return false;
            } else if (selectedSegment !== 'all') {
                if (p.segment !== selectedSegment) return false;
            }

            // Profissional
            if (selectedProfessional !== 'all' && p.professionalId !== selectedProfessional) {
                return false;
            }

            // Busca por texto
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchName = (p.rawName || '').toLowerCase().includes(q);
                const matchEmail = (p.email || '').toLowerCase().includes(q);
                const matchPhone = (p.phone || '').includes(q);
                const matchProf = (p.professionalName || '').toLowerCase().includes(q);
                if (!matchName && !matchEmail && !matchPhone && !matchProf) return false;
            }

            return true;
        });
    }, [patients, selectedSegment, selectedProfessional, searchQuery]);

    // Abertura do Modal de Acolhimento
    const handleOpenContactModal = (patient) => {
        setSelectedPatientForModal(patient);
        const defaultKey = patient.segment === 'single_session' ? 'firstSessionCare' : 'gentleReconnection';
        setSelectedTemplateKey(defaultKey);
        setCustomMessage(patient.messageTemplates?.[defaultKey] || '');
        setCopiedText(false);
    };

    const handleTemplateChange = (templateKey) => {
        setSelectedTemplateKey(templateKey);
        if (selectedPatientForModal?.messageTemplates?.[templateKey]) {
            setCustomMessage(selectedPatientForModal.messageTemplates[templateKey]);
        }
    };

    const handleCopyMessage = async () => {
        if (!customMessage) return;
        try {
            await navigator.clipboard.writeText(customMessage);
            setCopiedText(true);
            toast({
                title: '✅ Mensagem copiada!',
                description: 'Texto acolhedor pronto para ser colado no WhatsApp de suporte.'
            });
            setTimeout(() => setCopiedText(false), 2500);
        } catch {
            toast({ variant: 'destructive', title: 'Erro ao copiar', description: 'Copie o texto manualmente da caixa.' });
        }
    };

    const handleSendWhatsApp = () => {
        if (!selectedPatientForModal?.cleanPhone) {
            toast({ variant: 'destructive', title: 'Sem telefone', description: 'Paciente não possui telefone cadastrado.' });
            return;
        }

        const url = `https://wa.me/${selectedPatientForModal.cleanPhone}?text=${encodeURIComponent(customMessage)}`;
        window.open(url, '_blank');

        // Atualiza automaticamente o status para contatado
        updatePatientStatus(selectedPatientForModal.patientId, 'contatado');
        toast({
            title: '💬 Conversa iniciada',
            description: `Status de ${selectedPatientForModal.rawName} atualizado para "Mensagem Enviada".`
        });
        setSelectedPatientForModal(null);
    };

    const handleExportCSV = () => {
        try {
            const headers = ['Paciente', 'Email', 'Telefone', 'Ultimo Psicologo', 'Ultima Consulta', 'Dias Sem Consulta', 'Total Sessoes', 'Segmento', 'Status Acompanhamento', 'Acao Recomendada'];
            const rows = filteredPatients.map(p => [
                `"${p.rawName || p.patientDisplay}"`,
                `"${p.email || ''}"`,
                `"${p.phone || ''}"`,
                `"${p.professionalName || ''}"`,
                `"${p.lastSessionDate || ''}"`,
                p.daysSinceLastSession,
                p.totalSessions,
                `"${p.riskReason || ''}"`,
                `"${STATUS_LABELS[p.followUpStatus]?.label || p.followUpStatus}"`,
                `"${p.suggestedAction || ''}"`
            ]);

            const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `radar-retencao-pacientes-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast({ title: '📥 Planilha exportada', description: 'Arquivo gerado com sucesso com dados da lista atual.' });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Erro na exportação', description: 'Não foi possível gerar a planilha.' });
        }
    };

    return (
        <section aria-labelledby="retention-followup-heading" className="space-y-4 sm:space-y-6 font-sans">
            {/* CABEÇALHO DO MÓDULO */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs text-slate-900">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="bg-rose-50 text-rose-700 text-xs font-semibold px-2.5 py-0.5 rounded-md flex items-center gap-1.5 border border-rose-200">
                                <HeartHandshake className="w-3.5 h-3.5 text-rose-600" />
                                Acompanhamento & Retenção Ativa
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">Reversão de Churn • Cuidado Terapêutico • CFP</span>
                        </div>
                        <h2 id="retention-followup-heading" className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                            Radar de Acompanhamento & Prevenção de Abandono
                        </h2>
                        <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                            Identifique pacientes que só realizaram 1 consulta, estão sem retorno ou em risco de abandono clínico. Direcione a equipe com abordagens acolhedoras e em conformidade ética.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowPlaybook(prev => !prev)}
                            className="rounded-xl border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 h-9"
                        >
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            {showPlaybook ? 'Ocultar Playbook Ético' : 'Playbook Ético CFP'}
                            {showPlaybook ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                        </Button>

                        <Button
                            type="button"
                            size="sm"
                            onClick={handleExportCSV}
                            className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 h-9 px-3.5 shadow-xs"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Exportar Lista CSV
                        </Button>
                    </div>
                </div>

                {/* PLAYBOOK ÉTICO EXPANSÍVEL (CFP) */}
                {showPlaybook && (
                    <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50/80 rounded-xl p-4 text-xs text-slate-700 space-y-2">
                        <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            Diretrizes Éticas de Contato com Pacientes (Código CFP / Res. 010/2005)
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-[11px] leading-relaxed">
                            <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                                <strong className="text-slate-900 block mb-0.5">1. Zero Pressão Comercial</strong>
                                Jamais utilize gatilhos de escassez ou insistência de venda. O objetivo do contato é exclusivamente demonstrar cuidado, escuta e checar o bem-estar do paciente.
                            </div>
                            <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                                <strong className="text-slate-900 block mb-0.5">2. Sigilo Clínico Absoluto</strong>
                                A equipe administrativa nunca tem acesso ao conteúdo das sessões ou anotações clínicas. As mensagens de contato tratam apenas de suporte e continuidade.
                            </div>
                            <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                                <strong className="text-slate-900 block mb-0.5">3. Respeito à Vontade</strong>
                                Se o paciente informar que deseja pausar, encerrou o processo ou não quer mensagens, respeite de imediato marcando o status como "Pausa" ou "Alta".
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* TOP METRICS - 4 CARDS VITAIS EM GRID 2X2 NO MOBILE */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 font-sans">
                {/* CARD 1: Total em Risco de Abandono */}
                <Card className="p-3.5 sm:p-5 bg-white border border-slate-200/80 rounded-xl shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                Total em Risco
                            </span>
                            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center">
                                <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </div>
                        </div>
                        <div className="mt-2 sm:mt-3">
                            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                                {summary?.totalAtRisk || 0}
                            </h3>
                            <p className="text-[11px] sm:text-xs text-slate-500 mt-1">
                                Pacientes sem retorno futuro
                            </p>
                            <p className="text-[10px] sm:text-[11px] text-rose-600 font-medium mt-1 truncate">
                                ~R$ {(summary?.potentialRecoverableRevenue || 0).toFixed(2)} em sessões
                            </p>
                        </div>
                    </div>
                </Card>

                {/* CARD 2: Drop-off da 1ª Consulta (Gargalo Crítico) */}
                <Card className="p-3.5 sm:p-5 bg-white border border-slate-200/80 rounded-xl shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">
                                Só 1 Consulta Feita
                            </span>
                            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-rose-100 text-rose-700 border border-rose-200 flex items-center justify-center">
                                <UserX className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </div>
                        </div>
                        <div className="mt-2 sm:mt-3">
                            <h3 className="text-xl sm:text-2xl font-extrabold text-rose-900 tracking-tight tabular-nums">
                                {summary?.singleSessionDropoffCount || 0}
                            </h3>
                            <p className="text-[11px] sm:text-xs text-slate-500 mt-1">
                                Drop-off imediato após 1ª sessão
                            </p>
                            <span className="inline-block text-[10px] sm:text-[11px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded mt-1">
                                Prioridade Máxima
                            </span>
                        </div>
                    </div>
                </Card>

                {/* CARD 3: Sem Consulta há > 30 Dias */}
                <Card className="p-3.5 sm:p-5 bg-white border border-slate-200/80 rounded-xl shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                Inativos {'>'} 30 Dias
                            </span>
                            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
                                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </div>
                        </div>
                        <div className="mt-2 sm:mt-3">
                            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                                {(summary?.over30DaysNoReturnCount || 0) + (summary?.criticalOver60DaysCount || 0)}
                            </h3>
                            <p className="text-[11px] sm:text-xs text-slate-500 mt-1">
                                {summary?.criticalOver60DaysCount || 0} inativos há mais de 60d
                            </p>
                            <p className="text-[10px] sm:text-[11px] text-amber-600 font-medium mt-1 truncate">
                                Requer acolhimento de reconexão
                            </p>
                        </div>
                    </div>
                </Card>

                {/* CARD 4: Pacientes Reagendados / Revertidos */}
                <Card className="p-3.5 sm:p-5 bg-white border border-slate-200/80 rounded-xl shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
                                Reagendados / Revertidos
                            </span>
                            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                                <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </div>
                        </div>
                        <div className="mt-2 sm:mt-3">
                            <h3 className="text-xl sm:text-2xl font-extrabold text-emerald-900 tracking-tight tabular-nums">
                                {summary?.followUpFunnelCounts?.reagendado || 0}
                            </h3>
                            <p className="text-[11px] sm:text-xs text-slate-500 mt-1">
                                {summary?.followUpFunnelCounts?.contatado || 0} com mensagem em andamento
                            </p>
                            <p className="text-[10px] sm:text-[11px] text-emerald-600 font-medium mt-1 truncate">
                                Sucesso da intervenção administrativa
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* SELETORES DE FILTROS & BARRA DE BUSCA */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3 font-sans">
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                    {/* Barra de Busca */}
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Buscar paciente, psicólogo, e-mail ou telefone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                        />
                    </div>

                    {/* Filtro por Profissional */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Psicólogo:</span>
                        <select
                            value={selectedProfessional}
                            onChange={(e) => setSelectedProfessional(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none"
                        >
                            <option value="all">Todos os Psicólogos</option>
                            {professionals.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Pills de Segmentos de Retenção */}
                <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto scrollbar-none pt-1">
                    {[
                        { id: 'all', label: 'Todos no Radar', count: summary?.totalAtRisk || 0 },
                        { id: 'single_session', label: '🚨 Só 1 Consulta (Drop-off)', count: summary?.singleSessionDropoffCount || 0 },
                        { id: 'over_30d', label: '⚠️ Inativo 30d-59d', count: summary?.over30DaysNoReturnCount || 0 },
                        { id: 'critical_60d', label: '🟣 Crítico 60d+', count: summary?.criticalOver60DaysCount || 0 },
                        { id: 'recent_no_next', label: '🔵 Preventivo (8-29d)', count: summary?.recentWithoutNextCount || 0 },
                        { id: 'recovered', label: '✅ Reagendados', count: summary?.followUpFunnelCounts?.reagendado || 0 }
                    ].map(seg => (
                        <button
                            key={seg.id}
                            type="button"
                            onClick={() => setSelectedSegment(seg.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                                selectedSegment === seg.id
                                    ? 'bg-slate-900 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                            }`}
                        >
                            <span>{seg.label}</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                                selectedSegment === seg.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                            }`}>
                                {seg.count}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* TABELA / LISTA DE PACIENTES PARA ACOMPANHAMENTO */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden font-sans">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                                <th className="py-3 px-4">Paciente</th>
                                <th className="py-3 px-4">Último Atendimento</th>
                                <th className="py-3 px-4 text-center">Inatividade</th>
                                <th className="py-3 px-4">Risco & Sugestão</th>
                                <th className="py-3 px-4 text-center">Status do Admin</th>
                                <th className="py-3 px-4 text-right">Ação Direcionada</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {filteredPatients.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-slate-400">
                                        <div className="max-w-sm mx-auto space-y-2">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                                                <UserCheck className="w-5 h-5" />
                                            </div>
                                            <p className="font-semibold text-slate-700 text-sm">Nenhum paciente localizado</p>
                                            <p className="text-xs text-slate-500">
                                                Não há pacientes correspondentes aos filtros selecionados. Todos os pacientes podem estar com consultas futuras agendadas!
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredPatients.map((patient) => {
                                    const statusInfo = STATUS_LABELS[patient.followUpStatus] || STATUS_LABELS.pendente;

                                    return (
                                        <tr key={patient.patientId} className="hover:bg-slate-50/70 transition-colors">
                                            {/* Paciente */}
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-800 font-bold flex items-center justify-center text-xs shrink-0">
                                                        {patient.rawName?.charAt(0) || 'P'}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 text-xs">{patient.rawName}</p>
                                                        <p className="text-[11px] text-slate-500">
                                                            {patient.email || patient.phone || 'Sem contato cadastrado'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Último Atendimento */}
                                            <td className="py-3.5 px-4">
                                                <p className="font-semibold text-slate-800 text-xs">{patient.professionalName}</p>
                                                <p className="text-[11px] text-slate-500">
                                                    {patient.lastSessionDate
                                                        ? new Date(patient.lastSessionDate + 'T12:00:00').toLocaleDateString('pt-BR')
                                                        : '—'} ({patient.totalSessions} {patient.totalSessions === 1 ? 'consulta' : 'consultas'})
                                                </p>
                                            </td>

                                            {/* Dias de Inatividade */}
                                            <td className="py-3.5 px-4 text-center">
                                                <span className={`inline-block px-2.5 py-1 rounded-full font-bold text-[11px] ${
                                                    patient.segment === 'single_session'
                                                        ? 'bg-rose-100 text-rose-900 border border-rose-200'
                                                        : patient.daysSinceLastSession >= 60
                                                        ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                                        : patient.daysSinceLastSession >= 30
                                                        ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                                        : 'bg-blue-100 text-blue-900 border border-blue-200'
                                                }`}>
                                                    {patient.daysSinceLastSession} dias
                                                </span>
                                            </td>

                                            {/* Risco & Diagnóstico */}
                                            <td className="py-3.5 px-4 max-w-xs">
                                                <p className="font-semibold text-slate-900 text-[11px]">{patient.riskReason}</p>
                                                <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{patient.suggestedAction}</p>
                                            </td>

                                            {/* Status do Admin (Interativo) */}
                                            <td className="py-3.5 px-4 text-center">
                                                <select
                                                    value={patient.followUpStatus}
                                                    onChange={(e) => updatePatientStatus(patient.patientId, e.target.value)}
                                                    className={`px-2 py-1 rounded-lg border text-[11px] font-bold outline-none cursor-pointer ${statusInfo.color}`}
                                                >
                                                    <option value="pendente">⏳ Pendente</option>
                                                    <option value="contatado">💬 Mensagem Enviada</option>
                                                    <option value="reagendado">✅ Reagendado</option>
                                                    <option value="pausa">⏸️ Pausa Terapêutica</option>
                                                    <option value="concluido">🏁 Concluído / Alta</option>
                                                </select>
                                            </td>

                                            {/* Ações */}
                                            <td className="py-3.5 px-4 text-right">
                                                <div className="inline-flex items-center gap-1.5">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        onClick={() => handleOpenContactModal(patient)}
                                                        className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs h-8 px-3 flex items-center gap-1 shadow-xs"
                                                    >
                                                        <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                                                        Acolher Paciente
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL DE ACOLHIMENTO HUMANIZADO & DIRECIONAMENTO (CFP) */}
            <Dialog open={Boolean(selectedPatientForModal)} onOpenChange={(open) => !open && setSelectedPatientForModal(null)}>
                <DialogContent className="sm:max-w-xl rounded-2xl bg-white p-6 font-sans">
                    <DialogHeader>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                                <HeartHandshake className="w-4 h-4" />
                            </span>
                            <DialogTitle className="text-lg font-bold text-slate-900">
                                Acolhimento Humanizado do Paciente
                            </DialogTitle>
                        </div>
                        <DialogDescription className="text-xs text-slate-500">
                            Diretrizes de cuidado ético e aproximação acolhedora para continuidade terapêutica.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedPatientForModal && (
                        <div className="space-y-4 py-2">
                            {/* Card Resumo do Paciente */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                                <div>
                                    <p className="font-bold text-slate-900 text-xs">{selectedPatientForModal.rawName}</p>
                                    <p className="text-[11px] text-slate-500">
                                        Psicólogo: <strong className="text-slate-800">{selectedPatientForModal.professionalName}</strong> • {selectedPatientForModal.totalSessions} consulta(s) • sem retorno há {selectedPatientForModal.daysSinceLastSession} dias
                                    </p>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    selectedPatientForModal.segment === 'single_session'
                                        ? 'bg-rose-100 text-rose-800'
                                        : 'bg-amber-100 text-amber-800'
                                }`}>
                                    {selectedPatientForModal.segment === 'single_session' ? 'Só 1 Consulta' : 'Inativo 30d+'}
                                </span>
                            </div>

                            {/* Seletor de Script / Template */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Selecione o Tom da Abordagem
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleTemplateChange('firstSessionCare')}
                                        className={`p-2.5 rounded-xl border text-left transition-all ${
                                            selectedTemplateKey === 'firstSessionCare'
                                                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        <p className="font-bold text-xs">1ª Consulta</p>
                                        <p className="text-[10px] opacity-80 mt-0.5">Acolher e checar bem-estar</p>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleTemplateChange('gentleReconnection')}
                                        className={`p-2.5 rounded-xl border text-left transition-all ${
                                            selectedTemplateKey === 'gentleReconnection'
                                                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        <p className="font-bold text-xs">Reconexão Suave</p>
                                        <p className="text-[10px] opacity-80 mt-0.5">Respeito ao tempo e pausa</p>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleTemplateChange('operationalSupport')}
                                        className={`p-2.5 rounded-xl border text-left transition-all ${
                                            selectedTemplateKey === 'operationalSupport'
                                                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        <p className="font-bold text-xs">Apoio na Agenda</p>
                                        <p className="text-[10px] opacity-80 mt-0.5">Horários e facilitação</p>
                                    </button>
                                </div>
                            </div>

                            {/* Caixa de Texto da Mensagem Editável */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                        Mensagem Sugerida (Editável)
                                    </label>
                                    <span className="text-[10px] text-slate-400">Pautada nas diretrizes do CFP</span>
                                </div>
                                <textarea
                                    rows={5}
                                    value={customMessage}
                                    onChange={(e) => setCustomMessage(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 font-sans focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none leading-relaxed"
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleCopyMessage}
                            className="w-full sm:w-auto rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
                        >
                            {copiedText ? (
                                <><Check className="w-3.5 h-3.5 text-emerald-600" /> Copiado!</>
                            ) : (
                                <><Copy className="w-3.5 h-3.5" /> Copiar Mensagem</>
                            )}
                        </Button>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedPatientForModal(null)}
                                className="flex-1 sm:flex-initial rounded-xl text-xs font-semibold"
                            >
                                Fechar
                            </Button>

                            <Button
                                type="button"
                                size="sm"
                                onClick={handleSendWhatsApp}
                                className="flex-1 sm:flex-initial rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
                            >
                                <MessageCircle className="w-3.5 h-3.5" />
                                Abrir no WhatsApp
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </section>
    );
}

export default PatientRetentionFollowUpModule;
