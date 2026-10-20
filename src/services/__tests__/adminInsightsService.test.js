import {
  generateDeterministicInsights,
  fetchExecutiveInsights
} from '../adminInsightsService';

jest.mock('@/lib/customSupabaseClient', () => ({
  supabase: {
    functions: {
      invoke: jest.fn()
    }
  }
}));

describe('adminInsightsService — Executive Diagnostics Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
  });

  describe('generateDeterministicInsights', () => {
    it('gera diagnóstico coerente para operação com receita e atendimentos', () => {
      const insights = generateDeterministicInsights({
        periodLabel: 'Últimos 30 dias',
        gmvRealized: 15000,
        realizedCount: 100,
        pendingCount: 0,
        toReceive: 0,
        takeRatePct: 40,
        grossMargin: 6000,
        deltaGmvPct: 12.5,
        occupancyPct: 75
      });

      expect(insights.summary).toContain('R$ 15.000,00');
      expect(insights.summary).toContain('100');
      expect(insights.highlight).toContain('R$ 6.000,00');
      expect(insights.isAiGenerated).toBe(false);
      expect(insights.generatedAt).toBeDefined();
    });

    it('alerta sobre cobranças pendentes quando toReceive > 0', () => {
      const insights = generateDeterministicInsights({
        periodLabel: 'Hoje',
        gmvRealized: 500,
        realizedCount: 3,
        pendingCount: 4,
        toReceive: 720
      });

      expect(insights.attentionPoint).toContain('4 cobrança(s) pendente(s)');
      expect(insights.attentionPoint).toContain('R$ 720,00');
      expect(insights.recommendation).toContain('PIX');
    });

    it('tolera payload vazio sem estourar exceções', () => {
      const insights = generateDeterministicInsights();
      expect(insights.summary).toBeDefined();
      expect(insights.highlight).toBeDefined();
      expect(insights.attentionPoint).toBeDefined();
      expect(insights.recommendation).toBeDefined();
    });
  });

  describe('fetchExecutiveInsights', () => {
    it('chama edge function e retorna resposta da IA quando bem-sucedida', async () => {
      const { supabase } = require('@/lib/customSupabaseClient');
      supabase.functions.invoke.mockResolvedValueOnce({
        data: {
          summary: 'Excelente ritmo de agendamentos com alta conversão.',
          highlight: 'Receita cresceu de forma sólida.',
          attentionPoint: 'Nenhum problema grave.',
          recommendation: 'Expandir horários aos sábados.',
          isAiGenerated: true
        },
        error: null
      });

      const res = await fetchExecutiveInsights({
        periodLabel: 'Mês Atual',
        gmvRealized: 20000
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith('admin-insights', expect.any(Object));
      expect(res.summary).toBe('Excelente ritmo de agendamentos com alta conversão.');
      expect(res.isAiGenerated).toBe(true);
    });

    it('ativa fallback seguro caso a Edge Function falhe', async () => {
      const { supabase } = require('@/lib/customSupabaseClient');
      supabase.functions.invoke.mockRejectedValueOnce(new Error('Network timeout'));

      const res = await fetchExecutiveInsights({
        periodLabel: 'Mês Atual',
        gmvRealized: 3000,
        realizedCount: 20
      });

      expect(res.summary).toContain('R$ 3.000,00');
      expect(res.isAiGenerated).toBe(false);
    });
  });
});
