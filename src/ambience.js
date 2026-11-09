// The world's sounds while you explore, under the music: wind that gusts, and sounds drifting in from
// either side at different distances, a different set in each act. Night Raid swaps them for far
// screams, moans, whispers close by, a distant bell, dragged chains and growls. Everything is scheduled
// ahead on the audio clock (like music.js), so scripts can render it offline (scripts/music.mjs).

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (table) => {
  let r = Math.random() * table.reduce((s, x) => s + x[1], 0);
  for (const [k, w] of table) if ((r -= w) <= 0) return k;
  return table[0][0];
};

// what can be heard: [sound, weight] by act (0 The Ashen Warrens, 1 The Hollow Deep, 2 The Drowned Halls, 3 Varek's approach)
const DAY = [
  [['creak', 1.2], ['whistle', 1], ['crow', 0.8]],
  [['drip', 3], ['embers', 1.5], ['whistle', 1.2]],
  [['lap', 2.5], ['frog', 2], ['drip', 2], ['insects', 1.5]],
  [['whistle', 1.5], ['embers', 1.5], ['creak', 0.8], ['crow', 0.6]],
];
const NIGHT = [['scream', 2], ['moan', 2], ['whisper', 2], ['toll', 1], ['chains', 1.2], ['growl', 1.5], ['creak', 0.6]];
const GAP = { day: [1.6, 5], night: [4, 11] }; // seconds between sounds

export class Ambience {
  constructor(ctx, dest) {
    this.ctx = ctx;
    this.kind = null; this.act = 0;
    this.timer = null;
    this.level = 2; // overall loudness of the world's sounds
    this.out = ctx.createGain(); this.out.gain.value = this.level; this.out.connect(dest);

    const sr = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, sr * 3, sr);
    const nd = this.noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    // a big dark space: far sounds are mostly reverb
    const len = Math.floor(sr * 3.2), ir = ctx.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = Math.floor(sr * 0.03); i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-2.4 * i / sr);
    }
    this.rev = ctx.createConvolver(); this.rev.buffer = ir;
    const ret = ctx.createGain(); ret.gain.value = 0.5; this.rev.connect(ret); ret.connect(this.out);
  }

  // kind: 'day', 'night' or null (silence); act picks the day sounds
  set(kind, act = 0) {
    this.act = act;
    if (kind === this.kind) return;
    this._stopBed();
    this.kind = kind;
    clearInterval(this.timer); this.timer = null;
    if (!kind) return;
    const t = this.ctx.currentTime;
    this._bed(t);
    this.nextGust = t; this.nextSound = t + rand(1, 3);
    if (typeof window !== 'undefined' && !this.offline) this.timer = setInterval(() => this.tick(), 200);
    this.tick();
  }

  // quieter during boss fights
  duck(on) {
    const t = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(t); this.out.gain.setTargetAtTime(this.level * (on ? 0.35 : 1), t, 0.6);
  }

  tick(until) {
    if (!this.kind) return;
    const now = this.ctx.currentTime;
    if (until == null) until = now + 1.5;
    while (this.nextGust < until) { this._gust(Math.max(this.nextGust, now)); this.nextGust += rand(1.5, 4); }
    while (this.nextSound < until) {
      const t = Math.max(this.nextSound, now);
      const name = this.kind === 'night'
        ? (Math.random() < 0.2 ? pick(DAY[this.act] || DAY[0]) : pick(NIGHT))
        : pick(DAY[this.act] || DAY[0]);
      this._sound(name, t);
      const [a, b] = GAP[this.kind];
      this.nextSound += rand(a, b);
    }
  }

  // ---------- the wind ----------
  _bed(t) {
    const ctx = this.ctx, night = this.kind === 'night';
    const src = ctx.createBufferSource(); src.buffer = this.noise; src.loop = true;
    const fade = ctx.createGain(); fade.gain.setValueAtTime(0, t); fade.gain.linearRampToValueAtTime(1, t + 4);
    // a low rumble and an airy layer, each with its own gusting level
    const low = ctx.createBiquadFilter(); low.type = 'lowpass'; low.frequency.value = night ? 220 : 320;
    const lowG = ctx.createGain(); lowG.gain.value = night ? 0.09 : 0.06;
    const air = ctx.createBiquadFilter(); air.type = 'bandpass'; air.frequency.value = night ? 500 : 800; air.Q.value = 0.8;
    const airG = ctx.createGain(); airG.gain.value = 0.02;
    src.connect(low); low.connect(lowG); lowG.connect(fade);
    src.connect(air); air.connect(airG); airG.connect(fade);
    const layers = [{ g: airG.gain, f: air.frequency }];
    if (night) { // a howl: a narrow band of the wind that slides about
      const howl = ctx.createBiquadFilter(); howl.type = 'bandpass'; howl.frequency.value = 420; howl.Q.value = 14;
      const hg = ctx.createGain(); hg.gain.value = 0.0;
      src.connect(howl); howl.connect(hg); hg.connect(fade);
      layers.push({ g: hg.gain, f: howl.frequency, howl: true });
    }
    fade.connect(this.out);
    const w = ctx.createGain(); w.gain.value = 0.3; fade.connect(w); w.connect(this.rev);
    src.start(t, rand(0, 2));
    this.bed = { src, fade, layers };
  }
  _gust(t) {
    if (!this.bed) return;
    for (const L of this.bed.layers) {
      if (L.howl) { L.g.setTargetAtTime(Math.random() < 0.4 ? rand(0.04, 0.09) : 0.005, t, 1.2); L.f.setTargetAtTime(rand(300, 650), t, 1.5); continue; }
      L.g.setTargetAtTime(Math.random() < 0.3 ? rand(0.035, 0.06) : rand(0.008, 0.025), t, 1.1);
      L.f.setTargetAtTime(rand(500, 1300), t, 1.4);
    }
  }
  _stopBed() {
    if (!this.bed) return;
    const { src, fade } = this.bed, t = this.ctx.currentTime;
    fade.gain.cancelScheduledValues(t); fade.gain.setValueAtTime(fade.gain.value, t); fade.gain.linearRampToValueAtTime(0, t + 2);
    src.stop(t + 2.1);
    this.bed = null;
  }

  // ---------- sounds in the world ----------
  // a sound's chain: panned to one side, the farther the quieter, duller and wetter
  _place(t, dur, { pan = rand(-0.9, 0.9), dist = rand(0.3, 1), wet = 0.5 } = {}) {
    const ctx = this.ctx;
    const inp = ctx.createGain(); inp.gain.value = 1.15 - dist * 0.75;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 9000 * (1 - dist) + 1200;
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
    if (p.pan) p.pan.value = pan;
    inp.connect(lp); lp.connect(p); p.connect(this.out);
    const s = ctx.createGain(); s.gain.value = wet * (0.4 + dist * 0.8); p.connect(s); s.connect(this.rev);
    inp.panner = p;
    return inp;
  }
  _osc(type, f, t, end) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = f; o.start(t); o.stop(end); return o; }
  _src(t, end) { const s = this.ctx.createBufferSource(); s.buffer = this.noise; s.start(t, rand(0, 2)); s.stop(end); return s; }
  _bp(f, q = 1, type = 'bandpass') { const b = this.ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }
  _gain(v = 0) { const g = this.ctx.createGain(); g.gain.value = v; return g; }

  _sound(name, t) { this[name](t); }

  // old wood straining: a slow stick-slip buzz through a hollow resonance
  creak(t) {
    const dur = rand(0.5, 1.1), out = this._place(t, dur, { wet: 0.4 });
    const o = this._osc('sawtooth', rand(28, 45), t, t + dur + 0.1);
    o.frequency.linearRampToValueAtTime(rand(55, 90), t + dur);
    const bp = this._bp(rand(450, 800), 9), g = this._gain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.09, t + 0.08); g.gain.setValueAtTime(0.09, t + dur - 0.1); g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(bp); bp.connect(g); g.connect(out);
  }
  // a crow, far off
  crow(t) {
    const n = 1 + Math.floor(Math.random() * 3), out = this._place(t, n * 0.45, { dist: rand(0.6, 1), wet: 0.6 });
    for (let k = 0; k < n; k++) {
      const at = t + k * rand(0.38, 0.5), len = rand(0.18, 0.28);
      const o = this._osc('sawtooth', rand(520, 640), at, at + len + 0.05); o.frequency.exponentialRampToValueAtTime(rand(380, 460), at + len);
      const s = this._src(at, at + len), sg = this._gain(0.3);
      const bp = this._bp(1300, 2.5), g = this._gain();
      g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(0.06, at + 0.02); g.gain.setTargetAtTime(0, at + len * 0.6, 0.04);
      o.connect(bp); s.connect(sg); sg.connect(bp); bp.connect(g); g.connect(out);
    }
  }
  // water dripping in a cave (sometimes twice)
  drip(t) {
    const out = this._place(t, 1, { wet: 0.8 });
    for (let k = 0, n = Math.random() < 0.35 ? 2 : 1; k < n; k++) {
      const at = t + k * rand(0.25, 0.6), f = rand(900, 1600);
      const o = this._osc('sine', f, at, at + 0.12); o.frequency.exponentialRampToValueAtTime(f * 0.45, at + 0.05);
      const g = this._gain(); g.gain.setValueAtTime(0.07, at); g.gain.setTargetAtTime(0, at + 0.005, 0.025);
      o.connect(g); g.connect(out);
    }
  }
  // embers: a few soft snaps and a low breath of heat
  embers(t) {
    const out = this._place(t, 1.5, { dist: rand(0.3, 0.7), wet: 0.3 });
    for (let k = 0, n = 3 + Math.floor(Math.random() * 5); k < n; k++) {
      const at = t + rand(0, 1.2), len = rand(0.004, 0.012);
      const s = this._src(at, at + 0.03), bp = this._bp(rand(1500, 5000), 1.5), g = this._gain();
      g.gain.setValueAtTime(rand(0.04, 0.12), at); g.gain.setTargetAtTime(0, at + 0.001, len / 2);
      s.connect(bp); bp.connect(g); g.connect(out);
    }
    const s = this._src(t, t + 1.6), lp = this._bp(250, 0.7, 'lowpass'), g = this._gain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 0.6); g.gain.linearRampToValueAtTime(0, t + 1.5);
    s.connect(lp); lp.connect(g); g.connect(out);
  }
  // wind whistling through a gap in the stone
  whistle(t) {
    const dur = rand(1.8, 3.2), out = this._place(t, dur, { dist: rand(0.5, 1), wet: 0.6 });
    const s = this._src(t, t + dur + 0.1), bp = this._bp(rand(650, 1000), 28), g = this._gain();
    bp.frequency.setTargetAtTime(rand(600, 1200), t + 0.3, dur / 3);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(rand(0.15, 0.3), t + dur * 0.45); g.gain.linearRampToValueAtTime(0, t + dur);
    s.connect(bp); bp.connect(g); g.connect(out);
  }
  // water lapping at stone
  lap(t) {
    const out = this._place(t, 2, { dist: rand(0.2, 0.6), wet: 0.35 });
    for (let k = 0, n = 2 + Math.floor(Math.random() * 2); k < n; k++) {
      const at = t + k * rand(0.5, 0.8), len = rand(0.35, 0.6);
      const s = this._src(at, at + len + 0.1), lp = this._bp(rand(350, 600), 1.2, 'lowpass'), g = this._gain();
      lp.frequency.setTargetAtTime(200, at + len * 0.4, 0.1);
      g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(0.12, at + len * 0.35); g.gain.linearRampToValueAtTime(0, at + len);
      s.connect(lp); lp.connect(g); g.connect(out);
      const o = this._osc('sine', rand(260, 340), at + len * 0.3, at + len * 0.3 + 0.08); o.frequency.exponentialRampToValueAtTime(rand(420, 520), at + len * 0.3 + 0.06);
      const og = this._gain(); og.gain.setValueAtTime(0.03, at + len * 0.3); og.gain.setTargetAtTime(0, at + len * 0.3 + 0.01, 0.02);
      o.connect(og); og.connect(out);
    }
  }
  // a frog in the bog
  frog(t) {
    const n = 2 + Math.floor(Math.random() * 3), f = rand(100, 160), out = this._place(t, n * 0.35, { dist: rand(0.3, 0.9), wet: 0.3 });
    for (let k = 0; k < n; k++) {
      const at = t + k * rand(0.28, 0.38), len = rand(0.15, 0.22);
      const o = this._osc('square', f, at, at + len + 0.02), am = this._osc('square', rand(22, 32), at, at + len + 0.02);
      const amg = this._gain(0.5); const g = this._gain(0.5); am.connect(amg); amg.connect(g.gain);
      const bp = this._bp(rand(500, 700), 3), env = this._gain();
      env.gain.setValueAtTime(0, at); env.gain.linearRampToValueAtTime(0.07, at + 0.02); env.gain.setTargetAtTime(0, at + len * 0.7, 0.03);
      o.connect(g); g.connect(bp); bp.connect(env); env.connect(out);
    }
  }
  // insects trilling in the reeds
  insects(t) {
    const out = this._place(t, 1.5, { dist: rand(0.4, 0.9), wet: 0.3 }), f = rand(4200, 6000);
    for (let k = 0, n = 4 + Math.floor(Math.random() * 6); k < n; k++) {
      const at = t + k * rand(0.12, 0.18), len = 0.08;
      const o = this._osc('sine', f, at, at + len + 0.02), am = this._osc('square', rand(35, 50), at, at + len + 0.02);
      const amg = this._gain(0.5), g = this._gain(0.5); am.connect(amg); amg.connect(g.gain);
      const env = this._gain(); env.gain.setValueAtTime(0, at); env.gain.linearRampToValueAtTime(0.025, at + 0.01); env.gain.setTargetAtTime(0, at + len * 0.7, 0.01);
      o.connect(g); g.connect(env); env.connect(out);
    }
  }

  // ---------- Night Raid ----------
  // someone screaming, far away: a voice that rises, wavers and breaks off, through a throat's formants
  scream(t) {
    const male = Math.random() < 0.4, base = male ? rand(260, 340) : rand(520, 680), dur = rand(0.9, 1.6);
    const out = this._place(t, dur + 2, { dist: rand(0.65, 1), wet: 0.9 });
    const voice = this._gain(1);
    for (const det of [1, 1.006]) {
      const o = this._osc('sawtooth', base * det, t, t + dur + 0.2);
      o.frequency.setValueAtTime(base * det, t); o.frequency.exponentialRampToValueAtTime(base * 2 * det, t + 0.15);
      o.frequency.setValueAtTime(base * 2 * det, t + dur * 0.6); o.frequency.exponentialRampToValueAtTime(base * 1.25 * det, t + dur);
      const vib = this._osc('sine', rand(5, 7.5), t, t + dur + 0.2), vg = this._gain(base * 0.06);
      vib.connect(vg); vg.connect(o.frequency);
      o.connect(voice);
    }
    const breath = this._src(t, t + dur + 0.2), bg = this._gain(0.25), bbp = this._bp(2200, 1); breath.connect(bbp); bbp.connect(bg); bg.connect(voice);
    const env = this._gain();
    env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(0.12, t + 0.08); env.gain.setValueAtTime(0.12, t + dur * 0.7); env.gain.linearRampToValueAtTime(0, t + dur);
    const f1 = this._bp(male ? 700 : 1000, 4), f2 = this._bp(male ? 1700 : 2600, 6), g2 = this._gain(0.6);
    voice.connect(f1); voice.connect(f2); f2.connect(g2); f1.connect(env); g2.connect(env);
    env.connect(out);
  }
  // a low moan that sinks
  moan(t) {
    const dur = rand(2, 3.5), f = rand(120, 180), out = this._place(t, dur + 2, { dist: rand(0.4, 0.9), wet: 0.8 });
    const o = this._osc('sawtooth', f, t, t + dur + 0.2); o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * rand(0.7, 0.85), t + dur);
    const vib = this._osc('sine', rand(3.5, 5), t, t + dur + 0.2), vg = this._gain(f * 0.03); vib.connect(vg); vg.connect(o.frequency);
    const f1 = this._bp(450, 5), f2 = this._bp(800, 7), g2 = this._gain(0.5), env = this._gain();
    env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(0.16, t + dur * 0.35); env.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(f1); o.connect(f2); f2.connect(g2); f1.connect(env); g2.connect(env); env.connect(out);
  }
  // whispering, close by on one side: breathy syllables
  whisper(t) {
    const out = this._place(t, 2.5, { pan: (Math.random() < 0.5 ? -1 : 1) * rand(0.6, 1), dist: rand(0.05, 0.3), wet: 0.25 });
    const s = this._src(t, t + 2.6), bp = this._bp(2500, 3), hp = this._bp(1200, 0.7, 'highpass'), g = this._gain();
    s.connect(hp); hp.connect(bp); bp.connect(g); g.connect(out);
    let at = t;
    for (let k = 0, n = 5 + Math.floor(Math.random() * 9); k < n; k++) {
      const len = rand(0.06, 0.16);
      bp.frequency.setValueAtTime(rand(1500, 4500), at);
      g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(rand(0.08, 0.16), at + len * 0.3); g.gain.linearRampToValueAtTime(0, at + len);
      at += len + (Math.random() < 0.2 ? rand(0.15, 0.3) : rand(0.01, 0.05));
    }
  }
  // a bell tolling somewhere far off
  toll(t) {
    const out = this._place(t, 7, { dist: rand(0.75, 1), wet: 1 }), f = rand(140, 160);
    for (const [r, a, dec] of [[1, 1, 2.5], [2, 0.5, 1.6], [2.76, 0.4, 1.1], [5.4, 0.15, 0.5]]) {
      const o = this._osc('sine', f * r, t, t + dec * 4), g = this._gain();
      g.gain.setValueAtTime(0.14 * a, t); g.gain.setTargetAtTime(0, t + 0.005, dec);
      o.connect(g); g.connect(out);
    }
  }
  // chains dragged over stone
  chains(t) {
    const dur = rand(0.9, 1.6), out = this._place(t, dur, { dist: rand(0.3, 0.8), wet: 0.5 });
    for (let k = 0, n = 5 + Math.floor(Math.random() * 7); k < n; k++) {
      const at = t + rand(0, dur), f = rand(1800, 4200);
      for (const [r, a] of [[1, 1], [2.4, 0.5], [3.9, 0.3]]) {
        const o = this._osc('triangle', f * r, at, at + 0.25), g = this._gain();
        g.gain.setValueAtTime(0.035 * a, at); g.gain.setTargetAtTime(0, at + 0.002, 0.04);
        o.connect(g); g.connect(out);
      }
    }
    const s = this._src(t, t + dur), bp = this._bp(3000, 1), g = this._gain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.03, t + dur * 0.5); g.gain.linearRampToValueAtTime(0, t + dur);
    s.connect(bp); bp.connect(g); g.connect(out);
  }
  // something growling in the dark
  growl(t) {
    const dur = rand(1.2, 2.2), out = this._place(t, dur + 1, { dist: rand(0.25, 0.7), wet: 0.4 });
    const o = this._osc('sawtooth', rand(50, 75), t, t + dur + 0.1), s = this._src(t, t + dur + 0.1);
    const lp = this._bp(380, 1.5, 'lowpass'), sg = this._gain(0.6);
    const am = this._osc('sine', rand(16, 28), t, t + dur + 0.1), amg = this._gain(0.5), rough = this._gain(0.5);
    am.connect(amg); amg.connect(rough.gain);
    o.connect(lp); s.connect(sg); sg.connect(lp); lp.connect(rough);
    const env = this._gain();
    env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(0.3, t + dur * 0.4); env.gain.linearRampToValueAtTime(0, t + dur);
    rough.connect(env); env.connect(out);
  }
}
