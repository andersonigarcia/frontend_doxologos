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
    Sparkles,
    Activity,
    HeartHandshake
} from 'lucide-react';

/**
 * Configuração de tabs do painel administrativo por role
 * Atualizado: 2026-08-15 com Leads & GAD-7
 */
export const tabsConfig = {
    admin: [
        { value: 'dashboard', label: 'Dashboard & KPIs', icon: LayoutDashboard },
        { value: 'retention-ops', label: 'Retenção & No-Show', icon: Activity },
        { value: 'growth', label: 'Growth & Metas', icon: TrendingUp },
        { value: 'bookings', label: 'Agendamentos', icon: Calendar },
        { value: 'financial-control', label: 'DRE, Ledger & Conciliação', icon: TrendingUp },
        { value: 'ai-economics', label: 'Copiloto IA & Custos', icon: Sparkles },
        { value: 'payments', label: 'Repasses aos Profissionais', icon: DollarSign },
        { value: 'profit-loss', label: 'Custos & Lucro/Prejuízo', icon: TrendingUp },
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
        { value: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { value: 'bookings', label: 'Agendamentos', icon: Calendar },
        { value: 'patients', label: 'Meus Pacientes', icon: UserCircle },
        { value: 'availability', label: 'Disponibilidade', icon: Clock },
        { value: 'financeiro', label: 'Faturamento', icon: DollarSign },
        { value: 'professionals', label: 'Perfil', icon: UserCircle },
    ]
};


export default tabsConfig;
