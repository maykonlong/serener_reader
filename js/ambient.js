/**
 * SereneAmbient - Sons ambientes para foco (chuva, marrom, rosa, branco)
 * Gerados proceduralmente via Web Audio API, sem depender de arquivos externos.
 */

class SereneAmbient {
  constructor() {
    this.ctx = null;
    this.gain = null;
    this.currentType = null;
    this.playing = false;
    this.volume = 0.4;
    this.onStateChange = null;
  }

  _ensureCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.gain = this.ctx.createGain();
      this.gain.gain.value = this.volume;
      this.gain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  /** Cria um buffer de ruído (branco ou colorido) de `seconds`. */
  _noiseBuffer(seconds = 2, type = 'white') {
    const ctx = this._ensureCtx();
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * seconds);
    const buffer = ctx.createBuffer(1, length, rate);
    const data = buffer.getChannelData(0);

    if (type === 'white') {
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    } else if (type === 'brown') {
      let last = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5;
      }
    } else if (type === 'pink') {
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + white * 0.099046;
        b1 = 0.96300 * b1 + white * 0.2965164;
        b2 = 0.57000 * b2 + white * 1.0526913;
        data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.11;
      }
    }
    return buffer;
  }

  /** Ruído de chuva: combina ruído branco filtrado com gotas aleatórias. */
  _rainBuffer(seconds = 2) {
    const ctx = this._ensureCtx();
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * seconds);
    const buffer = ctx.createBuffer(1, length, rate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      const base = Math.random() * 2 - 1;
      // Simples envelope de gotas aleatórias
      data[i] = base * 0.4 + (Math.random() < 0.002 ? Math.random() * 0.8 : 0);
    }
    return buffer;
  }

  start(type) {
    if (type === this.currentType && this.playing) return;
    this.stop();

    const ctx = this._ensureCtx();
    if (!ctx) {
      console.warn('Web Audio não suportado.');
      return;
    }

    let buffer;
    if (type === 'rain') buffer = this._rainBuffer();
    else if (type === 'brown') buffer = this._noiseBuffer(2, 'brown');
    else if (type === 'pink') buffer = this._noiseBuffer(2, 'pink');
    else buffer = this._noiseBuffer(2, 'white');

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    let node = source;
    if (type === 'rain') {
      // Filtro passa-baixa para suavizar a chuva
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 6000;
      source.connect(filter);
      node = filter;
    }
    node.connect(this.gain);

    source.start();
    this.source = source;
    this.currentType = type;
    this.playing = true;
    this._notify();
  }

  stop() {
    if (this.source) {
      try { this.source.stop(); } catch (e) {}
      this.source = null;
    }
    this.currentType = null;
    this.playing = false;
    this._notify();
  }

  toggle(type) {
    if (this.playing && this.currentType === type) {
      this.stop();
    } else {
      this.start(type);
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.gain) this.gain.gain.value = this.volume;
  }

  _notify() {
    if (typeof this.onStateChange === 'function') {
      this.onStateChange({ playing: this.playing, type: this.currentType });
    }
  }
}

window.sereneAmbient = new SereneAmbient();
