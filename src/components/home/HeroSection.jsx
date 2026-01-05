import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Shield, CheckCircle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import VideoShowcase from './VideoShowcase';

const HeroSection = ({
  videos = [],
  currentVideo,
  isVideoPlaying,
  iframeError,
  isVideoLoading,
  playVideoInline,
  stopVideoPlayback,
  handleIframeError,
  openVideoInNewTab,
}) => {
  const safeCurrentVideo = currentVideo || videos[0];

  if (!safeCurrentVideo) {
    return null;
  }

  return (
    <section id="inicio" className="pt-24 sm:pt-32 pb-12 sm:pb-20 hero-gradient">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Conteúdo Principal - Otimizado para Mobile */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="order-2 md:order-1"
          >
            {/* Título Mobile-Optimized - Mais curto e direto */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight" id="hero-title">
              <span className="block sm:inline">Cuidado Integral para sua</span>{' '}
              <span className="gradient-text block sm:inline">Saúde Mental</span>
            </h1>

            {/* Subtítulo - Mais conciso para mobile */}
            <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-6 sm:mb-8 leading-relaxed">
              Cuidamos da sua saúde mental com um olhar atento ao que torna você único e ao que dá sentido à sua vida! Oferecemos uma abordagem integral, que une ciência e fé para promover uma transformação profunda e duradoura.
            </p>

            {/* Trust Badges Inline - Mobile First */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-6 sm:mb-8 text-sm sm:text-base">
              <div className="flex items-center gap-1.5 text-gray-700">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-[#2d8659]" />
                <span className="font-medium">CRP Registrado</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-700">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[#2d8659]" />
                <span className="font-medium">LGPD</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-700">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-[#2d8659]" />
                <span className="font-medium">100+ Consultas</span>
              </div>
            </div>

            {/* CTAs - Mobile Optimized */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* CTA Primário - Full width em mobile, destaque máximo */}
              <Link to="/agendamento" >
                <Button size="lg" className="bg-[#2d8659] hover:bg-[#236b47] text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 w-full sm:w-auto whitespace-nowrap">
                  <Calendar className="w-5 h-5 mr-2" />
                  Encontre seu psicólogo
                </Button>

              </Link>

              {/* CTA Secundário - Texto link em mobile, menos proeminente */}

              <Link to="/doacao">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 border-green-500 text-green-600 hover:bg-green-500 hover:text-white w-full sm:w-auto whitespace-nowrap"
                >
                  💚 Apoie nossa missão
                </Button>
              </Link>


              {/* Micro-CTA - Scroll suave para "Como Funciona" */}
              {/* <button
                onClick={() => {
                  const element = document.getElementById('como-funciona');
                  element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="text-gray-600 hover:text-gray-800 text-sm font-medium
                  flex items-center justify-center sm:justify-start gap-1
                  active:scale-95 transition-all
                  touch-manipulation"
                aria-label="Ver como funciona"
              >
                Veja como funciona
                <span className="text-lg">↓</span>
              </button> */}
            </div>

            {/* Texto de Apoio - Reduz ansiedade */}
            <p className="mt-4 sm:mt-6 text-xs sm:text-sm text-gray-500 text-center sm:text-left">
              ⏱️ Primeira consulta em até 24h • 🔒 Sigilo garantido
            </p>
          </motion.div>

          {/* Vídeo - Otimizado para mobile */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="order-1 md:order-2"
          >
            <VideoShowcase
              videos={videos}
              currentVideo={safeCurrentVideo}
              isVideoPlaying={isVideoPlaying}
              iframeError={iframeError}
              isVideoLoading={isVideoLoading}
              playVideoInline={playVideoInline}
              stopVideoPlayback={stopVideoPlayback}
              handleIframeError={handleIframeError}
              openVideoInNewTab={openVideoInNewTab}
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
