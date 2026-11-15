// Gore: what comes out of what you cut. Flesh bleeds dark red; a machine (a War Servitor, a Bilge Hulk) spits black
// oil and sparks; the training dummy sheds straw. Sprays from a wound, a bleed that keeps pulsing out a moment, and
// where a blade goes in for a kill (the side of the neck, or the eye on anything without one). Visual only.
import * as THREE from 'three';

// what bleeds what (by enemy type; anything else bleeds blood)
const FLUID = { brute: 'oil', hulk: 'oil', dummy: 'straw', chime: 'none' };
const LOOK = {
  blood: { cols: [[0.45, 0.03, 0.03], [0.62, 0.05, 0.04], [0.3, 0.02, 0.02]], size: 0.2, grav: 12, drag: 1 },
  oil: { cols: [[0.06, 0.05, 0.04], [0.12, 0.1, 0.07], [0.02, 0.02, 0.02]], size: 0.2, grav: 13, drag: 1 },
  straw: { cols: [[0.78, 0.65, 0.35], [0.62, 0.5, 0.26], [0.86, 0.76, 0.46]], size: 0.13, grav: 5, drag: 2.5 },
};
const _v = new THREE.Vector3(), _q = new THREE.Quaternion();

export class Gore {
  constructor(game) { this.game = game; this.bleeds = []; }

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
