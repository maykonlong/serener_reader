/**
 * SereneAnnotations - Lida com interações de texto e anotações
 * Exibe um menu flutuante ao selecionar texto.
 */

class SereneAnnotations {
  constructor() {
    this.toolbar = null;
    this.initToolbar();
    this.attachListeners();
  }

  initToolbar() {
    this.toolbar = document.createElement('div');
    this.toolbar.id = 'selection-toolbar';
    // Adicionado z-index alto e pointer-events-none quando oculto
    this.toolbar.className = 'fixed bg-slate-800 text-white text-xs rounded-lg shadow-xl flex overflow-hidden z-[80] transition-opacity duration-200 opacity-0 pointer-events-none';
    this.toolbar.innerHTML = `
      <button id="st-copy" class="px-3 py-2 hover:bg-slate-700 transition">Copiar</button>
      <button id="st-translate" class="px-3 py-2 hover:bg-slate-700 border-l border-slate-700 transition">Traduzir</button>
      <button id="st-wiki" class="px-3 py-2 hover:bg-slate-700 border-l border-slate-700 transition">Wiki</button>
    `;
    document.body.appendChild(this.toolbar);

    document.getElementById('st-copy').addEventListener('click', () => {
      const text = window.getSelection().toString();
      if (text) {
        navigator.clipboard.writeText(text);
      }
      this.hideToolbar();
    });

    document.getElementById('st-translate').addEventListener('click', () => {
      const text = window.getSelection().toString();
      if (text) {
        window.open(`https://translate.google.com/?sl=auto&tl=pt&text=${encodeURIComponent(text)}&op=translate`, '_blank');
      }
      this.hideToolbar();
    });

    document.getElementById('st-wiki').addEventListener('click', () => {
      const text = window.getSelection().toString();
      if (text) {
        window.open(`https://pt.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(text)}`, '_blank');
      }
      this.hideToolbar();
    });
  }

  attachListeners() {
    document.addEventListener('selectionchange', () => {
      const selection = window.getSelection();
      const text = selection.toString().trim();
      
      if (text.length > 0 && text.length < 500) { // Evitar barra em seleções gigantes
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        // Não mostrar se o range estiver invisível
        if (rect.width > 0 && rect.height > 0) {
          this.showToolbar(rect);
        } else {
          this.hideToolbar();
        }
      } else {
        this.hideToolbar();
      }
    });

    // Esconder barra ao clicar fora
    document.addEventListener('mousedown', (e) => {
      if (this.toolbar && !this.toolbar.contains(e.target)) {
        // Pequeno delay para permitir o click nos botões do toolbar
        setTimeout(() => {
          if (window.getSelection().toString().trim().length === 0) {
             this.hideToolbar();
          }
        }, 150);
      }
    });
  }

  showToolbar(rect) {
    if (!this.toolbar) return;
    this.toolbar.classList.remove('opacity-0', 'pointer-events-none');
    
    // Posicionar logo acima da seleção
    const top = Math.max(10, rect.top - 45);
    // Centralizar horizontalmente em relação à seleção
    let left = rect.left + (rect.width / 2) - 100; // 100 é aprox metade da largura da toolbar
    
    // Manter dentro da tela
    if (left < 10) left = 10;
    if (left > window.innerWidth - 210) left = window.innerWidth - 210;

    this.toolbar.style.top = `${top}px`;
    this.toolbar.style.left = `${left}px`;
  }

  hideToolbar() {
    if (!this.toolbar) return;
    this.toolbar.classList.add('opacity-0', 'pointer-events-none');
  }
}

window.sereneAnnotations = new SereneAnnotations();
