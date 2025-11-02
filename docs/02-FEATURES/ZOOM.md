# 🎥 Integração Zoom

> **Status**: ✅ Implementado  
> **Tipo**: OAuth Server-to-Server  
> **Backend**: Supabase Edge Functions

---

## 📋 Funcionalidades

- ✅ Criação automática de salas para cada agendamento
- ✅ Link do Zoom incluído nos emails
- ✅ Senha de segurança gerada automaticamente
- ✅ Sala de espera habilitada
- ✅ Duração padrão: 60 minutos
- ✅ Instruções detalhadas para iniciantes

---

## ⚙️ Configuração

### 1. Credenciais Zoom

Obtenha em: https://marketplace.zoom.us/

```bash
# Supabase Secrets
ZOOM_CLIENT_ID=z4DYxauiQVCMOlJa7hKLFg
ZOOM_CLIENT_SECRET=YypvramabH7srmRMGlS8nzHp7esfHxwQ
ZOOM_ACCOUNT_ID=SEU_ACCOUNT_ID_AQUI
```

### 2. Migration do Banco

```sql
-- Adicionar campos Zoom na tabela bookings
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS meeting_link TEXT,
ADD COLUMN IF NOT EXISTS meeting_password VARCHAR(50),
ADD COLUMN IF NOT EXISTS meeting_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS meeting_start_url TEXT;

CREATE INDEX IF NOT EXISTS idx_bookings_meeting_id ON bookings(meeting_id);
```

---

## 💻 Como Usar

### Criar Reunião

```javascript
import { zoomService } from '@/lib/zoomService';

const meeting = await zoomService.createMeeting({
  topic: 'Consulta - João Silva',
  start_time: '2025-10-27T14:00:00Z',
  duration: 60,
  timezone: 'America/Sao_Paulo'
});

// Salvar no booking
await supabase.from('bookings').update({
  meeting_link: meeting.join_url,
  meeting_password: meeting.password,
  meeting_id: meeting.id,
  meeting_start_url: meeting.start_url
}).eq('id', bookingId);
```

### Edge Function: create-zoom-meeting

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

serve(async (req) => {
  const { topic, start_time, duration } = await req.json();

  // 1. Obter access token
  const tokenResponse = await fetch('https://zoom.us/oauth/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(
        `${Deno.env.get('ZOOM_CLIENT_ID')}:${Deno.env.get('ZOOM_CLIENT_SECRET')}`
      )}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'account_credentials',
      account_id: Deno.env.get('ZOOM_ACCOUNT_ID')!
    })
  });

  const { access_token } = await tokenResponse.json();

  // 2. Criar reunião
  const meetingResponse = await fetch('https://api.zoom.us/v2/users/me/meetings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      topic,
      type: 2, // Scheduled meeting
      start_time,
      duration,
      timezone: 'America/Sao_Paulo',
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: false,
        waiting_room: true,
        audio: 'both',
        mute_upon_entry: false
      }
    })
  });

  return new Response(JSON.stringify(await meetingResponse.json()), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

---

## 🔧 Troubleshooting

### Erro: "Invalid access token"

**Solução:** Verificar `ZOOM_ACCOUNT_ID`, `CLIENT_ID` e `CLIENT_SECRET`

### Sala não criada

**Verificar logs:**
```javascript
console.log('Zoom config:', {
  hasClientId: !!import.meta.env.VITE_ZOOM_CLIENT_ID,
  hasClientSecret: !!import.meta.env.VITE_ZOOM_CLIENT_SECRET,
  hasAccountId: !!import.meta.env.VITE_ZOOM_ACCOUNT_ID
});
```

---

**Última atualização**: 28/01/2025 | [Voltar ao Índice](../README.md)
