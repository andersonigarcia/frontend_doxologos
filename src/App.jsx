
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from '@/components/ui/toaster';
import ErrorBoundary, { PageErrorBoundary } from '@/components/ErrorBoundary';
import { usePageTracking } from '@/hooks/useAnalytics';
import { useComprehensiveErrorTracking } from '@/hooks/useErrorTracking';
import HomePage from '@/pages/HomePage';
import AgendamentoPage from '@/pages/AgendamentoPage';
import AdminPage from '@/pages/AdminPage';
import QuemSomosPage from '@/pages/QuemSomosPage';
import TrabalheConoscoPage from '@/pages/TrabalheConoscoPage';
import EventoDetalhePage from '@/pages/EventoDetalhePage';
import PacientePage from '@/pages/PacientePage';
import CreateUsersPage from '@/pages/CreateUsersPage';
import DoacaoPage from '@/pages/DoacaoPage';
import DepoimentoPage from '@/pages/DepoimentoPage';
import DepoimentosAdminPage from '@/pages/DepoimentosAdminPage';
import PagamentoSimuladoPage from '@/pages/PagamentoSimuladoPage';
import FloatingWhatsAppButton from '@/components/FloatingWhatsAppButton';

// Initialize Web Vitals monitoring
import '@/lib/webVitals';

function AppContent() {
  // Track page views and errors
  usePageTracking();
  useComprehensiveErrorTracking('App');

  return (
    <div className="min-h-screen">
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
          <PageErrorBoundary pageName="Admin">
            <AdminPage />
          </PageErrorBoundary>
        } />
        <Route path="/area-do-paciente" element={
          <PageErrorBoundary pageName="Área do Paciente">
            <PacientePage />
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
          <PageErrorBoundary pageName="Admin Depoimentos">
            <DepoimentosAdminPage />
          </PageErrorBoundary>
        } />
        <Route path="/evento/:slug" element={
          <PageErrorBoundary pageName="Evento Detalhe">
            <EventoDetalhePage />
          </PageErrorBoundary>
        } />
        <Route path="/criar-usuarios" element={
          <PageErrorBoundary pageName="Criar Usuários">
            <CreateUsersPage />
          </PageErrorBoundary>
        } />
        <Route path="/pagamento-simulado" element={
          <PageErrorBoundary pageName="Pagamento Simulado">
            <PagamentoSimuladoPage />
          </PageErrorBoundary>
        } />
      </Routes>
      <Toaster />
      <FloatingWhatsAppButton />
    </div>
  );
}

function App() {
  return (
    <HelmetProvider>
      <ErrorBoundary>
        <Router>
          <AppContent />
        </Router>
      </ErrorBoundary>
    </HelmetProvider>
  );
}

export default App;
