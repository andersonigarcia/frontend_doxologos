// Edge Function para deletar reuniões do Zoom
// SECURITY FIX (S-04): Credenciais OAuth do Zoom ficam APENAS no servidor (Deno.env).
// Deploy: supabase functions deploy zoom-delete-meeting
// Secrets necessários no Dashboard Supabase > Settings > Edge Functions:
//   ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET, ZOOM_ACCOUNT_ID

import { corsHeaders } from '../_shared/cors.ts'

const ZOOM_CLIENT_ID = Deno.env.get('ZOOM_CLIENT_ID')
const ZOOM_CLIENT_SECRET = Deno.env.get('ZOOM_CLIENT_SECRET')
const ZOOM_ACCOUNT_ID = Deno.env.get('ZOOM_ACCOUNT_ID')

async function getZoomAccessToken(): Promise<string> {
    if (!ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET || !ZOOM_ACCOUNT_ID) {
        throw new Error('Credenciais do Zoom não configuradas nos secrets da Edge Function')
    }

    const credentials = btoa(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`)
    const tokenUrl = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`

    const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    })

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Falha na autenticação Zoom: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    return data.access_token
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { meeting_id } = await req.json()

        if (!meeting_id) {
            return new Response(
                JSON.stringify({ error: 'meeting_id é obrigatório' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        console.log(`🗑️ Deletando reunião Zoom: ${meeting_id}`)

        const token = await getZoomAccessToken()

        const response = await fetch(`https://api.zoom.us/v2/meetings/${meeting_id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        })

        // 204 No Content = deletado com sucesso
        if (!response.ok && response.status !== 204) {
            const errorText = await response.text()
            console.error(`❌ Erro ao deletar reunião: ${response.status} - ${errorText}`)
            throw new Error(`Falha ao deletar reunião Zoom: ${response.status}`)
        }

        console.log(`✅ Reunião ${meeting_id} deletada com sucesso`)

        return new Response(
            JSON.stringify({ success: true, meeting_id }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
    } catch (error) {
        console.error('❌ Erro na zoom-delete-meeting:', error)
        const message = error instanceof Error ? error.message : 'Erro desconhecido'
        return new Response(
            JSON.stringify({ success: false, error: message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
