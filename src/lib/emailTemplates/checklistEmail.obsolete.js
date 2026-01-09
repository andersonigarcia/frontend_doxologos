/**
 * Email template for Mental Health Checklist
 * Sends comprehensive checklist of 15 signs that indicate need for psychological help
 */

import { EmailTemplates } from '../emailTemplates.js';

export const generateChecklistEmail = (name) => {
  const emailTemplates = new EmailTemplates();

  const content = `
    <h2 style="color: #1f2937; font-size: 22px; margin: 0 0 10px 0;">Olá, ${emailTemplates.sanitizeForHtml(name)}!</h2>
    <p style="font-size: 16px; color: #4b5563; margin: 0 0 25px 0;">
      Seu checklist de saúde mental chegou! Vamos começar com uma mensagem simples para validar a renderização.
    </p>
    
    <div class="info-box">
      <p><strong>✅ Checklist:</strong> 15 Sinais de que Você Precisa de Ajuda Psicológica</p>
      <p><strong>📋 Status:</strong> Pronto para visualização</p>
      <p><strong>💚 Objetivo:</strong> Ajudar você a reconhecer quando buscar apoio profissional</p>
    </div>

    <div style="background: #fef3c7; padding: 20px; margin: 25px 0; border-radius: 6px; border-left: 4px solid #f59e0b;">
      <h3 style="margin: 0 0 12px 0; color: #92400e; font-size: 16px;">⚠️ Importante</h3>
      <p style="margin: 0 0 15px 0; color: #78350f; font-size: 15px;">
        Se você se identificou com 3 ou mais sinais, considere seriamente buscar ajuda profissional. 
        Não há vergonha em cuidar da sua saúde mental!
      </p>
    </div>

    <div class="tips-box">
      <h3>🌿 Próximos Passos:</h3>
      <ul>
        <li><strong>Não se julgue:</strong> Buscar ajuda é sinal de coragem e autocuidado</li>
        <li><strong>Converse com alguém:</strong> Compartilhe seus sentimentos com uma pessoa de confiança</li>
        <li><strong>Agende uma consulta:</strong> Um psicólogo pode ajudar você a entender e superar esses desafios</li>
        <li><strong>Cuide-se:</strong> Pequenos hábitos saudáveis fazem diferença</li>
      </ul>
    </div>

    <div style="background: #dbeafe; padding: 20px; margin: 20px 0; border-radius: 6px; border-left: 4px solid #3b82f6; text-align: center;">
      <p style="margin: 0 0 15px 0; color: #1e40af; font-size: 15px;">
        <strong>💙 Estamos Aqui Para Você</strong>
      </p>
      <p style="margin: 0; color: #1e3a8a; font-size: 14px;">
        Atendimento 100% online, no conforto da sua casa. 
        Agende sua consulta e dê o primeiro passo para o bem-estar.
      </p>
    </div>

    <p style="text-align: center; margin-top: 30px;">
      <a href="${emailTemplates.baseUrl}/agendamento" class="btn">Agendar Consulta Agora</a>
    </p>

    <p style="margin-top: 25px; font-size: 14px; color: #6b7280; line-height: 1.6;">
      Lembre-se: você não está sozinho nessa jornada. Estamos aqui para caminhar com você.<br>
      <strong>Abraços,<br>Equipe Doxologos</strong>
    </p>
  `;

  return emailTemplates.baseTemplate(content, "Checklist de Saúde Mental - Doxologos");
};

export default generateChecklistEmail;
