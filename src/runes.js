// Runes: socketed into a character's skill tree (its three rune sockets, skilltree.js) for an effect in every raid.
// Five types: roll (changes the roll; never a cooldown), aura (always round you), summon (a key / a phone button,
// on a cooldown), buff (a key / a button, a set number of times a raid), utility (base stats, an extra revive).
// One rune of each type at a time in a tree; support runes (they strengthen one type) can go in as many sockets as
// you like. Runes are forged at the workbench (hermitage.js) from the stash's materials and kept in the stash, shared
// by every character, never used up; Varek's five unique runes, one of each type, are his reward (main.js).
// The Shattered March: 10 runes (2 a type), 10 supports (2 a type), Varek's 5. Kept tame; the unique ones less so.
//
// In a raid (RuneRuntime): the roll's distance and its embers / Sandevistan afterimages, the aura's ring with its
// slow and burn, the summons (a servo-skull, a scrap hound, Varek's echo) with their own simple AI, the buffs, Second
// Wind. Rune damage goes through each enemy's receive (in a party a guest's hits reach the host as usual); the aura
// and summons ride on the player's snapshot (mp.js) so teammates see them, and the host slows enemies in any
// player's aura.
import * as THREE from 'three';
import { NUM } from './scale.js';
import { owned } from './skilltree.js';
import { buildHumanoid } from './models.js';

export const RUNE_TYPES = {
  roll: { name: 'Roll', color: '#6ab4ff', hex: 0x6ab4ff, desc: 'Changes your roll. Never on a cooldown.' },
  aura: { name: 'Aura', color: '#ff8a3a', hex: 0xff8a3a, desc: 'Always round you.' },
  summon: { name: 'Summon', color: '#6aff9a', hex: 0x6aff9a, desc: 'Called with the Summon key (or button); on a cooldown.' },
  buff: { name: 'Buff', color: '#ff4a5a', hex: 0xff4a5a, desc: 'Used with the Rune Buff key (or button); a set number of times a raid.' },
  util: { name: 'Utility', color: '#e8c25a', hex: 0xe8c25a, desc: 'Base stats, or a second chance.' },
};
const TYPE_ORDER = ['roll', 'aura', 'summon', 'buff', 'util'];

// glyphs: 7 x 7, '#' lit, carved into each rune's stone
const G = (s) => s.split('/');
export const RUNES = {
  // ---------- roll ----------
  long_stride: { type: 'roll', kind: 'main', name: 'Long Stride', desc: 'Your roll carries you 15% further.', fx: { dist: 0.15 },
    recipe: { scrap_iron: 6, ash_rag: 4, copper_coil: 2 }, glyph: G('.......//#.....#/.#...#./..#.#../...#.../.......') },
  ember_step: { type: 'roll', kind: 'main', name: 'Ember Step', desc: 'Your roll leaves a trail of embers for 2.5 s that burn enemies standing in it.', fx: { ember: 2 },
    recipe: { promethium_residue: 4, spent_casings: 6, copper_coil: 2, servo_motor: 1 }, glyph: G('...#.../..##.../..###../.#####./.#####./..###../.......') },
  // ---------- aura ----------
  chill_halo: { type: 'aura', kind: 'main', name: 'Chill Halo', desc: 'Enemies within 3 m of you move 12% slower.', fx: { r: 3, slow: 0.12 },
    recipe: { cracked_lens: 4, copper_coil: 3, ash_rag: 4, purity_seal: 1 }, glyph: G('...#.../.#.#.#./..###../#######/..###../.#.#.#./...#...') },
  cinder_halo: { type: 'aura', kind: 'main', name: 'Cinder Halo', desc: 'Enemies within 2.5 m of you take a little fire damage every half second.', fx: { r: 2.5, burn: 1.5 },
    recipe: { promethium_residue: 5, scrap_iron: 6, servo_motor: 1 }, glyph: G('.#...#./..#.#../.#####./.#...#./.#...#./.#####./.......') },
  // ---------- summon ----------
  servo_skull: { type: 'summon', kind: 'main', name: 'Servo-Skull', desc: 'Calls a servo-skull that hovers at your shoulder for 20 s, firing needles at the nearest enemy. 45 s cooldown.', fx: { pet: 'skull', dur: 20, cd: 45 },
    recipe: { servo_motor: 2, cracked_lens: 3, scrap_iron: 6, augury_shard: 1 }, glyph: G('.#####./#######/##.#.##/#######/.#####./.#.#.#./.......') },
  scrap_hound: { type: 'summon', kind: 'main', name: 'Scrap Hound', desc: 'Calls a hound of scrap iron that runs down and bites the nearest enemy for 20 s. 45 s cooldown.', fx: { pet: 'hound', dur: 20, cd: 45 },
    recipe: { scrap_iron: 10, servo_motor: 2, copper_coil: 3 }, glyph: G('.......//##...../.######/.######/.#.#.#./.#.#.#./.......') },
  // ---------- buff ----------
  litany_fury: { type: 'buff', kind: 'main', name: 'Litany of Fury', desc: 'For 12 s you deal 15% more damage. Once a raid.', fx: { buff: 'fury', dur: 12 },
    recipe: { ash_rag: 6, purity_seal: 2, spent_casings: 4 }, glyph: G('...#.../..###../...#.../.#.#.#./..###../...#.../...#...') },
  iron_litany: { type: 'buff', kind: 'main', name: 'Iron Litany', desc: 'For 12 s you take 20% less damage. Once a raid.', fx: { buff: 'iron', dur: 12 },
    recipe: { scrap_iron: 8, purity_seal: 2, copper_coil: 2 }, glyph: G('#######/#.....#/#.###.#/#.#.#.#/#.###.#/.#...#./..###..') },
  // ---------- utility ----------
  hearth_rune: { type: 'util', kind: 'main', name: 'Hearth Rune', desc: '+150 health.', fx: { hp: 150 },
    recipe: { ash_rag: 8, promethium_residue: 3, copper_coil: 2 }, glyph: G('.......//.##.##./#######/#######/.#####./..###../...#...') },
  second_wind: { type: 'util', kind: 'main', name: 'Second Wind', desc: 'Once a raid, when you would fall, you rise again with 30% health instead. Works in a party too.', fx: { winds: 1 },
    recipe: { purity_seal: 2, augury_shard: 1, cracked_lens: 3, ash_rag: 4 }, glyph: G('...#.../..#.#../.#...#./...#.../..#.#../.#...#./.......') },

  // ---------- supports: each strengthens its type; stack in as many sockets as you have ----------
  far_step: { type: 'roll', kind: 'support', name: 'Far Step', desc: 'Support · Roll: +8% roll distance.', fx: { dist: 0.08 },
    recipe: { scrap_iron: 4, ash_rag: 3 }, glyph: G('.......//...#.../....#../#######/....#../...#.../.......') },
  kindling: { type: 'roll', kind: 'support', name: 'Kindling', desc: 'Support · Roll: your roll rune\'s effect is 50% stronger (more distance, hotter embers, a longer Sandevistan).', fx: { rollPow: 0.5 },
    recipe: { promethium_residue: 3, spent_casings: 4, purity_seal: 1 }, glyph: G('...#.../...#.../..###../..###../.##.##./.#...#./.......') },
  wide_ward: { type: 'aura', kind: 'support', name: 'Wide Ward', desc: 'Support · Aura: +20% aura radius.', fx: { auraR: 0.2 },
    recipe: { cracked_lens: 2, copper_coil: 2, scrap_iron: 3 }, glyph: G('.......//.#...#./#.....#/#..#..#/#.....#/.#...#./.......') },
  fervent_ward: { type: 'aura', kind: 'support', name: 'Fervent Ward', desc: 'Support · Aura: your aura\'s slow and burn are 30% stronger.', fx: { auraPow: 0.3 },
    recipe: { copper_coil: 3, promethium_residue: 2, servo_motor: 1 }, glyph: G('...#.../..###../.#####./..###../...#.../..#.#../.#...#.') },
  pack_call: { type: 'summon', kind: 'support', name: 'Pack Call', desc: 'Support · Summon: one more of whatever you summon.', fx: { pets: 1 },
    recipe: { servo_motor: 2, scrap_iron: 6, augury_shard: 1 }, glyph: G('.......//##.##../##.##../.......//.##.##./.##.##.') },
  short_leash: { type: 'summon', kind: 'support', name: 'Short Leash', desc: 'Support · Summon: summon cooldown 15% shorter.', fx: { petCd: 0.15 },
    recipe: { copper_coil: 3, spent_casings: 4 }, glyph: G('..###../.#...#./#..#..#/#..##.#/#.....#/.#...#./..###..') },
  long_litany: { type: 'buff', kind: 'support', name: 'Long Litany', desc: 'Support · Buff: your rune buff lasts 4 s longer.', fx: { buffDur: 4 },
    recipe: { ash_rag: 4, spent_casings: 3, copper_coil: 1 }, glyph: G('#######/.#...#./..#.#../...#.../..#.#../.#...#./#######') },
  second_litany: { type: 'buff', kind: 'support', name: 'Second Litany', desc: 'Support · Buff: your rune buff can be used once more a raid.', fx: { buffUses: 1 },
    recipe: { purity_seal: 2, augury_shard: 1 }, glyph: G('.......//.#..#../.#..#../.#..#../.#..#../.......') },
  iron_blood: { type: 'util', kind: 'support', name: 'Iron Blood', desc: 'Support · Utility: +100 health.', fx: { hp: 100 },
    recipe: { scrap_iron: 5, ash_rag: 3 }, glyph: G('...#.../..###../.#####./.#####./..###../.......//') },
  deep_breath: { type: 'util', kind: 'support', name: 'Deep Breath', desc: 'Support · Utility: +8 stamina.', fx: { st: 8 },
    recipe: { copper_coil: 2, spent_casings: 4 }, glyph: G('.......//.#...#./#.#.#.#/#..#..#/#.....#/.#####.') },

  // ---------- Varek's five: one of each type, his reward ----------
  sandevistan: { type: 'roll', kind: 'unique', name: 'Sandevistan', desc: 'Your roll becomes a burst of impossible speed: it goes 60% further, the world nearly stops around you (on your own), and you leave a chain of afterimages in your chest glow\'s colour.', fx: { dist: 0.6, sande: true },
    glyph: G('#...#../.#...#./..#...#/...#.../..#...#/.#...#./#...#..') },
  varek_halo: { type: 'aura', kind: 'unique', name: 'Varek\'s Halo', desc: 'A ring of slow-burning embers like his blade: enemies within 3.5 m move 18% slower and burn.', fx: { r: 3.5, slow: 0.18, burn: 2.2 },
    glyph: G('.#.#.#./#.....#/..###../#.#.#.#/..###../#.....#/.#.#.#.') },
  sentinel_echo: { type: 'summon', kind: 'unique', name: 'Sentinel Echo', desc: 'Calls a burning echo of Archon Varek that fights beside you for 15 s, cleaving everything in front of it. 60 s cooldown.', fx: { pet: 'echo', dur: 15, cd: 60 },
    glyph: G('.#...#./.#####./##.#.##/.#####./..#.#../.#####./#.....#') },
  last_stand: { type: 'buff', kind: 'unique', name: 'Last Stand of the Sentinel', desc: 'For 10 s nothing can take you below 1 health and you hit 25% harder. Once a raid.', fx: { buff: 'stand', dur: 10 },
    glyph: G('...#.../.#####./...#.../...#.../.#.#.#./.#.#.#./#######') },
  archon_mantle: { type: 'util', kind: 'unique', name: 'Archon\'s Mantle', desc: '+300 health, and once a raid you rise again with 30% health when you would fall.', fx: { hp: 300, winds: 1 },
    glyph: G('#.#.#.#/#######/.#####./.##.##./.#####./.#####./#######') },
};
export const VAREK_RUNES = ['sandevistan', 'varek_halo', 'sentinel_echo', 'last_stand', 'archon_mantle'];
export const RUNE_ORDER = Object.keys(RUNES).sort((a, b) => TYPE_ORDER.indexOf(RUNES[a].type) - TYPE_ORDER.indexOf(RUNES[b].type) || ['main', 'support', 'unique'].indexOf(RUNES[a].kind) - ['main', 'support', 'unique'].indexOf(RUNES[b].kind));
export const kindLabel = (R) => `${RUNE_TYPES[R.type].name}${R.kind === 'support' ? ' support' : R.kind === 'unique' ? ' · unique' : ''} rune`;

// ---------- the icon: a stone tablet rimmed in its type's colour, its glyph lit; Varek's in gold ----------
const iconCache = new Map();
export function runeCanvas(id) {
  if (iconCache.has(id)) return iconCache.get(id);
  const R = RUNES[id], cv = document.createElement('canvas'); cv.width = cv.height = 16;
  const c = cv.getContext('2d'), T = RUNE_TYPES[R.type], uniq = R.kind === 'unique', sup = R.kind === 'support';
  const px = (x, y, col) => { c.fillStyle = col; c.fillRect(x, y, 1, 1); };
  const rim = uniq ? '#ffd36a' : T.color, stone = uniq ? '#3a2a40' : sup ? '#2e2a28' : '#3a3632', stone2 = uniq ? '#4a3654' : sup ? '#3a3632' : '#4a4540';
  for (let y = 1; y < 15; y++) for (let x = 2; x < 14; x++) {
    const corner = (y === 1 || y === 14) && (x === 2 || x === 13);
    if (corner) continue;
    const edge = y === 1 || y === 14 || x === 2 || x === 13 || ((y === 2 || y === 13) && (x === 3 || x === 12));
    px(x, y, edge ? '#140e0a' : (x + y) % 5 === 0 ? stone2 : stone);
  }
  for (let x = 3; x < 13; x++) { px(x, 2, rim); px(x, 13, rim); } for (let y = 3; y < 13; y++) { px(3, y, rim); px(12, y, rim); }
  if (sup) for (let y = 3; y < 13; y += 2) { px(3, y, stone); px(12, y, stone); } // (a support: a broken rim)
  const lit = uniq ? '#fff4c8' : T.color;
  R.glyph.forEach((row, gy) => [...row].forEach((ch, gx) => { if (ch === '#') px(4 + gx, 4 + gy, lit); }));
  iconCache.set(id, cv);
  return cv;
}
export function runeIconEl(id, px = 3) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 16; cv.className = 'item-ic';
  cv.getContext('2d').drawImage(runeCanvas(id), 0, 0); cv.style.width = cv.style.height = 16 * px + 'px';
  return cv;
}

// ---------- the account: runes owned (d.runes), what's in each character's sockets (d.runeSlots[kind][node]) ----------
export const ownsRune = (d, id) => !!d?.runes?.[id];
export function grantRune(d, id) { (d.runes ||= {})[id] = 1; }
export const socketed = (d, kind) => d?.runeSlots?.[kind] || {};
// can this rune go in this socket? one of each type per tree (a support can go in as many as you like)
export function socketCheck(d, kind, node, id) {
  if (!id) return { ok: true };
  if (!ownsRune(d, id)) return { ok: false, why: 'Not forged yet' };
  const R = RUNES[id];
  if (R.kind === 'support') return { ok: true };
  for (const [n, other] of Object.entries(socketed(d, kind))) if (n !== node && RUNES[other] && RUNES[other].kind !== 'support' && RUNES[other].type === R.type) return { ok: false, why: `Already a ${RUNE_TYPES[R.type].name.toLowerCase()} rune in this tree (${RUNES[other].name})` };
  return { ok: true };
}
export function setSocket(d, kind, node, id) {
  if (!socketCheck(d, kind, node, id).ok) return false;
  const S = ((d.runeSlots ||= {})[kind] ||= {});
  if (id) S[node] = id; else delete S[node];
  return true;
}

// ---------- what a character's socketed runes add up to (only sockets in nodes they own count) ----------
export function runeLoadout(d, kind) {
  const L = { roll: { dist: 1, ember: 0, sande: false }, aura: null, summon: null, buff: null, util: { hp: 0, st: 0, winds: 0 }, ids: [] };
  if (!d) return L;
  const have = owned(d, kind), list = Object.entries(socketed(d, kind)).filter(([n, id]) => have.has(n) && RUNES[id] && ownsRune(d, id)).map(([, id]) => id);
  L.ids = list;
  const sup = { dist: 0, rollPow: 0, auraR: 0, auraPow: 0, pets: 0, petCd: 0, buffDur: 0, buffUses: 0 };
  let roll = null;
  for (const id of list) {
    const R = RUNES[id], f = R.fx;
    if (R.kind === 'support') { for (const k in sup) sup[k] += f[k] || 0; L.util.hp += f.hp || 0; L.util.st += f.st || 0; continue; }
    if (R.type === 'roll') roll = R;
    else if (R.type === 'aura') L.aura = { id, r: f.r, slow: f.slow || 0, burn: f.burn || 0, hex: R.kind === 'unique' ? 0xff5a2a : f.slow && !f.burn ? 0x6ab4ff : 0xff8a3a };
    else if (R.type === 'summon') L.summon = { id, pet: f.pet, dur: f.dur, cd: f.cd, n: 1 };
    else if (R.type === 'buff') L.buff = { id, buff: f.buff, dur: f.dur, uses: 1 };
    else { L.util.hp += f.hp || 0; L.util.winds += f.winds || 0; }
  }
  const pow = 1 + sup.rollPow;
  L.roll.dist = 1 + ((roll?.fx.dist || 0) * pow) + sup.dist;
  if (roll?.fx.ember) L.roll.ember = roll.fx.ember * pow;
  if (roll?.fx.sande) { L.roll.sande = true; L.roll.sandeT = 0.9 * pow; }
  if (L.aura) { L.aura.r *= 1 + sup.auraR; L.aura.slow *= 1 + sup.auraPow; L.aura.burn *= 1 + sup.auraPow; }
  if (L.summon) { L.summon.n += sup.pets; L.summon.cd *= Math.max(0.4, 1 - sup.petCd); }
  if (L.buff) { L.buff.dur += sup.buffDur; L.buff.uses += sup.buffUses; }
  return L;
}

// ---------- in a raid ----------
const V = new THREE.Vector3();
const glow = (hex, o = 0.6) => new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
function box(g, w, h, d, mat, x, y, z) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); g.add(m); return m; }
const L = (c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true });

// the creatures summons call up (also drawn for teammates from the snapshot)
function petModel(pet) {
  const g = new THREE.Group(), parts = {};
  if (pet === 'skull') {
    const s = new THREE.Group(); s.position.y = 1.7; g.add(s); parts.body = s;
    box(s, 0.24, 0.22, 0.24, L(0xd8ccb0), 0, 0, 0); box(s, 0.2, 0.06, 0.12, L(0xb8ac90), 0, -0.13, 0.04);
    box(s, 0.07, 0.05, 0.02, new THREE.MeshBasicMaterial({ color: 0xff3a1a }), -0.05, 0.02, 0.13); box(s, 0.05, 0.05, 0.02, L(0x111111), 0.05, 0.02, 0.13);
    box(s, 0.02, 0.18, 0.02, L(0x3a3a40), 0.08, 0.18, -0.02); box(s, 0.16, 0.03, 0.16, L(0x5a5a62), 0, -0.2, 0);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.012, 4, 14), glow(0x6aff9a, 0.7)); ring.rotation.x = Math.PI / 2; ring.position.y = -0.24; s.add(ring);
    parts.eye = s.children[2];
  } else if (pet === 'hound') {
    const metal = L(0x6a6058), dark = L(0x3a3430), rust = L(0x7a4a2a);
    box(g, 0.32, 0.26, 0.7, metal, 0, 0.5, 0); box(g, 0.34, 0.08, 0.5, rust, 0, 0.66, -0.02);
    const head = new THREE.Group(); head.position.set(0, 0.66, 0.42); g.add(head); parts.head = head;
    box(head, 0.24, 0.22, 0.28, metal, 0, 0, 0.06); box(head, 0.18, 0.1, 0.2, dark, 0, -0.08, 0.2);
    for (const sx of [-1, 1]) { box(head, 0.04, 0.03, 0.02, new THREE.MeshBasicMaterial({ color: 0x6aff9a }), sx * 0.07, 0.04, 0.21); box(head, 0.06, 0.12, 0.04, dark, sx * 0.08, 0.15, -0.02); }
    parts.legs = [];
    for (const [x, z] of [[-0.12, 0.25], [0.12, 0.25], [-0.12, -0.25], [0.12, -0.25]]) { const l = new THREE.Group(); l.position.set(x, 0.4, z); g.add(l); box(l, 0.07, 0.4, 0.07, dark, 0, -0.2, 0); parts.legs.push(l); }
    const tail = box(g, 0.04, 0.04, 0.3, dark, 0, 0.62, -0.45); tail.rotation.x = -0.6; parts.tail = tail;
  } else {
    // Varek's echo: his shape in burning light
    const rig = buildHumanoid({ scale: 1.3, skin: 0x5a5048, cloth: 0x1e1c20, armor: 0x34343c, accent: 0x6a1412, head: 'horned', weapon: 'greatsword', eyes: 0xffb040, bulk: 1.2 });
    const m = glow(0xff5a2a, 0.42);
    rig.root.traverse((o) => { if (o.isMesh && o !== rig.shadow) o.material = m; });
    if (rig.shadow) rig.shadow.visible = false;
    g.add(rig.root); parts.rig = rig;
  }
  return { g, parts };
}
const TARGET_R = { skull: 9, hound: 12, echo: 10 };

export class RuneRuntime {
  constructor(game) { this.game = game; this.reset(); }

  // a new run: the player's loadout, the HUD's buttons, everything cleared
  reset() {
    const g = this.game;
    for (const p of this.pets || []) g.scene?.remove(p.g);
    for (const e of this.embers || []) g.scene?.remove(e.m);
    for (const a of this.ghosts || []) g.scene?.remove(a.g);
    if (this.ring) g.scene?.remove(this.ring);
    for (const r of Object.values(this.remote || {})) { if (r.ring) g.scene?.remove(r.ring); for (const p of r.pets) g.scene?.remove(p.g); }
    this.pets = []; this.embers = []; this.ghosts = []; this.ring = null; this.remote = {};
    this.burnT = 0; this.emberT = 0; this.ghostT = 0; this.foeSlowT = 0; this.lastRoll = false;
    this.L = null;
  }
  attach(p, L) {
    this.reset();
    this.L = L; this.p = p;
    p.runeL = L; p.summonCd = 0; p.buffUses = L.buff?.uses || 0; p.buffT = 0; p.buffKind = null; p.winds = L.util.winds;
    const touch = (id, on, label) => { const b = document.getElementById(id); if (b) { b.classList.toggle('hidden', !on); if (label) b.textContent = label; } };
    touch('b-summon', !!L.summon, 'SUMMON'); touch('b-runebuff', !!L.buff, 'RUNE');
    if (L.aura) this.ring = this.auraRing(L.aura);
    this.hud();
  }

  // ---------- the keys / buttons ----------
  use(a) {
    const p = this.p, L = this.L, g = this.game;
    if (!p?.alive || !L) return;
    if (a === 'summon') {
      if (!L.summon) return;
      if (p.summonCd > 0) { g.ui.toastSmall?.(`Summon ready in ${Math.ceil(p.summonCd)}s`); return; }
      p.summonCd = L.summon.cd;
      for (const old of this.pets) g.scene.remove(old.g);
      this.pets = [];
      for (let i = 0; i < L.summon.n; i++) this.spawnPet(L.summon.pet, L.summon.dur, i);
      g.audio.play('fog', 0.6); g.fx.burst({ x: p.pos.x, y: 0.8, z: p.pos.z }, 24, [0.4, 1, 0.6], 4, 0.6, 0.2);
      g.ui.toastSmall?.(`${L.summon.n > 1 ? L.summon.n + ' × ' : ''}${RUNES[L.summon.id].name}`);
    } else if (a === 'runebuff') {
      if (!L.buff) return;
      if (p.buffT > 0) return;
      if (p.buffUses <= 0) { g.ui.toastSmall?.('Your rune buff is spent for this raid'); return; }
      p.buffUses--; p.buffT = L.buff.dur; p.buffKind = L.buff.buff;
      if (p.buffKind === 'fury') p.dmgMul *= 1.15;
      if (p.buffKind === 'stand') p.dmgMul *= 1.25;
      g.audio.play('heal', 0.8); g.ui.toast(RUNES[L.buff.id].name.toUpperCase(), 2);
    }
    this.hud();
  }
  endBuff() {
    const p = this.p;
    if (p.buffKind === 'fury') p.dmgMul /= 1.15;
    if (p.buffKind === 'stand') p.dmgMul /= 1.25;
    p.buffKind = null; p.buffT = 0;
  }
  // (player.js) what a hit does with a buff up, and falling with Second Wind or Last Stand
  hitMul() { return this.p?.buffKind === 'iron' ? 0.8 : 1; }
  // returns true if the fall was stopped
  saveFromDeath(p) {
    const g = this.game;
    if (p.buffKind === 'stand') { p.hp = 1; return true; }
    if (p.winds > 0) {
      p.winds--; p.hp = Math.round(p.maxHp * 0.3);
      g.ui.toast('SECOND WIND', 2.2); g.audio.play('heal', 1);
      g.fx.burst({ x: p.pos.x, y: 1, z: p.pos.z }, 40, [1, 0.85, 0.4], 6, 0.8, 0.3); g.fx.shockwave?.(p.pos.x, p.pos.z, 2.5, 0xffd36a, 0.5);
      return true;
    }
    return false;
  }

  // ---------- the roll (player.js calls this every frame of a roll) ----------
  onRoll(p, dt) {
    const L = this.L, g = this.game;
    if (!L) return;
    if (L.roll.ember && (this.emberT -= dt) <= 0) {
      this.emberT = 0.07;
      const m = new THREE.Mesh(new THREE.CircleGeometry(0.45, 8), glow(0xff6a1a, 0.45)); m.rotation.x = -Math.PI / 2; m.position.set(p.pos.x, 0.05, p.pos.z); g.scene.add(m);
      this.embers.push({ x: p.pos.x, z: p.pos.z, t: 2.5, m });
    }
    if (L.roll.sande) {
      if (!this.lastRoll && !g.mp.active) this.foeSlowT = L.roll.sandeT; // (alone: the world nearly stops)
      if ((this.ghostT -= dt) <= 0) { this.ghostT = 0.05; this.afterimage(p, p.rig.chestGlow ?? 0x8ad8ff); }
    }
    this.lastRoll = true;
  }
  afterimage(p, hex) {
    const g = this.game, c = p.rig.root.clone(true), m = glow(hex, 0.5);
    c.traverse((o) => { if (o.isMesh || o.isSprite) o.material = m; });
    g.scene.add(c);
    this.ghosts.push({ g: c, m, t: 0.45 });
  }
  get foeTime() { return this.foeSlowT > 0 ? 0.25 : 1; } // (main.js runs the enemies at this speed)

  // ---------- the aura ----------
  auraRing(A) {
    const g = new THREE.Group(), m = glow(A.hex, 0.35), m2 = glow(A.hex, 0.18);
    const ring = new THREE.Mesh(new THREE.RingGeometry(A.r - 0.12, A.r, 40), m); ring.rotation.x = -Math.PI / 2; g.add(ring);
    const inner = new THREE.Mesh(new THREE.CircleGeometry(A.r, 40), m2); inner.rotation.x = -Math.PI / 2; inner.position.y = -0.005; g.add(inner);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, t = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.3), m); t.rotation.x = -Math.PI / 2; t.rotation.z = -a; t.position.set(Math.sin(a) * (A.r - 0.3), 0, Math.cos(a) * (A.r - 0.3)); g.add(t); }
    g.userData = { A, m, m2 };
    this.game.scene.add(g);
    return g;
  }
  // (actor.js, where enemies are run) how much any player's aura slows a spot
  slowAt(x, z) {
    let s = 1;
    const own = this.L?.aura, p = this.p;
    if (own?.slow && p?.alive && Math.hypot(x - p.pos.x, z - p.pos.z) < own.r) s *= 1 - own.slow;
    for (const r of this.game.mp.active ? this.game.mp.peers.values() : []) {
      const a = r.net?.ra;
      if (a && r.alive && a[1] > 0 && Math.hypot(x - r.pos.x, z - r.pos.z) < a[0]) s *= 1 - a[1];
    }
    return s;
  }

  // a hit from a rune (aura, embers, a summon), from this player
  damage(e, dmg, el = 'phys') {
    const g = this.game, p = this.p;
    if (!e?.alive || !p) return;
    const hp0 = e.hp, d = dmg * NUM * (p.dmgMul || 1);
    const r = e.receive({ dmg: d, poise: 0, srcPos: p.pos, attacker: p, noKnock: true });
    if (r === 'none') return;
    const dealt = e.puppet ? d : hp0 - e.hp;
    g.dmgPops(e, { [el]: dealt }, 'me');
    g.mp.event({ k: 'hit', id: e.netId, heavy: false, d: { [el]: Math.round(dealt) } });
  }
  nearest(x, z, r) {
    let best = null, bd = r;
    for (const e of this.game.enemiesAll()) { if (!e.alive || e.reserve) continue; const d = Math.hypot(e.pos.x - x, e.pos.z - z); if (d < bd) { bd = d; best = e; } }
    return best;
  }

  // ---------- summons ----------
  spawnPet(pet, dur, i) {
    const g = this.game, p = this.p, M = petModel(pet), a = (i / Math.max(1, this.L.summon.n)) * Math.PI * 2 + 1;
    M.g.position.set(p.pos.x + Math.cos(a) * 1.2, 0, p.pos.z + Math.sin(a) * 1.2);
    g.scene.add(M.g);
    this.pets.push({ pet, ...M, t: dur, cd: 0.5 + i * 0.3, ph: a, pos: M.g.position, yaw: 0, swing: 0 });
  }
  updatePet(P, dt) {
    const g = this.game, p = this.p, pos = P.pos, t = g.time;
    P.t -= dt; P.cd -= dt;
    const tgt = this.nearest(pos.x, pos.z, TARGET_R[P.pet]);
    if (P.pet === 'skull') {
      // hovers at your shoulder, bobbing; a needle at the nearest enemy every 1.2 s
      const want = V.set(p.pos.x + Math.cos(t * 0.8 + P.ph) * 0.9, 0, p.pos.z + Math.sin(t * 0.8 + P.ph) * 0.9);
      pos.lerp(want, Math.min(1, dt * 4));
      P.parts.body.position.y = 1.7 + Math.sin(t * 3 + P.ph) * 0.08;
      if (tgt) P.yaw = Math.atan2(tgt.pos.x - pos.x, tgt.pos.z - pos.z);
      if (tgt && P.cd <= 0) {
        P.cd = 1.2;
        const from = new THREE.Vector3(pos.x, 1.7, pos.z), to = new THREE.Vector3(tgt.pos.x, 1.1 * tgt.rig.root.scale.y, tgt.pos.z);
        this.tracer(from, to, 0x9affb0);
        this.damage(tgt, 6, 'phys');
        g.audio.play('bow', 0.35);
      }
    } else if (P.pet === 'hound') {
      // runs at the nearest enemy and bites; with none, trots at your heel
      const goal = tgt ? tgt.pos : V.set(p.pos.x + Math.cos(P.ph) * 1.4, 0, p.pos.z + Math.sin(P.ph) * 1.4);
      const dx = goal.x - pos.x, dz = goal.z - pos.z, d = Math.hypot(dx, dz), reach = tgt ? 0.9 + (tgt.radius || 0.45) : 0.4;
      let moving = false;
      if (d > reach) {
        const sp = Math.min(d - reach, (tgt ? 6 : 5) * dt), to = new THREE.Vector3(pos.x + (dx / d) * sp, 0, pos.z + (dz / d) * sp);
        g.world.resolve(pos, to, 0.3); pos.x = to.x; pos.z = to.z; moving = true;
      }
      if (d > 0.01) P.yaw = Math.atan2(dx, dz);
      if (tgt && d <= reach + 0.1 && P.cd <= 0) { P.cd = 1.0; P.swing = 0.25; this.damage(tgt, 8, 'phys'); g.audio.play('hit', 0.4); }
      const run = moving ? Math.sin(t * 18) : 0;
      P.parts.legs.forEach((l, k) => { l.rotation.x = run * 0.7 * (k % 2 ? 1 : -1) * (k < 2 ? 1 : -1); });
      P.parts.head.rotation.x = P.swing > 0 ? -0.5 : 0; P.swing -= dt;
      P.parts.tail.rotation.y = Math.sin(t * 10) * 0.4;
    } else {
      // Varek's echo: strides at the nearest enemy and cleaves everything in front of it
      const goal = tgt ? tgt.pos : V.set(p.pos.x + Math.cos(P.ph) * 1.8, 0, p.pos.z + Math.sin(P.ph) * 1.8);
      const dx = goal.x - pos.x, dz = goal.z - pos.z, d = Math.hypot(dx, dz), reach = tgt ? 1.8 : 0.5;
      let moving = false;
      if (d > reach) { const sp = Math.min(d - reach, 4.5 * dt), to = new THREE.Vector3(pos.x + (dx / d) * sp, 0, pos.z + (dz / d) * sp); g.world.resolve(pos, to, 0.5); pos.x = to.x; pos.z = to.z; moving = true; }
      if (d > 0.01) P.yaw = Math.atan2(dx, dz);
      if (tgt && d <= reach + 0.2 && P.cd <= 0) {
        P.cd = 1.3; P.swing = 0.5;
        for (const e of g.enemiesAll()) if (e.alive && Math.hypot(e.pos.x - pos.x, e.pos.z - pos.z) < 2.8 && Math.cos(Math.atan2(e.pos.x - pos.x, e.pos.z - pos.z) - P.yaw) > 0) this.damage(e, 14, 'fire');
        g.fx.shockwave?.(pos.x + Math.sin(P.yaw) * 1.4, pos.z + Math.cos(P.yaw) * 1.4, 1.6, 0xff6a2a, 0.35); g.audio.play('heavySwing', 0.6);
      }
      P.swing -= dt;
      const sw = P.swing > 0 ? 1 - P.swing / 0.5 : -1, run = moving ? Math.sin(t * 9) : 0;
      P.parts.rig.apply({ legL: [-run * 0.5, 0, 0.03], legR: [run * 0.5, 0, -0.03], torso: [0.1, sw >= 0 ? 0.9 - sw * 1.8 : 0, 0], armR: sw >= 0 ? [-2.6 + sw * 2, 0, 0.2] : [-0.4, 0, -0.2], foreR: [-0.3, 0, 0], armL: sw >= 0 ? [-2.4 + sw * 1.8, 0, -0.2] : [-0.3, 0, 0.2], foreL: [-0.4, 0, 0] }, dt, 14);
      if (Math.random() < dt * 20) g.fx.ember?.({ x: pos.x, y: 0.5 + Math.random() * 2, z: pos.z }, 0.4, 1.2);
    }
    P.g.rotation.y = P.yaw;
    if (P.t < 1) P.g.traverse((o) => { if (o.material?.transparent !== undefined) { o.material.transparent = true; o.material.opacity = Math.max(0, P.t) * (o.material.blending === THREE.AdditiveBlending ? 0.42 : 1); } });
  }
  tracer(from, to, hex) {
    const g = this.game, d = to.clone().sub(from), len = d.length(), m = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, len, 4), glow(hex, 0.9));
    m.position.copy(from).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    g.scene.add(m); this.ghosts.push({ g: m, m: m.material, t: 0.12 });
  }

  // ---------- every frame (main.js) ----------
  update(dt) {
    const g = this.game, p = this.p, L = this.L;
    if (!p || !L) return;
    if (p.state !== 'roll') this.lastRoll = false;
    this.foeSlowT = Math.max(0, this.foeSlowT - dt);
    p.summonCd = Math.max(0, p.summonCd - dt);
    if (p.buffT > 0 && (p.buffT -= dt) <= 0) { this.endBuff(); g.ui.toastSmall?.('Your rune buff fades'); }
    if (p.buffKind && Math.random() < dt * 25) { const c = { fury: [1, 0.3, 0.2], iron: [0.6, 0.7, 0.9], stand: [1, 0.85, 0.3] }[p.buffKind]; g.fx.add.spawn({ x: p.pos.x + (Math.random() - 0.5) * 0.7, y: 0.3 + Math.random() * 1.6, z: p.pos.z + (Math.random() - 0.5) * 0.7, vy: 1.2, life: 0.6, size: 0.14, size1: 0.02, r: c[0], g: c[1], b: c[2] }); }
    // the aura: its ring follows you; it burns every half second
    if (this.ring) {
      this.ring.position.set(p.pos.x, 0.06, p.pos.z); this.ring.rotation.y += dt * 0.5; this.ring.visible = p.alive;
      this.ring.userData.m.opacity = 0.28 + Math.sin(g.time * 3) * 0.08;
      if (L.aura.burn && p.alive && (this.burnT -= dt) <= 0) {
        this.burnT = 0.5;
        for (const e of g.enemiesAll()) if (e.alive && !e.reserve && Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z) < L.aura.r + (e.radius || 0.4)) this.damage(e, L.aura.burn, 'fire');
      }
      if (Math.random() < dt * 14) { const a = Math.random() * 6.28, r = Math.random() * L.aura.r, c = new THREE.Color(L.aura.hex); g.fx.add.spawn({ x: p.pos.x + Math.cos(a) * r, y: 0.1, z: p.pos.z + Math.sin(a) * r, vy: 0.8, life: 0.7, size: 0.1, size1: 0.02, r: c.r, g: c.g, b: c.b, alpha: 0.7 }); }
    }
    // embers left by the roll
    if (this.embers.length) {
      const tick = (this.emberHitT = (this.emberHitT || 0) - dt) <= 0;
      if (tick) this.emberHitT = 0.5;
      const hit = new Set();
      for (const E of this.embers) {
        E.t -= dt; E.m.material.opacity = Math.min(0.45, E.t * 0.3);
        if (Math.random() < dt * 6) g.fx.flame?.({ x: E.x + (Math.random() - 0.5) * 0.4, y: 0.1, z: E.z + (Math.random() - 0.5) * 0.4 }, 0.35);
        if (tick) for (const e of g.enemiesAll()) if (e.alive && !hit.has(e) && Math.hypot(e.pos.x - E.x, e.pos.z - E.z) < 0.9 + (e.radius || 0.4)) { hit.add(e); this.damage(e, L.roll.ember, 'fire'); }
      }
      this.embers = this.embers.filter((E) => { if (E.t > 0) return true; g.scene.remove(E.m); E.m.geometry.dispose(); return false; });
    }
    // afterimages and tracers fading
    for (const A of this.ghosts) { A.t -= dt; A.m.opacity = Math.max(0, A.t) * 1.1; }
    this.ghosts = this.ghosts.filter((A) => { if (A.t > 0) return true; g.scene.remove(A.g); return false; });
    // summons
    for (const P of this.pets) this.updatePet(P, dt);
    this.pets = this.pets.filter((P) => { if (P.t > 0 && p.alive !== false) return true; g.scene.remove(P.g); g.fx.burst({ x: P.pos.x, y: 0.8, z: P.pos.z }, 12, [0.6, 0.9, 0.6], 2.5, 0.5, 0.15); return false; });
    this.updateRemote(dt);
    this.hud();
  }
  hud() {
    const p = this.p, L = this.L, el = document.getElementById('rune-hud');
    if (!el || !p) return;
    const parts = [];
    if (L?.summon) parts.push(p.summonCd > 0 ? `Summon ${Math.ceil(p.summonCd)}s` : 'Summon ready');
    if (L?.buff) parts.push(p.buffT > 0 ? `${RUNES[L.buff.id].name} ${Math.ceil(p.buffT)}s` : p.buffUses > 0 ? `Rune buff ×${p.buffUses}` : 'Rune buff spent');
    if (p.winds > 0) parts.push(`Second Wind ×${p.winds}`);
    const txt = parts.join(' · ');
    if (txt !== this.hudTxt) { this.hudTxt = txt; el.textContent = txt; }
    document.getElementById('b-summon')?.classList.toggle('cd', p.summonCd > 0);
    document.getElementById('b-runebuff')?.classList.toggle('cd', !(p.buffUses > 0) || p.buffT > 0);
  }

  // ---------- teammates: their aura ring, summons and afterimages, from their snapshot (mp.js) ----------
  snapshot() {
    const L = this.L, p = this.p, out = {};
    if (!L || !p) return out;
    if (L.aura) out.ra = [Math.round(L.aura.r * 10) / 10, Math.round(L.aura.slow * 100) / 100, L.aura.hex];
    if (this.pets.length) out.sm = this.pets.map((P) => [P.pet, Math.round(P.pos.x * 100) / 100, Math.round(P.pos.z * 100) / 100, Math.round(P.yaw * 100) / 100]);
    if (L.roll.sande) out.sv = p.rig.chestGlow ?? 0x8ad8ff;
    return out;
  }
  updateRemote(dt) {
    const g = this.game;
    if (!g.mp.active) return;
    for (const r of g.mp.peers.values()) {
      const s = r.net || {}, R = (this.remote[r.pid] ||= { ring: null, ringKey: '', pets: [], gT: 0 });
      // the aura ring
      const key = s.ra ? s.ra.join() : '';
      if (key !== R.ringKey) { if (R.ring) g.scene.remove(R.ring); R.ring = s.ra ? this.auraRing({ r: s.ra[0], hex: s.ra[2] }) : null; R.ringKey = key; }
      if (R.ring) { R.ring.position.set(r.pos.x, 0.06, r.pos.z); R.ring.rotation.y += dt * 0.5; R.ring.visible = r.alive; }
      // summons
      const sm = s.sm || [];
      while (R.pets.length > sm.length) g.scene.remove(R.pets.pop().g);
      sm.forEach((q, i) => {
        if (!R.pets[i] || R.pets[i].pet !== q[0]) { if (R.pets[i]) g.scene.remove(R.pets[i].g); const M = petModel(q[0]); g.scene.add(M.g); R.pets[i] = { pet: q[0], ...M }; M.g.position.set(q[1], 0, q[2]); }
        const P = R.pets[i]; P.g.position.x += (q[1] - P.g.position.x) * Math.min(1, dt * 12); P.g.position.z += (q[2] - P.g.position.z) * Math.min(1, dt * 12); P.g.rotation.y = q[3];
        if (P.pet === 'skull') P.parts.body.position.y = 1.7 + Math.sin(g.time * 3 + i) * 0.08;
      });
      // a teammate's Sandevistan roll leaves its afterimages here too
      if (s.sv != null && s.st === 'roll' && (R.gT -= dt) <= 0) { R.gT = 0.05; this.afterimage(r, s.sv); }
    }
  }
}
