// Items: materials (10 a region, common to legendary) found in raids in smashable supply drums and chests, and the
// gems the mini bosses drop (one shaped like each boss's head; a region's gems together let you past its gatekeeper
// to the region's main boss: not consumed, only needed). Each material has a gold value by rarity and region (shown
// for now; a bazaar will buy them later). What a raid can drop is per area (regions.js: AREAS[id].loot).
//
// What you pick up in a raid goes straight into the stash, kept even if you die (Game.raidLoot lists the raid's haul
// for the pouch). Gold is banked the moment it's earned.

export const RARITY = {
  common: { name: 'Common', color: '#b8b0a0', value: 5 },
  uncommon: { name: 'Uncommon', color: '#6ac85a', value: 15 },
  rare: { name: 'Rare', color: '#4a9aff', value: 50 },
  epic: { name: 'Epic', color: '#b05aff', value: 150 },
  legendary: { name: 'Legendary', color: '#ffa82a', value: 500 },
};
export const TIERS = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
export const REGION_WORTH = { r1: 1, r2: 2, r3: 4 }; // later regions' materials are worth more

// ---------- icons: 16 x 16, one character a pixel ('.' clear), each with its own palette ----------
const O = '#140e0a'; // the dark outline every icon shares
const ICON = {
  scrap: { pal: { o: O, a: '#6e6e74', b: '#a2a2aa', c: '#44444a', r: '#8a4a26', R: '#b8682e' }, rows: [
    '................',
    '.......oo.......',
    '.....ooabo......',
    '....oabbaaoo....',
    '...oabaaarcao...',
    '..oaaaaarRrcao..',
    '..oabaaaaraacao.',
    '.oaacaaaaaaaco..',
    '.oaaaaoaaaaaao..',
    '.ocaaoboaaraaco.',
    '..ocaaoaarRacao.',
    '...ocaaaaaracao.',
    '....occaaaaccoo.',
    '.....ooccccoo...',
    '.......oooo.....',
    '................'] },
  rag: { pal: { o: O, a: '#6e6252', b: '#8e8068', c: '#4a4036', s: '#2a2420', r: '#7a2a1e' }, rows: [
    '................',
    '..oo.....oo.....',
    '.oaboo.ooabo....',
    '.oabbaoaabbaoo..',
    '..oaaaaaaaaabo..',
    '..obaasaaarrao..',
    '.oabaassaarraoo.',
    '.oaaaaasaaaaabo.',
    '..oaacaaaasaaao.',
    '..oaacaaaassao..',
    '.oaaaaaaaaaaao..',
    '.obaaacaaacaao..',
    '..oaaocaaoocao..',
    '..ooo.oaao.oo...',
    '.......oo.......',
    '................'] },
  casings: { pal: { o: O, a: '#b08a3a', b: '#ecc878', c: '#7a5a20', d: '#3a2a10' }, rows: [
    '................',
    '................',
    '....oo......oo..',
    '...obao....obao.',
    '...obao.oo.obao.',
    '...obaoobaoobao.',
    '...obaoobaoobao.',
    '...obaoobaoobao.',
    '..oobacobaoobaco',
    '..obbaccbaoobaco',
    '..obaaccbacobaco',
    '..oaaacoaacoaaco',
    '..occccoccooccco',
    '..oddddoddo.dddo',
    '...oooo.oo..ooo.',
    '................'] },
  coil: { pal: { o: O, a: '#b8642a', b: '#f0a060', c: '#7a3a18' }, rows: [
    '................',
    '.......oo.......',
    '......obbo......',
    '....oobaaboo....',
    '...oaooooooao...',
    '...obbbbbbbbo...',
    '...occaaaaaco...',
    '...oaooooooao...',
    '...obbbbbbbbo...',
    '...occaaaaaco...',
    '...oaooooooao...',
    '...obbbbbbbbo...',
    '...occaaaaaco...',
    '....oooooooo....',
    '.......oco......',
    '........o.......'] },
  promethium: { pal: { o: O, g: '#7a9098', w: '#d0e4ea', l: '#ff6a1a', L: '#ffc050', k: '#6a4a2a', K: '#9a6a3a' }, rows: [
    '................',
    '......oooo......',
    '.....oKkKko.....',
    '.....okkkko.....',
    '......ogwo......',
    '......ogwo......',
    '.....ogggwo.....',
    '....oggggwwo....',
    '...ogLLLLLLgo...',
    '...olLLLLLLlo...',
    '...ollLlLlllo...',
    '...olllllllgo...',
    '...ollllllggo...',
    '....oggggggo....',
    '.....oooooo.....',
    '................'] },
  lens: { pal: { o: O, r: '#5a5a62', R: '#8a8a92', a: '#3a6a8a', b: '#8ac8f0', w: '#eaf8ff' }, rows: [
    '................',
    '.....oooooo.....',
    '....oRRRRRro....',
    '...oRaaabwaro...',
    '..oRaaaobwwaro..',
    '..oRaaabobwaro..',
    '..oRaabaaobaro..',
    '..oRabaaaaobro..',
    '..oRaaaaaaaoro..',
    '..oRaaaaabaaro..',
    '..orabaaaaaarro.',
    '...orraaaaarro..',
    '....orrrrrro....',
    '.....oooooo.....',
    '................',
    '................'] },
  servo: { pal: { o: O, a: '#6e7078', b: '#a8aab4', c: '#40424a', y: '#d8a020', s: '#c8c8d0' }, rows: [
    '................',
    '................',
    '...oooooooo.....',
    '..oabbbbbbao....',
    '..oaaaaaaaaoooo.',
    '..oyoyoyoyyosso.',
    '..ooyoyoyoyosso.',
    '..oaaaaaaaaoooo.',
    '..oaccacaccao...',
    '..oaaaaaaaaao...',
    '..occcccccco....',
    '...o.oooo.o.....',
    '..obo....obo....',
    '..ooo....ooo....',
    '................',
    '................'] },
  seal: { pal: { o: O, p: '#d8c8a0', P: '#a89870', r: '#9a1414', R: '#d83030', h: '#ff7a6a' }, rows: [
    '................',
    '.....oooooo.....',
    '....orRRRRro....',
    '...orRhRRRRro...',
    '...oRRrrrrRRo...',
    '...oRrRRRRrRo...',
    '...oRrRooRrRo...',
    '...oRRrrrrRRo...',
    '...orRRRRRRro...',
    '....orrrrrro....',
    '....opPoopPo....',
    '....oppo.ppo....',
    '....oPpo.pPo....',
    '....oppo.oppo...',
    '.....oo...oo....',
    '................'] },
  shard: { pal: { o: O, v: '#6a2ac0', V: '#a070ff', w: '#f0e0ff', d: '#3a1470' }, rows: [
    '........o.......',
    '.......owo......',
    '.......oVwo.....',
    '......oVVwo.....',
    '......oVvVwo....',
    '.....oVvvVwo....',
    '.....oVvvvVo....',
    '....oVvvdvVo....',
    '....oVvvdvvo....',
    '....oVvvdvvo....',
    '.....oVvdvo.....',
    '.....oVvvvo.....',
    '......oVvo......',
    '......oVvo......',
    '.......oo.......',
    '................'] },
  core: { pal: { o: O, m: '#5a4a2a', M: '#8a7040', y: '#ffc830', Y: '#fff2a0', e: '#e02010' }, rows: [
    '................',
    '.......oo.......',
    '.....ooMMoo.....',
    '....oMoooomo....',
    '...oMoyYYyomo...',
    '...omyYYYYyMo...',
    '..oMoyYeeYyoMo..',
    '..omoyeeeeyomo..',
    '..oMoyYeeYyoMo..',
    '...omyyYYyyMo...',
    '...oMoyyyyomo...',
    '....oMoooomo....',
    '.....ooMMoo.....',
    '......omMo......',
    '.....oooooo.....',
    '................'] },
  // the Bazaar's quest relics (traders.js): found hidden in a raid, handed to the trader who wants them
  grist_ledger: { pal: { o: O, l: '#5a3420', L: '#7a4a2c', p: '#d8ccb0', b: '#c8a040', d: '#2a1810' }, rows: [
    '................',
    '..oooooooooooo..',
    '..oLLLLLLLLLLo..',
    '..oLlllllllLpo..',
    '..oLlllllllLpo..',
    '..oLllbbbllLpo..',
    '..oLllbddbllpo..',
    '..oLllbbbllLpo..',
    '..oLlllllllLpo..',
    '..oLlllllllLpo..',
    '..oLlllllllLpo..',
    '..oLlllllllLpo..',
    '..oLLLLLLLLLpo..',
    '..oooooooooooo..',
    '................',
    '................'] },
  grist_coil: { pal: { o: O, c: '#b06a30', C: '#e09a50', r: '#ff3a1a', R: '#ffa070', m: '#4a4a52' }, rows: [
    '................',
    '......oooo......',
    '.....ommmmo.....',
    '....occCCcco....',
    '....oCCCCCCo....',
    '....occrrcco....',
    '....oCrRRrCo....',
    '....occrrcco....',
    '....oCCCCCCo....',
    '....occCCcco....',
    '....oCCCCCCo....',
    '....occcccco....',
    '.....ommmmo.....',
    '......oooo......',
    '................',
    '................'] },
  grist_bone: { pal: { o: O, g: '#7ab0c0', G: '#c8eef8', b: '#e8dcc0', B: '#b8a888', y: '#c8a040' }, rows: [
    '................',
    '.....oooooo.....',
    '....oyyyyyyo....',
    '....ogGGGGgo....',
    '....oGgbbgGo....',
    '....oGgbBgGo....',
    '....oGgbbgGo....',
    '....oGgbBgGo....',
    '....oGgbbgGo....',
    '....oGgBbgGo....',
    '....oGgbbgGo....',
    '....ogGGGGgo....',
    '....oyyyyyyo....',
    '.....oooooo.....',
    '................',
    '................'] },
  vesk_slate: { pal: { o: O, s: '#2a2c32', S: '#3e424a', g: '#5aff8a', G: '#b8ffc8', r: '#c41a14' }, rows: [
    '................',
    '..oooooooooooo..',
    '..oSSSSSSSSSSo..',
    '..oSssssssssSo..',
    '..oSsggggsssSo..',
    '..oSsssssssSSo..',
    '..oSsgggGgssSo..',
    '..oSsssssssssSo.',
    '..oSsggssssssSo.',
    '..oSssssssssSo..',
    '..oSsgGgggssSo..',
    '..oSssssssrrSo..',
    '..oSSSSSSSrrSo..',
    '..oooooooooooo..',
    '................',
    '................'] },
  vesk_icon: { pal: { o: O, i: '#4a4a52', I: '#7a7a84', y: '#c8a040', Y: '#ffe090', f: '#d8c8a0', r: '#8a1a14' }, rows: [
    '................',
    '.......oo.......',
    '......oyyo......',
    '.....oyIIyo.....',
    '....oyIiiIyo....',
    '...oyIiYYiIyo...',
    '...oyIiffiIyo...',
    '...oyIirriIyo...',
    '...oyIirriIyo...',
    '...oyIirriIyo...',
    '...oyIiiiiIyo...',
    '...oyIIIIIIyo...',
    '...oyyyyyyyyo...',
    '....oooooooo....',
    '................',
    '................'] },
  // the gems: each boss's head cut from stone
  gem_hask: { pal: { o: O, a: '#5a5e66', b: '#9aa0aa', c: '#34363c', r: '#ff3a1a', R: '#ffa070' }, rows: [
    '................',
    '......oooo......',
    '....oobbbboo....',
    '...obbaaaaaao...',
    '..obaaaaaaaaco..',
    '..obaaaaaaaaco..',
    '..oarrRRRRrrco..',
    '..ocooooooooco..',
    '..obaacaacaaco..',
    '..oaacaaaacaco..',
    '..obaaoaaoaaco..',
    '...oaaoaaoaco...',
    '...ocaaaaaaco...',
    '....occccco.....',
    '.....oooooo.....',
    '................'] },
  gem_vael: { pal: { o: O, a: '#4a8ab8', b: '#a8e0ff', c: '#285878', w: '#f0fcff', d: '#163448' }, rows: [
    '................',
    '.......oo.......',
    '......owbo......',
    '.....owbbao.....',
    '....obbaaaco....',
    '...obaaaaaaco...',
    '...obadaadaco...',
    '..obaawaawaaco..',
    '..obaaaaaaaaco..',
    '..oaaaaddaaaco..',
    '...oaaaaaaaco...',
    '...ocaaddaacco..',
    '....ocaaaacco...',
    '.....occcco.....',
    '......oooo......',
    '................'] },
  gem_gorrath: { pal: { o: O, a: '#3a3434', b: '#5a5050', l: '#ff5a10', L: '#ffb040', y: '#ffee90' }, rows: [
    '................',
    '....oo....oo....',
    '...obo....obo...',
    '...obooooooao...',
    '..obbaaaaaaaao..',
    '..obaLaaaaLaao..',
    '..oalLLaaLLlao..',
    '..oaaaaaaaaaao..',
    '..oaoyoyoyoyao..',
    '..oaolololoLao..',
    '..oaoyoyoyoyao..',
    '...oaaalLaaao...',
    '...oaaaLlaaao...',
    '....oaaaaaao....',
    '.....oooooo.....',
    '................'] },
};

// ---------- the items ----------
export const ITEMS = {
  // The Shattered March
  scrap_iron: { kind: 'mat', region: 'r1', rarity: 'common', name: 'Scrap Iron', icon: 'scrap', desc: 'Torn plate off a wrecked hab-block, still riveted.' },
  ash_rag: { kind: 'mat', region: 'r1', rarity: 'common', name: 'Ash Rag', icon: 'rag', desc: 'Scorched banner-cloth, stiff with soot.' },
  spent_casings: { kind: 'mat', region: 'r1', rarity: 'common', name: 'Spent Casings', icon: 'casings', desc: 'Brass from a war that ran out of targets.' },
  copper_coil: { kind: 'mat', region: 'r1', rarity: 'uncommon', name: 'Copper Coil', icon: 'coil', desc: 'Wound wire from a dead vox-relay.' },
  promethium_residue: { kind: 'mat', region: 'r1', rarity: 'uncommon', name: 'Promethium Residue', icon: 'promethium', desc: 'The last of a flamer\'s fuel. It still wants to burn.' },
  cracked_lens: { kind: 'mat', region: 'r1', rarity: 'uncommon', name: 'Cracked Lens', icon: 'lens', desc: 'A gun-sight\'s eye, split down the middle.' },
  servo_motor: { kind: 'mat', region: 'r1', rarity: 'rare', name: 'Servo Motor', icon: 'servo', desc: 'Pulled from a fallen servitor. Hums when warm.' },
  purity_seal: { kind: 'mat', region: 'r1', rarity: 'rare', name: 'Purity Seal', icon: 'seal', desc: 'Blessed wax and scripture, pressed onto armour that never came home.' },
  augury_shard: { kind: 'mat', region: 'r1', rarity: 'epic', name: 'Augury Shard', icon: 'shard', desc: 'Future-glass. Look into it too long and you see what comes next.' },
  oracle_core: { kind: 'mat', region: 'r1', rarity: 'legendary', name: 'Oracle Core', icon: 'core', desc: 'A piece of the engine the seers used to steal tomorrow.' },
  // gems (the mini bosses' heads)
  // the Bazaar's quest relics (traders.js): no worth of their own; the trader who wants one takes it
  grist_ledger: { kind: 'relic', region: 'r1', rarity: 'epic', name: 'Grist\'s Ledger', icon: 'grist_ledger', trader: 'grist', desc: 'A fat leather ledger with a brass clasp. Every debt in the March, in Mother Grist\'s spidery hand.' },
  grist_coil: { kind: 'relic', region: 'r1', rarity: 'epic', name: 'Memory Coil', icon: 'grist_coil', trader: 'grist', desc: 'A servo-skull\'s memory coil, still faintly warm. Something in it remembers a man\'s face.' },
  grist_bone: { kind: 'relic', region: 'r1', rarity: 'epic', name: 'Saint\'s Finger-Bone', icon: 'grist_bone', trader: 'grist', desc: 'A yellowed finger-bone in a little glass case, banded in tarnished brass.' },
  vesk_slate: { kind: 'relic', region: 'r1', rarity: 'epic', name: 'Sealed Data-Slate', icon: 'vesk_slate', trader: 'vesk', desc: 'A heavy slate under a red wax seal. Green script crawls across it when no one is looking.' },
  vesk_icon: { kind: 'relic', region: 'r1', rarity: 'epic', name: 'Icon of Saint Orsk', icon: 'vesk_icon', trader: 'vesk', desc: 'A palm-sized iron icon in a gilded arch: the saint, his hands bound in red.' },
  gem_hask: { kind: 'gem', region: 'r1', rarity: 'legendary', name: 'Penitent\'s Gem', icon: 'gem_hask', boss: 'hask', desc: 'Executor Hask\'s iron mask, cut in stone. Its slit still burns. Show it to the Shattered March\'s gatekeeper.' },
  gem_vael: { kind: 'gem', region: 'r1', rarity: 'legendary', name: 'Cryo Choir Gem', icon: 'gem_vael', boss: 'vael', desc: 'Sister Vael\'s face in frozen crystal. Show it to the Shattered March\'s gatekeeper.' },
  gem_gorrath: { kind: 'gem', region: 'r1', rarity: 'legendary', name: 'Slag Engine Gem', icon: 'gem_gorrath', boss: 'gorrath', desc: 'Gorrath\'s furnace head in cooled slag. Show it to the Shattered March\'s gatekeeper.' },
};
export const gemFor = (bossId) => Object.keys(ITEMS).find((k) => ITEMS[k].kind === 'gem' && ITEMS[k].boss === bossId);
export const itemValue = (id) => { const it = ITEMS[id]; return it && it.kind !== 'relic' ? RARITY[it.rarity].value * (REGION_WORTH[it.region] || 1) : 0; }; // (a relic has no price)
const matsOf = (region, rarity) => Object.keys(ITEMS).filter((k) => ITEMS[k].kind === 'mat' && ITEMS[k].region === region && ITEMS[k].rarity === rarity);

// ---------- rolling loot ----------
function weighted(r, w) { let x = r() * Object.values(w).reduce((a, b) => a + b, 0); for (const [k, v] of Object.entries(w)) if ((x -= v) <= 0) return k; return Object.keys(w)[0]; }
// a random material of this rarity from the region (falling back to the next rarity down if it has none)
export function rollMat(r, region, rarity) {
  for (let t = TIERS.indexOf(rarity); t >= 0; t--) { const l = matsOf(region, TIERS[t]); if (l.length) return l[Math.floor(r() * l.length)]; }
  return null;
}
export const rollRarity = (r, table) => weighted(r, table);
const below = (rarity) => TIERS[Math.max(0, TIERS.indexOf(rarity) - 1)];
// what a chest of a rarity holds: its top item(s) at that rarity and the rest a step or two lower. A party gets about
// half as much each (everyone gets the same)
export function rollChest(r, region, rarity, { big = false, party = false } = {}) {
  const out = {}, add = (id) => { if (id) out[id] = (out[id] || 0) + 1; };
  const tops = big ? 2 : 1, rest = (big ? 4 : 2) + Math.floor(r() * 2);
  for (let k = 0; k < tops; k++) add(rollMat(r, region, rarity));
  for (let k = 0; k < rest; k++) add(rollMat(r, region, r() < 0.6 ? below(rarity) : below(below(rarity))));
  return party ? halve(out, r) : out;
}
// a smashed drum: one or two bits off the area's drum table
export function rollDrum(r, region, table, party = false) {
  const out = {};
  for (let k = 0, n = party ? 1 : 1 + (r() < 0.4 ? 1 : 0); k < n; k++) { const id = rollMat(r, region, weighted(r, table)); if (id) out[id] = (out[id] || 0) + 1; }
  return out;
}
// about half of each stack (rounded at random), never less than one item in all
function halve(items, r) {
  const out = {};
  for (const [id, n] of Object.entries(items)) { const m = Math.floor(n / 2) + (n % 2 && r() < 0.5 ? 1 : 0); if (m) out[id] = m; }
  if (!Object.keys(out).length) { const best = Object.keys(items).sort((a, b) => TIERS.indexOf(ITEMS[b].rarity) - TIERS.indexOf(ITEMS[a].rarity))[0]; if (best) out[best] = 1; }
  return out;
}
export const addItems = (to, items, k = 1) => { for (const [id, n] of Object.entries(items)) { const m = Math.round(n * k); if (m > 0) to[id] = (to[id] || 0) + m; } return to; };
export const countItems = (items) => Object.values(items || {}).reduce((a, b) => a + b, 0);
export const itemsText = (items) => Object.entries(items).sort((a, b) => TIERS.indexOf(ITEMS[b[0]].rarity) - TIERS.indexOf(ITEMS[a[0]].rarity)).map(([id, n]) => `${ITEMS[id].name}${n > 1 ? ' ×' + n : ''}`).join(', ');

// ---------- drawing an icon ----------
const cache = new Map();
// a 16 x 16 canvas of the item's icon (shared; draw it scaled with image-rendering: pixelated)
export function iconCanvas(id) {
  const key = ITEMS[id]?.icon || id;
  if (cache.has(key)) return cache.get(key);
  const I = ICON[key], cv = document.createElement('canvas'); cv.width = cv.height = 16;
  if (I) { const c = cv.getContext('2d'); I.rows.forEach((row, y) => [...row].forEach((ch, x) => { const col = I.pal[ch]; if (col) { c.fillStyle = col; c.fillRect(x, y, 1, 1); } })); }
  cache.set(key, cv);
  return cv;
}
// an <img>-like element for the item, px pixels a dot
export function iconEl(id, px = 3) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 16; cv.className = 'item-ic';
  cv.getContext('2d').drawImage(iconCanvas(id), 0, 0);
  cv.style.width = cv.style.height = 16 * px + 'px';
  return cv;
}
