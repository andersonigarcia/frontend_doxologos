import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'
import { requireAdmin } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar variáveis de ambiente
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Variáveis de ambiente SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas')
    }

    // Criar cliente admin (service role)
    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Validar autenticação e RBAC (ADR 005 / ADR 012)
    const { user } = await requireAdmin(req, supabaseAdmin)

    // Listar todos os usuários usando função RPC (acesso direto ao auth.users)
    console.log('🔍 Listando usuários via RPC function...')
    
    const { data: usersData, error: rpcError } = await supabaseAdmin
      .rpc('admin_list_users')
    
    if (rpcError) {
      console.error('❌ Erro ao executar RPC:', rpcError)
      throw new Error(`Erro na função RPC: ${rpcError.message}`)
    }

    const users = usersData || []
    console.log(`✅ Admin ${user.email} listou ${users.length} usuários via RPC`)

    return new Response(
      JSON.stringify({ users }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('❌ Erro na função admin-list-users:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao listar usuários'
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error instanceof Error ? error.stack : String(error)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
