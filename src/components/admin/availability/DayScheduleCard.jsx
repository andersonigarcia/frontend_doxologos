import React, { useState } from 'react';
import { Plus, X, Copy, Trash2, Clock, Briefcase, Sun, Sunset, Moon, Sparkles, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuLabel,
    DropdownMenuGroup
} from '@/components/ui/dropdown-menu';

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
        <div className="bg-white border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-full">
            <div>
                {/* Header do Dia */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-800 text-base">{dayLabel}</span>
                        <Badge variant={slots.length > 0 ? "secondary" : "outline"} className={slots.length > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "text-gray-400"}>
                            {slots.length}
                        </Badge>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => onCopyToAll(dayKey)} disabled={slots.length === 0} className="text-blue-600 focus:text-blue-700 focus:bg-blue-50 cursor-pointer">
                                <Copy className="h-4 w-4 mr-2" />
                                Copiar para todos
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onClearDay(dayKey)} disabled={slots.length === 0} className="text-rose-600 focus:text-rose-700 focus:bg-rose-50 cursor-pointer">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Limpar dia
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Exibição dos Horários */}
                <div className="flex flex-wrap gap-1.5 mb-4 items-start content-start min-h-[5rem] max-h-[14rem] overflow-y-auto pr-1">
                    {sortedSlots.length === 0 && !isAdding && !showRangeBuilder ? (
                        <div className="w-full flex flex-col items-center justify-center py-6 px-3 text-gray-400 text-xs bg-gray-50/50 rounded-xl border border-dashed border-gray-200 h-full">
                            <Clock className="w-6 h-6 mb-2 text-gray-300" />
                            <p className="text-center font-medium">Nenhum horário configurado</p>
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
                    <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-2">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-slate-700">Adicionar Manual</span>
                            <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600"><X className="w-3 h-3" /></button>
                        </div>
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
                                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold px-4"
                            >
                                Add
                            </Button>
                        </div>
                        {error && <p className="mt-1 text-[10px] text-rose-500 font-semibold">{error}</p>}
                    </div>
                )}

                {/* Gerador por Faixa */}
                {showRangeBuilder && (
                    <div className="mb-4 p-3 bg-indigo-50/80 rounded-xl border border-indigo-100 text-xs space-y-3 animate-in fade-in slide-in-from-top-2">
                        <div className="flex justify-between items-center">
                            <span className="font-bold text-indigo-900 block">Gerar Faixa de Horários</span>
                            <button onClick={() => setShowRangeBuilder(false)} className="text-indigo-400 hover:text-indigo-600"><X className="w-3 h-3" /></button>
                        </div>
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

            {/* Main Add Dropdown */}
            {!isAdding && !showRangeBuilder && (
                <div className="mt-auto pt-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button 
                                variant="outline" 
                                className="w-full border-dashed border-gray-300 text-gray-500 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 rounded-xl text-xs font-semibold"
                            >
                                <Plus className="w-4 h-4 mr-1.5" />
                                Adicionar Horários
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center" className="w-56 rounded-xl p-1.5">
                            <DropdownMenuGroup>
                                <DropdownMenuItem onClick={() => setIsAdding(true)} className="rounded-lg cursor-pointer py-2">
                                    <Plus className="w-4 h-4 mr-2 text-emerald-600" />
                                    <span className="font-medium text-slate-700">Adicionar Manualmente</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setShowRangeBuilder(true)} className="rounded-lg cursor-pointer py-2">
                                    <Sparkles className="w-4 h-4 mr-2 text-indigo-600" />
                                    <span className="font-medium text-slate-700">Gerar Faixa de Horários</span>
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                            
                            <DropdownMenuSeparator className="my-1" />
                            
                            <DropdownMenuGroup>
                                <DropdownMenuLabel className="text-[10px] text-gray-400 font-bold uppercase tracking-wider py-1.5 px-2">Atalhos de Turno</DropdownMenuLabel>
                                <DropdownMenuItem onClick={handlePresetMorning} className="rounded-lg cursor-pointer py-2">
                                    <Sun className="w-4 h-4 mr-2 text-amber-500" />
                                    <span className="font-medium text-slate-700">Manhã (08h às 11h)</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handlePresetAfternoon} className="rounded-lg cursor-pointer py-2">
                                    <Sunset className="w-4 h-4 mr-2 text-orange-500" />
                                    <span className="font-medium text-slate-700">Tarde (13h às 17h)</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handlePresetNight} className="rounded-lg cursor-pointer py-2">
                                    <Moon className="w-4 h-4 mr-2 text-indigo-500" />
                                    <span className="font-medium text-slate-700">Noite (18h às 21h)</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleFillCommercial} className="rounded-lg cursor-pointer py-2">
                                    <Briefcase className="w-4 h-4 mr-2 text-blue-500" />
                                    <span className="font-medium text-slate-700">Dia Todo (08h às 18h)</span>
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )}
        </div>
    );
};

