# `zoom-create-meeting`

Edge Function que encapsula a criação de reuniões no Zoom usando credenciais Account-Level.

## Fluxo

1. Recebe requisição autenticada (Bearer token do usuário logado) contendo `topic`, `startTime`, `duration`, etc.
2. Valida se o usuário é `admin` ou `superadmin`.
3. Usa as variáveis de ambiente abaixo para buscar um access token no Zoom:
   - `ZOOM_CLIENT_ID`
   - `ZOOM_CLIENT_SECRET`
   - `ZOOM_ACCOUNT_ID`
4. Cria a reunião via `https://api.zoom.us/v2/users/me/meetings`.
5. Retorna `join_url`, `start_url`, `password` e `id`. Se `eventoId` for enviado, também atualiza os campos `meeting_*` na tabela `eventos` (o trigger existente cuida de sincronizar `event_meetings`).

## Deploy

```bash
supabase secrets set --env-file supabase/.env.zoom   # arquivo contendo as chaves do Zoom
supabase functions deploy zoom-create-meeting --no-verify-jwt
```

> **Atenção**: Não exponha as chaves do Zoom em arquivos versionados. Utilize apenas `supabase secrets`.

## Payload esperado

```json
{
  "eventoId": "uuid-do-evento",          // opcional (para salvar no banco)
  "topic": "Evento: Workshop",
  "startTime": "2025-12-10T19:00:00-03:00",
  "duration": 90,
  "timezone": "America/Sao_Paulo",
  "agenda": "Descrição opcional",
  "settings": { "waiting_room": true }
}
```

## Respostas

- `200`: retorna os dados da reunião criada.
- `401/403`: usuário não autenticado ou sem permissão.
- `500/502`: falha ao obter token ou criar a reunião no Zoom.
