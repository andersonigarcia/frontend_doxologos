# ADR 007: Unificação Canônica do Domínio de Agendamentos (`bookingService.js`)

- **Data:** 2026-10-12
- **Status:** Aceito e Implementado
- **Decisores:** Tech Lead, Fullstack Dev, QA Automation

---

## 1. Contexto
Mutações e leituras diretas na tabela `public.bookings` estavam espalhadas por múltiplos componentes (`AgendamentoPage`, `SalaEsperaPage`, `PacientePage`, `ProfessionalDashboardPage`, `AdminPage`, `ScheduleTab`). Riscos identificados: envio de campos fantasmas (ex: `meeting_platform` gerando Postgres 42703), disparos duplicados ou inconsistentes de e-mails de confirmação/cancelamento, e divergência no nome da coluna de horário (`booking_time` real vs `time` documentado em ARCH.md).

## 2. Decisão
1. **Single Source of Truth:** Estabelecer `src/services/bookingService.js` como SSOT para o ciclo de vida do agendamento.
2. **Whitelisting Rigoroso:** Implementar `ALLOWED_BOOKING_FIELDS` com a lista estrita de colunas existentes no PostgreSQL.
3. **Sanitização de Payloads:** Sanitizar payloads com `sanitizeBookingPayload` antes de qualquer `insert` ou `update`.
4. **Transições Válidas de Status:** Centralizar `updateBookingStatus` garantindo transições válidas (`VALID_BOOKING_STATUSES`) e disparo resiliente de notificações (`bookingEmailManager`).
5. **Retrocompatibilidade:** Manter 100% de compatibilidade retroativa com os contratos das páginas ativas para prevenir qualquer efeito colateral em faturamento e consultas.

## 3. Consequências
- Eliminação de queries diretas desordenadas a `bookings`.
- Garantia de que nenhuma coluna inexistente seja enviada ao Supabase.
- Disparo confiável e desacoplado de e-mails transacionais.
