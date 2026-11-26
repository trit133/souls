// The Bazaar's traders (bazaar.js draws them): who they are, what they deal in, their prices, stock, levels, quest
// lines and the buff each gives at level 5. Everything lives on the account (d.bazaar), shared by every character.
//
// Prices: a trader sells at `markup` times an item's worth (items.js itemValue) and buys from you at a share of its
// worth that climbs with his level (BUY_RATE). His stock of each item is limited and refills to its level's limit
// after every raid (main.js commitLoot -> restockAll). Quests pay experience, gold and emeralds; experience levels him
// up (LEVEL_XP); at level 5 his buff is yours for good (bazaarPerks: used by player.js).
import { ITEMS, TIERS, itemValue, tierOf } from './items.js';

export const MAX_LEVEL = 5;
export const LEVEL_XP = [0, 100, 250, 450, 700]; // experience needed for levels 1..5
export const BUY_RATE = [0.2, 0.35, 0.5, 0.65, 0.8]; // what he pays you, a share of the item's worth, at levels 1..5

// quest kinds: hunt (kill `n` of enemy `type`, your own kills, while it's the active quest), supply (have `items` in
// your stash: handed over when you claim), recover (find relic `relic` hidden in raid area `area`: it goes to your
// stash when you pick it up, even if you fall, and is handed over when you claim)
export const TRADERS = [
  {
    id: 'grist', name: 'Mother Grist', title: 'Rag-and-bone crone',
    blurb: 'Buys anything that can be scraped, sewn or melted down. Sells it back to you dearer.',
    unlocked: (d) => !!d?.gems?.gem_hask, lockText: 'Beat Executor Hask',
    region: 'r1', rarities: ['common', 'uncommon'], markup: 3,
    stock: { common: [6, 8, 10, 13, 16], uncommon: [3, 4, 5, 7, 9] },
    perk: { hp: 300, name: "Grist's Tonic", desc: '+300 base health for every character' },
    quests: [
      { kind: 'hunt', type: 'grunt', n: 10, xp: 50, gold: 720, em: 2, title: 'Rags off the Zealots', say: 'Them Zealots wear good cloth under all that blood. Bring me down ten of them, dearie.' },
      { kind: 'supply', items: { scrap_iron: 8 }, xp: 50, gold: 600, em: 2, title: 'Iron for the Pot', say: 'Eight lumps of scrap iron. The pot won\'t mend itself.' },
      { kind: 'recover', relic: 'grist_ledger', area: 'r1a1', xp: 80, gold: 1200, em: 4, title: 'The Lost Ledger', say: 'My ledger! Dropped it in Ashfall Ward when the bells went. Every debt in the March is in there.' },
      { kind: 'hunt', type: 'archer', n: 6, xp: 60, gold: 900, em: 3, title: 'Needles and Thread', say: 'Six Needle Gunners. I want their goggles. Don\'t ask.' },
      { kind: 'supply', items: { ash_rag: 6, copper_coil: 4 }, xp: 70, gold: 1080, em: 3, title: 'A Warm Coat', say: 'Six ash rags and four copper coils. Winter\'s coming and I\'ve a coat in mind.' },
      { kind: 'hunt', type: 'spear', n: 8, xp: 70, gold: 1080, em: 3, title: 'Pikes for Pennies', say: 'Eight Pike Zealots. Their prongs fetch a price on the lower decks.' },
      { kind: 'recover', relic: 'grist_coil', area: 'r1a1', xp: 90, gold: 1440, em: 5, title: 'A Skull\'s Memory', say: 'There\'s a servo-skull\'s memory coil down in the Ward. It remembers my husband. Fetch it.' },
      { kind: 'supply', items: { promethium_residue: 5, cracked_lens: 5 }, xp: 80, gold: 1320, em: 4, title: 'Lamp Oil and Glass', say: 'Five promethium residue, five cracked lenses. I\'m making lamps. Pretty ones.' },
      { kind: 'hunt', type: 'brute', n: 2, xp: 90, gold: 1800, em: 5, title: 'Big Iron', say: 'Two War Servitors. Bring \'em down and I\'ll strip them myself.' },
      { kind: 'recover', relic: 'grist_bone', area: 'r1a2', xp: 120, gold: 2400, em: 8, title: 'The Saint\'s Finger', say: 'Down the Sump Lines there\'s a saint\'s finger-bone in a rusted case. Bring it, and Mother Grist\'s tonic is yours.' },
    ],
  },
  {
    id: 'vesk', name: 'Brother Vesk', title: 'Reliquary dealer',
    blurb: 'Deals only in the rare and the holy, behind iron bars, at prices to match.',
    unlocked: (d) => (d?.raids?.r1f || 0) > 0 || !!d?.traderKeys?.vesk, lockText: 'Beat Archon Varek', // (traderKeys: opened by hand, joeandre)
    region: 'r1', rarities: ['rare', 'epic', 'legendary'], markup: 2.5, gems: true, // (and he buys the mini bosses' gems: you can carry more than one)
    stock: { rare: [2, 3, 3, 4, 5], epic: [1, 1, 2, 2, 3], legendary: [0, 0, 1, 1, 1] },
    perk: { flasks: 1, name: 'Vesk\'s Vial', desc: 'One more injector for every character' },
    quests: [
      { kind: 'hunt', type: 'wretch', n: 12, xp: 60, gold: 1800, em: 4, title: 'Sump Penance', say: 'The wretches of the Sump Lines defile the old pipes. Twelve of them. Quietly.' },
      { kind: 'supply', items: { servo_motor: 4 }, xp: 60, gold: 1800, em: 4, title: 'The Moving Parts', say: 'Four servo motors. The reliquaries must turn to face the faithful.' },
      { kind: 'recover', relic: 'vesk_slate', area: 'r1a2', xp: 80, gold: 2400, em: 6, title: 'The Sealed Slate', say: 'A sealed data-slate lies somewhere in the Sump Lines. Do not read it. Bring it.' },
      { kind: 'hunt', type: 'hulk', n: 3, xp: 70, gold: 2700, em: 6, title: 'Bilge and Ballast', say: 'Three Bilge Hulks. Their furnaces burn relics for fuel. End them.' },
      { kind: 'supply', items: { purity_seal: 3, servo_motor: 2 }, xp: 70, gold: 2700, em: 6, title: 'Seals of Office', say: 'Three purity seals and two servo motors. The case must be sealed properly this time.' },
      { kind: 'hunt', type: 'flagellant', n: 10, xp: 70, gold: 2700, em: 6, title: 'The Whipping Choir', say: 'Ten Flagellants. Their faith is loud and wrong.' },
      { kind: 'recover', relic: 'vesk_icon', area: 'r1a3', xp: 90, gold: 3600, em: 8, title: 'An Icon of Orsk', say: 'Saint Orsk\'s little iron icon is still up in his Spire. I will have it.' },
      { kind: 'hunt', type: 'augur', n: 6, xp: 80, gold: 3300, em: 7, title: 'Blind the Augurs', say: 'Six Augurs. They see too far ahead, and they have seen me.' },
      { kind: 'supply', items: { augury_shard: 2 }, xp: 90, gold: 4200, em: 9, title: 'Glimpses', say: 'Two augury shards. Unwrapped. Do not look into them.' },
      { kind: 'hunt', type: 'bellwarden', n: 2, xp: 120, gold: 6000, em: 12, title: 'Silence the Bells', say: 'Two Bell-Wardens. When the bells stop, my vial is yours.' },
    ],
  },
];
// the Sunless Deep's two (region 2): Old Kettle after the Lamp-King, Mama Sorrow after the Kilnfather. They deal
// only in the Deep's own materials (and Sorrow in its gems); their quests pay a third more than the March's
TRADERS.push(
  {
    id: 'kettle', name: 'Old Kettle', title: 'Half-servitor tinker',
    blurb: 'More brass than man these days. Mends anything, buys anything that came up out of the dark, and hums while he works.',
    unlocked: (d) => !!d?.gems?.gem_lampking || !!d?.traderKeys?.kettle, lockText: 'Beat the Lamp-King',
    region: 'r2', rarities: ['common', 'uncommon'], markup: 3,
    stock: { common: [6, 8, 10, 13, 16], uncommon: [3, 4, 5, 7, 9] },
    perk: { hp: 400, name: 'Kettle\'s Plating', desc: '+400 base health for every character' },
    quests: [
      { kind: 'hunt', type: 'shaftrat', n: 12, xp: 50, gold: 940, em: 2, title: 'Rats in the Works', say: 'Shaft Rats in my pipes again. Twelve of them, if you please. Mind the picks.' },
      { kind: 'supply', items: { ore_chunk: 8 }, xp: 50, gold: 780, em: 2, title: 'Something to Melt', say: 'Eight chunks of ore. The furnace in my chest runs cold without it.' },
      { kind: 'recover', relic: 'kettle_gauge', area: 'r2a1', xp: 80, gold: 1560, em: 4, title: 'The Lost Gauge', say: 'My pressure gauge. Left it on a ledge in Lanternhold when the lamps went out. Without it I can\'t tell when I\'m about to burst.' },
      { kind: 'hunt', type: 'rivet', n: 6, xp: 60, gold: 1170, em: 3, title: 'Borrowed Rivets', say: 'Six Rivet Gunners. Those guns were mine before they were theirs.' },
      { kind: 'supply', items: { lamp_oil: 6, rivet_spool: 3 }, xp: 70, gold: 1400, em: 3, title: 'Oil and Iron', say: 'Six cans of lamp oil and three rivet spools. A tinker needs his stock.' },
      { kind: 'hunt', type: 'creeper', n: 6, xp: 70, gold: 1560, em: 4, title: 'Lights On', say: 'Six Shaft Creepers. I\'ve not slept with the lamp off in thirty years and I\'d like to.' },
      { kind: 'supply', items: { glowcap: 5, raw_seerglass: 3 }, xp: 80, gold: 1820, em: 4, title: 'Strange Fuel', say: 'Five glowcaps and three lumps of raw seer-glass. Don\'t ask what I\'m building.' },
      { kind: 'hunt', type: 'hauler', n: 3, xp: 110, gold: 3120, em: 8, title: 'Big Iron', say: 'Three Ore Haulers. Bring them down and my plating\'s yours, the good stuff.' },
    ],
  },
  {
    id: 'sorrow', name: 'Mama Sorrow', title: 'Fortune-teller',
    blurb: 'Reads your future in a ball of seer-glass and charges you for it. Deals in the rarest things of the Deep, and in the gems of those who ruled it.',
    unlocked: (d) => (d?.raids?.r2f || 0) > 0 || !!d?.traderKeys?.sorrow, lockText: 'Beat the Kilnfather',
    region: 'r2', rarities: ['rare', 'epic', 'legendary'], markup: 2.5, gems: true,
    stock: { rare: [2, 3, 3, 4, 5], epic: [1, 1, 2, 2, 3], legendary: [0, 0, 1, 1, 1] },
    perk: { flasks: 1, name: 'Sorrow\'s Draught', desc: 'One more injector for every character' },
    quests: [
      { kind: 'hunt', type: 'grub', n: 15, xp: 60, gold: 2340, em: 4, title: 'Little Mouths', say: 'Fifteen Burrow Grubs. I have seen what they grow into, dearie. Better now.' },
      { kind: 'supply', items: { prism_lens: 3 }, xp: 60, gold: 2340, em: 4, title: 'A Clearer Glass', say: 'Three prism lenses. My ball has gone cloudy and the future with it.' },
      { kind: 'recover', relic: 'sorrow_mirror', area: 'r2a3', xp: 80, gold: 3120, em: 6, title: 'The Hand-Mirror', say: 'A little silver mirror, somewhere in Glasshallow. It was my mother\'s. Do not look into it on the way back.' },
      { kind: 'hunt', type: 'lancer', n: 8, xp: 70, gold: 3510, em: 6, title: 'Bent Light', say: 'Eight Prism Lancers. Their light goes round corners. So should you.' },
      { kind: 'supply', items: { borer_tooth: 3, geode_heart: 1 }, xp: 80, gold: 3900, em: 7, title: 'Teeth and Hearts', say: 'Three borer teeth and a geode heart. For a charm. A strong one.' },
      { kind: 'hunt', type: 'shade', n: 8, xp: 80, gold: 4290, em: 7, title: 'Which One Is Real', say: 'Eight Mirror Shades. The real ones. You will know them by their shadows.' },
      { kind: 'hunt', type: 'shardback', n: 3, xp: 100, gold: 5460, em: 10, title: 'Crack the Shell', say: 'Three Shardbacks. Break their glass and bring me none of it.' },
      { kind: 'supply', items: { kiln_ember: 1 }, xp: 120, gold: 7800, em: 12, title: 'The Undying Coal', say: 'One ember from the Kiln that will not go out. Then my draught is yours. I have foreseen it.' },
    ],
  },
);

// the six still to come, two a region (its first mini boss, then its master): their looks and stalls are in the
// Bazaar already (bazaar.js), greyed out; what they trade, their quests and their buffs come with their regions
const FUTURE = [
  ['krell', 'Sergeant Krell', 'Veteran gun-runner', 'Beat the first warden of The Forge Reaches'],
  ['tobias', 'Fat Tobias', 'Street cook', 'Beat the master of The Forge Reaches'],
  ['pip', 'Pip the Rat-King', 'Scavenger child', 'Beat the first warden of The Drowned Choir'],
  ['kessa', 'Kessa', 'Smuggler', 'Beat the master of The Drowned Choir'],
  ['ostrava', 'Lady Ostrava', 'Fallen noble', 'Beat the first warden of The Seat of Augury'],
  ['pilgrim', 'The Pilgrim', 'Silent wanderer', 'Beat the master of The Seat of Augury'],
];
for (const [id, name, title, lockText] of FUTURE) TRADERS.push({ id, name, title, lockText, future: true, unlocked: () => false, blurb: '', rarities: [], markup: 1, stock: {}, perk: { name: '', desc: '' }, quests: [] });
export const BOOTHS = TRADERS.length; // the Bazaar's stalls, one a trader

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
  for (const [id, it] of Object.entries(ITEMS)) if (it.kind === 'mat' && it.region === (T.region || 'r1') && T.rarities.includes(it.rarity)) out[id] = T.stock[it.rarity][level - 1];
  return out;
}
export const sellPrice = (T, id) => Math.round(itemValue(id) * T.markup);           // what he charges you
export const buyPrice = (T, id, level) => Math.max(1, Math.round(itemValue(id) * BUY_RATE[level - 1])); // what he pays you
export const dealsIn = (T, id) => (ITEMS[id]?.kind === 'mat' || (ITEMS[id]?.kind === 'gem' && T.gems)) && ITEMS[id].region === (T.region || 'r1') && T.rarities.includes(ITEMS[id].rarity); // (each trader only his own region's)
// where an item is kept: a gem with the gems (d.gems: how many of each you carry), anything else in the stash
export const bagOf = (d, id) => (ITEMS[id]?.kind === 'gem' ? (d.gems ||= {}) : (d.items ||= {}));

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
  const bag = bagOf(d, id), have = bag[id] || 0; n = Math.min(n, have);
  if (n <= 0) return 0;
  const s = traderState(d, T.id), got = buyPrice(T, id, levelOf(s.xp)) * n;
  bag[id] -= n; d.gold += got;
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

export const RARITY_ORDER = (a, b) => tierOf(a) - tierOf(b);
