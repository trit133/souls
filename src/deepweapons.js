// The Sunless Deep's weapons at work (weapons.js, weaponmoves.js; 2026-11-26): what their moves set going in the
// world. Everything that burns, sparkles or glows here is the wielder's chest glow's colour (rig.chestGlow).
//   Pit-Breaker     - the piston firing (steam and sparks), shoves, Piston Slam's split in the floor, the boiler's
//                     burst; Overpressure: every third swing that lands vents, and the next Piston Slam bursts rock
//   Glass Chakrams  - the thrown ring cutting from enemy to enemy and coming back; Shard Orbit; Prism Split's shards
//   Lantern Censer  - floors left burning, the pillar, Blinding Flare; Wildfire: fire leaping between enemies
// The one who made the move does the damage (game.deepw on their screen); everyone else sees the same thing through
// game.vfx (the VFX below, added to vfx.js's).
import * as THREE from 'three';
import { VFX } from './vfx.js';
import { NUM } from './scale.js';
import { PISTON, CHAKRAM, FLARE } from './weaponmoves.js';

const glowOf = (p) => p?.rig?.chestGlow ?? 0xff8a3a;
const rgb = (hex) => new THREE.Color(hex);
const flat = (p) => new THREE.Vector3(p.x, 0, p.z);
const chestOf = (e) => new THREE.Vector3(e.pos.x, 1.1 * (e.rig?.root.scale.y || 1) + (e.pos.y || 0), e.pos.z);
const levelOk = (p, e) => Math.abs((e.gy || 0) - (p.gy || 0)) <= 1.6; // (not up on a terrace out of reach)

// the glass ring's look: a band of glass round a thread of light in the glow's colour
function ringMesh(hex, r = 0.2) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.035, 4, 14), new THREE.MeshLambertMaterial({ color: 0xc8e0f0, transparent: true, opacity: 0.7, emissive: 0x203040 })));
  g.add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.014, 4, 14), new THREE.MeshBasicMaterial({ color: hex })));
  return g;
}

export class DeepWeapons {
  constructor(game) {
    this.g = game;
    this.rings = [];   // thrown chakrams and shards in flight (mine do damage; a teammate's are only seen)
    this.orbits = [];  // Shard Orbits
    this.floors = [];  // burning floors
    this.wildT = 0;
  }
  clear() {
    for (const R of this.rings) { this.g.scene.remove(R.mesh); if (R.hidden) R.hidden.visible = true; }
    for (const O of this.orbits) { for (const m of O.meshes) this.g.scene.remove(m); for (const w of O.hidden) w.visible = true; }
    this.rings = []; this.orbits = []; this.floors = [];
  }

  // ---------- damage, done by the one who made the move ----------
  // the weapon's own blow on tg from somewhere other than the swing (a thrown ring, the orbit): it goes through the
  // same hit as a swing (tree, crits, armour, gore, bleed from a slash)
  weaponHit(p, tg, dmg, poise, extra = {}) {
    const h = { dmg, poise, range: 99, arc: 7, cut: 'slash' }, def = { hits: [h], comboMove: !!extra.combo, thrown: true };
    this.g.resolveHit(p, tg, h, def);
  }
  // a blow of pure force round a point (rock, the floor splitting): physical, through armour, with a push outward
  physBlast(p, at, r, dmg, poise, push = 0, filter = null) {
    const g = this.g, hit = [];
    for (const e of g.enemiesAll()) {
      if (!e.alive || e.y > 1.5 || !levelOk(p, e)) continue;
      const dx = e.pos.x - at.x, dz = e.pos.z - at.z, d = Math.hypot(dx, dz);
      if (filter ? !filter(e) : d > r + e.radius) continue;
      if (!g.world.lineClear(p.pos.x, p.pos.z, e.pos.x, e.pos.z)) continue;
      const dir = d > 0.05 ? new THREE.Vector3(dx / d, 0, dz / d) : p.fwd().clone();
      const k = e.isBoss ? 0.15 : e.heavy ? 0.5 : 1, kb = [dir.x * push * k, dir.z * push * k];
      const amt = dmg * NUM * p.dmgMul * (1 - (e.def?.armor || 0) / 100), hp0 = e.hp, staggered = p.cmbStag?.has(e);
      if (e.receive({ dmg: amt, poise: staggered ? 0 : poise, srcPos: p.pos, attacker: p, noKnock: true, kb }) === 'none') continue;
      const dealt = e.puppet ? amt : hp0 - e.hp;
      g.dmgPops(e, { phys: dealt }, 'me');
      g.mp.event({ k: 'hit', id: e.netId, d: { phys: Math.round(dealt) } });
      if (!e.puppet && e.alive && push) e.kb.set(kb[0], 0, kb[1]);
      hit.push(e);
    }
    return hit;
  }

  // ---------- the Pit-Breaker ----------
  // the piston firing in the head as it lands: a jet of steam and a spray of sparks
  piston(p, at) { this.g.vfx('pbPuff', at, glowOf(p)); }
  // whatever's in front within range and arc is thrown back (soft: aside, a little)
  shove(p, range, arc, push, soft = false) {
    const f = p.fwd();
    for (const e of this.g.enemiesAll()) {
      if (!e.alive || e.puppet || !levelOk(p, e)) continue;
      const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz);
      if (d > range + e.radius || d < 0.05) continue;
      const a = Math.acos(Math.max(-1, Math.min(1, (dx * f.x + dz * f.z) / d)));
      if (a > arc / 2) continue;
      const k = (e.isBoss ? 0.1 : e.heavy ? 0.45 : 1) * push;
      const side = soft ? Math.sign(dx * f.z - dz * f.x) || 1 : 0; // (aside: out to whichever side it's on)
      e.kb.set((dx / d) * k * (soft ? 0.4 : 1) + f.z * side * k * 0.8, 0, (dz / d) * k * (soft ? 0.4 : 1) - f.x * side * k * 0.8);
    }
  }
  // Piston Slam: the floor splits in a straight line ahead; with the boiler vented (Overpressure), longer and wider and
  // rock bursting up all along it
  pistonLine(p) {
    const over = p.evo === 'overpressure' && p.vented, Q = over ? PISTON.over : PISTON;
    if (over) p.vented = false;
    const f = p.fwd().clone(), from = p.pos.clone().addScaledVector(f, 1.0).setY(0.05 + (p.pos.y || 0));
    this.g.vfx('pistonLine', from, f, Q.len, !!over, glowOf(p));
    const filter = (e) => {
      const dx = e.pos.x - from.x, dz = e.pos.z - from.z, along = dx * f.x + dz * f.z, across = Math.abs(dx * f.z - dz * f.x);
      return along > -0.6 && along < Q.len + e.radius && across < Q.w / 2 + e.radius;
    };
    // (pushed on along the split, not out from its start)
    const hit = this.physBlast(p, from, 0, Q.dmg, Q.poise, 0, filter);
    for (const e of hit) if (!e.puppet && e.alive) { const k = e.isBoss ? 0.1 : e.heavy ? 0.45 : 1; e.kb.set(f.x * Q.push * k, 0, f.z * Q.push * k); }
    this.g.chests?.drumsAt?.(from.x + f.x * Q.len / 2, from.z + f.z * Q.len / 2, Q.len / 2);
    this.g.hitstop(over ? 0.09 : 0.05);
  }
  // a swing of the Pit-Breaker's landed: Overpressure counts them (one a swing), and every third vents the boiler
  landed(p, tg, def) {
    if (p.c.weapon !== 'pitbreaker' || p.evo !== 'overpressure' || !p.atk || p.atk.landed || def.thrown) return;
    if (p.atk.def === p.c.attacks.piston) return;
    p.atk.landed = true;
    if (++p.pressure < PISTON.ventEvery) return;
    p.pressure = 0;
    const tip = p.rig.tip.getWorldPosition(new THREE.Vector3());
    this.g.vfx('vent', tip, glowOf(p));
    this.g.comboBlast({ ...p, pos: flat(tip).setY(p.pos.y || 0), cmbStag: p.cmbStag }, PISTON.vent.r, PISTON.vent.dmg * NUM, PISTON.vent.poise, 'fire');
    if (!p.vented) this.g.ui.toastSmall?.('Overpressure: the next Piston Slam bursts rock');
    p.vented = true;
  }
  // the boiler bursting (Boiler Burst), or the Censer's fire going out of it in a ring (Pyre Dance)
  boilerBurst(p, r, dmg) {
    const at = p.pos.clone().setY(0.05 + (p.pos.y || 0));
    this.g.vfx('fireRing', at, r, glowOf(p));
    this.g.comboBlast(p, r, dmg * NUM, 30, 'fire');
  }
  // Pile Driver: the floor bursting in a ring of rock where the maul came down
  rockRing(p, at, r, dmg) {
    this.g.vfx('rockBurst', at, r, glowOf(p));
    this.physBlast(p, at, r, dmg, 45, 22);
    this.piston(p, at);
  }

  // ---------- the Glass Chakrams ----------
  // the enemies a ring will cut, in order: the one locked on (or the nearest ahead) within reach, then from each the
  // nearest it hasn't cut yet within a leap
  chain(p, n, dir) {
    const g = this.g, live = g.enemiesAll().filter((e) => e.alive && levelOk(p, e));
    let first = p.lock?.alive && p.distTo(p.lock) < CHAKRAM.reach ? p.lock : null;
    if (!first) {
      let best = Infinity;
      for (const e of live) {
        const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz);
        if (d > CHAKRAM.reach || d < 0.01) continue;
        if ((dx * dir.x + dz * dir.z) / d < Math.cos(0.6)) continue; // (in a cone ahead)
        const score = d * (2 - (dx * dir.x + dz * dir.z) / d);
        if (score < best && g.world.lineClear(p.pos.x, p.pos.z, e.pos.x, e.pos.z)) { best = score; first = e; }
      }
    }
    const out = first ? [first] : [];
    while (out.length && out.length < n) {
      const last = out[out.length - 1];
      let next = null, bd = CHAKRAM.leap;
      for (const e of live) if (!out.includes(e)) {
        const d = Math.hypot(e.pos.x - last.pos.x, e.pos.z - last.pos.z);
        if (d < bd && g.world.lineClear(last.pos.x, last.pos.z, e.pos.x, e.pos.z)) { bd = d; next = e; }
      }
      if (!next) break;
      out.push(next);
    }
    return out;
  }
  // the throw (o.ghost: a ring of glass from nothing that shatters at the end, instead of the one in his hand;
  // o.spread: turned off his line; o.dmg: each cut's)
  throwChakram(p, o = {}) {
    if (!o.ghost && p.chakramOut) return false;
    const dir = p.fwd().clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), o.spread || 0);
    const targets = this.chain(p, CHAKRAM.cuts, dir), hex = glowOf(p);
    const from = p.rig.j.handR.getWorldPosition(new THREE.Vector3());
    // where it'll go, for everyone else's screens: each target's chest, or straight out to its reach
    const pts = targets.length ? targets.map(chestOf) : [from.clone().addScaledVector(dir, CHAKRAM.reach * 0.8)];
    this.launch(p, from, pts, { ghost: !!o.ghost, targets, dmg: o.dmg ?? CHAKRAM.dmg, combo: !!o.finisher, mine: true, hex });
    if (this.g.mp.active) this.g.mp.event({ k: 'fx', n: 'chakram', a: [this.g.myRef(), [+from.x.toFixed(2), +from.y.toFixed(2), +from.z.toFixed(2), ...pts.flatMap((v) => [+v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(2)])], !!o.ghost, hex] });
    // Prism Split: two shards of light off each throw of his own ring, straight out either side
    if (!o.ghost && p.evo === 'prismSplit') for (let i = 0; i < CHAKRAM.prism.n; i++) {
      const s = (i ? 1 : -1) * CHAKRAM.prism.spread, d2 = dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), s);
      const end = from.clone().addScaledVector(d2, CHAKRAM.prism.len);
      this.launch(p, from, [end], { ghost: true, shard: true, dmg: CHAKRAM.prism.dmg, mine: true, hex, dir: d2 });
      if (this.g.mp.active) this.g.mp.event({ k: 'fx', n: 'chakram', a: [this.g.myRef(), [+from.x.toFixed(2), +from.y.toFixed(2), +from.z.toFixed(2), +end.x.toFixed(2), +end.y.toFixed(2), +end.z.toFixed(2)], 'shard', hex] });
    }
    this.g.audio.play('swing', 0.8);
    return true;
  }
  // a ring in flight: to each point (or, mine, each target as it moves) in turn, then back to the hand (or shattered)
  launch(p, from, pts, o) {
    const mesh = o.shard ? new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), new THREE.MeshBasicMaterial({ color: o.hex })) : ringMesh(o.hex, o.ghost ? 0.2 : 0.22);
    if (o.shard) mesh.scale.set(0.6, 0.6, 2.2);
    mesh.position.copy(from); this.g.scene.add(mesh);
    const R = { p, mesh, pts, i: 0, back: false, t: 0, hit: new Set(), ...o };
    if (!o.ghost && p.rig.wpnR) { R.hidden = p.rig.wpnR; R.hidden.visible = false; if (o.mine) p.chakramOut = true; }
    if (o.shard) mesh.lookAt(from.clone().add(o.dir));
    this.rings.push(R);
  }
  updateRings(dt) {
    const g = this.g, sp = CHAKRAM.speed;
    for (const R of this.rings) {
      R.t += dt;
      const m = R.mesh;
      if (!R.shard) { m.rotation.x = Math.PI / 2; m.rotation.z += dt * 30; }
      if (Math.random() < dt * 30) { const c = rgb(R.hex); g.fx.add.spawn({ x: m.position.x, y: m.position.y, z: m.position.z, life: 0.25, size: R.shard ? 0.12 : 0.09, size1: 0.01, r: c.r, g: c.g, b: c.b }); }
      // where it's going: the next target (mine: where it is now), the next point, or home
      let to;
      if (R.back) to = R.p?.rig?.j.handR ? R.p.rig.j.handR.getWorldPosition(new THREE.Vector3()) : R.pts[0];
      else if (R.mine && R.targets?.[R.i]) to = R.targets[R.i].alive ? chestOf(R.targets[R.i]) : R.pts[R.i];
      else to = R.pts[R.i];
      if (!to) { R.done = true; continue; }
      const d = to.clone().sub(m.position), len = d.length(), step = sp * (R.back ? 1.2 : 1) * dt;
      // a shard cuts whatever it passes
      if (R.shard && R.mine) for (const e of g.enemiesAll()) if (e.alive && !R.hit.has(e) && Math.hypot(e.pos.x - m.position.x, e.pos.z - m.position.z) < e.radius + 0.5) { R.hit.add(e); this.weaponHit(R.p, e, R.dmg, 4); }
      if (len > step && R.t < 4) { m.position.addScaledVector(d.normalize(), step); continue; }
      m.position.copy(to);
      if (R.back) { R.done = true; continue; }
      // there: a cut (mine), a glint
      const tg = R.mine ? R.targets?.[R.i] : null;
      if (tg?.alive && !R.hit.has(tg)) { R.hit.add(tg); this.weaponHit(R.p, tg, R.dmg, CHAKRAM.poise, { combo: R.combo }); }
      if (!R.shard) VFX.glint(g, to, R.hex);
      R.i++;
      if (R.i >= R.pts.length) { if (R.ghost) { if (!R.shard) VFX.glassShatter(g, m.position.clone(), R.hex); R.done = true; } else R.back = true; }
    }
    this.rings = this.rings.filter((R) => {
      if (!R.done) return true;
      g.scene.remove(R.mesh);
      if (R.hidden) { R.hidden.visible = true; if (R.mine) R.p.chakramOut = false; }
      return false;
    });
  }
  // Shard Orbit: both rings set spinning round him, cutting what they pass
  startOrbit(p) {
    this.g.vfx('orbit', this.g.myRef(), CHAKRAM.orbit.dur, glowOf(p));
    const O = this.orbits[this.orbits.length - 1];
    if (O) { O.mine = true; O.tick = 0; }
    this.g.audio.play('heavySwing', 0.8);
  }
  addOrbit(who, dur, hex) {
    if (!who) return;
    const meshes = [ringMesh(hex), ringMesh(hex)], hidden = [who.rig.wpnR, who.rig.wpnL].filter(Boolean);
    for (const m of meshes) this.g.scene.add(m);
    for (const w of hidden) w.visible = false;
    if (who === this.g.player) who.chakramOut = true;
    this.orbits.push({ who, meshes, hidden, t: dur, a: 0, hex, mine: false, tick: 0 });
  }
  updateOrbits(dt) {
    const g = this.g, C = CHAKRAM.orbit;
    for (const O of this.orbits) {
      O.t -= dt; O.a += dt * 9;
      const P = O.who.pos, y = 1.0 + (P.y || 0) + (O.who.y || 0);
      O.meshes.forEach((m, i) => {
        const a = O.a + i * Math.PI;
        m.position.set(P.x + Math.sin(a) * C.r, y + Math.sin(O.a * 2 + i) * 0.15, P.z + Math.cos(a) * C.r);
        m.rotation.set(Math.PI / 2, 0, O.a * 3);
        if (Math.random() < dt * 25) { const c = rgb(O.hex); g.fx.add.spawn({ x: m.position.x, y: m.position.y, z: m.position.z, life: 0.3, size: 0.1, size1: 0.01, r: c.r, g: c.g, b: c.b }); }
      });
      // mine: each tick, a cut on everything the rings' circle passes through
      if (O.mine && (O.tick -= dt) <= 0) {
        O.tick = C.tick;
        for (const e of g.enemiesAll()) {
          if (!e.alive || !levelOk(O.who, e)) continue;
          const d = Math.hypot(e.pos.x - P.x, e.pos.z - P.z);
          if (d < C.r + e.radius + 0.35 && d > C.r - e.radius - 0.9) this.weaponHit(O.who, e, C.dmg, C.poise);
        }
      }
    }
    this.orbits = this.orbits.filter((O) => {
      if (O.t > 0 && O.who.alive !== false) return true;
      for (const m of O.meshes) g.scene.remove(m);
      for (const w of O.hidden) w.visible = true;
      if (O.who === g.player) O.who.chakramOut = this.rings.some((R) => R.mine && R.hidden);
      return false;
    });
  }
  // Glass Storm, Shatterstep: the glass bursting into glints (Shatterstep's cuts too)
  glassBurst(p, at, size, cut = false) {
    this.g.vfx('glassShatter', at, glowOf(p), size);
    if (cut) this.physBlast(p, flat(at).setY(p.pos.y || 0), 2.0 * size, 16, 10);
  }

  // ---------- the Lantern Censer ----------
  // the lantern flaring in her hand (the heavy's wind-up, the special's lift)
  lanternFlare(p, life) { this.g.vfx('lanternFlare', this.g.myRef(), life, glowOf(p)); }
  // the floor left burning where the lantern's oil caught: it burns whatever stands in it
  fireFloor(p, at, r, dur) {
    at.y = p.pos.y || 0;
    this.g.vfx('fireFloor', at, r, dur, glowOf(p));
    const F = this.floors[this.floors.length - 1];
    if (F) { F.mine = true; F.p = p; }
  }
  addFloor(at, r, dur, hex) { this.floors.push({ x: at.x, y: at.y || 0, z: at.z, r, t: dur, dur, hex, c: rgb(hex), tick: 0.1, mine: false }); }
  updateFloors(dt) {
    const g = this.g;
    for (const F of this.floors) {
      F.t -= dt;
      const n = dt * 26 * F.r * Math.min(1, F.t / 0.5);
      for (let k = 0; k < n || Math.random() < n - k; k++) {
        const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * F.r;
        g.fx.add.spawn({ x: F.x + Math.cos(a) * rr, y: F.y + 0.08, z: F.z + Math.sin(a) * rr, vx: (Math.random() - 0.5) * 0.3, vy: 1.1 + Math.random() * 1.3, vz: (Math.random() - 0.5) * 0.3, life: 0.45 + Math.random() * 0.3, size: 0.2, size1: 0.03, r: F.c.r, g: F.c.g, b: F.c.b });
        if (k > 8) break;
      }
      if (F.mine && (F.tick -= dt) <= 0) {
        F.tick = 0.5;
        for (const e of g.enemiesAll()) {
          if (!e.alive || Math.abs((e.pos.y || 0) - F.y) > 1.2 || Math.hypot(e.pos.x - F.x, e.pos.z - F.z) > F.r + e.radius) continue;
          // the fire builds on it (the burn it catches is its own: status.js), and licks it a little
          e.status?.add('fire', (e.status.resist?.fire || 100) * 0.15, g);
          if (!e.puppet) g.statusDamage(e, 2.5 * NUM * (F.p?.dmgMul || 1), true, 'fire');
        }
      }
    }
    this.floors = this.floors.filter((F) => F.t > 0);
  }
  // Beacon: a pillar of fire where the lantern came down
  pillar(p, at, r, dmg) {
    this.g.vfx('firePillar', at, r, glowOf(p));
    this.g.comboBlast({ ...p, pos: at, cmbStag: p.cmbStag }, r, dmg * NUM, 30, 'fire');
    this.fireFloor(p, at.clone(), r * 0.6, 3);
  }
  // Blinding Flare: the lantern held up flares white-hot; everything that sees it within reach reels, blinded (a boss
  // or mini boss only falters, slowed for a while), and the light burns a little
  blindingFlare(p) {
    const g = this.g, at = p.rig.tip.getWorldPosition(new THREE.Vector3());
    g.vfx('flareBurst', at, FLARE.r, glowOf(p));
    for (const e of g.enemiesAll()) {
      if (!e.alive || !levelOk(p, e) || e.distTo(p) > FLARE.r + e.radius || !g.world.lineClear(p.pos.x, p.pos.z, e.pos.x, e.pos.z)) continue;
      const boss = e.isBoss || e.mini;
      g.spellDamage({ dmg: FLARE.dmg * NUM, poise: boss ? 0 : 999, pos: p.pos.clone(), kind: 'fire', noKnock: true }, e);
      if (boss && !g.isGuest) { e.chillFor?.(FLARE.bossSlow); }
      g.statusPopup(e, 'BLINDED', '#fff0c0');
    }
  }
  // Wildfire (the evolution): now and then the fire leaps from each burning enemy to the nearest that isn't burning
  updateWildfire(dt) {
    const g = this.g, p = g.player;
    if (!p?.alive || p.c?.weapon !== 'censer' || p.evo !== 'wildfire' || g.isGuest) return;
    if ((this.wildT -= dt) > 0) return;
    this.wildT = FLARE.wild.every;
    const all = g.enemiesAll().filter((e) => e.alive && e.status), burning = all.filter((e) => e.status.dots?.fire);
    let n = 0;
    for (const src of burning) {
      if (n >= FLARE.wild.max) break;
      let to = null, bd = FLARE.wild.leap;
      for (const e of all) if (e !== src && !e.status.dots?.fire) { const d = src.distTo(e); if (d < bd && g.world.lineClear(src.pos.x, src.pos.z, e.pos.x, e.pos.z)) { bd = d; to = e; } }
      if (!to) continue;
      n++;
      g.vfx('flameJump', chestOf(src), chestOf(to), glowOf(p));
      to.status.proc('fire', g); // (it catches: a burn of its own)
    }
  }

  update(dt) {
    if (this.rings.length) this.updateRings(dt);
    if (this.orbits.length) this.updateOrbits(dt);
    if (this.floors.length) this.updateFloors(dt);
    this.updateWildfire(dt);
  }
}

// ---------- what everyone sees ----------
const v3 = (a) => (a instanceof THREE.Vector3 ? a : new THREE.Vector3(a.x, a.y, a.z));
Object.assign(VFX, {
  // the piston firing: steam jetting off the head and a spray of sparks
  pbPuff(g, at, hex, own) {
    const P = v3(at), c = rgb(hex);
    for (let i = 0; i < 10; i++) g.fx.norm.spawn({ x: P.x, y: P.y + 0.2, z: P.z, vx: (Math.random() - 0.5) * 2.4, vy: 1 + Math.random() * 1.5, vz: (Math.random() - 0.5) * 2.4, life: 0.7, size: 0.18, size1: 0.6, r: 0.85, g: 0.85, b: 0.88, alpha: 0.5, drag: 1.5 });
    g.fx.sparks(P.clone().setY(P.y + 0.3), null, 14, [c.r, c.g, c.b]);
    g.fx.dust(P, 6, 0.8);
    g.audio[own ? 'play' : 'remote']('clang', 0.5);
  },
  // the boiler venting (Overpressure): a burst of fire off the head
  vent(g, at, hex, own) {
    const P = v3(at), c = rgb(hex);
    g.fx.burst(P, 36, [c.r, c.g, c.b], 6, 0.6, 0.26);
    for (let i = 0; i < 14; i++) g.fx.norm.spawn({ x: P.x, y: P.y, z: P.z, vx: (Math.random() - 0.5) * 4, vy: 1.5 + Math.random() * 2, vz: (Math.random() - 0.5) * 4, life: 0.9, size: 0.2, size1: 0.7, r: 0.8, g: 0.8, b: 0.85, alpha: 0.45, drag: 1.4 });
    g.fx.shockwave(P.x, P.z, 2.4, hex, 0.35);
    g.fx.addShake(own ? 0.35 : 0.15); g.audio[own ? 'play' : 'remote']('fire', 0.8);
  },
  // Piston Slam's split: cracks glowing down a straight line, dust along it; Overpressure: rock bursting up all along
  pistonLine(g, from, dir, len, over, hex, own) {
    const A = v3(from), D = v3(dir).normalize(), c = rgb(hex);
    const steps = Math.round(len / 0.9);
    for (let i = 1; i <= steps; i++) {
      const at = A.clone().addScaledVector(D, (i / steps) * len);
      setTimeout(() => {
        g.fx.dust(at, over ? 6 : 4, 0.6);
        g.fx.add.spawn({ x: at.x, y: at.y + 0.1, z: at.z, vy: 2, life: 0.4, size: 0.4, size1: 0.05, r: c.r, g: c.g, b: c.b });
        if (over) for (let k = 0; k < 3; k++) g.fx3d?.chip(at.clone().setY(at.y + 0.2), new THREE.Vector3((Math.random() - 0.5) * 3, 5 + Math.random() * 5, (Math.random() - 0.5) * 3), 0x4a4440);
        if (i % 2 === 0) g.fx3d?.cracks(at, over ? 1.1 : 0.7);
      }, i * 28);
    }
    g.fx3d?.slam(A, over ? 2.4 : 1.6, { color: hex });
    g.fx.addShake(own ? (over ? 0.9 : 0.6) : 0.3); g.audio[own ? 'play' : 'remote']('slam', over ? 1 : 0.8);
  },
  fireRing(g, at, r, hex, own) {
    const P = v3(at), c = rgb(hex);
    g.fx.shockwave(P.x, P.z, r, hex, 0.45); g.fx.shockwave(P.x, P.z, r * 0.6, hex, 0.3);
    for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2; g.fx.add.spawn({ x: P.x + Math.cos(a) * 0.6, y: P.y + 0.3, z: P.z + Math.sin(a) * 0.6, vx: Math.cos(a) * r * 2, vy: 0.8 + Math.random(), vz: Math.sin(a) * r * 2, life: 0.5, size: 0.3, size1: 0.05, r: c.r, g: c.g, b: c.b, drag: 2 }); }
    g.fx.addShake(own ? 0.5 : 0.2); g.audio[own ? 'play' : 'remote']('fire', 0.9);
  },
  rockBurst(g, at, r, hex, own) {
    const P = v3(at);
    g.fx3d?.slam(P, r, { color: hex });
    for (let i = 0; i < 14; i++) { const a = Math.random() * Math.PI * 2, s = 2 + Math.random() * r; g.fx3d?.chip(P.clone().setY(P.y + 0.2), new THREE.Vector3(Math.cos(a) * s, 5 + Math.random() * 5, Math.sin(a) * s), 0x4a4440); }
    g.fx.shockwave(P.x, P.z, r, 0xd8c8a0, 0.45); g.fx.dust(P, 20, r * 0.8);
    g.fx.addShake(own ? 0.8 : 0.35); g.audio[own ? 'play' : 'remote']('slam', 1);
  },
  // a thrown ring (or a shard) on a teammate's screen: the same flight, seen only
  chakram(g, ref, pts, ghost, hex) {
    const who = g.playerRef(ref); if (!who || who === g.player || !g.deepw) return;
    const P = []; for (let i = 0; i < pts.length; i += 3) P.push(new THREE.Vector3(pts[i], pts[i + 1], pts[i + 2]));
    const from = P.shift(), shard = ghost === 'shard';
    g.deepw.launch(who, from, P, { ghost: !!ghost, shard, hex, mine: false, dir: shard ? P[0].clone().sub(from).normalize() : null });
  },
  glint(g, at, hex) { const c = rgb(hex), P = v3(at); g.fx.sparks(P, null, 10, [c.r, c.g, c.b]); g.fx.add.spawn({ x: P.x, y: P.y, z: P.z, life: 0.18, size: 0.5, size1: 0.05, r: 1, g: 1, b: 1 }); },
  glassShatter(g, at, hex, size = 1) {
    const P = v3(at), c = rgb(hex);
    g.fx.burst(P, Math.round(30 * size), [c.r, c.g, c.b], 5 * size, 0.5, 0.16);
    g.fx.burst(P, Math.round(16 * size), [0.85, 0.95, 1], 4 * size, 0.4, 0.12);
    g.audio.play('clang', 0.4);
  },
  orbit(g, ref, dur, hex) { g.deepw?.addOrbit(g.playerRef(ref), dur, hex); },
  // the lantern flaring in its holder's hand (life s): a growing light at it, embers off it
  lanternFlare(g, ref, life, hex) {
    const who = g.playerRef(ref); if (!who?.rig?.tip) return;
    const c = rgb(hex), t0 = g.time, P = new THREE.Vector3();
    const tick = () => {
      if (g.time - t0 > life || !who.rig?.tip) return;
      who.rig.tip.getWorldPosition(P);
      for (let i = 0; i < 3; i++) g.fx.add.spawn({ x: P.x + (Math.random() - 0.5) * 0.2, y: P.y, z: P.z + (Math.random() - 0.5) * 0.2, vy: 1 + Math.random(), life: 0.4, size: 0.18 + (g.time - t0) / life * 0.3, size1: 0.02, r: c.r, g: c.g, b: c.b });
      requestAnimationFrame(tick);
    };
    tick();
  },
  fireFloor(g, at, r, dur, hex, own) {
    const P = v3(at), c = rgb(hex);
    g.deepw?.addFloor(P, r, dur, hex);
    g.fx.burst(P.clone().setY(P.y + 0.2), 18, [c.r, c.g, c.b], 3, 0.5, 0.2);
    g.fx.scorch?.(P.x, P.z, r * 0.8);
    g.audio[own ? 'play' : 'remote']('fire', 0.5);
  },
  firePillar(g, at, r, hex, own) {
    const P = v3(at), c = rgb(hex);
    for (let i = 0; i < 70; i++) { const a = Math.random() * Math.PI * 2, rr = Math.random() * r * 0.4; g.fx.add.spawn({ x: P.x + Math.cos(a) * rr, y: P.y + Math.random() * 0.5, z: P.z + Math.sin(a) * rr, vy: 5 + Math.random() * 6, life: 0.6 + Math.random() * 0.4, size: 0.45, size1: 0.05, r: c.r, g: c.g, b: c.b, drag: 0.5 }); }
    g.fx.shockwave(P.x, P.z, r, hex, 0.4);
    g.fx3d?.flash?.(P.clone().setY(P.y + 1.2), 2.4, c, 0.18);
    g.fx.addShake(own ? 0.6 : 0.25); g.audio[own ? 'play' : 'remote']('fire', 1);
  },
  flareBurst(g, at, r, hex, own) {
    const P = v3(at), c = rgb(hex);
    g.fx3d?.flash?.(P, 4, new THREE.Color(1, 0.97, 0.9), 0.25);
    g.fx.burst(P, 60, [1, 0.97, 0.88], 8, 0.5, 0.2);
    g.fx.burst(P, 40, [c.r, c.g, c.b], 6, 0.7, 0.22);
    g.fx.shockwave(P.x, P.z, r, 0xfff0c0, 0.4);
    g.fx.addShake(own ? 0.4 : 0.2); g.audio[own ? 'play' : 'remote']('fire', 1); g.audio[own ? 'play' : 'remote']('clang', 0.4);
  },
  // Wildfire: a tongue of fire leaping from one enemy to the next
  flameJump(g, a, b, hex) {
    const A = v3(a), B = v3(b), c = rgb(hex);
    for (let i = 0; i <= 14; i++) {
      const k = i / 14, P = A.clone().lerp(B, k); P.y += Math.sin(k * Math.PI) * 1.2;
      g.fx.add.spawn({ x: P.x, y: P.y, z: P.z, vy: 0.6, life: 0.35 + k * 0.2, size: 0.28, size1: 0.04, r: c.r, g: c.g, b: c.b });
    }
  },
});
