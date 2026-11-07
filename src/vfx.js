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
  // ---------- spellsword ----------
  impale(g, feet, hp, own) {
    g.pfx.play('circle', feet); g.pfx.play('boltHit', hp); g.fx.addShake(own ? 0.6 : 0.3);
  },
  // energy in the caster's hand until the spell leaves it; the fireball also draws a circle at the feet
  cast(g, who, big, life) {
    const p = g.playerRef(who);
    if (!p) return;
    const hand = { pos: new THREE.Vector3() };
    const follow = { get pos() { p.rig.j.handR.getWorldPosition(hand.pos); return hand.pos; } };
    const e = g.pfx.play(big ? 'charge' : 'chargeIce', follow.pos.clone(), { follow, life });
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
