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
      <h2 style="color:${this.brandColor}">Agendamento Confirmado!</h2>
      <p>Olá <strong>${booking.patient_name}</strong>,</p>
      <p>Seu agendamento foi realizado com sucesso!</p>
      <div style="background:#f9f9f9;padding:15px;margin:20px 0;border-left:4px solid ${this.brandColor}">
        <p><strong>Serviço:</strong> ${booking.service_name}</p>
        <p><strong>Profissional:</strong> ${booking.professional_name}</p>
        <p><strong>Data:</strong> ${this.formatDate(booking.appointment_date)}</p>
        <p><strong>Horário:</strong> ${booking.appointment_time}</p>
      </div>
      <p>Aguarde a confirmação do profissional. Você receberá outro email quando confirmado.</p>
      <p style="text-align:center;margin-top:30px">
        <a href="${this.baseUrl}/area-do-paciente" style="display:inline-block;padding:12px 30px;background:${this.brandColor};color:white;text-decoration:none;border-radius:6px">Acessar Minha Área</a>
      </p>
    `;
    return this.baseTemplate(content, "Confirmação de Agendamento");
  }
  
  bookingCancellation(booking) {
    const content = `
      <h2>Agendamento Cancelado</h2>
      <p>Olá <strong>${booking.patient_name}</strong>,</p>
      <p>Seu agendamento foi cancelado.</p>
      <div style="background:#f9f9f9;padding:15px;margin:20px 0">
        <p><strong>Data:</strong> ${this.formatDate(booking.appointment_date)}</p>
        <p><strong>Horário:</strong> ${booking.appointment_time}</p>
      </div>
    `;
    return this.baseTemplate(content, "Cancelamento");
  }
  
  bookingReminder(booking) {
    const content = `
      <h2 style="color:${this.brandColor}">Lembrete de Consulta</h2>
      <p>Olá <strong>${booking.patient_name}</strong>,</p>
      <p>Sua consulta está agendada para amanhã!</p>
      <div style="background:#f9f9f9;padding:15px;margin:20px 0">
        <p><strong>Data:</strong> ${this.formatDate(booking.appointment_date)}</p>
        <p><strong>Horário:</strong> ${booking.appointment_time}</p>
      </div>
    `;
    return this.baseTemplate(content, "Lembrete de Consulta");
  }
  
  bookingStatusUpdate(booking) {
    const content = `
      <h2>Atualização de Status</h2>
      <p>Olá <strong>${booking.patient_name}</strong>,</p>
      <p>O status do seu agendamento foi atualizado.</p>
    `;
    return this.baseTemplate(content, "Atualização de Status");
  }
}

export default new EmailTemplates();
