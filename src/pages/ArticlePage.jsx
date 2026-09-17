import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { createClient } from '@supabase/supabase-js';
import { ArrowLeft, Calendar, User, Share2 } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import HomeHeader from '@/components/home/HomeHeader';
import SiteFooter from '@/components/common/SiteFooter';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const ArticlePage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [artigo, setArtigo] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user, userRole, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchArtigo(slug);
    }
  }, [slug]);

  const fetchArtigo = async (articleSlug) => {
    try {
      const { data, error } = await supabase
        .from('artigos')
        .select('*')
        .eq('slug', articleSlug)
        .eq('status', 'published')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Não encontrado
          navigate('/artigos', { replace: true });
        } else {
          throw error;
        }
      }
      
      setArtigo(data);
    } catch (error) {
      console.error('Erro ao buscar artigo:', error);
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

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: artigo.title,
        text: artigo.description,
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copiado para a área de transferência!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!artigo) return null;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Helmet>
        <title>{artigo.title} - Doxologos</title>
        <meta name="description" content={artigo.description} />
        <meta property="og:title" content={artigo.title} />
        <meta property="og:description" content={artigo.description} />
        <meta property="og:type" content="article" />
        {artigo.cover_image_url && <meta property="og:image" content={artigo.cover_image_url} />}
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: artigo.title,
            description: artigo.description,
            image: artigo.cover_image_url || 'https://doxologos.com.br/og-image.jpg',
            author: {
              '@type': 'Person',
              name: artigo.author || 'Equipe Doxologos'
            },
            publisher: {
              '@type': 'Organization',
              name: 'Doxologos',
              logo: {
                '@type': 'ImageObject',
                url: 'https://doxologos.com.br/logo.png'
              }
            },
            datePublished: artigo.published_at || new Date().toISOString(),
            dateModified: artigo.updated_at || artigo.published_at || new Date().toISOString()
          })}
        </script>
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

      <main className="flex-grow pt-24 pb-16">
        <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <Link to="/artigos" className="inline-flex items-center text-sm font-medium text-primary hover:text-primary-hover mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para o Blog
          </Link>

          <header className="mb-10 text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-6">
              {artigo.title}
            </h1>
            
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-500 mb-8">
              {artigo.author && (
                <div className="flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  {artigo.author}
                </div>
              )}
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                {formatDate(artigo.published_at)}
              </div>
            </div>

            {artigo.cover_image_url && (
              <div className="w-full aspect-video rounded-2xl overflow-hidden mb-10 shadow-lg">
                <img 
                  src={artigo.cover_image_url} 
                  alt={artigo.title} 
                  className="w-full h-full object-cover" width={128} height={128} loading="lazy"
                />
              </div>
            )}
          </header>

          <div 
            className="prose prose-lg sm:prose-xl max-w-none prose-primary prose-a:text-primary hover:prose-a:text-primary-hover prose-img:rounded-xl mx-auto"
            dangerouslySetInnerHTML={{ __html: artigo.content_html }}
          />

          <hr className="my-10 border-gray-200" />

          {/* Banner de Conversão de Autoavaliação Clínica no Artigo */}
          <div className="bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white rounded-3xl p-6 sm:p-8 border border-emerald-200/80 shadow-md shadow-emerald-900/5 my-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div>
                <span className="inline-block text-xs font-bold uppercase tracking-wider text-[#2d8659] bg-emerald-100/70 px-3 py-1 rounded-full mb-2">
                  Autoavaliação Gratuita & Confidencial
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                  Descubra como está a sua saúde emocional
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed max-w-xl">
                  Realize autoavaliações clínicas rápidas de ansiedade, estresse, sono, foco ou relacionamentos e receba orientações personalizadas em minutos.
                </p>
              </div>

              <Link to="/ferramentas" className="shrink-0 w-full sm:w-auto">
                <button
                  type="button"
                  className="w-full sm:w-auto bg-[#2d8659] hover:bg-[#236b46] text-white px-6 py-3.5 rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <span>Fazer Teste Grátis</span>
                  <span>→</span>
                </button>
              </Link>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <p className="text-gray-500 text-sm font-medium">Gostou deste artigo? Compartilhe!</p>
            <button 
              onClick={handleShare}
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition-colors"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Compartilhar
            </button>
          </div>


        </article>
      </main>

      <SiteFooter />
    </div>
  );
};

export default ArticlePage;
