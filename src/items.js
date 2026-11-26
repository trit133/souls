// Items: materials (10 a region, common to legendary) found in raids in smashable supply drums and chests, and the
// gems the mini bosses drop (one shaped like each boss's head; a region's gems together let you past its gatekeeper
// to the region's main boss: not consumed, only needed). Each material has a gold value by rarity and region (shown
// for now; a bazaar will buy them later). What a raid can drop is per area (regions.js: AREAS[id].loot).
//
// What you pick up in a raid goes straight into the stash, kept even if you die (Game.raidLoot lists the raid's haul
// for the pouch). Gold is banked the moment it's earned.

export const RARITY = {
  common: { name: 'Common', color: '#b8b0a0', value: 25 },
  uncommon: { name: 'Uncommon', color: '#6ac85a', value: 80 },
  rare: { name: 'Rare', color: '#4a9aff', value: 400 },
  epic: { name: 'Epic', color: '#b05aff', value: 1500 },
  legendary: { name: 'Legendary', color: '#ffa82a', value: 6000 },
};
export const TIERS = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
// ---------- star tiers (2026-11-26) ----------
// Each rarity has four stars, and the whole ladder is geared down so it stretches over the game: an item's `rarity`
// is still its rank inside its own region (what the loot tables, chests and traders go by), but what it's called and
// the colour it shows are its place on the ladder: region 1's five ranks are Common ★1-★4 and Uncommon ★1 (the Oracle
// Core), region 2's Uncommon ★1-★4 and Rare ★1, and so on, so legendary waits for the last region.
// The colour: the rarity's own (grey, green, blue, violet, orange); each star above the first twinkles with the
// colour of a rarity further up (a Common ★2 grey with a green twinkle, ★3 a blue one, ★4 violet)
export const RANKS = [
  { name: 'Common', color: '#b8b0a0' }, { name: 'Uncommon', color: '#6ac85a' }, { name: 'Rare', color: '#4a9aff' },
  { name: 'Epic', color: '#b05aff' }, { name: 'Legendary', color: '#ffa82a' },
];
const REGION_BASE = { r1: 0, r2: 4, r3: 8, r4: 12, r5: 16 }; // (each region's first rank sits this far up the ladder)
// a tier 0..19 as { name: 'Common ★2', color, twinkle (a colour or null), rank, star }
export function tierInfo(t) {
  const rank = Math.min(4, Math.floor(t / 4)), star = t - rank * 4 + 1;
  const twinkle = star > 1 ? (RANKS[rank + star - 1]?.color || '#fff6d8') : null;
  return { t, rank, star, name: `${RANKS[rank].name} ${'★'.repeat(star)}`, short: `${RANKS[rank].name} ★${star}`, color: RANKS[rank].color, twinkle };
}
// an item's tier (a region's rank `rarity` placed on the ladder), and a chest's of a rank in a region
export const tierOf = (id) => { const it = ITEMS[id]; return (REGION_BASE[it?.region] ?? 0) + Math.max(0, TIERS.indexOf(it?.rarity)); };
export const itemTier = (id) => tierInfo(tierOf(id));
export const rankTier = (region, rarity) => tierInfo((REGION_BASE[region] ?? 0) + Math.max(0, TIERS.indexOf(rarity)));
// dress an element in an item's tier: its colour, and the twinkle for the stars above one (style.css .tw)
export function twinkle(el, id) {
  const T = typeof id === 'number' ? tierInfo(id) : itemTier(id);
  if (T.twinkle) { el.classList.add('tw'); el.style.setProperty('--tw', T.twinkle); el.style.setProperty('--twn', T.star - 1); }
  return T;
}
export const REGION_WORTH = { r1: 1, r2: 1.3, r3: 1.7 }; // later regions' materials are worth more (about a third more a region)

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
  // ---------- the Sunless Deep (region 2) ----------
  ore: { pal: { o: O, a: '#5a524a', b: '#7a7068', c: '#3a3430', r: '#b8682e', y: '#e8c060' }, rows: [
    '................',
    '................',
    '.....oooooo.....',
    '....oabbbaaoo...',
    '...oabbaaryaao..',
    '..oaaaarryaaaao.',
    '..oabaaaraaacao.',
    '.oaaaacaaaryaao.',
    '.oabaaaaaryaaco.',
    '.oaayraaaaaacao.',
    '.ocaaryaaabaaco.',
    '..ocaaaaaaaacco.',
    '...occaaaacccoo.',
    '....oocccccoo...',
    '......ooooo.....',
    '................'] },
  oil: { pal: { o: O, m: '#5a5a62', M: '#8a8a94', d: '#2a2a30', y: '#d8a020', Y: '#ffd060', k: '#1a140e' }, rows: [
    '................',
    '.......ooo......',
    '......oMmo......',
    '......oooo......',
    '.....oMMmmo.....',
    '....oMmmmmdo....',
    '...oMmyyyymdo...',
    '...oMyYYYyymdo..',
    '...oMyYkkYymdo..',
    '...oMyYkkYymdo..',
    '...oMyyYYyymdo..',
    '...oMmyyyymmdo..',
    '...oMmmmmmmddo..',
    '....oddddddoo...',
    '.....oooooo.....',
    '................'] },
  timber: { pal: { o: O, a: '#6a4a30', b: '#8a6440', c: '#4a3220', r: '#c8a878', n: '#9a9aa4' }, rows: [
    '................',
    '................',
    '.oo.........oo..',
    '.oaoo.....ooao..',
    '.obaaoo.ooaabo..',
    '..obaaaoaaabo...',
    '...obbaaaabo....',
    '....oaanaao.....',
    '....oaaaaao.....',
    '...obaaoaaco....',
    '..obaaoooaaco...',
    '.obaaco..oaaco..',
    '.orbco....ocaro.',
    '.ooo.......ooo..',
    '................',
    '................'] },
  rawglass: { pal: { o: O, a: '#5ab8d8', b: '#a8e8f8', w: '#f0fcff', d: '#2a6a88', s: '#4a4440' }, rows: [
    '................',
    '.........o......',
    '........obo.....',
    '....o...obo.....',
    '...obo.oabdo....',
    '...obao.abdo.o..',
    '...oabdoawdoobo.',
    '..oawbdoabdoabdo',
    '..oabdo.abdoabo.',
    '..oabdooabdabdo.',
    '..oabdoabdoabdo.',
    '.osssssssssssso.',
    '.ossssssssssso..',
    '..oooooooooooo..',
    '................',
    '................'] },
  glowcap: { pal: { o: O, t: '#3ad8c8', T: '#8af8e8', d: '#1a8a80', s: '#c8c0b0', S: '#8a8070', w: '#f0fffc' }, rows: [
    '................',
    '................',
    '.....oooooo.....',
    '...ootTTTTtoo...',
    '..otTTwTTTTTto..',
    '.otTTTTTTwTTtdo.',
    '.otttttttttttdo.',
    '..ooddddddddoo..',
    '.....osSSso.....',
    '.....osSSso.....',
    '.....osSSso.....',
    '....ossSSsso....',
    '....osssssso....',
    '.....oooooo.....',
    '................',
    '................'] },
  spool: { pal: { o: O, w: '#6a4a30', W: '#8a6440', m: '#8a8a94', M: '#c8c8d0', d: '#4a4a52' }, rows: [
    '................',
    '....oooooooo....',
    '...oWWWWWWWWo...',
    '...oowwwwwwoo...',
    '....omMmMmMo....',
    '....oMdMdMdo....',
    '....omMmMmMo....',
    '....oMdMdMdo....',
    '....omMmMmMo....',
    '....oMdMdMdo....',
    '...oowwwwwwoo...',
    '...oWWWWWWWWo...',
    '....oooooooo....',
    '..oMo.oMo.oMo...',
    '..odo.odo.odo...',
    '................'] },
  prism: { pal: { o: O, g: '#7a7a84', G: '#b8b8c4', r: '#ff5a5a', y: '#ffe060', c: '#5af0f0', v: '#a070ff', w: '#f8f8ff' }, rows: [
    '................',
    '.....oooooo.....',
    '...ooGGGGGGoo...',
    '..oGgwwwwwwgGo..',
    '..oGwwrrwwwwGo..',
    '.oGwwryyccwwwGo.',
    '.oGwwyyccvvwwGo.',
    '.oGwwwccvvwwwGo.',
    '.oGwwwwvvwwwwGo.',
    '.oGwwwwwwwwwwGo.',
    '..oGwwwwwwwwGo..',
    '..oGgwwwwwwgGo..',
    '...ooGGGGGGoo...',
    '.....oooooo.....',
    '................',
    '................'] },
  tooth: { pal: { o: O, m: '#6a6a74', M: '#a8a8b4', w: '#e0e0e8', d: '#3a3a42', r: '#8a4a26' }, rows: [
    '................',
    '..........oo....',
    '.........owo....',
    '........oMwo....',
    '.......oMMdo....',
    '......oMwMdo....',
    '.....oMMMddo....',
    '....oMwMMdo.....',
    '...oMMMMddo.....',
    '..oMwMMMddo.....',
    '..oMMMMdddo.....',
    '..ordrdrdro.....',
    '..orrrrrrro.....',
    '...ooooooo......',
    '................',
    '................'] },
  geode: { pal: { o: O, s: '#5a5450', S: '#7a7470', v: '#6a2ac0', V: '#a070ff', w: '#f0e0ff', d: '#3a1470' }, rows: [
    '................',
    '.....oooooo.....',
    '...oosSSSSsoo...',
    '..osSsdddddSso..',
    '.osSdvVVVVvdSso.',
    '.oSdvVwVVwVvdSo.',
    '.oSdVVVVVVVVdSo.',
    '.oSdVwVVVVwVdSo.',
    '.oSdvVVVwVVvdSo.',
    '.osSdvVVVVvdSso.',
    '..osSdddddddso..',
    '...oossssssoo...',
    '.....oooooo.....',
    '................',
    '................',
    '................'] },
  ember: { pal: { o: O, k: '#2a1a14', r: '#c8301a', R: '#ff6a1a', y: '#ffc040', w: '#fff4a0' }, rows: [
    '................',
    '.......o........',
    '......oRo.......',
    '.....oRyRo..o...',
    '....oRyRo..oRo..',
    '...ookRRkkoRyRo.',
    '..okkrRyRrkkRo..',
    '..okrRywyRrko...',
    '.okkRywwwyRkko..',
    '.okrRyywyyRrko..',
    '.okkrRRyRRrkko..',
    '..okkrrRrrkko...',
    '...ookkkkkoo....',
    '.....ooooo......',
    '................',
    '................'] },
  gem_lampking: { pal: { o: O, i: '#3a3a42', I: '#6a6a74', y: '#ffb040', Y: '#fff0a0', r: '#c83a1a' }, rows: [
    '................',
    '.......oo.......',
    '......oIIo......',
    '....ooiiiioo....',
    '...oIiiiiiiIo...',
    '..oIoyyooyyoIo..',
    '..oIoYYooYYoIo..',
    '..oIoyyooyyoIo..',
    '..oIiiiiiiiiIo..',
    '..oIoyYYYYyoIo..',
    '..oIoryyyyroIo..',
    '..oIiiiiiiiiIo..',
    '...oIIIIIIIIo...',
    '....oooooooo....',
    '................',
    '................'] },
  gem_borer: { pal: { o: O, m: '#5a5a62', M: '#9a9aa4', w: '#e0e0e8', f: '#8a5a5a', k: '#1a0e0e', r: '#c83a1a' }, rows: [
    '................',
    '.....oooooo.....',
    '...ooMMMMMMoo...',
    '..oMmwmwmwmwMo..',
    '..oMwoooooowMo..',
    '.oMmokkkkkkomMo.',
    '.oMwokrkkrkowMo.',
    '.oMmokkkkkkomMo.',
    '.oMwokkrrkkowMo.',
    '.oMmokkkkkkomMo.',
    '..oMwoooooowMo..',
    '..oMmwmwmwmwMo..',
    '...ooMMMMMMoo...',
    '.....oooooo.....',
    '................',
    '................'] },
  gem_hierophant: { pal: { o: O, s: '#9aa0b0', S: '#e0e8f8', w: '#ffffff', d: '#4a4e5a', v: '#a070ff' }, rows: [
    '................',
    '......oooo......',
    '....ooSSSSoo....',
    '...oSSwwwwSSo...',
    '..oSwwwSSwwwSo..',
    '..oSwwSSSSwwSo..',
    '..oSwSSsSSSwSo..',
    '..oSwSSSSSSwSo..',
    '..oSwwSSSSwwSo..',
    '..oSswwSSwwsSo..',
    '...oSsswwssSo...',
    '...odSSSSSSdo...',
    '....odvvvvdo....',
    '.....oooooo.....',
    '................',
    '................'] },
  kettle_gauge: { pal: { o: O, b: '#b8862a', B: '#f0c060', w: '#f0ead8', k: '#2a2a2a', r: '#d8301a' }, rows: [
    '................',
    '.......oo.......',
    '......oBBo......',
    '....oobbbboo....',
    '...obBwwwwbbo...',
    '..obwwkwwkwwbo..',
    '..oBwwwwwwwwbo..',
    '.obwkwwwwrwwkbo.',
    '.oBwwwwwrwwwwbo.',
    '.obwwwwkwwwwwbo.',
    '..oBwwwwwwwwbo..',
    '..obwkwwwwkwbo..',
    '...obbwwwwbbo...',
    '....oobbbboo....',
    '......oooo......',
    '................'] },
  sorrow_mirror: { pal: { o: O, s: '#c8c8d0', S: '#f0f0f8', g: '#c8a040', G: '#ffe090', v: '#7a5ab8', w: '#ffffff' }, rows: [
    '................',
    '.....oooooo.....',
    '....oGggggGo....',
    '...oGsSSSssgo...',
    '...ogSwwSssgo...',
    '...ogSwSssvgo...',
    '...ogSSssvvgo...',
    '...ogssssvvgo...',
    '....ogsvvvgo....',
    '.....oggggo.....',
    '.......oo.......',
    '......oGgo......',
    '......oggo......',
    '......oGgo......',
    '.......oo.......',
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
  // The Sunless Deep
  ore_chunk: { kind: 'mat', region: 'r2', rarity: 'common', name: 'Ore Chunk', icon: 'ore', desc: 'Rock shot through with rust and a glint of something brighter.' },
  lamp_oil: { kind: 'mat', region: 'r2', rarity: 'common', name: 'Lamp Oil', icon: 'oil', desc: 'A dented can of the oil that keeps the dark back. Lanternhold runs on it.' },
  pit_timber: { kind: 'mat', region: 'r2', rarity: 'common', name: 'Pit Timber', icon: 'timber', desc: 'Shoring from a played-out seam, still holding up nothing.' },
  raw_seerglass: { kind: 'mat', region: 'r2', rarity: 'uncommon', name: 'Raw Seer-Glass', icon: 'rawglass', desc: 'Uncut, and already you can almost see something moving in it.' },
  glowcap: { kind: 'mat', region: 'r2', rarity: 'uncommon', name: 'Glowcap', icon: 'glowcap', desc: 'A mushroom that gives its own light. The tunnel-folk eat them and see in the dark, for a while.' },
  rivet_spool: { kind: 'mat', region: 'r2', rarity: 'uncommon', name: 'Rivet Spool', icon: 'spool', desc: 'Belted rivets for a pneumatic gun. Heavy for its size.' },
  prism_lens: { kind: 'mat', region: 'r2', rarity: 'rare', name: 'Prism Lens', icon: 'prism', desc: 'Ground by a Glass-Wright. Light goes in white and comes out as every colour at once.' },
  borer_tooth: { kind: 'mat', region: 'r2', rarity: 'rare', name: 'Borer Tooth', icon: 'tooth', desc: 'A cutting tooth off a drilling engine, part steel and part something that grew.' },
  geode_heart: { kind: 'mat', region: 'r2', rarity: 'epic', name: 'Geode Heart', icon: 'geode', desc: 'Split open, it is full of violet seer-glass, and it is warm.' },
  kiln_ember: { kind: 'mat', region: 'r2', rarity: 'legendary', name: 'Kiln Ember', icon: 'ember', desc: 'A coal from the Crucible that will not go out. The first seer-glass was fired over one like it.' },
  // gems (the mini bosses' heads)
  // the Bazaar's quest relics (traders.js): no worth of their own; the trader who wants one takes it
  grist_ledger: { kind: 'relic', region: 'r1', rarity: 'epic', name: 'Grist\'s Ledger', icon: 'grist_ledger', trader: 'grist', desc: 'A fat leather ledger with a brass clasp. Every debt in the March, in Mother Grist\'s spidery hand.' },
  grist_coil: { kind: 'relic', region: 'r1', rarity: 'epic', name: 'Memory Coil', icon: 'grist_coil', trader: 'grist', desc: 'A servo-skull\'s memory coil, still faintly warm. Something in it remembers a man\'s face.' },
  grist_bone: { kind: 'relic', region: 'r1', rarity: 'epic', name: 'Saint\'s Finger-Bone', icon: 'grist_bone', trader: 'grist', desc: 'A yellowed finger-bone in a little glass case, banded in tarnished brass.' },
  vesk_slate: { kind: 'relic', region: 'r1', rarity: 'epic', name: 'Sealed Data-Slate', icon: 'vesk_slate', trader: 'vesk', desc: 'A heavy slate under a red wax seal. Green script crawls across it when no one is looking.' },
  vesk_icon: { kind: 'relic', region: 'r1', rarity: 'epic', name: 'Icon of Saint Orsk', icon: 'vesk_icon', trader: 'vesk', desc: 'A palm-sized iron icon in a gilded arch: the saint, his hands bound in red.' },
  kettle_gauge: { kind: 'relic', region: 'r2', rarity: 'epic', name: 'Kettle\'s Gauge', icon: 'kettle_gauge', trader: 'kettle', desc: 'A brass pressure gauge on a stub of pipe, its needle stuck just short of the red.' },
  sorrow_mirror: { kind: 'relic', region: 'r2', rarity: 'epic', name: 'Silver Hand-Mirror', icon: 'sorrow_mirror', trader: 'sorrow', desc: 'Tarnished silver round a glass gone violet. Something in it moves when you don\'t.' },
  gem_hask: { kind: 'gem', region: 'r1', rarity: 'legendary', name: 'Penitent\'s Gem', icon: 'gem_hask', boss: 'hask', desc: 'Executor Hask\'s iron mask, cut in stone. Its slit still burns. Show it to the Shattered March\'s gatekeeper.' },
  gem_vael: { kind: 'gem', region: 'r1', rarity: 'legendary', name: 'Cryo Choir Gem', icon: 'gem_vael', boss: 'vael', desc: 'Sister Vael\'s face in frozen crystal. Show it to the Shattered March\'s gatekeeper.' },
  gem_gorrath: { kind: 'gem', region: 'r1', rarity: 'legendary', name: 'Slag Engine Gem', icon: 'gem_gorrath', boss: 'gorrath', desc: 'Gorrath\'s furnace head in cooled slag. Show it to the Shattered March\'s gatekeeper.' },
  gem_lampking: { kind: 'gem', region: 'r2', rarity: 'legendary', name: 'Lamp-King\'s Gem', icon: 'gem_lampking', boss: 'lampking', desc: 'His lantern-cage, cut in stone, a fire still burning behind the bars. Show it to the Sunless Deep\'s gatekeeper.' },
  gem_borer: { kind: 'gem', region: 'r2', rarity: 'legendary', name: 'Borer Gem', icon: 'gem_borer', boss: 'borer', desc: 'The Mother Borer\'s drill-mouth in polished steel. Show it to the Sunless Deep\'s gatekeeper.' },
  gem_hierophant: { kind: 'gem', region: 'r2', rarity: 'legendary', name: 'Hierophant\'s Gem', icon: 'gem_hierophant', boss: 'hierophant', desc: 'A mirror where his face was. Look into it and something looks back. Show it to the Sunless Deep\'s gatekeeper.' },
};
export const gemFor = (bossId) => Object.keys(ITEMS).find((k) => ITEMS[k].kind === 'gem' && ITEMS[k].boss === bossId);
export const GEM_WORTH = 40000; // a mini boss's gem: worth far more than any material
export const itemValue = (id) => { const it = ITEMS[id]; return it && it.kind !== 'relic' ? (it.kind === 'gem' ? GEM_WORTH : RARITY[it.rarity].value) * (REGION_WORTH[it.region] || 1) : 0; }; // (a relic has no price)
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
