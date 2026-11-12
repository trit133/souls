// The Last Crusade's layer over every outfit piece (playerkits.js builds the piece, then its entry here adds the
// tech, the relics and the wear): visors and vox grilles, rebreathers, power cabling, reactors and coils, purity
// seals, hazard paint, rivets and battle damage. Each piece keeps its shape and fit; this only adds to it.
// Purely visual. Coordinates: head (H) face front z ≈ 0.15, crown y ≈ 0.34; torso (T) front z ≈ 0.14 × bulk.
import * as THREE from 'three';
import { box, cyl, cone, rbox, pivot } from './mesh.js';
import { strip, basic, CLOTH } from './kits.js';

// shared bits
const C = {
  blue: 0x8ad8ff, red: 0xff3a24, amber: 0xffb04a, green: 0x9ad06a, violet: 0xb07aff,
  brass: 0x8a6a34, iron: 0x3a3a40, gun: 0x55565c, hose: 0x161618, hazard: 0x9a7a1e, wax: 0x8a1a12, parch: 0xc8bca0, bone: 0xbab09a,
};
const glow = (c) => basic(c);
// a purity seal: a wax disc and a parchment strip that swings
function seal(r, parent, x, y, z) {
  parent.add(box(0.07, 0.07, 0.03, r.m(C.wax), x, y, z));
  strip(r, parent, x, y - 0.04, z + 0.01, 0.04, [0.13, 0.07], r.m(C.parch), { lx: [-0.6, 0.2], th: 0.012 });
}
// a row of rivets
const rivets = (r, parent, pts, m = r.m(C.gun)) => { for (const [x, y, z] of pts) parent.add(box(0.025, 0.025, 0.025, m, x, y, z)); };
// a hose from a to b (straight, a thin box between two points, in parent space)
function hose(r, parent, a, b, th = 0.03, m = r.m(C.hose)) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz);
  const h = box(th, th, L, m, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  h.rotation.order = 'YXZ'; h.rotation.set(-Math.atan2(dy, Math.hypot(dx, dz)), Math.atan2(dx, dz), 0);
  parent.add(h); return h;
}
const sw = (r) => r.dims.sw, bk = (r) => r.dims.bulk;

export const CRUSADE = {
  // ================= TEMPLAR =================
  knight: {
    helmet: {
      great(r, M, H) { // Crusader Helm: a vox grille, a cabled collar, rivets down the crest
        for (let i = 0; i < 3; i++) H.add(box(0.12, 0.018, 0.02, r.m(C.hose), 0, 0.09 + i * 0.03, 0.155));
        H.add(box(0.29, 0.04, 0.3, r.m(C.brass), 0, 0.05, 0));
        for (const s of [1, -1]) hose(r, H, [s * 0.1, 0.08, 0.13], [s * 0.14, 0.02, -0.08], 0.03);
        rivets(r, H, [[0, 0.33, 0.1], [0, 0.33, 0], [0, 0.33, -0.1]], r.m(C.brass));
      },
      barbute(r, M, H) { // Sanctioned Sallet: rebreather hoses from the jaw, a glowing T-visor, an antenna
        H.add(box(0.05, 0.14, 0.01, glow(C.blue), 0, 0.16, 0.158)); H.add(box(0.16, 0.03, 0.01, glow(C.blue), 0, 0.22, 0.158));
        H.add(box(0.12, 0.08, 0.08, r.m(C.iron), 0, 0.06, 0.16));
        for (const s of [1, -1]) hose(r, H, [s * 0.05, 0.05, 0.19], [s * 0.15, 0.0, 0.0], 0.03);
        H.add(box(0.02, 0.3, 0.02, r.m(C.gun), 0.12, 0.45, -0.1)); H.add(box(0.04, 0.04, 0.04, glow(C.red), 0.12, 0.6, -0.1));
      },
      winged(r, M, H) { // Seraph Helm: a halo emitter's core and gilded vane tips glowing
        H.add(box(0.2, 0.025, 0.015, glow(C.amber), 0, 0.2, 0.158));
        const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.04, 0), glow(C.amber)); core.position.set(0, 0.36, -0.2); H.add(core);
        rivets(r, H, [[-0.14, 0.3, 0.05], [0.14, 0.3, 0.05]], r.m(C.brass));
      },
      crowned(r, M, H) { // Crown of the Fallen Archon: a reactor coil at the back, chains of seals
        const c = cyl(0.06, 0.06, 0.14, r.m(C.iron), 6); c.rotation.x = Math.PI / 2; c.position.set(0, 0.25, -0.18); H.add(c);
        H.add(box(0.05, 0.05, 0.02, glow(C.red), 0, 0.25, -0.26));
        seal(r, H, 0.12, 0.3, 0.13);
      },
    },
    pauldron: {
      segmented(r, M, T, s) { // Lamellar Plate: a purity seal and a hose to the back pack
        seal(r, T, s * (sw(r) + 0.04), 0.66, 0.1);
        hose(r, T, [s * (sw(r) - 0.05), 0.7, -0.05], [s * 0.12, 0.62, -0.2 * bk(r)], 0.03);
      },
      spiked(r, M, T, s) { // Breacher Plate: hazard chevrons and a bolted riot rim
        for (let i = 0; i < 2; i++) T.add(rbox(0.1, 0.025, 0.02, r.m(C.hazard), s * (sw(r) + 0.02), 0.72 - i * 0.05, 0.13, 0, 0, s * 0.6));
        rivets(r, T, [[s * (sw(r) + 0.12), 0.66, 0.08], [s * (sw(r) + 0.12), 0.66, -0.08]], r.m(C.gun));
      },
      lion(r, M, T, s) { // Lion of the Crusade: a cable mane at the back, the lion's eyes burning red
        for (let i = 0; i < 3; i++) hose(r, T, [s * (sw(r) + 0.05), 0.76, -0.04 + i * 0.04], [s * (sw(r) + 0.18), 0.6, -0.1 + i * 0.05], 0.025);
        T.add(box(0.06, 0.02, 0.02, glow(C.red), s * (sw(r) + 0.02), 0.77, 0.2));
      },
      sunburst(r, M, T, s) { // Solar Reactor: a coil ring under the rays and a vent
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.015, 4, 12), r.m(C.brass)); ring.position.set(s * (sw(r) + 0.07), 0.76, 0.03); ring.rotation.y = Math.PI / 2; T.add(ring);
        T.add(box(0.1, 0.03, 0.06, r.m(C.iron), s * (sw(r) + 0.02), 0.62, -0.12));
      },
    },
    chest: {
      plate(r, M, T, hips) { // Crusader Plate & Tabard: power cabling across the chest, a cog badge, a seal
        hose(r, T, [-0.15 * bk(r), 0.62, 0.15 * bk(r)], [0.15 * bk(r), 0.42, 0.15 * bk(r)], 0.03);
        T.add(box(0.07, 0.07, 0.02, r.m(C.brass), 0.1, 0.6, 0.165 * bk(r)));
        seal(r, T, -0.06, 0.4, 0.17 * bk(r));
      },
      mail(r, M, T, hips) { // Mesh-Weave Surcoat: a vox bead at the throat, a holy text scroll on the belt
        T.add(box(0.08, 0.05, 0.04, r.m(C.iron), 0.07, 0.7, 0.13)); T.add(box(0.03, 0.03, 0.02, glow(C.green), 0.07, 0.7, 0.155));
        strip(r, hips, 0.15, 0.04, 0.12 * bk(r), 0.06, [0.2, 0.12], r.m(C.parch), { lx: [-0.6, 0.2], th: 0.015 });
      },
      radiant(r, M, T, hips) { // Martyr's Mantle: a reliquary on the chest (a glass case with a glowing relic)
        T.add(box(0.12, 0.14, 0.05, r.m(C.brass), 0, 0.5, 0.16 * bk(r))); T.add(box(0.08, 0.1, 0.02, glow(C.amber), 0, 0.5, 0.19 * bk(r)));
        seal(r, T, 0.13, 0.62, 0.17 * bk(r)); seal(r, T, -0.13, 0.62, 0.17 * bk(r));
      },
      dragonscale(r, M, T, hips) { // Reactor Scale: coolant pipes either side of the burning heart
        for (const s of [1, -1]) T.add(box(0.025, 0.3, 0.025, r.m(C.gun), s * 0.08, 0.45, 0.17 * bk(r)));
        T.add(box(0.14, 0.03, 0.03, r.m(C.hazard), 0, 0.32, 0.17 * bk(r)));
      },
    },
    legs: {
      greaves(r, M, hips) { // Servo-Greaves: knee pistons and armoured boots
        for (const L of [true, false]) { const sh = r.j[L ? 'shinL' : 'shinR']; sh.add(box(0.03, 0.18, 0.03, r.m(C.gun), 0.06, -0.12, -0.06)); sh.add(box(0.03, 0.18, 0.03, r.m(C.gun), -0.06, -0.12, -0.06)); sh.add(box(0.05, 0.03, 0.05, r.m(C.brass), 0, -0.02, 0.1)); }
      },
      mailskirt(r, M, hips) { // Mesh Skirt & Mag-Boots: magnetic soles that glow faintly
        for (const L of [true, false]) r.j[L ? 'shinL' : 'shinR'].add(box(0.17 * bk(r), 0.025, 0.2 * bk(r), glow(C.blue), 0, -r.dims.shin + 0.01, 0.03));
      },
      kingsguard(r, M, hips) { // Honour Guard: gilded oath plates with seals
        seal(r, hips, 0.12, -0.1, 0.15 * bk(r)); seal(r, hips, -0.12, -0.1, 0.15 * bk(r));
      },
      ember(r, M, hips) { // Slagforged: vented knees bleeding heat
        for (const L of [true, false]) { const sh = r.j[L ? 'shinL' : 'shinR']; for (let i = 0; i < 3; i++) sh.add(box(0.1, 0.012, 0.02, glow(0xff6a1a), 0, -0.02 - i * 0.03, 0.12)); }
      },
    },
    sword: {
      longsword(r, M, g) { // Resonance Blade: a power cell in the pommel, cabled grip
        g.add(box(0.08, 0.08, 0.06, r.m(C.iron), 0, 0, -0.17)); g.add(box(0.04, 0.04, 0.02, glow(C.blue), 0, 0.045, -0.17));
        for (const z of [-0.08, 0.02]) g.add(box(0.06, 0.06, 0.015, r.m(C.hose), 0, 0, z));
      },
      falchion(r, M, g) { // Chain-Falchion: a run of teeth along the edge, a motor housing
        for (let i = 0; i < 8; i++) g.add(box(0.035, 0.03, 0.05, r.m(0x8a1a12), 0, -0.06, 0.25 + i * 0.085));
        g.add(box(0.1, 0.1, 0.14, r.m(C.iron), 0, 0.02, 0.2));
      },
      dawn(r, M, g) { // Sunfire Blade: a reactor at the cross and brass vents
        g.add(box(0.12, 0.12, 0.08, r.m(C.brass), 0, 0, 0.18)); g.add(box(0.06, 0.06, 0.02, glow(C.amber), 0, 0, 0.225));
      },
      frostbrand(r, M, g) { // Cryo Brand: coolant lines up the blade from a canister in the grip
        g.add(box(0.06, 0.06, 0.12, r.m(C.gun), 0, 0, -0.02)); g.add(box(0.012, 0.012, 0.6, glow(C.blue), 0.025, 0, 0.5));
      },
    },
    shield: {
      heater(r, M, sh) { // Aegis Shield: a cog round the cross, rivets, a vision slit
        const cog = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.02, 4, 10), r.m(C.brass)); cog.position.set(0, 0.1, 0.06); sh.add(cog);
        for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; sh.add(box(0.03, 0.03, 0.02, r.m(C.brass), Math.cos(a) * 0.11, 0.1 + Math.sin(a) * 0.11, 0.06)); }
        sh.add(box(0.22, 0.025, 0.02, r.m(C.hose), 0, 0.28, 0.05));
        rivets(r, sh, [[-0.2, 0.28, 0.05], [0.2, 0.28, 0.05], [-0.2, -0.15, 0.05], [0.2, -0.15, 0.05]]);
      },
      round(r, M, sh) { // Boarding Shield: a vision slit and hazard band, battle scars
        sh.add(box(0.26, 0.04, 0.02, glow(C.red), 0, 0.18, 0.07));
        sh.add(box(0.7, 0.05, 0.065, r.m(C.hazard), 0, -0.18, 0.01));
        for (const [x, y, rz] of [[0.12, 0.05, 0.6], [-0.1, -0.05, -0.4]]) sh.add(rbox(0.12, 0.012, 0.01, r.m(0x1a1a1a), x, y, 0.065, 0, 0, rz));
      },
      kite(r, M, sh) { // Sun Kite: reactor coil round the sun, brass vents
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.018, 4, 14), r.m(C.brass)); ring.position.set(0, 0.12, 0.06); sh.add(ring);
        for (const s of [1, -1]) sh.add(box(0.06, 0.2, 0.02, r.m(C.iron), s * 0.17, -0.1, 0.05));
      },
      dragon(r, M, sh) { // Drake Crest: the drake breathes from a vent under its jaw
        sh.add(box(0.08, 0.04, 0.02, glow(0xff6a1a), 0, 0.08, 0.075));
      },
    },
  },
  // ================= SHRIKE =================
  rogue: {
    mask: {
      wrap(r, M, H) { // Rebreather Wrap: a filter snout over the wrap
        H.add(box(0.12, 0.08, 0.06, r.m(C.iron), 0, 0.09, 0.17)); H.add(cyl(0.035, 0.035, 0.04, r.m(C.gun), 6).translateX(0).translateY(0.09).translateZ(0.21));
      },
      iron(r, M, H) { // Vox Half-Mask: a vox grille and a cable to the collar
        for (let i = 0; i < 3; i++) H.add(box(0.12, 0.015, 0.02, r.m(C.hose), 0, 0.06 + i * 0.03, 0.17));
        hose(r, H, [0.08, 0.06, 0.12], [0.12, -0.05, -0.05], 0.025);
      },
      bone(r, M, H) { // Death's-Head: a single augmetic optic in one socket
        H.add(box(0.05, 0.05, 0.03, r.m(C.brass), 0.06, 0.2, 0.17)); H.add(box(0.03, 0.03, 0.02, glow(C.red), 0.06, 0.2, 0.185));
      },
      kitsune(r, M, H) { // Kitsune Visor: a sensor ridge and ear antennae
        H.add(box(0.02, 0.04, 0.22, r.m(C.gun), 0, 0.36, 0));
        for (const s of [1, -1]) { H.add(box(0.015, 0.14, 0.015, r.m(C.gun), s * 0.1, 0.42, -0.04)); H.add(box(0.025, 0.025, 0.025, glow(C.red), s * 0.1, 0.5, -0.04)); }
      },
    },
    cloak: {
      tattered(r, M, T, H) { // Ash Cloak: a tribal seal and a dangling dog tag
        seal(r, T, 0.12, 0.66, 0.12);
      },
      mantle(r, M, T, H) { // Scout Mantle: a vox-bead and a whip antenna at the shoulder
        T.add(box(0.06, 0.08, 0.06, r.m(C.iron), 0.2, 0.74, -0.05));
        strip(r, pivot(T, 0.2, 0.78, -0.05), 0, 0, 0, 0.015, [0.2, 0.18], r.m(C.hose), { rx: Math.PI - 0.2, bend: 0.2, lx: [-0.4, 0.4], th: 0.015, spring: { ...CLOTH, k: 120 } });
      },
      wraith(r, M, T, H) { // Wraith Field: a field projector at the nape, glowing
        T.add(box(0.12, 0.06, 0.06, r.m(C.iron), 0, 0.76, -0.14)); T.add(box(0.08, 0.02, 0.02, glow(C.red), 0, 0.79, -0.17));
      },
      raven(r, M, T, H) { // Raven Cloak: blade feathers along the collar
        for (let k = 0; k < 5; k++) { const c = cone(0.02, 0.14, r.m(0x9aa0a8), 3); c.position.set(-0.16 + k * 0.08, 0.8, -0.12); c.rotation.x = -0.6; T.add(c); }
      },
    },
    shirt: {
      jerkin(r, M, T) { // Combat Rig: chest webbing, ammo pouches and a grenade
        for (const x of [-0.1, 0, 0.1]) T.add(box(0.07, 0.08, 0.05, r.m(0x2e2a26), x, 0.36, 0.16 * bk(r)));
        T.add(box(0.06, 0.06, 0.06, r.m(0x3a4232), 0.15, 0.5, 0.15 * bk(r)));
      },
      brigandine(r, M, T) { // Flak Vest: armour plates over the vest, a serial stencil
        T.add(box(0.3 * bk(r), 0.22, 0.03, r.m(C.gun), 0, 0.48, 0.165 * bk(r))); T.add(box(0.12, 0.02, 0.01, r.m(C.parch), -0.06, 0.55, 0.183 * bk(r)));
      },
      assassin(r, M, T) { // Red Sash Rig: a red data-slate on the hip, glowing
        T.add(box(0.1, 0.07, 0.02, r.m(C.iron), -0.14, 0.12, 0.15 * bk(r))); T.add(box(0.07, 0.04, 0.01, glow(C.red), -0.14, 0.12, 0.163 * bk(r)));
      },
      shadowweave(r, M, T) { // Shadowweave Bodyglove: circuit traces that glow through
        for (const [x, y, w, h] of [[0.06, 0.5, 0.012, 0.2], [0.06, 0.4, 0.1, 0.012], [-0.08, 0.45, 0.012, 0.16]]) T.add(box(w, h, 0.01, glow(C.violet), x, y, 0.15 * bk(r)));
      },
    },
    band: {
      cloth(r, M, arm) { // Wrist Wraps: a cable bound in with the cloth
        r.j[arm === r.j.armL ? 'foreL' : 'foreR'].add(box(0.13, 0.02, 0.13, r.m(C.hose), 0, -0.2, 0));
      },
      bracer(r, M, arm) { // Data Bracer: a glowing screen on the bracer
        r.j[arm === r.j.armL ? 'foreL' : 'foreR'].add(box(0.07, 0.08, 0.02, glow(C.red), 0, -0.16, 0.075));
      },
      serpent(r, M, arm) { // Serpent Coil: the snake is a segmented cable with ruby optics
        r.j[arm === r.j.armL ? 'foreL' : 'foreR'].add(box(0.14, 0.015, 0.14, r.m(C.brass), 0, -0.1, 0));
      },
      blade(r, M, arm) { // Wrist Blade: the blade's edge glows red
        r.j[arm === r.j.armL ? 'foreL' : 'foreR'].add(box(0.01, 0.3, 0.01, glow(C.red), 0.075, -0.25, 0.02));
      },
    },
    knives: {
      curved(r, M, w) { w.add(box(0.05, 0.05, 0.04, r.m(C.iron), 0, 0, -0.09)); }, // Mono-Knives: a power cell in the butt
      stiletto(r, M, w) { w.add(box(0.008, 0.008, 0.3, glow(C.red), 0, 0.02, 0.3)); }, // Needle Stilettos: a hot needle core
      spectral(r, M, w) { w.add(box(0.05, 0.05, 0.05, r.m(C.gun), 0, 0, -0.08)); }, // Phase Blades: emitter hilts
      fang(r, M, w) { for (let k = 0; k < 4; k++) w.add(box(0.02, 0.02, 0.03, r.m(0x8a1a12), 0, -0.03, 0.18 + k * 0.05)); }, // Chain Fangs: teeth
    },
  },
  // ================= ADEPT =================
  mage: {
    shoulder: {
      mantle(r, M, T, H) { seal(r, T, -0.14, 0.66, 0.13); }, // Psy-Mantle: a seal of the choir
      pauldron(r, M, T, H) { // Coil Pauldron: copper coils on the plate
        for (let i = 0; i < 3; i++) { const c = cyl(0.06, 0.06, 0.02, r.m(0x8a5a2a), 8); c.rotation.z = Math.PI / 2; c.position.set(sw(r) + 0.06, 0.62 + i * 0.04, 0); T.add(c); }
      },
      crystal(r, M, T, H) { T.add(box(0.06, 0.06, 0.06, r.m(C.brass), 0, 0.78, -0.1)); }, // Crystal Array: a mounting socket
      phoenix(r, M, T, H) { T.add(box(0.1, 0.05, 0.05, r.m(C.iron), sw(r), 0.74, -0.08)); }, // Phoenix Vanes: an igniter
    },
    shirt: {
      runecoat(r, M, T) { // Circuit Coat: a data-port at the chest
        T.add(box(0.06, 0.06, 0.02, r.m(C.brass), 0.1, 0.56, 0.15 * bk(r))); T.add(box(0.03, 0.03, 0.01, glow(C.blue), 0.1, 0.56, 0.162 * bk(r)));
      },
      robe(r, M, T) { // Choir Robe: a hanging censer-light at the belt
        T.add(box(0.06, 0.08, 0.06, r.m(C.brass), 0.16, 0.0, 0.1)); T.add(box(0.03, 0.04, 0.03, glow(C.blue), 0.16, -0.06, 0.1));
      },
      starcape(r, M, T) { seal(r, T, 0.12, 0.6, 0.15 * bk(r)); }, // Void Cape
      archmage(r, M, T) { // Magos Robe: cables down the front, a cog medallion
        for (const s of [1, -1]) T.add(box(0.02, 0.3, 0.02, r.m(C.hose), s * 0.06, 0.4, 0.155 * bk(r)));
        const cog = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 4, 8), r.m(C.brass)); cog.position.set(0, 0.55, 0.16 * bk(r)); T.add(cog);
      },
    },
    pants: {
      trousers(r, M) { for (const L of [true, false]) r.j[L ? 'shinL' : 'shinR'].add(box(0.15 * bk(r), 0.04, 0.17 * bk(r), r.m(C.iron), 0, -0.16, 0)); }, // Fatigues: boot straps
      greaves(r, M) { for (const L of [true, false]) r.j[L ? 'shinL' : 'shinR'].add(box(0.04, 0.04, 0.02, glow(C.blue), 0, -0.05, 0.1)); }, // Greaved Boots: lumen studs
      runed(r, M) { for (const L of [true, false]) r.j[L ? 'shinL' : 'shinR'].add(box(0.012, 0.2, 0.01, glow(C.blue), 0.03, -0.2, 0.09)); }, // Circuit Leggings
      astral(r, M) { for (const L of [true, false]) r.j[L ? 'shinL' : 'shinR'].add(box(0.06, 0.04, 0.03, r.m(C.brass), 0, -0.02, 0.1)); }, // Astral Leggings: knee emitters
    },
    wand: {
      rune(r, M, g) { g.add(box(0.05, 0.05, 0.06, r.m(C.brass), 0, 0, 0.05)); g.add(box(0.03, 0.03, 0.12, r.m(C.hose), 0, 0, -0.05)); }, // Focus Rod
      bone(r, M, g) { g.add(box(0.03, 0.03, 0.02, glow(C.red), 0, 0.03, 0.3)); }, // Bone Fetish: an optic in the skull
      starfall(r, M, g) { const c = cyl(0.04, 0.04, 0.02, r.m(0x8a5a2a), 8); c.rotation.x = Math.PI / 2; c.position.z = 0.15; g.add(c); }, // Starfall Emitter
      ember(r, M, g) { g.add(box(0.06, 0.06, 0.08, r.m(C.iron), 0, 0, 0.1)); g.add(box(0.04, 0.02, 0.06, r.m(C.hazard), 0, 0.04, 0.1)); }, // Plasma Torch
    },
    sword: {
      runeblade(r, M, g) { g.add(box(0.06, 0.06, 0.08, r.m(C.iron), 0, 0, -0.08)); }, // Power Blade: a field generator in the grip
      steel(r, M, g) { g.add(box(0.012, 0.012, 0.5, glow(C.blue), 0, 0.03, 0.45)); }, // Arming Sword: a powered edge
      moonblade(r, M, g) { g.add(box(0.05, 0.05, 0.05, r.m(C.brass), 0, 0, -0.08)); }, // Moon Edge
      voidedge(r, M, g) { g.add(box(0.06, 0.06, 0.06, r.m(C.gun), 0, 0, -0.08)); }, // Voidedge: a containment pommel
    },
  },
};

// the display names and descriptions of the pieces (ids unchanged, so what you own carries over)
export const CRUSADE_NAMES = {
  knight: {
    helmet: { great: ['Crusader Bascinet', 'A tall pointed bascinet: a drilled vox snout, a burning eye slit, a cabled gorget.'], barbute: ['Sanctioned Sallet', 'A flat-brimmed sallet with a lit visor band and a twin-filter rebreather jaw.'], winged: ['Seraph Helm', 'A sculpted face, swept vanes with lit tips, a turning halo emitter.'], crowned: ['Crown of the Fallen Archon', 'A skull-faced visor under a tall crown of blades; a mail aventail.'] },
    pauldron: { segmented: ['Riot Slabs', 'Three flat edged slabs stacked down the shoulder.'], spiked: ['Hook Plates', 'An angular wedge with two hooked spikes and a lit vent.'], lion: ['Lion of the Crusade', 'An iron lion skull with burning eyes and a swinging cable mane.'], sunburst: ['Reactor Drum', 'A finned reactor drum along the shoulder, its end-face lit.'] },
    chest: { plate: ['Cuirass & Tabard', 'An angled ridged cuirass, an armoured gorget, a tabard front and back.'], mail: ['Coat of Plates', 'Riveted plates in rows down to the knees, a high collar and a lit buckle.'], radiant: ['Martyr\'s Harness', 'Cage ribs over padding, a chained reliquary, a cape in three panels.'], dragonscale: ['Reactor Carapace', 'Stepped carapace bands round a lit vent; coolant pipes.'] },
    legs: { greaves: ['Servo Legs', 'Knee cops with lit studs, calf pistons, armoured boots.'], mailskirt: ['Plate Skirt & Boots', 'A skirt of plate strips all round and steel-capped boots.'], kingsguard: ['Oath Greaves', 'Layered tassets sealed with wax and lit oath strips.'], ember: ['Furnace Greaves', 'Shin housings bleeding heat through their vents.'] },
    sword: { longsword: ['Broad Power Sword', 'A wide blade with a lit channel and a guard emitter.'], falchion: ['Chain-Cleaver', 'A cleaver widening to a square tip, a row of teeth, a motor at the cross.'], dawn: ['Sunfire Claymore', 'A long blade under a flame-shaped guard, its core burning.'], frostbrand: ['Cryo Sabre', 'A curved three-part blade with a coolant spine.'] },
    shield: { heater: ['Tower Aegis', 'A tall plank of plate with a lit vision slit and a raised cross.'], round: ['Boarding Buckler', 'A small round shield with a heavy rim and a lit boss.'], kite: ['Sun Kite', 'A tall kite round a lit reactor, rayed in trim.'], dragon: ['Drake Pavise', 'A tall pavise with a drake\'s head in relief and a spiked foot.'] },
  },
  rogue: {
    mask: { wrap: ['Rebreather Wrap', 'A dark wrap with a filter snout.'], iron: ['Vox Half-Mask', 'A riveted mask with a vox grille.'], bone: ['Death\'s-Head', 'A cracked skull face with an augmetic optic.'], kitsune: ['Kitsune Visor', 'A white fox helm with sensor ears.'] },
    cloak: { tattered: ['Ash Cloak', 'A deep hood and ragged panels, sealed.'], mantle: ['Scout Mantle', 'A hood, a shoulder cape and a whip antenna.'], wraith: ['Wraith Field', 'A field projector streaming ghost-light.'], raven: ['Raven Cloak', 'Black feathers with bladed quills.'] },
    shirt: { jerkin: ['Combat Rig', 'Webbing, ammo pouches and a grenade.'], brigandine: ['Flak Vest', 'Armour plates over a high collar.'], assassin: ['Red Sash Rig', 'A crimson sash, a knife bandolier, a red data-slate.'], shadowweave: ['Shadowweave Bodyglove', 'Violet circuitry glowing through.'] },
    band: { cloth: ['Wrist Wraps', 'Cloth bound over a cable.'], bracer: ['Data Bracer', 'A bracer with a glowing screen.'], serpent: ['Serpent Coil', 'A segmented brass snake with ruby optics.'], blade: ['Wrist Blade', 'A red-edged blade along the arm.'] },
    knives: { curved: ['Mono-Knives', 'Swept guards, hooked points, power cells.'], stiletto: ['Needle Stilettos', 'Long spikes with a hot needle core.'], spectral: ['Phase Blades', 'Blades of red phase-light from emitter hilts.'], fang: ['Chain Fangs', 'Serrated fangs with chain teeth.'] },
  },
  mage: {
    shoulder: { mantle: ['Psy-Mantle', 'A coat mantle with a choir seal.'], pauldron: ['Coil Pauldron', 'A plated shoulder wound with copper coils.'], crystal: ['Crystal Array', 'Crystal shards and an orbiting crown.'], phoenix: ['Phoenix Vanes', 'Vanes of living flame.'] },
    shirt: { runecoat: ['Circuit Coat', 'A high collar, split tails, a data-port.'], robe: ['Choir Robe', 'A long robe with a lumen censer.'], starcape: ['Void Cape', 'The circuit coat and a star-flecked cape.'], archmage: ['Magos Robe', 'A towering collar, cables and a cog medallion.'] },
    pants: { trousers: ['Fatigues', 'Plain fatigues and strapped boots.'], greaves: ['Greaved Boots', 'Steel shin guards with lumen studs.'], runed: ['Circuit Leggings', 'Glowing circuit traces down the shins.'], astral: ['Astral Leggings', 'Star-flecked, with knee emitters.'] },
    wand: { rune: ['Focus Rod', 'A cabled rod tipped with a glowing gem.'], bone: ['Bone Fetish', 'A carved bone with an optic in its skull.'], starfall: ['Starfall Emitter', 'A star circling a coiled tip.'], ember: ['Plasma Torch', 'A torch crowned with plasma.'] },
    sword: { runeblade: ['Power Blade', 'A blade of blue light from a field grip.'], steel: ['Arming Sword', 'A plain blade with a powered edge.'], moonblade: ['Moon Edge', 'A crescent of pale light.'], voidedge: ['Voidedge', 'Black steel with a violet void at its core.'] },
  },
};
