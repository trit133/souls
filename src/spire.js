// Saint Orsk's Spire's plan data (its shrines, arena and basement names: hill.js lays the map, the hill, on them)
// and its own chests (reliquaries) and drums (offering urns). Its shrine: the choir bells.
import * as THREE from 'three';
import { CHEST_LOOKS } from './chests.js';


export const SPIRE = {
  seed: 0x5917e,
  blocks: [
    ['house', 'house', 'barracks', 'house', 'ruin', 'house'],
    ['yard', 'plaza', 'merged', 'house', 'plaza', 'yard'],
    ['house', 'house', 'house', 'chapel', 'merged', 'house'],
    ['ruin', 'works', 'yard', 'house', 'ruin', 'house'],
    ['house', 'merged', 'plaza', 'house', 'plaza', 'house'],
    ['house', 'ruin', 'house', 'yard', 'house', 'rubble'],
  ],
  merged: ['h2,1', 'v4,2', 'h1,4'], loops: 2,
  boss: ['0,2', '2,3', '3,1'], vaults: ['0,0', '2,0', '5,4'], squares: ['1,1', '1,4', '4,2', '4,4'],
  shrines: { must: 'bells', pool: ['elite', 'circle', 'altar'] },
  arena: { name: 'The Bell Foundry' },
  under: { vault: 'The Catacombs', boss: 'The Seers\' Cells', cache: 'The Sealed Reliquary' },
};
// the terraces: the walks between these junction rows climb (steps across them)
// (its map, the hill, is hill.js: rebuilt 2026-11-15; this file keeps its plan's shrines and names, and its chests)

// ---------- the Spire's chests and drums ----------
const gilt = () => new THREE.MeshLambertMaterial({ color: 0x9a7a30, flatShading: true });
CHEST_LOOKS.spire = {
  // a reliquary: an ebony casket with gilt corners and feet, a pitched lid like a chapel roof with a gilt ridge and a
  // tiny Eye at its peak, a saint's icon on the front glowing in its rarity's light (the lock), wax seals and prayer
  // strips hanging off it, two candles at its foot. The hoard's is a long sarcophagus-reliquary
  chest(w, x, z, yaw, big, rarity, { rarityHex, LOCKED }) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = yaw; g.userData.noMerge = true;
    if (big) g.scale.set(1.35, 1.35, 1.6);
    const ebony = new THREE.MeshLambertMaterial({ color: 0x1e1814, flatShading: true }), gold = gilt(), wax = new THREE.MeshLambertMaterial({ color: 0x8a1a12 }), parch = new THREE.MeshLambertMaterial({ color: 0xc8bca0 });
    const part = (geo, mat, px, py, pz, parent = g, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.rotation.set(rx, ry, rz); parent.add(m); return m; };
    const W = 1.05, D = 0.62, H = 0.5;
    for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) part(new THREE.BoxGeometry(0.12, 0.12, 0.12), gold, px * (W / 2 - 0.06), 0.06, pz * (D / 2 - 0.06)); // feet
    part(new THREE.BoxGeometry(W, H, D), ebony, 0, 0.12 + H / 2, 0);
    for (const px of [-1, 1]) for (const pz of [-1, 1]) part(new THREE.BoxGeometry(0.06, H + 0.02, 0.06), gold, px * W / 2, 0.12 + H / 2, pz * D / 2); // gilt corners
    part(new THREE.BoxGeometry(W + 0.04, 0.05, D + 0.04), gold, 0, 0.12 + H - 0.03, 0);
    part(new THREE.BoxGeometry(W + 0.04, 0.05, D + 0.04), gold, 0, 0.14, 0);
    // the icon: a gilt frame, the glowing saint (the lock)
    part(new THREE.BoxGeometry(0.34, 0.34, 0.03), gold, 0, 0.12 + H / 2, D / 2 + 0.01);
    const glow = new THREE.MeshBasicMaterial({ color: LOCKED });
    const lock = part(new THREE.BoxGeometry(0.24, 0.26, 0.02), glow, 0, 0.12 + H / 2, D / 2 + 0.025);
    part(new THREE.BoxGeometry(0.06, 0.12, 0.025), ebony, 0, 0.12 + H / 2 + 0.03, D / 2 + 0.035); // the saint's shape
    // the lid, a little chapel roof, hinged at the back
    const lid = new THREE.Group(); lid.position.set(0, 0.12 + H, -D / 2); g.add(lid);
    part(new THREE.BoxGeometry(W + 0.06, 0.06, D + 0.06), gold, 0, 0.03, D / 2, lid);
    for (const s of [-1, 1]) part(new THREE.BoxGeometry(W + 0.02, 0.05, D * 0.58), ebony, 0, 0.14, D / 2 + s * D * 0.24, lid, s * 0.55);
    part(new THREE.BoxGeometry(W + 0.08, 0.05, 0.05), gold, 0, 0.29, D / 2, lid);
    part(new THREE.TorusGeometry(0.06, 0.015, 4, 10), gold, 0, 0.38, D / 2, lid);
    part(new THREE.BoxGeometry(0.03, 0.03, 0.02), new THREE.MeshBasicMaterial({ color: 0xc890ff }), 0, 0.38, D / 2, lid);
    for (const s of [-1, 1]) { part(new THREE.BoxGeometry(0.07, 0.07, 0.03), wax, s * 0.32, 0.12 + H - 0.12, D / 2 + 0.02); part(new THREE.BoxGeometry(0.04, 0.16, 0.01), parch, s * 0.32, 0.12 + H - 0.26, D / 2 + 0.025); }
    for (const s of [-1, 1]) { part(new THREE.CylinderGeometry(0.04, 0.04, 0.22, 6), parch, s * 0.7, 0.11, 0.3); part(new THREE.BoxGeometry(0.03, 0.06, 0.03), new THREE.MeshBasicMaterial({ color: 0xffc870 }), s * 0.7, 0.26, 0.3); }
    if (big) { part(new THREE.BoxGeometry(0.2, 0.06, 0.6), gold, 0, 0.32, D / 2, lid); } // the effigy's sword on the lid
    const halo = new THREE.Mesh(new THREE.CircleGeometry(1.4, 20), new THREE.MeshBasicMaterial({ color: rarityHex(rarity), transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.rotation.x = -Math.PI / 2; halo.position.y = 0.04; g.add(halo);
    w.add(g);
    return { group: g, lid, lock, halo, glow };
  },
  // an offering urn: bronze, round-bellied on a foot, a lid with a knop, a band of gilt and a wax seal; the plain ones
  // are clay ossuary jars with a skull painted on
  drum(w, x, z, plain) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.userData.noMerge = true;
    const body = new THREE.MeshLambertMaterial({ color: plain ? 0x6a5040 : 0x6a4a22, flatShading: true }), gold = gilt();
    const part = (geo, mat, py, px = 0, pz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); g.add(m); return m; };
    part(new THREE.CylinderGeometry(0.2, 0.26, 0.14, 8), body, 0.07);
    part(new THREE.CylinderGeometry(0.36, 0.22, 0.4, 8), body, 0.34);
    part(new THREE.CylinderGeometry(0.28, 0.36, 0.36, 8), body, 0.72);
    part(new THREE.CylinderGeometry(0.2, 0.26, 0.1, 8), body, 0.95);
    part(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 8), plain ? body : gold, 1.03);
    part(new THREE.SphereGeometry(0.07, 6, 4), plain ? body : gold, 1.1);
    if (!plain) { part(new THREE.CylinderGeometry(0.365, 0.365, 0.06, 8), gold, 0.54); part(new THREE.BoxGeometry(0.1, 0.1, 0.03), new THREE.MeshLambertMaterial({ color: 0x8a1a12 }), 0.72, 0, 0.33); }
    else part(new THREE.BoxGeometry(0.14, 0.12, 0.02), new THREE.MeshLambertMaterial({ color: 0xbab09a }), 0.6, 0, 0.35);
    w.add(g);
    return g;
  },
  debris: { stave: new THREE.MeshLambertMaterial({ color: 0x6a4a22, flatShading: true }), hoop: gilt(), lid: gilt(), dust: [0.7, 0.55, 0.3] },
};
