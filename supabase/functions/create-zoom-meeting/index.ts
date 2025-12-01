// Supabase Edge Function para criar reuniões no Zoom
// Deploy: supabase functions deploy create-zoom-meeting

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
  professional_email?: string
  meeting_password?: string
  duration?: number
}

async function getZoomAccessToken(): Promise<string> {
  console.log('🔑 Obtendo token do Zoom...')
  
  const credentials = btoa(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`)
  const tokenUrl = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Falha na autenticação Zoom: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  return data.access_token
}

async function createZoomMeeting(token: string, meetingData: ZoomMeetingRequest) {
  console.log('🎥 Criando reunião no Zoom...')
  
  // Formatar data/hora para ISO 8601
  const bookingDateTime = new Date(`${meetingData.booking_date}T${meetingData.booking_time}:00`)
  const startTime = bookingDateTime.toISOString()

  const meetingConfig: Record<string, unknown> = {
    topic: `Consulta - ${meetingData.patient_name}`,
    type: 2, // Reunião agendada
    start_time: startTime,
    duration: meetingData.duration || 60, // 1 hora
    timezone: 'America/Sao_Paulo',
    agenda: `Consulta de ${meetingData.service_name} com ${meetingData.professional_name}`,
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
      alternative_hosts: meetingData.professional_email || '',
      close_registration: false,
      show_share_button: true,
      allow_multiple_devices: true,
      encryption_type: 'enhanced_encryption',
      meeting_authentication: false
    }
  }

  if (meetingData.meeting_password) {
    meetingConfig.password = meetingData.meeting_password
  }

  const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(meetingConfig)
  })
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Falha ao criar reunião Zoom: ${response.status} - ${errorText}`)
  }

  const meeting = await response.json()
  
  console.log('✅ Reunião criada:', meeting.id)

  return {
    meeting_link: meeting.join_url,
    meeting_password: meeting.password || null,
    meeting_id: meeting.id,
    start_url: meeting.start_url
  }
}

serve(async (req: Request) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar credenciais
    if (!ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET || !ZOOM_ACCOUNT_ID) {
      throw new Error('Credenciais do Zoom não configuradas')
    }

    // Parse request body
    const meetingData: ZoomMeetingRequest = await req.json()
    
    console.log('📋 Dados recebidos:', meetingData)

    // Obter token
    const token = await getZoomAccessToken()
    
    // Criar reunião
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
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
