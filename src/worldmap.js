// The world map (regions.js): every region on one ashen continent; click an open one to see its own map with its
// three raid areas; pick an area to read about it and deploy. Drawn small on a canvas and scaled up with hard pixels;
// the regions and areas are buttons laid over it.
import { REGIONS, AREAS, areaOpen, missingGems } from './regions.js';
import { ITEMS } from './items.js';
import { BOSSES } from './boss.js';
import { pxButton, pxText } from './pixelmenus.js';
import { drawWorld, drawRegion, MAP_W, MAP_H } from './mapart.js';

const $ = (id) => document.getElementById(id);
const AW = MAP_W, AH = MAP_H; // the art's size (mapart.js draws it)

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
    // a region not yet found is a question mark under the fog, its name unknown
    for (const R of REGIONS) this.pin(R.open ? R.name : '?', R.x, R.y, R.open ? 'open' : 'locked unknown', () => (R.open ? this.showRegion(R.id) : this.info('Uncharted', 'No one sent into these lands has come back with a map. Clear the regions before it to find the way.', '', false)));
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

  // ---------- the art (mapart.js) ----------
  drawWorld() { drawWorld($('wm-art'), REGIONS); }
  drawRegion(R) {
    const data = this.game.accounts.data, opened = Object.fromEntries(R.areas.map((a) => [a.id, areaOpen(AREAS[a.id], data)]));
    drawRegion($('wm-art'), R, R.areas, opened);
  }
}
