# 💰 Plano de Reaproveitamento de Créditos Financeiros

**Data:** 09/11/2025  
**Status:** Em andamento (Fase 1 – infraestrutura de dados criada)

---

## 🎯 Objetivos

- Permitir que pacientes reaproveitem valores pagos em consultas canceladas ou reagendadas conforme as regras de negócio.
- Garantir rastreabilidade completa de origem e uso de cada crédito, com auditoria simples para o time financeiro.
- Integrar o crédito ao fluxo de agendamento/checkout, evitando cobranças duplicadas.

---

## 🧱 Infraestrutura de Dados

### 1. Tabela `financial_credits`

- Armazena cada crédito individual com vínculos para usuário, agendamento e pagamento que o originou.
- Campos principais:
  - `amount`, `currency` – valor do crédito.
  - `status` – `available`, `reserved`, `used`, `expired`.
  - `metadata` – espaço para notas, justificativas, IDs externos.
  - `used_booking_id` / `used_payment_id` – rastreiam onde o crédito foi consumido.
- RLS: pacientes só enxergam os próprios créditos.

### 2. View `user_credit_balances`

- Soma valores por status para exibir saldo em tempo real na interface.
- `security_barrier` ativado + RLS herdada da tabela base.

### 3. Permissões

- `authenticated` tem `SELECT` protegido via RLS.
- Operações de criação/uso devem ocorrer via service role (Edge Function / API interna).

---

## 🔄 Ciclo de Vida do Crédito

| Etapa | Status | Ação | Observações |
|-------|--------|------|-------------|
| Crédito criado (ex: cancelamento >24h) | `available` | Inserir registro | `source_type='cancellation'`, `amount=valor pago` |
| Paciente inicia novo agendamento com crédito | `reserved` | Atualizar registro | Guardar `reserved_at` e `metadata` `reservation_token` |
| Agendamento confirmado (sem pagamento extra) | `used` | Atualizar registro | Definir `used_booking_id`, `used_payment_id`, `used_at` |
| Crédito não utilizado (reserva expirada) | `available` | Atualizar registro | Limpar campos de reserva/uso |
| Crédito expirado manualmente | `expired` | Atualizar registro | Opcional, para políticas de validade |

---

## 🔌 Integrações Necessárias

### 1. Cancelamento de Agendamento

- Quando paciente cancela dentro da política de crédito:
  - Recuperar pagamento confirmado (`payments.status` in `['approved','authorized','settled','paid']`).
  - Criar crédito com `amount = payment.amount` (ou valor líquido definido pela regra financeira).
  - Atualizar `bookings.status` para `cancelled_by_patient` (já existente) + log em `booking_reschedule_history` com `status='credit_generated'` (opcional).

### 2. Fluxo de Agendamento

- Antes de gerar preferência de pagamento:
  - Consultar `user_credit_balances.available_amount`.
  - Se saldo ≥ valor do serviço, habilitar opção "Usar crédito".
  - Ao confirmar uso:
    - Criar novo `booking` com status `confirmed` (ou `paid`, conforme política).
    - Atualizar crédito para `used` (linkar `used_booking_id`).
    - Registrar histórico em `booking_reschedule_history` (se veio de reagendamento).
  - Caso saldo parcial:
    - Permitir combinar crédito + pagamento? (definir regra – pendente).

### 3. Reschedule Direto (já existente)

- Permanecendo no mesmo `booking` não é necessário gerar crédito.
- Caso futura regra exija criar novo `booking`, reaproveitar créditos conforme fluxo acima.

### 4. Administração / Relatórios

- Adicionar cartão no Admin permitindo:
  - Visualizar créditos por paciente.
  - Estornar crédito manualmente (`status='available'` ↔ `used` ou `expired`).
  - Gerar CSV mensal (saldo inicial, créditos emitidos, utilizados, expirados).

---

## 🧩 Próximos Passos Técnicos

## ✅ Entregas Implementadas (11/09/2025)

- **Edge Function `financial-credit-manager`** (`supabase/functions/financial-credit-manager/index.ts`)
  - Implementa ações via `supabase.functions.invoke('financial-credit-manager', { action })`:
    - `list` (auth required) – retorna créditos + saldo agregado do usuário.
    - `create` (service role / admin) – insere crédito disponível.
    - `reserve` (auth) – marca crédito como reservado e armazena token em `metadata`.
    - `release` (auth) – reverte reserva mantendo histórico.
    - `consume` (service role / admin) – marca crédito como utilizado e vincula ao novo booking/pagamento.
  - Validações: propriedade do usuário, estados válidos, tokens de reserva, RLS bypass com service role.
- **Fluxo de cancelamento do paciente**
  - Nova função `patient-cancel-booking` (`supabase/functions/patient-cancel-booking/index.ts`).
  - Usa token do paciente para validar posse do booking e atualiza status para `cancelled_by_patient`.
  - Quando o cancelamento ocorre com antecedência >=24h **e** existe pagamento aprovado, cria crédito automaticamente em `financial_credits` (status `available`).
  - Registra duas entradas em `booking_reschedule_history`: uma para o cancelamento e outra quando o crédito é gerado (metadados incluem `credit_id`, `hours_until_booking`, `policy`).
  - Atualização no front-end (`src/pages/PacientePage.jsx`) passa a chamar essa Edge Function e exibe toast informando o crédito liberado.

---

## 🧩 Próximos Passos Técnicos

- [x] Edge Function `financial-credit-manager` configurada com ações `list/create/reserve/release/consume`.
- [x] Fluxo de cancelamento cria crédito automaticamente quando a política >=24h é atendida.
- [x] Integração no Checkout *(cobertura total com crédito único aplicada)*
  - Buscar saldo antes da etapa de pagamento (`supabase.functions.invoke('financial-credit-manager', { action: 'list' })`).
  - Exibir CTA "Usar crédito" com resumo do valor aplicado.
  - Chamar endpoint de reserva antes de finalizar (`reserve` + `consume` com token).
  - Contornar geração de preferência MP quando valor total zerado (confirmação direta com crédito).
  - **Pendente:** suportar cobertura parcial (combinar crédito + novo pagamento).
- [ ] Admin Dashboard
   - Nova seção em `AdminPage.jsx` mostrando lista de créditos (`financial_credits`).
   - Filtros: status, usuário, data.
   - Ações: marcar como expirado, ajustar valor (somente admin).
- [ ] Alertas & Auditoria
   - Adicionar logs no `logger` e eventos GA4 (`credit_created`, `credit_used`).
   - Configurar monitoramento no Supabase (trigger para avisar saldos altos / expirados).

---

## ✅ Conclusão

- A camada de dados foi preparada (migration `add_financial_credits_table.sql`).
- Próximas entregas dividem-se em Edge Functions (negócio), atualizações no fluxo de cancelamento/agendamento e painéis administrativos.
- Assim que as regras financeiras forem validadas (percentual de retenção, validade do crédito), as funções podem ser implementadas com segurança.

> Referência rápida: execute as migrations no Supabase antes de integrar o front-end. Depois, usar `user_credit_balances` para renderizar o saldo na Área do Paciente/Checkout.
