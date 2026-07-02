import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

// Helper: extrai o texto de dentro de uma tag XML
function extractTag(xml: string, tag: string): string {
  // Tenta pegar conteúdo CDATA primeiro
  const cdataRe = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${tag}>`, 'i')
  const cdataMatch = xml.match(cdataRe)
  if (cdataMatch) return cdataMatch[1].trim()

  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
  const match = xml.match(re)
  return match ? match[1].trim() : ''
}

// Helper: extrai atributo de uma tag
function extractAttr(xml: string, tag: string, attr: string): string {
  const re = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i')
  const match = xml.match(re)
  return match ? match[1] : ''
}

// Helper: divide o XML em blocos <item>...</item>
function extractItems(xml: string): string[] {
  const items: string[] = []
  const re = /<item>([\s\S]*?)<\/item>/gi
  let match
  while ((match = re.exec(xml)) !== null) {
    items.push(match[1])
  }
  return items
}

// Helper: extrai URL do link do item (Substack usa formato especial)
function extractLink(itemXml: string): string {
  // Formato 1: <link>https://...</link>
  const match1 = itemXml.match(/<link>([^<]+)<\/link>/i)
  if (match1) return match1[1].trim()

  // Formato 2: <link/> seguido de URL entre tags irmãs — não usado, mas cobre <guid isPermaLink="true">
  const guidMatch = itemXml.match(/<guid[^>]*>([^<]+)<\/guid>/i)
  if (guidMatch) return guidMatch[1].trim()

  return ''
}

// Helper: decodifica entidades HTML numéricas e nomeadas
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&ldquo;/g, '\u201C')
    .replace(/&rdquo;/g, '\u201D')
}

// Helper: strip tags HTML e decodifica entidades para gerar description limpa
function stripHtml(html: string): string {
  const stripped = html.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim()
  return decodeHtmlEntities(stripped)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token de autorização não fornecido.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 },
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Variáveis de ambiente do Supabase não configuradas.')
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const accessToken = authHeader.replace('Bearer ', '')
    const { data: { user: currentUser }, error: currentUserError } = await supabaseAdmin.auth.getUser(accessToken)

    if (currentUserError || !currentUser) {
      return new Response(JSON.stringify({ error: 'Usuário não autenticado.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const callerRole = currentUser.app_metadata?.role ?? currentUser.user_metadata?.role
    if (callerRole !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Apenas administradores podem sincronizar artigos.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 },
      )
    }

    const body = await req.json().catch(() => ({}))
    const substackUrl = body.substackUrl || 'https://doxologosoficial.substack.com/feed'

    console.log(`Buscando RSS diretamente: ${substackUrl}`)

    // Fetch direto do RSS (sem intermediário)
    const rssResponse = await fetch(substackUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    })

    if (!rssResponse.ok) {
      throw new Error(`Erro ao buscar feed RSS: ${rssResponse.statusText} (${rssResponse.status})`)
    }

    const xmlText = await rssResponse.text()
    const items = extractItems(xmlText)

    console.log(`Total de itens no RSS: ${items.length}`)

    let countNew = 0
    let countUpdated = 0

    for (const item of items) {
      const link = extractLink(item)
      console.log(`Item link: ${link}`)
      if (!link) continue

      // Extrai slug da URL do Substack: .../p/nome-do-artigo
      // Exemplo: https://doxologosoficial.substack.com/p/meu-artigo
      const urlObj = new URL(link)
      const pathParts = urlObj.pathname.split('/').filter(Boolean)
      const slug = pathParts[pathParts.length - 1]
      console.log(`Slug extraído: ${slug}`)
      if (!slug) continue

      const title = extractTag(item, 'title')
      const pubDate = extractTag(item, 'pubDate')
      const author = extractTag(item, 'dc:creator') || extractTag(item, 'author')
      const contentHtml = extractTag(item, 'content:encoded') || extractTag(item, 'description')
      const descriptionRaw = extractTag(item, 'description')
      const description = stripHtml(descriptionRaw).substring(0, 300) + '...'
      
      // Thumbnail: tenta media:content, enclosure, ou primeira imagem do content
      let coverImageUrl = extractAttr(item, 'media:content', 'url') || extractAttr(item, 'enclosure', 'url')
      if (!coverImageUrl) {
        const imgMatch = contentHtml.match(/<img[^>]+src="([^"]+)"/)
        if (imgMatch) coverImageUrl = imgMatch[1]
      }

      const { data: existing } = await supabaseAdmin
        .from('artigos')
        .select('id')
        .eq('slug', slug)
        .single()

      const payload = {
        slug,
        title,
        description,
        content_html: contentHtml,
        cover_image_url: coverImageUrl || null,
        published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        author: author || null,
        status: 'published',
        updated_at: new Date().toISOString(),
      }

      if (existing) {
        await supabaseAdmin.from('artigos').update(payload).eq('id', existing.id)
        countUpdated++
      } else {
        await supabaseAdmin.from('artigos').insert([payload])
        countNew++
      }
    }

    return new Response(
      JSON.stringify({ success: true, stats: { novos: countNew, atualizados: countUpdated, total: items.length } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (err) {
    console.error('Erro na sincronização:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Erro interno desconhecido.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
    )
  }
})
