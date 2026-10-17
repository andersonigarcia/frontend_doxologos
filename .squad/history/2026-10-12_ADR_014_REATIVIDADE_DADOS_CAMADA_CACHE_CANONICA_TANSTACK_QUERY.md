# ADR 014: Reatividade de Dados & Camada de Cache Canônica TanStack Query Universal

- **Data:** 2026-10-12
- **Status:** Aceito e Implementado
- **Decisores:** Tech Lead, Fullstack Dev, UX Design

---

## 1. Contexto
Consultas repetitivas a dados estáticos ou semi-estáticos (ex: profissionais, serviços cadastrados, regras de agenda) geravam roundtrips de rede excessivos e refetches frequentes sem cache explícito (`staleTime: 0`), provocando pequenos flickers na interface durante a navegação entre etapas de agendamento. Além disso, componentes como `PacientePage.jsx` gerenciavam estado de agendamentos e histórico manualmente através de `useState`/`useEffect` imperativos sem reatividade ou sincronização automática entre mutações e visualização.

## 2. Decisão
1. **Camada Canônica de Hooks de Consulta:** Criação em `src/hooks/queries/` dos módulos:
   - `useProfessionalsQuery.js` (`staleTime: 5 min`, `gcTime: 15 min`).
   - `useBookingsQuery.js` (`useBookingsQuery`, `useBookingDetailQuery`, `usePatientBookingsQuery`, `usePatientReviewsQuery`).
   - `usePaymentStatusQuery.js` (`usePaymentStatusQuery`, `usePaymentByIdQuery`, `usePaymentByBookingIdQuery`, `usePaymentsListQuery`).
   - `usePatientHistoryQuery.js` (`usePatientHomeworkTasksQuery`, `usePatientNotesHistoryQuery`).
   - `useBookingMutations.js` (`useCreateBookingMutation`, `useUpdateBookingStatusMutation`, `useRescheduleBookingMutation` com invalidação automática de chaves).
   - `index.js`: Barrel export padronizado.
2. **Suporte a Relações em Bookings:** `listBookings({ includeRelations = true })` e `listPatientBookings(userId)`.
3. **Anti-flickering no Funil:** Configurar `staleTime: 5 min` e `gcTime: 10 min` em `useBookingData.js`.
4. **Refatoração Reativa:** Refatorar `PacientePage.jsx` para consumir as queries canônicas.
5. **Auditoria nos Guardrails:** Expandir `check-architecture-guardrails.js` para garantir integridade do cache reativo.

## 3. Consequências
- Eliminação total de flickering na navegação do agendamento.
- Redução drástica de chamadas redundantes ao Supabase.
- Sincronização automática entre mutações e interface.
