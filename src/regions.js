// The world map: regions, each with three raid areas. A raid is one hand-built map (city.js for the first): find and
// break three shrines, which opens the way to the area's boss, hidden somewhere on the map. Finishing the raid or
// dying are the only ways out.
//
// The old regime looked into the future with sorcery and stole its machines for their arms and armour; it only fed
// the old wars until everything burned. The last of that regime fight their way toward the one who started it all.

import './foes.js'; // (the deeper areas' own enemies join the enemy types)
import './deepfoes.js'; // (and the Sunless Deep's)
import './deepbosses.js'; // (its bosses join boss.js BOSSES)

// enemy looks per area (merged over each type's model in enemies.js): every area dresses its own
const ASHFALL_LOOK = {
  grunt: { cloth: 0x4a3a2a, armor: 0x4e4438, head: 'hood', eyes: 0xffa040 }, // (scavenger gangs in rag and scrap plate)
  spear: { cloth: 0x3a2e26, armor: 0x5a4a3a, head: 'cap', eyes: 0xffa040 },
  archer: { cloth: 0x2e3428, armor: 0x3a4032, accent: 0x6a5a3a, eyes: 0xd8e070 },
  brute: { cloth: 0x3a2a22, armor: 0x6a5240, eyes: 0xffa040 },
};

export const AREAS = {
  r1a1: {
    id: 'r1a1', region: 'r1', name: 'Ashfall Ward', kind: 'city', map: 'ward', boss: 'hask', open: true, // (its map: ward.js)
    blurb: 'A hab-ward burned hollow in the first war. Scavenger gangs hold the tenements; the cellars run deeper than the maps say.',
    mix: { grunt: 4, spear: 2, archer: 2, brute: 0.4 }, look: ASHFALL_LOOK,
    // what its drums and chests hold (items.js): the first area of a region tops out low; the harder ones reach higher
    // (the first area tops out at rare: Augury Shards and Oracle Cores wait in the harder areas, so the region's new
    // weapons can't be forged from Ashfall Ward alone)
    loot: { drum: { common: 80, uncommon: 18, rare: 2 }, chest: { common: 32, uncommon: 42, rare: 26 }, hoard: { rare: 100 } },
  },
  // (designed in docs/region1-areas.md; their maps: sump.js, spire.js)
  // each deeper area needs the gem of the boss before it (needs: carried, never used up); the last needs all three
  r1a2: {
    id: 'r1a2', region: 'r1', name: 'The Sump Lines', kind: 'city', map: 'sump', boss: 'vael', open: true, needs: ['gem_hask'],
    blurb: 'Flooded transit tunnels under the ward. The ones who stayed below changed; the gangs who work the pumps burn them out.',
    mix: { wretch: 4, hook: 2, torcher: 2, hulk: 0.5 }, look: {}, heavy: 'hulk', melee: ['wretch', 'hook'],
    // epic first shows here (Augury Shards: the region's weapons can be forged from here on)
    loot: { drum: { common: 70, uncommon: 24, rare: 5, epic: 1 }, chest: { common: 18, uncommon: 40, rare: 32, epic: 10 }, hoard: { rare: 60, epic: 40 } },
  },
  r1a3: {
    id: 'r1a3', region: 'r1', name: 'Saint Orsk\'s Spire', kind: 'city', map: 'spire', boss: 'gorrath', open: true, needs: ['gem_vael'],
    blurb: 'The high augur\'s cathedral-fortress on the ward\'s edge. His order still sings in the bell-towers, still reads what is coming, and still turns back all who climb.',
    mix: { flagellant: 3, castellan: 2, augur: 1.5, bellwarden: 0.5 }, look: {}, heavy: 'bellwarden', melee: ['flagellant', 'castellan'],
    loot: { drum: { common: 58, uncommon: 30, rare: 9, epic: 3 }, chest: { common: 8, uncommon: 32, rare: 38, epic: 18, legendary: 4 }, hoard: { epic: 70, legendary: 30 } },
  },
  // the region's master: a short approach (a few of the region's hardest, the gem door) and Varek's throne
  // (modules.js FINAL_MODULES.bastion, then the old BOSS_ARENA). Its three gems open it
  r1f: {
    id: 'r1f', region: 'r1', name: 'The Sentinel\'s Bastion', kind: 'final', boss: 'varek', open: true, needs: ['gem_hask', 'gem_vael', 'gem_gorrath'],
    blurb: 'At the end of the March the Last Sentinel still keeps the regime\'s gate, as he was ordered to before the world burned. Three gems set in his door; three heads he will know.',
  },
};

// ---------- Region 2: the Sunless Deep (docs/region2-design.md) ----------
// under the Glass Wastes: down through the mining town, the borers' tunnels and the crystal city to the Crucible.
// Its maps: lanternhold.js, wormways.js, glasshallow.js; its enemies: deepfoes.js; its bosses: deepbosses.js; the
// Crucible and the Kiln: modules.js FINAL_MODULES
Object.assign(AREAS, {
  r2a1: {
    id: 'r2a1', region: 'r2', name: 'Lanternhold', kind: 'city', map: 'lanternhold', boss: 'lampking', open: true, after: 'r1f',
    blurb: 'The first town below the glass: scaffolds and ledges down the main shaft, a thousand lanterns against the dark. The miners still work the seams. The glass dust has got into their heads.',
    mix: { shaftrat: 4, rivet: 2, creeper: 1, hauler: 0.5 }, look: {}, heavy: 'hauler', melee: ['shaftrat'],
    loot: { drum: { common: 80, uncommon: 18, rare: 2 }, chest: { common: 32, uncommon: 42, rare: 26 }, hoard: { rare: 100 } },
  },
  r2a2: {
    id: 'r2a2', region: 'r2', name: 'The Wormways', kind: 'city', map: 'wormways', boss: 'borer', open: false, needs: ['gem_lampking'],
    blurb: 'Below the town the regime\'s borers went down, drilling engines the size of chapels, half machine and half grown. Some never stopped. Their tunnels cross over and under each other, round as a gun barrel.',
    mix: { grub: 3, lobber: 2, burrower: 1.5, thrall: 0.5 }, look: {}, heavy: 'thrall', melee: ['burrower', 'grub'],
    loot: { drum: { common: 70, uncommon: 24, rare: 5, epic: 1 }, chest: { common: 18, uncommon: 40, rare: 32, epic: 10 }, hoard: { rare: 60, epic: 40 } },
  },
  r2a3: {
    id: 'r2a3', region: 'r2', name: 'Glasshallow', kind: 'city', map: 'glasshallow', boss: 'hierophant', open: false, needs: ['gem_borer'],
    blurb: 'A cavern so big it has weather. The Glass-Wrights built their city round the greatest vein of seer-glass ever found, and they stare into it until they see what is coming. Then they never look away.',
    mix: { acolyte: 3, lancer: 2, shade: 1.5, shardback: 0.5 }, look: {}, heavy: 'shardback', melee: ['acolyte', 'shade'],
    loot: { drum: { common: 58, uncommon: 30, rare: 9, epic: 3 }, chest: { common: 8, uncommon: 32, rare: 38, epic: 18, legendary: 4 }, hoard: { epic: 70, legendary: 30 } },
  },
  // the region's master: down through the Crucible to the Kiln (modules.js FINAL_MODULES crucible, kiln)
  r2f: {
    id: 'r2f', region: 'r2', name: 'The Crucible', kind: 'final', boss: 'kilnfather', chain: ['crucible', 'kiln'], open: false, needs: ['gem_lampking', 'gem_borer', 'gem_hierophant'],
    blurb: 'At the bottom of every shaft the earth opens into a cavern too big to see the roof of, red with rivers of fire. Seer-glass is born here. The regime\'s first glassmaker came down to see the future first, and never went back up.',
  },
});

// can this account deploy to the area: it's open, they carry every gem it needs, and the region before it is done
// if it's a region's first (data: the account's, or none for a guest, who can only take the first area)
export const missingGems = (A, data) => (A.needs || []).filter((g) => !data?.gems?.[g]);
export const regionDone = (A, data) => !A?.after || !!data?.raids?.[A.after] || !!data?.regionKeys?.[A.region]; // (regionKeys: opened by hand, joeandre)
export const areaOpen = (A, data) => !!A?.open && !missingGems(A, data).length && regionDone(A, data);

// map positions are 0..1 across the world map (regions) and across a region's own map (areas)
export const REGIONS = [
  { id: 'r1', name: 'The Shattered March', open: true, x: 0.3, y: 0.68, color: '#c8642a',
    blurb: 'The border hab-wards, where the first of the future-forged armies broke.',
    areas: [{ id: 'r1a1', x: 0.2, y: 0.66 }, { id: 'r1a2', x: 0.56, y: 0.47 }, { id: 'r1a3', x: 0.795, y: 0.2 }, { id: 'r1f', x: 0.92, y: 0.42 }] }, // (on the painted map: public/maps)
  { id: 'r2', name: 'The Sunless Deep', open: true, x: 0.74, y: 0.72, color: '#e0a040',
    blurb: 'Under the Glass Wastes, where the regime mined the seer-glass it saw the future through.',
    areas: [{ id: 'r2a1', x: 0.22, y: 0.2 }, { id: 'r2a2', x: 0.62, y: 0.38 }, { id: 'r2a3', x: 0.3, y: 0.6 }, { id: 'r2f', x: 0.7, y: 0.84 }] }, // (a cutaway, top to bottom: mapart.js)
  { id: 'r3', name: 'The Forge Reaches', open: false, x: 0.86, y: 0.3, color: '#d8402a', blurb: 'Sealed.' },
  { id: 'r4', name: 'The Drowned Choir', open: false, x: 0.16, y: 0.2, color: '#5a8a6a', blurb: 'Sealed.' },
  { id: 'r5', name: 'The Seat of Augury', open: false, x: 0.645, y: 0.14, color: '#a070e0', blurb: 'Where it began.' },
];
