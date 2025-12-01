import React from 'react';
import { motion } from 'framer-motion';
import { Phone, Mail, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ContactSection = ({
  formData,
  emailError,
  isSubmitting,
  onSubmit,
  onEmailChange,
  onPhoneChange,
  onFieldChange,
}) => (
  <section id="contato" className="py-20 bg-gray-50">
    <div className="container mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <h2 className="text-4xl font-bold mb-4">Entre em Contato</h2>
        <p className="text-xl text-gray-600">Estamos aqui para ajudar você</p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
          <form onSubmit={onSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Nome Completo</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => onFieldChange('name', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={onEmailChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent ${
                  emailError ? 'border-red-500' : 'border-gray-300'
                }`}
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Mensagem</label>
              <textarea
                required
                rows={4}
                value={formData.message}
                onChange={(e) => onFieldChange('message', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent"
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
              className="w-full bg-[#2d8659] hover:bg-[#236b47] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Enviando...' : 'Enviar Mensagem'}
            </Button>
          </form>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-8">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-[#2d8659]/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Phone className="w-6 h-6 text-[#2d8659]" />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-1">Telefone</h3>
              <p className="text-gray-600">(31) 97198-2947</p>
            </div>
          </div>
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-[#2d8659]/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Mail className="w-6 h-6 text-[#2d8659]" />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-1">Email</h3>
              <p className="text-gray-600">contato@doxologos.com.br</p>
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
          <div className="bg-white p-6 rounded-xl">
            <h3 className="font-bold text-lg mb-2">Horário de Atendimento</h3>
            <p className="text-gray-600">Segunda a Sexta: 8h às 22h</p>
            <p className="text-gray-600">Sábado: 8h às 14h</p>
          </div>
        </motion.div>
      </div>
    </div>
  </section>
);

export default ContactSection;
