import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

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
      throw new Error('Configuração de ambiente ausente.')
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

    const callerRole = currentUser.app_metadata?.role ?? currentUser.user_metadata?.role
    if (callerRole !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Apenas administradores podem realizar encaixes.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    const body = await req.json()
    const {
      name, email, whatsapp, cpf, professional_id, service_id,
      booking_date, booking_time, room_link
    } = body

    if (!name || !email || !professional_id || !service_id || !booking_date || !booking_time) {
      return new Response(
        JSON.stringify({ error: 'Todos os campos obrigatórios (nome, e-mail, profissional, serviço, data e hora) devem ser preenchidos.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // 0. Buscar dados do Serviço (preço e repasse)
    const { data: serviceData, error: serviceError } = await supabaseAdmin
      .from('services')
      .select('*')
      .eq('id', service_id)
      .single()

    if (serviceError || !serviceData) {
      throw new Error(`Serviço não encontrado: ${serviceError?.message || 'ID inválido'}`)
    }

    const valorConsulta = Number(serviceData.price) || 0
    const valorRepasse = Number(serviceData.professional_payout) || (valorConsulta * 0.60)

    // 1. Tentar encontrar usuário existente ou criar um novo
    let patientId: string = ''
    let autoPassword = ''
    let isNewUser = false

    const { data: searchUsers, error: searchError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    })

    if (searchError) {
      console.warn('Erro ao listar usuários:', searchError)
    }
    
    const existingUser = searchUsers?.users?.find(u => u.email?.toLowerCase().trim() === normalizedEmail)

    if (existingUser) {
      patientId = existingUser.id
    } else {
      // Criar usuário com senha automática
      autoPassword = Math.random().toString(36).slice(-4) + Math.random().toString(36).slice(-4).toUpperCase() + '@' + Math.floor(100 + Math.random() * 900)
      const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: autoPassword,
        email_confirm: true,
        user_metadata: { name, full_name: name, whatsapp, phone: whatsapp, cpf }
      })

      if (createError) {
        // Se falhou por já existir, tenta buscar novamente
        console.warn('Erro na criação de usuário, buscando existente:', createError)
        const { data: retryList } = await supabaseAdmin.auth.admin.listUsers()
        const retryUser = retryList?.users?.find(u => u.email?.toLowerCase().trim() === normalizedEmail)
        if (retryUser) {
          patientId = retryUser.id
        } else {
          throw createError
        }
      } else if (createdUser?.user) {
        patientId = createdUser.user.id
        isNewUser = true
      }
    }

    // Atualizar / Salvar profile
    if (patientId) {
      await supabaseAdmin.from('profiles').upsert({
        id: patientId,
        full_name: name,
        whatsapp: whatsapp || null,
        cpf: cpf || null
      }).catch(err => console.warn('Erro ao atualizar profiles:', err))
    }

    // 2. Criar Booking
    const { data: booking, error: bookingError } = await supabaseAdmin.from('bookings').insert({
      user_id: patientId || null,
      patient_name: name,
      patient_email: normalizedEmail,
      patient_phone: whatsapp || null,
      professional_id,
      service_id,
      booking_date,
      booking_time,
      valor_consulta: valorConsulta,
      valor_repasse_profissional: valorRepasse,
      status: 'confirmed',
      payment_status: 'paid',
      meeting_link: room_link || null,
      created_by_admin_id: currentUser.id
    }).select().single()

    if (bookingError) {
      console.error('Erro ao inserir booking:', bookingError)
      throw bookingError
    }

    // 3. Criar Payment
    const { error: paymentError } = await supabaseAdmin.from('payments').insert({
      booking_id: booking.id,
      amount: valorConsulta,
      status: 'approved',
      payment_method: 'pix_direct',
      payer_name: name,
      payer_email: normalizedEmail,
      payer_document: cpf,
      date_approved: new Date().toISOString(),
      created_by_admin_id: currentUser.id
    })

    if (paymentError) {
      console.error('Erro ao inserir payment:', paymentError)
    }

    // 4. Disparar NFS-e em background com override de dados
    supabaseAdmin.functions.invoke('emit-nfse', {
      body: {
        booking_id: booking.id,
        override_data: {
          tomador_nome: name,
          tomador_email: normalizedEmail,
          tomador_cpf_cnpj: cpf,
          valor_servico: valorRepasse
        }
      }
    }).then(res => console.log('Emissão NFSe disparada:', res))
      .catch(e => console.error('Erro ao emitir NFSe:', e))

    // 5. Enviar E-mail Transacional
    const loginLink = `${Deno.env.get('FRONTEND_URL') || 'https://doxologos.com.br'}/login`
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        <h2 style="color: #2d8659;">Agendamento de Encaixe Confirmado!</h2>
        <p>Olá <strong>${name}</strong>,</p>
        <p>Seu agendamento foi registrado com sucesso para o dia <strong>${booking_date}</strong> às <strong>${booking_time}</strong>.</p>
        ${room_link ? `<p style="padding: 12px; background: #f0fdf4; border-left: 4px solid #2d8659; border-radius: 4px;"><strong>Link da Sala:</strong> <a href="${room_link}" target="_blank">${room_link}</a></p>` : ''}
        <br />
        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <h3 style="margin-top: 0; color: #1e293b;">Seu Acesso ao Portal do Paciente:</h3>
          <p>Você pode acessar a plataforma para ver os detalhes da consulta e gerenciar seu perfil:</p>
          <p><strong>E-mail:</strong> ${normalizedEmail}</p>
          ${isNewUser ? `<p><strong>Senha Provisória:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${autoPassword}</code></p><p style="font-size: 12px; color: #64748b;"><em>* Recomendamos alterar esta senha ao fazer seu primeiro acesso.</em></p>` : '<p style="font-size: 13px; color: #64748b;"><em>Você já possui cadastro na Doxologos, utilize sua senha existente para entrar.</em></p>'}
          <p style="margin-top: 16px;"><a href="${loginLink}" style="display: inline-block; background: #2d8659; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">Acessar Portal do Paciente</a></p>
        </div>
        <p style="margin-top: 24px; font-size: 12px; color: #94a3b8;">Doxologos Psicologia — Cuidando do seu bem-estar.</p>
      </div>
    `

    await supabaseAdmin.functions.invoke('send-email', {
      body: {
        to: normalizedEmail,
        subject: 'Confirmação de Agendamento - Doxologos',
        html: emailHtml
      }
    }).catch(e => console.error('Erro ao enviar e-mail de confirmação:', e))

    return new Response(
      JSON.stringify({ success: true, booking, isNewUser }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    console.error('❌ Erro na função create-emergency-booking:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno ao processar agendamento de urgência.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
