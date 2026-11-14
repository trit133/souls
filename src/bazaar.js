// The Bazaar: a night market under the hive's skyline, reached from the Sanctum once Executor Hask is dead (traders.js
// has the rules). Ten traders, each in their own set piece (bazaarsets.js: a carpet, a desk, a tent, a cart, a junk
// pile, a container ...): four on the market floor in front, six up on a raised terrace behind, lights strung
// between, clutter everywhere underfoot, the night sky, a moon and the city's lit towers beyond. Like the Sanctum the
// scene is the menu: hover a trader for a label, click for their window (Buy / Sell / Quests). A trader still locked
// stands there grey and still; hover them for what opens them. A trader with a quest ready to hand in has a "!" over
// their head; a trader at level 5 has their buff's sigil there for good.
import * as THREE from 'three';
import { SETS, greyOut, clutter, backdrop } from './bazaarsets.js';
import { pxButton, pxText } from './pixelmenus.js';
import { ITEMS, RARITY, iconEl, itemValue } from './items.js';
import { cosmetics } from './outfits.js';
import { TRADERS, MAX_LEVEL, LEVEL_XP, BUY_RATE, traderState, levelOf, sellPrice, buyPrice, dealsIn, buy, sell,
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
      if (!p.open) continue;
      const T = p.T, s = traderState(d, T.id);
      p.bang.visible = claimable(d, T);
      p.sigil.visible = levelOf(s.xp) >= MAX_LEVEL;
    }
  }

  // ---------- the scene ----------
  buildScene() {
    if (this.scene) this.scene.traverse((o) => { o.geometry?.dispose(); });
    const d = this.data, r = seeded(4421), sky = 0x0a0c16;
    const scene = new THREE.Scene(); scene.background = new THREE.Color(sky); scene.fog = new THREE.Fog(sky, 13, 34);
    scene.add(new THREE.HemisphereLight(0x8a90b8, 0x1a100a, 0.9)); // (moonlight from above, the ground's warmth below)
    const fill = new THREE.PointLight(0xffc890, 5, 16, 1.2); fill.position.set(0, 4.5, 5.5); scene.add(fill);
    const moonLight = new THREE.DirectionalLight(0x9aa8d8, 0.5); moonLight.position.set(-6, 10, -4); scene.add(moonLight);
    this.sky = backdrop(scene, r);
    const g = new THREE.Group(); scene.add(g);
    // the market floor: worn plating with seams, a brass edge; the terrace behind, raised, with steps up the middle
    box(g, 17, 0.2, 9, L(0x4a423a), 0, -0.1, -0.4); box(g, 17.2, 0.06, 0.08, L(0x8a6a34), 0, 0.02, 4.05);
    for (let i = -8; i <= 8; i++) box(g, 0.03, 0.01, 9, L(0x2a2420), i, 0.005, -0.4);
    for (let i = -4; i <= 4; i++) box(g, 17, 0.01, 0.03, L(0x2a2420), 0, 0.005, -0.4 + i);
    const TY = 1.1, TZ = -5.0;
    box(g, 16, TY, 4.6, L(0x3a3430), 0, TY / 2, TZ); box(g, 16, 0.08, 4.6, L(0x4e463e), 0, TY + 0.02, TZ);
    for (let i = 0; i < 16; i++) box(g, 0.08, TY, 0.06, L(0x2a2420), -7.5 + i, TY / 2, TZ + 2.31); // its front: iron ribs
    for (let k = 0; k < 4; k++) box(g, 1.6, 0.28, 0.32, L(0x4e463e), 0, 0.14 + k * 0.275, TZ + 2.75 - k * 0.3); // the steps
    for (const sx of [-1, 1]) { box(g, 6.6, 0.05, 0.05, L(0x6a5a3a), sx * 4.6, TY + 0.85, TZ + 2.25); for (let i = 0; i < 8; i++) box(g, 0.05, 0.85, 0.05, L(0x3a3430), sx * (1.6 + i * 0.86), TY + 0.43, TZ + 2.25); } // the railing
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) box(g, 0.5, 0.75, 0.02, L([0x5a1414, 0x3a2a4a, 0x2a3a2a][i]), sx * (2.4 + i * 1.9), 0.62, TZ + 2.34); // banners on its face
    // where each trader stands: four on the floor, six on the terrace, all turned to the camera
    const cam = new THREE.Vector3(0, 0, 8);
    const SPOTS = {
      krell: [-4.9, 0, -0.3], grist: [-1.85, 0, -0.85], vesk: [1.85, 0, -0.85], tobias: [4.9, 0, -0.3],
      kessa: [-6.3, TY, TZ - 0.3], kettle: [-3.8, TY, TZ - 0.6], sorrow: [-1.3, TY, TZ - 0.8], ostrava: [1.3, TY, TZ - 0.8], pip: [3.8, TY, TZ - 0.6], pilgrim: [6.3, TY, TZ - 0.3],
    };
    this.people = []; this.items = []; this.lamps = []; this.ticks = [];
    const keep = [{ x: 0, z: 1.8, r: 1.6 }, { x: 0, z: TZ + 2.6, r: 1.0 }]; // (the walk up the middle and the steps stay clear)
    for (const T of TRADERS) {
      const [x, y, z] = SPOTS[T.id], open = T.unlocked(d), S = new THREE.Group();
      S.position.set(x, y, z); S.rotation.y = Math.atan2(cam.x - x, cam.z - z); g.add(S);
      keep.push({ x, z, r: 1.45, y });
      const P0 = SETS[T.id](S, r, { scene, alive: open });
      const rig = P0.rig; rig.root.position.set(...P0.at); rig.root.rotation.y = P0.ry || 0; S.add(rig.root);
      rig.apply(P0.pose(0, 0), 1, 60);
      if (!open) greyOut(rig.root);
      // the lamp over them: bright where they're open, a dim glow where they're still to come
      const la = new THREE.Vector3(...P0.lightAt).applyAxisAngle(new THREE.Vector3(0, 1, 0), S.rotation.y).add(S.position);
      const pl = new THREE.PointLight(open ? P0.light : 0x6a6a7a, open ? 6 : 1.6, open ? 5 : 3.5, 1.4); pl.position.copy(la); scene.add(pl);
      this.lamps.push({ pl, base: open ? 6 : 1.6, ph: r() * 6 });
      const bang = pixelSprite(BANG, SPAL), sigil = pixelSprite(SIGILS[T.id] || SIGILS.grist, SPAL);
      for (const sp of [bang, sigil]) { sp.scale.set(0.7, 0.7, 1); sp.visible = false; scene.add(sp); }
      const person = { T, open, ...P0, bang, sigil };
      this.people.push(person);
      this.items.push({ id: T.id, T, group: S, label: T.name, sub: open ? T.title : T.lockText, locked: !open, head: rig.j.head });
    }
    // clutter on the floor and on the terrace, lanterns among it
    const glows = [];
    clutter(g, r, { x0: -8, x1: 8, z0: -2.6, z1: 3.6, y: 0, n: 34 }, keep, glows);
    clutter(g, r, { x0: -7.6, x1: 7.6, z0: TZ - 2.1, z1: TZ + 1.9, y: TY, n: 18 }, keep.filter((k) => k.y !== 0 || k.r < 1.5), glows);
    for (const at of glows) { const pl = new THREE.PointLight(0xffb060, 1.4, 2.6, 1.6); pl.position.set(...at); scene.add(pl); this.lamps.push({ pl, base: 1.4, ph: r() * 6 }); }
    // strings of little lights over the floor and along the back of the terrace; lamp posts up there
    const string = (x0, x1, y, z, sag, n) => { for (let k = 0; k <= n; k++) { const u = k / n, x = x0 + (x1 - x0) * u; box(g, 0.07, 0.07, 0.07, B([0xffc060, 0xff6a3a, 0xffe0a0, 0x8ab0ff][k % 4]), x, y - Math.sin(u * Math.PI) * sag, z); } };
    for (const [x0, x1] of [[-8, -3.2], [-3.2, 3.2], [3.2, 8]]) string(x0, x1, 3.0, -1.6, 0.5, 18);
    for (const [x0, x1] of [[-8, -2.7], [-2.7, 2.7], [2.7, 8]]) string(x0, x1, TY + 3.0, TZ - 2.2, 0.4, 18);
    for (const x of [-8, -3.2, 3.2, 8]) cyl(g, 0.05, 0.06, 3.1, L(0x2a2a2e), x, 1.55, -1.6, 5);
    for (const x of [-7.7, -5.1, -2.6, 0, 2.6, 5.1, 7.7]) {
      cyl(g, 0.05, 0.06, 3.2, L(0x2a2a2e), x, TY + 1.6, TZ - 2.2, 5); box(g, 0.24, 0.3, 0.24, B(0xffd090), x, TY + 3.25, TZ - 2.2); box(g, 0.32, 0.06, 0.32, L(0x2a2a2e), x, TY + 3.43, TZ - 2.2);
      const pl = new THREE.PointLight(0xffc080, 3, 6, 1.5); pl.position.set(x, TY + 3.0, TZ - 1.9); scene.add(pl); this.lamps.push({ pl, base: 3, ph: r() * 6 });
    }
    // braziers at the front corners
    for (const sx of [-1, 1]) {
      const bx = sx * 6.6, bz = 2.4;
      cyl(g, 0.3, 0.22, 0.65, L(0x2a2420), bx, 0.32, bz, 8); cyl(g, 0.33, 0.33, 0.06, L(0x6a4a24), bx, 0.66, bz, 8);
      const fl = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.55, 6), new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })); fl.position.set(bx, 0.95, bz); g.add(fl);
      const pl = new THREE.PointLight(0xff8a3a, 5, 6, 1.4); pl.position.set(bx, 1.3, bz); scene.add(pl);
      this.lamps.push({ pl, base: 5, ph: r() * 6, flame: fl });
    }
    this.scene = scene;
    for (const it of this.items) this.addOutline(it);
    this.camera.position.set(0, 3.3, 7.6); this.camera.lookAt(0, 1.75, -2.0);
    this.camBase = this.camera.position.clone();
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
    if (this.hover === it) return;
    if (this.hover) for (const o of this.hover.outlines) o.visible = false;
    this.hover = it;
    if (it) { for (const o of it.outlines) { o.visible = true; o.material = it.locked ? FAINT : OUTLINE; } this.game.audio.play('uiTick', 0.5); }
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
    this.sky?.(t);
    for (const l of this.lamps) { l.pl.intensity = l.base * (0.88 + Math.sin(t * 7 + l.ph) * 0.08 + Math.sin(t * 17 + l.ph) * 0.04); if (l.flame) l.flame.scale.y = 1 + Math.sin(t * 11 + l.ph) * 0.15; }
    // the camera drifts a little with the mouse
    if (this.camBase) { this.camera.position.x += (this.camBase.x + this.mouseX * 0.6 - this.camera.position.x) * Math.min(1, dt * 3); this.camera.lookAt(this.camera.position.x * 0.4, 1.75, -2.0); }
    const V = new THREE.Vector3();
    for (const p of this.people) {
      if (p.open) {
        const look = p.look ? Math.max(-0.6, Math.min(0.6, this.mouseX * 0.8)) : 0; // (Vesk's masked head follows you)
        p.rig.apply(p.pose(t, look), dt, 6);
        p.tick?.(t, dt);
      }
      p.rig.j.head.getWorldPosition(V);
      const y = V.y + 0.75 + Math.sin(t * 3) * 0.06;
      p.bang.position.set(V.x, y, V.z); p.sigil.position.set(V.x, y + (p.bang.visible ? 0.75 : 0), V.z);
    }
    if (this.hover) {
      const top = this.hover.head.getWorldPosition(new THREE.Vector3()); top.y += 0.6; top.project(this.camera);
      const lab = $('bz-label'), r = this.el.getBoundingClientRect();
      lab.style.left = `${(top.x * 0.5 + 0.5) * r.width}px`; lab.style.top = `${(-top.y * 0.5 + 0.5) * r.height}px`;
    }
  }
  resize(aspect) { this.camera.aspect = aspect; this.camera.fov = aspect < 1.2 ? 70 : 48; this.camera.updateProjectionMatrix(); }
}
