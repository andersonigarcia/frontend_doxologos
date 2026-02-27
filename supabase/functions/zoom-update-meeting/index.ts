// Edge Function para atualizar reuniões do Zoom
// SECURITY FIX (S-04): Credenciais OAuth do Zoom ficam APENAS no servidor (Deno.env).
// Deploy: supabase functions deploy zoom-update-meeting
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
        const body = await req.json()
        const { meeting_id, ...updateData } = body

        if (!meeting_id) {
            return new Response(
                JSON.stringify({ error: 'meeting_id é obrigatório' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        if (Object.keys(updateData).length === 0) {
            return new Response(
                JSON.stringify({ error: 'Nenhum campo para atualizar foi fornecido' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        console.log(`✏️ Atualizando reunião Zoom: ${meeting_id}`, updateData)

        const token = await getZoomAccessToken()

        const response = await fetch(`https://api.zoom.us/v2/meetings/${meeting_id}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData),
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error(`❌ Erro ao atualizar reunião: ${response.status} - ${errorText}`)
            throw new Error(`Falha ao atualizar reunião Zoom: ${response.status}`)
        }

        console.log(`✅ Reunião ${meeting_id} atualizada com sucesso`)

        return new Response(
            JSON.stringify({ success: true, meeting_id }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
    } catch (error) {
        console.error('❌ Erro na zoom-update-meeting:', error)
        const message = error instanceof Error ? error.message : 'Erro desconhecido'
        return new Response(
            JSON.stringify({ success: false, error: message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
