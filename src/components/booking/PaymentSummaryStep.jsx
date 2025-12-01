import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Calendar, Check, CheckCircle, Clock, CreditCard, MessageCircle, Shield, User, Zap } from 'lucide-react';

const PaymentSummaryStep = ({
  professionals = [],
  selectedProfessional,
  serviceDetails,
  selectedDate,
  selectedTime,
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
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-lg p-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 flex items-center justify-center gap-3">
          <Shield className="w-8 h-8 text-[#2d8659]" />
          Confirme seu agendamento
        </h2>
        <p className="text-gray-600 text-lg">Verifique os dados abaixo antes de seguir para o pagamento seguro</p>
      </div>

      <div className="bg-gradient-to-br from-[#2d8659]/5 to-blue-50 p-8 rounded-xl border border-[#2d8659]/20">
        <h3 className="font-bold text-xl mb-6 flex items-center text-[#2d8659]">
          <CheckCircle className="w-6 h-6 mr-2" />
          Resumo do Agendamento
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#2d8659] rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Profissional</p>
                <p className="font-bold text-gray-900">{professional?.name || 'Selecione um profissional'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Serviço</p>
                <p className="font-bold text-gray-900">{serviceDetails?.name || 'Selecione o serviço'}</p>
                {serviceDuration && <p className="text-sm text-gray-600">Duração: {serviceDuration}</p>}
                {meetingPlatform && (
                  <p className="text-sm text-gray-600">
                    Plataforma: {meetingPlatform === 'zoom' ? 'Zoom' : 'Google Meet'}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Data</p>
                <p className="font-bold text-gray-900">{formattedDate}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Horário</p>
                <p className="font-bold text-gray-900">{selectedTime || 'Escolha um horário'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-6 pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-600" />
              <span className="text-sm text-gray-600">Pagamento seguro</span>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-1">Valor total:</p>
              <p className="text-3xl font-bold text-[#2d8659]">R$ {formatPrice(serviceDetails?.price)}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">Próximos passos</h4>
              <p className="text-sm text-blue-800">
                Após o pagamento, você receberá por email e WhatsApp o link da sala{' '}
                {meetingPlatform === 'zoom' ? 'Zoom gerada automaticamente' : 'Google Meet selecionada no agendamento'}. A sessão começa pontualmente no horário escolhido.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#2d8659]">Pagamento 100% seguro</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paymentSecurityHighlights.map((highlight) => {
              const Icon = highlight.icon || Shield;
              return (
                <div key={highlight.title} className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#2d8659]/10 flex items-center justify-center text-[#2d8659]">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">{highlight.title}</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">{highlight.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1 mt-6">
        <div className="flex items-start gap-2">
          <input type="checkbox" id="acceptTerms" className="mt-1" {...acceptTermsField} />
          <label htmlFor="acceptTerms" className="text-sm text-gray-600">
            Li e aceito os{' '}
            <a href="/termos-e-condicoes" target="_blank" rel="noreferrer" className="text-[#2d8659] hover:underline font-medium">
              termos e condições
            </a>{' '}
            *
          </label>
        </div>
        {acceptTermsError && <p className="text-red-500 text-sm">{acceptTermsError}</p>}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mt-6">
        <Button onClick={onBack} variant="outline">
          Voltar
        </Button>
        <motion.div
          whileHover={!isSubmitting && canSubmit ? { scale: 1.02, y: -1 } : {}}
          whileTap={!isSubmitting && canSubmit ? { scale: 0.98 } : {}}
          className="flex-1"
        >
          <Button
            onClick={onSubmit}
            disabled={!canSubmit || isSubmitting}
            className={`w-full bg-[#2d8659] hover:bg-[#236b47] transition-all duration-300 flex items-center justify-center min-h-[50px] ${
              isSubmitting ? 'cursor-not-allowed opacity-75' : ''
            }`}
            title={submitButtonTitle}
          >
            {isSubmitting ? (
              <>
                <motion.div
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                Processando...
              </>
            ) : (
              'Ir para Pagamento'
            )}
          </Button>
        </motion.div>
        <Button
          type="button"
          onClick={onSupport}
          variant="outline"
          className="sm:w-auto flex items-center gap-2 border-[#2d8659] text-[#2d8659] hover:bg-[#2d8659]/5"
        >
          <MessageCircle className="w-5 h-5" />
          Tirar dúvidas no WhatsApp
        </Button>
      </div>
    </motion.div>
  );
};

export default PaymentSummaryStep;
