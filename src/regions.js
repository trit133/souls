// The world map: regions, each with three raid areas. A raid is one hand-built map (city.js for the first): find and
// break three shrines, which opens the way to the area's boss, hidden somewhere on the map. Finishing the raid or
// dying are the only ways out.
//
// The old regime looked into the future with sorcery and stole its machines for their arms and armour; it only fed
// the old wars until everything burned. The last of that regime fight their way toward the one who started it all.

// enemy looks per area (merged over each type's model in enemies.js): every area dresses its own
const ASHFALL_LOOK = {
  grunt: { cloth: 0x4a3a2a, armor: 0x4e4438, head: 'hood', eyes: 0xffa040 }, // (scavenger gangs in rag and scrap plate)
  spear: { cloth: 0x3a2e26, armor: 0x5a4a3a, head: 'cap', eyes: 0xffa040 },
  archer: { cloth: 0x2e3428, armor: 0x3a4032, accent: 0x6a5a3a, eyes: 0xd8e070 },
  brute: { cloth: 0x3a2a22, armor: 0x6a5240, eyes: 0xffa040 },
};

export const AREAS = {
  r1a1: {
    id: 'r1a1', region: 'r1', name: 'Ashfall Ward', kind: 'city', boss: 'hask', open: true,
    blurb: 'A hab-ward burned hollow in the first war. Scavenger gangs hold the tenements; the cellars run deeper than the maps say.',
    mix: { grunt: 4, spear: 2, archer: 2, brute: 0.4 }, look: ASHFALL_LOOK,
    // what its drums and chests hold (items.js): the first area of a region tops out low; the harder ones reach higher
    // (the first area tops out at rare: Augury Shards and Oracle Cores wait in the harder areas, so the region's new
    // weapons can't be forged from Ashfall Ward alone)
    loot: { drum: { common: 80, uncommon: 18, rare: 2 }, chest: { common: 32, uncommon: 42, rare: 26 }, hoard: { rare: 100 } },
  },
  r1a2: { id: 'r1a2', region: 'r1', name: 'The Sump Lines', kind: 'locked', blurb: 'Flooded transit tunnels under the ward.' },
  r1a3: { id: 'r1a3', region: 'r1', name: 'Saint Orsk\'s Spire', kind: 'locked', blurb: 'A cathedral-fortress on the ward\'s edge.' },
};

// map positions are 0..1 across the world map (regions) and across a region's own map (areas)
export const REGIONS = [
  { id: 'r1', name: 'The Shattered March', open: true, x: 0.3, y: 0.62, color: '#c8642a',
    blurb: 'The border hab-wards, where the first of the future-forged armies broke.',
    areas: [{ id: 'r1a1', x: 0.3, y: 0.66 }, { id: 'r1a2', x: 0.56, y: 0.44 }, { id: 'r1a3', x: 0.78, y: 0.24 }] },
  { id: 'r2', name: 'The Glass Wastes', open: false, x: 0.62, y: 0.7, color: '#7ab0c0', blurb: 'Sealed.' },
  { id: 'r3', name: 'The Forge Reaches', open: false, x: 0.74, y: 0.36, color: '#d8402a', blurb: 'Sealed.' },
  { id: 'r4', name: 'The Drowned Choir', open: false, x: 0.38, y: 0.28, color: '#5a8a6a', blurb: 'Sealed.' },
  { id: 'r5', name: 'The Seat of Augury', open: false, x: 0.55, y: 0.12, color: '#a070e0', blurb: 'Where it began.' },
];
