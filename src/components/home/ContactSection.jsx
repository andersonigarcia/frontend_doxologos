import React from 'react';
import { motion } from 'framer-motion';
import { Phone, Mail, MapPin, MessageCircle, Lock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ContactSection = ({
  formData,
  emailError,
  isSubmitting,
  onSubmit,
  onEmailChange,
  onPhoneChange,
  onFieldChange,
}) => {
  const phoneNumber = '+5531971982947';
  const email = 'contato@doxologos.com.br';
  const whatsappNumber = '5531971982947';
  const whatsappMessage = 'Olá! Gostaria de saber mais sobre os atendimentos.';

  return (
    <section id="contato" className="py-12 sm:py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8 sm:mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">Entre em Contato</h2>
          <p className="text-lg sm:text-xl text-gray-600">Estamos aqui para ajudar você</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 sm:gap-12 max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <div className="bg-white p-6 sm:p-10 rounded-2xl shadow-lg border border-gray-100">
              <h3 className="font-bold text-xl sm:text-2xl mb-6 text-gray-900">Mande uma mensagem</h3>
              <form onSubmit={onSubmit} className="space-y-4 sm:space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => onFieldChange('name', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50
                      focus:bg-white focus:ring-2 focus:ring-[#2d8659] focus:border-transparent
                      text-base touch-manipulation transition-colors"
                    placeholder="Seu nome"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={onEmailChange}
                    className={`w-full px-4 py-3 border rounded-xl bg-gray-50
                      focus:bg-white focus:ring-2 focus:ring-[#2d8659] focus:border-transparent
                      text-base touch-manipulation transition-colors ${emailError ? 'border-red-500' : 'border-gray-200'
                      }`}
                    placeholder="seu@email.com"
                  />
                  {emailError && <p className="text-red-500 text-sm mt-1">{emailError}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700">Telefone</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={onPhoneChange}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50
                      focus:bg-white focus:ring-2 focus:ring-[#2d8659] focus:border-transparent
                      text-base touch-manipulation transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700">Mensagem</label>
                  <textarea
                    required
                    rows={4}
                    value={formData.message}
                    onChange={(e) => onFieldChange('message', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50
                      focus:bg-white focus:ring-2 focus:ring-[#2d8659] focus:border-transparent
                      text-base touch-manipulation resize-none transition-colors"
                    placeholder="Como podemos ajudar?"
                  />
                </div>
                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      emailError ||
                      !formData.name ||
                      !formData.email ||
                      !formData.phone ||
                      !formData.message
                    }
                    size="lg"
                    className="w-full bg-[#1b3c37] hover:bg-[#132d29] text-[#f0ebe1]
                      disabled:opacity-50 disabled:cursor-not-allowed
                      py-6 text-base font-bold rounded-xl
                      active:scale-[0.98] transition-all touch-manipulation shadow-md hover:shadow-lg"
                  >
                    {isSubmitting ? 'Enviando...' : 'Enviar Mensagem'}
                  </Button>
                  <p className="text-center text-xs text-[#262624]/60 mt-4 flex items-center justify-center gap-1.5 font-medium">
                    <Lock className="w-3.5 h-3.5" /> Seus dados são confidenciais. Retornamos em até 24h.
                  </p>
                </div>
              </form>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-6 sm:space-y-8">
            <div className="bg-[#1b3c37] p-6 sm:p-8 rounded-2xl text-[#f0ebe1] shadow-lg mb-8 relative overflow-hidden">
              {/* Círculo decorativo */}
              <div className="absolute -right-6 -top-6 w-32 h-32 bg-[#9bab9b] opacity-20 rounded-full blur-2xl pointer-events-none" />
              
              <h3 className="font-serif font-bold text-xl sm:text-2xl mb-2 flex items-center gap-2 text-[#f0ebe1]">
                <MessageCircle className="w-6 h-6" />
                Atendimento Rápido
              </h3>
              <p className="text-[#f0ebe1]/85 mb-6 text-sm sm:text-base leading-relaxed">
                Precisa de uma resposta rápida? Fale com a nossa equipe diretamente pelo WhatsApp.
              </p>
              <a
                href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full"
              >
                <Button className="w-full bg-[#f0ebe1] text-[#1b3c37] hover:bg-white font-bold text-base py-6 rounded-xl transition-all shadow-sm">
                  Chamar no WhatsApp
                </Button>
              </a>
            </div>

            <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-[#1b3c37]/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Mail className="w-6 h-6 text-[#1b3c37]" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg mb-1 text-[#1b3c37]">Email</h3>
                <a href={`mailto:${email}`} className="text-[#262624]/80 hover:text-[#1b3c37] transition-colors break-all">
                  contato@doxologos.com.br
                </a>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-[#1b3c37]/10 rounded-full flex items-center justify-center flex-shrink-0">
                <MapPin className="w-6 h-6 text-[#1b3c37]" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">Atendimento</h3>
                <p className="text-gray-600">100% Online - Presença global: onde você estiver, nós atendemos.</p>
              </div>
            </div>
              <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-lg mb-2">Horário de Atendimento</h3>
                <p className="text-gray-600 text-sm sm:text-base">Segunda a Sexta: 8h às 22h</p>
                <p className="text-gray-600 text-sm sm:text-base">Sábado: 8h às 14h</p>
              </div>

              {/* Emergency Alert Box */}
              <div className="bg-amber-50 border border-amber-200 p-4 sm:p-5 rounded-xl mt-6 shadow-sm">
                <h3 className="font-bold text-amber-800 text-sm sm:text-base mb-1.5 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Aviso Importante
                </h3>
                <p className="text-amber-700 text-xs sm:text-sm leading-relaxed">
                  Não realizamos atendimento de emergência. Em caso de crise aguda, ligue imediatamente para o <strong>188 (CVV)</strong> ou procure o pronto-socorro mais próximo.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
