# Deploy Manual da Edge Function do Zoom (Via Dashboard)

## 📋 Passo a Passo:

### 1. Acesse o Dashboard do Supabase
https://supabase.com/dashboard/project/ppwjtvzrhvjinsutrjwk/functions

### 2. Clique em "Create a new function"

### 3. Configure a Function:
- **Name:** `create-zoom-meeting`
- **Code:** Cole o código abaixo

### 4. Cole este código:

\`\`\`typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const ZOOM_CLIENT_ID = Deno.env.get('ZOOM_CLIENT_ID')
const ZOOM_CLIENT_SECRET = Deno.env.get('ZOOM_CLIENT_SECRET')
const ZOOM_ACCOUNT_ID = Deno.env.get('ZOOM_ACCOUNT_ID')

interface ZoomMeetingRequest {
  booking_date: string
  booking_time: string
  patient_name: string
  service_name: string
  professional_name: string
}

async function getZoomAccessToken(): Promise<string> {
  console.log('🔑 Obtendo token do Zoom...')
  
  const credentials = btoa(\`\${ZOOM_CLIENT_ID}:\${ZOOM_CLIENT_SECRET}\`)
  const tokenUrl = \`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=\${ZOOM_ACCOUNT_ID}\`
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Authorization': \`Basic \${credentials}\`,
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(\`Falha na autenticação Zoom: \${response.status} - \${errorText}\`)
  }

  const data = await response.json()
  return data.access_token
}

async function createZoomMeeting(token: string, meetingData: ZoomMeetingRequest) {
  console.log('🎥 Criando reunião no Zoom...')
  
  const bookingDateTime = new Date(\`\${meetingData.booking_date}T\${meetingData.booking_time}:00\`)
  const startTime = bookingDateTime.toISOString()

  const meetingConfig = {
    topic: \`Consulta - \${meetingData.patient_name}\`,
    type: 2,
    start_time: startTime,
    duration: 60,
    timezone: 'America/Sao_Paulo',
    agenda: \`Consulta de \${meetingData.service_name} com \${meetingData.professional_name}\`,
    settings: {
      host_video: true,
      participant_video: true,
      join_before_host: false,
      mute_upon_entry: false,
      waiting_room: true,
      audio: 'voip',
      auto_recording: 'none',
      approval_type: 0,
      registration_type: 1,
      enforce_login: false,
      alternative_hosts: '',
      close_registration: false,
      show_share_button: true,
      allow_multiple_devices: true,
      encryption_type: 'enhanced_encryption',
      meeting_authentication: false
    }
  }

  const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${token}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(meetingConfig)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(\`Falha ao criar reunião Zoom: \${response.status} - \${errorText}\`)
  }

  const meeting = await response.json()
  
  console.log('✅ Reunião criada:', meeting.id)

  return {
    meeting_link: meeting.join_url,
    meeting_password: meeting.password,
    meeting_id: meeting.id,
    start_url: meeting.start_url
  }
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET || !ZOOM_ACCOUNT_ID) {
      throw new Error('Credenciais do Zoom não configuradas')
    }

    const meetingData: ZoomMeetingRequest = await req.json()
    
    console.log('📋 Dados recebidos:', meetingData)

    const token = await getZoomAccessToken()
    const result = await createZoomMeeting(token, meetingData)
    
    return new Response(
      JSON.stringify({ success: true, data: result }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('❌ Erro:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
\`\`\`

### 5. Configure as Secrets (Variáveis de Ambiente)

No Dashboard, vá em:
**Settings → Edge Functions → Secrets**

Adicione estas 3 secrets:

```
ZOOM_CLIENT_ID = R7_E_ONnQHu9ZpJtlgyJyw
ZOOM_CLIENT_SECRET = <cole aqui o valor de config/local.env>
ZOOM_ACCOUNT_ID = PKU_EuxmTgGnwsKHzxhn4A
```

### 6. Deploy

Clique em "Deploy function"

### 7. Teste

Após deploy, teste no console do navegador:

\`\`\`javascript
fetch('https://ppwjtvzrhvjinsutrjwk.supabase.co/functions/v1/create-zoom-meeting', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwd2p0dnpyaHZqaW5zdXRyandrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5Mzk3NDYsImV4cCI6MjA3NjUxNTc0Nn0.U8AvVoQU6Dsf_AS38CU9X3nXJUyLpvVMj-BrCOJbcmE',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    booking_date: '2025-12-01',
    booking_time: '14:00',
    patient_name: 'Teste Manual',
    service_name: 'Consulta',
    professional_name: 'Dr. Teste'
  })
})
.then(r => r.json())
.then(d => console.log('✅ Resultado:', d))
.catch(e => console.error('❌ Erro:', e));
\`\`\`

**Resultado esperado:**
\`\`\`json
{
  "success": true,
  "data": {
    "meeting_link": "https://zoom.us/j/...",
    "meeting_password": "123456",
    "meeting_id": "...",
    "start_url": "https://zoom.us/s/..."
  }
}
\`\`\`

## ✅ Depois do Deploy:

Faça um novo agendamento e verifique os logs do console!
