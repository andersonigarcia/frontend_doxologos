/**
 * Validador e Sanitizador Canônico de Leads (Doxologos)
 * Garante captura limpa, proteção contra leads fictícios/lixo de banco de dados
 * e preservação da reputação de envio de e-mails da clínica.
 */

// Lista oficial de DDDs válidos no Brasil (Anatel)
export const VALID_BR_DDDS = new Set([
  '11', '12', '13', '14', '15', '16', '17', '18', '19', // SP
  '21', '22', '24', // RJ
  '27', '28', // ES
  '31', '32', '33', '34', '35', '37', '38', // MG
  '41', '42', '43', '44', '45', '46', // PR
  '47', '48', '49', // SC
  '51', '53', '54', '55', // RS
  '61', // DF
  '62', '64', // GO
  '63', // TO
  '65', '66', // MT
  '67', // MS
  '68', // AC
  '69', // RO
  '71', '73', '74', '75', '77', // BA
  '79', // SE
  '81', '87', // PE
  '82', // AL
  '83', // PB
  '84', // RN
  '85', '88', // CE
  '86', '89', // PI
  '91', '93', '94', // PA
  '92', '97', // AM
  '95', // RR
  '96', // AP
  '98', '99', // MA
]);

// Domínios fictícios, de teste ou descartáveis conhecidos
export const DISPOSABLE_OR_TEST_DOMAINS = new Set([
  'example.com',
  'example.org',
  'example.net',
  'teste.com',
  'teste.com.br',
  'test.com',
  'test.com.br',
  'testing.com',
  'fake.com',
  'falso.com',
  'naotem.com',
  'sememail.com',
  'none.com',
  'invalid.com',
  'mailinator.com',
  'tempmail.com',
  'guerrillamail.com',
  '10minutemail.com',
  'yopmail.com',
  'trashmail.com',
  'dispostable.com',
  'throwawaymail.com',
  'sharklasers.com',
  'getairmail.com',
  'asdasd.com',
  'abc.com',
  'xyz.com',
]);

// Prefixos ou palavras que indicam nome fictício
const FICTITIOUS_NAMES_EXACT = new Set([
  'teste',
  'test',
  'testando',
  'asdasd',
  'asdf',
  'qwerty',
  'fulano',
  'ciclano',
  'beltrano',
  'anonimo',
  'anônimo',
  'ninguem',
  'ninguém',
  'xxx',
  'aaa',
  'abc',
  'sem nome',
  'nao sei',
  'não sei',
  'qualquer',
  'nenhum',
  'nada',
]);

/**
 * Valida o nome do lead
 * @param {string} name
 * @returns {{ isValid: boolean, error?: string, sanitizedName?: string }}
 */
export function validateLeadName(name) {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: 'Por favor, informe seu nome.' };
  }

  const clean = name.trim().replace(/\s+/g, ' ');

  // Se o usuário colou o e-mail no campo nome (ex: "usuario@gmail.com")
  if (clean.includes('@') && clean.includes('.')) {
    return {
      isValid: false,
      error: 'Parece que você digitou um e-mail no campo nome. Por favor, digite seu nome ou como prefere ser chamado(a).'
    };
  }

  // Mínimo de 2 caracteres
  if (clean.length < 2) {
    return { isValid: false, error: 'Por favor, digite um nome com pelo menos 2 letras.' };
  }

  // Deve conter ao menos uma letra
  if (!/[a-zA-ZÀ-ÿ]/.test(clean)) {
    return { isValid: false, error: 'O nome deve conter letras válidas.' };
  }

  const lower = clean.toLowerCase();

  // Nome fictício exato
  if (FICTITIOUS_NAMES_EXACT.has(lower)) {
    return { isValid: false, error: 'Por favor, informe seu nome real para personalizar seu relatório.' };
  }

  // Detecta padrões como "Maria Teste", "Teste 123", "João Teste"
  const words = lower.split(' ');
  if (words.includes('teste') || words.includes('test')) {
    return { isValid: false, error: 'Por favor, informe seu nome real para personalizar seu relatório.' };
  }

  // Detecta repetição excessiva de mesmo caractere (ex: "aaaaaa", "zzzzzz")
  if (/^(.)\1{3,}$/i.test(clean.replace(/\s/g, ''))) {
    return { isValid: false, error: 'Por favor, informe um nome válido.' };
  }

  return { isValid: true, sanitizedName: clean };
}

/**
 * Valida o e-mail do lead
 * @param {string} email
 * @returns {{ isValid: boolean, error?: string, sanitizedEmail?: string }}
 */
export function validateLeadEmail(email) {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Por favor, informe um endereço de e-mail.' };
  }

  const clean = email.trim().toLowerCase();

  // Regex padrão RFC 5322 simplificado e prático
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(clean)) {
    return { isValid: false, error: 'Por favor, informe um e-mail em formato válido (ex: seu.nome@gmail.com).' };
  }

  const [username, domain] = clean.split('@');
  if (!domain || !username) {
    return { isValid: false, error: 'Endereço de e-mail incompleto.' };
  }

  // Bloqueio de domínios descartáveis ou de teste notórios
  if (DISPOSABLE_OR_TEST_DOMAINS.has(domain)) {
    return {
      isValid: false,
      error: 'Por favor, informe um e-mail válido para que você possa receber a cópia do relatório.'
    };
  }

  // Bloqueio de usernames puramente fictícios de teste (ex: "teste@", "test@", "asdasd@")
  const fictitiousUsernames = ['teste', 'test', 'teste1', 'teste123', 'asdasd', 'fake', 'falso', 'naotem', 'sememail'];
  if (fictitiousUsernames.includes(username)) {
    return {
      isValid: false,
      error: 'Por favor, informe seu e-mail pessoal verdadeiro para envio do relatório.'
    };
  }

  // Rejeita domínios sem extensão mínima válida ou TLD com apenas números
  const domainParts = domain.split('.');
  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2 || /^\d+$/.test(tld)) {
    return { isValid: false, error: 'Domínio de e-mail inválido.' };
  }

  return { isValid: true, sanitizedEmail: clean };
}

/**
 * Valida número de telefone brasileiro (celular ou fixo)
 * @param {string} phone
 * @returns {{ isValid: boolean, error?: string, sanitizedPhone?: string }}
 */
export function validateLeadPhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, error: 'Por favor, informe seu número de WhatsApp com DDD.' };
  }

  let digits = phone.replace(/\D/g, '');

  // Se veio com DDI +55 ou 55
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  }

  // Deve ter 10 dígitos (fixo) ou 11 dígitos (celular)
  if (digits.length !== 10 && digits.length !== 11) {
    return {
      isValid: false,
      error: 'O telefone deve conter DDD + número (ex: (11) 98765-4321).'
    };
  }

  const ddd = digits.slice(0, 2);
  if (!VALID_BR_DDDS.has(ddd)) {
    return {
      isValid: false,
      error: `O DDD (${ddd}) não é válido no Brasil. Verifique os dois primeiros dígitos.`
    };
  }

  const localNumber = digits.slice(2);

  // Para celular (11 dígitos), o nono dígito DEVE ser 9
  if (digits.length === 11 && localNumber[0] !== '9') {
    return {
      isValid: false,
      error: 'Celulares com DDD no Brasil devem começar com o dígito 9 após o DDD.'
    };
  }

  // Para telefone fixo (10 dígitos), deve começar com 2, 3, 4 ou 5
  if (digits.length === 10 && !['2', '3', '4', '5'].includes(localNumber[0])) {
    return {
      isValid: false,
      error: 'Número de telefone fixo inválido.'
    };
  }

  // 1. Rejeita números com todos os dígitos locais iguais (ex: 99999-9999, 88888-8888, 00000-0000)
  if (/^(\d)\1+$/.test(localNumber)) {
    return {
      isValid: false,
      error: 'Por favor, informe um número de telefone real.'
    };
  }

  // 2. Rejeita sequências com mais de 5 dígitos idênticos consecutivos (ex: 988888888 ou 911111111)
  if (/(\d)\1{5,}/.test(localNumber)) {
    return {
      isValid: false,
      error: 'Número de telefone inválido (sequência repetitiva detectada).'
    };
  }

  // 3. Rejeita números com repetição em blocos fictícios óbvios (ex: 988887777 ou 911112222)
  // Onde há 4 repetições consecutivas seguidas de outras 4 repetições consecutivas
  if (/(\d)\1{3}(\d)\2{3}/.test(localNumber)) {
    return {
      isValid: false,
      error: 'Por favor, informe um número de WhatsApp válido.'
    };
  }

  // 4. Rejeita números sequenciais óbvios (ex: 12345678, 123456789, 987654321)
  const sequentialPatterns = ['123456789', '987654321', '12345678', '87654321'];
  if (sequentialPatterns.includes(localNumber)) {
    return {
      isValid: false,
      error: 'Por favor, informe um telefone real (sequências não são aceitas).'
    };
  }

  // Formato E.164 padronizado para gravação (+5511987654321)
  const sanitizedPhone = `+55${digits}`;

  return { isValid: true, sanitizedPhone };
}

/**
 * Validação abrangente para formulário de Lead
 * @param {Object} params
 * @param {string} params.name
 * @param {string} params.email
 * @param {string} params.phone
 * @param {boolean} [params.requireName=false] - Se o nome é obrigatório (padrão false, mas se preenchido é validado)
 * @param {boolean} [params.requireBothContacts=false] - Se exige tanto e-mail quanto WhatsApp
 * @returns {{ isValid: boolean, errors: Record<string, string>, sanitized: { name?: string, email?: string, phone?: string } }}
 */
export function validateLeadData({
  name = '',
  email = '',
  phone = '',
  requireName = false,
  requireBothContacts = false,
} = {}) {
  const errors = {};
  const sanitized = {};

  const hasName = typeof name === 'string' && name.trim().length > 0;
  const hasEmail = typeof email === 'string' && email.trim().length > 0;
  const hasPhone = typeof phone === 'string' && phone.trim().length > 0;

  // Validação de Nome
  if (requireName && !hasName) {
    errors.name = 'Por favor, informe seu nome.';
  } else if (hasName) {
    const nameResult = validateLeadName(name);
    if (!nameResult.isValid) {
      errors.name = nameResult.error;
    } else {
      sanitized.name = nameResult.sanitizedName;
    }
  }

  // Validação de Contatos
  if (!hasEmail && !hasPhone) {
    errors.general = 'Por favor, informe pelo menos seu E-mail ou WhatsApp para receber o relatório.';
    return { isValid: false, errors, sanitized };
  }

  if (requireBothContacts) {
    if (!hasEmail) errors.email = 'E-mail obrigatório.';
    if (!hasPhone) errors.phone = 'WhatsApp obrigatório.';
  }

  // Valida E-mail se informado
  if (hasEmail) {
    const emailResult = validateLeadEmail(email);
    if (!emailResult.isValid) {
      errors.email = emailResult.error;
    } else {
      sanitized.email = emailResult.sanitizedEmail;
    }
  }

  // Valida WhatsApp se informado
  if (hasPhone) {
    const phoneResult = validateLeadPhone(phone);
    if (!phoneResult.isValid) {
      errors.phone = phoneResult.error;
    } else {
      sanitized.phone = phoneResult.sanitizedPhone;
    }
  }

  const isValid = Object.keys(errors).length === 0;
  return { isValid, errors, sanitized };
}
