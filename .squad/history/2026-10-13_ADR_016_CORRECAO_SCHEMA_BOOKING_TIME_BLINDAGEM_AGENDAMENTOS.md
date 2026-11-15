# ADR 016: Correção de Schema em booking_time e Blindagem Transacional de Agendamentos

- **Data:** 2026-10-13
- **Status:** Aceito e Implementado
- **Decisores:** Bug Hunter, Tech Lead, Fullstack Dev, QA Automation

---

## 1. Contexto
Pacientes reportavam impossibilidade de efetuar pagamento na página de agendamento (`/agendamento`). Ao confirmar a reserva de horário, o sistema apresentava o alerta: *"Não foi possível reservar este horário agora. Pode ter ocorrido uma oscilação momentânea."*. A investigação de causa raiz (RCA) identificou que a sanitização canônica em `src/services/bookingService.js` formatava o campo `booking_time` adicionando segundos (`HH:mm:ss`, 8 caracteres), enquanto a coluna no PostgreSQL `public.bookings` é estritamente `VARCHAR(5)` (`HH:mm`), disparando erro Postgres `22001` (`value too long for type character varying(5)`). Com isso, a inserção falhava e o paciente era impedido de avançar para a tela de checkout (`/checkout`). Além disso, identificou-se a necessidade de blindagem defensiva na checagem de `user_id` em `AgendamentoPage.jsx` para evitar violações de constraint NOT NULL.

## 2. Decisão
1. **Truncagem Canônica:** Corrigir `sanitizeBookingPayload` em `src/services/bookingService.js` para normalizar e truncar estritamente `booking_time` em 5 caracteres (`HH:mm`), tratando entradas de 4 caracteres (`9:00` -> `09:00`) e 8 caracteres (`21:00:00` -> `21:00`).
2. **Reagendamento Seguro:** Ajustar `rescheduleBooking` para preservar estritamente o formato `HH:mm` (VARCHAR(5)) ao atualizar o agendamento e gravar no histórico.
3. **Validação Defensiva de Usuário:** Adicionar validação defensiva em `src/pages/AgendamentoPage.jsx` garantindo que o `user_id` seja verificado antes da submissão ao banco de dados.
4. **Testes Unitários:** Atualizar e expandir a suíte de testes unitários `src/services/__tests__/bookingService.test.js` para auditar a integridade de tamanho do `booking_time`.
5. **Sincronização de Invariantes:** Sincronizar invariantes ativas em `.squad/CORE_INVARIANTS.md`.

## 3. Consequências
- Desbloqueio imediato do fluxo de checkout para todos os pacientes.
- Eliminação total do erro Postgres `22001`.
- 100% de conformidade com o esquema real do banco de dados e preservação da receita da clínica.
