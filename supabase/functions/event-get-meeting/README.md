# `event-get-meeting`

Edge Function responsável por entregar o link seguro do evento somente para:

1. Usuários autenticados com inscrição confirmada (`inscricoes_eventos.status = 'confirmed'`).
2. Administradores com `role = admin|superadmin`.

## Requisitos

- Variáveis de ambiente:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Política RLS do objeto `event_meetings` deve estar ativa (ver migração `20251203_create_event_meetings_table.sql`).

## Deploy

```bash
supabase functions deploy event-get-meeting --no-verify-jwt
```

O JWT é validado manualmente dentro da função para permitir que clientes passem o token do usuário logado. Mantemos o `--no-verify-jwt` para aceitar chamadas do navegador assinadas com o token padrão do Supabase.

## Payload esperado

```json
{
  "eventoId": "uuid-do-evento"
}
```

## Respostas

- `200 OK`: retorna `meetingLink`, `meetingPassword`, `meetingId` e `hostStartUrl` (este último somente para admins).
- `401`: token inválido ou ausente.
- `403`: usuário não confirmado no evento.
- `404`: evento sem sala configurada.
- `500`: falha inesperada (detalhes no log da função).
