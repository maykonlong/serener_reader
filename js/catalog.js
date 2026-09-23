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

  async _fetch(url, options = {}, timeoutMs = 12000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
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

    const res = await this._fetch(`${this.base}?${params.toString()}`);
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
    const res = await this._fetch(`${this.base}?ids=${id}`);
    if (!res.ok) return null;
    const data = await res.json();
    return (data.results && data.results[0]) || null;
  }

  getCoverUrl(book) {
    const formats = (book && book.formats) || {};
    return formats['image/jpeg'] || formats['image/png'] || formats['image/webp'] || '';
  }

  /**
   * Baixa um livro (EPUB preferido, senão texto puro) do gutenberg.org
   * via proxy CORS.
   * @param {Object} book - objeto retornado pela Gutendex
   * @returns {Promise<{arrayBuffer?: ArrayBuffer, text?: string, format: string, title: string, author: string, cover: string|null}>}
   */
  async download(book) {
    const formats = book.formats || {};
    const author = (book.authors && book.authors[0] && book.authors[0].name) || 'Desconhecido';
    const coverPromise = this._downloadCover(this.getCoverUrl(book));

    const epubUrl = formats['application/epub+zip'];
    const txtUrl = formats['text/plain; charset=utf-8'] || formats['text/plain; charset=us-ascii'];

    if (epubUrl) {
      try {
        const buf = await this._fetchBinary(epubUrl);
        return { arrayBuffer: buf, format: 'epub', title: book.title, author, cover: await coverPromise };
      } catch (e) {
        // fallback para TXT se EPUB falhar
        console.warn('Falha ao baixar EPUB, tentando TXT:', e);
      }
    }

    if (txtUrl) {
      const text = await this._fetchText(txtUrl);
      return { text, format: 'txt', title: book.title, author, cover: await coverPromise };
    }

    throw new Error('Nenhum formato de download disponível para este livro.');
  }

  async _fetchBinary(url) {
    let lastError = null;
    for (const proxy of this.proxies) {
      try {
        const res = await this._fetch(proxy.url + encodeURIComponent(url), {}, 10000);
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
        const res = await this._fetch(proxy.url + encodeURIComponent(url), {}, 10000);
        if (!res.ok) continue;
        const text = await res.text();
        if (text && text.length > 0) return text;
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError || new Error('Não foi possível baixar o texto.');
  }

  async _downloadCover(url) {
    if (!url) return null;
    try {
      const buffer = await this._fetchBinary(url);
      const extension = new URL(url).pathname.toLowerCase();
      const mime = extension.endsWith('.png') ? 'image/png' : (extension.endsWith('.webp') ? 'image/webp' : 'image/jpeg');
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let offset = 0; offset < bytes.length; offset += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
      }
      return `data:${mime};base64,${btoa(binary)}`;
    } catch (error) {
      console.warn('Capa indisponível para uso offline:', error);
      return null;
    }
  }
}

window.sereneCatalog = new SereneCatalog();
