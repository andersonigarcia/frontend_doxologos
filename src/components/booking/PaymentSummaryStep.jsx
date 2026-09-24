import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Calendar, Check, CheckCircle, Clock, CreditCard, MessageCircle, Shield, User, Zap } from 'lucide-react';
import { isFeatureEnabled } from '@/lib/paymentFeatureFlags';

const PaymentSummaryStep = ({
  professionals = [],
  selectedProfessional,
  serviceDetails,
  selectedDate,
  selectedTime,
  selectedSlots = [],
  meetingPlatform,
  paymentSecurityHighlights = [],
  acceptTermsField = {},
  acceptTermsError,
  onBack,
  onSubmit,
  onSupport,
  isSubmitting,
  canSubmit,
  submitButtonTitle,
}) => {
  const isImplicitTerms = isFeatureEnabled('CRO_IMPLICIT_TERMS');
  const effectiveCanSubmit = isImplicitTerms ? true : canSubmit;

  const isPackage = selectedSlots.length > 1;
  const unitPrice = parseFloat(serviceDetails?.price || 150);
  const totalPrice = isPackage ? selectedSlots.length * unitPrice : unitPrice;

  const professional = professionals.find((prof) => prof.id === selectedProfessional);
  const formattedDate = selectedDate
    ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    })
    : 'Selecione a data';

  const serviceDuration = (() => {
    if (!serviceDetails?.duration_minutes) return null;
    const minutes = serviceDetails.duration_minutes;
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remaining = minutes % 60;
      return `${hours}h${remaining > 0 ? ` ${remaining}min` : ''}`;
    }
    return `${minutes}min`;
  })();

  const formatPrice = (value) =>
    parseFloat(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-8">
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3 flex items-center justify-center gap-3">
          Tudo pronto para o seu encontro de cuidado
        </h2>
        <p className="text-gray-600 text-sm sm:text-base">Confira os detalhes abaixo antes de reservar o seu horário</p>
      </div>

      {/* Container Estilo Ticket */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        {/* Top Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-[#2d8659]" />
            <h3 className="font-bold text-gray-900">
              {isPackage ? `Resumo do Pacote (${selectedSlots.length} Sessões)` : 'Resumo do Agendamento'}
            </h3>
          </div>
          {isPackage && (
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-extrabold text-xs rounded-full">
              Pacote Promocional
            </span>
          )}
        </div>
        
        {/* Detalhes do Agendamento */}
        <div className="p-6 grid sm:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-0.5">Profissional</p>
                <p className="font-semibold text-gray-900">{professional?.name || 'Selecione um profissional'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CreditCard className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-0.5">Serviço</p>
                <p className="font-semibold text-gray-900">
                  {serviceDetails?.name || 'Selecione o serviço'}
                  {isPackage && <span className="text-emerald-700 font-bold block text-sm mt-0.5">({selectedSlots.length} Consultas)</span>}
                </p>
                {serviceDuration && <p className="text-sm text-gray-600 mt-1">Duração por sessão: {serviceDuration}</p>}
              </div>
            </div>
          </div>
          <div className="space-y-4">
            {isPackage ? (
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-[#2d8659] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Sessões Agendadas ({selectedSlots.length})</p>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {selectedSlots.map((slot, index) => (
                      <div key={`${slot.date}-${slot.time}`} className="text-xs font-bold text-gray-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 flex items-center justify-between gap-2">
                        <span>Sessão {index + 1}:</span>
                        <span className="text-emerald-900">
                          {new Date(`${slot.date}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })} às {slot.time}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-0.5">Data</p>
                    <p className="font-semibold text-gray-900">{formattedDate}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-0.5">Horário</p>
                    <p className="font-semibold text-gray-900">{selectedTime || 'Escolha um horário'}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Linha Tracejada Estilo Ticket */}
        <div className="relative flex items-center justify-center h-4">
           <div className="absolute left-[-10px] w-5 h-5 rounded-full bg-white border-r border-gray-200 z-10"></div>
           <div className="w-full border-t-2 border-dashed border-gray-200"></div>
           <div className="absolute right-[-10px] w-5 h-5 rounded-full bg-white border-l border-gray-200 z-10"></div>
        </div>

        {/* Valor Total */}
        <div className="p-6 bg-gray-50 flex items-center justify-between">
           <div>
             <span className="text-gray-600 font-medium block">Valor total a pagar:</span>
             {isPackage && <span className="text-xs text-gray-500">({selectedSlots.length}x de R$ {formatPrice(unitPrice)})</span>}
           </div>
           <span className="text-3xl font-bold text-[#2d8659]">R$ {formatPrice(totalPrice)}</span>
        </div>
      </div>

      <div className="mb-6 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-start gap-3">
        <Zap className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-800 leading-relaxed">
          {isPackage
            ? 'Após a confirmação, suas salas no Google Meet estarão prontas. O atendimento é 100% individual, confidencial e seguro.'
            : 'Após a confirmação, sua sala no Google Meet estará pronta. O atendimento é 100% individual, confidencial e seguro.'}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mb-6">
        <div className="flex items-center gap-2 text-gray-500">
          <Shield className="w-4 h-4 text-green-600" />
          <span className="text-xs font-semibold uppercase tracking-wider">Pagamento Seguro</span>
        </div>
        {paymentSecurityHighlights.slice(0, 2).map((highlight) => {
          const Icon = highlight.icon || Shield;
          return (
            <div key={highlight.title} className="flex items-center gap-2 text-gray-500">
              <Icon className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-medium">{highlight.title}</span>
            </div>
          );
        })}
      </div>

      {!isImplicitTerms && (
        <div className="flex flex-col gap-1 mb-6 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
          <div className="flex items-center gap-3">
            <input type="checkbox" id="acceptTerms" className="w-5 h-5 text-[#2d8659] border-gray-300 rounded focus:ring-[#2d8659]" {...acceptTermsField} />
            <label htmlFor="acceptTerms" className="text-sm text-gray-700 font-medium cursor-pointer">
              Estou ciente sobre o sigilo profissional e concordo com os{' '}
              <a href="/termos-e-condicoes" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                Termos de Atendimento
              </a>
            </label>
          </div>
          {acceptTermsError && <p className="text-red-500 text-sm ml-8 mt-1">{acceptTermsError}</p>}
        </div>
      )}

      {/* Botões de Ação - Sticky no Mobile para garantir CTA sempre visível acima da dobra */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-2xl z-40 sm:static sm:bg-transparent sm:p-0 sm:border-0 sm:shadow-none sm:z-auto">
        <div className="container max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-3">
          <Button onClick={onBack} variant="outline" className="hidden sm:inline-flex rounded-full">
            Voltar
          </Button>
          <motion.div
            whileHover={!isSubmitting && effectiveCanSubmit ? { scale: 1.02, y: -1 } : {}}
            whileTap={!isSubmitting && effectiveCanSubmit ? { scale: 0.98 } : {}}
            className="w-full flex-1"
          >
            <Button
              onClick={onSubmit}
              disabled={isSubmitting || !effectiveCanSubmit}
              className="w-full bg-[#2d8659] hover:bg-[#236b47] text-white py-3.5 sm:py-6 rounded-full font-bold shadow-lg shadow-[#2d8659]/20 hover:shadow-xl hover:shadow-[#2d8659]/30 transition-all text-base disabled:opacity-50 disabled:cursor-not-allowed h-auto"
            >
              {isSubmitting
                ? 'Processando...'
                : submitButtonTitle || (isPackage ? `Confirmar e Reservar Horário (R$ ${formatPrice(totalPrice)})` : 'Confirmar e Reservar Horário')}
            </Button>
          </motion.div>
          {onSupport && (
            <Button onClick={onSupport} variant="outline" className="hidden sm:inline-flex rounded-full border-green-600 text-[#2d8659] hover:bg-green-50">
              <MessageCircle className="w-4 h-4 mr-2" />
              Precisa de ajuda? Fale conosco no WhatsApp
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default PaymentSummaryStep;
