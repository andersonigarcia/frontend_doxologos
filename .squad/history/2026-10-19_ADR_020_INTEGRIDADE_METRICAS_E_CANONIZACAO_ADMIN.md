# 🏛️ ADR 020: Integridade Canônica de Métricas, Eliminação de Hardcoding e Confiabilidade no Módulo Administrativo

> **Data:** 2026-10-19  
> **Status:** Aprovado e Implementado (Fase 1)  
> **Escopo:** Módulo Administrativo, Cockpit Estratégico, DRE Financeira, Dashboard Gerencial, RPCs de Sumário  

---

## 📌 1. Contexto e Problema Identificado
Durante a auditoria forense do módulo administrativo (Fase 0), foram identificadas discrepâncias severas que comprometiam a tomada de decisão pelo gestor do negócio:
1. **Hardcoding de Métricas:** O StrategicCockpitModule exibia variação estática `+12.5% vs mês anterior`, mesmo sem dados históricos comparativos.
2. **Divergência de Fontes de Receita:** Quatro fontes divergentes calculavam receita/GMV de maneiras inconsistentes:
   - `totals` em `AdminPage.jsx` somava inclusive agendamentos pendentes, cancelados, expirados e reembolsados ao GMV e à margem.
   - `FinancialControlModule.jsx` (DRE) não paginava consultas e usava fallback de repasse a 100%, zerando a margem da clínica na falta de valor de repasse.
   - Três taxas de retenção arbitrárias conflitavam (20%, 40% e 60%).
3. **Truncamento Silencioso no Supabase:** Consultas diretas sem paginação excediam o limite de 1.000 linhas da API PostgREST, cortando totais históricos silenciosamente.
4. **Mascaramento de Falhas (Error Swallowing):** `catch (e) {}` vazios em dashboards transformavam falhas de rede/permissão em `R$ 0,00` ou `0%`, criando falsa impressão de dados vazios.

---

## 🎯 2. Decisões Arquiteturais e de Negócio Adotadas

### 2.1 Regime Contábil e Regras de Negócio (Alinhadas com o Gestor)
- **Regime de Caixa:** Data-base principal de faturamento é a data de aprovação do pagamento no gateway (`payments.date_approved` / `payments.created_at`), permitindo conciliação 1:1 com o extrato bancário.
- **Receita Realizada:** Apenas pagamentos efetivamente confirmados/pagos menos estornos (`payments.refund_amount`). Agendamentos pendentes são contabilizados estritamente como *"A Receber"*, sem inflar o faturamento realizado.
- **Take Rate Canônico:** Unificado via `system_settings.platform_default_retention_pct` (padrão 40%), evitando multiplicadores soltos no código.

### 2.2 Camada Canônica de Métricas (`src/lib/adminMetrics.js`)
- Criado módulo puro e desacoplado de UI com 100% de cobertura de testes unitários (`src/lib/__tests__/adminMetrics.test.js`).
- Funções canônicas: `summarizeBookingsFinancials`, `pctDelta`, `formatDelta` e `computeOccupancyPct`.
- Regra anti-alucinação de métricas: Se não há base de comparação histórica, retorna explicitamente `null` e a UI renderiza `"—"`, nunca `"0%"` fictício.

### 2.3 Resiliência de Dados e Paginação
- `FinancialControlModule.jsx` implementa paginação recursiva em chunks de 1.000 linhas para garantir integridade mesmo com dezenas de milhares de registros.
- Tratamento explícito de erros com banners de alerta de degradação parcial no `ManagementDashboardPage.jsx` e na DRE.
- Preparada migration SQL `20261019000000_admin_kpi_integrity.sql` para RPCs de banco (`get_dashboard_summary_v3` e `get_dashboard_pulse_phase2`).

---

## 🧪 3. Validação e Conformidade
- [x] 11 testes unitários dedicados em `src/lib/__tests__/adminMetrics.test.js` passando.
- [x] Correção de contexto de rota em `src/components/admin/tabs/__tests__/adminTabs.test.jsx`.
- [x] `npm run check:architecture`: 100% dos guardrails cumpridos.
- [x] Suíte mestre: 24 test suites e 259 testes unitários/integração verdes.
- [x] `npm run build`: Compilação de produção Vite e geração de sitemap bem-sucedidas.
