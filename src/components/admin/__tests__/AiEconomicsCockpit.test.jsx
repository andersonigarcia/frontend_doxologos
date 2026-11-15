import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AiEconomicsCockpit } from '../AiEconomicsCockpit';

jest.mock('@/hooks/useSystemSettings', () => ({
  useSystemSettings: () => ({
    settings: {
      ai_monthly_budget_cap: 500
    }
  })
}));

const mockSupabaseData = [
  {
    id: 'ledger-1',
    booking_id: 'b-1',
    professional_id: 'prof-1',
    is_trial: false,
    add_on_amount: 2.90,
    technical_cost: 1.20,
    net_margin: 1.70,
    billing_status: 'deducted',
    created_at: '2026-10-15T10:00:00Z',
    professional: { id: 'prof-1', name: 'Dr. Lucas Ribeiro', crp: '06/12345' },
    booking: { id: 'b-1', booking_date: '2026-10-15', patient_name: 'Mariana Souza' }
  },
  {
    id: 'ledger-2',
    booking_id: 'b-2',
    professional_id: 'prof-2',
    is_trial: true,
    add_on_amount: 0,
    technical_cost: 1.20,
    net_margin: -1.20,
    billing_status: 'trial_free',
    created_at: '2026-10-16T14:00:00Z',
    professional: { id: 'prof-2', name: 'Dra. Beatriz Santos', crp: '06/54321' },
    booking: { id: 'b-2', booking_date: '2026-10-16', patient_name: 'Carlos Oliveira' }
  }
];

jest.mock('@/lib/customSupabaseClient', () => ({
  supabase: {
    from: jest.fn((table) => {
      if (table === 'ai_usage_ledger') {
        return {
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: mockSupabaseData, error: null })
        };
      }
      if (table === 'professionals') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ count: 5, data: null, error: null })
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null })
      };
    })
  }
}));

describe('AiEconomicsCockpit (Fase 5 - Cockpit Financeiro de IA)', () => {
  it('deve renderizar o cabeçalho no padrão Card Claro Premium Doxologos', async () => {
    render(<AiEconomicsCockpit onNavigateTab={jest.fn()} />);

    expect(screen.getByText('Cockpit Financeiro da IA & Telemedicina')).toBeInTheDocument();
    expect(screen.getByText(/Modelo Add-on: R\$ 2,90\/sessão/)).toBeInTheDocument();
    expect(screen.getByText('Ajustar Taxas & Limites')).toBeInTheDocument();
  });

  it('deve calcular e exibir os 4 KPIs vitais de IA', async () => {
    render(<AiEconomicsCockpit onNavigateTab={jest.fn()} />);

    await waitFor(() => {
      // 1 sessão paga de R$ 2,90
      expect(screen.getByText('Receita Bruta (Add-on)')).toBeInTheDocument();
      expect(screen.getByText('Custos de Infraestrutura')).toBeInTheDocument();
      expect(screen.getByText('Margem Líquida da IA')).toBeInTheDocument();
      expect(screen.getByText('Aderência da Equipe')).toBeInTheDocument();
    });
  });

  it('deve renderizar a decomposição unitária e o card de guardrails', async () => {
    render(<AiEconomicsCockpit onNavigateTab={jest.fn()} />);

    expect(screen.getByText('Decomposição Unitária do Add-on (Por Consulta)')).toBeInTheDocument();
    expect(screen.getByText('+58,6% Margem Líquida')).toBeInTheDocument();
    expect(screen.getByText('Guardrails & Resiliência')).toBeInTheDocument();
    expect(screen.getByText('Circuit Breaker Telemedicina')).toBeInTheDocument();
  });

  it('deve disparar navegação para a aba settings ao clicar no botão de limites', async () => {
    const mockNavigate = jest.fn();
    render(<AiEconomicsCockpit onNavigateTab={mockNavigate} />);

    const settingsBtn = screen.getByText('Ajustar Taxas & Limites');
    fireEvent.click(settingsBtn);

    expect(mockNavigate).toHaveBeenCalledWith('settings');
  });

  it('deve filtrar os lançamentos do ledger entre Todos, Pagos e Degustação', async () => {
    render(<AiEconomicsCockpit onNavigateTab={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Todos \(2\)/)).toBeInTheDocument();
      expect(screen.getByText(/Pagos \(1\)/)).toBeInTheDocument();
      expect(screen.getByText(/Degustação \(1\)/)).toBeInTheDocument();
    });

    // Clicar no filtro de Pagos
    fireEvent.click(screen.getByText(/Pagos \(1\)/));
    expect(screen.getAllByText('Dr. Lucas Ribeiro').length).toBeGreaterThan(0);
  });
});
