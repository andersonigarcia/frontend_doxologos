import React from 'react';
import { motion } from 'framer-motion';
import { Phone, Mail, MapPin, MessageCircle } from 'lucide-react';
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

        {/* One-Tap Contact Options - Mobile First */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8 sm:mb-12 max-w-4xl mx-auto"
        >
          {/* WhatsApp - Prioridade em mobile */}
          <a
            href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Button
              type="button"
              size="lg"
              className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold
                py-4 sm:py-3 text-base
                active:scale-95 transition-all touch-manipulation
                shadow-md hover:shadow-lg"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              WhatsApp
            </Button>
          </a>

          {/* Telefone - tel: link */}
          <a
            href={`tel:${phoneNumber}`}
            className="block"
          >
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="w-full border-2 border-[#2d8659] text-[#2d8659] hover:bg-[#2d8659] hover:text-white
                py-4 sm:py-3 text-base font-semibold
                active:scale-95 transition-all touch-manipulation"
            >
              <Phone className="w-5 h-5 mr-2" />
              Ligar Agora
            </Button>
          </a>

          {/* Email - mailto: link */}
          <a
            href={`mailto:${email}`}
            className="block"
          >
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="w-full border-2 border-gray-300 text-gray-700 hover:bg-gray-100
                py-4 sm:py-3 text-base font-semibold
                active:scale-95 transition-all touch-manipulation"
            >
              <Mail className="w-5 h-5 mr-2" />
              Email
            </Button>
          </a>
        </motion.div>

        {/* Divider com texto */}
        <div className="flex items-center gap-4 max-w-4xl mx-auto mb-8 sm:mb-12">
          <div className="flex-1 h-px bg-gray-300" />
          <span className="text-sm text-gray-500 font-medium">ou envie uma mensagem</span>
          <div className="flex-1 h-px bg-gray-300" />
        </div>

        <div className="grid md:grid-cols-2 gap-8 sm:gap-12 max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <form onSubmit={onSubmit} className="space-y-4 sm:space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => onFieldChange('name', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg 
                    focus:ring-2 focus:ring-[#2d8659] focus:border-transparent
                    text-base touch-manipulation"
                  placeholder="Seu nome"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={onEmailChange}
                  className={`w-full px-4 py-3 border rounded-lg 
                    focus:ring-2 focus:ring-[#2d8659] focus:border-transparent
                    text-base touch-manipulation ${emailError ? 'border-red-500' : 'border-gray-300'
                    }`}
                  placeholder="seu@email.com"
                />
                {emailError && <p className="text-red-500 text-sm mt-1">{emailError}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Telefone</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={onPhoneChange}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg 
                    focus:ring-2 focus:ring-[#2d8659] focus:border-transparent
                    text-base touch-manipulation"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Mensagem</label>
                <textarea
                  required
                  rows={4}
                  value={formData.message}
                  onChange={(e) => onFieldChange('message', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg 
                    focus:ring-2 focus:ring-[#2d8659] focus:border-transparent
                    text-base touch-manipulation resize-none"
                  placeholder="Como podemos ajudar?"
                />
              </div>
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
                className="w-full bg-[#2d8659] hover:bg-[#236b47] 
                  disabled:opacity-50 disabled:cursor-not-allowed
                  py-4 text-base font-semibold
                  active:scale-95 transition-all touch-manipulation"
              >
                {isSubmitting ? 'Enviando...' : 'Enviar Mensagem'}
              </Button>
            </form>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-6 sm:space-y-8">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-[#2d8659]/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Phone className="w-6 h-6 text-[#2d8659]" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">Telefone</h3>
                <a href={`tel:${phoneNumber}`} className="text-gray-600 hover:text-[#2d8659] transition-colors">
                  (31) 97198-2947
                </a>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-[#2d8659]/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Mail className="w-6 h-6 text-[#2d8659]" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">Email</h3>
                <a href={`mailto:${email}`} className="text-gray-600 hover:text-[#2d8659] transition-colors break-all">
                  contato@doxologos.com.br
                </a>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-[#2d8659]/10 rounded-full flex items-center justify-center flex-shrink-0">
                <MapPin className="w-6 h-6 text-[#2d8659]" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">Atendimento</h3>
                <p className="text-gray-600">100% Online - Presença global: onde você estiver, nós atendemos.</p>
              </div>
            </div>
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm">
              <h3 className="font-bold text-lg mb-2">Horário de Atendimento</h3>
              <p className="text-gray-600 text-sm sm:text-base">Segunda a Sexta: 8h às 22h</p>
              <p className="text-gray-600 text-sm sm:text-base">Sábado: 8h às 14h</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
