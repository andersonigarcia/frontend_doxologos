# Fase 1 – Normalização de Pagamentos (MVP Contábil)

## Objetivo
Construir a primeira camada contábil que garanta que cada cobrança (consulta, evento ou crédito reaproveitado) gere um registro único e auditável, com status sincronizado via webhook e reflexo imediato em um livro razão simplificado. A fase foca em consistência de dados e não em relatórios complexos.

## Escopo
- Padronizar as colunas de `payments` para distinguir claramente o tipo de origem (`booking`, `inscricao_evento`, `credit`) e armazenar valores brutos, taxas e líquido.
- Criar uma tabela de "ledger" (`payment_ledger_entries`) para registrar débitos/créditos por fonte e profissional.
- Conectar o webhook `mp-webhook` aos novos campos, evitando dependência do front para confirmar pagamentos.
- Normalizar o uso de créditos para que toda quitação gere um `payment` + `ledger_entry`.
- Manter a telemetria iniciada na Fase 0, incluindo logs nos Edge Functions atualizados.

## Fora do Escopo
- Repasse automático para profissionais ou integração com sistemas externos.
- Automação de notas fiscais.
- Migração completa do histórico (vamos focar em dados recentes + scripts incrementais).

## Requisitos Funcionais
1. **Identidade única de pagamento**: toda cobrança deve ter `source_type` + `source_id` + `mp_payment_id` (quando existir). Não pode haver pagamentos órfãos.
2. **Status sincronizado**: `payments.status` deve refletir o último evento de webhook ou de consumo de crédito (nunca depender do front).
3. **Livro razão mínimo**:
   - Entrada DR/CR por evento: ex. `DR: accounts_receivable`, `CR: revenue_consultas`.
   - Associações opcionais a profissional (`professional_id`) quando disponíveis.
4. **Créditos reaproveitados**: gerar `payments` com `payment_method = 'financial_credit'` e lançamentos no ledger.
5. **Observabilidade**: logs estruturados para cada transição crítica (webhook recebido, ledger criado, erro de consistência, etc.).

## Requisitos Técnicos
- **Migrations** (Supabase SQL):
  - Alterar `payments` adicionando campos: `source_type`, `source_id`, `gross_amount`, `net_amount`, `fee_amount`, `currency`, `settlement_status`, `ledger_synced_at`.
  - Nova tabela `payment_ledger_entries` com colunas: `id`, `payment_id`, `entry_type` (`debit`/`credit`), `account`, `amount`, `currency`, `meta`, `created_at`.
  - View `vw_payment_summary` para consultas rápidas.
- **Edge Functions**:
  - `mp-create-payment`: preencher `source_type/source_id` e salvar valores brutos.
  - `mp-webhook`: atualizar `payments` + inserir `payment_ledger_entries` quando aprovado/cancelado.
  - `financial-credit-manager`: ao consumir crédito, criar um `payment` + entries correspondentes.
- **Front-end**: ajustar chamadas para incluir os novos campos (por exemplo, enviar `source_type`).
- **Backfill**: script (SQL ou Edge) para atualizar pagamentos pendentes com `source_type` e criar ledger retroativo (últimos 90 dias).

## Entregáveis
1. **Documentação**: este plano + README curto descrevendo o ledger e instruções de migração.
2. **Migrations executáveis** no repositório (`database/migrations/phase1`).
3. **Atualizações de Edge Functions** e testes locais (`npm run test:webhooks` ou similar).
4. **Scripts de backfill** para dados legados selecionados.
5. **Checklist de validação** cobrindo fluxos (PIX consulta, PIX evento, crédito) e verificação do ledger.

## Marcos e Sequência
1. **M1 – Estrutura de dados (2 dias)**
   - Escrever migrations.
   - Atualizar modelos Supabase e gerar documentação.
2. **M2 – Webhook/Functions (3 dias)**
   - Atualizar `mp-webhook`, `mp-create-payment`, `financial-credit-manager`.
   - Criar testes manuais + mocks.
3. **M3 – Front & Telemetria (1 dia)**
   - Ajustar `CheckoutPage`, `EventoDetalhePage`, credit flow.
   - Confirmar logs.
4. **M4 – Backfill + Validação (2 dias)**
   - Rodar scripts em staging.
   - Validar com planilha de conciliação.

## Riscos Principais
| Risco | Impacto | Mitigação |
| --- | --- | --- |
| Webhook duplicado gera entradas repetidas | Alto | Usar `ON CONFLICT`/chaves únicas por `payment_id + status`. |
| Falta de dados históricos para ledger | Médio | Limitar backfill e marcar registros antigos como `legacy`. |
| Mudanças no front quebram fluxo atual | Médio | Feature flag + smoke tests automatizados. |

## Próximos Passos
1. Aprovar este plano com o time financeiro.
2. Criar pasta `database/migrations/phase1` e iniciar script do schema.
3. Atualizar Edge Functions começando pelo `mp-webhook` (fonte da verdade dos status).
4. Preparar checklist de testes para ser reaproveitado ao fim da fase.
