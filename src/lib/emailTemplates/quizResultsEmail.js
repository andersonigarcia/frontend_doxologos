/**
 * Email template for Therapy Quiz Results
 * Sends personalized therapy approach recommendations based on quiz answers
 */

import { EmailTemplates } from '../emailTemplates.js';

export const generateQuizResultsEmail = (name, quizResult) => {
  const emailTemplates = new EmailTemplates();
  const { approach, score, description, recommendedProfessional, strengths } = quizResult;

  const content = `
    <div style="background: linear-gradient(135deg, #2d8659 0%, #1f5d3d 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Seus Resultados Chegaram! 🎯</h1>
      <p style="color: #e8f5e9; margin: 10px 0 0 0; font-size: 16px;">Descubra a abordagem terapêutica ideal para você</p>
    </div>
    
    <div style="padding: 30px;">
      <p style="font-size: 16px; margin: 0 0 20px 0;">Olá, <strong>${emailTemplates.sanitizeForHtml(name)}</strong>! 👋</p>
      <p style="font-size: 16px; margin: 0 0 20px 0;">
        Obrigado por fazer nosso quiz! Com base nas suas respostas, identificamos a abordagem terapêutica que mais combina com você.
      </p>

      <div style="background: linear-gradient(135deg, #f0f9f4 0%, #e8f5e9 100%); border-left: 5px solid #2d8659; padding: 25px; margin: 30px 0; border-radius: 8px; box-shadow: 0 2px 8px rgba(45, 134, 89, 0.1);">
        <h2 style="color: #2d8659; margin: 0 0 15px 0; font-size: 24px;">
          ${emailTemplates.sanitizeForHtml(approach)}
        </h2>
        <div style="background-color: #2d8659; height: 8px; width: ${score}%; border-radius: 4px; margin-bottom: 15px;"></div>
        <p style="color: #1f5d3d; font-size: 14px; margin: 0 0 5px 0;">
          <strong>Compatibilidade: ${score}%</strong>
        </p>
        <p style="color: #555; font-size: 15px; margin: 15px 0 0 0; line-height: 1.7;">
          ${emailTemplates.sanitizeForHtml(description)}
        </p>
      </div>

      <div style="margin: 30px 0;">
        <h3 style="color: #2d8659; font-size: 20px; margin: 0 0 15px 0;">Por que essa abordagem é ideal para você:</h3>
        <ul style="list-style: none; padding: 0; margin: 0;">
          ${strengths.map(strength => `
            <li style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; font-size: 15px;">
              <span style="color: #2d8659; font-size: 18px; margin-right: 10px;">✓</span>
              ${emailTemplates.sanitizeForHtml(strength)}
            </li>
          `).join('')}
        </ul>
      </div>

      ${recommendedProfessional ? `
        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 30px 0;">
          <h3 style="color: #2d8659; font-size: 18px; margin: 0 0 15px 0;">
            💚 Profissional Recomendado
          </h3>
          <div style="display: flex; align-items: center; gap: 15px;">
            <img src="${recommendedProfessional.imageUrl}" alt="${emailTemplates.sanitizeForHtml(recommendedProfessional.name)}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid #2d8659;" />
            <div>
              <p style="margin: 0 0 5px 0; font-size: 16px; font-weight: bold; color: #333;">
                ${emailTemplates.sanitizeForHtml(recommendedProfessional.name)}
              </p>
              <p style="margin: 0; font-size: 14px; color: #666;">
                ${emailTemplates.sanitizeForHtml(recommendedProfessional.specialty)}
              </p>
            </div>
          </div>
          <p style="margin: 15px 0 0 0; font-size: 14px; color: #555; line-height: 1.6;">
            ${emailTemplates.sanitizeForHtml(recommendedProfessional.bio)}
          </p>
        </div>
      ` : ''}

      <div style="text-align: center; margin: 40px 0 30px 0;">
        <a href="https://doxologos.com.br/agendamento" class="btn">
          Agendar Primeira Consulta
        </a>
        <p style="margin: 15px 0 0 0; font-size: 13px; color: #888;">
          💡 Primeira consulta com desconto especial para quem fez o quiz
        </p>
      </div>

      <div style="background-color: #fff9e6; border-left: 4px solid #ffc107; padding: 20px; margin: 30px 0; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; color: #856404;">
          <strong>💡 Dica:</strong> Lembre-se que este quiz é apenas uma orientação inicial. 
          Durante a primeira consulta, o psicólogo poderá ajustar a abordagem de acordo com suas necessidades específicas.
        </p>
      </div>

      <p style="font-size: 15px; margin: 30px 0 0 0; color: #555;">
        Estamos aqui para caminhar com você nessa jornada de autoconhecimento e cura. 
        Qualquer dúvida, estamos à disposição!
      </p>
      <p style="font-size: 15px; margin: 10px 0 0 0; color: #555;">
        Com carinho,<br>
        <strong style="color: #2d8659;">Equipe Doxologos</strong>
      </p>
    </div>

    <div style="background-color: #2d8659; padding: 25px 30px; text-align: center; border-radius: 0 0 8px 8px;">
      <p style="margin: 0 0 10px 0; color: white; font-size: 16px; font-weight: bold;">Doxologos</p>
      <p style="margin: 0 0 15px 0; color: #e8f5e9; font-size: 14px;">Clínica de Atendimento Psicológico Online</p>
      <p style="margin: 0; color: #e8f5e9; font-size: 13px;">
        📞 (31) 97198-2947 | 📧 contato@doxologos.com.br
      </p>
    </div>

    <div style="text-align: center; padding: 20px; color: #888; font-size: 11px;">
      <p style="margin: 5px 0;">© ${new Date().getFullYear()} Doxologos - Todos os direitos reservados</p>
      <p style="margin: 5px 0;">🔒 Seus dados estão seguros conosco</p>
    </div>
  `;

  return emailTemplates.baseTemplate(content, "Resultados do Quiz - Doxologos");
};

export default generateQuizResultsEmail;
