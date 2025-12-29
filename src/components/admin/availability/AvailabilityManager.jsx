import React, { useState } from 'react';
import { CalendarX, Clock, Calendar as CalendarIcon, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DayScheduleCard } from './DayScheduleCard';
import { LoadingButton } from '@/components/LoadingOverlay';
import { BlockedDatesModal } from './BlockedDatesModal';

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

    const dayKeys = [
        { key: 'monday', label: 'Segunda-feira' },
        { key: 'tuesday', label: 'Terça-feira' },
        { key: 'wednesday', label: 'Quarta-feira' },
        { key: 'thursday', label: 'Quinta-feira' },
        { key: 'friday', label: 'Sexta-feira' },
        { key: 'saturday', label: 'Sábado' },
        { key: 'sunday', label: 'Domingo' }
    ];

    const handleAddSlot = (dayKey, time) => {
        setProfessionalAvailability(prev => ({
            ...prev,
            [dayKey]: [...(prev[dayKey] || []), time].sort()
        }));
    };

    const handleAddMultipleSlots = (dayKey, times) => {
        setProfessionalAvailability(prev => {
            const currentSlots = prev[dayKey] || [];
            // Merge current slots with new times, ensuring uniqueness
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
            const isWeekend = sourceDayKey === 'saturday' || sourceDayKey === 'sunday';

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

    return (
        <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold flex items-center">
                    <Clock className="w-6 h-6 mr-2 text-[#2d8659]" />
                    Gestão de Disponibilidade
                </h2>

                <div className="flex gap-2 w-full md:w-auto">
                    <Button
                        variant="outline"
                        onClick={() => setIsBlockedDatesModalOpen(true)}
                        className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                    >
                        <CalendarX className="w-4 h-4 mr-2" />
                        Bloqueios e Exceções
                    </Button>
                    <LoadingButton
                        isLoading={isLoadingSave}
                        loadingText="Salvando..."
                        onClick={handleSaveAvailability}
                        className="bg-[#2d8659] hover:bg-[#236b47] text-white h-10 px-6 shadow-sm flex items-center justify-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        Salvar Disponibilidade
                    </LoadingButton>
                </div>
            </div>

            {userRole === 'admin' && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                    <label className="block text-sm font-medium mb-1 text-gray-700">Profissional</label>
                    <select
                        value={selectedAvailProfessional}
                        onChange={e => setSelectedAvailProfessional(e.target.value)}
                        className="w-full input bg-white"
                    >
                        <option value="">Selecione um profissional</option>
                        {professionals.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-4 mb-8">
                <div className="flex-1">
                    <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-gray-500" /> Mês
                    </label>
                    <select
                        value={selectedMonth}
                        onChange={e => setSelectedMonth(Number(e.target.value))}
                        className="w-full input"
                    >
                        {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>
                                {new Date(0, i).toLocaleString('pt-BR', { month: 'long' }).charAt(0).toUpperCase() + new Date(0, i).toLocaleString('pt-BR', { month: 'long' }).slice(1)}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Ano</label>
                    <select
                        value={selectedYear}
                        onChange={e => setSelectedYear(Number(e.target.value))}
                        className="w-full input"
                    >
                        {[2024, 2025, 2026].map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
            </div>

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

            {professionalBlockedDates && professionalBlockedDates.length > 0 && (
                <div className="mt-8 border-t pt-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-800">
                        <CalendarX className="w-5 h-5 mr-2 text-red-600" />
                        Bloqueios Agendados
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {professionalBlockedDates.map((block) => (
                            <div key={block.id} className="bg-red-50 border border-red-100 rounded-lg p-4 transition-all hover:border-red-200 hover:shadow-sm group">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <CalendarIcon className="w-4 h-4 text-red-500" />
                                            <span className="font-semibold text-red-900">
                                                {new Date(block.blocked_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                            </span>
                                        </div>

                                        {block.start_time && block.end_time ? (
                                            <div className="flex items-center gap-2 text-sm text-red-700 mb-2">
                                                <Clock className="w-3 h-3" />
                                                <span>{block.start_time} - {block.end_time}</span>
                                            </div>
                                        ) : (
                                            <div className="mb-2">
                                                <span className="text-xs font-medium bg-red-200 text-red-800 px-2 py-0.5 rounded-full">
                                                    Dia Inteiro
                                                </span>
                                            </div>
                                        )}

                                        {block.reason && (
                                            <p className="text-sm text-red-600 bg-red-100/50 p-2 rounded italic">
                                                {block.reason}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleDeleteBlockedDate(block.id)}
                                        className="text-red-400 hover:text-red-700 p-1 rounded-md hover:bg-red-100 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
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
