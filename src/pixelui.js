// Pixel-art pieces for the home screen tiles: labels in the title's pixel font (FONTS.big), lit like hot metal with
// a shine that sweeps through and flames that lick off the letters while the tile is hovered; 16x16 pixel icons;
// and stepped, riveted pixel frames used as CSS border images. Everything is drawn into small canvases and
// scaled up crisp (image-rendering: pixelated).
import { FONTS, textWidth } from './pixelfx/core/index.js';
import { rasterText } from './pixelfx/core/font.js';

// fire ramp, dark to white-hot (same as the title's)
const FIRE = ['#4a1712', '#8a1f17', '#c9281f', '#f2561d', '#ff8a2a', '#ffc23d', '#ffe26b', '#fff3a6', '#ffffff'];
const OUT = '#120403';

// ---------- labels ----------
export class PixelLabel {
  // el: an element to fill; text: what it says; o: { font: 'big' | 'mini', px: screen px per pixel }
  constructor(el, text, o = {}) {
    this.el = el; this.font = o.font || 'big'; this.px = o.px || 3; this.t = Math.random() * 4; this.hot = 0;
    this.cv = document.createElement('canvas'); this.cv.className = 'plabel';
    el.textContent = ''; el.appendChild(this.cv);
    this.flames = [];
    this.set(text);
  }
  set(text) {
    this.text = String(text).toUpperCase();
    this.el.setAttribute('aria-label', text);
    const F = FONTS[this.font];
    this.tw = textWidth(this.text, this.font); this.th = F.h;
    this.pad = 2; this.top = this.font === 'big' ? 6 : 2; // room for the outline, the shadow and flames above
    this.cv.width = this.tw + this.pad * 2 + 1; this.cv.height = this.th + this.top + this.pad + 1;
    this.pxMax = this.pxMax || this.px; this.fitW = 0;
    this.size();
    this.ink = new Set(); this.tops = [];
    rasterText(this.text, this.font, (x, y) => this.ink.add(x + ',' + y));
    for (let x = 0; x < this.tw; x++) for (let y = 0; y < this.th; y++) if (this.ink.has(x + ',' + y)) { if (!this.ink.has(x + ',' + (y - 1))) this.tops.push([x, y]); }
    this.draw();
  }
  // the biggest whole-pixel scale (up to the label's own) that fits `maxW` screen px
  size(maxW = this.fitW) {
    this.fitW = maxW;
    this.px = maxW ? Math.max(1, Math.min(this.pxMax, Math.floor(maxW / this.cv.width))) : this.pxMax;
    this.cv.style.width = this.cv.width * this.px + 'px'; this.cv.style.height = this.cv.height * this.px + 'px';
  }
  step(dt, hover) {
    this.t += dt;
    this.hot += ((hover ? 1 : 0) - this.hot) * Math.min(1, dt * 6);
    // flames rise off the tops of the letters while hot
    if (this.font === 'big' && this.hot > 0.1) for (let i = 0; i < this.tops.length * dt * 1.6 * this.hot; i++) {
      const [x, y] = this.tops[(Math.random() * this.tops.length) | 0];
      this.flames.push({ x, y: y - 1, life: 0.3 + Math.random() * 0.4, t: 0, vx: (Math.random() - 0.5) * 3 });
    }
    for (let i = this.flames.length - 1; i >= 0; i--) { const f = this.flames[i]; f.t += dt; f.y -= dt * 12; f.x += f.vx * dt; if (f.t > f.life) this.flames.splice(i, 1); }
    this.draw();
  }
  draw() {
    const c = this.cv.getContext('2d'), ox = this.pad, oy = this.top, { tw, th } = this;
    c.clearRect(0, 0, this.cv.width, this.cv.height);
    const has = (x, y) => this.ink.has(x + ',' + y);
    // outline, then a drop shadow one pixel down
    c.fillStyle = OUT;
    for (const k of this.ink) { const [x, y] = k.split(',').map(Number); c.fillRect(ox + x - 1, oy + y - 1, 3, 3); c.fillRect(ox + x, oy + y + 2, 1, 1); }
    // letters: hot at the top, cooling to red at the bottom; a bright shine sweeps across every few seconds
    const sweep = ((this.t * 0.35) % 1.6) * (tw + 16) - 8;
    for (const k of this.ink) {
      const [x, y] = k.split(',').map(Number);
      let i = Math.round(7 - (y / Math.max(1, th - 1)) * 4.6 + this.hot * 1.2); // 7 (pale gold) .. ~2 (red)
      if (!has(x, y - 1)) i += 1; // a lit top edge
      if (!has(x, y + 1)) i -= 1; // a shaded bottom edge
      const d = Math.abs(x - y * 0.5 - sweep);
      if (d < 1.5) i += 2;
      // a slow flicker
      if (Math.sin(this.t * 7 + x * 1.7 + y) > 0.92) i += 1;
      c.fillStyle = FIRE[Math.max(1, Math.min(FIRE.length - 1, i))];
      c.fillRect(ox + x, oy + y, 1, 1);
    }
    for (const f of this.flames) {
      const a = 1 - f.t / f.life;
      c.fillStyle = FIRE[Math.max(2, Math.min(7, Math.round(3 + a * 4)))];
      c.fillRect(Math.round(ox + f.x), Math.round(oy + f.y), 1, 1);
    }
  }
}

// ---------- icons: 16x16, '.' empty, 'o' outline, 'd' dark, 'm' mid, 'l' light, 'h' highlight ----------
const ICONS = {
  solo: [ // a sword raised
    '.............oo.', '............ohho', '...........ohlo.', '..........ohlo..', '.........ohlo...', '........ohlo....', '.......ohlo.....', '..o...ohlo......',
    '..ooo.hlo.......', '...omomo........', '....ommo........', '...omdmo........', '..odo.oo........', '.odo............', 'ooo.............', '................'],
  party: [ // two swords crossed
    'oo............oo', 'ohoo........oo ho'.replace(' ', ''), '.ohlo......olho.', '..ohlo....olho..', '...ohlo..olho...', '....ohlooho.....'.replace('ohlooho', 'ohloolh').slice(0, 16), '.....ohllho.....', '......ohho......',
    '.....ohllho.....', '..o.ohlo.olho.o.', '..oomlo...olmoo.', '...omo.....omo..', '..omdo.....odmo.', '.odoo.......oodo', 'ooo...........oo', '................'],
  skins: [ // a mask
    '................', '..oooooooooooo..', '.ohhhhhhhhhhhho.', '.ohllllllllllho.', '.ohlooolloooolho'.slice(0, 16), '.ohlodolloodolo.', '.ohllooolloooll.'.slice(0, 16), '.ohlllllllllllo.',
    '.omllllllllllmo.', '..omlllooolllmo.'.slice(0, 16), '..omllo...ollmo.'.slice(0, 16), '...omllllllmo...', '....ommmmmmo....', '.....oddddo.....', '......oooo......', '................'],
  lock: [
    '................', '.....oooooo.....', '....odmmmmdo....', '...odo....odo...', '...omo....omo...', '...omo....omo...', '..oooooooooooo..', '..ohhhhhhhhhhho.',
    '..ohllllollllmo.', '..ohlllooolllmo.', '..ohllllollllmo.', '..ohllllollllmo.', '..omllllllllldo.', '..odmmmmmmmmddo.', '..oooooooooooo..', '................'],
  key: [
    '................', '...oooo.........', '..ohhhho........', '.ohlooolo.......', '.ohlo..olo......', '.ohlo..olo......', '.omlooolmoooooo.', '..omllllmmmmmmmo',
    '...ommmmoooomdmo', '....oooo....odo.', '.............oo.', '................', '................', '................', '................', '................'],
  camp: [ // a campfire
    '.......oo.......', '......ohho......', '.....ohhlo......', '....ohlhlho.....', '....ohllhlo.....', '...ohlmllhlo....', '...ohlmmllho....', '..ohlmddmllho...',
    '..ohlmddmmlho...', '...omddddmmo....', '.oooooooooooooo.', 'odmmmmmmmmmmmmdo', '.oooddoooooddoo.', '...ooo....ooo...', '................', '................'],
};
const ICON_PAL = { o: OUT, d: '#5e1c0c', m: '#c9281f', l: '#ff8a2a', h: '#ffc23d' };
// icons drawn from shapes: inside(x, y) on pixel centres; outlined and lit from the top left automatically
const SHAPES = {
  gear: (x, y) => {
    const dx = x - 7.5, dy = y - 7.5, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    return r >= 2.2 && r <= (Math.cos(a * 8) > 0.45 ? 7 : 5.2); // a ring with eight teeth
  },
  tree: (x, y) => {
    const nodes = [[7.5, 2.6], [7.5, 8], [2.6, 13], [12.4, 13]], links = [[0, 1], [1, 2], [1, 3]];
    if (nodes.some(([nx, ny]) => Math.hypot(x - nx, y - ny) < 2.3)) return true;
    return links.some(([i, j]) => {
      const [ax, ay] = nodes[i], [bx, by] = nodes[j], vx = bx - ax, vy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)));
      return Math.hypot(x - ax - vx * t, y - ay - vy * t) < 0.75;
    });
  },
};
function shapeRows(f) {
  const ins = (x, y) => x >= 0 && y >= 0 && x < 16 && y < 16 && f(x + 0.5, y + 0.5);
  const rows = [];
  for (let y = 0; y < 16; y++) {
    let row = '';
    for (let x = 0; x < 16; x++) {
      if (ins(x, y)) row += !ins(x - 1, y) || !ins(x, y - 1) ? 'h' : !ins(x + 1, y) || !ins(x, y + 1) ? 'm' : x + y < 15 ? 'l' : 'm';
      else row += ins(x - 1, y) || ins(x + 1, y) || ins(x, y - 1) || ins(x, y + 1) ? 'o' : '.'; // outline outside the shape
    }
    rows.push(row);
  }
  return rows;
}
export function pixelIcon(el, name, px = 4) {
  const rows = ICONS[name] || (SHAPES[name] && shapeRows(SHAPES[name]));
  if (!rows) return;
  const cv = document.createElement('canvas'); cv.width = 16; cv.height = 16; cv.className = 'picon';
  const c = cv.getContext('2d');
  rows.forEach((row, y) => [...row.padEnd(16, '.').slice(0, 16)].forEach((ch, x) => { if (ICON_PAL[ch]) { c.fillStyle = ICON_PAL[ch]; c.fillRect(x, y, 1, 1); } }));
  cv.style.width = cv.style.height = 16 * px + 'px';
  el.textContent = ''; el.appendChild(cv);
}

// ---------- frames: a 12x12 nine-slice with stepped corners, a two-tone edge and rivets ----------
// col: [dark, mid, light, rivet]; returns a data URL for border-image (slice 4)
export function frameImage([dark, mid, light, rivet]) {
  const cv = document.createElement('canvas'); cv.width = 12; cv.height = 12;
  const c = cv.getContext('2d'), p = (x, y, col) => { c.fillStyle = col; c.fillRect(x, y, 1, 1); };
  for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
    const edge = Math.min(x, y, 11 - x, 11 - y);
    if (edge >= 4) continue; // the middle is the tile's own background
    const corner = (x < 2 || x > 9) && (y < 2 || y > 9);
    if (corner && (x === 0 || x === 11) && (y === 0 || y === 11)) continue; // stepped (cut) corner
    let col = edge === 0 ? OUT : edge === 1 ? (x < 6 && y < 6 ? light : mid) : edge === 2 ? (x + y < 12 ? mid : dark) : OUT;
    if (edge === 1 && (x > 9 || y > 9)) col = dark;
    p(x, y, col);
  }
  // rivets in the four corners
  for (const [x, y] of [[2, 2], [9, 2], [2, 9], [9, 9]]) { p(x, y, rivet); }
  return cv.toDataURL();
}

// frame colours per tone, at rest and lit: [dark, mid, light, rivet]. Every tone is a red or orange; `panel` is the
// dark frame round menu panels.
export const FRAME = {
  ember: [['#4a1608', '#9a3a12', '#d86a24', '#ffc23d'], ['#7a2a0c', '#e0601c', '#ffb050', '#fff3a6']],
  blood: [['#3a0608', '#8a1418', '#c42a24', '#e8a040'], ['#6a0c10', '#d4282a', '#ff6a4a', '#ffe26b']],
  rust: [['#3a1806', '#7a3a14', '#b8642a', '#e8b04a'], ['#5e2a0c', '#c0602a', '#f09a4a', '#fff3a6']],
  scarlet: [['#40080a', '#a01e1c', '#e04a30', '#ffc23d'], ['#701010', '#e0402a', '#ff8a5a', '#fff3a6']],
  ash: [['#2a0e08', '#5a2414', '#8a3e22', '#c8823a'], ['#4a1a0c', '#9a3e1e', '#d0703a', '#ffc23d']],
  panel: [['#1a0806', '#3a160c', '#5a2614', '#8a4a22'], ['#2a0e08', '#5a2414', '#8a3e22', '#c8823a']],
};
