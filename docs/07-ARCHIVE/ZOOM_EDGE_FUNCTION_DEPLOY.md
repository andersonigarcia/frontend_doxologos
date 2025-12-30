# 🚀 Deploy da Edge Function do Zoom

## Problema Identificado
O Zoom não pode ser chamado diretamente do navegador por causa do **CORS Policy**. A solução é usar uma **Edge Function** no Supabase que roda no servidor.

## ✅ O que já foi feito:
1. Criada a Edge Function: `supabase/functions/create-zoom-meeting/index.ts`
2. Atualizado `zoomService.js` para chamar a Edge Function ao invés da API direta

## 📋 Passos para Deploy:

### 1. Instalar Supabase CLI (se ainda não tiver)

```powershell
npm install -g supabase
```

### 2. Fazer Login no Supabase

```powershell
supabase login
```

Isso abrirá o navegador para você autorizar.

### 3. Linkar o Projeto

```powershell
cd c:\Users\ander\source\repos\frontend_doxologos
supabase link --project-ref ppwjtvzrhvjinsutrjwk
```

### 4. Configurar Variáveis de Ambiente (Secrets) no Supabase

```powershell
supabase secrets set ZOOM_CLIENT_ID=R7_E_ONnQHu9ZpJtlgyJyw
supabase secrets set ZOOM_CLIENT_SECRET=<sua-secret-aqui>
supabase secrets set ZOOM_ACCOUNT_ID=PKU_EuxmTgGnwsKHzxhn4A
```

**⚠️ IMPORTANTE:** Substitua `<sua-secret-aqui>` pela secret real do `config/local.env`

### 5. Deploy da Function

```powershell
supabase functions deploy create-zoom-meeting
```

### 6. Verificar Deploy

Após o deploy, você verá uma mensagem como:
```
Deployed Function create-zoom-meeting on project ppwjtvzrhvjinsutrjwk
```

A URL será: `https://ppwjtvzrhvjinsutrjwk.supabase.co/functions/v1/create-zoom-meeting`

## 🧪 Testar a Edge Function

Após o deploy, você pode testar no console do navegador:

```javascript
const supabaseUrl = 'https://ppwjtvzrhvjinsutrjwk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // sua anon key

fetch(`${supabaseUrl}/functions/v1/create-zoom-meeting`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    booking_date: '2025-12-01',
    booking_time: '10:00',
    patient_name: 'Teste Edge Function',
    service_name: 'Consulta Teste',
    professional_name: 'Dr. Teste'
  })
})
.then(r => r.json())
.then(result => console.log('✅ Resultado:', result))
.catch(err => console.error('❌ Erro:', err));
```

## ✅ Resultado Esperado:

```json
{
  "success": true,
  "data": {
    "meeting_link": "https://zoom.us/j/...",
    "meeting_password": "...",
    "meeting_id": "...",
    "start_url": "https://zoom.us/s/..."
  }
}
```

## 🔧 Se der erro:

### Erro: "Function not found"
- Verifique se o deploy foi bem-sucedido
- Use: `supabase functions list` para ver as functions

### Erro: "Credenciais do Zoom não configuradas"
- As secrets não foram configuradas
- Execute novamente o passo 4

### Erro: "Authentication failed"
- A secret do Zoom está incorreta
- Verifique as credenciais em `config/local.env`
- Reconfigure as secrets

## 📝 Alternativa: Deploy Manual via Dashboard

Se o CLI não funcionar, você pode fazer deploy manual:

1. Acesse: https://supabase.com/dashboard/project/ppwjtvzrhvjinsutrjwk/functions
2. Clique em "New Function"
3. Nome: `create-zoom-meeting`
4. Cole o código de `supabase/functions/create-zoom-meeting/index.ts`
5. Configure as secrets em "Settings" → "Edge Functions" → "Secrets"
6. Deploy

## 🎯 Depois do Deploy:

Faça um novo agendamento normalmente. Agora os logs devem aparecer:

```
🎥 [createBookingMeeting] Iniciando criação de sala via Edge Function...
🎥 [createBookingMeeting] Chamando Edge Function: https://...
🎥 [createBookingMeeting] Reunião criada com sucesso!
```

E os dados do Zoom serão salvos no banco!
