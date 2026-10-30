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
export const UPGRADES = [
  { key: 'dmg', name: 'Damage', a: 3, b: 4, unit: '%' },
  { key: 'hp', name: 'Health', a: 5, b: 8, unit: '%' },
  { key: 'move', name: 'Move Speed', a: 2, b: 4, unit: '%' },
  { key: 'aspd', name: 'Attack Speed', a: 2, b: 4, unit: '%' },
  { key: 'st', name: 'Stamina', a: 6, b: 8, unit: '%' },
  { key: 'mana', name: 'Mana', a: 10, b: 15, unit: '', locked: 'Locked until Spell Sword is unlocked' },
];

// 10, 15, 23, 35, 53, 80 ... (x1.5 each, rounded up)
export function upgradeCost(level) {
  let c = 10;
  for (let i = 0; i < level; i++) c = Math.ceil(c * 1.5);
  return c;
}
export const stepValue = (u, level) => (level < 3 ? u.a : u.b); // value of buying level+1
export function upgradeTotal(u, level) {
  let t = 0;
  for (let i = 0; i < level; i++) t += stepValue(u, i);
  return t;
}
export const upgradeByKey = (k) => UPGRADES.find((u) => u.key === k);
