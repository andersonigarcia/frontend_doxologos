import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Menu, X, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import UserBadge from '@/components/UserBadge';
import DoxologosLogo from '@/components/brand/DoxologosLogo';

const HomeHeader = ({ activeEventsCount = 0, user, userRole, onLogout, mobileMenuOpen, onToggleMenu }) => {
  const navigationItems = [
    { href: '/#inicio', label: 'Início' },
    ...(activeEventsCount > 0 ? [{ href: '/#eventos', label: 'Eventos' }] : []),
    { href: '/#profissionais', label: 'Profissionais' },
    { href: '/#depoimentos', label: 'Depoimentos' },
    { href: '/#contato', label: 'Contato' },
  ];

  const blogNavItem = { to: '/artigos', label: 'Blog' };

  return (
    <header className="fixed top-0 w-full bg-[#f8f6f0]/95 backdrop-blur-md border-b border-[#e4ded5] shadow-xs z-50">
      <nav className="container mx-auto px-4 py-3.5" role="navigation" aria-label="Navegação principal">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2" aria-label="Doxologos - Página inicial">
            <DoxologosLogo className="h-9 md:h-10 w-auto" />
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            {navigationItems
              .filter((item) => !['Início', 'Depoimentos', 'Contato'].includes(item.label))
              .map((item) => (
                <a key={item.href} href={item.href} className="text-[#262624] hover:text-[#1b3c37] transition-colors font-medium text-sm">
                  {item.label}
                </a>
            ))}
            <Link
              to={blogNavItem.to}
              className="text-[#262624] hover:text-[#1b3c37] transition-colors font-medium text-sm"
            >
              {blogNavItem.label}
            </Link>
            {!user && (
              <Link to="/area-do-paciente" className="text-[#262624] hover:text-[#1b3c37] transition-colors font-medium text-sm">
                Área do Paciente
              </Link>
            )}
            {user ? (
              <>
                <div className="h-6 w-px bg-[#e4ded5]" />
                <UserBadge user={user} userRole={userRole} onLogout={onLogout} layout="row" showLogoutButton />
              </>
            ) : (
              <Link to="/agendamento">
                <Button className="bg-[#1b3c37] hover:bg-[#132d29] text-[#f0ebe1] flex items-center gap-2 shadow-sm font-medium">
                  <Calendar className="w-4 h-4" />
                  Agendar Consulta
                </Button>
              </Link>
            )}
          </div>

          <button
            className="md:hidden p-2 rounded-lg text-[#1b3c37] hover:bg-[#e4ded5]/50"
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
            className="md:hidden mt-4 pb-4 space-y-4 border-t border-[#e4ded5] pt-4"
            id="mobile-menu"
            role="menu"
            aria-labelledby="mobile-menu-button"
          >
            {navigationItems.map((item) => (
              <a key={item.href} href={item.href} className="block text-[#262624] hover:text-[#1b3c37] font-medium" role="menuitem">
                {item.label}
              </a>
            ))}
            <Link to={blogNavItem.to} className="block text-[#262624] hover:text-[#1b3c37] font-medium" role="menuitem">
              {blogNavItem.label}
            </Link>
            {!user && (
              <Link to="/area-do-paciente" className="block text-[#262624] hover:text-[#1b3c37] font-medium" role="menuitem">
                Área do Paciente
              </Link>
            )}
            {user ? (
              <div className="border-t border-[#e4ded5] pt-4">
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
              <Link to="/agendamento" className="block pt-2">
                <Button className="w-full bg-[#1b3c37] hover:bg-[#132d29] text-[#f0ebe1] flex items-center justify-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Agendar Consulta
                </Button>
              </Link>
            )}
          </motion.div>
        )}
      </nav>
    </header>
  );
};

export default HomeHeader;
