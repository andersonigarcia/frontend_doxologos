import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Resolvendo o diretório atual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar variáveis de ambiente (tentar .env.production primeiro, depois .env)
dotenv.config({ path: path.resolve(__dirname, '../.env.production') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const appUrl = process.env.VITE_APP_URL || 'https://doxologos.com.br';

console.log('🌐 Gerando sitemap dinâmico para:', appUrl);

async function generateSitemap() {
  const staticRoutes = [
    { loc: '/', changefreq: 'weekly', priority: '1.0' },
    { loc: '/agendamento', changefreq: 'monthly', priority: '0.9' },
    { loc: '/quem-somos', changefreq: 'monthly', priority: '0.8' },
    { loc: '/depoimento', changefreq: 'weekly', priority: '0.7' },
    { loc: '/trabalhe-conosco', changefreq: 'monthly', priority: '0.6' },
    { loc: '/doacao', changefreq: 'monthly', priority: '0.6' },
    { loc: '/termos-e-condicoes', changefreq: 'yearly', priority: '0.3' }
  ];

  let dynamicRoutes = [];

  if (supabaseUrl && supabaseKey) {
    try {
      console.log('🔌 Conectando ao Supabase em:', supabaseUrl);
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const nowIso = new Date().toISOString();
      const { data: events, error: eventsError } = await supabase
        .from('eventos')
        .select('link_slug, updated_at')
        .eq('status', 'aberto')
        .eq('ativo', true)
        .gt('data_limite_inscricao', nowIso);

      if (eventsError) {
        console.error('❌ Erro ao buscar eventos do Supabase:', eventsError.message);
      } else if (events && events.length > 0) {
        console.log(`✅ ${events.length} evento(s) encontrado(s).`);
        dynamicRoutes.push(...events.map(event => ({
          loc: `/evento/${event.link_slug}`,
          lastmod: event.updated_at ? event.updated_at.split('T')[0] : new Date().toISOString().split('T')[0],
          changefreq: 'weekly',
          priority: '0.8'
        })));
      } else {
        console.log('ℹ️ Nenhum evento ativo encontrado no banco para o sitemap.');
      }

      // Fetch Artigos do Blog
      const { data: artigos, error: artigosError } = await supabase
        .from('artigos')
        .select('slug, updated_at')
        .eq('status', 'published');

      if (artigosError) {
        console.error('❌ Erro ao buscar artigos do Supabase:', artigosError.message);
      } else if (artigos && artigos.length > 0) {
        console.log(`✅ ${artigos.length} artigo(s) encontrado(s).`);
        dynamicRoutes.push(...artigos.map(artigo => ({
          loc: `/artigos/${artigo.slug}`,
          lastmod: artigo.updated_at ? artigo.updated_at.split('T')[0] : new Date().toISOString().split('T')[0],
          changefreq: 'monthly',
          priority: '0.7'
        })));
      } else {
        console.log('ℹ️ Nenhum artigo publicado encontrado no banco para o sitemap.');
      }

    } catch (err) {
      console.error('❌ Erro durante a execução da consulta ao Supabase:', err.message);
    }
  } else {
    console.warn('⚠️ Credenciais do Supabase não encontradas no ambiente. Sitemap gerado apenas com rotas estáticas.');
  }

  const currentDate = new Date().toISOString().split('T')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
`;

  // Rotas estáticas
  staticRoutes.forEach(route => {
    xml += `  <url>
    <loc>${appUrl}${route.loc}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>
`;
  });

  // Rotas dinâmicas de eventos
  dynamicRoutes.forEach(route => {
    xml += `  <url>
    <loc>${appUrl}${route.loc}</loc>
    <lastmod>${route.lastmod}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>
`;
  });

  xml += '</urlset>\n';

  // Gravar na pasta dist/
  const distDir = path.resolve(__dirname, '../dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  const sitemapDistPath = path.join(distDir, 'sitemap.xml');
  fs.writeFileSync(sitemapDistPath, xml);
  console.log(`🎉 Sitemap gerado com sucesso em: ${sitemapDistPath}`);

  // Gravar na pasta public/ para consistência de desenvolvimento
  const publicDir = path.resolve(__dirname, '../public');
  if (fs.existsSync(publicDir)) {
    const sitemapPublicPath = path.join(publicDir, 'sitemap.xml');
    fs.writeFileSync(sitemapPublicPath, xml);
    console.log(`🎉 Sitemap atualizado na pasta pública: ${sitemapPublicPath}`);
  }
}

generateSitemap();
