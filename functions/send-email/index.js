/**
 * API Backend para Envio de E-mails
 * Função serverless compatível com Netlify/Vercel
 * Utiliza SMTP da Hostinger via nodemailer
 */

import nodemailer from 'nodemailer';

/**
 * Handler principal da função serverless
 */
export async function handler(event, context) {
  // Permitir apenas POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse do body
    const { to, subject, html, text, from } = JSON.parse(event.body);

    // Validar dados obrigatórios
    if (!to || !subject || !html) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Dados obrigatórios ausentes',
          required: ['to', 'subject', 'html']
        })
      };
    }

    // Configurar transporter com credenciais da Hostinger
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.hostinger.com',
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: true, // SSL
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      // Configurações adicionais para Hostinger
      tls: {
        rejectUnauthorized: true,
        minVersion: 'TLSv1.2'
      }
    });

    // Preparar opções do e-mail
    const mailOptions = {
      from: {
        name: from?.name || process.env.SMTP_FROM_NAME || 'Doxologos',
        address: from?.email || process.env.SMTP_FROM_EMAIL
      },
      to,
      subject,
      html,
      text: text || stripHtml(html),
      // Headers adicionais para garantir renderização HTML
      headers: {
        'X-Mailer': 'Doxologos Email Service',
        'X-Priority': '3',
        'Content-Type': 'text/html; charset=UTF-8',
        'MIME-Version': '1.0'
      },
      // Configurações de encoding
      encoding: 'utf-8',
      textEncoding: 'base64'
    };

    // Enviar e-mail
    const info = await transporter.sendMail(mailOptions);

    console.log('✅ E-mail enviado:', {
      messageId: info.messageId,
      to,
      subject
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        messageId: info.messageId,
        message: 'E-mail enviado com sucesso'
      })
    };

  } catch (error) {
    console.error('❌ Erro ao enviar e-mail:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Erro ao enviar e-mail',
        message: error.message
      })
    };
  }
}

/**
 * Remove tags HTML de uma string
 */
function stripHtml(html) {
  return html
    .replace(/<style[^>]*>.*<\/style>/gm, '')
    .replace(/<script[^>]*>.*<\/script>/gm, '')
    .replace(/<[^>]+>/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Para ambiente Node.js tradicional (Express, etc)
export async function sendEmail(req, res) {
  const event = {
    httpMethod: req.method,
    body: JSON.stringify(req.body)
  };

  const result = await handler(event, {});
  const response = JSON.parse(result.body);

  return res.status(result.statusCode).json(response);
}
