// Outfits: each character is dressed from swappable pieces, one per slot, each with its own main and trim colour.
// Pieces and colours are bought with emeralds (1 per kill, 2 per boss); the defaults are free. Every account has
// 3 saved outfits per character. The pieces' geometry lives in playerkits.js; this file is the catalogue, the
// prices, what an account owns and wears, and the one-time move from the old kill-unlocked skins.
import * as THREE from 'three';
import { CRUSADE_NAMES } from './crusadekit.js';

// big pieces (chest, legs, shield, cloak, shirt, pants) cost half as much as the small ones' old price did; small
// pieces (helmets, shoulders, masks, bands, weapons) a quarter
export const PRICE = { piece: 40, special: 200, smallPiece: 20, smallSpecial: 100, color: 30, specialColor: 300 };
const BIG = new Set(['chest', 'legs', 'shield', 'cloak', 'shirt', 'pants']);
export const OUTFIT_SLOTS = 3;

// ---------- colours: 11 plain, 4 with an effect ----------
export const COLORS = [
  { id: 'iron', name: 'Iron', hex: 0x8d939c },
  { id: 'charcoal', name: 'Charcoal', hex: 0x2a282c },
  { id: 'bone', name: 'Bone', hex: 0xd8d0bc },
  { id: 'ivory', name: 'Ivory', hex: 0xf0eadc },
  { id: 'crimson', name: 'Crimson', hex: 0x8a2a22 },
  { id: 'rust', name: 'Rust', hex: 0x8a4a24 },
  { id: 'gold', name: 'Gold', hex: 0xc8a040 },
  { id: 'forest', name: 'Forest', hex: 0x2e5a32 },
  { id: 'teal', name: 'Teal', hex: 0x2a6a6a },
  { id: 'royal', name: 'Royal Blue', hex: 0x2c4a8a },
  { id: 'violet', name: 'Violet', hex: 0x5a2e8a },
  // effect colours: they move
  { id: 'molten', name: 'Molten', hex: 0x3a1206, fx: 'molten', special: true },
  { id: 'frostbound', name: 'Frostbound', hex: 0xb8dcf0, fx: 'frost', special: true },
  { id: 'voidcloth', name: 'Voidcloth', hex: 0x0e0a18, fx: 'void', special: true },
  { id: 'gilded', name: 'Gilded', hex: 0xd8a830, fx: 'gilded', special: true },
];
export const colorById = (id) => COLORS.find((c) => c.id === id);
export const colorPrice = (c) => (c.special ? PRICE.specialColor : PRICE.color);

// ---------- slots and pieces per character (geometry in playerkits.js) ----------
// `def`: the piece each slot starts with (free). `special` pieces cost more.
export const SLOTS = {
  knight: [
    { id: 'helmet', name: 'Helmet' }, { id: 'pauldronL', name: 'L Shoulder' }, { id: 'pauldronR', name: 'R Shoulder' },
    { id: 'chest', name: 'Chest' }, { id: 'legs', name: 'Legs' }, { id: 'sword', name: 'Sword' }, { id: 'shield', name: 'Shield' },
  ],
  rogue: [
    { id: 'mask', name: 'Mask' }, { id: 'cloak', name: 'Cloak' }, { id: 'shirt', name: 'Shirt' },
    { id: 'bandL', name: 'L Arm Band' }, { id: 'bandR', name: 'R Arm Band' }, { id: 'knives', name: 'Knives' },
  ],
  mage: [
    { id: 'shoulder', name: 'Shoulder' }, { id: 'shirt', name: 'Shirt' }, { id: 'pants', name: 'Pants' },
    { id: 'wand', name: 'Wand' }, { id: 'sword', name: 'Sword' },
  ],
};
export const PIECES = {
  knight: {
    helmet: [{ id: 'great', name: 'Great Helm', desc: 'A closed helm with a plume.' }, { id: 'barbute', name: 'Barbute', desc: 'An open T-slit helm with a nasal.' }, { id: 'winged', name: 'Winged Helm', desc: 'Gilded wings and a turning halo.', special: true }, { id: 'crowned', name: 'Crown of the Fallen King', desc: 'A gold crown over a burning visor.', special: true }],
    pauldronL: [{ id: 'segmented', name: 'Segmented', desc: 'Layered lames that rattle.' }, { id: 'spiked', name: 'Spiked', desc: 'A rounded cap with three spikes.' }, { id: 'lion', name: 'Lionheart', desc: 'A roaring lion with a swaying mane.', special: true }, { id: 'sunburst', name: 'Sunburst', desc: 'Gilded rays round a glowing sun stone.', special: true }],
    pauldronR: [{ id: 'segmented', name: 'Segmented', desc: 'Layered lames that rattle.' }, { id: 'spiked', name: 'Spiked', desc: 'A rounded cap with three spikes.' }, { id: 'lion', name: 'Lionheart', desc: 'A roaring lion with a swaying mane.', special: true }, { id: 'sunburst', name: 'Sunburst', desc: 'Gilded rays round a glowing sun stone.', special: true }],
    chest: [{ id: 'plate', name: 'Plate & Tabard', desc: 'A ridged breastplate over a tabard.' }, { id: 'mail', name: 'Mail Surcoat', desc: 'Chain mail under a long split surcoat.' }, { id: 'radiant', name: 'Radiant Mantle', desc: 'Plate and a long flowing cape.', special: true }, { id: 'dragonscale', name: 'Dragonscale', desc: 'Overlapping scales and a burning heart stone.', special: true }],
    legs: [{ id: 'greaves', name: 'Greaves', desc: 'Tassets, knee cops and sabatons.' }, { id: 'mailskirt', name: 'Mail Skirt', desc: 'A long chain skirt and tall boots.' }, { id: 'kingsguard', name: 'Kingsguard', desc: 'Gold-edged tassets and lions at the knee.', special: true }, { id: 'ember', name: 'Emberforged', desc: 'Molten cracks glowing down the shins.', special: true }],
    sword: [{ id: 'longsword', name: 'Longsword', desc: 'A plain fullered blade.' }, { id: 'falchion', name: 'Falchion', desc: 'A broad blade that widens to the tip.' }, { id: 'dawn', name: 'Dawnblade', desc: 'A blade with a burning gold fuller.', special: true }, { id: 'frostbrand', name: 'Frostbrand', desc: 'A blade of blue ice growing crystals.', special: true }],
    shield: [{ id: 'heater', name: 'Heater Shield', desc: 'A cross on a field.' }, { id: 'round', name: 'Round Shield', desc: 'Boards, a rim and a big boss.' }, { id: 'kite', name: 'Sun Kite', desc: 'A tall kite shield with a glowing sun.', special: true }, { id: 'dragon', name: 'Dragon Crest', desc: 'A gold dragon with burning eyes.', special: true }],
  },
  rogue: {
    mask: [{ id: 'wrap', name: 'Face Wrap', desc: 'A dark wrap and a scarf.' }, { id: 'iron', name: 'Iron Half-Mask', desc: 'A riveted mask with breathing slits.' }, { id: 'bone', name: 'Bone Mask', desc: 'A cracked skull face with burning eyes.', special: true }, { id: 'kitsune', name: 'Kitsune', desc: 'A white fox mask with glowing slit eyes.', special: true }],
    cloak: [{ id: 'tattered', name: 'Tattered Cloak', desc: 'A deep hood and three ragged panels.' }, { id: 'mantle', name: 'Short Mantle', desc: 'A hood and a shoulder cape.' }, { id: 'wraith', name: 'Wraith Shroud', desc: 'Ghostly wisps stream from it.', special: true }, { id: 'raven', name: 'Raven Cloak', desc: 'Black feathers and a feathered collar.', special: true }],
    shirt: [{ id: 'jerkin', name: 'Jerkin', desc: 'Crossed straps, pouches and wraps.' }, { id: 'brigandine', name: 'Brigandine', desc: 'A studded vest over a high collar.' }, { id: 'assassin', name: "Assassin's Garb", desc: 'A crimson sash and a bandolier of knives.', special: true }, { id: 'shadowweave', name: 'Shadowweave', desc: 'Violet runes glowing through it.', special: true }],
    bandL: [{ id: 'cloth', name: 'Cloth Band', desc: 'A tied strip of cloth.' }, { id: 'bracer', name: 'Buckled Bracer', desc: 'Leather with a steel buckle.' }, { id: 'serpent', name: 'Serpent Coil', desc: 'A bronze snake with ruby eyes.', special: true }, { id: 'blade', name: 'Hidden Blade', desc: 'A bracer with a blade along the arm.', special: true }],
    bandR: [{ id: 'cloth', name: 'Cloth Band', desc: 'A tied strip of cloth.' }, { id: 'bracer', name: 'Buckled Bracer', desc: 'Leather with a steel buckle.' }, { id: 'serpent', name: 'Serpent Coil', desc: 'A bronze snake with ruby eyes.', special: true }, { id: 'blade', name: 'Hidden Blade', desc: 'A bracer with a blade along the arm.', special: true }],
    knives: [{ id: 'curved', name: 'Curved Daggers', desc: 'Swept guards and hooked points.' }, { id: 'stiletto', name: 'Stilettos', desc: 'Long thin spikes.' }, { id: 'spectral', name: 'Spectral Blades', desc: 'Blades of red ghost-light.', special: true }, { id: 'fang', name: 'Beast Fangs', desc: 'Serrated fangs of bone.', special: true }],
  },
  mage: {
    shoulder: [{ id: 'mantle', name: 'Rune Mantle', desc: 'A coat mantle with a rune.' }, { id: 'pauldron', name: 'Steel Pauldron', desc: 'A plated shoulder.' }, { id: 'crystal', name: 'Crystal Crown', desc: 'Crystal shards and a crown of orbiting crystals.', special: true }, { id: 'phoenix', name: 'Phoenix', desc: 'Feathers of living flame.', special: true }],
    shirt: [{ id: 'runecoat', name: 'Rune Coat', desc: 'A high collar and split tails.' }, { id: 'robe', name: 'Long Robe', desc: 'A robe to the ankles with a sash.' }, { id: 'starcape', name: 'Star Cape', desc: 'The rune coat and a star-flecked cape.', special: true }, { id: 'archmage', name: 'Archmage Robe', desc: 'A towering collar, gold chains, glowing runes.', special: true }],
    pants: [{ id: 'trousers', name: 'Trousers', desc: 'Plain trousers and boots.' }, { id: 'greaves', name: 'Greaved Boots', desc: 'Steel shin guards.' }, { id: 'runed', name: 'Runed Leggings', desc: 'Rune bands glowing round the shins.', special: true }, { id: 'astral', name: 'Astral Leggings', desc: 'Star-flecked, with shards circling the knees.', special: true }],
    wand: [{ id: 'rune', name: 'Rune Wand', desc: 'Dark wood tipped with a glowing gem.' }, { id: 'bone', name: 'Bone Wand', desc: 'A carved bone with a small skull.' }, { id: 'starfall', name: 'Starfall', desc: 'A star circling a silver tip.', special: true }, { id: 'ember', name: 'Ember Wand', desc: 'Charred wood crowned with fire.', special: true }],
    sword: [{ id: 'runeblade', name: 'Rune Blade', desc: 'A blade of blue light.' }, { id: 'steel', name: 'Steel Sword', desc: 'A plain arming sword.' }, { id: 'moonblade', name: 'Moonblade', desc: 'A crescent of pale moonlight.', special: true }, { id: 'voidedge', name: 'Voidedge', desc: 'Black steel with a violet void at its core.', special: true }],
  },
};
// The Last Crusade: the pieces' display names and descriptions (crusadekit.js); ids unchanged
for (const [kind, slots] of Object.entries(PIECES)) for (const [slot, list] of Object.entries(slots)) {
  const N = CRUSADE_NAMES[kind]?.[slot.replace(/[LR]$/, '')];
  if (N) for (const p of list) if (N[p.id]) [p.name, p.desc] = N[p.id];
}
export const pieceList = (kind, slot) => PIECES[kind]?.[slot] || [];
export const pieceById = (kind, slot, id) => pieceList(kind, slot).find((p) => p.id === id) || pieceList(kind, slot)[0];
export const piecePrice = (p, i, slot) => (i === 0 ? 0 : BIG.has(slot) ? (p.special ? PRICE.special : PRICE.piece) : (p.special ? PRICE.smallSpecial : PRICE.smallPiece));
export const pieceKey = (kind, slot, id) => `${kind}.${slot}.${id}`;

// ---------- an account's emeralds, what it owns, what it wears ----------
const blank = () => ({ pieces: {}, colors: {} });
export function emptyOutfits() { return { active: 0, slots: Array.from({ length: OUTFIT_SLOTS }, blank) }; }
export function cosmetics(data) {
  data.cosmetics ??= { pieces: [], colors: [] };
  data.outfits ??= {};
  for (const k of Object.keys(SLOTS)) data.outfits[k] ??= emptyOutfits();
  data.emeralds ??= 0;
  return data;
}
export const ownsPiece = (data, kind, slot, id) => pieceList(kind, slot)[0]?.id === id || !!data?.cosmetics?.pieces.includes(pieceKey(kind, slot, id));
export const ownsColor = (data, id) => id === 'default' || !!data?.cosmetics?.colors.includes(id);

// the outfit a character wears: { slot: { piece, main, trim } } (colour ids; 'default' = the piece's own colours)
export function wornOutfit(data, kind) {
  const o = data?.outfits?.[kind], fit = o?.slots?.[o.active || 0] || blank(), out = {};
  for (const s of SLOTS[kind] || []) {
    const id = fit.pieces[s.id], c = fit.colors[s.id] || [];
    out[s.id] = {
      piece: id && ownsPiece(data, kind, s.id, id) ? id : pieceList(kind, s.id)[0].id,
      main: c[0] && ownsColor(data, c[0]) ? c[0] : 'default',
      trim: c[1] && ownsColor(data, c[1]) ? c[1] : 'default',
    };
  }
  return out;
}
// to and from the wire (a teammate's outfit rides in the room roster): "helmet=winged/gold/default,..."
export const packOutfit = (fit) => Object.entries(fit || {}).map(([s, v]) => `${s}=${v.piece}/${v.main}/${v.trim}`).join(',');
export function unpackOutfit(kind, str) {
  const out = {};
  for (const part of String(str || '').split(',')) {
    const [s, v] = part.split('='); if (!s || !v) continue;
    const [piece, main, trim] = v.split('/');
    if (!SLOTS[kind]?.some((x) => x.id === s)) continue;
    out[s] = { piece: pieceById(kind, s, piece).id, main: colorById(main) ? main : 'default', trim: colorById(trim) ? trim : 'default' };
  }
  return out;
}

// ---------- the move from kill-unlocked skins (once per account) ----------
// emeralds for every kill so far; skins already unlocked become pieces and colours; the equipped one becomes outfit 1
const OLD_SKINS = {
  knight: { ember: [100, ['crimson', 'gold'], []], night: [250, ['charcoal', 'violet'], []], paladin: [500, ['ivory', 'gilded'], ['helmet.winged', 'chest.radiant', 'sword.dawn', 'shield.kite']] },
  rogue: { ash: [100, ['bone', 'iron'], []], viper: [250, ['charcoal', 'forest'], []], wraith: [500, ['voidcloth', 'crimson'], ['mask.bone', 'cloak.wraith', 'knives.spectral']] },
  mage: { ember: [100, ['crimson', 'gold'], []], verdant: [250, ['forest', 'ivory'], []], starborn: [500, ['voidcloth', 'violet'], ['shoulder.crystal', 'shirt.starcape']] },
};
// how each old skin looked, as an outfit (applied to outfit 1 if it was equipped)
const OLD_LOOKS = {
  knight: {
    ember: { chest: ['crimson', 'crimson'], pauldronL: ['crimson', 'gold'], pauldronR: ['crimson', 'gold'], helmet: ['crimson', 'gold'], legs: ['crimson', 'crimson'], shield: ['crimson', 'gold'] },
    night: { chest: ['charcoal', 'violet'], pauldronL: ['charcoal', 'violet'], pauldronR: ['charcoal', 'violet'], helmet: ['charcoal', 'violet'], legs: ['charcoal', 'charcoal'], shield: ['charcoal', 'violet'] },
    paladin: { pieces: { helmet: 'winged', chest: 'radiant', sword: 'dawn', shield: 'kite' }, chest: ['ivory', 'gilded'], helmet: ['ivory', 'gilded'], pauldronL: ['ivory', 'gilded'], pauldronR: ['ivory', 'gilded'], legs: ['ivory', 'ivory'], shield: ['ivory', 'gilded'] },
  },
  rogue: {
    ash: { cloak: ['bone', 'iron'], mask: ['iron', 'bone'], shirt: ['iron', 'iron'] },
    viper: { cloak: ['charcoal', 'forest'], mask: ['charcoal', 'forest'], shirt: ['charcoal', 'forest'] },
    wraith: { pieces: { mask: 'bone', cloak: 'wraith', knives: 'spectral' }, cloak: ['voidcloth', 'crimson'] },
  },
  mage: {
    ember: { shirt: ['crimson', 'gold'], shoulder: ['crimson', 'gold'] },
    verdant: { shirt: ['forest', 'ivory'], shoulder: ['forest', 'ivory'] },
    starborn: { pieces: { shoulder: 'crystal', shirt: 'starcape' }, shirt: ['voidcloth', 'violet'], shoulder: ['voidcloth', 'violet'] },
  },
};
export function migrateCosmetics(data) {
  if (!data || data.cosmeticsV1) return 0;
  cosmetics(data);
  const kills = Object.values(data.kills || {}).reduce((a, b) => a + (b || 0), 0);
  data.emeralds += kills;
  for (const [kind, skins] of Object.entries(OLD_SKINS)) {
    const k = data.kills?.[kind] || 0;
    for (const [id, [need, colors, pieces]] of Object.entries(skins)) {
      if (k < need) continue;
      for (const c of colors) if (!data.cosmetics.colors.includes(c)) data.cosmetics.colors.push(c);
      for (const p of pieces) { const key = `${kind}.${p}`; if (!data.cosmetics.pieces.includes(key)) data.cosmetics.pieces.push(key); }
      if (data.skins?.[kind] === id) {
        const look = OLD_LOOKS[kind][id], fit = data.outfits[kind].slots[0];
        Object.assign(fit.pieces, look.pieces || {});
        for (const [s, v] of Object.entries(look)) if (s !== 'pieces') fit.colors[s] = v;
      }
    }
  }
  data.cosmeticsV1 = true;
  return kills;
}

// ---------- materials for colours, including the moving effect colours ----------
const moving = new Set();
let voidTex = null;
function starTexture() {
  if (voidTex) return voidTex;
  const c = document.createElement('canvas'); c.width = c.height = 16;
  const g = c.getContext('2d'); g.fillStyle = '#0e0a18'; g.fillRect(0, 0, 16, 16);
  for (const [x, y, col] of [[2, 3, '#fff'], [9, 1, '#c8b8ff'], [13, 7, '#fff'], [5, 10, '#9ab8ff'], [11, 13, '#fff'], [1, 14, '#c8b8ff'], [7, 6, '#ffffff']]) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
  voidTex = new THREE.CanvasTexture(c); voidTex.magFilter = voidTex.minFilter = THREE.NearestFilter; voidTex.wrapS = voidTex.wrapT = THREE.RepeatWrapping; voidTex.colorSpace = THREE.SRGBColorSpace;
  return voidTex;
}
// a material for colour `id` (or the piece's own `fallback` hex for 'default')
export function colorMat(r, id, fallback) {
  const c = id && id !== 'default' ? colorById(id) : null;
  if (!c) return r.m(fallback);
  if (!c.fx) return r.m(c.hex);
  const m = new THREE.MeshLambertMaterial({ color: c.hex, flatShading: true });
  if (c.fx === 'molten') { m.emissive = new THREE.Color(0xff4a10); m.userData.fx = 'molten'; }
  else if (c.fx === 'frost') { m.emissive = new THREE.Color(0x3a8ac8); m.userData.fx = 'frost'; }
  else if (c.fx === 'void') { m.map = starTexture(); m.color.set(0xffffff); m.emissive = new THREE.Color(0x2a1048); m.userData.fx = 'void'; }
  else if (c.fx === 'gilded') { m.emissive = new THREE.Color(0xffc040); m.userData.fx = 'gilded'; }
  moving.add(m);
  return m;
}
export const colorHex = (id, fallback) => (id && id !== 'default' ? colorById(id)?.hex ?? fallback : fallback);
// each frame: molten pulses, frost shimmers, voidcloth's stars drift, gilded flashes
export function tickOutfitColors(t) {
  for (const m of moving) {
    const fx = m.userData.fx;
    if (fx === 'molten') m.emissiveIntensity = 0.35 + 0.3 * Math.sin(t * 3.1) + 0.1 * Math.sin(t * 7.3);
    else if (fx === 'frost') m.emissiveIntensity = 0.25 + 0.2 * Math.sin(t * 2.2);
    else if (fx === 'void') { m.emissiveIntensity = 0.4 + 0.25 * Math.sin(t * 1.3); m.map.offset.set(t * 0.03, t * 0.05); }
    else if (fx === 'gilded') m.emissiveIntensity = Math.max(0.05, Math.pow(Math.max(0, Math.sin(t * 1.7)), 12) * 0.9);
  }
}
// forget the effect materials of a rig that is gone (the customizer rebuilds its preview often)
export function forgetRig(root) { root?.traverse((o) => { if (o.material) moving.delete(o.material); }); }
