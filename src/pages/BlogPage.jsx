import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { Calendar, User, ArrowRight, Rss } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import HomeHeader from '@/components/home/HomeHeader';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const BlogPage = () => {
  const [artigos, setArtigos] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, userRole, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchArtigos();
  }, []);

  const fetchArtigos = async () => {
    try {
      const { data, error } = await supabase
        .from('artigos')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (error) throw error;
      setArtigos(data || []);
    } catch (error) {
      console.error('Erro ao buscar artigos:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Helmet>
        <title>Blog e Artigos - Doxologos</title>
        <meta name="description" content="Leia nossos artigos sobre psicologia, fé e bem-estar." />
      </Helmet>

      <HomeHeader
        activeEventsCount={0}
        user={user}
        userRole={userRole}
        onLogout={() => {
          signOut();
          setMobileMenuOpen(false);
        }}
        mobileMenuOpen={mobileMenuOpen}
        onToggleMenu={() => setMobileMenuOpen((prev) => !prev)}
      />

      <main className="flex-grow pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">

        {/* Hero do Blog */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <Rss className="w-4 h-4" />
            Publicado via Substack
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Blog <span className="text-[#2d8659]">Doxologos</span>
          </h1>
          <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
            Reflexões sobre saúde mental, fé e bem-estar integral.
          </p>
        </div>

        {/* Grid de artigos */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-12 h-12 border-4 border-[#2d8659] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : artigos.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            Nenhum artigo publicado no momento. Volte em breve!
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {artigos.map((artigo) => (
              <Link
                key={artigo.id}
                to={`/artigos/${artigo.slug}`}
                className="group flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100"
              >
                <div className="h-48 w-full bg-gray-200 overflow-hidden relative">
                  {artigo.cover_image_url ? (
                    <img
                      src={artigo.cover_image_url}
                      alt={artigo.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#2d8659]/10 text-[#2d8659]">
                      <span className="font-bold text-xl opacity-50">Doxologos</span>
                    </div>
                  )}
                </div>

                <div className="p-6 flex flex-col flex-grow">
                  <div className="flex items-center text-xs text-gray-500 mb-3 space-x-4">
                    <div className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {formatDate(artigo.published_at)}
                    </div>
                    {artigo.author && (
                      <div className="flex items-center">
                        <User className="w-3 h-3 mr-1" />
                        <span className="truncate max-w-[100px]">{artigo.author}</span>
                      </div>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 leading-tight">
                    {artigo.title}
                  </h3>

                  <p className="text-gray-600 mb-4 line-clamp-3 text-sm flex-grow">
                    {artigo.description}
                  </p>

                  <div className="mt-auto flex items-center text-[#2d8659] font-medium group-hover:text-[#236b47] text-sm transition-colors">
                    Ler artigo completo
                    <ArrowRight className="w-4 h-4 ml-1 transform transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Newsletter Substack - após os artigos */}
        <div className="mt-20">
          <div className="max-w-2xl mx-auto bg-[#2d8659] rounded-2xl p-8 text-center text-white shadow-lg">
            <Rss className="w-10 h-10 mx-auto mb-4 opacity-80" />
            <h2 className="text-2xl font-bold mb-2">Receba novos artigos por e-mail</h2>
            <p className="text-green-100 mb-6 text-sm">
              Inscreva-se na nossa newsletter gratuita e receba reflexões exclusivas semanalmente diretamente no seu inbox.
            </p>
            <a
              href="https://doxologosoficial.substack.com/subscribe"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-[#2d8659] font-semibold px-6 py-3 rounded-xl hover:bg-green-50 transition-colors"
            >
              Inscrever-se gratuitamente
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </main>

      <footer className="bg-gray-900 text-white py-12 mt-auto">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400 text-sm">&copy; {new Date().getFullYear()} Doxologos. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default BlogPage;
