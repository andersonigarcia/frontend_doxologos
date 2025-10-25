
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from '@/components/ui/toaster';
import HomePage from '@/pages/HomePage';
import AgendamentoPage from '@/pages/AgendamentoPage';
import AdminPage from '@/pages/AdminPage';
import QuemSomosPage from '@/pages/QuemSomosPage';
import TrabalheConoscoPage from '@/pages/TrabalheConoscoPage';
import EventoDetalhePage from '@/pages/EventoDetalhePage';
import PacientePage from '@/pages/PacientePage';
import CreateUsersPage from '@/pages/CreateUsersPage';
import DoacaoPage from '@/pages/DoacaoPage';
import FloatingWhatsAppButton from '@/components/FloatingWhatsAppButton';

function App() {
  return (
    <HelmetProvider>
      <Router>
        <div className="min-h-screen">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/agendamento" element={<AgendamentoPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/area-do-paciente" element={<PacientePage />} />
            <Route path="/quem-somos" element={<QuemSomosPage />} />
            <Route path="/trabalhe-conosco" element={<TrabalheConoscoPage />} />
            <Route path="/doacao" element={<DoacaoPage />} />
            <Route path="/evento/:slug" element={<EventoDetalhePage />} />
            <Route path="/criar-usuarios" element={<CreateUsersPage />} />
          </Routes>
          <Toaster />
          <FloatingWhatsAppButton />
        </div>
      </Router>
    </HelmetProvider>
  );
}

export default App;
