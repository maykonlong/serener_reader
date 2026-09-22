/**
 * SereneCatalog - Catálogo de Livros de Domínio Público (Project Gutenberg)
 * Usa a API pública Gutendex (https://gutendex.com) para buscar e baixar livros
 * gratuitos (EPUB/TXT) diretamente para a biblioteca local.
 */

class SereneCatalog {
  constructor() {
    this.base = 'https://gutendex.com/books';
    // Proxies CORS para baixar os arquivos do gutenberg.org (que não enviam CORS)
    this.proxies = [
      { url: 'https://corsproxy.io/?url=', type: 'raw' },
      { url: 'https://api.allorigins.win/raw?url=', type: 'raw' },
      { url: 'https://api.codetabs.com/v1/proxy?quest=', type: 'raw' }
    ];
  }

  /**
   * Busca livros no catálogo.
   * @param {string} query - termo de busca
   * @param {number} page - página (1-based)
   * @returns {Promise<Array>} - lista de livros
   */
  async search(query, page = 1) {
    const params = new URLSearchParams();
    if (query && query.trim()) params.set('search', query.trim());
    params.set('page', String(page));

    const res = await fetch(`${this.base}?${params.toString()}`);
    if (!res.ok) throw new Error('Falha ao consultar o catálogo.');
    const data = await res.json();
    return data.results || [];
  }

  /**
   * Busca um livro específico pelo id da Gutendex.
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async searchById(id) {
    const res = await fetch(`${this.base}?ids=${id}`);
    if (!res.ok) return null;
    const data = await res.json();
    return (data.results && data.results[0]) || null;
  }

  /**
   * Baixa um livro (EPUB preferido, senão texto puro) do gutenberg.org
   * via proxy CORS.
   * @param {Object} book - objeto retornado pela Gutendex
   * @returns {Promise<{arrayBuffer: ArrayBuffer, format: string, title: string, author: string}>}
   */
  async download(book) {
    const formats = book.formats || {};
    const author = (book.authors && book.authors[0] && book.authors[0].name) || 'Desconhecido';

    const epubUrl = formats['application/epub+zip'];
    const txtUrl = formats['text/plain; charset=utf-8'] || formats['text/plain; charset=us-ascii'];

    if (epubUrl) {
      try {
        const buf = await this._fetchBinary(epubUrl);
        return { arrayBuffer: buf, format: 'epub', title: book.title, author };
      } catch (e) {
        // fallback para TXT se EPUB falhar
        console.warn('Falha ao baixar EPUB, tentando TXT:', e);
      }
    }

    if (txtUrl) {
      const text = await this._fetchText(txtUrl);
      return { text, format: 'txt', title: book.title, author };
    }

    throw new Error('Nenhum formato de download disponível para este livro.');
  }

  async _fetchBinary(url) {
    let lastError = null;
    for (const proxy of this.proxies) {
      try {
        const res = await fetch(proxy.url + encodeURIComponent(url));
        if (!res.ok) continue;
        const buf = await res.arrayBuffer();
        if (buf && buf.byteLength > 0) return buf;
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError || new Error('Não foi possível baixar o arquivo.');
  }

  async _fetchText(url) {
    let lastError = null;
    for (const proxy of this.proxies) {
      try {
        const res = await fetch(proxy.url + encodeURIComponent(url));
        if (!res.ok) continue;
        const text = await res.text();
        if (text && text.length > 0) return text;
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError || new Error('Não foi possível baixar o texto.');
  }
}

window.sereneCatalog = new SereneCatalog();
