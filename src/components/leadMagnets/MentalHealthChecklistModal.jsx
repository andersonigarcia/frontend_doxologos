import React, { useState } from 'react';
import { X, CheckCircle, Heart, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import emailService from '@/lib/emailService';
import { bookingEmailManager } from '@/lib/bookingEmailManager';
import { useLeadTracking } from '@/hooks/useLeadTracking';

const previewSigns = [
    { icon: '😔', title: 'Tristeza persistente', description: 'Sentimento de tristeza que dura mais de duas semanas' },
    { icon: '😰', title: 'Ansiedade constante', description: 'Preocupação excessiva que interfere nas atividades' },
    { icon: '😴', title: 'Alterações no sono', description: 'Insônia frequente ou sono excessivo' },
    { icon: '🚫', title: 'Isolamento social', description: 'Evitar amigos e atividades que antes eram prazerosas' },
    { icon: '💭', title: 'Pensamentos negativos', description: 'Autocrítica excessiva ou pessimismo constante' }
];

const MentalHealthChecklistModal = ({ isOpen, onClose }) => {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const { toast } = useToast();
    const { trackLeadMagnetView, trackLeadMagnetSubmit } = useLeadTracking();

    React.useEffect(() => {
        if (isOpen) {
            trackLeadMagnetView('mental_health_checklist');
        }
    }, [isOpen, trackLeadMagnetView]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Track lead submission
            await trackLeadMagnetSubmit('mental_health_checklist', { email, name });

            // Send checklist email using bookingEmailManager (same path as working emails)
            await bookingEmailManager.sendChecklist(name, email);

            // Notify admin
            await emailService.sendEmail({
                to: 'contato@doxologos.com.br',
                subject: 'Novo Lead: Checklist de Saúde Mental ✅',
                html: `<p>Novo lead: <strong>${name}</strong> (${email}) baixou o checklist de saúde mental.</p>`,
                type: 'lead_notification'
            });

            setSuccess(true);
            toast({
                title: '✅ Checklist enviado!',
                description: 'Verifique seu email para ver os 15 sinais completos.'
            });
        } catch (error) {
            console.error('Error submitting checklist form:', error);
            toast({
                variant: 'destructive',
                title: 'Erro ao enviar',
                description: 'Tente novamente mais tarde.'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setEmail('');
        setName('');
        setSuccess(false);
        onClose();
    };

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
                        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
                    >
                        <button
                            onClick={handleClose}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {!success ? (
                            <>
                                {/* Header */}
                                <div className="bg-gradient-to-br from-[#2d8659] to-[#1f5d3d] p-8 text-white text-center">
                                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                                        <Heart className="w-8 h-8 text-white" />
                                    </div>
                                    <h2 className="text-2xl font-bold mb-2">
                                        15 Sinais de que Você Precisa de Ajuda
                                    </h2>
                                    <p className="text-green-50">
                                        Checklist completo para reconhecer quando buscar apoio psicológico
                                    </p>
                                </div>

                                {/* Content */}
                                <div className="p-8">
                                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded">
                                        <p className="text-sm text-yellow-800">
                                            <strong>⚠️ Importante:</strong> Se você se identificou com 3 ou mais desses sinais,
                                            considere seriamente buscar ajuda profissional.
                                        </p>
                                    </div>

                                    <h3 className="text-lg font-bold text-gray-800 mb-4">
                                        Preview dos Sinais (5 de 15):
                                    </h3>

                                    <div className="space-y-3 mb-6">
                                        {previewSigns.map((sign, index) => (
                                            <div
                                                key={index}
                                                className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200"
                                            >
                                                <span className="text-2xl flex-shrink-0">{sign.icon}</span>
                                                <div>
                                                    <h4 className="font-semibold text-gray-800 mb-1">
                                                        {index + 1}. {sign.title}
                                                    </h4>
                                                    <p className="text-sm text-gray-600">{sign.description}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg mb-6 border border-green-200">
                                        <h4 className="font-bold text-[#2d8659] mb-3 text-center">
                                            🎁 Receba GRATUITAMENTE o checklist completo
                                        </h4>
                                        <ul className="space-y-2 text-sm text-gray-700 mb-4">
                                            <li className="flex items-start gap-2">
                                                <CheckCircle className="w-5 h-5 text-[#2d8659] flex-shrink-0 mt-0.5" />
                                                <span>15 sinais detalhados com descrições completas</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <CheckCircle className="w-5 h-5 text-[#2d8659] flex-shrink-0 mt-0.5" />
                                                <span>Orientações sobre o que fazer ao identificar os sinais</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <CheckCircle className="w-5 h-5 text-[#2d8659] flex-shrink-0 mt-0.5" />
                                                <span>Versículo bíblico de encorajamento</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <CheckCircle className="w-5 h-5 text-[#2d8659] flex-shrink-0 mt-0.5" />
                                                <span>Dicas práticas de autocuidado</span>
                                            </li>
                                        </ul>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-4">
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
                                            {loading ? 'Enviando...' : 'Receber Checklist Completo'}
                                        </Button>
                                    </form>

                                    <p className="text-xs text-center text-gray-400 mt-4">
                                        🔒 Respeitamos sua privacidade. Nada de spam.
                                    </p>
                                </div>
                            </>
                        ) : (
                            <div className="p-8 text-center">
                                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-800 mb-2">
                                    Checklist Enviado! ✅
                                </h3>
                                <p className="text-gray-600 mb-6">
                                    Verifique sua caixa de entrada (ou spam). O checklist completo já está a caminho!
                                </p>

                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                                    <p className="text-sm text-gray-700">
                                        💡 <strong>Próximo passo:</strong> Após revisar o checklist,
                                        se você se identificou com 3 ou mais sinais, considere agendar uma consulta.
                                    </p>
                                </div>

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

export default MentalHealthChecklistModal;
