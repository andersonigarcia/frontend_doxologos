import { supabase } from '@/lib/customSupabaseClient';

/**
 * Lista explícita de colunas existentes na tabela public.professionals do PostgreSQL.
 * Campos como 'email' e 'password' NÃO pertencem a esta tabela (pertencem a auth.users).
 */
export const ALLOWED_PROFESSIONAL_FIELDS = [
  'name',
  'specialty',
  'description',
  'mini_curriculum',
  'image_url',
  'personal_meet_link',
  'whatsapp',
  'phone',
  'cpf',
  'cnpj',
  'crp',
  'status',
  'services_ids'
];

/**
 * Sanitiza o payload do profissional para enviar somente colunas válidas à tabela professionals.
 * @param {Object} rawData
 * @returns {Object} Payload limpo e seguro
 */
export function sanitizeProfessionalPayload(rawData = {}) {
  const sanitized = {};

  for (const field of ALLOWED_PROFESSIONAL_FIELDS) {
    if (field in rawData) {
      let value = rawData[field];

      // Normalizações consistentes
      if (field === 'services_ids') {
        sanitized[field] = Array.isArray(value) ? value : [];
      } else if (field === 'whatsapp' || field === 'phone') {
        const trimmed = value !== undefined && value !== null ? String(value).trim() : '';
        sanitized[field] = trimmed !== '' ? trimmed : null;
      } else if (['cpf', 'cnpj', 'crp', 'image_url', 'specialty'].includes(field)) {
        const trimmed = value !== undefined && value !== null ? String(value).trim() : '';
        sanitized[field] = trimmed !== '' ? trimmed : null;
      } else if (['mini_curriculum', 'description', 'personal_meet_link'].includes(field)) {
        sanitized[field] = value !== undefined && value !== null ? String(value) : '';
      } else {
        sanitized[field] = value;
      }
    }
  }

  // Garantir sincronia entre whatsapp e phone se um dos dois for fornecido
  if (sanitized.whatsapp && !sanitized.phone) sanitized.phone = sanitized.whatsapp;
  if (sanitized.phone && !sanitized.whatsapp) sanitized.whatsapp = sanitized.phone;

  return sanitized;
}

/**
 * Busca mapa de emails de usuários Auth via RPC admin_list_users (Postgres direto)
 * com fallback para a Edge Function admin-list-users.
 * @returns {Promise<Map<string, string>>} Mapa de userId -> email
 */
export async function fetchAuthUsersEmailMap() {
  // 1. Tentar via RPC direta no Postgres (instantâneo, confiável e seguro)
  try {
    if (typeof supabase.rpc === 'function') {
      const { data: rpcUsers, error: rpcError } = await supabase.rpc('admin_list_users');
      if (!rpcError && Array.isArray(rpcUsers) && rpcUsers.length > 0) {
        return new Map(rpcUsers.map(u => [u.id, u.email]));
      }
    }
  } catch (rpcErr) {
    console.warn('professionalService: Falha na RPC admin_list_users:', rpcErr);
  }

  // 2. Fallback via Edge Function admin-list-users
  try {
    if (supabase.functions && typeof supabase.functions.invoke === 'function') {
      const { data: sessionData } = await supabase.auth?.getSession?.() || {};
      const token = sessionData?.session?.access_token;
      const options = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

      const { data, error } = await supabase.functions.invoke('admin-list-users', options);
      if (!error && data?.users) {
        return new Map(data.users.map(u => [u.id, u.email]));
      }
    }
  } catch (err) {
    console.warn('professionalService: Falha ao carregar emails de usuários auth:', err);
  }

  return new Map();
}

/**
 * Busca um profissional por ID e hidrata seu e-mail do Auth.
 * @param {string} id - ID do registro na tabela professionals
 * @returns {Promise<Object>} Profissional completo com email
 */
export async function getProfessionalById(id) {
  if (!id) {
    throw new Error('ID do profissional é obrigatório.');
  }

  const { data, error } = await supabase
    .from('professionals')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(`Erro ao buscar profissional: ${error.message}`);
  }

  const professional = { ...data, email: '' };

  // Se o profissional tiver um usuário de autenticação associado, enriquecer com o e-mail
  if (data?.user_id) {
    try {
      const emailMap = await fetchAuthUsersEmailMap();
      if (emailMap.has(data.user_id)) {
        professional.email = emailMap.get(data.user_id);
      }
    } catch (authErr) {
      console.warn('professionalService: Falha ao enriquecer e-mail do profissional:', authErr);
    }
  }

  return professional;
}

/**
 * Lista todos os profissionais enriquecidos com e-mail e filtros opcionais.
 * @param {Object} [options]
 * @param {string} [options.status] - 'active', 'suspended', 'cancelled' ou 'all'
 * @param {string} [options.searchTerm] - termo para busca por nome ou email
 * @returns {Promise<Array<Object>>} Lista de profissionais
 */
export async function listProfessionals({ status = 'all', searchTerm = '' } = {}) {
  const { data: rawProfessionals, error } = await supabase
    .from('professionals')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Erro ao listar profissionais: ${error.message}`);
  }

  const profs = rawProfessionals || [];
  const emailMap = await fetchAuthUsersEmailMap();

  let enriched = profs.map(p => {
    const lookupId = p.user_id || p.id;
    const email = emailMap.get(lookupId) || '';
    return { ...p, email };
  });

  if (status && status !== 'all') {
    enriched = enriched.filter(p => (p.status || 'active') === status);
  }

  if (searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    enriched = enriched.filter(p =>
      (p.name && p.name.toLowerCase().includes(term)) ||
      (p.email && p.email.toLowerCase().includes(term)) ||
      (p.crp && p.crp.toLowerCase().includes(term))
    );
  }

  return enriched;
}

/**
 * Atualiza os dados de um profissional de forma atômica e consistente.
 * Separa os dados de cadastro clínico (tabela professionals) das credenciais (auth.users).
 * 
 * @param {string} id - ID na tabela professionals
 * @param {Object} formData - Dados submetidos pelo formulário
 * @returns {Promise<Object>} Profissional atualizado
 */
export async function updateProfessional(id, formData = {}) {
  if (!id) {
    throw new Error('ID do profissional é obrigatório para atualização.');
  }

  // 1. Sanitizar dados cadastrais para a tabela professionals
  const professionalUpdates = sanitizeProfessionalPayload(formData);

  const { data: updatedRecord, error: profError } = await supabase
    .from('professionals')
    .update(professionalUpdates)
    .eq('id', id)
    .select()
    .single();

  if (profError) {
    throw new Error(`Falha ao salvar dados do profissional: ${profError.message}`);
  }

  const targetUserId = updatedRecord?.user_id || formData.user_id;
  const trimmedEmail = (formData.email || '').trim();

  // 2. Se houver usuário de autenticação associado, sincronizar email e metadata via Edge Function
  if (targetUserId) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (accessToken) {
        const authPayload = {
          userId: targetUserId,
          userData: {
            ...(trimmedEmail ? { email: trimmedEmail } : {}),
            user_metadata: {
              full_name: formData.name || updatedRecord.name,
              role: 'professional'
            }
          }
        };

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-update-user`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(authPayload)
          }
        );

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          console.warn('professionalService: Falha não-crítica ao sincronizar credenciais no Auth:', errData);
        }
      }
    } catch (authErr) {
      console.warn('professionalService: Erro ao contatar admin-update-user:', authErr);
    }
  }

  return {
    ...updatedRecord,
    email: trimmedEmail || formData.email || ''
  };
}

/**
 * Atualiza o status do profissional (ex: active, suspended, cancelled).
 * @param {string} id - ID na tabela professionals
 * @param {string} newStatus - 'active' | 'suspended' | 'cancelled'
 * @returns {Promise<Object>}
 */
export async function updateProfessionalStatus(id, newStatus) {
  if (!id) throw new Error('ID do profissional é obrigatório.');
  if (!['active', 'suspended', 'cancelled'].includes(newStatus)) {
    throw new Error(`Status inválido: ${newStatus}`);
  }

  const { error } = await supabase
    .from('professionals')
    .update({ status: newStatus })
    .eq('id', id);

  if (error) {
    throw new Error(`Falha ao alterar status do profissional: ${error.message}`);
  }

  return { id, status: newStatus };
}
