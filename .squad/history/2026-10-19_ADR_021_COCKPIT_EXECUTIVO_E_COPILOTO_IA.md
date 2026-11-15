# ADR 021 — Cockpit Executivo Interativo, Camada de Inteligência e Diagnóstico com IA (Fase 2)

**Status:** APROVADA & IMPLEMENTADA  
**Data:** 2026-10-19  
**Autor:** Antigravity AI Orchestrator  
**Escopo:** Módulo Administrativo / Governança Executiva / Camada de Inteligência (Fase 2)

---

## 1. Contexto e Motivação
Na Fase 1, eliminamos todas as discrepâncias numéricas e hardcodings (`+12.5%`, `75%` ocupação, `65%` retenção), estabelecendo a SSOT das métricas financeiras e clínicas em `adminMetrics.js`.

Na Fase 2, o gestor necessitava de um **Cockpit Executivo** verdadeiramente interativo para tomada de decisões, capaz de:
1. Permitir a navegação entre recortes temporais estratégicos (`Hoje`, `7 dias`, `Últimos 30 dias`, `Mês Atual`, `Mês Anterior`, `Histórico Total`).
2. Fazer drill-down instantâneo a partir dos 4 KPIs vitais (GMV, Margem da Plataforma, Ocupação da Agenda, Atendimentos Realizados).
3. Exportar demonstrativo de fechamento executivo em CSV com um clique.
4. Identificar proativamente gargalos na operação ("Precisa de Você Hoje"), como psicólogos sem horários ativos na grade e cobranças pendentes.
5. Oferecer um **Copiloto Analítico Assistido por IA** (Google Gemini 1.5 Flash) que processe os indicadores e forneça diagnósticos semanais de faturamento, ocupação e oportunidades de rota de produto com **Zero PII** (conformidade ética CFP e LGPD).

---

## 2. Decisões Arquiteturais

### 2.1. Seletor de Períodos e Cálculo de Deltas Reais
- O seletor de períodos em `StrategicCockpitModule` utiliza `filterBookingsByPeriod(bookings, selectedPeriod)` retornando `{ current, previous, label }`.
- O delta percentual é calculado estritamente comparando o período atual com o período anterior equivalente através de `pctDelta(current, previous)` e formatado via `formatDelta(delta)`. Quando não há base de comparação, a interface exibe traço (`—`), prevenindo falsos positivos.

### 2.2. Drill-Down Clicável nos 4 KPIs Vitais
- Os 4 cards de topo foram desenhados como gatilhos de navegação profunda:
  - **GMV Realizado:** Navega para a aba de Controle Financeiro (`'financial-control'`).
  - **Margem da Plataforma:** Navega para DRE e Repasses (`'financial-control'`).
  - **Ocupação da Agenda:** Navega para a Grade de Horários (`'availability'`).
  - **Consultas Realizadas:** Navega para Gestão de Atendimentos (`'bookings'`).

### 2.3. Exportação de Relatório Executivo (CSV)
- Implementada via `generateExecutiveCsvReport(currentSummary, currentBookings, periodLabel)`.
- O arquivo é gerado com BOM UTF-8 (`\uFEFF`) para compatibilidade nativa com Microsoft Excel e nomeado com padrão cronológico `relatorio_executivo_doxologos_<period>_<date>.csv`.
- Zero PII: o relatório exporta somente identificadores de sessão, datas, nomes profissionais e valores contábeis.

### 2.4. Camada de Inteligência e Copiloto com IA (Zero PII & Resiliência Dual)
- **Edge Function:** `supabase/functions/admin-insights/index.ts` autenticada com RBAC estrito (`app_metadata.roles` contendo `admin`).
- **Modelo:** Google Gemini 1.5 Flash com prompt orientado a negócios em psicologia clínica e telemedicina.
- **Transmissão Segura de Dados:** Apenas agregados numéricos consolidados são enviados ao modelo (GMV realizado, quantidade de consultas, ocupação, take rate). Nenhum nome, e-mail ou anotação de paciente sai do dispositivo.
- **Fallback Determinístico Local:** O serviço `adminInsightsService.js` contém motor heurístico local que gera diagnósticos analíticos coerentes caso a Edge Function ou a chave da IA estejam indisponíveis ou offline. O painel nunca trava ou fica em branco.
- **Cache de Sessão:** `sessionStorage` armazena os insights por 10 minutos por combinação de período/volume, evitando chamadas redundantes ao alternar filtros.

### 2.5. Central de Alertas Críticos ("Precisa de Você Hoje")
- Monitora em tempo real:
  - Cobranças / agendamentos pendentes de confirmação.
  - Psicólogos ativos sem horários configurados na grade semanal (`availability`).
  - Status do motor fiscal NFS-e assíncrono.

---

## 3. Arquivos Modificados / Criados
- `supabase/functions/admin-insights/index.ts` (Edge Function com Gemini 1.5 Flash e fallback determinístico).
- `src/services/adminInsightsService.js` (Serviço canônico de diagnósticos e cache de sessão).
- `src/services/__tests__/adminInsightsService.test.js` (Testes unitários do serviço e do fallback determinístico).
- `src/components/admin/StrategicCockpitModule.jsx` (Cockpit executivo interativo completo).
- `src/components/admin/__tests__/StrategicCockpitModule.test.jsx` (7 testes unitários do cockpit, drill-down, IA e CSV).

---

## 4. Resultados da Validação
- **Testes Unitários:** 26 suítes / 275 testes verdes (`npm test`).
- **Guardrails de Arquitetura:** 100% aprovado (`npm run check:architecture`).
- **Build de Produção:** Concluído com sucesso em 25s (`npm run build`).
