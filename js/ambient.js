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
    this.volume = 0.35;
    this.sources = new Set();
    this.sessionId = 0;
    this.onStateChange = null;
  }

  _ensureCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.gain = this.ctx.createGain();
      this.gain.gain.value = this.volume;
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -18;
      this.compressor.knee.value = 18;
      this.compressor.ratio.value = 3;
      this.compressor.attack.value = 0.02;
      this.compressor.release.value = 0.35;
      this.gain.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  /** Cria um buffer de ruído (branco ou colorido) de `seconds`. */
  _noiseBuffer(seconds = 10, type = 'white') {
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
  _rainBuffer(seconds = 10) {
    const ctx = this._ensureCtx();
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * seconds);
    const buffer = ctx.createBuffer(1, length, rate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      const base = Math.random() * 2 - 1;
      // Camada contínua e gotas suaves, evitando o ruído metálico de buffers curtos.
      const drop = Math.random() < 0.0012 ? Math.random() * 0.55 : 0;
      data[i] = base * 0.27 + drop;
    }
    return buffer;
  }

  /** Ruído de oceano: ruído marrom filtrado com ondas (LFO de amplitude). */
  _oceanBuffer(seconds = 12) {
    const ctx = this._ensureCtx();
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * seconds);
    const buffer = ctx.createBuffer(1, length, rate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      // Ondas lentas modulando a amplitude
      const wave = 0.6 + 0.4 * Math.sin((i / rate) * 2 * Math.PI * 0.12);
      data[i] = last * 3.5 * wave;
    }
    return buffer;
  }

  /** Ruído de vento: ruído rosa filtrado em banda. */
  _windBuffer(seconds = 12) {
    const ctx = this._ensureCtx();
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * seconds);
    const buffer = ctx.createBuffer(1, length, rate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.099046;
      b1 = 0.96300 * b1 + white * 0.2965164;
      b2 = 0.57000 * b2 + white * 1.0526913;
      // Rajadas lentas de vento
      const gust = 0.5 + 0.5 * Math.sin((i / rate) * 2 * Math.PI * 0.08);
      data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.25 * gust;
    }
    return buffer;
  }

  /** Ruído de fogo: estalos aleatórios sobre ruído marrom. */
  _fireBuffer(seconds = 10) {
    const ctx = this._ensureCtx();
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * seconds);
    const buffer = ctx.createBuffer(1, length, rate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      let v = last * 2.5;
      // Estalos aleatórios (crepitação)
      if (Math.random() < 0.004) {
        v += (Math.random() * 2 - 1) * 1.2;
      }
      data[i] = v;
    }
    return buffer;
  }

  start(type) {
    if (type === this.currentType && this.playing) return;
    this.stop();
    this.sessionId += 1;

    const ctx = this._ensureCtx();
    if (!ctx) {
      console.warn('Web Audio não suportado.');
      return;
    }

    let buffer;
    let filterType = null;
    if (type === 'rain') { buffer = this._rainBuffer(); filterType = 'rain'; }
    else if (type === 'brown') { buffer = this._noiseBuffer(10, 'brown'); filterType = 'brown'; }
    else if (type === 'pink') { buffer = this._noiseBuffer(10, 'pink'); filterType = 'pink'; }
    else if (type === 'white') { buffer = this._noiseBuffer(10, 'white'); filterType = 'white'; }
    else if (type === 'ocean') { buffer = this._oceanBuffer(); filterType = 'ocean'; }
    else if (type === 'wind') { buffer = this._windBuffer(); filterType = 'wind'; }
    else if (type === 'fire') { buffer = this._fireBuffer(); filterType = 'fire'; }
    else { buffer = this._noiseBuffer(10, 'white'); filterType = 'white'; }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    let node = source;
    const filter = ctx.createBiquadFilter();
    const profiles = {
      rain: ['highpass', 700, 0.55],
      ocean: ['lowpass', 850, 0.7],
      wind: ['bandpass', 520, 0.45],
      fire: ['lowpass', 1900, 0.6],
      brown: ['lowpass', 1100, 0.7],
      pink: ['lowpass', 4200, 0.6],
      white: ['highpass', 140, 0.5]
    };
    const [filterMode, frequency, q] = profiles[filterType] || profiles.white;
    filter.type = filterMode;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    source.connect(filter);
    node = filter;

    const sourceGain = ctx.createGain();
    sourceGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    sourceGain.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 0.18);
    node.connect(sourceGain);
    sourceGain.connect(this.gain);

    source.start();
    this.source = source;
    this.sourceGain = sourceGain;
    this.sources.add(source);
    source.onended = () => {
      this.sources.delete(source);
      try { source.disconnect(); } catch (e) {}
      try { filter.disconnect(); } catch (e) {}
      try { sourceGain.disconnect(); } catch (e) {}
    };
    this.currentType = type;
    this.playing = true;
    if (this.ctx?.state === 'suspended') this.ctx.resume().catch(() => {});
    this._notify();
  }

  stop() {
    const sessionId = ++this.sessionId;
    const ctx = this.ctx;
    const stopAt = ctx ? ctx.currentTime + 0.08 : 0;
    if (this.sourceGain && ctx) {
      try {
        this.sourceGain.gain.cancelScheduledValues(ctx.currentTime);
        this.sourceGain.gain.setValueAtTime(Math.max(0.0001, this.sourceGain.gain.value), ctx.currentTime);
        this.sourceGain.gain.exponentialRampToValueAtTime(0.0001, stopAt);
      } catch (e) {}
    }
    this.sources.forEach(source => {
      try { source.stop(stopAt); } catch (e) {}
    });
    this.sources.clear();
    this.source = null;
    this.sourceGain = null;
    this.currentType = null;
    this.playing = false;
    this._notify();
    // Suspender o contexto garante silêncio inclusive em WebViews que deixam um buffer órfão.
    if (ctx) {
      setTimeout(() => {
        if (this.sessionId === sessionId && !this.playing && ctx.state === 'running') {
          ctx.suspend().catch(() => {});
        }
      }, 120);
    }
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
    if (this.gain && this.ctx) {
      this.gain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.gain.gain.linearRampToValueAtTime(this.volume, this.ctx.currentTime + 0.04);
    }
    this._notify();
  }

  _notify() {
    if (typeof this.onStateChange === 'function') {
      this.onStateChange({ playing: this.playing, type: this.currentType, volume: this.volume });
    }
  }
}

window.sereneAmbient = new SereneAmbient();
