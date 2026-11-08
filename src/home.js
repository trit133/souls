// Home screen: signed out it is the title, a big Sign In tile and Settings; signed in a Smash-style menu of
// tiles (Single Player and Multiplayer big, Skill Trees / Skins / Settings smaller); Single Player opens the
// character select (the class cards, plus dark "?" tiles for characters still to come). Hovering a tile lifts it,
// runs a light around its edge, sweeps a shine across and sends pixel embers up in its colour. Slow embers drift
// behind the whole screen. Arrow keys move between tiles.
import { PixelLabel, pixelIcon, frameImage } from './pixelui.js';

const $ = (id) => document.getElementById(id);
const PX = 3; // screen px per pixel of the ember canvases
// every tile is a shade of red or orange: ember colours [core, glow], and the frame [dark, mid, light, rivet] at rest / lit
const EMBER = {
  ember: [[255, 196, 110], [255, 90, 30]], blood: [[255, 150, 120], [200, 30, 30]], rust: [[255, 200, 120], [200, 90, 30]],
  scarlet: [[255, 170, 140], [230, 50, 40]], ash: [[255, 180, 120], [160, 60, 30]],
};
const FRAME = {
  ember: [['#4a1608', '#9a3a12', '#d86a24', '#ffc23d'], ['#7a2a0c', '#e0601c', '#ffb050', '#fff3a6']],
  blood: [['#3a0608', '#8a1418', '#c42a24', '#e8a040'], ['#6a0c10', '#d4282a', '#ff6a4a', '#ffe26b']],
  rust: [['#3a1806', '#7a3a14', '#b8642a', '#e8b04a'], ['#5e2a0c', '#c0602a', '#f09a4a', '#fff3a6']],
  scarlet: [['#40080a', '#a01e1c', '#e04a30', '#ffc23d'], ['#701010', '#e0402a', '#ff8a5a', '#fff3a6']],
  ash: [['#2a0e08', '#5a2414', '#8a3e22', '#c8823a'], ['#4a1a0c', '#9a3e1e', '#d0703a', '#ffc23d']],
};

// a low-res canvas of rising ember pixels; `rate` new embers a second
class Embers {
  constructor(cv, colors, rate, spread = 1) {
    this.cv = cv; this.ctx = cv.getContext('2d'); this.colors = colors; this.rate = rate; this.spread = spread;
    this.ps = []; this.acc = 0;
  }
  size() {
    const w = Math.max(8, Math.round(this.cv.clientWidth / PX)), h = Math.max(8, Math.round(this.cv.clientHeight / PX));
    if (this.cv.width !== w || this.cv.height !== h) { this.cv.width = w; this.cv.height = h; }
  }
  step(dt, emit = true) {
    const { cv, ctx, ps } = this, W = cv.width, H = cv.height;
    if (emit) for (this.acc += dt * this.rate; this.acc >= 1; this.acc--) {
      ps.push({ x: Math.random() * W, y: H - Math.random() * H * 0.25 * this.spread, vx: (Math.random() - 0.5) * 6, vy: -(8 + Math.random() * 16), t: 0, life: 1 + Math.random() * 1.6, big: Math.random() < 0.25 });
    }
    ctx.clearRect(0, 0, W, H);
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.t += dt; p.x += (p.vx + Math.sin(p.t * 3 + p.y) * 3) * dt; p.y += p.vy * dt;
      if (p.t > p.life || p.y < -2) { ps.splice(i, 1); continue; }
      const f = 1 - p.t / p.life, [c, g] = this.colors;
      ctx.fillStyle = `rgba(${g[0]},${g[1]},${g[2]},${0.35 * f})`;
      if (p.big) ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 3, 3);
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${f})`;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
    }
    return ps.length > 0;
  }
}

export class Home {
  constructor(game) {
    this.game = game;
    this.view = 'out';
    this.live = new Set();
    this.raf = 0; this.last = 0;
    // tiles: pixel frames, pixel icons, labels in the title's pixel font, hover embers
    this.labels = [];
    for (const t of document.querySelectorAll('#menu .tile')) {
      const fr = FRAME[t.dataset.tile] || FRAME.ember;
      t.style.setProperty('--frame', `url(${frameImage(fr[0])})`); t.style.setProperty('--frame-hot', `url(${frameImage(fr[1])})`);
      const big = t.classList.contains('tile-big') || t.classList.contains('tile-signin');
      const ic = t.querySelector('[data-icon]');
      if (ic) pixelIcon(ic, ic.dataset.icon, big ? 6 : 3);
      const lab = t.querySelector('.tile-t');
      if (lab) { const L = new PixelLabel(lab, lab.textContent.trim(), { px: big ? 5 : 3 }); L.tile = t; lab.plabel = L; this.labels.push(L); }
    }
    this.gold = new PixelLabel($('tile-gold'), '', { font: 'mini', px: 3 });
    for (const t of document.querySelectorAll('#menu .tile')) {
      const cv = document.createElement('canvas');
      cv.className = 'tilefx'; cv.setAttribute('aria-hidden', 'true');
      t.prepend(cv);
      const e = new Embers(cv, EMBER[t.dataset.tile] || EMBER.ember, t.classList.contains('tile-big') || t.classList.contains('tile-signin') ? 40 : 22);
      const on = () => { e.on = true; e.size(); this.live.add(e); this.run(); };
      const off = () => { e.on = false; };
      t.addEventListener('pointerenter', on); t.addEventListener('focus', on);
      t.addEventListener('pointerleave', off); t.addEventListener('blur', off);
      t.addEventListener('pointerenter', () => this.game.audio.play('uiTick', 0.5));
    }
    // the slow embers behind everything
    const bg = document.createElement('canvas');
    $('home-bg').appendChild(bg);
    this.bg = new Embers(bg, [[255, 170, 90], [200, 70, 20]], 9, 4);
    this.bg.always = true;
    this.bindKeys();
  }

  setGold(n) { this.gold.set(n == null ? '' : `${n} gold`); }

  // which view: 'out' (signed out), 'in' (main tiles) or 'chars' (character select)
  show(view) {
    this.view = view;
    for (const [v, id] of [['out', 'home-out'], ['in', 'home-in'], ['chars', 'home-chars']]) $(id).classList.toggle('hidden', v !== view);
    $('menu').dataset.view = view;
    this.start();
  }

  // the background loop runs while the menu is up
  start() { this.bg.size(); this.live.add(this.bg); this.run(); }
  run() {
    if (this.raf) return;
    this.last = performance.now();
    const tick = (now) => {
      const dt = Math.max(0, Math.min(0.1, (now - this.last) / 1000)); this.last = now;
      const menuUp = !$('menu').classList.contains('hidden');
      if (menuUp) for (const L of this.labels) if (L.tile.offsetParent) {
        const w = L.tile.clientWidth - 24; // fit the tile, shrinking on small screens
        if (w !== L.fitW) L.size(w);
        L.step(dt, L.tile.matches(':hover, :focus-visible'));
      }
      for (const e of [...this.live]) {
        const busy = e.step(dt, e.always ? menuUp : e.on);
        if (!busy && !e.on && !(e.always && menuUp)) this.live.delete(e);
        if (e.always && menuUp) this.live.add(e);
      }
      this.raf = this.live.size ? requestAnimationFrame(tick) : 0;
    };
    this.raf = requestAnimationFrame(tick);
  }

  // arrow keys: move focus to the nearest visible tile in that direction
  bindKeys() {
    const DIR = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    document.addEventListener('keydown', (ev) => {
      const d = DIR[ev.key];
      if (!d || $('menu').classList.contains('hidden') || document.querySelector('.screen:not(.hidden):not(#menu):not(#hud)')) return;
      const items = [...document.querySelectorAll('#menu .tile, #menu .char[data-char]')].filter((el) => el.offsetParent);
      if (!items.length) return;
      const cur = items.includes(document.activeElement) ? document.activeElement : null;
      if (!cur) { items[0].focus(); ev.preventDefault(); return; }
      const c = cur.getBoundingClientRect(), cx = c.x + c.width / 2, cy = c.y + c.height / 2;
      let best = null, bs = Infinity;
      for (const el of items) {
        if (el === cur) continue;
        const r = el.getBoundingClientRect(), dx = r.x + r.width / 2 - cx, dy = r.y + r.height / 2 - cy;
        const along = dx * d[0] + dy * d[1];
        if (along <= 4) continue;
        const score = along + Math.abs(dx * d[1] + dy * d[0]) * 2;
        if (score < bs) { bs = score; best = el; }
      }
      if (best) { best.focus(); ev.preventDefault(); }
    });
  }
}
