import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Sparkles, Heart } from 'lucide-react';
import AssessmentRunner from '@/components/assessment/AssessmentRunner';
import { getAssessmentByIdentifier } from '@/data/assessments';
import DoxologosLogo from '@/components/brand/DoxologosLogo';

const AssessmentPage = () => {
  const { slug } = useParams();

  // Se não houver slug (ex: rota /teste-ansiedade direta), usamos 'gad-7' por padrão
  const assessment = useMemo(() => {
    return getAssessmentByIdentifier(slug || 'gad-7');
  }, [slug]);

  if (!assessment) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-white rounded-3xl p-8 max-w-md shadow-lg border border-gray-100 space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Ferramenta Não Encontrada</h2>
          <p className="text-sm text-gray-600">
            A ferramenta de autoavaliação solicitada não foi localizada ou foi movida.
          </p>
          <Link
            to="/ferramentas"
            className="inline-flex items-center gap-2 bg-[#2d8659] text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#236b46] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Ver Todas as Ferramentas</span>
          </Link>
        </div>
      </div>
    );
  }

  const pageTitle = `${assessment.title} | Doxologos Psicologia`;
  const metaDescription = assessment.subtitle || assessment.description;

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 via-white to-gray-50/60 text-gray-800">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={metaDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:type" content="website" />
        <link rel="canonical" href={`https://novo.doxologos.com.br/ferramentas/${assessment.slug}`} />
      </Helmet>

      {/* Header Compacto da Avaliação */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" aria-label="Voltar para a página inicial">
            <DoxologosLogo className="h-8 w-auto" />
          </Link>

          <div className="flex items-center gap-4">
            <Link
              to="/ferramentas"
              className="text-xs sm:text-sm font-semibold text-gray-600 hover:text-[#2d8659] transition-colors hidden sm:inline-flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Outras Ferramentas</span>
            </Link>

            <Link
              to="/agendamento"
              className="bg-[#2d8659] hover:bg-[#236b46] text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl shadow-sm transition-colors"
            >
              Agendar Consulta
            </Link>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal do Teste */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <AssessmentRunner assessment={assessment} />
      </main>

      {/* Rodapé Simplificado */}
      <footer className="border-t border-gray-100 py-8 bg-white text-center text-xs text-gray-600">
        <div className="max-w-6xl mx-auto px-4 space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-gray-600">
            <span>Doxologos Psicologia — Cuidado Integral da Mente e do Espírito</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
          </div>
          <p className="text-[11px] text-gray-600">
            Atendimento 100% online em conformidade com o Conselho Federal de Psicologia (CFP).
          </p>
        </div>
      </footer>
    </div>
  );
};

export default AssessmentPage;
