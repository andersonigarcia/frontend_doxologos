import React from 'react';
import { Video, FileText, MessageCircle, Clock, Calendar, CheckCircle, ArrowRight, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * ImmediateCareCard - Card de Atendimento Imediato (1-Clique para Sessão)
 * Focado na ergonomia do psicólogo entre consultas: entrar no Meet e abrir Prontuário instantaneamente.
 */
export function ImmediateCareCard({
    appointment,
    onOpenProntuario,
    onViewAllBookings
}) {
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
        <div className="bg-white border-2 border-slate-900/10 rounded-2xl p-5 md:p-6 shadow-sm relative overflow-hidden">
            {/* Top Badge */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold tracking-tight">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Próximo Atendimento de Hoje
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

                {whatsappLink && (
                    <a
                        href={whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors shrink-0"
                    >
                        <MessageCircle className="w-4 h-4 text-emerald-600" />
                        Lembrar via WhatsApp
                    </a>
                )}
            </div>

            {/* Quick Action Buttons - 1 Touch */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-5">
                <a
                    href={meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
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
