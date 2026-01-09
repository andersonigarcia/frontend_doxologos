import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLeadTracking } from '@/hooks/useLeadTracking';

const videoCategories = [
    { id: 'all', name: 'Todos', color: 'bg-gray-600' },
    { id: 'ansiedade', name: 'Ansiedade', color: 'bg-blue-600' },
    { id: 'relacionamentos', name: 'Relacionamentos', color: 'bg-pink-600' },
    { id: 'autoestima', name: 'Autoestima', color: 'bg-purple-600' },
    { id: 'fe', name: 'Fé e Saúde Mental', color: 'bg-green-600' }
];

// Expanded video library with categorization
const inspiringVideos = [
    {
        id: 1,
        videoId: 'InxlTnye_9Y',
        title: 'Como a Psicologia pode Transformar sua Vida',
        description: 'Descubra como integrar fé e ciência para o seu bem-estar emocional e espiritual.',
        category: 'fe',
        duration: '8:45'
    },
    {
        id: 2,
        videoId: 'xag9XxfQYv0',
        title: 'Relacionamentos Saudáveis na Família',
        description: 'Aprenda técnicas bíblicas para fortalecer os vínculos familiares.',
        category: 'relacionamentos',
        duration: '12:30'
    },
    {
        id: 3,
        videoId: 'yfht3LsQkbY',
        title: 'Superando Ansiedade com Propósito',
        description: 'Estratégias cristãs para lidar com a ansiedade e encontrar paz interior.',
        category: 'ansiedade',
        duration: '10:15'
    },
    {
        id: 4,
        videoId: '4OZlVyVrrzo',
        title: 'O Poder da Oração na Terapia',
        description: 'Como a oração pode complementar o processo terapêutico cristão.',
        category: 'fe',
        duration: '9:20'
    },
    // Add more videos as needed - these are placeholders
    {
        id: 5,
        videoId: 'dQw4w9WgXcQ', // Replace with real video ID
        title: 'Construindo Autoestima Saudável',
        description: 'Descubra seu valor à luz da palavra de Deus.',
        category: 'autoestima',
        duration: '11:00'
    },
    {
        id: 6,
        videoId: 'dQw4w9WgXcQ', // Replace with real video ID
        title: 'Comunicação Não-Violenta em Relacionamentos',
        description: 'Técnicas práticas para melhorar a comunicação com quem você ama.',
        category: 'relacionamentos',
        duration: '14:25'
    }
];

const InspiringVideosSection = () => {
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [currentVideo, setCurrentVideo] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const { trackVideoEngagement } = useLeadTracking();

    const filteredVideos = selectedCategory === 'all'
        ? inspiringVideos
        : inspiringVideos.filter(video => video.category === selectedCategory);

    const handlePlayVideo = (video) => {
        setCurrentVideo(video);
        setIsPlaying(true);
        trackVideoEngagement(video.videoId, video.title, 'play', {
            category: video.category,
            source: 'inspiring_videos_section'
        });
    };

    const handleCloseVideo = () => {
        setIsPlaying(false);
        setCurrentVideo(null);
    };

    return (
        <section className="py-16 bg-gradient-to-b from-white to-gray-50">
            <div className="container mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-12">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-4xl font-bold text-gray-800 mb-4"
                    >
                        Conteúdo Inspirador 🎥
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-xl text-gray-600 max-w-2xl mx-auto"
                    >
                        Vídeos exclusivos sobre saúde mental, relacionamentos e espiritualidade
                    </motion.p>
                </div>

                {/* Category Filter */}
                <div className="flex flex-wrap justify-center gap-3 mb-8">
                    {videoCategories.map((category) => (
                        <button
                            key={category.id}
                            onClick={() => setSelectedCategory(category.id)}
                            className={`px-4 py-2 rounded-full font-medium transition-all ${selectedCategory === category.id
                                    ? `${category.color} text-white shadow-lg scale-105`
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                        >
                            {category.name}
                        </button>
                    ))}
                </div>

                {/* Video Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {filteredVideos.map((video, index) => (
                        <motion.div
                            key={video.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="group cursor-pointer"
                            onClick={() => handlePlayVideo(video)}
                        >
                            <div className="relative aspect-video rounded-xl overflow-hidden shadow-lg group-hover:shadow-2xl transition-shadow">
                                {/* Thumbnail */}
                                <img
                                    src={`https://img.youtube.com/vi/${video.videoId}/maxresdefault.jpg`}
                                    alt={video.title}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    loading="lazy"
                                />

                                {/* Overlay */}
                                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition-colors" />

                                {/* Play Button */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-xl">
                                        <Play className="w-8 h-8 text-white ml-1" fill="currentColor" />
                                    </div>
                                </div>

                                {/* Duration Badge */}
                                <div className="absolute bottom-3 right-3 bg-black/80 px-2 py-1 rounded text-white text-xs font-medium">
                                    {video.duration}
                                </div>

                                {/* Category Badge */}
                                <div className="absolute top-3 left-3">
                                    <span className={`${videoCategories.find(c => c.id === video.category)?.color} text-white px-3 py-1 rounded-full text-xs font-medium`}>
                                        {videoCategories.find(c => c.id === video.category)?.name}
                                    </span>
                                </div>
                            </div>

                            {/* Video Info */}
                            <div className="mt-3">
                                <h3 className="font-bold text-gray-800 group-hover:text-[#2d8659] transition-colors line-clamp-2">
                                    {video.title}
                                </h3>
                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                    {video.description}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* CTA */}
                <div className="text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-block"
                    >
                        <p className="text-gray-600 mb-4">
                            Gostou do conteúdo? Que tal dar o próximo passo?
                        </p>
                        <Button
                            asChild
                            className="bg-[#2d8659] hover:bg-[#236b47] text-white font-semibold px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all"
                        >
                            <a href="/agendamento">
                                Agendar Primeira Consulta
                            </a>
                        </Button>
                    </motion.div>
                </div>
            </div>

            {/* Video Player Modal */}
            {isPlaying && currentVideo && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90">
                    <button
                        onClick={handleCloseVideo}
                        className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
                    >
                        <X className="w-8 h-8" />
                    </button>

                    <div className="w-full max-w-5xl aspect-video">
                        <iframe
                            src={`https://www.youtube.com/embed/${currentVideo.videoId}?autoplay=1`}
                            className="w-full h-full rounded-lg"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title={currentVideo.title}
                        />
                    </div>

                    {/* Video Info Below Player */}
                    <div className="absolute bottom-8 left-8 right-8 text-white text-center">
                        <h3 className="text-2xl font-bold mb-2">{currentVideo.title}</h3>
                        <p className="text-gray-300">{currentVideo.description}</p>
                    </div>
                </div>
            )}
        </section>
    );
};

export default InspiringVideosSection;
