// The five seals of a dungeon (placed by dungeon.js). Break three to open the door to the mini boss; the fourth and
// fifth pay bonus gold. Each is guarded:
//   elite  - an elite and its pack stand round the shrine: kill them all and the seal breaks
//   circle - stand in the ring round the shrine for 30 s (time only runs with someone inside; it slips back slowly
//            when nobody is), while waves come in from the chamber's edges
//   altar  - three cursed effigies stand round the shrine; once you come near, enemies pour out of it every few
//            seconds until all three are broken
// The host (or a solo player) runs them and tells the party: 'seal' messages (event started, progress, broken) and
// 'rsv' for each enemy called in (they were built with the dungeon and wait off stage, so ids match everywhere).
import * as THREE from 'three';
import { SEALS_NEEDED } from './dungeon.js';

const HOLD_TIME = 30, WAVES = [0, 7, 14, 21], ALTAR_EVERY = 5;
export const SEAL_BONUS = 8; // gold for each seal past the third

export class Seals {
  constructor(game) {
    this.game = game; this.list = []; this.broken = 0; this.label = null; this.sendT = 0;
  }

  setup(world) {
    this.world = world;
    this.list = (world.seals || []).map((def) => ({ def, state: 'idle', prog: 0, waves: 0, spawnT: 0 }));
    this.broken = 0;
    this.enc = world.dungeon?.enc || null;
    this.label = null;
    if (this.enc) this.makeLabel();
  }

  get active() { return this.list.length > 0; }
  playersNear(x, z, r) { return this.game.allPlayers().some((p) => p.alive && Math.hypot(p.pos.x - x, p.pos.z - z) < r); }

  update(dt) {
    if (!this.list.length) return;
    const g = this.game;
    for (const s of this.list) {
      if (s.def.ring) {
        // the ring brightens while the circle is being held
        s.def.ring.material.opacity = s.state === 'active' ? 0.55 + Math.sin(g.time * 8) * 0.2 : s.state === 'broken' ? 0 : 0.3;
        s.def.ring.scale.setScalar(s.state === 'active' ? 1 - (s.prog / HOLD_TIME) * 0.15 : 1);
      }
    }
    if (g.isGuest) return;
    this.sendT -= dt;
    for (const s of this.list) {
      if (s.state === 'broken') continue;
      const d = s.def;
      if (d.kind === 'elite') {
        if (d.guards.every((sp) => !sp.enemy.alive)) this.breakSeal(s);
      } else if (d.kind === 'altar') {
        const eff = d.effigies.map((sp) => sp.enemy);
        if (s.state === 'idle' && (this.playersNear(d.x, d.z, 10) || eff.some((e) => e.hp < e.maxHp))) this.start(s);
        if (s.state === 'active' && (s.spawnT -= dt) <= 0) { s.spawnT = ALTAR_EVERY; this.callIn(s, 2, true); }
        if (eff.every((e) => !e.alive)) this.breakSeal(s);
      } else {
        const inside = this.playersNear(d.x, d.z, d.radius);
        if (s.state === 'idle' && inside) this.start(s);
        if (s.state !== 'active') continue;
        s.prog = inside ? s.prog + dt : Math.max(0, s.prog - dt * 0.25);
        const due = WAVES.filter((t) => s.prog >= t).length;
        while (s.waves < due) { s.waves++; this.callIn(s, 3, false); }
        if (s.prog >= HOLD_TIME) this.breakSeal(s);
        else if (this.sendT <= 0 && g.mp.active) g.mp.sendAll({ t: 'seal', i: d.i, s: 'p', p: Math.round(s.prog * 10) / 10 });
      }
    }
    if (this.sendT <= 0) this.sendT = 0.25;
  }

  // bring n waiting enemies into the fight: out of the altar, or in from the chamber's edges
  callIn(s, n, fromAltar) {
    const d = s.def, g = this.game;
    for (let k = 0; k < n; k++) {
      const sp = d.reserves.find((r) => r.enemy.reserve);
      if (!sp) return;
      let x, z;
      if (fromAltar) { const a = Math.random() * Math.PI * 2; x = d.x + Math.cos(a) * 2.2; z = d.z + Math.sin(a) * 2.2; }
      else { const p = d.spawnPts[Math.floor(Math.random() * d.spawnPts.length)]; x = p.x + (Math.random() - 0.5); z = p.z + (Math.random() - 0.5); }
      g.activateReserve(sp.enemy, x, z);
    }
  }

  start(s, net = false) {
    if (s.state !== 'idle') return;
    s.state = 'active';
    const g = this.game;
    g.audio.play('fog');
    g.ui.toast(s.def.kind === 'circle' ? 'HOLD THE CIRCLE' : 'BREAK THE CURSED EFFIGIES', 2.2);
    if (!net && g.mp.active && !g.isGuest) g.mp.sendAll({ t: 'seal', i: s.def.i, s: 'a' });
  }

  breakSeal(s, net = false) {
    if (s.state === 'broken') return;
    const g = this.game, d = s.def;
    s.state = 'broken'; d.broken = true;
    d.crystal.visible = false; d.beam.visible = false;
    // whoever was still waiting to be called in stays away
    for (const sp of d.reserves) if (sp.enemy.reserve) g.reserves = g.reserves.filter((e) => e !== sp.enemy);
    const at = new THREE.Vector3(d.x, 3.7, d.z);
    g.pfx?.play('parry', at);
    g.fx.burst(at, 40, [0.8, 0.5, 1], 6, 0.9, 0.3);
    g.fx.shockwave(d.x, d.z, 5);
    g.fx.addShake(0.4);
    g.audio.play('bonfire');
    this.broken++;
    if (!net && g.mp.active && !g.isGuest) g.mp.sendAll({ t: 'seal', i: d.i, s: 'b' });
    if (this.broken <= SEALS_NEEDED) g.ui.toast(`SEAL BROKEN ${this.broken}/${SEALS_NEEDED}`, 2.5);
    else {
      g.bankNow(SEAL_BONUS, 'seal' + g.act + ':' + d.i);
      g.ui.toast(`SEAL BROKEN · BONUS ◆ +${SEAL_BONUS}`, 2.5);
    }
    if (this.broken === SEALS_NEEDED && this.enc) {
      this.enc.sealed = false;
      this.world.setGate(this.enc.gateIn, true, true); // fog you can walk through, as before any boss
      setTimeout(() => g.ui.toast('THE SEALED DOOR HAS OPENED', 3), 2600);
    }
    this.drawLabel();
  }

  // party: the host's word on a seal
  onNet(d) {
    const s = this.list.find((x) => x.def.i === d.i);
    if (!s) return;
    if (d.s === 'a') this.start(s, true);
    else if (d.s === 'p') { if (s.state === 'idle') this.start(s, true); s.prog = d.p; }
    else if (d.s === 'b') this.breakSeal(s, true);
  }

  // "SEALED 1/3" over the boss door
  makeLabel() {
    const gate = this.world.gates[this.enc.gateIn];
    const c = document.createElement('canvas'); c.width = 256; c.height = 64;
    const tex = new THREE.CanvasTexture(c);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    s.scale.set(4, 1, 1); s.position.set(gate.x, gate.alongX ? 4.2 : 6.6, gate.z); s.renderOrder = 9;
    this.world.mods[this.enc.mod].group.add(s);
    this.label = { s, c, tex };
    this.drawLabel();
  }

  drawLabel() {
    if (!this.label) return;
    const { c, tex, s } = this.label, g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    const open = this.broken >= SEALS_NEEDED;
    s.visible = !open;
    g.font = 'bold 34px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 6; g.strokeStyle = '#000';
    const t = `SEALED ${Math.min(this.broken, SEALS_NEEDED)}/${SEALS_NEEDED}`;
    g.strokeText(t, 128, 32); g.fillStyle = '#c99aff'; g.fillText(t, 128, 32);
    tex.needsUpdate = true;
  }

  // a line for the HUD while you stand in a seal's chamber during its event
  promptFor(p) {
    for (const s of this.list) {
      if (s.state !== 'active') continue;
      const d = s.def;
      if (Math.hypot(p.pos.x - d.x, p.pos.z - d.z) > 16) continue;
      if (d.kind === 'circle') {
        const inside = Math.hypot(p.pos.x - d.x, p.pos.z - d.z) < d.radius;
        return `${inside ? 'HOLD THE CIRCLE' : 'GET IN THE CIRCLE'} · ${Math.max(0, Math.ceil(HOLD_TIME - s.prog))}s`;
      }
      if (d.kind === 'altar') return `BREAK THE EFFIGIES · ${d.effigies.filter((sp) => !sp.enemy.alive).length}/3`;
    }
    return null;
  }
}
