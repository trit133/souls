// Meta-progression rules: gold, cash-out multipliers, enemy tiers, permanent upgrades.

export const GOLD_PER_ENEMY = 1;
export const MINI_GOLD = [2, 3, 4]; // by order of mini boss kills
export const BOSS_GOLD = 7;

// Cash-out multiplier by mini bosses felled (0 = can't cash out). Beating Varek pays WIN_MULT.
export const CASHOUT_MULT = [0, 1, 1.5, 2];
export const WIN_MULT = 3;
export const payout = (gold, mult) => Math.ceil(gold * mult);

// Each mini boss passed: enemies gain +10% health, damage, move and attack speed.
export const tierScale = (tier) => 1 + 0.1 * tier;
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
  { key: 'evo_knight', section: 'Evolutions', name: 'Spectral Shield', costs: [EVOLUTION_COST], desc: 'Knight: a white shield wall that stops enemies and shots' },
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
