
import React from 'react';
import { MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import analytics from '@/lib/analytics';

const FloatingWhatsAppButton = ({ isHidden = false }) => {
  const phoneNumber = '5531971982947'; // Número da clínica Doxologos
  const message = 'Olá, gostaria de mais informações sobre os atendimentos da Doxologos.';
  const whatsappLink = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

  const handleClick = () => {
    analytics.trackEvent('whatsapp_click', {
      event_category: 'booking',
      event_label: 'floating_button'
    });
  };

  if (isHidden) return null;

  return (
    <motion.a
      href={whatsappLink}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="fixed bottom-24 right-6 md:bottom-6 bg-[#2d8659] text-white p-4 rounded-full shadow-lg flex items-center justify-center z-40 cursor-pointer focus:outline-none focus:ring-4 focus:ring-green-200"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      aria-label="Fale conosco pelo WhatsApp - Abre em nova aba"
      title="Clique para conversar conosco no WhatsApp"
      role="button"
    >
      <MessageCircle className="w-7 h-7" aria-hidden="true" />
      <span className="sr-only">Conversar no WhatsApp</span>
    </motion.a>
  );
};

export default FloatingWhatsAppButton;
