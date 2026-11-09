// Meta-progression rules: gold, cash-out multipliers, enemy tiers, permanent upgrades.
import { NUM } from './scale.js';

// Kills pay into the room's pot, which is banked into the run when the room is cleared.
export const enemyGold = (type) => (type === 'brute' ? 3 : 1) * NUM;
// Gold comes from kills, banked the moment an enemy dies: a regular enemy is worth 15 wherever it is (a stronger
// player gets further and kills more, which is the growth), a brute twice that, an elite three times. Tuned so a run
// buys about one skill tree node (scripts/income.mjs).
export const KILL_GOLD = [1.5, 1.5, 1.5, 1.5].map((g) => g * NUM);
export const killGold = (e) => (e.effigy ? 0 : Math.round(KILL_GOLD[Math.min(3, e.tier || 0)] * (e.elite ? 3 : e.type === 'brute' ? 2 : 1)));
// In a party every kill pays everyone a share: a party fights 30% / 60% more enemies, so clearing an area leaves each
// player about what they'd earn clearing it alone (2 players 77% each, 3 players 62%)
export const partyShare = (players) => 1 / (1 + extraEnemyShare(players));
export const MINI_GOLD = [15, 20, 25].map((g) => g * NUM); // by order of mini boss kills
export const BOSS_GOLD = 30 * NUM;

// Gold is kept per section of the run (start → 1st mini, → 2nd mini, → 3rd mini, → Varek),
// and each section only ever gets its own multiplier.
export const SECTION_MULT = [1, 1.5, 2, 3];
export function sectionPayout(sections, upto) {
  let t = 0;
  for (let i = 0; i < upto; i++) t += (sections[i] || 0) * SECTION_MULT[i];
  return Math.ceil(t);
}
export const sectionBreakdown = (sections, upto) => sections.slice(0, upto).map((g, i) => `◆${g}×${SECTION_MULT[i]}`).join(' + ');

// Each mini boss passed: enemies gain +10% health, damage, move and attack speed.
export const tierScale = (tier) => 1 + 0.1 * tier;
// Regular enemies per stage (tier = mini bosses passed). Solo: +10% each stage to everything. In a party,
// health and damage climb harder (+20/40/60% health, +15/20/25% damage); speeds keep the solo steps.
export function tierStats(tier, players = 1) {
  const s = tierScale(tier);
  if (players < 2) return { hp: s, dmg: s, spd: s, atk: s };
  const t = Math.min(3, tier);
  return { hp: [1, 1.2, 1.4, 1.6][t], dmg: [1, 1.15, 1.2, 1.25][t], spd: s, atk: s };
}
export const TIER_EYES = [null, 0xff1a10, 0xff8a10, 0xffffff];

// Permanent upgrades. Each level gives `a`; levels past the third give `b`.
// `costs` = fixed price list (and level cap); otherwise 10, 15, 23, 35... `requires` =
// another upgrade key that must be owned first.
export const EVOLUTION_COST = 75;
export const SECTIONS = ['Attributes', 'Potions', 'Spellsword', 'Evolutions'];
export const UPGRADES = [
  { key: 'dmg', section: 'Attributes', name: 'Damage', a: 3, b: 4, unit: '%' },
  { key: 'hp', section: 'Attributes', name: 'Health', a: 5, b: 8, unit: '%' },
  { key: 'move', section: 'Attributes', name: 'Move Speed', a: 2, b: 4, unit: '%' },
  { key: 'aspd', section: 'Attributes', name: 'Attack Speed', a: 2, b: 4, unit: '%' },
  { key: 'st', section: 'Attributes', name: 'Stamina', a: 6, b: 8, unit: '%' },
  { key: 'flask', section: 'Potions', name: 'Extra Potion', a: 1, b: 1, unit: '', costs: [10, 20, 30] },
  { key: 'potion', section: 'Potions', name: 'Potion Strength', a: 15, b: 15, unit: '%', costs: [10, 15, 30] },
  { key: 'mage', section: 'Spellsword', name: 'Unlock Spellsword', costs: [100], desc: 'A new character: spells, fire and a knife' },
  { key: 'mana', section: 'Spellsword', name: 'Mana', a: 10, b: 15, unit: '', requires: 'mage' },
  { key: 'evo_knight', section: 'Evolutions', name: 'Shield Charge', costs: [EVOLUTION_COST], desc: 'Knight: block + heavy charges behind a spectral shield, knocking enemies back (20 s cooldown); attack right after for a leaping overhead' },
  { key: 'evo_rogue', section: 'Evolutions', name: 'Red Riposte', costs: [EVOLUTION_COST], desc: 'Rogue: +50ms parry window; instant critical after a parry' },
  { key: 'evo_mage', section: 'Evolutions', name: 'Twin Inferno', costs: [EVOLUTION_COST], desc: 'Spellsword: two larger fireballs', requires: 'mage' },
];

// 10, 15, 23, 35, 53, 80 ... (x1.5 each, rounded up), or the upgrade's fixed list
export function upgradeCost(u, level) {
  if (u.costs) return u.costs[level] ?? null;
  let c = 10;
  for (let i = 0; i < level; i++) c = Math.ceil(c * 1.5);
  return c;
}
export const isMaxed = (u, level) => !!u.costs && level >= u.costs.length;
export const stepValue = (u, level) => (level < 3 ? u.a : u.b); // value of buying level+1
export function upgradeTotal(u, level) {
  let t = 0;
  for (let i = 0; i < level; i++) t += stepValue(u, i);
  return t;
}
export const upgradeByKey = (k) => UPGRADES.find((u) => u.key === k);

// Party scaling. `big` = bosses and brutes.
export function partyScale(players, big) {
  if (players < 2) return { hp: 1, dmg: 1, atk: 1, spd: 1, gap: 1 };
  const i = players - 2;
  return big
    ? { hp: [1.75, 3][i], dmg: 1.2, atk: 1.1, spd: 1.1, gap: 0.7 }
    : { hp: [1.1, 1.13][i], dmg: [1.1, 1.12][i], atk: 1, spd: 1.1, gap: 1 };
}
export const extraEnemyShare = (players) => [0, 0, 0.3, 0.6][players] || 0;

// Bonus banked when a section's closing boss falls: the section's gold × (multiplier − 1).
export const sectionBonus = (sections, i) => Math.ceil((sections[i] || 0) * (SECTION_MULT[i] - 1));
