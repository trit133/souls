// The Bazaar's traders (bazaar.js draws them): who they are, what they deal in, their prices, stock, levels, quest
// lines and the buff each gives at level 5. Everything lives on the account (d.bazaar), shared by every character.
//
// Prices: a trader sells at `markup` times an item's worth (items.js itemValue) and buys from you at a share of its
// worth that climbs with his level (BUY_RATE). His stock of each item is limited and refills to its level's limit
// after every raid (main.js commitLoot -> restockAll). Quests pay experience, gold and emeralds; experience levels him
// up (LEVEL_XP); at level 5 his buff is yours for good (bazaarPerks: used by player.js).
import { ITEMS, TIERS, itemValue } from './items.js';

export const MAX_LEVEL = 5;
export const LEVEL_XP = [0, 100, 250, 450, 700]; // experience needed for levels 1..5
export const BUY_RATE = [0.2, 0.35, 0.5, 0.65, 0.8]; // what he pays you, a share of the item's worth, at levels 1..5

// quest kinds: hunt (kill `n` of enemy `type`, your own kills, while it's the active quest), supply (have `items` in
// your stash: handed over when you claim), recover (find relic `relic` hidden in raid area `area`: it goes to your
// stash when you pick it up, even if you fall, and is handed over when you claim)
export const TRADERS = [
  {
    id: 'grist', name: 'Mother Grist', title: 'Rag-and-bone crone', booth: 4,
    blurb: 'Buys anything that can be scraped, sewn or melted down. Sells it back to you dearer.',
    unlocked: (d) => !!d?.gems?.gem_hask, lockText: 'Beat Executor Hask',
    rarities: ['common', 'uncommon'], markup: 3, runes: true,
    stock: { common: [6, 8, 10, 13, 16], uncommon: [3, 4, 5, 7, 9] },
    perk: { hp: 300, name: "Grist's Tonic", desc: '+300 base health for every character' },
    quests: [
      { kind: 'hunt', type: 'grunt', n: 10, xp: 50, gold: 120, em: 2, title: 'Rags off the Zealots', say: 'Them Zealots wear good cloth under all that blood. Bring me down ten of them, dearie.' },
      { kind: 'supply', items: { scrap_iron: 8 }, xp: 50, gold: 100, em: 2, title: 'Iron for the Pot', say: 'Eight lumps of scrap iron. The pot won\'t mend itself.' },
      { kind: 'recover', relic: 'grist_ledger', area: 'r1a1', xp: 80, gold: 200, em: 4, title: 'The Lost Ledger', say: 'My ledger! Dropped it in Ashfall Ward when the bells went. Every debt in the March is in there.' },
      { kind: 'hunt', type: 'archer', n: 6, xp: 60, gold: 150, em: 3, title: 'Needles and Thread', say: 'Six Needle Gunners. I want their goggles. Don\'t ask.' },
      { kind: 'supply', items: { ash_rag: 6, copper_coil: 4 }, xp: 70, gold: 180, em: 3, title: 'A Warm Coat', say: 'Six ash rags and four copper coils. Winter\'s coming and I\'ve a coat in mind.' },
      { kind: 'hunt', type: 'spear', n: 8, xp: 70, gold: 180, em: 3, title: 'Pikes for Pennies', say: 'Eight Pike Zealots. Their prongs fetch a price on the lower decks.' },
      { kind: 'recover', relic: 'grist_coil', area: 'r1a1', xp: 90, gold: 240, em: 5, title: 'A Skull\'s Memory', say: 'There\'s a servo-skull\'s memory coil down in the Ward. It remembers my husband. Fetch it.' },
      { kind: 'supply', items: { promethium_residue: 5, cracked_lens: 5 }, xp: 80, gold: 220, em: 4, title: 'Lamp Oil and Glass', say: 'Five promethium residue, five cracked lenses. I\'m making lamps. Pretty ones.' },
      { kind: 'hunt', type: 'brute', n: 2, xp: 90, gold: 300, em: 5, title: 'Big Iron', say: 'Two War Servitors. Bring \'em down and I\'ll strip them myself.' },
      { kind: 'recover', relic: 'grist_bone', area: 'r1a2', xp: 120, gold: 400, em: 8, title: 'The Saint\'s Finger', say: 'Down the Sump Lines there\'s a saint\'s finger-bone in a rusted case. Bring it, and Mother Grist\'s tonic is yours.' },
    ],
  },
  {
    id: 'vesk', name: 'Brother Vesk', title: 'Reliquary dealer', booth: 5,
    blurb: 'Deals only in the rare and the holy, behind iron bars, at prices to match.',
    unlocked: (d) => (d?.raids?.r1f || 0) > 0, lockText: 'Beat Archon Varek',
    rarities: ['rare', 'epic', 'legendary'], markup: 2.5,
    stock: { rare: [2, 3, 3, 4, 5], epic: [1, 1, 2, 2, 3], legendary: [0, 0, 1, 1, 1] },
    perk: { flasks: 1, name: 'Vesk\'s Vial', desc: 'One more injector for every character' },
    quests: [
      { kind: 'hunt', type: 'wretch', n: 12, xp: 60, gold: 300, em: 4, title: 'Sump Penance', say: 'The wretches of the Sump Lines defile the old pipes. Twelve of them. Quietly.' },
      { kind: 'supply', items: { servo_motor: 4 }, xp: 60, gold: 300, em: 4, title: 'The Moving Parts', say: 'Four servo motors. The reliquaries must turn to face the faithful.' },
      { kind: 'recover', relic: 'vesk_slate', area: 'r1a2', xp: 80, gold: 400, em: 6, title: 'The Sealed Slate', say: 'A sealed data-slate lies somewhere in the Sump Lines. Do not read it. Bring it.' },
      { kind: 'hunt', type: 'hulk', n: 3, xp: 70, gold: 450, em: 6, title: 'Bilge and Ballast', say: 'Three Bilge Hulks. Their furnaces burn relics for fuel. End them.' },
      { kind: 'supply', items: { purity_seal: 3, servo_motor: 2 }, xp: 70, gold: 450, em: 6, title: 'Seals of Office', say: 'Three purity seals and two servo motors. The case must be sealed properly this time.' },
      { kind: 'hunt', type: 'flagellant', n: 10, xp: 70, gold: 450, em: 6, title: 'The Whipping Choir', say: 'Ten Flagellants. Their faith is loud and wrong.' },
      { kind: 'recover', relic: 'vesk_icon', area: 'r1a3', xp: 90, gold: 600, em: 8, title: 'An Icon of Orsk', say: 'Saint Orsk\'s little iron icon is still up in his Spire. I will have it.' },
      { kind: 'hunt', type: 'augur', n: 6, xp: 80, gold: 550, em: 7, title: 'Blind the Augurs', say: 'Six Augurs. They see too far ahead, and they have seen me.' },
      { kind: 'supply', items: { augury_shard: 2 }, xp: 90, gold: 700, em: 9, title: 'Glimpses', say: 'Two augury shards. Unwrapped. Do not look into them.' },
      { kind: 'hunt', type: 'bellwarden', n: 2, xp: 120, gold: 1000, em: 12, title: 'Silence the Bells', say: 'Two Bell-Wardens. When the bells stop, my vial is yours.' },
    ],
  },
];
export const BOOTHS = 10; // the Bazaar's stalls: the traders above, the rest shuttered until they come

export const traderById = (id) => TRADERS.find((t) => t.id === id);
export const bazaarOpen = (d) => TRADERS[0].unlocked(d);

// an account's state for a trader (made on first sight, with full stock)
export function traderState(d, id) {
  d.bazaar ||= {};
  d.bazaar[id] ||= { xp: 0, q: 0, prog: 0, stock: null };
  const s = d.bazaar[id];
  if (!s.stock) s.stock = stockLimits(traderById(id), levelOf(s.xp));
  return s;
}
export function levelOf(xp) { let l = 1; while (l < MAX_LEVEL && xp >= LEVEL_XP[l]) l++; return l; }
// what's in his stock at a level: each material of his rarities, up to its limit
export function stockLimits(T, level) {
  const out = {};
  for (const [id, it] of Object.entries(ITEMS)) if (it.kind === 'mat' && T.rarities.includes(it.rarity)) out[id] = T.stock[it.rarity][level - 1];
  return out;
}
export const sellPrice = (T, id) => Math.round(itemValue(id) * T.markup);           // what he charges you
export const buyPrice = (T, id, level) => Math.max(1, Math.round(itemValue(id) * BUY_RATE[level - 1])); // what he pays you
export const dealsIn = (T, id) => ITEMS[id]?.kind === 'mat' && T.rarities.includes(ITEMS[id].rarity);

// after every raid: each open trader's stock back to its limit
export function restockAll(d) {
  for (const T of TRADERS) if (T.unlocked(d)) { const s = traderState(d, T.id); s.stock = stockLimits(T, levelOf(s.xp)); }
}

export function buy(d, T, id) {
  const s = traderState(d, T.id), price = sellPrice(T, id);
  if (!(s.stock[id] > 0) || d.gold < price) return false;
  d.gold -= price; s.stock[id]--; d.items ||= {}; d.items[id] = (d.items[id] || 0) + 1;
  return true;
}
export function sell(d, T, id, n = 1) {
  if (!dealsIn(T, id)) return 0;
  const have = d.items?.[id] || 0; n = Math.min(n, have);
  if (n <= 0) return 0;
  const s = traderState(d, T.id), got = buyPrice(T, id, levelOf(s.xp)) * n;
  d.items[id] -= n; d.gold += got;
  return got;
}

// ---------- quests ----------
export const currentQuest = (d, T) => T.quests[traderState(d, T.id).q] || null;
// how far along the current quest is: [have, need] and whether it can be claimed
export function questProgress(d, T) {
  const Q = currentQuest(d, T), s = traderState(d, T.id);
  if (!Q) return null;
  if (Q.kind === 'hunt') return { have: Math.min(s.prog, Q.n), need: Q.n, ready: s.prog >= Q.n };
  if (Q.kind === 'supply') {
    const parts = Object.entries(Q.items).map(([id, n]) => ({ id, have: Math.min(d.items?.[id] || 0, n), need: n }));
    return { parts, ready: parts.every((p) => p.have >= p.need) };
  }
  const have = (d.items?.[Q.relic] || 0) > 0;
  return { have: have ? 1 : 0, need: 1, ready: have };
}
export const claimable = (d, T) => T.unlocked(d) && !!questProgress(d, T)?.ready;
export const anyClaimable = (d) => !!d && bazaarOpen(d) && TRADERS.some((T) => claimable(d, T));

// a kill of yours (main.js creditKill, or the host telling you about yours in a party)
export function noteKill(d, type) {
  if (!d || !bazaarOpen(d)) return null;
  let done = null;
  for (const T of TRADERS) {
    if (!T.unlocked(d)) continue;
    const Q = currentQuest(d, T), s = traderState(d, T.id);
    if (Q?.kind === 'hunt' && Q.type === type && s.prog < Q.n) { s.prog++; if (s.prog >= Q.n) done = T; }
  }
  return done; // (a trader whose hunt just finished: worth a toast)
}

// hand the quest in: its items or relic go to him, its rewards to you; returns what you got (or null)
export function claim(d, T) {
  if (!claimable(d, T)) return null;
  const Q = currentQuest(d, T), s = traderState(d, T.id), before = levelOf(s.xp);
  if (Q.kind === 'supply') for (const [id, n] of Object.entries(Q.items)) d.items[id] -= n;
  if (Q.kind === 'recover') d.items[Q.relic] -= 1;
  s.xp += Q.xp; s.q++; s.prog = 0;
  d.gold += Q.gold;
  const level = levelOf(s.xp);
  if (level > before) { const top = stockLimits(T, level); for (const id in top) s.stock[id] = Math.max(s.stock[id] || 0, top[id]); } // (a bigger shelf at once)
  return { quest: Q, gold: Q.gold, em: Q.em, xp: Q.xp, levelUp: level > before ? level : 0 };
}

// the relics hidden in an area for this account's active recover quests (main.js places them in a raid)
export function relicsWanted(d, area) {
  if (!d || !bazaarOpen(d)) return [];
  return TRADERS.filter((T) => T.unlocked(d)).map((T) => currentQuest(d, T))
    .filter((Q) => Q?.kind === 'recover' && Q.area === area && !(d.items?.[Q.relic] > 0)).map((Q) => Q.relic);
}

// the level-5 buffs, for every character (player.js)
export function bazaarPerks(d) {
  const out = { hp: 0, flasks: 0, names: [] };
  if (!d?.bazaar) return out;
  for (const T of TRADERS) if (d.bazaar[T.id] && levelOf(d.bazaar[T.id].xp) >= MAX_LEVEL) { out.hp += T.perk.hp || 0; out.flasks += T.perk.flasks || 0; out.names.push(T.perk.name); }
  return out;
}

export const RARITY_ORDER = (a, b) => TIERS.indexOf(ITEMS[a].rarity) - TIERS.indexOf(ITEMS[b].rarity);
