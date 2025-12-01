import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
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
    <section id="inicio" className="pt-32 pb-20 hero-gradient">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight" id="hero-title">
              Cuidado Integral para sua <span className="gradient-text">Saúde Mental</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Cuidamos da sua saúde mental com um olhar atento ao que torna você único e ao que dá sentido à sua vida! Oferecemos uma abordagem integral,
              que une ciência e fé para promover uma transformação profunda e duradoura.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/agendamento">
                <Button size="lg" className="bg-[#2d8659] hover:bg-[#236b47] text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 w-full sm:w-auto whitespace-nowrap">
                  Encontre seu psicólogo
                </Button>
              </Link>
              <Link to="/doacao">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 border-green-500 text-green-600 hover:bg-green-500 hover:text-white w-full sm:w-auto whitespace-nowrap"
                >
                  💚 Apoie nossa missão
                </Button>
              </Link>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
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
