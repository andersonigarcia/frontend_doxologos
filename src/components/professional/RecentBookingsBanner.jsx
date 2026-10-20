import React, { useState, useEffect, useMemo } from 'react';
import { Bell, Calendar, Plus, X, ArrowRight, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateGoogleCalendarUrl } from '@/lib/calendarUtils';

/**
 * RecentBookingsBanner - Radar de Agendamentos Recentes
 * Alerta o terapeuta no topo do Cockpit sobre novas consultas agendadas nas últimas 48h.
 * Permite marcar como ciente (salvo em localStorage) e adicionar em 1 clique ao Google Calendar.
 */
export function RecentBookingsBanner({
    bookings = [],
    onSelectBookingDate
}) {
    const [isDismissed, setIsDismissed] = useState(false);
    const [acknowledgedIds, setAcknowledgedIds] = useState(() => {
        try {
            const saved = localStorage.getItem('doxologos_acknowledged_bookings');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    // Filtra agendamentos criados nas últimas 48 horas ou futuros confirmados não reconhecidos
    const recentBookings = useMemo(() => {
        const now = new Date();
        const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
        const todayStr = now.toISOString().slice(0, 10);

        return bookings.filter(b => {
            if (!['confirmed', 'paid'].includes(b.status)) return false;
            if (acknowledgedIds.includes(b.id)) return false;

            // Criado nas últimas 48h OU agendamento para hoje/futuro que ainda não foi visto
            const createdAt = b.created_at ? new Date(b.created_at) : null;
            const isRecentlyCreated = createdAt && createdAt >= fortyEightHoursAgo;
            const isUpcoming = b.booking_date && b.booking_date >= todayStr;

            return isRecentlyCreated || isUpcoming;
        }).slice(0, 3); // Limita a até 3 destaques no banner
    }, [bookings, acknowledgedIds]);

    const handleAcknowledgeAll = () => {
        const newIds = [...acknowledgedIds, ...recentBookings.map(b => b.id)];
        setAcknowledgedIds(newIds);
        try {
            localStorage.setItem('doxologos_acknowledged_bookings', JSON.stringify(newIds));
        } catch (e) {
            console.error('Erro ao salvar acknowledged bookings', e);
        }
    };

    if (isDismissed || recentBookings.length === 0) {
        return null;
    }

    return (
        <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 border border-blue-700/50 rounded-2xl p-4 sm:p-5 text-white shadow-md relative overflow-hidden mb-6">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header do Banner */}
            <div className="flex items-center justify-between gap-3 mb-3 relative z-10">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-2.5 w-2.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                    </span>
                    <h4 className="font-bold text-sm sm:text-base tracking-tight text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        Novos Agendamentos Recebidos ({recentBookings.length})
                    </h4>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleAcknowledgeAll}
                        className="text-xs text-blue-200 hover:text-white underline font-medium transition-colors"
                    >
                        Marcar como lidos
                    </button>
                    <button
                        onClick={() => setIsDismissed(true)}
                        className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                        aria-label="Dispensar aviso"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Lista dos Novos Agendamentos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 relative z-10">
                {recentBookings.map((booking) => {
                    const googleCalendarUrl = generateGoogleCalendarUrl(booking);
                    const formattedDate = booking.booking_date 
                        ? new Date(`${booking.booking_date}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                        : 'Hoje';

                    return (
                        <div
                            key={booking.id}
                            className="bg-white/10 backdrop-blur-md border border-white/10 rounded-xl p-3 flex flex-col justify-between hover:bg-white/15 transition-all"
                        >
                            <div>
                                <div className="flex items-center justify-between text-xs text-blue-200 mb-1">
                                    <span className="flex items-center gap-1 font-semibold text-emerald-300">
                                        <Clock className="w-3 h-3" />
                                        {formattedDate} às {booking.booking_time?.slice(0, 5)}h
                                    </span>
                                    {booking.valor_repasse_profissional && (
                                        <span className="font-bold text-white tabular-nums">
                                            R$ {parseFloat(booking.valor_repasse_profissional).toFixed(2).replace('.', ',')}
                                        </span>
                                    )}
                                </div>
                                <p className="font-bold text-sm text-white truncate">
                                    {booking.patient_name || 'Paciente'}
                                </p>
                                <p className="text-xs text-slate-300 truncate mt-0.5">
                                    {booking.service?.name || 'Consulta'}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/10">
                                <a
                                    href={googleCalendarUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 rounded-lg text-[11px] font-bold transition-colors"
                                >
                                    <Plus className="w-3 h-3" />
                                    + Google Agenda
                                </a>

                                {onSelectBookingDate && (
                                    <button
                                        onClick={() => onSelectBookingDate(booking.booking_date)}
                                        className="inline-flex items-center justify-center py-1.5 px-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[11px] font-semibold transition-colors"
                                        title="Ver no Cockpit"
                                    >
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default RecentBookingsBanner;
