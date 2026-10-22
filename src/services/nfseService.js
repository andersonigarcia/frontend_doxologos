/**
 * Serviço Canônico de Emissão e Resiliência de NFS-e (Fase 4 - Domain Unification)
 * Single Source of Truth (SSOT) para o ciclo de vida de faturamento e notas fiscais municipais (BHISS Digital PBH).
 *
 * Princípios de Engenharia e Compliance:
 *  1. Modelo Fiscal Opção B: Tomador da Doxologos é o Profissional (Take-Rate / Taxa de Plataforma), não o paciente.
 *  2. Sigilo Clínico (CFP Art. 9º / LGPD Art. 11): Proibição absoluta de termos diagnósticos ou PII clínica na discriminação do XML.
 *  3. Resiliência e Desacoplamento Assíncrono: Erros ou timeouts na PBH jamais bloqueiam checkouts ou confirmações de agendamento.
 *  4. Normalização de Status: Converte 'failed' e 'queued' para a taxonomia canônica do PostgreSQL ('error', 'pending').
 */

import { supabase } from '@/lib/customSupabaseClient';
import { updateProfessional } from './professionalService';

/**
 * Colunas reais existentes na tabela public.nfse_emissions (validado via databaseCatalog.json)
 */
export const ALLOWED_NFSE_FIELDS = [
  'aliquota_iss',
  'booking_id',
  'codigo_servico_bh',
  'corrected_by',
  'correction_notes',
  'created_at',
  'discriminacao',
  'emission_mode',
  'error_category',
  'error_message',
  'id',
  'inscricao_id',
  'last_retry_at',
  'nfse_number',
  'package_id',
  'payment_id',
  'pdf_url',
  'prestador_cnpj',
  'raw_response',
  'retry_count',
  'status',
  'tomador_cpf_cnpj',
  'tomador_email',
  'tomador_endereco',
  'tomador_nome',
  'updated_at',
  'valor_servico',
  'verification_code',
  'xml_url'
];

/**
 * Status canônicos de NFS-e permitidos pela constraint do banco de dados
 */
export const VALID_NFSE_STATUSES = [
  'pending',
  'processing',
  'issued',
  'error',
  'cancelled',
  'manual_resolved'
];

/**
 * Categorias canônicas de erro da PBH
 */
export const VALID_ERROR_CATEGORIES = [
  'VALIDATION_ERROR',
  'PREFEITURA_OFFLINE',
  'AUTH_ERROR',
  'SYSTEM_ERROR',
  'MANUAL_RESOLVED'
];

/**
 * Palavras-chave clínicas e diagnósticas proibidas na discriminação da NFS-e
 * (CFP nº 001/2009 e LGPD Art. 11 - Dados Sensíveis de Saúde)
 */
const CLINICAL_PROHIBITED_TERMS = [
  'ansiedade',
  'crise',
  'pânico',
  'depressão',
  'transtorno',
  'bipolar',
  'surto',
  'suicíd',
  'trauma',
  'psicop',
  'diagnóstic',
  'cid',
  'dsm',
  'medicamento',
  'psiquiatr',
  'remédio',
  'consulta clínica',
  'sessão terapêutica',
  'prontuário',
  'anamnese',
  'abuso',
  'luto',
  'fobia',
  'paciente',
  'sintoma'
];

/**
 * Texto padrão higienizado para discriminação do serviço de intermediação
 */
export const DEFAULT_NFSE_DISCRIMINACAO =
  'Intermediação e disponibilização de plataforma tecnológica e agendamento online referente à licença de uso de software - Item 04.01 - PBH 04.01.01.';

/**
 * Normaliza qualquer variação de status (ex: legados 'failed', 'queued') para o padrão canônico
 * @param {string} rawStatus
 * @returns {string}
 */
export function normalizeNfseStatus(rawStatus) {
  if (!rawStatus || typeof rawStatus !== 'string') return 'pending';
  const clean = rawStatus.trim().toLowerCase();

  if (clean === 'failed') return 'error';
  if (clean === 'queued') return 'pending';
  if (VALID_NFSE_STATUSES.includes(clean)) return clean;
  return 'pending';
}

/**
 * Higieniza o texto da discriminação da NFS-e garantindo Zero-PII e Sigilo Clínico.
 * @param {string} text
 * @param {string} [fallback]
 * @returns {string}
 */
export function sanitizeNfseDiscriminacao(text, fallback = DEFAULT_NFSE_DISCRIMINACAO) {
  if (!text || typeof text !== 'string') return fallback;

  const trimmed = text.trim();
  if (!trimmed) return fallback;

  const lower = trimmed.toLowerCase();
  for (const term of CLINICAL_PROHIBITED_TERMS) {
    if (lower.includes(term)) {
      return fallback;
    }
  }

  return trimmed;
}

/**
 * Filtra e sanitiza o payload de NFS-e garantindo apenas colunas existentes no banco
 * @param {Record<string, any>} payload
 * @returns {Record<string, any>}
 */
export function sanitizeNfsePayload(payload) {
  if (!payload || typeof payload !== 'object') return {};

  const sanitized = {};
  for (const [key, value] of Object.entries(payload)) {
    if (ALLOWED_NFSE_FIELDS.includes(key)) {
      sanitized[key] = value;
    }
  }

  if (sanitized.status) {
    sanitized.status = normalizeNfseStatus(sanitized.status);
  }

  if (sanitized.discriminacao) {
    sanitized.discriminacao = sanitizeNfseDiscriminacao(sanitized.discriminacao);
  }

  return sanitized;
}

/**
 * Dicionário descritivo e visual para apresentação amigável de status nos dashboards
 */
export const NFSE_STATUS_MAP = {
  issued: {
    label: 'Emitida',
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    dotColor: 'bg-emerald-500',
    description: 'NFS-e emitida e homologada na PBH'
  },
  pending: {
    label: 'Pendente',
    color: 'text-amber-700 bg-amber-50 border-amber-200',
    dotColor: 'bg-amber-500',
    description: 'Aguardando processamento ou envio'
  },
  processing: {
    label: 'Processando',
    color: 'text-blue-700 bg-blue-50 border-blue-200',
    dotColor: 'bg-blue-500',
    description: 'Envelope SOAP enviado à prefeitura'
  },
  error: {
    label: 'Falha / Erro',
    color: 'text-rose-700 bg-rose-50 border-rose-200',
    dotColor: 'bg-rose-500',
    description: 'Rejeição pela PBH ou inconsistência cadastral'
  },
  cancelled: {
    label: 'Cancelada',
    color: 'text-slate-600 bg-slate-100 border-slate-200',
    dotColor: 'bg-slate-400',
    description: 'NFS-e cancelada junto à fazenda municipal'
  },
  manual_resolved: {
    label: 'Resolvido Manualmente',
    color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    dotColor: 'bg-indigo-500',
    description: 'Emitida diretamente no portal PBHISS Digital'
  }
};

/**
 * Busca lista paginada e filtrada de emissões de NFS-e
 * @param {Object} options
 * @param {string} [options.status]
 * @param {string} [options.errorCategory]
 * @param {string} [options.search]
 * @param {string} [options.bookingId]
 * @param {string} [options.packageId]
 * @param {string} [options.paymentId]
 * @param {string} [options.inscricaoId]
 * @param {number} [options.page=1]
 * @param {number} [options.pageSize=50]
 * @param {string} [options.orderBy='created_at']
 * @param {boolean} [options.ascending=false]
 * @returns {Promise<{ data: Array<any>, count: number, error: any }>}
 */
export async function listNfseEmissions(options = {}) {
  const {
    status = 'all',
    errorCategory = 'all',
    search = '',
    bookingId,
    packageId,
    paymentId,
    inscricaoId,
    page = 1,
    pageSize = 50,
    orderBy = 'created_at',
    ascending = false
  } = options;

  try {
    let query = supabase
      .from('nfse_emissions')
      .select('*', { count: 'exact' })
      .order(orderBy, { ascending });

    if (status && status !== 'all') {
      const normalized = normalizeNfseStatus(status);
      query = query.eq('status', normalized);
    }

    if (errorCategory && errorCategory !== 'all') {
      query = query.eq('error_category', errorCategory);
    }

    if (bookingId) query = query.eq('booking_id', bookingId);
    if (packageId) query = query.eq('package_id', packageId);
    if (paymentId) query = query.eq('payment_id', paymentId);
    if (inscricaoId) query = query.eq('inscricao_id', inscricaoId);

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query = query.or(
        `tomador_nome.ilike.${term},tomador_cpf_cnpj.ilike.${term},nfse_number.ilike.${term},error_message.ilike.${term}`
      );
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;
    return { data: data || [], count: count || 0, error };
  } catch (err) {
    console.error('[nfseService.listNfseEmissions] Erro inesperado:', err);
    return { data: [], count: 0, error: err };
  }
}

/**
 * Busca uma emissão de NFS-e por ID
 * @param {string} id
 * @returns {Promise<{ data: any, error: any }>}
 */
export async function getNfseById(id) {
  if (!id) return { data: null, error: new Error('ID obrigatório') };
  try {
    const { data, error } = await supabase
      .from('nfse_emissions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    return { data, error };
  } catch (err) {
    console.error('[nfseService.getNfseById] Erro inesperado:', err);
    return { data: null, error: err };
  }
}

/**
 * Busca emissões de NFS-e correspondentes a uma lista de booking IDs (Retorna Mapa Indexado)
 * @param {Array<string>} bookingIds
 * @returns {Promise<{ map: Record<string, any>, error: any }>}
 */
export async function getNfseMapByBookingIds(bookingIds) {
  if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
    return { map: {}, error: null };
  }

  try {
    const { data, error } = await supabase
      .from('nfse_emissions')
      .select('id, booking_id, status, nfse_number, error_message, error_category, retry_count, last_retry_at, xml_url, pdf_url')
      .in('booking_id', bookingIds);

    if (error) throw error;

    const map = {};
    (data || []).forEach(record => {
      if (record.booking_id) {
        map[record.booking_id] = {
          ...record,
          status: normalizeNfseStatus(record.status)
        };
      }
    });

    return { map, error: null };
  } catch (err) {
    console.error('[nfseService.getNfseMapByBookingIds] Erro ao buscar mapa de NFS-e:', err);
    return { map: {}, error: err };
  }
}

/**
 * Emite NFS-e individual via Edge Function 'emit-nfse' (Modo Avulso ou Idempotente)
 * @param {Object} params
 * @param {string} [params.booking_id]
 * @param {string} [params.package_id]
 * @param {string} [params.payment_id]
 * @param {string} [params.inscricao_id]
 * @returns {Promise<{ success: boolean, nfse?: any, idempotent?: boolean, error?: string }>}
 */
export async function emitSingleNfse(params = {}) {
  const body = {};
  if (params.booking_id?.trim()) body.booking_id = params.booking_id.trim();
  if (params.package_id?.trim()) body.package_id = params.package_id.trim();
  if (params.payment_id?.trim()) body.payment_id = params.payment_id.trim();
  if (params.inscricao_id?.trim()) body.inscricao_id = params.inscricao_id.trim();
  if (params.override_data) body.override_data = params.override_data;
  if (params.action) body.action = params.action;

  if (!body.booking_id && !body.package_id && !body.payment_id && !body.inscricao_id) {
    return { success: false, error: 'Informe ao menos um identificador de origem (booking, pacote, pagamento ou inscrição).' };
  }

  try {
    const { data, error } = await supabase.functions.invoke('emit-nfse', { body });

    if (error) {
      return { success: false, error: error.message || 'Falha ao invocar emissão de NFS-e' };
    }

    if (data?.error) {
      return { success: false, error: data.error };
    }

    return {
      success: true,
      nfse: data?.nfse,
      idempotent: Boolean(data?.idempotent),
      message: data?.idempotent
        ? `NFS-e já emitida anteriormente (#${data?.nfse?.nfse_number || ''})`
        : `NFS-e #${data?.nfse?.nfse_number || ''} emitida com sucesso!`
    };
  } catch (err) {
    console.error('[nfseService.emitSingleNfse] Exceção na emissão avulsa:', err);
    return { success: false, error: err.message || 'Exceção de rede ao emitir NFS-e' };
  }
}

/**
 * Enfileira emissão de NFS-e em lote para processamento seguro via background_tasks_queue
 * @param {Array<string>} bookingIds
 * @param {string} [authToken]
 * @returns {Promise<{ success: boolean, data?: any, error?: string }>}
 */
export async function batchEmitNfse(bookingIds, authToken) {
  if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
    return { success: false, error: 'Nenhum agendamento selecionado para emissão.' };
  }

  try {
    let token = authToken;
    if (!token) {
      const { data: sessionData } = await supabase.auth.getSession();
      token = sessionData?.session?.access_token;
    }

    if (!token) {
      return { success: false, error: 'Sessão do usuário não autenticada.' };
    }

    const { data, error } = await supabase.functions.invoke('batch-emit-nfse', {
      body: { booking_ids: bookingIds },
      headers: { Authorization: `Bearer ${token}` }
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    return { success: true, data };
  } catch (err) {
    console.error('[nfseService.batchEmitNfse] Erro ao enfileirar lote de NFS-e:', err);
    return { success: false, error: err.message || 'Erro ao processar lote de NFS-e' };
  }
}

/**
 * Dispara retentativa simples para uma NFS-e com falha
 * @param {string} nfseId
 * @returns {Promise<{ success: boolean, data?: any, error?: string }>}
 */
export async function retryNfseEmission(nfseId) {
  if (!nfseId) return { success: false, error: 'ID da emissão de NFS-e obrigatório.' };

  try {
    const { data, error } = await supabase.functions.invoke('emit-nfse', {
      body: {
        nfse_id: nfseId,
        action: 'retry'
      }
    });

    if (error || data?.error) {
      return {
        success: false,
        error: error?.message || data?.error || 'Re-tentativa rejeitada pelo servidor'
      };
    }

    return { success: true, data };
  } catch (err) {
    console.error('[nfseService.retryNfseEmission] Exceção na retentativa:', err);
    return { success: false, error: err.message || 'Exceção ao retentar emissão de NFS-e' };
  }
}

/**
 * Reenvia NFS-e com payload corrigido (Sobrescrita de dados de tomador ou discriminação)
 * @param {string} nfseId
 * @param {Object} overrideData
 * @param {string} [correctionNotes]
 * @param {string} [userId]
 * @returns {Promise<{ success: boolean, nfse?: any, error?: string }>}
 */
export async function updateAndRetryNfseEmission(nfseId, overrideData = {}, correctionNotes = '', userId = null) {
  if (!nfseId) return { success: false, error: 'ID da emissão de NFS-e obrigatório.' };

  try {
    let correctedBy = userId;
    if (!correctedBy) {
      const { data: userAuth } = await supabase.auth.getUser();
      correctedBy = userAuth?.user?.id;
    }

    // Blindagem de PII clínica na discriminação corrigida
    const sanitizedOverrides = {
      ...overrideData,
      discriminacao: sanitizeNfseDiscriminacao(overrideData.discriminacao)
    };

    const { data, error } = await supabase.functions.invoke('emit-nfse', {
      body: {
        nfse_id: nfseId,
        action: 'update_and_retry',
        override_data: sanitizedOverrides,
        correction_notes: correctionNotes || null,
        corrected_by: correctedBy || null
      }
    });

    if (error || data?.error) {
      return {
        success: false,
        error: error?.message || data?.error || 'Falha ao reprocessar NFS-e corrigida'
      };
    }

    return { success: true, nfse: data?.nfse };
  } catch (err) {
    console.error('[nfseService.updateAndRetryNfseEmission] Exceção:', err);
    return { success: false, error: err.message || 'Exceção ao atualizar e retentar NFS-e' };
  }
}

/**
 * Marca um registro como resolvido manualmente informando o número oficial emitido no portal da PBH
 * @param {string} nfseId
 * @param {string} manualNfseNumber
 * @param {string} [correctionNotes]
 * @param {string} [userId]
 * @returns {Promise<{ success: boolean, data?: any, error?: string }>}
 */
export async function markNfseManualResolved(nfseId, manualNfseNumber, correctionNotes = '', userId = null) {
  if (!nfseId) return { success: false, error: 'ID da emissão obrigatório.' };
  if (!manualNfseNumber || !manualNfseNumber.trim()) {
    return { success: false, error: 'Por favor, informe o número oficial da NFS-e emitida na PBH.' };
  }

  try {
    let correctedBy = userId;
    if (!correctedBy) {
      const { data: userAuth } = await supabase.auth.getUser();
      correctedBy = userAuth?.user?.id;
    }

    const { data, error } = await supabase.functions.invoke('emit-nfse', {
      body: {
        nfse_id: nfseId,
        action: 'mark_manual_resolved',
        manual_nfse_number: manualNfseNumber.trim(),
        correction_notes: correctionNotes || 'Emitida manualmente no portal da PBH BHISS Digital.',
        corrected_by: correctedBy || null
      }
    });

    if (error || data?.error) {
      return {
        success: false,
        error: error?.message || data?.error || 'Falha ao marcar como resolvida manualmente'
      };
    }

    return { success: true, data };
  } catch (err) {
    console.error('[nfseService.markNfseManualResolved] Exceção:', err);
    return { success: false, error: err.message || 'Exceção ao marcar NFS-e como resolvida' };
  }
}

/**
 * Calcula métricas agregadas e estatísticas do histórico de NFS-e para observabilidade
 * @param {Array<any>} records
 * @returns {Object}
 */
export function calculateNfseSummary(records = []) {
  const summary = {
    total: records.length,
    issued: 0,
    pending: 0,
    processing: 0,
    error: 0,
    cancelled: 0,
    manual_resolved: 0,
    offlineCount: 0,
    validationCount: 0,
    totalValorServico: 0
  };

  records.forEach(r => {
    const status = normalizeNfseStatus(r.status);
    if (summary[status] !== undefined) {
      summary[status]++;
    }

    if (r.error_category === 'PREFEITURA_OFFLINE') {
      summary.offlineCount++;
    } else if (r.error_category === 'VALIDATION_ERROR') {
      summary.validationCount++;
    }

    if (status === 'issued') {
      summary.totalValorServico += parseFloat(r.valor_servico) || 0;
    }
  });

  return summary;
}

/**
 * Lista consultas e pacotes confirmados que ainda não possuem NFS-e emitida (Pendentes de Faturamento)
 * @param {Object} [options]
 * @param {string} [options.search]
 * @param {number} [options.limit=200]
 * @returns {Promise<{ data: Array<any>, totalCount: number, error: any }>}
 */
export async function listPendingNfseTransactions(options = {}) {
  const { search = '', limit = 200 } = options;

  try {
    // 1. Buscar agendamentos confirmados ou completados
    let query = supabase
      .from('bookings')
      .select(`
        id, booking_date, booking_time, patient_name, patient_email, status,
        valor_consulta, valor_repasse_profissional, package_id,
        professional:professionals(id, name, cpf, cnpj),
        services(id, name, price)
      `)
      .in('status', ['confirmed', 'completed'])
      .order('booking_date', { ascending: false })
      .limit(limit);

    const { data: bookings, error: bErr } = await query;
    if (bErr) throw bErr;

    // 2. Buscar NFS-e existentes para esses bookings
    const bookingIds = (bookings || []).map(b => b.id);
    const emittedBookingIds = new Set();
    const errorMap = {};

    if (bookingIds.length > 0) {
      const { data: emissions, error: emErr } = await supabase
        .from('nfse_emissions')
        .select('id, booking_id, status, error_message, error_category, nfse_number, retry_count')
        .in('booking_id', bookingIds);

      if (!emErr && emissions) {
        emissions.forEach(e => {
          if (e.status === 'issued' || e.status === 'manual_resolved') {
            emittedBookingIds.add(e.booking_id);
          } else if (e.status === 'error' || e.status === 'failed') {
            errorMap[e.booking_id] = e;
          }
        });
      }
    }

    // 3. Filtrar e formatar as pendentes
    let pending = (bookings || [])
      .filter(b => !emittedBookingIds.has(b.id))
      .map(b => {
        const valorConsulta = Number(b.valor_consulta) || Number(b.services?.price) || 0;
        const repasse = Number(b.valor_repasse_profissional) || (valorConsulta * 0.60);
        const takeRate = valorConsulta > 0 ? (valorConsulta - repasse) : 30;

        const doc = b.professional?.cnpj || b.professional?.cpf || '';
        const cleanDoc = doc.replace(/\D/g, '');
        const hasValidDoc = cleanDoc.length === 11 || cleanDoc.length === 14;

        return {
          id: b.id,
          booking_id: b.id,
          tipo: b.package_id ? 'package_session' : 'booking',
          tipoLabel: b.package_id ? 'Sessão de Pacote' : 'Consulta',
          data: b.booking_date,
          hora: b.booking_time,
          pacienteNome: b.patient_name || 'Paciente',
          pacienteEmail: b.patient_email || '',
          servicoNome: b.services?.name || 'Psicoterapia',
          tomadorId: b.professional?.id || null,
          tomadorNome: b.professional?.name || 'Profissional Não Cadastrado',
          tomadorDocument: doc || 'Não informado',
          hasValidDoc,
          valorConsulta,
          valorServico: takeRate > 0 ? takeRate : 30,
          existingEmission: errorMap[b.id] || null,
          statusFiscal: errorMap[b.id] ? 'error' : 'unemitted'
        };
      });

    // 4. Filtrar por termo de busca se fornecido
    if (search && search.trim()) {
      const s = search.toLowerCase().trim();
      pending = pending.filter(p =>
        p.pacienteNome.toLowerCase().includes(s) ||
        p.tomadorNome.toLowerCase().includes(s) ||
        p.tomadorDocument.toLowerCase().includes(s) ||
        p.data.includes(s)
      );
    }

    return { data: pending, totalCount: pending.length, error: null };
  } catch (err) {
    console.error('[nfseService.listPendingNfseTransactions] Erro:', err);
    return { data: [], totalCount: 0, error: err };
  }
}

/**
 * Atualiza os dados cadastrais/fiscais do tomador (profissional) no PostgreSQL
 * garantindo a correção definitiva de CPF/CNPJ e dados associados na tabela professionals.
 * @param {Object} params
 * @param {string} params.professionalId
 * @param {string} [params.cpf]
 * @param {string} [params.cnpj]
 * @param {string} [params.name]
 * @param {string} [params.email]
 * @returns {Promise<{ success: boolean, data?: any, error?: string }>}
 */
export async function updateTomadorFiscalData(params = {}) {
  const { professionalId, cpf, cnpj, name, email } = params;

  if (!professionalId) {
    return { success: false, error: 'Identificador do profissional (tomador) não informado.' };
  }

  const rawDoc = cpf || cnpj || '';
  const cleanDoc = String(rawDoc).replace(/\D/g, '');

  if (!cleanDoc) {
    return { success: false, error: 'Por favor, informe o CPF (11 dígitos) ou CNPJ (14 dígitos).' };
  }

  if (cleanDoc.length !== 11 && cleanDoc.length !== 14) {
    return {
      success: false,
      error: `Documento incompleto (${cleanDoc.length} dígitos). Digite 11 dígitos para CPF ou 14 para CNPJ.`
    };
  }

  try {
    const formData = {};
    if (cleanDoc.length === 11) {
      formData.cpf = cleanDoc;
      formData.cnpj = null;
    } else {
      formData.cnpj = cleanDoc;
      formData.cpf = null;
    }

    if (name && typeof name === 'string' && name.trim()) {
      formData.name = name.trim();
    }

    if (email && typeof email === 'string' && email.trim()) {
      formData.email = email.trim();
    }

    const updated = await updateProfessional(professionalId, formData);
    return { success: true, data: updated };
  } catch (err) {
    console.error('[nfseService.updateTomadorFiscalData] Erro:', err);
    return { success: false, error: err.message || 'Falha ao atualizar dados fiscais do profissional' };
  }
}
