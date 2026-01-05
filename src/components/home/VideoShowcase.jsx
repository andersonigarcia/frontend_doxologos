import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, PlayCircle, X } from 'lucide-react';

const VideoShowcase = ({
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
  const [isVisible, setIsVisible] = useState(false);
  const videoRef = useRef(null);

  // Intersection Observer para lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            // Uma vez visível, não precisa mais observar
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Carregar 50px antes de aparecer
        threshold: 0.1,
      }
    );

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, []);

  if (!safeCurrentVideo) {
    return null;
  }

  return (
    <div className="relative" ref={videoRef}>
      <div
        className="aspect-video w-full rounded-2xl shadow-2xl overflow-hidden mb-4 bg-gradient-to-br from-[#2d8659]/10 to-[#2d8659]/20 relative group"
        role="region"
        aria-label="Player de vídeo principal"
      >
        {isVideoLoading && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
            <motion.div
              className="w-12 h-12 border-4 border-[#2d8659] border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            <span className="ml-3 text-[#2d8659] font-semibold">Carregando vídeo...</span>
          </div>
        )}

        {isVideoPlaying ? (
          <>
            {!iframeError ? (
              <iframe
                src={`https://www.youtube.com/embed/${safeCurrentVideo.videoId}`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={safeCurrentVideo.title}
                onError={handleIframeError}
                loading="lazy"
              />
            ) : (
              <>
                {isVisible && (
                  <img
                    src={`https://img.youtube.com/vi/${safeCurrentVideo.videoId}/maxresdefault.jpg`}
                    alt={safeCurrentVideo.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                )}
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white text-center p-6">
                  <div className="bg-red-500 rounded-full p-4 mb-4">
                    <Play className="w-8 h-8" fill="currentColor" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Player não disponível</h3>
                  <p className="text-gray-300 mb-4">Não foi possível carregar o player integrado.</p>
                  <button
                    onClick={() => openVideoInNewTab(safeCurrentVideo.videoId)}
                    className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Assistir no YouTube
                  </button>
                </div>
              </>
            )}

            <button
              onClick={stopVideoPlayback}
              className="absolute top-4 right-4 bg-black/70 hover:bg-black/90 text-white p-2 rounded-full transition-colors z-10"
              aria-label="Fechar vídeo"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </>
        ) : (
          <>
            {isVisible ? (
              <img
                src={`https://img.youtube.com/vi/${safeCurrentVideo.videoId}/maxresdefault.jpg`}
                alt={safeCurrentVideo.title}
                className={`w-full h-full object-cover transition-opacity duration-300 pointer-events-none ${isVideoLoading ? 'opacity-50' : 'opacity-100'
                  }`}
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gray-200 animate-pulse" />
            )}
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition-colors pointer-events-none" />
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isVideoLoading) {
                  playVideoInline(safeCurrentVideo.videoId);
                }
              }}
              className="absolute inset-0 flex items-center justify-center group-hover:scale-110 transition-transform z-20 cursor-pointer"
              title={`Assistir: ${safeCurrentVideo.title}`}
              disabled={isVideoLoading}
              type="button"
            >
              <div className="bg-red-600 hover:bg-red-700 rounded-full p-6 shadow-2xl transition-all duration-200">
                <Play className="w-12 h-12 text-white ml-1" fill="currentColor" />
              </div>
            </button>
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-2xl font-bold">{safeCurrentVideo.title}</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => openVideoInNewTab(safeCurrentVideo.videoId)}
                    className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg font-semibold transition-colors"
                  >
                    Abrir no YouTube
                  </button>
                </div>
              </div>
              <p className="text-white/90">{safeCurrentVideo.description}</p>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" role="list" aria-label="Lista de vídeos disponíveis">
        {videos.map((video) => (
          <motion.div
            key={video.id}
            className={`aspect-video w-full rounded-lg overflow-hidden relative group border-2 transition-all duration-500 cursor-pointer ${safeCurrentVideo.id === video.id
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
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all duration-500" />
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
    </div>
  );
};

export default VideoShowcase;
