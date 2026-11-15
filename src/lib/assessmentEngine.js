/**
 * Motor de Cálculo e Lógica Psicométrica para Ferramentas de Autoavaliação
 */

/**
 * Calcula a pontuação total e identifica a faixa de corte do teste
 * @param {object} assessmentConfig - Schema JSON do teste
 * @param {object} answers - Objeto com as respostas { [questionId]: number }
 * @returns {object} - Resultado estruturado com score, maxScore, percentage, range e severity
 */
export function calculateAssessmentResult(assessmentConfig, answers = {}) {
  if (!assessmentConfig || !assessmentConfig.questions) {
    return {
      score: 0,
      maxScore: 0,
      percentage: 0,
      range: null,
      severity: 'unknown',
      answeredCount: 0,
      totalQuestions: 0,
      isComplete: false,
    };
  }

  const questions = assessmentConfig.questions;
  const totalQuestions = questions.length;
  
  // Opção de maior valor para calcular a nota máxima teórica
  const maxOptionValue = Math.max(...(assessmentConfig.options || [{ value: 3 }]).map((o) => o.value));
  const maxScore = typeof assessmentConfig.maxScore === 'number' ? assessmentConfig.maxScore : totalQuestions * maxOptionValue;


  let score = 0;
  let answeredCount = 0;
  const dimensionBuckets = {};

  questions.forEach((q) => {
    const val = answers[q.id];
    const dimName = q.dimension || q.category || 'Aspectos Clínicos';

    if (!dimensionBuckets[dimName]) {
      dimensionBuckets[dimName] = {
        name: dimName,
        score: 0,
        questionCount: 0,
        maxScore: 0,
      };
    }


    dimensionBuckets[dimName].questionCount += 1;
    dimensionBuckets[dimName].maxScore += maxOptionValue;

    if (typeof val === 'number' && !isNaN(val)) {
      score += val;
      answeredCount += 1;
      dimensionBuckets[dimName].score += val;
    }
  });

  // Converte dimensões para array estruturado com percentuais e níveis de atenção
  const dimensions = Object.values(dimensionBuckets).map((dim) => {
    const pct = dim.maxScore > 0 ? Math.min(100, Math.round((dim.score / dim.maxScore) * 100)) : 0;
    let level = 'baixo';
    let levelLabel = 'Equilibrado';
    let levelColor = '#10b981'; // verde

    if (pct >= 67) {
      level = 'elevado';
      levelLabel = 'Ponto Crítico / Elevado';
      levelColor = '#ef4444'; // vermelho
    } else if (pct >= 34) {
      level = 'moderado';
      levelLabel = 'Atenção / Moderado';
      levelColor = '#f59e0b'; // amarelo/laranja
    }

    return {
      name: dim.name,
      score: dim.score,
      maxScore: dim.maxScore,
      percentage: pct,
      level,
      levelLabel,
      levelColor,
      questionCount: dim.questionCount,
    };
  });

  // Ordena dimensões da maior pontuação percentual para a menor (destacando os pontos de maior dor)
  dimensions.sort((a, b) => b.percentage - a.percentage);

  const percentage = maxScore > 0 ? Math.min(100, Math.round((score / maxScore) * 100)) : 0;
  const isComplete = answeredCount === totalQuestions;

  // Localiza a faixa de gravidade correspondente no schema (com proteção de clamping de limite superior)
  const clampedScore = maxScore > 0 ? Math.min(score, maxScore) : score;
  const matchingRange = (assessmentConfig.ranges || []).find((r) => clampedScore >= r.min && clampedScore <= r.max) || {
    severity: 'unknown',
    label: 'Não classificado',
    badgeColor: 'gray',
    summary: 'Não foi possível classificar o resultado.',
    description: '',
    recommendations: [],
  };

  // Extrai ou gera perguntas reflexivas para levar ao psicólogo
  const therapyQuestions = matchingRange.therapyQuestions || generateTherapyQuestions(matchingRange, dimensions);

  // Psicoeducação e validação clínica do sofrimento
  const psychoeducation = matchingRange.psychoeducation || matchingRange.clinicalInsight || matchingRange.summary;

  return {
    score,
    maxScore,
    percentage,
    range: matchingRange,
    severity: matchingRange.severity,
    answeredCount,
    totalQuestions,
    isComplete,
    dimensions,
    therapyQuestions,
    psychoeducation,
  };
}

/**
 * Gera perguntas reflexivas inteligentes para o paciente levar à sua consulta com o psicólogo
 */
function generateTherapyQuestions(range, dimensions = []) {
  const topDim = dimensions[0]?.name || 'minha saúde emocional';
  const secondDim = dimensions[1]?.name || 'minha rotina diária';

  return [
    `Como os sintomas relacionados a "${topDim}" têm impactado meu bem-estar nas últimas semanas?`,
    `Quais gatilhos no meu ambiente ou nos meus relacionamentos costumam intensificar o sentimento em relação a "${secondDim}"?`,
    `Quais estratégias terapêuticas com evidência científica podem me ajudar a reconstruir meu equilíbrio e minha autonomia?`
  ];
}


/**
 * Retorna classes CSS de cores harmoniosas baseadas no badgeColor do schema
 * @param {string} colorName 
 */
export function getSeverityTheme(colorName = 'emerald') {
  switch (colorName) {
    case 'emerald':
    case 'green':
      return {
        bgLight: 'bg-emerald-50',
        textDark: 'text-emerald-800',
        badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        border: 'border-emerald-300',
        gradient: 'from-emerald-500 to-teal-600',
        stroke: '#10b981',
        fill: '#ecfdf5',
      };
    case 'blue':
      return {
        bgLight: 'bg-sky-50',
        textDark: 'text-sky-800',
        badgeBg: 'bg-sky-100 text-sky-800 border-sky-200',
        border: 'border-sky-300',
        gradient: 'from-sky-500 to-blue-600',
        stroke: '#0284c7',
        fill: '#f0f9ff',
      };
    case 'amber':
    case 'yellow':
    case 'orange':
      return {
        bgLight: 'bg-amber-50',
        textDark: 'text-amber-900',
        badgeBg: 'bg-amber-100 text-amber-900 border-amber-200',
        border: 'border-amber-300',
        gradient: 'from-amber-500 to-orange-600',
        stroke: '#f59e0b',
        fill: '#fffbeb',
      };
    case 'rose':
    case 'red':
      return {
        bgLight: 'bg-rose-50',
        textDark: 'text-rose-900',
        badgeBg: 'bg-rose-100 text-rose-900 border-rose-200',
        border: 'border-rose-300',
        gradient: 'from-rose-500 to-red-600',
        stroke: '#e11d48',
        fill: '#fff1f2',
      };
    default:
      return {
        bgLight: 'bg-gray-50',
        textDark: 'text-gray-800',
        badgeBg: 'bg-gray-100 text-gray-800 border-gray-200',
        border: 'border-gray-300',
        gradient: 'from-gray-500 to-slate-600',
        stroke: '#6b7280',
        fill: '#f9fafb',
      };
  }
}

/**
 * Mapeia o instrumento psicométrico para o serviço clínico ideal na plataforma Doxologos
 * @param {string} assessmentId - ID ou slug do teste (ex: 'casamento-rdas', 'gad-7', 'dependencia')
 * @returns {object} - Metadados do serviço recomendado
 */
export function getRecommendedServiceForAssessment(assessmentId) {
  const cleanId = String(assessmentId || '').toLowerCase().trim();

  // Testes de Relacionamento e Casal
  if (cleanId.includes('casamento') || cleanId.includes('relacionamento') || cleanId.includes('rdas') || cleanId.includes('casal')) {
    return {
      serviceId: '7d2d9a24-71fe-4afc-b677-7c87df4b6e22',
      serviceName: 'Psicoterapia em casal',
      searchKey: 'casal',
    };
  }

  // Testes de Dependência Química e Vício em Apostas / Jogos
  if (cleanId.includes('dependencia') || cleanId.includes('jogos') || cleanId.includes('vicio') || cleanId.includes('aposta')) {
    return {
      serviceId: '557af651-cc7f-4049-987e-0c587e3efa0a',
      serviceName: 'Dependência Química',
      searchKey: 'dependência química',
    };
  }

  // Padrão ouro geral: Psicoterapia Individual (Ansiedade, Depressão, Burnout, TDAH, Sono, Espiritualidade)
  return {
    serviceId: '53fdb342-f782-404c-bc9f-c3def8105fd6',
    serviceName: 'Psicoterapia Individual',
    searchKey: 'psicoterapia individual',
  };
}

/**
 * Constrói o deep-link com parâmetros de consulta para agendamento direto com contexto
 * @param {object} assessment - Objeto da autoavaliação
 * @param {string} severity - Nível de gravidade apurado
 * @param {object} leadData - Dados do paciente já preenchidos (nome, email, telefone)
 * @returns {string} - URL com query params
 */
export function getAssessmentBookingLink(assessment, severity, leadData = {}) {
  const assessmentId = assessment?.id || assessment?.slug || '';
  const recommended = getRecommendedServiceForAssessment(assessmentId);

  const params = new URLSearchParams();
  if (recommended.serviceId) {
    params.set('service', recommended.serviceId);
  }
  if (assessmentId) {
    params.set('assessment', assessmentId);
  }
  if (severity) {
    params.set('severity', severity);
  }
  if (leadData.name && String(leadData.name).trim()) {
    params.set('name', String(leadData.name).trim());
  }
  if (leadData.email && String(leadData.email).trim()) {
    params.set('email', String(leadData.email).trim());
  }
  if (leadData.phone && String(leadData.phone).trim()) {
    params.set('phone', String(leadData.phone).trim());
  }

  return `/agendamento?${params.toString()}`;
}

