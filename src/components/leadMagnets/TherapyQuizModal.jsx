import React, { useState } from 'react';
import { X, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import emailService from '@/lib/emailService';
import { useLeadTracking } from '@/hooks/useLeadTracking';
import { generateQuizResultsEmail } from '@/lib/emailTemplates/quizResultsEmail';

const quizQuestions = [
    {
        id: 1,
        question: 'Como você prefere resolver problemas?',
        options: [
            { text: 'Analisando pensamentos e comportamentos', approach: 'TCC', points: 3 },
            { text: 'Explorando sentimentos e experiências passadas', approach: 'Psicanálise', points: 3 },
            { text: 'Focando no presente e no autoconhecimento', approach: 'Humanista', points: 3 },
            { text: 'Combinando diferentes estratégias', approach: 'Integrativa', points: 3 }
        ]
    },
    {
        id: 2,
        question: 'O que mais te incomoda atualmente?',
        options: [
            { text: 'Pensamentos negativos repetitivos', approach: 'TCC', points: 3 },
            { text: 'Padrões de comportamento que se repetem', approach: 'Psicanálise', points: 3 },
            { text: 'Falta de propósito ou sentido na vida', approach: 'Humanista', points: 3 },
            { text: 'Dificuldade em lidar com emoções', approach: 'Integrativa', points: 3 }
        ]
    },
    {
        id: 3,
        question: 'Como você gostaria de trabalhar na terapia?',
        options: [
            { text: 'Com exercícios práticos e tarefas', approach: 'TCC', points: 3 },
            { text: 'Conversando sobre minha história de vida', approach: 'Psicanálise', points: 3 },
            { text: 'Explorando meus valores e potencial', approach: 'Humanista', points: 3 },
            { text: 'De forma flexível, adaptada às minhas necessidades', approach: 'Integrativa', points: 3 }
        ]
    },
    {
        id: 4,
        question: 'Qual é seu objetivo principal com a terapia?',
        options: [
            { text: 'Mudar comportamentos específicos', approach: 'TCC', points: 3 },
            { text: 'Entender a origem dos meus problemas', approach: 'Psicanálise', points: 3 },
            { text: 'Crescer como pessoa e me realizar', approach: 'Humanista', points: 3 },
            { text: 'Melhorar minha qualidade de vida geral', approach: 'Integrativa', points: 3 }
        ]
    },
    {
        id: 5,
        question: 'Como você se sente em relação ao passado?',
        options: [
            { text: 'Prefiro focar no presente e futuro', approach: 'TCC', points: 3 },
            { text: 'Acredito que o passado influencia muito meu presente', approach: 'Psicanálise', points: 3 },
            { text: 'O passado é importante, mas o presente é mais relevante', approach: 'Humanista', points: 3 },
            { text: 'Depende do contexto', approach: 'Integrativa', points: 3 }
        ]
    },
    {
        id: 6,
        question: 'Qual dessas frases mais combina com você?',
        options: [
            { text: 'Quero ferramentas práticas para o dia a dia', approach: 'TCC', points: 3 },
            { text: 'Quero me conhecer profundamente', approach: 'Psicanálise', points: 3 },
            { text: 'Quero descobrir meu verdadeiro eu', approach: 'Humanista', points: 3 },
            { text: 'Quero uma abordagem personalizada', approach: 'Integrativa', points: 3 }
        ]
    },
    {
        id: 7,
        question: 'Como você lida com mudanças?',
        options: [
            { text: 'Gosto de ter um plano de ação claro', approach: 'TCC', points: 3 },
            { text: 'Preciso entender por que resisto a mudanças', approach: 'Psicanálise', points: 3 },
            { text: 'Vejo mudanças como oportunidades de crescimento', approach: 'Humanista', points: 3 },
            { text: 'Adapto minha estratégia conforme a situação', approach: 'Integrativa', points: 3 }
        ]
    },
    {
        id: 8,
        question: 'O que você valoriza mais em um psicólogo?',
        options: [
            { text: 'Objetividade e foco em resultados', approach: 'TCC', points: 3 },
            { text: 'Capacidade de análise profunda', approach: 'Psicanálise', points: 3 },
            { text: 'Empatia e acolhimento genuíno', approach: 'Humanista', points: 3 },
            { text: 'Flexibilidade e adaptabilidade', approach: 'Integrativa', points: 3 }
        ]
    }
];

const approachDetails = {
    'TCC': {
        name: 'Terapia Cognitivo-Comportamental (TCC)',
        description: 'A TCC foca em identificar e modificar pensamentos e comportamentos disfuncionais. É uma abordagem prática, estruturada e orientada para resultados, ideal para quem busca mudanças concretas e mensuráveis.',
        strengths: [
            'Abordagem prática com exercícios e tarefas',
            'Foco em resultados mensuráveis e objetivos claros',
            'Eficaz para ansiedade, depressão e fobias',
            'Desenvolve habilidades para lidar com desafios futuros'
        ]
    },
    'Psicanálise': {
        name: 'Psicanálise',
        description: 'A psicanálise explora o inconsciente e as experiências passadas para compreender padrões atuais. É ideal para quem busca autoconhecimento profundo e deseja entender as raízes de seus comportamentos.',
        strengths: [
            'Autoconhecimento profundo e transformador',
            'Compreensão das raízes dos problemas atuais',
            'Trabalha padrões inconscientes de comportamento',
            'Promove mudanças duradouras e estruturais'
        ]
    },
    'Humanista': {
        name: 'Terapia Humanista',
        description: 'A abordagem humanista valoriza o potencial humano, o crescimento pessoal e a autorrealização. Foca no presente, na experiência subjetiva e no desenvolvimento do verdadeiro eu.',
        strengths: [
            'Foco no crescimento pessoal e autorrealização',
            'Ambiente acolhedor e não-julgador',
            'Valoriza sua experiência única e subjetiva',
            'Promove autonomia e autoconfiança'
        ]
    },
    'Integrativa': {
        name: 'Abordagem Integrativa',
        description: 'A terapia integrativa combina técnicas de diferentes abordagens, adaptando-se às necessidades únicas de cada pessoa. É flexível, personalizada e considera o ser humano em sua totalidade.',
        strengths: [
            'Personalização total do tratamento',
            'Combina o melhor de diferentes abordagens',
            'Adaptável às suas necessidades específicas',
            'Visão holística do ser humano'
        ]
    }
};

const TherapyQuizModal = ({ isOpen, onClose }) => {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState({});
    const [showResults, setShowResults] = useState(false);
    const [showEmailForm, setShowEmailForm] = useState(false);
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const { toast } = useToast();
    const { trackLeadMagnetView, trackLeadMagnetSubmit } = useLeadTracking();

    React.useEffect(() => {
        if (isOpen) {
            trackLeadMagnetView('therapy_quiz');
        }
    }, [isOpen, trackLeadMagnetView]);

    const handleAnswer = (optionIndex) => {
        const newAnswers = { ...answers, [currentQuestion]: optionIndex };
        setAnswers(newAnswers);

        if (currentQuestion < quizQuestions.length - 1) {
            setTimeout(() => setCurrentQuestion(currentQuestion + 1), 300);
        } else {
            setTimeout(() => setShowResults(true), 300);
        }
    };

    const calculateResults = () => {
        const scores = { TCC: 0, Psicanálise: 0, Humanista: 0, Integrativa: 0 };

        Object.entries(answers).forEach(([questionIndex, optionIndex]) => {
            const option = quizQuestions[questionIndex].options[optionIndex];
            scores[option.approach] += option.points;
        });

        const maxScore = Math.max(...Object.values(scores));
        const topApproach = Object.keys(scores).find(key => scores[key] === maxScore);
        const percentage = Math.round((maxScore / (quizQuestions.length * 3)) * 100);

        return {
            approach: approachDetails[topApproach].name,
            score: percentage,
            description: approachDetails[topApproach].description,
            strengths: approachDetails[topApproach].strengths,
            recommendedProfessional: null // TODO: Integrar com lista de profissionais
        };
    };

    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const results = calculateResults();

            // Track lead submission
            await trackLeadMagnetSubmit('therapy_quiz', { email, name }, {
                quiz_results: results,
                answers: answers
            });

            // Send email with results
            const emailHtml = generateQuizResultsEmail(name, results);
            await emailService.sendEmail({
                to: email,
                subject: '🎯 Seus Resultados: Qual Abordagem Terapêutica Combina com Você',
                html: emailHtml,
                type: 'lead_magnet'
            });

            // Notify admin
            await emailService.sendEmail({
                to: 'contato@doxologos.com.br',
                subject: 'Novo Lead: Quiz de Abordagem Terapêutica 🎯',
                html: `<p>Novo lead: <strong>${name}</strong> (${email})</p><p>Resultado: ${results.approach} (${results.score}%)</p>`,
                type: 'lead_notification'
            });

            setSuccess(true);
            toast({
                title: '✅ Resultados enviados!',
                description: 'Verifique seu email para ver sua abordagem ideal.'
            });
        } catch (error) {
            console.error('Error submitting quiz:', error);
            toast({
                variant: 'destructive',
                title: 'Erro ao enviar',
                description: 'Tente novamente mais tarde.'
            });
        } finally {
            setLoading(false);
        }
    };

    const resetQuiz = () => {
        setCurrentQuestion(0);
        setAnswers({});
        setShowResults(false);
        setShowEmailForm(false);
        setSuccess(false);
        setEmail('');
        setName('');
    };

    const handleClose = () => {
        resetQuiz();
        onClose();
    };

    const progress = ((currentQuestion + 1) / quizQuestions.length) * 100;

    return (
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
                        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
                    >
                        <button
                            onClick={handleClose}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {!showResults && !showEmailForm && (
                            <>
                                {/* Progress Bar */}
                                <div className="h-2 bg-gray-200">
                                    <motion.div
                                        className="h-full bg-[#2d8659]"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        transition={{ duration: 0.3 }}
                                    />
                                </div>

                                {/* Question */}
                                <div className="p-8">
                                    <div className="mb-6">
                                        <p className="text-sm text-gray-500 mb-2">
                                            Pergunta {currentQuestion + 1} de {quizQuestions.length}
                                        </p>
                                        <h2 className="text-2xl font-bold text-gray-800">
                                            {quizQuestions[currentQuestion].question}
                                        </h2>
                                    </div>

                                    <div className="space-y-3">
                                        {quizQuestions[currentQuestion].options.map((option, index) => (
                                            <motion.button
                                                key={index}
                                                onClick={() => handleAnswer(index)}
                                                className={`w-full p-4 text-left rounded-lg border-2 transition-all ${answers[currentQuestion] === index
                                                        ? 'border-[#2d8659] bg-green-50'
                                                        : 'border-gray-200 hover:border-[#2d8659] hover:bg-gray-50'
                                                    }`}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <span className="font-medium text-gray-800">{option.text}</span>
                                            </motion.button>
                                        ))}
                                    </div>

                                    {currentQuestion > 0 && (
                                        <button
                                            onClick={() => setCurrentQuestion(currentQuestion - 1)}
                                            className="mt-6 flex items-center gap-2 text-gray-600 hover:text-gray-800"
                                        >
                                            <ArrowLeft className="w-4 h-4" />
                                            Voltar
                                        </button>
                                    )}
                                </div>
                            </>
                        )}

                        {showResults && !showEmailForm && !success && (
                            <div className="p-8">
                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle className="w-8 h-8" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                                        Quiz Concluído! 🎉
                                    </h2>
                                    <p className="text-gray-600">
                                        Descubra qual abordagem terapêutica combina mais com você
                                    </p>
                                </div>

                                <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg mb-6">
                                    <p className="text-center text-gray-700 mb-4">
                                        Enviaremos seus resultados detalhados por email, incluindo:
                                    </p>
                                    <ul className="space-y-2 text-sm text-gray-700">
                                        <li className="flex items-start gap-2">
                                            <CheckCircle className="w-5 h-5 text-[#2d8659] flex-shrink-0 mt-0.5" />
                                            <span>Sua abordagem terapêutica ideal</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <CheckCircle className="w-5 h-5 text-[#2d8659] flex-shrink-0 mt-0.5" />
                                            <span>Por que essa abordagem combina com você</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <CheckCircle className="w-5 h-5 text-[#2d8659] flex-shrink-0 mt-0.5" />
                                            <span>Recomendação de profissional da Doxologos</span>
                                        </li>
                                    </ul>
                                </div>

                                <Button
                                    onClick={() => setShowEmailForm(true)}
                                    className="w-full bg-[#2d8659] hover:bg-[#236b47] text-white font-semibold"
                                >
                                    Ver Meus Resultados
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        )}

                        {showEmailForm && !success && (
                            <div className="p-8">
                                <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">
                                    Receba seus resultados
                                </h2>
                                <p className="text-gray-600 text-center mb-6">
                                    Informe seus dados para receber a análise completa
                                </p>

                                <form onSubmit={handleEmailSubmit} className="space-y-4">
                                    <div>
                                        <Input
                                            placeholder="Seu primeiro nome"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            required
                                            className="bg-gray-50 border-gray-200"
                                        />
                                    </div>
                                    <div>
                                        <Input
                                            type="email"
                                            placeholder="Seu melhor email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            className="bg-gray-50 border-gray-200"
                                        />
                                    </div>
                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-[#2d8659] hover:bg-[#236b47] text-white font-semibold"
                                    >
                                        {loading ? 'Enviando...' : 'Receber Resultados'}
                                    </Button>
                                </form>

                                <p className="text-xs text-center text-gray-400 mt-4">
                                    🔒 Respeitamos sua privacidade. Nada de spam.
                                </p>
                            </div>
                        )}

                        {success && (
                            <div className="p-8 text-center">
                                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-800 mb-2">
                                    Resultados Enviados! ✅
                                </h3>
                                <p className="text-gray-600 mb-6">
                                    Verifique sua caixa de entrada (ou spam). Seus resultados já estão a caminho!
                                </p>
                                <Button
                                    onClick={handleClose}
                                    variant="outline"
                                    className="w-full mb-4"
                                >
                                    Voltar ao site
                                </Button>
                                <a
                                    href="/agendamento"
                                    className="block text-sm text-[#2d8659] font-medium hover:underline flex items-center justify-center gap-1"
                                >
                                    Agendar consulta agora
                                    <ArrowRight className="w-3 h-3" />
                                </a>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default TherapyQuizModal;
