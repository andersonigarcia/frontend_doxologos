import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  CalendarX,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Quote,
  Star,
  User,
  Zap,
  Sun,
  Sunset,
  Moon,
  Lightbulb,
  MessageCircle,
  AlertCircle,
} from 'lucide-react';

const DateTimeStep = ({
  professionals = [],
  selectedProfessional,
  selectedServiceDetails,
  selectedDate,
  selectedTime,
  onSelectDate,
  onSelectTime,
  currentMonth,
  onPrevMonth,
  onNextMonth,
  isPrevMonthDisabled,
  isDateDisabled,
  getDaysInMonth,
  formatDateToString,
  availableTimes = [],
  bookedSlots = [],
  isLoadingTimes,
  topTestimonials = [],
  onBack,
  onNext,
}) => {
  const professional = professionals.find((prof) => prof.id === selectedProfessional);

  // Swipe gesture state
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const calendarRef = useRef(null);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      onNextMonth();
    } else if (isRightSwipe && !isPrevMonthDisabled()) {
      onPrevMonth();
    }
  };

  // Quick pick handlers
  const handleQuickPick = (quickPickType) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Define search parameters based on quick pick type
    let startDate = new Date(today);
    let maxDaysToCheck;

    if (quickPickType === 0) {
      // "Hoje" - only check today
      maxDaysToCheck = 1;
    } else if (quickPickType === 1) {
      // "Amanhã" - start from tomorrow, check up to 2 days ahead
      startDate.setDate(startDate.getDate() + 1);
      maxDaysToCheck = 2;
    } else {
      // "Esta Semana" - start from TODAY, check next 7 days
      // This searches: today, tomorrow, +2, +3, +4, +5, +6
      maxDaysToCheck = 7;
    }

    // Find the first available date within range
    let checkDate = new Date(startDate);

    for (let i = 0; i < maxDaysToCheck; i++) {
      if (!isDateDisabled(checkDate)) {
        const dateString = formatDateToString(checkDate);
        onSelectDate?.(dateString);

        // Scroll to time slots after a brief delay
        setTimeout(() => {
          const timeSlotsElement = document.getElementById('available-times-label');
          if (timeSlotsElement) {
            timeSlotsElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }, 300);
        return;
      }
      checkDate.setDate(checkDate.getDate() + 1);
    }

    // If no available date found in range, log for debugging
    const pickName = quickPickType === 0 ? 'Hoje' : quickPickType === 1 ? 'Amanhã' : 'Esta Semana';
    console.log(`Nenhuma data disponível encontrada para "${pickName}" nos próximos ${maxDaysToCheck} dias`);
  };

  // Group times by period
  const groupTimesByPeriod = (times) => {
    const periods = {
      manha: [],
      tarde: [],
      noite: [],
    };

    times.forEach((time) => {
      const hour = parseInt(time.split(':')[0]);
      if (hour < 12) {
        periods.manha.push(time);
      } else if (hour < 18) {
        periods.tarde.push(time);
      } else {
        periods.noite.push(time);
      }
    });

    return periods;
  };

  const timePeriods = groupTimesByPeriod(availableTimes);

  // Support contact handler
  const handleContactSupport = () => {
    const whatsappNumber = '5511999999999'; // Replace with actual number
    const message = encodeURIComponent(
      `Olá! Estou tentando agendar ${selectedServiceDetails?.name || 'uma consulta'} mas não encontrei horários disponíveis para ${selectedDate ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', timeZone: 'UTC' }) : 'a data selecionada'}. Podem me ajudar?`
    );
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-lg p-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 flex items-center justify-center">
          <Clock className="w-8 h-8 mr-3 text-[#2d8659]" />Escolha Data e Horário
        </h2>
        <p className="text-gray-600 text-lg">Selecione o melhor dia e horário para sua consulta</p>
      </div>

      <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#2d8659] rounded-full flex items-center justify-center flex-shrink-0">
              {professional?.image_url ? (
                <img src={professional.image_url} alt={professional.name} className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <User className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Profissional:</p>
              <p className="font-bold text-[#2d8659]">{professional?.name}</p>
            </div>
          </div>
          {selectedServiceDetails && (
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Serviço:</p>
                <p className="font-bold text-blue-600">{selectedServiceDetails.name}</p>
                <p className="text-sm text-gray-600">
                  {selectedServiceDetails.duration_minutes >= 60
                    ? `${Math.floor(selectedServiceDetails.duration_minutes / 60)}h${selectedServiceDetails.duration_minutes % 60 > 0
                      ? ` ${selectedServiceDetails.duration_minutes % 60}min`
                      : ''
                    }`
                    : `${selectedServiceDetails.duration_minutes}min`}
                  {' '}
                  • R$ {parseFloat(selectedServiceDetails.price || 0).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedServiceDetails && (
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-5 rounded-xl border border-[#2d8659]/20 bg-[#2d8659]/5">
            <div>
              <p className="text-sm text-[#2d8659] font-semibold uppercase tracking-wide">Investimento da sessão</p>
              <p className="text-3xl font-bold text-[#236b47] mt-1">
                R$ {parseFloat(selectedServiceDetails.price || 0).toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
            <p className="text-sm text-gray-700 md:text-right">
              O valor é confirmado agora e você só finaliza o pagamento na próxima etapa.
            </p>
          </div>
        </div>
      )}

      {topTestimonials.length > 0 && (
        <div className="mb-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Quote className="w-5 h-5 text-[#2d8659]" />
              <p className="text-lg font-semibold text-gray-900">Pacientes que já passaram por aqui</p>
            </div>
            <p className="text-sm text-gray-600 md:text-right">
              "Escolhi o horário perfeito e fui super bem atendido" — é isso que ouvimos com frequência.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {topTestimonials.map((testimonial) => {
              const ratingNumber = Number(testimonial?.rating);
              const rating = Number.isFinite(ratingNumber) ? Math.min(5, Math.max(1, Math.round(ratingNumber))) : 5;
              const comment = testimonial?.comment || testimonial?.feedback || 'Atendimento acolhedor, profissional e com resultados reais.';
              const displayName = testimonial?.bookings?.patient_name || testimonial?.patient_name || 'Paciente atendido';
              const formattedName = (() => {
                const parts = displayName.trim().split(' ').filter(Boolean);
                if (parts.length === 0) return 'Paciente atendido';
                if (parts.length === 1) return parts[0];
                return `${parts[0]} ${parts[parts.length - 1][0]}.`;
              })();
              const professionalName = testimonial?.professionals?.name || testimonial?.professionals?.[0]?.name;

              return (
                <div key={testimonial.id} className="p-5 rounded-xl border border-gray-200 bg-white shadow-sm">
                  <div className="flex items-center gap-1 mb-3">
                    {Array.from({ length: rating }).map((_, index) => (
                      <Star key={index} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm text-gray-700 italic mb-3">“{comment}”</p>
                  <p className="text-xs text-gray-500 font-semibold uppercase">{formattedName}</p>
                  {professionalName && <p className="text-xs text-gray-400 mt-1">Atendido por {professionalName}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Pick Buttons */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-5 h-5 text-[#2d8659]" />
          <p className="text-sm font-semibold text-gray-700">Atalhos Rápidos</p>
        </div>
        <div className="grid grid-cols-3 gap-2 md:gap-3">
          <motion.button
            type="button"
            onClick={() => handleQuickPick(0)}
            className="flex flex-col items-center justify-center p-3 md:p-4 rounded-lg border-2 border-[#2d8659]/30 bg-gradient-to-br from-[#2d8659]/5 to-[#2d8659]/10 hover:border-[#2d8659] hover:shadow-md transition-all group"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <Sun className="w-5 h-5 md:w-6 md:h-6 text-[#2d8659] mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-xs md:text-sm font-semibold text-gray-700">Hoje</span>
          </motion.button>
          <motion.button
            type="button"
            onClick={() => handleQuickPick(1)}
            className="flex flex-col items-center justify-center p-3 md:p-4 rounded-lg border-2 border-blue-500/30 bg-gradient-to-br from-blue-50 to-blue-100 hover:border-blue-500 hover:shadow-md transition-all group"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <Sunset className="w-5 h-5 md:w-6 md:h-6 text-blue-600 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-xs md:text-sm font-semibold text-gray-700">Amanhã</span>
          </motion.button>
          <motion.button
            type="button"
            onClick={() => handleQuickPick(7)}
            className="flex flex-col items-center justify-center p-3 md:p-4 rounded-lg border-2 border-purple-500/30 bg-gradient-to-br from-purple-50 to-purple-100 hover:border-purple-500 hover:shadow-md transition-all group"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <Calendar className="w-5 h-5 md:w-6 md:h-6 text-purple-600 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-xs md:text-sm font-semibold text-gray-700">Esta Semana</span>
          </motion.button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div>
          <div
            ref={calendarRef}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200"
          >
            <div className="bg-gradient-to-r from-[#2d8659] to-[#236b47] text-white px-4 py-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={onPrevMonth}
                  disabled={isPrevMonthDisabled()}
                  className={`p-1.5 rounded-lg transition-all ${isPrevMonthDisabled() ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/20 active:scale-95'
                    }`}
                  aria-label="Mês anterior"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h3 className="text-lg font-bold capitalize">
                  {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </h3>
                <button type="button" onClick={onNextMonth} className="p-1.5 rounded-lg hover:bg-white/20 active:scale-95 transition-all" aria-label="Próximo mês">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <p className="text-center text-xs text-white/70 mt-1">Deslize para mudar de mês</p>
            </div>

            <div className="grid grid-cols-7 gap-1 px-3 py-2 bg-gray-50">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                <div key={day} className="text-center text-xs font-semibold text-gray-600 py-1">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5 p-3">
              {getDaysInMonth(currentMonth).map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className="aspect-square" />;
                }
                const dateString = formatDateToString(date);
                const isSelected = selectedDate === dateString;
                const disabled = isDateDisabled(date);
                const isToday = date.toDateString() === new Date().toDateString();

                return (
                  <motion.button
                    key={dateString}
                    type="button"
                    onClick={() => !disabled && onSelectDate?.(dateString)}
                    disabled={disabled}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm font-medium transition-all ${disabled
                      ? 'text-gray-300 cursor-not-allowed bg-gray-50'
                      : isSelected
                        ? 'bg-[#2d8659] text-white shadow-lg scale-105'
                        : isToday
                          ? 'bg-blue-100 text-blue-700 border-2 border-blue-400 hover:bg-blue-200'
                          : 'text-gray-700 hover:bg-[#2d8659]/10 hover:scale-105 border border-gray-200'
                      }`}
                    whileHover={!disabled ? { scale: 1.05 } : {}}
                    whileTap={!disabled ? { scale: 0.95 } : {}}
                  >
                    <span className="text-base">{date.getDate()}</span>
                    {isToday && !isSelected && <span className="text-[9px] text-blue-600 font-bold">Hoje</span>}
                  </motion.button>
                );
              })}
            </div>

            <div className="flex items-center justify-center gap-4 px-3 py-2 bg-gray-50 border-t text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 bg-blue-100 border-2 border-blue-400 rounded" />
                <span className="text-gray-600">Hoje</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 bg-[#2d8659] rounded" />
                <span className="text-gray-600">Selecionado</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 bg-gray-50 rounded border" />
                <span className="text-gray-600">Disponível</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col">
          {selectedDate ? (
            <>
              <div className="mb-4">
                <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-base font-semibold text-[#2d8659] text-center">
                    📅 {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      timeZone: 'UTC',
                    })}
                  </p>
                </div>
              </div>

              <div className="flex-1 bg-white rounded-xl shadow-md border border-gray-200 p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2" id="available-times-label">
                  ⏰ Horários Disponíveis
                </h3>

                {selectedServiceDetails && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span className="text-gray-700">
                        Duração do serviço:
                        <span className="font-semibold text-blue-600 ml-1">
                          {selectedServiceDetails.duration_minutes >= 60
                            ? `${Math.floor(selectedServiceDetails.duration_minutes / 60)}h${selectedServiceDetails.duration_minutes % 60 > 0
                              ? ` ${selectedServiceDetails.duration_minutes % 60}min`
                              : ''
                            }`
                            : `${selectedServiceDetails.duration_minutes} minutos`}
                        </span>
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1 ml-6">Os horários exibidos garantem tempo suficiente para o atendimento completo.</p>
                  </div>
                )}

                {isLoadingTimes ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <motion.div
                      className="w-8 h-8 border-4 border-[#2d8659] border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                    <span className="mt-3 text-gray-600">Carregando horários...</span>
                  </div>
                ) : availableTimes.length > 0 ? (
                  <>
                    {/* Scarcity Indicator - Few Slots Available */}
                    {availableTimes.length <= 3 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mb-4 p-3 bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300 rounded-lg shadow-sm"
                      >
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 animate-pulse" />
                          <div>
                            <p className="text-sm font-bold text-orange-900">
                              ⚠️ Últimos horários disponíveis!
                            </p>
                            <p className="text-xs text-orange-700">
                              Apenas {availableTimes.length} {availableTimes.length === 1 ? 'vaga restante' : 'vagas restantes'} para esta data.
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Contextual Tip */}
                    <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg flex items-start gap-2">
                      <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="text-blue-900">
                          <strong>Dica:</strong> Manhãs (9h-11h) e tardes (14h-16h) geralmente têm mais disponibilidade!
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4 max-h-96 overflow-y-auto pr-2" role="radiogroup" aria-labelledby="available-times-label">
                      {/* Manhã */}
                      {timePeriods.manha.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2 sticky top-0 bg-white py-1 z-10">
                            <Sun className="w-4 h-4 text-amber-500" />
                            <h4 className="text-sm font-semibold text-gray-700">Manhã</h4>
                            <span className="text-xs text-gray-500">({timePeriods.manha.length} {timePeriods.manha.length === 1 ? 'horário' : 'horários'})</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {timePeriods.manha.map((time) => {
                              const disabled = bookedSlots.includes(time);
                              return (
                                <motion.button
                                  key={time}
                                  type="button"
                                  onClick={() => !disabled && onSelectTime?.(time)}
                                  disabled={disabled}
                                  className={`h-14 md:h-12 p-3 rounded-lg border-2 transition-all duration-300 font-medium relative group ${disabled
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200 line-through'
                                    : selectedTime === time
                                      ? 'border-[#2d8659] bg-[#2d8659] text-white shadow-lg'
                                      : 'border-gray-200 hover:border-[#2d8659] hover:bg-green-50 hover:shadow-md'
                                    }`}
                                  whileHover={!disabled ? { scale: 1.02, y: -2 } : {}}
                                  whileTap={!disabled ? { scale: 0.98 } : {}}
                                  title={disabled ? 'Horário não disponível' : `Agendar para ${time}`}
                                >
                                  <div className="text-base">{time}</div>
                                  {!disabled && selectedTime !== time && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-[#2d8659] text-white rounded-lg opacity-0 group-hover:opacity-90 transition-opacity">
                                      <Clock className="w-4 h-4" />
                                    </div>
                                  )}
                                  {disabled && <div className="text-xs text-gray-400 mt-1">Ocupado</div>}
                                </motion.button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Tarde */}
                      {timePeriods.tarde.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2 sticky top-0 bg-white py-1 z-10">
                            <Sunset className="w-4 h-4 text-orange-500" />
                            <h4 className="text-sm font-semibold text-gray-700">Tarde</h4>
                            <span className="text-xs text-gray-500">({timePeriods.tarde.length} {timePeriods.tarde.length === 1 ? 'horário' : 'horários'})</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {timePeriods.tarde.map((time) => {
                              const disabled = bookedSlots.includes(time);
                              return (
                                <motion.button
                                  key={time}
                                  type="button"
                                  onClick={() => !disabled && onSelectTime?.(time)}
                                  disabled={disabled}
                                  className={`h-14 md:h-12 p-3 rounded-lg border-2 transition-all duration-300 font-medium relative group ${disabled
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200 line-through'
                                    : selectedTime === time
                                      ? 'border-[#2d8659] bg-[#2d8659] text-white shadow-lg'
                                      : 'border-gray-200 hover:border-[#2d8659] hover:bg-green-50 hover:shadow-md'
                                    }`}
                                  whileHover={!disabled ? { scale: 1.02, y: -2 } : {}}
                                  whileTap={!disabled ? { scale: 0.98 } : {}}
                                  title={disabled ? 'Horário não disponível' : `Agendar para ${time}`}
                                >
                                  <div className="text-base">{time}</div>
                                  {!disabled && selectedTime !== time && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-[#2d8659] text-white rounded-lg opacity-0 group-hover:opacity-90 transition-opacity">
                                      <Clock className="w-4 h-4" />
                                    </div>
                                  )}
                                  {disabled && <div className="text-xs text-gray-400 mt-1">Ocupado</div>}
                                </motion.button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Noite */}
                      {timePeriods.noite.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2 sticky top-0 bg-white py-1 z-10">
                            <Moon className="w-4 h-4 text-indigo-500" />
                            <h4 className="text-sm font-semibold text-gray-700">Noite</h4>
                            <span className="text-xs text-gray-500">({timePeriods.noite.length} {timePeriods.noite.length === 1 ? 'horário' : 'horários'})</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {timePeriods.noite.map((time) => {
                              const disabled = bookedSlots.includes(time);
                              return (
                                <motion.button
                                  key={time}
                                  type="button"
                                  onClick={() => !disabled && onSelectTime?.(time)}
                                  disabled={disabled}
                                  className={`h-14 md:h-12 p-3 rounded-lg border-2 transition-all duration-300 font-medium relative group ${disabled
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200 line-through'
                                    : selectedTime === time
                                      ? 'border-[#2d8659] bg-[#2d8659] text-white shadow-lg'
                                      : 'border-gray-200 hover:border-[#2d8659] hover:bg-green-50 hover:shadow-md'
                                    }`}
                                  whileHover={!disabled ? { scale: 1.02, y: -2 } : {}}
                                  whileTap={!disabled ? { scale: 0.98 } : {}}
                                  title={disabled ? 'Horário não disponível' : `Agendar para ${time}`}
                                >
                                  <div className="text-base">{time}</div>
                                  {!disabled && selectedTime !== time && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-[#2d8659] text-white rounded-lg opacity-0 group-hover:opacity-90 transition-opacity">
                                      <Clock className="w-4 h-4" />
                                    </div>
                                  )}
                                  {disabled && <div className="text-xs text-gray-400 mt-1">Ocupado</div>}
                                </motion.button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  /* Empty State - No Times Available */
                  <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300">
                    <CalendarX className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Nenhum horário disponível
                    </h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      Não encontramos horários livres para{' '}
                      {selectedDate && (
                        <strong>
                          {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('pt-BR', {
                            day: 'numeric',
                            month: 'long',
                            timeZone: 'UTC',
                          })}
                        </strong>
                      )}.
                      Tente selecionar outra data ou entre em contato conosco.
                    </p>

                    {/* Suggestions */}
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-md mx-auto text-left">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-900">
                          <p className="font-semibold mb-1">Sugestões:</p>
                          <ul className="list-disc list-inside space-y-1 text-blue-800">
                            <li>Tente datas nos próximos 7-14 dias</li>
                            <li>Manhãs e tardes têm mais opções</li>
                            <li>Terças e quintas são populares</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button
                        variant="outline"
                        onClick={() => onSelectDate?.('')}
                        className="border-[#2d8659] text-[#2d8659] hover:bg-[#2d8659]/10"
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        Escolher outra data
                      </Button>
                      <Button
                        onClick={handleContactSupport}
                        className="bg-[#2d8659] hover:bg-[#236b47]"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Falar com suporte
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center p-8">
              <div className="text-center">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 font-medium mb-1">Selecione uma data para continuar</p>
                <p className="text-sm text-gray-400">Os horários disponíveis serão exibidos aqui.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 pt-6 border-t flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="text-sm text-gray-600">
          {selectedDate && selectedTime ? (
            <span>
              Você selecionou <strong>{new Date(`${selectedDate}T00:00:00`).toLocaleDateString('pt-BR')}</strong> às{' '}
              <strong>{selectedTime}</strong>
            </span>
          ) : (
            <span>Escolha a data e o horário para avançar.</span>
          )}
        </div>
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          <Button variant="outline" onClick={onBack} className="w-full md:w-auto">
            Voltar
          </Button>
          <Button onClick={onNext} disabled={!selectedDate || !selectedTime} className="w-full md:w-auto">
            Continuar
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default DateTimeStep;
