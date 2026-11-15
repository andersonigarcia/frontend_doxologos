import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import {
    Sparkles,
    ShieldCheck,
    FileText,
    CheckCircle2,
    Clock,
    Copy,
    Lock,
    AlertCircle,
    Loader2,
    Info
} from 'lucide-react';

export function ClinicalEvolutionCopilotModal({
    isOpen,
    onClose,
    booking,
    professional,
    onSaved
}) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [notes, setNotes] = useState('');
    const [existingRecord, setExistingRecord] = useState(null);

    // Estrutura S.O.A.P.
    const [soapData, setSoapData] = useState({
        subjective: '',
        objective: '',
        assessment: '',
        plan: ''
    });

    const [trialInfo, setTrialInfo] = useState({
        used: professional?.ai_trial_sessions_used || 0,
        limit: professional?.ai_trial_limit || 3,
        enabled: professional?.ai_copilot_enabled ?? true
    });

    // Carregar prontuário existente se houver
    useEffect(() => {
        if (!isOpen || !booking?.id) return;

        const loadEvolution = async () => {
            setLoading(true);
            try {
                // Atualizar dados de trial do profissional
                if (professional?.id) {
                    const { data: profData } = await supabase
                        .from('professionals')
                        .select('ai_copilot_enabled, ai_trial_sessions_used, ai_trial_limit')
                        .eq('id', professional.id)
                        .maybeSingle();

                    if (profData) {
                        setTrialInfo({
                            used: profData.ai_trial_sessions_used || 0,
                            limit: profData.ai_trial_limit || 3,
                            enabled: profData.ai_copilot_enabled ?? true
                        });
                    }
                }

                // Buscar evolução clínica existente
                const { data, error } = await supabase
                    .from('clinical_evolutions')
                    .select('*')
                    .eq('booking_id', booking.id)
                    .maybeSingle();

                if (!error && data) {
                    setExistingRecord(data);
                    if (data.professional_notes) {
                        setNotes(data.professional_notes);
                    }
                    if (data.ai_generated_summary) {
                        setSoapData({
                            subjective: data.ai_generated_summary.subjective || '',
                            objective: data.ai_generated_summary.objective || '',
                            assessment: data.ai_generated_summary.assessment || '',
                            plan: data.ai_generated_summary.plan || ''
                        });
                    }
                } else {
                    setExistingRecord(null);
                    setSoapData({ subjective: '', objective: '', assessment: '', plan: '' });
                }
            } catch (err) {
                console.error('Erro ao carregar prontuário:', err);
            } finally {
                setLoading(false);
            }
        };

        loadEvolution();
    }, [isOpen, booking?.id, professional?.id]);

    const isTrialAvailable = trialInfo.used < trialInfo.limit;

    const handleGenerateSummary = async () => {
        if (!notes.trim()) {
            toast({
                variant: 'destructive',
                title: 'Observações necessárias',
                description: 'Insira tópicos ou anotações chave da sessão para a IA sintetizar o prontuário.'
            });
            return;
        }

        setGenerating(true);
        try {
            const { data, error } = await supabase.functions.invoke('generate-session-summary', {
                body: {
                    booking_id: booking.id,
                    bookingId: booking.id,
                    raw_notes: notes,
                    notes: notes,
                    professionalId: professional?.id || booking.professional_id
                }
            });

            if (error) throw error;

            if (data?.summary) {
                setSoapData({
                    subjective: data.summary.subjective || '',
                    objective: data.summary.objective || '',
                    assessment: data.summary.assessment || '',
                    plan: data.summary.plan || ''
                });

                if (data.trial_info) {
                    setTrialInfo({
                        used: data.trial_info.trial_sessions_used,
                        limit: data.trial_info.trial_limit,
                        enabled: true
                    });
                }

                toast({
                    title: 'Rascunho gerado com sucesso!',
                    description: data.is_trial
                        ? `Degustação gratuita aplicada (${data.trial_info?.trial_sessions_used}/${data.trial_info?.trial_limit}).`
                        : 'Valor de R$ 2,90 registrado no demonstrativo de repasse.'
                });
            }
        } catch (err) {
            console.error('Erro ao gerar resumo clínico:', err);
            toast({
                variant: 'destructive',
                title: 'Erro ao gerar evolução com IA',
                description: err.message || 'Verifique sua conexão ou tente novamente.'
            });
        } finally {
            setGenerating(false);
        }
    };

    const handleSaveEvolution = async () => {
        setLoading(true);
        try {
            const patientUserId = booking.user_id || booking.patient_id;
            const profId = professional?.id || booking.professional_id;

            const payload = {
                booking_id: booking.id,
                patient_id: patientUserId,
                professional_id: profId,
                professional_notes: notes,
                ai_generated_summary: soapData,
                status: 'approved',
                approved_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('clinical_evolutions')
                .upsert(payload, { onConflict: 'booking_id' })
                .select()
                .single();

            if (error) throw error;

            setExistingRecord(data);
            toast({
                title: 'Prontuário salvo e homologado!',
                description: 'A evolução clínica está arquivada com sigilo profissional (Res. CFP 01/2009).'
            });
            onSaved?.();
            onClose();
        } catch (err) {
            console.error('Erro ao salvar prontuário:', err);
            toast({
                variant: 'destructive',
                title: 'Erro ao salvar evolução',
                description: err.message
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCopyFormattedText = () => {
        const text = `=== EVOLUÇÃO CLÍNICA PSICOLÓGICA (CFP 01/2009) ===
Paciente: ${booking?.patient_name || 'Paciente'}
Data da Sessão: ${booking?.booking_date ? new Date(`${booking.booking_date}T00:00:00`).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'} às ${booking?.booking_time || '-'}h
Profissional: ${professional?.name || 'Psicólogo(a)'}

1. SUBJETIVO (Relato e Queixa):
${soapData.subjective || 'Não informado'}

2. OBJETIVO (Observações Clínicas e Exame do Estado Mental):
${soapData.objective || 'Não informado'}

3. AVALIAÇÃO (Análise e Hipótese Clínica):
${soapData.assessment || 'Não informado'}

4. PLANO TERAPÊUTICO (Intervenções e Conduta):
${soapData.plan || 'Não informado'}

Data de Homologação: ${new Date().toLocaleString('pt-BR')}`;

        navigator.clipboard.writeText(text);
        toast({
            title: 'Copiado para a área de transferência!',
            description: 'Você pode colar diretamente no prontuário externo ou e-Psi.'
        });
    };

    if (!booking) return null;

    return (
        <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="border-b pb-3">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
                            <Sparkles className="w-5 h-5 text-emerald-600 animate-pulse" />
                            Copiloto IA: Evolução Clínica e Prontuário
                        </DialogTitle>
                        <span className="flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full font-semibold">
                            <Lock className="w-3.5 h-3.5" /> Sigilo CFP 01/2009 & LGPD
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        Paciente: <strong className="text-slate-800">{booking.patient_name || 'Paciente'}</strong> |
                        Data: <strong>{booking.booking_date ? new Date(`${booking.booking_date}T00:00:00`).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'} às {booking.booking_time}h</strong>
                    </p>
                </DialogHeader>

                {/* Banner de Monetização & Degustação */}
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-3.5 my-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                        <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                        <div>
                            <div className="text-xs font-bold text-emerald-900 flex items-center gap-2">
                                Assistente Clínico Inteligente
                                {isTrialAvailable ? (
                                    <span className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                                        Degustação: {trialInfo.limit - trialInfo.used} restantes
                                    </span>
                                ) : (
                                    <span className="bg-slate-700 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                                        R$ 2,90 / sessão
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px] text-emerald-800 mt-0.5">
                                {isTrialAvailable
                                    ? `Você possui ${trialInfo.limit - trialInfo.used} consultas gratuitas de teste para experimentar a geração automática de prontuários estruturados.`
                                    : 'Acesso contínuo sob demanda: apenas R$ 2,90 por rascunho homologado, debitado diretamente no repasse.'}
                            </p>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                        <span className="text-xs text-slate-500 font-medium">Carregando dados clínicos com criptografia...</span>
                    </div>
                ) : (
                    <div className="space-y-4 py-2 text-xs">
                        {/* 1. Anotações Rápidas do Psicólogo */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="font-bold text-slate-800 flex items-center gap-1.5">
                                    <FileText className="w-4 h-4 text-emerald-600" />
                                    Anotações e Palavras-chave da Sessão
                                </label>
                                <span className="text-[11px] text-slate-400">Insira tópicos ou transcrição resumida</span>
                            </div>
                            <textarea
                                rows={3}
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Ex: Paciente relata melhora na ansiedade social após aplicar técnicas de exposição gradual. Queixa de insônia leve decorrente de prazos no trabalho. Trabalhamos identificação de pensamentos automáticos e higiene do sono..."
                                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-sans"
                            />
                            <div className="flex justify-end mt-2">
                                <Button
                                    size="sm"
                                    onClick={handleGenerateSummary}
                                    disabled={generating || !notes.trim()}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-sm"
                                >
                                    {generating ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            Sintetizando S.O.A.P. com IA...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-3.5 h-3.5" />
                                            Gerar Rascunho com IA (CFP)
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* 2. Formulário S.O.A.P. Estruturado */}
                        <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                            <div className="flex items-center justify-between border-b pb-2">
                                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    Prontuário Estruturado no Padrão S.O.A.P.
                                </span>
                                {soapData.subjective && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleCopyFormattedText}
                                        className="h-7 text-xs text-slate-600 hover:text-emerald-700 gap-1"
                                    >
                                        <Copy className="w-3.5 h-3.5" /> Copiar Texto
                                    </Button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">
                                        1. Subjetivo (Queixa e Relato):
                                    </label>
                                    <textarea
                                        rows={4}
                                        value={soapData.subjective}
                                        onChange={e => setSoapData({ ...soapData, subjective: e.target.value })}
                                        placeholder="Relato trazido pelo paciente durante a consulta..."
                                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                                    />
                                </div>

                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">
                                        2. Objetivo (Observações Clínicas):
                                    </label>
                                    <textarea
                                        rows={4}
                                        value={soapData.objective}
                                        onChange={e => setSoapData({ ...soapData, objective: e.target.value })}
                                        placeholder="Comportamento, estado de humor, atenção, discurso..."
                                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                                    />
                                </div>

                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">
                                        3. Avaliação (Análise Técnica CFP):
                                    </label>
                                    <textarea
                                        rows={4}
                                        value={soapData.assessment}
                                        onChange={e => setSoapData({ ...soapData, assessment: e.target.value })}
                                        placeholder="Interpretação clínica, evolução dos sintomas, hipótese diagnóstica..."
                                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                                    />
                                </div>

                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">
                                        4. Plano Terapêutico (Conduta):
                                    </label>
                                    <textarea
                                        rows={4}
                                        value={soapData.plan}
                                        onChange={e => setSoapData({ ...soapData, plan: e.target.value })}
                                        placeholder="Tarefas intersessão, intervenções planejadas para próximo encontro..."
                                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Aviso Ético de Conformidade CFP */}
                        <div className="flex items-start gap-2 bg-amber-50/80 border border-amber-200/80 rounded-xl p-3 text-[11px] text-amber-900">
                            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <p>
                                <strong>Resolução CFP nº 01/2009 e Código de Ética Profissional:</strong> O resumo gerado por IA serve como ferramenta de produtividade e apoio técnico preliminar. A conferência, adequação clínica e assinatura de homologação permanecem sob responsabilidade técnica indelegável do(a) psicólogo(a) assistente.
                            </p>
                        </div>
                    </div>
                )}

                <DialogFooter className="border-t pt-3 flex items-center justify-between sm:justify-between w-full">
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Status:{' '}
                        <strong className={existingRecord?.status === 'approved' ? 'text-emerald-700' : 'text-amber-700'}>
                            {existingRecord?.status === 'approved' ? 'Homologado no Prontuário' : 'Rascunho Pendente'}
                        </strong>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={onClose} disabled={loading || generating}>
                            Fechar
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSaveEvolution}
                            disabled={loading || generating || (!soapData.subjective && !notes)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1"
                        >
                            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            Salvar e Homologar Prontuário
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
