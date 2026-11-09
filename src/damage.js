// Five damage types. Every hit is split into physical, fire, bleed, poison and frost parts; the total comes off
// the health bar, and only the elemental parts build status (bleed damage builds bleed, and so on).
// Players: the weapon is physical; skill-tree nodes add flat and % damage per type, Infusions add a share of
// each hit's physical damage as their element. Enemies: an `elems` share of their hit is elemental (taken out
// of the physical, so the total stays the same). On players, armour (Knight) cuts physical damage, and each 1%
// of an element's resistance cuts its build-up by 1% and its damage by 1% (a direct cut).
import { NUM } from './scale.js';
export const TYPES = ['phys', 'fire', 'bleed', 'poison', 'frost'];
export const ELEMS = ['bleed', 'fire', 'frost', 'poison'];
export const TYPE_NAME = { phys: 'Physical', fire: 'Fire', bleed: 'Bleed', poison: 'Poison', frost: 'Frost' };
export const TYPE_COLOR = { phys: '#ffffff', fire: '#ff8a2a', bleed: '#e8343c', poison: '#8ad848', frost: '#9ad8ff' };

// (per point of damage: damage is NUM times bigger, the meters are not)
export const BUILD_PER_DMG = 1.75 / NUM; // a player's melee: status build-up per point of elemental damage (on enemies)
export const SPELL_BUILD = 0.75 / NUM; // spells are all one element, so they build less per point
export const ENEMY_BUILD = 4 / NUM; // enemies' hits on players
export const RES_CAP = 75, ARMOR_CAP = 50; // (the same caps as enemies: defenses.js)

// Infusion share of physical damage added as the element: 15% for the first, +8% for each more
export const infusionShare = (lv) => (lv ? 0.15 + 0.08 * (lv - 1) : 0);

// a player's hit: base weapon damage (physical) -> { phys, fire, ... } before shared multipliers
export function playerParts(tree = {}, statusLv = {}, base) {
  const out = { phys: (base + (tree.physDmg || 0)) * (1 + (tree.physPct || 0) / 100) };
  for (const k of ELEMS) {
    const v = ((tree[k + 'Dmg'] || 0) + infusionShare(statusLv[k]) * base) * (1 + (tree[k + 'Pct'] || 0) / 100);
    if (v > 0) out[k] = v;
  }
  return out;
}
export const scaleParts = (p, m) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v * m]));
export const sumParts = (p) => Object.values(p).reduce((a, b) => a + b, 0);

// an enemy's hit. Regular enemies' elements are added on top of the hit (elems.add, see addedElems); a boss's
// are carved out of it (its total stays the same)
export function enemyParts(dmg, elems) {
  const out = {};
  let rest = 1;
  for (const [k, s] of Object.entries(elems || {})) { out[k] = dmg * s; rest -= s; }
  out.phys = elems?.add ? dmg : dmg * Math.max(0, rest);
  return out;
}
// mark an elements object as extra damage on top of the hit (hidden from Object.entries, kept wherever it's passed)
export const addedElems = (e) => (e ? Object.defineProperty(e, 'add', { value: true }) : e);

// what reaches a player after armour and resistances, and the build-up each element adds
export function mitigate(parts, tree = {}, buildMul = 1) {
  const taken = {}, build = {};
  for (const [k, v] of Object.entries(parts)) {
    if (k === 'phys') { taken.phys = v * (1 - Math.min(ARMOR_CAP, tree.armor || 0) / 100); continue; }
    const res = Math.min(RES_CAP, tree[k + 'Res'] || 0) / 100;
    taken[k] = v * (1 - res); // a direct cut: 75% resistance, a quarter of the damage
    build[k] = v * ENEMY_BUILD * buildMul * (1 - res);
  }
  return { taken, build, total: sumParts(taken) };
}

// which elements show on the weapon: at least 1.5 (× NUM) of that element on a light hit
export function weaponElems(tree, statusLv, base = 15 * NUM) {
  const p = playerParts(tree, statusLv, base);
  return ELEMS.filter((k) => (p[k] || 0) >= 1.5 * NUM).join('+');
}

// regular enemies carrying an element, by dungeon (0-2; 3 = the approach to Varek): chance, then the chance of a
// second and third element. Rising so resistances matter more and more: half in the first dungeon, most in the
// second (some with two), every enemy in the third (often two, sometimes three). Rows past 3 are for later.
export const ELEM_CHANCE = [
  { p: 0.5, two: 0, three: 0 },
  { p: 0.8, two: 0.33, three: 0 },
  { p: 1, two: 0.45, three: 0.1 },
  { p: 1, two: 0.45, three: 0.1 },
  { p: 0.62, two: 0.35, three: 0.08 },
  { p: 0.72, two: 0.45, three: 0.15 },
  { p: 0.82, two: 0.5, three: 0.22 },
  { p: 0.9, two: 0.55, three: 0.3 },
];
// elemental damage added on top of a hit (share of the hit), by how many elements: a bit more from the third
// dungeon on
const SHARE = [0, 0.2, 0.12, 0.09], SHARE_DEEP = [0, 0.3, 0.18, 0.13];
export function rollElems(tier, r) {
  const c = ELEM_CHANCE[Math.min(tier, ELEM_CHANCE.length - 1)];
  if (r() >= c.p) return null;
  const n = r() < c.three ? 3 : r() < c.two ? 2 : 1;
  const pool = [...ELEMS], out = {}, share = tier >= 2 ? SHARE_DEEP : SHARE;
  for (let i = 0; i < n; i++) out[pool.splice(Math.floor(r() * pool.length), 1)[0]] = share[n];
  return addedElems(out);
}
