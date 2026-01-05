
import React from 'react';
import { CalendarX, Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';

export const BlockedDatesModal = ({
    open,
    onClose,
    blockedDates,
    newBlockedDate,
    setNewBlockedDate,
    handleAddBlockedDate,
    handleDeleteBlockedDate,
    professionalBlockedDates
}) => {
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center text-red-600">
                        <CalendarX className="w-5 h-5 mr-2" />
                        Bloquear Datas Específicas
                    </DialogTitle>
                    <DialogDescription>
                        Adicione exceções à sua disponibilidade (ex: feriados, consultas médicas).
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-red-50 p-4 rounded-lg border border-red-100 mb-6 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                        <div className="lg:col-span-1">
                            <label className="block text-xs font-medium mb-1 text-red-800">Data *</label>
                            <input
                                type="date"
                                value={newBlockedDate.date}
                                onChange={e => setNewBlockedDate({ ...newBlockedDate, date: e.target.value })}
                                className="w-full input bg-white border-red-200 focus:border-red-400 focus:ring-red-200"
                            />
                        </div>
                        <div className="lg:col-span-1">
                            <label className="block text-xs font-medium mb-1 text-red-800">Início</label>
                            <input
                                type="time"
                                value={newBlockedDate.start_time}
                                onChange={e => setNewBlockedDate({ ...newBlockedDate, start_time: e.target.value })}
                                className="w-full input bg-white border-red-200 focus:border-red-400 focus:ring-red-200"
                            />
                        </div>
                        <div className="lg:col-span-1">
                            <label className="block text-xs font-medium mb-1 text-red-800">Fim</label>
                            <input
                                type="time"
                                value={newBlockedDate.end_time}
                                onChange={e => setNewBlockedDate({ ...newBlockedDate, end_time: e.target.value })}
                                className="w-full input bg-white border-red-200 focus:border-red-400 focus:ring-red-200"
                            />
                        </div>
                        <div className="lg:col-span-1">
                            <label className="block text-xs font-medium mb-1 text-red-800">Motivo</label>
                            <input
                                type="text"
                                value={newBlockedDate.reason}
                                onChange={e => setNewBlockedDate({ ...newBlockedDate, reason: e.target.value })}
                                className="w-full input bg-white border-red-200 focus:border-red-400 focus:ring-red-200"
                                placeholder="Ex: Feriado"
                            />
                        </div>
                        <div className="lg:col-span-1">
                            <Button
                                onClick={handleAddBlockedDate}
                                variant="destructive"
                                className="w-full shadow-sm hover:shadow-md transition-all"
                                disabled={!newBlockedDate.date}
                            >
                                <CalendarX className="w-4 h-4 mr-2" />
                                Bloquear
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {professionalBlockedDates.length === 0 ? (
                        <p className="text-gray-500 italic col-span-full text-center py-8 bg-gray-50 rounded-lg">
                            Nenhuma data bloqueada neste período.
                        </p>
                    ) : (
                        professionalBlockedDates.map(blocked => (
                            <div key={blocked.id} className="flex justify-between items-start border border-red-100 p-3 rounded-lg bg-white shadow-sm hover:shadow-md transition-all group">
                                <div className="space-y-1">
                                    <div className="flex items-center">
                                        <span className="font-bold text-red-700">
                                            {new Date(blocked.blocked_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 line-clamp-1" title={blocked.reason || 'Sem motivo'}>
                                        {blocked.reason || 'Sem motivo'}
                                    </p>
                                    {(blocked.start_time || blocked.end_time) && (
                                        <div className="text-xs text-gray-500 flex items-center bg-gray-100 px-2 py-0.5 rounded-full w-fit">
                                            <Clock className="w-3 h-3 mr-1" />
                                            {blocked.start_time || '00:00'} - {blocked.end_time || '23:59'}
                                        </div>
                                    )}
                                </div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteBlockedDate(blocked.id)}
                                    className="text-red-400 hover:bg-red-50 hover:text-red-700 h-8 w-8 p-0"
                                >
                                    <span className="sr-only">Excluir bloqueio</span>
                                    <div className="bg-red-100 p-1.5 rounded-full">
                                        <Trash2 className="w-4 h-4" />
                                    </div>
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
