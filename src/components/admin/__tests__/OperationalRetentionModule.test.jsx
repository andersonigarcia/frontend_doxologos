import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { OperationalRetentionModule } from '../OperationalRetentionModule';

describe('OperationalRetentionModule (Fase 3 - Operação, Retenção e No-show)', () => {
  const mockBookings = [
    // Paciente 1: 2 consultas completas -> Retorno à 2ª sessão
    {
      id: 'b-1',
      booking_date: '2026-09-01',
      booking_time: '10:00',
      status: 'completed',
      patient_email: 'paciente1@email.com',
      patient_name: 'Mariana Silva Santos',
      patient_phone: '11999991111',
      professional_id: 'prof-1',
      professional: { id: 'prof-1', name: 'Dra. Ana' }
    },
    {
      id: 'b-2',
      booking_date: '2026-09-08',
      booking_time: '10:00',
      status: 'completed',
      patient_email: 'paciente1@email.com',
      patient_name: 'Mariana Silva Santos',
      patient_phone: '11999991111',
      professional_id: 'prof-1',
      professional: { id: 'prof-1', name: 'Dra. Ana' }
    },
    // Paciente 2: 1 consulta realizada em 2026-08-01 (antiga) e sem agendamento futuro -> Em Risco de Churn
    {
      id: 'b-3',
      booking_date: '2026-08-01',
      booking_time: '14:00',
      status: 'completed',
      patient_email: 'paciente2@email.com',
      patient_name: 'Carlos Eduardo Oliveira',
      patient_phone: '11999992222',
      professional_id: 'prof-2',
      professional: { id: 'prof-2', name: 'Dr. Bruno' }
    },
    // Consulta com falta (No-Show)
    {
      id: 'b-4',
      booking_date: '2026-10-10',
      booking_time: '15:00',
      status: 'no_show',
      professional_id: 'prof-1',
      professional: { id: 'prof-1', name: 'Dra. Ana' }
    },
    // Consulta cancelada
    {
      id: 'b-5',
      booking_date: '2026-10-11',
      booking_time: '16:00',
      status: 'cancelled',
      professional_id: 'prof-2',
      professional: { id: 'prof-2', name: 'Dr. Bruno' }
    }
  ];

  const mockAvailability = {
    'prof-1': {
      monday: ['09:00', '10:00'],
      tuesday: ['14:00']
    },
    'prof-2': {
      monday: ['11:00'],
      friday: ['19:00']
    }
  };

  it('deve renderizar o cabeçalho e os 4 KPIs vitais de operação', () => {
    render(
      <OperationalRetentionModule
        bookings={mockBookings}
        availability={mockAvailability}
        onNavigateTab={jest.fn()}
      />
    );

    expect(screen.getByText(/Saúde da Operação & Retenção de Pacientes/i)).toBeInTheDocument();
    expect(screen.getByText('Retorno para 2ª Sessão')).toBeInTheDocument();
    expect(screen.getByText('Taxa de No-Show (Faltas)')).toBeInTheDocument();
    expect(screen.getByText('Cancelamentos')).toBeInTheDocument();
    expect(screen.getByText('Em Risco de Abandono')).toBeInTheDocument();

    // 1 de 2 pacientes retornou -> 50%
    expect(screen.getByText('50.0%')).toBeInTheDocument();
  });

  it('deve navegar entre as sub-abas do módulo', () => {
    render(
      <OperationalRetentionModule
        bookings={mockBookings}
        availability={mockAvailability}
        onNavigateTab={jest.fn()}
      />
    );

    // Inicialmente na aba de Coortes
    expect(screen.getByText(/Distribuição de Pacientes por Ciclo de Sessões/i)).toBeInTheDocument();

    // Clicar na aba No-Show & Cancelamentos
    fireEvent.click(screen.getByRole('button', { name: 'No-Show & Cancelamentos' }));
    expect(screen.getByText(/No-Show por Profissional/i)).toBeInTheDocument();
    expect(screen.getByText(/Ocorrências por Dia da Semana/i)).toBeInTheDocument();

    // Clicar na aba Prevenção de Abandono
    fireEvent.click(screen.getByRole('button', { name: 'Prevenção de Abandono' }));
    expect(screen.getByText(/Prevenção de Abandono Clínico \(Pacientes Inativos\)/i)).toBeInTheDocument();

    // Clicar na aba Capacidade vs Demanda
    fireEvent.click(screen.getByRole('button', { name: 'Capacidade vs Demanda' }));
    expect(screen.getByText(/Capacidade de Atendimento vs Demanda Real \(por Turno\)/i)).toBeInTheDocument();
  });

  it('deve anonimizar nomes de pacientes na lista de risco (Zero PII)', () => {
    render(
      <OperationalRetentionModule
        bookings={mockBookings}
        availability={mockAvailability}
        onNavigateTab={jest.fn()}
      />
    );

    // Ir para a aba de prevenção de abandono
    fireEvent.click(screen.getByRole('button', { name: 'Prevenção de Abandono' }));

    // Carlos Eduardo Oliveira deve ser exibido como Carlos O. (Zero PII)
    expect(screen.getByText('Carlos O.')).toBeInTheDocument();
    expect(screen.queryByText('Carlos Eduardo Oliveira')).not.toBeInTheDocument();

    // Deve ter links do WhatsApp de acolhimento
    const waLinks = screen.getAllByText(/Acolher via WhatsApp/i).map(el => el.closest('a'));
    expect(waLinks.length).toBeGreaterThan(0);
    expect(waLinks.some(link => link.getAttribute('href').includes('11999992222'))).toBe(true);
  });

  it('deve calcular ocupação por turnos na aba de capacidade', () => {
    render(
      <OperationalRetentionModule
        bookings={mockBookings}
        availability={mockAvailability}
        onNavigateTab={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Capacidade vs Demanda' }));
    expect(screen.getByText('Segunda-feira')).toBeInTheDocument();
    expect(screen.getByText('Sexta-feira')).toBeInTheDocument();
  });
});
