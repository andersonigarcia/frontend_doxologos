# ADR 013: Resiliência Transacional Fintech & Ingestão Assíncrona de Webhooks (Padrão Stripe)

- **Data:** 2026-10-12
- **Status:** Aceito e Implementado
- **Decisores:** Tech Lead, Platform Security, Fullstack Dev, Product Lead

---

## 1. Contexto
Múltiplas notificações de webhook reenviadas pelo Mercado Pago causavam reprocessamento desnecessário, concorrência no split de receitas contábeis e potencial invocação duplicada de NFS-e. Além disso, a chamada síncrona a serviços SOAP/prefeitura para emissão fiscal bloqueava a resposta HTTP ao Mercado Pago por até 10 segundos, arriscando timeouts e retries repetitivos.

## 2. Decisão
1. **Barreira de Idempotência Atômica:** Consulta prévia na tabela `payments` por `mp_payment_id` e status equivalente no `mp-webhook`. Se já processado, responder imediatamente `200 OK` (`idempotent_duplicate`) em < 50ms.
2. **Execução Assíncrona de NFS-e:** Desacoplar tarefas periféricas lentas (emissão de NFS-e) no `mp-webhook` para execução assíncrona não bloqueante via background invocation (`.then().catch()`), garantindo retorno `200 OK` ao gateway em < 250ms.
3. **Idempotency Key no Client:** Adicionar suporte a `idempotency_key` no serviço canônico `createPaymentRecord` (`src/services/paymentService.js`).
4. **Bind Universal de Rede:** Corrigir bind de rede no `package.json` de `--host ::` para `--host 0.0.0.0` para compatibilidade multiplataforma.
5. **Guardrails de Idempotência:** Expandir `check-architecture-guardrails.js` e `architectureGuardrails.test.js` para auditar a barreira de idempotência e não-bloqueio de NFS-e.

## 3. Consequências
- Ingestão de webhooks imune a retries e timeouts.
- Zero duplicação de transações ou notas fiscais.
- Tempo de resposta ao gateway reduzido de até 8s para < 250ms.
