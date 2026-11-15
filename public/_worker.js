/**
 * Cloudflare Pages Advanced Mode Worker (_worker.js)
 *
 * Por que usar _worker.js em vez da pasta /functions na raiz?
 * O repositório já possui uma pasta /functions legada (Netlify/Node/Deno).
 * No modo avançado (dist/_worker.js), a Cloudflare ignora automaticamente
 * a pasta /functions da raiz durante o deploy, evitando erros de build.
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(Boolean);

    // Busca o asset estático (ou index.html via _redirects)
    let response = await env.ASSETS.fetch(request);

    // Fallback defensivo para SPA caso ASSETS retorne 404 em rotas sem extensão
    if (response.status === 404 && !url.pathname.includes('.')) {
      response = await env.ASSETS.fetch(
        new Request(new URL('/index.html', url), request)
      );
    }

    // Injeta Open Graph dinâmico apenas em requisições HTML de /artigos/:slug
    const isArticleRoute = pathParts.length === 2 && pathParts[0] === 'artigos';
    const isHtml = response.headers.get('content-type')?.includes('text/html');

    if (!isArticleRoute || !isHtml) {
      return response;
    }

    const slug = pathParts[1];
    const supabaseUrl = env.VITE_SUPABASE_URL;
    const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey || !slug) {
      return response;
    }

    try {
      const fetchUrl = `${supabaseUrl}/rest/v1/artigos?slug=eq.${encodeURIComponent(slug)}&select=title,description,cover_image_url&limit=1`;
      const sbResponse = await fetch(fetchUrl, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      });

      if (!sbResponse.ok) {
        return response;
      }

      const data = await sbResponse.json();
      if (!data || data.length === 0) {
        return response;
      }

      const article = data[0];
      const title = `${article.title} - Doxologos`;
      const description =
        article.description || 'Psicologia de espiritualidade cristã online.';

      const setContent = (value) => ({
        element(el) {
          if (value) el.setAttribute('content', value);
        },
      });

      return new HTMLRewriter()
        .on('title', {
          element(el) {
            el.setInnerContent(title);
          },
        })
        .on('meta[name="title"]', setContent(title))
        .on('meta[name="description"]', setContent(description))
        .on('meta[property="og:title"]', setContent(title))
        .on('meta[property="og:description"]', setContent(description))
        .on('meta[name="twitter:title"]', setContent(title))
        .on('meta[name="twitter:description"]', setContent(description))
        .on('meta[property="og:image"]', setContent(article.cover_image_url))
        .on('meta[name="twitter:image"]', setContent(article.cover_image_url))
        .transform(response);
    } catch (err) {
      console.error('Error fetching article for OG injection:', err);
      return response;
    }
  },
};

