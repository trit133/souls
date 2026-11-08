// Five damage types. Every hit is split into physical, fire, bleed, poison and frost parts; the total comes off
// the health bar, and only the elemental parts build status (bleed damage builds bleed, and so on).
// Players: the weapon is physical; skill-tree nodes add flat and % damage per type, Infusions add a share of
// each hit's physical damage as their element. Enemies: an `elems` share of their hit is elemental (taken out
// of the physical, so the total stays the same). On players, armour (Knight) cuts physical damage, and each 1%
// of an element's resistance cuts its build-up by 1% and its damage by 0.5%.
export const TYPES = ['phys', 'fire', 'bleed', 'poison', 'frost'];
export const ELEMS = ['bleed', 'fire', 'frost', 'poison'];
export const TYPE_NAME = { phys: 'Physical', fire: 'Fire', bleed: 'Bleed', poison: 'Poison', frost: 'Frost' };
export const TYPE_COLOR = { phys: '#ffffff', fire: '#ff8a2a', bleed: '#e8343c', poison: '#8ad848', frost: '#9ad8ff' };

export const BUILD_PER_DMG = 3.5; // a player's melee: status build-up per point of elemental damage
export const SPELL_BUILD = 1.5; // spells are all one element, so they build less per point
export const ENEMY_BUILD = 4; // enemies' hits on players
export const RES_CAP = 50, ARMOR_CAP = 20;

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

// an enemy's hit: total damage split by its element shares
export function enemyParts(dmg, elems) {
  const out = {};
  let rest = 1;
  for (const [k, s] of Object.entries(elems || {})) { out[k] = dmg * s; rest -= s; }
  out.phys = dmg * Math.max(0, rest);
  return out;
}

// what reaches a player after armour and resistances, and the build-up each element adds
export function mitigate(parts, tree = {}, buildMul = 1) {
  const taken = {}, build = {};
  for (const [k, v] of Object.entries(parts)) {
    if (k === 'phys') { taken.phys = v * (1 - Math.min(ARMOR_CAP, tree.armor || 0) / 100); continue; }
    const res = Math.min(RES_CAP, tree[k + 'Res'] || 0) / 100;
    taken[k] = v * (1 - res / 2);
    build[k] = v * ENEMY_BUILD * buildMul * (1 - res);
  }
  return { taken, build, total: sumParts(taken) };
}

// which elements show on the weapon: at least 1.5 of that element on a light hit
export function weaponElems(tree, statusLv, base = 15) {
  const p = playerParts(tree, statusLv, base);
  return ELEMS.filter((k) => (p[k] || 0) >= 1.5).join('+');
}

// regular enemies carrying an element, by part of the run (mini bosses passed): chance, then the chance of a
// second and third element. Rows past the first section are for the second section, still to come.
export const ELEM_CHANCE = [
  { p: 1 / 8, two: 0, three: 0 },
  { p: 1 / 6, two: 0, three: 0 },
  { p: 1 / 3, two: 0.1, three: 0 },
  { p: 1 / 2, two: 0.25, three: 0 },
  { p: 0.62, two: 0.35, three: 0.08 },
  { p: 0.72, two: 0.45, three: 0.15 },
  { p: 0.82, two: 0.5, three: 0.22 },
  { p: 0.9, two: 0.55, three: 0.3 },
];
// share of an enemy's hit that is elemental, by how many elements it has
const SHARE = [0, 0.25, 0.15, 0.11];
export function rollElems(tier, r) {
  const c = ELEM_CHANCE[Math.min(tier, ELEM_CHANCE.length - 1)];
  if (r() >= c.p) return null;
  const n = r() < c.three ? 3 : r() < c.two ? 2 : 1;
  const pool = [...ELEMS], out = {};
  for (let i = 0; i < n; i++) out[pool.splice(Math.floor(r() * pool.length), 1)[0]] = SHARE[n];
  return out;
}
