// The five seals of a dungeon (placed by dungeon.js). Break three to open the door to the mini boss; the fourth and
// fifth pay bonus gold. Each is guarded:
//   elite  - an elite and its pack stand round the shrine: kill them all and the seal breaks
//   circle - stand in the ring round the shrine for 30 s (time only runs with someone inside; it slips back slowly
//            when nobody is), while waves come in from the chamber's edges; when it breaks, every enemy left in
//            the chamber fades away
//   altar  - three cursed effigies stand round the shrine; once you come near, enemies pour out of it every few
//            seconds until all three are broken
//   valve  - (the Sump Lines) three flood valves stand round the shrine, 6-7 m out: stand at one for 5 s to turn it
//            (it slips back slowly when nobody is at it) while the drowned come in from the edges every 7 s; all three
//            open and the shrine drowns
//   bells  - (Saint Orsk's Spire) three bells hang in frames round the shrine and the choir sings a hymn of four notes
//            on them, again every 7 s: strike the bells in that order. A wrong bell starts the hymn over and calls
//            the choir's guards in; the fourth right note breaks the shrine. Every 14 s a straggler comes anyway
// The host (or a solo player) runs them and tells the party: 'seal' messages (event started, progress, broken) and
// 'rsv' for each enemy called in (they were built with the dungeon and wait off stage, so ids match everywhere).
import { NUM } from './scale.js';
import * as THREE from 'three';
import { SEALS_NEEDED } from './dungeon.js';

const HOLD_TIME = 30, WAVES = [0, 7, 14, 21], ALTAR_EVERY = 5;
const VALVE_TIME = 5, VALVE_REACH = 1.7, VALVE_EVERY = 7, BELL_EVERY = 7, NOTE = 0.85, BELL_TRICKLE = 14;
const BELL_COLORS = [0xff4a2a, 0xffd050, 0xb070ff]; // each bell its own colour, so the hymn can be read

const rgb = (hex) => [(hex >> 16 & 255) / 255, (hex >> 8 & 255) / 255, (hex & 255) / 255];

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
      if (s.def.valves) this.drawValves(s, dt);
      if (s.def.song) this.drawBells(s, dt);
      if (s.def.ring) {
        // the ring brightens while the circle is being held
        s.def.ring.material.opacity = s.state === 'active' ? 0.55 + Math.sin(g.time * 8) * 0.2 : s.state === 'broken' ? 0 : 0.3;
        s.def.ring.scale.setScalar(s.state === 'active' ? 1 - (s.prog / HOLD_TIME) * 0.15 : 1);
      }
    }
    // the boss door: three broken seals open it, whatever else happens (checked every frame, on every device)
    this.checkDoor();
    if (g.isGuest) return;
    // the host repeats which seals are broken every couple of seconds, so a teammate who missed one catches up
    if (g.mp.active && (this.syncT = (this.syncT ?? 2) - dt) <= 0) {
      this.syncT = 2;
      const b = this.list.filter((x) => x.state === 'broken').map((x) => x.def.i);
      if (b.length) g.mp.sendAll({ t: 'seal', s: 'sync', b });
    }
    this.sendT -= dt;
    for (const s of this.list) {
      if (s.state === 'broken') continue;
      const d = s.def;
      if (d.kind === 'elite') {
        if (d.guards.every((sp) => !sp.enemy.alive)) this.breakSeal(s);
      } else if (d.kind === 'altar') {
        const eff = d.effigies.map((sp) => sp.enemy);
        if (s.state === 'idle' && (this.playersNear(d.x, d.z, 10) || eff.some((e) => e.hp < e.maxHp))) this.start(s);
        if (s.state === 'active' && (s.spawnT -= dt) <= 0) { s.spawnT = ALTAR_EVERY; this.callIn(s, 2, true); } // (until its 8 / 9 / 10 are out)
        if (eff.every((e) => !e.alive)) this.breakSeal(s);
      } else if (d.kind === 'valve') {
        if (s.state === 'idle' && this.playersNear(d.x, d.z, 11)) { this.start(s); s.spawnT = 1.5; }
        if (s.state !== 'active') continue;
        for (const v of d.valves) {
          if (v.done) continue;
          v.prog = this.playersNear(v.x, v.z, VALVE_REACH) ? v.prog + dt : Math.max(0, v.prog - dt * 0.35);
          if (v.prog >= VALVE_TIME) { v.done = true; this.valveOpened(s, v); }
        }
        if ((s.spawnT -= dt) <= 0) { s.spawnT = VALVE_EVERY; this.callIn(s, 1 + this.world.dungeon.players, false); }
        if (d.valves.every((v) => v.done)) this.breakSeal(s);
        else if (this.sendT <= 0 && g.mp.active) g.mp.sendAll({ t: 'seal', i: d.i, s: 'p', v: d.valves.map((v) => Math.round(v.prog * 10) / 10) });
      } else if (d.kind === 'bells') {
        if (s.state === 'idle' && this.playersNear(d.x, d.z, 12)) this.start(s);
        if (s.state === 'active' && (s.spawnT = (s.spawnT ?? BELL_TRICKLE) - dt) <= 0) { s.spawnT = BELL_TRICKLE; this.callIn(s, 1, false); }
      } else {
        const inside = this.playersNear(d.x, d.z, d.radius);
        if (s.state === 'idle' && inside) this.start(s);
        if (s.state !== 'active') continue;
        s.prog = inside ? s.prog + dt : Math.max(0, s.prog - dt * 0.25);
        const due = WAVES.filter((t) => s.prog >= t).length;
        while (s.waves < due) { s.waves++; this.callIn(s, 1 + this.world.dungeon.players, false); } // 2 / 3 / 4 a wave by party size
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
    g.ui.toast({ circle: 'HOLD THE UPLINK', valve: 'OPEN THE FLOOD VALVES', bells: 'RING THE BELLS AS THE CHOIR SINGS' }[s.def.kind] || 'DESTROY THE HERETIC IDOLS', 2.2);
    if (s.def.song) { s.step = 0; s.playT = BELL_EVERY - 1.2; } // (the choir starts at once)
    if (!net && g.mp.active && !g.isGuest) g.mp.sendAll({ t: 'seal', i: s.def.i, s: 'a' });
  }

  breakSeal(s, net = false) {
    if (s.state === 'broken') return;
    const g = this.game, d = s.def;
    s.state = 'broken'; d.broken = true;
    d.crystal.visible = false; d.beam.visible = false;
    this.broken = this.list.filter((x) => x.state === 'broken').length;
    const opens = this.checkDoor();
    // whoever was still waiting to be called in stays away
    for (const sp of d.reserves) if (sp.enemy.reserve) g.reserves = g.reserves.filter((e) => e !== sp.enemy);
    // a held circle: everything still fighting in its chamber fades away (no gold or hearts; they count as cleared)
    if (d.kind === 'circle' && !g.isGuest) for (const e of g.enemies) {
      if (!e.alive || e.isBoss || e.mod !== d.mod) continue;
      try {
        e.vanished = true;
        g.fx.burst(new THREE.Vector3(e.pos.x, 1, e.pos.z), 18, [0.7, 0.5, 1], 3, 0.7, 0.25);
        e.die(true); e.rig.root.visible = false;
      } catch (err) { console.warn('circle clear', err); }
    }
    const at = new THREE.Vector3(d.x, 3.7, d.z);
    g.pfx?.play('parry', at);
    g.fx.burst(at, 40, [0.8, 0.5, 1], 6, 0.9, 0.3);
    g.fx.shockwave(d.x, d.z, 5);
    g.fx.addShake(0.4);
    g.audio.play('bonfire');
    if (!net && g.mp.active && !g.isGuest) g.mp.sendAll({ t: 'seal', i: d.i, s: 'b' });
    g.ui.toast(this.broken <= SEALS_NEEDED ? `WARD SHRINE BROKEN ${this.broken}/${SEALS_NEEDED}` : 'WARD SHRINE BROKEN', 2.5);
    if (opens) setTimeout(() => g.ui.toast('THE BLAST DOOR GRINDS OPEN', 3), 2600);
    this.drawLabel();
  }

  // the door to the mini boss opens once three seals are broken (true the moment it opens); nothing else counts.
  // Before the fight it's fog you can walk through; once the fight starts the fight closes it as usual
  checkDoor() {
    if (!this.enc || !this.enc.sealed || this.enc.active) return false;
    if (this.list.filter((x) => x.state === 'broken').length < SEALS_NEEDED) return false;
    this.enc.sealed = false;
    this.world.setGate(this.enc.gateIn, true, true);
    this.drawLabel();
    return true;
  }

  // party: the host's word on a seal
  onNet(d) {
    if (d.s === 'sync') { for (const i of d.b || []) { const x = this.list.find((y) => y.def.i === i); if (x && x.state !== 'broken') this.breakSeal(x, true); } return; }
    const s = this.list.find((x) => x.def.i === d.i);
    if (!s) return;
    if (d.s === 'a') this.start(s, true);
    else if (d.s === 'p') {
      if (s.state === 'idle') this.start(s, true);
      if (d.v) d.v.forEach((p, k) => { const v = s.def.valves?.[k]; if (v && !v.done) v.prog = p; }); else s.prog = d.p;
    }
    else if (d.s === 'vo') { const v = s.def.valves?.[d.k]; if (v && !v.done) { v.done = true; v.prog = VALVE_TIME; this.valveOpened(s, v, true); } }
    else if (d.s === 'bell') { if (s.state === 'idle') this.start(s, true); this.ring(s, d.b, !!d.ok, d.step, true); }
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
    const t = `LOCKED ${Math.min(this.broken, SEALS_NEEDED)}/${SEALS_NEEDED}`;
    g.strokeText(t, 128, 32); g.fillStyle = '#c99aff'; g.fillText(t, 128, 32);
    tex.needsUpdate = true;
  }

  // ---------- flood valves ----------
  valveOpened(s, v, net = false) {
    const g = this.game, d = s.def;
    g.fx.burst({ x: v.x, y: 1.9, z: v.z }, 30, [0.85, 0.95, 0.95], 4, 0.9, 0.3); // a gout of steam
    g.fx.shockwave(v.x, v.z, 2, 0x5ae0b0, 0.4);
    g.audio.play('clang', 0.8); g.audio.play('fog', 0.5);
    const k = d.valves.indexOf(v), n = d.valves.filter((x) => x.done).length;
    if (n < 3) g.ui.toastSmall?.(`VALVE OPEN ${n}/3`);
    if (!net && g.mp.active && !g.isGuest) g.mp.sendAll({ t: 'seal', i: d.i, s: 'vo', k });
  }
  // on every screen: a wheel turns while it's worked, its gauge creeps from red to green, steam spits from the vent
  drawValves(s, dt) {
    const g = this.game;
    for (const v of s.def.valves) {
      const k = Math.min(1, v.prog / VALVE_TIME), moving = s.state === 'active' && !v.done && v.prog > (v.last ?? 0) + 1e-4;
      v.last = v.prog;
      if (moving) { v.wheel.rotation.z -= dt * 2.4; if (Math.random() < dt * 12) g.fx.add.spawn({ x: v.x + (Math.random() - 0.5) * 0.3, y: 2.1, z: v.z + (Math.random() - 0.5) * 0.3, vy: 1.6, life: 0.8, size: 0.2, size1: 0.6, r: 0.8, g: 0.85, b: 0.85, alpha: 0.5 }); }
      v.lamp.color.setRGB(1 - k * 0.65, 0.23 + k * 0.65, 0.14 + k * 0.5);
      v.needle.rotation.z = 1.2 - k * 2.4;
    }
  }

  // ---------- choir bells ----------
  // a strike on one of a shrine's bells (foes.js chime: called where the enemies are run, the host in a party)
  strike(e) {
    const g = this.game;
    if (g.isGuest) return;
    for (const s of this.list) {
      const d = s.def, b = d.chimes?.findIndex((sp) => sp.enemy === e) ?? -1;
      if (b < 0) continue;
      if (s.state === 'broken') return;
      if (g.time - (s.struckAt ?? -9) < 0.35) return; // (a combo's hits are one strike)
      s.struckAt = g.time;
      if (s.state === 'idle') this.start(s);
      const ok = d.song[s.step || 0] === b;
      const step = ok ? (s.step || 0) + 1 : 0;
      if (g.mp.active) g.mp.sendAll({ t: 'seal', i: d.i, s: 'bell', b, ok: ok ? 1 : 0, step });
      this.ring(s, b, ok, step);
      if (!ok) this.callIn(s, 1 + this.world.dungeon.players, false); // the choir answers a wrong note
      else if (step >= d.song.length) this.breakSeal(s);
      return;
    }
  }
  // a bell rung (on every screen): it swings, sounds, and flashes gold (right) or red (wrong, and the hymn starts over)
  ring(s, b, ok, step, net = false) {
    const g = this.game, d = s.def, e = d.chimes?.[b]?.enemy;
    s.step = step;
    if (e) { e.swing = 1; g.fx.burst({ x: e.pos.x, y: 2.1, z: e.pos.z }, ok ? 22 : 14, ok ? [1, 0.85, 0.4] : [1, 0.25, 0.15], 4, 0.6, 0.25); g.fx.shockwave(e.pos.x, e.pos.z, ok ? 2.5 : 1.6, ok ? 0xffd070 : 0xff3a24, 0.4); e.flashT = 0.5; e.flashOk = ok; }
    g.audio.play('clang', ok ? 0.9 : 0.6); if (ok) g.audio.play('parry', 0.25);
    if (!ok) { g.ui.toastSmall?.('A WRONG NOTE · THE CHOIR ANSWERS'); s.playT = BELL_EVERY - 1.5; }
    else if (step < d.song.length) g.ui.toastSmall?.(`THE HYMN ${step}/${d.song.length}`);
  }
  // on every screen: the choir sings the hymn on the bells every few seconds (each bell lights in its colour); a
  // struck bell swings and flashes
  drawBells(s, dt) {
    const g = this.game, d = s.def;
    let singing = -1;
    if (s.state === 'active') {
      s.playT = (s.playT ?? 0) + dt;
      if (s.playT >= BELL_EVERY) {
        const t = s.playT - BELL_EVERY, n = Math.floor(t / NOTE);
        if (n >= d.song.length) s.playT = 0;
        else {
          singing = d.song[n];
          if (n !== s.sung) { s.sung = n; const e = d.chimes?.[singing]?.enemy; if (e) { e.swing = 0.6; g.audio.play('clang', 0.35); g.fx.burst({ x: e.pos.x, y: 2.3, z: e.pos.z }, 8, rgb(BELL_COLORS[singing]), 2, 0.6, 0.2); } }
        }
      } else s.sung = -1;
    }
    (d.chimes || []).forEach((sp, k) => {
      const e = sp.enemy; if (!e?.rig?.bellGlow) return;
      e.swing = Math.max(0, (e.swing || 0) - dt * 1.2); e.flashT = Math.max(0, (e.flashT || 0) - dt);
      if (e.rig.bellG) e.rig.bellG.rotation.x = Math.sin(g.time * 9) * 0.35 * e.swing;
      const c = e.rig.bellGlow.color;
      if (s.state === 'broken') c.setHex(0x1a140a);
      else if (e.flashT > 0) c.setHex(e.flashOk ? 0xfff0b0 : 0xff2a14);
      else if (singing === k) c.setHex(BELL_COLORS[k]);
      else c.setHex(BELL_COLORS[k]).multiplyScalar(s.state === 'active' ? 0.22 : 0.12);
    });
  }

  // a line for the HUD while you stand in a seal's chamber during its event
  promptFor(p) {
    for (const s of this.list) {
      if (s.state !== 'active') continue;
      const d = s.def;
      if (Math.hypot(p.pos.x - d.x, p.pos.z - d.z) > 16) continue;
      if (d.kind === 'circle') {
        const inside = Math.hypot(p.pos.x - d.x, p.pos.z - d.z) < d.radius;
        return `${inside ? 'HOLD THE UPLINK' : 'GET IN THE UPLINK'} · ${Math.max(0, Math.ceil(HOLD_TIME - s.prog))}s`;
      }
      if (d.kind === 'altar') return `DESTROY THE IDOLS · ${d.effigies.filter((sp) => !sp.enemy.alive).length}/3`;
      if (d.kind === 'valve') {
        const at = d.valves.find((v) => !v.done && Math.hypot(p.pos.x - v.x, p.pos.z - v.z) < VALVE_REACH);
        return `OPEN THE FLOOD VALVES · ${d.valves.filter((v) => v.done).length}/3${at ? ` · TURNING ${Math.round(at.prog / VALVE_TIME * 100)}%` : ' · STAND AT A VALVE'}`;
      }
      if (d.kind === 'bells') return `STRIKE THE BELLS AS THE CHOIR SINGS · ${s.step || 0}/${d.song.length}`;
    }
    return null;
  }
}
