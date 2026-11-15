# 💳 Guia de Testes e Simulações - Mercado Pago (QA & Squad)

Este documento centraliza as credenciais de teste, cartões simulados e códigos de status para validação de fluxos de checkout (PIX e Cartão) e Webhook no Doxologos.

---

## 1. 📋 Cartões de Teste Oficiais (Sandbox / QA)

Utilize estes cartões em ambiente de testes ou homologação:

| Bandeira | Número do Cartão | Código de Segurança (CVV) | Data de Validade |
| :--- | :--- | :--- | :--- |
| **Mastercard** | `5480 8328 0103 3311` | `123` | `11/30` |
| **Visa** | `4235 6477 2802 5682` | `123` | `11/30` |
| **American Express** | `3753 651535 56885` | `1234` | `11/30` |
| **Elo Débito** | `5067 7667 8388 8311` | `123` | `11/30` |

---

## 2. 🎯 Simulação de Resultados e Respostas da Operadora

Para forçar respostas específicas da adquirente/banco emissor no Mercado Pago Sandbox, utilize o código de 3 ou 4 letras no campo **Nome do Titular do Cartão** (ex: `APRO Teste`, `OTHE Teste`) e utilize o CPF indicado:

| Código | Descrição do Status | Status Esperado | Documento de Identidade Exigido |
| :--- | :--- | :--- | :--- |
| **`APRO`** | Pagamento aprovado | `approved` (`accredited`) | `(CPF) 12345678909` |
| **`OTHE`** | Recusado por erro geral | `rejected` (`cc_rejected_other_reason`) | `(CPF) 12345678909` |
| **`CONT`** | Pagamento pendente / Em análise | `in_process` (`pending_contingency`) | `(CPF) 12345678909` |
| **`CALL`** | Recusado com validação para autorizar | `rejected` (`cc_rejected_call_for_authorize`) | `(CPF) 12345678909` |
| **`FUND`** | Recusado por saldo/quantia insuficiente | `rejected` (`cc_rejected_insufficient_amount`) | `(CPF) 12345678909` |
| **`SECU`** | Recusado por código de segurança inválido | `rejected` (`cc_rejected_bad_filled_security_code`) | `(CPF) 12345678909` |
| **`EXPI`** | Recusado por problema com data de vencimento | `rejected` (`cc_rejected_bad_filled_date`) | `(CPF) 12345678909` |
| **`FORM`** | Recusado por erro no formulário | `rejected` (`cc_rejected_bad_filled_other`) | `(CPF) 12345678909` |

---

## 3. 🧪 Chave PIX e Validação Dinâmica

* **Chave PIX da Clínica (CNPJ):** `35035127000120`
* **Nome do Beneficiário:** Doxologos Psicologia / HFEAHDGBC42170
* **Conta Oficial MP:** `3532332688`
* **Fluxo de Geração:** A API do Mercado Pago injeta a chave Pix dinamicamente via SPI/DICT do Banco Central no payload `point_of_interaction.transaction_data.qr_code`.

---

## 4. 🔔 Webhooks de Notificação

* **URL de Notificação:** `https://ppwjtvzrhvjinsutrjwk.supabase.co/functions/v1/mp-webhook`
* **Eventos Assinados:** `payment`
* **Assinatura:** HMAC SHA-256 (`x-signature` e `x-request-id`) validada por `MP_WEBHOOK_SECRET`.
* **Permissão de Gateway:** Deploy com `--no-verify-jwt` para aceitar requisições de servidores do Mercado Pago.
