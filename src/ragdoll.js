// Ragdolls (cannon-es): the dead go limp. When an enemy, a boss or a player dies its box rig becomes eleven bodies -
// pelvis, chest, head, upper arms, forearms, thighs, shins - built where the pose last had them and joined at the
// joints (cones for the hips, shoulders, spine and neck; hinges for knees and elbows), shoved the way the killing blow
// went. Each frame the rig's joints are turned to follow the bodies (rotations only: the bones keep their lengths, so
// nothing stretches or comes apart). They fall, settle, and stay where they lie: after a few seconds a body is frozen
// (out of the simulation, its pose kept) for good. Getting up again (a revive, a respawn) gives the rig back.
// Each dead body falls on its own floor (simulated with the floor at 0, put back at its height), never collides with
// another, and is held inside the walls. Visual only, on each device for itself: nothing here touches the game.
import * as CANNON from 'cannon-es';
import * as THREE from 'three';

const GRAVITY = -16;
// how long a body is simulated at most, and how many at once (the oldest freeze first; fewer on a phone)
const LIFE = 5, MAX_LIVE = 10, MAX_LIVE_PHONE = 5, MAX_PIECES = 30;
// the segments: the rig joint, its parent segment, the box (half sizes, as fractions of rig.dims or plain metres) and
// its centre from the joint, its mass, and how it hangs from its parent (cone: angle; hinge: about the joint's x)
const SEGS = [
  { k: 'pelvis', j: 'hips', half: (d) => [0.18 * d.bulk, 0.12, 0.11 * d.bulk], c: () => [0, 0, 0], m: 3 },
  { k: 'chest', j: 'torso', p: 'pelvis', half: (d) => [0.21 * d.bulk, d.torsoH / 2, 0.12 * d.bulk], c: (d) => [0, d.torsoH / 2, 0], m: 4, cone: 0.45, axis: [0, 1, 0] },
  { k: 'head', j: 'head', p: 'chest', half: () => [0.12, 0.14, 0.12], c: () => [0, 0.16, 0], m: 1, cone: 0.6, axis: [0, 1, 0] },
  { k: 'upperL', j: 'armL', p: 'chest', half: (d) => [0.055 * d.bulk, d.upper / 2, 0.06 * d.bulk], c: (d) => [0, -d.upper / 2, 0], m: 1, cone: 1.5, axis: [0, -1, 0] },
  { k: 'upperR', j: 'armR', p: 'chest', half: (d) => [0.055 * d.bulk, d.upper / 2, 0.06 * d.bulk], c: (d) => [0, -d.upper / 2, 0], m: 1, cone: 1.5, axis: [0, -1, 0] },
  { k: 'foreL', j: 'foreL', p: 'upperL', half: (d) => [0.05 * d.bulk, (d.fore + 0.1) / 2, 0.055 * d.bulk], c: (d) => [0, -(d.fore + 0.1) / 2, 0], m: 0.8, hinge: [-2.3, 0] },
  { k: 'foreR', j: 'foreR', p: 'upperR', half: (d) => [0.05 * d.bulk, (d.fore + 0.1) / 2, 0.055 * d.bulk], c: (d) => [0, -(d.fore + 0.1) / 2, 0], m: 0.8, hinge: [-2.3, 0] },
  { k: 'thighL', j: 'legL', p: 'pelvis', half: (d) => [0.07 * d.bulk, d.thigh / 2, 0.08 * d.bulk], c: (d) => [0, -d.thigh / 2, 0], m: 1.5, cone: 1.0, axis: [0, -1, 0] },
  { k: 'thighR', j: 'legR', p: 'pelvis', half: (d) => [0.07 * d.bulk, d.thigh / 2, 0.08 * d.bulk], c: (d) => [0, -d.thigh / 2, 0], m: 1.5, cone: 1.0, axis: [0, -1, 0] },
  { k: 'shinL', j: 'shinL', p: 'thighL', half: (d) => [0.065 * d.bulk, d.shin / 2, 0.1 * d.bulk], c: (d) => [0, -d.shin / 2, 0], m: 1.2, hinge: [0, 2.4] },
  { k: 'shinR', j: 'shinR', p: 'thighR', half: (d) => [0.065 * d.bulk, d.shin / 2, 0.1 * d.bulk], c: (d) => [0, -d.shin / 2, 0], m: 1.2, hinge: [0, 2.4] },
];
const BY = Object.fromEntries(SEGS.map((s) => [s.k, s]));

const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _e = new THREE.Euler();
const v3 = (x, y, z) => new CANNON.Vec3(x, y, z);

export class Ragdolls {
  constructor(game) {
    this.game = game;
    this.world = new CANNON.World({ gravity: v3(0, GRAVITY, 0) });
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.allowSleep = true;
    this.world.solver.iterations = 7;
    this.world.defaultContactMaterial.friction = 0.6;
    this.world.defaultContactMaterial.restitution = 0.05;
    const ground = new CANNON.Body({ mass: 0, shape: new CANNON.Plane(), collisionFilterGroup: 1, collisionFilterMask: 2 });
    ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.world.addBody(ground);
    this.list = []; // { who, rig, bodies: {k: Body}, cons, floor, t, live }
    this.pieces = []; // severed limbs and heads (gore.js): { obj, body, c, floor, t, live, prev }
  }

  // called where a dead actor would take its dead pose: true once it's a ragdoll (the caller poses nothing). A body
  // with no humanoid rig (a shrine bell, an idol) isn't one
  hold(who) {
    if (who.ragdoll) return true;
    const rig = who.rig;
    if (!rig?.dims || !rig.j.legL || !rig.j.armL || who.T?.still) return false;
    this.spawn(who);
    return true;
  }

  spawn(who) {
    const rig = who.rig, d = rig.dims, S = rig.root.scale.y;
    rig.root.updateMatrixWorld(true);
    const floor = who.pos.y || 0;
    const R = { who, rig, bodies: {}, cons: [], floor, t: 0, live: true, prev: {} };
    // where the blow sent it: its knockback, else away from whoever's nearest
    const kb = who.kb && who.kb.lengthSq() > 0.25 ? who.kb.clone() : null;
    let dir = kb ? kb.clone().normalize() : null;
    if (!dir) { const p = this.game.player?.pos; dir = p ? new THREE.Vector3(who.pos.x - p.x, 0, who.pos.z - p.z) : new THREE.Vector3(0, 0, 1); if (dir.lengthSq() < 1e-4) dir.set(Math.sin(who.yaw), 0, Math.cos(who.yaw)).negate(); dir.normalize(); }
    const push = Math.min(6, 1.8 + (kb ? kb.length() * 0.35 : 0));
    for (const s of SEGS) {
      const J = rig.j[s.j];
      J.getWorldPosition(_v); J.getWorldQuaternion(_q);
      const c = s.c(d), h = s.half(d);
      const off = new THREE.Vector3(c[0] * S, c[1] * S, c[2] * S).applyQuaternion(_q);
      const b = new CANNON.Body({
        mass: s.m * S * S, shape: new CANNON.Box(v3(h[0] * S, h[1] * S, h[2] * S)),
        position: v3(_v.x + off.x, _v.y + off.y - floor, _v.z + off.z),
        quaternion: new CANNON.Quaternion(_q.x, _q.y, _q.z, _q.w),
        collisionFilterGroup: 2, collisionFilterMask: 1, linearDamping: 0.08, angularDamping: 0.25,
        allowSleep: true, sleepSpeedLimit: 0.15, sleepTimeLimit: 0.6,
      });
      // the shove: the chest most, so it topples rather than slides
      const k = s.k === 'chest' || s.k === 'head' ? 1.3 : s.k.startsWith('shin') ? 0.4 : 0.8;
      b.velocity.set(dir.x * push * k, 0.6 + Math.random() * 0.6, dir.z * push * k);
      b.angularVelocity.set((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2);
      R.bodies[s.k] = b; this.world.addBody(b);
      if (!s.p) continue;
      const P = R.bodies[s.p];
      J.getWorldPosition(_v); _v.y -= floor;
      const piv = v3(_v.x, _v.y, _v.z), pa = P.pointToLocalFrame(piv), pb = b.pointToLocalFrame(piv);
      const ax = s.hinge ? [1, 0, 0] : s.axis;
      const wAxis = b.quaternion.vmult(v3(ax[0], ax[1], ax[2])), aA = P.quaternion.inverse().vmult(wAxis), aB = v3(ax[0], ax[1], ax[2]);
      const con = s.hinge
        ? new CANNON.HingeConstraint(P, b, { pivotA: pa, pivotB: pb, axisA: aA, axisB: aB, collideConnected: false })
        : new CANNON.ConeTwistConstraint(P, b, { pivotA: pa, pivotB: pb, axisA: P.quaternion.inverse().vmult(b.quaternion.vmult(aB)), axisB: aB, angle: s.cone, twistAngle: 0.5, collideConnected: false });
      R.cons.push(con); this.world.addConstraint(con);
    }
    who.ragdoll = R;
    rig.shadow && (rig.shadow.visible = false);
    this.list.push(R);
    // too many falling at once: the oldest still moving stops where it is
    const live = this.list.filter((r) => r.live);
    if (live.length > (this.game.input?.isPhone ? MAX_LIVE_PHONE : MAX_LIVE)) this.freeze(live[0]);
  }

  // out of the simulation for good, its pose kept
  freeze(R) {
    if (!R.live) return;
    R.live = false;
    for (const c of R.cons) this.world.removeConstraint(c);
    for (const b of Object.values(R.bodies)) this.world.removeBody(b);
  }

  // back on its feet (revived, respawned): the rig is the actor's own again
  release(R) {
    this.freeze(R);
    this.list = this.list.filter((r) => r !== R);
    const rig = R.rig;
    if (R.who.ragdoll === R) R.who.ragdoll = null;
    rig.root.rotation.set(0, R.who.yaw || 0, 0);
    rig.body.position.set(0, rig.hipH, 0); rig.body.quaternion.identity();
    rig.shadow && (rig.shadow.visible = true);
  }

  // a piece cut off (gore.js maim): one box (half sizes, its centre `c` from the object's origin, already scaled)
  // thrown with velocity v; it tumbles, lands and stays (frozen like the bodies; the oldest go past MAX_PIECES)
  piece(obj, half, c, floor, v) {
    const o = new THREE.Vector3(...c).applyQuaternion(obj.quaternion);
    const body = new CANNON.Body({
      mass: 1, shape: new CANNON.Box(v3(...half)), position: v3(obj.position.x + o.x, obj.position.y + o.y - floor, obj.position.z + o.z),
      quaternion: new CANNON.Quaternion(obj.quaternion.x, obj.quaternion.y, obj.quaternion.z, obj.quaternion.w),
      collisionFilterGroup: 2, collisionFilterMask: 1, linearDamping: 0.1, angularDamping: 0.3, allowSleep: true, sleepSpeedLimit: 0.15, sleepTimeLimit: 0.5,
    });
    body.velocity.set(v.x, v.y, v.z);
    body.angularVelocity.set((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12);
    this.world.addBody(body);
    const P = { obj, body, c: new THREE.Vector3(...c), floor, t: 0, live: true, prev: { x: body.position.x, z: body.position.z } };
    this.pieces.push(P);
    if (this.pieces.length > MAX_PIECES) this.dropPiece(this.pieces[0]);
    return P;
  }
  dropPiece(P) {
    if (P.live) this.world.removeBody(P.body);
    P.live = false;
    P.obj.parent?.remove(P.obj);
    this.pieces = this.pieces.filter((x) => x !== P);
  }

  // a new level (or leaving one): every body goes
  clear() { for (const R of [...this.list]) this.release(R); this.list = []; for (const P of [...this.pieces]) this.dropPiece(P); }

  update(dt) {
    if (!this.list.length && !this.pieces.some((P) => P.live)) return;
    // up again, or gone with its level
    for (const R of [...this.list]) if (R.who.alive || !R.rig.root.parent) this.release(R);
    if (this.list.some((r) => r.live) || this.pieces.some((P) => P.live)) {
      for (const R of this.list) if (R.live) for (const [k, b] of Object.entries(R.bodies)) (R.prev[k] ||= { x: 0, z: 0 }).x = b.position.x, R.prev[k].z = b.position.z;
      for (const P of this.pieces) if (P.live) { P.prev.x = P.body.position.x; P.prev.z = P.body.position.z; }
      this.world.step(1 / 60, dt, 3);
      const W = this.game.world;
      for (const P of this.pieces) {
        if (!P.live) continue;
        P.t += dt;
        const b = P.body;
        if (!W.walkable(b.position.x, b.position.z, 0, null, true)) { b.position.x = P.prev.x; b.position.z = P.prev.z; b.velocity.x = 0; b.velocity.z = 0; }
        P.obj.quaternion.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w);
        const o = _v.copy(P.c).applyQuaternion(P.obj.quaternion);
        P.obj.position.set(b.position.x - o.x, b.position.y + P.floor - o.y, b.position.z - o.z);
        if (P.t > LIFE || b.sleepState === CANNON.Body.SLEEPING) { P.live = false; this.world.removeBody(b); }
      }
      for (const R of this.list) {
        if (!R.live) continue;
        R.t += dt;
        // held inside the walls: a body pushed out of the walkable ground goes back, its sideways speed lost
        for (const [k, b] of Object.entries(R.bodies)) {
          if (W.walkable(b.position.x, b.position.z, 0, null, true)) continue;
          b.position.x = R.prev[k].x; b.position.z = R.prev[k].z; b.velocity.x = 0; b.velocity.z = 0;
        }
        if (R.t > LIFE || Object.values(R.bodies).every((b) => b.sleepState === CANNON.Body.SLEEPING)) { this.pose(R); this.freeze(R); }
      }
    }
    for (const R of this.list) if (R.live) this.pose(R);
  }

  // the rig follows the bodies: the body group placed and turned as the pelvis, every other joint turned (in its
  // parent's frame) as its segment; a knee or an elbow only bends the way it can
  pose(R) {
    const rig = R.rig, S = rig.root.scale.y, B = R.bodies, Qw = {};
    rig.root.position.set(0, 0, 0); rig.root.rotation.set(0, 0, 0);
    const pb = B.pelvis;
    rig.body.position.set(pb.position.x / S, (pb.position.y + R.floor) / S, pb.position.z / S);
    rig.body.quaternion.set(pb.quaternion.x, pb.quaternion.y, pb.quaternion.z, pb.quaternion.w);
    rig.j.hips.quaternion.identity();
    Qw.pelvis = rig.body.quaternion.clone();
    for (const s of SEGS) {
      if (!s.p) continue;
      const b = B[s.k], J = rig.j[s.j];
      _q.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w);
      _q2.copy(Qw[s.p]).invert().multiply(_q); // (in the parent's frame)
      if (s.hinge) { _e.setFromQuaternion(_q2, 'XYZ'); J.rotation.set(Math.max(s.hinge[0], Math.min(s.hinge[1], _e.x)), 0, 0); }
      else J.quaternion.copy(_q2);
      Qw[s.k] = Qw[s.p].clone().multiply(J.quaternion);
    }
  }
}
export { BY as RAGDOLL_SEGS };
