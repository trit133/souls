// The Bazaar: a night market under a broken hive overpass, reached from the Sanctum once Executor Hask is dead
// (traders.js has the rules). Ten stalls stand in an arc on a raised deck facing the camera; a trader stands at each
// stall that's open, the rest are shuttered under tarps with a lock-plate. Like the Sanctum, the scene is the menu:
// hover a trader for a label, click for his window (Buy / Sell / Quests). A trader with a quest ready to hand in has a
// "!" over his head; a trader at level 5 has his buff's sigil there for good.
//   Mother Grist  (booth 4): a hunched rag-and-bone crone under a patched tarp, a cane, a scuttle-drone on her
//                  shoulder; common and uncommon materials (and runes, later)
//   Brother Vesk  (booth 5): a tall gaunt reliquary dealer in a cracked iron mask behind iron bars, a censer swinging
//                  on a chain; rare, epic and legendary materials (after Varek)
import * as THREE from 'three';
import { buildHumanoid } from './models.js';
import { P } from './anims.js';
import { pxButton, pxText } from './pixelmenus.js';
import { ITEMS, RARITY, iconEl, itemValue } from './items.js';
import { cosmetics } from './outfits.js';
import { TRADERS, BOOTHS, MAX_LEVEL, LEVEL_XP, BUY_RATE, traderState, levelOf, sellPrice, buyPrice, dealsIn, buy, sell,
  currentQuest, questProgress, claimable, claim, bazaarOpen, RARITY_ORDER } from './traders.js';
import { FOE_NAMES } from './foes.js';

const $ = (id) => document.getElementById(id);
const L = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o });
const B = (c) => new THREE.MeshBasicMaterial({ color: c });
function box(g, w, h, d, mat, x, y, z, ry = 0, rx = 0, rz = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m; }
function cyl(g, rt, rb, h, mat, x, y, z, seg = 8) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y, z); g.add(m); return m; }
const seeded = (s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
const OUTLINE = new THREE.MeshBasicMaterial({ color: 0xffd36a, side: THREE.BackSide, depthWrite: false });
const FAINT = new THREE.MeshBasicMaterial({ color: 0x9a7444, side: THREE.BackSide, depthWrite: false });
const ENEMY = { grunt: 'Zealots', spear: 'Pike Zealots', archer: 'Needle Gunners', brute: 'War Servitors' };
const enemyName = (type, n) => ENEMY[type] || (FOE_NAMES?.[type] ? FOE_NAMES[type] + (n > 1 ? 's' : '') : type);
const AREA_NAMES = { r1a1: 'Ashfall Ward', r1a2: 'The Sump Lines', r1a3: 'Saint Orsk\'s Spire', r1f: 'The Sentinel\'s Bastion' };

// a 16 x 16 pixel sprite over a head: the "!" of a quest ready to hand in, or a trader's buff sigil
function pixelSprite(rows, pal) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 16;
  const c = cv.getContext('2d');
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (pal[ch]) { c.fillStyle = pal[ch]; c.fillRect(x, y, 1, 1); } }));
  const tex = new THREE.CanvasTexture(cv); tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false })); s.renderOrder = 6; // (over the awnings)
  return s;
}
const BANG = ['......oooo......', '.....oyyyyo.....', '.....oyYYyo.....', '.....oyYYyo.....', '.....oyYYyo.....', '.....oyYYyo.....', '.....oyYYyo.....', '......oyyo......',
  '......oyyo......', '.......oo.......', '................', '......oooo......', '.....oyYYyo.....', '.....oyYYyo.....', '......oooo......', '................'];
const SIGILS = {
  grist: ['................', '..ooo....ooo....', '.orrro..orrro...', 'orRRrro orRrro..'.replace(' ', 'o'), 'orRRRrrorRRrro..', 'orRRRRrrrRRrro..', '.orRRRRRRRRro...', '..orRRRRRRro....', '...orRRRRro.....', '....orRRro......', '.....orro.......', '......oo........', '................', '................', '................', '................'],
  vesk: ['......oooo......', '......oyyo......', '.....oooooo.....', '......ogGo......', '.....ogGGGo.....', '....ogGGGGGo....', '...ogGGWGGGGo...', '...ogGGWGGGGo...', '...ogGGGGGGGo...', '...oggGGGGGgo...', '....ogggggggo...'.slice(0, 16), '.....ooooooo....', '................', '................', '................', '................'],
};
const SPAL = { o: '#1a0c06', y: '#d8a040', Y: '#ffe890', r: '#a0141a', R: '#ff4a3a', g: '#2a8a4a', G: '#6aff9a', W: '#e8fff0' };

// ---------- the people ----------
// Mother Grist: small, bent double over a cane, hooded in patched rags, a string of charms, a scuttle-drone riding her
// shoulder (its red eye blinking); she rocks on her heels and now and then cackles
function makeGrist() {
  const rig = buildHumanoid({ scale: 0.84, skin: 0x9a8070, cloth: 0x4a3c2c, armor: 0x3e342a, accent: 0x6a4a2a, head: 'hood', eyes: 0xffd27a, bulk: 1.08 });
  const T = rig.j.torso, H = rig.j.head;
  const rag = L(0x5a4630), rag2 = L(0x3a2e22), brass = L(0xa8843a), iron = L(0x3a3a40);
  box(T, 0.5, 0.18, 0.36, rag, 0, 0.62, 0, 0, 0.1); box(T, 0.42, 0.3, 0.04, rag2, 0, 0.32, 0.16, 0, 0.05); // the shawl and an apron
  for (let i = 0; i < 6; i++) box(T, 0.04, 0.05, 0.04, i % 2 ? brass : L(0xd8ccb0), -0.14 + i * 0.056, 0.42 - Math.abs(i - 2.5) * 0.02, 0.17); // charms
  box(H, 0.3, 0.12, 0.08, rag2, 0, 0.32, 0.1); // the hood's lip
  box(H, 0.04, 0.04, 0.06, L(0xc8b090), 0.02, 0.12, 0.15); // her nose
  // the cane in her right hand, the drone on her left shoulder
  const cane = cyl(rig.j.handR, 0.025, 0.025, 1.0, L(0x4a3020), 0, -0.45, 0.04); cane.rotation.x = 0.05;
  box(rig.j.handR, 0.08, 0.05, 0.08, brass, 0, 0.04, 0.04);
  const drone = new THREE.Group(); drone.position.set(0.24, 0.72, -0.02); T.add(drone);
  box(drone, 0.16, 0.08, 0.2, iron, 0, 0, 0); box(drone, 0.1, 0.05, 0.08, L(0x5a5a62), 0, 0.06, 0.04);
  const eye = box(drone, 0.04, 0.03, 0.02, B(0xff3a1a), 0, 0.01, 0.11);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(drone, 0.02, 0.1, 0.02, iron, sx * 0.09, -0.05, sz * 0.07, 0, sz * 0.4, sx * 0.4);
  return { rig, eye, drone, pose: (t) => {
    const rock = Math.sin(t * 1.3) * 0.06, cackle = Math.max(0, Math.sin(t * 0.45) - 0.92) * 12; // (every so often)
    return { ...P.rest, legL: [-0.25, 0, 0.06], legR: [0.15, 0, -0.06], shinL: [0.4, 0, 0], shinR: [0.35, 0, 0], by: -0.12,
      torso: [0.55 + rock * 0.5 + Math.sin(t * 22) * 0.04 * cackle, 0.1, rock], head: [-0.45 - Math.sin(t * 22) * 0.06 * cackle, Math.sin(t * 0.7) * 0.25, 0],
      armR: [-0.55, 0, -0.15], foreR: [-0.35, 0, 0], handR: [0.3, 0, 0], armL: [-0.4 + Math.sin(t * 0.9) * 0.1, 0, 0.25], foreL: [-1.1, 0, 0], handL: [0.4, 0, 0] };
  }, tick: (t) => { eye.visible = Math.sin(t * 2.1) > -0.85; drone.rotation.y = Math.sin(t * 0.8) * 0.5; } };
}
// Brother Vesk: tall and gaunt, robed to the floor, a cracked iron mask with a burning slit, a high collar; a brass
// censer swings on a chain from his left hand, smoking; his head follows you
function makeVesk(scene) {
  const rig = buildHumanoid({ scale: 1.18, skin: 0x8a7a70, cloth: 0x1c181a, armor: 0x2e2a2c, accent: 0x6a1412, head: 'helm', eyes: 0xff5a2a, bulk: 0.86 });
  const T = rig.j.torso, H = rig.j.head, hips = rig.j.hips;
  const robe = L(0x1c181a), red = L(0x6a1412), iron = L(0x5a5a62), brass = L(0xb89a4a);
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.42, 0.95, 8, 1, true), robe); skirt.material.side = THREE.DoubleSide; skirt.position.y = -0.48; hips.add(skirt);
  box(T, 0.5, 0.22, 0.34, robe, 0, 0.74, -0.02); box(T, 0.06, 0.66, 0.02, red, 0, 0.3, 0.14); // the collar, a red stole
  box(H, 0.25, 0.22, 0.03, iron, 0, 0.2, 0.155); box(H, 0.2, 0.025, 0.02, B(0xff5a2a), 0, 0.22, 0.17); // the mask and its slit
  box(H, 0.02, 0.12, 0.02, L(0x1a1a1e), 0.06, 0.24, 0.172, 0, 0, 0.4); // a crack
  const chain = new THREE.Group(); chain.position.set(0, -0.06, 0); rig.j.handL.add(chain);
  for (let i = 0; i < 5; i++) box(chain, 0.025, 0.06, 0.025, brass, 0, -0.05 - i * 0.065, 0);
  const censer = new THREE.Group(); censer.position.set(0, -0.4, 0); chain.add(censer);
  cyl(censer, 0.07, 0.09, 0.12, brass, 0, -0.04, 0, 8); cyl(censer, 0.02, 0.07, 0.07, brass, 0, 0.05, 0, 8);
  const ember = box(censer, 0.06, 0.03, 0.06, B(0xff7a2a), 0, 0.02, 0);
  const smoke = [];
  for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), new THREE.MeshBasicMaterial({ color: 0x8a8090, transparent: true, opacity: 0.3, depthWrite: false })); scene.add(m); smoke.push({ m, t: i / 6 }); }
  return { rig, look: 0, pose: (t, look) => ({ ...P.rest, legL: [0, 0, 0.03], legR: [0, 0, -0.03], shinL: [0.05, 0, 0], shinR: [0.05, 0, 0], by: 0,
    torso: [0.05 + Math.sin(t * 0.6) * 0.02, look * 0.25, 0], head: [-0.05, look * 0.55, 0],
    armR: [-0.45, 0, 0.35], foreR: [-1.5, 0, 0], handR: [0.4, 0, 0], armL: [-0.15, 0, 0.18], foreL: [-0.35, 0, 0], handL: [0, 0, 0] }),
  tick: (t, dt) => {
    chain.rotation.x = Math.sin(t * 1.6) * 0.35; chain.rotation.z = Math.cos(t * 1.6) * 0.12; // the censer swings
    ember.material.color.setHSL(0.06, 1, 0.5 + Math.sin(t * 9) * 0.1);
    const at = ember.getWorldPosition(new THREE.Vector3());
    for (const s of smoke) { s.t = (s.t + dt * 0.35) % 1; s.m.position.set(at.x + Math.sin(s.t * 9 + s.m.id) * 0.08, at.y + s.t * 1.0, at.z); s.m.scale.setScalar(0.6 + s.t * 2.2); s.m.material.opacity = 0.32 * (1 - s.t); }
  } };
}

// ---------- the stalls ----------
// a stall: four posts, a counter, a slanting tarp roof in `tarp` and a lamp; `open` false: the front hangs shut,
// padlocked, with a sign
function stall(tarp, open, r) {
  const g = new THREE.Group(), wood = L(0x3a2a1e), iron = L(0x2a2a2e), cloth = L(tarp);
  for (const [x, z] of [[-0.75, 0.35], [0.75, 0.35], [-0.75, -0.45], [0.75, -0.45]]) box(g, 0.08, 2.1, 0.08, iron, x, 1.05, z);
  box(g, 1.7, 0.08, 1.05, cloth, 0, 2.18, -0.05, 0, -0.22); // the roof, sloping to the front
  for (let i = 0; i < 6; i++) box(g, 0.26, 0.16 + r() * 0.12, 0.02, cloth, -0.64 + i * 0.26, 1.98 - (i % 2) * 0.04, 0.48); // a ragged valance
  box(g, 1.55, 0.9, 0.5, wood, 0, 0.45, 0.05); box(g, 1.62, 0.06, 0.56, L(0x5a4430), 0, 0.92, 0.05); // the counter
  box(g, 1.5, 1.5, 0.05, L(0x241a14), 0, 1.1, -0.45); // the back
  if (!open) {
    box(g, 1.6, 1.25, 0.04, cloth, 0, 1.2, 0.36); // the front let down
    const fold = L(new THREE.Color(tarp).multiplyScalar(0.65).getHex());
    for (let i = 0; i < 4; i++) box(g, 0.02, 1.2, 0.05, fold, -0.6 + i * 0.4, 1.2, 0.38); // its folds
    box(g, 0.2, 0.24, 0.05, L(0x8a7a3a), 0, 0.85, 0.4); box(g, 0.1, 0.1, 0.06, L(0x2a2a2e), 0, 0.72, 0.42); // the lock-plate and padlock
  }
  return g;
}
// what's on Grist's counter: heaps of scrap and rags, a set of scales, bundles, a skull on a stick
function gristWares(g, r) {
  const scrap = [L(0x6a5e52), L(0x4a4038), L(0x7a6a50), L(0x5a4a3a), L(0x8a5a3a)];
  for (let i = 0; i < 14; i++) box(g, 0.1 + r() * 0.14, 0.05 + r() * 0.1, 0.08 + r() * 0.12, scrap[i % 5], -0.65 + r() * 0.75, 1.0 + r() * 0.06, -0.12 + r() * 0.3, r() * 3, r() * 0.4, r() * 0.4);
  const sc = new THREE.Group(); sc.position.set(0.45, 0.95, 0.05); g.add(sc);
  const brass = L(0xa8843a); box(sc, 0.04, 0.4, 0.04, brass, 0, 0.2, 0); box(sc, 0.5, 0.03, 0.03, brass, 0, 0.4, 0);
  for (const sx of [-1, 1]) { box(sc, 0.01, 0.16, 0.01, brass, sx * 0.24, 0.32, 0); cyl(sc, 0.08, 0.06, 0.03, brass, sx * 0.24, 0.23, 0, 8); }
  for (let i = 0; i < 4; i++) box(g, 0.08, 0.5 + r() * 0.3, 0.02, L([0x5a3a2a, 0x4a4a3a, 0x6a2a1a, 0x3a3a4a][i]), -0.55 + i * 0.3, 1.55, -0.4, 0, 0, (r() - 0.5) * 0.2); // rags hung on the back
  cyl(g, 0.02, 0.02, 0.8, L(0x4a3020), 0.75, 1.3, 0.3, 5); box(g, 0.14, 0.14, 0.14, L(0xd8ccb0), 0.75, 1.75, 0.3); box(g, 0.1, 0.03, 0.02, B(0xff3a1a), 0.75, 1.76, 0.38); // a servo-skull on a pole
  return sc;
}
// Vesk's: iron bars across the front, glass cases lit from inside with his best, red cloth, candles
function veskWares(g, r) {
  const iron = L(0x2a2a30), cloth = L(0x5a1014);
  box(g, 1.55, 0.04, 0.5, cloth, 0, 0.95, 0.05);
  for (const [x, c] of [[-0.45, 0x4a9aff], [0, 0xb05aff], [0.45, 0xffa82a]]) {
    box(g, 0.34, 0.34, 0.32, new THREE.MeshBasicMaterial({ color: 0x9ab0c8, transparent: true, opacity: 0.18, depthWrite: false }), x, 1.15, 0.0);
    box(g, 0.1, 0.1, 0.1, B(c), x, 1.08, 0.0, 0.6, 0.3); box(g, 0.36, 0.03, 0.34, L(0xb89a4a), x, 1.33, 0.0);
  }
  for (let i = 0; i < 9; i++) box(g, 0.03, 1.0, 0.03, iron, -0.72 + i * 0.18, 1.48, 0.33); box(g, 1.6, 0.05, 0.05, iron, 0, 1.98, 0.33); // the bars
  for (let i = 0; i < 3; i++) { const h = 0.12 + r() * 0.1; cyl(g, 0.025, 0.03, h, L(0xd8ccb0), 0.62 - i * 0.07, 0.97 + h / 2, 0.22, 5); box(g, 0.02, 0.04, 0.02, B(0xffd080), 0.62 - i * 0.07, 0.99 + h, 0.22); }
}

export class Bazaar {
  constructor(game) {
    this.game = game; this.active = false; this.time = 0;
    this.camera = new THREE.PerspectiveCamera(48, 16 / 9, 0.1, 80);
    this.ray = new THREE.Raycaster(); this.ptr = new THREE.Vector2(); this.hover = null; this.mouseX = 0;
    this.buildDom();
  }

  buildDom() {
    const el = document.createElement('div'); el.id = 'bazaar'; el.className = 'hidden';
    el.innerHTML = `
      <div class="hm-top"><div class="hm-left"><button class="mini-btn" id="bz-back">Sanctum</button></div>
        <div class="bz-title" id="bz-title">The Bazaar</div><div id="bz-gold"></div></div>
      <div id="bz-label" class="hidden"></div>
      <div id="bz-panel" class="hidden"><div class="hm-sh"><span id="bz-name"></span><button class="mini-btn" id="bz-close">Close</button></div>
        <div id="bz-head"></div>
        <div class="hm-tabs bz-tabs"><button data-bt="buy">Buy</button><button data-bt="sell">Sell</button><button data-bt="quests">Quests</button></div>
        <div id="bz-body"></div><div id="bz-msg"></div></div>
      <div id="bz-hint">Click a trader to deal with them</div>`;
    document.body.append(el);
    this.el = el; this.tab = 'buy';
    pxButton($('bz-back'), 'rust', 2); pxButton($('bz-close'), 'ash', 2);
    pxText($('bz-title'), { px: innerHeight > 500 ? 3 : 2 });
    $('bz-back').addEventListener('click', (e) => { e.stopPropagation(); this.close(); });
    $('bz-close').addEventListener('click', (e) => { e.stopPropagation(); this.setPanel(null); });
    $('bz-panel').addEventListener('click', (e) => e.stopPropagation());
    el.querySelectorAll('.bz-tabs button').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); this.tab = b.dataset.bt; this.renderPanel(); this.game.audio.play('uiTick', 0.6); }));
    el.addEventListener('pointermove', (e) => { this.mouseX = (e.clientX / innerWidth) * 2 - 1; if (e.pointerType !== 'touch' && e.target === el) this.pick(e); else if (e.target !== el) this.setHover(null); });
    el.addEventListener('pointerleave', () => this.setHover(null));
    el.addEventListener('pointerdown', (e) => { this.touch = e.pointerType === 'touch'; });
    el.addEventListener('click', (e) => {
      if (e.target !== el) return;
      const hit = this.pick(e, true);
      if (this.touch) { if (hit && hit === this.lastTap) this.use(hit); this.lastTap = hit; return; }
      if (hit) this.use(hit);
    });
  }

  get data() { return this.game.accounts.data; }

  open() {
    const d = this.data;
    if (!d || !bazaarOpen(d)) return;
    this.game.hermitage.close(false);
    this.active = true; this.el.classList.remove('hidden');
    this.buildScene();
    this.setPanel(null); this.refresh();
    this.game.audio.play('uiTick', 1);
  }
  close() {
    this.active = false; this.setPanel(null); this.setHover(null);
    this.el.classList.add('hidden');
    this.game.hermitage.open(this.game.hermitage.kind);
  }
  refresh() {
    const d = this.data;
    $('bz-gold').textContent = d ? `◆ ${d.gold}  ·  ✦ ${cosmetics(d).emeralds || 0}` : '';
    for (const p of this.people || []) {
      const T = p.T, s = traderState(d, T.id);
      p.bang.visible = claimable(d, T);
      p.sigil.visible = levelOf(s.xp) >= MAX_LEVEL;
    }
  }

  // ---------- the scene ----------
  buildScene() {
    if (this.scene) this.scene.traverse((o) => { o.geometry?.dispose(); });
    const d = this.data, r = seeded(4421), sky = 0x120a08;
    const scene = new THREE.Scene(); scene.background = new THREE.Color(sky); scene.fog = new THREE.Fog(sky, 11, 24);
    scene.add(new THREE.HemisphereLight(0xa08a7a, 0x1a100a, 1.1));
    const fill = new THREE.PointLight(0xffc890, 6, 14, 1.2); fill.position.set(0, 4.5, 4.5); scene.add(fill); // (a warm wash from the camera's side)
    const g = new THREE.Group(); scene.add(g);
    // the deck they stand on: a raised round of plating with seams and a brass rim, the market's middle open
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(7.6, 7.8, 0.2, 48), L(0x4a423a)); deck.position.set(0, -0.1, 1.5); g.add(deck);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(7.7, 0.06, 4, 56), L(0x8a6a34)); rim.rotation.x = Math.PI / 2; rim.position.set(0, 0.01, 1.5); g.add(rim);
    for (let i = -7; i <= 7; i++) { box(g, 0.03, 0.01, 15, L(0x2a2420), i, 0.005, 1.5); box(g, 15, 0.01, 0.03, L(0x2a2420), 0, 0.005, 1.5 + i); }
    // the broken overpass above and behind, and girders on the skyline
    box(g, 22, 0.8, 2.2, L(0x1a1614), 0, 6.2, -6.5, 0, 0, 0.04); box(g, 1.2, 7, 1.2, L(0x1e1a18), -7.5, 3.2, -7); box(g, 1.2, 7, 1.2, L(0x1e1a18), 7.2, 3.2, -6.6);
    for (let i = 0; i < 7; i++) box(g, 0.2, 1.4 + r() * 1.5, 0.2, L(0x1a1614), -6 + i * 2, 5.4, -6.5, 0, 0, (r() - 0.5) * 0.5); // hanging wreckage
    // the stalls in an arc facing the camera, each with its lamp
    this.people = []; this.items = []; this.lamps = [];
    const TARPS = [0x5a2a1a, 0x3a3a2a, 0x2a3a4a, 0x4a2a3a, 0x6a4a1a, 0x5a1014, 0x2a4a3a, 0x4a3a2a, 0x3a2a4a, 0x5a3a1a];
    for (let i = 0; i < BOOTHS; i++) {
      const a = (-1 + (2 * i) / (BOOTHS - 1)) * 0.78, R = 7.0, x = Math.sin(a) * R, z = 4.5 - Math.cos(a) * R;
      const T = TRADERS.find((t) => t.booth === i), open = !!T && T.unlocked(d);
      const S = stall(T?.id === 'vesk' ? 0x3a1014 : TARPS[i], open, r); S.position.set(x, 0, z); S.rotation.y = -a; S.scale.setScalar(0.82); g.add(S);
      const lampCol = open ? (T.id === 'vesk' ? 0xff8a5a : 0xffb060) : 0x8a6a4a;
      const lamp = box(S, 0.14, 0.18, 0.14, B(lampCol), 0.62, 1.9, 0.55); box(S, 0.02, 0.2, 0.02, L(0x1e1e22), 0.62, 2.06, 0.55);
      const pl = new THREE.PointLight(lampCol, open ? 7 : 2, open ? 5.5 : 3.5, 1.4); pl.position.set(x + Math.sin(a) * -1.3, 2.1, z + Math.cos(a) * 1.3); scene.add(pl);
      this.lamps.push({ pl, base: open ? 7 : 2, ph: r() * 6, lamp });
      if (open) {
        const P0 = T.id === 'grist' ? makeGrist() : makeVesk(scene), wares = T.id === 'grist' ? gristWares(S, r) : veskWares(S, r);
        const rig = P0.rig; rig.root.position.set(x - Math.sin(a) * 0.8, 0, z + Math.cos(a) * 0.8); rig.root.rotation.y = -a; rig.idle = true; scene.add(rig.root);
        rig.apply(P0.pose(0, 0), 1, 60);
        const bang = pixelSprite(BANG, SPAL), sigil = pixelSprite(SIGILS[T.id], SPAL);
        for (const s of [bang, sigil]) { s.scale.set(0.7, 0.7, 1); scene.add(s); }
        const head = rig.root.scale.y * 2.05;
        const person = { T, ...P0, wares, bang, sigil, at: rig.root.position.clone(), head };
        this.people.push(person);
        this.items.push({ id: T.id, T, group: rig.root, label: T.name, sub: T.title });
        this.items.push({ id: T.id, T, group: S, label: T.name, sub: T.title, stallOf: rig.root });
      } else {
        const sub = T ? T.lockText : 'Shuttered. Opens later';
        this.items.push({ id: 'shut' + i, T: T || null, group: S, label: T ? T.name : 'Shuttered stall', sub, locked: true });
        if (T) { const plate = box(S, 0.9, 0.22, 0.04, L(0x6a5a3a), 0, 2.32, 0.5); plate.rotation.x = -0.2; }
      }
    }
    // braziers either side, and strings of little lights between the stalls
    for (const sx of [-1, 1]) {
      const bx = sx * 3.4, bz = 2.2;
      cyl(g, 0.28, 0.2, 0.6, L(0x2a2420), bx, 0.3, bz, 8); cyl(g, 0.3, 0.3, 0.06, L(0x6a4a24), bx, 0.62, bz, 8);
      const fl = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 6), new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })); fl.position.set(bx, 0.9, bz); g.add(fl);
      const pl = new THREE.PointLight(0xff8a3a, 5, 6, 1.4); pl.position.set(bx, 1.2, bz); scene.add(pl);
      this.lamps.push({ pl, base: 5, ph: r() * 6, flame: fl });
    }
    for (let k = 0; k < 48; k++) { const a = (-1 + (2 * k) / 47) * 0.9, R = 6.4; box(g, 0.06, 0.06, 0.06, B([0xffc060, 0xff6a3a, 0xffe0a0][k % 3]), Math.sin(a) * R, 2.45 - Math.abs(Math.sin(k * 0.66)) * 0.25, 4.5 - Math.cos(a) * R); }
    this.scene = scene;
    for (const it of this.items) this.addOutline(it);
    this.camera.position.set(0, 2.55, 5.3); this.camera.lookAt(0, 1.2, -1.4);
    this.refresh();
  }

  addOutline(item) {
    item.outlines = [];
    const meshes = [];
    item.group.traverse((o) => { if (o.isMesh && !o.userData.outline && !o.material.transparent && !(o.material instanceof THREE.MeshBasicMaterial)) meshes.push(o); });
    for (const m of meshes) { const o = new THREE.Mesh(m.geometry, FAINT); o.userData.outline = true; o.scale.setScalar(1.06); o.raycast = () => {}; o.visible = false; m.add(o); item.outlines.push(o); }
  }
  pick(e) {
    if (!this.scene) return null;
    const r = this.el.getBoundingClientRect();
    this.ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(this.ptr, this.camera);
    let best = null, bd = Infinity;
    for (const it of this.items) { const h = this.ray.intersectObject(it.group, true); if (h.length && h[0].distance < bd) { bd = h[0].distance; best = it; } }
    this.setHover(best);
    return best;
  }
  setHover(it) {
    // (a trader and his stall light up together)
    const same = (a, b) => a && b && a.id === b.id;
    if (same(this.hover, it)) return;
    for (const x of this.items || []) if (this.hover && same(x, this.hover)) for (const o of x.outlines) o.visible = false;
    this.hover = it;
    if (it) { for (const x of this.items) if (same(x, it)) for (const o of x.outlines) { o.visible = true; o.material = it.locked ? FAINT : OUTLINE; } this.game.audio.play('uiTick', 0.5); }
    this.el.style.cursor = it && !it.locked ? 'pointer' : '';
    const lab = $('bz-label'); lab.classList.toggle('hidden', !it);
    if (it) lab.innerHTML = `<b>${it.label}</b><span>${it.locked ? '🔒 ' : ''}${it.sub}</span>`;
    $('bz-hint').classList.add('gone');
  }
  use(it) {
    this.game.audio.unlock();
    if (it.locked) { this.game.audio.play('clang', 0.4); return; }
    this.setPanel(it.T);
  }

  // ---------- a trader's window ----------
  setPanel(T) {
    this.trader = T;
    $('bz-panel').classList.toggle('hidden', !T);
    if (T) { $('bz-msg').textContent = ''; this.renderPanel(); this.game.audio.play('uiTick', 1); }
  }
  say(text, good = true) { const m = $('bz-msg'); m.textContent = text; m.className = good ? 'good' : 'bad'; }
  renderPanel() {
    const T = this.trader, d = this.data;
    if (!T || !d) return;
    const s = traderState(d, T.id), lvl = levelOf(s.xp), next = LEVEL_XP[lvl] ?? null, prev = LEVEL_XP[lvl - 1];
    $('bz-name').textContent = T.name;
    $('bz-head').innerHTML = `<div class="bz-who">${T.title}. <i>${T.blurb}</i></div>
      <div class="bz-lvl"><b>Level ${lvl}</b>${lvl < MAX_LEVEL ? `<span class="bz-bar"><i style="width:${Math.round(((s.xp - prev) / (next - prev)) * 100)}%"></i></span><em>${s.xp - prev} / ${next - prev} xp</em>` : '<em>Most trusted</em>'}</div>
      <div class="bz-terms">Pays you ${Math.round(BUY_RATE[lvl - 1] * 100)}% of an item's worth${lvl < MAX_LEVEL ? ` (${Math.round(BUY_RATE[lvl] * 100)}% at level ${lvl + 1})` : ''} · sells at ${T.markup}×</div>
      <div class="bz-perk ${lvl >= MAX_LEVEL ? 'on' : ''}">${lvl >= MAX_LEVEL ? '✦' : 'At level 5'}: <b>${T.perk.name}</b>: ${T.perk.desc}</div>`;
    document.querySelectorAll('.bz-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.bt === this.tab));
    const qb = document.querySelector('.bz-tabs [data-bt=quests]'); qb.classList.toggle('ready', claimable(d, T));
    const body = $('bz-body'); body.replaceChildren(); body.scrollTop = 0;
    const row = (id, right, btns) => {
      const it = ITEMS[id], R = RARITY[it.rarity], el = document.createElement('div'); el.className = 'bz-row';
      el.append(iconEl(id, 2));
      const nm = document.createElement('div'); nm.className = 'bz-nm'; nm.innerHTML = `<b style="color:${R.color}">${it.name}</b><span>${R.name} · worth ◆ ${itemValue(id)}</span>`; el.append(nm);
      const rt = document.createElement('div'); rt.className = 'bz-rt'; rt.innerHTML = right; el.append(rt);
      for (const [label, fn, ok] of btns) { const b = document.createElement('button'); b.className = 'bz-btn'; b.textContent = label; b.disabled = !ok; b.addEventListener('click', (e) => { e.stopPropagation(); fn(); }); el.append(b); }
      body.append(el);
    };
    const done = () => { this.game.accounts.save(); this.refresh(); this.renderPanel(); this.game.hermitage.refresh?.(); };
    if (this.tab === 'buy') {
      const ids = Object.keys(s.stock).sort((a, b) => RARITY_ORDER(a, b));
      for (const id of ids) {
        const price = sellPrice(T, id), left = s.stock[id];
        row(id, `<b>◆ ${price}</b><span>${left} in stock</span>`, [['Buy', () => { if (buy(d, T, id)) { this.game.audio.play('uiTick', 1); this.say(`Bought ${ITEMS[id].name} for ◆ ${price}.`); done(); } }, left > 0 && d.gold >= price]]);
      }
      if (T.runes) { const n = document.createElement('div'); n.className = 'bz-note'; n.textContent = 'Runes: the shelf is bare for now. She says she\'s expecting some.'; body.append(n); }
      const n = document.createElement('div'); n.className = 'bz-note'; n.textContent = 'Stock refills after every raid, and grows as this trader levels up.'; body.append(n);
    } else if (this.tab === 'sell') {
      const ids = Object.keys(d.items || {}).filter((id) => d.items[id] > 0 && dealsIn(T, id)).sort((a, b) => RARITY_ORDER(b, a));
      for (const id of ids) {
        const pay = buyPrice(T, id, lvl), n = d.items[id];
        row(id, `<b>◆ ${pay}</b><span>you have ${n}</span>`, [
          ['Sell', () => { const got = sell(d, T, id, 1); if (got) { this.game.audio.play('uiTick', 1); this.say(`Sold ${ITEMS[id].name} for ◆ ${got}.`); done(); } }, true],
          [`All ×${n}`, () => { const got = sell(d, T, id, n); if (got) { this.game.audio.play('heal', 0.5); this.say(`Sold ${n} ${ITEMS[id].name} for ◆ ${got}.`); done(); } }, n > 1]]);
      }
      if (!ids.length) { const e = document.createElement('div'); e.className = 'bz-note'; e.textContent = `Nothing in your stash this trader wants. ${T.name} deals in ${T.rarities.join(', ')} materials.`; body.append(e); }
    } else this.renderQuests(T, s, done);
  }
  renderQuests(T, s, done) {
    const d = this.data, body = $('bz-body'), Q = currentQuest(d, T);
    const head = document.createElement('div'); head.className = 'bz-note'; head.textContent = Q ? `Quest ${s.q + 1} of ${T.quests.length}` : `All ${T.quests.length} quests done.`; body.append(head);
    if (!Q) { const e = document.createElement('div'); e.className = 'bz-quest'; e.innerHTML = `<i>"Nothing more for now. Come back when the world's changed."</i>`; body.append(e); return; }
    const P0 = questProgress(d, T), card = document.createElement('div'); card.className = 'bz-quest' + (P0.ready ? ' ready' : '');
    let goal = '';
    if (Q.kind === 'hunt') goal = `Kill ${Q.n} ${enemyName(Q.type, Q.n)} (your own kills, in any raid): <b>${P0.have} / ${P0.need}</b>`;
    else if (Q.kind === 'supply') goal = 'Bring: ' + P0.parts.map((p) => `<b style="color:${RARITY[ITEMS[p.id].rarity].color}">${ITEMS[p.id].name}</b> ${p.have} / ${p.need}`).join(', ') + ' (from your stash)';
    else goal = `Find <b style="color:${RARITY.epic.color}">${ITEMS[Q.relic].name}</b>, hidden somewhere in <b>${AREA_NAMES[Q.area] || Q.area}</b>: ${P0.ready ? '<b>in your stash</b>' : 'not found yet'}`;
    card.innerHTML = `<h4>${Q.title}</h4><i>"${Q.say}"</i><div class="bz-goal">${goal}</div><div class="bz-reward">Reward: ◆ ${Q.gold} · ✦ ${Q.em} emeralds · ${Q.xp} xp</div>`;
    const b = document.createElement('button'); b.className = 'bz-btn bz-claim'; b.textContent = P0.ready ? 'Hand in' : 'Not done yet'; b.disabled = !P0.ready;
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const got = claim(d, T);
      if (!got) return;
      this.game.addEmeralds(got.em);
      this.game.audio.play(got.levelUp ? 'victory' : 'heal', got.levelUp ? 0.6 : 0.8);
      this.say(`${got.quest.title}: ◆ ${got.gold}, ✦ ${got.em}, ${got.xp} xp.${got.levelUp ? ` ${T.name} is now level ${got.levelUp}!${got.levelUp >= MAX_LEVEL ? ` ${T.perk.name} is yours: ${T.perk.desc.toLowerCase()}.` : ''}` : ''}`);
      done();
    });
    card.append(b); body.append(card);
  }

  // ---------- per frame (Game.loop draws it in place of the world) ----------
  update(dt) {
    if (!this.scene) return;
    this.time += dt; const t = this.time;
    for (const l of this.lamps) { l.pl.intensity = l.base * (0.88 + Math.sin(t * 7 + l.ph) * 0.08 + Math.sin(t * 17 + l.ph) * 0.04); if (l.flame) { l.flame.scale.y = 1 + Math.sin(t * 11 + l.ph) * 0.15; } }
    for (const p of this.people) {
      const look = Math.max(-0.6, Math.min(0.6, this.mouseX * 0.8 - p.rig.root.rotation.y * 0.3)); // (Vesk's masked head follows you)
      p.rig.apply(p.pose(t, look), dt, 6);
      p.tick?.(t, dt);
      const y = p.head + 0.55 + Math.sin(t * 3) * 0.06;
      p.bang.position.set(p.at.x, y, p.at.z); p.sigil.position.set(p.at.x, y + (p.bang.visible ? 0.75 : 0), p.at.z);
    }
    if (this.hover) {
      const b = new THREE.Box3().setFromObject(this.hover.stallOf || this.hover.group), top = new THREE.Vector3((b.min.x + b.max.x) / 2, b.max.y + 0.2, (b.min.z + b.max.z) / 2).project(this.camera);
      const lab = $('bz-label'), r = this.el.getBoundingClientRect();
      lab.style.left = `${(top.x * 0.5 + 0.5) * r.width}px`; lab.style.top = `${(-top.y * 0.5 + 0.5) * r.height}px`;
    }
  }
  resize(aspect) { this.camera.aspect = aspect; this.camera.fov = aspect < 1.2 ? 70 : 48; this.camera.updateProjectionMatrix(); }
}
