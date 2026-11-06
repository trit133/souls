// Title logo: the name drawn in chunky low-res pixels, extruded like an old arcade logo,
// burning with demo-scene fire (heat rises off the letters, drifts and cools). The canvas is
// tiny and scaled up with nearest-neighbour filtering; the 3D tilt is CSS (.fire-title).
const W = 240, H = 76, DEPTH = 5, FPS = 30;

// fire ramp, cool to hot: hard steps, the coolest ones translucent so smoke fades out
const FIRE = [
  [0, 0, 0, 0], [40, 8, 4, 70], [70, 14, 6, 140], [110, 24, 8, 200], [150, 36, 8, 255], [190, 58, 10, 255],
  [224, 92, 14, 255], [240, 136, 24, 255], [248, 186, 48, 255], [252, 226, 128, 255], [255, 248, 214, 255],
];
const MAXHEAT = 36;
// letter face, top to bottom: white-hot rim down to deep ember
const FACE = [[255, 246, 196], [255, 214, 104], [250, 166, 46], [226, 104, 22], [176, 52, 14], [120, 28, 10]];
const EXTRUDE = [[96, 26, 10], [78, 20, 8], [62, 15, 7], [48, 11, 6], [34, 8, 5]];
const OUTLINE = [22, 6, 3];

export class FireTitle {
  constructor(canvas, text) {
    this.cv = canvas; canvas.width = W; canvas.height = H;
    this.ctx = canvas.getContext('2d');
    this.img = this.ctx.createImageData(W, H);
    this.heat = new Uint8Array(W * H);
    this.seed = 1;
    this.buildMask(text);
    this.still = matchMedia('(prefers-reduced-motion: reduce)');
    this.acc = 0; this.last = 0; this.time = 0;
    // settle the fire before the first frame so it doesn't start from cold
    for (let i = 0; i < 60; i++) this.step();
    this.draw();
    requestAnimationFrame((t) => this.loop(t));
  }

  rand() { this.seed = (this.seed * 1664525 + 1013904223) >>> 0; return this.seed / 4294967296; }

  buildMask(text) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    const gap = 3;
    let size = 34, widths;
    const measure = () => {
      g.font = `bold ${size}px Georgia, 'Times New Roman', serif`;
      widths = [...text].map((ch) => (ch === ' ' ? size * 0.35 : g.measureText(ch).width));
      return widths.reduce((a, b) => a + b, 0) + gap * (text.length - 1);
    };
    while (measure() > W - 12 - DEPTH && size > 10) size--;
    let x = Math.round((W - DEPTH - measure()) / 2);
    const base = H - DEPTH - 5;
    g.fillStyle = '#fff'; g.textBaseline = 'alphabetic';
    [...text].forEach((ch, i) => { g.fillText(ch, x, base); x += widths[i] + gap; });
    const a = g.getImageData(0, 0, W, H).data;
    this.mask = new Uint8Array(W * H);
    let top = H, bot = 0;
    for (let i = 0; i < W * H; i++) if (a[i * 4 + 3] > 110) {
      this.mask[i] = 1;
      const y = (i / W) | 0; top = Math.min(top, y); bot = Math.max(bot, y);
    }
    this.top = top; this.bot = bot;
  }

  // one tick of the fire: letters feed heat, every cell drifts up a row, jitters sideways and cools
  step() {
    const h = this.heat, m = this.mask;
    for (let i = 0; i < W * H; i++) if (m[i]) h[i] = this.rand() < 0.85 ? MAXHEAT - ((this.rand() * 6) | 0) : 12;
    for (let y = 1; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const src = y * W + x, v = h[src];
        const r = (this.rand() * 3) | 0;
        const dst = src - W + r - 1;
        if (dst < 0) continue;
        h[dst] = v === 0 ? 0 : Math.max(0, v - ((this.rand() * 2.4) | 0));
      }
    }
    this.time += 1 / FPS;
  }

  draw() {
    const d = this.img.data, m = this.mask, h = this.heat, t = this.time;
    const span = Math.max(1, this.bot - this.top);
    const at = (x, y) => x >= 0 && y >= 0 && x < W && y < H && m[y * W + x] === 1;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x, o = i * 4;
        let c = null, a = 255;
        if (m[i]) {
          // face: banded gradient whose bands waver like heat shimmer
          const wob = Math.sin(x * 0.21 + t * 5.3) * 0.06 + Math.sin(x * 0.07 - t * 2.1) * 0.05;
          let k = Math.floor(((y - this.top) / span + wob) * FACE.length);
          if (!at(x, y - 1)) k -= 1;          // lit top edge
          if (!at(x, y + 1)) k += 1;          // shaded bottom edge
          c = FACE[Math.max(0, Math.min(FACE.length - 1, k))];
        } else {
          // extrusion: the letter repeated down and to the right, darker the deeper it goes
          for (let s = 1; s <= DEPTH; s++) if (at(x - (s >> 1), y - s)) { c = EXTRUDE[s - 1]; break; }
          if (!c && (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1))) c = OUTLINE;
          if (!c) {
            const v = h[i];
            if (v) { const f = FIRE[Math.min(FIRE.length - 1, Math.ceil((v / MAXHEAT) * (FIRE.length - 1)))]; c = f; a = f[3]; }
          }
        }
        if (c) { d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = a; } else d[o + 3] = 0;
      }
    }
    this.ctx.putImageData(this.img, 0, 0);
  }

  loop(now) {
    requestAnimationFrame((t) => this.loop(t));
    const dt = Math.min(0.1, (now - this.last) / 1000 || 0);
    this.last = now;
    // only burn while the title is on screen, and hold still for reduced motion
    if (this.cv.offsetParent === null || this.still.matches) return;
    this.acc += dt;
    if (this.acc < 1 / FPS) return;
    this.acc = 0;
    this.step();
    this.draw();
  }
}
