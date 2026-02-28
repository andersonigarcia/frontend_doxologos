import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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

  // Track page views and errors
  usePageTracking();
  useComprehensiveErrorTracking('App');

  // Controle de sessão e inatividade
  useSessionTimeout({
    idleTimeout: 10 * 60 * 1000,       // 10 minutos de inatividade
    sessionTimeout: 1 * 60 * 60 * 1000, // 1 hora de sessão total
    warningTime: 2 * 60 * 1000,          // Avisar 2 minutos antes
    enabled: true
  });

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
            // SECURITY FIX (S-03): Admins e Profissionais acessam as rotas /admin (AdminPage tem lógica interna de visualização)
            <ProtectedRoute requiredRoles={['admin', 'professional']} redirectTo="/">
              <PageErrorBoundary pageName="Admin">
                <AdminPage />
              </PageErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/area-do-paciente" element={
            <PageErrorBoundary pageName="Área do Paciente">
              <PacientePage />
            </PageErrorBoundary>
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
        </Routes>
      </Suspense>
      <Toaster />
      <Suspense fallback={null}>
        <FloatingWhatsAppButton isHidden={shouldHideWhatsApp} />
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
