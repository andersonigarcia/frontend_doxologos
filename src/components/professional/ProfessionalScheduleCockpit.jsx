import React, { useState, useMemo } from 'react';
import { 
    Calendar as CalendarIcon, 
    Clock, 
    Video, 
    FileText, 
    MessageCircle, 
    Plus, 
    Download, 
    ChevronLeft, 
    ChevronRight, 
    CheckCircle2, 
    AlertCircle, 
    DollarSign,
    ExternalLink,
    Sparkles,
    UserCheck,
    CalendarCheck,
    CalendarPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateGoogleCalendarUrl, downloadIcsFile } from '@/lib/calendarUtils';

/**
 * ProfessionalScheduleCockpit - Cockpit Diário da Agenda Clínica
 * Solução de alta visibilidade para o psicólogo gerenciar suas consultas do dia,
 * entrar em teleconsultas com 1 toque, atualizar prontuários e exportar para o calendário pessoal.
 */
export function ProfessionalScheduleCockpit({
    bookings = [],
    currentProfessional = null,
    onOpenProntuario,
    onOpenCalendarSync,
    onOpenScheduleNext
}) {
    // Data ativa no Cockpit: Padrão é Hoje (YYYY-MM-DD no fuso local)
    const todayStr = useMemo(() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }, []);

    const [selectedDate, setSelectedDate] = useState(todayStr);

    // Calcular Ontem e Amanhã para os botões rápidos
    const { yesterdayStr, tomorrowStr } = useMemo(() => {
        const today = new Date();
        const y = new Date(today);
        y.setDate(today.getDate() - 1);
        const t = new Date(today);
        t.setDate(today.getDate() + 1);

        const toStr = (d) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        return { yesterdayStr: toStr(y), tomorrowStr: toStr(t) };
    }, []);

    // Consultas filtradas para a data selecionada
    const dayAppointments = useMemo(() => {
        return (bookings || [])
            .filter(b => b.booking_date === selectedDate)
            .sort((a, b) => (a.booking_time || '').localeCompare(b.booking_time || ''));
    }, [bookings, selectedDate]);

    // Contagem de hoje e amanhã para badges rápidos
    const todayCount = useMemo(() => {
        return (bookings || []).filter(b => b.booking_date === todayStr && !b.status?.includes('cancelled')).length;
    }, [bookings, todayStr]);

    const tomorrowCount = useMemo(() => {
        return (bookings || []).filter(b => b.booking_date === tomorrowStr && !b.status?.includes('cancelled')).length;
    }, [bookings, tomorrowStr]);

    // Métricas do dia ativo
    const dayMetrics = useMemo(() => {
        const active = dayAppointments.filter(b => !b.status?.includes('cancelled'));
        const totalHonorarios = active.reduce((acc, b) => {
            return acc + (parseFloat(b.valor_repasse_profissional) || 0);
        }, 0);

        const firstTime = active[0]?.booking_time ? `${active[0].booking_time.slice(0, 5)}h` : null;
        const lastTime = active[active.length - 1]?.booking_time ? `${active[active.length - 1].booking_time.slice(0, 5)}h` : null;

        return {
            totalSessions: active.length,
            totalHonorarios,
            timeRange: firstTime && lastTime ? (firstTime === lastTime ? firstTime : `${firstTime} às ${lastTime}`) : null
        };
    }, [dayAppointments]);

    // Formatação legível da data selecionada
    const formattedDateTitle = useMemo(() => {
        if (selectedDate === todayStr) return 'Hoje';
        if (selectedDate === tomorrowStr) return 'Amanhã';
        if (selectedDate === yesterdayStr) return 'Ontem';

        const [y, m, d] = selectedDate.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        return dateObj.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
    }, [selectedDate, todayStr, tomorrowStr, yesterdayStr]);

    const fullDateSubtitle = useMemo(() => {
        const [y, m, d] = selectedDate.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        return dateObj.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    }, [selectedDate]);

    return (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 mb-8 font-sans">
            {/* Top Bar: Título do Cockpit & Botão Sincronizar Calendário */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                        <CalendarIcon className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl tracking-tight flex items-center gap-2">
                            Cockpit da Minha Agenda
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                                Visão Clínica
                            </span>
                        </h3>
                        <p className="text-xs text-slate-500 capitalize mt-0.5">
                            {fullDateSubtitle}
                        </p>
                    </div>
                </div>

                {onOpenCalendarSync && (
                    <Button
                        onClick={onOpenCalendarSync}
                        variant="outline"
                        className="w-full sm:w-auto h-10 px-4 rounded-xl border-slate-200 text-slate-800 hover:bg-slate-900 hover:text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2"
                    >
                        <CalendarCheck className="w-4 h-4 text-emerald-600" />
                        Sincronizar com Meu Celular (.ICS)
                    </Button>
                )}
            </div>

            {/* Navegador Rápido de Datas: Ontem, Hoje, Amanhã, Seletor */}
            <div className="flex flex-wrap items-center justify-between gap-3 my-5">
                <div className="inline-flex items-center p-1 bg-slate-100/80 rounded-xl border border-slate-200/80 gap-1">
                    <button
                        onClick={() => setSelectedDate(yesterdayStr)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            selectedDate === yesterdayStr 
                                ? 'bg-white text-slate-900 shadow-xs font-bold' 
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        Ontem
                    </button>
                    <button
                        onClick={() => setSelectedDate(todayStr)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                            selectedDate === todayStr 
                                ? 'bg-slate-900 text-white shadow-xs font-bold' 
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <span>Hoje</span>
                        {todayCount > 0 && (
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                selectedDate === todayStr ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-700'
                            }`}>
                                {todayCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setSelectedDate(tomorrowStr)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                            selectedDate === tomorrowStr 
                                ? 'bg-slate-900 text-white shadow-xs font-bold' 
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <span>Amanhã</span>
                        {tomorrowCount > 0 && (
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                selectedDate === tomorrowStr ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-700'
                            }`}>
                                {tomorrowCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* Seletor Livre de Data */}
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500 hidden sm:inline">Data específica:</span>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none transition-all cursor-pointer"
                    />
                </div>
            </div>

            {/* Painel de Métricas do Dia Ativo */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6 p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl">
                <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Atendimentos</span>
                    <p className="text-lg sm:text-xl font-extrabold text-slate-900 tabular-nums">
                        {dayMetrics.totalSessions} {dayMetrics.totalSessions === 1 ? 'consulta' : 'consultas'}
                    </p>
                </div>

                <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Honorários do Dia</span>
                    <p className="text-lg sm:text-xl font-extrabold text-emerald-700 tabular-nums">
                        R$ {dayMetrics.totalHonorarios.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>

                <div className="col-span-2 sm:col-span-1 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200/60">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Janela de Horários</span>
                    <p className="text-xs sm:text-sm font-bold text-slate-700 mt-1">
                        {dayMetrics.timeRange || 'Sem consultas marcadas'}
                    </p>
                </div>
            </div>

            {/* Lista Cronológica dos Atendimentos do Dia */}
            {dayAppointments.length === 0 ? (
                <div className="p-8 sm:p-12 text-center bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl">
                    <CalendarIcon className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <h4 className="text-slate-800 font-bold text-sm sm:text-base">
                        Nenhum atendimento agendado para {formattedDateTitle.toLowerCase()}
                    </h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                        Sua agenda está livre neste dia. Seus horários disponíveis continuam visíveis para os pacientes no site.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {dayAppointments.map((appointment) => {
                        const isConfirmed = ['confirmed', 'paid'].includes(appointment.status);
                        const isCompleted = appointment.status === 'completed';
                        const isCancelled = appointment.status?.includes('cancelled');
                        const bookingTime = appointment.booking_time ? `${appointment.booking_time.slice(0, 5)}h` : '--:--';
                        const patientName = appointment.patient_name || 'Paciente';
                        const patientPhone = (appointment.patient_phone || '').replace(/\D/g, '');
                        const meetingUrl = `/sala-espera/${appointment.id}`;
                        const publicRoomUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}${meetingUrl}`;
                        const googleCalendarUrl = generateGoogleCalendarUrl(appointment);

                        // WhatsApp Reminder Text
                        const whatsappMsg = encodeURIComponent(
                            `Olá ${patientName}! Aqui é da Doxologos. Nosso atendimento psicológico está agendado para ${appointment.booking_date} às ${appointment.booking_time}. Segue o link de acesso seguro à consulta: ${publicRoomUrl}`
                        );
                        const whatsappLink = patientPhone ? `https://wa.me/55${patientPhone}?text=${whatsappMsg}` : null;

                        return (
                            <div
                                key={appointment.id}
                                className={`border rounded-2xl p-4 sm:p-5 transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 ${
                                    isCancelled
                                        ? 'bg-rose-50/40 border-rose-200/70 opacity-70'
                                        : isCompleted
                                            ? 'bg-slate-50 border-slate-200/70'
                                            : 'bg-white border-slate-200/90 shadow-xs hover:border-slate-300'
                                }`}
                            >
                                {/* Info do Horário e Paciente */}
                                <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                                    {/* Pill de Horário */}
                                    <div className="flex flex-col items-center justify-center w-14 sm:w-16 h-14 rounded-xl bg-slate-900 text-white font-extrabold text-sm sm:text-base tabular-nums shrink-0 shadow-xs">
                                        <Clock className="w-3.5 h-3.5 text-emerald-400 mb-0.5" />
                                        <span>{bookingTime}</span>
                                    </div>

                                    {/* Dados do Paciente e Consulta */}
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight truncate">
                                                {patientName}
                                            </h4>

                                            {/* Status Badge */}
                                            {isConfirmed && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    Confirmada
                                                </span>
                                            )}
                                            {isCompleted && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                                                    Concluída
                                                </span>
                                            )}
                                            {isCancelled && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                                    Cancelada
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-0.5 flex-wrap">
                                            <span>{appointment.service?.name || 'Consulta Psicológica'}</span>
                                            {appointment.valor_repasse_profissional && (
                                                <>
                                                    <span className="text-slate-300">•</span>
                                                    <span className="font-bold text-emerald-700 tabular-nums">
                                                        Honorário: R$ {parseFloat(appointment.valor_repasse_profissional).toFixed(2).replace('.', ',')}
                                                    </span>
                                                </>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {/* Ações em 1 Toque (Meet, Prontuário, Calendário, WhatsApp) */}
                                {!isCancelled && (
                                    <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                                        {/* Entrar na Consulta */}
                                        <a
                                            href={meetingUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors h-10 min-h-[40px]"
                                        >
                                            <Video className="w-4 h-4 text-emerald-400 shrink-0" />
                                            <span>Entrar</span>
                                        </a>

                                        {/* Evolução / Prontuário */}
                                        <Button
                                            onClick={() => onOpenProntuario && onOpenProntuario(appointment)}
                                            variant="outline"
                                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs shadow-xs h-10 min-h-[40px]"
                                        >
                                            <FileText className="w-4 h-4 text-slate-600 shrink-0" />
                                            <span>Prontuário</span>
                                        </Button>

                                        {/* Agendar Próxima Sessão */}
                                        {onOpenScheduleNext && (
                                            <Button
                                                onClick={() => onOpenScheduleNext(appointment)}
                                                variant="outline"
                                                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border-emerald-300 bg-emerald-50/60 hover:bg-emerald-100 text-emerald-800 font-bold text-xs shadow-xs h-10 min-h-[40px]"
                                                title="Agendar próxima consulta para este paciente"
                                            >
                                                <CalendarPlus className="w-3.5 h-3.5 text-emerald-600" />
                                                <span className="hidden sm:inline">Próxima</span>
                                            </Button>
                                        )}

                                        {/* Google Agenda */}
                                        <a
                                            href={googleCalendarUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors h-10"
                                            title="Adicionar ao Google Agenda"
                                        >
                                            <Plus className="w-3.5 h-3.5 text-blue-600" />
                                            <span className="hidden sm:inline">Google Agenda</span>
                                        </a>

                                        {/* Baixar .ICS individual */}
                                        <button
                                            onClick={() => downloadIcsFile(appointment)}
                                            className="w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors shrink-0"
                                            title="Baixar arquivo .ICS para Apple Calendar / Outlook"
                                            aria-label="Baixar .ICS"
                                        >
                                            <Download className="w-4 h-4" />
                                        </button>

                                        {/* WhatsApp Reminder */}
                                        {whatsappLink && (
                                            <a
                                                href={whatsappLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-10 h-10 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center transition-colors shrink-0"
                                                title="Enviar lembrete via WhatsApp"
                                                aria-label="Lembrete WhatsApp"
                                            >
                                                <MessageCircle className="w-4 h-4 text-emerald-600" />
                                            </a>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default ProfessionalScheduleCockpit;
