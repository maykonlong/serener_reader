/**
 * SereneStats - Estatísticas de Leitura (tempo, páginas, palavras, sequência de dias)
 * Persistidas no IndexedDB via chave de preferência 'reading_stats'.
 * Alimenta o painel de estatísticas da biblioteca e a estimativa de tempo restante.
 */

class SereneStats {
  constructor() {
    this.stats = {
      totalReadingTimeMs: 0,
      pagesRead: 0,
      wordsRead: 0,
      booksStarted: 0,
      sessionsCount: 0,
      lastReadDate: null,
      streakDays: 0
    };
    this.bookId = null;
    this.active = false;
    this.timer = null;
    this.loaded = false;
    this.onUpdate = null; // Callback para atualizar a UI
  }

  async init() {
    if (this.loaded) return;
    try {
      const saved = await window.sereneStorage.getPreference('reading_stats', null);
      if (saved && typeof saved === 'object') {
        this.stats = Object.assign({}, this.stats, saved);
      }
    } catch (e) {
      console.warn('Falha ao carregar estatísticas:', e);
    }
    this.loaded = true;
  }

  /** Inicia (ou reinicia) uma sessão de leitura para um livro. */
  async startSession(bookId) {
    await this.init();
    const isNewBook = this.bookId && this.bookId !== bookId;
    this.bookId = bookId;
    if (isNewBook) {
      this.stats.booksStarted += 1;
    }
    this.stats.sessionsCount += 1;
    this.active = true;
    this._updateStreak();
    this.ensureTimer();
    await this.persist();
  }

  /** Pausa a contagem de tempo ativo (sem descartar a sessão). */
  stopSession() {
    this.active = false;
  }

  ensureTimer() {
    if (this.timer) return;
    this.timer = setInterval(() => this._tick(), 15000);
  }

  _tick() {
    if (!this.active) return;
    if (typeof document !== 'undefined' && document.hidden) return; // Não conta em segundo plano
    this.stats.totalReadingTimeMs += 15000;
    this._persist();
  }

  async recordPageTurn() {
    this.stats.pagesRead += 1;
    await this._persist();
  }

  async recordWords(n) {
    this.stats.wordsRead += Math.max(0, n || 0);
    await this._persist();
  }

  /** Calcula palavras por minuto com base no histórico real. */
  getWpm() {
    const minutes = this.stats.totalReadingTimeMs / 60000;
    if (minutes < 0.5) return 0;
    const wpm = Math.round(this.stats.wordsRead / minutes);
    return wpm > 0 ? wpm : 0;
  }

  getSummary() {
    const minutes = Math.round(this.stats.totalReadingTimeMs / 60000);
    return {
      minutes,
      pagesRead: this.stats.pagesRead || 0,
      wordsRead: this.stats.wordsRead || 0,
      streakDays: this.stats.streakDays || 0,
      booksStarted: this.stats.booksStarted || 0,
      wpm: this.getWpm()
    };
  }

  formatDuration(minutes) {
    if (!minutes || minutes <= 0) return '0 min';
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }

  _updateStreak() {
    const today = this._todayStr();
    if (this.stats.lastReadDate === today) return;
    const yesterday = this._daysAgoStr(1);
    if (this.stats.lastReadDate === yesterday) {
      this.stats.streakDays += 1;
    } else {
      this.stats.streakDays = 1;
    }
    this.stats.lastReadDate = today;
  }

  _todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  _daysAgoStr(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  async _persist() {
    try {
      await window.sereneStorage.savePreference('reading_stats', this.stats);
    } catch (e) {
      console.warn('Falha ao persistir estatísticas:', e);
    }
    if (typeof this.onUpdate === 'function') {
      this.onUpdate(this.getSummary());
    }
  }

  async persist() {
    return this._persist();
  }
}

window.sereneStats = new SereneStats();
