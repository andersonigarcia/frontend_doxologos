import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  TrendingUp,
  Users,
  Settings,
  Briefcase,
  Clock,
  Star,
  Ticket,
  FileText,
  DollarSign,
  Building2,
  Receipt,
  ClipboardList,
  Newspaper,
  UserCircle,
  ChevronRight,
  ShieldCheck,
  BookOpen,
  Sparkles,
  KeyRound,
  Activity
} from 'lucide-react';
import { tabsConfig } from '@/config/tabsConfig';

export const ADMIN_MODULES = [
  {
    id: 'cockpit',
    title: '1. Cockpit Estratégico',
    description: 'KPIs Vitais, Projeções e Alertas Executivos',
    icon: LayoutDashboard,
    tabs: [
      { id: 'dashboard', label: 'Dashboard & KPIs', icon: LayoutDashboard },
    ]
  },
  {
    id: 'operacao',
    title: '2. Operação da Clínica',
    description: 'Gestão de Agenda, Consultas e Grades',
    icon: Calendar,
    tabs: [
      { id: 'retention-ops', label: 'Retenção & No-Show', icon: Activity },
      { id: 'bookings', label: 'Agendamentos', icon: Calendar },
      { id: 'availability', label: 'Disponibilidade / Grades', icon: Clock },
    ]
  },
  {
    id: 'financeiro',
    title: '3. Controladoria & DRE',
    description: 'DRE Consolidada, MP, Ledger e Reembolsos',
    icon: TrendingUp,
    tabs: [
      { id: 'financial-control', label: 'DRE & Controladoria', icon: TrendingUp },
      { id: 'ai-economics', label: 'Copiloto IA & Custos', icon: Sparkles },
      { id: 'profit-loss', label: 'Lucro / Prejuízo (DRE)', icon: TrendingUp },
      { id: 'financeiro', label: 'Meu Faturamento', icon: DollarSign },
      { id: 'payments', label: 'Pagamentos / Checkout', icon: DollarSign },
      { id: 'livro-caixa', label: 'Livro Caixa', icon: FileText },
      { id: 'refunds', label: 'Reembolsos', icon: Receipt },
      { id: 'nfse', label: 'Resiliência NFS-e', icon: Building2 },
    ]
  },
  {
    id: 'pessoas',
    title: '4. Pessoas & CRM',
    description: 'Profissionais, Pacientes e Depoimentos',
    icon: Users,
    tabs: [
      { id: 'professionals', label: 'Profissionais / Perfil', icon: Users },
      { id: 'patients', label: 'Pacientes', icon: UserCircle },
      { id: 'reviews', label: 'Avaliações', icon: Star },
    ]
  },
  {
    id: 'marketing',
    title: '5. Growth & Marketing',
    description: 'Metas, Funil, Leads e Eventos',
    icon: Sparkles,
    tabs: [
      { id: 'growth', label: 'Growth & Metas', icon: TrendingUp },
      { id: 'assessment-leads', label: 'Leads & GAD-7', icon: Sparkles },
      { id: 'events', label: 'Eventos', icon: Ticket },
      { id: 'event-registrations', label: 'Inscrições em Eventos', icon: ClipboardList },
      { id: 'blog', label: 'Blog & Substack', icon: Newspaper },
      { id: 'book-resources', label: 'Materiais do Livro', icon: BookOpen },
    ]
  },
  {
    id: 'configuracoes',
    title: '6. Configurações',
    description: 'Serviços, Preços e Ajustes de Sistema',
    icon: Settings,
    tabs: [
      { id: 'services', label: 'Serviços & Preços', icon: Briefcase },
      { id: 'settings', label: 'Configurações de Sistema', icon: Settings },
    ]
  }
];

export function AdminSidebar({
  activeModule,
  setActiveModule,
  activeTab,
  setActiveTab,
  userRole = 'admin',
  userName = 'Administrador',
  pendingAlertsCount = 0,
  onOpenChangePassword,
  onClose,
  isMobile = false
}) {
  const isProfessional = userRole === 'professional';

  // Filtrar módulos por papel (admin vs professional)
  const availableModules = ADMIN_MODULES.map(module => {
    const currentTabs = tabsConfig[userRole] || tabsConfig.admin;
    const allowedTabIds = currentTabs.map(t => t.value);

    const filteredTabs = module.tabs.filter(tab => allowedTabIds.includes(tab.id));

    return {
      ...module,
      tabs: filteredTabs
    };
  }).filter(module => module.tabs.length > 0);

  const handleSelectTab = (moduleId, tabId) => {
    setActiveModule(moduleId);
    setActiveTab(tabId);
    if (onClose) {
      onClose();
    }
  };

  return (
    <aside className={`w-full ${isMobile ? 'h-full bg-[#fcfbf9]' : 'w-64 bg-[#fcfbf9] min-h-screen border-r border-[#e4ded5]'} text-[#262624] flex flex-col flex-shrink-0 shadow-xs select-none`}>
      {/* Header do Painel */}
      <div className="p-4 sm:p-5 border-b border-[#e4ded5] bg-[#f8f6f0]/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1b3c37] text-[#f8f6f0] flex items-center justify-center font-bold font-serif text-xl shadow-xs">
            D
          </div>
          <div>
            <h2 className="font-serif font-bold text-[#1b3c37] text-base tracking-tight">Doxologos</h2>
            <p className="text-[11px] text-[#1b3c37]/80 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1b3c37]" />
              {isProfessional ? 'Painel do Psicólogo' : 'Painel Executivo'}
            </p>
          </div>
        </div>

        {isMobile && onClose && (
          <button
            onClick={onClose}
            aria-label="Fechar menu"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-[#e4ded5] text-[#262624] hover:bg-[#f4efe6] transition-colors"
          >
            <span className="text-xl leading-none">&times;</span>
          </button>
        )}
      </div>

      {/* Navegação por Módulos */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 custom-scrollbar">
        {availableModules.map((module) => {
          const ModuleIcon = module.icon;
          const isModuleActive = activeModule === module.id || module.tabs.some(t => t.id === activeTab);

          return (
            <div key={module.id} className="space-y-1">
              {/* Título do Módulo */}
              <button
                onClick={() => {
                  setActiveModule(module.id);
                  if (module.tabs.length > 0 && !module.tabs.some(t => t.id === activeTab)) {
                    handleSelectTab(module.id, module.tabs[0].id);
                  }
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all min-h-[42px] ${
                  isModuleActive
                    ? 'text-[#1b3c37] bg-[#f4efe6] border border-[#e4ded5]'
                    : 'text-[#262624]/70 hover:text-[#1b3c37] hover:bg-[#f4efe6]/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 text-left">
                  <ModuleIcon className={`w-4 h-4 shrink-0 ${isModuleActive ? 'text-[#1b3c37]' : 'text-[#9bab9b]'}`} />
                  <span className="truncate">{module.title}</span>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${isModuleActive ? 'rotate-90 text-[#1b3c37]' : 'text-[#9bab9b]'}`} />
              </button>

              {/* Sub-tabs do Módulo */}
              {isModuleActive && (
                <div className="pl-2 space-y-1 border-l-2 border-[#1b3c37]/20 ml-4 my-1.5">
                  {module.tabs.map((tab) => {
                    const TabIcon = tab.icon;
                    const isTabActive = activeTab === tab.id;

                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleSelectTab(module.id, tab.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 sm:py-2 text-xs rounded-lg font-medium transition-all min-h-[38px] ${
                          isTabActive
                            ? 'bg-[#1b3c37] text-white font-semibold shadow-xs'
                            : 'text-[#262624]/80 hover:text-[#1b3c37] hover:bg-[#f4efe6]/80'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 text-left truncate">
                          <TabIcon className={`w-3.5 h-3.5 shrink-0 ${isTabActive ? 'text-[#9bab9b]' : 'text-[#262624]/50'}`} />
                          <span className="truncate">{tab.label}</span>
                        </div>

                        {tab.id === 'bookings' && pendingAlertsCount > 0 && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ml-1.5 ${
                            isTabActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900 border border-amber-200'
                          }`}>
                            {pendingAlertsCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* User Footer Profile */}
      <div className="p-3 sm:p-4 border-t border-[#e4ded5] bg-[#f8f6f0]/70 flex flex-col gap-2.5 text-xs">
        <div className="flex items-center gap-2.5 truncate">
          <div className="w-8 h-8 rounded-full bg-[#1b3c37]/10 text-[#1b3c37] border border-[#1b3c37]/20 flex items-center justify-center font-bold shrink-0">
            {userName.charAt(0)}
          </div>
          <div className="truncate">
            <p className="font-semibold text-[#262624] truncate">{userName}</p>
            <p className="text-[10px] text-[#262624]/60 capitalize">{userRole}</p>
          </div>
        </div>

        {onOpenChangePassword && (
          <button
            onClick={() => {
              if (onClose) onClose();
              onOpenChangePassword();
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[#1b3c37] hover:bg-[#f4efe6] transition-colors border border-[#e4ded5] bg-white shadow-xs min-h-[38px]"
          >
            <KeyRound className="w-3.5 h-3.5 text-[#1b3c37]" />
            Alterar Minha Senha
          </button>
        )}
      </div>
    </aside>
  );
}

export default AdminSidebar;
