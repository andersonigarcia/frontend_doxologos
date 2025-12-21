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
    UserCircle
} from 'lucide-react';

/**
 * Configuração de tabs do painel administrativo por role
 * Atualizado: 2025-12-20 21:45
 */
export const tabsConfig = {
    admin: [
        { value: 'bookings', label: 'Agendamentos', icon: Calendar },
        { value: 'payments', label: 'Pagamentos', icon: DollarSign },
        { value: 'profit-loss', label: 'Lucro/Prejuízo', icon: TrendingUp },
        { value: 'professionals', label: 'Profissionais', icon: Users },
        { value: 'services', label: 'Serviços', icon: Briefcase },
        { value: 'availability', label: 'Disponibilidade', icon: Clock },
        { value: 'reviews', label: 'Avaliações', icon: Star },
        { value: 'events', label: 'Eventos', icon: Ticket },
    ],
    professional: [
        { value: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { value: 'bookings', label: 'Agendamentos', icon: Calendar },
        { value: 'pacientes', label: 'Pacientes', icon: Users },
        { value: 'financeiro', label: 'Financeiro', icon: DollarSign },
        { value: 'profile', label: 'Perfil', icon: UserCircle },
    ]
};

export default tabsConfig;
