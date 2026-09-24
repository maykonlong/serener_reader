/**
 * SereneTTSEngine - Sintetizador de Voz (Text-to-Speech)
 * Permite leitura audível de livros com seleção de vozes, velocidade ajustável
 * e controle de reprodução (Play, Pause, Stop).
 */

class SereneTTSEngine {
  constructor() {
    this.synth = window.speechSynthesis || null;
    this.utterance = null;
    this.isPlaying = false;
    this.isPaused = false;
    this.rate = 0.95;
    this.pitch = 1.0;
    this.voice = null;
    this.preferredVoiceName = '';
    this.voices = [];
    this.chunks = [];
    this.chunkIndex = 0;
    this.chunkOffset = 0;
    this.sleepTimer = null;
    this.sleepTimeoutEnd = null;
    this.autoContinue = false;
    this.onEnd = null;       // Callback disparado quando a fala termina naturalmente
    this.onBoundary = null;  // Callback para destaque palavra-a-palavra
    this.currentCharIndex = 0;
    this.playbackId = 0;

    this.onStateChange = null; // Callback UI
    this.initVoices();
    this.initMediaSession();
  }

  /**
   * Configura a Media Session API para exibir controles de reprodução
   * na tela de bloqueio / notificações do sistema.
   */
  initMediaSession() {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.setActionHandler('play', () => this.resume());
      navigator.mediaSession.setActionHandler('pause', () => this.pause());
      navigator.mediaSession.setActionHandler('stop', () => this.stop());
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
    } catch (e) {
      console.warn('Media Session não suportada:', e);
    }
  }

  /** Atualiza os metadados exibidos na tela de bloqueio. */
  setMediaMetadata(title, artist) {
    if (!('mediaSession' in navigator) || !window.MediaMetadata) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title || 'Serene Reader',
        artist: artist || 'Leitura por voz',
        album: 'Serene Reader'
      });
    } catch (e) {
      console.warn('MediaMetadata não suportado:', e);
    }
  }

  initVoices() {
    if (!this.synth) return;

    const loadVoices = () => {
      this.voices = this.synth.getVoices();
      const preferred = this.voices.find(v => v.name === this.preferredVoiceName);
      if (preferred) this.voice = preferred;
      else if (!this.voice && this.voices.length > 0) this.voice = this.getBestVoice('pt-BR');
    };

    loadVoices();
    if (typeof this.synth.addEventListener === 'function') this.synth.addEventListener('voiceschanged', loadVoices);
    else if (this.synth.onvoiceschanged !== undefined) this.synth.onvoiceschanged = loadVoices;
  }

  getPortugueseVoices() {
    if (!this.synth) return [];
    return this.voices
      .filter(v => /^(pt|es|en)/i.test(v.lang || ''))
      .sort((a, b) => this._voiceScore(b, 'pt-BR') - this._voiceScore(a, 'pt-BR'));
  }

  _voiceScore(voice, language = 'pt-BR') {
    const lang = String(voice?.lang || '').toLowerCase();
    const target = String(language || 'pt-BR').toLowerCase();
    const name = String(voice?.name || '').toLowerCase();
    let score = 0;
    if (lang === target) score += 120;
    else if (lang.startsWith(target.split('-')[0])) score += 90;
    else if (lang.startsWith('pt')) score += 70;
    if (voice?.default) score += 25;
    if (voice?.localService) score += 10;
    if (/natural|neural|premium|enhanced|google|microsoft|samsung/.test(name)) score += 35;
    if (/eloquence|espeak|compact|robot/.test(name)) score -= 25;
    return score;
  }

  getBestVoice(language = 'pt-BR') {
    return [...this.voices].sort((a, b) => this._voiceScore(b, language) - this._voiceScore(a, language))[0] || null;
  }

  setVoice(voiceName) {
    this.preferredVoiceName = voiceName || '';
    const selected = this.voices.find(v => v.name === voiceName);
    if (selected) {
      this.voice = selected;
      // Reinicia a fala com a nova voz se estiver tocando
      if (this.isPlaying && !this.isPaused) {
        const text = this.currentText;
        this.stop();
        setTimeout(() => this.speak(text), 100);
      }
      return true;
    }
    return false;
  }

  setRate(newRate) {
    this.rate = Math.max(0.6, Math.min(2, parseFloat(newRate) || 0.95));
    if (this.isPlaying && !this.isPaused) {
      const text = this.currentText;
      this.stop();
      this.speak(text);
    }
  }

  setPitch(newPitch) {
    this.pitch = Math.max(0.75, Math.min(1.35, parseFloat(newPitch) || 1.0));
    if (this.isPlaying && !this.isPaused) {
      const text = this.currentText;
      this.stop();
      this.speak(text);
    }
  }

  setSleepTimer(minutes) {
    if (this.sleepTimer) {
      clearTimeout(this.sleepTimer);
      this.sleepTimer = null;
      this.sleepTimeoutEnd = null;
    }
    if (minutes > 0) {
      const ms = minutes * 60 * 1000;
      this.sleepTimeoutEnd = Date.now() + ms;
      this.sleepTimer = setTimeout(() => {
        this.stop();
      }, ms);
    }
  }

  getSleepTimerRemaining() {
    if (!this.sleepTimeoutEnd) return 0;
    const remain = this.sleepTimeoutEnd - Date.now();
    return remain > 0 ? Math.ceil(remain / 60000) : 0;
  }

  speak(text) {
    if (!this.synth) {
      alert('A síntese de voz não é suportada por este navegador.');
      return;
    }

    if (!text || text.trim() === '') return;

    // Se já estivesse pausado o mesmo texto, retoma
    if (this.isPaused && this.currentText === text) {
      this.synth.resume();
      this.isPlaying = true;
      this.isPaused = false;
      this.notifyStateChange('playing');
      return;
    }

    this._cancelSpeech(false);
    const playbackId = ++this.playbackId;

    const cleanText = String(text)
      .replace(/<[^>]*>/g, ' ')
      .replace(/\u00ad/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    this.currentText = text;
    this.chunks = this._buildChunks(cleanText);
    this.chunkIndex = 0;
    this.chunkOffset = 0;
    this._speakCurrentChunk(playbackId);
  }

  _buildChunks(text, maxLength = 650) {
    const chunks = [];
    let cursor = 0;
    while (cursor < text.length) {
      while (/\s/.test(text[cursor] || '')) cursor++;
      if (cursor >= text.length) break;
      let end = Math.min(text.length, cursor + maxLength);
      if (end < text.length) {
        const windowText = text.slice(cursor, end);
        const minimum = Math.floor(maxLength * 0.55);
        const sentenceBreaks = [
          windowText.lastIndexOf('. '), windowText.lastIndexOf('! '),
          windowText.lastIndexOf('? '), windowText.lastIndexOf('; '),
          windowText.lastIndexOf(': '), windowText.lastIndexOf('\n')
        ].filter(index => index >= minimum);
        const softBreaks = [windowText.lastIndexOf(', '), windowText.lastIndexOf(' ')]
          .filter(index => index >= minimum);
        const candidates = sentenceBreaks.length ? sentenceBreaks : softBreaks;
        if (candidates.length) end = cursor + Math.max(...candidates) + 1;
      }
      const raw = text.slice(cursor, end);
      const leading = raw.length - raw.trimStart().length;
      const value = raw.trim();
      if (value) chunks.push({ text: value, offset: cursor + leading });
      cursor = Math.max(end, cursor + 1);
    }
    return chunks;
  }

  _speakCurrentChunk(playbackId) {
    if (playbackId !== this.playbackId || !this.chunks.length) return;
    const chunk = this.chunks[this.chunkIndex];
    this.chunkOffset = chunk.offset;
    this.utterance = new SpeechSynthesisUtterance(chunk.text);
    this.utterance.rate = this.rate;
    this.utterance.pitch = this.pitch;
    this.utterance.volume = 1;
    this.utterance.lang = this.voice?.lang || 'pt-BR';

    if (this.voice) {
      this.utterance.voice = this.voice;
    }

    this.utterance.onstart = () => {
      if (playbackId !== this.playbackId) return;
      this.isPlaying = true;
      this.isPaused = false;
      this.notifyStateChange('playing');
    };

    this.utterance.onboundary = (e) => {
      if (playbackId !== this.playbackId) return;
      this.currentCharIndex = this.chunkOffset + (e.charIndex || 0);
      if (typeof this.onBoundary === 'function') {
        this.onBoundary(this.currentCharIndex);
      }
    };

    this.utterance.onend = () => {
      if (playbackId !== this.playbackId) return;
      if (this.chunkIndex < this.chunks.length - 1) {
        this.chunkIndex += 1;
        setTimeout(() => this._speakCurrentChunk(playbackId), 18);
        return;
      }
      this.isPlaying = false;
      this.isPaused = false;
      this.notifyStateChange('ended');
      if (typeof this.onEnd === 'function') this.onEnd();
    };

    this.utterance.onerror = (e) => {
      if (playbackId !== this.playbackId) return;
      console.warn('Erro na síntese de voz:', e);
      this.isPlaying = false;
      this.isPaused = false;
      this.notifyStateChange('stopped');
      // Não avança páginas após falha de áudio; o usuário decide se quer tentar novamente.
    };

    this.synth.speak(this.utterance);
  }

  pause() {
    if (this.synth && this.isPlaying && !this.isPaused) {
      this.synth.pause();
      this.isPaused = true;
      this.notifyStateChange('paused');
    }
  }

  resume() {
    if (this.synth && this.isPaused) {
      this.synth.resume();
      this.isPaused = false;
      this.isPlaying = true;
      this.notifyStateChange('playing');
    }
  }

  stop() {
    this._cancelSpeech(true);
    this.notifyStateChange('stopped');
  }

  _cancelSpeech(retryCancel = false) {
    if (this.synth) {
      this.playbackId += 1;
      const stoppedPlaybackId = this.playbackId;
      if (this.isPaused) {
        try { this.synth.resume(); } catch (e) {}
      }
      this.synth.cancel();
      if (retryCancel) {
        // Alguns WebViews Android só esvaziam a fila no ciclo seguinte.
        setTimeout(() => {
          if (this.playbackId === stoppedPlaybackId && !this.isPlaying) this.synth.cancel();
        }, 60);
      }
      this.utterance = null;
      this.chunks = [];
      this.chunkIndex = 0;
      this.currentCharIndex = 0;
      this.isPlaying = false;
      this.isPaused = false;
    }
  }

  toggle(text) {
    if (this.isPlaying && !this.isPaused) {
      this.pause();
    } else if (this.isPaused) {
      this.resume();
    } else {
      this.speak(text);
    }
  }

  notifyStateChange(state) {
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = state === 'playing' ? 'playing' : (state === 'paused' ? 'paused' : 'none');
      } catch (e) {}
    }
    if (typeof this.onStateChange === 'function') {
      this.onStateChange({
        state,
        isPlaying: this.isPlaying,
        isPaused: this.isPaused,
        rate: this.rate
      });
    }
  }
}

window.sereneTTS = new SereneTTSEngine();
