// Supabase Edge Function: admin-update-article
// Permite que admins alterem o status ou excluam artigos, bypassando RLS via service_role key.
// Env required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Padrão idêntico ao admin-list-users (que funciona em produção)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Token de autorização não fornecido')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Variáveis de ambiente SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas')
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Verificar o token do usuário logado (mesmo padrão de admin-list-users)
    const token = authHeader.replace('Bearer ', '')
    console.log('🔍 Verificando token do usuário...')

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      console.error('❌ Erro ao verificar usuário:', userError)
      return new Response(
        JSON.stringify({ 
          error: 'Usuário não autenticado', 
          details: userError ? userError.message : 'Objeto do usuário é nulo' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    console.log('👤 Usuário verificado:', user.email, 'Role:', user.user_metadata?.role)

    // Aceita role em user_metadata OU app_metadata (cobre ambos os casos)
    const callerRole = user.app_metadata?.role ?? user.user_metadata?.role
    if (callerRole !== 'admin') {
      throw new Error('Acesso negado. Apenas administradores podem gerenciar artigos.')
    }

    const body = await req.json()
    const { action, article_id, status } = body

    // ── Ação: list ──────────────────────────────────────────────────────────
    if (action === 'list') {
      const { data: articles, error: listError } = await supabaseAdmin
        .from('artigos')
        .select('*')
        .order('published_at', { ascending: false })

      if (listError) {
        console.error('❌ Erro ao listar artigos:', listError)
        return new Response(
          JSON.stringify({ error: 'Falha ao buscar artigos.', details: listError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      return new Response(
        JSON.stringify({ success: true, articles }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    if (!article_id) {
      return new Response(
        JSON.stringify({ error: 'article_id é obrigatório.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // ── Ação: update_status ────────────────────────────────────────────────
    if (action === 'update_status') {
      const validStatuses = ['draft', 'published']
      if (!status || !validStatuses.includes(status)) {
        return new Response(
          JSON.stringify({ error: `Status inválido. Valores aceitos: ${validStatuses.join(', ')}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('artigos')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', article_id)
        .select('id, status')

      if (updateError) {
        console.error('❌ Erro ao atualizar artigo:', updateError)
        return new Response(
          JSON.stringify({ error: 'Falha ao atualizar artigo.', details: updateError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      if (!updated || updated.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Artigo não encontrado.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        )
      }

      console.log(`✅ Admin ${user.email} alterou artigo ${article_id} → status='${status}'`)
      return new Response(
        JSON.stringify({ success: true, article: updated[0] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )

    // ── Ação: delete ───────────────────────────────────────────────────────
    } else if (action === 'delete') {
      const { error: deleteError } = await supabaseAdmin
        .from('artigos')
        .delete()
        .eq('id', article_id)

      if (deleteError) {
        console.error('❌ Erro ao excluir artigo:', deleteError)
        return new Response(
          JSON.stringify({ error: 'Falha ao excluir artigo.', details: deleteError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      console.log(`🗑️ Admin ${user.email} excluiu artigo ${article_id}`)
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )

    } else {
      return new Response(
        JSON.stringify({ error: `Ação desconhecida: '${action}'. Use 'list', 'update_status' ou 'delete'.` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

  } catch (error) {
    console.error('❌ Erro na função admin-update-article:', error)
    const message = error instanceof Error ? error.message : 'Erro desconhecido.'
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
