// The soundtrack: songs written as note patterns, played by a 16-bit style band (pulse
// leads, triangle bass, noise drums) over an orchestral layer (strings, choir, brass stabs,
// timpani, a bell) in a cathedral reverb. Works on any BaseAudioContext, so scripts can
// render it offline (scripts/music.mjs).
//
// Patterns are one token per 16th note: a note ("D5", "C#4", "Bb3") starts a note, "-" holds
// it, "." is a rest. Bass and arpeggio patterns use chord-relative letters/digits instead.

const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const midi = (n) => {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(n);
  if (!m) throw new Error('bad note ' + n);
  return 12 * (+m[3] + 1) + PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
};
const hz = (m) => 440 * 2 ** ((m - 69) / 12);

const CHORDS = {
  Dm: ['D', 'F', 'A'], Bb: ['Bb', 'D', 'F'], Gm: ['G', 'Bb', 'D'], A: ['A', 'C#', 'E'],
  C: ['C', 'E', 'G'], Eb: ['Eb', 'G', 'Bb'], F: ['F', 'A', 'C'],
};
// the chord's tones stacked upward from its root in octave `oct`
const voicing = (name, oct) => {
  const out = [];
  for (const n of CHORDS[name]) {
    let m = midi(n + oct);
    while (out.length && m <= out[out.length - 1]) m += 12;
    out.push(m);
  }
  return out;
};

const toks = (s) => s.trim().split(/\s+/);
// "D5 - - . A4 -" -> [{ at, len, sym }]
function parse(s) {
  const ev = [];
  toks(s).forEach((t, i) => {
    if (t === '-') { if (ev.length && ev[ev.length - 1].open) ev[ev.length - 1].len++; return; }
    if (ev.length) ev[ev.length - 1].open = false;
    if (t !== '.') ev.push({ at: i, len: 1, sym: t, open: true });
  });
  return ev;
}
// a pattern given as one string (repeats every bar) or one string per bar (cycles)
const barPat = (p, bar) => (Array.isArray(p) ? p[bar % p.length] : p);

// ---------- compile a song into a flat list of steps, each a list of note events ----------
function compileSection(S) {
  const steps = Array.from({ length: S.bars * 16 }, () => []);
  const add = (at, e) => at < steps.length && steps[at].push(e);
  // chord at each step ("Gm A" splits the bar evenly)
  const chordAt = [];
  const segs = []; // { at, len, name }
  S.chords.forEach((c, b) => {
    const parts = c.split(' '), w = 16 / parts.length;
    parts.forEach((name, k) => {
      segs.push({ at: b * 16 + k * w, len: w, name });
      for (let i = 0; i < w; i++) chordAt[b * 16 + k * w + i] = name;
    });
  });

  // melodic lines: whole-section strings so notes can tie across bar lines
  for (const [inst, key] of [['lead', 'lead'], ['harm', 'harm'], ['bell', 'bell'], ['bass', 'bassLine']]) {
    if (!S[key]) continue;
    for (const e of parse(S[key].join(' '))) add(e.at, { i: inst, m: midi(e.sym), len: e.len, v: 1 });
  }
  if (S.strings) for (const g of segs) add(g.at, { i: 'strings', m: voicing(g.name, 3), len: g.len, v: S.strings });
  if (S.choir) for (const g of segs) { const v = voicing(g.name, 4); add(g.at, { i: 'choir', m: [v[0] - 12, v[2], v[0] + 12], len: g.len, v: S.choir }); }

  for (let b = 0; b < S.bars; b++) {
    const last = b === S.bars - 1, o = b * 16;
    const pat = (k) => (last && S.fill?.[k] != null ? S.fill[k] : S[k] != null ? barPat(S[k], b) : null);
    // bass: r root, o root an octave up, f fifth, t third
    const bp = pat('bass');
    if (bp) for (const e of parse(bp)) {
      const v = voicing(chordAt[o + e.at], 2);
      const m = { r: v[0], o: v[0] + 12, f: v[2], t: v[1] }[e.sym.toLowerCase()];
      add(o + e.at, { i: 'bass', m, len: e.len, v: e.sym === e.sym.toUpperCase() ? 1 : 0.8 });
    }
    // arpeggio: digits index the chord's tones going up from octave 4
    const ap = pat('arp');
    if (ap) for (const e of parse(ap)) {
      const v = voicing(chordAt[o + e.at], 4), all = [...v, ...v.map((x) => x + 12)];
      add(o + e.at, { i: 'arp', m: all[+e.sym], len: e.len, v: 1 });
    }
    // brass stabs on the chord (x, X accented)
    const br = pat('brass');
    if (br) for (const e of parse(br)) add(o + e.at, { i: 'brass', m: voicing(chordAt[o + e.at], 4), len: e.len, v: e.sym === 'X' ? 1 : 0.7 });
    // drums: X accent, x normal, o ghost; timpani r root / f fifth (upper case accented)
    const D = S.drums || {};
    for (const k of ['kick', 'snare', 'hat', 'crash', 'timp']) {
      const p = last && S.fill?.[k] != null ? S.fill[k] : D[k] != null ? barPat(D[k], b) : null;
      if (!p) continue;
      toks(p).forEach((t, i) => {
        if (t === '.' || t === '-') return;
        const v = t === 'X' || t === 'R' || t === 'F' ? 1 : t === 'o' ? 0.4 : 0.7;
        let m = 0;
        if (k === 'timp') { const c = voicing(chordAt[o + i], 2); m = t.toLowerCase() === 'f' ? c[2] - 12 : c[0]; }
        add(o + i, { i: k, m, len: 1, v });
      });
    }
    if (b === 0 && S.crash) add(0, { i: 'crash', m: 0, len: 1, v: S.crash });
  }
  return steps;
}
const compile = (song) => ({
  ...song,
  intro: (song.intro || []).flatMap(compileSection),
  loop: song.loop.flatMap(compileSection),
});

// ---------- Varek, the Throne of Ash: D minor, 16-bit lead over a dark orchestra ----------
const A_LEAD = [
  'D5 - - - - - A4 - Bb4 - A4 - G4 - A4 -',
  'F5 - - - - - D5 - Bb4 - - - C5 - D5 -',
  'G5 - - - F5 - E5 - D5 - - - E5 - F5 -',
  'E5 - - - - - - - C#5 - - - A4 - - -',
  'D5 - - - - - A4 - Bb4 - A4 - G4 - A4 -',
  'F5 - - - - - G5 - A5 - - - G5 - F5 -',
  'G5 - - - Bb5 - A5 - G5 - F5 - E5 - C#5 -',
  'D5 - - - - - - - - - - - . . . .',
];
const A_HARM = [
  'F4 - - - - - F4 - G4 - F4 - E4 - F4 -',
  'D5 - - - - - Bb4 - F4 - - - A4 - Bb4 -',
  'D5 - - - D5 - C5 - Bb4 - - - C5 - D5 -',
  'C#5 - - - - - - - A4 - - - E4 - - -',
  'F4 - - - - - F4 - G4 - F4 - E4 - F4 -',
  'D5 - - - - - Eb5 - F5 - - - Eb5 - D5 -',
  'D5 - - - G5 - F5 - E5 - D5 - C#5 - A4 -',
  'A4 - - - - - - - - - - - . . . .',
];
const A_CHORDS = ['Dm', 'Bb', 'Gm', 'A', 'Dm', 'Bb', 'Gm A', 'Dm'];
const B_LEAD = [
  'D5 - - - F5 - - - Bb5 - - - A5 - G5 -',
  'A5 - - - - - G5 - E5 - - - C5 - E5 -',
  'F5 - - - - - - - E5 - D5 - E5 - F5 -',
  'A5 - - - - - - - - - - - . . . .',
  'D6 - - - C6 - Bb5 - A5 - - - G5 - F5 -',
  'G5 - - - - - E5 - C5 - - - E5 - G5 -',
  'A5 - - - G5 - F5 - E5 - - - F5 - G5 -',
  'C#6 - - - - - - - A5 - - - . . . .',
];
const D_LEAD = [
  'D5 - A4 - D5 - F5 - E5 - D5 - A5 - - -',
  'G5 - - - Eb5 - - - Bb4 - - - G5 - F5 -',
  'F5 - - - - - D5 - A5 - - - F5 - D5 -',
  'Eb5 - - - - - - - G5 - - - Bb5 - - -',
  'D6 - - - - - Bb5 - F5 - - - Bb5 - D6 -',
  'E6 - - - - - C6 - G5 - - - C6 - E6 -',
  'F6 - - - E6 - - - D6 - - - C#6 - - -',
  'E6 - - - - - - - - - - - - - - -',
];

const SNARE_ROLL = 'x . . . x . . . x . x . X X X X';
const DR1 = { // phase 1: a steady march under the gallop
  kick: 'X . . . . . x . X . x . . . . .',
  snare: '. . . . X . . . . . . . X . . .',
  hat: 'x . o . x . o . x . o . x . o .',
  timp: ['R . . . . . . . . . . . . . . .', '. . . . . . . . . . . . . . . .'],
};
const DR1B = { // the B section pushes harder
  kick: 'X . . . x . X . X . . . x . X .',
  snare: '. . . . X . . . . . . . X . . x',
  hat: 'x o x o x o x o x o x o x o x o',
  timp: 'R . . . . . r . . . . . r . . .',
};
const DR2 = { // phase 2: double-time kick, sixteenth hats
  kick: 'X . x . X . x . X . x . X . x x',
  snare: '. . . . X . . . . . . . X . . .',
  hat: 'x o x o x o x o x o x o x o x o',
  timp: ['R . . . . . . . R . . . . . . .', 'R . . . . . r . . . . . r . . .'],
};

const varekA = (drums, extra = {}) => ({
  bars: 8, chords: A_CHORDS, lead: A_LEAD, strings: 1, crash: 0.8,
  bass: 'r - r r r - r r o - o o r - f -',
  arp: '0 1 2 1 3 2 1 2 0 1 2 1 3 2 4 2',
  brass: ['X - . . . . . . . . . . . . . .', 'x - . . . . . . . . . . . . . .', 'X - . . . . . . . . . . . . . .', 'X - . . . . X - . . X - X - . .'],
  drums, fill: { snare: SNARE_ROLL, timp: 'R . . . r . . . r . r . R . R .' },
  ...extra,
});
const varekB = (drums) => ({
  bars: 8, chords: ['Bb', 'C', 'Dm', 'Dm', 'Bb', 'C', 'A', 'A'], lead: B_LEAD, strings: 1, choir: 0.8, crash: 1,
  bass: 'r - r - r - r - o - r - r - o -',
  brass: 'X - . . . . x - . . . . x - . .',
  drums, fill: { snare: 'X . X . X . X X X X X X X X X X', timp: 'R . . . r . . . r . r . R R R R', brass: 'X - - - - - - - . . . . . . . .' },
});

const SONGS = {
  varek1: {
    bpm: 132,
    intro: [{
      bars: 4, chords: ['Dm', 'Dm', 'Eb', 'A'], strings: 0.8, choir: 0.7,
      bell: ['D4 - - - - - - - - - - - - - - -', '. . . . . . . . . . . . . . . .', 'D4 - - - - - - - - - - - - - - -', '. . . . . . . . . . . . . . . .'],
      bass: 'r - - - - - - - - - - - - - - -',
      drums: { timp: ['R . . . . . . . . . . . . . . .', '. . . . . . . . r . . . . . . .', 'R . . . . . . . . . . . . . . .', 'r . r . r . r . r r r r R R R R'] },
    }],
    loop: [
      varekA(DR1),
      varekB(DR1B),
      { // breath: Phrygian stabs and the arpeggio, no melody
        bars: 4, chords: ['Dm', 'Eb', 'Dm', 'Eb'], strings: 0.6, choir: 0.9, crash: 0.6,
        bass: 'r - r - r - r - r - r - r - r -',
        arp: '0 . 0 2 1 . 0 . 0 . 0 2 1 . 3 .',
        brass: 'X - . X - . X - . . . . . . . .',
        drums: { kick: 'X . . X . . X . . . X . X . . .', snare: '. . . . . . . . X . . . . . . .', hat: 'x . x . x . x . x . x . x . x .', timp: 'R . . r . . R . . . . . . . . .' },
        fill: { snare: '. . . . x . . . X . X . X X X X' },
      },
      varekA(DR1, { harm: A_HARM, choir: 0.6 }),
    ],
  },
  varek2: {
    bpm: 148,
    intro: [{ // he ignites: a roll and a swell into the new theme
      bars: 1, chords: ['A'], strings: 1, choir: 1, crash: 1,
      lead: ['A4 - - - - - - - A4 Bb4 C#5 D5 E5 F5 G5 E5'],
      bass: 'r - - - - - - - . . . . . . . .',
      brass: 'X - - - - - - - . . . . . . . .',
      drums: { snare: 'x x x x x x x x X X X X X X X X', timp: 'R . r . r . r . r r r r R R R R' },
    }],
    loop: [
      {
        bars: 8, chords: ['Dm', 'Eb', 'Dm', 'Eb', 'Bb', 'C', 'A', 'A'], lead: D_LEAD, strings: 1, choir: 1, crash: 1,
        bass: 'r - r r o - r r r - r r o - r r',
        arp: '0 1 2 3 4 3 2 1 0 1 2 3 4 3 2 1',
        brass: 'X - . . . . X - . . . . X - X -',
        drums: DR2, fill: { snare: SNARE_ROLL, timp: 'R . . . r . . . r . r . R R R R' },
      },
      varekA(DR2, { harm: A_HARM, choir: 0.8 }),
      varekB(DR2),
    ],
  },
};
export const SONG_NAMES = Object.keys(SONGS);
const COMPILED = {};
const getSong = (name) => (COMPILED[name] ||= compile(SONGS[name]));

// ---------- the band ----------
export class Music {
  // dest: where the music goes (the game's music bus, or an offline context's destination)
  constructor(ctx, dest) {
    this.ctx = ctx;
    this.cur = null;     // the song playing: { name, steps, pos, t, dt, out, wet, pending }
    this.solo = null;    // a Set of instrument names to hear alone (for testing)
    this.timer = null;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 8; comp.ratio.value = 3;
    comp.attack.value = 0.01; comp.release.value = 0.25;
    // a hard limiter last so nothing clips
    const lim = ctx.createDynamicsCompressor();
    lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.1;
    comp.connect(lim); lim.connect(dest);
    this.bus = ctx.createGain(); this.bus.gain.value = 0.45;
    this.bus.connect(comp);

    // cathedral reverb: a few seconds of decaying stereo noise
    const sr = ctx.sampleRate, len = Math.floor(sr * 2.8);
    const ir = ctx.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = Math.floor(sr * 0.02); i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-3 * i / sr);
    }
    this.rev = ctx.createConvolver(); this.rev.buffer = ir;
    const ret = ctx.createGain(); ret.gain.value = 0.55;
    this.rev.connect(ret); ret.connect(this.bus);

    this.noise = ctx.createBuffer(1, sr * 2, sr);
    const nd = this.noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    // band-limited pulse waves (the NES's 12.5%, 25% and 50% duty cycles)
    const pulse = (duty) => {
      const N = 64, re = new Float32Array(N), im = new Float32Array(N);
      for (let n = 1; n < N; n++) re[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
      return ctx.createPeriodicWave(re, im);
    };
    this.waves = { p12: pulse(0.125), p25: pulse(0.25), p50: pulse(0.5) };
  }

  // Start a song. If one is already playing it switches on the next bar line.
  play(name, fade = 1.5) {
    if (!SONGS[name]) return;
    const cur = this.cur;
    if (cur) { if (cur.name !== name) cur.pending = name; else cur.pending = null; return; }
    const ctx = this.ctx, t = ctx.currentTime + 0.05;
    const out = ctx.createGain(), wet = ctx.createGain();
    out.connect(this.bus); wet.connect(this.rev);
    out.gain.setValueAtTime(0.0001, t); out.gain.exponentialRampToValueAtTime(1, t + fade);
    wet.gain.setValueAtTime(0.0001, t); wet.gain.exponentialRampToValueAtTime(1, t + fade);
    this.cur = this._song(name, t, out, wet);
    if (typeof window !== 'undefined' && !this.timer && !this.offline) {
      this.timer = setInterval(() => this.tick(), 50);
    }
    this.tick();
  }

  stop(fade = 1.2) {
    clearInterval(this.timer); this.timer = null;
    const cur = this.cur; this.cur = null;
    if (!cur) return;
    const t = this.ctx.currentTime;
    for (const g of [cur.out, cur.wet]) {
      g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + fade);
    }
    setTimeout(() => { cur.out.disconnect(); cur.wet.disconnect(); }, fade * 1000 + 600);
  }

  get playing() { return this.cur?.name || null; }

  _song(name, t, out, wet) {
    const s = getSong(name);
    return { name, s, pos: 0, t, dt: 60 / s.bpm / 4, out, wet, pending: null };
  }

  // schedule every step that starts before `until` (seconds on the audio clock)
  tick(until) {
    const now = this.ctx.currentTime;
    if (until == null) until = now + (typeof document !== 'undefined' && document.hidden ? 1.5 : 0.3);
    let c = this.cur;
    while (c && c.t < until) {
      if (c.pending && c.pos % 16 === 0) { c = this.cur = this._song(c.pending, c.t, c.out, c.wet); }
      if (c.t >= now - 0.02) {
        const { intro, loop } = c.s;
        const step = c.pos < intro.length ? intro[c.pos] : loop[(c.pos - intro.length) % loop.length];
        for (const e of step) if (!this.solo || this.solo.has(e.i)) this[e.i](c.t, e.len * c.dt, e.m, e.v, c);
      }
      c.t += c.dt; c.pos++;
    }
  }

  // ---------- instruments: (start time, length in seconds, midi note(s), velocity, song) ----------
  _out(node, c, wet = 0, pan = 0) {
    let n = node;
    if (pan && this.ctx.createStereoPanner) { const p = this.ctx.createStereoPanner(); p.pan.value = pan; node.connect(p); n = p; }
    n.connect(c.out);
    if (wet) { const g = this.ctx.createGain(); g.gain.value = wet; n.connect(g); g.connect(c.wet); }
  }
  // attack, hold at `peak` (decaying to peak*sus), then release
  _env(t, d, peak, { a = 0.005, sus = 1, dec = 0.1, rel = 0.08 } = {}) {
    const g = this.ctx.createGain(), p = g.gain;
    p.setValueAtTime(0, t); p.linearRampToValueAtTime(peak, t + a);
    if (sus < 1) p.setTargetAtTime(peak * sus, t + a, dec);
    p.setTargetAtTime(0, t + Math.max(d, a), rel / 3);
    return g;
  }
  _osc(type, f, t, end, detune = 0) {
    const o = this.ctx.createOscillator();
    if (this.waves[type]) o.setPeriodicWave(this.waves[type]); else o.type = type;
    o.frequency.value = f; o.detune.value = detune;
    o.start(t); o.stop(end);
    return o;
  }
  _noiseSrc(t, end) {
    const s = this.ctx.createBufferSource(); s.buffer = this.noise;
    s.start(t, Math.random() * 1.5); s.stop(end);
    return s;
  }
  _filter(type, f, q = 0.7) { const b = this.ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }
  // delayed vibrato, the classic 16-bit lead wobble
  _vibrato(oscs, t, end, f, depth = 0.006, rate = 5.5, delay = 0.2) {
    if (end - t < delay + 0.1) return;
    const l = this.ctx.createOscillator(); l.frequency.value = rate;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t + delay); g.gain.linearRampToValueAtTime(f * depth, t + delay + 0.3);
    l.connect(g); oscs.forEach((o) => g.connect(o.frequency));
    l.start(t); l.stop(end);
  }

  lead(t, d, m, v, c) {
    const f = hz(m), end = t + d + 0.3;
    const a = this._osc('p25', f, t, end), b = this._osc('p12', f, t, end, 9);
    const bg = this.ctx.createGain(); bg.gain.value = 0.4;
    const lp = this._filter('lowpass', 5200);
    const g = this._env(t, d * 0.95, 0.22 * v, { a: 0.006, sus: 0.75, dec: 0.12, rel: 0.09 });
    a.connect(lp); b.connect(bg); bg.connect(lp); lp.connect(g);
    this._vibrato([a, b], t, end, f);
    this._out(g, c, 0.28, 0);
  }
  harm(t, d, m, v, c) {
    const f = hz(m), end = t + d + 0.3;
    const a = this._osc('p50', f, t, end);
    const lp = this._filter('lowpass', 3000);
    const g = this._env(t, d * 0.95, 0.11 * v, { a: 0.008, sus: 0.7, dec: 0.12, rel: 0.09 });
    a.connect(lp); lp.connect(g);
    this._vibrato([a], t, end, f, 0.005, 5.2, 0.25);
    this._out(g, c, 0.3, -0.3);
  }
  arp(t, d, m, v, c) {
    const f = hz(m), end = t + 0.45;
    const o = this._osc('p12', f, t, end);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.12 * v, t); g.gain.setTargetAtTime(0, t + 0.01, 0.07);
    o.connect(g);
    this._out(g, c, 0.4, 0.35);
  }
  bass(t, d, m, v, c) {
    const f = hz(m), end = t + d + 0.2;
    const tri = this._osc('triangle', f, t, end), saw = this._osc('sawtooth', f, t, end, -4);
    const lp = this._filter('lowpass', 650, 1.2);
    const sg = this.ctx.createGain(); sg.gain.value = 0.35;
    const g = this._env(t, d * 0.9, 0.15 * v, { a: 0.004, sus: 0.65, dec: 0.1, rel: 0.05 });
    tri.connect(g); saw.connect(sg); sg.connect(lp); lp.connect(g);
    this._out(g, c, 0.04);
  }
  strings(t, d, ms, v, c) {
    const end = t + d + 1.2;
    const lp = this._filter('lowpass', 1500, 0.5);
    const g = this._env(t, d, 0.042 * v, { a: 0.28, rel: 0.7 });
    for (const m of ms) for (const det of [-8, 7]) this._osc('sawtooth', hz(m), t, end, det).connect(lp);
    lp.connect(g);
    this._out(g, c, 0.5);
  }
  choir(t, d, ms, v, c) {
    const end = t + d + 1.6;
    const sum = this.ctx.createGain(); sum.gain.value = 1;
    // "aah": formant band-passes over a buzzy source
    const f1 = this._filter('bandpass', 760, 5), f2 = this._filter('bandpass', 1150, 7), f3 = this._filter('bandpass', 2800, 8);
    const g2 = this.ctx.createGain(); g2.gain.value = 0.55; const g3 = this.ctx.createGain(); g3.gain.value = 0.25;
    sum.connect(f1); sum.connect(f2); sum.connect(f3); f2.connect(g2); f3.connect(g3);
    const g = this._env(t, d, 0.2 * v, { a: 0.45, rel: 1.0 });
    f1.connect(g); g2.connect(g); g3.connect(g);
    const oscs = [];
    for (const m of ms) for (const det of [-6, 5]) { const o = this._osc('sawtooth', hz(m), t, end, det); o.connect(sum); oscs.push(o); }
    this._vibrato(oscs, t, end, hz(ms[0]), 0.004, 4.6, 0.1);
    this._out(g, c, 0.75);
  }
  brass(t, d, ms, v, c) {
    const end = t + d + 0.5;
    const lp = this._filter('lowpass', 400, 2.5), fq = lp.frequency;
    fq.setValueAtTime(400, t); fq.exponentialRampToValueAtTime(3400 * (0.7 + 0.3 * v), t + 0.035); fq.setTargetAtTime(1100, t + 0.05, 0.14);
    const g = this._env(t, d * 0.9, 0.07 * v, { a: 0.01, sus: 0.6, dec: 0.15, rel: 0.12 });
    for (const m of ms) for (const det of [-6, 6]) this._osc('sawtooth', hz(m), t, end, det).connect(lp);
    lp.connect(g);
    this._out(g, c, 0.35);
  }
  bell(t, d, m, v, c) {
    const f = hz(m);
    [[1, 1, 3.5], [2, 0.5, 2.2], [2.76, 0.35, 1.5], [4.07, 0.2, 1], [5.4, 0.12, 0.6]].forEach(([r, a, dec]) => {
      const o = this._osc('sine', f * r, t, t + dec * 3);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.09 * a * v, t); g.gain.setTargetAtTime(0, t + 0.005, dec / 2);
      o.connect(g); this._out(g, c, 0.65);
    });
  }
  timp(t, d, m, v, c) {
    const f = hz(m), end = t + 2;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.3 * v, t); g.gain.setTargetAtTime(0, t + 0.01, 0.32);
    for (const [r, a] of [[1, 1], [1.5, 0.35], [2, 0.3]]) {
      const o = this._osc('sine', f * r * 1.05, t, end);
      o.frequency.setTargetAtTime(f * r, t, 0.03);
      const og = this.ctx.createGain(); og.gain.value = a; o.connect(og); og.connect(g);
    }
    const n = this._noiseSrc(t, t + 0.15), lp = this._filter('lowpass', 500);
    const ng = this.ctx.createGain(); ng.gain.setValueAtTime(0.3 * v, t); ng.gain.setTargetAtTime(0, t, 0.025);
    n.connect(lp); lp.connect(ng); ng.connect(g);
    this._out(g, c, 0.4);
  }
  kick(t, d, m, v, c) {
    const o = this._osc('sine', 150, t, t + 0.4);
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(46, t + 0.11);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.26 * v, t); g.gain.setTargetAtTime(0, t + 0.02, 0.09);
    o.connect(g);
    const n = this._noiseSrc(t, t + 0.02), hp = this._filter('highpass', 2500);
    const ng = this.ctx.createGain(); ng.gain.value = 0.12 * v; n.connect(hp); hp.connect(ng); ng.connect(g);
    this._out(g, c, 0.05);
  }
  snare(t, d, m, v, c) {
    const n = this._noiseSrc(t, t + 0.3), hp = this._filter('highpass', 1100);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.3 * v, t); g.gain.setTargetAtTime(0, t + 0.005, 0.05);
    n.connect(hp); hp.connect(g);
    const o = this._osc('triangle', 220, t, t + 0.15);
    o.frequency.exponentialRampToValueAtTime(150, t + 0.08);
    const og = this.ctx.createGain(); og.gain.setValueAtTime(0.25 * v, t); og.gain.setTargetAtTime(0, t + 0.005, 0.03);
    o.connect(og); og.connect(g);
    this._out(g, c, 0.25);
  }
  hat(t, d, m, v, c) {
    const n = this._noiseSrc(t, t + 0.08), hp = this._filter('highpass', 7500);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.15 * v, t); g.gain.setTargetAtTime(0, t + 0.002, 0.014);
    n.connect(hp); hp.connect(g);
    this._out(g, c, 0.1, -0.2);
  }
  crash(t, d, m, v, c) {
    const n = this._noiseSrc(t, t + 2.2), hp = this._filter('highpass', 3800);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.16 * v, t); g.gain.setTargetAtTime(0, t + 0.01, 0.45);
    n.connect(hp); hp.connect(g);
    this._out(g, c, 0.45, 0.15);
  }
}
