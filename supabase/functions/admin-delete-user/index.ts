import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'
import { requireAdmin } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

    // Validar autenticação e RBAC (ADR 005 / ADR 012)
    await requireAdmin(req, supabaseAdmin)

    // Receber ID do usuário
    const { userId } = await req.json()

    if (!userId) {
      throw new Error('ID do usuário não fornecido')
    }

    console.log(`🗑️ Tentando deletar usuário ${userId}...`)

    // Deletar usuário usando função RPC (SECURITY DEFINER)
    const { data: deleteResult, error: rpcError } = await supabaseAdmin
      .rpc('admin_delete_user', { user_id_to_delete: userId })

    if (rpcError) {
      console.error('❌ Erro ao executar RPC de delete:', rpcError)
      throw new Error(`Erro ao deletar usuário: ${rpcError.message}`)
    }

    console.log(`✅ Admin ${user.email} deletou usuário ${userId}`, deleteResult)

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('❌ Erro na função admin-delete-user:', error)
    return new Response(
      JSON.stringify({ 
        error: (error as Error).message || 'Erro ao deletar usuário',
        details: String(error)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
