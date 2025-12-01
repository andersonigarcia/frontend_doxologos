import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Clock, User, ChevronRight, ArrowLeft, Quote } from 'lucide-react';
import analytics from '@/lib/analytics';

const ProfessionalStep = ({
  services = [],
  professionals = [],
  servicePriceRange,
  selectedService,
  onSelectService,
  selectedProfessional,
  onSelectProfessional,
  onNext,
  onBack,
  availability = {},
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [mobileStage, setMobileStage] = useState('service');
  const professionalsSectionRef = useRef(null);
  const professionalsViewedRef = useRef(false);
  const [activeFilters, setActiveFilters] = useState([]);

  const dayLabelMap = {
    sunday: { label: 'Domingo', index: 0 },
    monday: { label: 'Segunda-feira', index: 1 },
    tuesday: { label: 'Terça-feira', index: 2 },
    wednesday: { label: 'Quarta-feira', index: 3 },
    thursday: { label: 'Quinta-feira', index: 4 },
    friday: { label: 'Sexta-feira', index: 5 },
    saturday: { label: 'Sábado', index: 6 },
  };

  const selectedServiceData = useMemo(
    () => services.find((service) => service.id === selectedService),
    [services, selectedService]
  );

  const availableProfessionals = useMemo(() => {
    if (!selectedService) {
      return [];
    }
    return professionals.filter(
      (professional) => professional.services_ids && professional.services_ids.includes(selectedService)
    );
  }, [professionals, selectedService]);

  const professionalHasAvailability = (professional) => {
    if (!professional?.id) {
      return false;
    }
    const schedule = availability[professional.id];
    if (!schedule) {
      return false;
    }
    return Object.values(schedule).some((times) => Array.isArray(times) && times.length > 0);
  };

  const getNextAvailableSlot = (professional) => {
    const schedule = availability[professional.id];
    if (!schedule) {
      return null;
    }
    const days = Object.entries(schedule)
      .filter(([, times]) => Array.isArray(times) && times.length > 0)
      .sort((a, b) => a[0].localeCompare(b[0]));
    if (!days.length) {
      return null;
    }
    return {
      day: days[0][0],
      time: days[0][1][0],
    };
  };

  const quickFilterDefinitions = [
    {
      id: 'available',
      label: 'Disponível esta semana',
      predicate: (professional) => professionalHasAvailability(professional),
    },
    {
      id: 'top-rated',
      label: 'Mais indicado',
      predicate: (professional) => Number(professional.rating || 0) >= 4.8,
    },
  ];

  const filteredProfessionals = useMemo(() => {
    if (!activeFilters.length) {
      return availableProfessionals;
    }
    return availableProfessionals.filter((professional) =>
      activeFilters.every((filterId) => {
        const filter = quickFilterDefinitions.find((definition) => definition.id === filterId);
        return filter ? filter.predicate(professional) : true;
      })
    );
  }, [activeFilters, availableProfessionals, quickFilterDefinitions]);

  const trackBookingEvent = (action, payload = {}) => {
    const eventPayload = { event: 'booking_funnel', action, ...payload };
    let pushed = false;
    try {
      if (window?.dataLayer) {
        window.dataLayer.push(eventPayload);
        pushed = true;
      }
    } catch (_error) {
      pushed = false;
    }

    if (!pushed) {
      analytics.trackEvent('booking_funnel', {
        event_category: 'Booking Flow',
        event_label: action,
        ...payload,
      });
    }
  };

  const formatNextSlotLabel = (dayKey, time) => {
    if (!dayKey || !time) {
      return null;
    }
    const todayIndex = new Date().getDay();
    const tomorrowIndex = (todayIndex + 1) % 7;
    const dayInfo = dayLabelMap[dayKey?.toLowerCase?.()] || { label: dayKey, index: null };

    if (dayInfo.index === todayIndex) {
      return `Hoje às ${time}`;
    }
    if (dayInfo.index === tomorrowIndex) {
      return `Amanhã às ${time}`;
    }
    return `${dayInfo.label} às ${time}`;
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const handleChange = (event) => setIsMobile(event.matches);
    setIsMobile(mediaQuery.matches);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  useEffect(() => {
    if (!isMobile || !selectedService) {
      setMobileStage('service');
      return;
    }
    if (mobileStage === 'professional') {
      requestAnimationFrame(() => {
        professionalsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [isMobile, mobileStage, selectedService]);

  const showServiceSelection = !isMobile || mobileStage === 'service';
  const showProfessionalSelection = selectedService && (!isMobile || mobileStage === 'professional');
  const reserveMobileCtaSpace = isMobile && selectedService && mobileStage === 'service';

  const handleMoveToProfessionals = () => {
    if (!selectedService) {
      return;
    }
    setMobileStage('professional');
    trackBookingEvent('view_professionals', { via: 'cta' });
  };

  const handleSelectService = (serviceId) => {
    onSelectService?.(serviceId);
    trackBookingEvent('select_service', { serviceId });
  };

  const handleContinue = () => {
    trackBookingEvent('open_calendar');
    onNext?.();
  };

  useEffect(() => {
    if (!professionalsSectionRef.current) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !professionalsViewedRef.current) {
            professionalsViewedRef.current = true;
            trackBookingEvent('view_professionals', { via: 'scroll' });
          }
        });
      },
      { threshold: 0.4 }
    );
    observer.observe(professionalsSectionRef.current);
    return () => observer.disconnect();
  }, [professionalsSectionRef]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-xl shadow-lg p-8 ${reserveMobileCtaSpace ? 'pb-24' : ''}`}
    >
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3">Escolha o Serviço e Profissional</h2>
        <p className="text-gray-600 text-lg">Comece selecionando o serviço ideal e depois escolha quem irá atendê-lo.</p>
      </div>

      {servicePriceRange && (
        <div className="mb-8 p-5 bg-gradient-to-r from-[#2d8659]/10 via-white to-blue-50 border border-[#2d8659]/20 rounded-xl">
          <p className="text-sm font-semibold text-[#2d8659] uppercase tracking-wide mb-1">Investimento transparente</p>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <p className="text-gray-700 text-base md:text-lg">
              Consultas a partir de
              <span className="font-bold text-[#2d8659] ml-2">
                R$ {servicePriceRange.min.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {servicePriceRange.max !== servicePriceRange.min && (
                <span className="text-gray-600">
                  {' '}
                  e até R$ {servicePriceRange.max.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              )}
            </p>
            <p className="text-sm text-gray-600 md:text-right">
              Você só informa seus dados após confirmar o profissional e horário ideal.
            </p>
          </div>
        </div>
      )}

      {showServiceSelection && (
        <>
          <div className="md:hidden mb-4 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
            <ChevronRight className="w-4 h-4 text-[#2d8659]" />
            Arraste para ver todos os serviços disponíveis
          </div>

          <div className="grid gap-4 grid-flow-col auto-cols-[minmax(260px,_80%)] overflow-x-auto pb-4 -mx-6 px-6 snap-x snap-mandatory scroll-smooth md:mx-0 md:px-0 md:overflow-visible md:grid-flow-row md:auto-cols-auto md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => {
              const professionalCount = professionals.filter(
                (professional) => professional.services_ids && professional.services_ids.includes(service.id)
              ).length;

              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => handleSelectService(service.id)}
                  className={`p-5 md:p-6 rounded-lg border-2 transition-all hover:shadow-lg text-left group hover:scale-[1.02] snap-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d8659] ${
                    selectedService === service.id
                      ? 'border-[#2d8659] bg-gradient-to-br from-[#2d8659]/5 to-[#2d8659]/10 shadow-md'
                      : 'border-gray-200 hover:border-[#2d8659] bg-white'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-xl mb-2 text-gray-900 group-hover:text-[#2d8659] transition-colors">
                        {service.name}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {service.duration_minutes >= 60
                            ? `${Math.floor(service.duration_minutes / 60)}h${
                                service.duration_minutes % 60 > 0 ? ` ${service.duration_minutes % 60}min` : ''
                              }`
                            : `${service.duration_minutes}min`}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {professionalCount} {professionalCount === 1 ? 'profissional' : 'profissionais'}
                        </span>
                      </div>
                      {service.description && (
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{service.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-2xl font-bold text-[#2d8659]">
                      R$ {parseFloat(service.price).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="bg-[#2d8659] text-white px-3 py-1 rounded-full text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Selecionar
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {showProfessionalSelection && (
        <div className="mt-10" ref={professionalsSectionRef}>
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900">Escolha o profissional</h3>
            <p className="text-gray-600">
              Serviço selecionado:
              <span className="font-semibold text-[#2d8659] ml-1">{selectedServiceData?.name}</span>
            </p>
            {isMobile && (
              <button
                type="button"
                onClick={() => setMobileStage('service')}
                className="mt-3 text-sm font-medium text-[#2d8659] underline"
              >
                Trocar serviço
              </button>
            )}
          </div>

          <div className="mb-6 flex flex-col gap-3">
            <div className="flex items-center gap-2 px-4 py-3 rounded-full bg-[#2d8659]/10 text-[#2d8659] text-sm font-semibold w-full justify-center">
              <Quote className="w-4 h-4" />
              97% dos pacientes recomendam a experiência de agendamento da Doxologos.
            </div>
            <div className="flex flex-wrap gap-2 justify-center text-sm">
              <div className="px-4 py-2 bg-white border border-[#2d8659]/30 rounded-full shadow-sm flex items-center gap-2">
                <span className="font-semibold text-[#2d8659]">{selectedServiceData?.name}</span>
                {selectedServiceData?.price && (
                  <span className="text-gray-600">
                    · R$
                    {parseFloat(selectedServiceData.price).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                )}
                {selectedServiceData?.duration_minutes && (
                  <span className="text-gray-500">
                    · {selectedServiceData.duration_minutes}min
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-2 font-semibold">Filtros rápidos</p>
            <div className="flex flex-wrap gap-3">
              {quickFilterDefinitions.map((filter) => {
                const isActive = activeFilters.includes(filter.id);
                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() =>
                      setActiveFilters((prev) =>
                        prev.includes(filter.id)
                          ? prev.filter((id) => id !== filter.id)
                          : [...prev, filter.id]
                      )
                    }
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                      isActive ? 'bg-[#2d8659] text-white border-[#2d8659]' : 'border-gray-300 text-gray-700'
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
              {activeFilters.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveFilters([])}
                  className="text-sm text-[#2d8659] underline"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          </div>

          {availableProfessionals.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 mb-4 font-medium">Nenhum profissional disponível para este serviço</p>
              {onBack && (
                <Button onClick={onBack} variant="outline" className="border-[#2d8659] text-[#2d8659]">
                  <ArrowLeft className="w-4 h-4 mr-2" />Escolher outro serviço
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 grid-flow-col auto-cols-[minmax(280px,_85%)] overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory scroll-smooth md:mx-0 md:px-0 md:overflow-visible md:grid-flow-row md:auto-cols-auto md:grid-cols-2">
              {filteredProfessionals.map((professional) => {
                const isSelectable = professionalHasAvailability(professional);
                const nextSlot = getNextAvailableSlot(professional);
                return (
                  <button
                    key={professional.id}
                    type="button"
                    onClick={() => isSelectable && onSelectProfessional?.(professional.id)}
                    disabled={!isSelectable}
                    className={`relative p-6 rounded-lg border-2 transition-all text-left group snap-center ${
                      selectedProfessional === professional.id && isSelectable
                        ? 'border-[#2d8659] bg-gradient-to-br from-[#2d8659]/5 to-[#2d8659]/10 shadow-md'
                        : 'border-gray-200 bg-white'
                    } ${
                      isSelectable
                        ? 'hover:shadow-lg hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d8659]'
                        : 'opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        {professional.image_url ? (
                          <img
                            src={professional.image_url}
                            alt={professional.name}
                            className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 group-hover:border-[#2d8659] transition-colors"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#2d8659] to-[#236b47] flex items-center justify-center text-white font-bold text-xl">
                            {professional.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-xl mb-2 text-gray-900 group-hover:text-[#2d8659] transition-colors">
                          {professional.name}
                        </h4>
                        {professional.mini_curriculum && (
                          <p className="text-sm text-gray-600 mb-3">
                            {professional.mini_curriculum.length > 120
                              ? `${professional.mini_curriculum.substring(0, 120)}...`
                              : professional.mini_curriculum}
                          </p>
                        )}
                        {professional.email && (
                          <p className="text-xs text-gray-500 mb-2">📧 {professional.email}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">✓ Especialista em {selectedServiceData?.name}</span>
                          <div className="bg-[#2d8659] text-white px-3 py-1 rounded-full text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                            Selecionar
                          </div>
                        </div>
                        {nextSlot && (
                          <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-[#2d8659]">
                            Próximo horário: {formatNextSlotLabel(nextSlot.day, nextSlot.time)}
                          </div>
                        )}
                      </div>
                    </div>
                    {!isSelectable && (
                      <div className="absolute inset-0 rounded-lg bg-white/75 backdrop-blur-[1px] border-2 border-transparent flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-600 bg-gray-100 border border-gray-200 px-3 py-1 rounded-full">
                          Agenda indisponível no momento
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {reserveMobileCtaSpace && (
        <div className="md:hidden fixed left-1/2 -translate-x-1/2 bottom-6 w-[90%] max-w-md z-30">
          <button
            type="button"
            onClick={handleMoveToProfessionals}
            className="w-full bg-[#2d8659] text-white py-4 rounded-full font-semibold shadow-2xl flex items-center justify-center gap-2"
            aria-label="Avançar para escolha de profissional"
          >
            Escolher profissional
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-4">
        {onBack && (
          <Button onClick={onBack} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />Voltar
          </Button>
        )}
        <Button
          disabled={!selectedService || !selectedProfessional}
          className="bg-[#2d8659] hover:bg-[#236b47] disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleContinue}
        >
          Continuar
        </Button>
      </div>
    </motion.div>
  );
};

export default ProfessionalStep;
