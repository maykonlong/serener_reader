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
    this.rate = 1.0;
    this.pitch = 1.0;
    this.voice = null;
    this.voices = [];
    this.sleepTimer = null;
    this.sleepTimeoutEnd = null;
    
    this.onStateChange = null; // Callback UI
    this.initVoices();
  }

  initVoices() {
    if (!this.synth) return;

    const loadVoices = () => {
      this.voices = this.synth.getVoices();
      // Tentar selecionar voz padrão em português (PT-PT ou PT-BR)
      if (!this.voice && this.voices.length > 0) {
        this.voice = this.voices.find(v => v.lang.startsWith('pt')) || this.voices[0];
      }
    };

    loadVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = loadVoices;
    }
  }

  getPortugueseVoices() {
    if (!this.synth) return [];
    return this.voices.filter(v => v.lang.startsWith('pt') || v.lang.startsWith('es') || v.lang.startsWith('en'));
  }

  setVoice(voiceName) {
    const selected = this.voices.find(v => v.name === voiceName);
    if (selected) {
      this.voice = selected;
    }
  }

  setRate(newRate) {
    this.rate = parseFloat(newRate) || 1.0;
    if (this.isPlaying && !this.isPaused) {
      const text = this.currentText;
      this.stop();
      this.speak(text);
    }
  }

  setPitch(newPitch) {
    this.pitch = parseFloat(newPitch) || 1.0;
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

    this.stop();

    const cleanText = text.replace(/<[^>]*>/g, ' ');
    this.currentText = text;

    this.utterance = new SpeechSynthesisUtterance(cleanText);
    this.utterance.rate = this.rate;
    this.utterance.pitch = this.pitch;

    if (this.voice) {
      this.utterance.voice = this.voice;
    }

    this.utterance.onstart = () => {
      this.isPlaying = true;
      this.isPaused = false;
      this.notifyStateChange('playing');
    };

    this.utterance.onend = () => {
      this.isPlaying = false;
      this.isPaused = false;
      this.notifyStateChange('ended');
    };

    this.utterance.onerror = (e) => {
      console.warn('Erro na síntese de voz:', e);
      this.isPlaying = false;
      this.isPaused = false;
      this.notifyStateChange('stopped');
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
    if (this.synth) {
      this.synth.cancel();
      this.isPlaying = false;
      this.isPaused = false;
      this.notifyStateChange('stopped');
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
