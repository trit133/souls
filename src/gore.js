// Gore: what comes out of what you cut. Flesh bleeds dark red; a machine (a War Servitor, a Bilge Hulk) spits black
// oil and sparks; the training dummy sheds straw. Every blade hit sprays it (main.js resolveHit); a bleed keeps
// pulsing out a moment; a blade going in for a kill finds the side of the neck, or the eye on anything without one.
//
// Maiming: the last blow of a combo that slashes (CUTS: never a stab, never a blunt staff) can take a piece off: an
// arm or a forearm, a leg or a shin, and on a few combos the head. The chance is that one hit's damage against the
// enemy's whole health (a big blow on a small enemy, likely; on a big one, rarely), more the more hurt it already is,
// times the combo's own knack and Butcher's Mark (runes.js). A head comes off at a third of that and only where the
// combo allows. Never a boss. The piece flies off and lands (ragdoll.js piece), the stump and the piece pour for a few
// seconds and leave a pool, and the enemy fights on as it can (enemies.js applyMaim): with a leg gone it crawls on its
// belly and grabs at your feet; without its weapon arm the weapon goes with it and it punches and shoves; without
// the other it swings wildly. A head off kills it. The device that landed the blow rolls and tells the party.
import * as THREE from 'three';

// what bleeds what (by enemy type; anything else bleeds blood)
const FLUID = { brute: 'oil', hulk: 'oil', dummy: 'straw', chime: 'none' };
const LOOK = {
  blood: { cols: [[0.45, 0.03, 0.03], [0.62, 0.05, 0.04], [0.3, 0.02, 0.02]], size: 0.2, grav: 12, drag: 1 },
  oil: { cols: [[0.06, 0.05, 0.04], [0.12, 0.1, 0.07], [0.02, 0.02, 0.02]], size: 0.2, grav: 13, drag: 1 },
  straw: { cols: [[0.78, 0.65, 0.35], [0.62, 0.5, 0.26], [0.86, 0.76, 0.46]], size: 0.13, grav: 5, drag: 2.5 },
};
const _v = new THREE.Vector3(), _q = new THREE.Quaternion();
// the blades: their hits spray (the staff is blunt: a little only)
export const BLADES = new Set(['sword', 'greatsword', 'daggers', 'wristblade', 'spellknife']);
// the combo finishers that cut, by name: k (their knack for it) and behead (how far they can take a head: 0 never)
export const CUTS = {
  'Crown Cleave': { k: 1.0, behead: 0 }, 'Thousand Cuts': { k: 0.8, behead: 0 }, "Viper's Dance": { k: 1.0, behead: 1 },
  'Hemorrhage': { k: 1.1, behead: 0.6 }, 'Shatter': { k: 0.7, behead: 0 }, 'Anvil': { k: 1.2, behead: 0 },
  'Silent Count': { k: 1.0, behead: 1 }, 'Shadow Hook': { k: 0.9, behead: 0 },
};
// what can come off, and how likely each (a forearm or a shin more often than the whole limb)
const LIMBS = [['foreL', 3], ['foreR', 3], ['shinL', 3], ['shinR', 3], ['armL', 2], ['armR', 2], ['legL', 2], ['legR', 2]];
const PARENT = { foreL: 'armL', foreR: 'armR', shinL: 'legL', shinR: 'legR' };
// each piece's box (half sizes) and its centre from the joint, from the rig's own measures
const BOXES = {
  arm: (d) => [[0.06 * d.bulk, (d.upper + d.fore + 0.1) / 2, 0.065 * d.bulk], [0, -(d.upper + d.fore + 0.1) / 2, 0]],
  fore: (d) => [[0.055 * d.bulk, (d.fore + 0.1) / 2, 0.06 * d.bulk], [0, -(d.fore + 0.1) / 2, 0]],
  leg: (d) => [[0.08 * d.bulk, (d.thigh + d.shin) / 2, 0.09 * d.bulk], [0, -(d.thigh + d.shin) / 2, 0]],
  shin: (d) => [[0.07 * d.bulk, d.shin / 2, 0.12 * d.bulk], [0, -d.shin / 2, 0]],
  head: () => [[0.13, 0.15, 0.13], [0, 0.17, 0]],
};
const BOX_OF = { armL: 'arm', armR: 'arm', foreL: 'fore', foreR: 'fore', legL: 'leg', legR: 'leg', shinL: 'shin', shinR: 'shin', head: 'head' };
const POOL_COL = { blood: 0x3a0606, oil: 0x0a0806 };
const MAX_POOLS = 40;

export class Gore {
  constructor(game) { this.game = game; this.bleeds = []; this.drips = []; this.pools = []; }

  fluidOf(e) { return FLUID[e?.type] || (e?.T?.still && !e.rig?.dummyTop ? 'none' : 'blood'); }

  // a spray out of a wound at p, thrown along dir; n drops, force scales how far they fly
  spray(p, dir, n, who, force = 1) {
    const kind = typeof who === 'string' ? who : this.fluidOf(who), L = LOOK[kind];
    if (!L) return;
    const fx = this.game.fx;
    for (let i = 0; i < n; i++) {
      const c = L.cols[i % L.cols.length], sp = force * (0.6 + Math.random() * 0.8);
      fx.norm.spawn({
        x: p.x, y: p.y, z: p.z,
        vx: (dir?.x || 0) * 4 * sp + (Math.random() - 0.5) * 2.4, vy: (dir?.y || 0) * 3 * sp + 0.8 + Math.random() * 2.6 * force, vz: (dir?.z || 0) * 4 * sp + (Math.random() - 0.5) * 2.4,
        life: 0.45 + Math.random() * 0.4, size: L.size * (0.7 + Math.random() * 0.6), size1: L.size * 0.4, r: c[0], g: c[1], b: c[2], grav: L.grav, drag: L.drag, alpha: 0.95,
      });
    }
    if (kind === 'oil') fx.sparks(p, dir, Math.ceil(n / 5), [1, 0.75, 0.35]);
  }

  // keeps pouring from the neck a moment after the knife comes out: a few weakening spurts
  bleed(who, secs = 1.5) { this.bleeds.push({ who, t: 0, secs, next: 0 }); }

  update(dt) {
    for (const B of this.bleeds) {
      B.t += dt; B.next -= dt;
      if (B.next > 0) continue;
      B.next = 0.12 + Math.random() * 0.1;
      const k = 1 - B.t / B.secs, f = B.who.fwd?.() || _v.set(0, 0, 1);
      this.spray(this.neckOf(B.who), _v.set(-f.x * 0.4, 0.2, -f.z * 0.4), Math.ceil(5 * k), B.who, 0.3 + 0.4 * k);
    }
    this.bleeds = this.bleeds.filter((B) => B.t < B.secs && B.who.rig?.root.parent);
    // stumps and severed pieces pouring: drops falling off the wound, thinning out
    for (const D of this.drips) {
      D.t += dt; D.next -= dt;
      if (D.next > 0) continue;
      const k = 1 - D.t / D.secs; D.next = 0.05 + (1 - k) * 0.15;
      const p = D.at(), dir = D.dir?.() || null;
      this.spray(p, dir || _v.set((Math.random() - 0.5) * 0.2, -0.2, (Math.random() - 0.5) * 0.2), dir ? Math.ceil(4 * k) : 2, D.kind, dir ? 0.3 + 0.7 * k : 0.15);
      if (D.land && D.t > 0.9 && !D.pool) { const q = D.land.piece.localToWorld(new THREE.Vector3(0, 0, 0)); D.pool = this.pool(q.x, D.land.y, q.z, D.kind, 0.5); }
      if (D.pool && D.t > 0.4) { D.pool.r = Math.min(D.pool.max, D.pool.r + dt * 6 * D.pool.max / D.secs); D.pool.mesh.scale.setScalar(D.pool.r); }
    }
    this.drips = this.drips.filter((D) => D.t < D.secs);
  }

  // ---------- maiming ----------
  // the last blow of a combo landed (main.js resolveHit): roll for a piece, take it off, and tell the party
  tryMaim(att, tg, def, h, dealt, dir) {
    if (!tg?.rig?.dims || tg.isBoss || tg.T?.still || !tg.applyMaim) return null;
    const C = CUTS[def.finisher] || (h.cut ? { k: 1, behead: 0 } : null), cut = h.cut || (C ? 'slash' : null);
    if (!C || cut !== 'slash' || !tg.maxHp) return null;
    const ch = this.chance(dealt, tg, C.k, att.runeL?.util?.maim || 0), behead = (h.behead ?? C.behead) * ch / 3;
    let part = null;
    if (behead && tg.rig.j.head?.visible && Math.random() < behead) part = 'head';
    else if (Math.random() < ch) part = this.pickLimb(tg);
    if (!part) return null;
    this.maim(tg, part, dir);
    this.game.mp.event({ k: 'maim', id: tg.netId, p: part, dx: Math.round(dir.x * 100) / 100, dz: Math.round(dir.z * 100) / 100 });
    return part;
  }
  // the chance: that hit's damage against its whole health (capped), more on one already hurt, times the combo's
  // knack and the maim bonus (Butcher's Mark)
  chance(dealt, tg, k = 1, bonus = 0) {
    const r = dealt / tg.maxHp, hurt = 1 - Math.max(0, tg.hp) / tg.maxHp;
    return Math.min(0.85, Math.min(0.55, 1.2 * r) * (1 + 0.8 * hurt) * k * (1 + bonus));
  }
  pickLimb(tg) {
    const gone = tg.maimed || new Set(), opts = LIMBS.filter(([k]) => !gone.has(k) && !gone.has(PARENT[k])); // (a whole arm can still go after its forearm)
    if (!opts.length) return null;
    let r = Math.random() * opts.reduce((a, o) => a + o[1], 0);
    for (const [k, w] of opts) if ((r -= w) <= 0) return k;
    return opts[0][0];
  }

  // take `part` off: a copy of it flies (the rig's own hidden), the stump and the piece pour, the enemy adapts
  maim(e, part, dir) {
    const rig = e.rig, J = rig.j[part], g = this.game;
    if (!J || !J.visible || !rig.dims) return false;
    if (PARENT[part] && !rig.j[PARENT[part]].visible) return false;
    rig.root.updateMatrixWorld(true);
    const piece = J.clone(true);
    J.matrixWorld.decompose(piece.position, piece.quaternion, piece.scale);
    piece.traverse((o) => { o.visible = true; });
    g.scene.add(piece);
    J.visible = false;
    const kind = this.fluidOf(e), [half, c] = BOXES[BOX_OF[part]](rig.dims), S = piece.scale.y;
    const up = part === 'head' ? 4.5 : 2.5;
    g.ragdolls.piece(piece, half.map((v) => v * S), c.map((v) => v * S), e.pos.y || 0,
      { x: (dir?.x || 0) * 3 + (Math.random() - 0.5) * 1.5, y: up + Math.random() * 1.5, z: (dir?.z || 0) * 3 + (Math.random() - 0.5) * 1.5 });
    // the wound: a burst, the stump pumping (a fountain from the neck), the piece leaking where it was cut
    const stump = () => J.getWorldPosition(new THREE.Vector3());
    const at = stump();
    this.spray(at, dir, 30, kind, 1.2);
    if (kind !== 'straw' && kind !== 'none') {
      const pool = this.pool(at.x, e.pos.y || 0, at.z, kind, part === 'head' ? 1.1 : 0.75);
      this.drips.push({ at: stump, kind, t: 0, secs: part === 'head' ? 2.5 : 4, next: 0, pool, dir: part === 'head' ? () => _v.set((Math.random() - 0.5) * 0.3, 1.4, (Math.random() - 0.5) * 0.3) : null });
      const end = () => piece.localToWorld(new THREE.Vector3(0, 0, 0));
      this.drips.push({ at: end, kind, t: 0, secs: 3, next: 0.3, pool: null, land: { piece, y: e.pos.y || 0 } }); // (a pool where it lands)
    }
    g.audio.play('bigHit', 0.6);
    if (part === 'head' || !e.puppet) g.statusPopup?.(e, part === 'head' ? 'BEHEADED' : 'SEVERED', '#ff4a3a');
    (e.maimed || (e.maimed = new Set())).add(part);
    e.applyMaim(part);
    return true;
  }

  // a pool spreading on the floor under a wound (grows with its drip; kept a while, the oldest go first)
  pool(x, y, z, kind, max) {
    const col = POOL_COL[kind]; if (!col) return null;
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(1, 9), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85, depthWrite: false }));
    mesh.rotation.x = -Math.PI / 2; mesh.rotation.z = Math.random() * 6; mesh.position.set(x, y + 0.025 + this.pools.length * 0.0005, z);
    mesh.scale.setScalar(0.15);
    this.game.scene.add(mesh);
    const P = { mesh, r: 0.15, max };
    this.pools.push(P);
    if (this.pools.length > MAX_POOLS) { const o = this.pools.shift(); this.game.scene.remove(o.mesh); o.mesh.geometry.dispose(); }
    if (!this.drips.length || max <= 0.5) { P.r = max; mesh.scale.setScalar(max); }
    return P;
  }

  // a new level: the pools go (the pieces go with the ragdolls)
  clear() {
    for (const P of this.pools) { this.game.scene.remove(P.mesh); P.mesh.geometry.dispose(); }
    this.pools = []; this.drips = []; this.bleeds = [];
  }

  // where a blade goes in for the kill: the side of the neck (the top of the spine, where the head sits), or the eye on
  // anything without a neck (the dummy's painted face)
  neckOf(e) {
    const rig = e.rig;
    if (rig.dummyTop) return rig.dummyTop.localToWorld(new THREE.Vector3(0, 1.3, 0.17));
    const H = rig.j.head;
    if (!H) return new THREE.Vector3(e.pos.x, 1.5 * rig.root.scale.y + (e.pos.y || 0), e.pos.z);
    rig.root.updateMatrixWorld(true);
    if (e.T?.noNeck) return H.localToWorld(new THREE.Vector3(0, 0.2, 0.15)); // (the eye)
    return H.localToWorld(new THREE.Vector3(0, 0.03, 0));
  }
}
