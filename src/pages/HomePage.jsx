import React, { useState, useCallback, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, MessageCircle, Mail, Phone, Instagram } from 'lucide-react';
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
import FloatingWhatsAppButton from '@/components/FloatingWhatsAppButton';
import DoxologosLogo from '@/components/brand/DoxologosLogo';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import BlogPreviewSection from '@/components/home/BlogPreviewSection.jsx';

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
  { 
    question: 'Como faço para agendar uma consulta?', 
    answer: 'Basta acessar nossa página de agendamento, escolher o profissional, o serviço e o horário ideal para você. Após o pagamento, você receberá a confirmação por email.',
    content: (
      <div className="space-y-4">
        <p>Basta acessar nossa página de agendamento, escolher o profissional, o serviço e o horário ideal para você. Após o pagamento, você receberá a confirmação por email.</p>
        <Link to="/agendamento" className="inline-flex items-center text-[#2d8659] font-bold hover:underline">
          Agendar minha primeira consulta <span className="ml-1">→</span>
        </Link>
      </div>
    )
  },
  { 
    question: 'Como funciona o atendimento online?', 
    answer: 'Nosso atendimento é 100% online através de plataformas seguras como Zoom ou Google Meet. Após a confirmação do agendamento, o link da sala virtual ficará disponível na sua Área do Paciente. Cada sessão dura em média 50 minutos.',
  },
  { 
    question: 'A Doxologos atende apenas pessoas cristãs?', 
    answer: 'Não. Nossos serviços são voltados para qualquer pessoa, independentemente de sua crença. Oferecemos um ambiente de respeito, empatia e acolhimento para todos, focando no seu bem-estar emocional.',
  },
  { 
    question: 'A religião é abordada durante as sessões?', 
    answer: 'A religião ou espiritualidade será abordada na sessão apenas se o tema for relevante para você e se for algo que você deseja trazer. Nossos profissionais respeitam a fé do paciente, focando sempre em como ela se relaciona com suas questões emocionais, sem julgamentos ou proselitismo.',
  },
  { 
    question: 'Quais são as abordagens terapêuticas utilizadas?', 
    answer: 'Nossos psicólogos utilizam diversas abordagens fundamentadas cientificamente, como Terapia Cognitivo-Comportamental (TCC), Fenomenologia, Psicanálise e Humanista. Você pode verificar a abordagem específica no perfil de cada profissional antes de agendar.',
    content: (
      <div className="space-y-4">
        <p>Nossos psicólogos utilizam diversas abordagens fundamentadas cientificamente, como Terapia Cognitivo-Comportamental (TCC), Fenomenologia, Psicanálise e Humanista. Você pode verificar a abordagem específica no perfil de cada profissional antes de agendar.</p>
        <a href="#profissionais" className="inline-flex items-center text-[#2d8659] font-bold hover:underline">
          Conhecer os profissionais <span className="ml-1">→</span>
        </a>
      </div>
    )
  },
  { 
    question: 'Vocês aceitam convênios médicos?', 
    answer: 'Atualmente trabalhamos apenas com atendimento particular. No entanto, fornecemos recibos válidos que podem ser utilizados para solicitar reembolso junto ao seu convênio, caso o seu plano ofereça essa opção.',
    content: (
      <div className="space-y-4">
        <p>Atualmente trabalhamos apenas com atendimento particular. No entanto, fornecemos recibos válidos que podem ser utilizados para solicitar reembolso junto ao seu convênio, caso o seu plano ofereça essa opção.</p>
        <p className="text-sm border-l-4 border-gray-200 pl-3 italic text-gray-500">
          Dica: Consulte as regras de reembolso diretamente com a sua operadora de saúde.
        </p>
      </div>
    )
  },
  { 
    question: 'É possível remarcar uma consulta?', 
    answer: 'Sim, você pode remarcar com até 24 horas de antecedência através da sua Área do Paciente. Imprevistos de última hora podem ser conversados diretamente com o profissional.',
  }
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
        <title>Psicólogo Cristão Online | Terapia que Une Ciência e Fé | Doxologos</title>
        <meta
          name="description"
          content="Encontre seu psicólogo cristão online. Equipe especializada em terapia que integra ciência e fé. Primeira consulta em até 24h. Atendimento 100% online para todo o Brasil."
        />
        <link rel="canonical" href="https://doxologos.com.br" />
        <meta property="og:title" content="Psicólogo Cristão Online | Terapia que Une Ciência e Fé | Doxologos" />
        <meta property="og:description" content="Encontre seu psicólogo cristão online. Equipe especializada em terapia que integra ciência e fé. Primeira consulta em até 24h. Atendimento 100% online para todo o Brasil." />
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

        <BlogPreviewSection />

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

      <footer className="bg-[#1b3c37] text-[#f0ebe1] py-12 border-t border-[#132d29]">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Coluna 1: Marca e Redes Sociais */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <DoxologosLogo variant="white" className="h-10 w-auto" />
              </div>
              <p className="text-gray-400 mb-6">Cuidado integral para sua saúde mental com ética cristã.</p>
              <div className="flex space-x-4">
                <a href="https://instagram.com/doxologosoficial" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#E1306C] transition-colors" aria-label="Instagram">
                  <Instagram className="w-6 h-6" />
                </a>
              </div>
            </div>

            {/* Coluna 2: Pacientes (Jornada Principal) */}
            <div>
              <h3 className="font-bold text-lg mb-4">Para Pacientes</h3>
              <div className="space-y-2">
                <a href="/#inicio" className="block text-gray-400 hover:text-white transition-colors">Início</a>
                <Link to="/agendamento" className="block text-gray-400 hover:text-[#2d8659] transition-colors font-medium">Agendamento</Link>
                <a href="/#profissionais" className="block text-gray-400 hover:text-white transition-colors">Profissionais</a>
                <Link to="/artigos" className="block text-gray-400 hover:text-white transition-colors font-medium">Blog (Artigos)</Link>
                <Link to="/area-do-paciente" className="block text-gray-400 hover:text-white transition-colors">Área do Paciente</Link>
                <Link to="/depoimento" className="block text-gray-400 hover:text-yellow-400 transition-colors">Deixe seu Depoimento</Link>
              </div>
            </div>

            {/* Coluna 3: Institucional */}
            <div>
              <h3 className="font-bold text-lg mb-4">Institucional</h3>
              <div className="space-y-2">
                <Link to="/quem-somos" className="block text-gray-400 hover:text-white transition-colors">Quem Somos</Link>
                <Link to="/trabalhe-conosco" className="block text-gray-400 hover:text-white transition-colors">Trabalhe Conosco</Link>
                <Link to="/admin" className="block text-gray-400 hover:text-white transition-colors">Área do Profissional</Link>
                <Link to="/doacao" className="block text-gray-400 hover:text-white transition-colors">Faça uma Doação</Link>
              </div>
            </div>

            {/* Coluna 4: Contato */}
            <div>
              <h3 className="font-bold text-lg mb-4">Contato e Registro</h3>
              <div className="space-y-2 text-gray-400 text-sm">
                <p>contato@doxologos.com.br</p>
                <p>(31) 97198-2947</p>
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

      <FloatingWhatsAppButton phoneNumber="5531971982947" message="Olá! Gostaria de tirar algumas dúvidas sobre o atendimento psicológico." />
    </>
  );
};

export default HomePage;
