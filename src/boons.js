import { STATUS, STATUS_KEYS } from './status.js';

// Power-ups offered after each mini boss. All stack; levels track repeat picks.
export const BOONS = {
  vigor: { name: 'Vigor', tag: '+HP', color: '#c84a3a', desc: () => '+25 max health (and heals 25).', apply: (p) => { p.maxHp += 25; p.hp = Math.min(p.maxHp, p.hp + 25); } },
  endurance: { name: 'Endurance', tag: '+STA', color: '#4f9a4a', desc: () => '+15 max stamina.', apply: (p) => { p.maxSt += 15; p.st = Math.min(p.maxSt, p.st + 15); } },
  might: { name: 'Might', tag: 'DMG', color: '#d8b04a', desc: () => '+15% damage on every attack.', apply: (p) => { p.dmgMul += 0.15; } },
  evasion: { name: 'Fleetfoot', tag: 'ROLL', color: '#9ab0c8', desc: () => '+15% roll and backstep distance.', apply: (p) => { p.rollMul += 0.15; } },
  haste: { name: 'Haste', tag: 'SPD', color: '#e0e0e0', desc: () => '+10% attack speed.', apply: (p) => { p.aspdMul += 0.1; } },
};
for (const k of STATUS_KEYS) {
  BOONS[k] = {
    name: STATUS[k].name + ' Infusion', tag: STATUS[k].name.slice(0, 4).toUpperCase(), color: STATUS[k].color, status: k,
    desc: (p) => (p.statusLv[k] ? `Stronger ${STATUS[k].name.toLowerCase()} buildup (+50%). ` : '') + STATUS[k].desc,
    apply: (p) => { p.statusLv[k] = (p.statusLv[k] || 0) + 1; },
  };
}
export const BOON_KEYS = Object.keys(BOONS);

export function rollBoons(rand = Math.random, n = 3) {
  const pool = [...BOON_KEYS];
  const out = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  return out;
}
