import React from 'react';
import { LayoutDashboard, Calendar, UserCircle, Clock, DollarSign } from 'lucide-react';

/**
 * ProfessionalBottomNav - Barra inferior de navegação nativa para mobile (ergonomia para polegar)
 * Acessível exclusivamente em telas < 768px (md:hidden)
 */
export function ProfessionalBottomNav({ activeTab, setActiveTab }) {
    const navItems = [
        { id: 'dashboard', label: 'Hoje', icon: LayoutDashboard },
        { id: 'bookings', label: 'Agenda', icon: Calendar },
        { id: 'patients', label: 'Pacientes', icon: UserCircle },
        { id: 'availability', label: 'Horários', icon: Clock },
        { id: 'financeiro', label: 'Honorários', icon: DollarSign },
    ];

    return (
        <nav
            aria-label="Navegação do Profissional"
            className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] md:hidden pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1 px-2"
        >
            <div className="grid grid-cols-5 items-center justify-around">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => {
                                setActiveTab(item.id);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className={`flex flex-col items-center justify-center py-1.5 px-1 min-h-[48px] rounded-xl transition-all duration-200 active:scale-95 ${
                                isActive
                                    ? 'text-slate-900 font-bold'
                                    : 'text-slate-400 hover:text-slate-600 font-medium'
                            }`}
                        >
                            <div className="relative">
                                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110 text-slate-900 stroke-[2.2]' : 'text-slate-400 stroke-[1.8]'}`} />
                                {isActive && (
                                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-slate-900 rounded-full" />
                                )}
                            </div>
                            <span className={`text-[10px] mt-1 tracking-tight truncate max-w-[56px] ${isActive ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}

export default ProfessionalBottomNav;
