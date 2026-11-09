// Enemy armour and resistances: the same rules as the player's (damage.js). Armour % cuts physical damage taken by
// that much (capped at 50%); each 1% of an element's resistance cuts its damage by 0.5% and its status build-up by
// 1% (capped at 75%). Every enemy rolls its own armour inside its type's range, and 1-4 resistances (bosses: their
// own pattern) inside its type's resistance range; the rolls come from the run's seed, so a party sees the same.
// Ranges climb with the tier (each dungeon of a section, +2 armour / +3 resistance) and jump at each new section
// (every 4 tiers: +6 / +9 more), so the first section stays far from the caps and later sections close in on them.
export const ARMOR_MAX = 50, RES_MAX = 75;
export const RES_ELEMS = ['fire', 'bleed', 'poison', 'frost'];

// [low, high] at tier 0
const TYPES = {
  archer: { armor: [0, 5], res: [3, 8] },
  spear: { armor: [2, 8], res: [3, 10] },
  grunt: { armor: [5, 10], res: [5, 10] },
  brute: { armor: [10, 15], res: [8, 15] },
};
const ELITE = 5; // an elite: its type's ranges, this much higher
const BOSSES = {
  hask: { armor: [8, 12], res: [6, 12] },
  vael: { armor: [4, 8], res: [6, 12] },
  gorrath: { armor: [12, 16], res: [6, 12], always: { fire: [15, 20] } }, // the forge: always a strong fire resistance
  varek: { armor: [16, 20], res: [14, 20], all: true }, // the last boss: all four
};
export const tierAdd = (tier) => ({ armor: 2 * tier + 6 * Math.floor(tier / 4), res: 3 * tier + 9 * Math.floor(tier / 4) });

const roll = (r, [a, b], add, max) => Math.min(max, Math.round(a + add + r() * (b - a)));

// { armor, res: { fire: 12, ... } } for an enemy (type, elite?, tier) or a boss (id, tier); r: the seeded random
export function rollDefenses(r, { type, elite, boss, tier = 0 }) {
  const T = boss ? BOSSES[boss] : TYPES[type];
  if (!T) return { armor: 0, res: {} };
  const add = tierAdd(tier), up = elite ? ELITE : 0;
  const armor = roll(r, T.armor, add.armor + up, ARMOR_MAX), res = {};
  let elems = [...RES_ELEMS];
  for (let i = elems.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [elems[i], elems[j]] = [elems[j], elems[i]]; }
  const n = T.all ? 4 : 1 + Math.floor(r() * 4);
  for (const k of elems.slice(0, n)) res[k] = roll(r, T.res, add.res + up, RES_MAX);
  for (const [k, range] of Object.entries(T.always || {})) res[k] = Math.max(res[k] || 0, roll(r, range, add.res, RES_MAX));
  return { armor, res };
}

// what gets through an enemy's defences: damage parts after armour and resistances, and the status build-up each
// element still adds (fraction of the unmitigated part)
export function enemyMitigate(parts, def) {
  if (!def) return { parts, build: parts };
  const out = {}, build = {};
  for (const [k, v] of Object.entries(parts)) {
    if (k === 'phys') { out.phys = v * (1 - Math.min(ARMOR_MAX, def.armor || 0) / 100); continue; }
    const res = Math.min(RES_MAX, def.res?.[k] || 0) / 100;
    out[k] = v * (1 - res / 2);
    build[k] = v * (1 - res);
  }
  return { parts: out, build };
}
