/**
 * SerenePaginator - Motor de Paginação DOM de Medição Exata
 * Mede com precisão em pixels o container de leitura para fatiar textos em páginas
 * sem quebras de linha pela metade, sem vazamento de scroll e sem truncamento estático.
 */

class SerenePaginator {
  constructor() {
    this.measurer = null;
    this.ensureMeasurer();
  }

  ensureMeasurer() {
    if (!this.measurer) {
      let el = document.getElementById('serene-pagination-measurer');
      if (!el) {
        el = document.createElement('div');
        el.id = 'serene-pagination-measurer';
        el.style.position = 'absolute';
        el.style.visibility = 'hidden';
        el.style.pointerEvents = 'none';
        el.style.top = '-9999px';
        el.style.left = '-9999px';
        el.style.overflow = 'hidden';
        document.body.appendChild(el);
      }
      this.measurer = el;
    }
  }

  /**
   * Fatia um texto bruto (ou HTML de capítulos) em páginas medidas com precisão
   * @param {string} text - Conteúdo do livro ou capítulo
   * @param {HTMLElement} containerEl - Container ativo de leitura no DOM
   * @param {Object} options - { fontFamily, fontSize, maxWidthClass, lineHeight, paragraphSpacing, textAlign }
   * @returns {Array<string>} - Lista de páginas HTML formatadas
   */
  paginate(text, containerEl, options = {}) {
    this.ensureMeasurer();

    if (!text || typeof text !== 'string' || text.trim() === '') {
      return ['<p class="text-center italic opacity-60">Nenhum conteúdo disponível.</p>'];
    }

    // Copiar estilos exatos do container real para o container de medição
    const rect = containerEl.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(containerEl);

    // Calcular altura disponível real descontando padding top/bottom e pequenas margens de segurança
    const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
    const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
    const availableHeight = (rect.height || containerEl.clientHeight || 500) - paddingTop - paddingBottom - 16;
    const availableWidth = rect.width || containerEl.clientWidth || 400;

    const lineHeight = options.lineHeight || 1.7;
    const paraSpacing = (options.paragraphSpacing !== undefined && options.paragraphSpacing !== null) ? options.paragraphSpacing : 20;
    const textAlign = options.textAlign || 'justify';
    const indent = (options.indent !== undefined) ? options.indent : 16;

    this.measurer.style.width = `${availableWidth}px`;
    this.measurer.style.fontFamily = options.fontFamily ? `"${options.fontFamily}", Georgia, serif` : computedStyle.fontFamily;
    this.measurer.style.fontSize = options.fontSize ? `${options.fontSize}px` : computedStyle.fontSize;
    this.measurer.style.lineHeight = String(lineHeight);
    this.measurer.style.textAlign = textAlign;
    this.measurer.style.hyphens = 'auto';

    // Template de parágrafo com estilos inline para garantir medição e exibição idênticas
    const para = (t) => `<p style="margin:0 0 ${paraSpacing}px 0; line-height:${lineHeight}; text-indent:${indent}px; text-align:${textAlign};">${this.escapeHtml(t)}</p>`;

    // Dividir em parágrafos preservando quebras duplas
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim() !== '');
    const pages = [];

    let currentAcc = [];
    this.measurer.innerHTML = '';

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i].trim();
      const pHTML = para(paragraph);

      // Tentar adicionar o parágrafo atual ao acumulador
      const testHTML = [...currentAcc, pHTML].join('');
      this.measurer.innerHTML = testHTML;

      if (this.measurer.scrollHeight <= availableHeight) {
        // Coube perfeitamente!
        currentAcc.push(pHTML);
      } else {
        // Estourou a altura! Se já tínhamos parágrafos acumulados, fecha a página atual
        if (currentAcc.length > 0) {
          pages.push(currentAcc.join(''));
          currentAcc = [];
          this.measurer.innerHTML = '';
        }

        // Testar se o parágrafo sozinho é maior que uma página inteira
        this.measurer.innerHTML = pHTML;
        if (this.measurer.scrollHeight <= availableHeight) {
          currentAcc.push(pHTML);
        } else {
          // O parágrafo é muito longo (super-parágrafo). Dividir por frases!
          const sentences = paragraph.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [paragraph];
          let sentenceAcc = [];

          for (const sentence of sentences) {
            const cleanSentence = sentence.trim();
            if (!cleanSentence) continue;

            const testSentences = [...sentenceAcc, cleanSentence].join(' ');
            const testSentHTML = para(testSentences);
            
            this.measurer.innerHTML = testSentHTML;

            if (this.measurer.scrollHeight <= availableHeight) {
              sentenceAcc.push(cleanSentence);
            } else {
              if (sentenceAcc.length > 0) {
                const pageText = sentenceAcc.join(' ');
                pages.push(para(pageText));
                sentenceAcc = [cleanSentence];
              } else {
                // Frase extrema: adicionar diretamente
                sentenceAcc.push(cleanSentence);
              }
            }
          }

          if (sentenceAcc.length > 0) {
            currentAcc.push(para(sentenceAcc.join(' ')));
          }
        }
      }
    }

    // Guardar última página restante
    if (currentAcc.length > 0) {
      pages.push(currentAcc.join(''));
    }

    return pages.length > 0 ? pages : ['<p class="text-center opacity-60">Fim do conteúdo.</p>'];
  }

  escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

window.serenePaginator = new SerenePaginator();
