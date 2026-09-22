/**
 * SereneReadingModes - Funcionalidades avançadas de ergonomia de leitura
 * Inclui: Bionic Reading, Foco de Linha, Régua de Leitura e Modo RSVP (Leitura Rápida)
 */

class SereneReadingModes {
  constructor() {
    this.bionicEnabled = false;
    this.lineFocusEnabled = false;
    this.rulerEnabled = false;
    this.rulerElement = null;
    this.focusHandler = null;
    this.rulerHandler = null;
  }

  // Bionic Reading
  applyBionicReading(html) {
    if (!this.bionicEnabled) return html;
    // Transforma cada palavra deixando a primeira metade em negrito.
    // Preserva as tags HTML intactas.
    return html.replace(/(>|^)([^<]+)(<|$)/g, (match, prefix, text, suffix) => {
      const transformedText = text.replace(/[a-zA-ZÀ-ÿ]+/g, (word) => {
        if (word.length <= 1) return `<b class="bionic-bold">${word}</b>`;
        const mid = Math.ceil(word.length / 2);
        return `<b class="bionic-bold">${word.substring(0, mid)}</b>${word.substring(mid)}`;
      });
      return prefix + transformedText + suffix;
    });
  }

  // Régua de Leitura
  toggleRuler(enable) {
    this.rulerEnabled = enable;
    if (enable) {
      if (!this.rulerElement) {
        this.rulerElement = document.createElement('div');
        this.rulerElement.id = 'reading-ruler';
        document.body.appendChild(this.rulerElement);
        
        this.rulerHandler = (e) => {
          let y = e.clientY || (e.touches && e.touches[0].clientY);
          if (y !== undefined) {
            this.rulerElement.style.top = (y - 15) + 'px';
          }
        };
        document.addEventListener('mousemove', this.rulerHandler);
        document.addEventListener('touchmove', this.rulerHandler, {passive: true});
      }
      this.rulerElement.style.display = 'block';
    } else {
      if (this.rulerElement) {
        this.rulerElement.style.display = 'none';
      }
    }
  }

  // Foco de Linha (aplica opacity em parágrafos não focados)
  toggleLineFocus(enable) {
    this.lineFocusEnabled = enable;
    const container = document.getElementById('page-content');
    if (!container) return;
    
    if (enable) {
      if (!this.focusHandler) {
        this.focusHandler = (e) => {
          let y = e.clientY || (e.touches && e.touches[0].clientY);
          if (y === undefined) return;
          
          const paragraphs = container.querySelectorAll('p, h1, h2, h3, li');
          let closest = null;
          let minDistance = Infinity;
          
          paragraphs.forEach(p => {
            p.classList.add('line-focus-dim');
            p.classList.remove('line-focus-active');
            const rect = p.getBoundingClientRect();
            const pCenter = rect.top + rect.height / 2;
            const dist = Math.abs(y - pCenter);
            if (dist < minDistance) {
              minDistance = dist;
              closest = p;
            }
          });
          
          if (closest && minDistance < 150) {
            closest.classList.remove('line-focus-dim');
            closest.classList.add('line-focus-active');
          }
        };
        document.addEventListener('mousemove', this.focusHandler);
        document.addEventListener('touchmove', this.focusHandler, {passive: true});
      }
      // Initial trigger if possible, or wait for move
    } else {
      if (this.focusHandler) {
        document.removeEventListener('mousemove', this.focusHandler);
        document.removeEventListener('touchmove', this.focusHandler);
        this.focusHandler = null;
      }
      const paragraphs = container.querySelectorAll('p, h1, h2, h3, li');
      paragraphs.forEach(p => {
        p.classList.remove('line-focus-dim', 'line-focus-active');
      });
    }
  }
}

class SereneRSVP {
  constructor() {
    this.wpm = 300;
    this.words = [];
    this.currentIndex = 0;
    this.isPlaying = false;
    this.interval = null;
  }

  initDOM() {
    this.modal = document.getElementById('rsvp-modal');
    this.wordDisplay = document.getElementById('rsvp-word-display');
    this.wpmVal = document.getElementById('rsvp-wpm-val');
    this.slider = document.getElementById('rsvp-wpm-slider');
    this.playBtn = document.getElementById('rsvp-play-btn');
    const closeBtn = document.getElementById('rsvp-close-btn');

    if (this.slider) {
      this.slider.value = this.wpm;
      if (this.wpmVal) this.wpmVal.textContent = this.wpm;
      this.slider.addEventListener('input', (e) => {
        this.wpm = parseInt(e.target.value);
        if (this.wpmVal) this.wpmVal.textContent = this.wpm;
        if (this.isPlaying) {
          this.pause();
          this.play();
        }
      });
    }
    
    if (this.playBtn) {
      this.playBtn.addEventListener('click', () => {
        if (this.isPlaying) this.pause();
        else this.play();
      });
    }
    
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }
  }

  start(text) {
    if (!this.modal) this.initDOM();
    
    let cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleanText) return;
    
    this.words = cleanText.split(' ');
    this.currentIndex = 0;
    
    if (this.modal) {
      this.modal.classList.remove('hidden');
      setTimeout(() => this.modal.classList.remove('opacity-0'), 10);
    }
    
    this.play();
  }

  play() {
    if (this.currentIndex >= this.words.length) this.currentIndex = 0;
    this.isPlaying = true;
    if (this.playBtn) {
      this.playBtn.innerHTML = `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
    }
    
    const delay = 60000 / this.wpm;
    
    this.interval = setInterval(() => {
      if (this.currentIndex >= this.words.length) {
        this.pause();
        return;
      }
      this.renderWord(this.words[this.currentIndex]);
      this.currentIndex++;
    }, delay);
  }

  pause() {
    this.isPlaying = false;
    if (this.playBtn) {
      this.playBtn.innerHTML = `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
    }
    if (this.interval) clearInterval(this.interval);
  }

  close() {
    this.pause();
    if (this.modal) {
      this.modal.classList.add('opacity-0');
      setTimeout(() => this.modal.classList.add('hidden'), 200);
    }
  }

  renderWord(word) {
    if (!this.wordDisplay) return;
    const mid = Math.floor(word.length / 2);
    // Destacar o centro óptico da palavra para leitura rápida
    const html = `${word.substring(0, mid)}<span class="text-red-500 font-bold">${word[mid] || ''}</span>${word.substring(mid+1)}`;
    this.wordDisplay.innerHTML = html;
  }
}

window.sereneReadingModes = new SereneReadingModes();
window.sereneRSVP = new SereneRSVP();
