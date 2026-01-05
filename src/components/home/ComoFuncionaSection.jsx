import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MessageCircle, Mail, Phone, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

/**
 * Touch-Optimized "Como Funciona" Component
 * Swipe horizontal para mobile, grid para desktop
 */

const steps = [
    {
        icon: Calendar,
        title: '1. Agende',
        description: 'Escolha o profissional, serviço e horário ideal',
        target: '/agendamento',
        color: 'blue'
    },
    {
        icon: MessageCircle,
        title: '2. Pagamento',
        description: 'Realize o pagamento de forma segura',
        target: '/area-do-paciente',
        color: 'green'
    },
    {
        icon: Mail,
        title: '3. Confirmação',
        description: 'Link da sala virtual será disponibilizado na área do cliente',
        target: '/area-do-paciente',
        color: 'purple'
    },
    {
        icon: Phone,
        title: '4. Atendimento',
        description: 'Participe da sessão online com total privacidade e segurança',
        target: '/area-do-paciente',
        color: 'orange'
    }
];

const ComoFuncionaSection = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(0);
    const [touchStart, setTouchStart] = useState(0);
    const [touchEnd, setTouchEnd] = useState(0);

    // Mínimo de swipe para mudar de card (50px)
    const minSwipeDistance = 50;

    const handleTouchStart = (e) => {
        setTouchEnd(0); // Reset
        setTouchStart(e.targetTouches[0].clientX);
    };

    const handleTouchMove = (e) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = () => {
        if (!touchStart || !touchEnd) return;

        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe && currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        }
        if (isRightSwipe && currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const nextStep = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const goToStep = (index) => {
        setCurrentStep(index);
    };

    const handleStepClick = (target) => {
        if (target) {
            navigate(target);
        }
    };

    const colorClasses = {
        blue: 'from-blue-500 to-blue-600',
        green: 'from-green-500 to-green-600',
        purple: 'from-purple-500 to-purple-600',
        orange: 'from-orange-500 to-orange-600',
    };

    return (
        <section id="como-funciona" className="py-12 sm:py-20 bg-gray-50">
            <div className="container mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-8 sm:mb-16"
                >
                    <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">Como Funciona o Atendimento</h2>
                    <p className="text-lg sm:text-xl text-gray-600">Simples, rápido e seguro</p>
                </motion.div>

                {/* Mobile: Swipe Cards */}
                <div className="md:hidden">
                    <div
                        className="relative overflow-hidden"
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentStep}
                                initial={{ opacity: 0, x: 100 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -100 }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="bg-white rounded-2xl shadow-lg p-8 min-h-[320px] flex flex-col"
                            >
                                {/* Ícone */}
                                <div className={`w-20 h-20 bg-gradient-to-br ${colorClasses[steps[currentStep].color]} rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg`}>
                                    {React.createElement(steps[currentStep].icon, { className: "w-10 h-10 text-white" })}
                                </div>

                                {/* Título */}
                                <h3 className="text-2xl font-bold mb-4 text-center text-gray-900">
                                    {steps[currentStep].title}
                                </h3>

                                {/* Descrição */}
                                <p className="text-gray-600 text-center text-lg mb-6 flex-grow">
                                    {steps[currentStep].description}
                                </p>

                                {/* Indicador de progresso */}
                                <div className="flex justify-center gap-2 mb-6">
                                    {steps.map((_, index) => (
                                        <button
                                            key={index}
                                            onClick={() => goToStep(index)}
                                            className={`h-2 rounded-full transition-all touch-manipulation ${index === currentStep
                                                ? 'w-8 bg-[#2d8659]'
                                                : 'w-2 bg-gray-300'
                                                }`}
                                            aria-label={`Ir para passo ${index + 1}`}
                                        />
                                    ))}
                                </div>

                                {/* Navegação */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={prevStep}
                                        disabled={currentStep === 0}
                                        className="flex-1 py-3 px-4 rounded-lg border-2 border-gray-300 text-gray-700 font-medium
                      disabled:opacity-30 disabled:cursor-not-allowed
                      active:scale-95 transition-all touch-manipulation"
                                        aria-label="Passo anterior"
                                    >
                                        <ChevronLeft className="w-5 h-5 mx-auto" />
                                    </button>

                                    {currentStep < steps.length - 1 ? (
                                        <button
                                            onClick={nextStep}
                                            className="flex-1 py-3 px-6 rounded-lg bg-[#2d8659] text-white font-semibold
                        active:scale-95 transition-all touch-manipulation shadow-md"
                                        >
                                            Próximo
                                            <ChevronRight className="w-5 h-5 inline ml-2" />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleStepClick('/agendamento')}
                                            className="flex-1 py-3 px-6 rounded-lg bg-[#2d8659] text-white font-semibold
                        active:scale-95 transition-all touch-manipulation shadow-md"
                                        >
                                            <Calendar className="w-5 h-5 inline mr-2" />
                                            Agendar Agora
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        </AnimatePresence>

                        {/* Dica de swipe */}
                        <p className="text-center text-sm text-gray-500 mt-4">
                            👆 Deslize para navegar entre os passos
                        </p>
                    </div>
                </div>

                {/* Desktop: Grid tradicional */}
                <div className="hidden md:grid md:grid-cols-4 gap-8">
                    {steps.map((step, index) => (
                        <motion.button
                            key={step.title}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            type="button"
                            onClick={() => handleStepClick(step.target)}
                            className="text-center p-6 rounded-xl hover:shadow-lg transition-shadow bg-white w-full 
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d8659]"
                            aria-label={`Ir para ${step.title}`}
                        >
                            <div className={`w-16 h-16 bg-gradient-to-br ${colorClasses[step.color]} rounded-full flex items-center justify-center mx-auto mb-4 shadow-md`}>
                                {React.createElement(step.icon, { className: "w-8 h-8 text-white" })}
                            </div>
                            <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                            <p className="text-gray-600">{step.description}</p>
                        </motion.button>
                    ))}
                </div>

                {/* CTA sempre visível em mobile */}
                <div className="md:hidden mt-8">
                    <Button
                        onClick={() => handleStepClick('/agendamento')}
                        size="lg"
                        className="w-full bg-[#2d8659] hover:bg-[#236b47] text-lg py-6 shadow-lg"
                    >
                        <Calendar className="w-5 h-5 mr-2" />
                        Pular e Agendar Agora
                    </Button>
                </div>
            </div>
        </section>
    );
};

export default ComoFuncionaSection;
