// The Sanctum (the old Hermitage): each character's hideout, the hub between runs. A small dark 3D scene drawn
// through the game's pixel pass: the character sits by their fire (the Templar's promethium fire-bowl, the Shrike's
// fire drum, the Adept's plasma reactor-hearth), which is the light on them; a couple of small lights pick out
// the rest. The things in it are the buttons: hover one and it's outlined with a label over it (on touch, the
// first tap does that and the second opens it).
//   the character  -> their skill tree
//   the wardrobe   -> their skin customizer (left)
//   the stash      -> the lid opens and the stash panel slides in (right); shared by every character
//   the workbench  -> its panel (crafting and upgrades with what you find: coming later)
//   the jukebox    -> the records you have (records.js); pick one and it drops into the jukebox's window and spins,
//                     and the menus play its song (kept on the account)
// At the top: back to the title, the character selector (the Spellsword shows locked until bought, with a yes/no to
// unlock it), gold. At the bottom: Solo Raid, Party Raid and the Night Raid toggle once unlocked.
// Kept sparse on purpose: the hideouts will be customizable later.
import * as THREE from 'three';
import { buildHumanoid } from './models.js';
import { P } from './anims.js';
import { CHARS } from './player.js';
import { outfitModel } from './playerkits.js';
import { tickOutfitColors, forgetRig } from './outfits.js';
import { pxButton, pxText } from './pixelmenus.js';
import { pixelIcon } from './pixelui.js';
import { MAGE_UNLOCK } from './treeui.js';
import { ownedRecords, currentRecord, recordById } from './records.js';
import { SONG_NAMES } from './music.js';
import { ITEMS, RARITY, TIERS, itemValue, iconEl } from './items.js';
import { REGIONS } from './regions.js';
import { BOSSES } from './boss.js';
import { GUIDE } from './guide.js';

const $ = (id) => document.getElementById(id);
const NAMES = { knight: 'Templar', rogue: 'Shrike', mage: 'Adept' }; // (display names: The Last Crusade)
export const STASH_SLOTS = 48;
const L = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o });
// every usable thing has a faint outline round its edge; the one under the pointer a bright one. The outlines are
// slightly bigger back-faced copies drawn after the scene without writing depth, and the thing itself is drawn
// over them, so only the rim outside its silhouette shows (no lines across the inside)
const OUTLINE = new THREE.MeshBasicMaterial({ color: 0xffd36a, side: THREE.BackSide, depthWrite: false });
const FAINT = new THREE.MeshBasicMaterial({ color: 0x9a7444, side: THREE.BackSide, depthWrite: false }); // (solid: see-through ones draw after everything)

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

// a vox-caster (the jukebox): an iron cabinet with a brass-ringed speaker grille, valve tubes glowing amber and a
// window where the record spins. (Same parts as before: the window, the disc, the glowing strips.)
function jukebox(wood) {
  const g = new THREE.Group(), M = { wood: L(wood), iron: L(0x2c2c30), dark: L(0x141416), trim: L(0x6a5634), grille: L(0x3a3a3e), glass: new THREE.MeshBasicMaterial({ color: 0x0a0806 }), glow: new THREE.MeshBasicMaterial({ color: 0xffb060 }) };
  box(g, 1.0, 1.3, 0.55, M.iron, 0, 0.65, 0);
  box(g, 1.06, 0.12, 0.6, M.trim, 0, 1.33, 0); box(g, 1.06, 0.12, 0.6, M.dark, 0, 0.06, 0);
  box(g, 0.86, 0.2, 0.5, M.iron, 0, 1.48, 0); box(g, 0.5, 0.18, 0.4, M.wood, 0, 1.67, 0); // stepped crown
  for (const s of [-1, 1]) { box(g, 0.1, 1.5, 0.1, M.trim, s * 0.5, 0.75, 0.27); box(g, 0.14, 0.14, 0.14, M.trim, s * 0.5, 1.55, 0.27); }
  box(g, 0.72, 0.5, 0.03, M.glass, 0, 1.0, 0.28); // the window
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.02, 16), M.dark); plat.rotation.x = Math.PI / 2; plat.position.set(0, 1.0, 0.29); g.add(plat);
  // the speaker grille below: a brass ring and horizontal slats
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 4, 16), M.trim); ring.position.set(0, 0.42, 0.29); g.add(ring);
  for (let i = 0; i < 5; i++) box(g, 0.34, 0.025, 0.02, M.grille, 0, 0.32 + i * 0.05, 0.3);
  const strips = [];
  for (const s of [-1, 1]) strips.push(box(g, 0.05, 0.9, 0.04, M.glow, s * 0.4, 0.82, 0.28));
  for (let i = 0; i < 3; i++) strips.push(box(g, 0.07, 0.16, 0.07, M.glow, -0.16 + i * 0.16, 1.66, 0.12)); // valve tubes in the crown
  const disc = new THREE.Group(); disc.position.set(0, 1.0, 0.31); g.add(disc);
  const vinyl = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.012, 20), new THREE.MeshLambertMaterial({ color: 0x222222 })); vinyl.rotation.x = Math.PI / 2; disc.add(vinyl);
  const label = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.016, 12), new THREE.MeshBasicMaterial({ color: 0xffffff })); label.rotation.x = Math.PI / 2; disc.add(label);
  const groove = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.15, 0.014), new THREE.MeshBasicMaterial({ color: 0x000000 })); groove.position.y = 0.09; disc.add(groove); // so you can see it turn
  // a cable from the back to the floor
  box(g, 0.05, 0.05, 0.6, M.dark, 0.3, 0.03, -0.55);
  return { group: g, disc, vinyl, label, glowMat: M.glow, strips };
}
// a workbench: an iron bench with a vice, a hammer and a wrench, a pegboard of tools and a cogitator screen glowing
// in the hideout's colour
function workbench(glow) {
  const g = new THREE.Group(), M = { iron: L(0x2c2c30), dark: L(0x141416), top: L(0x4a4038), steel: L(0x74767c), trim: L(0x6a5634), glow: new THREE.MeshBasicMaterial({ color: glow }) };
  box(g, 1.5, 0.1, 0.7, M.top, 0, 0.82, 0); // the top
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, 0.08, 0.8, 0.08, M.iron, sx * 0.68, 0.4, sz * 0.29);
  box(g, 1.4, 0.06, 0.6, M.dark, 0, 0.22, 0); // a shelf low down, with a crate on it
  box(g, 0.4, 0.26, 0.34, M.trim, -0.4, 0.38, 0);
  // the vice on the front corner
  box(g, 0.2, 0.14, 0.2, M.steel, 0.55, 0.94, 0.2); box(g, 0.06, 0.16, 0.24, M.steel, 0.47, 1.06, 0.2); box(g, 0.06, 0.16, 0.24, M.steel, 0.63, 1.06, 0.2);
  box(g, 0.02, 0.02, 0.3, M.dark, 0.55, 0.96, 0.4, 0, 0, Math.PI / 2);
  // a hammer and a wrench lying on it
  box(g, 0.34, 0.035, 0.035, M.trim, -0.15, 0.885, 0.12, 0.3); box(g, 0.06, 0.07, 0.14, M.steel, -0.31, 0.89, 0.07, 0.3);
  box(g, 0.3, 0.02, 0.04, M.steel, 0.15, 0.88, -0.05, -0.5);
  // the pegboard behind, with tools on it, and the screen
  box(g, 1.4, 0.8, 0.05, M.dark, 0, 1.3, -0.33);
  for (let i = 0; i < 4; i++) box(g, 0.04, 0.28 + (i % 2) * 0.1, 0.03, M.steel, -0.6 + i * 0.13, 1.35, -0.3);
  box(g, 0.5, 0.36, 0.08, M.iron, 0.32, 1.32, -0.28);
  box(g, 0.42, 0.28, 0.02, M.glow, 0.32, 1.32, -0.235);
  box(g, 0.12, 0.05, 0.05, M.glow, -0.05, 1.62, -0.3); // a lamp tube over it
  return { group: g, glow: M.glow };
}
const WORKBENCH = { knight: { at: [-1.3, 1.75], ry: 0.3, glow: 0xffa040 }, rogue: { at: [-1.4, 1.75], ry: 0.3, glow: 0xff3a2a }, mage: { at: [-1.35, 1.75], ry: 0.3, glow: 0x7aa8ff } };
const JUKEBOX = { knight: { at: [0.95, -2.7], ry: -0.2, wood: 0x5a1414 }, rogue: { at: [0.45, -2.8], ry: 0.05, wood: 0x6a1412 }, mage: { at: [-0.95, -2.6], ry: 0.25, wood: 0x2a3a5a } };

// deck plating: square plates with darker seams (and the odd darker plate)
function deck(g, M, rx, rz, r, size = 0.96) {
  for (let x = -rx; x <= rx; x++) for (let z = -rz; z <= rz; z++) if ((x * x) / (rx * rx) + (z * z) / (rz * rz) < 1.1) flat(g, new THREE.PlaneGeometry(size, size), r() < 0.18 ? M.plate2 : M.plate, x, z, 0.01 + r() * 0.003);
  flat(g, new THREE.CircleGeometry(16, 32), M.under, 0, 0, 0);
}
// cables snaking across the floor
function cables(g, mat, r, n, cx = 0, cz = 0, spread = 8) {
  for (let i = 0; i < n; i++) {
    let x = cx + (r() - 0.5) * spread, z = cz + (r() - 0.5) * spread * 0.7, a = r() * 6.28;
    for (let k = 0; k < 6; k++) { const len = 0.35 + r() * 0.3; box(g, len, 0.04, 0.05, mat, x, 0.035, z, a); x += Math.cos(a) * len * 0.9; z -= Math.sin(a) * len * 0.9; a += (r() - 0.5) * 0.9; }
  }
}
// a votive cluster: candles on an iron tray (the flames are glows)
function votives(g, x, z, n, r) {
  box(g, 0.5, 0.05, 0.36, L(0x2a2a2e), x, 0.03, z);
  for (let i = 0; i < n; i++) { const cx = x + (r() - 0.5) * 0.4, cz = z + (r() - 0.5) * 0.26, h = 0.08 + r() * 0.16; cyl(g, 0.03, 0.035, h, L(0xd8ccb0), cx, h / 2 + 0.05, cz, 5); box(g, 0.03, 0.05, 0.03, new THREE.MeshBasicMaterial({ color: 0xffc070 }), cx, h + 0.08, cz); }
}

// the three hideouts (The Last Crusade). The fire stays where it was (it is the light on the character), and so do
// the seat, the lights and the usable things; only what they look like and what stands around them changed.
const SCENES = {
  knight: {
    // the Templar's chapel-bunker: a promethium fire-bowl in a vented steel hearth, a crusade standard, a powered
    // weapon rack, a shrine with a servo-skull, a cogitator, an armour cradle and an armoured reliquary chest
    fire: { at: [1.35, 0, 1.25], colors: [0xffe08a, 0xff6a1a], light: 0xff9a4a, y: 0.4 }, // (y: the flame sits in the bowl)
    seatYaw: 0.6, sky: 0x07060a,
    build(g, r) {
      const M = { under: L(0x161618), plate: L(0x3a3a3e), plate2: L(0x2e2e32), iron: L(0x2a2a2e), ironLt: L(0x55565c), brass: L(0x7a5e2e), red: L(0x6a1412), bone: L(0xbab09a), hazard: L(0x8a6a1e), cable: L(0x141416), amber: new THREE.MeshBasicMaterial({ color: 0xffb04a }), screen: new THREE.MeshBasicMaterial({ color: 0x8a4a1a }), green: new THREE.MeshBasicMaterial({ color: 0x9ad06a }), eye: new THREE.MeshBasicMaterial({ color: 0xff2a1a }) };
      deck(g, M, 5, 4, r);
      // the hearth: a hexagonal steel bowl on a vented plinth, a brass rim, coolant pipes; the fire burns in it
      const fx = 1.35, fz = 1.25;
      cyl(g, 0.62, 0.7, 0.16, M.iron, fx, 0.08, fz, 6);
      cyl(g, 0.5, 0.36, 0.26, M.ironLt, fx, 0.29, fz, 6); cyl(g, 0.53, 0.53, 0.05, M.brass, fx, 0.43, fz, 6);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.26; box(g, 0.14, 0.05, 0.03, M.amber, fx + Math.cos(a) * 0.66, 0.1, fz + Math.sin(a) * 0.66, -a + Math.PI / 2); }
      for (const s of [-1, 1]) { const pp = cyl(g, 0.04, 0.04, 0.9, M.brass, fx + s * 0.75, 0.06, fz - 0.2, 6, 0, Math.PI / 2); pp.rotation.y = 0.8; }
      // his seat: a sealed munitions case
      box(g, 0.7, 0.36, 0.42, M.hazard, 0, 0.18, 0, 0.6); box(g, 0.72, 0.06, 0.44, M.iron, 0, 0.32, 0, 0.6); box(g, 0.72, 0.06, 0.44, M.iron, 0, 0.05, 0, 0.6);
      // a powered weapon rack: two resonance blades and a maul on charging clamps
      box(g, 1.7, 0.12, 0.4, M.iron, -2.3, 0.06, -2.6); box(g, 1.6, 1.6, 0.12, M.iron, -2.3, 0.86, -2.75);
      box(g, 1.62, 0.06, 0.14, M.brass, -2.3, 1.68, -2.72);
      for (let i = 0; i < 3; i++) {
        const x = -2.85 + i * 0.55;
        box(g, 0.06, 1.25, 0.03, i === 1 ? M.ironLt : L(0x8a8c94), x, 0.85, -2.66, 0, 0, i === 1 ? 0 : 0.04);
        box(g, 0.28, 0.06, 0.06, M.brass, x, 0.44, -2.65); box(g, 0.1, 0.06, 0.04, M.amber, x, 1.4, -2.67);
      }
      // the standard: crusade red on a brass frame, a pale cross-and-cog on it, a skull at the top
      cyl(g, 0.05, 0.06, 3.2, M.iron, 2.6, 1.6, -2.8, 5); box(g, 1.1, 0.06, 0.06, M.brass, 3.05, 3.05, -2.8);
      box(g, 0.9, 1.6, 0.03, M.red, 3.08, 2.25, -2.8);
      box(g, 0.12, 0.7, 0.02, M.bone, 3.08, 2.35, -2.78); box(g, 0.5, 0.12, 0.02, M.bone, 3.08, 2.45, -2.78);
      box(g, 0.2, 0.18, 0.2, M.bone, 2.6, 3.3, -2.8); box(g, 0.04, 0.04, 0.02, M.eye, 2.64, 3.32, -2.69);
      // a shrine in the corner: an iron niche, votive candles, a servo-skull hovering over it
      // (on the back wall between the vox-caster and the standard, clear of the chest)
      box(g, 1.0, 1.8, 0.4, M.iron, 2.05, 0.9, -3.35); box(g, 0.8, 0.9, 0.2, L(0x1a1a1e), 2.05, 1.1, -3.15);
      votives(g, 2.05, -2.9, 5, r);
      const skull = new THREE.Group(); skull.position.set(2.05, 1.95, -3.0); g.add(skull);
      box(skull, 0.18, 0.16, 0.2, M.bone, 0, 0, 0); box(skull, 0.2, 0.04, 0.22, M.brass, 0, 0.09, 0); box(skull, 0.05, 0.05, 0.03, M.eye, -0.04, 0.01, 0.11);
      for (const s of [-1, 1]) box(skull, 0.16, 0.02, 0.08, M.iron, s * 0.17, 0.06, 0);
      // a cogitator on the left wall: a hulking terminal with an amber screen and a keyboard ledge
      box(g, 1.0, 1.4, 0.6, M.iron, -3.5, 0.7, 0.8, 1.1); box(g, 0.45, 0.3, 0.04, M.screen, -3.24, 1.05, 0.95, 1.1); for (let i = 0; i < 4; i++) box(g, 0.3 - i * 0.05, 0.025, 0.05, M.amber, -3.22, 1.14 - i * 0.06, 0.96, 1.1); // (text lines on the screen)
      box(g, 0.8, 0.08, 0.36, M.ironLt, -3.15, 0.7, 1.05, 1.1);
      for (let i = 0; i < 4; i++) box(g, 0.05, 0.05, 0.05, i % 2 ? M.green : M.amber, -3.3 + i * 0.08, 1.33, 1.0);
      // pipes up the back and cables across the floor
      for (const x of [-1.4, -1.2]) cyl(g, 0.07, 0.07, 4, M.iron, x, 2, -3.3, 6);
      cables(g, M.cable, r, 4, 0, -0.5, 7);
    },
    stash(g) { // an armoured reliquary chest: plate, brass bands, a glowing seal-lock
      const M = { wood: L(0x3a3a3e), iron: L(0x7a5e2e), dark: L(0x1a1a1e), glow: new THREE.MeshBasicMaterial({ color: 0xffb04a }), red: L(0x6a1412) };
      const c = new THREE.Group();
      box(c, 1.1, 0.55, 0.7, M.wood, 0, 0.28, 0); for (const s of [-0.38, 0.38]) box(c, 0.08, 0.57, 0.72, M.iron, s, 0.28, 0);
      box(c, 1.14, 0.08, 0.74, M.dark, 0, 0.04, 0); box(c, 0.6, 0.18, 0.02, M.red, 0, 0.3, 0.36);
      const lid = new THREE.Group(); lid.position.set(0, 0.56, -0.35); c.add(lid);
      box(lid, 1.1, 0.22, 0.7, M.wood, 0, 0.11, 0.35); for (const s of [-0.38, 0.38]) box(lid, 0.08, 0.24, 0.72, M.iron, s, 0.11, 0.35);
      box(lid, 0.16, 0.18, 0.04, M.glow, 0, 0.0, 0.71); box(lid, 0.5, 0.06, 0.4, M.iron, 0, 0.25, 0.35);
      box(c, 1.0, 0.04, 0.6, M.dark, 0, 0.55, 0);
      return { group: c, lid };
    },
    wardrobe(g) { // an armour cradle: a power-armour suit on a gantry frame, cables in its back, red visor
      const M = { wood: L(0x2a2a2e), plate: L(0x7a7c84), dark: L(0x1e1e22), cloth: L(0x6a1412), brass: L(0x7a5e2e), eye: new THREE.MeshBasicMaterial({ color: 0xff3a24 }) };
      const w = new THREE.Group();
      box(w, 1.0, 0.14, 0.9, M.wood, 0, 0.07, 0); for (const s of [-1, 1]) box(w, 0.1, 2.3, 0.1, M.wood, s * 0.5, 1.15, -0.3); box(w, 1.1, 0.1, 0.12, M.wood, 0, 2.3, -0.3);
      box(w, 0.66, 0.62, 0.38, M.plate, 0, 1.35, 0); box(w, 0.5, 0.35, 0.3, M.dark, 0, 0.95, 0); box(w, 0.7, 0.08, 0.4, M.brass, 0, 1.1, 0);
      for (const s of [-1, 1]) { box(w, 0.32, 0.18, 0.4, M.plate, s * 0.45, 1.64, 0, 0, 0, -s * 0.3); box(w, 0.14, 0.5, 0.14, M.dark, s * 0.42, 1.2, 0); box(w, 0.16, 0.55, 0.16, M.plate, s * 0.16, 0.48, 0); }
      box(w, 0.3, 0.32, 0.32, M.plate, 0, 1.88, 0); box(w, 0.24, 0.05, 0.02, M.eye, 0, 1.9, 0.17);
      box(w, 0.08, 0.6, 0.08, M.cloth, 0, 2.15, -0.05);
      for (const s of [-1, 1]) box(w, 0.05, 0.05, 0.5, M.dark, s * 0.15, 1.5, -0.4); // the cables
      return w;
    },
    lights: [{ at: [-2.4, 1.2, -1.0], color: 0xffb060, power: 3, range: 5, lantern: true }, { at: [2.6, 0.9, 0.9], color: 0xffa050, power: 2.5, range: 4.5, candles: true }],
  },
  rogue: {
    // the Shrike's hide: a gutted hab-room over the burning hive, red in its cloth and daubs, lit cold white. Fire in a cut-down fuel drum, a blood-red
    // cult banner and a sigil daubed on the wall, red emergency lamps, a weapons table with knives laid out, a red
    // tarp, hanging chains with red rags, the burning red skyline through a smashed wall, a trophy servo-skull
    fire: { at: [1.3, 0, 0.9], colors: [0xffffff, 0xc8d8ff], light: 0xf0f4ff, y: 0.58 }, // (in the drum: a cold white flame)
    seatYaw: 0.8, sky: 0x0a0a0c, seatX: -0.45, hemi: 0x9aa0b0,
    build(g, r) {
      const M = { under: L(0x140c0c), plate: L(0x2e2222), plate2: L(0x241a1a), ferro: L(0x3a2c2a), ferroDk: L(0x241a1a), iron: L(0x2a2224), rust: L(0x5a2a1a), drab: L(0x3a2626), red: L(0x7a1612), redDk: L(0x4a0c0c), bone: L(0xbab09a), brass: L(0x7a5a34), casing: L(0x9a7a3a), steel: L(0x9aa0a8), cable: L(0x120a0a),
        sky: new THREE.MeshBasicMaterial({ color: 0x7a160c }), skyHot: new THREE.MeshBasicMaterial({ color: 0xe0401a }), daub: new THREE.MeshBasicMaterial({ color: 0x9a140e }), eye: new THREE.MeshBasicMaterial({ color: 0xff2a1a }), lamp: new THREE.MeshBasicMaterial({ color: 0xf0f4ff }) }; // (white lamps)
      deck(g, M, 5, 4, r, 0.97);
      for (let i = 0; i < 6; i++) { const a = r() * 6.28; box(g, 0.5 + r() * 0.6, 0.12 + r() * 0.1, 0.3 + r() * 0.3, M.ferro, Math.cos(a) * 4.2, 0.08, Math.sin(a) * 3.4 - 0.8, r() * 3); } // rubble
      for (let i = 0; i < 30; i++) box(g, 0.025, 0.025, 0.07, M.casing, (r() - 0.5) * 5, 0.02, (r() - 0.5) * 4 + 0.5, r() * 3); // spent casings
      for (let i = 0; i < 5; i++) flat(g, new THREE.CircleGeometry(0.2 + r() * 0.3, 7), M.redDk, (r() - 0.5) * 6, (r() - 0.5) * 4, 0.02); // old blood
      // the fire drum: a cut-down drum with glowing vents and a grille on top
      const fx = 1.3, fz = 0.9;
      cyl(g, 0.36, 0.34, 0.6, M.rust, fx, 0.3, fz, 8);
      for (const y of [0.12, 0.5]) cyl(g, 0.37, 0.37, 0.05, M.iron, fx, y, fz, 8);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; box(g, 0.08, 0.06, 0.02, new THREE.MeshBasicMaterial({ color: 0xe8eeff }), fx + Math.cos(a) * 0.36, 0.3, fz + Math.sin(a) * 0.36, -a + Math.PI / 2); }
      for (const s of [-1, 1]) cyl(g, 0.02, 0.02, 0.8, M.iron, fx + s * 0.1, 0.62, fz, 4, Math.PI / 2, 0);
      // his seat: an upturned ammo crate with a red stencil
      box(g, 0.5, 0.34, 0.4, M.drab, -0.45, 0.17, 0, 0.2); box(g, 0.52, 0.05, 0.42, M.iron, -0.45, 0.33, 0, 0.2); box(g, 0.2, 0.12, 0.01, M.red, -0.43, 0.18, 0.21, 0.2);
      // a red bedroll with a respirator beside it
      box(g, 0.75, 0.1, 1.7, M.redDk, -2.4, 0.05, -1.6, 0.3); cyl(g, 0.17, 0.17, 0.78, M.red, -2.62, 0.17, -0.85, 7, 0, Math.PI / 2).rotation.y = 0.3;
      box(g, 0.18, 0.12, 0.14, M.iron, -2.0, 0.08, -0.9); for (const s of [-1, 1]) box(g, 0.05, 0.05, 0.02, M.eye, -2.0 + s * 0.05, 0.1, -0.83);
      // the weapons table: knives laid out on a red cloth, a whetstone, a glowing data-slate
      box(g, 1.3, 0.06, 0.6, M.iron, 2.4, 0.78, -2.3, -0.3); for (const [x, z] of [[-0.55, -0.24], [0.55, -0.24], [-0.55, 0.24], [0.55, 0.24]]) box(g, 0.06, 0.76, 0.06, M.iron, 2.4 + x * 0.96 + z * 0.3, 0.38, -2.3 + z * 0.96 - x * 0.3);
      box(g, 1.1, 0.01, 0.45, M.red, 2.4, 0.815, -2.3, -0.3);
      for (let i = 0; i < 4; i++) { const x = 2.0 + i * 0.26, z = -2.18 + i * 0.08; box(g, 0.04, 0.02, 0.32, M.steel, x, 0.83, z, -0.3 + (i % 2) * 0.2); box(g, 0.012, 0.012, 0.22, M.lamp, x + 0.025, 0.835, z, -0.3 + (i % 2) * 0.2); }
      box(g, 0.22, 0.05, 0.1, L(0x4a4a50), 2.75, 0.83, -2.55, -0.3); box(g, 0.24, 0.02, 0.16, M.lamp, 2.0, 0.83, -2.5, -0.1);
      // a red tarp strung over the corner, chains with red rags hanging from the ceiling
      const tarp = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.6), M.red); tarp.material.side = THREE.DoubleSide; tarp.position.set(-2.9, 2.0, -2.2); tarp.rotation.set(-0.9, 0.5, 0.1); g.add(tarp);
      for (const [x, z] of [[-3.8, -1.6], [-1.9, -2.9]]) cyl(g, 0.03, 0.03, 2.4, M.iron, x, 1.2, z, 4);
      for (const [x, z, h] of [[-1.1, -1.9, 1.4], [0.2, -2.4, 1.1], [3.3, -0.6, 1.6]]) { box(g, 0.03, h, 0.03, M.iron, x, 3.4 - h / 2, z); box(g, 0.14, 0.4, 0.02, M.redDk, x, 3.2 - h, z); }
      // the back wall: ferrocrete, smashed open on the right to the burning red skyline
      box(g, 6, 3.2, 0.3, M.ferro, -0.6, 1.6, -3.6); box(g, 2.4, 1.8, 0.32, M.sky, 1.6, 2.0, -3.58);
      for (let i = 0; i < 7; i++) { const h = 0.3 + r() * 1.1; box(g, 0.3, h, 0.05, L(0x0e0606), 0.6 + i * 0.33, 1.15 + h / 2, -3.55); }
      for (let i = 0; i < 5; i++) box(g, 0.08, 0.08, 0.05, M.skyHot, 0.7 + r() * 1.9, 1.3 + r() * 1.0, -3.54);
      for (const s of [-1, 1]) box(g, 0.12, 1.9, 0.36, M.ferroDk, 1.6 + s * 1.25, 2.0, -3.58);
      // a blood-red cult banner on the left of the wall, a pale sigil on it
      box(g, 1.1, 0.06, 0.06, M.brass, -2.0, 2.95, -3.4); const bn = box(g, 0.9, 1.7, 0.02, M.red, -2.0, 2.05, -3.42);
      void bn; box(g, 0.1, 0.8, 0.01, M.bone, -2.0, 2.15, -3.4); box(g, 0.5, 0.1, 0.01, M.bone, -2.0, 2.35, -3.4); box(g, 0.24, 0.2, 0.01, M.bone, -2.0, 1.8, -3.4);
      // a sigil daubed on the wall in red: a slashed eye
      for (const [w, h, x, y, rz] of [[0.9, 0.06, -0.4, 2.2, 0], [0.7, 0.06, -0.4, 2.0, 0], [0.06, 0.5, -0.82, 2.1, 0.4], [0.06, 0.5, 0.02, 2.1, -0.4], [0.18, 0.18, -0.4, 2.1, 0.78], [1.1, 0.05, -0.4, 2.1, 0.6]]) box(g, w, h, 0.01, M.daub, x, y, -3.44, 0, 0, rz);
      // red emergency lamps on the walls
      for (const [x, z] of [[-3.3, -2.0], [3.5, -1.2]]) { box(g, 0.2, 0.14, 0.12, M.iron, x, 2.5, z); box(g, 0.16, 0.08, 0.06, M.lamp, x, 2.45, z + 0.06); }
      // a trophy: a servo-skull nailed above the table, its optic still burning
      box(g, 0.2, 0.18, 0.18, M.bone, 3.3, 1.7, -2.9); box(g, 0.05, 0.05, 0.02, M.eye, 3.34, 1.72, -2.8); box(g, 0.24, 0.04, 0.2, M.brass, 3.3, 1.81, -2.9);
      cables(g, M.cable, r, 3, 0.5, -1.0, 6);
    },
    stash(g) { // a battered munitions locker
      const M = { wood: L(0x3a2626), band: L(0x1e1414), lock: L(0x9a1a12) };
      const c = new THREE.Group();
      box(c, 0.95, 0.5, 0.6, M.wood, 0, 0.25, 0, 0, 0, 0.02); box(c, 0.97, 0.06, 0.62, M.band, 0, 0.12, 0); box(c, 0.4, 0.12, 0.02, M.lock, -0.2, 0.3, 0.31);
      const lid = new THREE.Group(); lid.position.set(0, 0.5, -0.3); c.add(lid);
      box(lid, 0.95, 0.16, 0.6, M.wood, 0, 0.08, 0.3); box(lid, 0.97, 0.05, 0.62, M.band, 0, 0.1, 0.3);
      box(lid, 0.14, 0.14, 0.05, M.lock, 0, -0.02, 0.61);
      return { group: c, lid };
    },
    wardrobe(g) { // a stand with the Shrike's spare kit: a hooded cloak, a respirator with burning lenses, a knife bandolier
      const M = { wood: L(0x2a2224), cloak: L(0x3a0e0e), hood: L(0x2a1a1a), leather: L(0x3a2a1e), steel: L(0x9aa0a8), eye: new THREE.MeshBasicMaterial({ color: 0xff3a24 }) };
      const w = new THREE.Group();
      box(w, 0.7, 0.1, 0.7, M.wood, 0, 0.05, 0); box(w, 0.1, 2.1, 0.1, M.wood, 0, 1.05, 0); box(w, 0.8, 0.07, 0.07, M.wood, 0, 1.95, 0);
      const cl = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.5, 6, 1, true), M.cloak); cl.position.set(0.22, 1.18, 0.12); cl.material.side = THREE.DoubleSide; w.add(cl);
      box(w, 0.26, 0.26, 0.24, M.hood, -0.28, 1.8, 0.1); box(w, 0.2, 0.12, 0.06, M.wood, -0.28, 1.74, 0.23);
      for (const s of [-1, 1]) box(w, 0.06, 0.05, 0.02, M.eye, -0.28 + s * 0.06, 1.82, 0.23);
      box(w, 0.06, 0.5, 0.06, M.leather, -0.32, 1.45, 0.12); for (let i = 0; i < 3; i++) box(w, 0.03, 0.2, 0.05, M.steel, -0.32, 1.35 - i * 0.12, 0.17);
      return w;
    },
    lights: [{ at: [-2.5, 1.5, -1.1], color: 0xf0f4ff, power: 3.4, range: 5, lantern: true }, { at: [2.5, 0.6, 0.9], color: 0xe8ecff, power: 2.2, range: 4, candles: true }],
  },
  mage: {
    // the Adept's psy-sanctum: a black reactor-hearth with a plasma flame behind a coil grille, a warding circle of
    // circuit-sigils, capacitor pylons, a cogitator-lectern with a glowing data-slate, a stasis casket and a robe
    // in a glass tube
    fire: { at: [1.6, 0, -0.55], colors: [0xd8f0ff, 0x4a8aff], light: 0x7aa8ff, fireplace: true, power: 10 },
    seatYaw: 0.75, sky: 0x05060c,
    build(g, r) {
      const M = { tile: L(0x26262e), tile2: L(0x1e1e26), rune: new THREE.MeshBasicMaterial({ color: 0x3a6ac0, transparent: true, opacity: 0.55 }), black: L(0x121216), stone: L(0x24242c), brass: L(0x7a6a3a), wood: L(0x2a2a30), book: L(0x1a2a4a), page: L(0xc8bca0), coil: L(0x8a5a2a), glow: new THREE.MeshBasicMaterial({ color: 0x8ac8ff }), slate: new THREE.MeshBasicMaterial({ color: 0x6aa8e8 }) };
      for (let x = -5; x <= 5; x++) for (let z = -4; z <= 4; z++) if (x * x + z * z < 30) flat(g, new THREE.PlaneGeometry(0.96, 0.96), (x + z) & 1 ? M.tile : M.tile2, x, z, 0.01 + r() * 0.004);
      // the warding circle: two rings and circuit-sigils (square traces) round it
      flat(g, new THREE.RingGeometry(1.1, 1.22, 6), M.rune, 0, 0.1, 0.03); flat(g, new THREE.RingGeometry(1.5, 1.56, 40), M.rune, 0, 0.1, 0.03);
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; flat(g, new THREE.PlaneGeometry(0.12, 0.26), M.rune, Math.cos(a) * 1.33, 0.1 + Math.sin(a) * 1.33, 0.031, -a); flat(g, new THREE.PlaneGeometry(0.3, 0.04), M.rune, Math.cos(a) * 1.75, 0.1 + Math.sin(a) * 1.75, 0.031, -a); }
      // the reactor-hearth (the plasma flame sits in it): black housing, copper coils either side, a vent stack
      const fx = 1.6, fz = -0.55, ry = -0.55;
      const fp = new THREE.Group(); fp.position.set(fx, 0, fz - 0.25); fp.rotation.y = ry; g.add(fp);
      box(fp, 1.9, 0.25, 0.8, M.black, 0, 0.12, 0.1); for (const s of [-1, 1]) box(fp, 0.38, 1.4, 0.7, M.black, s * 0.76, 0.82, 0);
      box(fp, 2.1, 0.3, 0.85, M.black, 0, 1.6, 0); box(fp, 1.2, 1.2, 0.18, M.stone, 0, 0.75, -0.3); box(fp, 0.8, 1.6, 0.6, M.black, 0, 2.5, -0.1);
      for (const s of [-1, 1]) for (let i = 0; i < 5; i++) cyl(fp, 0.24, 0.24, 0.05, M.coil, s * 0.76, 0.35 + i * 0.22, 0.36, 8);
      for (let i = 0; i < 4; i++) box(fp, 0.9, 0.04, 0.02, M.brass, 0, 0.35 + i * 0.25, 0.46); // the grille in front of the flame
      box(fp, 0.5, 0.06, 0.04, M.glow, 0, 1.6, 0.43);
      cyl(g, 0.24, 0.3, 0.32, M.stone, 0, 0.16, 0, 6); cyl(g, 0.31, 0.31, 0.04, M.brass, 0, 0.3, 0, 6); // her seat
      // the cogitator-lectern: an iron stand, a data-slate glowing on it, a heavy tome beside
      box(g, 0.12, 1.0, 0.12, M.wood, -2.6, 0.5, -2.0); box(g, 0.7, 0.06, 0.5, M.wood, -2.6, 1.02, -2.0, 0.3, -0.35);
      box(g, 0.5, 0.04, 0.34, M.slate, -2.6, 1.06, -1.98, 0.3, -0.35); box(g, 0.04, 0.06, 0.4, M.brass, -2.6, 1.06, -1.98, 0.3, -0.35);
      box(g, 0.5, 0.3, 0.4, M.book, 2.9, 0.15, 1.6, 0.4); box(g, 0.42, 0.12, 0.36, M.wood, 2.9, 0.36, 1.6, 0.6);
      // capacitor pylons with a glowing core
      for (const [x, z] of [[-3.4, 0.6], [3.4, 0.9], [-1.6, -3.2]]) { cyl(g, 0.16, 0.22, 1.8, M.black, x, 0.9, z, 6); for (let i = 0; i < 3; i++) cyl(g, 0.2, 0.2, 0.05, M.coil, x, 0.5 + i * 0.4, z, 6); box(g, 0.12, 0.3, 0.12, M.glow, x, 1.9, z); }
      cables(g, L(0x101014), r, 3, 0, -1, 6);
    },
    stash(g) { // a stasis casket: black stone, brass trim, cold blue light in its seams
      const M = { stone: L(0x22222c), trim: L(0x7a6a3a), glow: new THREE.MeshBasicMaterial({ color: 0x7ab8ff }) };
      const c = new THREE.Group();
      box(c, 1.05, 0.55, 0.66, M.stone, 0, 0.28, 0); box(c, 1.08, 0.06, 0.68, M.trim, 0, 0.04, 0);
      for (const s of [-0.3, 0, 0.3]) box(c, 0.08, 0.2, 0.02, M.glow, s, 0.3, 0.34);
      const lid = new THREE.Group(); lid.position.set(0, 0.56, -0.33); c.add(lid);
      box(lid, 1.05, 0.2, 0.66, M.stone, 0, 0.1, 0.33); box(lid, 1.08, 0.05, 0.68, M.trim, 0, 0.2, 0.33);
      box(lid, 0.6, 0.04, 0.1, M.glow, 0, 0.23, 0.33);
      return { group: c, lid };
    },
    wardrobe(g) { // a stasis tube: the Adept's spare robe hanging in cold blue light behind glass ribs
      const M = { wood: L(0x1e1e26), trim: L(0x7a6a3a), cloth: L(0x1e2a4a), glow: new THREE.MeshBasicMaterial({ color: 0x6aa8ff }) };
      const w = new THREE.Group();
      cyl(w, 0.62, 0.66, 0.16, M.wood, 0, 0.08, 0, 8); cyl(w, 0.62, 0.62, 0.2, M.wood, 0, 2.3, 0, 8); cyl(w, 0.64, 0.64, 0.05, M.trim, 0, 2.18, 0, 8);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; box(w, 0.06, 2.1, 0.06, M.trim, Math.cos(a) * 0.58, 1.15, Math.sin(a) * 0.58); }
      const robe = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.6, 6, 1, true), M.cloth); robe.material.side = THREE.DoubleSide; robe.position.set(0, 1.2, 0); w.add(robe);
      box(w, 0.2, 0.22, 0.2, M.cloth, 0, 2.02, 0);
      box(w, 0.5, 0.04, 0.5, M.glow, 0, 0.18, 0); box(w, 0.5, 0.04, 0.5, M.glow, 0, 2.18, 0);
      return w;
    },
    lights: [{ at: [-2.6, 1.4, -1.6], color: 0x9ac0ff, power: 2.5, range: 4.5, candles: true }, { at: [-2.5, 1.6, -1.2], color: 0x7a9aff, power: 2.2, range: 5, lantern: true }],
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
        <div class="hm-left"><button class="mini-btn" id="hm-back">Title</button><button class="mini-btn" id="hm-guide-btn">How to Play</button></div>
        <div class="hm-pick"><span id="hm-name">Templar</span><button class="mini-btn hm-icon" id="hm-chars" title="Characters" aria-label="Characters"><span id="hm-chars-ic"></span></button><div id="hm-list" class="hidden"></div></div>
        <div id="hm-gold"></div>
      </div>
      <div id="hm-label" class="hidden"></div>
      <div id="hm-guide" class="hidden"><div class="hm-sh"><span>How to Play</span><button class="mini-btn" id="hm-guide-close">Close</button></div>
        <div class="g-wrap"><div id="g-tabs"></div><div id="g-page"></div></div></div>
      <div id="hm-stash" class="hidden"><div class="hm-sh"><span>Stash</span><button class="mini-btn" id="hm-stash-close">Close</button></div>
        <div class="hm-tabs"><button data-tab="gems">Gems</button><button data-tab="runes">Runes</button><button data-tab="items" class="on">Items</button></div>
        <div class="hm-note" id="hm-stash-note">Shared by all your characters.</div><div id="hm-slots"></div><div id="hm-tip" class="hidden"></div><div id="hm-worth"></div></div>
      <div id="hm-juke" class="hidden"><div class="hm-sh"><span>Jukebox</span><button class="mini-btn" id="hm-juke-close">Close</button></div>
        <div class="hm-note">Pick a record for the menus. More are out there to be found.</div><div id="hm-recs"></div></div>
      <div id="hm-work" class="hidden"><div class="hm-sh"><span>Workbench</span><button class="mini-btn" id="hm-work-close">Close</button></div>
        <div class="hm-note">Materials you find in raids will be worked here: upgrading your notables and crafting runes for the sockets in your tree. Coming soon.</div></div>
      <div class="hm-bottom">
        <div class="hm-solo-wrap"><button class="menu-btn primary" id="hm-solo">Solo Raid</button>
          <div id="hm-go" class="hidden"><button class="mini-btn" id="hm-night">Night Raid: Off</button><button class="mini-btn" id="hm-begin">Begin</button></div></div>
        <button class="menu-btn primary" id="hm-party">Party Raid</button>
      </div>
      <div id="hm-hint">Hover the things around the fire</div>`;
    document.body.append(el);
    this.el = el;
    this.stashTab = 'items';
    el.querySelectorAll('.hm-tabs button').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); this.stashTab = b.dataset.tab; this.renderStash(); }));
    // one size for the small buttons, one for the two raid buttons
    const big = innerHeight > 500 ? 3 : 2;
    for (const [id, tone] of [['hm-back', 'ash'], ['hm-chars', 'rust'], ['hm-stash-close', 'ash'], ['hm-juke-close', 'ash'], ['hm-work-close', 'ash'], ['hm-guide-btn', 'rust'], ['hm-guide-close', 'ash'], ['hm-night', 'blood'], ['hm-begin', 'ember']]) pxButton($(id), tone, 2);
    for (const [id, tone] of [['hm-solo', 'ember'], ['hm-party', 'blood']]) pxButton($(id), tone, big);
    pixelIcon($('hm-chars-ic'), 'person', 2);
    pxText($('hm-name'), { px: innerHeight > 500 ? 3 : 2 });
    $('hm-back').addEventListener('click', () => this.close());
    $('hm-guide-btn').addEventListener('click', (e) => { e.stopPropagation(); this.setGuide(!this.guideOpen); });
    $('hm-guide-close').addEventListener('click', () => this.setGuide(false));
    $('hm-guide').addEventListener('click', (e) => e.stopPropagation());
    this.guidePage = GUIDE[0].id;
    $('hm-chars').addEventListener('click', (e) => { e.stopPropagation(); this.toggleList(); });
    $('hm-stash-close').addEventListener('click', () => this.setStash(false));
    $('hm-juke-close').addEventListener('click', () => this.setJuke(false));
    $('hm-work-close').addEventListener('click', () => this.setWork(false));
    // Solo Raid opens the world map (worldmap.js): pick an area there (Night Raid is toggled there too) to begin
    $('hm-solo').addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.game.mp.code) { this.game.mp.addChat({ sys: true, text: 'Leave the party (in the Lobby) to raid solo' }); this.game.partyTab.open(); return; }
      this.game.openWorldMap();
    });
    $('hm-begin').addEventListener('click', () => this.begin());
    $('hm-party').addEventListener('click', () => { this.game.audio.unlock(); this.game.lobbyKind = this.kind; this.game.openLobby(); });
    $('hm-night').addEventListener('click', (e) => { e.stopPropagation(); this.game.nightRaid = !this.game.nightRaid; this.game.refreshNight(); });
    document.addEventListener('click', (e) => { if (!e.target.closest?.('.hm-solo-wrap')) $('hm-go')?.classList.add('hidden'); });
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

  begin() { $('hm-go').classList.add('hidden'); this.close(false); this.game.start(this.kind); }

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
        ask.innerHTML = `<div>Unlock the Adept for ◆ ${MAGE_UNLOCK}?${can ? '' : `<br><i>You have ◆ ${gold}</i>`}</div><button class="hm-yes"${can ? '' : ' disabled'}>Yes</button><button class="hm-no">No</button>`;
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
    g.audio.titleMusic(g.titleSong()); // the record in the jukebox
    // the first time an account comes in, the guide opens by itself
    if (d && !d.seenGuide) { d.seenGuide = true; g.accounts.save(); this.setGuide(true); }
  }

  close(toMenu = true) {
    this.active = false; this.setStash(false); this.setJuke(false); this.setGuide(false); this.setHover(null);
    this.el.classList.add('hidden');
    if (toMenu) this.game.ui.show('menu');
  }

  setKind(kind, force = false) {
    if (kind === this.kind && !force && this.scene) return;
    this.kind = kind;
    const d = this.game.accounts.data;
    if (d && d.lastKind !== kind) { d.lastKind = kind; this.game.accounts.save(); }
    this.game.lobbyKind = kind;
    if (this.game.mp.code && !this.game.mp.active) this.game.mp.setKind(kind); // (in a room: the party sees the change)
    $('hm-name').textContent = NAMES[kind];
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
    scene.add(new THREE.HemisphereLight(S.hemi || 0x6a76a0, 0x14100c, 0.85)); // faint moonlight (or the scene's own tint): shapes, not colours
    const g = new THREE.Group(); scene.add(g);
    S.build(g, r);
    // the fire and its light (the main light on the character)
    const [fx, fy, fz] = S.fire.at;
    this.fire = fire(g, fx, fy + (S.fire.y ?? (S.fire.fireplace ? 0.25 : 0.05)), fz, S.fire.fireplace ? 1.1 : 1, S.fire.colors);
    this.firePower = (S.fire.power || 6) * 1.25;
    this.fireLight = new THREE.PointLight(S.fire.light, this.firePower, 8, 1.3); this.fireLight.position.set(fx, 1.0, fz + (S.fire.fireplace ? 0.5 : 0)); scene.add(this.fireLight);
    // small lights here and there
    this.small = [];
    for (const l of S.lights) {
      const pl = new THREE.PointLight(l.color, l.power * 1.4, l.range * 1.2, 1.5); pl.position.set(...l.at); scene.add(pl);
      if (l.lantern) {
        // a work-lamp: an iron post, a hood and a glowing lens
        cyl(g, 0.04, 0.05, l.at[1] + 0.3, L(0x1e1e22), l.at[0], (l.at[1] + 0.3) / 2, l.at[2] - 0.05, 5);
        box(g, 0.28, 0.14, 0.24, L(0x2a2a2e), l.at[0], l.at[1] + 0.12, l.at[2]);
        box(g, 0.22, 0.08, 0.2, new THREE.MeshBasicMaterial({ color: l.color }), l.at[0], l.at[1], l.at[2]);
      }
      if (l.candles) for (let i = 0; i < 3; i++) { const cx = l.at[0] + (i - 1) * 0.16, cz = l.at[2] + (i % 2) * 0.12, h = 0.14 + i * 0.06; cyl(g, 0.04, 0.045, h, L(0xd8ccb0), cx, h / 2, cz, 5); box(g, 0.04, 0.07, 0.04, new THREE.MeshBasicMaterial({ color: 0xffd080 }), cx, h + 0.04, cz); }
      this.small.push({ pl, base: l.power * 1.4, ph: r() * 6 });
    }
    // the things you can use
    const stash = S.stash(g); stash.group.position.set(2.95, 0, -0.2); stash.group.rotation.y = -0.5; g.add(stash.group);
    const wardrobe = S.wardrobe(g); wardrobe.position.set(-2.95, 0, -0.7); wardrobe.rotation.y = 0.5; g.add(wardrobe);
    this.stashLid = stash.lid; this.lidAngle = 0;
    const J = JUKEBOX[kind], juke = jukebox(J.wood); juke.group.position.set(J.at[0], 0, J.at[1]); juke.group.rotation.y = J.ry; g.add(juke.group);
    const W = WORKBENCH[kind], bench = workbench(W.glow); bench.group.position.set(W.at[0], 0, W.at[1]); bench.group.rotation.y = W.ry; bench.group.scale.setScalar(0.56); g.add(bench.group);
    const benchLight = new THREE.PointLight(W.glow, 1.2, 2.6, 1.5); benchLight.position.set(W.at[0] + 0.3, 1.4, W.at[1] + 0.5); scene.add(benchLight);
    this.juke = juke; this.jukeLight = new THREE.PointLight(0xffb060, 1.6, 3, 1.5); this.jukeLight.position.set(J.at[0], 1.0, J.at[1] + 0.7); scene.add(this.jukeLight);
    this.items = [
      { id: 'stash', group: stash.group, label: 'Reliquary', sub: 'Shared by all your characters' },
      { id: 'wardrobe', group: wardrobe, label: 'Armoury', sub: 'Change your look' },
      { id: 'jukebox', group: juke.group, label: 'Vox-Caster', sub: 'Choose the music' },
      { id: 'workbench', group: bench.group, label: 'Workbench', sub: 'Upgrades and crafting (coming soon)' },
    ];
    this.showRecord(false);
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
    rig.idle = true; rig.root.position.set(SCENES[kind].seatX || 0, 0.0, 0.05); rig.root.rotation.y = this.seatYaw;
    rig.apply(P.rest, 1, 60);
    this.scene.add(rig.root);
    this.rig = rig;
    const item = { id: 'char', group: rig.root, label: NAMES[kind], sub: 'Rites of augmentation (skill tree)' };
    this.items = this.items.filter((x) => x.id !== 'char');
    this.items.push(item);
    this.addOutline(item);
  }

  // an outline for each mesh (a slightly bigger back-faced copy), shown on hover
  addOutline(item) {
    item.outlines = [];
    const meshes = [];
    item.group.traverse((o) => { if (o.isMesh && !o.userData.outline && o.material !== OUTLINE && o.material !== FAINT && !o.material.transparent) meshes.push(o); }); // (not shadows or glows)
    for (const m of meshes) {
      const o = new THREE.Mesh(m.geometry, FAINT);
      o.userData.outline = true; o.scale.setScalar(1.1); o.raycast = () => {}; o.renderOrder = 1;
      m.renderOrder = 2;
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
    if (this.hover) for (const o of this.hover.outlines) o.material = FAINT;
    this.hover = it;
    if (it) { for (const o of it.outlines) o.material = OUTLINE; this.game.audio.play('uiTick', 0.5); }
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
    else if (it.id === 'jukebox') this.setJuke(!this.jukeOpen);
    else if (it.id === 'workbench') this.setWork(!this.workOpen);
  }

  // ---------- How to Play: a page per topic, its tabs down the side ----------
  setGuide(v) {
    this.guideOpen = v;
    if (v) { this.setStash(false); this.setJuke(false); this.setWork(false); this.renderGuide(); this.game.audio.play('uiTick', 1); }
    $('hm-guide')?.classList.toggle('hidden', !v);
    $('hm-hint')?.style.setProperty('visibility', v ? 'hidden' : ''); // (the scene's hint would show through its header)
  }
  renderGuide() {
    const tabs = $('g-tabs');
    tabs.replaceChildren(...GUIDE.map((P) => {
      const b = document.createElement('button');
      b.textContent = P.title; b.classList.toggle('on', P.id === this.guidePage);
      b.addEventListener('click', () => { this.guidePage = P.id; this.renderGuide(); this.game.audio.play('uiTick', 0.6); });
      return b;
    }));
    const P = GUIDE.find((x) => x.id === this.guidePage) || GUIDE[0];
    $('g-page').innerHTML = `<h3>${P.title}</h3>${P.body(this.game)}`;
    $('g-page').scrollTop = 0;
  }

  // ---------- the workbench (its panel only, for now) ----------
  setWork(v) {
    this.workOpen = v;
    if (v) { this.setStash(false); this.setJuke(false); this.setGuide?.(false); this.game.audio.play('uiTick', 1); }
    $('hm-work')?.classList.toggle('hidden', !v);
  }

  // ---------- the jukebox ----------
  setJuke(v) {
    this.jukeOpen = v;
    if (v) { this.setStash(false); this.setWork(false); this.setGuide(false); this.renderRecords(); this.game.audio.play('uiTick', 1); }
    $('hm-juke')?.classList.toggle('hidden', !v);
  }

  renderRecords() {
    const d = this.game.accounts.data, cur = currentRecord(d);
    const hex = (c) => '#' + c.toString(16).padStart(6, '0');
    $('hm-recs').replaceChildren(...ownedRecords(d).map((r) => {
      const b = document.createElement('button');
      b.className = 'hm-rec' + (r.id === cur.id ? ' on' : '');
      b.dataset.record = r.id;
      const ready = SONG_NAMES.includes(r.song);
      b.innerHTML = `<i class="hm-vinyl" style="--rc:${hex(r.color)};--rl:${hex(r.label)}"></i><span><b></b><em></em><small>${r.id === cur.id ? 'Playing' : ready ? '' : 'No music on it yet'}</small></span>`;
      b.querySelector('b').textContent = r.name; b.querySelector('em').textContent = r.desc;
      b.addEventListener('click', () => this.playRecord(r.id));
      return b;
    }));
  }

  // put a record on: it drops into the jukebox's window and spins, and the menus play its song
  playRecord(id) {
    const A = this.game.accounts, d = A.data, r = recordById(id);
    if (!d) return;
    if (d.record !== id) { d.record = id; A.save(); }
    this.showRecord(true);
    this.game.audio.unlock();
    this.game.audio.play('clang', 0.25);
    this.game.audio.titleMusic(r.song);
    this.renderRecords();
  }

  // the record in the window: its colours, and (animate) dropping in from above
  showRecord(animate) {
    const r = currentRecord(this.game.accounts.data), J = this.juke;
    if (!J) return;
    J.vinyl.material.color.setHex(r.color); J.label.material.color.setHex(r.label);
    J.glowMat.color.setHex(r.color).lerp(new THREE.Color(0xffd090), 0.45);
    this.jukeLight.color.copy(J.glowMat.color);
    this.dropT = animate ? 0 : 1;
  }

  setStash(v) {
    this.stashOpen = v;
    if (v) { this.setJuke(false); this.setWork(false); this.setGuide(false); } // one panel at a time
    $('hm-stash')?.classList.toggle('hidden', !v);
    if (v) this.renderStash();
    if (v) this.game.audio.play('uiTick', 1);
  }

  // the stash: three tabs. Items (materials, rarest first, each stack with its count), Gems (every boss's, dark until
  // you have it), Runes (later). Hover or tap a slot for what it is and what it's worth
  renderStash() {
    const d = this.game.accounts.data || {}, tab = this.stashTab, slots = $('hm-slots'), tip = $('hm-tip');
    document.querySelectorAll('#hm-stash .hm-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    slots.innerHTML = ''; tip.classList.add('hidden'); $('hm-worth').textContent = '';
    const region = (id) => REGIONS.find((r) => r.id === ITEMS[id].region)?.name || '';
    const show = (id, n, owned) => {
      const it = ITEMS[id], R = RARITY[it.rarity], v = itemValue(id);
      tip.innerHTML = `<b style="color:${R.color}">${it.name}</b><span>${it.kind === 'gem' ? 'Gem' : R.name + ' material'} · ${region(id)}</span><i>${it.desc}</i>`
        + (it.kind === 'gem' ? (owned ? '<em>Not used up: you only need to carry it.</em>' : `<em>Dropped by ${BOSSES[it.boss]?.name.split(',')[0] || 'its boss'}.</em>`)
          : `<em>Worth ◆ ${v} each${n > 1 ? ` · ◆ ${v * n} for ${n}` : ''}</em>`);
      tip.classList.remove('hidden');
    };
    const slot = (id, n, owned = true) => {
      const el = document.createElement('div'); el.className = 'hm-slot' + (owned ? '' : ' empty');
      el.style.borderColor = owned ? RARITY[ITEMS[id].rarity].color : '';
      el.append(iconEl(id, 2));
      if (n > 1) { const c = document.createElement('span'); c.className = 'hm-count'; c.textContent = n; el.append(c); }
      el.addEventListener('pointerenter', () => show(id, n, owned));
      el.addEventListener('click', (e) => { e.stopPropagation(); show(id, n, owned); });
      slots.append(el);
    };
    if (tab === 'items') {
      $('hm-stash-note').textContent = 'Materials from your raids, shared by all your characters. A bazaar will buy them one day.';
      const have = Object.entries(d.items || {}).filter(([id, n]) => n > 0 && ITEMS[id]?.kind === 'mat')
        .sort((a, b) => TIERS.indexOf(ITEMS[b[0]].rarity) - TIERS.indexOf(ITEMS[a[0]].rarity) || ITEMS[a[0]].region.localeCompare(ITEMS[b[0]].region));
      for (const [id, n] of have) slot(id, n);
      for (let k = have.length; k < STASH_SLOTS; k++) { const el = document.createElement('div'); el.className = 'hm-slot'; slots.append(el); }
      const worth = have.reduce((s2, [id, n]) => s2 + itemValue(id) * n, 0);
      $('hm-worth').textContent = have.length ? `Worth ◆ ${worth} in all` : 'Nothing yet: smash supply drums and open chests in a raid.';
    } else if (tab === 'gems') {
      $('hm-stash-note').textContent = 'Each mini boss drops a gem in the shape of its head. Carry all of a region\'s to pass its gatekeeper.';
      for (const id of Object.keys(ITEMS).filter((k) => ITEMS[k].kind === 'gem')) slot(id, 1, !!d.gems?.[id]);
    } else {
      $('hm-stash-note').textContent = 'Runes are coming later.';
    }
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
    // the record drops into the window, then spins; the strips pulse while music plays
    if (this.juke) {
      this.dropT = Math.min(1, (this.dropT ?? 1) + dt * 1.6);
      const k = 1 - (1 - this.dropT) ** 3;
      this.juke.disc.position.set(0, 0.95 + (1 - k) * 0.9, 0.31 + (1 - k) * 0.25);
      this.juke.disc.rotation.x = (1 - k) * -1.2;
      if (this.dropT >= 1) this.juke.disc.rotation.z -= dt * 3.5;
      const playing = !!this.game.audio.band?.playing;
      this.jukeLight.intensity = playing ? 1.6 + Math.sin(t * 6) * 0.5 : 0.6;
    }
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
