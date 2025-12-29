import React, { useState } from 'react';
import { Plus, X, Copy, Trash2, Clock, Briefcase } from 'lucide-react';
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

    const handleAdd = () => {
        setError('');
        if (!newTime) return;

        // Validation: HH:MM format
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(newTime)) {
            setError('Formato inválido');
            return;
        }

        if (slots.includes(newTime)) {
            setError('Já existe');
            return;
        }

        onAddSlot(dayKey, newTime);
        setNewTime('');
    };

    const handleFillCommercial = () => {
        const commercialHours = [
            '08:00', '09:00', '10:00', '11:00', '12:00',
            '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
        ];
        onAddMultipleSlots(dayKey, commercialHours);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAdd();
        }
    };

    const sortedSlots = [...slots].sort();

    const [isAdding, setIsAdding] = useState(false);

    return (
        <div className="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700">{dayLabel}</span>
                    <Badge variant={slots.length > 0 ? "secondary" : "outline"} className={slots.length > 0 ? "bg-green-100 text-green-800 hover:bg-green-100" : "text-gray-400"}>
                        {slots.length} {slots.length === 1 ? 'horário' : 'horários'}
                    </Badge>
                </div>

                <div className="flex gap-1">
                    <Tooltip content="Adicionar horário manual">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 hover:bg-green-50 ${isAdding ? 'text-green-600 bg-green-50' : 'text-gray-500 hover:text-green-600'}`}
                            onClick={() => setIsAdding(!isAdding)}
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </Tooltip>

                    <Tooltip content="Preencher horário comercial (08h às 18h)">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                            onClick={handleFillCommercial}
                            disabled={onAddMultipleSlots ? false : true}
                        >
                            <Briefcase className="h-4 w-4" />
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
                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => onClearDay(dayKey)}
                            disabled={slots.length === 0}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </Tooltip>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-3 min-h-[40px]">
                {sortedSlots.length === 0 ? (
                    <div className="w-full h-full flex items-center text-gray-400 text-sm italic">
                        <Clock className="w-3 h-3 mr-1.5" />
                        Sem horários configurados
                    </div>
                ) : (
                    sortedSlots.map((time, index) => (
                        <div
                            key={`${dayKey}-${time}-${index}`}
                            className="flex items-center bg-gray-100 text-gray-800 text-sm font-medium px-2.5 py-1 rounded-full border border-gray-200 group hover:border-red-200 transition-colors"
                        >
                            {time}
                            <button
                                type="button"
                                onClick={() => onRemoveSlot(dayKey, time)}
                                className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full text-gray-400 hover:bg-red-500 hover:text-white transition-colors focus:outline-none"
                                aria-label="Remover horário"
                            >
                                <span className="sr-only">Remover</span>
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ))
                )}
            </div>

            {isAdding && (
                <div className="relative animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex gap-2">
                        <input
                            type="time"
                            value={newTime}
                            onChange={(e) => setNewTime(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            className={`flex-1 min-w-0 block w-full px-3 py-1.5 rounded-md border text-sm ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                                }`}
                        />
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleAdd}
                            disabled={!newTime}
                            className="bg-gray-50 hover:bg-gray-100"
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                    {error && <p className="absolute -bottom-5 left-0 text-xs text-red-500">{error}</p>}
                </div>
            )}
        </div>
    );
};
