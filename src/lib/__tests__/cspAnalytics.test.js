/**
 * Guardrail de regressão: a Content Security Policy do index.html NÃO pode bloquear
 * a coleta de analytics. Em 12/10/2026 um "Security Hardening" restringiu o connect-src
 * e silenciou o funil do GA4 (eventos bloqueados pela CSP, sem nenhum erro visível ao usuário).
 *
 * Fonte dos domínios: documentação oficial "Content Security Policy" da Google Tag Platform.
 * Atenção: o curinga https://*.analytics.google.com NÃO cobre o domínio raiz analytics.google.com.
 */
import fs from 'fs';
import path from 'path';

const html = fs.readFileSync(path.resolve(__dirname, '../../../index.html'), 'utf8');
const cspMatch = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/);

const parseDirectives = (csp) =>
  Object.fromEntries(
    csp
      .split(';')
      .map((d) => d.trim())
      .filter(Boolean)
      .map((d) => {
        const [name, ...values] = d.split(/\s+/);
        return [name, values];
      })
  );

// Um host é permitido se aparece literalmente ou se há curinga que o cubra (*.dominio cobre SUBdomínios, não o raiz)
const allows = (sources, url) => {
  const { protocol, hostname } = new URL(url);
  return sources.some((s) => {
    if (s === `${protocol}//${hostname}`) return true;
    const m = s.match(/^https:\/\/\*\.(.+)$/);
    return !!m && hostname.endsWith(`.${m[1]}`);
  });
};

describe('CSP do index.html x analytics (GA4 / Google Ads / Meta Pixel)', () => {
  let directives;

  beforeAll(() => {
    expect(cspMatch).not.toBeNull();
    directives = parseDirectives(cspMatch[1]);
  });

  const requiredConnect = [
    'https://www.google-analytics.com/g/collect',
    'https://region1.google-analytics.com/g/collect',
    'https://analytics.google.com/g/collect',
    'https://www.google.com/g/collect',
    'https://www.google.com/ccm/collect',
    'https://stats.g.doubleclick.net/g/collect',
    'https://googleads.g.doubleclick.net/pagead/viewthroughconversion/1/',
    'https://www.googletagmanager.com/gtm.js',
    'https://www.facebook.com/tr/',
    'https://connect.facebook.net/en_US/fbevents.js',
  ];

  test.each(requiredConnect)('connect-src permite %s', (url) => {
    expect(allows(directives['connect-src'], url)).toBe(true);
  });

  const requiredScripts = [
    'https://www.googletagmanager.com/gtm.js',
    'https://www.googletagmanager.com/gtag/js',
    'https://googleads.g.doubleclick.net/pagead/viewthroughconversion/1/',
    'https://www.googleadservices.com/pagead/conversion_async.js',
    'https://connect.facebook.net/en_US/fbevents.js',
  ];

  test.each(requiredScripts)('script-src permite %s', (url) => {
    expect(allows(directives['script-src'], url)).toBe(true);
  });

  test('o curinga *.analytics.google.com sozinho não basta (guarda do bug de 14/10)', () => {
    expect(allows(['https://*.analytics.google.com'], 'https://analytics.google.com/g/collect')).toBe(false);
  });

  test('mantém as restrições de segurança essenciais', () => {
    expect(directives['object-src']).toEqual(["'none'"]);
    expect(directives['base-uri']).toEqual(["'self'"]);
    expect(directives['default-src']).toEqual(["'self'"]);
  });
});
