/**
 * SerenePDFReader - Leitura e renderização de ficheiros PDF
 * Utiliza a biblioteca PDF.js para renderizar páginas de PDF em canvas
 * com escala automática, suporte a filtros circadianos e extração de texto para TTS.
 */

class SerenePDFReader {
  constructor() {
    this.pdfDoc = null;
    this.numPages = 0;
    this.pageTextCache = new Map();
  }

  /**
   * Carrega um documento PDF a partir de um ArrayBuffer
   * @param {ArrayBuffer} arrayBuffer
   * @returns {Promise<Object>} - { title, numPages }
   */
  async loadDocument(arrayBuffer) {
    if (typeof pdfjsLib === 'undefined') {
      throw new Error('A biblioteca PDF.js é necessária para ler ficheiros PDF.');
    }

    // Definir worker do PDF.js
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    this.pdfDoc = await loadingTask.promise;
    this.numPages = this.pdfDoc.numPages;
    this.pageTextCache.clear();

    return {
      numPages: this.numPages
    };
  }

  /**
   * Renderiza uma página específica do PDF num container DOM
   * @param {number} pageNum - Número da página (1-indexed)
   * @param {HTMLElement} containerEl - Container onde o canvas será inserido
   * @returns {Promise<string>} - Texto extraído da página para TTS
   */
  async renderPage(pageNum, containerEl) {
    if (!this.pdfDoc || pageNum < 1 || pageNum > this.numPages) return '';

    const page = await this.pdfDoc.getPage(pageNum);
    
    // Calcular escala baseada no container de leitura
    const containerRect = containerEl.getBoundingClientRect();
    const availableWidth = (containerRect.width || containerEl.clientWidth || 400) - 16;
    const availableHeight = (containerRect.height || containerEl.clientHeight || 500) - 16;

    const unscaledViewport = page.getViewport({ scale: 1.0 });
    const scaleX = availableWidth / unscaledViewport.width;
    const scaleY = availableHeight / unscaledViewport.height;
    const scale = Math.min(scaleX, scaleY, 2.0); // Limite confortável

    const viewport = page.getViewport({ scale });

    // Criar canvas de renderização
    const canvas = document.createElement('canvas');
    canvas.className = 'mx-auto max-w-full rounded shadow-sm transition-all duration-150';
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    containerEl.innerHTML = '';
    containerEl.appendChild(canvas);

    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };

    await page.render(renderContext).promise;

    // Extrair texto da página para suporte a sintetizador de voz (TTS)
    let pageText = this.pageTextCache.get(pageNum);
    if (!pageText) {
      const textContent = await page.getTextContent();
      pageText = textContent.items.map(item => item.str).join(' ');
      this.pageTextCache.set(pageNum, pageText);
    }

    return pageText;
  }

  /**
   * Obtém o texto completo de uma página para síntese de voz
   * @param {number} pageNum
   */
  async getPageText(pageNum) {
    if (!this.pdfDoc || pageNum < 1 || pageNum > this.numPages) return '';
    if (this.pageTextCache.has(pageNum)) {
      return this.pageTextCache.get(pageNum);
    }

    const page = await this.pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    this.pageTextCache.set(pageNum, pageText);
    return pageText;
  }
}

window.serenePDFReader = new SerenePDFReader();
