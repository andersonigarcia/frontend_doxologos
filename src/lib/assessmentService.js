import { supabase } from '@/lib/customSupabaseClient';
import { secureLog } from '@/lib/secureLogger';
import analytics from '@/lib/analytics';

/**
 * Normaliza e sanitiza número de telefone para o padrão E.164 brasileiro (+5511999998888)
 */
export function sanitizePhone(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return null;

  // Se já tem DDI 55 com 12 ou 13 dígitos
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return `+${digits}`;
  }
  // Se tem 10 ou 11 dígitos (DDD + número)
  if (digits.length === 10 || digits.length === 11) {
    return `+55${digits}`;
  }
  return `+${digits}`;
}

/**
 * Sanitiza endereço de e-mail (lowercase e trim)
 */
export function sanitizeEmail(email) {
  if (!email) return null;
  const clean = String(email).trim().toLowerCase();
  return /\S+@\S+\.\S+/.test(clean) ? clean : null;
}

/**
 * Sanitiza nome do paciente (remove espaços extras)
 */
export function sanitizeName(name) {
  if (!name) return null;
  return String(name).trim().replace(/\s+/g, ' ');
}

import emailService from '@/lib/emailService';
import emailTemplates from '@/lib/emailTemplates';

/**
 * Normaliza o valor de gravidade para corresponder estritamente ao enum do PostgreSQL
 */
export function normalizeSeverityEnum(severity) {
  if (!severity) return 'unknown';
  const clean = String(severity).trim().toLowerCase();
  if (['minimal', 'minima', 'mínima'].includes(clean)) return 'minimal';
  if (['mild', 'leve'].includes(clean)) return 'mild';
  if (['moderate', 'moderada'].includes(clean)) return 'moderate';
  if (['severe', 'severa', 'grave'].includes(clean)) return 'severe';
  return 'unknown';
}

/**
 * Salva o lead no Supabase com validações, envio de email e fallback offline
 */
export async function saveAssessmentLead({
  assessmentId,
  assessmentTitle,
  score,
  maxScore = 21,
  severity = 'unknown',
  severityLabel = '',
  severitySummary = '',
  recommendations = [],
  spiritualBridge = '',
  dimensions = [],
  therapyQuestions = [],
  psychoeducation = '',
  name,
  email,
  phone,
  answers = {},
  functionalImpact = null,
}) {
  const sanitizedName = sanitizeName(name);
  const sanitizedEmail = sanitizeEmail(email);
  const sanitizedPhone = sanitizePhone(phone);
  const normalizedSeverity = normalizeSeverityEnum(severity);

  const payload = {
    assessment_id: String(assessmentId || 'gad-7').trim(),
    assessment_title: String(assessmentTitle || 'Autoavaliação Psicométrica').trim(),
    score: typeof score === 'number' ? Math.max(0, score) : 0,
    max_score: typeof maxScore === 'number' ? maxScore : 21,
    severity: normalizedSeverity,
    patient_name: sanitizedName,
    patient_email: sanitizedEmail,
    patient_phone: sanitizedPhone,
    answers: answers && typeof answers === 'object' ? answers : {},
    functional_impact: typeof functionalImpact === 'number' ? functionalImpact : null,
    status: 'novo',
    lgpd_consent: true,
    created_at: new Date().toISOString(),
  };

  try {
    // 1. Telemetria GA4
    if (analytics && typeof analytics.trackEvent === 'function') {
      analytics.trackEvent('assessment_lead_captured', {
        assessment_id: payload.assessment_id,
        severity: payload.severity,
        score: payload.score,
        has_phone: !!sanitizedPhone,
        has_email: !!sanitizedEmail,
      });
    }

    console.log('📝 Gravando lead no Supabase:', payload);

    // 2. Inserção no Supabase (sem .select() para preservar política RLS de inserção anônima)
    const { data, error } = await supabase
      .from('assessment_leads')
      .insert([payload]);

    if (error) {
      console.error('❌ Erro na inserção de lead Supabase:', error.message, error);
      saveLocalLeadBackup(payload);
    } else {
      console.log('✅ Lead registrado com sucesso no Supabase.');
      secureLog.info('Lead gravado no banco de dados com sucesso.');
    }

    // 3. Disparo Automático do E-mail com o Dossiê Completo (se e-mail informado)
    if (sanitizedEmail) {
      try {
        console.log('📧 Preparando envio do relatório completo por e-mail para:', sanitizedEmail);
        const emailHtml = emailTemplates.assessmentReport({
          patient_name: sanitizedName,
          assessment_title: payload.assessment_title,
          score: payload.score,
          max_score: payload.max_score,
          severity_label: severityLabel || normalizedSeverity,
          severity_summary: severitySummary,
          recommendations,
          spiritual_bridge: spiritualBridge,
          dimensions,
          therapy_questions: therapyQuestions,
          psychoeducation,
        });

        await emailService.sendEmail({
          to: sanitizedEmail,
          subject: 'Seu Relatorio de Autoavaliacao - Doxologos',
          html: emailHtml,
          type: 'assessment_report',
        });


        console.log('✅ E-mail de relatório enviado com sucesso para:', sanitizedEmail);
      } catch (emailErr) {
        console.error('⚠️ Falha no envio do e-mail do relatório (não bloqueante):', emailErr);
      }
    }


    return { success: true, data: data || [payload] };
  } catch (err) {
    console.error('❌ Exceção ao registrar lead:', err);
    saveLocalLeadBackup(payload);
    return { success: true, fallback: true, message: 'Dados salvos com segurança.' };
  }
}


/**
 * Busca leads com filtros para o painel administrativo
 */
export async function fetchAssessmentLeads({
  status = 'all',
  severity = 'all',
  searchTerm = '',
  limit = 100,
} = {}) {
  try {
    let query = supabase
      .from('assessment_leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (severity && severity !== 'all') {
      query = query.eq('severity', severity);
    }

    if (searchTerm && searchTerm.trim()) {
      const term = `%${searchTerm.trim()}%`;
      query = query.or(`patient_name.ilike.${term},patient_email.ilike.${term},patient_phone.ilike.${term}`);
    }

    const { data, error } = await query;

    if (error) {
      // Se a tabela ainda não existir, carregar do localStorage para visualização resiliente
      const local = getLocalLeads();
      return { success: true, data: local, isLocal: true };
    }

    return { success: true, data: data || [] };
  } catch (err) {
    console.error('Erro ao buscar leads:', err);
    return { success: true, data: getLocalLeads(), isLocal: true };
  }
}

/**
 * Atualiza o status e anotações de um lead no painel administrativo
 */
export async function updateAssessmentLeadStatus({
  leadId,
  status,
  adminNotes,
  userId = null,
}) {
  try {
    const updatePayload = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (adminNotes !== undefined) {
      updatePayload.admin_notes = adminNotes;
    }

    if (status === 'contatado') {
      updatePayload.contacted_at = new Date().toISOString();
      if (userId) updatePayload.contacted_by = userId;
    }

    const { data, error } = await supabase
      .from('assessment_leads')
      .update(updatePayload)
      .eq('id', leadId)
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error('Erro ao atualizar status do lead:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Gera link dinâmico de WhatsApp com mensagem de acolhimento personalizada baseada no score
 */
export function generateWhatsAppLeadLink({
  patientName = '',
  patientPhone = '',
  severity = 'unknown',
  assessmentTitle = 'Autoavaliação de Ansiedade',
  score = 0,
}) {
  if (!patientPhone) return null;
  const cleanPhone = String(patientPhone).replace(/\D/g, '');
  if (!cleanPhone) return null;

  const firstName = patientName ? patientName.split(' ')[0] : 'Olá';

  let customGreeting = '';
  switch (severity) {
    case 'severe':
      customGreeting = `Notamos que você realizou nossa ${assessmentTitle} e está vivenciando dias de bastante intensidade emocional e sobrecarga. Queremos te acolher e oferecer prioridade para uma conversa com nossa equipe de psicólogos da Doxologos.`;
      break;
    case 'moderate':
      customGreeting = `Vimos que você fez nossa ${assessmentTitle} e alguns sintomas de ansiedade têm gerado desgaste recente na sua rotina. Gostaria de conhecer nossos profissionais para organizar essas demandas com apoio especializado?`;
      break;
    default:
      customGreeting = `Vimos que você realizou nossa ${assessmentTitle}. Estamos à disposição para tirar qualquer dúvida sobre nossos atendimentos e cuidados com a saúde mental.`;
      break;
  }

  const message = `Olá, ${firstName}! Tudo bem? Aqui é da equipe Doxologos Psicologia. 🌿\n\n${customGreeting}\n\nComo você está se sentindo hoje?`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Exporta lista de leads para formato CSV compatível com Excel e Google Sheets
 */
export function exportLeadsToCsv(leads = []) {
  if (!leads || leads.length === 0) return;

  const headers = [
    'Data/Hora',
    'Nome',
    'E-mail',
    'WhatsApp',
    'Avaliação',
    'Pontuação',
    'Gravidade',
    'Status',
    'Anotações',
  ];

  const rows = leads.map((lead) => [
    lead.created_at ? new Date(lead.created_at).toLocaleString('pt-BR') : '',
    lead.patient_name || 'Anônimo',
    lead.patient_email || '',
    lead.patient_phone || '',
    lead.assessment_title || lead.assessment_id,
    `${lead.score}/${lead.max_score || 21}`,
    lead.severity || '',
    lead.status || 'novo',
    (lead.admin_notes || '').replace(/"/g, '""'),
  ]);

  const csvContent = [
    headers.join(';'),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(';')),
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `leads_autoavaliacao_doxologos_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Helpers de persistência local
function saveLocalLeadBackup(payload) {
  try {
    const existing = JSON.parse(localStorage.getItem('doxologos_assessment_leads') || '[]');
    existing.unshift({ id: `local_${Date.now()}`, ...payload });
    localStorage.setItem('doxologos_assessment_leads', JSON.stringify(existing.slice(0, 50)));
  } catch (e) {
    // ignore
  }
}

function getLocalLeads() {
  try {
    return JSON.parse(localStorage.getItem('doxologos_assessment_leads') || '[]');
  } catch (e) {
    return [];
  }
}
