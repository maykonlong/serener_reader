/**
 * SereneURLReader - Módulo de Importação de Web Articles
 * Utiliza o proxy AllOrigins para contornar CORS e o Readability.js para extrair conteúdo limpo.
 */

class SereneURLReader {
  constructor() {
    this.proxies = [
      { url: 'https://api.allorigins.win/get?url=', type: 'json' },
      { url: 'https://corsproxy.io/?', type: 'raw' },
      { url: 'https://api.codetabs.com/v1/proxy?quest=', type: 'raw' }
    ];
  }

  async importFromURL(url) {
    if (!url || !url.startsWith('http')) {
      throw new Error("Por favor, insira uma URL válida começando com http:// ou https://");
    }

    try {
      let response = null;
      let htmlText = '';
      let fetchError = null;

      // 1. Interceptor Nativo para Wikipédia/Wikisource (Bypass de Proxy)
      if (url.includes('wikipedia.org/wiki/') || url.includes('wikisource.org/wiki/')) {
        const urlObj = new URL(url);
        const pageName = urlObj.pathname.split('/wiki/')[1];
        const apiUrl = `${urlObj.origin}/w/api.php?action=parse&page=${pageName}&format=json&origin=*`;
        
        try {
          const res = await fetch(apiUrl);
          const data = await res.json();
          if (data && data.parse && data.parse.text) {
            htmlText = `<html><head><title>${data.parse.title}</title></head><body>${data.parse.text['*']}</body></html>`;
          }
        } catch (e) {
          fetchError = e;
        }
      }

      // 2. Tentar proxies CORS com fallback (se não for Wiki ou se falhou)
      if (!htmlText) {
        for (const proxy of this.proxies) {
          try {
            const fetchUrl = proxy.url + encodeURIComponent(url);
            response = await fetch(fetchUrl);
            
            if (response.ok) {
              if (proxy.type === 'json') {
                const data = await response.json();
                htmlText = data.contents;
              } else {
                htmlText = await response.text();
              }
              if (htmlText) break; // Sucesso
            }
          } catch (e) {
            fetchError = e; // Guarda o erro para tentar o próximo proxy
          }
        }
      }

      if (!htmlText) {
        throw new Error(`Nenhum proxy conseguiu acessar a página. Verifique sua conexão ou se a página bloqueia bots. (Erro: ${fetchError ? fetchError.message : 'Desconhecido'})`);
      }
      
      // 2. Parse HTML text into a DOM Document
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');
      
      // 3. Use Mozilla's Readability.js to extract the clean article
      const reader = new Readability(doc);
      const article = reader.parse();
      
      if (!article || !article.content) {
        throw new Error("Não foi possível encontrar um artigo legível nesta página.");
      }
      
      // 4. Sanitize and extract plain text from HTML
      const cleanHtml = DOMPurify.sanitize(article.content);
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = cleanHtml;
      
      const paragraphs = [];
      tempDiv.querySelectorAll('p, h1, h2, h3, h4, li').forEach(el => {
        const txt = el.textContent.trim();
        if (txt) paragraphs.push(txt);
      });
      
      let finalContent = paragraphs.join('\n\n');
      if (!finalContent) {
        finalContent = tempDiv.textContent.trim();
      }
      
      return {
        title: article.title || 'Artigo da Web',
        author: article.byline || new URL(url).hostname,
        content: finalContent,
        format: 'article',
        sourceUrl: url
      };
      
    } catch (err) {
      console.error(err);
      throw new Error("Erro ao extrair artigo: " + err.message);
    }
  }
}

window.sereneURLReader = new SereneURLReader();
