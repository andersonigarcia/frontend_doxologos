# Dicionário de Métricas — Módulo Administrativo (Fase 0)

> **Status:** Diagnóstico (somente leitura). Gerado em 2026-10-19.
> **Objetivo:** mapear onde cada KPI é calculado hoje, com que definição, e onde há divergência.
> Colunas "Definição proposta" dependem das decisões abertas do plano (take rate, regime contábil).

## 1. As 4 "fontes" de receita hoje

| Fonte | Onde | O que soma | Data-base | Status incluídos |
|---|---|---|---|---|
| **A. `totals` (cliente)** | [AdminPage.jsx L1529-1584](../../src/pages/AdminPage.jsx) | `valor_consulta` das reservas **carregadas na tela** | — | **TODOS** (pendente, cancelada, reembolsada, expirada) em `totalValue` e `totalPlatformFee` |
| **B. DRE (cliente)** | [FinancialControlModule.jsx L50-95](../../src/components/admin/FinancialControlModule.jsx) | `valor_consulta` via query direta, sem paginação | `booking_date` | `paid`, `completed`, `confirmed` |
| **C. RPC `get_dashboard_summary_v3`** | [20260913_dashboard_phase2.sql L63-144](../../supabase/migrations/20260913_dashboard_phase2.sql) | `payments.amount` aprovados | `payments.created_at` (**caixa**) | `payments.status = 'approved'` |
| **D. `useFinancialData`** | [useFinancialData.jsx L54](../../src/hooks/useFinancialData.jsx) | **repasse do profissional** (não GMV) como `monthlyRevenue` | — | `confirmed` |

> [!CAUTION]
> Os quatro números se chamam "receita" ou "GMV" em telas diferentes e **não batem entre si**.

## 2. Dicionário por KPI

| KPI | Tela | Cálculo atual | Problema | Definição proposta |
|---|---|---|---|---|
| **GMV (Cockpit)** | Dashboard & KPIs | `summaryData.receita_consultas` = `totals.totalValue` (fonte A) | Inclui pendentes, canceladas, reembolsadas | Soma de `payments` aprovados menos estornos (RPC única) |
| **"Receita Líquida Plataforma" (Cockpit)** | Dashboard & KPIs | `netMargin = totals.totalPlatformFee` (valor − repasse) | É margem **bruta**. Nome diz "líquida". Inclui status cancelados | Margem bruta e líquida separadas e nomeadas |
| **Margem líquida (DRE)** | Controladoria & DRE | bruta − taxa MP (2,99%) − NFS-e (6%) | Taxas **estimadas** por percentual fixo, não reais do MP | Usar taxa real do MP (`fee_details`) quando disponível |
| **Take rate (Cockpit)** | Dashboard & KPIs | `totalPlatformFee/totalValue`; fallback **20%** (L60) | Fallback 20% ≠ 40% do restante | Uma só fonte: dado real, fallback = `platform_default_retention_pct` |
| **Take rate (DRE)** | DRE | `margem/GMV`; fallback `platform_default_retention_pct` (40) | — | Idem |
| **Repasse padrão** | `useAdminData`, `AgendamentoPage` | `price × 0,60` e `× 0,40` **fixos no código** | Ignora `platform_default_retention_pct` configurável | Ler de `system_settings` |
| **Retenção em cancelamento de pacote** | `packageRefundCalculator.js` | constante `0,20` | Terceira "retenção" independente | Ler de `system_settings` |
| **Variação vs mês anterior (Cockpit)** | Dashboard & KPIs | texto fixo `+12.5%` (L115) | **Falso** | Comparativo real do período anterior |
| **Variação (Gerencial)** | `/admin/dashboard` | `*_delta_pct` do RPC | RPC devolve **0 fixo** ("Simplificado", L133/135/137); a tela exibe "+0%" | Calcular no RPC |
| **Ocupação da agenda** | Cockpit | `consultas / (profissionais × 80)` | 80 slots arbitrários; usa só `consultas_confirmadas` | Horas reservadas ÷ horas publicadas em `availability` |
| **Consultas realizadas** | Cockpit | `consultas_confirmadas` = `totals.totalBookings` = **todas** as reservas da lista | Rótulo diz "realizadas", conta tudo | `status in (completed)` + no-show separado |
| **Consultas (Gerencial)** | `/admin/dashboard` | `status in (confirmed, completed)` por `booking_date` | Mistura futuras confirmadas com realizadas | Separar "agendadas" e "realizadas" |
| **Conversão** | `/admin/dashboard` | `confirmed+completed ÷ todas reservas` | Não é conversão de funil (reserva criada ≠ visitante) | Renomear "taxa de confirmação" ou criar funil real |
| **Ticket médio** | Gerencial | `receita (caixa) ÷ consultas (data da consulta)` | Numerador e denominador com datas-base diferentes | Mesma data-base |
| **Pacientes únicos** | Gerencial | `count(distinct patient_email)` | E-mail como identidade | `patient_id` |
| **Novos pacientes / LTV / recorrência** | `DashboardGrowth` | agrupa por e-mail ou nome; carrega **todas** as reservas | Sem paginação (limite 1000); identidade frágil | RPC com `patient_id` |
| **Retenção 2ª sessão** | `PatientAnalyticsDashboard` L109 | `pacientes com ≥2 ÷ total` | Não é coorte (não mede tempo) | Retenção M1/M3 por coorte |
| **Receita de eventos** | Gerencial | `inscricoes_eventos.payment_status='confirmed'` com `EXCEPTION WHEN undefined_column OR others → 0` | **Engole qualquer erro e mostra 0** | Remover o catch genérico |

## 3. Falhas de robustez comuns

1. **Erro vira zero:** `ManagementDashboardPage` L97/103/109 usam `catch (e) {}` vazio. O RPC de eventos engole todas as exceções.
2. **Fallback silencioso v3 → v1:** se `get_dashboard_summary_v3` falhar, a tela usa a v1 e mostra "receita_eventos: 0", sem avisar o gestor.
3. **Duas definições de data:** contagens por `booking_date`, receita por `payments.created_at`.
4. **Limite de 1000 linhas** do Supabase em consultas diretas (DRE, Growth, ledger de IA).
5. **`totals` depende do que a tela carregou:** se o filtro ou a paginação reduzirem a lista, o KPI muda (ver `useAdminData`).

## 4. Pontos a confirmar na Fase 0 (próximo passo)

- Reservas carregadas em `useAdminData` têm filtro de período ou limite? Isso afeta a fonte A.
- Existe tabela de estorno que permita descontar reembolsos do GMV (`RefundRequestDashboard`)?
- A taxa real do MP é guardada em `payments`?
- Conciliar manualmente 1 mês: A × B × C × extrato do Mercado Pago × ledger.

## 5. Decisões necessárias do gestor

1. Take rate: fixo (40%) ou variável por profissional/serviço?
2. Regime do DRE: caixa (data do pagamento) ou competência (data da consulta)?
