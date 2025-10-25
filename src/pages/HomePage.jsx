
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Heart, Calendar, MessageCircle, Phone, Mail, MapPin, ChevronDown, Menu, X, PlayCircle, Star, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const HomePage = () => {
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [activeEvents, setActiveEvents] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [testimonials, setTestimonials] = useState([]);

  const serviceCards = [
      { 
        id: 1, 
        image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&h=600&fit=crop', 
        title: 'Psicologia Cristã Individual', 
        description: 'Atendimento personalizado que integra fé e ciência para seu crescimento pessoal e espiritual.',
        features: ['Sessões de 50 minutos', 'Abordagem integrativa', 'Atendimento online']
      },
      { 
        id: 2, 
        image: 'https://images.unsplash.com/photo-1516302752625-fcc3c50ae61f?w=800&h=600&fit=crop', 
        title: 'Terapia Familiar', 
        description: 'Fortalecendo vínculos familiares através de uma perspectiva cristã e técnicas terapêuticas.',
        features: ['Mediação de conflitos', 'Comunicação saudável', 'Valores cristãos']
      },
      { 
        id: 3, 
        image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=600&fit=crop', 
        title: 'Aconselhamento Pastoral', 
        description: 'Orientação espiritual combinada com conhecimento psicológico para questões da vida.',
        features: ['Base bíblica', 'Suporte emocional', 'Crescimento espiritual']
      },
      { 
        id: 4, 
        image: 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=800&h=600&fit=crop', 
        title: 'Workshops & Palestras', 
        description: 'Eventos educativos sobre saúde mental, relacionamentos e espiritualidade.',
        features: ['Conteúdo prático', 'Interação ao vivo', 'Material de apoio']
      },
      { 
        id: 5, 
        image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=600&fit=crop', 
        title: 'Grupos de Apoio', 
        description: 'Espaços seguros para compartilhar experiências e encontrar apoio mútuo.',
        features: ['Ambiente acolhedor', 'Troca de experiências', 'Suporte contínuo']
      }
  ];
  const [currentCard, setCurrentCard] = useState(serviceCards[0]);

  const faqs = [
      { question: 'Como funciona o atendimento online?', answer: 'Nosso atendimento é 100% online através de plataformas seguras como Zoom ou Google Meet. Após a confirmação do pagamento, você receberá o link da sala virtual.' },
      { question: 'Qual a duração das sessões?', answer: 'Cada sessão tem duração de 50 minutos, tempo ideal para um atendimento terapêutico efetivo.' },
      { question: 'Como faço para agendar?', answer: 'Basta acessar nossa página de agendamento, escolher o profissional, serviço e horário de sua preferência. Após o pagamento, você receberá a confirmação por email.' },
      { question: 'Vocês aceitam convênios?', answer: 'Atualmente trabalhamos apenas com atendimento particular, mas fornecemos recibos para reembolso junto ao seu convênio.' },
      { question: 'É possível remarcar uma consulta?', answer: 'Sim, você pode remarcar com até 24 horas de antecedência através da sua Área do Paciente ou entrando em contato conosco.' }
  ];
  
  const professionalsCarouselRef = useRef(null);
  const testimonialsCarouselRef = useRef(null);
  const [activeProfIndex, setActiveProfIndex] = useState(0);
  const [activeTestimonialIndex, setActiveTestimonialIndex] = useState(0);

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
        .select('*')
        .eq('is_approved', true)
        .order('created_at', { ascending: false });
      
      if (reviewsError) console.error('Erro ao buscar depoimentos:', reviewsError);
      else setTestimonials(reviewsData);
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

  const handleSubmit = (e) => {
    e.preventDefault();
    toast({
      title: "🚧 Funcionalidade em desenvolvimento",
      description: "O envio de formulário será implementado em breve!",
    });
    setFormData({ name: '', email: '', phone: '', message: '' });
  };

  return <>
    <Helmet>
      <title>Doxologos - Clínica de Atendimento Psicológico Online com Ética Cristã</title>
      <meta name="description" content="Atendimento psicológico, workshops e palestras online com foco na ética cristã e acolhimento integral." />
    </Helmet>

    <header className="fixed top-0 w-full bg-white/95 backdrop-blur-sm shadow-sm z-50">
      <nav className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <Heart className="w-8 h-8 text-[#2d8659]" />
            <span className="text-2xl font-bold gradient-text">Doxologos</span>
          </Link>
          <div className="hidden md:flex items-center space-x-8">
            <a href="#inicio" className="text-gray-700 hover:text-[#2d8659] transition-colors">Início</a>
            {activeEvents.length > 0 && <a href="#eventos" className="text-gray-700 hover:text-[#2d8659] transition-colors">Eventos</a>}
            <a href="#profissionais" className="text-gray-700 hover:text-[#2d8659] transition-colors">Profissionais</a>
            <a href="#depoimentos" className="text-gray-700 hover:text-[#2d8659] transition-colors">Depoimentos</a>
            <Link to="/area-do-paciente" className="text-gray-700 hover:text-[#2d8659] transition-colors">Área do Paciente</Link>
            <a href="#contato" className="text-gray-700 hover:text-[#2d8659] transition-colors">Contato</a>
            <Link to="/agendamento">
              <Button className="bg-[#2d8659] hover:bg-[#236b47]">Encontre seu psicólogo</Button>
            </Link>
          </div>
          <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="md:hidden mt-4 pb-4 space-y-4">
            <a href="#inicio" className="block text-gray-700 hover:text-[#2d8659]">Início</a>
            {activeEvents.length > 0 && <a href="#eventos" className="block text-gray-700 hover:text-[#2d8659]">Eventos</a>}
            <a href="#profissionais" className="block text-gray-700 hover:text-[#2d8659]">Profissionais</a>
            <a href="#depoimentos" className="block text-gray-700 hover:text-[#2d8659]">Depoimentos</a>
            <Link to="/area-do-paciente" className="block text-gray-700 hover:text-[#2d8659]">Área do Paciente</Link>
            <a href="#contato" className="block text-gray-700 hover:text-[#2d8659]">Contato</a>
            <Link to="/agendamento">
              <Button className="w-full bg-[#2d8659] hover:bg-[#236b47]">Agendar Consulta</Button>
            </Link>
          </motion.div>
        )}
      </nav>
    </header>

    <section id="inicio" className="pt-32 pb-20 hero-gradient">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">Cuidado Integral para sua <span className="gradient-text">Saúde Mental</span></h1>
            <p className="text-xl text-gray-600 mb-8">Cuidamos da sua saúde mental com um olhar atento ao que torna você único e ao que dá sentido à sua vida! Oferecemos uma abordagem integral, que une ciência e fé para promover uma transformação profunda e duradoura.</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/agendamento"><Button size="lg" className="bg-[#2d8659] hover:bg-[#236b47] text-lg px-8">Encontre seu psicólogo</Button></Link>
              <a href="#como-funciona"><Button size="lg" variant="outline" className="text-lg px-8 border-[#2d8659] text-[#2d8659] hover:bg-[#2d8659] hover:text-white">Saiba Mais</Button></a>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} className="relative">
            <div className="aspect-video w-full rounded-2xl shadow-2xl overflow-hidden mb-4 bg-gradient-to-br from-[#2d8659]/10 to-[#2d8659]/20 relative">
              <img 
                src={currentCard.image} 
                alt={currentCard.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <h3 className="text-2xl font-bold mb-2">{currentCard.title}</h3>
                <p className="text-white/90 mb-4">{currentCard.description}</p>
                <div className="flex flex-wrap gap-2">
                  {currentCard.features.map((feature, index) => (
                    <span key={index} className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium">
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {serviceCards.map(card => (
                <button key={card.id} onClick={() => setCurrentCard(card)} className={`aspect-video w-full rounded-md overflow-hidden relative group border-2 transition-all duration-300 ${currentCard.id === card.id ? 'border-[#2d8659] shadow-lg' : 'border-transparent hover:border-[#2d8659]/50'}`}>
                  <img src={card.image} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt={card.title} />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                    <Heart className="w-6 h-6 text-white/80" />
                  </div>
                  <div className="absolute bottom-1 left-1 right-1">
                    <div className="bg-black/60 backdrop-blur-sm rounded px-2 py-1">
                      <p className="text-white text-xs font-medium truncate">{card.title}</p>
                    </div>
                  </div>
                </button>
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
            <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-8">
                {activeEvents.map((event, index) => (
                    <motion.div key={event.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }} className="bg-gray-50/70 rounded-xl shadow-lg hover:shadow-2xl transition-shadow flex flex-col md:flex-row overflow-hidden">
                        <div className="p-8 flex-1">
                            <span className="inline-block bg-[#2d8659]/10 text-[#2d8659] font-semibold px-3 py-1 rounded-full text-sm mb-3">{event.tipo_evento}</span>
                            <h3 className="text-2xl font-bold mb-3">{event.titulo}</h3>
                            <p className="text-gray-600 mb-4 line-clamp-2">{event.descricao}</p>
                            <div className="flex items-center text-sm text-gray-500 mb-2"><Calendar className="w-4 h-4 mr-2" /> {new Date(event.data_inicio).toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} às {new Date(event.data_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                            <div className="flex items-center text-sm text-gray-500 mb-5"><Users className="w-4 h-4 mr-2" /> Ministrado por: <span className="font-semibold ml-1">{event.professional?.name || 'Equipe Doxologos'}</span></div>
                            <Link to={`/evento/${event.link_slug}`}>
                                <Button className="bg-[#2d8659] hover:bg-[#236b47] w-full md:w-auto">Inscreva-se Agora</Button>
                            </Link>
                        </div>
                        <div className="bg-[#2d8659] text-white p-6 flex flex-col justify-center items-center text-center w-full md:w-48">
                            <span className="text-4xl font-bold">{new Date(event.data_inicio).getDate()}</span>
                            <span className="text-xl font-semibold">{new Date(event.data_inicio).toLocaleString('pt-BR', { month: 'short' }).toUpperCase()}</span>
                        </div>
                    </motion.div>
                ))}
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
            { icon: Heart, title: '4. Atendimento', description: 'Participe da sessão online com total privacidade' }
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
        {console.log('🔍 [HomePage] Renderizando seção profissionais. Total:', professionals.length)}
        <div className="relative">
          {professionals.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">Nenhum profissional encontrado.</p>
              <p className="text-gray-400 text-sm mt-2">Verifique se há registros na tabela professionals do Supabase.</p>
            </div>
          ) : (
            <motion.div ref={professionalsCarouselRef} className="flex overflow-x-auto space-x-8 pb-8 scroll-smooth carousel-container" style={{ scrollSnapType: 'x mandatory' }}>
              {professionals.map((prof, index) => {
                console.log('👤 [HomePage] Renderizando profissional:', prof);
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
        {testimonials.length > 0 && (
        <div className="relative">
          <motion.div ref={testimonialsCarouselRef} className="flex overflow-x-auto space-x-8 pb-8 scroll-smooth carousel-container" style={{ scrollSnapType: 'x mandatory' }}>
            {testimonials.map((testimonial, index) => (
              <motion.div key={testimonial.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }} className="bg-white p-8 rounded-xl flex-shrink-0 w-full sm:w-1/2 md:w-1/3" style={{ scrollSnapAlign: 'start' }}>
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => <Star key={i} className="w-5 h-5 text-yellow-500 fill-current" />)}
                </div>
                <p className="text-gray-700 mb-4 italic">"{testimonial.comment}"</p>
                <p className="font-bold text-[#2d8659]">- {testimonial.patient_name || 'Paciente Anônimo'}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
        )}
        {testimonials.length > 0 && (
        <div className="flex justify-center mt-8 space-x-2">
          {testimonials.map((_, index) => <button key={index} onClick={() => scrollCarousel(testimonialsCarouselRef, index)} className={`w-3 h-3 rounded-full transition-colors ${activeTestimonialIndex === index ? 'bg-[#2d8659]' : 'bg-gray-300 hover:bg-gray-400'}`} />)}
        </div>
        )}
      </div>
    </section>

    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Perguntas Frequentes</h2>
          <p className="text-xl text-gray-600">Tire suas dúvidas</p>
        </motion.div>
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.details key={index} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.05 }} className="bg-gray-50 rounded-lg p-6 shadow-md group">
              <summary className="font-bold text-lg cursor-pointer flex items-center justify-between">{faq.question}<ChevronDown className="w-5 h-5 group-open:rotate-180 transition-transform" /></summary>
              <p className="mt-4 text-gray-600">{faq.answer}</p>
            </motion.details>
          ))}
        </div>
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
              <div><label className="block text-sm font-medium mb-2">Email</label><input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent" /></div>
              <div><label className="block text-sm font-medium mb-2">Telefone</label><input type="tel" required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent" /></div>
              <div><label className="block text-sm font-medium mb-2">Mensagem</label><textarea required rows={4} value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent" /></div>
              <Button type="submit" className="w-full bg-[#2d8659] hover:bg-[#236b47]">Enviar Mensagem</Button>
            </form>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-8">
            <div className="flex items-start space-x-4"><div className="w-12 h-12 bg-[#2d8659]/10 rounded-full flex items-center justify-center flex-shrink-0"><Phone className="w-6 h-6 text-[#2d8659]" /></div><div><h3 className="font-bold text-lg mb-1">Telefone</h3><p className="text-gray-600">(11) 9999-9999</p></div></div>
            <div className="flex items-start space-x-4"><div className="w-12 h-12 bg-[#2d8659]/10 rounded-full flex items-center justify-center flex-shrink-0"><Mail className="w-6 h-6 text-[#2d8659]" /></div><div><h3 className="font-bold text-lg mb-1">Email</h3><p className="text-gray-600">contato@doxologos.com.br</p></div></div>
            <div className="flex items-start space-x-4"><div className="w-12 h-12 bg-[#2d8659]/10 rounded-full flex items-center justify-center flex-shrink-0"><MapPin className="w-6 h-6 text-[#2d8659]" /></div><div><h3 className="font-bold text-lg mb-1">Atendimento</h3><p className="text-gray-600">100% Online - Atendemos todo o Brasil</p></div></div>
            <div className="bg-white p-6 rounded-xl"><h3 className="font-bold text-lg mb-2">Horário de Atendimento</h3><p className="text-gray-600">Segunda a Sexta: 8h às 20h</p><p className="text-gray-600">Sábado: 8h às 14h</p></div>
          </motion.div>
        </div>
      </div>
    </section>

    <footer className="bg-gray-900 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center space-x-2 mb-4"><Heart className="w-8 h-8 text-[#4ade80]" /><span className="text-2xl font-bold">Doxologos</span></div>
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
              <Link to="/trabalhe-conosco" className="block text-gray-400 hover:text-white transition-colors">Trabalhe Conosco</Link>
              <Link to="/admin" className="block text-gray-400 hover:text-white transition-colors">Acesso Restrito</Link>
               <Link to="/area-do-paciente" className="block text-gray-400 hover:text-white transition-colors">Área do Paciente</Link>
               <Link to="/criar-usuarios" className="block text-gray-400 hover:text-white transition-colors text-xs opacity-50">Dev: Criar Usuários</Link>
            </div>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-4">Contato</h3>
            <div className="space-y-2 text-gray-400"><p>contato@doxologos.com.br</p><p>(11) 9999-9999</p></div>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-8 text-center text-gray-400"><p>&copy; 2025 Doxologos. Todos os direitos reservados.</p></div>
      </div>
    </footer>
  </>;
};
export default HomePage;
