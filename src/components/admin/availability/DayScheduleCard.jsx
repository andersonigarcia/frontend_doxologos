import React, { useState } from 'react';
import { Plus, X, Copy, Trash2, Clock, Briefcase, Sun, Sunset, Moon, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Tooltip from '@/components/ui/Tooltip';

export const DayScheduleCard = ({
    dayKey,
    dayLabel,
    slots = [],
    onAddSlot,
    onAddMultipleSlots,
    onRemoveSlot,
    onCopyToAll,
    onClearDay
}) => {
    const [newTime, setNewTime] = useState('');
    const [error, setError] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [showRangeBuilder, setShowRangeBuilder] = useState(false);

    // Range builder state
    const [rangeStart, setRangeStart] = useState('08:00');
    const [rangeEnd, setRangeEnd] = useState('18:00');
    const [rangeStep, setRangeStep] = useState('60');

    const handleAdd = () => {
        setError('');
        if (!newTime) return;

        // Validation: HH:MM format
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(newTime)) {
            setError('Formato inválido');
            return;
        }

        const formattedTime = newTime.length === 4 ? `0${newTime}` : newTime;

        if (slots.includes(formattedTime)) {
            setError('Já existe');
            return;
        }

        onAddSlot(dayKey, formattedTime);
        setNewTime('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAdd();
        }
    };

    // Presets
    const handlePresetMorning = () => {
        onAddMultipleSlots(dayKey, ['08:00', '09:00', '10:00', '11:00']);
    };

    const handlePresetAfternoon = () => {
        onAddMultipleSlots(dayKey, ['13:00', '14:00', '15:00', '16:00', '17:00']);
    };

    const handlePresetNight = () => {
        onAddMultipleSlots(dayKey, ['18:00', '19:00', '20:00', '21:00']);
    };

    const handleFillCommercial = () => {
        const commercialHours = [
            '08:00', '09:00', '10:00', '11:00', '12:00',
            '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
        ];
        onAddMultipleSlots(dayKey, commercialHours);
    };

    // Range generator logic
    const handleGenerateRange = () => {
        if (!rangeStart || !rangeEnd) return;
        const [startH, startM] = rangeStart.split(':').map(Number);
        const [endH, endM] = rangeEnd.split(':').map(Number);
        const stepM = parseInt(rangeStep, 10) || 60;

        let startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        const generated = [];
        while (startMinutes <= endMinutes) {
            const h = Math.floor(startMinutes / 60);
            const m = startMinutes % 60;
            const hStr = h < 10 ? `0${h}` : `${h}`;
            const mStr = m < 10 ? `0${m}` : `${m}`;
            generated.push(`${hStr}:${mStr}`);
            startMinutes += stepM;
        }

        if (generated.length > 0) {
            onAddMultipleSlots(dayKey, generated);
            setShowRangeBuilder(false);
        }
    };

    const sortedSlots = [...slots].sort();

    return (
        <div className="bg-white border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
                {/* Header do Dia */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-800 text-base">{dayLabel}</span>
                        <Badge variant={slots.length > 0 ? "secondary" : "outline"} className={slots.length > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "text-gray-400"}>
                            {slots.length} {slots.length === 1 ? 'horário' : 'horários'}
                        </Badge>
                    </div>

                    <div className="flex items-center gap-1">
                        <Tooltip content="Gerar faixa de horários rápida">
                            <Button
                                variant="ghost"
                                size="icon"
                                className={`h-8 w-8 hover:bg-emerald-50 ${showRangeBuilder ? 'text-emerald-600 bg-emerald-50' : 'text-gray-500 hover:text-emerald-600'}`}
                                onClick={() => { setShowRangeBuilder(!showRangeBuilder); setIsAdding(false); }}
                            >
                                <Sparkles className="h-4 w-4" />
                            </Button>
                        </Tooltip>

                        <Tooltip content="Adicionar horário manual">
                            <Button
                                variant="ghost"
                                size="icon"
                                className={`h-8 w-8 hover:bg-emerald-50 ${isAdding ? 'text-emerald-600 bg-emerald-50' : 'text-gray-500 hover:text-emerald-600'}`}
                                onClick={() => { setIsAdding(!isAdding); setShowRangeBuilder(false); }}
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </Tooltip>

                        <Tooltip content="Copiar horários para todos os dias da semana">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => onCopyToAll(dayKey)}
                                disabled={slots.length === 0}
                            >
                                <Copy className="h-4 w-4" />
                            </Button>
                        </Tooltip>

                        <Tooltip content="Limpar todos os horários deste dia">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                                onClick={() => onClearDay(dayKey)}
                                disabled={slots.length === 0}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </Tooltip>
                    </div>
                </div>

                {/* Presets Rápidos em 1-Clique */}
                <div className="flex flex-wrap items-center gap-1.5 mb-3 bg-gray-50/80 p-2 rounded-xl border border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block w-full mb-0.5">Atalhos de Turno:</span>
                    
                    <button
                        type="button"
                        onClick={handlePresetMorning}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
                        title="Adiciona 08:00, 09:00, 10:00, 11:00"
                    >
                        <Sun className="w-3 h-3 text-amber-500" /> Manhã
                    </button>

                    <button
                        type="button"
                        onClick={handlePresetAfternoon}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition-colors"
                        title="Adiciona 13:00, 14:00, 15:00, 16:00, 17:00"
                    >
                        <Sunset className="w-3 h-3 text-orange-500" /> Tarde
                    </button>

                    <button
                        type="button"
                        onClick={handlePresetNight}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors"
                        title="Adiciona 18:00, 19:00, 20:00, 21:00"
                    >
                        <Moon className="w-3 h-3 text-indigo-500" /> Noite
                    </button>

                    <button
                        type="button"
                        onClick={handleFillCommercial}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                        title="Adiciona 08:00 às 18:00"
                    >
                        <Briefcase className="w-3 h-3 text-blue-500" /> Dia Todo
                    </button>
                </div>

                {/* Exibição dos Horários */}
                <div className="flex flex-wrap gap-1.5 mb-3 min-h-[44px] items-center">
                    {sortedSlots.length === 0 ? (
                        <div className="w-full flex items-center justify-center p-3 text-gray-400 text-xs italic bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                            <Clock className="w-3.5 h-3.5 mr-1.5" />
                            Nenhum horário configurado para este dia
                        </div>
                    ) : (
                        sortedSlots.map((time, index) => (
                            <div
                                key={`${dayKey}-${time}-${index}`}
                                className="flex items-center bg-emerald-50 text-emerald-900 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-200 shadow-2xs group hover:bg-rose-50 hover:text-rose-800 hover:border-rose-200 transition-all"
                            >
                                {time}
                                <button
                                    type="button"
                                    onClick={() => onRemoveSlot(dayKey, time)}
                                    className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full text-emerald-600 group-hover:bg-rose-500 group-hover:text-white transition-colors focus:outline-none cursor-pointer"
                                    aria-label="Remover horário"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Form de Adição Manual */}
                {isAdding && (
                    <div className="mb-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex gap-2">
                            <input
                                type="time"
                                value={newTime}
                                onChange={(e) => setNewTime(e.target.value)}
                                onKeyDown={handleKeyDown}
                                autoFocus
                                className={`flex-1 min-w-0 block w-full px-3 py-1.5 rounded-xl border text-sm font-semibold bg-white ${
                                    error ? 'border-rose-300 focus:ring-rose-500' : 'border-gray-300 focus:ring-emerald-500'
                                }`}
                            />
                            <Button
                                size="sm"
                                onClick={handleAdd}
                                disabled={!newTime}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold"
                            >
                                Add
                            </Button>
                        </div>
                        {error && <p className="mt-1 text-xs text-rose-500 font-semibold">{error}</p>}
                    </div>
                )}

                {/* Gerador por Faixa */}
                {showRangeBuilder && (
                    <div className="mb-2 p-3 bg-indigo-50/80 rounded-xl border border-indigo-100 text-xs space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <span className="font-bold text-indigo-900 block">Gerar Faixa de Horários:</span>
                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <label className="text-[10px] text-indigo-700 font-medium">Início</label>
                                <input
                                    type="time"
                                    value={rangeStart}
                                    onChange={(e) => setRangeStart(e.target.value)}
                                    className="w-full px-2 py-1 bg-white border border-indigo-200 rounded-lg text-xs font-semibold"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-indigo-700 font-medium">Fim</label>
                                <input
                                    type="time"
                                    value={rangeEnd}
                                    onChange={(e) => setRangeEnd(e.target.value)}
                                    className="w-full px-2 py-1 bg-white border border-indigo-200 rounded-lg text-xs font-semibold"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-indigo-700 font-medium">Intervalo</label>
                                <select
                                    value={rangeStep}
                                    onChange={(e) => setRangeStep(e.target.value)}
                                    className="w-full px-1 py-1 bg-white border border-indigo-200 rounded-lg text-xs font-semibold cursor-pointer"
                                >
                                    <option value="30">30 min</option>
                                    <option value="45">45 min</option>
                                    <option value="50">50 min</option>
                                    <option value="60">60 min</option>
                                </select>
                            </div>
                        </div>
                        <Button
                            size="sm"
                            onClick={handleGenerateRange}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold py-1.5"
                        >
                            Gerar Horários
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};
