import React, { useState, useEffect } from 'react';
import { X, Heart, CheckCircle, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import emailService from '@/lib/emailService';
import { useEventTracking } from '@/hooks/useAnalytics';

const AnxietyGuideModal = ({ enabled = true }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [hasSeen, setHasSeen] = useState(false);
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const { toast } = useToast();
    const trackEvent = useEventTracking();

    useEffect(() => {
        // Se desabilitado via configuração, não faz nada
        if (!enabled) return;

        // Verificar se já viu o modal
        const storedSeen = localStorage.getItem('doxologos_anxiety_guide_seen');
        if (storedSeen) {
            setHasSeen(true);
            return;
        }

        // Trigger: Tempo (15 segundos)
        const timer = setTimeout(() => {
            if (!hasSeen) {
                setIsOpen(true);
                trackEvent('lead_magnet_view', { magnet: 'anxiety_guide' });
            }
        }, 15000);

        // Trigger: Scroll (50%)
        const handleScroll = () => {
            if (!hasSeen && !isOpen) {
                const scrollPercent = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
                if (scrollPercent > 0.5) {
                    setIsOpen(true);
                    trackEvent('lead_magnet_view', { magnet: 'anxiety_guide', trigger: 'scroll' });
                    window.removeEventListener('scroll', handleScroll);
                }
            }
        };

        window.addEventListener('scroll', handleScroll);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('scroll', handleScroll);
        };
    }, [hasSeen, isOpen, trackEvent, enabled]);

    const handleClose = () => {
        setIsOpen(false);
        setHasSeen(true);
        localStorage.setItem('doxologos_anxiety_guide_seen', 'true');
        trackEvent('lead_magnet_close', { magnet: 'anxiety_guide' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !name) return;

        setLoading(true);
        try {
            // Rastrear envio
            trackEvent('lead_magnet_submit', { magnet: 'anxiety_guide' });

            // HTML do Guia por Email
            const guideHtml = `
                <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
                    <div style="background-color: #2d8659; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">Seu Guia Contra a Ansiedade Chegou! 🌿</h1>
                    </div>
                    
                    <div style="padding: 30px; background-color: #ffffff; border: 1px solid #e0e0e0; border-top: none;">
                        <p>Olá, <strong>${name}</strong>!</p>
                        <p>Ficamos felizes em ver você dando o primeiro passo para cuidar da sua saúde emocional. A ansiedade é um desafio real, mas existem ferramentas práticas para enfrentá-la.</p>
                        
                        <div style="background-color: #f9fdfa; border-left: 4px solid #2d8659; padding: 20px; margin: 30px 0;">
                            <h3 style="color: #2d8659; margin-top: 0;">1. A Técnica 4-7-8 (Respiração)</h3>
                            <p>Quando sentir o coração acelerar, tente isso: <strong>Inspire</strong> pelo nariz contando até 4. <strong>Segure</strong> o ar contando até 7. <strong>Expire</strong> pela boca contando até 8. Repita 4 vezes. Isso "hackeia" seu sistema nervoso para o relaxamento.</p>
                        </div>

                        <div style="background-color: #f9fdfa; border-left: 4px solid #2d8659; padding: 20px; margin: 30px 0;">
                            <h3 style="color: #2d8659; margin-top: 0;">2. Pratique a "Entrega" (1 Pedro 5:7)</h3>
                            <p><em>"Lançando sobre ele toda a vossa ansiedade, porque ele tem cuidado de vós."</em><br>Visualize sua preocupação como uma pedra pesada e imagine-se entregando-a fisicamente nas mãos de Deus. Você não precisa carregar tudo sozinho.</p>
                        </div>

                        <div style="background-color: #f9fdfa; border-left: 4px solid #2d8659; padding: 20px; margin: 30px 0;">
                            <h3 style="color: #2d8659; margin-top: 0;">3. Grounding: 5-4-3-2-1</h3>
                            <p>Se a mente estiver voando para o futuro catastrófico, volte para o AGORA nomeando:<br>
                            5 coisas que você vê.<br>
                            4 coisas que você pode tocar.<br>
                            3 sons que você ouve.<br>
                            2 cheiros.<br>
                            1 coisa boa sobre você mesmo.</p>
                        </div>

                        <p style="margin-top: 30px;">Essas são ferramentas de "primeiros socorros". Mas lembre-se: a terapia é o lugar onde tratamos a <strong>causa</strong>, não apenas os sintomas.</p>

                        <div style="text-align: center; margin-top: 40px; margin-bottom: 20px;">
                            <a href="https://doxologos.com.br/agendamento" style="background-color: #2d8659; color: white; padding: 15px 30px; text-decoration: none; border-radius: 50px; font-weight: bold; display: inline-block;">Agendar Conversa com Psicólogo</a>
                        </div>
                    </div>
                     <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
                        <p>© ${new Date().getFullYear()} Doxologos Clínica de Psicologia</p>
                    </div>
                </div>
            `;

            // Enviar Email
            await emailService.sendEmail({
                to: email,
                subject: '🎁 Seu Guia: 5 Passos para Controlar a Ansiedade',
                html: guideHtml,
                type: 'lead_magnet'
            });

            // Enviar notificação admin (opcional, para saber que leads estão entrando)
            await emailService.sendEmail({
                to: 'contato@doxologos.com.br',
                subject: 'Novo Lead Capturado (Guia Ansiedade) 🎯',
                html: `<p>Novo lead: <strong>${name}</strong> (${email}) baixou o guia de ansiedade.</p>`,
                type: 'lead_notification'
            });

            setSuccess(true);
            setHasSeen(true);
            localStorage.setItem('doxologos_anxiety_guide_seen', 'true');

            // Opcional: fechar após alguns segundos
            // setTimeout(() => setIsOpen(false), 5000);

        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Erro ao enviar",
                description: "Tente novamente mais tarde."
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
                    >
                        <button
                            onClick={handleClose}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex flex-col md:flex-row">
                            {/* Lado Esquerdo / Topo (Imagem/Badge) */}
                            <div className="bg-[#2d8659] p-8 text-white flex flex-col justify-center items-center text-center md:w-2/5 relative overflow-hidden">
                                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&w=500&q=80')] opacity-20 bg-cover bg-center mix-blend-overlay"></div>
                                <div className="relative z-10">
                                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 mx-auto backdrop-blur-md">
                                        <Heart className="w-8 h-8 text-white" />
                                    </div>
                                    <h3 className="font-bold text-lg leading-tight mb-2">Guia Gratuito</h3>
                                    <p className="text-green-50 text-sm">Leitura de 3 min</p>
                                </div>
                            </div>

                            {/* Lado Direito / Conteúdo (Form) */}
                            <div className="p-8 md:w-3/5">
                                {!success ? (
                                    <>
                                        <h2 className="text-2xl font-bold text-gray-800 mb-2">A ansiedade está tirando sua paz?</h2>
                                        <p className="text-gray-600 text-sm mb-6">
                                            Baixe nosso guia exclusivo com <strong>5 técnicas práticas</strong> unindo fé e ciência para alívio imediato.
                                        </p>

                                        <form onSubmit={handleSubmit} className="space-y-4">
                                            <div>
                                                <Input
                                                    placeholder="Seu primeiro nome"
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    required
                                                    className="bg-gray-50 border-gray-200 focus:ring-[#2d8659]"
                                                />
                                            </div>
                                            <div>
                                                <Input
                                                    type="email"
                                                    placeholder="Seu melhor e-mail"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    required
                                                    className="bg-gray-50 border-gray-200 focus:ring-[#2d8659]"
                                                />
                                            </div>
                                            <Button
                                                type="submit"
                                                disabled={loading}
                                                className="w-full bg-[#2d8659] hover:bg-[#236b47] text-white font-semibold transition-all"
                                            >
                                                {loading ? 'Enviando...' : 'Quero receber agora'}
                                            </Button>
                                        </form>
                                        <p className="text-xs text-center text-gray-400 mt-4">
                                            🔒 Respeitamos sua privacidade. Nada de spam.
                                        </p>
                                    </>
                                ) : (
                                    <div className="text-center py-8">
                                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <CheckCircle className="w-8 h-8" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-800 mb-2">Enviado com Sucesso!</h3>
                                        <p className="text-gray-600 text-sm mb-6">
                                            Verifique sua caixa de entrada (ou spam). O guia já está a caminho!
                                        </p>
                                        <Button
                                            onClick={handleClose}
                                            variant="outline"
                                            className="w-full"
                                        >
                                            Voltar ao site
                                        </Button>

                                        <a href="/agendamento" className="block mt-4 text-xs text-[#2d8659] font-medium hover:underline flex items-center justify-center gap-1">
                                            Quero agendar terapia agora <ArrowRight className="w-3 h-3" />
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default AnxietyGuideModal;
