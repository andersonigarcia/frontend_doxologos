import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, Download, Smartphone, Check, BellRing, ExternalLink } from 'lucide-react';
import { downloadAgendaIcsFile } from '@/lib/calendarUtils';

/**
 * CalendarSyncModal - Modal de Sincronização de Agenda com Calendário Pessoal
 * Permite ao terapeuta exportar consultas para Apple Calendar, Google Calendar e Outlook
 * garantindo alertas sonoros nativos no smartphone antes de cada sessão.
 */
export function CalendarSyncModal({
    isOpen,
    onClose,
    appointments = [],
    professionalName = 'Profissional'
}) {
    const upcomingAppointments = appointments.filter(b => 
        b.booking_date && 
        ['confirmed', 'paid'].includes(b.status) &&
        b.booking_date >= new Date().toISOString().slice(0, 10)
    );

    const handleExportAll = () => {
        downloadAgendaIcsFile(upcomingAppointments, professionalName);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-lg p-6 bg-white rounded-2xl shadow-xl border border-slate-200/90 font-sans">
                <DialogHeader>
                    <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center mb-3 shadow-xs">
                        <Calendar className="w-6 h-6 text-emerald-400" />
                    </div>
                    <DialogTitle className="text-xl font-bold text-slate-900 tracking-tight">
                        Sincronizar com seu Calendário Pessoal
                    </DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm text-slate-500 mt-1">
                        Adicione suas consultas da Doxologos diretamente no <strong>Google Agenda</strong>, <strong>iPhone (Apple Calendar)</strong> ou <strong>Outlook</strong> para receber alertas sonoros no seu celular antes de cada sessão.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 my-2">
                    {/* Botão de Exportação Principal */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div>
                            <p className="font-bold text-slate-900 text-sm">
                                Exportar Consultas Futuras ({upcomingAppointments.length})
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Arquivo universal .ICS compatível com todos os celulares e computadores.
                            </p>
                        </div>
                        <Button
                            onClick={handleExportAll}
                            disabled={upcomingAppointments.length === 0}
                            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs h-10 px-4 rounded-xl shadow-xs transition-colors shrink-0 flex items-center gap-2"
                        >
                            <Download className="w-4 h-4 text-emerald-400" />
                            Baixar .ICS
                        </Button>
                    </div>

                    {/* Instruções Rápidas por Plataforma */}
                    <div className="space-y-3 pt-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Como configurar no seu celular:
                        </h4>

                        <div className="flex items-start gap-3 p-3 bg-white border border-slate-200/70 rounded-xl text-xs text-slate-700">
                            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                                <Smartphone className="w-4 h-4" />
                            </div>
                            <div>
                                <span className="font-bold text-slate-900">No iPhone / iPad (Apple Calendar):</span>
                                <p className="text-slate-500 mt-0.5">
                                    Basta clicar em <strong>Baixar .ICS</strong> no Safari e tocar em <em>"Adicionar Todos"</em>. As sessões entram no aplicativo nativo com alarme 15 minutos antes.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 bg-white border border-slate-200/70 rounded-xl text-xs text-slate-700">
                            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold shrink-0">
                                <Calendar className="w-4 h-4" />
                            </div>
                            <div>
                                <span className="font-bold text-slate-900">No Google Agenda (Android ou Desktop):</span>
                                <p className="text-slate-500 mt-0.5">
                                    No computador, abra <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-medium">calendar.google.com</a>, clique na engrenagem ⚙️ ➔ <em>Importar e Exportar</em> e selecione o arquivo baixado.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 bg-emerald-50/60 border border-emerald-200/70 rounded-xl text-xs text-emerald-900">
                            <BellRing className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <p>
                                <strong>Dica Clínica:</strong> No Cockpit diário abaixo, cada consulta também possui o botão individual <em>"+ Google Agenda"</em> para adicionar sessões avulsas em 1 toque!
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-xs h-9"
                    >
                        Entendi, fechar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default CalendarSyncModal;
