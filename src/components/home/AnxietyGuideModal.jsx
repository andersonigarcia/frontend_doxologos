import React, { useState, useEffect } from 'react';
import { X, Heart, CheckCircle, ArrowRight, ArrowLeft, Sparkles, MessageCircle, Gift, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import emailService from '@/lib/emailService';
import { useEventTracking } from '@/hooks/useAnalytics';

const QUESTIONS = [
  {
    id: 'q1',
    title: '1. O que te fez buscar apoio agora?',
    subtitle: 'Selecione a opção que melhor descreve seu momento atual:',
    options: [
      'Ansiedade',
      'Luto ou perda',
      'Conflitos familiares/conjugais',
      'Dúvidas de fé/crise espiritual',
      'Outro'
    ]
  },
  {
    id: 'q2',
    title: '2. Você chegou a ver o perfil de algum psicólogo aqui?',
    subtitle: 'Queremos entender como podemos te ajudar melhor:',
    options: [
      'Sim, mas não me senti seguro(a) para agendar',
      'Sim, mas não tinha horário que encaixasse',
      'Sim, mas o valor não cabia no momento',
      'Não, ainda estou comparando opções'
    ]
  },
  {
    id: 'q3',
    title: '3. O que mais pesa na hora de escolher um psicólogo?',
    subtitle: 'Qual o fator mais determinante para você?',
    options: [
      'Ser cristão praticante',
      'Ter experiência com o que estou enfrentando',
      'Preço acessível',
      'Poder conversar antes de decidir',
      'Já ter sido indicado por alguém'
    ]
  },
  {
    id: 'q4',
    title: '4. Você já fez terapia antes?',
    subtitle: 'Nos ajude a conhecer sua trajetória:',
    options: [
      'Sim, com abordagem cristã',
      'Sim, terapia "tradicional"',
      'Não, seria minha primeira vez'
    ]
  }
];

const AnxietyGuideModal = ({ enabled = true }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasSeen, setHasSeen] = useState(false);

  // Step 1: Form de Lead (Nome, Whats, Email)
  // Step 2-5: Perguntas Múltipla Escolha Q1..Q4
  // Step 6: Pergunta Aberta Opcional Q5 + Finalização
  const [step, setStep] = useState(1);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [answers, setAnswers] = useState({
    q1: '',
    q2: '',
    q3: '',
    q4: '',
    q5: ''
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const { toast } = useToast();
  const trackEvent = useEventTracking();

  useEffect(() => {
    if (!enabled) return;

    const storedSeen = localStorage.getItem('doxologos_quiz_lead_seen');
    if (storedSeen) {
      setHasSeen(true);
      return;
    }

    const timer = setTimeout(() => {
      if (!hasSeen) {
        setIsOpen(true);
        trackEvent('lead_quiz_view', { magnet: 'quiz_5_questions' });
      }
    }, 15000);

    const handleScroll = () => {
      if (!hasSeen && !isOpen) {
        const scrollPercent = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
        if (scrollPercent > 0.5) {
          setIsOpen(true);
          trackEvent('lead_quiz_view', { magnet: 'quiz_5_questions', trigger: 'scroll' });
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
    localStorage.setItem('doxologos_quiz_lead_seen', 'true');
    trackEvent('lead_quiz_close', { magnet: 'quiz_5_questions', stepReached: step });
  };

  const formatPhoneNumber = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits ? `(${digits}` : '';
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handlePhoneChange = (e) => {
    setPhone(formatPhoneNumber(e.target.value));
  };

  // PASSO 1: Envio inicial dos dados do Lead para garantir que nunca perderemos o contato
  const handleStartQuiz = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !email.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Por favor, preencha nome, WhatsApp e e-mail.'
      });
      return;
    }

    setLoading(true);
    try {
      trackEvent('lead_quiz_start', { name, email, phone });

      // Notificação imediata para a equipe (Garante a captação antes mesmo das perguntas)
      const initialLeadHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #262624; border: 1px solid #e4ded5; border-radius: 10px; padding: 20px;">
          <h2 style="color: #1b3c37; margin-top: 0;">⚡ Novo Lead Capturado (Início do Quiz)</h2>
          <p>Um novo visitante preencheu os dados e iniciou o quiz:</p>
          <ul>
            <li><strong>Nome:</strong> ${name}</li>
            <li><strong>WhatsApp:</strong> ${phone}</li>
            <li><strong>E-mail:</strong> ${email}</li>
            <li><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</li>
          </ul>
          <p style="color: #666; font-size: 12px;">As respostas completas das perguntas serão enviadas assim que ele finalizar o formulário.</p>
        </div>
      `;

      // Envia notificação em segundo plano sem bloquear a navegação do usuário
      emailService.sendEmail({
        to: 'contato@doxologos.com.br',
        subject: `Novo Lead Quiz: ${name} - ${phone}`,
        html: initialLeadHtml,
        type: 'lead_initial_captured'
      }).catch((err) => console.error('Erro ao notificar lead inicial:', err));

      setStep(2); // Avança para a primeira pergunta
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (questionId, option) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
    trackEvent('lead_quiz_answer', { question: questionId, option });
    setStep((prev) => prev + 1);
  };

  // PASSO 6: Finalização do Quiz e envio da pesquisa tabulada completa
  const handleFinalizeQuiz = async () => {
    setLoading(true);
    try {
      trackEvent('lead_quiz_complete', { name, email, phone });

      // Relatório tabulado limpo para planilha
      const tabulatedReportHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; color: #262624; border: 1px solid #e4ded5; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #1b3c37; padding: 24px; text-align: center;">
            <h2 style="color: #f0ebe1; margin: 0; font-family: Georgia, serif; font-size: 22px;">🎯 Pesquisa do Lead Concluída</h2>
            <p style="color: #9bab9b; margin-top: 6px; font-size: 14px;">Respostas tabuladas para importação / análise em planilha</p>
          </div>

          <div style="padding: 24px; background-color: #ffffff;">
            <h3 style="color: #1b3c37; margin-top: 0; font-size: 16px; border-bottom: 2px solid #1b3c37; padding-bottom: 6px;">📋 Dados de Contato do Lead</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
              <tr style="background-color: #f8f6f0;"><td style="padding: 10px; border: 1px solid #e4ded5; font-weight: bold; width: 35%;">Nome:</td><td style="padding: 10px; border: 1px solid #e4ded5;">${name}</td></tr>
              <tr><td style="padding: 10px; border: 1px solid #e4ded5; font-weight: bold;">WhatsApp / Celular:</td><td style="padding: 10px; border: 1px solid #e4ded5; font-weight: bold; color: #1b3c37;">${phone}</td></tr>
              <tr style="background-color: #f8f6f0;"><td style="padding: 10px; border: 1px solid #e4ded5; font-weight: bold;">E-mail:</td><td style="padding: 10px; border: 1px solid #e4ded5;">${email}</td></tr>
              <tr><td style="padding: 10px; border: 1px solid #e4ded5; font-weight: bold;">Data / Hora da Conclusão:</td><td style="padding: 10px; border: 1px solid #e4ded5;">${new Date().toLocaleString('pt-BR')}</td></tr>
            </table>

            <h3 style="color: #1b3c37; font-size: 16px; border-bottom: 2px solid #1b3c37; padding-bottom: 6px;">📊 Respostas Tabuladas da Pesquisa</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <thead>
                <tr style="background-color: #1b3c37; color: #f0ebe1;">
                  <th style="padding: 10px; border: 1px solid #1b3c37; text-align: left; width: 45%;">Pergunta</th>
                  <th style="padding: 10px; border: 1px solid #1b3c37; text-align: left; width: 55%;">Resposta</th>
                </tr>
              </thead>
              <tbody>
                <tr style="background-color: #ffffff;">
                  <td style="padding: 10px; border: 1px solid #e4ded5; font-weight: bold;">1. O que te fez buscar apoio agora?</td>
                  <td style="padding: 10px; border: 1px solid #e4ded5;">${answers.q1 || 'Não informado'}</td>
                </tr>
                <tr style="background-color: #f8f6f0;">
                  <td style="padding: 10px; border: 1px solid #e4ded5; font-weight: bold;">2. Você chegou a ver o perfil de algum psicólogo aqui?</td>
                  <td style="padding: 10px; border: 1px solid #e4ded5;">${answers.q2 || 'Não informado'}</td>
                </tr>
                <tr style="background-color: #ffffff;">
                  <td style="padding: 10px; border: 1px solid #e4ded5; font-weight: bold;">3. O que mais pesa na hora de escolher um psicólogo?</td>
                  <td style="padding: 10px; border: 1px solid #e4ded5;">${answers.q3 || 'Não informado'}</td>
                </tr>
                <tr style="background-color: #f8f6f0;">
                  <td style="padding: 10px; border: 1px solid #e4ded5; font-weight: bold;">4. Você já fez terapia antes?</td>
                  <td style="padding: 10px; border: 1px solid #e4ded5;">${answers.q4 || 'Não informado'}</td>
                </tr>
                <tr style="background-color: #ffffff;">
                  <td style="padding: 10px; border: 1px solid #e4ded5; font-weight: bold;">5. O que faria você agendar sua primeira sessão hoje?</td>
                  <td style="padding: 10px; border: 1px solid #e4ded5; font-style: italic;">${answers.q5.trim() ? `"${answers.q5}"` : '(Campo aberto opcional não preenchido)'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style="background-color: #f4efe6; padding: 16px; text-align: center; color: #262624; font-size: 12px; border-top: 1px solid #e4ded5;">
            <p style="margin: 0;">Plataforma Doxologos • Relatório Automático de Leads</p>
          </div>
        </div>
      `;

      // Template de Boas-vindas para o Lead por E-mail
      const leadWelcomeHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #262624; line-height: 1.6;">
          <div style="background-color: #1b3c37; padding: 28px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: #f0ebe1; margin: 0; font-family: Georgia, serif; font-size: 24px;">Sua Resposta Foi Recebida com Sucesso! 🌿</h1>
          </div>
          
          <div style="padding: 30px; background-color: #ffffff; border: 1px solid #e4ded5; border-top: none;">
            <p>Olá, <strong>${name}</strong>!</p>
            <p>Agradecemos muito por responder nossas perguntas. Suas respostas nos ajudam a oferecer um cuidado cada vez mais humano e alinhado aos seus valores.</p>
            
            <div style="background-color: #f4efe6; border-left: 4px solid #1b3c37; padding: 20px; margin: 24px 0; border-radius: 4px;">
              <h3 style="color: #1b3c37; margin-top: 0;">🎁 O que acontece agora?</h3>
              <p style="margin-bottom: 0;">Conforme prometido, nossa equipe entrará em contato com você diretamente pelo WhatsApp <strong>${phone}</strong> para te apresentar uma acolhida exclusiva e disponibilizar seu material especial!</p>
            </div>

            <p>Se desejar já conhecer nossos profissionais e verificar horários disponíveis, fique à vontade para clicar no botão abaixo:</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://doxologos.com.br/agendamento" style="background-color: #1b3c37; color: #f0ebe1; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Conhecer Psicólogos & Agendar</a>
            </div>
          </div>
          <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
            <p>© ${new Date().getFullYear()} Doxologos • Instituto de Cuidado Integral</p>
          </div>
        </div>
      `;

      // Enviar e-mails em paralelo (Notificação interna da equipe + Boas-vindas para o Lead)
      await Promise.allSettled([
        emailService.sendEmail({
          to: 'contato@doxologos.com.br',
          subject: `Respostas Quiz Concluido: ${name} - ${phone}`,
          html: tabulatedReportHtml,
          type: 'lead_quiz_completed_notification'
        }),
        emailService.sendEmail({
          to: email,
          subject: 'Sua acolhida exclusiva na Doxologos',
          html: leadWelcomeHtml,
          type: 'lead_welcome'
        })
      ]);

      setSuccess(true);
      setHasSeen(true);
      localStorage.setItem('doxologos_quiz_lead_seen', 'true');
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar respostas',
        description: 'Tente novamente ou fale conosco no WhatsApp.'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentQuestion = QUESTIONS[step - 2]; // step 2 = Q1 (index 0)
  const progressPercent = Math.round((step / 6) * 100);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
        {/* Overlay backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-[#1b3c37]/60 backdrop-blur-sm"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-xl bg-[#f8f6f0] border border-[#e4ded5] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header do Modal */}
          <div className="bg-[#1b3c37] text-[#f0ebe1] p-4 sm:p-5 relative flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#9bab9b]/20 flex items-center justify-center text-[#9bab9b]">
                <Sparkles className="w-4 h-4 text-[#f0ebe1]" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-base sm:text-lg leading-tight">Quiz de Apoio & Cuidado</h3>
                <p className="text-xs text-[#9bab9b]">Ganhe acolhimento exclusivo + material especial</p>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="text-[#f0ebe1]/70 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Barra de Progresso */}
          <div className="w-full bg-[#e4ded5] h-1.5 shrink-0 relative overflow-hidden">
            <motion.div
              className="bg-[#1b3c37] h-full transition-all duration-300"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Conteúdo Dinâmico com AnimatePresence por passo */}
          <div className="p-5 sm:p-8 overflow-y-auto space-y-6">
            {!success ? (
              <>
                {/* Botão de Voltar se não estiver no passo 1 */}
                {step > 1 && (
                  <button
                    onClick={() => setStep((prev) => prev - 1)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1b3c37] hover:underline mb-2 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Voltar para o passo anterior
                  </button>
                )}

                {/* PASSO 1: FORMULÁRIO INICIAL DE CAPTURA DO LEAD */}
                {step === 1 && (
                  <motion.div
                    key="step-1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-5"
                  >
                    {/* Alerta de Escassez / Benefício */}
                    <div className="bg-[#1b3c37] text-[#f0ebe1] p-4 rounded-xl shadow-sm border border-[#132d29]">
                      <div className="flex items-start gap-3">
                        <Gift className="w-6 h-6 text-[#9bab9b] shrink-0 mt-0.5" />
                        <div>
                          <span className="inline-block bg-[#9bab9b]/30 text-[#f0ebe1] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md mb-1">
                            Promoção Limitada (Primeiras 50 pessoas)
                          </span>
                          <p className="text-xs sm:text-sm font-medium leading-snug">
                            Receba um atendimento exclusivo via WhatsApp da nossa equipe e um material especial preparado para o seu momento.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#1b3c37]">
                        Para onde enviamos seu presente?
                      </h2>
                      <p className="text-xs sm:text-sm text-[#262624]/75">
                        Informe seus dados abaixo para iniciar a pesquisa de 5 perguntas e garantir seu acolhimento exclusivo:
                      </p>
                    </div>

                    <form onSubmit={handleStartQuiz} className="space-y-3.5">
                      <div>
                        <label className="block text-xs font-semibold text-[#1b3c37] mb-1">Seu Nome Completo *</label>
                        <Input
                          placeholder="Digite seu nome completo"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          className="bg-white border-[#e4ded5] focus:ring-[#1b3c37]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#1b3c37] mb-1">Seu WhatsApp / Telefone *</label>
                        <Input
                          placeholder="(31) 99999-9999"
                          value={phone}
                          onChange={handlePhoneChange}
                          required
                          className="bg-white border-[#e4ded5] focus:ring-[#1b3c37]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#1b3c37] mb-1">Seu Melhor E-mail *</label>
                        <Input
                          type="email"
                          placeholder="seu@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="bg-white border-[#e4ded5] focus:ring-[#1b3c37]"
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#1b3c37] hover:bg-[#132d29] text-[#f0ebe1] font-bold py-6 text-base shadow-md transition-all active:scale-[0.99]"
                      >
                        {loading ? 'Iniciando...' : 'Garantir Vaga & Iniciar Quiz'}
                      </Button>
                    </form>

                    <p className="text-[11px] text-center text-[#262624]/60 flex items-center justify-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#1b3c37]" /> Seus dados estão seguros e não enviamos spam.
                    </p>
                  </motion.div>
                )}

                {/* PASSOS 2 A 5: PERGUNTAS DE MÚLTIPLA ESCOLHA Q1..Q4 */}
                {step >= 2 && step <= 5 && currentQuestion && (
                  <motion.div
                    key={`step-${step}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-5"
                  >
                    <div className="space-y-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#9bab9b]">Pergunta {step - 1} de 5</span>
                      <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#1b3c37]">
                        {currentQuestion.title}
                      </h2>
                      <p className="text-sm text-[#262624]/75">{currentQuestion.subtitle}</p>
                    </div>

                    <div className="space-y-2.5 pt-2">
                      {currentQuestion.options.map((option, idx) => {
                        const isSelected = answers[currentQuestion.id] === option;
                        return (
                          <button
                            key={idx}
                            onClick={() => handleOptionSelect(currentQuestion.id, option)}
                            className={`w-full text-left p-3.5 sm:p-4 rounded-xl border transition-all duration-200 flex items-center justify-between text-sm sm:text-base font-medium cursor-pointer ${
                              isSelected
                                ? 'bg-[#1b3c37] text-[#f0ebe1] border-[#1b3c37] shadow-md'
                                : 'bg-white text-[#262624] border-[#e4ded5] hover:border-[#1b3c37] hover:bg-[#f4efe6]'
                            }`}
                          >
                            <span>{option}</span>
                            <div
                              className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected ? 'border-white bg-[#9bab9b]' : 'border-gray-300'
                              }`}
                            >
                              {isSelected && <div className="w-2 h-2 rounded-full bg-[#1b3c37]" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* PASSO 6: PERGUNTA ABERTA OPCIONAL Q5 + FINALIZAÇÃO */}
                {step === 6 && (
                  <motion.div
                    key="step-6"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <div className="space-y-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#9bab9b]">Pergunta 5 de 5 (Opcional)</span>
                      <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#1b3c37]">
                        O que faria você agendar sua primeira sessão hoje?
                      </h2>
                      <p className="text-sm text-[#262624]/75">
                        Conte-nos um pouco sobre o que te traria mais segurança ou facilidade (este campo é opcional):
                      </p>
                    </div>

                    <textarea
                      rows={4}
                      placeholder="Ex: Saber o horário exato, ter uma primeira conversa sem compromisso, esclarecer o valor..."
                      value={answers.q5}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, q5: e.target.value }))}
                      className="w-full p-4 border border-[#e4ded5] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1b3c37] text-sm text-[#262624]"
                    />

                    <div className="flex gap-3 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleFinalizeQuiz}
                        disabled={loading}
                        className="flex-1 border-[#e4ded5] text-[#262624] hover:bg-[#f4efe6]"
                      >
                        Pular & Concluir
                      </Button>
                      <Button
                        type="button"
                        onClick={handleFinalizeQuiz}
                        disabled={loading}
                        className="flex-1 bg-[#1b3c37] hover:bg-[#132d29] text-[#f0ebe1] font-bold"
                      >
                        {loading ? 'Finalizando...' : 'Finalizar & Receber Atendimento'}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </>
            ) : (
              /* TELA DE SUCESSO APÓS ENVIO */
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6 space-y-4"
              >
                <div className="w-16 h-16 bg-[#1b3c37] text-[#f0ebe1] rounded-full flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <h2 className="font-serif text-2xl font-bold text-[#1b3c37]">Sua Resposta Foi Recebida!</h2>
                <p className="text-sm text-[#262624]/80 max-w-md mx-auto leading-relaxed">
                  Obrigado, <strong>{name}</strong>! Nossa equipe já foi notificada e entrará em contato diretamente pelo seu WhatsApp (<strong>{phone}</strong>) com seu atendimento exclusivo e material especial.
                </p>

                <div className="pt-4 space-y-3">
                  <Button
                    onClick={handleClose}
                    variant="outline"
                    className="w-full border-[#1b3c37] text-[#1b3c37] hover:bg-[#1b3c37] hover:text-[#f0ebe1]"
                  >
                    Voltar ao site
                  </Button>

                  <a
                    href="https://wa.me/5531971982947?text=Ol%C3%A1%2C%20acabei%20de%20responder%20o%20quiz%20no%20site%20e%20gostaria%20de%20falar%20com%20a%20equipe!"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 text-sm font-bold text-[#1b3c37] hover:underline pt-2"
                  >
                    <MessageCircle className="w-4 h-4 text-green-600" /> Falar com a equipe no WhatsApp agora
                  </a>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AnxietyGuideModal;
