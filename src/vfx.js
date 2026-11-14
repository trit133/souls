// Shared visual effects. game.vfx(name, ...args) plays a named effect here and sends it to everyone else
// in the party, whose screens play the very same effect (mp.js 'fx' event). Only the device that performed
// the action calls game.vfx, so nothing plays twice. Args are plain values, Vector3s, or entity refs
// ({ p: pid } for a player, { e: netId } for an enemy), resolved on each screen.
import * as THREE from 'three';
import { STATUS } from './status.js';

const v3 = (a) => (a instanceof THREE.Vector3 ? a : new THREE.Vector3(a.x, a.y, a.z));

export const VFX = {
  // ---------- knight ----------
  groundPound(g, at, own) {
    g.pfx.play('groundSlam', at);
    g.fx.shockwave(at.x, at.z, 3.2, 0xd8c8a0, 0.45);
    g.fx.dust(at, 18, 2.2);
    g.fx.addShake(own ? 0.9 : 0.45); g.audio[own ? 'play' : 'remote']('slam', 0.9);
  },
  kneeImpact(g, head, dir, own) {
    const up = new THREE.Vector3(dir.x * 0.6, 1.4, dir.z * 0.6).normalize();
    g.fx.blood(head, up, 46); g.fx.blood(head, dir.clone(), 20);
    g.fx.sparks(head, up, 14, [1, 0.85, 0.6]);
    g.pfx.play('bigCrit', head); g.pfx.play('hurt', head, { dir });
    g.fx.addShake(own ? 1.1 : 0.5); g.audio[own ? 'play' : 'remote']('bigHit', 1);
  },
  chargeStart(g, pos, own) {
    g.fx.dust(pos, 6, 0.9);
    if (!own) { g.audio.remote('roll', 1); g.audio.remote('clang', 0.4); }
  },
  bash(g, hp, dir, own) {
    g.pfx.play('block', hp, { dir });
    g.fx.sparks(hp, dir, 10, [1, 0.95, 0.8]);
    g.audio[own ? 'play' : 'remote']('clang', 0.8); g.audio[own ? 'play' : 'remote']('bigHit', 0.6);
    g.fx.addShake(own ? 0.4 : 0.2);
  },
  // ---------- rogue ----------
  shroud(g, pos) { g.pfx.play('shroud', pos); },
  redSlash(g, hp, dir) { g.pfx.play('redSlash', hp, { dir }); },
  redCrit(g, hp, own) { g.pfx.play('redCrit', hp); g.fx.addShake(own ? 0.6 : 0.3); },
  redPoof(g, pos) { g.pfx.play('redPoof', pos); },
  // ---------- the region weapons (weapons.js) ----------
  // the Psy-Staff's warding sigil (main.js placeSigil: on every screen; a Storm Sigil zaps from its owner's)
  sigil(g, pos, storm, ref, own) {
    g.placeSigil(v3(pos), storm, g.playerRef(ref)); g.audio[own ? 'play' : 'remote']('fire', 0.6);
    g.pfx.play('frostNova', v3(pos)); g.audio[own ? 'play' : 'remote']('clang', 0.35); // (the cold that freezes what's inside)
  },
  // the Psy-Staff's lash: a violet laser out of the focus (main.js fireBeam), a flare where it ends
  psyLaser(g, from, dir, len, own) {
    const a = v3(from), d = v3(dir).setY(0).normalize(), end = a.clone().addScaledVector(d, len);
    g.fireBeam(a, d, len, 0xb070ff);
    g.pfx.play('psyHit', end); g.fx.sparks(end, d, 14, [0.85, 0.6, 1]);
    g.fx.addShake(own ? 0.25 : 0.1); g.audio[own ? 'play' : 'remote']('fire', 0.5);
  },
  psyCharge(g, who, life) {
    const p = g.playerRef(who); if (!p) return;
    const at = { pos: new THREE.Vector3() };
    const follow = { get pos() { p.rig.tip.getWorldPosition(at.pos); return at.pos; } };
    g.pfx.play('psyCharge', follow.pos.clone(), { follow, life });
  },
  // the Wrist Blade's Ghost Veil: a puff of smoke, then the body a thin shade (or back)
  veil(g, ref, on) {
    const p = g.playerRef(ref); if (!p) return;
    g.pfx.play('shroud', p.pos.clone().setY(0.6));
    g.setVeiled(p, on);
  },
  // ---------- spellsword ----------
  impale(g, feet, hp, own) {
    g.pfx.play('circle', feet); g.pfx.play('boltHit', hp); g.fx.addShake(own ? 0.6 : 0.3);
  },
  // energy in the caster's hand until the spell leaves it; the fireball also draws a circle at the feet
  cast(g, who, big, life) {
    const p = g.playerRef(who);
    if (!p) return;
    // (in the casting hand; with the Psy-Staff, in its focus, and violet)
    const staff = p.c?.weapon === 'psystaff', hand = { pos: new THREE.Vector3() }, from = staff ? p.rig.tip : p.rig.j.handR;
    const follow = { get pos() { from.getWorldPosition(hand.pos); return hand.pos; } };
    const e = g.pfx.play(staff ? 'psyCharge' : big ? 'plasmaCharge' : 'chargeIce', follow.pos.clone(), { follow, life });
    if (p === g.player && p.castDef) p.castDef.charge = e;
    if (big) g.pfx.play('circle', p.pos.clone().setY(0.02));
  },
  explosion(g, at, size) { g.pfx.play('explosion', at, { size }); },
  boltHit(g, at) { g.pfx.play('boltHit', at); },
  // ---------- everyone ----------
  heal(g, who) {
    const p = g.playerRef(who);
    if (p) g.pfx.play('heal', p.pos, { follow: { pos: p.pos } });
  },
  // ---------- enemies (host) ----------
  statusProc(g, ref, kind) {
    const a = ref?.p != null ? g.playerRef(ref) : g.entityRef(ref);
    if (!a) return;
    const chest = { x: a.pos.x, y: 1.2 * a.rig.root.scale.y + (a.y || 0), z: a.pos.z };
    if (kind === 'bleed') { g.fx.blood(chest, null, 40); g.fx.burst(chest, 30, STATUS.bleed.rgb, 6, 0.7, 0.3); }
    else if (kind === 'frost') g.fx.burst(chest, 36, STATUS.frost.rgb, 5, 0.9, 0.3);
    else g.fx.burst(chest, 22, STATUS[kind].rgb, 3.5, 0.8, 0.28);
    g.statusPopup(a, STATUS[kind].name.toUpperCase(), STATUS[kind].color);
  },
  // ---------- combo finishers ----------
  crownCleave(g, at, own) { g.pfx.play('goldSlam', at); g.fx.burst({ x: at.x, y: 0.3, z: at.z }, 40, [1, 0.8, 0.3], 6, 0.7, 0.3); g.fx.addShake(own ? 0.6 : 0.3); },
  steelFlash(g, at, dir) { g.pfx.play('crit', at); g.fx.sparks(at, dir, 18, [1, 0.95, 0.8]); },
  impaleSteel(g, at, own) { g.pfx.play('bigCrit', at); g.fx.blood(at, null, 24); g.fx.addShake(own ? 0.6 : 0.3); },
  flurryEnd(g, at, dir) { g.pfx.play('redSlash', at, { dir }); g.pfx.play('redCrit', at, { size: 0.7 }); },
  xSlash(g, at, dir, blood) {
    const up = new THREE.Vector3(0, 1, 0);
    for (const s of [0.8, -0.8]) g.pfx.play('redSlash', at, { dir: dir.clone().applyAxisAngle(up, s).add(new THREE.Vector3(0, s * 0.6, 0)) });
    if (blood) { g.fx.blood(at, null, 34); g.pfx.play('redCrit', at); }
  },
  rimeBurst(g, at) { g.pfx.play('iceBurst', at); g.fx.burst(at, 30, [0.7, 0.9, 1], 5, 0.6, 0.22); },
  frostNova(g, at) { g.pfx.play('frostNova', at); g.fx.burst({ x: at.x, y: 0.6, z: at.z }, 60, [0.75, 0.92, 1], 7, 0.7, 0.24); g.fx.shockwave(at.x, at.z, 3.2, 0x9fdcff, 0.5); },
  lanceFan(g, at) { g.pfx.play('chargeIce', at); },
  shatter(g, at) { g.pfx.play('iceShatter', at); g.pfx.play('iceBlast', at, { size: 0.7 }); g.fx.burst({ x: at.x, y: 0.8, z: at.z }, 40, [0.8, 0.95, 1], 6, 0.7, 0.26); },
  // a boss or brute breaking out of a combo lock
  holdBurst(g, at, r, own) {
    g.fx.shockwave(at.x, at.z, r, 0xffe0a0, 0.5);
    g.fx.burst({ x: at.x, y: 1.0, z: at.z }, 60, [1, 0.85, 0.5], 9, 0.6, 0.3);
    g.pfx.play('blast', at, { size: 0.8 });
    g.audio.play('roar', 0.6); g.fx.addShake(own ? 0.7 : 0.4);
  },
  emberBlast(g, at) {
    g.pfx.play('blast', at);
    g.fx.burst({ x: at.x, y: 0.5, z: at.z }, 80, [1, 0.5, 0.1], 9, 1.0, 0.5);
  },
  ignite(g, ref) { const b = g.entityRef(ref); if (b) { b.rig.setGlow(1); b.elems = { fire: 0.3 }; } }, // his hits burn on every screen
};

// to the wire and back: Vector3s become {v:[x,y,z]}
export const pack = (x) => (x instanceof THREE.Vector3 ? { v: [+x.x.toFixed(2), +x.y.toFixed(2), +x.z.toFixed(2)] } : x);
export const unpack = (x) => (x && Array.isArray(x.v) ? new THREE.Vector3(...x.v) : x);
export { v3 };
