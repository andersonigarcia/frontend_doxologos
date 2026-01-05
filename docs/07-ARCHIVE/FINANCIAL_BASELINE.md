# Baseline Financeiro - Dez/2025

## Visão Geral
O fluxo financeiro atual integra Supabase, Edge Functions (Mercado Pago e créditos) e o front React. Não há livro razão formal; o controle depende de registros em `payments`, `bookings`, `inscricoes_eventos` e `financial_credits`.

## Tabelas Principais
| Tabela | Campos Relevantes | Origem / Uso |
| --- | --- | --- |
| `payments` | `id`, `booking_id`, `mp_payment_id`, `status`, `payment_method`, `amount`, `net_amount`, `fee_amount`, `qr_code`, `raw_payload` | Populada por `MercadoPagoService` após chamadas às Edge Functions PIX/preference. Atualizada pelo front quando o pagamento confirma (polling). |
| `bookings` | `id`, `status`, `valor_consulta`, `valor_repasse_profissional`, `last_payment_reminder_sent_at` | Criada em `AgendamentoPage.jsx`. Status atualizado por `CheckoutPage.jsx` quando o pagamento aprova ou crédito é utilizado. |
| `inscricoes_eventos` | `id`, `evento_id`, `payment_id`, `status_pagamento`, `zoom_link_sent` | Criada em `EventoDetalhePage.jsx` e associada a pagamentos PIX de eventos. |
| `financial_credits` | `id`, `user_id`, `amount`, `status`, `metadata`, `used_booking_id` | Mantida pela Edge Function `financial-credit-manager`. Guarda créditos gerados por cancelamentos. |
| `services` | `id`, `price`, `professional_payout`, `duration_minutes` | Catálogo de serviços usado para calcular preço x repasse. |

## Fluxos de Pagamento
1. **Consultas (Checkout):**
   - `CheckoutPage.jsx` lê `booking_id`, calcula valor e chama `MercadoPagoService.createPixPayment` (PIX direto) ou `createPreference` (redirect/card).
   - Resultado do PIX é exibido inline e o front realiza polling com `checkPaymentStatus`. Quando status `approved`, o próprio front atualiza `payments`, `bookings.status` (confirmed) e exibe sucesso.
   - Créditos financeiros podem quitar um booking sem Mercado Pago via `financial-credit-manager` (`reserve` → `consume`). O front registra o pagamento manualmente em `payments`.
2. **Eventos:**
   - `EventoDetalhePage.jsx` cria inscrições. Se `valor > 0`, chama Edge Function `mp-create-payment` (Mercado Pago PIX) e envia QR code por email.
   - Status do pagamento ainda depende de update manual (admin) ou scripts externos; não há webhook registrando confirmações automaticamente.

## Edge Functions Atuais
| Função | Papel | Entradas/saídas |
| --- | --- | --- |
| `mp-create-payment` | Cria pagamento PIX (consulta/evento). | Recebe `booking_id` ou `inscricao_id`; retorna `payment_id`, `qr_code`. |
| `mp-check-payment` | Consulta status no MP. | Usa `payment_id`, devolve `status/status_detail`. |
| `mp-create-preference` | Cria preferência para cartão/boleto. | Configuração via `payment_methods`. |
| `mp-refund` / `mp-process-card-payment` | Suporte a reembolsos e cartão direto. | Chaves do MP via environment. |
| `financial-credit-manager` | CRUD de créditos. | Ações `list`, `create`, `reserve`, `release`, `consume`; exige token do usuário ou service role. |
| `patient-cancel-booking` | Cancela consulta e gera crédito automático quando aplicável. | Recebe booking id + motivo; cria registro em `financial_credits`. |

## Observabilidade Atual
- `console.log`/`secureLog` espalhados pelas telas; `logger` só é usado em alguns módulos (`bookingEmailManager`, `CheckoutPendingPage`).
- Edge Functions usam apenas `console.error` para falhas.
- Não existe correlação automática entre logs de front e Edge Functions.

## Lacunas Identificadas
1. **Atualização Manual de Status:** ausência de webhooks obriga o front a atualizar `payments` e `bookings`, o que gera divergências se o usuário fecha a aba.
2. **Falta de Campos de Origem:** `payments` não distingue `booking` x `evento` de forma explícita (`source_type`, `source_id`).
3. **Sem Livro Razão:** `valor_repasse_profissional` é apenas um campo; inexistem obrigações agregadas por profissional.
4. **Telemetria Fragmentada:** logs não padronizados dificultam auditoria e troubleshooting.
5. **Créditos sem Contabilização:** `financial_credits` não gera entradas em `payments` ou ledger; consumo depende da aplicação front.

## Próximos Passos (ligados à Fase 0)
- Instrumentar `MercadoPagoService`, `CheckoutPage.jsx`, `EventoDetalhePage.jsx` e `financial-credit-manager` com `logger`/logs estruturados.
- Registrar resultado dos smoke tests em `docs/FINANCIAL_PHASE0_PLAN.md`.
- Validar doc com time financeiro e usar como referência para migrations da Fase 1.
