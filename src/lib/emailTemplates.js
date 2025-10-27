export class EmailTemplates {
  constructor() {
    this.brandColor = "#2d8659";
    this.baseUrl = import.meta.env.VITE_APP_URL || "https://doxologos.com.br";
    this.supportEmail = "contato@doxologos.com.br";
  }
  
  baseTemplate(content, title = "Doxologos") {
    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title}</title><style>body{font-family:Arial,sans-serif;margin:0;padding:20px;background:#f5f5f5}  .container{max-width:600px;margin:0 auto;background:white;padding:30px;border-radius:8px}.header{color:${this.brandColor};border-bottom:3px solid ${this.brandColor};padding-bottom:15px;margin-bottom:20px}.footer{margin-top:30px;padding-top:15px;border-top:1px solid #eee;font-size:12px;color:#666}</style></head><body><div class="container"><div class="header"><h1>Doxologos Psicologia</h1></div>${content}<div class="footer"><p>Doxologos Psicologia | ${this.supportEmail}</p></div></div></body></html>`;
  }
  
  formatDate(dateString) {
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return dateString;
    }
  }
  
  bookingConfirmation(booking) {
    const content = `
      <h2 style="color:${this.brandColor}">✅ Agendamento Confirmado!</h2>
      <p>Olá <strong>${booking.patient_name}</strong>,</p>
      <p>Seu agendamento foi realizado com sucesso! Estamos processando seu pagamento.</p>
      <div style="background:#f9f9f9;padding:15px;margin:20px 0;border-left:4px solid ${this.brandColor}">
        <p style="margin:5px 0"><strong>📋 Serviço:</strong> ${booking.service_name}</p>
        <p style="margin:5px 0"><strong>👨‍⚕️ Profissional:</strong> ${booking.professional_name}</p>
        <p style="margin:5px 0"><strong>📅 Data:</strong> ${this.formatDate(booking.appointment_date)}</p>
        <p style="margin:5px 0"><strong>🕐 Horário:</strong> ${booking.appointment_time}</p>
      </div>
      <p><strong>Próximos passos:</strong></p>
      <ol>
        <li>Aguarde a confirmação do pagamento</li>
        <li>Você receberá um email com os detalhes da consulta</li>
        <li>Um lembrete será enviado 24h antes do horário</li>
      </ol>
      <p style="text-align:center;margin-top:30px">
        <a href="${this.baseUrl}/area-do-paciente" style="display:inline-block;padding:12px 30px;background:${this.brandColor};color:white;text-decoration:none;border-radius:6px;font-weight:600">Acessar Minha Área</a>
      </p>
    `;
    return this.baseTemplate(content, "Confirmação de Agendamento");
  }

  paymentApproved(booking) {
    const content = `
      <h2 style="color:#059669">💳 Pagamento Aprovado!</h2>
      <p>Olá <strong>${booking.patient_name}</strong>,</p>
      <p>Ótimas notícias! Seu pagamento foi processado com sucesso e sua consulta está confirmada.</p>
      <div style="background:#f0fdf4;padding:15px;margin:20px 0;border-left:4px solid #059669">
        <p style="margin:5px 0"><strong>📋 Serviço:</strong> ${booking.service_name}</p>
        <p style="margin:5px 0"><strong>👨‍⚕️ Profissional:</strong> ${booking.professional_name}</p>
        <p style="margin:5px 0"><strong>📅 Data:</strong> ${this.formatDate(booking.appointment_date)}</p>
        <p style="margin:5px 0"><strong>🕐 Horário:</strong> ${booking.appointment_time}</p>
        ${booking.meeting_link ? `<p style="margin:5px 0"><strong>🔗 Link da consulta:</strong> <a href="${booking.meeting_link}" style="color:#059669">${booking.meeting_link}</a></p>` : ''}
      </div>
      <p><strong>Importante:</strong></p>
      <ul>
        <li>Chegue 5 minutos antes do horário agendado</li>
        <li>Tenha em mãos documentos e exames relevantes</li>
        <li>Você receberá um lembrete 24h antes</li>
      </ul>
      <p style="text-align:center;margin-top:30px">
        <a href="${this.baseUrl}/area-do-paciente" style="display:inline-block;padding:12px 30px;background:#059669;color:white;text-decoration:none;border-radius:6px;font-weight:600">Ver Detalhes da Consulta</a>
      </p>
    `;
    return this.baseTemplate(content, "Pagamento Aprovado");
  }

  bookingRescheduled(booking, oldDate, oldTime, reason = null) {
    const content = `
      <h2 style="color:#f59e0b">📅 Agendamento Reagendado</h2>
      <p>Olá <strong>${booking.patient_name}</strong>,</p>
      <p>Informamos que seu agendamento foi alterado.</p>
      ${reason ? `<p style="background:#fef3c7;padding:10px;border-radius:4px;font-style:italic">"${reason}"</p>` : ''}
      <div style="background:#f9f9f9;padding:15px;margin:20px 0;border-left:4px solid #dc2626">
        <h3 style="margin-top:0;color:#dc2626">❌ Horário Anterior:</h3>
        <p style="margin:5px 0"><strong>Data:</strong> ${this.formatDate(oldDate)}</p>
        <p style="margin:5px 0"><strong>Horário:</strong> ${oldTime}</p>
      </div>
      <div style="background:#f0fdf4;padding:15px;margin:20px 0;border-left:4px solid #059669">
        <h3 style="margin-top:0;color:#059669">✅ Novo Horário:</h3>
        <p style="margin:5px 0"><strong>Data:</strong> ${this.formatDate(booking.appointment_date)}</p>
        <p style="margin:5px 0"><strong>Horário:</strong> ${booking.appointment_time}</p>
        <p style="margin:5px 0"><strong>Profissional:</strong> ${booking.professional_name}</p>
      </div>
      <p>Se você tiver alguma dúvida ou não puder comparecer no novo horário, entre em contato conosco.</p>
      <p style="text-align:center;margin-top:30px">
        <a href="${this.baseUrl}/area-do-paciente" style="display:inline-block;padding:12px 30px;background:${this.brandColor};color:white;text-decoration:none;border-radius:6px;font-weight:600">Gerenciar Agendamento</a>
      </p>
    `;
    return this.baseTemplate(content, "Reagendamento de Consulta");
  }

  bookingCancellation(booking, reason = null, refundInfo = null) {
    const content = `
      <h2 style="color:#dc2626">❌ Agendamento Cancelado</h2>
      <p>Olá <strong>${booking.patient_name}</strong>,</p>
      <p>Informamos que seu agendamento foi cancelado.</p>
      ${reason ? `<p style="background:#fee2e2;padding:10px;border-radius:4px"><strong>Motivo:</strong> ${reason}</p>` : ''}
      <div style="background:#f9f9f9;padding:15px;margin:20px 0;border-left:4px solid #dc2626">
        <p style="margin:5px 0"><strong>Serviço:</strong> ${booking.service_name}</p>
        <p style="margin:5px 0"><strong>Data:</strong> ${this.formatDate(booking.appointment_date)}</p>
        <p style="margin:5px 0"><strong>Horário:</strong> ${booking.appointment_time}</p>
      </div>
      ${refundInfo ? `
        <div style="background:#dbeafe;padding:15px;margin:20px 0;border-radius:4px">
          <p style="margin:5px 0"><strong>💰 Informações sobre reembolso:</strong></p>
          <p style="margin:5px 0">${refundInfo}</p>
        </div>
      ` : ''}
      <p><strong>O que fazer agora:</strong></p>
      <ul>
        <li>Se desejar, você pode fazer um novo agendamento</li>
        <li>Entre em contato conosco se tiver dúvidas</li>
        <li>Estamos à disposição para ajudá-lo</li>
      </ul>
      <p style="text-align:center;margin-top:30px">
        <a href="${this.baseUrl}/agendamento" style="display:inline-block;padding:12px 30px;background:${this.brandColor};color:white;text-decoration:none;border-radius:6px;font-weight:600">Fazer Novo Agendamento</a>
      </p>
    `;
    return this.baseTemplate(content, "Cancelamento de Agendamento");
  }

  bookingReminder(booking) {
    const content = `
      <h2 style="color:${this.brandColor}">⏰ Lembrete: Sua Consulta é Amanhã!</h2>
      <p>Olá <strong>${booking.patient_name}</strong>,</p>
      <p>Este é um lembrete amigável de que sua consulta está agendada para <strong>amanhã</strong>!</p>
      <div style="background:#fef3c7;padding:15px;margin:20px 0;border-left:4px solid #f59e0b">
        <p style="margin:5px 0"><strong>👨‍⚕️ Profissional:</strong> ${booking.professional_name}</p>
        <p style="margin:5px 0"><strong>📅 Data:</strong> ${this.formatDate(booking.appointment_date)}</p>
        <p style="margin:5px 0"><strong>🕐 Horário:</strong> ${booking.appointment_time}</p>
        ${booking.meeting_link ? `<p style="margin:5px 0"><strong>🔗 Link:</strong> <a href="${booking.meeting_link}" style="color:#f59e0b;font-weight:600">${booking.meeting_link}</a></p>` : ''}
      </div>
      <p><strong>📋 Checklist antes da consulta:</strong></p>
      <ul>
        <li>✓ Verifique sua conexão de internet (se for online)</li>
        <li>✓ Separe documentos e exames relevantes</li>
        <li>✓ Esteja em um local tranquilo e privado</li>
        <li>✓ Acesse o link 5 minutos antes</li>
      </ul>
      ${booking.meeting_link ? `
        <p style="text-align:center;margin-top:30px">
          <a href="${booking.meeting_link}" style="display:inline-block;padding:12px 30px;background:${this.brandColor};color:white;text-decoration:none;border-radius:6px;font-weight:600">Acessar Consulta</a>
        </p>
      ` : ''}
      <p style="margin-top:20px;font-size:14px;color:#666">Caso precise cancelar ou reagendar, entre em contato o quanto antes.</p>
    `;
    return this.baseTemplate(content, "Lembrete de Consulta");
  }

  bookingThankYou(booking) {
    const content = `
      <h2 style="color:${this.brandColor}">🙏 Obrigado pela sua Consulta!</h2>
      <p>Olá <strong>${booking.patient_name}</strong>,</p>
      <p>Esperamos que sua consulta com <strong>${booking.professional_name}</strong> tenha sido proveitosa!</p>
      <div style="background:#f0fdf4;padding:15px;margin:20px 0;border-radius:8px;text-align:center">
        <p style="font-size:18px;margin:10px 0">⭐⭐⭐⭐⭐</p>
        <p style="margin:10px 0">Sua opinião é muito importante para nós!</p>
      </div>
      <p><strong>Gostaríamos de ouvir você:</strong></p>
      <ul>
        <li>Como foi sua experiência?</li>
        <li>O profissional atendeu suas expectativas?</li>
        <li>Há algo que possamos melhorar?</li>
      </ul>
      <p style="text-align:center;margin-top:30px">
        <a href="${this.baseUrl}/depoimento" style="display:inline-block;padding:12px 30px;background:${this.brandColor};color:white;text-decoration:none;border-radius:6px;font-weight:600;margin:5px">Deixar Avaliação</a>
        <a href="${this.baseUrl}/agendamento" style="display:inline-block;padding:12px 30px;background:#6b7280;color:white;text-decoration:none;border-radius:6px;font-weight:600;margin:5px">Agendar Nova Consulta</a>
      </p>
      <p style="margin-top:30px;padding:15px;background:#f9f9f9;border-radius:4px;font-style:italic;text-align:center">
        "Cuidar da saúde mental é um ato de coragem e amor próprio. Continue sua jornada com a gente!"
      </p>
    `;
    return this.baseTemplate(content, "Obrigado pela Consulta");
  }
}

export default new EmailTemplates();
