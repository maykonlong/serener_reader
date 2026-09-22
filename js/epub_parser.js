/**
 * SereneEPUBParser - Extração e parsing de livros EPUB
 * Utiliza JSZip e DOMParser para ler a estrutura OPF, Spine, Tabela de Conteúdos (TOC)
 * e capítulos de arquivos .epub sem necessidade de backend.
 */

class SereneEPUBParser {
  constructor() {
    this.domParser = new DOMParser();
  }

  /**
   * Processa o ArrayBuffer de um ficheiro .epub
   * @param {ArrayBuffer} arrayBuffer
   * @returns {Promise<Object>} - { title, author, cover, chapters: [{ title, content }], rawText }
   */
  async parse(arrayBuffer) {
    if (typeof JSZip === 'undefined') {
      throw new Error('A biblioteca JSZip é necessária para ler ficheiros EPUB.');
    }

    const zip = await JSZip.loadAsync(arrayBuffer);
    
    // 1. Localizar o ficheiro OPF principal via META-INF/container.xml
    const containerFile = zip.file('META-INF/container.xml');
    if (!containerFile) {
      throw new Error('Ficheiro EPUB inválido: META-INF/container.xml não encontrado.');
    }

    const containerXMLText = await containerFile.async('text');
    const containerDoc = this.domParser.parseFromString(containerXMLText, 'text/xml');
    const rootfileEl = containerDoc.querySelector('rootfile');
    if (!rootfileEl) {
      throw new Error('Ficheiro EPUB inválido: elemento rootfile não encontrado no container.xml');
    }

    const opfPath = rootfileEl.getAttribute('full-path');
    const opfFile = zip.file(opfPath);
    if (!opfFile) {
      throw new Error(`Ficheiro OPF não encontrado em: ${opfPath}`);
    }

    const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';
    const opfXMLText = await opfFile.async('text');
    const opfDoc = this.domParser.parseFromString(opfXMLText, 'text/xml');

    // 2. Extrair metadados (Título, Autor)
    const titleEl = opfDoc.querySelector('title') || opfDoc.querySelector('dc\\:title');
    const authorEl = opfDoc.querySelector('creator') || opfDoc.querySelector('dc\\:creator');

    const title = titleEl ? titleEl.textContent.trim() : 'EPUB Sem Título';
    const author = authorEl ? authorEl.textContent.trim() : 'Autor Desconhecido';

    // 3. Mapear Manifest (id -> href)
    const manifestItems = {};
    const manifestNodes = opfDoc.querySelectorAll('manifest > item');
    manifestNodes.forEach(node => {
      const id = node.getAttribute('id');
      const href = node.getAttribute('href');
      const mediaType = node.getAttribute('media-type');
      if (id && href) {
        manifestItems[id] = { href, mediaType };
      }
    });

    // 4. Ler a Spine (Ordem de leitura dos capítulos)
    const spineNodes = opfDoc.querySelectorAll('spine > itemref');
    const chapters = [];
    let fullTextAccumulator = '';

    for (let i = 0; i < spineNodes.length; i++) {
      const idref = spineNodes[i].getAttribute('idref');
      const item = manifestItems[idref];
      if (!item) continue;

      const fullHref = opfDir + item.href;
      const chapterZipFile = zip.file(fullHref) || zip.file(decodeURIComponent(fullHref));
      
      if (chapterZipFile) {
        try {
          const htmlText = await chapterZipFile.async('text');
          const chapterDoc = this.domParser.parseFromString(htmlText, 'text/html');
          
          // Título do capítulo (h1, h2 ou title)
          const chapTitleEl = chapterDoc.querySelector('h1, h2, h3, title');
          const chapTitle = chapTitleEl ? chapTitleEl.textContent.trim() : `Capítulo ${i + 1}`;

          // Limpar scripts e estilos do capítulo
          chapterDoc.querySelectorAll('script, style').forEach(el => el.remove());

          // Extrair texto limpo dos parágrafos
          const paragraphs = [];
          const pNodes = chapterDoc.querySelectorAll('p, h1, h2, h3, h4, li');
          if (pNodes.length > 0) {
            pNodes.forEach(p => {
              const txt = p.textContent.trim();
              if (txt) paragraphs.push(txt);
            });
          } else {
            const bodyText = chapterDoc.body ? chapterDoc.body.textContent.trim() : '';
            if (bodyText) paragraphs.push(bodyText);
          }

          const chapterCleanText = paragraphs.join('\n\n');
          if (chapterCleanText) {
            chapters.push({
              title: chapTitle,
              content: chapterCleanText
            });
            fullTextAccumulator += (fullTextAccumulator ? '\n\n' : '') + chapterCleanText;
          }
        } catch (err) {
          console.warn(`Erro ao ler capítulo ${fullHref}:`, err);
        }
      }
    }

    // 5. Tentar extrair imagem de Capa
    let cover = null;
    try {
      const metaCover = opfDoc.querySelector('meta[name="cover"]');
      let coverId = metaCover ? metaCover.getAttribute('content') : null;
      
      if (!coverId) {
        // Tentar encontrar item com id contendo 'cover'
        Object.keys(manifestItems).forEach(id => {
          if (id.toLowerCase().includes('cover') && manifestItems[id].mediaType.startsWith('image/')) {
            coverId = id;
          }
        });
      }

      if (coverId && manifestItems[coverId]) {
        const coverHref = opfDir + manifestItems[coverId].href;
        const coverZip = zip.file(coverHref) || zip.file(decodeURIComponent(coverHref));
        if (coverZip) {
          const base64 = await coverZip.async('base64');
          const mime = manifestItems[coverId].mediaType || 'image/jpeg';
          cover = `data:${mime};base64,${base64}`;
        }
      }
    } catch (e) {
      console.warn('Capa não pôde ser extraída:', e);
    }

    return {
      title,
      author,
      cover,
      chapters,
      toc: chapters.map((c, idx) => ({ index: idx, title: c.title })),
      rawText: fullTextAccumulator
    };
  }
}

window.sereneEPUBParser = new SereneEPUBParser();
