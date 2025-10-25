
import React from 'react';
import { MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const FloatingWhatsAppButton = () => {
  const phoneNumber = '5531971982947'; // Número da clínica Doxologos
  const message = 'Olá, gostaria de mais informações sobre os atendimentos da Doxologos.';
  const whatsappLink = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

  return (
    <motion.a
      href={whatsappLink}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 bg-[#2d8659] text-white p-4 rounded-full shadow-lg flex items-center justify-center z-50 cursor-pointer focus:outline-none focus:ring-4 focus:ring-green-200"
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
  