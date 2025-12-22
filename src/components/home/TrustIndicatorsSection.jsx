import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Users, Star, Award, CheckCircle, Lock } from 'lucide-react';

/**
 * Compact Trust Indicators - Mobile-First
 * Carrossel horizontal de badges de confiança
 */

const trustIndicators = [
    {
        icon: Star,
        value: '4.9/5.0',
        label: 'Avaliação',
        color: 'yellow',
        bgColor: 'from-yellow-500 to-orange-500'
    },
    {
        icon: Users,
        value: '100+',
        label: 'Consultas',
        color: 'blue',
        bgColor: 'from-blue-500 to-cyan-500'
    },
    {
        icon: Shield,
        value: 'CRP',
        label: 'Registrado',
        color: 'green',
        bgColor: 'from-green-500 to-emerald-500'
    },
    {
        icon: Lock,
        value: 'LGPD',
        label: 'Compliant',
        color: 'purple',
        bgColor: 'from-purple-500 to-pink-500'
    },
    {
        icon: Award,
        value: '98%',
        label: 'Satisfação',
        color: 'indigo',
        bgColor: 'from-indigo-500 to-blue-500'
    },
    {
        icon: CheckCircle,
        value: '24h',
        label: 'Resposta',
        color: 'teal',
        bgColor: 'from-teal-500 to-green-500'
    }
];

const TrustIndicatorsSection = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAutoPlaying, setIsAutoPlaying] = useState(true);

    // Auto-rotate a cada 3 segundos
    useEffect(() => {
        if (!isAutoPlaying) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % trustIndicators.length);
        }, 3000);

        return () => clearInterval(interval);
    }, [isAutoPlaying]);

    const handleIndicatorClick = (index) => {
        setCurrentIndex(index);
        setIsAutoPlaying(false);

        // Retomar auto-play após 10 segundos
        setTimeout(() => setIsAutoPlaying(true), 10000);
    };

    return (
        <section className="py-8 sm:py-12 bg-gradient-to-br from-gray-50 to-white border-y border-gray-100">
            <div className="container mx-auto px-4">
                {/* Mobile: Carrossel */}
                <div className="md:hidden">
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="flex flex-col items-center"
                    >
                        {/* Ícone grande */}
                        <div className={`w-20 h-20 bg-gradient-to-br ${trustIndicators[currentIndex].bgColor} rounded-2xl flex items-center justify-center mb-4 shadow-lg`}>
                            {React.createElement(trustIndicators[currentIndex].icon, {
                                className: "w-10 h-10 text-white"
                            })}
                        </div>

                        {/* Valor */}
                        <div className="text-4xl font-bold text-gray-900 mb-1">
                            {trustIndicators[currentIndex].value}
                        </div>

                        {/* Label */}
                        <div className="text-lg text-gray-600 mb-6">
                            {trustIndicators[currentIndex].label}
                        </div>

                        {/* Indicadores de progresso */}
                        <div className="flex gap-2">
                            {trustIndicators.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleIndicatorClick(index)}
                                    className={`h-2 rounded-full transition-all touch-manipulation ${index === currentIndex
                                        ? 'w-8 bg-[#2d8659]'
                                        : 'w-2 bg-gray-300'
                                        }`}
                                    aria-label={`Ver indicador ${index + 1}`}
                                />
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* Desktop: Grid compacto */}
                <div className="hidden md:grid md:grid-cols-6 gap-4">
                    {trustIndicators.map((indicator, index) => (
                        <motion.div
                            key={indicator.label}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="flex flex-col items-center p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className={`w-12 h-12 bg-gradient-to-br ${indicator.bgColor} rounded-lg flex items-center justify-center mb-2`}>
                                {React.createElement(indicator.icon, {
                                    className: "w-6 h-6 text-white"
                                })}
                            </div>
                            <div className="text-2xl font-bold text-gray-900">
                                {indicator.value}
                            </div>
                            <div className="text-sm text-gray-600 text-center">
                                {indicator.label}
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Texto de apoio */}
                <p className="text-center text-sm text-gray-500 mt-6">
                    Confiança e qualidade comprovadas por nossos pacientes
                </p>
            </div>
        </section>
    );
};

export default TrustIndicatorsSection;
