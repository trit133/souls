// A region's master beaten: a permanent buff to carry into the next region, picked from three, one per character
// (2026-11-26). Each character's Sanctum has a trophy shelf with a place for each region's master (four regions,
// then the last): a slot stays black until that character has beaten that master, then holds the master's head, and
// shows which buff they took.
// On the account: data.regionBuffs = { knight: { r1: 'hp' | 'dmg' | 'res' }, ... }.
import * as THREE from 'three';

export const BUFFS = {
  hp: { name: 'Iron Constitution', desc: '+15% health', icon: '♥' },
  dmg: { name: 'Killing Edge', desc: '+10% damage', icon: '⚔' },
  res: { name: (kind) => (kind === 'mage' ? 'Deep Well' : 'Second Breath'), desc: (kind) => (kind === 'mage' ? '+25% mana' : '+25% stamina'), icon: '✦' },
};
const nameOf = (k, kind) => (typeof BUFFS[k].name === 'function' ? BUFFS[k].name(kind) : BUFFS[k].name);
const descOf = (k, kind) => (typeof BUFFS[k].desc === 'function' ? BUFFS[k].desc(kind) : BUFFS[k].desc);
// the shelf's four places: each region's master (the fifth, the last one, has no shelf place: there's nothing after)
export const MASTERS = [
  { region: 'r1', boss: 'varek', name: 'Archon Varek', head: 'varek', color: 0xff8a3a },
  { region: 'r2', boss: 'kilnfather', name: 'the Kilnfather', head: 'kiln', color: 0xff5a10 },
  { region: 'r3', boss: null, name: 'the master of the Forge Reaches', head: null, color: 0xd8402a },
  { region: 'r4', boss: null, name: 'the master of the Drowned Choir', head: null, color: 0x5a8a6a },
];
export const buffsOf = (data, kind) => data?.regionBuffs?.[kind] || {};
// what a character's buffs add up to (player.js): multipliers on health, damage and mana / stamina
export function buffMul(data, kind) {
  const B = Object.values(buffsOf(data, kind));
  const n = (k) => B.filter((x) => x === k).length;
  return { hp: 1 + 0.15 * n('hp'), dmg: 1 + 0.1 * n('dmg'), res: 1 + 0.25 * n('res') };
}
export const needsPick = (data, kind, region) => !!data && MASTERS.some((m) => m.region === region) && !buffsOf(data, kind)[region];

// the choice, over the victory screen: three cards; picking one saves it for this character
export function showPick(game, kind, region, charName) {
  const M = MASTERS.find((m) => m.region === region);
  const el = document.createElement('div'); el.id = 'rb-pick';
  el.innerHTML = `<div class="rb-box"><h2>${M.name} has fallen</h2>
    <p>Choose a strength to carry into the next region. <b>It's ${charName}'s alone</b>: each of your characters earns their own by beating ${M.name} themselves. You'll find it on the trophy shelf in ${charName}'s Sanctum.</p>
    <div class="rb-cards">${Object.keys(BUFFS).map((k) => `<button class="rb-card" data-k="${k}"><i>${BUFFS[k].icon}</i><b>${nameOf(k, kind)}</b><span>${descOf(k, kind)}, for good</span></button>`).join('')}</div></div>`;
  document.body.append(el);
  el.querySelectorAll('.rb-card').forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation();
    const d = game.accounts.data; if (!d) return;
    d.regionBuffs ||= {}; d.regionBuffs[kind] ||= {}; d.regionBuffs[kind][region] = b.dataset.k;
    game.accounts.save(); game.audio.play('victory', 0.6);
    game.ui.toast(`${nameOf(b.dataset.k, kind).toUpperCase()} · ${descOf(b.dataset.k, kind).toUpperCase()}`, 3);
    el.remove();
  }));
  return el;
}

// ---------- the trophy shelf in the Sanctum ----------
const L = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o });
const bx = (g, w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); g.add(o); return o; };
// a master's head on a little stand (or, still to be won, a black shape under a dust sheet)
function trophy(M, won) {
  const g = new THREE.Group();
  bx(g, 0.34, 0.08, 0.3, L(0x2a2420), 0, 0.04, 0);
  if (!won) { bx(g, 0.26, 0.3, 0.24, L(0x0c0a0a), 0, 0.23, 0); const q = bx(g, 0.04, 0.06, 0.01, new THREE.MeshBasicMaterial({ color: 0x3a3430 }), 0, 0.26, 0.125); void q; return g; }
  if (M.head === 'varek') { // the Last Sentinel's horned helm, its eye-slit still lit
    bx(g, 0.24, 0.28, 0.24, L(0x34343c), 0, 0.24, 0); bx(g, 0.18, 0.03, 0.02, new THREE.MeshBasicMaterial({ color: 0xffb040 }), 0, 0.27, 0.125);
    for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.22, 5), L(0xcfc2a0)); h.position.set(s * 0.15, 0.4, 0); h.rotation.z = -s * 0.7; g.add(h); }
  } else if (M.head === 'kiln') { // the Kilnfather's head of half-cooled glass, the fire still moving in it
    bx(g, 0.18, 0.2, 0.18, new THREE.MeshBasicMaterial({ color: 0xff6a1a }), 0, 0.22, 0);
    bx(g, 0.26, 0.28, 0.26, L(0x2a4a58, { transparent: true, opacity: 0.55 }), 0, 0.23, 0);
  } else bx(g, 0.24, 0.28, 0.24, L(0x5a5050), 0, 0.22, 0);
  return g;
}
export function trophyShelf(data, kind) {
  const g = new THREE.Group(), wood = L(0x3a2a1e), iron = L(0x2a2a2e), mine = buffsOf(data, kind), lights = [];
  bx(g, 1.9, 0.08, 0.36, wood, 0, 1.25, 0); bx(g, 1.9, 0.08, 0.36, wood, 0, 0.62, 0); // two boards
  for (const s of [-1, 1]) bx(g, 0.06, 1.35, 0.36, iron, s * 0.95, 0.67, 0); // the uprights
  bx(g, 1.96, 0.04, 0.04, iron, 0, 1.31, 0.17);
  // the four places: two on each board
  MASTERS.forEach((M, k) => {
    const won = !!mine[M.region], t = trophy(M, won);
    t.position.set(k % 2 ? 0.45 : -0.45, k < 2 ? 1.29 : 0.66, 0); g.add(t);
    if (won) { const pl = new THREE.PointLight(M.color, 0.9, 1.4, 1.5); pl.position.set(t.position.x, t.position.y + 0.35, 0.3); g.add(pl); lights.push(pl); }
    // a little brass plate under each: blank until it's won
    bx(g, 0.3, 0.06, 0.01, L(won ? 0xb89a4a : 0x3a3430), t.position.x, t.position.y - 0.07, 0.185);
  });
  return { group: g, lights };
}
// the shelf's card: what this character has won and which strength each gave, and what's still to come
export function shelfHtml(data, kind, charName) {
  const mine = buffsOf(data, kind);
  return `<p class="rb-note">Each region's master, beaten by <b>${charName}</b>, gives ${charName} one permanent strength of your choosing. Every character earns their own: another character's trophies don't count here.</p>`
    + MASTERS.map((M) => {
      const k = mine[M.region];
      return `<div class="rb-row ${k ? 'won' : ''}"><b>${M.name[0].toUpperCase() + M.name.slice(1)}</b>${k ? `<span>${BUFFS[k].icon} ${nameOf(k, kind)}: ${descOf(k, kind)}</span>` : `<span>${M.boss ? `Beat ${M.name} with ${charName} to earn a strength.` : 'A region still to come.'}</span>`}</div>`;
    }).join('');
}
