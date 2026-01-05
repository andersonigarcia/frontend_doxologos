import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

/**
 * Sticky Bottom CTA Bar - Mobile-First Component
 * Aparece após scroll de 50vh e fica fixo no rodapé
 * Otimizado para touch (56px altura, fácil de tocar)
 */
const StickyBottomCTA = ({
    ctaText = "Agendar Consulta",
    ctaLink = "/agendamento",
    showAfterScroll = 300, // pixels
    className = ""
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        // Verificar se foi dismissado anteriormente (sessionStorage)
        const dismissed = sessionStorage.getItem('stickyCtaDismissed');
        if (dismissed === 'true') {
            setIsDismissed(true);
            return;
        }

        const handleScroll = () => {
            const scrolled = window.scrollY;
            const shouldShow = scrolled > showAfterScroll;

            setIsVisible(shouldShow && !isDismissed);
        };

        // Adicionar listener de scroll
        window.addEventListener('scroll', handleScroll, { passive: true });

        // Verificar posição inicial
        handleScroll();

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [showAfterScroll, isDismissed]);

    const handleDismiss = () => {
        setIsDismissed(true);
        setIsVisible(false);
        // Salvar preferência na sessão
        sessionStorage.setItem('stickyCtaDismissed', 'true');
    };

    return (
        <AnimatePresence>
            {isVisible && !isDismissed && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className={`fixed bottom-0 left-0 right-0 z-50 ${className}`}
                    style={{
                        // Garantir que não interfira com navegação mobile
                        paddingBottom: 'env(safe-area-inset-bottom)'
                    }}
                >
                    {/* Backdrop com blur sutil */}
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-lg" />

                    {/* Conteúdo */}
                    <div className="relative container mx-auto px-4 py-3">
                        <div className="flex items-center gap-3">
                            {/* CTA Principal - Full width em mobile */}
                            <Link to={ctaLink} className="flex-1">
                                <Button
                                    size="lg"
                                    className="w-full bg-[#2d8659] hover:bg-[#236b47] text-white font-semibold shadow-md
                    h-14 text-base sm:text-lg
                    active:scale-95 transition-transform
                    touch-manipulation" // Otimização touch
                                    aria-label={ctaText}
                                >
                                    <Calendar className="w-5 h-5 mr-2" />
                                    {ctaText}
                                </Button>
                            </Link>

                            {/* Botão de fechar - Discreto mas acessível */}
                            <button
                                onClick={handleDismiss}
                                className="flex-shrink-0 w-10 h-10 rounded-full 
                  bg-gray-100 hover:bg-gray-200 
                  flex items-center justify-center
                  active:scale-95 transition-all
                  touch-manipulation"
                                aria-label="Fechar barra de agendamento"
                            >
                                <X className="w-5 h-5 text-gray-600" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default StickyBottomCTA;
