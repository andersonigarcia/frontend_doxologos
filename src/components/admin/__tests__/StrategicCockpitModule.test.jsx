import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StrategicCockpitModule } from '../StrategicCockpitModule';

jest.mock('@/hooks/useSystemSettings', () => ({
  useSystemSettings: () => ({
    settings: {
      platform_default_retention_pct: 40,
      professional_monthly_capacity_slots: 80
    }
  })
}));

const mockFetchExecutiveInsights = jest.fn();
jest.mock('@/services/adminInsightsService', () => ({
  fetchExecutiveInsights: (...args) => mockFetchExecutiveInsights(...args)
}));

describe('StrategicCockpitModule (Fase 2 - Painel Executivo e IA)', () => {
  const mockBookings = [
    {
      id: 'b-1',
      booking_date: new Date().toISOString().slice(0, 10),
      status: 'confirmed',
      valor_consulta: 150,
      valor_repasse_profissional: 90,
      professional: { name: 'Dra. Ana' },
      service: { name: 'Psicoterapia Individual' }
    },
    {
      id: 'b-2',
      booking_date: new Date().toISOString().slice(0, 10),
      status: 'completed',
      valor_consulta: 200,
      valor_repasse_profissional: 120,
      professional: { name: 'Dr. Carlos' },
      service: { name: 'Terapia de Casal' }
    },
    {
      id: 'b-3',
      booking_date: new Date().toISOString().slice(0, 10),
      status: 'pending_payment',
      valor_consulta: 150,
      valor_repasse_profissional: 90,
      professional: { name: 'Dra. Ana' },
      service: { name: 'Psicoterapia Individual' }
    }
  ];

  const mockProfessionals = [
    { id: 'prof-1', name: 'Dra. Ana' },
    { id: 'prof-2', name: 'Dr. Carlos' }
  ];

  const mockAvailability = {
    'prof-1': {
      monday: ['09:00', '10:00'],
      tuesday: ['14:00']
    },
    'prof-2': {
      // prof-2 sem horários
      monday: [],
      tuesday: []
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    window.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    window.URL.revokeObjectURL = jest.fn();

    mockFetchExecutiveInsights.mockResolvedValue({
      summary: 'Faturamento de R$ 350,00 realizado em 2 consultas.',
      highlight: 'Operação estável com 40% de retenção líquida.',
      attentionPoint: '1 cobrança pendente aguardando PIX.',
      recommendation: 'Cadastrar horários para profissionais sem agenda.',
      generatedAt: new Date().toISOString(),
      isAiGenerated: true
    });
  });

  it('deve renderizar o cockpit executivo com os 4 KPIs vitais calculados', async () => {
    render(
      <StrategicCockpitModule
        bookings={mockBookings}
        professionals={mockProfessionals}
        availability={mockAvailability}
        onNavigateTab={jest.fn()}
      />
    );

    // GMV: 150 + 200 = 350,00
    expect(screen.getByText('GMV Realizado')).toBeInTheDocument();
    expect(screen.getByText('R$ 350,00')).toBeInTheDocument();

    // Margem: 350 - 210 = 140,00
    expect(screen.getByText('Margem da Plataforma')).toBeInTheDocument();
    expect(screen.getByText('R$ 140,00')).toBeInTheDocument();

    // Consultas Realizadas: 2 (b-1 e b-2)
    expect(screen.getByText('Consultas Realizadas')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    // Pendente a receber: 150,00
    expect(screen.getByText(/A receber \(pendente\): R\$ 150,00/i)).toBeInTheDocument();
  });

  it('deve disparar drill-down nas abas corretas ao clicar nos cards de KPI', () => {
    const handleNavigate = jest.fn();
    render(
      <StrategicCockpitModule
        bookings={mockBookings}
        professionals={mockProfessionals}
        availability={mockAvailability}
        onNavigateTab={handleNavigate}
      />
    );

    // Clicar em GMV Realizado deve navegar para financial-control
    fireEvent.click(screen.getByText('GMV Realizado'));
    expect(handleNavigate).toHaveBeenCalledWith('financial-control');

    // Clicar em Margem da Plataforma deve navegar para financial-control
    fireEvent.click(screen.getByText('Margem da Plataforma'));
    expect(handleNavigate).toHaveBeenCalledWith('financial-control');

    // Clicar em Ocupação da Agenda deve navegar para availability
    fireEvent.click(screen.getByText('Ocupação da Agenda'));
    expect(handleNavigate).toHaveBeenCalledWith('availability');

    // Clicar em Consultas Realizadas deve navegar para bookings
    fireEvent.click(screen.getByText('Consultas Realizadas'));
    expect(handleNavigate).toHaveBeenCalledWith('bookings');
  });

  it('deve renderizar o bloco de IA Copiloto e exibir os insights retornados', async () => {
    render(
      <StrategicCockpitModule
        bookings={mockBookings}
        professionals={mockProfessionals}
        availability={mockAvailability}
        onNavigateTab={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Copiloto Analítico & Diagnóstico Executivo/i)).toBeInTheDocument();
      expect(screen.getByText(/Google Gemini 1.5/i)).toBeInTheDocument();
      expect(screen.getByText(/Faturamento de R\$ 350,00 realizado em 2 consultas/i)).toBeInTheDocument();
      expect(screen.getByText(/Operação estável com 40% de retenção líquida/i)).toBeInTheDocument();
      expect(screen.getByText(/1 cobrança pendente aguardando PIX/i)).toBeInTheDocument();
    });
  });

  it('deve atualizar o diagnóstico ao clicar no botão "Atualizar Diagnóstico"', async () => {
    render(
      <StrategicCockpitModule
        bookings={mockBookings}
        professionals={mockProfessionals}
        availability={mockAvailability}
        onNavigateTab={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(mockFetchExecutiveInsights).toHaveBeenCalledTimes(1);
    });

    const refreshBtn = screen.getByText(/Atualizar Diagnóstico/i);
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(mockFetchExecutiveInsights).toHaveBeenCalledTimes(2);
    });
  });

  it('deve identificar psicólogo sem horários na agenda e exibir alerta de ação imediata', () => {
    const handleNavigate = jest.fn();
    render(
      <StrategicCockpitModule
        bookings={mockBookings}
        professionals={mockProfessionals}
        availability={mockAvailability}
        onNavigateTab={handleNavigate}
      />
    );

    // prof-2 não possui horários cadastrados
    expect(screen.getByText('Psicólogos sem Agenda')).toBeInTheDocument();
    expect(screen.getByText(/1 psicólogo\(s\) não possuem horários ativos/i)).toBeInTheDocument();

    const configureBtn = screen.getByText(/Cadastrar horários →/i);
    fireEvent.click(configureBtn);
    expect(handleNavigate).toHaveBeenCalledWith('availability');
  });

  it('deve alterar o filtro de período ao clicar nos botões do seletor', async () => {
    render(
      <StrategicCockpitModule
        bookings={mockBookings}
        professionals={mockProfessionals}
        availability={mockAvailability}
        onNavigateTab={jest.fn()}
      />
    );

    const btnHoje = screen.getByRole('button', { name: 'Hoje' });
    fireEvent.click(btnHoje);

    await waitFor(() => {
      // Recalcula para o período 'Hoje'
      expect(mockFetchExecutiveInsights).toHaveBeenCalled();
    });
  });

  it('deve disparar download de CSV ao clicar no botão "Exportar CSV"', () => {
    const originalCreateElement = document.createElement.bind(document);
    const clickMock = jest.fn();

    jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'a') {
        const a = originalCreateElement('a');
        a.click = clickMock;
        return a;
      }
      return originalCreateElement(tagName);
    });

    render(
      <StrategicCockpitModule
        bookings={mockBookings}
        professionals={mockProfessionals}
        availability={mockAvailability}
        onNavigateTab={jest.fn()}
      />
    );

    const exportBtn = screen.getByRole('button', { name: /Exportar CSV/i });
    fireEvent.click(exportBtn);

    expect(clickMock).toHaveBeenCalled();
    document.createElement.mockRestore();
  });
});
