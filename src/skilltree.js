// Per-character skill trees (replacing the old upgrade shop). Travel nodes run out from the start along spokes and
// two rings; you pick what each gives (Strength: health, Dexterity: stamina, Intelligence: mana; or on a resistance
// node, an element). Off the paths hang clusters: small nodes of one theme round a notable, much stronger further out.
// A keystone ends a spoke in each region; the evolution sits 6 links out (with three more still to come); three rune
// sockets sit on ring 10. Centre nodes get steeply dearer the more of them you own. A node can be bought when it
// touches one you own.
import { NUM } from './scale.js';
import { UPGRADES, upgradeCost } from './progress.js';
import { LAYOUT } from './treelayout.js';
import { COST_V5 } from './treecost-v5.js';
import { COST_V6 } from './treecost-v6.js';
import { COST_V7T } from './treecost-v7.js';

// ---------- what nodes can give ----------
// fmt: how a value reads in the tooltip
export const STATS = {
  hp: { name: 'Health', fmt: (v) => `+${v} health`, icon: 'hp' },
  st: { name: 'Stamina', fmt: (v) => `+${v} stamina`, icon: 'st' },
  hpPct: { name: 'Vitality', fmt: (v) => `+${v}% health`, icon: 'hp' },
  stPct: { name: 'Endurance', fmt: (v) => `+${v}% stamina`, icon: 'st' },
  move: { name: 'Swiftness', fmt: (v) => `+${v}% move speed`, icon: 'move' },
  aspd: { name: 'Quickness', fmt: (v) => `+${v}% attack speed`, icon: 'aspd' },
  potion: { name: 'Stim Synthesis', fmt: (v) => `+${v}% injector healing`, icon: 'potion' },
  flask: { name: 'Spare Injector', fmt: (v) => `+${v} injector`, icon: 'flask' },
  // knight
  armor: { name: 'Armour', fmt: (v) => `+${v}% armour (less physical damage taken)`, icon: 'dr' },
  blockDrain: { name: 'Steady Guard', fmt: (v) => `${v}% less stamina drain while blocking`, icon: 'blockDrain' },
  chip: { name: 'Tempered Shield', fmt: (v) => `${v} points less damage through the shield (of 25)`, icon: 'chip' },
  stun: { name: 'Crushing Blows', fmt: (v) => `+${v}% stun buildup`, icon: 'stun' },
  counter: { name: 'Riposte Edge', fmt: (v) => `+${v}% guard counter damage`, icon: 'counter' },
  chargeCd: { name: 'Relentless', fmt: (v) => `Shield Charge cooldown −${v}s`, icon: 'chargeCd' },
  chargeKb: { name: 'Battering Ram', fmt: (v) => `+${v}% Shield Charge knockback`, icon: 'chargeKb' },
  // rogue
  parryCd: { name: 'Quick Hands', fmt: (v) => `Parry cooldown −${v}s`, icon: 'parryCd' },
  ripDmg: { name: 'Cruelty', fmt: (v) => `+${v}% riposte and finisher damage`, icon: 'critDmg' },
  iframe: { name: 'Shadowstep', fmt: (v) => `+${v}s roll invincibility`, icon: 'iframe' },
  atkCost: { name: 'Light Blades', fmt: (v) => `Attacks cost ${v}% less stamina`, icon: 'atkCost' },

  parryWin: { name: 'Keen Eye', fmt: (v) => `+${v}ms parry window`, icon: 'parryWin' },
  rollCost: { name: 'Nimble', fmt: (v) => `Rolls cost ${v}% less stamina`, icon: 'rollCost' },
  // spellsword
  mana: { name: 'Deep Well', fmt: (v) => `+${v} max mana`, icon: 'mana' },
  manaHit: { name: 'Siphon', fmt: (v) => `+${v} mana per knife hit`, icon: 'manaHit' },
  boltCost: { name: 'Thrift', fmt: (v) => `Bolt costs ${v} less mana`, icon: 'boltCost' },
  fireCost: { name: 'Kindling', fmt: (v) => `Fireball costs ${v} less mana`, icon: 'fireCost' },
  spellDmg: { name: 'Arcana', fmt: (v) => `+${v}% spell damage`, icon: 'spellDmg' },
  fireRadius: { name: 'Conflagration', fmt: (v) => `+${v}% fireball blast radius`, icon: 'fireRadius' },
  knifeDmg: { name: 'Spellblade', fmt: (v) => `+${v}% knife damage`, icon: 'knifeDmg' },
  // critical hits (any class): a crit does +50% damage plus the crit damage bonus
  critChance: { name: 'Precision', fmt: (v) => `+${v}% critical hit chance`, icon: 'critChance' },
  critPower: { name: 'Ferocity', fmt: (v) => `+${v}% critical damage`, icon: 'critPower' },
  // damage by type (status build-up comes from elemental damage)
  physDmg: { name: 'Brutality', fmt: (v) => `+${v} physical damage per hit`, icon: 'dmg' },
  physPct: { name: 'Heft', fmt: (v) => `+${v}% physical damage`, icon: 'dmg' },
  fireDmg: { name: 'Ember Edge', fmt: (v) => `+${v} fire damage per hit`, icon: 'fire' },
  firePct: { name: 'Kindle', fmt: (v) => `+${v}% fire damage`, icon: 'fire' },
  bleedDmg: { name: 'Serrated', fmt: (v) => `+${v} bleed damage per hit`, icon: 'bleed' },
  bleedPct: { name: 'Hemorrhage', fmt: (v) => `+${v}% bleed damage`, icon: 'bleed' },
  poisonDmg: { name: 'Toxin', fmt: (v) => `+${v} poison damage per hit`, icon: 'poison' },
  poisonPct: { name: 'Venom', fmt: (v) => `+${v}% poison damage`, icon: 'poison' },
  frostDmg: { name: 'Chill', fmt: (v) => `+${v} frost damage per hit`, icon: 'frost' },
  frostPct: { name: 'Rime', fmt: (v) => `+${v}% frost damage`, icon: 'frost' },
  // resistances: each 1% cuts that element's damage and its build-up on you by 1% (75%: a quarter gets through)
  fireRes: { name: 'Fireproof', fmt: (v) => `+${v}% fire resistance`, icon: 'resFire', res: true },
  bleedRes: { name: 'Clotting', fmt: (v) => `+${v}% bleed resistance`, icon: 'resBleed', res: true },
  poisonRes: { name: 'Antidote', fmt: (v) => `+${v}% poison resistance`, icon: 'resPoison', res: true },
  frostRes: { name: 'Warmth', fmt: (v) => `+${v}% frost resistance`, icon: 'resFrost', res: true },
  // the Knight's notables (mechanics) and keystones
  counterSt: { name: 'Riposte Master', fmt: (v) => `Guard counters give back ${v} stamina`, icon: 'counter' },
  execute: { name: "Executioner's Mark", fmt: (v) => `+${v}% damage to enemies under 30% health`, icon: 'dmg' },
  lowHpDmg: { name: 'Last Stand', fmt: (v) => `+${v}% damage while you're under half health`, icon: 'dmg' },
  finisherPct: { name: 'Crowning Blow', fmt: (v) => `+${v}% damage with combo finishers`, icon: 'dmg' },
  burnDmg: { name: 'Pyre', fmt: (v) => `+${v}% damage to burning enemies`, icon: 'fire' },
  killHeal: { name: 'Second Wind', fmt: (v) => `Heal ${v}% of your health on each kill`, icon: 'hp' },
  immovable: { name: 'Immovable', fmt: () => 'You can\'t be staggered or knocked down; rolls cost 50% more stamina', icon: 'dr' },
  headsman: { name: 'Headsman', fmt: () => 'Heavy attacks and finishers +40% damage; light attacks −20%', icon: 'dmg' },
  emberOath: { name: 'Ember Oath', fmt: () => 'Half your physical damage becomes fire; you take 15% more damage', icon: 'fire' },
  stalwart: { name: 'Stalwart Vow', fmt: () => '+30% max health; −15% damage dealt', icon: 'hp' },
  // the Rogue's and Spellsword's
  bleedTgt: { name: 'Exsanguinate', fmt: (v) => `+${v}% damage to enemies whose bleed is half built or more`, icon: 'bleed' },
  poisonedDmg: { name: 'Wither', fmt: (v) => `+${v}% damage to poisoned enemies`, icon: 'poison' },
  frozenDmg: { name: 'Shatterpoint', fmt: (v) => `+${v}% damage to enemies slowed by frost`, icon: 'frost' },
  fleeting: { name: 'Fleeting', fmt: () => 'Rolls cost half the stamina; you take 15% more damage', icon: 'rollCost' },
  glassFang: { name: 'Glass Fang', fmt: () => 'Ripostes and finishers +40% damage; −25% max health', icon: 'critDmg' },
  plague: { name: 'Plaguelord', fmt: () => 'Poison damage +50%; physical damage −20%', icon: 'poison' },
  bladeDance: { name: 'Blade Dance', fmt: () => '+25% attack speed; −20% damage per hit', icon: 'aspd' },
  pyromania: { name: 'Pyromania', fmt: () => 'Fire damage +40%; you take 15% more from fire', icon: 'fire' },
  rimeHeart: { name: 'Rime Heart', fmt: () => 'Frost damage +40%; fire damage halved', icon: 'frost' },
  spellblade: { name: 'Spellblade', fmt: () => 'Spell damage +30%; knife damage −20%', icon: 'spellDmg' },
};

// limits so a full tree stays fair
export const CAPS = { bleedTgt: 60, poisonedDmg: 60, frozenDmg: 60, counterSt: 30, execute: 60, lowHpDmg: 60, finisherPct: 60, burnDmg: 60, killHeal: 6, armor: 60, physPct: 50, firePct: 125, bleedPct: 125, poisonPct: 125, frostPct: 125, fireRes: 75, bleedRes: 75, poisonRes: 75, frostRes: 75, blockDrain: 50, chip: 12, parryCd: 5, boltCost: 4, fireCost: 20, iframe: 0.08, atkCost: 25, rollCost: 30,
  parryWin: 4, potion: 40, ripDmg: 30, critChance: 75, critPower: 100, counter: 35, chargeCd: 6, stun: 25, spellDmg: 20, knifeDmg: 20, fireRadius: 30 };

export const EVOS = {
  knight: { key: 'evo_knight', name: 'Aegis Ram', desc: 'Block + heavy charges behind an electromagnetic barrier, knocking enemies back (20 s cooldown); attack right after it for a leaping overhead.' },
  rogue: { key: 'evo_rogue', name: 'Red Riposte', desc: 'Parry window +50 ms, a 5 s parry cooldown, and a parry blinks you behind the enemy for an instant backstab.' },
  mage: { key: 'evo_mage', name: 'Twin Plasma', desc: 'Your plasma charge splits into two larger plasma charges.' },
};

// ---------- travel nodes ----------
// Blank until bought; then you pick what each gives (and can change it any time). Strength, Dexterity or Intelligence
// (Intelligence feeds mana, which only the Adept uses for now), or on a resistance travel node one element.
export const TRAVEL = { str: { hp: 3 * NUM }, dex: { st: 4 }, int: { mana: 6 } };
export const TRAVEL_NAME = { str: 'Strength', dex: 'Dexterity', int: 'Intelligence' };
export const RES_PICKS = ['fire', 'frost', 'bleed', 'poison'];
export const RES_PICK = 10; // a resistance travel node: +10% to the element picked (20 of them: 50% to all four)
const RES_TRAVEL = 20;
// what a travel node gives with its pick (unpicked: Strength, or Fire on a resistance node)
export const travelGive = (n, pick) => (n.res ? { [(RES_PICKS.includes(pick) ? pick : 'fire') + 'Res']: RES_PICK } : { ...TRAVEL[TRAVEL[pick] ? pick : 'str'] });

// ---------- the tree's shape ----------
// Travel nodes run out from the start along spokes, round an inner ring (ring 4) and round the socket ring (ring 10).
// Off them hang clusters: a notable in the middle ringed by small nodes of one theme; the entry is the small node
// nearest the path and the notable sits across from it. Clusters get much stronger the further out they are.
// Built once by scripts/gen-trees.mjs (positions, links and stats) and loaded from treelayout.js.
export const TOTAL = 280;
export const RING = 12; // distance between rings in tree units
export const RINGS = 22;
export const EVO_RING = 6, SOCKET_RING = 10, SOCKET_GAP = 3, CENTRE = 4;
const SHAPES = {
  knight: { spokes: 4, lens: [20, 20, 20, 20], twist: 0 },
  rogue: { spokes: 6, lens: [18, 12, 18, 12, 18, 12], twist: 0.09 },
  mage: { spokes: 5, lens: [17, 17, 17, 17, 17], twist: 0 },
};

// a cluster: [region, ring, small nodes' gives (cycled), notable, its gives]; opts: n (small nodes, else by ring),
// fixed (values not scaled by distance)
const CL = (g, ring, smalls, name, give, o = {}) => ({ g, ring, smalls, name, give, ...o });
const life = (g, r, name, k = 1) => CL(g, r, [{ hp: 5 * k }], name, { hp: 10.5 * k, hpPct: 2 * k });
const vit = (g, r, name, k = 1, extra = {}) => CL(g, r, [{ hpPct: 2 * k }], name, { hpPct: 6 * k, ...extra });
const stam = (g, r, name, extra = {}) => CL(g, r, [{ st: 3 }, { stPct: 2 }], name, { st: 6, stPct: 6, ...extra });
const medic = (g, r, name, extra = {}) => CL(g, r, [{ potion: 4 }], name, { potion: 10, flask: 1, ...extra });
const crit = (g, r, name, extra = {}) => CL(g, r, [{ critChance: 3 }], name, { critChance: 8, ...extra });
const critP = (g, r, name, extra = {}) => CL(g, r, [{ critPower: 4 }], name, { critPower: 12, ...extra });
const phys = (g, r, name, give = { physDmg: 3, physPct: 8 }) => CL(g, r, [{ physDmg: 1 }, { physPct: 3 }], name, give);
const elem = (g, r, e, name, give = { [e + 'Dmg']: 3, [e + 'Pct']: 20 }) => CL(g, r, [{ [e + 'Dmg']: 1 }, { [e + 'Pct']: 8 }], name, give);
// a resistance cluster: three 5% nodes and a 10% notable (25%: the other half of the 75% after the travel nodes)
const resC = (g, r, e, name) => CL(g, r, [{ [e + 'Res']: 5 }], name, { [e + 'Res']: 10 }, { n: 3, fixed: true });
// the Templar's armour: 60% in all over four clusters
const armour = (g, r, name, small, n, top) => CL(g, r, [{ armor: small }], name, { armor: top }, { n, fixed: true });
// values that don't grow with distance (switches, flasks, mechanics with their own caps)
const NOSCALE = new Set(['flask', 'parryWin', 'killHeal', 'execute', 'lowHpDmg', 'finisherPct', 'burnDmg', 'bleedTgt', 'poisonedDmg', 'frozenDmg', 'counterSt']);
const mulAt = (ring) => Math.max(1, 1 + 0.12 * (ring - 3)); // ring 3: ×1, ring 10: ×1.84, ring 20: ×3
const scaleGive = (give, m) => Object.fromEntries(Object.entries(give).map(([k, v]) => [k, NOSCALE.has(k) ? v : v * m >= 2 ? Math.round(v * m) : Math.round(v * m * 100) / 100]));

export const REGIONS = { knight: ['Bulwark', 'Executioner', 'Crusader', 'Warden'], rogue: ['Shadow', 'Bloodletter', 'Venom', 'Duelist'], mage: ['Pyromancer', 'Frostblade', 'Arcanist', 'Spellward'] };
// the Templar: up BULWARK (armour, guard, charge, health), right EXECUTIONER (physical, crits, stun), down CRUSADER
// (fire, speed, charge), left WARDEN (health, stamina, injectors). His health clusters are twice as strong
const KNIGHT = {
  clusters: [
    armour(0, 4, 'Shield Wall', 2, 3, 4), life(3, 4, 'Thick Hide', 2), phys(1, 4, 'Honed Steel'), CL(2, 4, [{ move: 2 }, { aspd: 2 }], 'Zeal', { move: 5, aspd: 4 }),
    medic(3, 6, 'Field Medic'), CL(0, 7, [{ blockDrain: 5 }, { chip: 1 }], 'Iron Wall', { blockDrain: 15, chip: 3 }), crit(1, 7, 'Precision'), elem(2, 7, 'fire', 'Kindled Steel'),
    vit(3, 8, 'Iron Constitution', 1.5), life(0, 9, 'Unbroken', 2), CL(1, 9, [{ stun: 3 }], 'Crushing Weight', { stun: 10, physPct: 5 }), elem(2, 9, 'frost', 'Rime Edge'),
    stam(3, 10, 'Deep Breath'),
    resC(0, 12, 'frost', 'Hearthguard'), resC(1, 12, 'bleed', 'Clotting Salve'), resC(2, 12, 'fire', 'Flame Warden'), resC(3, 12, 'poison', 'Antitoxin'),
    armour(0, 13, 'Bastion', 3, 4, 6), phys(1, 13, 'Brutal Edge'), CL(2, 13, [{ chargeCd: 0.5 }, { chargeKb: 10 }], 'Charging Bull', { chargeCd: 2, chargeKb: 25 }), life(3, 14, 'Bulwark of Flesh', 2),
    CL(0, 16, [{ counter: 5 }], 'Riposte Master', { counter: 15, counterSt: 15 }), critP(1, 16, 'Crowning Blow', { finisherPct: 20 }), elem(2, 16, 'fire', 'Immolation Rite', { firePct: 10, burnDmg: 20 }), vit(3, 16, 'Second Wind', 1.5, { killHeal: 3 }),
    armour(0, 18, 'Aegis of Faith', 3, 5, 17), phys(1, 18, "Executioner's Mark", { execute: 25, physPct: 5 }), elem(2, 18, 'poison', 'Venom Edge'), medic(3, 18, 'Battle Medic', { hp: 7 }),
    life(0, 19, "Titan's Vigour", 2), elem(1, 19, 'bleed', 'Serrated', { bleedDmg: 3, bleedPct: 20, lowHpDmg: 20 }),
    critP(1, 10, 'Ferocity'), crit(1, 15, 'Deadeye'),
  ],
  keystones: [['Immovable', { immovable: 1 }], ['Headsman', { headsman: 1 }], ['Ember Oath', { emberOath: 1 }], ['Stalwart Vow', { stalwart: 1 }]],
  // one evolution per region: Shield Charge (Bulwark) is in; the other three evolve abilities still to come
  soon: [null,
    { name: 'Guillotine', desc: 'Evolves a heavy execution strike still to come: a leaping downward blow that cleaves anything under 30% health clean through.' },
    { name: 'Sun Brand', desc: 'Evolves a holy brand still to come: the brand bursts into a ring of fire on the ground that burns enemies and heals you while you stand in it.' },
    { name: 'Rallying Cry', desc: 'Evolves a war cry still to come: a shout that restores stamina and grants armour to you and nearby allies, and staggers enemies close by.' }],
};
// the Shrike: up SHADOW (rolls, i-frames, parry), right BLOODLETTER (bleed, crits), down VENOM (poison, injectors),
// left DUELIST (attack speed, stamina, finishers). The parry window only grows +4 ms in all (two notables)
const ROGUE = {
  clusters: [
    CL(0, 4, [{ rollCost: 4 }, { move: 2 }], 'Fade', { move: 6, rollCost: 6 }), elem(1, 4, 'bleed', 'Serrated'), life(2, 4, 'Hardy'), stam(3, 4, 'Second Breath'),
    CL(0, 7, [{ iframe: 0.01 }, { rollCost: 4 }], 'Ghost Step', { iframe: 0.02, rollCost: 10 }), crit(1, 7, 'Precision'), elem(2, 7, 'poison', 'Toxic Edge'), CL(3, 7, [{ aspd: 2 }, { atkCost: 3 }], 'Flurry', { aspd: 8 }),
    CL(0, 9, [{ parryCd: 0.25 }], 'Quick Hands', { parryCd: 1, parryWin: 2 }), elem(1, 9, 'bleed', 'Hemorrhage', { bleedPct: 25, bleedDmg: 3 }), medic(2, 9, 'Lingering Death'), vit(3, 9, 'Iron Will'),
    resC(0, 12, 'frost', 'Warm Blood'), resC(1, 12, 'bleed', 'Clotting'), resC(2, 12, 'poison', 'Antitoxin'), resC(3, 12, 'fire', 'Fireproof'),
    life(0, 13, 'Shadow Vigour'), critP(1, 13, 'Cruel Edge'), elem(2, 13, 'poison', 'Virulence', { poisonPct: 30 }), phys(3, 13, "Duelist's Focus", { ripDmg: 8, physPct: 6 }),
    CL(0, 16, [{ ripDmg: 4 }], 'Riposte Artist', { ripDmg: 10, parryWin: 2 }), elem(1, 16, 'bleed', 'Exsanguinate', { bleedTgt: 20 }), elem(2, 16, 'poison', 'Wither', { poisonedDmg: 20 }), CL(3, 16, [{ aspd: 2 }, { physPct: 3 }], 'Finishing Flourish', { finisherPct: 25 }),
    CL(0, 18, [{ rollCost: 4 }, { move: 2 }], 'Untouchable', { iframe: 0.02, move: 4 }), crit(1, 18, "Executioner's Kiss", { execute: 20 }), vit(2, 18, 'Venom Blood', 1, { hp: 7 }), elem(3, 18, 'frost', 'Rime Edge'),
    medic(3, 19, 'Red Harvest', { killHeal: 2 }), elem(2, 19, 'fire', 'Ember Edge'), critP(1, 10, 'Ferocity'),
  ],
  keystones: [['Fleeting', { fleeting: 1 }], ['Glass Fang', { glassFang: 1 }], ['Plaguelord', { plague: 1 }], ['Blade Dance', { bladeDance: 1 }]],
  soon: [null,
    { name: 'Crimson Fan', desc: 'Evolves a thrown-knife volley still to come: a fan of blades that opens deep bleeding wounds on everything it passes through.' },
    { name: 'Plague Cloud', desc: 'Evolves a toxin canister still to come: it bursts into a lingering cloud that poisons and slows anything inside it.' },
    { name: 'Blade Waltz', desc: 'Evolves a spinning dash still to come: a whirl of cuts through a crowd that leaves you briefly untouchable.' }],
};
// the Adept: up PYROMANCER (fire, fireball), right FROSTBLADE (frost, knife), down ARCANIST (mana, spells), left
// SPELLWARD (health, injectors)
const MAGE = {
  clusters: [
    elem(0, 4, 'fire', 'Searing'), elem(1, 4, 'frost', 'Glacial'), CL(2, 4, [{ mana: 5 }], 'Focused Mind', { mana: 12, spellDmg: 4 }), life(3, 4, 'Thick Hide'),
    CL(0, 7, [{ fireRadius: 5 }, { fireCost: 2 }], 'Wide Blast', { fireRadius: 15, fireCost: 4 }), CL(1, 7, [{ knifeDmg: 3 }, { aspd: 2 }], 'Cold Steel', { knifeDmg: 10, aspd: 4 }), CL(2, 7, [{ spellDmg: 3 }], 'Arcane Power', { spellDmg: 10 }), medic(3, 6, 'Field Medic'),
    crit(0, 9, 'Precision'), critP(1, 9, 'Ferocity'), CL(2, 9, [{ manaHit: 0.5 }, { mana: 5 }], 'Siphon', { manaHit: 2 }), stam(3, 9, 'Endurance'),
    resC(0, 12, 'fire', 'Fire Soul'), resC(1, 12, 'frost', "Winter's Grip"), resC(2, 12, 'bleed', 'Clotting'), resC(3, 12, 'poison', 'Antitoxin'),
    elem(0, 13, 'fire', 'Inferno', { firePct: 30 }), elem(1, 13, 'frost', 'Rime Edge', { frostPct: 30 }), CL(2, 13, [{ boltCost: 0.5 }, { fireCost: 2 }], 'Thrift', { boltCost: 2, fireCost: 4 }), vit(3, 13, 'Iron Will'),
    elem(0, 16, 'fire', 'Immolation Rite', { burnDmg: 20 }), elem(1, 16, 'frost', 'Shatterpoint', { frozenDmg: 20 }), CL(2, 16, [{ spellDmg: 3 }], 'Desperation', { lowHpDmg: 20 }), vit(3, 16, 'Second Wind', 1, { killHeal: 3 }),
    CL(0, 18, [{ fireCost: 2 }, { fireDmg: 1 }], 'Kindling', { fireCost: 6, fireDmg: 2 }), elem(1, 18, 'bleed', 'Serrated'), elem(2, 18, 'poison', 'Toxin'), medic(3, 18, 'Battle Medic'),
    life(3, 19, 'Spellward Vigour'), crit(1, 19, 'Deadeye'), critP(0, 15, 'Searing Focus'),
  ],
  keystones: [['Pyromania', { pyromania: 1 }], ['Rime Heart', { rimeHeart: 1 }], ['Spellblade', { spellblade: 1 }], ['Stalwart Vow', { stalwart: 1 }]],
  soon: [null,
    { name: 'Glacier Prison', desc: 'Evolves a frost nova still to come: a ring of ice that freezes enemies in place and shatters for frost damage.' },
    { name: 'Arcane Echo', desc: 'Evolves an arcane missile still to come: each missile repeats itself a moment later at half strength.' },
    { name: 'Runic Aegis', desc: 'Evolves a rune ward still to come: a ward that soaks damage and bursts outward when it breaks.' }],
};
const PLANS = { knight: KNIGHT, rogue: ROGUE, mage: MAGE };

function segCross(a, b, c, d) {
  const o = (p, q, r) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
  return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
}
function segDist(c, a, b) {
  const vx = b.x - a.x, vy = b.y - a.y, L2 = vx * vx + vy * vy || 1, t = ((c.x - a.x) * vx + (c.y - a.y) * vy) / L2;
  if (t <= 0.02 || t >= 0.98) return 1e9;
  return Math.hypot(c.x - a.x - vx * t, c.y - a.y - vy * t);
}
// drawn sizes (tree units), used to keep nodes apart
const SIZE = (n) => (n.role === 'start' ? 4.6 : n.role === 'socket' || n.role === 'evo' ? 5 : 3.9);
const GAP = 2.4, CR = 12; // CR: a cluster's radius (notable to its ring of small nodes)
const regionOf = (p) => ((Math.round((Math.atan2(p.y, p.x) + Math.PI / 2) / (Math.PI / 2)) % 4) + 4) % 4;

// builds a tree from scratch (scripts/gen-trees.mjs); `log` reports clusters that found no room
export function generate(kind, log = () => {}) {
  const S = SHAPES[kind], P = PLANS[kind], N = S.spokes, nodes = new Map(), edges = [];
  const add = (n) => { nodes.set(n.id, n); return n; };
  const link = (a, b) => edges.push([a, b]);
  const ang = (i, d) => -Math.PI / 2 + (i * Math.PI * 2) / N + S.twist * d;
  const at = (a, r) => ({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  const ringAt = (p) => Math.min(RINGS, Math.max(1, Math.round(Math.hypot(p.x, p.y) / RING)));
  add({ id: 'start', ring: 0, role: 'start', x: 0, y: 0 });
  // spokes of travel nodes
  for (let i = 0; i < N; i++) for (let d = 1, prev = 'start'; d <= S.lens[i]; d++) {
    add({ id: `s${i}-${d}`, ring: d, role: 'travel', spoke: i, ...at(ang(i, d), d * RING) });
    link(prev, `s${i}-${d}`); prev = `s${i}-${d}`;
  }
  // the inner ring joining the spokes at ring 4
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N; let a0 = ang(i, CENTRE), a1 = ang(j, CENTRE);
    if (a1 <= a0) a1 += Math.PI * 2;
    const m = Math.max(1, Math.round(((a1 - a0) * CENTRE * RING) / 15) - 1);
    let prev = `s${i}-${CENTRE}`;
    for (let k = 1; k <= m; k++) { const id = `l${i}-${k}`; add({ id, ring: CENTRE, role: 'travel', ...at(a0 + ((a1 - a0) * k) / (m + 1), CENTRE * RING) }); link(prev, id); prev = id; }
    link(prev, `s${j}-${CENTRE}`);
  }
  // the socket ring at ring 10: 12 nodes through every spoke; the three rune sockets 4 apart on it
  const RN = 3 * (SOCKET_GAP + 1), per = Array(N).fill(Math.floor((RN - N) / N));
  for (let k = 0; k < (RN - N) % N; k++) per[Math.floor((k * N) / ((RN - N) % N))]++;
  const ringIds = [];
  for (let g = 0; g < N; g++) {
    const sid = `s${g}-${SOCKET_RING}`; nodes.get(sid).socketRing = true; ringIds.push(sid);
    let a0 = ang(g, SOCKET_RING), a1 = ang((g + 1) % N, SOCKET_RING);
    if (a1 <= a0) a1 += Math.PI * 2;
    for (let k = 1; k <= per[g]; k++) { const id = `q${g}-${k}`; add({ id, ring: SOCKET_RING, role: 'travel', socketRing: true, ...at(a0 + ((a1 - a0) * k) / (per[g] + 1), SOCKET_RING * RING) }); ringIds.push(id); }
  }
  ringIds.forEach((id, k) => link(id, ringIds[(k + 1) % RN]));
  let bestO = 0, bestN = -1;
  for (let o = 0; o <= SOCKET_GAP; o++) { const n = [0, 1, 2].filter((k) => !ringIds[o + k * (SOCKET_GAP + 1)].startsWith('s')).length; if (n > bestN) { bestN = n; bestO = o; } }
  for (let k = 0; k < 3; k++) nodes.get(ringIds[bestO + k * (SOCKET_GAP + 1)]).role = 'socket';
  nodes.get(`s0-${EVO_RING}`).role = 'evo';

  // ---- room checks ----
  const lineGap = (p) => { let d = 1e9; for (const [a, b] of edges) d = Math.min(d, segDist(p, nodes.get(a), nodes.get(b))); return d; };
  const blocked = (p, q, skip) => {
    for (const [a, b] of edges) { if (skip.has(a) || skip.has(b)) continue; if (segCross(p, q, nodes.get(a), nodes.get(b))) return true; }
    for (const n of nodes.values()) if (!skip.has(n.id) && segDist(n, p, q) < SIZE(n) + 1.5) return true;
    return false;
  };
  const roomAt = (p, extra) => [...nodes.values(), ...extra].every((n) => Math.hypot(n.x - p.x, n.y - p.y) >= SIZE(n) + 3.9 + GAP) && lineGap(p) >= 3.9 + 2;
  let uid = 0;
  // a planned group: points, roles, lines ([i, j] within it, or [nodeId, j] to the tree); added only if it all fits
  const group = (pts, roles, lines, prefix) => {
    for (let k = 0; k < pts.length; k++) if (!roomAt(pts[k], pts.slice(0, k).map((q) => ({ ...q, role: 'x' })))) return null;
    const Pt = (e) => (typeof e === 'number' ? pts[e] : nodes.get(e));
    const planned = lines.map(([u, v]) => [Pt(u), Pt(v)]);
    for (let i = 0; i < planned.length; i++) {
      const [A, B] = planned[i], skip = new Set(lines[i].filter((e) => typeof e === 'string'));
      if (blocked(A, B, skip)) return null;
      for (let j = 0; j < i; j++) { const [C, D] = planned[j]; if (A !== C && A !== D && B !== C && B !== D && segCross(A, B, C, D)) return null; }
      for (const q of pts) if (q !== A && q !== B && segDist(q, A, B) < 3.9 + 1.5) return null;
    }
    const ids = pts.map((p, k) => { const id = `${prefix}${uid++}`; add({ id, ring: ringAt(p), role: roles[k], x: p.x, y: p.y }); return id; });
    for (const [u, v] of lines) link(typeof u === 'number' ? ids[u] : u, typeof v === 'number' ? ids[v] : v);
    return ids;
  };
  const travels = () => [...nodes.values()].filter((n) => n.role === 'travel');
  // a cluster round centre c with k small nodes, its entry joined to travel node A by a bridge of b travel nodes
  const placeCluster = (cl, k) => {
    const R0 = cl.ring * RING, aim = -Math.PI / 2 + cl.g * Math.PI / 2;
    const cands = [];
    for (let dr = 0; dr <= 3; dr += 0.25) for (const sr of dr ? [1, -1] : [1]) for (let da = 0; da <= 0.78; da += 0.04) for (const sa of da ? [1, -1] : [1]) {
      const r = R0 + sr * dr * RING, a = aim + sa * da;
      if (r < 2.6 * RING) continue;
      cands.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, sc: dr * 4 + da });
    }
    cands.sort((a, b) => a.sc - b.sc);
    for (const c of cands) {
      if ([...nodes.values()].some((n) => Math.hypot(n.x - c.x, n.y - c.y) < CR + 9) || lineGap(c) < CR + 6) continue;
      const anchors = travels().map((n) => [n, Math.hypot(n.x - c.x, n.y - c.y)]).filter(([, d]) => d < CR + 3.2 * RING).sort((a, b) => a[1] - b[1]).slice(0, 5);
      for (const [A] of anchors) {
        const u = Math.atan2(A.y - c.y, A.x - c.x), E = { x: c.x + Math.cos(u) * CR, y: c.y + Math.sin(u) * CR }, D = Math.hypot(A.x - E.x, A.y - E.y);
        const b = Math.max(0, Math.ceil(D / 19) - 1);
        if (D / (b + 1) < 10.5) continue;
        const smalls = Array.from({ length: k }, (_, j) => ({ x: c.x + Math.cos(u + (j * Math.PI * 2) / k) * CR, y: c.y + Math.sin(u + (j * Math.PI * 2) / k) * CR }));
        const bridge = Array.from({ length: b }, (_, j) => ({ x: E.x + ((A.x - E.x) * (j + 1)) / (b + 1), y: E.y + ((A.y - E.y) * (j + 1)) / (b + 1) }));
        const pts = [c, ...smalls, ...bridge], roles = ['notable', ...smalls.map(() => 'small'), ...bridge.map(() => 'travel')];
        const far = k % 2 ? [(k - 1) / 2, (k + 1) / 2] : [k / 2];
        const lines = [...far.map((j) => [0, j + 1]), ...smalls.map((_, j) => [j + 1, ((j + 1) % k) + 1])];
        for (let j = 0; j <= b; j++) lines.push([j === 0 ? 1 : k + j, j === b ? A.id : k + j + 1]);
        const ids = group(pts, roles, lines, 'c');
        if (ids) return ids;
      }
    }
    return null;
  };
  // clusters, nearest first, round the regions
  const order = [...P.clusters].sort((a, b) => a.ring - b.ring || a.g - b.g);
  order.forEach((cl, ci) => {
    const k = cl.n || (cl.ring <= 5 ? 3 : cl.ring <= 13 ? 4 : 5);
    let ids = null;
    for (let kk = k; kk >= Math.min(k, 3) && !ids; kk--) ids = placeCluster(cl, kk);
    if (!ids) { log(`${kind}: no room for ${cl.name}`); return; }
    const [hub, ...rest] = ids, m = cl.fixed ? 1 : mulAt(cl.ring), hubN = nodes.get(hub);
    Object.assign(hubN, { give: scaleGive(cl.give, m), notable: cl.name, big: true, cluster: ci });
    rest.forEach((id, j) => { const n = nodes.get(id); if (n.role === 'small') Object.assign(n, { give: scaleGive(cl.smalls[j % cl.smalls.length], m), cluster: ci }); });
  });
  // fill up to the total with short travel branches out into the gaps
  const tryBranch = (c, len) => {
    const anchors = travels().map((n) => [n, Math.hypot(n.x - c.x, n.y - c.y)]).filter(([, d]) => d < 2.2 * RING).sort((a, b) => a[1] - b[1]).slice(0, 4);
    for (const [A] of anchors) {
      const u = Math.atan2(c.y - A.y, c.x - A.x);
      const pts = Array.from({ length: len }, (_, j) => ({ x: A.x + Math.cos(u) * RING * (j + 1), y: A.y + Math.sin(u) * RING * (j + 1) }));
      const lines = [[A.id, 0], ...pts.slice(1).map((_, j) => [j, j + 1])];
      if (group(pts, pts.map(() => 'travel'), lines, 't')) return true;
    }
    return false;
  };
  for (let r = 3; r <= RINGS && nodes.size < TOTAL; r += 0.5) for (let a = 0; a < Math.PI * 2 && nodes.size < TOTAL; a += 0.09) {
    const c = at(a, r * RING);
    for (const len of [2, 1]) if (nodes.size + len <= TOTAL && tryBranch(c, len)) break;
  }
  if (nodes.size !== TOTAL) log(`${kind}: ${nodes.size} nodes (want ${TOTAL})`);

  // ---- roles ----
  const all = [...nodes.values()];
  for (const n of all) { n.give ??= {}; n.region = n.role === 'start' ? null : REGIONS[kind][regionOf(n)]; }
  // keystones: the far end of a spoke in each region (or the farthest travel node there)
  const deg = new Map(); for (const [a, b] of edges) { deg.set(a, (deg.get(a) || 0) + 1); deg.set(b, (deg.get(b) || 0) + 1); }
  for (let g = 0; g < 4; g++) {
    const inG = all.filter((n) => n.role === 'travel' && !n.socketRing && regionOf(n) === g);
    const tip = inG.filter((n) => n.spoke !== undefined && n.ring === S.lens[n.spoke]).sort((a, b) => Math.hypot(b.x, b.y) - Math.hypot(a.x, a.y))[0]
      || inG.filter((n) => deg.get(n.id) === 1).sort((a, b) => Math.hypot(b.x, b.y) - Math.hypot(a.x, a.y))[0];
    if (!tip) { log(`${kind}: no keystone spot in region ${g}`); continue; }
    const [name, give] = P.keystones[g];
    Object.assign(tip, { role: 'keystone', give: { ...give }, notable: name, keystone: true, big: true });
  }
  // the evolutions still to come: exactly 6 links out like the first, at least 6 from every other evolution
  const adj = new Map(); for (const [a, b] of edges) { (adj.get(a) || adj.set(a, []).get(a)).push(b); (adj.get(b) || adj.set(b, []).get(b)).push(a); }
  const hops = (from) => { const d = new Map([[from, 0]]), q = [from]; while (q.length) { const c = q.shift(); for (const x of adj.get(c) || []) if (!d.has(x)) { d.set(x, d.get(c) + 1); q.push(x); } } return d; };
  const H0 = hops('start'), aimOff = (n, g) => { const d = Math.atan2(n.y, n.x) - (-Math.PI / 2 + g * Math.PI / 2); return Math.abs(Math.atan2(Math.sin(d), Math.cos(d))); };
  const cand = [1, 2, 3].map((g) => all.filter((n) => n.role === 'travel' && !n.socketRing && regionOf(n) === g && H0.get(n.id) === EVO_RING).sort((a, b) => (a.spoke !== undefined ? 0 : 1) - (b.spoke !== undefined ? 0 : 1) || aimOff(a, g) - aimOff(b, g)));
  const evoH = hops(`s0-${EVO_RING}`), HH = new Map(cand.flat().map((n) => [n.id, hops(n.id)]));
  let picks = null;
  search: for (const a of cand[0]) { if (evoH.get(a.id) < 6) continue; for (const b of cand[1]) { if (evoH.get(b.id) < 6 || HH.get(a.id).get(b.id) < 6) continue; for (const c of cand[2]) if (evoH.get(c.id) >= 6 && HH.get(a.id).get(c.id) >= 6 && HH.get(b.id).get(c.id) >= 6) { picks = [a, b, c]; break search; } } }
  if (!picks) log(`${kind}: evolutions still to come found no spots 6 apart`);
  else picks.forEach((n, i) => Object.assign(n, { role: 'soon', soon: i + 1, big: true }));
  // resistance travel nodes: 4 near the centre, 12 through the middle, 4 out at the edge, spread round
  const resAt = [...Array(4).fill([3, 5]), ...Array(12).fill([6, 14]), ...Array(4).fill([15, 20])], chosen = [];
  resAt.forEach(([lo, hi], i) => {
    const pool = all.filter((n) => n.role === 'travel' && !n.res && n.ring >= lo && n.ring <= hi);
    const want = (i * Math.PI * 2 * 0.382) % (Math.PI * 2); // (golden-angle turns, so they spread round)
    let best = null, bs = -1e9;
    for (const n of pool) {
      const near = chosen.length ? Math.min(...chosen.map((q) => Math.hypot(q.x - n.x, q.y - n.y))) : 99;
      const d = Math.atan2(n.y, n.x) - want, off = Math.abs(Math.atan2(Math.sin(d), Math.cos(d)));
      const sc = Math.min(near, 80) - off * 25;
      if (sc > bs) { bs = sc; best = n; }
    }
    if (best) { best.res = true; chosen.push(best); }
  });
  return { kind, nodes, edges };
}

// a tree loaded from treelayout.js (or generated if it's missing)
function load(kind) {
  const saved = LAYOUT[kind];
  if (!saved?.nodes) return generate(kind);
  const nodes = new Map(saved.nodes.map((n) => [n.id, { ...n, give: { ...(n.give || {}) } }]));
  return { kind, nodes, edges: saved.edges.map((e) => [...e]) };
}
// the gen script's copy of a node (what treelayout.js keeps)
export const saveNode = (n) => Object.fromEntries(Object.entries(n).filter(([k, v]) => v !== undefined && v !== null && v !== false && !(k === 'give' && !Object.keys(v).length)).map(([k, v]) => [k, typeof v === 'number' ? +v.toFixed(2) : v]));

// Evolutions left the tree for the workbench (weapons.js): the evolution node and the three still to come are now
// big notables of their own. (`evoId`: the old evolution node, so its owners get that evolution built: migrateTree)
const MASTERY = [['Weapon Mastery', { physPct: 6, hpPct: 4 }], ["Veteran's Grit", { stPct: 6, hpPct: 3 }], ['Hardened', { armor: 4, hpPct: 3 }], ['Killing Rhythm', { aspd: 4, physPct: 3 }]];
const finish = (t) => {
  for (const n of t.nodes.values()) {
    if (n.role !== 'evo' && n.role !== 'soon') continue;
    const [name, give] = MASTERY[n.role === 'evo' ? 0 : 1 + ((n.soon ?? 0) % 3)];
    if (n.role === 'evo') t.evoId = n.id;
    n.role = 'mastery'; n.notable = name; n.give = { ...give }; n.big = true; delete n.soon;
  }
  return t;
};
export const TREES = { knight: finish(load('knight')), rogue: finish(load('rogue')), mage: finish(load('mage')) };
// flat health and flat damage per hit are NUM times bigger (scale.js); the give objects are shared, so copy them
const FLAT = ['hp', 'physDmg', 'fireDmg', 'bleedDmg', 'poisonDmg', 'frostDmg'];
for (const t of Object.values(TREES)) for (const n of t.nodes.values()) if (n.give && FLAT.some((k) => n.give[k])) n.give = Object.fromEntries(Object.entries(n.give).map(([k, v]) => [k, FLAT.includes(k) ? v * NUM : v]));

export const isTravel = (n) => n?.role === 'travel';
export const inCentre = (n) => n.role !== 'start' && n.ring <= CENTRE;
// prices by ring: a little more each ring out, the most at the edge
const COST = [0, 10, 10, 10, 10, 42, 56, 72, 90, 112, 128, 145, 165, 185, 205, 230, 285, 310, 340, 370, 410, 450, 500];
// the centre (rings 1-4): each centre node you own makes the next one 22% dearer (the first few are cheap), so the
// tree pushes you outward
const centrePrice = (k) => Math.round(8 * Math.pow(1.22, k)) * NUM;
const centreCount = (tree, have) => { let k = 0; for (const id of have || []) { const n = tree.nodes.get(id); if (n && inCentre(n)) k++; } return k; };
// the price of a node; `have` (what's owned) prices centre nodes
export function nodeCost(n, have = null, tree = null) {
  if (n.role === 'start') return 0;
  if (n.role === 'evo') return 150 * NUM;
  if (inCentre(n)) {
    const t = tree || Object.values(TREES).find((x) => x.nodes.get(n.id) === n), k = centreCount(t, have) - (have?.has(n.id) ? 1 : 0);
    return centrePrice(Math.max(0, k));
  }
  const c = COST[Math.min(n.ring, COST.length - 1)];
  // notables cost twice a small node of their ring, keystones three times
  return Math.round((n.role === 'socket' ? c * 1.5 : n.keystone ? c * 3 : n.notable ? c * 2 : c)) * NUM;
}
// what removing `gone` from `have` gives back: each node at its price, the centre ones at the dearest prices paid
export function refundOf(tree, have, gone) {
  let sum = 0, cg = 0;
  for (const id of gone) { const n = tree.nodes.get(id); if (!n) continue; if (inCentre(n)) cg++; else sum += nodeCost(n); }
  const k = centreCount(tree, have);
  for (let i = 0; i < cg; i++) sum += centrePrice(k - 1 - i);
  return sum;
}

export function neighbours(tree, id) {
  const out = [];
  for (const [a, b] of tree.edges) { if (a === id) out.push(b); else if (b === id) out.push(a); }
  return out;
}

export const owned = (data, kind) => new Set(['start', ...(data?.tree?.[kind] || [])]);
// the stat picked on each owned travel node: { nodeId: 'str' | 'dex' | 'int' | 'fire' | ... }
export const picksOf = (data, kind) => data?.treePick?.[kind] || {};

// buyable: not owned and touching an owned node
export function canTake(tree, have, id) {
  if (tree.nodes.get(id)?.soon) return false; // an evolution still to come
  // an evolution still to come can't be taken, but you can pass through it for now: a node beside one counts as
  // touching whatever you own on its other side
  return !have.has(id) && neighbours(tree, id).some((x) => have.has(x) || (tree.nodes.get(x)?.soon && neighbours(tree, x).some((y) => have.has(y))));
}

// what a node gives (a travel node by its pick)
export const giveOf = (n, picks = {}) => (isTravel(n) ? travelGive(n, picks[n.id]) : n.give || {});
// summed stats for a character (caps applied); `evolved` if the evolution node is owned
export function treeStats(kind, data) { return sumStats(kind, owned(data, kind), picksOf(data, kind)); }
// the same for any set of owned node ids (the tree screen previews a node before you buy it)
export function sumStats(kind, have, picks = {}) {
  const tree = TREES[kind], s = {};
  for (const id of have) {
    const n = tree?.nodes.get(id);
    if (!n) continue;
    for (const [k, v] of Object.entries(giveOf(n, picks))) s[k] = (s[k] || 0) + v;
  }
  for (const [k, cap] of Object.entries(CAPS)) if (s[k] > cap) s[k] = cap;
  return s;
}

const RES_NAME = { fire: 'Fire', frost: 'Frost', bleed: 'Bleed', poison: 'Poison' };
// a pick's button label on the tree screen
export const pickLabel = (n, p) => (n.res ? `${RES_NAME[p]} +${RES_PICK}%` : `${TRAVEL_NAME[p]} · ${STATS[Object.keys(TRAVEL[p])[0]].fmt(Object.values(TRAVEL[p])[0])}`);
export function describe(n, pick = null) {
  if (n.role === 'start') return { name: 'Start', lines: ['Your path begins here.'] };
  if (n.evo) return { name: `Evolution · ${n.evo.name}`, lines: [n.evo.desc] };
  if (n.role === 'socket') return { name: 'Rune Socket', lines: ['An empty socket. Runes found later in the game will fit here.'] };
  if (n.soon) return { name: `Evolution · ${n.soon.name}`, lines: [n.soon.desc, 'Coming soon: its ability isn\'t in the game yet'] };
  if (isTravel(n) && n.res) return { name: 'Resistance Node', lines: pick ? [`+${RES_PICK}% ${pick} resistance`, 'Click to change the element'] : [`Pick an element: +${RES_PICK}% Fire, Frost, Bleed or Poison resistance`] };
  if (isTravel(n)) return { name: pick ? `Travel · ${TRAVEL_NAME[pick]}` : 'Travel Node', lines: pick ? [STATS[Object.keys(TRAVEL[pick])[0]].fmt(Object.values(TRAVEL[pick])[0]), 'Click to change the stat'] : ['Pick one: Strength (+30 health), Dexterity (+4 stamina) or Intelligence (+6 mana)'] };
  const lines = Object.entries(n.give).map(([k, v]) => STATS[k].fmt(+v.toFixed(2)));
  const k = Object.keys(n.give)[0];
  if (n.keystone) return { name: `Keystone · ${n.notable}`, lines };
  if (n.notable) return { name: `${n.notable}`, lines: [...lines, n.region ? `${n.region} notable` : ''].filter(Boolean) };
  return { name: STATS[k]?.name || 'Node', lines };
}

const RES_ICON = { fire: 'resFire', frost: 'resFrost', bleed: 'resBleed', poison: 'resPoison' };
export const iconKey = (n, pick = null) => (n.role === 'start' ? 'start' : n.evo || n.soon ? 'evo' : n.role === 'socket' ? 'socket'
  : isTravel(n) ? (pick ? (n.res ? RES_ICON[pick] : STATS[Object.keys(TRAVEL[pick])[0]].icon) : null) : STATS[Object.keys(n.give)[0]]?.icon || 'dmg');

// Earlier tree layouts were priced and placed differently: anything bought on them comes back as the
// gold it cost, once, and the trees start fresh on the current layout (version 3: socket triangle).
// v1: 80 nodes, cheap rings; v2: 120 nodes, sockets on the spokes at ring 10.
const COST_V1 = [0, 8, 10, 12, 15, 18, 22, 26, 31, 37, 44, 52, 62, 74];
const SOCKETS_V1 = { knight: ['s0-10', 's1-10', 's3-10'], rogue: ['s0-10', 's2-10', 's4-10'], mage: ['s0-10', 's2-10', 's3-10'] };
const COST_V4 = [0, 10, 15, 30, 50, 80, 100, 120, 140, 170, 200, 250, 275, 300, 325, 350];
const COST_V23 = [0, ...Array.from({ length: 15 }, (_, i) => { const c = 10 * Math.pow(25, i / 14); return c < 20 ? Math.round(c) : Math.round(c / 5) * 5; })];
function costOld(v, kind, id) {
  if (v === 6) return COST_V6[kind]?.[id] || 0;
  if (v === 5) return COST_V5[kind]?.[id] || 0;
  if (v === 4) {
    if (id === 's0-6') return 150;
    if (/^r\d+$/.test(id)) return 300;
    if (/^ra\d+$/.test(id)) return 200;
    const f = id.match(/^f\d+-(\d+)-\d+-(\d+)$/), m = id.match(/^[slx]\d+-(\d+)/), b = id.match(/^b\d+-(\d+)-(\d+)/);
    const ring = f ? +f[1] + +f[2] : b ? +b[1] + +b[2] : m ? +m[1] : 0;
    return COST_V4[Math.min(ring, COST_V4.length - 1)] || 0;
  }
  if (id === 's0-6') return 75;
  if (v === 3 && /^r\d+$/.test(id)) return Math.round(COST_V23[10] * 1.5);
  if (v === 3 && /^ra\d+$/.test(id)) return COST_V23[10];
  const m = id.match(/^[slx](\d+)-(\d+)/), b = id.match(/^b\d+-(\d+)-(\d+)/);
  const ring = b ? +b[1] + +b[2] : m ? +m[2] : 0;
  const table = v >= 2 ? COST_V23 : COST_V1;
  const c = table[Math.min(ring, table.length - 1)] || 0;
  return v !== 3 && SOCKETS_V1[kind]?.includes(id) ? Math.round(c * 1.5) : c;
}
export const TREE_VERSION = 19;
// 18 -> 19: evolutions left the tree for the workbench; whoever owned one gets it built there (the node stays,
// a notable now)
const EVO_OF = { knight: 'aegisRam', rogue: 'redRiposte', mage: 'twinPlasma' };
// version 7 -> 8 rebuilt only the Knight's tree (regions, notables, keystones): his nodes come back as gold at the
// ring price paid; the others' trees are untouched
// (versions 7-17 are refunded at the version-17 prices, treecost-v7.js: the closest record kept of them)
const COST_V7 = (id, kind = 'knight') => COST_V7T[kind]?.[id] || 0;
export function migrateTree(data) {
  if (!data || data.treeV >= TREE_VERSION) return 0;
  if (data.treeV === 18) {
    for (const k of Object.keys(EVO_OF)) if ((data.tree?.[k] || []).includes(TREES[k].evoId)) {
      const w = (data.weapons ||= {}); (w.evos ||= {})[EVO_OF[k]] = 1;
    }
    data.treeV = 19;
    return 0;
  }
  // 10 -> 11 and 11 -> 12: the evolutions moved (6 links from the start, 6 from each other), so every tree's nodes come back
  if (data.treeV >= 10 && data.treeV <= 17) { // (17 -> 18: travel nodes, clusters, 280 nodes; 16 -> 17: the Knight's lines thinned, resistances spread round the outside;
    // 14 -> 15: damage nodes for every element; 15 -> 16: stats regrouped: centre basics, outer quarters, armour 60%) // (12 -> 13: resistance and armour nodes added; 13 -> 14: crit nodes put into the lines)
    let refund = 0;
    for (const k of ['knight', 'rogue', 'mage']) { refund += (data.tree?.[k] || []).reduce((a, id) => a + COST_V7(id, k), 0); if (data.tree) data.tree[k] = []; }
    refund *= NUM;
    data.gold = (data.gold || 0) + refund;
    delete data.treePick;
    data.treeV = TREE_VERSION;
    return refund;
  }
  // 9 -> 10: the Rogue's and Spellsword's trees rebuilt in regions: their nodes come back as gold at the ring price
  if (data.treeV === 9) {
    let refund = 0;
    for (const k of ['rogue', 'mage']) { refund += (data.tree?.[k] || []).reduce((a, id) => a + COST_V7(id, k), 0); if (data.tree) data.tree[k] = []; }
    refund *= NUM;
    data.gold = (data.gold || 0) + refund;
    data.treeV = 10; // (and on to 11)
    return refund + migrateTree(data);
  }
  // 8 -> 9: three Knight nodes became evolutions still to come; anyone holding one gets it back as gold
  if (data.treeV === 8) {
    const soon = (data.tree?.knight || []).filter((id) => TREES.knight.nodes.get(id)?.soon);
    const refund = soon.reduce((a, id) => a + COST_V7(id), 0) * NUM;
    if (soon.length) data.tree.knight = data.tree.knight.filter((id) => !soon.includes(id));
    data.gold = (data.gold || 0) + refund;
    data.treeV = 9; // (and on to 10)
    return refund + migrateTree(data);
  }
  if (data.treeV === 7) {
    const refund = (data.tree?.knight || []).reduce((a, id) => a + COST_V7(id), 0) * NUM;
    if (data.tree) data.tree.knight = [];
    data.gold = (data.gold || 0) + refund;
    data.treeV = 9; // (and on to 10)
    return refund + migrateTree(data);
  }
  const v = data.treeV >= 2 && data.treeV <= 6 ? data.treeV : 1;
  let refund = 0;
  for (const [kind, ids] of Object.entries(data.tree || {})) for (const id of ids) refund += costOld(v, kind, id);
  data.tree = {};
  refund *= NUM; // old prices, in today's bigger gold
  data.gold = (data.gold || 0) + refund;
  data.treeV = TREE_VERSION;
  return refund;
}

// One-time move from the old shop: everything bought back as gold, except the Spellsword unlock.
export function migrateUpgrades(data) {
  if (!data || data.treeMigrated) return 0;
  let refund = 0;
  for (const u of UPGRADES) {
    if (u.key === 'mage') continue;
    const lv = data.upgrades?.[u.key] || 0;
    for (let i = 0; i < lv; i++) refund += upgradeCost(u, i) || 0;
    if (data.upgrades) delete data.upgrades[u.key];
  }
  refund *= NUM; // old prices, in today's bigger gold
  data.gold = (data.gold || 0) + refund;
  data.tree = data.tree || {};
  data.treeMigrated = true;
  data.treeV = TREE_VERSION; // brand-new trees are already on the current layout
  return refund;
}
