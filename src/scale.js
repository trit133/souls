// The size of the game's numbers. Health, damage, healing amounts, flat bonuses and gold are all this many times
// what they were designed at (percentages, speeds, timings, stamina and mana are not), so everything plays the
// same with bigger numbers, ready for incremental growth. Status meters fill per point of damage divided by it.
export const NUM = 10;

// gold balances from before the numbers grew: multiplied once
export function migrateNumbers(data) {
  if (!data || data.numScale === NUM) return false;
  const k = NUM / (data.numScale || 1);
  data.gold = Math.round((data.gold || 0) * k);
  if (data.stats) data.stats.goldEarned = Math.round((data.stats.goldEarned || 0) * k);
  data.numScale = NUM;
  return true;
}
