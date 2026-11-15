import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { requireAdmin } from '../_shared/auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

    // Validar autenticação e RBAC (ADR 005 / ADR 012)
    const { user: currentUser } = await requireAdmin(req, supabaseAdmin)

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

    // Garantir que a role professional esteja no app_metadata para conformidade com ADR 005
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      app_metadata: { role: 'professional' }
    });

    // 3. Insert into public.professionals
    const cleanedDocument = application.cpf_cnpj ? application.cpf_cnpj.replace(/\D/g, '') : '';
    const isCnpj = cleanedDocument.length > 11;
    
    const { data: newProf, error: profError } = await supabaseAdmin
      .from('professionals')
      .insert([{
        user_id: userId,
        name: application.name,
        phone: application.phone,
        whatsapp: application.phone,
        specialty: application.specialty,
        cpf: isCnpj ? null : application.cpf_cnpj,
        cnpj: isCnpj ? application.cpf_cnpj : null,
        crp: application.crp,
        status: 'active'
      }])
      .select('id')
      .single();

    if (profError) {
      // Rollback auth user creation if professional insert fails
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(`Erro ao criar perfil profissional: ${profError.message}`);
    }

    // 4. Update application status
    await supabaseAdmin
      .from('professional_applications')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', applicationId);

    // 5. Configurar Link Oficial da Bio e Agendamento
    const siteUrl = Deno.env.get('SITE_URL') || Deno.env.get('APP_URL') || 'https://doxologos.com.br';
    const cleanSiteUrl = siteUrl.replace(/\/+$/, '');
    const professionalId = newProf?.id || userId;
    const professionalBioLink = `${cleanSiteUrl}/agendamento?professional=${professionalId}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(professionalBioLink)}`;

    // 6. Send custom welcome email with the action link and official bio link
    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background-color: #ffffff; color: #1e293b; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <!-- Header Branding -->
        <div style="background: linear-gradient(135deg, #1e5338 0%, #2d8659 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">Doxologos Psicologia</h1>
          <p style="margin: 8px 0 0 0; font-size: 15px; color: #d1fae5; font-weight: 400;">Boas-vindas ao nosso corpo de profissionais parceiros</p>
        </div>

        <div style="padding: 32px 28px;">
          <!-- Welcome Heading -->
          <h2 style="color: #0f172a; margin-top: 0; font-size: 22px; font-weight: 700;">
            Parabéns, ${application.name}! 🎉
          </h2>
          <p style="font-size: 15px; color: #334155;">
            Temos a imensa alegria de informar que sua candidatura para fazer parte da <strong>Doxologos</strong> foi <strong>aprovada</strong> com sucesso pela nossa equipe de curadoria técnica e clínica!
          </p>
          <p style="font-size: 15px; color: #334155;">
            A partir de agora, você conta com toda a nossa infraestrutura para gerenciar seus atendimentos, receber consultas de forma segura e expandir seu alcance clínico com excelência e propósito.
          </p>

          <!-- Step 1: Activation Card -->
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 5px solid #2d8659; border-radius: 8px; padding: 22px 20px; margin: 26px 0;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #1e293b; font-weight: 700;">
              🔑 1º Passo: Ativação da Conta e Criação da Senha
            </h3>
            <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569;">
              Clique no botão abaixo para definir sua senha de acesso e liberar seu Painel de Controle:
            </p>
            <div style="text-align: center; margin: 18px 0;">
              <a href="${actionLink}" style="display: inline-block; background-color: #2d8659; color: #ffffff; padding: 13px 28px; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 15px; box-shadow: 0 2px 4px rgba(45, 134, 89, 0.3);">
                Ativar Minha Conta e Criar Senha
              </a>
            </div>
            <p style="font-size: 12px; color: #64748b; margin: 14px 0 0 0; word-break: break-all;">
              Se o botão não abrir, copie e cole o link seguro no navegador:<br>
              <span style="color: #2d8659;">${actionLink}</span>
            </p>
          </div>

          <!-- Step 2: Official Bio & Agenda Link (Highlight Card - Dark Theme) -->
          <div style="background-color: #0b1329; border-radius: 12px; padding: 26px 22px; color: #ffffff; margin: 28px 0; box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.2);">
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
              <span style="display: inline-block; background-color: rgba(45, 134, 89, 0.25); color: #34d399; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">
                Divulgação & Marketing Clínico
              </span>
            </div>
            <h3 style="color: #ffffff; margin: 10px 0 6px 0; font-size: 18px; font-weight: 700;">
              ✨ Sua Agenda Online & Link da Bio Oficial
            </h3>
            <p style="color: #cbd5e1; font-size: 14px; margin: 0 0 16px 0; line-height: 1.5;">
              Este é o seu link direto, permanente e personalizado. Através dele, seus pacientes escolhem o horário, realizam o pagamento e agendam com você em poucos cliques:
            </p>

            <!-- URL Highlight Box -->
            <div style="background-color: #030712; border: 1px solid #1e293b; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px;">
              <span style="font-family: monospace; font-size: 13px; color: #38bdf8; word-break: break-all; display: block;">
                ${professionalBioLink}
              </span>
            </div>

            <!-- Quick Action Button to see their agenda -->
            <div style="text-align: center; margin-bottom: 22px;">
              <a href="${professionalBioLink}" style="display: inline-block; background-color: #ffffff; color: #0b1329; padding: 10px 22px; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 13px;">
                Visualizar Minha Página de Agendamento →
              </a>
            </div>

            <!-- Marketing Tips & Incentives -->
            <div style="border-top: 1px solid #1e293b; padding-top: 18px;">
              <h4 style="color: #38bdf8; font-size: 14px; font-weight: 700; margin: 0 0 10px 0;">
                💡 Dicas para potencializar seus agendamentos:
              </h4>
              <ul style="margin: 0; padding-left: 18px; color: #e2e8f0; font-size: 13px; line-height: 1.7;">
                <li><strong style="color: #ffffff;">Instagram & Redes Sociais:</strong> Coloque o link no campo <em>"Site / Link na Bio"</em> do seu perfil no Instagram, TikTok, LinkedIn ou Facebook.</li>
                <li><strong style="color: #ffffff;">WhatsApp Business:</strong> Adicione o link nas suas mensagens automáticas de saudação ou respostas rápidas para quem solicitar atendimento.</li>
                <li><strong style="color: #ffffff;">Materiais de Apresentação:</strong> Insira o link ou o QR Code em cartões de visita digitais, assinaturas de e-mail e propostas.</li>
              </ul>
            </div>

            <!-- Official QR Code Section -->
            <div style="text-align: center; margin-top: 22px; padding: 16px; background-color: rgba(255, 255, 255, 0.04); border-radius: 8px; border: 1px dashed #334155;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0 0 10px 0; font-weight: 600; text-transform: uppercase;">
                Seu QR Code Oficial de Agendamento
              </p>
              <img src="${qrCodeUrl}" alt="QR Code da Agenda de ${application.name}" width="150" height="150" style="display: inline-block; border-radius: 8px; background-color: #ffffff; padding: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);" />
              <p style="color: #64748b; font-size: 11px; margin: 8px 0 0 0;">
                Você pode salvar esta imagem para incluir em cartões impressos ou materiais gráficos!
              </p>
            </div>
          </div>

          <!-- What to do after login -->
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 18px 20px; margin: 24px 0;">
            <h4 style="color: #166534; margin: 0 0 6px 0; font-size: 15px; font-weight: 700;">
              🗓️ Próximo passo no seu Painel:
            </h4>
            <p style="color: #15803d; font-size: 13px; margin: 0; line-height: 1.5;">
              Assim que definir sua senha, acesse seu painel profissional para preencher seus dias e horários de disponibilidade, foto e valor da sua sessão para que sua agenda comece a receber pacientes imediatamente.
            </p>
          </div>

          <p style="font-size: 14px; color: #475569; margin-top: 28px;">
            Caso tenha qualquer dúvida técnica ou de operação, estamos à disposição para ajudá-lo(a) pelo e-mail <strong>contato@doxologos.com.br</strong> ou pelo nosso suporte direto.
          </p>

          <p style="font-size: 15px; color: #1e293b; margin-bottom: 0;">
            Com muita alegria e estima,<br>
            <strong style="color: #2d8659;">Equipe Doxologos Psicologia</strong>
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f1f5f9; padding: 18px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
          © Doxologos Psicologia • Plataforma de Saúde Mental Cristã • doxologos.com.br
        </div>
      </div>
    `;

    // Invoke send-email function
    const { error: emailInvokeError } = await supabaseAdmin.functions.invoke('send-email', {
      body: {
        to: application.email,
        subject: 'Sua candidatura foi aprovada! Bem-vindo(a) à Doxologos',
        html: emailHtml
      }
    });

    if (emailInvokeError) {
      console.error("Falha ao enviar o email de boas vindas, mas o usuário foi criado.", emailInvokeError);
      // We don't throw here because the user is already created successfully in DB
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Profissional aprovado e convite enviado.', 
        userId, 
        professionalId,
        bioLink: professionalBioLink 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ Erro na função approve-professional-application:', error)
    const message = error instanceof Error ? error.message : 'Erro desconhecido.'
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
