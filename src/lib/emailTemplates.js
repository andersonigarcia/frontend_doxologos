export class EmailTemplates {
  constructor() {
    this.brandColor = "#2d8659";
    // Usar variável de ambiente ou URL de produção
    // Prioridade: 1) VITE_APP_URL, 2) window.location.origin (se não for localhost), 3) URL de produção
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const isLocalhost = currentOrigin.includes('localhost') || currentOrigin.includes('127.0.0.1');
    
    this.baseUrl = import.meta.env.VITE_APP_URL || 
                   (!isLocalhost && currentOrigin) || 
                   'https://appsite.doxologos.com.br';
    
    this.supportEmail = "doxologos@doxologos.com.br";
  }
  
  // Função para sanitizar dados antes de inserir no HTML
  sanitizeForHtml(text) {
    if (!text || typeof text !== 'string') return '';
    
    // Escapa caracteres especiais que podem causar problemas de codificação
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/\n/g, '<br>')
      .replace(/\s+/g, ' ') // Remove espaços extras que podem causar =20
      .trim();
  }
  
  baseTemplate(content, title = "Doxologos") {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 20px; background: #f5f7fa; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; background: white; padding: 0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: ${this.brandColor}; color: white; padding: 25px 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .content { padding: 30px; }
    .info-box { background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 6px; border-left: 4px solid ${this.brandColor}; }
    .info-box p { margin: 8px 0; font-size: 15px; }
    .info-box strong { color: #1f2937; font-weight: 600; }
    .tips-box { background: #fffbeb; padding: 20px; margin: 20px 0; border-radius: 6px; border-left: 4px solid #f59e0b; }
    .tips-box h3 { margin: 0 0 15px 0; color: #92400e; font-size: 16px; }
    .tips-box ul { margin: 0; padding-left: 20px; }
    .tips-box li { margin: 8px 0; color: #78350f; }
    .btn { display: inline-block; padding: 14px 32px; background: ${this.brandColor}; color: white !important; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px 5px; transition: background 0.2s; }
    .btn:hover { background: #236b47; }
    .btn-secondary { background: #6b7280; }
    .btn-secondary:hover { background: #4b5563; }
    .footer { background: #f8f9fa; padding: 20px 30px; text-align: center; font-size: 13px; color: #6b7280; border-top: 1px solid #e5e7eb; }
    .footer p { margin: 5px 0; }
    .heart { color: #ef4444; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💙 Doxologos Psicologia</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p><strong>Doxologos Psicologia</strong></p>
      <p>📧 ${this.supportEmail} | 🌐 <a href="${this.baseUrl}" style="color: ${this.brandColor};">${this.baseUrl}</a></p>
      <p style="margin-top: 10px; font-size: 12px;">Feito com <span class="heart">❤️</span> para cuidar da sua saúde mental</p>
    </div>
  </div>
</body>
</html>`;
  }
  
  formatDate(dateString) {
    try {
      const date = new Date(dateString + 'T00:00:00');
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateString;
    }
  }
  
  // EMAIL 1: Confirmação de Agendamento (para o PACIENTE)
  bookingConfirmation(booking) {
    const content = `
      <h2 style="color: #1f2937; font-size: 22px; margin: 0 0 10px 0;">Olá, ${this.sanitizeForHtml(booking.patient_name)}!</h2>
      <p style="font-size: 16px; color: #4b5563; margin: 0 0 25px 0;">
        Seu agendamento foi realizado com sucesso! Seguem os detalhes:
      </p>
      
      <div class="info-box">
        <p><strong>📅 Data:</strong> ${this.formatDate(booking.appointment_date)}</p>
        <p><strong>⏰ Horário:</strong> ${this.sanitizeForHtml(booking.appointment_time)}</p>
        <p><strong>🩺 Serviço:</strong> ${this.sanitizeForHtml(booking.service_name)}</p>
        <p><strong>👨‍⚕️ Profissional:</strong> ${this.sanitizeForHtml(booking.professional_name)}</p>
      </div>

      <div style="background: #fef3c7; padding: 20px; margin: 25px 0; border-radius: 6px; border-left: 4px solid #f59e0b;">
        <h3 style="margin: 0 0 12px 0; color: #92400e; font-size: 16px;">⏳ Próximo Passo: Confirme seu Pagamento</h3>
        <p style="margin: 0 0 15px 0; color: #78350f; font-size: 15px;">
          Para finalizar sua reserva, é necessário confirmar o pagamento. 
          Você pode fazer isso acessando sua área do cliente.
        </p>
        <p style="text-align: center; margin: 0;">
          <a href="${this.baseUrl}/paciente" class="btn" style="background: #f59e0b; padding: 14px 32px; font-size: 15px; font-weight: 600;">
            💳 Finalizar Pagamento na Minha Área
          </a>
        </p>
      </div>

      <div class="tips-box">
        <h3>📋 O que você irá encontrar na sua área:</h3>
        <ul>
          <li><strong>Status do Pagamento:</strong> Acompanhe a confirmação em tempo real</li>
          <li><strong>Link da Consulta:</strong> Após pagamento, o link da sala Zoom aparecerá aqui</li>
          <li><strong>Histórico:</strong> Visualize todos seus agendamentos passados e futuros</li>
          <li><strong>Reagendamento:</strong> Altere a data/hora se necessário</li>
        </ul>
      </div>

      <div style="background: #dbeafe; padding: 20px; margin: 20px 0; border-radius: 6px; border-left: 4px solid #3b82f6; text-align: center;">
        <p style="margin: 0 0 15px 0; color: #1e40af; font-size: 15px;">
          <strong>🔐 Segurança</strong>
        </p>
        <p style="margin: 0; color: #1e3a8a; font-size: 14px;">
          O link e a senha do Zoom serão exibidos com segurança na sua área, 
          apenas após a confirmação do pagamento.
        </p>
      </div>

      <p style="text-align: center; margin-top: 30px;">
        <a href="${this.baseUrl}/paciente" class="btn">Acessar Minha Área</a>
      </p>

      <p style="margin-top: 25px; font-size: 14px; color: #6b7280; line-height: 1.6;">
        Qualquer dúvida ou imprevisto, conte com a equipe de suporte.<br>
        <strong>Abraços,<br>Equipe Doxologos</strong>
      </p>
    `;
    return this.baseTemplate(content, "Agendamento Confirmado - Doxologos");
  }

  // EMAIL 2: Novo Agendamento (para o PROFISSIONAL)
  newBookingForProfessional(booking) {
    const content = `
      <h2 style="color: #1f2937; font-size: 22px; margin: 0 0 10px 0;">Olá, ${this.sanitizeForHtml(booking.professional_name)}!</h2>
      <p style="font-size: 16px; color: #4b5563; margin: 0 0 25px 0;">
        Temos uma nova consulta confirmada para você na Doxologos. Seguem os detalhes:
      </p>
      
      <div class="info-box">
        <p><strong>📅 Data:</strong> ${this.formatDate(booking.appointment_date)}</p>
        <p><strong>⏰ Horário:</strong> ${this.sanitizeForHtml(booking.appointment_time)}</p>
        <p><strong>👤 Paciente:</strong> ${this.sanitizeForHtml(booking.patient_name)}</p>
        ${booking.patient_phone ? `<p><strong>📱 Telefone:</strong> ${this.sanitizeForHtml(booking.patient_phone)}</p>` : ''}
        ${booking.patient_email ? `<p><strong>📧 E-mail:</strong> ${this.sanitizeForHtml(booking.patient_email)}</p>` : ''}
        <p><strong>🖥️ Atendimento:</strong> ${this.sanitizeForHtml(booking.service_name)} (via Zoom)</p>
      </div>

      ${booking.meeting_link ? `
        <div style="background: #dbeafe; padding: 20px; margin: 20px 0; border-radius: 6px; border-left: 4px solid #3b82f6;">
          <p style="margin: 0 0 10px 0; color: #1e40af; font-weight: 600;">🔗 Informações da Sala:</p>
          <p style="margin: 5px 0;"><strong>Link:</strong> <a href="${booking.meeting_link}" style="color: #2563eb; word-break: break-all;">${booking.meeting_link}</a></p>
          ${booking.meeting_password ? `<p style="margin: 5px 0;"><strong>Senha de acesso:</strong> <code style="background: white; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${booking.meeting_password}</code></p>` : ''}
        </div>
      ` : ''}

      <div class="tips-box">
        <h3>💡 Dica:</h3>
        <ul>
          <li>Abra a sala alguns minutos antes do horário agendado para garantir que tudo esteja pronto para o paciente</li>
          <li>Teste o áudio, vídeo e compartilhe a tela se necessário</li>
          <li>Caso o paciente tenha dificuldade para entrar, esteja disponível para auxiliá-lo com calma e empatia</li>
        </ul>
      </div>

      <p style="background: #f0fdf4; padding: 15px; border-radius: 6px; border-left: 4px solid #10b981; margin: 25px 0; font-size: 15px; color: #065f46;">
        💙 <strong>Nosso objetivo</strong> é que cada paciente se sinta acolhido e bem atendido em todas as etapas.
      </p>

      <p style="margin-top: 25px; font-size: 14px; color: #6b7280; line-height: 1.6;">
        Qualquer dúvida ou imprevisto, conte com a equipe de suporte.<br>
        <strong>Abraços,<br>Equipe Doxologos</strong>
      </p>
    `;
    return this.baseTemplate(content, "Nova Consulta Agendada - Doxologos");
  }

  // EMAIL 3: Pagamento Aprovado
  paymentApproved(booking) {
    const content = `
      <h2 style="color: #059669; font-size: 22px; margin: 0 0 10px 0;">✅ Pagamento Confirmado - Consulta Garantida!</h2>
      <p style="font-size: 16px; color: #4b5563; margin: 0 0 25px 0;">
        Olá <strong>${this.sanitizeForHtml(booking.patient_name)}</strong>,
      </p>
      <p style="font-size: 16px; color: #4b5563; margin: 0 0 25px 0;">
        Ótimas notícias! Seu pagamento foi processado com sucesso e sua consulta está <strong>confirmada</strong>. 🎉
      </p>
      
      <div class="info-box">
        <p><strong>📅 Data:</strong> ${this.formatDate(booking.appointment_date)}</p>
        <p><strong>⏰ Horário:</strong> ${this.sanitizeForHtml(booking.appointment_time)}</p>
        <p><strong>🩺 Serviço:</strong> ${this.sanitizeForHtml(booking.service_name)}</p>
        <p><strong>👨‍⚕️ Profissional:</strong> ${this.sanitizeForHtml(booking.professional_name)}</p>
      </div>

      <div style="background: #dbeafe; padding: 25px; margin: 25px 0; border-radius: 8px; border-left: 4px solid #3b82f6; text-align: center;">
        <h3 style="margin: 0 0 15px 0; color: #1e40af; font-size: 18px;">🎥 Link da Reunião Pronto!</h3>
        <p style="margin: 0 0 20px 0; color: #1e3a8a; font-size: 15px;">
          O link e a senha da sala Zoom estão aguardando você na sua área do cliente. 
          Clique no botão abaixo para acessar agora:
        </p>
        <a href="${this.baseUrl}/paciente" class="btn" style="background: #3b82f6; font-size: 16px; padding: 14px 30px; text-decoration: none;">🔐 Acessar Minha Área - Link da Reunião</a>
        <p style="margin: 20px 0 0 0; font-size: 13px; color: #1e3a8a;">
          💡 Salve este email! Você precisará consultar o link da reunião no dia da consulta.
        </p>
      </div>

      <div style="background: #fef3c7; padding: 20px; margin: 20px 0; border-radius: 6px; border-left: 4px solid #f59e0b;">
        <h3 style="margin: 0 0 12px 0; color: #92400e; font-size: 16px;">📱 Primeira vez no Zoom?</h3>
        <ol style="margin: 0; padding-left: 20px; color: #78350f; line-height: 1.8;">
          <li>Acesse sua <strong>área do paciente</strong> e clique no link da consulta</li>
          <li>Se for a primeira vez, o Zoom pedirá para <strong>baixar o aplicativo</strong></li>
          <li>Se não baixar automaticamente, acesse: <a href="https://zoom.us/download" style="color: #92400e; text-decoration: underline;">zoom.us/download</a></li>
          <li>Após instalar, <strong>clique novamente no link</strong> da consulta</li>
          <li>Digite seu <strong>nome</strong> quando solicitado</li>
          <li>Use a <strong>senha</strong> mostrada na sua área do paciente se solicitado</li>
          <li>Aguarde na <strong>sala de espera</strong> - o profissional irá admiti-lo(a)</li>
          <li>Teste seu <strong>áudio e vídeo</strong> quando entrar na sala</li>
        </ol>
      </div>

      <div class="tips-box">
        <h3>💡 Dicas para uma consulta tranquila:</h3>
        <ul>
          <li>Entre na sala <strong>5 minutos antes</strong> do horário agendado</li>
          <li>Esteja em um local <strong>tranquilo e com boa iluminação</strong></li>
          <li>Tenha em mãos <strong>documentos e exames relevantes</strong></li>
          <li>Verifique sua <strong>conexão de internet</strong> e o funcionamento de câmera/microfone</li>
          <li>Você receberá um <strong>lembrete 24h antes</strong> da consulta</li>
          <li>Tenha <strong>fones de ouvido</strong> se possível (melhora o áudio)</li>
          <li>Certifique-se de que seu dispositivo está <strong>carregado</strong></li>
        </ul>
      </div>

      <div style="background: #f3f4f6; padding: 15px; margin: 20px 0; border-radius: 6px; text-align: center;">
        <p style="margin: 0; font-size: 14px; color: #4b5563;">
          <strong>⚠️ Problemas técnicos?</strong><br>
          Entre em contato conosco: <a href="mailto:${this.supportEmail}" style="color: ${this.brandColor};">${this.supportEmail}</a>
        </p>
      </div>

      <p style="margin-top: 25px; font-size: 14px; color: #6b7280; line-height: 1.6;">
        Estamos ansiosos para atendê-lo(a)!<br>
        <strong>Abraços,<br>Equipe Doxologos</strong>
      </p>
    `;
    return this.baseTemplate(content, "Pagamento Aprovado - Doxologos");
  }

  // EMAIL 4: Reagendamento
  bookingRescheduled(booking, oldDate, oldTime, reason = null) {
    const content = `
      <h2 style="color: #f59e0b; font-size: 22px; margin: 0 0 10px 0;">📅 Agendamento Reagendado</h2>
      <p style="font-size: 16px; color: #4b5563; margin: 0 0 25px 0;">
        Olá <strong>${this.sanitizeForHtml(booking.patient_name)}</strong>,
      </p>
      <p style="font-size: 16px; color: #4b5563; margin: 0 0 20px 0;">
        Informamos que seu agendamento foi alterado.
      </p>
      
      ${reason ? `
        <div style="background: #fef3c7; padding: 15px; margin: 20px 0; border-radius: 6px; border-left: 4px solid #f59e0b;">
          <p style="margin: 0; color: #92400e; font-style: italic;"><strong>Motivo:</strong> "${this.sanitizeForHtml(reason)}"</p>
        </div>
      ` : ''}

      <div style="background: #fee2e2; padding: 20px; margin: 20px 0; border-radius: 6px; border-left: 4px solid #dc2626;">
        <h3 style="margin: 0 0 12px 0; color: #991b1b; font-size: 16px;">❌ Horário Anterior:</h3>
        <p style="margin: 5px 0; color: #7f1d1d;"><strong>Data:</strong> ${this.formatDate(oldDate)}</p>
        <p style="margin: 5px 0; color: #7f1d1d;"><strong>Horário:</strong> ${this.sanitizeForHtml(oldTime)}</p>
      </div>

      <div style="background: #d1fae5; padding: 20px; margin: 20px 0; border-radius: 6px; border-left: 4px solid #059669;">
        <h3 style="margin: 0 0 12px 0; color: #065f46; font-size: 16px;">✅ Novo Horário:</h3>
        <p style="margin: 5px 0; color: #064e3b;"><strong>Data:</strong> ${this.formatDate(booking.appointment_date)}</p>
        <p style="margin: 5px 0; color: #064e3b;"><strong>Horário:</strong> ${this.sanitizeForHtml(booking.appointment_time)}</p>
        <p style="margin: 5px 0; color: #064e3b;"><strong>Profissional:</strong> ${this.sanitizeForHtml(booking.professional_name)}</p>
      </div>

      <p style="font-size: 15px; color: #4b5563; margin: 20px 0;">
        Se você não puder comparecer no novo horário ou tiver alguma dúvida, entre em contato conosco o quanto antes.
      </p>

      <p style="text-align: center; margin-top: 30px;">
        <a href="${this.baseUrl}/area-do-paciente" class="btn">Gerenciar Agendamento</a>
      </p>

      <p style="margin-top: 25px; font-size: 14px; color: #6b7280; line-height: 1.6;">
        <strong>Abraços,<br>Equipe Doxologos</strong>
      </p>
    `;
    return this.baseTemplate(content, "Reagendamento - Doxologos");
  }

  // EMAIL 5: Cancelamento
  bookingCancellation(booking, reason = null, refundInfo = null) {
    const content = `
      <h2 style="color: #dc2626; font-size: 22px; margin: 0 0 10px 0;">❌ Agendamento Cancelado</h2>
      <p style="font-size: 16px; color: #4b5563; margin: 0 0 25px 0;">
        Olá <strong>${this.sanitizeForHtml(booking.patient_name)}</strong>,
      </p>
      <p style="font-size: 16px; color: #4b5563; margin: 0 0 20px 0;">
        Informamos que seu agendamento foi cancelado.
      </p>
      
      ${reason ? `
        <div style="background: #fee2e2; padding: 15px; margin: 20px 0; border-radius: 6px; border-left: 4px solid #dc2626;">
          <p style="margin: 0; color: #991b1b;"><strong>Motivo:</strong> ${this.sanitizeForHtml(reason)}</p>
        </div>
      ` : ''}

      <div class="info-box">
        <p><strong>🩺 Serviço:</strong> ${this.sanitizeForHtml(booking.service_name)}</p>
        <p><strong>📅 Data:</strong> ${this.formatDate(booking.appointment_date)}</p>
        <p><strong>⏰ Horário:</strong> ${this.sanitizeForHtml(booking.appointment_time)}</p>
        <p><strong>👨‍⚕️ Profissional:</strong> ${this.sanitizeForHtml(booking.professional_name)}</p>
      </div>

      ${refundInfo ? `
        <div style="background: #dbeafe; padding: 20px; margin: 20px 0; border-radius: 6px; border-left: 4px solid #3b82f6;">
          <p style="margin: 0 0 10px 0; color: #1e40af; font-weight: 600;">💰 Informações sobre Reembolso:</p>
          <p style="margin: 0; color: #1e3a8a;">${this.sanitizeForHtml(refundInfo)}</p>
        </div>
      ` : ''}

      <div class="tips-box">
        <h3>📋 O que fazer agora:</h3>
        <ul>
          <li>Se desejar, você pode fazer um novo agendamento a qualquer momento</li>
          <li>Entre em contato conosco se tiver dúvidas ou precisar de ajuda</li>
          <li>Estamos sempre à disposição para atendê-lo(a)</li>
        </ul>
      </div>

      <p style="text-align: center; margin-top: 30px;">
        <a href="${this.baseUrl}/agendamento" class="btn">Fazer Novo Agendamento</a>
      </p>

      <p style="margin-top: 25px; font-size: 14px; color: #6b7280; line-height: 1.6;">
        Esperamos vê-lo(a) em breve!<br>
        <strong>Abraços,<br>Equipe Doxologos</strong>
      </p>
    `;
    return this.baseTemplate(content, "Cancelamento - Doxologos");
  }

  // EMAIL 6: Lembrete (24h antes)
  bookingReminder(booking) {
    const content = `
      <h2 style="color: ${this.brandColor}; font-size: 22px; margin: 0 0 10px 0;">⏰ Sua Consulta é Amanhã!</h2>
      <p style="font-size: 16px; color: #4b5563; margin: 0 0 25px 0;">
        Olá <strong>${this.sanitizeForHtml(booking.patient_name)}</strong>,
      </p>
      <p style="font-size: 16px; color: #4b5563; margin: 0 0 20px 0;">
        Este é um lembrete amigável de que sua consulta está agendada para <strong>amanhã</strong>!
      </p>
      
      <div style="background: #fef3c7; padding: 20px; margin: 20px 0; border-radius: 6px; border-left: 4px solid #f59e0b;">
        <p style="margin: 8px 0; color: #78350f;"><strong>📅 Data:</strong> ${this.formatDate(booking.appointment_date)}</p>
        <p style="margin: 8px 0; color: #78350f;"><strong>⏰ Horário:</strong> ${this.sanitizeForHtml(booking.appointment_time)}</p>
        <p style="margin: 8px 0; color: #78350f;"><strong>👨‍⚕️ Profissional:</strong> ${this.sanitizeForHtml(booking.professional_name)}</p>
        <p style="margin: 8px 0; color: #78350f;"><strong>🩺 Serviço:</strong> ${this.sanitizeForHtml(booking.service_name)}</p>
      </div>

      <div style="background: #dbeafe; padding: 20px; margin: 20px 0; border-radius: 6px; border-left: 4px solid #3b82f6; text-align: center;">
        <p style="margin: 0 0 15px 0; color: #1e40af; font-weight: 600; font-size: 16px;">🔗 Link da Consulta</p>
        <p style="margin: 0 0 15px 0; color: #1e3a8a; font-size: 14px;">
          Acesse sua área do paciente para visualizar o link e senha do Zoom
        </p>
        <a href="${this.baseUrl}/area-do-paciente" class="btn" style="background: #3b82f6; font-size: 15px;">Acessar Minha Área</a>
      </div>

      <div class="tips-box">
        <h3>📋 Checklist antes da consulta:</h3>
        <ul>
          <li>✓ Acesse sua área do paciente e tenha o link do Zoom pronto</li>
          <li>✓ Verifique sua conexão de internet</li>
          <li>✓ Teste câmera e microfone com antecedência</li>
          <li>✓ Separe documentos e exames relevantes</li>
          <li>✓ Esteja em um local tranquilo e privado</li>
          <li>✓ Entre na sala 5 minutos antes do horário</li>
        </ul>
      </div>

      <p style="background: #f0fdf4; padding: 15px; border-radius: 6px; border-left: 4px solid #10b981; margin: 25px 0; font-size: 14px; color: #065f46;">
        💡 <strong>Dica:</strong> Se precisar cancelar ou reagendar, entre em contato o quanto antes. Assim podemos disponibilizar o horário para outros pacientes.
      </p>

      <p style="text-align: center; margin-top: 30px;">
        <a href="${this.baseUrl}/area-do-paciente" class="btn">Acessar Minha Área</a>
      </p>

      <p style="margin-top: 25px; font-size: 14px; color: #6b7280; line-height: 1.6;">
        Até amanhã!<br>
        <strong>Abraços,<br>Equipe Doxologos</strong>
      </p>
    `;
    return this.baseTemplate(content, "Lembrete de Consulta - Doxologos");
  }

  // EMAIL 7: Agradecimento
  bookingThankYou(booking) {
    const content = `
      <h2 style="color: ${this.brandColor}; font-size: 22px; margin: 0 0 10px 0;">🙏 Obrigado pela Consulta!</h2>
      <p style="font-size: 16px; color: #4b5563; margin: 0 0 25px 0;">
        Olá <strong>${this.sanitizeForHtml(booking.patient_name)}</strong>,
      </p>
      <p style="font-size: 16px; color: #4b5563; margin: 0 0 20px 0;">
        Esperamos que sua consulta com <strong>${this.sanitizeForHtml(booking.professional_name)}</strong> tenha sido proveitosa!
      </p>
      
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; margin: 25px 0; border-radius: 8px; text-align: center; color: white;">
        <p style="font-size: 28px; margin: 0 0 10px 0;">⭐⭐⭐⭐⭐</p>
        <p style="font-size: 18px; margin: 0; font-weight: 600;">Sua opinião é muito importante!</p>
      </div>

      <p style="font-size: 16px; color: #4b5563; margin: 20px 0;">
        <strong>Gostaríamos de ouvir você:</strong>
      </p>
      <ul style="color: #4b5563; line-height: 1.8;">
        <li>Como foi sua experiência conosco?</li>
        <li>O profissional atendeu suas expectativas?</li>
        <li>Há algo que possamos melhorar?</li>
      </ul>

      <p style="text-align: center; margin-top: 30px;">
        <a href="${this.baseUrl}/depoimento" class="btn" style="font-size: 15px;">⭐ Deixar Avaliação</a>
        <a href="${this.baseUrl}/agendamento" class="btn btn-secondary" style="font-size: 15px;">📅 Agendar Nova Consulta</a>
      </p>

      <div style="background: linear-gradient(to right, #f0fdf4, #dbeafe); padding: 25px; margin: 30px 0; border-radius: 8px; border-left: 4px solid ${this.brandColor}; text-align: center;">
        <p style="margin: 0; font-size: 16px; color: #1f2937; font-style: italic; line-height: 1.6;">
          💙 <strong>"Cuidar da saúde mental é um ato de coragem e amor próprio.<br>Continue sua jornada com a gente!"</strong>
        </p>
      </div>

      <p style="margin-top: 25px; font-size: 14px; color: #6b7280; line-height: 1.6;">
        Conte sempre conosco!<br>
        <strong>Abraços,<br>Equipe Doxologos</strong>
      </p>
    `;
    return this.baseTemplate(content, "Obrigado - Doxologos");
  }

  // ============================================
  // EMAILS DE EVENTOS
  // ============================================

  // EMAIL: Inscrição Confirmada - Evento Gratuito (com link Zoom)
  eventoGratuitoConfirmado(inscricao, evento) {
    const dataFormatada = new Date(evento.data_inicio).toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const horaFormatada = new Date(evento.data_inicio).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const content = `
      <h2 style="color: #1f2937; margin: 0 0 20px 0;">✅ Inscrição Confirmada!</h2>
      
      <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
        Olá, <strong>${this.sanitizeForHtml(inscricao.nome)}</strong>!
      </p>
      
      <p style="font-size: 16px; color: #374151; margin-bottom: 25px;">
        Sua inscrição no evento <strong>"${this.sanitizeForHtml(evento.titulo)}"</strong> foi confirmada com sucesso! 🎉
      </p>
      
      <div style="background: #dcfce7; padding: 25px; margin: 25px 0; border-radius: 8px; border-left: 4px solid #16a34a;">
        <h3 style="margin: 0 0 15px 0; color: #15803d; font-size: 18px;">📅 Detalhes do Evento</h3>
        <p style="margin: 8px 0; font-size: 15px;"><strong>📆 Data:</strong> ${dataFormatada}</p>
        <p style="margin: 8px 0; font-size: 15px;"><strong>⏰ Horário:</strong> ${horaFormatada}</p>
        <p style="margin: 8px 0; font-size: 15px;"><strong>💻 Modalidade:</strong> Online via Zoom</p>
        ${evento.descricao ? `<p style="margin: 15px 0 0 0; color: #166534; line-height: 1.6;">${this.sanitizeForHtml(evento.descricao)}</p>` : ''}
      </div>
      
      <div style="background: #dbeafe; padding: 25px; margin: 25px 0; border-radius: 8px; border-left: 4px solid #3b82f6;">
        <h3 style="margin: 0 0 15px 0; color: #1e40af; font-size: 18px;">🎥 Acesso à Sala Online</h3>
        <p style="margin: 0 0 20px 0; color: #1e40af;">
          Clique no botão abaixo para acessar o evento:
        </p>
        <p style="text-align: center; margin: 20px 0;">
          <a href="${evento.meeting_link}" class="btn" style="font-size: 16px; padding: 16px 40px; background: #3b82f6;">
            🔗 Entrar no Evento Online
          </a>
        </p>
        
        ${evento.meeting_password ? `
        <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0; text-align: center;">
          <p style="margin: 0 0 10px 0; font-weight: bold; color: #1e40af; font-size: 14px;">🔑 Senha da Sala:</p>
          <p style="margin: 0; font-family: monospace; font-size: 24px; font-weight: bold; color: #1e40af; letter-spacing: 2px;">
            ${evento.meeting_password}
          </p>
        </div>
        ` : ''}
        
        <p style="margin: 15px 0 0 0; font-size: 13px; color: #64748b; text-align: center;">
          💡 <strong>Dica:</strong> Salve este email para ter acesso fácil ao link no dia do evento!
        </p>
      </div>
      
      <div style="background: #fef3c7; padding: 20px; margin: 25px 0; border-radius: 8px; border-left: 4px solid #f59e0b;">
        <h3 style="margin: 0 0 12px 0; color: #92400e; font-size: 16px;">📱 Primeira vez no Zoom?</h3>
        <ol style="margin: 0; padding-left: 20px; color: #78350f; line-height: 1.8; font-size: 14px;">
          <li>Clique no botão "Entrar no Evento Online" acima</li>
          <li>Se for a primeira vez, o Zoom pedirá para <strong>baixar o aplicativo</strong> - é gratuito e seguro</li>
          <li>Se não baixar automaticamente, acesse: <a href="https://zoom.us/download" style="color: #92400e; text-decoration: underline;">zoom.us/download</a></li>
          <li>Após instalar, clique novamente no link do evento</li>
          <li>Digite a senha se solicitado</li>
          <li>Aguarde na sala de espera - o organizador irá admiti-lo(a)</li>
        </ol>
      </div>
      
      <div style="background: #dcfce7; padding: 20px; margin: 25px 0; border-radius: 8px; border-left: 4px solid #16a34a;">
        <h3 style="margin: 0 0 12px 0; color: #15803d; font-size: 16px;">✅ Recomendações para o Evento</h3>
        <ul style="margin: 0; padding-left: 20px; color: #166534; line-height: 1.8; font-size: 14px;">
          <li>Entre <strong>10 minutos antes</strong> do horário agendado</li>
          <li>Teste seu <strong>áudio e vídeo</strong> antes do evento</li>
          <li>Esteja em um <strong>local tranquilo</strong> com boa conexão de internet</li>
          <li>Tenha <strong>papel e caneta</strong> para anotações</li>
          <li>Prepare suas <strong>perguntas</strong> com antecedência</li>
        </ul>
      </div>
      
      <p style="margin: 30px 0 10px 0; color: #64748b; font-size: 14px; line-height: 1.6;">
        Nos vemos no evento! Se tiver dúvidas, responda este email.
      </p>
      
      <p style="margin: 20px 0 0 0; font-size: 14px; color: #6b7280;">
        Atenciosamente,<br>
        <strong>Equipe Doxologos</strong>
      </p>
    `;
    return this.baseTemplate(content, `Confirmado - ${evento.titulo}`);
  }

  // EMAIL: Evento Pago - Aguardando Pagamento
  eventoPagoAguardandoPagamento(inscricao, evento, pixData) {
    const dataFormatada = new Date(evento.data_inicio).toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const horaFormatada = new Date(evento.data_inicio).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const content = `
      <h2 style="color: #1f2937; margin: 0 0 20px 0;">⏳ Quase Lá! Finalize seu Pagamento</h2>
      
      <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
        Olá, <strong>${this.sanitizeForHtml(inscricao.nome)}</strong>!
      </p>
      
      <p style="font-size: 16px; color: #374151; margin-bottom: 25px;">
        Recebemos sua inscrição no evento <strong>"${this.sanitizeForHtml(evento.titulo)}"</strong>. 
        Para confirmar sua participação, realize o pagamento via PIX.
      </p>
      
      <div style="background: #fef3c7; padding: 25px; margin: 25px 0; border-radius: 8px; border-left: 4px solid #f59e0b;">
        <h3 style="margin: 0 0 15px 0; color: #92400e; font-size: 18px;">📅 Detalhes do Evento</h3>
        <p style="margin: 8px 0; font-size: 15px;"><strong>📆 Data:</strong> ${dataFormatada}</p>
        <p style="margin: 8px 0; font-size: 15px;"><strong>⏰ Horário:</strong> ${horaFormatada}</p>
        <p style="margin: 8px 0; font-size: 15px;"><strong>💰 Valor:</strong> R$ ${parseFloat(evento.valor).toFixed(2).replace('.', ',')}</p>
        ${evento.descricao ? `<p style="margin: 15px 0 0 0; color: #78350f; line-height: 1.6;">${this.sanitizeForHtml(evento.descricao)}</p>` : ''}
      </div>
      
      <div style="background: #dbeafe; padding: 25px; margin: 25px 0; border-radius: 8px; border-left: 4px solid #3b82f6; text-align: center;">
        <h3 style="margin: 0 0 15px 0; color: #1e40af; font-size: 18px;">💳 Pagamento via PIX</h3>
        <p style="margin: 0 0 20px 0; color: #1e40af; font-size: 14px;">
          Escaneie o QR Code abaixo com o app do seu banco:
        </p>
        
        ${pixData.qr_code_base64 ? `
        <div style="background: white; padding: 20px; border-radius: 8px; display: inline-block; margin: 10px 0;">
          <img src="data:image/png;base64,${pixData.qr_code_base64}" alt="QR Code PIX" style="width: 250px; height: 250px; display: block;">
        </div>
        ` : ''}
        
        <p style="margin: 20px 0 10px 0; font-size: 13px; color: #64748b;">
          Ou copie o código PIX abaixo:
        </p>
        
        <div style="background: #f1f5f9; padding: 15px; border-radius: 6px; margin: 10px 0; word-break: break-all; font-family: monospace; font-size: 12px; color: #1e293b;">
          ${pixData.qr_code}
        </div>
        
        <p style="margin: 20px 0 0 0; font-size: 13px; color: #64748b;">
          💡 O pagamento é processado <strong>instantaneamente</strong>!
        </p>
      </div>
      
      <div style="background: #dcfce7; padding: 20px; margin: 25px 0; border-radius: 8px; border-left: 4px solid #16a34a;">
        <h3 style="margin: 0 0 12px 0; color: #15803d; font-size: 16px;">✅ Após o Pagamento</h3>
        <ul style="margin: 0; padding-left: 20px; color: #166534; line-height: 1.8; font-size: 14px;">
          <li>Você receberá um <strong>email de confirmação</strong> com o link da sala Zoom</li>
          <li>Sua inscrição será confirmada automaticamente</li>
          <li>Guarde o email com o link Zoom para acessar o evento no dia</li>
        </ul>
      </div>
      
      ${evento.vagas_disponiveis > 0 ? `
      <div style="background: #fee2e2; padding: 20px; margin: 25px 0; border-radius: 8px; border-left: 4px solid #ef4444; text-align: center;">
        <p style="margin: 0; color: #991b1b; font-weight: bold; font-size: 15px;">
          ⚠️ Atenção: Evento com vagas limitadas!
        </p>
        <p style="margin: 10px 0 0 0; color: #991b1b; font-size: 14px;">
          Realize o pagamento o quanto antes para garantir sua vaga.
        </p>
      </div>
      ` : ''}
      
      <p style="margin: 30px 0 10px 0; color: #64748b; font-size: 14px; line-height: 1.6;">
        Dúvidas? Responda este email ou entre em contato conosco.
      </p>
      
      <p style="margin: 20px 0 0 0; font-size: 14px; color: #6b7280;">
        Atenciosamente,<br>
        <strong>Equipe Doxologos</strong>
      </p>
    `;
    return this.baseTemplate(content, `Pagamento Pendente - ${evento.titulo}`);
  }

  // EMAIL: Evento Pago - Pagamento Confirmado (com link Zoom)
  eventoPagoConfirmado(inscricao, evento) {
    const dataFormatada = new Date(evento.data_inicio).toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const horaFormatada = new Date(evento.data_inicio).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const content = `
      <h2 style="color: #1f2937; margin: 0 0 20px 0;">✅ Pagamento Confirmado!</h2>
      
      <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
        Olá, <strong>${this.sanitizeForHtml(inscricao.nome)}</strong>!
      </p>
      
      <p style="font-size: 16px; color: #374151; margin-bottom: 25px;">
        Seu pagamento foi confirmado e sua inscrição no evento <strong>"${this.sanitizeForHtml(evento.titulo)}"</strong> está garantida! 🎉
      </p>
      
      <div style="background: #dcfce7; padding: 25px; margin: 25px 0; border-radius: 8px; border-left: 4px solid #16a34a; text-align: center;">
        <h3 style="margin: 0 0 10px 0; color: #15803d; font-size: 20px;">🎊 Seja Bem-Vindo(a)!</h3>
        <p style="margin: 0; color: #166534; font-size: 15px;">
          Sua vaga está confirmada e estamos ansiosos para te ver no evento!
        </p>
      </div>
      
      <div style="background: #fef3c7; padding: 25px; margin: 25px 0; border-radius: 8px; border-left: 4px solid #f59e0b;">
        <h3 style="margin: 0 0 15px 0; color: #92400e; font-size: 18px;">📅 Detalhes do Evento</h3>
        <p style="margin: 8px 0; font-size: 15px;"><strong>📆 Data:</strong> ${dataFormatada}</p>
        <p style="margin: 8px 0; font-size: 15px;"><strong>⏰ Horário:</strong> ${this.sanitizeForHtml(evento.hora_evento)}</p>
        <p style="margin: 8px 0; font-size: 15px;"><strong>💻 Modalidade:</strong> Online via Zoom</p>
        <p style="margin: 8px 0; font-size: 15px;"><strong>✅ Status:</strong> <span style="color: #15803d; font-weight: bold;">CONFIRMADO</span></p>
        ${evento.descricao ? `<p style="margin: 15px 0 0 0; color: #78350f; line-height: 1.6;">${this.sanitizeForHtml(evento.descricao)}</p>` : ''}
      </div>
      
      <div style="background: #dbeafe; padding: 25px; margin: 25px 0; border-radius: 8px; border-left: 4px solid #3b82f6;">
        <h3 style="margin: 0 0 15px 0; color: #1e40af; font-size: 18px;">🎥 Acesso à Sala Online</h3>
        <p style="margin: 0 0 20px 0; color: #1e40af;">
          Clique no botão abaixo para acessar o evento:
        </p>
        <p style="text-align: center; margin: 20px 0;">
          <a href="${evento.meeting_link}" class="btn" style="font-size: 16px; padding: 16px 40px; background: #3b82f6;">
            🔗 Entrar no Evento Online
          </a>
        </p>
        
        ${evento.meeting_password ? `
        <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0; text-align: center;">
          <p style="margin: 0 0 10px 0; font-weight: bold; color: #1e40af; font-size: 14px;">🔑 Senha da Sala:</p>
          <p style="margin: 0; font-family: monospace; font-size: 24px; font-weight: bold; color: #1e40af; letter-spacing: 2px;">
            ${evento.meeting_password}
          </p>
        </div>
        ` : ''}
        
        <p style="margin: 15px 0 0 0; font-size: 13px; color: #64748b; text-align: center;">
          💡 <strong>Importante:</strong> Salve este email! Você precisará do link no dia do evento.
        </p>
      </div>
      
      <div style="background: #f1f5f9; padding: 20px; margin: 25px 0; border-radius: 8px; border-left: 4px solid #64748b;">
        <h3 style="margin: 0 0 12px 0; color: #1e293b; font-size: 16px;">📱 Primeira vez no Zoom?</h3>
        <ol style="margin: 0; padding-left: 20px; color: #475569; line-height: 1.8; font-size: 14px;">
          <li>Clique no botão "Entrar no Evento Online" acima</li>
          <li>O Zoom pedirá para <strong>baixar o aplicativo</strong> (é gratuito e seguro)</li>
          <li>Se não baixar automaticamente: <a href="https://zoom.us/download" style="color: #3b82f6; text-decoration: underline;">zoom.us/download</a></li>
          <li>Após instalar, clique novamente no link</li>
          <li>Digite a senha quando solicitado</li>
          <li>Aguarde na sala de espera</li>
        </ol>
      </div>
      
      <div style="background: #dcfce7; padding: 20px; margin: 25px 0; border-radius: 8px; border-left: 4px solid #16a34a;">
        <h3 style="margin: 0 0 12px 0; color: #15803d; font-size: 16px;">✅ Checklist para o Evento</h3>
        <ul style="margin: 0; padding-left: 20px; color: #166534; line-height: 1.8; font-size: 14px;">
          <li>Entre <strong>10 minutos antes</strong> do horário</li>
          <li>Teste <strong>áudio e vídeo</strong></li>
          <li>Local <strong>tranquilo</strong> e boa internet</li>
          <li>Tenha <strong>papel e caneta</strong></li>
          <li>Prepare suas <strong>perguntas</strong></li>
        </ul>
      </div>
      
      <p style="margin: 30px 0 10px 0; color: #64748b; font-size: 14px; line-height: 1.6;">
        Estamos ansiosos para te ver no evento! Qualquer dúvida, responda este email.
      </p>
      
      <p style="margin: 20px 0 0 0; font-size: 14px; color: #6b7280;">
        Atenciosamente,<br>
        <strong>Equipe Doxologos</strong>
      </p>
    `;
    return this.baseTemplate(content, `✅ Confirmado - ${evento.titulo}`);
  }
}

export default new EmailTemplates();
