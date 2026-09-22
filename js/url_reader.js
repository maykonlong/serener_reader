/**
 * SereneURLReader - Módulo de Importação de Web Articles
 * Utiliza o proxy AllOrigins para contornar CORS e o Readability.js para extrair conteúdo limpo.
 */

class SereneURLReader {
  constructor() {
    this.proxyUrl = 'https://api.allorigins.win/raw?url=';
  }

  async importFromURL(url) {
    if (!url || !url.startsWith('http')) {
      throw new Error("Por favor, insira uma URL válida começando com http:// ou https://");
    }

    try {
      // 1. Fetch the raw HTML content via public CORS proxy
      const response = await fetch(this.proxyUrl + encodeURIComponent(url));
      
      if (!response.ok) {
        throw new Error(`Falha ao carregar a página: ${response.status} ${response.statusText}`);
      }
      
      const htmlText = await response.text();
      
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
