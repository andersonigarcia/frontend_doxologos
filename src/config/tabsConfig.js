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
    LineChart,
    Newspaper,
    Building2
} from 'lucide-react';

/**
 * Configuração de tabs do painel administrativo por role
 * Atualizado: 2026-08-14 05:00
 */
export const tabsConfig = {
    admin: [
        { value: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { value: 'bookings', label: 'Agendamentos', icon: Calendar },
        { value: 'payments', label: 'Pagamentos', icon: DollarSign },
        { value: 'profit-loss', label: 'Lucro/Prejuízo', icon: TrendingUp },
        { value: 'livro-caixa', label: 'Livro Caixa', icon: FileText },
        { value: 'nfse', label: 'Resiliência NFS-e', icon: Building2 },
        { value: 'professionals', label: 'Profissionais', icon: Users },
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
        { value: 'financeiro', label: 'Financeiro', icon: DollarSign },
        { value: 'availability', label: 'Disponibilidade', icon: Clock },
        { value: 'reviews', label: 'Avaliações', icon: Star },
        { value: 'professionals', label: 'Perfil', icon: UserCircle },
    ]
};

export default tabsConfig;
