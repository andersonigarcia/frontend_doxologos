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
  ShieldCheck
} from 'lucide-react';

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
      { id: 'payments', label: 'Pagamentos / Checkout', icon: DollarSign },
      { id: 'livro-caixa', label: 'Livro Caixa', icon: FileText },
      { id: 'refunds', label: 'Reembolsos', icon: Receipt },
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
    id: 'plataforma',
    title: '5. Plataforma & Conteúdo',
    description: 'Serviços, Eventos, Blog e Fiscal',
    icon: Settings,
    tabs: [
      { id: 'services', label: 'Serviços & Preços', icon: Briefcase },
      { id: 'events', label: 'Eventos', icon: Ticket },
      { id: 'event-registrations', label: 'Inscrições em Eventos', icon: ClipboardList },
      { id: 'blog', label: 'Blog & Substack', icon: Newspaper },
      { id: 'nfse', label: 'Resiliência NFS-e', icon: Building2 },
      { id: 'settings', label: 'Configurações', icon: Settings },
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
  pendingAlertsCount = 0
}) {
  const isProfessional = userRole === 'professional';

  // Filtrar módulos por papel (admin vs professional)
  const availableModules = ADMIN_MODULES.map(module => {
    const filteredTabs = module.tabs.filter(tab => {
      if (isProfessional) {
        if (tab.id === 'blog' || tab.id === 'nfse' || tab.id === 'event-registrations') return false;
      }
      return true;
    });

    return {
      ...module,
      tabs: filteredTabs
    };
  }).filter(module => module.tabs.length > 0);

  return (
    <aside className="w-64 bg-white text-slate-800 flex flex-col flex-shrink-0 min-h-screen border-r border-slate-200 shadow-sm">
      {/* Header do Painel */}
      <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2d8659] text-white flex items-center justify-center font-bold text-xl shadow-md">
            D
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-sm tracking-wide">Doxologos</h2>
            <p className="text-xs text-[#2d8659] font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              {isProfessional ? 'Painel do Psicólogo' : 'Painel de Controle'}
            </p>
          </div>
        </div>
      </div>

      {/* Navegação por Módulos */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
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
                    setActiveTab(module.tabs[0].id);
                  }
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors ${
                  isModuleActive
                    ? 'text-[#2d8659] bg-emerald-50/80'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ModuleIcon className="w-4 h-4 text-[#2d8659]" />
                  <span>{module.title}</span>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isModuleActive ? 'rotate-90 text-[#2d8659]' : 'text-slate-400'}`} />
              </button>

              {/* Sub-tabs do Módulo */}
              {isModuleActive && (
                <div className="pl-3 space-y-1 border-l-2 border-emerald-100 ml-3.5 my-1">
                  {module.tabs.map((tab) => {
                    const TabIcon = tab.icon;
                    const isTabActive = activeTab === tab.id;

                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveModule(module.id);
                          setActiveTab(tab.id);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-md font-medium transition-all ${
                          isTabActive
                            ? 'bg-[#2d8659] text-white font-semibold shadow-sm'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <TabIcon className={`w-3.5 h-3.5 ${isTabActive ? 'text-white' : 'text-slate-400'}`} />
                          <span>{tab.label}</span>
                        </div>

                        {tab.id === 'bookings' && pendingAlertsCount > 0 && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            isTabActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
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
      <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5 truncate">
          <div className="w-8 h-8 rounded-full bg-[#2d8659]/10 text-[#2d8659] border border-[#2d8659]/20 flex items-center justify-center font-bold">
            {userName.charAt(0)}
          </div>
          <div className="truncate">
            <p className="font-semibold text-slate-800 truncate">{userName}</p>
            <p className="text-[10px] text-slate-500 capitalize">{userRole}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default AdminSidebar;
