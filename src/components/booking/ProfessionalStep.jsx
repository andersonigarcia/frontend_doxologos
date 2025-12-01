import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Clock, User, ChevronRight, ArrowLeft } from 'lucide-react';

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

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-lg p-8">
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
              onClick={() => onSelectService?.(service.id)}
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

      {selectedService && (
        <div className="mt-10">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900">Escolha o profissional</h3>
            <p className="text-gray-600">
              Serviço selecionado:
              <span className="font-semibold text-[#2d8659] ml-1">{selectedServiceData?.name}</span>
            </p>
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
            <div className="grid gap-4 md:grid-cols-2">
              {availableProfessionals.map((professional) => {
                const isSelectable = professionalHasAvailability(professional);
                return (
                  <button
                    key={professional.id}
                    type="button"
                    onClick={() => isSelectable && onSelectProfessional?.(professional.id)}
                    disabled={!isSelectable}
                    className={`relative p-6 rounded-lg border-2 transition-all text-left group ${
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

      <div className="mt-8 flex flex-wrap gap-4">
        {onBack && (
          <Button onClick={onBack} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />Voltar
          </Button>
        )}
        <Button
          disabled={!selectedService || !selectedProfessional}
          className="bg-[#2d8659] hover:bg-[#236b47] disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onNext}
        >
          Continuar
        </Button>
      </div>
    </motion.div>
  );
};

export default ProfessionalStep;
