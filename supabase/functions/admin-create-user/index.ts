import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token de autorização não fornecido.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 },
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Variáveis de ambiente SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não configuradas.')
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const accessToken = authHeader.replace('Bearer ', '')
    const { data: { user: currentUser }, error: currentUserError } = await supabaseAdmin.auth.getUser(accessToken)

    if (currentUserError || !currentUser) {
  throw new Error('Usuário não autenticado.')
    }

    if (currentUser.user_metadata?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Apenas administradores podem criar usuários.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 },
      )
    }

    const body = await req.json()
    const email = String(body?.email ?? '').trim()
    const password = String(body?.password ?? '')
    const userMetadata = body?.userMetadata ?? {}
    const appMetadata = body?.appMetadata ?? {}

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email e senha são obrigatórios.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      )
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: userMetadata,
      app_metadata: appMetadata,
    })

    if (error) {
      console.error('❌ admin-create-user error:', error)
      return new Response(
        JSON.stringify({ error: error.message || 'Erro ao criar usuário.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      )
    }

    console.log(`✅ Admin ${currentUser.email} criou usuário ${data.user?.email}`)

    return new Response(
      JSON.stringify({ user: data.user }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 },
    )
  } catch (error) {
    console.error('❌ Erro na função admin-create-user:', error)
    const message = error instanceof Error ? error.message : 'Erro desconhecido ao criar usuário.'
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
    )
  }
})
