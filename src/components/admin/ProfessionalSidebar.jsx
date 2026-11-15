import React from 'react';
import { Calendar, Clock, DollarSign, UserCircle, ShieldCheck, KeyRound, LayoutDashboard } from 'lucide-react';

export function ProfessionalSidebar({
  activeTab,
  setActiveTab,
  userName = 'Profissional',
  onOpenChangePassword
}) {
  const tabs = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'bookings', label: 'Agendamentos', icon: Calendar },
    { id: 'patients', label: 'Meus Pacientes', icon: UserCircle },
    { id: 'availability', label: 'Minha Agenda', icon: Clock },
    { id: 'financeiro', label: 'Meu Faturamento', icon: DollarSign },
    { id: 'professionals', label: 'Meu Perfil', icon: UserCircle },
  ];

  return (
    <aside className="w-64 bg-white text-slate-800 flex flex-col flex-shrink-0 min-h-screen border-r border-slate-200/80 shadow-xs font-sans">
      <div className="p-5 border-b border-slate-200/80 bg-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl shadow-xs">
            D
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-sm tracking-wide">Doxologos</h2>
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              Painel do Psicólogo
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
        <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Menu Principal</p>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="p-4 border-t border-slate-200/80 bg-slate-50/70 flex flex-col gap-2.5 text-xs">
        <div className="flex items-center gap-2.5 truncate">
          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-800 border border-slate-300 flex items-center justify-center font-bold">
            {userName.charAt(0)}
          </div>
          <div className="truncate">
            <p className="font-semibold text-slate-800 truncate">{userName}</p>
            <p className="text-[10px] text-slate-500 capitalize">Psicólogo</p>
          </div>
        </div>

        {onOpenChangePassword && (
          <button
            onClick={onOpenChangePassword}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200 bg-white shadow-xs"
          >
            <KeyRound className="w-3.5 h-3.5 text-slate-600" />
            Alterar Minha Senha
          </button>
        )}
      </div>
    </aside>
  );
}

export default ProfessionalSidebar;
