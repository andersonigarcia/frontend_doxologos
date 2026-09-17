import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import ErrorBoundary, { PageErrorBoundary } from '@/components/ErrorBoundary';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { usePageTracking } from '@/hooks/useAnalytics';
import { useComprehensiveErrorTracking } from '@/hooks/useErrorTracking';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';

// Initialize Web Vitals monitoring
import '@/lib/webVitals';

// PERF (P-01): HomePage permanece estático pois é a rota inicial —
// não há benefício em lazy-load no primeiro acesso.
import HomePage from '@/pages/HomePage';

// PERF (P-01): Todas as demais páginas em lazy para reduzir o bundle inicial.
// O Vite criará um chunk separado por página (code splitting automático).
const AgendamentoPage = lazy(() => import('@/pages/AgendamentoPage'));
const AdminPage = lazy(() => import('@/pages/AdminPage'));
const ProfessionalDashboardPage = lazy(() => import('@/pages/ProfessionalDashboardPage'));
const QuemSomosPage = lazy(() => import('@/pages/QuemSomosPage'));
const TrabalheConoscoPage = lazy(() => import('@/pages/TrabalheConoscoPage'));
const EventoDetalhePage = lazy(() => import('@/pages/EventoDetalhePage'));
const PacientePage = lazy(() => import('@/pages/PacientePage'));
const CreateUsersPage = lazy(() => import('@/pages/CreateUsersPage'));
const DoacaoPage = lazy(() => import('@/pages/DoacaoPage'));
const DepoimentoPage = lazy(() => import('@/pages/DepoimentoPage'));
const DepoimentosAdminPage = lazy(() => import('@/pages/DepoimentosAdminPage'));
const PagamentoSimuladoPage = lazy(() => import('@/pages/PagamentoSimuladoPage'));
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage'));
const CheckoutDirectPage = lazy(() => import('@/pages/CheckoutDirectPage'));
const CheckoutSuccessPage = lazy(() => import('@/pages/CheckoutSuccessPage'));
const CheckoutFailurePage = lazy(() => import('@/pages/CheckoutFailurePage'));
const CheckoutPendingPage = lazy(() => import('@/pages/CheckoutPendingPage'));
const PaymentsPage = lazy(() => import('@/pages/PaymentsPage'));
const RecuperarSenhaPage = lazy(() => import('@/pages/RecuperarSenhaPage'));
const RedefinirSenhaPage = lazy(() => import('@/pages/RedefinirSenhaPage'));
const MinhasInscricoesPage = lazy(() => import('@/pages/MinhasInscricoesPage'));
const AdminUsuariosPage = lazy(() => import('@/pages/AdminUsuariosPage'));
const TermosCondicoesPage = lazy(() => import('@/pages/TermosCondicoesPage'));
const FloatingWhatsAppButton = lazy(() => import('@/components/FloatingWhatsAppButton'));
const ManagementDashboardPage = lazy(() => import('@/pages/ManagementDashboardPage'));
const ProfessionalListPage = lazy(() => import('@/pages/admin/ProfessionalListPage'));
const ProfessionalHubPage = lazy(() => import('@/pages/admin/ProfessionalHubPage'));
const SalaEsperaPage = lazy(() => import('@/pages/SalaEsperaPage'));
const BlogPage = lazy(() => import('@/pages/BlogPage'));
const ArticlePage = lazy(() => import('@/pages/ArticlePage'));
const LgpdCookieBanner = lazy(() => import('@/components/common/LgpdCookieBanner'));
const BookResourcePage = lazy(() => import('@/pages/BookResourcePage'));
const AssessmentPage = lazy(() => import('@/pages/AssessmentPage'));
const AssessmentHubPage = lazy(() => import('@/pages/AssessmentHubPage'));
const TerapiaAnsiedadePage = lazy(() => import('@/pages/TerapiaAnsiedadePage'));
const TerapiaDepressaoPage = lazy(() => import('@/pages/TerapiaDepressaoPage'));
const TerapiaTdahPage = lazy(() => import('@/pages/TerapiaTdahPage'));
const TerapiaCasalPage = lazy(() => import('@/pages/TerapiaCasalPage'));
const TerapiaBurnoutPage = lazy(() => import('@/pages/TerapiaBurnoutPage'));
const TerapiaDependenciaPage = lazy(() => import('@/pages/TerapiaDependenciaPage'));
const TerapiaVicioApostasPage = lazy(() => import('@/pages/TerapiaVicioApostasPage'));
const TerapiaAbusoEspiritualPage = lazy(() => import('@/pages/TerapiaAbusoEspiritualPage'));
const FaturamentoMensalPage = lazy(() => import('@/pages/FaturamentoMensalPage'));



// PERF (P-02): QueryClient com staleTime e gcTime para evitar refetches desnecessários
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,   // dados considerados frescos por 5 minutos
      gcTime: 10 * 60 * 1000,     // cache mantido por 10 minutos após desmontagem
      retry: 2,
      refetchOnWindowFocus: false, // evita refetch ao trocar de aba
    },
  },
});

// Spinner de carregamento de página (exibido pelo Suspense durante lazy load)
const PageLoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-[#2d8659] border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-500 text-sm font-medium">Carregando...</p>
    </div>
  </div>
);

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();

  // Track page views and errors
  usePageTracking();
  useComprehensiveErrorTracking('App');

  // Controle de sessão e inatividade (parametrização dinâmica via admin + cross-tab sync)
  useSessionTimeout({
    enabled: true
  });

  // FIX: Quando o email de recuperação de senha redireciona para a raiz com ?code=,
  // redirecionar automaticamente para /redefinir-senha preservando o código PKCE.
  // Isso acontece quando o template de email do Supabase usa {{ .SiteURL }} em vez de {{ .ConfirmationURL }}.
  useEffect(() => {
    if (location.pathname === '/') {
      const params = new URLSearchParams(location.search);
      const code = params.get('code');
      if (code) {
        console.log('🔀 Código PKCE detectado na raiz, redirecionando para /redefinir-senha');
        navigate(`/redefinir-senha?code=${encodeURIComponent(code)}`, { replace: true });
      }
    }
  }, [location, navigate]);

  // Hide WhatsApp button on booking page to prevent overlap with conversion CTAs
  const shouldHideWhatsApp = location.pathname === '/agendamento';

  return (
    <div className="min-h-screen">
      {/* PERF (P-01): Suspense global — exibe spinner enquanto chunk da página carrega */}
      <Suspense fallback={<PageLoadingSpinner />}>
        <Routes>
          <Route path="/" element={
            <PageErrorBoundary pageName="Home">
              <HomePage />
            </PageErrorBoundary>
          } />
          <Route path="/agendamento" element={
            <PageErrorBoundary pageName="Agendamento">
              <AgendamentoPage />
            </PageErrorBoundary>
          } />
          <Route path="/admin" element={
            <ProtectedRoute requiredRoles={['admin']} redirectTo="/">
              <PageErrorBoundary pageName="Admin">
                <AdminPage />
              </PageErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/profissional" element={
            <ProtectedRoute requiredRoles={['professional', 'admin']} redirectTo="/">
              <PageErrorBoundary pageName="Profissional">
                <ProfessionalDashboardPage />
              </PageErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/admin/dashboard" element={
            <ProtectedRoute requiredRoles={['admin']} redirectTo="/">
              <PageErrorBoundary pageName="Dashboard Gerencial">
                <ManagementDashboardPage />
              </PageErrorBoundary>
            </ProtectedRoute>
          } />

          <Route path="/admin/professionals" element={
            <ProtectedRoute requiredRoles={['admin']} redirectTo="/">
              <PageErrorBoundary pageName="Admin Profissionais">
                <ProfessionalListPage />
              </PageErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/admin/professionals/:id" element={
            <ProtectedRoute requiredRoles={['admin']} redirectTo="/">
              <PageErrorBoundary pageName="Admin Hub Profissional">
                <ProfessionalHubPage />
              </PageErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/area-do-paciente" element={
            <PageErrorBoundary pageName="Área do Paciente">
              <PacientePage />
            </PageErrorBoundary>
          } />
          <Route path="/sala-espera/:id" element={
            <PageErrorBoundary pageName="Sala de Espera">
              <SalaEsperaPage />
            </PageErrorBoundary>
          } />
          <Route path="/faturamento-mensal" element={
            <ProtectedRoute>
              <PageErrorBoundary pageName="Faturamento Mensal">
                <FaturamentoMensalPage />
              </PageErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/recuperar-senha" element={
            <PageErrorBoundary pageName="Recuperar Senha">
              <RecuperarSenhaPage />
            </PageErrorBoundary>
          } />
          <Route path="/redefinir-senha" element={
            <PageErrorBoundary pageName="Redefinir Senha">
              <RedefinirSenhaPage />
            </PageErrorBoundary>
          } />
          <Route path="/artigos" element={
            <PageErrorBoundary pageName="Blog">
              <BlogPage />
            </PageErrorBoundary>
          } />
          <Route path="/artigos/:slug" element={
            <PageErrorBoundary pageName="Artigo">
              <ArticlePage />
            </PageErrorBoundary>
          } />
          <Route path="/quem-somos" element={
            <PageErrorBoundary pageName="Quem Somos">
              <QuemSomosPage />
            </PageErrorBoundary>
          } />
          <Route path="/trabalhe-conosco" element={
            <PageErrorBoundary pageName="Trabalhe Conosco">
              <TrabalheConoscoPage />
            </PageErrorBoundary>
          } />
          <Route path="/doacao" element={
            <PageErrorBoundary pageName="Doação">
              <DoacaoPage />
            </PageErrorBoundary>
          } />
          <Route path="/depoimento" element={
            <PageErrorBoundary pageName="Depoimento">
              <DepoimentoPage />
            </PageErrorBoundary>
          } />
          <Route path="/admin/depoimentos" element={
            <ProtectedRoute requiredRoles={['admin']} redirectTo="/">
              <PageErrorBoundary pageName="Admin Depoimentos">
                <DepoimentosAdminPage />
              </PageErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/evento/:slug" element={
            <PageErrorBoundary pageName="Evento Detalhe">
              <EventoDetalhePage />
            </PageErrorBoundary>
          } />
          <Route path="/minhas-inscricoes" element={
            <PageErrorBoundary pageName="Minhas Inscrições">
              <MinhasInscricoesPage />
            </PageErrorBoundary>
          } />
          <Route path="/termos-e-condicoes" element={
            <PageErrorBoundary pageName="Termos e Condições">
              <TermosCondicoesPage />
            </PageErrorBoundary>
          } />
          {/* Rota disponível apenas em desenvolvimento local */}
          <Route path="/criar-usuarios" element={
            import.meta.env.DEV
              ? <PageErrorBoundary pageName="Criar Usuários"><CreateUsersPage /></PageErrorBoundary>
              : <Navigate to="/" replace />
          } />
          <Route path="/pagamento-simulado" element={
            <PageErrorBoundary pageName="Pagamento Simulado">
              <PagamentoSimuladoPage />
            </PageErrorBoundary>
          } />
          <Route path="/checkout" element={
            <PageErrorBoundary pageName="Checkout">
              <CheckoutPage />
            </PageErrorBoundary>
          } />
          <Route path="/checkout-direct" element={
            <PageErrorBoundary pageName="Checkout Direct">
              <CheckoutDirectPage />
            </PageErrorBoundary>
          } />
          <Route path="/checkout/success" element={
            <PageErrorBoundary pageName="Checkout Success">
              <CheckoutSuccessPage />
            </PageErrorBoundary>
          } />
          <Route path="/checkout/failure" element={
            <PageErrorBoundary pageName="Checkout Failure">
              <CheckoutFailurePage />
            </PageErrorBoundary>
          } />
          <Route path="/checkout/pending" element={
            <PageErrorBoundary pageName="Checkout Pending">
              <CheckoutPendingPage />
            </PageErrorBoundary>
          } />
          <Route path="/admin/pagamentos" element={
            <ProtectedRoute requiredRoles={['admin']} redirectTo="/">
              <PageErrorBoundary pageName="Gerenciamento de Pagamentos">
                <PaymentsPage />
              </PageErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/admin/usuarios" element={
            <ProtectedRoute requiredRoles={['admin']} redirectTo="/">
              <PageErrorBoundary pageName="Gestão de Usuários">
                <AdminUsuariosPage />
              </PageErrorBoundary>
            </ProtectedRoute>
          } />
          {/* Landing Pages Específicas para SEO */}
          <Route path="/terapia/ansiedade" element={
            <PageErrorBoundary pageName="Terapia para Ansiedade">
              <TerapiaAnsiedadePage />
            </PageErrorBoundary>
          } />
          <Route path="/terapia/depressao" element={
            <PageErrorBoundary pageName="Terapia para Depressão">
              <TerapiaDepressaoPage />
            </PageErrorBoundary>
          } />
          <Route path="/terapia/tdah" element={
            <PageErrorBoundary pageName="Terapia para TDAH">
              <TerapiaTdahPage />
            </PageErrorBoundary>
          } />
          <Route path="/terapia/casal" element={
            <PageErrorBoundary pageName="Terapia de Casal">
              <TerapiaCasalPage />
            </PageErrorBoundary>
          } />
          <Route path="/terapia/burnout" element={
            <PageErrorBoundary pageName="Terapia para Burnout">
              <TerapiaBurnoutPage />
            </PageErrorBoundary>
          } />
          <Route path="/terapia/dependencia-emocional" element={
            <PageErrorBoundary pageName="Terapia para Dependência Emocional">
              <TerapiaDependenciaPage />
            </PageErrorBoundary>
          } />
          <Route path="/terapia/vicio-apostas" element={
            <PageErrorBoundary pageName="Terapia para Vício em Apostas">
              <TerapiaVicioApostasPage />
            </PageErrorBoundary>
          } />
          <Route path="/terapia/abuso-espiritual" element={
            <PageErrorBoundary pageName="Terapia para Abuso Espiritual">
              <TerapiaAbusoEspiritualPage />
            </PageErrorBoundary>
          } />
          <Route path="/r/:slug" element={
            <PageErrorBoundary pageName="Material do Livro">
              <BookResourcePage />
            </PageErrorBoundary>
          } />
          <Route path="/livro/:slug" element={
            <PageErrorBoundary pageName="Material do Livro">
              <BookResourcePage />
            </PageErrorBoundary>
          } />
          {/* Ferramentas de Autoavaliação Psicométrica (Lead Magnets / GAD-7) */}
          <Route path="/ferramentas" element={
            <PageErrorBoundary pageName="Central de Ferramentas">
              <AssessmentHubPage />
            </PageErrorBoundary>
          } />
          <Route path="/ferramentas/:slug" element={
            <PageErrorBoundary pageName="Autoavaliação Psicométrica">
              <AssessmentPage />
            </PageErrorBoundary>
          } />
          <Route path="/teste-ansiedade-gad7" element={
            <PageErrorBoundary pageName="Teste de Ansiedade GAD-7">
              <AssessmentPage />
            </PageErrorBoundary>
          } />
          <Route path="/teste-ansiedade" element={
            <PageErrorBoundary pageName="Teste de Ansiedade">
              <AssessmentPage />
            </PageErrorBoundary>
          } />
          <Route path="/teste-burnout" element={
            <PageErrorBoundary pageName="Inventário de Burnout e Sobrecarga Emocional">
              <AssessmentPage />
            </PageErrorBoundary>
          } />
          <Route path="/teste-esgotamento" element={
            <PageErrorBoundary pageName="Inventário de Burnout e Sobrecarga Emocional">
              <AssessmentPage />
            </PageErrorBoundary>
          } />
          <Route path="/teste-depressao" element={
            <PageErrorBoundary pageName="Escala de Depressão e Humor (PHQ-9)">
              <AssessmentPage />
            </PageErrorBoundary>
          } />
          <Route path="/teste-depressao-phq9" element={
            <PageErrorBoundary pageName="Escala de Depressão e Humor (PHQ-9)">
              <AssessmentPage />
            </PageErrorBoundary>
          } />
          <Route path="/teste-tdah" element={
            <PageErrorBoundary pageName="Escala de Rastreio de TDAH em Adultos (ASRS-18)">
              <AssessmentPage />
            </PageErrorBoundary>
          } />
          <Route path="/teste-tdah-adultos" element={
            <PageErrorBoundary pageName="Escala de Rastreio de TDAH em Adultos (ASRS-18)">
              <AssessmentPage />
            </PageErrorBoundary>
          } />
          <Route path="/teste-tdah-adultos-asrs18" element={
            <PageErrorBoundary pageName="Escala de Rastreio de TDAH em Adultos (ASRS-18)">
              <AssessmentPage />
            </PageErrorBoundary>
          } />
          <Route path="/teste-espiritualidade" element={
            <PageErrorBoundary pageName="Inventário de Culpa, Perfeccionismo e Saúde Espiritual">
              <AssessmentPage />
            </PageErrorBoundary>
          } />
          <Route path="/teste-culpa-perfeccionismo" element={
            <PageErrorBoundary pageName="Inventário de Culpa, Perfeccionismo e Saúde Espiritual">
              <AssessmentPage />
            </PageErrorBoundary>
          } />
          <Route path="/teste-culpa-perfeccionismo-espiritual" element={
            <PageErrorBoundary pageName="Inventário de Culpa, Perfeccionismo e Saúde Espiritual">
              <AssessmentPage />
            </PageErrorBoundary>
          } />
          <Route path="/teste-sono" element={
            <PageErrorBoundary pageName="Índice de Qualidade do Sono e Insônia (ISI)">
              <AssessmentPage />
            </PageErrorBoundary>
          } />
          <Route path="/teste-insonia" element={
            <PageErrorBoundary pageName="Índice de Qualidade do Sono e Insônia (ISI)">
              <AssessmentPage />
            </PageErrorBoundary>
          } />
          <Route path="/teste-qualidade-sono-insonia" element={
            <PageErrorBoundary pageName="Índice de Qualidade do Sono e Insônia (ISI)">
              <AssessmentPage />
            </PageErrorBoundary>
          } />
          <Route path="/teste-casamento" element={
            <PageErrorBoundary pageName="Avaliação de Conexão e Ajuste Conjugal (RDAS)">
              <AssessmentPage />
            </PageErrorBoundary>
          } />
          <Route path="/teste-relacionamento" element={
            <PageErrorBoundary pageName="Avaliação de Conexão e Ajuste Conjugal (RDAS)">
              <AssessmentPage />
            </PageErrorBoundary>
          } />
          <Route path="/teste-casamento-relacionamento-rdas" element={
            <PageErrorBoundary pageName="Avaliação de Conexão e Ajuste Conjugal (RDAS)">
              <AssessmentPage />
            </PageErrorBoundary>
          } />
          <Route path="/teste-dependencia-emocional" element={
            <PageErrorBoundary pageName="Inventário de Dependência Emocional e Autoestima">
              <AssessmentPage />
            </PageErrorBoundary>
          } />
          <Route path="/teste-autoestima" element={
            <PageErrorBoundary pageName="Inventário de Dependência Emocional e Autoestima">
              <AssessmentPage />
            </PageErrorBoundary>
          } />
          <Route path="/teste-dependencia-emocional-autoestima" element={
            <PageErrorBoundary pageName="Inventário de Dependência Emocional e Autoestima">
              <AssessmentPage />
            </PageErrorBoundary>
          } />
          <Route path="/teste-apostas" element={
            <PageErrorBoundary pageName="Rastreio de Transtorno de Jogos e Apostas (Ludopatia)">
              <AssessmentPage />
            </PageErrorBoundary>
          } />
          <Route path="/teste-ludopatia" element={
            <PageErrorBoundary pageName="Rastreio de Transtorno de Jogos e Apostas (Ludopatia)">
              <AssessmentPage />
            </PageErrorBoundary>
          } />
          <Route path="/teste-jogos-azar" element={
            <PageErrorBoundary pageName="Rastreio de Transtorno de Jogos e Apostas (Ludopatia)">
              <AssessmentPage />
            </PageErrorBoundary>
          } />
          <Route path="/teste-transtorno-jogos-apostas-ludopatia" element={
            <PageErrorBoundary pageName="Rastreio de Transtorno de Jogos e Apostas (Ludopatia)">
              <AssessmentPage />
            </PageErrorBoundary>
          } />
          <Route path="/teste-abuso-espiritual" element={
            <PageErrorBoundary pageName="Inventário de Violência Eclesiástica e Abuso Espiritual">
              <AssessmentPage />
            </PageErrorBoundary>
          } />
          <Route path="/teste-violencia-eclesiastica" element={
            <PageErrorBoundary pageName="Inventário de Violência Eclesiástica e Abuso Espiritual">
              <AssessmentPage />
            </PageErrorBoundary>
          } />
          <Route path="/teste-trauma-religioso" element={
            <PageErrorBoundary pageName="Inventário de Violência Eclesiástica e Abuso Espiritual">
              <AssessmentPage />
            </PageErrorBoundary>
          } />
          <Route path="/teste-abuso-espiritual-violencia-eclesiastica" element={
            <PageErrorBoundary pageName="Inventário de Violência Eclesiástica e Abuso Espiritual">
              <AssessmentPage />
            </PageErrorBoundary>
          } />









        </Routes>
      </Suspense>
      <Toaster />
      <Suspense fallback={null}>
        <FloatingWhatsAppButton isHidden={shouldHideWhatsApp} />
        <LgpdCookieBanner />
      </Suspense>
    </div>
  );
}


function App() {
  return (
    // PERF (P-02): QueryClientProvider no topo da árvore para todos os hooks useQuery
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <ErrorBoundary>
          <Router>
            <AppContent />
          </Router>
        </ErrorBoundary>
      </HelmetProvider>
    </QueryClientProvider>
  );
}

export default App;
