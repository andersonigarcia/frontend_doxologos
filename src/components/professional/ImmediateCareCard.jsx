import React, { useState, useEffect } from 'react';
import {
    Video, FileText, MessageCircle, Clock, Calendar, CheckCircle,
    ArrowRight, UserCheck, CalendarPlus, Play, Pause, RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * ImmediateCareCard - Card de Atendimento Imediato (1-Clique para Sessão)
 * Focado na ergonomia do psicólogo entre consultas: entrar no Meet, abrir Prontuário,
 * cronometrar a sessão com alerta de 45min e agendar a próxima consulta.
 */
export function ImmediateCareCard({
    appointment,
    onOpenProntuario,
    onViewAllBookings,
    onOpenScheduleNext
}) {
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);

    useEffect(() => {
        let interval = null;
        if (isTimerRunning) {
            interval = setInterval(() => {
                setTimerSeconds(s => s + 1);
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isTimerRunning]);

    const formatTimer = (totalSeconds) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    const isClosingWindow = timerSeconds >= 45 * 60; // 45 minutos (5 min para encerrar)

    if (!appointment) {
        return (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                        <CheckCircle className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 text-sm sm:text-base">Nenhuma consulta pendente para agora</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Sua agenda de hoje está em dia ou não há mais sessões imediatas.</p>
                    </div>
                </div>
                {onViewAllBookings && (
                    <Button
                        onClick={onViewAllBookings}
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto text-xs h-9 font-semibold border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl shrink-0"
                    >
                        Ver Toda a Agenda
                        <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Button>
                )}
            </div>
        );
    }

    const patientName = appointment.patient_name || 'Paciente';
    const patientPhone = (appointment.patient_phone || '').replace(/\D/g, '');
    const bookingTime = appointment.booking_time ? `${appointment.booking_time}h` : 'Hoje';
    const serviceName = appointment.service?.name || 'Consulta Psicológica';
    const meetingUrl = appointment.meeting_link || appointment.meeting_start_url || `/sala-espera/${appointment.id}`;

    // WhatsApp quick reminder
    const whatsappText = encodeURIComponent(
        `Olá ${patientName}! Aqui é da Doxologos. Nosso atendimento psicológico está agendado para hoje às ${appointment.booking_time}. Segue o link de acesso: ${meetingUrl}`
    );
    const whatsappLink = patientPhone ? `https://wa.me/55${patientPhone}?text=${whatsappText}` : null;

    return (
        <div className="bg-white border-2 border-slate-900/10 rounded-2xl p-5 md:p-6 shadow-sm relative overflow-hidden font-sans">
            {/* Top Badge & Timer */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold tracking-tight">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Próximo Atendimento de Hoje
                    </div>

                    {/* Timer Discreto de Sessão */}
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => setIsTimerRunning(!isTimerRunning)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                                isClosingWindow
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                                    : isTimerRunning
                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            title={isTimerRunning ? 'Pausar cronômetro' : 'Iniciar cronômetro de 50 minutos'}
                        >
                            {isTimerRunning ? <Pause className="w-3 h-3 text-indigo-600" /> : <Play className="w-3 h-3 text-slate-600" />}
                            <span className="tabular-nums font-mono text-[11px]">{formatTimer(timerSeconds)} / 50:00</span>
                            {isClosingWindow && (
                                <span className="font-extrabold text-[10px] text-amber-800 ml-1">
                                    (5 min p/ fechar)
                                </span>
                            )}
                        </button>
                        {timerSeconds > 0 && (
                            <button
                                type="button"
                                onClick={() => { setIsTimerRunning(false); setTimerSeconds(0); }}
                                className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
                                title="Zerar cronômetro"
                            >
                                <RotateCcw className="w-2.5 h-2.5" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span className="tabular-nums">{bookingTime}</span>
                </div>
            </div>

            {/* Patient Info Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-xs">
                        {patientName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl tracking-tight leading-snug">
                            {patientName}
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium flex items-center gap-2 mt-0.5">
                            <span>{serviceName}</span>
                            {appointment.valor_repasse_profissional && (
                                <>
                                    <span className="text-slate-300">•</span>
                                    <span className="font-semibold text-emerald-700 tabular-nums">
                                        Honorário: R$ {parseFloat(appointment.valor_repasse_profissional).toFixed(2).replace('.', ',')}
                                    </span>
                                </>
                            )}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {onOpenScheduleNext && (
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => onOpenScheduleNext(appointment)}
                            className="rounded-xl border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-xs font-bold h-9 px-3 flex items-center gap-1.5"
                        >
                            <CalendarPlus className="w-3.5 h-3.5 text-emerald-600" />
                            Agendar Próxima
                        </Button>
                    )}

                    {whatsappLink && (
                        <a
                            href={whatsappLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors shrink-0"
                        >
                            <MessageCircle className="w-4 h-4 text-emerald-600" />
                            Lembrar no WhatsApp
                        </a>
                    )}
                </div>
            </div>

            {/* Quick Action Buttons - 1 Touch */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-5">
                <a
                    href={meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                        if (!isTimerRunning && timerSeconds === 0) setIsTimerRunning(true);
                    }}
                    className="inline-flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-xs transition-all duration-150 active:scale-[0.98] min-h-[48px]"
                >
                    <Video className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>Iniciar Consulta Agora</span>
                </a>

                <Button
                    onClick={() => onOpenProntuario && onOpenProntuario(appointment)}
                    variant="outline"
                    className="inline-flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm shadow-xs transition-all duration-150 active:scale-[0.98] min-h-[48px]"
                >
                    <FileText className="w-5 h-5 text-slate-600 shrink-0" />
                    <span>Evolução Clínica / Prontuário</span>
                </Button>
            </div>
        </div>
    );
}

export default ImmediateCareCard;
