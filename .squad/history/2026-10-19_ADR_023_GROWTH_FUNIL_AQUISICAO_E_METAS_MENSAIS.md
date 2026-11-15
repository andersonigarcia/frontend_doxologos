# ADR 023 — Gestão de Growth, Funil de Aquisição e Metas Mensais

## Status
Aceito (2026-10-19)

## Contexto
Na Fase 4 da reestruturação do módulo administrativo da Doxologos Psicologia, a gestão clínica necessitava de uma visão ponta a ponta sobre o crescimento da clínica:
1. **Falta de Monitoramento de Metas Mensais:** Objetivos de receita (GMV), consultas realizadas, novos pacientes e taxa de retenção existiam informalmente, sem acompanhamento em tempo real contra o realizado e sem persistência configurável.
2. **Desconexão do Funil de Conversão:** A transição entre visitantes que realizam testes de triagem (GAD-7 / PHQ-9), iniciam checkout, concluem pagamentos (PIX/Cartão) e realizam a consulta médica/psicológica não estava consolidada.
3. **Falta de Clareza sobre Canais de Faturamento:** A clínica atende B2C, empresas/parceiros (B2B), leitores do livro e participantes de workshops/eventos, mas a receita por canal não era agregada de forma padronizada.
4. **Vazamento de Métricas no Dashboard Growth Antigo:** O antigo `DashboardGrowth.jsx` fazia consultas diretas ao banco sem passar pelo SSOT, expondo dados sem anonimização.

## Decisões Tomadas
1. **Cálculo Canônico em `adminMetrics.js`:**
   - `computeFunnelMetrics(bookings, leads)`: Consolida as 5 etapas do funil clínico:
     1. Testes Concluídos (Leads)
     2. Leads Qualificados/Contatados
     3. Checkouts Iniciados
     4. Pagamentos Confirmados (PIX/Cartão)
     5. Consultas Realizadas
     Calcula a taxa de conversão do checkout e taxa de abandono (PIX expirado / pendente).
   - `computeChannelAcquisition(bookings)`: Agrupa receitas e volume por canal (B2C, B2B, Livro, Eventos, Orgânico).
   - `computeMonthlyGoalsProgress(currentMetrics, targets)`: Compara as 4 metas configuradas contra o realizado do mês, atribuindo status visual (`achieved`, `on_track`, `at_risk`).
2. **Persistência de Metas em `system_settings`:**
   - As metas mensais são persistidas de forma flexível via `useSystemSettings`:
     - `target_monthly_revenue_brl` (padrão R$ 30.000,00)
     - `target_monthly_bookings_count` (padrão 200)
     - `target_new_patients_count` (padrão 30)
     - `target_retention_return_rate_pct` (padrão 60%)
   - Disponibilizado modal de edição acessível no cabeçalho do módulo.
3. **Módulo Executivo `GrowthAnalyticsModule.jsx`:**
   - 4 Top Cards (Novos Pacientes no Mês, Conversão de Checkout, Conversão Leads GAD-7, Abandono de Checkout).
   - Painel com barras de progresso dinâmicas para as metas mensais.
   - Grid integrado com Funil de Aquisição e Canais de Faturamento com redirecionamento contextual para `assessment-leads`.
4. **Governança & Navegação:**
   - Tab `growth` adicionada a `tabsConfig.js`.
   - Módulo 5 da Sidebar atualizado para "5. Growth & Marketing" contendo as abas de Growth e Leads.
   - Substituição do antigo `DashboardGrowth` pelo novo `GrowthAnalyticsModule` em `AdminPage.jsx`.

## Consequências
- **Positivas:**
  - Gestor obtém clareza total sobre o atingimento das metas do mês com progresso visual.
  - Identificação imediata de abandono de checkout para ativação de réguas de recuperação de PIX.
  - Visibilidade de qual canal de marketing e parcerias gera maior tração financeira.
  - Zero PII: pacientes agregados e anonimizados.
- **Validação:**
  - 28 suítes de testes Jest (294 testes verdes).
  - `npm run check:architecture` 100% conforme.
  - Build de produção Vite concluído com sucesso.
