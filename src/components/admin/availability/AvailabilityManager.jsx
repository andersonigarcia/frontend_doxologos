import React, { useState, useEffect, useRef } from 'react';
import { CalendarX, Clock, Calendar as CalendarIcon, Save, Sparkles, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DayScheduleCard } from './DayScheduleCard';
import { LoadingButton } from '@/components/LoadingOverlay';
import { BlockedDatesModal } from './BlockedDatesModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

export const AvailabilityManager = ({
    userRole,
    professionals,
    selectedAvailProfessional,
    setSelectedAvailProfessional,
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    professionalAvailability,
    setProfessionalAvailability,
    handleSaveAvailability,
    isLoadingSave,
    blockedDates,
    newBlockedDate,
    setNewBlockedDate,
    handleAddBlockedDate,
    handleDeleteBlockedDate,
    professionalBlockedDates
}) => {
    const [isBlockedDatesModalOpen, setIsBlockedDatesModalOpen] = useState(false);
    const [isReplicateModalOpen, setIsReplicateModalOpen] = useState(false);
    const [initialStateSnapshot, setInitialStateSnapshot] = useState(JSON.stringify(professionalAvailability));
    const [isDirty, setIsDirty] = useState(false);
    const isAwaitingFetchRef = useRef(true);

    const dayKeys = [
        { key: 'monday', label: 'Segunda-feira' },
        { key: 'tuesday', label: 'Terça-feira' },
        { key: 'wednesday', label: 'Quarta-feira' },
        { key: 'thursday', label: 'Quinta-feira' },
        { key: 'friday', label: 'Sexta-feira' },
        { key: 'saturday', label: 'Sábado' },
        { key: 'sunday', label: 'Domingo' }
    ];

    // Quando troca de profissional, mês ou ano: marca que os dados da API ainda estão sendo buscados
    useEffect(() => {
        isAwaitingFetchRef.current = true;
        setIsDirty(false);
    }, [selectedAvailProfessional, selectedMonth, selectedYear]);

    // Sempre que professionalAvailability atualiza:
    // - Se estávamos aguardando o carregamento da API (troca de seleção), atualiza o snapshot inicial do profissional e mantém o balão oculto.
    // - Se NÃO estávamos aguardando (edição do usuário nos horários), compara com o snapshot para exibir/ocultar o balão.
    useEffect(() => {
        const currentString = JSON.stringify(professionalAvailability);
        if (isAwaitingFetchRef.current) {
            setInitialStateSnapshot(currentString);
            setIsDirty(false);
            isAwaitingFetchRef.current = false;
        } else {
            setIsDirty(currentString !== initialStateSnapshot);
        }
    }, [professionalAvailability, initialStateSnapshot]);

    // Alerta antes de fechar a aba se houver alterações não salvas
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    const handleAddSlot = (dayKey, time) => {
        setProfessionalAvailability(prev => ({
            ...prev,
            [dayKey]: [...(prev[dayKey] || []), time].sort()
        }));
    };

    const handleAddMultipleSlots = (dayKey, times) => {
        setProfessionalAvailability(prev => {
            const currentSlots = prev[dayKey] || [];
            const uniqueSlots = [...new Set([...currentSlots, ...times])].sort();
            return {
                ...prev,
                [dayKey]: uniqueSlots
            };
        });
    };

    const handleRemoveSlot = (dayKey, timeToRemove) => {
        setProfessionalAvailability(prev => ({
            ...prev,
            [dayKey]: (prev[dayKey] || []).filter(t => t !== timeToRemove)
        }));
    };

    const handleCopyToAll = (sourceDayKey) => {
        const sourceSlots = professionalAvailability[sourceDayKey] || [];
        if (sourceSlots.length === 0) return;

        setProfessionalAvailability(prev => {
            const next = { ...prev };
            dayKeys.forEach(({ key }) => {
                if (key === sourceDayKey) return;
                next[key] = [...sourceSlots];
            });
            return next;
        });
    };

    const handleClearDay = (dayKey) => {
        setProfessionalAvailability(prev => ({
            ...prev,
            [dayKey]: []
        }));
    };

    const handleResetChanges = () => {
        try {
            setProfessionalAvailability(JSON.parse(initialStateSnapshot));
            setIsDirty(false);
        } catch (e) {
            console.error('Erro ao restaurar rascunho:', e);
        }
    };

    const onSaveClick = async (replicate = false) => {
        if (handleSaveAvailability) {
            await handleSaveAvailability({ replicateMonths: replicate });
            setInitialStateSnapshot(JSON.stringify(professionalAvailability));
            setIsDirty(false);
        }
    };

    const monthNames = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    // Calcula quais os próximos 3 meses para a mensagem de confirmação
    const m1 = selectedMonth;
    const m2 = (selectedMonth % 12) + 1;
    const m3 = ((selectedMonth + 1) % 12) + 1;

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 relative">
            {/* Header da Seção */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-gray-100 pb-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center text-gray-900">
                        <Clock className="w-6 h-6 mr-2 text-[#2d8659]" />
                        Gestão de Disponibilidade de Agenda
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Configure os horários de atendimento da semana. Você pode salvar para o mês selecionado ou replicar para o trimestre inteiro.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <Button
                        variant="outline"
                        onClick={() => setIsBlockedDatesModalOpen(true)}
                        className="rounded-full border-rose-200 text-rose-700 hover:bg-rose-50"
                    >
                        <CalendarX className="w-4 h-4 mr-2" />
                        Bloqueios e Férias
                    </Button>

                    <Button
                        variant="outline"
                        onClick={() => setIsReplicateModalOpen(true)}
                        className="rounded-full border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 font-semibold"
                    >
                        <Layers className="w-4 h-4 mr-2 text-indigo-600" />
                        Replicar para 3 Meses 🚀
                    </Button>

                    <LoadingButton
                        isLoading={isLoadingSave}
                        loadingText="Salvando..."
                        onClick={() => onSaveClick(false)}
                        className="rounded-full bg-[#2d8659] hover:bg-[#236b47] text-white h-10 px-6 shadow-sm flex items-center justify-center gap-2 font-semibold"
                    >
                        <Save className="w-4 h-4" />
                        Salvar Disponibilidade
                    </LoadingButton>
                </div>
            </div>

            {/* Filtro de Profissional (para Admins) */}
            {userRole === 'admin' && (
                <div className="mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-gray-700">Selecione o Profissional</label>
                    <select
                        value={selectedAvailProfessional}
                        onChange={e => setSelectedAvailProfessional(e.target.value)}
                        className="w-full input bg-white rounded-xl font-semibold"
                    >
                        <option value="">Selecione um profissional</option>
                        {professionals.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* Seletor de Mês e Ano */}
            <div className="flex flex-col md:flex-row gap-4 mb-8 bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100">
                <div className="flex-1">
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5 text-emerald-900">
                        <CalendarIcon className="w-4 h-4 text-emerald-600" /> Mês de Referência
                    </label>
                    <select
                        value={selectedMonth}
                        onChange={e => setSelectedMonth(Number(e.target.value))}
                        className="w-full input rounded-xl font-semibold bg-white border-emerald-200"
                    >
                        {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>
                                {monthNames[i + 1]}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex-1">
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-emerald-900">Ano</label>
                    <select
                        value={selectedYear}
                        onChange={e => setSelectedYear(Number(e.target.value))}
                        className="w-full input rounded-xl font-semibold bg-white border-emerald-200"
                    >
                        {[2024, 2025, 2026, 2027].map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Grid dos Cards de Cada Dia da Semana */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
                {dayKeys.map(({ key, label }) => (
                    <DayScheduleCard
                        key={key}
                        dayKey={key}
                        dayLabel={label}
                        slots={professionalAvailability[key] || []}
                        onAddSlot={handleAddSlot}
                        onAddMultipleSlots={handleAddMultipleSlots}
                        onRemoveSlot={handleRemoveSlot}
                        onCopyToAll={handleCopyToAll}
                        onClearDay={handleClearDay}
                    />
                ))}
            </div>

            {/* Seção de Bloqueios de Férias e Exceções */}
            {professionalBlockedDates && professionalBlockedDates.length > 0 && (
                <div className="mt-8 border-t pt-6">
                    <h3 className="text-lg font-bold mb-4 flex items-center text-gray-800">
                        <CalendarX className="w-5 h-5 mr-2 text-rose-600" />
                        Férias e Dias Bloqueados
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {professionalBlockedDates.map((block) => (
                            <div key={block.id} className="bg-rose-50 border border-rose-100 rounded-xl p-4 transition-all hover:border-rose-200 hover:shadow-sm group">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <CalendarIcon className="w-4 h-4 text-rose-500" />
                                            <span className="font-bold text-rose-900 text-sm">
                                                {new Date(block.blocked_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                            </span>
                                        </div>

                                        {block.start_time && block.end_time ? (
                                            <div className="flex items-center gap-2 text-xs text-rose-700 mb-2 font-medium">
                                                <Clock className="w-3 h-3" />
                                                <span>{block.start_time} - {block.end_time}</span>
                                            </div>
                                        ) : (
                                            <div className="mb-2">
                                                <span className="text-xs font-semibold bg-rose-200 text-rose-800 px-2 py-0.5 rounded-full">
                                                    Dia Inteiro Bloqueado
                                                </span>
                                            </div>
                                        )}

                                        {block.reason && (
                                            <p className="text-xs text-rose-700 bg-rose-100/50 p-2 rounded-lg italic">
                                                "{block.reason}"
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleDeleteBlockedDate(block.id)}
                                        className="text-rose-400 hover:text-rose-700 p-1 rounded-md hover:bg-rose-100 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        title="Remover bloqueio"
                                    >
                                        <CalendarX className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* STICKY SAVE BAR (Barra Flutuante de Salvamento de Alterações) */}
            {isDirty && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3.5 rounded-2xl shadow-2xl border border-slate-800 flex items-center justify-between gap-6 animate-in slide-in-from-bottom-5 duration-300 w-[90%] max-w-2xl">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                        <div>
                            <p className="text-sm font-bold">Você possui alterações não salvas na agenda!</p>
                            <p className="text-xs text-slate-400">Clique em salvar para atualizar os horários visíveis para os pacientes.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={handleResetChanges}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
                        >
                            Descartar
                        </button>

                        <LoadingButton
                            isLoading={isLoadingSave}
                            loadingText="Salvando..."
                            onClick={() => onSaveClick(false)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold px-4 py-2 shadow-md shadow-emerald-900/40"
                        >
                            Salvar Agora
                        </LoadingButton>
                    </div>
                </div>
            )}

            {/* Modal de Confirmação da Replicação para 3 Meses */}
            <Dialog open={isReplicateModalOpen} onOpenChange={setIsReplicateModalOpen}>
                <DialogContent className="max-w-md bg-white rounded-3xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2 text-indigo-900">
                            <Layers className="w-6 h-6 text-indigo-600" /> Replicar Agenda para 3 Meses
                        </DialogTitle>
                        <DialogDescription className="text-sm text-gray-600 mt-2">
                            Essa opção aplica automaticamente a sua grade de horários atual nos <strong>3 meses subsequentes</strong> de forma rápida:
                        </DialogDescription>
                    </DialogHeader>

                    <div className="my-4 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 text-xs text-indigo-900 space-y-2">
                        <p className="font-bold">Meses que serão atualizados:</p>
                        <ul className="list-disc list-inside space-y-1 font-semibold">
                            <li>{monthNames[m1]} / {selectedYear} (Mês Atual)</li>
                            <li>{monthNames[m2]} / {selectedYear}</li>
                            <li>{monthNames[m3]} / {selectedYear}</li>
                        </ul>
                        <p className="text-[11px] text-indigo-700 italic mt-2">
                          *Isso garante que os pacientes consigam agendar consultas nos próximos meses sem você precisar trocar o mês no menu.*
                        </p>
                    </div>

                    <DialogFooter className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setIsReplicateModalOpen(false)} className="rounded-xl">
                            Cancelar
                        </Button>
                        <Button
                            onClick={async () => {
                                setIsReplicateModalOpen(false);
                                await onSaveClick(true);
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold"
                        >
                            Confirmar & Replicar 🚀
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Bloqueios e Exceções */}
            <BlockedDatesModal
                open={isBlockedDatesModalOpen}
                onClose={() => setIsBlockedDatesModalOpen(false)}
                blockedDates={blockedDates}
                newBlockedDate={newBlockedDate}
                setNewBlockedDate={setNewBlockedDate}
                handleAddBlockedDate={handleAddBlockedDate}
                handleDeleteBlockedDate={handleDeleteBlockedDate}
                professionalBlockedDates={professionalBlockedDates}
            />
        </div>
    );
};
