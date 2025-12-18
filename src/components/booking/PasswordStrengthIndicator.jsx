import React from 'react';
import { motion } from 'framer-motion';
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react';

/**
 * Calcula a força da senha baseado em critérios
 * @param {string} password - Senha a ser avaliada
 * @returns {Object} - { strength: number (0-4), label: string, color: string, suggestions: array }
 */
const calculatePasswordStrength = (password) => {
    if (!password) {
        return { strength: 0, label: '', color: '', suggestions: [] };
    }

    let strength = 0;
    const suggestions = [];

    // Critério 1: Comprimento (mínimo 8)
    if (password.length >= 8) {
        strength++;
    } else {
        suggestions.push('Use pelo menos 8 caracteres');
    }

    // Critério 2: Comprimento ideal (12+)
    if (password.length >= 12) {
        strength++;
    } else if (password.length >= 8) {
        suggestions.push('Senhas mais longas são mais seguras');
    }

    // Critério 3: Letras maiúsculas e minúsculas
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
        strength++;
    } else {
        suggestions.push('Combine letras maiúsculas e minúsculas');
    }

    // Critério 4: Números
    if (/\d/.test(password)) {
        strength++;
    } else {
        suggestions.push('Adicione números');
    }

    // Critério 5: Caracteres especiais
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        strength++;
    } else {
        suggestions.push('Use caracteres especiais (!@#$%...)');
    }

    // Determinar label e cor baseado na força
    const levels = [
        { label: '', color: '', icon: null },
        { label: 'Muito fraca', color: 'red', icon: ShieldAlert },
        { label: 'Fraca', color: 'orange', icon: ShieldAlert },
        { label: 'Média', color: 'yellow', icon: Shield },
        { label: 'Boa', color: 'lime', icon: ShieldCheck },
        { label: 'Forte', color: 'green', icon: ShieldCheck },
    ];

    const level = levels[strength];

    return {
        strength,
        label: level.label,
        color: level.color,
        icon: level.icon,
        suggestions: suggestions.slice(0, 2), // Máximo 2 sugestões
    };
};

/**
 * Componente de indicador de força de senha
 */
const PasswordStrengthIndicator = ({ password, isExistingPatient = false }) => {
    // Não mostrar para pacientes existentes
    if (isExistingPatient || !password) {
        return null;
    }

    const { strength, label, color, icon: Icon, suggestions } = calculatePasswordStrength(password);

    // Não mostrar se senha vazia
    if (strength === 0) {
        return null;
    }

    // Cores baseadas na força
    const colorClasses = {
        red: {
            bg: 'bg-red-500',
            text: 'text-red-700',
            border: 'border-red-200',
            bgLight: 'bg-red-50',
        },
        orange: {
            bg: 'bg-orange-500',
            text: 'text-orange-700',
            border: 'border-orange-200',
            bgLight: 'bg-orange-50',
        },
        yellow: {
            bg: 'bg-yellow-500',
            text: 'text-yellow-700',
            border: 'border-yellow-200',
            bgLight: 'bg-yellow-50',
        },
        lime: {
            bg: 'bg-lime-500',
            text: 'text-lime-700',
            border: 'border-lime-200',
            bgLight: 'bg-lime-50',
        },
        green: {
            bg: 'bg-green-500',
            text: 'text-green-700',
            border: 'border-green-200',
            bgLight: 'bg-green-50',
        },
    };

    const colors = colorClasses[color] || colorClasses.red;

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mt-3 p-3 rounded-lg border ${colors.border} ${colors.bgLight}`}
        >
            {/* Barra de força */}
            <div className="flex items-center gap-2 mb-2">
                <div className="flex-1">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(strength / 5) * 100}%` }}
                            transition={{ duration: 0.3 }}
                            className={`h-full ${colors.bg} transition-all`}
                        />
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {Icon && <Icon className={`w-4 h-4 ${colors.text}`} />}
                    <span className={`text-xs font-medium ${colors.text}`}>{label}</span>
                </div>
            </div>

            {/* Sugestões */}
            {suggestions.length > 0 && (
                <div className="text-xs text-gray-600 space-y-1">
                    {suggestions.map((suggestion, index) => (
                        <div key={index} className="flex items-start gap-1">
                            <span className="text-gray-400 mt-0.5">•</span>
                            <span>{suggestion}</span>
                        </div>
                    ))}
                </div>
            )}
        </motion.div>
    );
};

export default PasswordStrengthIndicator;
