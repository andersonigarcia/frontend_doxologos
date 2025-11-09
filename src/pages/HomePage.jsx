
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, MessageCircle, Phone, Mail, MapPin, ChevronDown, Menu, X, PlayCircle, Star, Users, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useFormTracking, useVideoTracking, useEngagementTracking } from '@/hooks/useAnalytics';
import { useComponentErrorTracking } from '@/hooks/useErrorTracking';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import emailService from '@/lib/emailService';
import UserBadge from '@/components/UserBadge';

const HomePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, userRole, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [emailError, setEmailError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeEvents, setActiveEvents] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [testimonialsLoading, setTestimonialsLoading] = useState(true);
  const [showAllFaqs, setShowAllFaqs] = useState(false);

  // Analytics and Error Tracking Hooks
  const { trackFormStart, trackFormSubmit, trackFormError, trackFieldChange } = useFormTracking('home_contact');
  const { trackVideoPlay, trackVideoProgress, trackVideoComplete } = useVideoTracking();
  const { trackScrollDepth, trackTimeOnPage, trackElementView } = useEngagementTracking();
  const { trackComponentError, trackAsyncError } = useComponentErrorTracking('HomePage');

  const videos = [
    { 
      id: 1, 
      videoId: 'InxlTnye_9Y',
      title: 'Como a Psicologia Cristã pode Transformar sua Vida',
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
  const [currentVideo, setCurrentVideo] = useState(videos[0]);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);

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
  
  const professionalsCarouselRef = useRef(null);
  const testimonialsCarouselRef = useRef(null);
  const eventsCarouselRef = useRef(null);
  const [activeProfIndex, setActiveProfIndex] = useState(0);
  const [activeTestimonialIndex, setActiveTestimonialIndex] = useState(0);
  const [activeEventIndex, setActiveEventIndex] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const { data: eventsData, error: eventsError } = await supabase
        .from('eventos')
        .select('*')
        .eq('status', 'aberto')
        .eq('ativo', true) // Só eventos ativos
        .gt('data_limite_inscricao', new Date().toISOString())
        .lte('data_inicio_exibicao', new Date().toISOString()) // Já começou a exibir
        .gte('data_fim_exibicao', new Date().toISOString()) // Ainda não terminou de exibir
        .order('data_inicio', { ascending: true });

      if (eventsError) {
        console.error('Erro ao buscar eventos:', eventsError);
      } else {
        // Buscar profissionais dos eventos se houver eventos
        if (eventsData && eventsData.length > 0) {
          const professionalIds = [...new Set(eventsData.map(event => event.professional_id).filter(Boolean))];
          if (professionalIds.length > 0) {
            const { data: eventProfessionals } = await supabase
              .from('professionals')
              .select('id, name')
              .in('id', professionalIds);
            
            // Mapear profissionais aos eventos
            const eventsWithProfessionals = eventsData.map(event => ({
              ...event,
              professional: eventProfessionals?.find(p => p.id === event.professional_id)
            }));
            setActiveEvents(eventsWithProfessionals);
          } else {
            setActiveEvents(eventsData);
          }
        } else {
          setActiveEvents(eventsData);
        }
      }

      const { data: profsData, error: profsError } = await supabase
        .from('professionals')
        .select('*');
      
      if (profsError) {
        console.error('Erro ao buscar profissionais:', profsError);
        toast({ variant: 'destructive', title: 'Erro ao carregar profissionais', description: profsError.message });
      } else {
        setProfessionals(profsData || []);
      }

      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select(`
          *,
          professionals(name),
          bookings(patient_name, patient_email, booking_date, booking_time, professional:professionals(name))
        `)
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(7);
      
      if (reviewsError) {
        console.error('Erro ao buscar depoimentos:', reviewsError);
        toast({ 
          variant: 'destructive', 
          title: 'Erro ao carregar depoimentos', 
          description: reviewsError.message 
        });
        setTestimonials([]);
      } else {

        setTestimonials(reviewsData || []);
      }
      setTestimonialsLoading(false);
    };
    fetchData();
  }, []);

  const scrollCarousel = (ref, index) => {
    if (ref.current) {
      const scrollAmount = ref.current.children[index].offsetLeft - ref.current.offsetLeft;
      ref.current.scrollTo({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleProfScroll = useCallback(() => {
    const element = professionalsCarouselRef.current;
    if (!element || professionals.length === 0) return;
    const itemWidth = element.scrollWidth / professionals.length;
    const newIndex = Math.round(element.scrollLeft / itemWidth);
    if (newIndex < professionals.length) {
      setActiveProfIndex(newIndex);
    }
  }, [professionals.length]);

  const handleTestimonialScroll = useCallback(() => {
    const element = testimonialsCarouselRef.current;
    if (!element || testimonials.length === 0) return;
    const itemWidth = element.scrollWidth / testimonials.length;
    const newIndex = Math.round(element.scrollLeft / itemWidth);
    if (newIndex < testimonials.length) {
      setActiveTestimonialIndex(newIndex);
    }
  }, [testimonials.length]);

  const handleEventScroll = useCallback(() => {
    const element = eventsCarouselRef.current;
    if (!element || activeEvents.length === 0) return;
    const itemWidth = element.scrollWidth / activeEvents.length;
    const newIndex = Math.round(element.scrollLeft / itemWidth);
    if (newIndex < activeEvents.length) {
      setActiveEventIndex(newIndex);
    }
  }, [activeEvents.length]);

  // Funções para controlar vídeo inline
  const getEmbedUrl = (videoId) => {
    // Usando parâmetros mais compatíveis e testando diferentes domínios
    const params = new URLSearchParams({
      autoplay: '1',
      mute: '1', // Iniciar mutado para evitar bloqueios do autoplay
      controls: '1',
      rel: '0',
      modestbranding: '1',
      fs: '1',
      enablejsapi: '1',
      origin: window.location.origin
    });
    // Tentativa com domínio padrão primeiro, pois às vezes funciona melhor
    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
  };

  const handleVideoSelect = (video) => {
    try {
      setIsVideoLoading(true);
      setCurrentVideo(video);
      setIsVideoPlaying(false);
      setIframeError(false);
      
      // Track video selection
      trackElementView('video_thumbnail_click', { video_id: video.videoId, video_title: video.title });
      
      // Simular loading mínimo para melhor UX
      setTimeout(() => setIsVideoLoading(false), 800);
    } catch (error) {
      trackComponentError(error, 'video_select');
    }
  };

  const playVideoInline = (videoId) => {
    try {
      if (currentVideo.videoId !== videoId) {
        setCurrentVideo(videos.find(v => v.videoId === videoId));
      }
      setIsVideoPlaying(true);
      setIframeError(false); // Reset error state
      
      // Track video play
      const video = videos.find(v => v.videoId === videoId);
      trackVideoPlay(videoId, video?.title || 'Unknown Video');
    } catch (error) {
      trackComponentError(error, 'video_play');
    }
  };

  const stopVideoPlayback = () => {
    setIsVideoPlaying(false);
    setIframeError(false);
  };

  const handleIframeError = () => {
    setIframeError(true);
  };

  const openVideoInNewTab = (videoId) => {
    window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
  };

  useEffect(() => {
    const profRef = professionalsCarouselRef.current;
    if (profRef) {
      profRef.addEventListener('scroll', handleProfScroll);
      return () => profRef.removeEventListener('scroll', handleProfScroll);
    }
  }, [handleProfScroll]);

  useEffect(() => {
    const testRef = testimonialsCarouselRef.current;
    if (testRef) {
      testRef.addEventListener('scroll', handleTestimonialScroll);
      return () => testRef.removeEventListener('scroll', handleTestimonialScroll);
    }
  }, [handleTestimonialScroll]);

  useEffect(() => {
    const eventRef = eventsCarouselRef.current;
    if (eventRef) {
      eventRef.addEventListener('scroll', handleEventScroll);
      return () => eventRef.removeEventListener('scroll', handleEventScroll);
    }
  }, [handleEventScroll]);

  // Auto-scroll para eventos
  useEffect(() => {
    if (activeEvents.length > 1) {
      const interval = setInterval(() => {
        setActiveEventIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % activeEvents.length;
          scrollCarousel(eventsCarouselRef, nextIndex);
          return nextIndex;
        });
      }, 5000); // Muda a cada 5 segundos

      return () => clearInterval(interval);
    }
  }, [activeEvents.length]);

  // Função para formatar telefone com máscara (00) 00000-0000
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

  // Função para validar email
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handler para mudança de telefone com máscara
  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData({ ...formData, phone: formatted });
  };

  // Handler para mudança de email com validação
  const handleEmailChange = (e) => {
    const email = e.target.value;
    setFormData({ ...formData, email });
    
    if (email && !validateEmail(email)) {
      setEmailError('Por favor, insira um email válido');
    } else {
      setEmailError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validação final antes de enviar
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
      
      // Preparar o HTML do email
      const emailHtml = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><h2 style="color: #2d8659; border-bottom: 2px solid #2d8659; padding-bottom: 10px; margin-bottom: 20px;">Novo Contato - Site Doxologos</h2><div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;"><p style="margin: 10px 0;"><strong>Nome:</strong> ${formData.name}</p><p style="margin: 10px 0;"><strong>Email:</strong> ${formData.email}</p><p style="margin: 10px 0;"><strong>Telefone:</strong> ${formData.phone}</p></div><div style="margin: 20px 0;"><h3 style="color: #2d8659; margin-bottom: 10px;">Mensagem:</h3><p style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; white-space: pre-wrap; margin: 0;">${formData.message}</p></div><div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;"><p style="margin: 5px 0;">Este email foi enviado automaticamente através do formulário de contato do site Doxologos.</p><p style="margin: 5px 0;">Data: ${new Date().toLocaleString('pt-BR')}</p></div></div>`;
      
      // Email de confirmação para o usuário
      const confirmationHtml = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><h2 style="color: #2d8659; border-bottom: 2px solid #2d8659; padding-bottom: 10px; margin-bottom: 20px;">Recebemos sua mensagem! 💚</h2><p style="font-size: 16px; line-height: 1.6; margin: 20px 0;">Olá <strong>${formData.name}</strong>,</p><p style="font-size: 16px; line-height: 1.6; margin: 20px 0;">Agradecemos por entrar em contato com a Doxologos. Recebemos sua mensagem e em breve retornaremos com uma resposta.</p><div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;"><h3 style="color: #2d8659; margin-top: 0; margin-bottom: 15px;">Resumo da sua mensagem:</h3><p style="margin: 10px 0; white-space: pre-wrap; color: #333;">${formData.message}</p></div><p style="font-size: 16px; line-height: 1.6; margin: 20px 0;">Nossa equipe está comprometida em oferecer o melhor atendimento e retornaremos o mais breve possível.</p><div style="margin-top: 30px; padding: 20px; background-color: #2d8659; color: white; border-radius: 8px; text-align: center;"><p style="margin: 0 0 5px 0; font-size: 18px; font-weight: bold;">Doxologos</p><p style="margin: 5px 0; font-size: 14px;">Clínica de Atendimento Psicológico Online</p><p style="margin: 10px 0; font-size: 14px;">📞 (31) 97198-2947 | 📧 contato@doxologos.com.br</p></div><div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; text-align: center;"><p style="margin: 5px 0;">© ${new Date().getFullYear()} Doxologos - Todos os direitos reservados</p></div></div>`;
      
      // Enviar email para a clínica (notificação)
      await emailService.sendEmail({
        to: 'contato@doxologos.com.br',
        subject: `Novo Contato: ${formData.name}`,
        html: emailHtml,
        replyTo: formData.email,
        type: 'contact_form'
      });
      
      // Enviar email de confirmação para o usuário
      await emailService.sendEmail({
        to: formData.email,
        subject: 'Recebemos sua mensagem - Doxologos',
        html: confirmationHtml,
        type: 'contact_confirmation'
      });
      
      toast({
        title: "✅ Mensagem enviada com sucesso!",
        description: "Em breve entraremos em contato com você.",
      });
      
      setFormData({ name: '', email: '', phone: '', message: '' });
      setEmailError('');
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
      <meta name="description" content="Atendimento psicológico, workshops e palestras online com foco na ética cristã e acolhimento integral." />
      
      {/* FAQ Schema for Rich Snippets */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": faqs.map(faq => ({
            "@type": "Question",
            "name": faq.question,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": faq.answer
            }
          }))
        })}
      </script>
    </Helmet>

    <header className="fixed top-0 w-full bg-white/95 backdrop-blur-sm shadow-sm z-50">
      <nav className="container mx-auto px-4 py-4" role="navigation" aria-label="Navegação principal">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2" aria-label="Doxologos - Página inicial">
            <img src="/favicon.svg" alt="Doxologos Logo" className="w-8 h-8" />
            <span className="text-2xl font-bold gradient-text">Doxologos</span>
          </Link>
          <div className="hidden md:flex items-center space-x-8">
            <a href="#inicio" className="text-gray-700 hover:text-[#2d8659] transition-colors">Início</a>
            {activeEvents.length > 0 && <a href="#eventos" className="text-gray-700 hover:text-[#2d8659] transition-colors">Eventos</a>}
            <a href="#profissionais" className="text-gray-700 hover:text-[#2d8659] transition-colors">Profissionais</a>
            <a href="#depoimentos" className="text-gray-700 hover:text-[#2d8659] transition-colors">Depoimentos</a>
            {!user && <Link to="/area-do-paciente" className="text-gray-700 hover:text-[#2d8659] transition-colors">Área do Paciente</Link>}
            <a href="#contato" className="text-gray-700 hover:text-[#2d8659] transition-colors">Contato</a>
            {user ? (
              <>
                <div className="h-6 w-px bg-gray-300"></div>
                <UserBadge
                  user={user}
                  userRole={userRole}
                  onLogout={() => {
                    signOut();
                    setMobileMenuOpen(false);
                  }}
                  layout="row"
                  showLogoutButton={true}
                />
              </>
            ) : (
              <Link to="/agendamento">
                <Button className="bg-[#2d8659] hover:bg-[#236b47]">Encontre seu psicólogo</Button>
              </Link>
            )}
          </div>
          <button 
            className="md:hidden" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="md:hidden mt-4 pb-4 space-y-4"
            id="mobile-menu"
            role="menu"
            aria-labelledby="mobile-menu-button"
          >
            <a href="#inicio" className="block text-gray-700 hover:text-[#2d8659]" role="menuitem">Início</a>
            {activeEvents.length > 0 && <a href="#eventos" className="block text-gray-700 hover:text-[#2d8659]" role="menuitem">Eventos</a>}
            <a href="#profissionais" className="block text-gray-700 hover:text-[#2d8659]" role="menuitem">Profissionais</a>
            <a href="#depoimentos" className="block text-gray-700 hover:text-[#2d8659]" role="menuitem">Depoimentos</a>
            {!user && <Link to="/area-do-paciente" className="block text-gray-700 hover:text-[#2d8659]" role="menuitem">Área do Paciente</Link>}
            <a href="#contato" className="block text-gray-700 hover:text-[#2d8659]" role="menuitem">Contato</a>
            {user ? (
              <>
                <div className="border-t border-gray-200 pt-4">
                  <UserBadge
                    user={user}
                    userRole={userRole}
                    onLogout={() => {
                      signOut();
                      setMobileMenuOpen(false);
                    }}
                    layout="column"
                    showLogoutButton={true}
                    compact={true}
                  />
                </div>
              </>
            ) : (
              <Link to="/agendamento">
                <Button className="w-full bg-[#2d8659] hover:bg-[#236b47]">Agendar Consulta</Button>
              </Link>
            )}
          </motion.div>
        )}
      </nav>
    </header>

    <section id="inicio" className="pt-32 pb-20 hero-gradient">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight" id="hero-title">Cuidado Integral para sua <span className="gradient-text">Saúde Mental</span></h1>
            <p className="text-xl text-gray-600 mb-8">Cuidamos da sua saúde mental com um olhar atento ao que torna você único e ao que dá sentido à sua vida! Oferecemos uma abordagem integral, que une ciência e fé para promover uma transformação profunda e duradoura.</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/agendamento">
                <Button size="lg" className="bg-[#2d8659] hover:bg-[#236b47] text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 w-full sm:w-auto whitespace-nowrap" aria-label="Agendar consulta com psicólogo">
                  Encontre seu psicólogo
                </Button>
              </Link>
              <Link to="/doacao">
                <Button size="lg" variant="outline" className="text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 border-green-500 text-green-600 hover:bg-green-500 hover:text-white w-full sm:w-auto whitespace-nowrap" aria-label="Fazer doação para apoiar nossa missão">
                  💚 Apoie nossa missão
                </Button>
              </Link>
              {/* <a href="#como-funciona">
                <Button size="lg" variant="ghost" className="text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 text-[#2d8659] hover:bg-[#2d8659]/10 w-full sm:w-auto whitespace-nowrap">
                  Saiba Mais
                </Button>
              </a> */}
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} className="relative">
            {/* Vídeo Principal */}
            <div className="aspect-video w-full rounded-2xl shadow-2xl overflow-hidden mb-4 bg-gradient-to-br from-[#2d8659]/10 to-[#2d8659]/20 relative group" role="region" aria-label="Player de vídeo principal">
              {isVideoLoading && (
                <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
                  <motion.div 
                    className="w-12 h-12 border-4 border-[#2d8659] border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  <span className="ml-3 text-[#2d8659] font-semibold">Carregando vídeo...</span>
                </div>
              )}
              {isVideoPlaying ? (
                // Player ou Fallback quando reproduzindo
                <>
                  {!iframeError ? (
                    // Tentativa de carregar iframe
                    <>
                      <iframe
                        src={getEmbedUrl(currentVideo.videoId)}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={currentVideo.title}
                        onError={handleIframeError}
                      />
                      
                      {/* Botão alternativo caso o iframe não carregue */}
                      {/* <div className="absolute bottom-4 left-4">
                        <button
                          onClick={handleIframeError}
                          className="bg-gray-600/80 hover:bg-gray-700 text-white px-3 py-2 rounded text-sm transition-colors"
                        >
                          Problemas? Clique aqui
                        </button>
                      </div> */}
                    </>
                  ) : (
                    // Fallback quando iframe não carrega
                    <>
                      <img 
                        src={`https://img.youtube.com/vi/${currentVideo.videoId}/maxresdefault.jpg`}
                        alt={currentVideo.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white text-center p-6">
                        <div className="bg-red-500 rounded-full p-4 mb-4">
                          <Play className="w-8 h-8" fill="currentColor" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Player não disponível</h3>
                        <p className="text-gray-300 mb-4">
                          Não foi possível carregar o player integrado.
                        </p>
                        <button
                          onClick={() => openVideoInNewTab(currentVideo.videoId)}
                          className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg font-semibold transition-colors"
                        >
                          Assistir no YouTube
                        </button>
                      </div>
                    </>
                  )}
                  
                  {/* Botão de fechar */}
                  <button
                    onClick={stopVideoPlayback}
                    className="absolute top-4 right-4 bg-black/70 hover:bg-black/90 text-white p-2 rounded-full transition-colors z-10"
                    aria-label="Fechar vídeo"
                  >
                    <X className="w-5 h-5" aria-hidden="true" />
                  </button>
                </>
              ) : (
                // Thumbnail quando não reproduzindo
                <>
                  {/* Thumbnail de fundo */}
                  <img 
                    src={`https://img.youtube.com/vi/${currentVideo.videoId}/maxresdefault.jpg`}
                    alt={currentVideo.title}
                    className={`w-full h-full object-cover transition-opacity duration-300 pointer-events-none ${isVideoLoading ? 'opacity-50' : 'opacity-100'}`}
                    loading="lazy"
                  />
                  
                  {/* Overlay escuro */}
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition-colors pointer-events-none" />
                  
                  {/* Botão de Play Central */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!isVideoLoading) {
                        playVideoInline(currentVideo.videoId);
                      }
                    }}
                    className="absolute inset-0 flex items-center justify-center group-hover:scale-110 transition-transform z-20 cursor-pointer"
                    title={`Assistir: ${currentVideo.title}`}
                    disabled={isVideoLoading}
                    type="button"
                  >
                    <div className="bg-red-600 hover:bg-red-700 rounded-full p-6 shadow-2xl transition-all duration-200">
                      <Play className="w-12 h-12 text-white ml-1" fill="currentColor" />
                    </div>
                  </button>
                  
                  {/* Informações do Vídeo */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-2xl font-bold">{currentVideo.title}</h3>
                      <div className="flex space-x-2">
                        {/* <button
                          onClick={() => playVideoInline(currentVideo.videoId)}
                          className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-semibold transition-colors"
                        >
                          Assistir Aqui
                        </button> */}
                        <button
                          onClick={() => openVideoInNewTab(currentVideo.videoId)}
                          className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg font-semibold transition-colors"
                        >
                          Abrir no YouTube
                        </button>
                      </div>
                    </div>
                    <p className="text-white/90">{currentVideo.description}</p>
                  </div>
                </>
              )}
            </div>

            {/* Miniaturas de Vídeos */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3" role="list" aria-label="Lista de vídeos disponíveis">
              {videos.map(video => (
                <motion.div
                  key={video.id}
                  className={`aspect-video w-full rounded-lg overflow-hidden relative group border-2 transition-all duration-500 cursor-pointer ${
                    currentVideo.id === video.id 
                      ? 'border-[#2d8659] shadow-2xl scale-105 bg-gradient-to-br from-green-50 to-green-100' 
                      : 'border-transparent hover:border-green-200 hover:shadow-xl'
                  }`}
                  onClick={() => playVideoInline(video.videoId)}
                  onKeyDown={(e) => e.key === 'Enter' && playVideoInline(video.videoId)}
                  whileHover={{ y: -8, transition: { duration: 0.3 } }}
                  whileTap={{ scale: 0.95 }}
                  title={video.title}
                  role="listitem"
                  tabIndex={0}
                  aria-label={`Assistir vídeo: ${video.title}`}
                >
                  <img 
                    src={`https://img.youtube.com/vi/${video.videoId}/maxresdefault.jpg`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                    alt={video.title}
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all duration-500"></div>
                  
                  {/* Botões no hover */}
                  <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playVideoInline(video.videoId);
                      }}
                      className="bg-red-600 hover:bg-red-700 p-1.5 rounded text-white"
                      title="Assistir aqui"
                    >
                      <Play className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openVideoInNewTab(video.videoId);
                      }}
                      className="bg-gray-600 hover:bg-gray-700 p-1.5 rounded text-white"
                      title="Abrir no YouTube"
                    >
                      <PlayCircle className="w-3 h-3" />
                    </button>
                  </div>
                  
                  <div className="absolute bottom-1 left-1 right-1">
                    <div className="bg-black/70 backdrop-blur-sm rounded px-2 py-1">
                      <p className="text-white text-xs font-medium truncate">{video.title}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>

    {activeEvents.length > 0 && (
    <section id="eventos" className="py-20 bg-white">
        <div className="container mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
                <h2 className="text-4xl font-bold mb-4">Nossos Próximos Eventos</h2>
                <p className="text-xl text-gray-600">Participe de nossos workshops e palestras online.</p>
            </motion.div>
            <div className="relative">
                <motion.div 
                    ref={eventsCarouselRef} 
                    className="flex overflow-x-auto space-x-8 pb-8 scroll-smooth carousel-container" 
                    style={{ scrollSnapType: 'x mandatory' }}
                >
                    {activeEvents.map((event, index) => (
                        <motion.div 
                            key={event.id} 
                            initial={{ opacity: 0, y: 30 }} 
                            whileInView={{ opacity: 1, y: 0 }} 
                            viewport={{ once: true }} 
                            transition={{ delay: index * 0.1 }} 
                            className="bg-gray-50/70 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col md:flex-row overflow-hidden flex-shrink-0 w-full max-w-2xl" 
                            style={{ scrollSnapAlign: 'start' }}
                        >
                            <div className="p-8 flex-1">
                                <span className="inline-block bg-[#2d8659]/10 text-[#2d8659] font-semibold px-3 py-1 rounded-full text-sm mb-3">
                                    {event.tipo_evento}
                                </span>
                                <h3 className="text-2xl font-bold mb-3">{event.titulo}</h3>
                                <p className="text-gray-600 mb-4 line-clamp-2">{event.descricao}</p>
                                <div className="flex items-center text-sm text-gray-500 mb-2">
                                    <Calendar className="w-4 h-4 mr-2" /> 
                                    {new Date(event.data_inicio).toLocaleDateString('pt-BR', { 
                                        weekday: 'long', 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric' 
                                    })} às {new Date(event.data_inicio).toLocaleTimeString('pt-BR', { 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                    })}
                                </div>
                                <div className="flex items-center text-sm text-gray-500 mb-5">
                                    <Users className="w-4 h-4 mr-2" /> 
                                    Ministrado por: <span className="font-semibold ml-1">{event.professional?.name || 'Equipe Doxologos'}</span>
                                </div>
                                {event.valor > 0 ? (
                                    <div className="mb-4">
                                        <div className="inline-block bg-[#2d8659] text-white px-4 py-2 rounded-lg">
                                            <span className="text-sm font-medium">Investimento: </span>
                                            <span className="text-lg font-bold">R$ {parseFloat(event.valor).toFixed(2).replace('.', ',')}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mb-4">
                                        <span className="inline-block bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-semibold">
                                            🎉 Gratuito
                                        </span>
                                    </div>
                                )}
                                <Link to={`/evento/${event.link_slug}`}>
                                    <Button className="bg-[#2d8659] hover:bg-[#236b47] w-full md:w-auto transition-all duration-300 hover:scale-105">
                                        Inscreva-se Agora
                                    </Button>
                                </Link>
                            </div>
                            <div className="bg-gradient-to-br from-[#2d8659] to-[#236b47] text-white p-6 flex flex-col justify-center items-center text-center w-full md:w-48">
                                <span className="text-4xl font-bold">{new Date(event.data_inicio).getDate()}</span>
                                <span className="text-xl font-semibold">{new Date(event.data_inicio).toLocaleString('pt-BR', { month: 'short' }).toUpperCase()}</span>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
                
                {/* Indicadores de navegação */}
                {activeEvents.length > 1 && (
                    <div className="flex justify-center mt-8 space-x-2">
                        {activeEvents.map((_, index) => (
                            <button 
                                key={index} 
                                onClick={() => {
                                    setActiveEventIndex(index);
                                    scrollCarousel(eventsCarouselRef, index);
                                }} 
                                className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                                    activeEventIndex === index ? 'bg-[#2d8659]' : 'bg-gray-300 hover:bg-gray-400'
                                }`} 
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    </section>
    )}


    <section id="como-funciona" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Como Funciona o Atendimento</h2>
          <p className="text-xl text-gray-600">Simples, rápido e seguro</p>
        </motion.div>
        <div className="grid md:grid-cols-4 gap-8">
          {[
            { icon: Calendar, title: '1. Agende', description: 'Escolha o profissional, serviço e horário ideal' },
            { icon: MessageCircle, title: '2. Pagamento', description: 'Realize o pagamento de forma segura' },
            { icon: Mail, title: '3. Confirmação', description: 'Receba o link da sala virtual por email' },
            { icon: Phone, title: '4. Atendimento', description: 'Participe da sessão online com total privacidade' }
          ].map((step, index) => (
            <motion.div key={index} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }} className="text-center p-6 rounded-xl hover:shadow-lg transition-shadow bg-white">
              <div className="w-16 h-16 bg-[#2d8659]/10 rounded-full flex items-center justify-center mx-auto mb-4"><step.icon className="w-8 h-8 text-[#2d8659]" /></div>
              <h3 className="text-xl font-bold mb-2">{step.title}</h3>
              <p className="text-gray-600">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    <section id="profissionais" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Conheça Nossa Equipe </h2>
          <p className="text-xl text-gray-600">Equipe qualificada e comprometida com seu bem-estar</p>
        </motion.div>

        <div className="relative">
          {professionals.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">Nenhum profissional encontrado.</p>
              <p className="text-gray-400 text-sm mt-2">Verifique se há registros na tabela professionals do Supabase.</p>
            </div>
          ) : (
            <motion.div ref={professionalsCarouselRef} className="flex overflow-x-auto space-x-8 pb-8 scroll-smooth carousel-container" style={{ scrollSnapType: 'x mandatory' }}>
              {professionals.map((prof, index) => {

                return (
              <motion.div key={prof.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }} className="bg-gray-50 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow flex-shrink-0 w-full sm:w-1/2 md:w-1/3 lg:w-1/4" style={{ scrollSnapAlign: 'start' }}>
                <img className="w-full h-64 object-cover" alt={prof.name} src={prof.image_url || "https://images.unsplash.com/photo-1603991414220-51b87b89a371?w=400&h=300&fit=crop&crop=face"} />
                <div className="p-6">
                  <h3 className="text-2xl font-bold mb-2">{prof.name}</h3>
                  <p className="text-[#2d8659] font-semibold mb-3">{prof.specialty}</p>
                  <p className="text-gray-600 text-sm">{prof.mini_curriculum || prof.description}</p>
                </div>
              </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
        {professionals.length > 0 && (
          <div className="flex justify-center mt-8 space-x-2">
            {professionals.map((_, index) => <button key={index} onClick={() => scrollCarousel(professionalsCarouselRef, index)} className={`w-3 h-3 rounded-full transition-colors ${activeProfIndex === index ? 'bg-[#2d8659]' : 'bg-gray-300 hover:bg-gray-400'}`} />)}
          </div>
        )}
      </div>
    </section>

    <section id="depoimentos" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">O Que Dizem Nossos Pacientes</h2>
          <p className="text-xl text-gray-600">Histórias reais de transformação</p>
        </motion.div>
        {testimonialsLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2d8659] mx-auto mb-4"></div>
            <p className="text-gray-500 text-lg">Carregando depoimentos...</p>
          </div>
        ) : testimonials.length > 0 ? (
          <div className="relative">
            <motion.div ref={testimonialsCarouselRef} className="flex overflow-x-auto space-x-8 pb-8 scroll-smooth carousel-container" style={{ scrollSnapType: 'x mandatory' }}>
              {testimonials.map((testimonial, index) => {
                const patientName = testimonial.bookings?.patient_name || testimonial.patient_name || 'Paciente Anônimo';
                const professionalName = testimonial.professionals?.name || testimonial.bookings?.professional?.name;
                return (
                  <motion.div key={testimonial.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }} className="bg-white p-8 rounded-xl flex-shrink-0 w-full sm:w-1/2 md:w-1/3 hover:shadow-lg transition-shadow" style={{ scrollSnapAlign: 'start' }}>
                    <div className="flex mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => <Star key={i} className="w-5 h-5 text-yellow-500 fill-current" />)}
                    </div>
                    <p className="text-gray-700 mb-4 italic">"{testimonial.comment}"</p>
                    <div className="space-y-1">
                      <p className="font-bold text-[#2d8659]">- {patientName}</p>
                      {professionalName && (
                        <p className="text-sm text-gray-600">Atendido por <span className="font-semibold text-[#2d8659]">{professionalName}</span></p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
            <div className="flex justify-center mt-8 space-x-2">
              {testimonials.map((_, index) => <button key={index} onClick={() => scrollCarousel(testimonialsCarouselRef, index)} className={`w-3 h-3 rounded-full transition-colors ${activeTestimonialIndex === index ? 'bg-[#2d8659]' : 'bg-gray-300 hover:bg-gray-400'}`} />)}
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="bg-blue-50 rounded-lg p-8 max-w-2xl mx-auto">
              <MessageCircle className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Seja o Primeiro a Compartilhar</h3>
              <p className="text-gray-600 mb-6">
                Ainda não temos depoimentos públicos, mas você pode ser o primeiro! 
                Compartilhe sua experiência conosco.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={() => navigate('/depoimento')}
                  className="bg-[#2d8659] hover:bg-[#236b47]"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Deixar Depoimento
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => document.getElementById('contato').scrollIntoView({ behavior: 'smooth' })}
                >
                  Entre em Contato
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>

    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Perguntas Frequentes</h2>
          <p className="text-xl text-gray-600">Tire suas dúvidas</p>
        </motion.div>
        
        {/* Grid de 2 colunas para melhor aproveitamento do espaço */}
        <div className="grid md:grid-cols-2 gap-6">
          {faqs.slice(0, showAllFaqs ? faqs.length : 8).map((faq, index) => (
            <motion.details 
              key={index} 
              initial={{ opacity: 0, y: 20 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }} 
              transition={{ delay: index * 0.05 }} 
              className="bg-gray-50 rounded-lg p-6 shadow-md group hover:shadow-lg transition-all duration-300"
            >
              <summary className="font-bold text-lg cursor-pointer flex items-center justify-between">
                <span className="pr-4">{faq.question}</span>
                <ChevronDown className="w-5 h-5 group-open:rotate-180 transition-transform flex-shrink-0" />
              </summary>
              <p className="mt-4 text-gray-600 leading-relaxed">{faq.answer}</p>
            </motion.details>
          ))}
        </div>

        {/* Botão Ver mais/Ver menos */}
        {faqs.length > 8 && (
          <div className="text-center mt-8">
            <Button
              onClick={() => setShowAllFaqs(!showAllFaqs)}
              variant="outline"
              className="border-[#2d8659] text-[#2d8659] hover:bg-[#2d8659] hover:text-white"
            >
              {showAllFaqs ? 'Ver menos perguntas' : `Ver mais ${faqs.length - 8} perguntas`}
            </Button>
          </div>
        )}
      </div>
    </section>

    <section id="contato" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Entre em Contato</h2>
          <p className="text-xl text-gray-600">Estamos aqui para ajudar você</p>
        </motion.div>
        <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div><label className="block text-sm font-medium mb-2">Nome Completo</label><input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent" /></div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input 
                  type="email" 
                  required 
                  value={formData.email} 
                  onChange={handleEmailChange} 
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent ${emailError ? 'border-red-500' : 'border-gray-300'}`} 
                />
                {emailError && <p className="text-red-500 text-sm mt-1">{emailError}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Telefone</label>
                <input 
                  type="tel" 
                  required 
                  value={formData.phone} 
                  onChange={handlePhoneChange} 
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent" 
                />
              </div>
              <div><label className="block text-sm font-medium mb-2">Mensagem</label><textarea required rows={4} value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent" /></div>
              <Button 
                type="submit" 
                disabled={isSubmitting || emailError || !formData.name || !formData.email || !formData.phone || !formData.message}
                className="w-full bg-[#2d8659] hover:bg-[#236b47] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Enviando...' : 'Enviar Mensagem'}
              </Button>
            </form>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-8">
            <div className="flex items-start space-x-4"><div className="w-12 h-12 bg-[#2d8659]/10 rounded-full flex items-center justify-center flex-shrink-0"><Phone className="w-6 h-6 text-[#2d8659]" /></div><div><h3 className="font-bold text-lg mb-1">Telefone</h3><p className="text-gray-600">(31) 97198-2947</p></div></div>
            <div className="flex items-start space-x-4"><div className="w-12 h-12 bg-[#2d8659]/10 rounded-full flex items-center justify-center flex-shrink-0"><Mail className="w-6 h-6 text-[#2d8659]" /></div><div><h3 className="font-bold text-lg mb-1">Email</h3><p className="text-gray-600">contato@doxologos.com.br</p></div></div>
            <div className="flex items-start space-x-4"><div className="w-12 h-12 bg-[#2d8659]/10 rounded-full flex items-center justify-center flex-shrink-0"><MapPin className="w-6 h-6 text-[#2d8659]" /></div><div><h3 className="font-bold text-lg mb-1">Atendimento</h3><p className="text-gray-600">100% Online - Presença global: onde você estiver, nós atendemos.</p></div></div>
            <div className="bg-white p-6 rounded-xl"><h3 className="font-bold text-lg mb-2">Horário de Atendimento</h3><p className="text-gray-600">Segunda a Sexta: 8h às 22h</p><p className="text-gray-600">Sábado: 8h às 14h</p></div>
          </motion.div>
        </div>
      </div>
    </section>

    <footer className="bg-gray-900 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center space-x-2 mb-4"><img src="/favicon.svg" alt="Doxologos Logo" className="w-8 h-8" /><span className="text-2xl font-bold">Doxologos</span></div>
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
              <Link to="/admin" className="block text-gray-400 hover:text-white transition-colors">Acesso Restrito</Link>
               <Link to="/area-do-paciente" className="block text-gray-400 hover:text-white transition-colors">Área do Paciente</Link>
               <Link to="/criar-usuarios" className="block text-gray-400 hover:text-white transition-colors text-xs opacity-50">Dev: Criar Usuários</Link>
            </div>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-4">Contato</h3>
            <div className="space-y-2 text-gray-400"><p>contato@doxologos.com.br</p><p>(31) 97198-2947</p></div>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-8 text-center text-gray-400"><p>&copy; 2025 Doxologos. Todos os direitos reservados.</p></div>
      </div>
    </footer>
    </>
  );
};

export default HomePage;
