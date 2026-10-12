/**
 * Script de Introspecção e Sincronização Automática de Esquema Supabase (Fase 3)
 * Conecta ao endpoint PostgREST OpenAPI e gera src/constants/databaseCatalog.json
 * Elimina o Schema Drift mantendo a lista real de tabelas e colunas sob controle de versão.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Leitura segura do .env sem dependências externas
function loadEnv() {
  const envPath = path.join(rootDir, '.env');
  const env = { ...process.env };
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let value = match[2] || '';
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        env[match[1]] = value.trim();
      }
    });
  }
  return env;
}

const env = loadEnv();
const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('❌ [ERRO] SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY/VITE_SUPABASE_ANON_KEY não configurados.');
  process.exit(1);
}

const outputPath = path.join(rootDir, 'src', 'constants', 'databaseCatalog.json');

async function syncSchema() {
  console.log('🔄 Conectando ao PostgREST OpenAPI do Supabase...');
  console.log(`📡 URL: ${url}`);

  try {
    const response = await fetch(`${url}/rest/v1/`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: 'application/openapi+json'
      }
    });

    if (!response.ok) {
      throw new Error(`Falha HTTP ${response.status}: ${await response.text()}`);
    }

    const openApi = await response.json();
    const definitions = openApi.definitions || openApi.components?.schemas || {};
    const tableNames = Object.keys(definitions).sort();

    if (tableNames.length === 0) {
      throw new Error('Nenhuma definição de tabela retornada pelo OpenAPI.');
    }

    const catalog = {
      _metadata: {
        generated_at: new Date().toISOString(),
        supabase_url: url,
        tables_count: tableNames.length,
        description: 'Catálogo canônico de tabelas e colunas extraído via OpenAPI do PostgREST. Fonte única de verdade contra Schema Drift.'
      },
      tables: {}
    };

    for (const tableName of tableNames) {
      const def = definitions[tableName];
      const props = def.properties || {};
      const columns = Object.keys(props).sort();

      catalog.tables[tableName] = {
        columns,
        columns_count: columns.length,
        required: def.required || [],
        description: def.description || ''
      };
    }

    // Cria diretório de destino se não existir
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(catalog, null, 2), 'utf8');

    console.log(`\n✅ Catálogo de esquema gerado com sucesso em: src/constants/databaseCatalog.json`);
    console.log(`📊 Total de tabelas/views catalogadas: ${tableNames.length}`);
    console.log(`   - professionals: ${catalog.tables.professionals?.columns_count || 0} colunas`);
    console.log(`   - bookings: ${catalog.tables.bookings?.columns_count || 0} colunas`);
    console.log(`   - payments: ${catalog.tables.payments?.columns_count || 0} colunas`);
    console.log(`   - patient_notes: ${catalog.tables.patient_notes?.columns_count || 0} colunas`);

    return catalog;
  } catch (error) {
    console.error(`❌ Erro ao sincronizar catálogo de esquema: ${error.message}`);
    if (fs.existsSync(outputPath)) {
      console.warn('⚠️ Mantendo versão anterior existente de src/constants/databaseCatalog.json como fallback.');
      process.exit(0);
    } else {
      process.exit(1);
    }
  }
}

syncSchema();
