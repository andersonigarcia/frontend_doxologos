# ADR 031: Unificação Canônica dos 3 Módulos de Reembolso, Proteção Anti-Clawback e Sigilo Clínico

**Data:** 2026-10-21  
**Status:** Aprovado / Implementado  
**Contexto:** Orquestrador Doxologos / Squad Central / Esteira Full-Track (Fintech, Checkout & Sigilo Clínico)

---

## 1. Contexto e Problema

O ecossistema Doxologos operava três modalidades distintas de estorno/cancelamento de forma fragmentada:
1. **Reembolso Manual Financeiro (Admin/Fintech):** Invocação de Edge Function para pagamentos com anexação de comprovante, mas sem validação de integridade sobre se os honorários da consulta já haviam sido transferidos ao psicólogo e sem partidas automáticas no ledger contábil.
2. **Cancelamento do Paciente (Portal Paciente):** Regra de 24 horas implementada com textos e mensagens duplicadas, correndo risco de vazamento de motivos clínicos em e-mails e logs.
3. **Reembolso de Pacotes & Eventos:** Cálculo de 80% reembolso / 20% taxa de retenção administrativa para pacotes e reversão de splits para workshops/eventos espalhados em componentes ad-hoc.

Riscos Ocultos Mapeados:
- **Descasamento Financeiro (Clawback Liability):** Se o paciente solicita cancelamento ou um admin aprova estorno de uma consulta cujo repasse ao profissional já foi pago no fechamento quinzenal/mensal, a plataforma absorve o rombo se não houver trava de aviso prévio.
- **Sigilo Clínico & Zero PII (CFP Art. 9º / LGPD Art. 11):** Motivos de cancelamento contendo termos como "crise", "pânico", "depressão" ou "diagnóstico" poderiam ser expostos em templates de e-mail e logs de auditoria.
- **Inconsistência no DRE / Ledger:** Estornos não eram escriturados automaticamente em `payment_ledger_entries`.

---

## 2. Decisão Arquitetural

1. **Criação do Serviço Canônico `src/services/refundService.js`:**
   - Single Source of Truth para todas as operações de estorno, cancelamento e reversão de splits.
   - Whitelists estritas de campos (`ALLOWED_PAYMENT_REFUND_FIELDS` e `ALLOWED_PAYMENT_LEDGER_FIELDS`) em sincronia com `databaseCatalog.json` contra erro Postgres `42703`.
2. **Higienização Zero PII com Bloqueio de Vocabulário Clínico:**
   - Função `sanitizeRefundReason` que intercepta termos diagnósticos/psiquiátricos e substitui por redação administrativa neutra.
3. **Guarda de Integridade de Repasse (`checkPayoutIntegrityForRefund`):**
   - Inspeciona se a consulta possui vínculo ativo em `payment_bookings` com `professional_payments.status === 'paid'`.
   - Exibe alerta proeminente em `PaymentsPage.jsx` para o gestor financeiro antes de autorizar o estorno.
4. **Escrituração Contábil Balanceada no Ledger (`recordRefundLedgerEntries`):**
   - Gera partidas dobradas imutáveis: `DEBIT REFUNDS_EXPENSE` e `CREDIT CASH_BANK` para cada devolução financeira.
5. **Unificação da Regra de 24 Horas:**
   - Centraliza o cálculo `evaluatePatientCancellationEligibility` com suporte à carteira virtual (`patient_wallets`).
6. **Consolidação de Pacotes e Eventos:**
   - `evaluatePackageRefund` (80% paciente / 20% plataforma) e `processEventRefundReversal` com e-mails higienizados.

---

## 3. Consequências e Resultados

- **Zero Regressão:** Mantida 100% de retrocompatibilidade com re-exportação estratégica em `paymentService.js`.
- **Blindagem Jurídica e Ética:** Nenhuma nota clínica vaza em e-mails SendGrid ou logs de sistema.
- **Transparência Contábil:** O DRE e extratos do módulo financeiro passam a reconciliar perfeitamente os estornos com as saídas bancárias.
- **Validação Empírica:** 100% dos testes unitários e guardrails arquiteturais aprovados no pipeline.
