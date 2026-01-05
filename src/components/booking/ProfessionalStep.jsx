import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Clock, User, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, ArrowLeft, Quote, CheckCircle } from 'lucide-react';
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
  displayMode = 'combined',
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [mobileStage, setMobileStage] = useState('service');
  const professionalsSectionRef = useRef(null);
  const professionalCarouselRef = useRef(null);
  const professionalsViewedRef = useRef(null);
  const [activeFilters, setActiveFilters] = useState([]);
  const [showUnavailable, setShowUnavailable] = useState(false);

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

    // Check if any day has available times
    return Object.values(schedule).some((dayData) => {
      if (!dayData) return false;

      // New structure: {times: [...], month, year}
      if (dayData.times && Array.isArray(dayData.times)) {
        return dayData.times.length > 0;
      }

      // Multi-month structure: [{times: [...], month, year}, ...]
      if (Array.isArray(dayData) && dayData.length > 0) {
        if (dayData[0].times) {
          return dayData.some(entry => entry.times && entry.times.length > 0);
        }
        // Old structure: direct array of times
        return dayData.length > 0;
      }

      return false;
    });
  };

  const getNextAvailableSlot = (professional) => {
    const schedule = availability[professional.id];
    if (!schedule) {
      return null;
    }

    // Helper to extract times from new structure
    const extractTimes = (dayData) => {
      if (!dayData) return [];

      // New structure: {times: [...], month, year}
      if (dayData.times && Array.isArray(dayData.times)) {
        return dayData.times;
      }

      // Multi-month structure: [{times: [...], month, year}, ...]
      if (Array.isArray(dayData) && dayData.length > 0) {
        if (dayData[0].times) {
          // Return times from first available month
          return dayData[0].times;
        }
        // Old structure: direct array of times
        return dayData;
      }

      // Old structure: direct array
      if (Array.isArray(dayData)) {
        return dayData;
      }

      return [];
    };

    const days = Object.entries(schedule)
      .map(([day, dayData]) => [day, extractTimes(dayData)])
      .filter(([, times]) => times.length > 0)
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

  // Sort professionals: available first, then by next available slot
  const sortedProfessionals = useMemo(() => {
    return [...filteredProfessionals].sort((a, b) => {
      const aHasAvail = professionalHasAvailability(a);
      const bHasAvail = professionalHasAvailability(b);

      // Available professionals first
      if (aHasAvail && !bHasAvail) return -1;
      if (!aHasAvail && bHasAvail) return 1;

      // If both have availability, sort by next available slot
      if (aHasAvail && bHasAvail) {
        const aNext = getNextAvailableSlot(a);
        const bNext = getNextAvailableSlot(b);
        if (aNext && bNext) {
          // Compare days first
          const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
          const aDayIndex = dayOrder.indexOf(aNext.day);
          const bDayIndex = dayOrder.indexOf(bNext.day);
          if (aDayIndex !== bDayIndex) return aDayIndex - bDayIndex;
          // Then compare times - ensure they are strings
          const aTime = String(aNext.time || '');
          const bTime = String(bNext.time || '');
          return aTime.localeCompare(bTime);
        }
      }

      // Keep original order for professionals without availability
      return 0;
    });
  }, [filteredProfessionals, availability]);

  // Separate available and unavailable professionals
  const { availableProfessionals: sortedAvailable, unavailableProfessionals } = useMemo(() => {
    const available = [];
    const unavailable = [];

    sortedProfessionals.forEach(prof => {
      if (professionalHasAvailability(prof)) {
        available.push(prof);
      } else {
        unavailable.push(prof);
      }
    });

    return {
      availableProfessionals: available,
      unavailableProfessionals: unavailable
    };
  }, [sortedProfessionals]);

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

  const isServiceOnly = displayMode === 'service-only';
  const isProfessionalOnly = displayMode === 'professional-only';
  const showServiceSelection =
    !isProfessionalOnly && (isServiceOnly || !isMobile || mobileStage === 'service');
  const showProfessionalSelection =
    !isServiceOnly &&
    selectedService &&
    (isProfessionalOnly || !isMobile || mobileStage === 'professional');
  const reserveMobileCtaSpace =
    displayMode === 'combined' && isMobile && selectedService && mobileStage === 'service';
  const stageIndicator = (() => {
    if (isServiceOnly) {
      return 'service';
    }
    if (isProfessionalOnly) {
      return 'professional';
    }
    return isMobile ? mobileStage : selectedProfessional ? 'professional' : 'service';
  })();
  const canContinue = isServiceOnly
    ? Boolean(selectedService)
    : isProfessionalOnly
      ? Boolean(selectedProfessional)
      : Boolean(selectedService && selectedProfessional);

  const handleMoveToProfessionals = () => {
    if (displayMode !== 'combined' || !selectedService) {
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
    if (isServiceOnly) {
      trackBookingEvent('continue_to_professionals');
    } else if (isProfessionalOnly) {
      trackBookingEvent('open_calendar');
    } else {
      trackBookingEvent('open_calendar');
    }
    onNext?.();
  };

  const scrollProfessionalCarousel = (direction) => {
    const node = professionalCarouselRef.current;
    if (!node) {
      return;
    }
    const amount = node.offsetWidth * 0.8;
    node.scrollBy({ left: direction === 'next' ? amount : -amount, behavior: 'smooth' });
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
      {stageIndicator === 'service' ? <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3">Escolha o Serviço e Profissional</h2>
        <p className="text-gray-600 text-lg">Comece selecionando o serviço ideal e depois escolha quem irá atendê-lo.</p>
      </div> : ''}


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

      {/* <motion.div
        key={stageIndicator}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-600"
      >
        <span className="inline-block h-2 w-2 rounded-full bg-[#2d8659]" aria-hidden />
        {stageIndicator === 'service' ? 'Etapa 1 de 2 · Serviço' : 'Etapa 2 de 2 · Profissional'}
      </motion.div> */}

      <AnimatePresence mode="wait">
        {showServiceSelection && (
          <motion.div
            key="service-selection"
            initial={{ opacity: 0, x: isMobile ? -20 : 0 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isMobile ? 20 : 0 }}
            transition={{ duration: 0.25 }}
          >
            {/* Progress Indicator Mobile */}
            {/* <div className="md:hidden mb-4 flex items-center justify-between">
              <div className="text-xs text-gray-500 flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-[#2d8659]" />
                Arraste para ver todos
              </div>
              <div className="flex gap-1.5">
                {services.map((_, index) => (
                  <div
                    key={index}
                    className={`h-1.5 rounded-full transition-all ${services.findIndex(s => s.id === selectedService) === index
                      ? 'w-6 bg-[#2d8659]'
                      : 'w-1.5 bg-gray-300'
                      }`}
                  />
                ))}
              </div>
            </div> */}

            {/* Service Cards - Vertical Stack (Mobile) / Grid (Desktop) */}
            <div className="space-y-3 md:space-y-0 md:grid md:gap-4 md:grid-cols-2 lg:grid-cols-3">
              {services.map((service, index) => {
                const professionalCount = professionals.filter(
                  (professional) => professional.services_ids && professional.services_ids.includes(service.id)
                ).length;
                const isSelected = selectedService === service.id;

                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => handleSelectService(service.id)}
                    className={`w-full p-4 md:p-6 rounded-xl border-2 transition-all text-left group
                    active:scale-95 touch-manipulation
                    focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d8659]
                    ${isSelected
                        ? 'border-[#2d8659] bg-gradient-to-br from-[#2d8659]/5 to-[#2d8659]/10 shadow-lg'
                        : 'border-gray-200 hover:border-[#2d8659] bg-white hover:shadow-md'
                      }`}
                  >
                    {/* Mobile Compact Layout */}
                    <div className="md:hidden">
                      {/* Header: Title + Price */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h3 className="font-bold text-base text-gray-900 leading-tight flex-1">
                          {service.name}
                        </h3>
                        <div className="text-lg font-bold text-[#2d8659] whitespace-nowrap">
                          R$ {parseFloat(service.price).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </div>
                      </div>

                      {/* Info Row - Duration + Professionals */}
                      <div className="flex items-center gap-4 text-xs text-gray-600 mb-3">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {service.duration_minutes >= 60
                            ? `${Math.floor(service.duration_minutes / 60)}h${service.duration_minutes % 60 > 0 ? `${service.duration_minutes % 60}m` : ''
                            }`
                            : `${service.duration_minutes}min`}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" />
                          {professionalCount} {professionalCount === 1 ? 'profissional' : 'profissionais'}
                        </span>
                      </div>

                      {/* Selection Indicator */}
                      {isSelected && (
                        <div className="flex items-center gap-2 text-sm font-semibold text-[#2d8659]">
                          <CheckCircle className="w-4 h-4" />
                          <span>Selecionado</span>
                        </div>
                      )}
                    </div>

                    {/* Desktop Layout - Original */}
                    <div className="hidden md:block">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="font-bold text-xl mb-2 text-gray-900 group-hover:text-[#2d8659] transition-colors">
                            {service.name}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {service.duration_minutes >= 60
                                ? `${Math.floor(service.duration_minutes / 60)}h${service.duration_minutes % 60 > 0 ? ` ${service.duration_minutes % 60}min` : ''
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
                        <div className={`px-3 py-1 rounded-full text-sm font-medium transition-opacity ${isSelected
                          ? 'bg-[#2d8659] text-white opacity-100'
                          : 'bg-[#2d8659] text-white opacity-0 group-hover:opacity-100'
                          }`}>
                          {isSelected ? '✓ Selecionado' : 'Selecionar'}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {showProfessionalSelection && (
          <motion.div
            key="professional-selection"
            initial={{ opacity: 0, x: isMobile ? 20 : 0 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isMobile ? -20 : 0 }}
            transition={{ duration: 0.25 }}
            className="mt-10"
            ref={professionalsSectionRef}
          >
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Escolha o profissional</h3>
              <p className="text-gray-600">
                Serviço selecionado:
                <span className="font-semibold text-[#2d8659] ml-1">{selectedServiceData?.name}</span>
              </p>
              <p className="text-sm text-gray-600 mt-2">
                {(() => {
                  const availableCount = sortedAvailable.length;
                  const unavailableCount = unavailableProfessionals.length;
                  const total = availableCount + unavailableCount;

                  if (unavailableCount === 0) {
                    return `${availableCount} ${availableCount === 1 ? 'profissional disponível' : 'profissionais disponíveis'}`;
                  }

                  return `${availableCount} de ${total} profissionais com horários disponíveis`;
                })()}
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
              <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4 md:m-0 md:px-0" role="toolbar" aria-label="Filtros de profissionais">
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
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${isActive ? 'bg-[#2d8659] text-white border-[#2d8659]' : 'border-gray-300 text-gray-700'
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
                    className="text-sm text-[#2d8659] underline whitespace-nowrap"
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
              <div className="relative">
                <div className="flex justify-end gap-2 mb-2" aria-hidden="true">
                  <button
                    type="button"
                    className="hidden md:inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition-colors hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d8659]"
                    onClick={() => scrollProfessionalCarousel('prev')}
                    aria-label="Ver profissionais anteriores"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    className="hidden md:inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition-colors hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d8659]"
                    onClick={() => scrollProfessionalCarousel('next')}
                    aria-label="Ver mais profissionais"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div
                  ref={professionalCarouselRef}
                  className="flex flex-col gap-4 md:grid md:gap-4 md:grid-flow-col md:auto-cols-[minmax(280px,_85%)] md:overflow-x-auto md:pb-4 md:-mx-4 md:px-4 md:snap-x md:snap-mandatory md:scroll-smooth md:focus:outline-none md:no-scrollbar lg:mx-0 lg:px-0 lg:overflow-visible lg:grid-flow-row lg:auto-cols-auto lg:grid-cols-2"
                  role="listbox"
                  aria-label="Lista de profissionais disponíveis"
                >
                  {/* Available Professionals */}
                  {sortedAvailable.map((professional) => {
                    const isSelectable = professionalHasAvailability(professional);
                    const nextSlot = getNextAvailableSlot(professional);
                    return (
                      <button
                        key={professional.id}
                        type="button"
                        onClick={() => isSelectable && onSelectProfessional?.(professional.id)}
                        disabled={!isSelectable}
                        role="option"
                        aria-selected={selectedProfessional === professional.id}
                        aria-disabled={!isSelectable}
                        className={`relative p-6 rounded-lg border-2 transition-all text-left group snap-center ${selectedProfessional === professional.id && isSelectable
                          ? 'border-[#2d8659] bg-gradient-to-br from-[#2d8659]/5 to-[#2d8659]/10 shadow-md'
                          : 'border-gray-200 bg-white'
                          } ${isSelectable
                            ? 'hover:shadow-lg hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d8659]'
                            : 'opacity-60 cursor-not-allowed'
                          }`}
                      >
                        {/* Badge for immediate availability */}
                        {(() => {
                          const nextSlot = getNextAvailableSlot(professional);
                          if (!nextSlot) return null;

                          const todayIndex = new Date().getDay();
                          const tomorrowIndex = (todayIndex + 1) % 7;
                          const dayInfo = dayLabelMap[nextSlot.day?.toLowerCase?.()] || {};

                          if (dayInfo.index === todayIndex) {
                            return (
                              <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Disponível Hoje
                              </div>
                            );
                          }

                          if (dayInfo.index === tomorrowIndex) {
                            return (
                              <div className="absolute top-4 right-4 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Disponível Amanhã
                              </div>
                            );
                          }

                          return null;
                        })()}
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            {professional.image_url ? (
                              <img
                                src={professional.image_url}
                                alt={professional.name}
                                loading="lazy"
                                decoding="async"
                                className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 group-hover:border-[#2d8659] transition-colors"
                                onError={(e) => {
                                  // Fallback to initials if image fails to load
                                  e.target.style.display = 'none';
                                  e.target.nextElementSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div
                              className="w-16 h-16 rounded-full bg-gradient-to-br from-[#2d8659] to-[#236b47] flex items-center justify-center text-white font-bold text-xl"
                              style={{ display: professional.image_url ? 'none' : 'flex' }}
                            >
                              {professional.name.charAt(0)}
                            </div>
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
                              <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                                <Clock className="w-4 h-4 text-green-600" />
                                <div className="flex-1">
                                  <p className="text-xs text-gray-600">Próximo horário</p>
                                  <p className="text-sm font-bold text-green-700">
                                    {formatNextSlotLabel(nextSlot.day, nextSlot.time)}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        {!isSelectable && (
                          <div className="absolute inset-0 rounded-lg bg-gray-50/95 backdrop-blur-sm border-2 border-gray-300 flex flex-col items-center justify-center gap-2">
                            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                              <Clock className="w-6 h-6 text-gray-400" />
                            </div>
                            <span className="text-sm font-semibold text-gray-700">
                              Sem horários disponíveis
                            </span>
                            <span className="text-xs text-gray-500 px-4 text-center">
                              Este profissional não tem agenda aberta no momento
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}

                  {/* Unavailable Professionals Section */}
                  {unavailableProfessionals.length > 0 && (
                    <>
                      {/* Separator */}
                      {sortedAvailable.length > 0 && (
                        <div className="col-span-full my-4">
                          <div className="flex items-center gap-4">
                            <div className="flex-1 h-px bg-gray-300"></div>
                            <span className="text-sm text-gray-500 font-medium">
                              Profissionais sem agenda disponível
                            </span>
                            <div className="flex-1 h-px bg-gray-300"></div>
                          </div>
                        </div>
                      )}

                      {/* Show More Button */}
                      {!showUnavailable && (
                        <div className="col-span-full">
                          <button
                            type="button"
                            onClick={() => setShowUnavailable(true)}
                            className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors flex items-center justify-center gap-2"
                          >
                            <span>Exibir {unavailableProfessionals.length} {unavailableProfessionals.length === 1 ? 'profissional' : 'profissionais'} sem agenda</span>
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {/* Unavailable Professionals (when expanded) */}
                      {showUnavailable && (
                        <>
                          {unavailableProfessionals.map((professional) => {
                            return (
                              <button
                                key={professional.id}
                                type="button"
                                disabled={true}
                                role="option"
                                aria-selected={false}
                                aria-disabled={true}
                                className="relative p-6 rounded-lg border-2 border-gray-300 bg-gray-50/50 opacity-75 text-left cursor-not-allowed snap-center"
                              >
                                {/* Subtle overlay */}
                                <div className="absolute inset-0 rounded-lg bg-white/40 pointer-events-none"></div>

                                {/* Badge de indisponibilidade */}
                                <div className="absolute top-4 right-4 bg-gray-100 border-2 border-gray-300 text-gray-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 z-10">
                                  <Clock className="w-3 h-3" />
                                  Sem Agenda
                                </div>

                                <div className="flex items-start gap-4 relative z-0">
                                  <div className="flex-shrink-0">
                                    {professional.image_url ? (
                                      <img
                                        src={professional.image_url}
                                        alt={professional.name}
                                        loading="lazy"
                                        decoding="async"
                                        className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                                        onError={(e) => {
                                          e.target.style.display = 'none';
                                          e.target.nextElementSibling.style.display = 'flex';
                                        }}
                                      />
                                    ) : null}
                                    <div
                                      className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white font-bold text-xl"
                                      style={{ display: professional.image_url ? 'none' : 'flex' }}
                                    >
                                      {professional.name.charAt(0)}
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-xl mb-2 text-gray-700">
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
                                    </div>
                                  </div>
                                </div>
                              </button>
                            );
                          })}

                          {/* Collapse Button */}
                          <div className="col-span-full">
                            <button
                              type="button"
                              onClick={() => setShowUnavailable(false)}
                              className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <span>Ocultar profissionais indisponíveis</span>
                              <ChevronUp className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {reserveMobileCtaSpace && (
        <div className="md:hidden fixed left-1/2 -translate-x-1/2 bottom-6 w-[90%] max-w-md z-50">
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
          disabled={!canContinue}
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
