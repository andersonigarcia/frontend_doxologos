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
    Building2,
    BookOpen,
    Sparkles
} from 'lucide-react';

/**
 * Configuração de tabs do painel administrativo por role
 * Atualizado: 2026-08-15 com Leads & GAD-7
 */
export const tabsConfig = {
    admin: [
        { value: 'dashboard', label: 'Dashboard & KPIs', icon: LayoutDashboard },
        { value: 'bookings', label: 'Agendamentos', icon: Calendar },
        { value: 'financial-control', label: '3. Controladoria & DRE', icon: TrendingUp },
        { value: 'payments', label: 'Pagamentos', icon: DollarSign },
        { value: 'profit-loss', label: 'Lucro/Prejuízo', icon: TrendingUp },
        { value: 'livro-caixa', label: 'Livro Caixa', icon: FileText },
        { value: 'nfse', label: 'Resiliência NFS-e', icon: Building2 },
        { value: 'professionals', label: 'Profissionais', icon: Users },
        { value: 'patients', label: 'Pacientes', icon: UserCircle },
        { value: 'assessment-leads', label: 'Leads & GAD-7', icon: Sparkles },
        { value: 'services', label: 'Serviços', icon: Briefcase },
        { value: 'availability', label: 'Disponibilidade', icon: Clock },
        { value: 'reviews', label: 'Avaliações', icon: Star },
        { value: 'events', label: 'Eventos', icon: Ticket },
        { value: 'event-registrations', label: 'Inscrições', icon: ClipboardList },
        { value: 'refunds', label: 'Reembolsos', icon: Receipt },
        { value: 'book-resources', label: 'Materiais do Livro', icon: BookOpen },
        { value: 'settings', label: 'Configurações', icon: Settings },
        { value: 'blog', label: 'Blog / Artigos', icon: Newspaper },
    ],
    professional: [
        { value: 'bookings', label: 'Agendamentos', icon: Calendar },
        { value: 'patients', label: 'Meus Pacientes', icon: UserCircle },
        { value: 'availability', label: 'Disponibilidade', icon: Clock },
        { value: 'financeiro', label: 'Faturamento', icon: DollarSign },
        { value: 'professionals', label: 'Perfil', icon: UserCircle },
    ]
};


export default tabsConfig;
