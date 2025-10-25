import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Heart, Copy, CheckCircle, QrCode, Shield, Users, Target, Star } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { useToast } from '../components/ui/use-toast';

const DoacaoPage = () => {
    const [pixCopied, setPixCopied] = useState(false);
    const [selectedAmount, setSelectedAmount] = useState(null);
    const { toast } = useToast();

    // PIX da clínica (substitua pela chave real)
    const pixKey = "doxologos@clinic.com";

    const predefinedAmounts = [25, 50, 100, 200, 500];

    const impactStories = [
        {
            icon: <Users className="w-8 h-8 text-[#2d8659]" />,
            title: "Atendimento Gratuito",
            description: "Sua doação permite que oferecemos consultas gratuitas para famílias em situação de vulnerabilidade.",
            impact: "R$ 50 = 1 consulta completa"
        },
        {
            icon: <Target className="w-8 h-8 text-[#2d8659]" />,
            title: "Equipamentos Modernos",
            description: "Investimos em tecnologia de ponta para oferecer os melhores tratamentos disponíveis.",
            impact: "R$ 200 = Manutenção de equipamentos"
        },
        {
            icon: <Heart className="w-8 h-8 text-[#2d8659]" />,
            title: "Programas Sociais",
            description: "Desenvolvemos programas de prevenção e educação em saúde mental para a comunidade.",
            impact: "R$ 100 = Material educativo"
        }
    ];

    const testimonials = [
        {
            name: "Maria Silva",
            text: "Graças ao atendimento gratuito da Doxologos, consegui o tratamento que precisava. Agora quero retribuir ajudando outras pessoas.",
            rating: 5
        },
        {
            name: "João Santos",
            text: "Uma clínica que realmente se preocupa com as pessoas. Todo apoio que pudermos dar é pouco perto do bem que fazem.",
            rating: 5
        }
    ];

    const copyPixKey = () => {
        navigator.clipboard.writeText(pixKey);
        setPixCopied(true);
        toast({
            title: "PIX copiado!",
            description: "A chave PIX foi copiada para sua área de transferência.",
        });
        setTimeout(() => setPixCopied(false), 3000);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(amount);
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-green-50/50 to-white">
            {/* Header com Logo */}
            <header className="fixed top-0 w-full bg-white/95 backdrop-blur-sm shadow-sm z-50">
                <nav className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <Link to="/" className="flex items-center space-x-2">
                            <Heart className="w-8 h-8 text-[#2d8659]" />
                            <span className="text-2xl font-bold gradient-text">Doxologos</span>
                        </Link>
                        <div className="flex items-center space-x-4">
                            <Link to="/" className="text-gray-700 hover:text-[#2d8659] transition-colors">
                                ← Voltar ao Site
                            </Link>
                        </div>
                    </div>
                </nav>
            </header>

            {/* Hero Section */}
            <section className="relative py-20 px-4 pt-32 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-[#2d8659]/5 to-green-100/30"></div>
                <div className="relative max-w-6xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-[#2d8659]/10 rounded-full mb-6">
                            <Heart className="w-10 h-10 text-[#2d8659]" />
                        </div>
                        <h1 className="text-4xl md:text-6xl font-bold mb-6">
                            <span className="gradient-text">Sua doação</span><br />
                            <span className="text-gray-800">transforma vidas</span>
                        </h1>
                        <div className="bg-gradient-to-r from-[#2d8659]/10 to-green-100/50 rounded-2xl p-6 mb-6 max-w-2xl mx-auto">
                            <p className="text-2xl md:text-3xl font-bold text-[#2d8659] text-center">
                                "O valor é livre, o impacto é real"
                            </p>
                        </div>
                        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
                            Cada contribuição nos permite oferecer atendimento gratuito de qualidade, 
                            investir em equipamentos modernos e expandir nossos programas sociais.
                        </p>
                        <div className="flex items-center justify-center gap-8 text-sm text-gray-500">
                            <div className="flex items-center gap-2">
                                <Shield className="w-5 h-5 text-[#2d8659]" />
                                <span>100% Seguro</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-[#2d8659]" />
                                <span>Transparência Total</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Heart className="w-5 h-5 text-[#2d8659]" />
                                <span>Impacto Real</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Valores Sugeridos */}
            <section className="py-16 px-4">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-12"
                    >
                        <h2 className="text-3xl font-bold mb-4">Escolha o valor da sua doação</h2>
                        <p className="text-gray-600">Qualquer valor faz a diferença na vida de alguém</p>
                    </motion.div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                        {predefinedAmounts.map((amount, index) => (
                            <motion.button
                                key={amount}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                onClick={() => setSelectedAmount(amount)}
                                className={`p-6 rounded-xl border-2 transition-all duration-300 ${
                                    selectedAmount === amount
                                        ? 'border-[#2d8659] bg-[#2d8659]/5 shadow-lg'
                                        : 'border-gray-200 hover:border-[#2d8659]/50 hover:shadow-md'
                                }`}
                            >
                                <div className="text-2xl font-bold text-[#2d8659] mb-2">
                                    {formatCurrency(amount)}
                                </div>
                                <div className="text-sm text-gray-600">
                                    {amount === 25 && "Medicamentos básicos"}
                                    {amount === 50 && "Uma consulta"}
                                    {amount === 100 && "Material educativo"}
                                    {amount === 200 && "Equipamento médico"}
                                    {amount === 500 && "Programa social"}
                                </div>
                            </motion.button>
                        ))}
                    </div>

                    <div className="text-center">
                        <p className="text-gray-600 mb-4">Ou digite outro valor que desejar</p>
                        <input
                            type="number"
                            placeholder="Digite o valor"
                            className="input max-w-xs mx-auto text-center text-xl font-semibold"
                            onChange={(e) => setSelectedAmount(parseFloat(e.target.value))}
                        />
                    </div>
                </div>
            </section>

            {/* PIX Section */}
            <section className="py-16 px-4 bg-gray-50">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-12"
                    >
                        <QrCode className="w-16 h-16 text-[#2d8659] mx-auto mb-4" />
                        <h2 className="text-3xl font-bold mb-4">Doar via PIX</h2>
                        <p className="text-gray-600">Rápido, seguro e instantâneo</p>
                    </motion.div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* QR Code */}
                        <Card className="p-8 text-center">
                            <h3 className="text-xl font-semibold mb-4">Escaneie o QR Code</h3>
                            <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300 mb-4">
                                <div className="w-48 h-48 mx-auto bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                                    <div className="text-center text-gray-500">
                                        <QrCode className="w-16 h-16 mx-auto mb-2" />
                                        <p className="text-sm">QR Code PIX</p>
                                        <p className="text-xs mt-1">Em breve</p>
                                    </div>
                                </div>
                            </div>
                            <p className="text-sm text-gray-600">
                                Use o aplicativo do seu banco para escanear
                            </p>
                        </Card>

                        {/* Chave PIX */}
                        <Card className="p-8">
                            <h3 className="text-xl font-semibold mb-4">Ou copie a chave PIX</h3>
                            <div className="bg-gray-50 p-4 rounded-lg border mb-4">
                                <div className="flex items-center justify-between">
                                    <span className="font-mono text-lg">{pixKey}</span>
                                    <Button
                                        onClick={copyPixKey}
                                        variant="outline"
                                        size="sm"
                                        className="flex items-center gap-2"
                                    >
                                        {pixCopied ? (
                                            <CheckCircle className="w-4 h-4 text-green-600" />
                                        ) : (
                                            <Copy className="w-4 h-4" />
                                        )}
                                        {pixCopied ? 'Copiado!' : 'Copiar'}
                                    </Button>
                                </div>
                            </div>
                            
                            {selectedAmount && (
                                <div className="bg-[#2d8659]/10 p-4 rounded-lg">
                                    <p className="text-sm text-gray-600 mb-2">Valor selecionado:</p>
                                    <p className="text-2xl font-bold text-[#2d8659]">
                                        {formatCurrency(selectedAmount)}
                                    </p>
                                </div>
                            )}

                            <div className="mt-6 space-y-3 text-sm text-gray-600">
                                <p><strong>1.</strong> Copie a chave PIX acima</p>
                                <p><strong>2.</strong> Abra o app do seu banco</p>
                                <p><strong>3.</strong> Escolha PIX e cole a chave</p>
                                <p><strong>4.</strong> Confirme o valor e finalize</p>
                            </div>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Impacto das Doações */}
            <section className="py-16 px-4">
                <div className="max-w-6xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-12"
                    >
                        <h2 className="text-3xl font-bold mb-4">O impacto da sua doação</h2>
                        <p className="text-gray-600">Veja como suas contribuições geram transformação real</p>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {impactStories.map((story, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.2 }}
                            >
                                <Card className="p-8 h-full hover:shadow-lg transition-shadow">
                                    <div className="text-center mb-6">
                                        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#2d8659]/10 rounded-full mb-4">
                                            {story.icon}
                                        </div>
                                        <h3 className="text-xl font-semibold mb-3">{story.title}</h3>
                                        <p className="text-gray-600 mb-4">{story.description}</p>
                                        <div className="bg-[#2d8659]/5 px-4 py-2 rounded-lg">
                                            <span className="font-semibold text-[#2d8659]">{story.impact}</span>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Depoimentos */}
            <section className="py-16 px-4 bg-gray-50">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-12"
                    >
                        <h2 className="text-3xl font-bold mb-4">Quem já foi beneficiado</h2>
                        <p className="text-gray-600">Histórias reais de transformação</p>
                    </motion.div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {testimonials.map((testimonial, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.2 }}
                            >
                                <Card className="p-8">
                                    <div className="flex mb-4">
                                        {[...Array(testimonial.rating)].map((_, i) => (
                                            <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                        ))}
                                    </div>
                                    <p className="text-gray-700 mb-4 italic">"{testimonial.text}"</p>
                                    <p className="font-semibold text-[#2d8659]">— {testimonial.name}</p>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Call to Action Final */}
            <section className="py-20 px-4 bg-gradient-to-r from-[#2d8659] to-[#236b47] text-white">
                <div className="max-w-4xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <Heart className="w-16 h-16 mx-auto mb-6 opacity-80" />
                        <h2 className="text-4xl font-bold mb-6">Juntos somos mais fortes</h2>
                        <p className="text-xl mb-8 opacity-90">
                            Sua generosidade é o combustível que move nossa missão de levar saúde mental de qualidade para todos.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <Button 
                                onClick={copyPixKey}
                                size="lg" 
                                className="bg-white text-[#2d8659] hover:bg-gray-100 font-semibold px-8 py-3"
                            >
                                {pixCopied ? 'PIX Copiado!' : 'Copiar Chave PIX'}
                            </Button>
                            <div className="text-center">
                                <p className="text-sm opacity-75">ou</p>
                                <p className="font-mono text-lg">{pixKey}</p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>
        </div>
    );
};

export default DoacaoPage;