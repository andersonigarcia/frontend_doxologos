import {
    Calendar,
    DollarSign,
    TrendingUp,
    Users,
    Briefcase,
    Clock,
    Star,
    Ticket,
    LayoutDashboard,
    UserCircle,
    FileText,
    Settings,
    Receipt,
    ClipboardList,
    Newspaper,
    Building2
} from 'lucide-react';

/**
 * Configuração de tabs do painel administrativo por role
 * Atualizado: 2026-08-14 com os 5 Módulos Unificados
 */
export const tabsConfig = {
    admin: [
        { value: 'dashboard', label: '1. Cockpit Estratégico', icon: LayoutDashboard },
        { value: 'bookings', label: 'Agendamentos', icon: Calendar },
        { value: 'financial-control', label: '3. Controladoria & DRE', icon: TrendingUp },
        { value: 'payments', label: 'Pagamentos', icon: DollarSign },
        { value: 'profit-loss', label: 'Lucro/Prejuízo', icon: TrendingUp },
        { value: 'livro-caixa', label: 'Livro Caixa', icon: FileText },
        { value: 'nfse', label: 'Resiliência NFS-e', icon: Building2 },
        { value: 'professionals', label: 'Profissionais', icon: Users },
        { value: 'patients', label: 'Pacientes', icon: UserCircle },
        { value: 'services', label: 'Serviços', icon: Briefcase },
        { value: 'availability', label: 'Disponibilidade', icon: Clock },
        { value: 'reviews', label: 'Avaliações', icon: Star },
        { value: 'events', label: 'Eventos', icon: Ticket },
        { value: 'event-registrations', label: 'Inscrições', icon: ClipboardList },
        { value: 'refunds', label: 'Reembolsos', icon: Receipt },
        { value: 'settings', label: 'Configurações', icon: Settings },
        { value: 'blog', label: 'Blog / Artigos', icon: Newspaper },
    ],
    professional: [
        { value: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { value: 'bookings', label: 'Agendamentos', icon: Calendar },
        { value: 'patients', label: 'Pacientes', icon: Users },
        { value: 'financial-control', label: 'Financeiro & DRE', icon: DollarSign },
        { value: 'availability', label: 'Disponibilidade', icon: Clock },
        { value: 'reviews', label: 'Avaliações', icon: Star },
        { value: 'professionals', label: 'Perfil', icon: UserCircle },
    ]
};

export default tabsConfig;
