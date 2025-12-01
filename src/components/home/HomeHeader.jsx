import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import UserBadge from '@/components/UserBadge';

const HomeHeader = ({ activeEventsCount = 0, user, userRole, onLogout, mobileMenuOpen, onToggleMenu }) => {
  const navigationItems = [
    { href: '#inicio', label: 'Início' },
    ...(activeEventsCount > 0 ? [{ href: '#eventos', label: 'Eventos' }] : []),
    { href: '#profissionais', label: 'Profissionais' },
    { href: '#depoimentos', label: 'Depoimentos' },
    { href: '#contato', label: 'Contato' },
  ];

  return (
    <header className="fixed top-0 w-full bg-white/95 backdrop-blur-sm shadow-sm z-50">
      <nav className="container mx-auto px-4 py-4" role="navigation" aria-label="Navegação principal">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2" aria-label="Doxologos - Página inicial">
            <img src="/favicon.svg" alt="Doxologos Logo" className="w-8 h-8" />
            <span className="text-2xl font-bold gradient-text">Doxologos</span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            {navigationItems.map((item) => (
              <a key={item.href} href={item.href} className="text-gray-700 hover:text-[#2d8659] transition-colors">
                {item.label}
              </a>
            ))}
            {!user && (
              <Link to="/area-do-paciente" className="text-gray-700 hover:text-[#2d8659] transition-colors">
                Área do Paciente
              </Link>
            )}
            {user ? (
              <>
                <div className="h-6 w-px bg-gray-300" />
                <UserBadge user={user} userRole={userRole} onLogout={onLogout} layout="row" showLogoutButton />
              </>
            ) : (
              <Link to="/agendamento">
                <Button className="bg-[#2d8659] hover:bg-[#236b47]">Encontre seu psicólogo</Button>
              </Link>
            )}
          </div>

          <button
            className="md:hidden"
            onClick={onToggleMenu}
            aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden mt-4 pb-4 space-y-4"
            id="mobile-menu"
            role="menu"
            aria-labelledby="mobile-menu-button"
          >
            {navigationItems.map((item) => (
              <a key={item.href} href={item.href} className="block text-gray-700 hover:text-[#2d8659]" role="menuitem">
                {item.label}
              </a>
            ))}
            {!user && (
              <Link to="/area-do-paciente" className="block text-gray-700 hover:text-[#2d8659]" role="menuitem">
                Área do Paciente
              </Link>
            )}
            {user ? (
              <div className="border-t border-gray-200 pt-4">
                <UserBadge
                  user={user}
                  userRole={userRole}
                  onLogout={onLogout}
                  layout="column"
                  showLogoutButton
                  compact
                />
              </div>
            ) : (
              <Link to="/agendamento">
                <Button className="w-full bg-[#2d8659] hover:bg-[#236b47]">Agendar Consulta</Button>
              </Link>
            )}
          </motion.div>
        )}
      </nav>
    </header>
  );
};

export default HomeHeader;
