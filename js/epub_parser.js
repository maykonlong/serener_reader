/**
 * SereneEPUBParser - leitor EPUB sob demanda.
 *
 * A importação lê apenas o pacote, metadados, capa e índice. O XHTML e as
 * imagens de cada capítulo só são extraídos quando o leitor chega nele. Isso
 * evita manter milhares de páginas (e duas cópias do texto) na memória.
 */

class SereneEPUBParser {
  constructor() {
    this.domParser = new DOMParser();
    this.archiveCache = new WeakMap();
  }

  _resolvePath(baseDir, relativePath) {
    if (!relativePath) return relativePath;
    const clean = relativePath.split('#')[0].split('?')[0];
    if (!baseDir) return clean;
    const parts = `${baseDir}${clean}`.split('/');
    const stack = [];
    for (const part of parts) {
      if (!part || part === '.') continue;
      if (part === '..') stack.pop();
      else stack.push(part);
    }
    return stack.join('/');
  }

  _directory(path) {
    return path && path.includes('/') ? path.substring(0, path.lastIndexOf('/') + 1) : '';
  }

  _zipFile(zip, path) {
    if (!path) return null;
    let decoded = path;
    try { decoded = decodeURIComponent(path); } catch (_) { /* caminho já decodificado */ }
    return zip.file(path) || zip.file(decoded);
  }

  async _yieldToBrowser() {
    if (globalThis.scheduler && typeof globalThis.scheduler.yield === 'function') {
      await globalThis.scheduler.yield();
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  async _getArchive(arrayBuffer) {
    if (!arrayBuffer || typeof arrayBuffer !== 'object') {
      throw new Error('O arquivo original deste EPUB não está disponível. Importe-o novamente.');
    }
    const cached = this.archiveCache.get(arrayBuffer);
    if (cached) return cached;
    if (typeof JSZip === 'undefined') {
      throw new Error('A biblioteca JSZip é necessária para ler ficheiros EPUB.');
    }
    const archive = {
      zip: await JSZip.loadAsync(arrayBuffer),
      chapterCache: new Map(),
      imageCache: new Map()
    };
    this.archiveCache.set(arrayBuffer, archive);
    return archive;
  }

  async _readToc(zip, opfDir, manifestItems, spineTocId) {
    const titles = new Map();
    const toc = [];
    const add = (path, title) => {
      const cleanTitle = String(title || '').replace(/\s+/g, ' ').trim();
      if (!path || !cleanTitle) return;
      if (!titles.has(path)) titles.set(path, cleanTitle);
      toc.push({ href: path, title: cleanTitle });
    };

    const navItem = Object.values(manifestItems).find(item =>
      String(item.properties || '').split(/\s+/).includes('nav')
    );
    if (navItem) {
      try {
        const navPath = this._resolvePath(opfDir, navItem.href);
        const navFile = this._zipFile(zip, navPath);
        if (navFile) {
          const navDoc = this.domParser.parseFromString(await navFile.async('text'), 'text/html');
          navDoc.querySelectorAll('nav a[href]').forEach(anchor => {
            const href = this._resolvePath(this._directory(navPath), anchor.getAttribute('href'));
            add(href, anchor.textContent);
          });
        }
      } catch (error) {
        console.warn('Índice EPUB3 não pôde ser lido:', error);
      }
    }

    const ncxItem = (spineTocId && manifestItems[spineTocId]) ||
      Object.values(manifestItems).find(item => item.mediaType === 'application/x-dtbncx+xml');
    if (titles.size === 0 && ncxItem) {
      try {
        const ncxPath = this._resolvePath(opfDir, ncxItem.href);
        const ncxFile = this._zipFile(zip, ncxPath);
        if (ncxFile) {
          const ncxDoc = this.domParser.parseFromString(await ncxFile.async('text'), 'text/xml');
          ncxDoc.querySelectorAll('navPoint').forEach(point => {
            const src = point.querySelector('content')?.getAttribute('src');
            const label = point.querySelector('navLabel text')?.textContent;
            const href = this._resolvePath(this._directory(ncxPath), src);
            add(href, label);
          });
        }
      } catch (error) {
        console.warn('Índice NCX não pôde ser lido:', error);
      }
    }
    return { titles, toc };
  }

  /** Lê somente a estrutura do EPUB; os capítulos permanecem dentro do ZIP. */
  async parse(arrayBuffer, options = {}) {
    const onProgress = typeof options.onProgress === 'function' ? options.onProgress : () => {};
    onProgress({ phase: 'archive', percent: 5 });
    const archive = await this._getArchive(arrayBuffer);
    const zip = archive.zip;

    const containerFile = zip.file('META-INF/container.xml');
    if (!containerFile) throw new Error('EPUB inválido: META-INF/container.xml não encontrado.');
    const containerDoc = this.domParser.parseFromString(await containerFile.async('text'), 'text/xml');
    const opfPath = containerDoc.querySelector('rootfile')?.getAttribute('full-path');
    if (!opfPath) throw new Error('EPUB inválido: pacote OPF não encontrado.');

    const opfFile = this._zipFile(zip, opfPath);
    if (!opfFile) throw new Error(`Pacote OPF não encontrado em: ${opfPath}`);
    const opfDir = this._directory(opfPath);
    const opfDoc = this.domParser.parseFromString(await opfFile.async('text'), 'text/xml');
    onProgress({ phase: 'metadata', percent: 30 });

    const title = (opfDoc.querySelector('metadata title') || opfDoc.querySelector('title'))?.textContent?.trim() || 'EPUB Sem Título';
    const author = (opfDoc.querySelector('metadata creator') || opfDoc.querySelector('creator'))?.textContent?.trim() || 'Autor Desconhecido';

    const manifestItems = {};
    opfDoc.querySelectorAll('manifest > item').forEach(node => {
      const id = node.getAttribute('id');
      const href = node.getAttribute('href');
      if (!id || !href) return;
      manifestItems[id] = {
        id,
        href,
        mediaType: node.getAttribute('media-type') || '',
        properties: node.getAttribute('properties') || ''
      };
    });

    const spine = opfDoc.querySelector('spine');
    const tocData = await this._readToc(zip, opfDir, manifestItems, spine?.getAttribute('toc'));
    const chapters = [];
    opfDoc.querySelectorAll('spine > itemref').forEach(node => {
      if (node.getAttribute('linear') === 'no') return;
      const item = manifestItems[node.getAttribute('idref')];
      if (!item || !/html|xhtml/i.test(item.mediaType || item.href)) return;
      const href = this._resolvePath(opfDir, item.href);
      chapters.push({
        title: tocData.titles.get(href) || `Capítulo ${chapters.length + 1}`,
        href,
        contentType: 'html',
        lazy: true
      });
    });
    if (!chapters.length) throw new Error('Este EPUB não possui capítulos legíveis na ordem de leitura.');
    onProgress({ phase: 'chapters', percent: 65 });

    let cover = null;
    try {
      const coverMetaId = opfDoc.querySelector('meta[name="cover"]')?.getAttribute('content');
      const coverItem = (coverMetaId && manifestItems[coverMetaId]) ||
        Object.values(manifestItems).find(item =>
          String(item.properties).split(/\s+/).includes('cover-image') ||
          (/cover/i.test(item.id) && item.mediaType.startsWith('image/'))
        );
      if (coverItem) {
        const coverPath = this._resolvePath(opfDir, coverItem.href);
        const coverFile = this._zipFile(zip, coverPath);
        if (coverFile) {
          const base64 = await coverFile.async('base64');
          cover = `data:${coverItem.mediaType || 'image/jpeg'};base64,${base64}`;
        }
      }
    } catch (error) {
      console.warn('Capa não pôde ser extraída:', error);
    }

    onProgress({ phase: 'ready', percent: 100 });
    return {
      title,
      author,
      cover,
      chapters,
      toc: chapters.map((chapter, index) => ({ index, title: chapter.title, href: chapter.href })),
      rawText: '',
      contentType: 'html',
      lazy: true
    };
  }

  async _imageDataUrl(archive, path) {
    if (archive.imageCache.has(path)) return archive.imageCache.get(path);
    const imageFile = this._zipFile(archive.zip, path);
    if (!imageFile) return null;
    const base64 = await imageFile.async('base64');
    const ext = (path.split('.').pop() || '').toLowerCase();
    const mime = ({ jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', avif: 'image/avif' })[ext] || 'image/jpeg';
    const value = `data:${mime};base64,${base64}`;
    archive.imageCache.set(path, value);
    while (archive.imageCache.size > 24) archive.imageCache.delete(archive.imageCache.keys().next().value);
    return value;
  }

  /** Extrai e sanitiza apenas o capítulo pedido. Mantém um cache curto em memória. */
  async loadChapter(arrayBuffer, chapter) {
    if (!chapter?.href) return { title: chapter?.title || 'Capítulo', content: chapter?.content || '', contentType: 'html' };
    const archive = await this._getArchive(arrayBuffer);
    if (archive.chapterCache.has(chapter.href)) return archive.chapterCache.get(chapter.href);

    await this._yieldToBrowser();
    const chapterFile = this._zipFile(archive.zip, chapter.href);
    if (!chapterFile) throw new Error(`Capítulo não encontrado no EPUB: ${chapter.href}`);
    const htmlText = await chapterFile.async('text');
    await this._yieldToBrowser();

    const chapterDoc = this.domParser.parseFromString(htmlText, 'text/html');
    chapterDoc.querySelectorAll('script, style, iframe, object, embed').forEach(el => el.remove());
    const chapterDir = this._directory(chapter.href);
    const imageNodes = chapterDoc.querySelectorAll('img, svg image');
    for (let index = 0; index < imageNodes.length; index++) {
      const image = imageNodes[index];
      const src = image.getAttribute('src') || image.getAttribute('href') || image.getAttribute('xlink:href') || '';
      if (!src || src.startsWith('data:') || src.startsWith('http:') || src.startsWith('https:')) continue;
      try {
        const resolved = this._resolvePath(chapterDir, src);
        const dataUrl = await this._imageDataUrl(archive, resolved);
        if (dataUrl) {
          image.setAttribute('src', dataUrl);
          image.setAttribute('href', dataUrl);
          image.removeAttribute('xlink:href');
        }
      } catch (error) {
        console.warn('Imagem do EPUB não pôde ser lida:', error);
      }
      if (index > 0 && index % 4 === 0) await this._yieldToBrowser();
    }

    const heading = chapterDoc.querySelector('h1, h2, h3, title')?.textContent?.trim();
    const bodyHtml = chapterDoc.body?.innerHTML || chapterDoc.documentElement?.innerHTML || '';
    const sanitize = globalThis.DOMPurify?.sanitize?.bind(globalThis.DOMPurify);
    const cleanHtml = sanitize ? sanitize(bodyHtml, { ADD_ATTR: ['href', 'src'] }) : bodyHtml;
    const result = {
      title: heading || chapter.title || 'Capítulo',
      content: cleanHtml.trim(),
      contentType: 'html'
    };
    archive.chapterCache.set(chapter.href, result);
    while (archive.chapterCache.size > 4) archive.chapterCache.delete(archive.chapterCache.keys().next().value);
    return result;
  }

  /** Converte EPUBs antigos, salvos como um texto único, em partes leves. */
  async splitLegacyText(text, options = {}) {
    const maxChars = options.maxChars || 42000;
    const paragraphs = String(text || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    const chapters = [];
    let buffer = [];
    let size = 0;
    let title = 'Parte 1';
    const headingPattern = /^(cap[ií]tulo|chapter|parte|part|livro|book|canto|se[cç][aã]o|section)\b/i;
    const isHeading = paragraph => paragraph.length < 110 && (headingPattern.test(paragraph) || (paragraph.length > 2 && paragraph === paragraph.toLocaleUpperCase('pt-BR')));
    const flush = () => {
      if (!buffer.length) return;
      chapters.push({ title, content: buffer.join('\n\n'), contentType: 'text', lazy: false });
      buffer = [];
      size = 0;
    };

    for (let index = 0; index < paragraphs.length; index++) {
      const paragraph = paragraphs[index];
      const heading = isHeading(paragraph);
      if ((heading && size > 2500) || (size > 0 && size + paragraph.length > maxChars)) flush();
      if (heading && buffer.length === 0) title = paragraph.replace(/\s+/g, ' ').slice(0, 100);
      else if (buffer.length === 0) title = `Parte ${chapters.length + 1}`;
      buffer.push(paragraph);
      size += paragraph.length + 2;
      if (index > 0 && index % 200 === 0) await this._yieldToBrowser();
    }
    flush();
    return chapters;
  }
}

window.sereneEPUBParser = new SereneEPUBParser();
