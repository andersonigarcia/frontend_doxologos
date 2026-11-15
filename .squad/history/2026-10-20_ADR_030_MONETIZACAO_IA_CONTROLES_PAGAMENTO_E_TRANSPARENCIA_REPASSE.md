# 🏛️ ADR 030: Governança Financeira da IA, Deduções de Repasse & Transparência Empática

> **Status:** Aprovado & Implementado  
> **Data:** 2026-10-20  
> **Domínio:** Fintech / IA Runtime / Repasses Profissionais / DRE Gerencial  
> **Autores:** Orquestrador Central Squad Doxologos  

---

## 1. Contexto & Desafio de Negócio

A plataforma Doxologos disponibiliza aos psicólogos o **Copiloto de Evolução Clínica com IA** (geração automática de notas no padrão SOAP via Gemini 1.5 e transcrição STT).
O modelo econômico estabelece:
1. **Degustação (Trial):** 3 consultas gratuitas por profissional sem nenhum custo ou dedução.
2. **Modelo Add-on Pós-Trial:** Taxa de R$ 2,90 por consulta assistida com IA (parametrizável em `system_settings.ai_copilot_addon_price`).
3. **Premissa Inviolável:** **O valor cobrado pelo uso de IA pertence 100% à plataforma**, não sendo rateado com o psicólogo. A plataforma assume os custos técnicos de infraestrutura/tokens (R$ 1,20) e retém a margem líquida de contribuição da tecnologia (R$ 1,70).

### Problemas Identificados (Blast Radius Forense):
- **Controles de Pagamento (`PaymentFormModal` & `usePaymentCalculation`):** O cálculo de repasse ignorava a tabela `ai_usage_ledger`, não descontando os add-ons dos honorários e deixando os lançamentos órfãos com status `pending_payout_deduction`.
- **DRE da Plataforma (`FinancialControlModule`):** A demonstração de resultado desconsiderava a receita de IA e os custos técnicos de LLM, distorcendo a margem líquida real da empresa.
- **Painel do Profissional (`FinancialDashboard` & `useFinancialData`):** Falta de transparência visual sobre os usos de IA e deduções. Profissionais de psicologia possuem aversão a cálculos matemáticos complexos; descontos inesperados ou sem explicação clara geravam desconfiança e atrito operacional.

---

## 2. Decisão Arquitetural & Regras Canônicas

### 2.1 Fechamento Contábil no Repasse (`usePendingPaymentAmount` & `PaymentFormModal`)
- `usePendingPaymentAmount` passa a consultar `ai_usage_ledger` filtrando por `professional_id` e `billing_status = 'pending_payout_deduction'`.
- Os cálculos são realizados com estrita precisão monetária em centavos (`money.js`):
  $$\text{Repasse Líquido} = \max(0, \text{Honorários Brutos Consultas} - \text{Deduções de IA})$$
- Ao confirmar o pagamento no `PaymentFormModal`:
  1. O registro de pagamento em `professional_payments` registra o valor líquido e anexa no campo `notes` a discriminação auditável: `[Extrato de Repasse: Honorários Brutos R$ X | Dedução IA (N usos): -R$ Y | Repasse Líquido: R$ Z]`.
  2. Os registros correspondentes em `ai_usage_ledger` são atualizados atomicamente para `billing_status = 'deducted'`.

### 2.2 DRE Consolidada e Resultado Líquido Real (`FinancialControlModule`)
- A DRE Gerencial busca no `ai_usage_ledger` os usos do período selecionado.
- Linhas adicionadas na demonstração:
  - `(+) RECEITA DE SERVIÇOS DE IA (Add-ons • 100% Plataforma)`: Faturamento integral dos add-ons.
  - `(-) Custos Técnicos de IA (APIs Gemini, Transcrição & Processamento)`: Custos de fornecedores.
  - `(=) MARGEM BRUTA CONSOLIDADA`: Margem de Consultas + Receita Integral de IA.
  - `(=) RESULTADO LÍQUIDO OPERACIONAL CONSOLIDADO`: Reflete com transparência absoluta a rentabilidade real pós gateway, impostos e custos de IA.

### 2.3 UX Empática para Psicólogos no Painel Profissional (`FinancialDashboard`)
- Eliminação de atrito com exatas: criação do **Demonstrativo Simples do Seu Repasse** em linguagem natural:
  1. `1. Suas Consultas Realizadas`: Honorários das sessões atendidas.
  2. `2. Assistente IA de Prontuários`: Quantidade de prontuários gerados com IA e valor investido na infraestrutura tecnológica (ou `R$ 0,00` se degustação gratuita).
  3. `3. Seu Repasse Líquido`: O valor líquido exato que cai na conta bancária do psicólogo.
- Banner de Status de IA & Degustação indicando claramente consultas restantes de degustação (`ai_trial_sessions_used` vs `ai_trial_limit`).

---

## 3. Conformidade & Testes

- 332 testes unitários e de integração verdes (`npm test`).
- Suíte `adminMetrics.test.js` expandida com validação de `summarizeAiEconomics` e exportação executiva CSV com seção de IA.
- Guardrails de arquitetura (`npm run check:architecture`) 100% conformes.
- Compilação de produção (`npm run build`) validada sem advertências.
