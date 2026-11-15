/**
 * Helper de Validação de Esquema e Proteção contra Schema Drift
 * Utiliza src/constants/databaseCatalog.json gerado pelo script sync-schema-catalog.js
 */

import catalog from '../../constants/databaseCatalog.json';

export const databaseCatalog = catalog;

/**
 * Retorna as colunas válidas de uma tabela
 * @param {string} tableName
 * @returns {string[]}
 */
export function getTableColumns(tableName) {
  return catalog.tables?.[tableName]?.columns || [];
}

/**
 * Verifica se uma coluna existe na tabela informada
 * @param {string} tableName
 * @param {string} columnName
 * @returns {boolean}
 */
export function isColumnValid(tableName, columnName) {
  const columns = getTableColumns(tableName);
  return columns.includes(columnName);
}

/**
 * Valida um payload de mutação (insert ou update) contra o catálogo do banco de dados
 * @param {string} tableName
 * @param {Record<string, any>} payload
 * @returns {{ isValid: boolean, invalidFields: string[], sanitizedPayload: Record<string, any> }}
 */
export function validatePayloadAgainstSchema(tableName, payload) {
  if (!payload || typeof payload !== 'object') {
    return { isValid: true, invalidFields: [], sanitizedPayload: {} };
  }

  const validColumns = getTableColumns(tableName);
  const invalidFields = [];
  const sanitizedPayload = {};

  // Se a tabela não estiver catalogada, não bloqueia (fail-open seguro com aviso)
  if (validColumns.length === 0) {
    return { isValid: true, invalidFields: [], sanitizedPayload: { ...payload } };
  }

  for (const [key, value] of Object.entries(payload)) {
    if (validColumns.includes(key)) {
      sanitizedPayload[key] = value;
    } else {
      invalidFields.push(key);
    }
  }

  return {
    isValid: invalidFields.length === 0,
    invalidFields,
    sanitizedPayload
  };
}
