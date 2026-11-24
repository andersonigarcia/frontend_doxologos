/**
 * Monitoramento Sintético (Health Check de Produção)
 * Verifica disponibilidade do SPA (Cloudflare), rotas críticas, Supabase Auth e Edge Functions de pagamento.
 *
 * Uso:
 *   node scripts/synthetic-check.mjs
 *   SITE_URL=https://doxologos.com.br SUPABASE_URL=https://xxx.supabase.co node scripts/synthetic-check.mjs
 */

const SITE_URL = (process.env.SITE_URL || 'https://doxologos.com.br').replace(/\/$/, '');
const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const ALERT_WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL || '';
const TIMEOUT_MS = Number(process.env.SYNTHETIC_TIMEOUT_MS || 10000);

const failures = [];

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function checkFrontendRoute(path) {
  const url = `${SITE_URL}${path}`;
  const start = Date.now();
  try {
    const res = await fetchWithTimeout(url, { redirect: 'follow' });
    const ms = Date.now() - start;
    const html = await res.text();
    const hasRoot = html.includes('id="root"') || html.includes("id='root'");

    if (!res.ok || !hasRoot) {
      failures.push(`Frontend ${path}: HTTP ${res.status} (hasRoot=${hasRoot}, ${ms}ms)`);
      console.error(`❌ [FAIL] GET ${url} -> ${res.status} (${ms}ms)`);
    } else {
      console.log(`✅ [OK] GET ${url} -> ${res.status} (${ms}ms)`);
    }
  } catch (err) {
    failures.push(`Frontend ${path}: ${err.message}`);
    console.error(`❌ [ERR] GET ${url} -> ${err.message}`);
  }
}

async function checkSupabaseAuthHealth() {
  if (!SUPABASE_URL) {
    console.log('⏭️  [SKIP] SUPABASE_URL não definida, pulando check do Supabase Auth.');
    return;
  }

  const url = `${SUPABASE_URL}/auth/v1/health`;
  const start = Date.now();
  try {
    const headers = SUPABASE_ANON_KEY ? { apikey: SUPABASE_ANON_KEY } : {};
    const res = await fetchWithTimeout(url, { headers });
    const ms = Date.now() - start;
    if (!res.ok) {
      failures.push(`Supabase Auth health: HTTP ${res.status} (${ms}ms)`);
      console.error(`❌ [FAIL] GET ${url} -> ${res.status} (${ms}ms)`);
    } else {
      console.log(`✅ [OK] Supabase Auth health -> ${res.status} (${ms}ms)`);
    }
  } catch (err) {
    failures.push(`Supabase Auth health: ${err.message}`);
    console.error(`❌ [ERR] Supabase Auth health -> ${err.message}`);
  }
}

async function checkEdgeFunctionAlive(fnName) {
  if (!SUPABASE_URL) return;

  const url = `${SUPABASE_URL}/functions/v1/${fnName}`;
  const start = Date.now();
  try {
    const res = await fetchWithTimeout(url, { method: 'OPTIONS' });
    const ms = Date.now() - start;
    if (res.status >= 500 || res.status === 404) {
      failures.push(`Edge Function ${fnName}: HTTP ${res.status} (${ms}ms)`);
      console.error(`❌ [FAIL] OPTIONS ${fnName} -> ${res.status} (${ms}ms)`);
    } else {
      console.log(`✅ [OK] Edge Function ${fnName} -> ${res.status} (${ms}ms)`);
    }
  } catch (err) {
    failures.push(`Edge Function ${fnName}: ${err.message}`);
    console.error(`❌ [ERR] OPTIONS ${fnName} -> ${err.message}`);
  }
}

async function notifyFailure() {
  if (!ALERT_WEBHOOK_URL || failures.length === 0) return;

  const text = `🚨 [SYNTHETIC MONITORING] Falha detectada em ${SITE_URL}:\n- ${failures.join('\n- ')}`;
  try {
    await fetchWithTimeout(ALERT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        content: text,
        source: 'synthetic',
        failures,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (err) {
    console.error('⚠️ Falha ao enviar alerta webhook:', err.message);
  }
}

async function main() {
  console.log(`🔎 Iniciando monitoramento sintético em ${SITE_URL}...\n`);

  await Promise.all([
    checkFrontendRoute('/'),
    checkFrontendRoute('/recuperar-senha'),
    checkFrontendRoute('/redefinir-senha'),
    checkFrontendRoute('/agendamento'),
    checkSupabaseAuthHealth(),
    checkEdgeFunctionAlive('mp-create-payment'),
    checkEdgeFunctionAlive('mp-process-card-payment'),
    checkEdgeFunctionAlive('log-client-error'),
  ]);

  console.log('\n📊 Resumo:', failures.length === 0 ? 'Todos os checks passaram!' : `${failures.length} falha(s) encontrada(s).`);

  if (failures.length > 0) {
    await notifyFailure();
    process.exit(1);
  }
}

main();

