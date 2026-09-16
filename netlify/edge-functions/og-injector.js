export default async (request, context) => {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  // /artigos/meu-artigo -> ['', 'artigos', 'meu-artigo']
  const slug = pathParts[2];

  if (!slug || pathParts.length > 3) {
    return context.next();
  }

  // Fetch the original response (the SPA index.html)
  const response = await context.next();
  
  // Only intercept HTML requests
  if (response.headers.get("content-type")?.includes("text/html")) {
    const supabaseUrl = Netlify.env.get("VITE_SUPABASE_URL");
    const supabaseKey = Netlify.env.get("VITE_SUPABASE_ANON_KEY");
    
    if (supabaseUrl && supabaseKey) {
      try {
        const fetchUrl = `${supabaseUrl}/rest/v1/artigos?slug=eq.${slug}&select=title,description,cover_image_url&limit=1`;
        const sbResponse = await fetch(fetchUrl, {
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`
          }
        });
        
        if (sbResponse.ok) {
          const data = await sbResponse.json();
          if (data && data.length > 0) {
            const article = data[0];
            const title = `${article.title} - Doxologos`;
            const description = article.description || 'Psicologia de espiritualidade cristã online.';
            
            // Use HTMLRewriter to rewrite the meta tags in the response stream
            return new HTMLRewriter()
              .on('title', {
                element(element) {
                  element.setInnerContent(title);
                }
              })
              .on('meta[name="title"]', {
                element(element) {
                  element.setAttribute('content', title);
                }
              })
              .on('meta[name="description"]', {
                element(element) {
                  element.setAttribute('content', description);
                }
              })
              .on('meta[property="og:title"]', {
                element(element) {
                  element.setAttribute('content', title);
                }
              })
              .on('meta[property="og:description"]', {
                element(element) {
                  element.setAttribute('content', description);
                }
              })
              .on('meta[name="twitter:title"]', {
                element(element) {
                  element.setAttribute('content', title);
                }
              })
              .on('meta[name="twitter:description"]', {
                element(element) {
                  element.setAttribute('content', description);
                }
              })
              .on('meta[property="og:image"]', {
                element(element) {
                  if (article.cover_image_url) {
                    element.setAttribute('content', article.cover_image_url);
                  }
                }
              })
              .on('meta[name="twitter:image"]', {
                element(element) {
                  if (article.cover_image_url) {
                    element.setAttribute('content', article.cover_image_url);
                  }
                }
              })
              .transform(response);
          }
        }
      } catch (err) {
        console.error("Error fetching article for OG injection:", err);
      }
    }
  }
  
  return response;
};
