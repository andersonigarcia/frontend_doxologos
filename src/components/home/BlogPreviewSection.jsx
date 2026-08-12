import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, Calendar, Rss } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const BlogPreviewSection = () => {
  const [artigos, setArtigos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArtigos = async () => {
      try {
        const { data } = await supabase
          .from('artigos')
          .select('id, slug, title, description, cover_image_url, published_at, author')
          .eq('status', 'published')
          .order('published_at', { ascending: false })
          .limit(3);
        setArtigos(data || []);
      } catch (e) {
        console.error('BlogPreviewSection: erro ao buscar artigos', e);
      } finally {
        setLoading(false);
      }
    };
    fetchArtigos();
  }, []);

  // Não renderiza se não houver artigos (sem disturbar o layout)
  if (!loading && artigos.length === 0) return null;

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <section className="py-20 bg-gradient-to-b from-white to-gray-50" aria-labelledby="blog-preview-title">
      <div className="container mx-auto px-4 max-w-7xl">

        {/* Cabeçalho da seção */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#1b3c37]/10 text-[#1b3c37] px-3 py-1 rounded-full text-sm font-medium mb-3">
              <BookOpen className="w-4 h-4 text-[#1b3c37]" />
              Do nosso Blog
            </div>
            <h2
              id="blog-preview-title"
              className="font-serif text-3xl sm:text-4xl font-extrabold text-[#1b3c37]"
            >
              Reflexões para o seu{' '}
              <span className="gradient-text">bem-estar</span>
            </h2>
            <p className="mt-2 text-[#262624]/80 max-w-xl">
              Artigos sobre saúde mental, fé e crescimento pessoal escritos pelos nossos especialistas.
            </p>
          </div>
          <Link
            to="/artigos"
            className="group inline-flex items-center gap-2 text-[#1b3c37] font-semibold hover:text-[#132d29] transition-colors shrink-0"
          >
            Ver todos os artigos
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Grid de cards */}
        {loading ? (
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse border border-[#e4ded5]">
                <div className="h-48 bg-[#f4efe6]" />
                <div className="p-6 space-y-3">
                  <div className="h-4 bg-[#f4efe6] rounded w-1/3" />
                  <div className="h-5 bg-[#f4efe6] rounded w-full" />
                  <div className="h-5 bg-[#f4efe6] rounded w-3/4" />
                  <div className="h-4 bg-[#f4efe6] rounded w-full" />
                  <div className="h-4 bg-[#f4efe6] rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {artigos.map((artigo, index) => (
              <motion.div
                key={artigo.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: index * 0.1 }}
              >
                <Link
                  to={`/artigos/${artigo.slug}`}
                  className="group flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 border border-[#e4ded5] h-full"
                >
                  {/* Imagem de capa */}
                  <div className="h-48 overflow-hidden bg-[#1b3c37]/10 relative">
                    {artigo.cover_image_url ? (
                      <img
                        src={artigo.cover_image_url}
                        alt={artigo.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-12 h-12 text-[#1b3c37]/30" />
                      </div>
                    )}
                    {/* Overlay sutil no hover */}
                    <div className="absolute inset-0 bg-[#2d8659]/0 group-hover:bg-[#2d8659]/10 transition-colors duration-300" />
                  </div>

                  {/* Conteúdo */}
                  <div className="p-6 flex flex-col flex-grow">
                    <div className="flex items-center text-xs text-gray-400 mb-3 gap-2">
                      <Calendar className="w-3 h-3" />
                      {formatDate(artigo.published_at)}
                    </div>

                    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 leading-snug group-hover:text-[#2d8659] transition-colors">
                      {artigo.title}
                    </h3>

                    <p className="text-gray-500 text-sm line-clamp-3 flex-grow leading-relaxed">
                      {artigo.description}
                    </p>

                    <div className="mt-4 flex items-center text-[#2d8659] text-sm font-semibold gap-1">
                      Ler artigo
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* CTA Newsletter (Lead Capture) */}
        {!loading && artigos.length > 0 && (
          <div className="mt-16 bg-[#2d8659] rounded-2xl p-8 md:p-10 text-center text-white shadow-lg relative overflow-hidden">
            {/* Elemento decorativo de fundo */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 opacity-10">
              <Rss className="w-48 h-48" />
            </div>
            
            <div className="relative z-10 max-w-3xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-left">
                <h3 className="text-2xl font-bold mb-2">Gostou das reflexões?</h3>
                <p className="text-green-100 max-w-xl">
                  Inscreva-se na nossa newsletter gratuita e receba novos artigos semanalmente, direto no seu e-mail.
                </p>
              </div>
              <a
                href="https://doxologosoficial.substack.com/subscribe"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-2 bg-white text-[#2d8659] font-bold px-6 py-3 rounded-xl hover:bg-green-50 transition-colors shadow-sm"
              >
                Inscrever-se gratuitamente
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default BlogPreviewSection;
