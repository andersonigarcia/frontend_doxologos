import React, { useState, useCallback, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, MessageCircle, Mail, Phone } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useFormTracking, useVideoTracking, useEngagementTracking } from '@/hooks/useAnalytics';
import { useComponentErrorTracking } from '@/hooks/useErrorTracking';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import emailService from '@/lib/emailService';
import { useHomeContent } from '@/hooks/home/useHomeContent';
import HomeHeader from '@/components/home/HomeHeader';
import HeroSection from '@/components/home/HeroSection';
import EventsHighlight from '@/components/home/EventsHighlight';
import ProfessionalsCarousel from '@/components/home/ProfessionalsCarousel';
import TestimonialsSection from '@/components/home/TestimonialsSection';
import FaqSection from '@/components/home/FaqSection';
import ContactSection from '@/components/home/ContactSection';
import StickyBottomCTA from '@/components/home/StickyBottomCTA';
import ComoFuncionaSection from '@/components/home/ComoFuncionaSection';
import TrustIndicatorsSection from '@/components/home/TrustIndicatorsSection';
import AnxietyGuideModal from '@/components/home/AnxietyGuideModal';
import { useSystemSettings } from '@/hooks/useSystemSettings';

const videos = [
  {
    id: 1,
    videoId: 'InxlTnye_9Y',
    title: 'Como a Psicologia pode Transformar sua Vida',
    description: 'Descubra como integrar fé e ciência para o seu bem-estar emocional e espiritual.'
  },
  {
    id: 2,
    videoId: 'xag9XxfQYv0',
    title: 'Relacionamentos Saudáveis na Família',
    description: 'Aprenda técnicas bíblicas para fortalecer os vínculos familiares.'
  },
  {
    id: 3,
    videoId: 'yfht3LsQkbY',
    title: 'Superando Ansiedade com Propósito',
    description: 'Estratégias cristãs para lidar com a ansiedade e encontrar paz interior.'
  },
  {
    id: 4,
    videoId: '4OZlVyVrrzo',
    title: 'O Poder da Oração na Terapia',
    description: 'Como a oração pode complementar o processo terapêutico cristão.'
  }
];

const faqs = [
  { question: 'Como funciona o atendimento online?', answer: 'Nosso atendimento é 100% online através de plataformas seguras como Zoom ou Google Meet. Após a confirmação do pagamento, você receberá o link da sala virtual. Cada sessão tem duração média de 50 minutos, tempo ideal para um atendimento terapêutico efetivo.' },
  { question: 'Como faço para agendar?', answer: 'Basta acessar nossa página de agendamento, escolher o profissional, serviço e horário de sua preferência. Após o pagamento, você receberá a confirmação por email.' },
  { question: 'Vocês aceitam convênios?', answer: 'Atualmente trabalhamos apenas com atendimento particular, mas fornecemos recibos para reembolso junto ao seu convênio. Caso necessário, realize o agendamento e entre com contato pelo email contato@doxologos.com.br informando seu convênio.' },
  { question: 'É possível remarcar uma consulta?', answer: 'Sim, você pode remarcar com até 24 horas de antecedência através da sua Área do Paciente ou entrando em contato conosco.' },
  { question: 'A Doxologos atende apenas pessoas cristãs?', answer: 'Não. Embora nossos profissionais sejam psicólogos cristãos, atendemos pessoas de todas as crenças e convicções. Nosso compromisso é oferecer um ambiente de respeito, empatia e acolhimento para todos.' },
  { question: 'Os psicólogos da Doxologos falam sobre religião durante as sessões?', answer: 'Os psicólogos podem falar sobre religião na sessão se o tema for relevante para o bem-estar do paciente. Este assunto pode ser abordado com total respeito, sem julgamentos ou proselitismo, focando sempre em como a religião se relaciona com as questões emocionais do paciente.' },
  { question: 'O que significa ser atendido por um psicólogo cristão?', answer: 'Significa ser atendido por um profissional que, além de qualificado nas ciências psicológicas, agirá honestamente quanto aos valores cristãos em sua prática, oferecendo uma perspectiva que integra fé e ciência.' },
  { question: 'Eu preciso ser cristão para me beneficiar das terapias da Doxologos?', answer: 'Não. Nossos serviços são voltados para qualquer pessoa que busque um atendimento que respeite a espiritualidade e promova o bem-estar, independentemente de sua crença.' },
  { question: 'As sessões de terapia são diferentes das tradicionais?', answer: 'Nossas sessões seguem práticas psicológicas contemporâneas, mas têm a vantagem de incluir, quando solicitado pelo paciente, uma perspectiva que valoriza o aspecto espiritual e ético.' },
  { question: 'Posso escolher um profissional que atenda mais às minhas necessidades?', answer: 'Sim, na Doxologos, você pode conhecer o perfil dos nossos psicólogos e escolher aquele que melhor atenda às suas necessidades e expectativas.' },
  { question: 'Quais são as abordagens terapêuticas dos especialistas da Doxologos?', answer: 'Nossos profissionais utilizam diversas abordagens, como terapia cognitivo-comportamental (TCC), fenomenologia, psicanálise, terapia humanista e outras práticas contemporâneas. Todas as abordagens podem, se desejado, ser combinadas com uma visão que respeita a espiritualidade e valores cristãos.' },
  { question: 'Como posso agendar minha primeira consulta?', answer: 'Basta acessar nosso site, selecionar o profissional de sua preferência e agendar a consulta no horário que for mais conveniente para você.' },
  { question: ' As terapias têm custo acessível?', answer: 'Sim, na Doxologos nos comprometemos a oferecer atendimento de alta qualidade a preços justos, garantindo que mais pessoas possam cuidar da sua saúde mental.' }
];

const atendimentoSteps = [
  { icon: Calendar, title: '1. Agende', description: 'Escolha o profissional, serviço e horário ideal', target: '/agendamento' },
  { icon: MessageCircle, title: '2. Pagamento', description: 'Realize o pagamento de forma segura', target: '/area-do-paciente' },
  { icon: Mail, title: '3. Confirmação', description: 'Link da sala virtual será disponibilizado na área do cliente', target: '/area-do-paciente' },
  { icon: Phone, title: '4. Atendimento', description: 'Participe da sessão online com total privacidade e segurança', target: '/area-do-paciente' }
];

const HomePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, userRole, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [emailError, setEmailError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(videos[0]);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const formStartedRef = useRef(false);

  /* Analytics & Settings */
  const { trackFormStart, trackFormSubmit, trackFormError, trackFieldChange } = useFormTracking('home_contact');
  const { trackVideoPlay } = useVideoTracking();
  const { trackElementView } = useEngagementTracking();
  const { trackComponentError, trackAsyncError } = useComponentErrorTracking('HomePage');

  const { getSetting } = useSystemSettings('lead_magnet_enabled');
  const isLeadMagnetEnabled = getSetting('lead_magnet_enabled', true);

  const { activeEvents, professionals, testimonials, testimonialsLoading } = useHomeContent({ toast, trackAsyncError });

  const markFormStarted = useCallback(() => {
    if (!formStartedRef.current) {
      trackFormStart();
      formStartedRef.current = true;
    }
  }, [trackFormStart]);

  const handleFieldChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    trackFieldChange(field, value);
    markFormStarted();
  }, [markFormStarted, trackFieldChange]);

  const handleAtendimentoStepClick = useCallback((target) => {
    if (!target) {
      return;
    }
    navigate(target);
  }, [navigate]);

  const formatPhoneNumber = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length === 0) return '';
    if (numbers.length <= 2) return `(${numbers}`;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    }
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handlePhoneChange = (event) => {
    const formatted = formatPhoneNumber(event.target.value);
    handleFieldChange('phone', formatted);
  };

  const handleEmailChange = (event) => {
    const email = event.target.value;
    handleFieldChange('email', email);

    if (email && !validateEmail(email)) {
      setEmailError('Por favor, insira um email válido');
    } else {
      setEmailError('');
    }
  };

  const playVideoInline = useCallback((videoId) => {
    try {
      const selectedVideo = videos.find((video) => video.videoId === videoId) || videos[0];
      if (!selectedVideo) {
        return;
      }

      setIsVideoLoading(true);
      setCurrentVideo(selectedVideo);
      setIsVideoPlaying(true);
      setIframeError(false);
      trackElementView('video_thumbnail_click', { video_id: videoId, video_title: selectedVideo.title });
      trackVideoPlay(videoId, selectedVideo.title);
    } catch (error) {
      trackComponentError(error, 'video_play');
    } finally {
      setTimeout(() => setIsVideoLoading(false), 800);
    }
  }, [trackComponentError, trackElementView, trackVideoPlay]);

  const stopVideoPlayback = useCallback(() => {
    setIsVideoPlaying(false);
    setIframeError(false);
  }, []);

  const handleIframeError = useCallback(() => {
    setIframeError(true);
  }, []);

  const openVideoInNewTab = useCallback((videoId) => {
    window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
  }, []);

  const navigateToTestimonials = useCallback(() => {
    navigate('/depoimento');
  }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (emailError) {
      toast({
        variant: 'destructive',
        title: 'Email inválido',
        description: 'Por favor, corrija o email antes de enviar.'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      trackFormSubmit(formData);

      const emailHtml = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><h2 style="color: #2d8659; border-bottom: 2px solid #2d8659; padding-bottom: 10px; margin-bottom: 20px;">Novo Contato - Site Doxologos</h2><div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;"><p style="margin: 10px 0;"><strong>Nome:</strong> ${formData.name}</p><p style="margin: 10px 0;"><strong>Email:</strong> ${formData.email}</p><p style="margin: 10px 0;"><strong>Telefone:</strong> ${formData.phone}</p></div><div style="margin: 20px 0;"><h3 style="color: #2d8659; margin-bottom: 10px;">Mensagem:</h3><p style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; white-space: pre-wrap; margin: 0;">${formData.message}</p></div><div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;"><p style="margin: 5px 0;">Este email foi enviado automaticamente através do formulário de contato do site Doxologos.</p><p style="margin: 5px 0;">Data: ${new Date().toLocaleString('pt-BR')}</p></div></div>`;

      const confirmationHtml = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><h2 style="color: #2d8659; border-bottom: 2px solid #2d8659; padding-bottom: 10px; margin-bottom: 20px;">Recebemos sua mensagem! 💚</h2><p style="font-size: 16px; line-height: 1.6; margin: 20px 0;">Olá <strong>${formData.name}</strong>,</p><p style="font-size: 16px; line-height: 1.6; margin: 20px 0;">Agradecemos por entrar em contato com a Doxologos. Recebemos sua mensagem e em breve retornaremos com uma resposta.</p><div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;"><h3 style="color: #2d8659; margin-top: 0; margin-bottom: 15px;">Resumo da sua mensagem:</h3><p style="margin: 10px 0; white-space: pre-wrap; color: #333;">${formData.message}</p></div><p style="font-size: 16px; line-height: 1.6; margin: 20px 0;">Nossa equipe está comprometida em oferecer o melhor atendimento e retornaremos o mais breve possível.</p><div style="margin-top: 30px; padding: 20px; background-color: #2d8659; color: white; border-radius: 8px; text-align: center;"><p style="margin: 0 0 5px 0; font-size: 18px; font-weight: bold;">Doxologos</p><p style="margin: 5px 0; font-size: 14px;">Clínica de Atendimento Psicológico Online</p><p style="margin: 10px 0; font-size: 14px;">📞 (31) 97198-2947 | 📧 contato@doxologos.com.br</p></div><div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; text-align: center;"><p style="margin: 5px 0;">© ${new Date().getFullYear()} Doxologos - Todos os direitos reservados</p></div></div>`;

      await emailService.sendEmail({
        to: 'contato@doxologos.com.br',
        subject: `Novo Contato: ${formData.name}`,
        html: emailHtml,
        replyTo: formData.email,
        type: 'contact_form'
      });

      await emailService.sendEmail({
        to: formData.email,
        subject: 'Recebemos sua mensagem - Doxologos',
        html: confirmationHtml,
        type: 'contact_confirmation'
      });

      toast({
        title: '✅ Mensagem enviada com sucesso!',
        description: 'Em breve entraremos em contato com você.'
      });

      setFormData({ name: '', email: '', phone: '', message: '' });
      setEmailError('');
      formStartedRef.current = false;
    } catch (error) {
      trackFormError(error);
      trackComponentError(error, 'form_submit');

      console.error('Erro ao enviar formulário:', error);

      toast({
        variant: 'destructive',
        title: 'Erro ao enviar mensagem',
        description: 'Não foi possível enviar sua mensagem. Por favor, tente novamente ou entre em contato pelo telefone.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Doxologos - Clínica de Atendimento Psicológico Online com Ética Cristã</title>
        <meta
          name="description"
          content="Atendimento psicológico, workshops e palestras online com foco na ética cristã e acolhimento integral."
        />
        <link rel="canonical" href="https://doxologos.com.br" />
        <meta property="og:title" content="Doxologos - Clínica de Atendimento Psicológico Online com Ética Cristã" />
        <meta property="og:description" content="Atendimento psicológico, workshops e palestras online com foco na ética cristã e acolhimento integral." />
        <meta property="og:url" content="https://doxologos.com.br" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map((faq) => ({
              '@type': 'Question',
              name: faq.question,
              acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer
              }
            }))
          })}
        </script>
      </Helmet>

      <HomeHeader
        activeEventsCount={activeEvents.length}
        user={user}
        userRole={userRole}
        onLogout={() => {
          signOut();
          setMobileMenuOpen(false);
        }}
        mobileMenuOpen={mobileMenuOpen}
        onToggleMenu={() => setMobileMenuOpen((prev) => !prev)}
      />

      <main>
        <HeroSection
          videos={videos}
          currentVideo={currentVideo}
          isVideoPlaying={isVideoPlaying}
          iframeError={iframeError}
          isVideoLoading={isVideoLoading}
          playVideoInline={playVideoInline}
          stopVideoPlayback={stopVideoPlayback}
          handleIframeError={handleIframeError}
          openVideoInNewTab={openVideoInNewTab}
        />

        {activeEvents.length > 0 && (
          <EventsHighlight events={activeEvents} />
        )}

        <TrustIndicatorsSection />

        <ComoFuncionaSection />

        <ProfessionalsCarousel professionals={professionals} />

        <TestimonialsSection
          testimonials={testimonials}
          isLoading={testimonialsLoading}
          onLeaveTestimonial={navigateToTestimonials}
        />

        <FaqSection faqs={faqs} />

        <ContactSection
          formData={formData}
          emailError={emailError}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
          onEmailChange={handleEmailChange}
          onPhoneChange={handlePhoneChange}
          onFieldChange={handleFieldChange}
        />
      </main>

      {/* Sticky Bottom CTA - Mobile First */}
      <StickyBottomCTA
        ctaText="Agendar Consulta"
        ctaLink="/agendamento"
        showAfterScroll={300}
      />

      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <img src="/favicon.svg" alt="Doxologos Logo" className="w-8 h-8" />
                <span className="text-2xl font-bold">Doxologos</span>
              </div>
              <p className="text-gray-400">Cuidado integral para sua saúde mental com ética cristã.</p>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Links Rápidos</h3>
              <div className="space-y-2">
                <a href="#inicio" className="block text-gray-400 hover:text-white transition-colors">Início</a>
                <Link to="/quem-somos" className="block text-gray-400 hover:text-white transition-colors">Quem Somos</Link>
                <a href="#profissionais" className="block text-gray-400 hover:text-white transition-colors">Profissionais</a>
                <Link to="/agendamento" className="block text-gray-400 hover:text-white transition-colors">Agendamento</Link>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Institucional</h3>
              <div className="space-y-2">
                <Link to="/doacao" className="block text-primary-light hover:text-white transition-colors font-medium">💚 Faça uma Doação</Link>
                <Link to="/depoimento" className="block text-yellow-400 hover:text-white transition-colors font-medium">⭐ Deixe seu Depoimento</Link>
                <Link to="/trabalhe-conosco" className="block text-gray-400 hover:text-white transition-colors">Trabalhe Conosco</Link>
                <Link to="/admin" className="block text-gray-400 hover:text-white transition-colors">Área do Profissional</Link>
                <Link to="/area-do-paciente" className="block text-gray-400 hover:text-white transition-colors">Área do Paciente</Link>

              </div>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Contato e Registro</h3>
              <div className="space-y-2 text-gray-400 text-sm">
                <p>contato@doxologos.com.br</p>
                <p>(31) 97198-2947</p>
                {/*<p className="border-t border-gray-800 pt-2 text-xs">
                  CNPJ: 00.000.000/0000-00 (Placeholder)<br />
                  Resp. Técnico: Psic. [Nome do Profissional] - CRP [00/0000]<br />
                  <a href="https://e-psi.cfp.org.br" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
                    Consulte nosso cadastro e-Psi
                  </a>
                </p> */}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-6 pb-4 text-xs text-gray-500 max-w-3xl mx-auto text-center">
            <p className="font-medium text-yellow-500 mb-2">
              ⚠️ ATENÇÃO: Este site não oferece atendimento para casos de urgência ou emergência de saúde mental.
              Em caso de crise grave, ligue 188 (CVV - Centro de Valorização da Vida) ou procure o pronto-socorro mais próximo.
            </p>
            <p>
              Atendimento em conformidade com a Resolução CFP nº 11/2018 e orientações do Conselho Federal de Psicologia.
            </p>
          </div>

          <div className="border-t border-gray-800 pt-6 text-center text-gray-400 text-sm">
            <p>&copy; {new Date().getFullYear()} Doxologos. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>

      {/* Lead Magnet Modal */}
      <AnxietyGuideModal enabled={isLeadMagnetEnabled} />
    </>
  );
};

export default HomePage;
