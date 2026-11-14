// The world map (regions.js): every region on one ashen continent; click an open one to see its own map with its
// three raid areas; pick an area to read about it and deploy. Drawn small on a canvas and scaled up with hard pixels;
// the regions and areas are buttons laid over it.
import { REGIONS, AREAS, areaOpen, missingGems } from './regions.js';
import { ITEMS } from './items.js';
import { BOSSES } from './boss.js';
import { pxButton, pxText } from './pixelmenus.js';
import { rng } from './world.js';

const $ = (id) => document.getElementById(id);
const AW = 320, AH = 180; // the art's size in map pixels

export class WorldMap {
  constructor(game) { this.game = game; this.el = null; }

  buildDom() {
    const el = document.createElement('div');
    el.id = 'worldmap'; el.className = 'hidden';
    el.innerHTML = `
      <div class="wm-top"><button class="mini-btn" id="wm-back">Back</button><div id="wm-title">The Known World</div><div class="wm-sp"></div></div>
      <div id="wm-frame"><canvas id="wm-art" width="${AW}" height="${AH}"></canvas><div id="wm-pins"></div></div>
      <div id="wm-panel" class="hidden">
        <div id="wm-name"></div><div id="wm-blurb"></div><div id="wm-boss"></div>
        <div class="wm-btns"><button class="mini-btn hidden" id="wm-night">Night Raid: Off</button><button class="menu-btn primary" id="wm-go">Deploy</button></div>
      </div>`;
    document.body.append(el);
    this.el = el;
    pxButton($('wm-back'), 'ash', 2); pxButton($('wm-night'), 'blood', 2); pxButton($('wm-go'), 'ember', innerHeight > 500 ? 3 : 2);
    pxText($('wm-title'), { px: innerHeight > 500 ? 3 : 2 });
    $('wm-back').addEventListener('click', () => (this.region ? this.showWorld() : this.close(true)));
    $('wm-go').addEventListener('click', () => { if (this.area) { const id = this.area; this.close(false); this.onPick?.(id); } });
    $('wm-night').addEventListener('click', () => { this.game.nightRaid = !this.game.nightRaid; this.game.refreshNight(); this.nightLabel(); });
    addEventListener('resize', () => this.el && !this.el.classList.contains('hidden') && this.fit());
  }

  // onPick(areaId) when you deploy; onBack when you leave the map
  open(onPick, onBack) {
    if (!this.el) this.buildDom();
    this.onPick = onPick; this.onBack = onBack;
    this.el.classList.remove('hidden');
    this.showWorld();
  }
  close(back) {
    this.el.classList.add('hidden');
    if (back) this.onBack?.();
  }

  // the art fills the screen at a whole-number scale where it can
  fit() {
    const f = $('wm-frame'), s = Math.max(1, Math.min(innerWidth * 0.96 / AW, (innerHeight - 70) / AH));
    f.style.width = AW * s + 'px'; f.style.height = AH * s + 'px';
  }

  pin(label, x, y, cls, onClick) {
    const b = document.createElement('button');
    b.className = 'wm-pin ' + cls; b.style.left = x * 100 + '%'; b.style.top = y * 100 + '%';
    b.innerHTML = `<span class="wm-dot"></span><span class="wm-lab">${label}</span>`;
    b.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
    $('wm-pins').append(b);
    return b;
  }

  showWorld() {
    this.region = null; this.area = null;
    $('wm-title').textContent = 'The Known World';
    $('wm-panel').classList.add('hidden');
    $('wm-pins').innerHTML = '';
    this.fit();
    this.drawWorld();
    for (const R of REGIONS) this.pin(R.name, R.x, R.y, R.open ? 'open' : 'locked', () => (R.open ? this.showRegion(R.id) : this.info(R.name, R.blurb, '', false)));
  }

  showRegion(id) {
    const R = REGIONS.find((r) => r.id === id);
    this.region = R; this.area = null;
    $('wm-title').textContent = R.name;
    $('wm-panel').classList.add('hidden');
    $('wm-pins').innerHTML = '';
    this.drawRegion(R);
    const data = this.game.accounts.data;
    for (const a of R.areas) {
      const A = AREAS[a.id];
      const done = data?.raids?.[a.id];
      this.pin(A.name + (done ? ' ✓' : ''), a.x, a.y, areaOpen(A, data) ? 'open' : 'locked', () => this.pickArea(A));
    }
    // the furthest open area is picked to start with
    const first = R.areas.map((a) => AREAS[a.id]).filter((A) => areaOpen(A, data)).at(-1);
    if (first) this.pickArea(first);
  }

  pickArea(A) {
    const data = this.game.accounts.data, can = areaOpen(A, data), need = missingGems(A, data);
    this.area = can ? A.id : null;
    document.querySelectorAll('.wm-pin').forEach((p) => p.classList.toggle('sel', p.querySelector('.wm-lab').textContent.startsWith(A.name)));
    const boss = A.open ? `${A.kind === 'final' ? 'At its end' : 'Somewhere in it'}: ${BOSSES[A.boss].name}` : '';
    // sealed: which gems are still wanted, and who carries them
    const sealed = !A.open ? ' Sealed for now.' : ` Sealed: you need ${need.map((g) => `the ${ITEMS[g].name} (${BOSSES[ITEMS[g].boss]?.name.split(',')[0]})`).join(', ')}.`;
    const how = A.kind === 'final' ? ' Fight your way up to his throne. The only ways out are victory or death.' : ' Break three shrines to open the way to its master. The only ways out are victory or death.';
    this.info(A.name, A.blurb + (can ? how : sealed), boss, can);
  }

  info(name, blurb, boss, canGo) {
    $('wm-panel').classList.remove('hidden');
    $('wm-name').textContent = name; $('wm-blurb').textContent = blurb; $('wm-boss').textContent = boss;
    $('wm-go').classList.toggle('hidden', !canGo);
    $('wm-night').classList.toggle('hidden', !canGo || !this.game.nightUnlocked);
    this.nightLabel();
  }
  nightLabel() { $('wm-night').textContent = `Night Raid: ${this.game.nightRaid && this.game.nightUnlocked ? 'On' : 'Off'}`; }

  // ---------- the art ----------
  ctx() { const c = $('wm-art').getContext('2d'); c.imageSmoothingEnabled = false; return c; }
  ground(c, r) {
    c.fillStyle = '#100d0a'; c.fillRect(0, 0, AW, AH);
    for (let i = 0; i < 900; i++) { c.fillStyle = r() < 0.5 ? '#16120e' : '#0c0a08'; c.fillRect(r() * AW | 0, r() * AH | 0, 1 + (r() * 2 | 0), 1); }
  }
  blob(c, r, cx, cy, rad, fill, n = 12) {
    c.fillStyle = fill;
    for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, d = r() * rad * 0.6, rr = rad * (0.35 + r() * 0.4); c.beginPath(); c.arc(Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d * 0.7), Math.round(rr), 0, Math.PI * 2); c.fill(); }
  }

  drawWorld() {
    const c = this.ctx(), r = rng(77);
    this.ground(c, r);
    // the continent: a ragged landmass, a darker coast, cracks of old fire across it
    this.blob(c, r, AW * 0.5, AH * 0.5, 120, '#2a231b', 26);
    this.blob(c, r, AW * 0.48, AH * 0.48, 95, '#332a20', 20);
    c.strokeStyle = '#1a1510'; c.lineWidth = 1;
    for (let k = 0; k < 9; k++) { let x = AW * (0.2 + r() * 0.6), y = AH * (0.2 + r() * 0.6); c.beginPath(); c.moveTo(x, y); for (let s = 0; s < 8; s++) { x += (r() - 0.5) * 18; y += (r() - 0.5) * 12; c.lineTo(x | 0, y | 0); } c.stroke(); }
    // mountains
    for (let k = 0; k < 40; k++) { const x = AW * (0.15 + r() * 0.7) | 0, y = AH * (0.15 + r() * 0.7) | 0; c.fillStyle = '#4a3e2e'; c.fillRect(x, y, 1, 1); c.fillRect(x - 1, y + 1, 3, 1); c.fillStyle = '#1e1913'; c.fillRect(x - 2, y + 2, 5, 1); }
    // the regions
    for (const R of REGIONS) {
      const x = R.x * AW, y = R.y * AH;
      // (drawn solid on its own, then laid down faded, so the overlapping circles don't stack up)
      const o = (this.tmp ||= document.createElement('canvas')); o.width = AW; o.height = AH;
      const oc = o.getContext('2d'); oc.imageSmoothingEnabled = false;
      this.blob(oc, rng(R.id.charCodeAt(1) * 31), x, y, 26, R.color, 14);
      c.globalAlpha = R.open ? 0.7 : 0.2; c.drawImage(o, 0, 0); c.globalAlpha = 1;
      if (R.id === 'r5') { c.fillStyle = '#d8c0ff'; c.fillRect(x - 1 | 0, y - 12 | 0, 3, 12); c.fillRect(x - 3 | 0, y - 2 | 0, 7, 2); } // the spire where it began
    }
    // the road from the march toward the seat
    c.fillStyle = '#7a6a4a';
    const path = REGIONS.map((R) => [R.x * AW, R.y * AH]);
    for (let i = 0; i < path.length - 1; i++) { const [a, b] = path[i], [p, q] = path[i + 1]; for (let t = 0; t < 1; t += 0.04) if ((t * 25 | 0) % 2 === 0) c.fillRect(a + (p - a) * t | 0, b + (q - b) * t | 0, 1, 1); }
  }

  drawRegion(R) {
    const c = this.ctx(), r = rng(R.id.charCodeAt(1) * 101);
    this.ground(c, r);
    this.blob(c, r, AW * 0.5, AH * 0.5, 150, '#2a231b', 30);
    const [a1, a2, a3] = R.areas.map((a) => [a.x * AW, a.y * AH]);
    // Ashfall Ward: a grid of burned blocks
    for (let i = -5; i <= 5; i++) for (let j = -3; j <= 3; j++) {
      if (r() < 0.15) continue;
      const x = a1[0] + i * 7, y = a1[1] + j * 7;
      c.fillStyle = r() < 0.2 ? '#1a1612' : r() < 0.5 ? '#4a4038' : '#3a322a'; c.fillRect(x | 0, y | 0, 5, 5);
      if (r() < 0.06) { c.fillStyle = '#d8822a'; c.fillRect(x + 2 | 0, y + 2 | 0, 1, 1); }
    }
    // the sump lines: tunnels under the ground, water in them
    c.fillStyle = '#1f3a34';
    for (let t = 0; t < 1; t += 0.01) { const x = a2[0] - 40 + t * 80, y = a2[1] + Math.sin(t * 9) * 8; c.fillRect(x | 0, y | 0, 2, 2); }
    for (let k = 0; k < 6; k++) { c.fillStyle = '#0a0a0a'; c.fillRect(a2[0] - 30 + k * 12 | 0, a2[1] - 3 | 0, 3, 5); }
    // the spire: a cathedral-fortress on a crag
    c.fillStyle = '#3a3a40'; c.fillRect(a3[0] - 10 | 0, a3[1] - 2 | 0, 20, 8);
    c.fillStyle = '#5a5a62'; c.fillRect(a3[0] - 2 | 0, a3[1] - 22 | 0, 4, 22); c.fillRect(a3[0] - 7 | 0, a3[1] - 12 | 0, 3, 12); c.fillRect(a3[0] + 4 | 0, a3[1] - 14 | 0, 3, 14);
    c.fillStyle = '#ff3a24'; c.fillRect(a3[0] | 0, a3[1] - 24 | 0, 1, 2);
    // the Sentinel's Bastion: a black keep with a gate and three lit sockets over it
    const a4 = R.areas[3] && [R.areas[3].x * AW, R.areas[3].y * AH];
    if (a4) {
      c.fillStyle = '#26222a'; c.fillRect(a4[0] - 12 | 0, a4[1] - 10 | 0, 24, 14);
      c.fillStyle = '#3a3640'; c.fillRect(a4[0] - 14 | 0, a4[1] - 16 | 0, 6, 20); c.fillRect(a4[0] + 8 | 0, a4[1] - 16 | 0, 6, 20);
      c.fillStyle = '#0a0808'; c.fillRect(a4[0] - 3 | 0, a4[1] - 4 | 0, 6, 8);
      for (const [k, col] of [[-6, '#ff3a1a'], [0, '#a8e0ff'], [6, '#ffb040']]) { c.fillStyle = col; c.fillRect(a4[0] + k - 1 | 0, a4[1] - 9 | 0, 2, 2); }
    }
    // the road between them
    c.fillStyle = '#7a6a4a';
    for (const [[x0, y0], [x1, y1]] of [[a1, a2], [a2, a3], ...(a4 ? [[a3, a4]] : [])]) for (let t = 0; t < 1; t += 0.02) if ((t * 50 | 0) % 2 === 0) c.fillRect(x0 + (x1 - x0) * t | 0, y0 + (y1 - y0) * t | 0, 1, 1);
    // ash drifting over it all
    for (let k = 0; k < 120; k++) { c.fillStyle = 'rgba(200,190,170,0.18)'; c.fillRect(r() * AW | 0, r() * AH | 0, 1, 1); }
  }
}
