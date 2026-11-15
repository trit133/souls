// The Sump Lines' plan data (its shrines, arena and basement names: cut.js lays the map, the Drained Cut, on them)
// and its own chests (pressure lockers) and drums (promethium canisters). Its shrine: the flood valves.
import * as THREE from 'three';
import { CHEST_LOOKS } from './chests.js';


export const SUMP = {
  seed: 0x50b11, // (the map's own stream)
  blocks: [
    ['house', 'ruin', 'house', 'house', 'works', 'house'],
    ['plaza', 'house', 'yard', 'ruin', 'merged', 'plaza'],
    ['house', 'chapel', 'merged', 'house', 'house', 'house'],
    ['ruin', 'house', 'plaza', 'yard', 'barracks', 'ruin'],
    ['house', 'yard', 'house', 'house', 'merged', 'house'],
    ['rubble', 'house', 'ruin', 'plaza', 'house', 'yard'],
  ],
  merged: ['h4,1', 'v2,2', 'h4,4'], loops: 3,
  boss: ['0,4', '2,1', '3,4'], vaults: ['0,0', '2,5', '4,2'], squares: ['1,0', '1,5', '3,2', '5,3'],
  shrines: { must: 'valve', pool: ['elite', 'circle', 'altar'] },
  arena: { name: 'The Cold Pumps' },
  under: { vault: 'The Drainage Sumps', boss: 'The Undersump', cache: 'The Sealed Bunker' },
};
// (its map, the Drained Cut, is cut.js: rebuilt 2026-11-15; this file keeps its plan's shrines and names, and its chests)

// ---------- the Sump Lines' chests and drums ----------
CHEST_LOOKS.sump = {
  // a pressure locker: a riveted steel crate on skids, a porthole gauge, a valve-wheel lock in its rarity's light,
  // hazard chevrons, a hose coiled on top; the lid swings up on a piano hinge. The hoard's is a bunker strongbox with
  // two wheels and a stencilled regime eagle
  chest(w, x, z, yaw, big, rarity, { rarityHex, LOCKED }) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = yaw; g.userData.noMerge = true;
    if (big) g.scale.setScalar(1.5);
    const M = w.mats, steel = new THREE.MeshLambertMaterial({ color: 0x4e5452, flatShading: true }), dark = new THREE.MeshLambertMaterial({ color: 0x24282a, flatShading: true });
    const part = (geo, mat, px, py, pz, parent = g, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.rotation.set(rx, ry, rz); parent.add(m); return m; };
    const W = 1.15, D = 0.72, H = 0.55;
    for (const s of [-1, 1]) part(new THREE.BoxGeometry(W + 0.1, 0.1, 0.12), dark, 0, 0.05, s * D * 0.36); // skids
    part(new THREE.BoxGeometry(W, H, D), steel, 0, 0.1 + H / 2, 0);
    for (const s of [-1, 1]) part(new THREE.BoxGeometry(0.06, H + 0.02, D + 0.03), dark, s * (W / 2 - 0.05), 0.1 + H / 2, 0); // corner ribs
    for (let k = 0; k < 6; k++) part(new THREE.BoxGeometry(0.035, 0.035, 0.02), M.brass, -W / 2 + 0.12 + k * 0.18, 0.18, D / 2 + 0.01); // rivets
    for (let k = 0; k < 3; k++) part(new THREE.BoxGeometry(0.14, 0.05, 0.02), M.hazard, -0.38 + k * 0.17, 0.3, D / 2 + 0.012, g, 0, 0, 0.6); // chevrons
    part(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 10), M.brass, 0.36, 0.42, D / 2 + 0.015, g, Math.PI / 2); // the gauge
    part(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 10), new THREE.MeshBasicMaterial({ color: 0xd8e0b0 }), 0.36, 0.42, D / 2 + 0.03, g, Math.PI / 2);
    const lid = new THREE.Group(); lid.position.set(0, 0.1 + H, -D / 2); g.add(lid);
    part(new THREE.BoxGeometry(W + 0.04, 0.12, D + 0.04), steel, 0, 0.06, D / 2, lid);
    part(new THREE.BoxGeometry(W - 0.2, 0.05, D - 0.2), dark, 0, 0.14, D / 2, lid);
    const hose = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 4, 10), dark); hose.rotation.x = Math.PI / 2; hose.position.set(-0.3, 0.16, D / 2); lid.add(hose);
    if (big) { part(new THREE.BoxGeometry(0.34, 0.03, 0.2), M.brass, 0.25, 0.16, D / 2, lid); part(new THREE.BoxGeometry(0.12, 0.03, 0.34), M.brass, 0.25, 0.165, D / 2, lid); } // the eagle, stencilled
    // the lock: a valve wheel on the front, its hub lit
    const glow = new THREE.MeshBasicMaterial({ color: LOCKED });
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.022, 4, 10), M.rust); wheel.position.set(-0.05, 0.1 + H - 0.14, D / 2 + 0.04); g.add(wheel);
    for (let k = 0; k < 2; k++) part(new THREE.BoxGeometry(0.24, 0.025, 0.02), M.metal, -0.05, 0.1 + H - 0.14, D / 2 + 0.04, g, 0, 0, k * Math.PI / 2);
    const lock = part(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 8), glow, -0.05, 0.1 + H - 0.14, D / 2 + 0.06, g, Math.PI / 2);
    if (big) { const w2 = wheel.clone(); w2.position.x = 0.3; g.add(w2); }
    const halo = new THREE.Mesh(new THREE.CircleGeometry(1.4, 20), new THREE.MeshBasicMaterial({ color: rarityHex(rarity), transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.rotation.x = -Math.PI / 2; halo.position.y = 0.04; g.add(halo);
    w.add(g);
    return { group: g, lid, lock, halo, glow };
  },
  // a promethium canister: tall, dented, black-green with a hazard band and a valve on top; a dark slick under it.
  // The plain ones are rusted water drums
  drum(w, x, z, plain) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.userData.noMerge = true;
    const M = w.mats, body = new THREE.MeshLambertMaterial({ color: plain ? 0x4a3a2a : 0x223a2e, flatShading: true });
    const part = (geo, mat, py, px = 0, pz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); g.add(m); return m; };
    part(new THREE.CylinderGeometry(0.32, 0.34, 1.1, 8), body, 0.55);
    for (const y of [0.15, 0.95]) part(new THREE.CylinderGeometry(0.355, 0.355, 0.07, 8), M.metal, y);
    if (!plain) { part(new THREE.CylinderGeometry(0.345, 0.345, 0.16, 8), M.hazard, 0.55); part(new THREE.BoxGeometry(0.12, 0.1, 0.02), new THREE.MeshBasicMaterial({ color: 0x9ad070 }), 0.75, 0, 0.34); }
    part(new THREE.CylinderGeometry(0.06, 0.06, 0.14, 6), M.metal, 1.16, 0.12, 0); part(new THREE.BoxGeometry(0.2, 0.03, 0.03), M.rust, 1.24, 0.12, 0);
    const slick = new THREE.Mesh(new THREE.CircleGeometry(0.6, 12), new THREE.MeshBasicMaterial({ color: 0x0a0c0a, transparent: true, opacity: 0.6, depthWrite: false })); slick.rotation.x = -Math.PI / 2; slick.position.set(0.15, 0.025, 0.1); g.add(slick);
    w.add(g);
    return g;
  },
  debris: { stave: new THREE.MeshLambertMaterial({ color: 0x223a2e, flatShading: true }), dust: [0.3, 0.55, 0.4] },
};
