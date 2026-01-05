import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Token de autorização não fornecido')
    }

    // Criar cliente Supabase com service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verificar se o usuário logado é admin
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      throw new Error('Usuário não autenticado')
    }

    if (user.user_metadata?.role !== 'admin') {
      throw new Error('Acesso negado. Apenas administradores podem acessar esta função.')
    }

    // Receber dados do body
    const { userId, userData } = await req.json()

    if (!userId) {
      throw new Error('ID do usuário não fornecido')
    }

    // Atualizar usuário
    const { data, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      userData
    )

    if (updateError) {
      throw updateError
    }

    console.log(`✅ Admin ${user.email} atualizou usuário ${userId}`)

    return new Response(
      JSON.stringify({ user: data.user }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('❌ Erro na função admin-update-user:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro ao atualizar usuário'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
