/**
 * SerenePDFReader - Leitura e renderização de ficheiros PDF
 * Utiliza a biblioteca PDF.js para renderizar páginas de PDF em canvas
 * com escala automática, suporte a filtros circadianos, extração de texto para TTS
 * e modo de rolagem contínua com lazy loading via IntersectionObserver.
 */

class SerenePDFReader {
  constructor() {
    this.pdfDoc = null;
    this.numPages = 0;
    this.pageTextCache = new Map();
    this.observer = null;
    this.renderedPages = new Set();
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
    this.renderedPages.clear();

    return {
      numPages: this.numPages
    };
  }

  /**
   * Renderiza uma página específica do PDF num container DOM (Modo Paginado)
   * @param {number} pageNum - Número da página (1-indexed)
   * @param {HTMLElement} containerEl - Container onde o canvas será inserido
   * @param {number} userZoom - Multiplicador de zoom do utilizador (padrão 1.0)
   * @returns {Promise<string>} - Texto extraído da página para TTS
   */
  async renderPage(pageNum, containerEl, userZoom = 1.0) {
    if (!this.pdfDoc || pageNum < 1 || pageNum > this.numPages) return '';

    const page = await this.pdfDoc.getPage(pageNum);
    
    // Calcular escala baseada no container de leitura
    const containerRect = containerEl.getBoundingClientRect();
    const availableWidth = (containerRect.width || containerEl.clientWidth || 400) - 16;
    const availableHeight = (containerRect.height || containerEl.clientHeight || 500) - 16;

    const unscaledViewport = page.getViewport({ scale: 1.0 });
    const scaleX = availableWidth / unscaledViewport.width;
    const scaleY = availableHeight / unscaledViewport.height;
    const baseScale = Math.min(scaleX, scaleY);
    const scale = baseScale * userZoom;

    const viewport = page.getViewport({ scale });

    // Criar canvas de renderização
    const canvas = document.createElement('canvas');
    canvas.className = 'mx-auto max-w-full rounded shadow-sm transition-all duration-150';
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    containerEl.innerHTML = '';
    containerEl.appendChild(canvas);

    // Se o zoom fez o canvas ser maior que o container, ativar scroll
    if (scale > baseScale) {
      containerEl.style.overflowX = 'auto';
      containerEl.style.overflowY = 'auto';
    } else {
      containerEl.style.overflowX = 'hidden';
      containerEl.style.overflowY = 'hidden';
    }

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
   * Renderiza todas as páginas do PDF empilhadas verticalmente (Modo Scroll)
   * Usa IntersectionObserver para lazy loading eficiente.
   * @param {HTMLElement} containerEl - Container de leitura
   * @param {number} userZoom - Multiplicador de zoom
   */
  async renderScrollMode(containerEl, userZoom = 1.0) {
    if (!this.pdfDoc) return;

    // Limpar observer anterior
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.renderedPages.clear();
    containerEl.innerHTML = '';
    containerEl.style.overflowY = 'auto';
    containerEl.style.overflowX = 'hidden';

    // Estimar dimensões de uma página para criar placeholders
    const firstPage = await this.pdfDoc.getPage(1);
    const containerWidth = (containerEl.getBoundingClientRect().width || containerEl.clientWidth || 400) - 32;
    const unscaledVp = firstPage.getViewport({ scale: 1.0 });
    const baseScale = (containerWidth / unscaledVp.width) * userZoom;
    const estimatedHeight = unscaledVp.height * baseScale;

    // Criar placeholders para cada página
    for (let i = 1; i <= this.numPages; i++) {
      const wrapper = document.createElement('div');
      wrapper.className = 'pdf-page-wrapper flex flex-col items-center mb-2';
      wrapper.dataset.pageNum = i;
      wrapper.style.minHeight = `${estimatedHeight}px`;
      wrapper.style.position = 'relative';

      // Label de página
      const label = document.createElement('div');
      label.className = 'text-[10px] font-mono opacity-40 text-center py-1 select-none';
      label.textContent = `— ${i} / ${this.numPages} —`;
      wrapper.appendChild(label);

      // Placeholder para o canvas
      const canvasHolder = document.createElement('div');
      canvasHolder.className = 'pdf-canvas-holder w-full flex justify-center';
      canvasHolder.style.minHeight = `${estimatedHeight - 24}px`;
      wrapper.appendChild(canvasHolder);

      containerEl.appendChild(wrapper);
    }

    // IntersectionObserver para lazy render
    this.observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const pageNum = parseInt(entry.target.dataset.pageNum);
        if (entry.isIntersecting && !this.renderedPages.has(pageNum)) {
          this._renderPageIntoWrapper(entry.target, pageNum, containerWidth, userZoom);
        }
      }
    }, {
      root: containerEl,
      rootMargin: '200px 0px', // Pre-render 200px antes de aparecer
      threshold: 0.01
    });

    // Observar todos os wrappers
    containerEl.querySelectorAll('.pdf-page-wrapper').forEach(w => {
      this.observer.observe(w);
    });
  }

  /**
   * Renderiza um canvas dentro de um wrapper de página (usado pelo IntersectionObserver)
   * @private
   */
  async _renderPageIntoWrapper(wrapper, pageNum, containerWidth, userZoom) {
    this.renderedPages.add(pageNum);

    try {
      const page = await this.pdfDoc.getPage(pageNum);
      const unscaledVp = page.getViewport({ scale: 1.0 });
      const scale = (containerWidth / unscaledVp.width) * userZoom;
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.className = 'rounded shadow-sm';
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.maxWidth = '100%';

      const context = canvas.getContext('2d');
      await page.render({ canvasContext: context, viewport }).promise;

      const holder = wrapper.querySelector('.pdf-canvas-holder');
      if (holder) {
        holder.innerHTML = '';
        holder.appendChild(canvas);
      }

      // Ajustar altura real do wrapper
      wrapper.style.minHeight = `${viewport.height + 24}px`;

      // Cachear texto
      if (!this.pageTextCache.has(pageNum)) {
        const textContent = await page.getTextContent();
        this.pageTextCache.set(pageNum, textContent.items.map(item => item.str).join(' '));
      }
    } catch (err) {
      console.error(`Erro ao renderizar página ${pageNum}:`, err);
    }
  }

  /**
   * Re-renderiza todas as páginas visíveis (chamado ao mudar o zoom no modo scroll)
   */
  async reRenderVisiblePages(containerEl, userZoom = 1.0) {
    this.renderedPages.clear();
    if (this.observer) {
      this.observer.disconnect();
    }

    const containerWidth = (containerEl.getBoundingClientRect().width || containerEl.clientWidth || 400) - 32;

    // Resetar todos os canvas holders
    containerEl.querySelectorAll('.pdf-page-wrapper').forEach(wrapper => {
      const holder = wrapper.querySelector('.pdf-canvas-holder');
      if (holder) holder.innerHTML = '';
    });

    // Re-observar
    this.observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const pageNum = parseInt(entry.target.dataset.pageNum);
        if (entry.isIntersecting && !this.renderedPages.has(pageNum)) {
          this._renderPageIntoWrapper(entry.target, pageNum, containerWidth, userZoom);
        }
      }
    }, {
      root: containerEl,
      rootMargin: '200px 0px',
      threshold: 0.01
    });

    containerEl.querySelectorAll('.pdf-page-wrapper').forEach(w => {
      this.observer.observe(w);
    });
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

  /**
   * Limpa o IntersectionObserver (deve ser chamado ao sair do modo scroll PDF)
   */
  cleanup() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.renderedPages.clear();
  }
}

window.serenePDFReader = new SerenePDFReader();
