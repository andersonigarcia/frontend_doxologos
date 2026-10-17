# ADR 011: Unificação Canônica dos Domínios de Pagamento e Pacientes (`paymentService.js` e `patientService.js`)

- **Data:** 2026-10-12
- **Status:** Aceito e Implementado
- **Decisores:** Tech Lead, Fullstack Dev, Platform Security, QA Automation

---

## 1. Contexto
Mutações e consultas diretas às tabelas `payments`, `patient_notes` e `patient_notes_history` dispersas pelas telas de checkout (`CheckoutSuccessPage`, `CheckoutPendingPage`, `CheckoutFailurePage`) e componentes clínicos (`PatientAcompanhamento`, `PatientDetailsModal`).

## 2. Decisão
1. **Canônico de Pagamentos:** Criar `src/services/paymentService.js` como SSOT para consultas e mutações de pagamentos Mercado Pago com whitelist estrita de 39 colunas reais (`ALLOWED_PAYMENT_FIELDS`) e validação de `VALID_PAYMENT_STATUSES`.
2. **Canônico de Pacientes:** Criar `src/services/patientService.js` como SSOT para tarefas de casa do paciente (`getPatientHomeworkTasks`) e prontuários estruturados (`getPatientNotesHistory`, `savePatientSessionNote`).
3. **Refatoração de Telas:** Refatorar páginas de checkout e componentes clínicos para consumir exclusivamente os serviços canônicos.
4. **Testes Unitários:** Adicionar suítes de testes unitários `paymentService.test.js` e `patientService.test.js`.
5. **Auditoria nos Guardrails:** Expandir `scripts/check-architecture-guardrails.js` para auditar a ausência de chamadas diretas a `payments` e `patient_notes_history` em UI components.

## 3. Consequências
- Blindagem total contra inconsistências no checkout Mercado Pago e na área clínica do paciente.
- Conformidade 100% de arquitetura em 171+ testes unitários e zero efeitos colaterais.
