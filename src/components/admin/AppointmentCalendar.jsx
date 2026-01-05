import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * AppointmentCalendar - Calendário mensal de agendamentos
 * 
 * @component
 * @param {Object} props
 * @param {Array} props.appointments - Array de agendamentos
 * @param {Function} props.onDateClick - Callback ao clicar em uma data
 * @param {Function} props.onAppointmentClick - Callback ao clicar em um agendamento
 * @param {string} props.className - Classes CSS adicionais
 */
export const AppointmentCalendar = ({
    appointments = [],
    onDateClick,
    onAppointmentClick,
    className = ''
}) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    // Navegação de mês
    const goToPreviousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    // Calcular dias do mês
    const { days, firstDayOfWeek } = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const firstDayOfWeek = firstDay.getDay(); // 0 = domingo

        const daysArray = [];

        // Dias do mês anterior (para preencher início)
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            daysArray.push({
                date: new Date(year, month - 1, prevMonthLastDay - i),
                isCurrentMonth: false
            });
        }

        // Dias do mês atual
        for (let day = 1; day <= daysInMonth; day++) {
            daysArray.push({
                date: new Date(year, month, day),
                isCurrentMonth: true
            });
        }

        // Dias do próximo mês (para completar semana)
        const remainingDays = 42 - daysArray.length; // 6 semanas * 7 dias
        for (let day = 1; day <= remainingDays; day++) {
            daysArray.push({
                date: new Date(year, month + 1, day),
                isCurrentMonth: false
            });
        }

        return { days: daysArray, firstDayOfWeek };
    }, [currentDate]);

    // Agrupar agendamentos por data
    const appointmentsByDate = useMemo(() => {
        const grouped = {};

        appointments.forEach(appointment => {
            const dateKey = appointment.booking_date;
            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }
            grouped[dateKey].push(appointment);
        });

        return grouped;
    }, [appointments]);

    // Obter status de um dia
    const getDayStatus = (date) => {
        const dateStr = date.toISOString().split('T')[0];
        const dayAppointments = appointmentsByDate[dateStr] || [];

        if (dayAppointments.length === 0) return null;

        const hasConfirmed = dayAppointments.some(a =>
            a.status === 'confirmed' || a.status === 'paid'
        );
        const hasPending = dayAppointments.some(a =>
            a.status === 'pending_payment' || a.status === 'awaiting_payment'
        );
        const hasCancelled = dayAppointments.some(a =>
            a.status.includes('cancelled')
        );

        if (hasConfirmed) return 'confirmed';
        if (hasPending) return 'pending';
        if (hasCancelled) return 'cancelled';
        return null;
    };

    // Cores por status
    const getStatusColor = (status) => {
        switch (status) {
            case 'confirmed':
                return 'bg-emerald-500';
            case 'pending':
                return 'bg-amber-500';
            case 'cancelled':
                return 'bg-red-500';
            default:
                return 'bg-gray-300';
        }
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={cn('bg-white rounded-xl border border-gray-200 shadow-sm p-6', className)}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-[#2d8659]" />
                    <h3 className="text-xl font-bold text-gray-900">
                        {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </h3>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={goToToday}
                        className="text-sm"
                    >
                        Hoje
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={goToPreviousMonth}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={goToNextMonth}
                    >
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Dias da semana */}
            <div className="grid grid-cols-7 gap-2 mb-2">
                {weekDays.map(day => (
                    <div
                        key={day}
                        className="text-center text-sm font-semibold text-gray-600 py-2"
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Grid de dias */}
            <div className="grid grid-cols-7 gap-2">
                {days.map((dayInfo, index) => {
                    const dateStr = dayInfo.date.toISOString().split('T')[0];
                    const dayAppointments = appointmentsByDate[dateStr] || [];
                    const status = getDayStatus(dayInfo.date);
                    const isToday = dayInfo.date.getTime() === today.getTime();
                    const isPast = dayInfo.date < today;

                    return (
                        <motion.button
                            key={index}
                            whileHover={{ scale: dayInfo.isCurrentMonth ? 1.05 : 1 }}
                            whileTap={{ scale: dayInfo.isCurrentMonth ? 0.95 : 1 }}
                            onClick={() => {
                                if (dayInfo.isCurrentMonth && onDateClick) {
                                    onDateClick(dayInfo.date, dayAppointments);
                                }
                            }}
                            className={cn(
                                'relative aspect-square p-2 rounded-lg transition-all',
                                'flex flex-col items-center justify-center',
                                dayInfo.isCurrentMonth
                                    ? 'bg-white hover:bg-gray-50 border border-gray-200'
                                    : 'bg-gray-50 text-gray-400 cursor-default',
                                isToday && 'ring-2 ring-[#2d8659] ring-offset-2',
                                isPast && dayInfo.isCurrentMonth && 'opacity-60'
                            )}
                            disabled={!dayInfo.isCurrentMonth}
                        >
                            {/* Número do dia */}
                            <span className={cn(
                                'text-sm font-medium',
                                isToday ? 'text-[#2d8659] font-bold' : 'text-gray-900'
                            )}>
                                {dayInfo.date.getDate()}
                            </span>

                            {/* Indicador de agendamentos */}
                            {dayAppointments.length > 0 && (
                                <div className="flex items-center gap-1 mt-1">
                                    <div className={cn(
                                        'w-1.5 h-1.5 rounded-full',
                                        getStatusColor(status)
                                    )} />
                                    <span className="text-xs text-gray-600">
                                        {dayAppointments.length}
                                    </span>
                                </div>
                            )}
                        </motion.button>
                    );
                })}
            </div>

            {/* Legenda */}
            <div className="flex items-center justify-center gap-6 mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-sm text-gray-600">Confirmado</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-sm text-gray-600">Pendente</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-sm text-gray-600">Cancelado</span>
                </div>
            </div>
        </motion.div>
    );
};

export default AppointmentCalendar;
