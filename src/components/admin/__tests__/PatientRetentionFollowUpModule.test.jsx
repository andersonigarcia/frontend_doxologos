import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PatientRetentionFollowUpModule } from '../PatientRetentionFollowUpModule';

// Mock clipboard
Object.assign(navigator, {
    clipboard: {
        writeText: jest.fn().mockImplementation(() => Promise.resolve()),
    },
});

const mockBookings = [
    // Paciente 1: Fez 1 consulta em 2026-10-01 (antiga) e sem agendamento futuro -> Drop-off 1ª consulta
    {
        id: 'b-1',
        booking_date: '2026-10-01',
        booking_time: '14:00',
        status: 'completed',
        patient_email: 'lucas@email.com',
        patient_name: 'Lucas Ferreira',
        patient_phone: '11999990001',
        valor_consulta: 150,
        professional_id: 'prof-1',
        professional: { id: 'prof-1', name: 'Dra. Sandra' }
    },
    // Paciente 2: Fez 2 consultas (2026-08-01 e 2026-08-15) -> Inativo > 60 dias
    {
        id: 'b-2',
        booking_date: '2026-08-01',
        status: 'completed',
        patient_email: 'patricia@email.com',
        patient_name: 'Patrícia Rocha',
        patient_phone: '11999990002',
        valor_consulta: 150,
        professional_id: 'prof-2',
        professional: { id: 'prof-2', name: 'Dr. Roberto' }
    },
    {
        id: 'b-3',
        booking_date: '2026-08-15',
        status: 'completed',
        patient_email: 'patricia@email.com',
        patient_name: 'Patrícia Rocha',
        patient_phone: '11999990002',
        valor_consulta: 150,
        professional_id: 'prof-2',
        professional: { id: 'prof-2', name: 'Dr. Roberto' }
    }
];

const mockProfessionals = [
    { id: 'prof-1', name: 'Dra. Sandra' },
    { id: 'prof-2', name: 'Dr. Roberto' }
];

function renderWithClient(ui) {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false, gcTime: 0 },
        },
    });

    return render(
        <QueryClientProvider client={queryClient}>
            {ui}
        </QueryClientProvider>
    );
}

describe('PatientRetentionFollowUpModule (Acompanhamento e Retenção)', () => {
    it('deve renderizar o cabeçalho, os 4 cards de métricas e listar os pacientes em risco', () => {
        renderWithClient(
            <PatientRetentionFollowUpModule
                bookings={mockBookings}
                professionals={mockProfessionals}
                onNavigateTab={jest.fn()}
            />
        );

        expect(screen.getByText(/Radar de Acompanhamento & Prevenção de Abandono/i)).toBeInTheDocument();
        expect(screen.getByText('Total em Risco')).toBeInTheDocument();
        expect(screen.getByText('Só 1 Consulta Feita')).toBeInTheDocument();
        expect(screen.getByText(/Inativos > 30 Dias/i)).toBeInTheDocument();

        // Pacientes na lista
        expect(screen.getByText('Lucas Ferreira')).toBeInTheDocument();
        expect(screen.getByText('Patrícia Rocha')).toBeInTheDocument();
    });

    it('deve filtrar pacientes ao digitar na barra de pesquisa', () => {
        renderWithClient(
            <PatientRetentionFollowUpModule
                bookings={mockBookings}
                professionals={mockProfessionals}
                onNavigateTab={jest.fn()}
            />
        );

        const searchInput = screen.getByPlaceholderText(/Buscar paciente, psicólogo, e-mail ou telefone/i);
        fireEvent.change(searchInput, { target: { value: 'Lucas' } });

        expect(screen.getByText('Lucas Ferreira')).toBeInTheDocument();
        expect(screen.queryByText('Patrícia Rocha')).not.toBeInTheDocument();
    });

    it('deve abrir o modal de acolhimento humanizado com as diretrizes do CFP', () => {
        renderWithClient(
            <PatientRetentionFollowUpModule
                bookings={mockBookings}
                professionals={mockProfessionals}
                onNavigateTab={jest.fn()}
            />
        );

        const acolherBtns = screen.getAllByRole('button', { name: /Acolher Paciente/i });
        fireEvent.click(acolherBtns[0]);

        expect(screen.getByText('Acolhimento Humanizado do Paciente')).toBeInTheDocument();
        expect(screen.getByText(/Pautada nas diretrizes do CFP/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Copiar Mensagem/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Abrir no WhatsApp/i })).toBeInTheDocument();
    });

    it('deve permitir alternar o tom da abordagem no modal', () => {
        renderWithClient(
            <PatientRetentionFollowUpModule
                bookings={mockBookings}
                professionals={mockProfessionals}
                onNavigateTab={jest.fn()}
            />
        );

        const acolherBtns = screen.getAllByRole('button', { name: /Acolher Paciente/i });
        fireEvent.click(acolherBtns[0]);

        const reconexaoBtn = screen.getByRole('button', { name: /Reconexão Suave/i });
        fireEvent.click(reconexaoBtn);

        const textarea = screen.getByRole('textbox');
        expect(textarea.value).toContain('Sabemos que a rotina por vezes pede pausas');
    });
});
