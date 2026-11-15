import gad7Data from './gad7.json';
import burnoutData from './burnout.json';
import phq9Data from './phq9.json';
import asrs18Data from './asrs18.json';
import espiritualidadeData from './espiritualidade.json';
import sonoData from './sono.json';
import casamentoData from './casamento.json';
import dependenciaData from './dependencia.json';
import jogosData from './jogos.json';
import abusoEspiritualData from './abuso-espiritual.json';

// Registry central de instrumentos psicométricos disponíveis na Doxologos
export const ASSESSMENTS_REGISTRY = [
  gad7Data,
  burnoutData,
  phq9Data,
  asrs18Data,
  espiritualidadeData,
  sonoData,
  casamentoData,
  dependenciaData,
  jogosData,
  abusoEspiritualData,
];










/**
 * Busca uma avaliação pelo ID, slug ou alias
 * @param {string} identifier - Slug, ID ou alias (ex: 'gad-7', 'teste-ansiedade-gad7', 'teste-ansiedade')
 * @returns {object|null} - Objeto de configuração da avaliação
 */
export function getAssessmentByIdentifier(identifier) {
  if (!identifier) return null;
  const cleanId = String(identifier).trim().toLowerCase();

  return (
    ASSESSMENTS_REGISTRY.find(
      (item) =>
        item.id.toLowerCase() === cleanId ||
        item.slug.toLowerCase() === cleanId ||
        (Array.isArray(item.aliases) && item.aliases.some((alias) => alias.toLowerCase() === cleanId))
    ) || null
  );
}

/**
 * Retorna todas as ferramentas ativas para exibição no Hub
 */
export function getAllAssessments() {
  return ASSESSMENTS_REGISTRY;
}
