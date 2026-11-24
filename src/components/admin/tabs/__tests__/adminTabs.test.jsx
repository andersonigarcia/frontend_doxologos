import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
    AdminServicesTab,
    sanitizeCurrencyInput,
    parseCurrencyToNumber,
    formatNumberToCurrencyInput,
    AdminEventsTab,
    generateUniqueSlug,
    slugifyTitle,
    AdminTestimonialsTab,
    AdminPaymentsTab,
    AdminProfessionalsTab,
    AdminBookingsTab
} from '../index';

jest.mock('@/lib/customSupabaseClient', () => ({
    supabase: {
        from: jest.fn(() => ({
            select: jest.fn().mockResolvedValue({ data: [], error: null }),
            insert: jest.fn().mockResolvedValue({ data: [], error: null }),
            update: jest.fn().mockResolvedValue({ data: [], error: null }),
            delete: jest.fn().mockResolvedValue({ data: [], error: null }),
            eq: jest.fn().mockReturnThis()
        }))
    }
}));

jest.mock('@/components/ui/use-toast', () => ({
    useToast: () => ({
        toast: jest.fn()
    })
}));

jest.mock('@/contexts/SupabaseAuthContext', () => ({
    useAuth: () => ({
        user: { id: 'user-rodrigo' }
    })
}));

describe('Admin Modular Tabs (Onda 4 Architecture Deconstruction)', () => {
    describe('AdminServicesTab Helpers', () => {
        it('deve sanitizar entradas monetárias corretamente', () => {
            expect(sanitizeCurrencyInput('R$ 150,00')).toBe('150,00');
            expect(sanitizeCurrencyInput(null)).toBe('');
            expect(sanitizeCurrencyInput('abc 25.50')).toBe('25.50');
        });

        it('deve converter string de moeda para número float', () => {
            expect(parseCurrencyToNumber('150,00')).toBe(150.00);
            expect(parseCurrencyToNumber('1.250,50')).toBe(1250.50);
            expect(parseCurrencyToNumber(null)).toBeNull();
            expect(parseCurrencyToNumber('')).toBeNull();
        });

        it('deve formatar número para formato de input monetário brasileiro', () => {
            expect(formatNumberToCurrencyInput(150)).toBe('150,00');
            expect(formatNumberToCurrencyInput(1250.5)).toBe('1250,50');
            expect(formatNumberToCurrencyInput(null)).toBe('');
        });
    });

    describe('AdminEventsTab Helpers', () => {
        it('deve criar slugs seguros a partir de títulos com acentos e caracteres especiais', () => {
            const slug = slugifyTitle('Workshop de Ansiedade & Saúde Mental!');
            expect(slug).toBe('workshop-de-ansiedade-saude-mental');
        });

        it('deve gerar slug único com sufixo temporal', () => {
            const uniqueSlug = generateUniqueSlug('Palestra Online');
            expect(uniqueSlug).toMatch(/^palestra-online-\d+$/);
        });
    });

    describe('Rendering Modular Tabs', () => {
        it('deve renderizar AdminTestimonialsTab sem falhas', () => {
            render(<AdminTestimonialsTab />);
            expect(screen.getByText('Gestão de Depoimentos')).toBeInTheDocument();
        });

        it('deve renderizar AdminServicesTab com lista de serviços', () => {
            const mockServices = [
                { id: 'srv-1', name: 'Psicoterapia Individual', price: 180, professional_payout: 140, duration_minutes: 50 }
            ];
            render(<AdminServicesTab services={mockServices} professionals={[]} onRefresh={jest.fn()} />);
            expect(screen.getByText('Psicoterapia Individual')).toBeInTheDocument();
        });

        it('deve renderizar AdminEventsTab com lista de eventos', () => {
            const mockEvents = [
                {
                    id: 'evt-1',
                    titulo: 'Imersão de Inteligência Emocional',
                    tipo_evento: 'Workshop',
                    data_inicio: '2026-11-01T10:00:00',
                    data_fim: '2026-11-01T12:00:00',
                    data_limite_inscricao: '2026-10-31T23:59:00',
                    limite_participantes: 20,
                    ativo: true
                }
            ];
            render(<AdminEventsTab events={mockEvents} professionals={[]} onRefresh={jest.fn()} />);
            expect(screen.getByText('Imersão de Inteligência Emocional')).toBeInTheDocument();
        });

        it('deve renderizar AdminBookingsTab com contadores e estado vazio quando sem consultas', () => {
            render(
                <AdminBookingsTab
                    bookings={[]}
                    services={[]}
                    professionals={[]}
                    userRole="admin"
                    onRefresh={jest.fn()}
                />
            );
            expect(screen.getByText('Gestão Operacional de Agendamentos')).toBeInTheDocument();
            expect(screen.getByText('Nenhum agendamento encontrado')).toBeInTheDocument();
        });

        it('deve renderizar AdminBookingsTab em modo tabela com dados de consultas', () => {
            const mockBookings = [
                {
                    id: 'bk-1',
                    patient_name: 'Ana Silva',
                    patient_email: 'ana@example.com',
                    booking_date: '2026-10-20',
                    booking_time: '14:00',
                    status: 'confirmed',
                    valor_consulta: 180,
                    valor_repasse_profissional: 140,
                    service: { name: 'Psicoterapia' }
                }
            ];
            render(
                <MemoryRouter>
                    <AdminBookingsTab
                        bookings={mockBookings}
                        services={[{ id: 's1', name: 'Psicoterapia' }]}
                        professionals={[{ id: 'p1', name: 'Dra. Maria' }]}
                        userRole="admin"
                        onRefresh={jest.fn()}
                    />
                </MemoryRouter>
            );
            expect(screen.getByText('Ana Silva')).toBeInTheDocument();
            expect(screen.getAllByText('Confirmado').length).toBeGreaterThan(0);
        });

        it('deve renderizar AdminProfessionalsTab em modo editável apenas para o próprio profissional autenticado', () => {
            const otherProf = {
                id: 'prof-outro',
                user_id: 'user-outro',
                name: 'Outro Psicólogo',
                email: 'outro@doxologos.com.br',
                personal_meet_link: 'https://meet.google.com/out-ro00-000'
            };
            const mockProf = {
                id: 'prof-rodrigo',
                user_id: 'user-rodrigo',
                name: 'Rodrigo Psicólogo',
                email: 'rodrigo@doxologos.com.br',
                whatsapp: '31999999999',
                personal_meet_link: 'https://meet.google.com/abc-defg-hij',
                services_ids: ['srv-1']
            };

            render(
                <AdminProfessionalsTab
                    userRole="professional"
                    professionals={[otherProf, mockProf]}
                    services={[{ id: 'srv-1', name: 'Psicoterapia Individual' }]}
                    onRefresh={jest.fn()}
                />
            );

            expect(screen.getByText('Dados do Cadastro')).toBeInTheDocument();
            expect(screen.getByDisplayValue('Rodrigo Psicólogo')).toBeInTheDocument();
            expect(screen.queryByDisplayValue('Outro Psicólogo')).not.toBeInTheDocument();
            expect(screen.getByDisplayValue('https://meet.google.com/abc-defg-hij')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Salvar Alterações do Profissional/i })).toBeInTheDocument();
        });

        it('deve bloquear edição em AdminProfessionalsTab quando papel não for admin nem professional', () => {
            render(
                <AdminProfessionalsTab
                    userRole="patient"
                    professionals={[{ id: 'prof-rodrigo', user_id: 'user-rodrigo', name: 'Rodrigo Psicólogo' }]}
                    services={[]}
                    onRefresh={jest.fn()}
                />
            );

            expect(screen.getByText('Acesso Restrito')).toBeInTheDocument();
            expect(screen.queryByRole('button', { name: /Salvar Alterações do Profissional/i })).not.toBeInTheDocument();
        });
    });
});
