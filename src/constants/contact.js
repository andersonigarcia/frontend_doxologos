/**
 * Configurações e constantes oficiais de contato da clínica Doxologos.
 * Número oficial de WhatsApp e Atendimento: (11) 91728-7583
 */
export const CLINIC_CONTACT = {
  email: 'contato@doxologos.com.br',
  phoneDisplay: '(11) 91728-7583',
  phoneTel: '+5511917287583',
  whatsappNumber: '5511917287583',
  defaultWhatsAppMessage: 'Olá! Gostaria de mais informações sobre os atendimentos da Doxologos.',
  getWhatsAppUrl: (message = '') => {
    const text = message || CLINIC_CONTACT.defaultWhatsAppMessage;
    return `https://wa.me/5511917287583?text=${encodeURIComponent(text)}`;
  }
};
