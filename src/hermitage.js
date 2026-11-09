// The Hermitage: each character's hideout, the hub between runs. A small dark 3D scene drawn through the game's
// pixel pass: the character sits by their fire (the Knight's stone-ringed campfire, the Rogue's spit fire, the
// Spellsword's purple fire in a black fireplace), which is the light on them; a couple of small lights pick out
// the rest. The things in it are the buttons: hover one and it's outlined with a label over it (on touch, the
// first tap does that and the second opens it).
//   the character  -> their skill tree
//   the wardrobe   -> their skin customizer (left)
//   the stash      -> the lid opens and the stash panel slides in (right); shared by every character
// At the top: back to the title, the character selector (the Spellsword shows locked until bought, with a yes/no to
// unlock it), gold. At the bottom: Solo Raid, Party Raid and the Night Raid toggle once unlocked.
// Kept sparse on purpose: the hideouts will be customizable later.
import * as THREE from 'three';
import { buildHumanoid } from './models.js';
import { P } from './anims.js';
import { CHARS } from './player.js';
import { outfitModel } from './playerkits.js';
import { tickOutfitColors, forgetRig } from './outfits.js';
import { pxButton } from './pixelmenus.js';
import { MAGE_UNLOCK } from './treeui.js';

const $ = (id) => document.getElementById(id);
const NAMES = { knight: 'Knight', rogue: 'Rogue', mage: 'Spellsword' };
export const STASH_SLOTS = 48;
const L = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o });
const OUTLINE = new THREE.MeshBasicMaterial({ color: 0xffd36a, side: THREE.BackSide });

// ---------- little builders ----------
function box(g, w, h, d, mat, x, y, z, ry = 0, rx = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m;
}
function cyl(g, rt, rb, h, mat, x, y, z, seg = 8, rx = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z); m.rotation.set(rx, 0, rz); g.add(m); return m;
}
function rock(g, s, mat, x, y, z, r) {
  const m = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), mat);
  m.position.set(x, y, z); m.rotation.set(r(), r(), r()); m.scale.y = 0.6 + r() * 0.4; g.add(m); return m;
}
function flat(g, geo, mat, x, z, y = 0.02, rz = 0) {
  const m = new THREE.Mesh(geo, mat); m.rotation.x = -Math.PI / 2; m.rotation.z = rz; m.position.set(x, y, z); g.add(m); return m;
}
const seeded = (s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);

// a fire: flickering flame cones and rising sparks; `color` [core, outer]
function fire(g, x, y, z, scale, colors) {
  const f = new THREE.Group(); f.position.set(x, y, z); g.add(f);
  const flames = [];
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.16 * scale * (i ? 0.8 : 1.2), 0.7 * scale * (i ? 0.75 : 1.1), 6), new THREE.MeshBasicMaterial({ color: i ? colors[1] : colors[0], transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    const a = i / 5 * Math.PI * 2;
    m.position.set(i ? Math.cos(a) * 0.12 * scale : 0, 0.3 * scale, i ? Math.sin(a) * 0.12 * scale : 0);
    f.add(m); flames.push({ m, ph: Math.random() * 6, base: m.position.y });
  }
  const sparks = [];
  for (let i = 0; i < 14; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.035), new THREE.MeshBasicMaterial({ color: colors[1], transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    f.add(s); sparks.push({ s, t: Math.random() * 1.6 });
  }
  return {
    group: f,
    update(dt, t) {
      for (const k of flames) { const n = 0.85 + Math.sin(t * 13 + k.ph) * 0.12 + Math.sin(t * 7.3 + k.ph * 2) * 0.08; k.m.scale.set(1, n, 1); k.m.position.y = k.base * n; }
      for (const p of sparks) {
        p.t += dt;
        if (p.t > 1.6) { p.t = 0; p.x = (Math.random() - 0.5) * 0.3 * scale; p.z = (Math.random() - 0.5) * 0.3 * scale; }
        const k = p.t / 1.6;
        p.s.position.set((p.x || 0) + Math.sin(t * 3 + p.t * 5) * 0.05, 0.3 * scale + k * 1.6 * scale, p.z || 0);
        p.s.material.opacity = 1 - k;
      }
    },
  };
}

// the three hideouts
const SCENES = {
  knight: {
    fire: { at: [1.35, 0, 1.25], colors: [0xffe08a, 0xff6a1a], light: 0xff9a4a },
    seatYaw: 0.6, sky: 0x06070a,
    build(g, r) {
      const M = { dirt: L(0x2e2a22), stone: L(0x5e5a52), stoneDk: L(0x3c3a35), grass: L(0x34402a), log: L(0x4a3524), logDk: L(0x2e2218), iron: L(0x55565c), cloth: L(0x6a1e1a), gold: L(0x8a6a2a), wood: L(0x5a3e24) };
      flat(g, new THREE.CircleGeometry(16, 32), M.dirt, 0, 0, 0);
      for (let i = 0; i < 8; i++) flat(g, new THREE.CircleGeometry(0.22 + r() * 0.18, 6), r() < 0.5 ? M.stone : M.stoneDk, -1.6 + r() * 2.4, 1.2 + r() * 1.6, 0.03, r() * 3); // a few flagstones toward you
      for (let i = 0; i < 26; i++) { const a = r() * 6.28, d = 2.5 + r() * 5; const t = cyl(g, 0, 0.06, 0.35 + r() * 0.25, M.grass, Math.cos(a) * d, 0.15, Math.sin(a) * d - 0.5, 3); t.rotation.z = (r() - 0.5) * 0.5; }
      for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; rock(g, 0.16, M.stoneDk, 1.35 + Math.cos(a) * 0.45, 0.06, 1.25 + Math.sin(a) * 0.45, r); } // fire ring
      for (let i = 0; i < 3; i++) { const l = cyl(g, 0.06, 0.06, 0.7, M.logDk, 1.35, 0.1, 1.25, 5, 0, Math.PI / 2); l.rotation.y = i * 1.05; }
      cyl(g, 0.17, 0.17, 1.6, M.log, 0, 0.17, 0, 7, 0, Math.PI / 2).rotation.y = 0.6; // the log he sits on
      // a weapon rack and a war banner behind
      for (const s of [-0.6, 0.6]) box(g, 0.1, 1.3, 0.1, M.wood, -2.3 + s, 0.65, -2.6);
      box(g, 1.5, 0.08, 0.08, M.wood, -2.3, 1.15, -2.6);
      for (let i = 0; i < 3; i++) box(g, 0.04, 1.6, 0.04, M.iron, -2.75 + i * 0.45, 0.9, -2.5, 0, -0.12);
      cyl(g, 0.05, 0.06, 3.2, M.logDk, 2.6, 1.6, -2.8, 5);
      box(g, 0.9, 1.6, 0.03, M.cloth, 3.08, 2.3, -2.8); box(g, 0.3, 0.3, 0.04, M.gold, 3.08, 2.45, -2.77);
    },
    stash(g) { // an iron-bound chest
      const M = { wood: L(0x5a3a20), iron: L(0x6a6c72), dark: L(0x2a1c10) };
      const c = new THREE.Group();
      box(c, 1.1, 0.55, 0.7, M.wood, 0, 0.28, 0); for (const s of [-0.38, 0.38]) box(c, 0.08, 0.57, 0.72, M.iron, s, 0.28, 0);
      const lid = new THREE.Group(); lid.position.set(0, 0.56, -0.35); c.add(lid);
      box(lid, 1.1, 0.22, 0.7, M.wood, 0, 0.11, 0.35); for (const s of [-0.38, 0.38]) box(lid, 0.08, 0.24, 0.72, M.iron, s, 0.11, 0.35);
      box(lid, 0.16, 0.18, 0.04, M.iron, 0, 0.0, 0.71);
      box(c, 1.0, 0.04, 0.6, M.dark, 0, 0.55, 0);
      return { group: c, lid };
    },
    wardrobe(g) { // an armour stand with a spare suit on it
      const M = { wood: L(0x4a3424), plate: L(0x7a7c84), dark: L(0x2a2a30), cloth: L(0x5a1a18) };
      const w = new THREE.Group();
      box(w, 0.9, 0.12, 0.9, M.wood, 0, 0.06, 0); box(w, 0.1, 1.9, 0.1, M.wood, 0, 1.0, 0); box(w, 0.9, 0.08, 0.08, M.wood, 0, 1.65, 0);
      box(w, 0.62, 0.6, 0.34, M.plate, 0, 1.35, 0); box(w, 0.5, 0.35, 0.3, M.dark, 0, 0.95, 0);
      for (const s of [-1, 1]) box(w, 0.26, 0.14, 0.36, M.plate, s * 0.42, 1.62, 0, 0, 0, -s * 0.3);
      box(w, 0.3, 0.32, 0.32, M.plate, 0, 1.88, 0); box(w, 0.22, 0.04, 0.02, M.dark, 0, 1.9, 0.17);
      box(w, 0.08, 0.6, 0.08, M.cloth, 0, 2.15, -0.05);
      return w;
    },
    lights: [{ at: [-2.4, 1.2, -1.0], color: 0xffb060, power: 3, range: 5, lantern: true }, { at: [2.6, 0.9, 0.9], color: 0xffa050, power: 2.5, range: 4.5, candles: true }],
  },
  rogue: {
    fire: { at: [1.3, 0, 0.9], colors: [0xffd27a, 0xff5a12], light: 0xff8a3a },
    seatYaw: 0.8, sky: 0x050706,
    build(g, r) {
      const M = { floor: L(0x2a2a1c), leaf: L(0x5a3a1c), leaf2: L(0x6a4a1a), moss: L(0x2e3e22), root: L(0x3a2818), wood: L(0x5a4430), stone: L(0x4a4840), cloth: L(0x3a3628), red: L(0x5a1a16), iron: L(0x3a3a40) };
      flat(g, new THREE.CircleGeometry(16, 32), M.floor, 0, 0, 0);
      for (let i = 0; i < 70; i++) flat(g, new THREE.PlaneGeometry(0.16, 0.1), r() < 0.5 ? M.leaf : M.leaf2, (r() - 0.5) * 10, (r() - 0.5) * 8, 0.025, r() * 3); // fallen leaves
      for (let i = 0; i < 6; i++) flat(g, new THREE.CircleGeometry(0.4 + r() * 0.5, 7), M.moss, (r() - 0.5) * 9, (r() - 0.5) * 7 - 1, 0.022);
      for (let i = 0; i < 5; i++) { const a = r() * 6.28; const t = cyl(g, 0.05, 0.1, 2.2, M.root, Math.cos(a) * 4.4, 0.04, Math.sin(a) * 3.6 - 1, 5, 0, Math.PI / 2); t.rotation.y = a + 1.5; } // roots
      for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; rock(g, 0.13, M.stone, 1.3 + Math.cos(a) * 0.38, 0.05, 0.9 + Math.sin(a) * 0.38, r); }
      for (const s of [-1, 1]) { const st = cyl(g, 0.03, 0.03, 0.9, M.root, 1.3 + s * 0.48, 0.42, 0.9, 4, 0, s * 0.2); void st; }
      cyl(g, 0.025, 0.025, 1.1, M.iron, 1.3, 0.84, 0.9, 4, 0, Math.PI / 2); box(g, 0.25, 0.12, 0.12, M.wood, 1.3, 0.76, 0.9); // the spit with a bird on it
      cyl(g, 0.24, 0.27, 0.32, M.wood, 0, 0.16, 0, 8); // the stump he sits on
      // a bedroll and a few crates
      const bed = box(g, 0.75, 0.12, 1.7, M.cloth, -2.4, 0.06, -1.6, 0.3); void bed; cyl(g, 0.17, 0.17, 0.78, M.red, -2.62, 0.17, -0.85, 7, 0, Math.PI / 2).rotation.y = 0.3;
      box(g, 0.6, 0.55, 0.6, M.wood, 2.5, 0.28, -2.4, 0.4); box(g, 0.45, 0.42, 0.45, M.wood, 2.95, 0.21, -1.85, 0.9);
    },
    stash(g) { // a battered strongbox
      const M = { wood: L(0x4a3424), band: L(0x2e2a26), lock: L(0x7a6a3a) };
      const c = new THREE.Group();
      box(c, 0.95, 0.5, 0.6, M.wood, 0, 0.25, 0, 0, 0, 0.02); box(c, 0.97, 0.06, 0.62, M.band, 0, 0.12, 0);
      const lid = new THREE.Group(); lid.position.set(0, 0.5, -0.3); c.add(lid);
      box(lid, 0.95, 0.16, 0.6, M.wood, 0, 0.08, 0.3); box(lid, 0.97, 0.05, 0.62, M.band, 0, 0.1, 0.3);
      box(lid, 0.14, 0.14, 0.05, M.lock, 0, -0.02, 0.61);
      return { group: c, lid };
    },
    wardrobe(g) { // a post with hooks: a cloak, a hood and a belt of knives
      const M = { wood: L(0x3a2818), cloak: L(0x24282a), hood: L(0x302a26), leather: L(0x4a3020), steel: L(0x9aa0a8) };
      const w = new THREE.Group();
      box(w, 0.7, 0.1, 0.7, M.wood, 0, 0.05, 0); box(w, 0.1, 2.1, 0.1, M.wood, 0, 1.05, 0); box(w, 0.8, 0.07, 0.07, M.wood, 0, 1.95, 0);
      const cl = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.5, 6, 1, true), M.cloak); cl.position.set(0.22, 1.18, 0.12); cl.material.side = THREE.DoubleSide; w.add(cl);
      box(w, 0.26, 0.26, 0.24, M.hood, -0.28, 1.8, 0.1);
      box(w, 0.06, 0.5, 0.06, M.leather, -0.32, 1.45, 0.12); for (let i = 0; i < 3; i++) box(w, 0.03, 0.2, 0.05, M.steel, -0.32, 1.35 - i * 0.12, 0.17);
      return w;
    },
    lights: [{ at: [-2.5, 1.5, -1.1], color: 0xffb060, power: 3, range: 5, lantern: true }, { at: [2.5, 0.6, 0.9], color: 0xff9a40, power: 2, range: 4, candles: true }],
  },
  mage: {
    fire: { at: [1.6, 0, -0.55], colors: [0xe8b8ff, 0x8a3aff], light: 0xb070ff, fireplace: true, power: 10 },
    seatYaw: 1.25, sky: 0x060510,
    build(g, r) {
      const M = { tile: L(0x2c2a34), tile2: L(0x24222c), rune: new THREE.MeshBasicMaterial({ color: 0x5a3aa0, transparent: true, opacity: 0.5 }), black: L(0x16141a), stone: L(0x2a2830), wood: L(0x3a2a20), book: L(0x5a1a2a), page: L(0xc8bca0), wax: L(0xd8ccb0) };
      for (let x = -5; x <= 5; x++) for (let z = -4; z <= 4; z++) if (x * x + z * z < 30) flat(g, new THREE.PlaneGeometry(0.96, 0.96), (x + z) & 1 ? M.tile : M.tile2, x, z, 0.01 + r() * 0.004);
      flat(g, new THREE.RingGeometry(1.1, 1.22, 40), M.rune, 0, 0.1, 0.03); flat(g, new THREE.RingGeometry(1.5, 1.56, 40), M.rune, 0, 0.1, 0.03);
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; flat(g, new THREE.PlaneGeometry(0.12, 0.26), M.rune, Math.cos(a) * 1.33, 0.1 + Math.sin(a) * 1.33, 0.031, -a); }
      // the black fireplace (the fire sits in it)
      const fx = 1.6, fz = -0.55, ry = -0.55;
      const fp = new THREE.Group(); fp.position.set(fx, 0, fz - 0.25); fp.rotation.y = ry; g.add(fp);
      box(fp, 1.9, 0.25, 0.8, M.black, 0, 0.12, 0.1); for (const s of [-1, 1]) box(fp, 0.38, 1.4, 0.7, M.black, s * 0.76, 0.82, 0);
      box(fp, 2.1, 0.3, 0.85, M.black, 0, 1.6, 0); box(fp, 1.2, 1.2, 0.18, M.stone, 0, 0.75, -0.3); box(fp, 0.8, 1.6, 0.6, M.black, 0, 2.5, -0.1);
      cyl(g, 0.24, 0.3, 0.32, M.stone, 0, 0.16, 0, 6); // a stone seat
      // a lectern with an open book, candles
      box(g, 0.12, 1.0, 0.12, M.wood, -2.6, 0.5, -2.0); box(g, 0.7, 0.06, 0.5, M.wood, -2.6, 1.02, -2.0, 0.3, -0.35);
      box(g, 0.56, 0.05, 0.38, M.page, -2.6, 1.07, -1.98, 0.3, -0.35); box(g, 0.04, 0.06, 0.4, M.book, -2.6, 1.06, -1.98, 0.3, -0.35);
      box(g, 0.5, 0.3, 0.4, M.book, 2.9, 0.15, 1.6, 0.4); box(g, 0.42, 0.12, 0.36, M.wood, 2.9, 0.36, 1.6, 0.6);
    },
    stash(g) { // a rune-carved chest
      const M = { stone: L(0x2a2834), trim: L(0x8a7a4a), glow: new THREE.MeshBasicMaterial({ color: 0x9a6aff }) };
      const c = new THREE.Group();
      box(c, 1.05, 0.55, 0.66, M.stone, 0, 0.28, 0); box(c, 1.08, 0.06, 0.68, M.trim, 0, 0.04, 0);
      for (const s of [-0.3, 0, 0.3]) box(c, 0.08, 0.2, 0.02, M.glow, s, 0.3, 0.34);
      const lid = new THREE.Group(); lid.position.set(0, 0.56, -0.33); c.add(lid);
      box(lid, 1.05, 0.2, 0.66, M.stone, 0, 0.1, 0.33); box(lid, 1.08, 0.05, 0.68, M.trim, 0, 0.2, 0.33);
      box(lid, 0.18, 0.06, 0.18, M.glow, 0, 0.24, 0.33);
      return { group: c, lid };
    },
    wardrobe(g) { // a tall carved wardrobe with star-cloth showing through the doors
      const M = { wood: L(0x2a1e2a), trim: L(0x8a7a4a), cloth: L(0x2a2050), glow: new THREE.MeshBasicMaterial({ color: 0x7a5aff }) };
      const w = new THREE.Group();
      box(w, 1.2, 2.3, 0.6, M.wood, 0, 1.15, 0); box(w, 1.3, 0.12, 0.7, M.trim, 0, 2.36, 0); box(w, 1.3, 0.1, 0.7, M.trim, 0, 0.05, 0);
      box(w, 0.5, 1.9, 0.04, M.wood, -0.28, 1.15, 0.32, -0.5); box(w, 0.04, 1.9, 0.02, M.trim, 0.0, 1.15, 0.31);
      box(w, 0.42, 1.7, 0.02, M.cloth, 0.2, 1.12, 0.29);
      for (const [x, y] of [[0.12, 1.6], [0.3, 1.2], [0.18, 0.8]]) box(w, 0.04, 0.04, 0.02, M.glow, x, y, 0.31);
      return w;
    },
    lights: [{ at: [-2.6, 1.4, -1.6], color: 0xffc070, power: 2.5, range: 4.5, candles: true }, { at: [-2.5, 1.6, -1.2], color: 0x9a7aff, power: 2.2, range: 5, lantern: true }],
  },
};

export class Hermitage {
  constructor(game) {
    this.game = game;
    this.active = false; this.kind = null; this.time = 0;
    this.camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 60);
    this.ray = new THREE.Raycaster(); this.ptr = new THREE.Vector2();
    this.hover = null; this.stashOpen = false;
    this.buildDom();
  }

  // ---------- the screen around the scene ----------
  buildDom() {
    const el = document.createElement('div');
    el.id = 'hermitage'; el.className = 'hidden';
    el.innerHTML = `
      <div class="hm-top">
        <button class="mini-btn" id="hm-back">Title</button>
        <div class="hm-pick"><button class="mini-btn" id="hm-char">Knight ▾</button><div id="hm-list" class="hidden"></div></div>
        <div id="hm-gold"></div>
      </div>
      <div id="hm-label" class="hidden"></div>
      <div id="hm-stash" class="hidden"><div class="hm-sh"><span>Stash</span><button class="mini-btn" id="hm-stash-close">Close</button></div>
        <div class="hm-note">Shared by all your characters. Items you find will be kept here.</div><div id="hm-slots"></div></div>
      <div class="hm-bottom">
        <button class="menu-btn primary" id="hm-solo">Solo Raid</button>
        <button class="menu-btn primary" id="hm-party">Party Raid</button>
        <button class="mini-btn hidden" id="hm-night">Night Raid: Off</button>
      </div>
      <div id="hm-hint">Hover the things around the fire</div>`;
    document.body.append(el);
    this.el = el;
    $('hm-slots').innerHTML = Array.from({ length: STASH_SLOTS }, () => '<div class="hm-slot"></div>').join('');
    for (const [id, tone] of [['hm-back', 'ash'], ['hm-char', 'rust'], ['hm-stash-close', 'ash'], ['hm-solo', 'ember'], ['hm-party', 'blood'], ['hm-night', 'blood']]) pxButton($(id), tone, (id === 'hm-solo' || id === 'hm-party') && innerHeight > 500 ? 4 : innerHeight > 500 ? 3 : 2);
    $('hm-back').addEventListener('click', () => this.close());
    $('hm-char').addEventListener('click', (e) => { e.stopPropagation(); this.toggleList(); });
    $('hm-stash-close').addEventListener('click', () => this.setStash(false));
    $('hm-solo').addEventListener('click', () => { this.game.audio.unlock(); this.close(false); this.game.start(this.kind); });
    $('hm-party').addEventListener('click', () => { this.game.audio.unlock(); this.game.lobbyKind = this.kind; this.game.openLobby(); });
    $('hm-night').addEventListener('click', () => { this.game.nightRaid = !this.game.nightRaid; this.game.refreshNight(); });
    // the scene: hover and click
    el.addEventListener('pointermove', (e) => { if (e.pointerType !== 'touch' && e.target === el) this.pick(e); else if (e.target !== el) this.setHover(null); });
    el.addEventListener('pointerleave', () => this.setHover(null));
    el.addEventListener('click', (e) => {
      if (e.target !== el) return;
      $('hm-list').classList.add('hidden');
      const hit = this.pick(e, true);
      if (e.pointerType === 'touch' || this.touch) { if (hit && hit === this.lastTap) this.use(hit); this.lastTap = hit; return; }
      if (hit) this.use(hit);
    });
    el.addEventListener('pointerdown', (e) => { this.touch = e.pointerType === 'touch'; });
    document.addEventListener('click', (e) => { if (!e.target.closest?.('.hm-pick')) $('hm-list')?.classList.add('hidden'); });
  }

  get unlocked() { return { knight: true, rogue: true, mage: !!this.game.accounts.data?.upgrades?.mage }; }

  toggleList(show = $('hm-list').classList.contains('hidden')) {
    const list = $('hm-list'), u = this.unlocked;
    list.innerHTML = '';
    for (const k of ['knight', 'rogue', 'mage']) {
      const b = document.createElement('button');
      b.className = 'hm-opt' + (k === this.kind ? ' on' : '') + (u[k] ? '' : ' locked');
      b.innerHTML = `<b>${NAMES[k]}</b><span>${u[k] ? (k === this.kind ? 'Here' : 'Visit') : `Locked · ◆ ${MAGE_UNLOCK}`}</span>`;
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        if (u[k]) { list.classList.add('hidden'); this.setKind(k); return; }
        // a little yes / no over it
        list.querySelector('.hm-ask')?.remove();
        const ask = document.createElement('div'); ask.className = 'hm-ask';
        const gold = this.game.accounts.data?.gold || 0, can = gold >= MAGE_UNLOCK;
        ask.innerHTML = `<div>Unlock the Spellsword for ◆ ${MAGE_UNLOCK}?${can ? '' : `<br><i>You have ◆ ${gold}</i>`}</div><button class="hm-yes"${can ? '' : ' disabled'}>Yes</button><button class="hm-no">No</button>`;
        ask.querySelector('.hm-no').addEventListener('click', (ev) => { ev.stopPropagation(); ask.remove(); });
        ask.querySelector('.hm-yes').addEventListener('click', (ev) => { ev.stopPropagation(); if (this.unlockMage()) { list.classList.add('hidden'); this.setKind('mage'); } });
        b.after(ask);
      });
      list.append(b);
    }
    list.classList.toggle('hidden', !show);
  }

  unlockMage() {
    const A = this.game.accounts, d = A.data;
    if (!d || d.upgrades?.mage || d.gold < MAGE_UNLOCK) return false;
    d.gold -= MAGE_UNLOCK; d.upgrades = d.upgrades || {}; d.upgrades.mage = 1;
    A.save(); this.game.audio.play('heal'); this.game.refreshTitle();
    return true;
  }

  // ---------- opening and switching ----------
  open(kind) {
    const g = this.game;
    if (!g.accounts.user) { this.pending = true; $('acct-err').textContent = ''; g.ui.show('account'); return; }
    const d = g.accounts.data, u = this.unlocked;
    kind = kind || d?.lastKind || 'knight';
    if (!u[kind]) kind = 'knight';
    this.active = true;
    g.ui.show('menu', false);
    this.el.classList.remove('hidden');
    this.setKind(kind, true);
    g.refreshNight();
  }

  close(toMenu = true) {
    this.active = false; this.setStash(false); this.setHover(null);
    this.el.classList.add('hidden');
    if (toMenu) this.game.ui.show('menu');
  }

  setKind(kind, force = false) {
    if (kind === this.kind && !force && this.scene) return;
    this.kind = kind;
    const d = this.game.accounts.data;
    if (d && d.lastKind !== kind) { d.lastKind = kind; this.game.accounts.save(); }
    this.game.lobbyKind = kind;
    $('hm-char').firstChild.textContent = `${NAMES[kind]} ▾`;
    this.refresh();
    this.buildScene(kind);
  }

  refresh() {
    const d = this.game.accounts.data;
    $('hm-gold').textContent = d ? `◆ ${d.gold}` : '';
  }

  // the outfit may have changed in the wardrobe
  refreshCharacter() { if (this.active && this.kind) this.placeCharacter(); }

  // ---------- the 3D scene ----------
  buildScene(kind) {
    if (this.scene) this.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    if (this.rig) { forgetRig(this.rig.root); this.rig = null; }
    const S = SCENES[kind], r = seeded(kind.length * 977 + 13);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(S.sky);
    scene.fog = new THREE.Fog(S.sky, 5.5, 12); // the edges fall away into the dark
    scene.add(new THREE.HemisphereLight(0x5a6688, 0x0a0806, 0.55)); // faint moonlight: shapes, not colours
    const g = new THREE.Group(); scene.add(g);
    S.build(g, r);
    // the fire and its light (the main light on the character)
    const [fx, fy, fz] = S.fire.at;
    this.fire = fire(g, fx, fy + (S.fire.fireplace ? 0.25 : 0.05), fz, S.fire.fireplace ? 1.1 : 1, S.fire.colors);
    this.firePower = S.fire.power || 6;
    this.fireLight = new THREE.PointLight(S.fire.light, this.firePower, 8, 1.3); this.fireLight.position.set(fx, 1.0, fz + (S.fire.fireplace ? 0.5 : 0)); scene.add(this.fireLight);
    // small lights here and there
    this.small = [];
    for (const l of S.lights) {
      const pl = new THREE.PointLight(l.color, l.power, l.range, 1.5); pl.position.set(...l.at); scene.add(pl);
      if (l.lantern) {
        cyl(g, 0.04, 0.05, l.at[1] + 0.3, L(0x2a2018), l.at[0], (l.at[1] + 0.3) / 2, l.at[2] - 0.05, 5);
        box(g, 0.2, 0.26, 0.2, new THREE.MeshBasicMaterial({ color: l.color }), l.at[0], l.at[1], l.at[2]);
      }
      if (l.candles) for (let i = 0; i < 3; i++) { const cx = l.at[0] + (i - 1) * 0.16, cz = l.at[2] + (i % 2) * 0.12, h = 0.14 + i * 0.06; cyl(g, 0.04, 0.045, h, L(0xd8ccb0), cx, h / 2, cz, 5); box(g, 0.04, 0.07, 0.04, new THREE.MeshBasicMaterial({ color: 0xffd080 }), cx, h + 0.04, cz); }
      this.small.push({ pl, base: l.power, ph: r() * 6 });
    }
    // the things you can use
    const stash = S.stash(g); stash.group.position.set(2.95, 0, -0.2); stash.group.rotation.y = -0.5; g.add(stash.group);
    const wardrobe = S.wardrobe(g); wardrobe.position.set(-2.95, 0, -0.7); wardrobe.rotation.y = 0.5; g.add(wardrobe);
    this.stashLid = stash.lid; this.lidAngle = 0;
    this.items = [
      { id: 'stash', group: stash.group, label: 'Stash', sub: 'Shared by all your characters' },
      { id: 'wardrobe', group: wardrobe, label: 'Wardrobe', sub: 'Change your look' },
    ];
    this.scene = scene;
    this.seatYaw = S.seatYaw;
    this.placeCharacter();
    for (const it of this.items) this.addOutline(it);
    this.camera.position.set(0, 2.7, 6.4); this.camera.lookAt(0, 0.75, 0);
  }

  placeCharacter() {
    if (!this.scene) return;
    const kind = this.kind;
    if (this.rig) { this.scene.remove(this.rig.root); forgetRig(this.rig.root); }
    const rig = buildHumanoid({ ...outfitModel(CHARS[kind].model, kind, this.game.equippedOutfit(kind)), scale: 1 });
    rig.idle = true; rig.root.position.set(0, 0.0, 0.05); rig.root.rotation.y = this.seatYaw;
    rig.apply(P.rest, 1, 60);
    this.scene.add(rig.root);
    this.rig = rig;
    const item = { id: 'char', group: rig.root, label: NAMES[kind], sub: 'Skill tree' };
    this.items = this.items.filter((x) => x.id !== 'char');
    this.items.push(item);
    this.addOutline(item);
  }

  // an outline for each mesh (a slightly bigger back-faced copy), shown on hover
  addOutline(item) {
    item.outlines = [];
    const meshes = [];
    item.group.traverse((o) => { if (o.isMesh && !o.userData.outline && o.material !== OUTLINE && !o.material.transparent) meshes.push(o); }); // (not shadows or glows)
    for (const m of meshes) {
      const o = new THREE.Mesh(m.geometry, OUTLINE);
      o.userData.outline = true; o.scale.setScalar(1.12); o.visible = false; o.raycast = () => {};
      m.add(o); item.outlines.push(o);
    }
  }

  pick(e, click = false) {
    if (!this.scene) return null;
    const r = this.el.getBoundingClientRect();
    this.ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(this.ptr, this.camera);
    let best = null, bd = Infinity;
    for (const it of this.items) {
      const hits = this.ray.intersectObject(it.group, true);
      if (hits.length && hits[0].distance < bd) { bd = hits[0].distance; best = it; }
    }
    this.setHover(best);
    return best;
  }

  setHover(it) {
    if (this.hover === it) return;
    if (this.hover) for (const o of this.hover.outlines) o.visible = false;
    this.hover = it;
    if (it) { for (const o of it.outlines) o.visible = true; this.game.audio.play('uiTick', 0.5); }
    this.el.style.cursor = it ? 'pointer' : '';
    const lab = $('hm-label');
    lab.classList.toggle('hidden', !it);
    if (it) lab.innerHTML = `<b>${it.label}</b><span>${it.sub}</span>`;
    $('hm-hint').classList.add('gone');
  }

  use(it) {
    const g = this.game;
    g.audio.unlock();
    if (it.id === 'char') g.treeUI.open(this.kind);
    else if (it.id === 'wardrobe') g.skinMenu.open(this.kind);
    else if (it.id === 'stash') this.setStash(!this.stashOpen);
  }

  setStash(v) {
    this.stashOpen = v;
    $('hm-stash')?.classList.toggle('hidden', !v);
    if (v) this.game.audio.play('uiTick', 1);
  }

  // ---------- per frame (Game.loop draws it in place of the world) ----------
  update(dt) {
    if (!this.scene) return;
    this.time += dt;
    const t = this.time;
    this.fire.update(dt, t);
    this.fireLight.intensity = this.firePower * (1 + Math.sin(t * 11) * 0.1 + Math.sin(t * 23) * 0.06);
    for (const s of this.small) s.pl.intensity = s.base * (0.9 + Math.sin(t * 7 + s.ph) * 0.1);
    // the lid swings open while the stash is
    this.lidAngle += ((this.stashOpen ? -1.15 : 0) - this.lidAngle) * Math.min(1, dt * 8);
    this.stashLid.rotation.x = this.lidAngle;
    if (this.rig) {
      const breathe = Math.sin(t * 1.6) * 0.03;
      this.rig.apply({ ...P.rest, torso: [0.35 + breathe, 0, 0], head: [0.4 + Math.sin(t * 0.5) * 0.06, Math.sin(t * 0.3) * 0.15, 0] }, dt, 6);
    }
    tickOutfitColors(t);
    // the label sits over the hovered thing
    if (this.hover) {
      const b = new THREE.Box3().setFromObject(this.hover.group), top = new THREE.Vector3((b.min.x + b.max.x) / 2, b.max.y + 0.25, (b.min.z + b.max.z) / 2).project(this.camera);
      const lab = $('hm-label'), r = this.el.getBoundingClientRect();
      lab.style.left = `${(top.x * 0.5 + 0.5) * r.width}px`; lab.style.top = `${(-top.y * 0.5 + 0.5) * r.height}px`;
    }
  }

  resize(aspect) { this.camera.aspect = aspect; this.camera.fov = aspect < 1.2 ? 58 : 40; this.camera.updateProjectionMatrix(); }
}
