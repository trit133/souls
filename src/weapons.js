// Weapons: each class starts with one, and each region adds one more per class, built at the Sanctum's workbench
// from that region's materials (items.js). A new weapon isn't stronger, just different: its own moves and combos
// (weaponmoves.js), its own special on the block / parry / plasma button, and its own evolution. Each weapon has one
// evolution, built at the workbench too; it only works on its own weapon. Weapons are equipped, and their evolution
// switched on or off, at the equipment stand in the Sanctum.
//
// On the account: data.weapons = { owned: { id: 1 }, evos: { evoId: 1 }, equip: { kind: id }, evoOn: { weaponId: 1 } }.
// The starting weapons are always owned.

export const WEAPONS = {
  // ---- the starting weapons ----
  sword: { kind: 'knight', region: null, name: 'Power Sword & Aegis', short: 'Sword & Shield', icon: 'w_sword', slots: ['sword', 'shield'],
    desc: 'A broad power sword and a tower shield. Steady cuts, a shield to hide behind.',
    special: { name: 'Block', desc: 'Hold to raise your shield: hits from the front cost stamina instead of health. Heavy right after a block for a counter.' },
    evo: { id: 'aegisRam', name: 'Aegis Ram', desc: 'Block + heavy charges behind an electromagnetic barrier, knocking enemies back (20 s cooldown); attack right after it for a leaping overhead.',
      recipe: { scrap_iron: 8, spent_casings: 6, copper_coil: 4, cracked_lens: 2, servo_motor: 2 } } },
  daggers: { kind: 'rogue', region: null, name: 'Mono-Knives', short: 'Twin Knives', icon: 'w_daggers', slots: ['knives'],
    desc: 'A knife in each hand. Fast cuts and a parry that opens enemies up for a killing stab.',
    special: { name: 'Parry', desc: 'Time it just before a hit lands to stagger the attacker, then attack for a critical stab.' },
    evo: { id: 'redRiposte', name: 'Red Riposte', desc: 'Parry window +50 ms, a 5 s parry cooldown, and a parry blinks you behind the enemy for an instant backstab.',
      recipe: { ash_rag: 8, spent_casings: 6, promethium_residue: 4, cracked_lens: 2, purity_seal: 2 } } },
  spellknife: { kind: 'mage', region: null, name: 'Focus Rod & Knife', short: 'Rod & Knife', icon: 'w_spellknife', slots: ['wand', 'sword'],
    desc: 'A knife whose cuts charge your mana, and a focus rod for bolts and plasma.',
    special: { name: 'Plasma Charge', desc: 'An exploding plasma charge (75 mana).' },
    evo: { id: 'twinPlasma', name: 'Twin Plasma', desc: 'Your plasma charge splits into two larger plasma charges.',
      recipe: { ash_rag: 6, scrap_iron: 6, promethium_residue: 4, copper_coil: 2, purity_seal: 1, servo_motor: 1 } } },

  // ---- The Shattered March ----
  greatsword: { kind: 'knight', region: 'r1', name: 'Penitent Slab', short: 'Greatsword', icon: 'w_greatsword', slots: ['greatsword'],
    desc: 'Too big to be called a sword: a slab of raw iron swung with both hands. Slow, wide, crushing; it cleaves through crowds.',
    recipe: { scrap_iron: 14, spent_casings: 8, ash_rag: 6, copper_coil: 4, promethium_residue: 3, servo_motor: 2, augury_shard: 2, oracle_core: 1 },
    special: { name: 'Blade Guard', desc: 'Hold to raise the flat of the blade as a wall: blows barely move you, but you can hardly walk behind it and each one costs more stamina than a shield would.' },
    evo: { id: 'berserk', name: 'Beast Within', desc: 'Blade Guard + heavy: for 8 s nothing staggers you and you swing 25% faster, but you take 20% more damage (25 s cooldown).',
      recipe: { scrap_iron: 8, ash_rag: 6, promethium_residue: 4, purity_seal: 3, augury_shard: 1 } } },
  wristblade: { kind: 'rogue', region: 'r1', name: 'Wrist Blade', short: 'Wrist Blade', icon: 'w_wristblade', slots: ['wristblade'],
    desc: 'A blade along each forearm, running out past the fist. You fight like a boxer and every punch is a stab; its heavy drives both in at once.',
    recipe: { ash_rag: 14, spent_casings: 8, scrap_iron: 6, copper_coil: 4, cracked_lens: 3, purity_seal: 2, augury_shard: 2, oracle_core: 1 },
    special: { name: 'Blink Dash', desc: 'A short, very fast dash you can\'t be hit during. Ready again after 3 s.' },
    evo: { id: 'ghostVeil', name: 'Ghost Veil', desc: 'After a dash you fade from sight for 5 s and enemies lose you. Your first strike out of it is always a backstab: your arm shoved in and ripped out, a critical hit for triple damage. Attacking or reviving a teammate ends it.',
      recipe: { ash_rag: 8, spent_casings: 6, cracked_lens: 4, purity_seal: 3, augury_shard: 1 } } },
  psystaff: { kind: 'mage', region: 'r1', name: 'Psy-Staff', short: 'Staff', icon: 'w_psystaff', slots: ['staff'],
    desc: 'A long staff with a psychic focus at its head, fought with like a quarterstaff. Its strikes charge your mana; its heavy fires a violet laser down its length.',
    recipe: { scrap_iron: 12, copper_coil: 6, ash_rag: 6, spent_casings: 4, cracked_lens: 4, servo_motor: 2, augury_shard: 2, oracle_core: 1 },
    special: { name: 'Warding Sigil', desc: 'A wide circle at your feet for 6 s (35 mana): everything inside when you lay it freezes solid for 5 s (a boss or mini boss isn't frozen but chilled: it moves and swings at a crawl for 4 s); 10 s before you can lay another; enemies in it are slowed and their shots break on its edge.' },
    evo: { id: 'stormSigil', name: 'Storm Sigil', desc: 'Your sigil calls lightning down on an enemy inside it every 0.6 s.',
      recipe: { copper_coil: 6, scrap_iron: 6, cracked_lens: 4, servo_motor: 3, augury_shard: 1 } } },
};
export const BASE_WEAPON = { knight: 'sword', rogue: 'daggers', mage: 'spellknife' };
// the regions, in order (the crafting menu shows a slot for each, empty until the region is in the game)
export const WEAPON_REGIONS = [{ id: 'r1', name: 'The Shattered March' }, { id: 'r2', name: 'The Glass Wastes' }, { id: 'r3', name: 'The Forge Reaches' }];
export const weaponsOf = (kind) => Object.keys(WEAPONS).filter((id) => WEAPONS[id].kind === kind);
export const weaponFor = (kind, region) => weaponsOf(kind).find((id) => WEAPONS[id].region === region) || null;
export const evoOf = (weaponId) => WEAPONS[weaponId]?.evo || null;

// ---------- the account's armoury ----------
export function armoury(data) {
  const w = (data.weapons ||= {});
  w.owned ||= {}; w.evos ||= {}; w.equip ||= {}; w.evoOn ||= {};
  return w;
}
export const ownsWeapon = (data, id) => !WEAPONS[id]?.region || !!data?.weapons?.owned?.[id];
export const hasEvo = (data, evoId) => !!data?.weapons?.evos?.[evoId];
export function equippedWeapon(data, kind) {
  const id = data?.weapons?.equip?.[kind];
  return id && WEAPONS[id]?.kind === kind && ownsWeapon(data, id) ? id : BASE_WEAPON[kind];
}
// the evolution in play with this weapon (built and switched on), or null
export function activeEvo(data, weaponId) {
  const e = evoOf(weaponId);
  return e && hasEvo(data, e.id) && data?.weapons?.evoOn?.[weaponId] !== 0 ? e.id : null;
}
// what a character takes into a raid
export const loadout = (data, kind) => { const weapon = equippedWeapon(data, kind); return { weapon, evo: activeEvo(data, weapon) }; };

// a recipe against the stash: [{ id, need, have }], and whether it can be made
export function recipeState(data, recipe) {
  const rows = Object.entries(recipe || {}).map(([id, need]) => ({ id, need, have: data?.items?.[id] || 0 }));
  return { rows, ok: rows.every((r) => r.have >= r.need) };
}
export function spend(data, recipe) { for (const [id, n] of Object.entries(recipe)) data.items[id] -= n; }

// ---------- icons: 16 x 16, like the materials' ----------
const O = '#140e0a';
export const WEAPON_ICONS = {
  w_sword: { pal: { o: O, s: '#c8ccd2', S: '#8a8e96', g: '#b89a4a', b: '#8ad8ff', h: '#3a2616', r: '#5a1412', R: '#8a2a20' }, rows: [
    '..........oo....', '.........osso...', '........osbso...', '.......osbso....', '......osbso.....', '.ooo.osbso......', 'oRRRoosso.......',
    'oRrRRoso........', 'oRrrRggo........', 'oRrrRoghgo......', 'oRrRRo.ohho.....', 'oRRRRo..oho.....', '.oRRo....oo.....', '..oo............', '................', '................'] },
  w_daggers: { pal: { o: O, s: '#c4cad3', S: '#8a8e96', g: '#b89a4a', h: '#2a1c14', r: '#ff4a3a' }, rows: [
    '................', '.oo..........oo.', 'osso........osso', '.osso......osso.', '..osso....osso..', '...osso..osso...', '....osgoogso....',
    '.....oggggo.....', '.....oggggo.....', '....ohgoogho....', '...ohho..ohho...', '..ohho....ohho..', '..ooo......ooo..', '................', '................', '................'] },
  w_spellknife: { pal: { o: O, w: '#3a2a20', g: '#b89a4a', c: '#a8e8ff', s: '#8c929c', b: '#7ab4ff' }, rows: [
    '..oo........oo..', '.occo......osso.', '.occo.....osbso.', '..oo.....osbso..', '..ogo...osbso...', '..owo..osbso....', '..owo.ogsso.....',
    '..owo.oggo......', '..owo..owo......', '..owo..owo......', '..owo...oo......', '..owo...........', '..ogo...........', '..oo............', '................', '................'] },
  w_greatsword: { pal: { o: O, i: '#5a5a62', I: '#8a8a92', d: '#2a2a30', g: '#8a6a34', h: '#3a2616', r: '#ff7a2a' }, rows: [
    '.......oooo.....', '......oIiIdo....', '......oIiIdo....', '......oIiIdo....', '......oIiIdo....', '......oIiIdo....', '......oIiIdo....',
    '......oIiIdo....', '......oIiIdo....', '......oIiIdo....', '....oogggggoo...', '....oggrgrggo...', '.......ohho.....', '.......ohho.....', '.......oggo.....', '........oo......'] },
  w_wristblade: { pal: { o: O, s: '#d0d4dc', S: '#8a8e96', l: '#4a3626', L: '#6a5038', b: '#b89a4a' }, rows: [
    '...........oo...', '..........osso..', '.........osso...', '........osso....', '.......osso.....', '......osso......', '..ooooosoo......',
    '.oLLLLLbo.......', 'olLlLlLbo.......', 'oLLLLLLbo.......', 'olLlLlLbo.......', '.oLLLLLbo.......', '..ooooooo.......', '................', '................', '................'] },
  w_psystaff: { pal: { o: O, w: '#4a3a2a', W: '#6a5038', g: '#b89a4a', c: '#c890ff', C: '#f0e0ff' }, rows: [
    '...........oo...', '..........occo..', '.........ocCco..', '.........occco..', '........ogooo...', '.......owgo.....', '......owWo......',
    '.....owWo.......', '....owWo........', '...owWo.........', '..ogWo..........', '.owWo...........', 'owWo............', 'ogo.............', 'oo..............', '................'] },
};
const iconCache = new Map();
// the weapon's icon (shade: 'dark' draws it as a black silhouette with a faint edge, for one not yet made)
export function weaponIcon(id, px = 3, shade = null) {
  const I = WEAPON_ICONS[WEAPONS[id]?.icon], cv = document.createElement('canvas');
  cv.width = cv.height = 16; cv.className = 'item-ic';
  if (I) {
    const key = id + (shade || '');
    if (!iconCache.has(key)) {
      const c0 = document.createElement('canvas'); c0.width = c0.height = 16; const c = c0.getContext('2d');
      I.rows.forEach((row, y) => [...row].forEach((ch, x) => { const col = I.pal[ch]; if (!col) return; c.fillStyle = shade === 'dark' ? (ch === 'o' ? '#3a3028' : '#050404') : col; c.fillRect(x, y, 1, 1); }));
      iconCache.set(key, c0);
    }
    cv.getContext('2d').drawImage(iconCache.get(key), 0, 0);
  }
  cv.style.width = cv.style.height = 16 * px + 'px';
  return cv;
}
