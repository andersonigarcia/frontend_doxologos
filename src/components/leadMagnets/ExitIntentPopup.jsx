import React, { useState, useEffect, useCallback } from 'react';
import { X, Gift, Brain, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLeadTracking } from '@/hooks/useLeadTracking';
import TherapyQuizModal from './TherapyQuizModal';
import MentalHealthChecklistModal from './MentalHealthChecklistModal';
import AnxietyGuideModal from '@/components/home/AnxietyGuideModal';

const STORAGE_KEY = 'doxologos_exit_intent_shown';
const EXCLUDED_PATHS = ['/agendamento', '/checkout', '/checkout-direct', '/area-do-paciente'];

const leadMagnetOptions = [
    {
        id: 'anxiety_guide',
        icon: Heart,
        title: 'Guia de Ansiedade',
        description: '5 técnicas práticas para controlar a ansiedade',
        color: 'from-pink-500 to-rose-500',
        bgColor: 'bg-pink-50',
        borderColor: 'border-pink-200'
    },
    {
        id: 'therapy_quiz',
        icon: Brain,
        title: 'Quiz Terapêutico',
        description: 'Descubra qual abordagem combina com você',
        color: 'from-purple-500 to-indigo-500',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200'
    },
    {
        id: 'mental_health_checklist',
        icon: Gift,
        title: 'Checklist de Saúde Mental',
        description: '15 sinais de que você precisa de ajuda',
        color: 'from-green-500 to-emerald-500',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
    }
];

const ExitIntentPopup = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedMagnet, setSelectedMagnet] = useState(null);
    const [timeOnPage, setTimeOnPage] = useState(0);
    const [scrollDepth, setScrollDepth] = useState(0);

    const { trackExitIntentTrigger } = useLeadTracking();

    // Track time on page
    useEffect(() => {
        const interval = setInterval(() => {
            setTimeOnPage(prev => prev + 1);
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // Track scroll depth
    useEffect(() => {
        const handleScroll = () => {
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            const scrollTop = window.scrollY;
            const depth = Math.round((scrollTop / (documentHeight - windowHeight)) * 100);
            setScrollDepth(Math.max(scrollDepth, depth));
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [scrollDepth]);

    const handleExitIntent = useCallback((e) => {
        // Check if already shown in this session
        const hasShown = sessionStorage.getItem(STORAGE_KEY);
        if (hasShown) return;

        // Check if on excluded path
        const currentPath = window.location.pathname;
        if (EXCLUDED_PATHS.some(path => currentPath.startsWith(path))) return;

        // Check if mouse is leaving from top of page
        if (e.clientY <= 0 && e.relatedTarget === null) {
            setIsOpen(true);
            sessionStorage.setItem(STORAGE_KEY, 'true');

            trackExitIntentTrigger({
                timeOnPage,
                scrollDepth,
                currentPath
            });
        }
    }, [timeOnPage, scrollDepth, trackExitIntentTrigger]);

    useEffect(() => {
        // Only activate on desktop (exit intent doesn't work well on mobile)
        if (window.innerWidth >= 768) {
            document.addEventListener('mouseout', handleExitIntent);
            return () => document.removeEventListener('mouseout', handleExitIntent);
        }
    }, [handleExitIntent]);

    const handleClose = () => {
        setIsOpen(false);
    };

    const handleSelectMagnet = (magnetId) => {
        setSelectedMagnet(magnetId);
        setIsOpen(false);
    };

    return (
        <>
            {/* Main Exit Intent Popup */}
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={handleClose}
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden"
                        >
                            <button
                                onClick={handleClose}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {/* Header */}
                            <div className="bg-gradient-to-br from-[#2d8659] to-[#1f5d3d] p-8 text-white text-center">
                                <h2 className="text-3xl font-bold mb-2">Espere! 🎁</h2>
                                <p className="text-green-50 text-lg">
                                    Antes de ir, escolha um presente gratuito para você
                                </p>
                            </div>

                            {/* Content */}
                            <div className="p-8">
                                <p className="text-center text-gray-600 mb-6">
                                    Escolha um dos nossos materiais exclusivos e comece sua jornada de autoconhecimento:
                                </p>

                                <div className="grid md:grid-cols-3 gap-4">
                                    {leadMagnetOptions.map((option) => {
                                        const Icon = option.icon;
                                        return (
                                            <motion.button
                                                key={option.id}
                                                onClick={() => handleSelectMagnet(option.id)}
                                                className={`p-6 rounded-xl border-2 ${option.borderColor} ${option.bgColor} hover:shadow-lg transition-all text-left group`}
                                                whileHover={{ scale: 1.05, y: -5 }}
                                                whileTap={{ scale: 0.95 }}
                                            >
                                                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${option.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                                    <Icon className="w-6 h-6 text-white" />
                                                </div>
                                                <h3 className="font-bold text-gray-800 mb-2">
                                                    {option.title}
                                                </h3>
                                                <p className="text-sm text-gray-600">
                                                    {option.description}
                                                </p>
                                            </motion.button>
                                        );
                                    })}
                                </div>

                                <div className="mt-6 text-center">
                                    <button
                                        onClick={handleClose}
                                        className="text-sm text-gray-500 hover:text-gray-700 underline"
                                    >
                                        Não, obrigado. Prefiro continuar navegando.
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Individual Lead Magnet Modals */}
            <AnxietyGuideModal
                enabled={selectedMagnet === 'anxiety_guide'}
            />

            <TherapyQuizModal
                isOpen={selectedMagnet === 'therapy_quiz'}
                onClose={() => setSelectedMagnet(null)}
            />

            <MentalHealthChecklistModal
                isOpen={selectedMagnet === 'mental_health_checklist'}
                onClose={() => setSelectedMagnet(null)}
            />
        </>
    );
};

export default ExitIntentPopup;
