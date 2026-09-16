import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token de autorização não fornecido.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Configuração de ambiente inválida.')
    }

    // Client with Service Role to bypass RLS and use Admin Auth
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Verify caller is admin
    const accessToken = authHeader.replace('Bearer ', '')
    const { data: { user: currentUser }, error: currentUserError } = await supabaseAdmin.auth.getUser(accessToken)

    if (currentUserError || !currentUser) {
      throw new Error('Usuário não autenticado.')
    }

    const callerRole = currentUser.app_metadata?.role ?? currentUser.user_metadata?.role;
    if (callerRole !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Apenas administradores podem aprovar candidaturas.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    const { applicationId } = await req.json()
    if (!applicationId) {
      throw new Error('O ID da candidatura é obrigatório.')
    }

    // 1. Fetch Application
    const { data: application, error: appError } = await supabaseAdmin
      .from('professional_applications')
      .select('*')
      .eq('id', applicationId)
      .single()

    if (appError || !application) {
      throw new Error(`Candidatura não encontrada: ${appError?.message}`)
    }

    if (application.status !== 'pending') {
      throw new Error(`A candidatura já está com status: ${application.status}`)
    }

    // 2. Generate invite link (creates user in auth.users implicitly)
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email: application.email,
      options: {
        data: {
          role: 'professional',
          name: application.name,
        }
      }
    })

    if (inviteError) {
      throw new Error(`Erro ao criar convite no Auth: ${inviteError.message}`)
    }

    const userId = inviteData.user.id
    const actionLink = inviteData.properties.action_link // The URL the user clicks to set password

    // 3. Insert into public.professionals
    const cleanedDocument = application.cpf_cnpj ? application.cpf_cnpj.replace(/\D/g, '') : '';
    const isCnpj = cleanedDocument.length > 11;
    
    const { error: profError } = await supabaseAdmin
      .from('professionals')
      .insert([{
        id: userId,
        name: application.name,
        email: application.email,
        phone: application.phone,
        specialty: application.specialty,
        cpf: isCnpj ? null : application.cpf_cnpj,
        cnpj: isCnpj ? application.cpf_cnpj : null,
        crp: application.crp,
        status: 'active'
      }])

    if (profError) {
      // Rollback auth user creation if professional insert fails
      await supabaseAdmin.auth.admin.deleteUser(userId)
      throw new Error(`Erro ao criar perfil profissional: ${profError.message}`)
    }

    // 4. Update application status
    await supabaseAdmin
      .from('professional_applications')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', applicationId)

    // 5. Send custom welcome email with the action link
    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #2d8659;">Bem-vindo(a) à Doxologos, ${application.name}!</h2>
        <p>Temos a alegria de informar que sua candidatura foi <strong>aprovada</strong> pela nossa equipe de curadoria.</p>
        <p>A partir de agora, você faz parte do nosso time de profissionais e já pode acessar a plataforma para configurar sua agenda e realizar atendimentos.</p>
        
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #2d8659;">
          <h3 style="margin-top: 0;">Seu Próximo Passo</h3>
          <p>Para ativar sua conta e definir sua senha de acesso, clique no botão abaixo:</p>
          <a href="${actionLink}" style="display: inline-block; background-color: #2d8659; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">
            Ativar Minha Conta e Criar Senha
          </a>
          <p style="font-size: 12px; color: #666; margin-top: 16px;">
            Se o botão não funcionar, copie e cole este link no seu navegador:<br>
            <span style="word-break: break-all;">${actionLink}</span>
          </p>
        </div>
        
        <p>Estamos muito felizes em tê-lo(a) conosco!</p>
        <p>Um abraço,<br><strong>Equipe Doxologos</strong></p>
      </div>
    `;

    // Invoke send-email function
    const { error: emailInvokeError } = await supabaseAdmin.functions.invoke('send-email', {
      body: {
        to: application.email,
        subject: 'Sua candidatura foi aprovada! Bem-vindo(a) à Doxologos',
        html: emailHtml
      }
    })

    if (emailInvokeError) {
      console.error("Falha ao enviar o email de boas vindas, mas o usuário foi criado.", emailInvokeError)
      // We don't throw here because the user is already created successfully in DB
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Profissional aprovado e convite enviado.', userId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('❌ Erro na função approve-professional-application:', error)
    const message = error instanceof Error ? error.message : 'Erro desconhecido.'
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
