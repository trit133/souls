// Tiny procedural sound kit (WebAudio). Must be unlocked by a user gesture (iOS).
import { Music } from './music.js';

export class Audio {
  constructor() {
    this.ctx = null; this.master = null; this.music = null; this.muted = false;
    this.vol = { master: 0.7, music: 1, sfx: 1, team: 0.5 };
  }

  // master / music / effects / teammates (teammates sit under effects)
  setVolumes(v) {
    this.vol = { ...this.vol, ...v };
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.vol.master, t, 0.02);
    this.musicBus.gain.setTargetAtTime(this.vol.music, t, 0.02);
    this.sfx.gain.setTargetAtTime(this.vol.sfx, t, 0.02);
    this.half.gain.setTargetAtTime(this.vol.team, t, 0.02);
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = this.vol.master;
      this.master.connect(this.ctx.destination);
      this.sfx = this.ctx.createGain(); this.sfx.gain.value = this.vol.sfx; this.sfx.connect(this.master);
      this.musicBus = this.ctx.createGain(); this.musicBus.gain.value = this.vol.music; this.musicBus.connect(this.master);
      // teammates' sounds (half volume by default)
      this.half = this.ctx.createGain(); this.half.gain.value = this.vol.team;
      this.half.connect(this.sfx);
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.band = new Music(this.ctx, this.musicBus);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    // iOS: play a silent buffer inside the gesture
    const s = this.ctx.createBufferSource(); s.buffer = this.ctx.createBuffer(1, 1, 22050); s.connect(this.master); s.start();
  }

  _noise(dur, { freq = 1000, q = 1, type = 'bandpass', f1 = null, gain = 0.5, attack = 0.005 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(freq, t);
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.bus || this.sfx);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  }
  _tone(freq, dur, { type = 'sine', f1 = null, gain = 0.3, attack = 0.005, delay = 0 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.bus || this.sfx); o.start(t); o.stop(t + dur + 0.05);
  }

  // a teammate's sound
  remote(name, vol = 1) {
    this.bus = this.half;
    this.play(name, vol);
    this.bus = null;
  }

  play(name, vol = 1) {
    if (!this.ctx || this.muted) return;
    const v = vol;
    switch (name) {
      case 'swing': this._noise(0.18, { freq: 600, f1: 2400, q: 2, gain: 0.22 * v, attack: 0.04 }); break;
      case 'heavySwing': this._noise(0.32, { freq: 300, f1: 1400, q: 1.5, gain: 0.3 * v, attack: 0.08 }); break;
      case 'hit':
        this._noise(0.12, { freq: 900, q: 0.8, gain: 0.45 * v }); this._tone(140, 0.14, { f1: 60, gain: 0.5 * v, type: 'triangle' }); break;
      case 'bigHit':
        this._noise(0.25, { freq: 500, q: 0.7, gain: 0.6 * v }); this._tone(90, 0.3, { f1: 35, gain: 0.7 * v, type: 'triangle' }); break;
      case 'hurt': this._tone(200, 0.2, { f1: 80, gain: 0.35 * v, type: 'sawtooth' }); this._noise(0.15, { freq: 400, gain: 0.3 * v }); break;
      case 'clang':
        this._tone(1250, 0.35, { gain: 0.12 * v, type: 'square' }); this._tone(1873, 0.3, { gain: 0.08 * v });
        this._noise(0.08, { freq: 4000, q: 2, gain: 0.3 * v }); break;
      case 'parry':
        this._tone(1600, 0.6, { gain: 0.2 * v, type: 'triangle' }); this._tone(2400, 0.5, { gain: 0.12 * v, delay: 0.02 });
        this._noise(0.1, { freq: 5000, q: 3, gain: 0.35 * v }); break;
      case 'roll': this._noise(0.25, { freq: 250, f1: 120, q: 0.7, gain: 0.25 * v, attack: 0.03 }); break;
      case 'comboHit': this._tone(1175, 0.09, { gain: 0.09 * v, type: 'triangle' }); this._tone(1568, 0.14, { gain: 0.07 * v, type: 'triangle', delay: 0.05 }); break; // a combo window hit
      case 'uiTick': this._tone(880, 0.05, { f1: 660, gain: 0.05 * v, type: 'triangle' }); break;
      case 'step': this._noise(0.06, { freq: 200, q: 1, gain: 0.08 * v }); break;
      case 'heal': this._tone(523, 0.6, { gain: 0.12 * v }); this._tone(784, 0.7, { gain: 0.1 * v, delay: 0.1 }); break;
      case 'slam':
        this._noise(0.5, { freq: 200, f1: 60, q: 0.6, gain: 0.8 * v, type: 'lowpass' }); this._tone(70, 0.5, { f1: 30, gain: 0.8 * v, type: 'sine' }); break;
      case 'roar':
        this._tone(90, 1.4, { f1: 60, gain: 0.35 * v, type: 'sawtooth', attack: 0.15 });
        this._tone(135, 1.3, { f1: 85, gain: 0.25 * v, type: 'sawtooth', attack: 0.2 });
        this._noise(1.4, { freq: 300, f1: 150, q: 0.8, gain: 0.45 * v, attack: 0.2 }); break;
      case 'fire': this._noise(0.6, { freq: 800, f1: 300, q: 0.5, gain: 0.3 * v, attack: 0.05 }); break;
      case 'bow': this._tone(220, 0.12, { f1: 110, gain: 0.2 * v, type: 'triangle' }); this._noise(0.1, { freq: 3000, gain: 0.15 * v }); break;
      case 'death': this._tone(110, 2.2, { f1: 55, gain: 0.35 * v, type: 'sawtooth', attack: 0.3 }); this._tone(165, 2.2, { f1: 82, gain: 0.2 * v, attack: 0.3 }); break;
      case 'victory': [261, 329, 392, 523].forEach((f, i) => this._tone(f, 2.5, { gain: 0.12, delay: i * 0.18, attack: 0.1 })); break;
      case 'bonfire': this._noise(0.9, { freq: 600, q: 0.4, gain: 0.25, attack: 0.2 }); this._tone(392, 1.2, { gain: 0.08, attack: 0.3 }); break;
      case 'fog': this._noise(1.0, { freq: 1200, f1: 300, q: 0.6, gain: 0.2, attack: 0.3 }); break;
      case 'rattle': // armor plates clinking on a step
        this._tone(2300 + Math.random() * 500, 0.06, { gain: 0.025 * v, type: 'square' });
        this._noise(0.05, { freq: 5200, q: 3, gain: 0.05 * v, attack: 0.002 }); break;
      case 'enemyDie': this._tone(160, 0.6, { f1: 50, gain: 0.25 * v, type: 'triangle' }); break;
      case 'riposte': this._noise(0.3, { freq: 700, q: 0.6, gain: 0.7 }); this._tone(70, 0.6, { f1: 30, gain: 0.8, type: 'triangle' }); break;
    }
  }

  // 'varek' starts Varek's theme; 2 moves it into his second phase on the next bar line.
  // 1 is the old low drone the mini bosses still use.
  startMusic(which = 1) {
    if (!this.ctx) return;
    const song = which === 'varek' ? 'varek1' : which === 2 ? 'varek2' : null;
    if (song) { this._stopDrone(); this.band.play(song); return; }
    this.stopMusic();
    const ctx = this.ctx, out = ctx.createGain(); out.gain.value = 0; out.connect(this.musicBus);
    out.gain.linearRampToValueAtTime(0.16, ctx.currentTime + 2);
    const nodes = [];
    for (const f of [55, 82.4, 65.4]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
      const lf = ctx.createOscillator(); lf.frequency.value = 0.1 + Math.random() * 0.2;
      const lg = ctx.createGain(); lg.gain.value = 1.5; lf.connect(lg); lg.connect(o.detune);
      const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 380;
      o.connect(flt); flt.connect(out); o.start(); lf.start(); nodes.push(o, lf);
    }
    this.music = { out, nodes };
  }
  stopMusic(fade = 1.2) {
    this.band?.stop(fade);
    this._stopDrone(fade);
  }
  _stopDrone(fade = 1.2) {
    if (!this.music || !this.ctx) return;
    const { out, nodes } = this.music; this.music = null;
    const t = this.ctx.currentTime;
    out.gain.cancelScheduledValues(t); out.gain.setValueAtTime(out.gain.value, t); out.gain.linearRampToValueAtTime(0, t + fade);
    setTimeout(() => { nodes.forEach((n) => { try { n.stop(); } catch {} }); out.disconnect(); }, fade * 1000 + 100);
  }
}
