import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GrowthAnalyticsModule } from '../GrowthAnalyticsModule';

const mockUpdateSetting = jest.fn().mockResolvedValue({ success: true });
const mockToast = jest.fn();

const mockSettings = {
  target_monthly_revenue_brl: 30000,
  target_monthly_bookings_count: 200,
  target_new_patients_count: 30,
  target_retention_return_rate_pct: 60
};

jest.mock('@/hooks/useSystemSettings', () => ({
  useSystemSettings: () => ({
    settings: mockSettings,
    updateSetting: (...args) => mockUpdateSetting(...args),
    loading: false
  })
}));

jest.mock('@/lib/assessmentService', () => ({
  fetchAssessmentLeads: jest.fn().mockResolvedValue({
    success: true,
    data: [
      { id: 'lead-1', patient_name: 'Lead Alpha', created_at: '2026-10-01', status: 'contatado' },
      { id: 'lead-2', patient_name: 'Lead Beta', created_at: '2026-10-05', status: 'agendou' },
      { id: 'lead-3', patient_name: 'Lead Gamma', created_at: '2026-10-10', status: 'novo' }
    ]
  })
}));

jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: (...args) => mockToast(...args)
  })
}));

describe('GrowthAnalyticsModule (Fase 4 - Funil, Canais e Metas)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const now = new Date();
  const currentMonthDate = now.toISOString().slice(0, 10);

  const mockBookings = [
    // Paciente 1 (Novo no mês atual, B2C, pago, realizado)
    {
      id: 'b-1',
      booking_date: currentMonthDate,
      status: 'completed',
      valor_consulta: 150,
      patient_email: 'paciente1@email.com',
      patient_name: 'Paciente Um',
      business_model: 'b2c',
      payment_method: 'credit_card'
    },
    // Paciente 1 (Segunda consulta no mês atual)
    {
      id: 'b-2',
      booking_date: currentMonthDate,
      status: 'confirmed',
      valor_consulta: 150,
      patient_email: 'paciente1@email.com',
      patient_name: 'Paciente Um',
      business_model: 'b2c',
      payment_method: 'credit_card'
    },
    // Paciente 2 (Novo no mês atual, canal Livro, pago)
    {
      id: 'b-3',
      booking_date: currentMonthDate,
      status: 'confirmed',
      valor_consulta: 200,
      patient_email: 'paciente2@email.com',
      patient_name: 'Paciente Dois',
      business_model: 'livro',
      payment_method: 'pix'
    },
    // Paciente 3 (Checkout abandonado / PIX não pago)
    {
      id: 'b-4',
      booking_date: currentMonthDate,
      status: 'pending_payment',
      valor_consulta: 150,
      patient_email: 'paciente3@email.com',
      patient_name: 'Paciente Três',
      business_model: 'b2c',
      payment_method: 'pix'
    },
    // Paciente Antigo (Primeira consulta no mês passado)
    {
      id: 'b-old',
      booking_date: '2026-08-01',
      status: 'completed',
      valor_consulta: 150,
      patient_email: 'paciente_antigo@email.com',
      patient_name: 'Paciente Antigo',
      business_model: 'b2b'
    }
  ];

  test('renderiza métricas de resumo de growth no cabeçalho e top cards', async () => {
    render(<GrowthAnalyticsModule bookings={mockBookings} />);

    expect(screen.getByText('Crescimento, Funil de Conversão & Metas')).toBeInTheDocument();
    expect(screen.getByText('Novos Pacientes (Mês)')).toBeInTheDocument();
    expect(screen.getByText('Conversão de Checkout')).toBeInTheDocument();
    expect(screen.getByText('Conversão Leads GAD-7')).toBeInTheDocument();
    expect(screen.getByText('Abandono de Checkout')).toBeInTheDocument();
  });

  test('renderiza o painel de acompanhamento de metas mensais', () => {
    render(<GrowthAnalyticsModule bookings={mockBookings} />);

    expect(screen.getByText('Acompanhamento de Metas Mensais')).toBeInTheDocument();
    expect(screen.getByText('Faturamento Realizado (GMV)')).toBeInTheDocument();
    expect(screen.getByText('Consultas Concluídas')).toBeInTheDocument();
    expect(screen.getByText('Novos Pacientes no Mês')).toBeInTheDocument();
    expect(screen.getByText('Retorno para 2ª Sessão')).toBeInTheDocument();
  });

  test('renderiza as etapas do funil de aquisição & conversão', async () => {
    render(<GrowthAnalyticsModule bookings={mockBookings} />);

    expect(screen.getByText('Funil de Aquisição & Conversão')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('1. Testes Concluídos (Leads)')).toBeInTheDocument();
    });
    expect(screen.getByText('2. Leads Qualificados/Contatados')).toBeInTheDocument();
    expect(screen.getByText('3. Checkouts Iniciados')).toBeInTheDocument();
    expect(screen.getByText('4. Pagamentos Confirmados (PIX/Cartão)')).toBeInTheDocument();
    expect(screen.getByText('5. Consultas Realizadas')).toBeInTheDocument();
  });

  test('renderiza a seção de canais de faturamento', () => {
    render(<GrowthAnalyticsModule bookings={mockBookings} />);

    expect(screen.getByText('Canais de Faturamento')).toBeInTheDocument();
    expect(screen.getByText('B2C (Pacientes Diretos)')).toBeInTheDocument();
    expect(screen.getByText('Leitores do Livro')).toBeInTheDocument();
  });

  test('abre modal de metas e permite salvar novas metas via updateSetting', async () => {
    render(<GrowthAnalyticsModule bookings={mockBookings} />);

    const openModalBtn = screen.getByRole('button', { name: /configurar metas/i });
    fireEvent.click(openModalBtn);

    expect(screen.getByText('Configurar Metas Mensais da Clínica')).toBeInTheDocument();

    const saveBtn = screen.getByRole('button', { name: /salvar metas/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockUpdateSetting).toHaveBeenCalledWith('target_monthly_revenue_brl', 30000);
      expect(mockUpdateSetting).toHaveBeenCalledWith('target_monthly_bookings_count', 200);
      expect(mockUpdateSetting).toHaveBeenCalledWith('target_new_patients_count', 30);
      expect(mockUpdateSetting).toHaveBeenCalledWith('target_retention_return_rate_pct', 60);
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Metas salvas com sucesso'
        })
      );
    });
  });

  test('permite navegar para a central de leads GAD-7 via onNavigateTab', () => {
    const mockNavigateTab = jest.fn();
    render(<GrowthAnalyticsModule bookings={mockBookings} onNavigateTab={mockNavigateTab} />);

    const leadsBtn = screen.getByRole('button', { name: /ver central de leads gad-7/i });
    fireEvent.click(leadsBtn);

    expect(mockNavigateTab).toHaveBeenCalledWith('assessment-leads');
  });
});
