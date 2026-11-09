import * as THREE from 'three';
import { Actor, angDiff } from './actor.js';
import { buildHumanoid } from './models.js';
import { locomotion, P, sample } from './anims.js';
import { Trail } from './fx.js';
import { CHARS, RIPOSTE, CRITS } from './player.js';
import { outfitModel } from './playerkits.js';
import { packOutfit, unpackOutfit } from './outfits.js';
import { SERVER } from './account.js';

// Party play. The host's browser simulates enemies and bosses and streams snapshots;
// each player simulates only their own character, so dodges and parries are judged on
// the device of the player being hit. All traffic relays through server/index.js.

const r2 = (v) => Math.round(v * 100) / 100;

// another player, as seen on this device
class RemotePlayer extends Actor {
  constructor(game, m) {
    const c = CHARS[m.kind] || CHARS.knight;
    super(game, buildHumanoid({ ...outfitModel(c.model, m.kind, m.outfit || {}), scale: 1 }), { x: 0, z: -2.5, hp: c.hp, radius: 0.42, team: 'player', poise: 0 });
    this.isRemote = true;
    this.pid = m.id; this.uid = 'R' + m.id; this.name = m.name; this.kind = m.kind; this.c = c;
    this.isPlayer = true; this.dmgMul = 1; this.phase = 0; this.s = { st: 'move' }; this.net = null;
    this.play = null; // attack playing out from an instant event, not from snapshots
    this.trail = new Trail(game.scene, c.trail);
    if (c.dual) this.trailL = new Trail(game.scene, c.trail);
  }

  remove() { super.remove(); this.trailL?.dispose(this.game.scene); }

  // show a swing right away and let it run its full length here
  startPlay(def, rate = 1) { this.play = { def, t: 0, rate, sfx: false }; }

  apply(d) {
    this.net = d; this.alive = d.alive; this.hp = d.hp; this.maxHp = d.maxHp;
    this.t = 0; // tt below is "time at this snapshot" + time since it arrived
    this.s = d;
  }

  // the victim's device decides what a hit does (i-frames, block)
  receive(info) {
    this.game.mp.send({ t: 'pdmg', dmg: info.dmg, knock: info.knock, src: [info.srcPos.x, info.srcPos.z] }, this.pid);
    return 'sent';
  }

  update(dt) {
    if (!this.net) return;
    this.t += dt;
    const k = 1 - Math.exp(-14 * dt), ox = this.pos.x, oz = this.pos.z;
    // a blink or a dash through an enemy snaps rather than sliding across the floor
    if (Math.hypot(this.net.x - ox, this.net.z - oz) > 2.5) { this.pos.x = this.net.x; this.pos.z = this.net.z; }
    else { this.pos.x += (this.net.x - ox) * k; this.pos.z += (this.net.z - oz) * k; }
    this.yaw += angDiff(this.yaw, this.net.yaw) * k;
    const sp = Math.hypot(this.pos.x - ox, this.pos.z - oz) / Math.max(dt, 1e-3);
    this.phase += dt * (2.5 + sp * 1.6);
    const base = locomotion(this.c.style, this.phase, sp / this.c.walk, false, this.game.time);
    const st = this.s.st, tt = (this.s.tt || 0) + this.t;
    let pose = base, trail = false;
    const P0 = this.play;
    if (P0) {
      P0.t += dt * P0.rate;
      const fx = P0.def.sfx;
      if (fx && !P0.sfx && P0.t >= fx[0]) { P0.sfx = true; this.game.audio.remote(fx[1]); }
      // extra swing sounds inside a move (the guard counter's backhand)
      if (P0.def.onTime) for (const ev of P0.def.onTime) if (ev.sfx && !P0['s' + ev.t] && P0.t >= ev.t) { P0['s' + ev.t] = true; this.game.audio.remote(ev.sfx); }
      if (P0.t >= P0.def.dur || st === 'hurt' || st === 'knockdown' || st === 'dead' || st === 'roll') this.play = null;
      else { pose = sample(P0.def.keys, P0.t, base); trail = !!P0.def.trail && P0.t >= P0.def.trail[0] && P0.t <= P0.def.trail[1]; }
    }
    // the move's own body language: jump height, vanishing in the shroud, a reverse-grip dagger
    const D = this.play?.def, t = this.play?.t ?? 0;
    this.y = D?.jump && t > D.jump[0] && t < D.jump[1] ? D.jump[2] * Math.sin(Math.PI * (t - D.jump[0]) / (D.jump[1] - D.jump[0])) : 0;
    this.rig.root.visible = !(D?.vanish && t >= D.vanish[0] && t < D.vanish[1]);
    this.rig.reverse = !!(D?.reverse && t >= D.reverse[0] && t < D.reverse[1]);
    if (this.rig.wpnR && !this.rig.fx) this.rig.wpnR.rotation.x = this.rig.reverse ? Math.PI : 0;
    if (this.kind === 'knight') {
      if (!this.spectral) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.46 * this.c.model.bulk * 1.2, 1.7, 0.06),
          new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }));
        m.position.set(0, 1.05, 0.75); this.rig.root.add(m); this.spectral = m;
      }
      this.spectral.visible = st === 'charge';
      if (this.spectral.visible) this.spectral.material.opacity = 0.45 + Math.sin(this.game.time * 30) * 0.1;
    }
    const hand = P0?.def.hand || 'R';
    this.trail.update(dt, trail && hand !== 'L', this.rig.base, this.rig.tip);
    this.trailL?.update(dt, trail && (hand === 'L' || hand === 'B'), this.rig.baseL, this.rig.tipL);
    if (this.play) { /* the swing already set the pose */ }
    else if (st === 'charge') pose = { ...base, ...P.block, legL: [-0.6, 0, 0.05], legR: [0.5, 0, -0.05], shinR: [0.5, 0, 0], torso: [0.35, -0.1, 0], by: -0.12 };
    else if (st === 'cast') pose = { ...base, torso: [0.1, -0.35, 0], armR: [-1.55, 0, 0.1], foreR: [0, 0, 0], handR: [1.5, 0, 0] };
    else if (st === 'roll') pose = { ...base, ...P.roll(Math.min(1, tt / this.c.roll.dur)) };
    else if (st === 'backstep') pose = { ...base, ...P.backstep };
    else if (st === 'hurt') pose = { ...base, ...P.hurt };
    else if (st === 'knockdown') pose = P.knockdown;
    else if (st === 'dead') pose = P.dead;
    else if (st === 'rest') pose = P.rest;
    else if (st === 'heal') pose = { ...base, ...P.heal };
    else if (this.s.b) pose = { ...base, ...P.block };
    this.syncRig(dt, pose, this.play ? 28 : 22);
  }
}

export class Multiplayer {
  constructor(game) {
    this.game = game;
    this.ws = null; this.id = null; this.host = null; this.members = []; this.code = null;
    this.active = false; // in a running party run
    this.peers = new Map();
    this.picked = new Set();
    this.ready = new Set();
    this.clock = 0;
    this.chatLog = []; // { name, text, me?, sys? }
    this.sentAt = [];
  }

  get isHost() { return this.id !== null && this.id === this.host; }

  // brief network failures are retried before giving up
  async connect() {
    if (this.ws?.readyState === 1) return;
    for (let i = 0; ; i++) {
      try { return await this.open(); } catch (e) {
        if (i >= 2) throw e;
        await new Promise((ok) => setTimeout(ok, 800 * (i + 1)));
      }
    }
  }

  open() {
    return new Promise((ok, no) => {
      const ws = new WebSocket(SERVER.replace(/^http/, 'ws') + '/ws');
      let ready = false;
      const fail = () => no(new Error("Can't reach the game server. Try switching between Wi-Fi and cellular."));
      this.ws = ws;
      ws.onopen = () => ws.send(JSON.stringify({ t: 'auth', token: this.game.accounts.token }));
      ws.onerror = fail;
      ws.onclose = () => { if (!ready) fail(); else if (this.ws === ws) this.dropped(); };
      ws.onmessage = (e) => {
        const m = JSON.parse(e.data);
        if (m.t === 'hello') { ready = true; this.id = m.id; ok(); } else this.onServer(m);
      };
    });
  }

  raw(m) { if (this.ws?.readyState === 1) this.ws.send(JSON.stringify(m)); }
  // the class and the outfit worn, so teammates see it: "knight:helmet=winged/gold/default,..."
  wire(kind) { return `${kind}:${packOutfit(this.game.equippedOutfit(kind))}`; }
  async create(kind) { await this.connect(); this.raw({ t: 'create', kind: this.wire(kind) }); }
  async join(code, kind) { await this.connect(); this.raw({ t: 'join', code, kind: this.wire(kind) }); }
  setKind(kind) { this.raw({ t: 'kind', kind: this.wire(kind) }); }

  // guests talk to the host; the host talks to everyone (or one player)
  send(d, to) { this.raw({ t: 'relay', d, to: to ?? (this.isHost ? undefined : this.host) }); }
  sendAll(d) { this.raw({ t: 'relay', d }); }

  leave() {
    this.raw({ t: 'leave' });
    this.reset();
  }

  reset() {
    for (const p of this.peers.values()) p.remove();
    this.peers.clear();
    this.active = false; this.code = null; this.members = []; this.picked.clear(); this.ready.clear();
    this.chatLog = [];
  }

  // lobby chat rides the room relay; the server never reads it
  chat(text) {
    text = String(text).trim().slice(0, 140);
    if (!text || !this.code) return false;
    const now = Date.now();
    this.sentAt = this.sentAt.filter((t) => now - t < 4000);
    if (this.sentAt.length >= 5) { this.addChat({ sys: true, text: 'Slow down a little' }); return false; }
    this.sentAt.push(now);
    this.sendAll({ t: 'chat', s: text });
    this.addChat({ name: this.nameOf(this.id), text, me: true });
    return true;
  }

  nameOf(id) { return this.members.find((x) => x.id === id)?.name || 'Someone'; }

  addChat(line) {
    this.chatLog.push(line);
    if (this.chatLog.length > 80) this.chatLog.shift();
    this.game.renderChat();
  }

  dropped() {
    const was = this.active;
    this.ws = null; this.id = null; this.reset();
    this.game.onPartyClosed(was ? 'Connection lost' : null);
  }

  onServer(m) {
    if (m.t === 'roster') {
      const before = this.code === m.code ? this.members : null;
      this.code = m.code; this.host = m.host;
      this.members = m.members.map((x) => { const s = String(x.kind), i = s.indexOf(':'), kind = i < 0 ? s : s.slice(0, i); return { ...x, kind, outfit: unpackOutfit(kind, i < 0 ? '' : s.slice(i + 1)) }; });
      if (!before) this.addChat({ sys: true, text: `You're in room ${m.code}` });
      else {
        for (const x of m.members) if (!before.some((y) => y.id === x.id)) this.addChat({ sys: true, text: `${x.name} joined` });
        for (const x of before) if (!m.members.some((y) => y.id === x.id)) this.addChat({ sys: true, text: `${x.name} left` });
      }
      this.game.renderLobby();
    } else if (m.t === 'error') this.game.lobbyError(m.error);
    else if (m.t === 'closed') { const was = this.active; this.reset(); this.game.onPartyClosed(m.reason, was); } else if (m.t === 'left') {
      const p = this.peers.get(m.id);
      if (p) { p.remove(); this.peers.delete(m.id); }
      this.picked.delete(m.id);
      this.ready.delete(m.id);
      if (this.active) { this.game.ui.toastSmall('A player left'); if (this.isHost) { this.checkPicks(); this.checkWipe(); } if (this.game.mode === 'over') this.afterReady(); }
    } else if (m.t === 'relay') this.handle(m.from, m.d);
  }

  // instant one-off action from this player, shown (and heard at half volume) by the others
  event(e) { if (this.active) this.sendAll({ t: 'e', ...e }); }

  onEvent(from, d) {
    const g = this.game, p = this.peers.get(from);
    if (d.k === 'swing') { const def = p?.c.attacks[d.a]; if (def) p.startPlay(def, d.r); } else if (d.k === 'riposte') p?.startPlay(CRITS[d.c] || RIPOSTE, d.r);
    else if (d.k === 'sfx') g.audio.remote(d.s, d.v ?? 1);
    else if (d.k === 'fx') g.playVfx(d.n, d.a || []);
    else if (d.k === 'hit' || d.k === 'rip') {
      // a teammate striking an enemy
      const e = this.entity(d.id);
      g.audio.remote(d.k === 'rip' ? 'riposte' : d.heavy ? 'bigHit' : 'hit', 0.9);
      if (e) {
        e.rig.flash(1, 0.9, 0.8);
        const c = new THREE.Vector3(e.pos.x, 1.1 * e.rig.root.scale.y, e.pos.z);
        const dir = p ? new THREE.Vector3(e.pos.x - p.pos.x, 0, e.pos.z - p.pos.z).normalize() : null;
        g.fx.blood(c, dir, d.k === 'rip' ? 30 : d.heavy ? 16 : 9); g.fx.sparks(c, dir, 5, [1, 0.6, 0.3]);
        if (d.k === 'rip') { g.pfx.play('crit', c); g.fx.burst(c, 20, [1, 0.3, 0.2], 5, 0.6, 0.25); }
        else g.pfx.play(d.heavy ? 'heavyHit' : 'hit', c, { dir });
        if (d.d) g.dmgPops(e, d.d, d.k === 'rip' ? 'teamcrit' : 'team');
      }
    } else if (p && d.k === 'hurt') {
      // a teammate taking a hit
      p.rig.flash(1, 0.3, 0.2);
      const c = new THREE.Vector3(p.pos.x, 1.1, p.pos.z);
      g.fx.blood(c, null, 12); g.pfx.play('hurt', c, { dir: p.fwd().clone().negate() });
      g.audio.remote(d.heavy ? 'bigHit' : 'hurt');
    } else if (p && d.k === 'block') {
      const c = new THREE.Vector3(p.pos.x, 1.1, p.pos.z).addScaledVector(p.fwd(), 0.5);
      g.fx.sparks(c, null, 12); g.pfx.play('block', c, { dir: p.fwd().clone() });
      g.audio.remote('clang');
    } else if (p && d.k === 'parry') {
      const c = new THREE.Vector3(p.pos.x, 1.2, p.pos.z).addScaledVector(p.fwd(), 0.6);
      g.fx.sparks(c, null, 22, [1, 0.95, 0.7]); g.pfx.play('parry', c);
      g.audio.remote('parry');
    }
  }

  // after a run: everyone readies up, then the host rolls a new one in the same room
  setReady() {
    this.ready.add(this.id);
    this.sendAll({ t: 'ready' });
    this.afterReady();
  }

  afterReady() {
    const n = this.members.length;
    this.game.renderReady(this.ready.size, n);
    if (this.isHost && n >= 2 && this.members.every((m) => this.ready.has(m.id))) this.startRun();
    else if (this.isHost && n < 2) this.game.renderReady(-1, n);
  }

  startRun() {
    if (!this.isHost || this.members.length < 2) return;
    const g = this.game, layout = g.newLayout(), seed = (Math.random() * 1e9) | 0;
    this.raw({ t: 'started' });
    this.sendAll({ t: 'start', layout, seed });
    this.begin(layout, seed);
  }

  begin(layout, seed) {
    for (const p of this.peers.values()) p.remove();
    this.peers.clear(); this.ready.clear(); this.picked.clear();
    this.active = true;
    const me = this.members.find((x) => x.id === this.id);
    this.game.startParty(me.kind, layout, seed, this.members.length);
    for (const m of this.members) if (m.id !== this.id) this.peers.set(m.id, new RemotePlayer(this.game, m));
  }

  entity(id) { return this.game.netMap?.[id]; }

  handle(from, d) {
    const g = this.game;
    switch (d.t) {
      case 'start': this.begin(d.layout, d.seed); break;
      case 'chat': if (typeof d.s === 'string' && d.s.trim()) this.addChat({ name: this.nameOf(from), text: d.s.trim().slice(0, 140) }); break;
      case 'e': this.onEvent(from, d); break;
      case 'ready': this.ready.add(from); this.afterReady(); break;
      case 'p': this.peers.get(from)?.apply(d); break;
      case 'snap': for (const s of d.e) this.entity(s[0])?.applySnapshot(s); break;
      case 'gold': g.runGold = d.n; if (d.s) g.secGold = d.s; break;
      case 'room': g.openRoom(d.i, d.n, d.k); break;
      // dungeons: seal events, enemies they call in, the clear count, the way down
      case 'seal': g.seals.onNet(d); break;
      case 'rsv': { const e = this.entity(d.id); if (e) g.activateReserve(e, d.x, d.z); break; }
      case 'prog': g.clearKilled = d.k; break;
      case 'clear100': g.fullClear(true); break;
      case 'kgold': g.earnKill(d.n, g.netMap?.[d.id]); break; // a teammate's kill: your share
      case 'descend': if (this.isHost) g.descend(); break;
      case 'act': g.enterAct(d.n); break;
      // ----- hits on this player, decided here -----
      case 'dmg': { const e = this.entity(d.id), def = e?.moves[d.k]; if (def) g.resolveHit(e, g.player, def.hits[d.i], def); break; }
      case 'pdmg': g.projectileHit(g.player, { dmg: d.dmg, knock: d.knock, src: d.src }); break;
      // ----- what the host needs to apply -----
      case 'hit': { const e = this.entity(d.id), p = this.peers.get(from); if (e?.alive && p) { e.receive({ dmg: d.dmg, poise: d.poise, srcPos: p.pos, attacker: p, noKnock: !!d.kb, combo: !!d.c }); if (d.kb) e.kb.set(d.kb[0], 0, d.kb[1]); } break; }
      case 'status': this.entity(d.id)?.status.add(d.kind, d.amount, g); break;
      case 'parried': { const e = this.entity(d.id); if (e?.alive) e.onParried(); break; }
      case 'riposted': this.entity(d.id)?.beginRiposted(null, d.at); break;
      case 'rip': { const e = this.entity(d.id); if (e?.alive) { e.hp = Math.max(0, e.hp - d.dmg); e.hpShow = 4; e.lastHitBy = this.peers.get(from) || e.lastHitBy; } break; }
      // ----- shared events -----
      case 'proj': g.addGhost(d); break;
      case 'ring': g.rings.push({ ghost: true, x: d.x, z: d.z, maxR: d.maxR, dur: d.dur, dmg: 0, t: 0, hit: new Set() }); break;
      case 'impact': g.impact(d.x, d.z, d.r, d.s); break;
      case 'tele': g.fx.rawTelegraph(d.x, d.z, d.r, d.dur, d.color); break;
      case 'enc': g.startEncounter(g.encounters[d.i]); break;
      case 'bossdead': g.onBossDeath(g.encounters[d.i].boss, d); break;
      case 'picked': this.picked.add(from); this.checkPicks(); break;
      case 'resume': g.resumeParty(); break;
      case 'down': if (this.isHost) { const p = this.peers.get(from); if (p) p.alive = false; this.checkWipe(); } break;
      case 'revive': g.onRevive(d.pid); break;
      case 'up': { const p = this.peers.get(from); if (p) p.alive = true; break; } // back up after a boss kill, no penalty
      case 'over': g.gameOver(); break;
    }
  }

  // reward barrier: the run resumes once everyone standing has chosen
  checkPicks() {
    const g = this.game;
    if (!g.waitingOnParty) return;
    const need = [...this.peers.values()].filter((p) => p.alive).every((p) => this.picked.has(p.pid));
    if (need && g.mode === 'wait') { this.picked.clear(); this.sendAll({ t: 'resume' }); g.resumeParty(); }
  }

  checkWipe() {
    if (this.isHost && this.active && !this.game.allPlayers().some((p) => p.alive)) { this.sendAll({ t: 'over' }); this.game.gameOver(); }
  }

  tick(dt) {
    if (!this.active) return;
    const g = this.game, p = g.player;
    for (const r of this.peers.values()) r.update(dt);
    this.clock += dt;
    if (this.clock < 1 / 20) return;
    this.clock = 0;
    this.sendAll({ t: 'p', x: r2(p.pos.x), z: r2(p.pos.z), yaw: r2(p.yaw), st: p.state, a: p.state === 'attack' ? p.atkKey : 0, tt: r2(p.state === 'attack' ? p.atk?.t || 0 : p.t), b: p.blocking ? 1 : 0, alive: p.alive, hp: Math.round(p.hp), maxHp: p.maxHp, w: p.wfxKey || '' });
    if (this.isHost) {
      const ps = g.allPlayers().map((x) => x.pos);
      const near = (o) => ps.some((v) => Math.abs(v.z - o.z) < 46 && Math.abs(v.x - o.x) < 46);
      const e = [];
      for (const x of Object.values(g.netMap)) {
        if (x.reserve || !near(x.pos) || (x.state === 'dead' && x.t > 1.5)) continue;
        e.push([x.netId, r2(x.pos.x), r2(x.pos.z), r2(x.yaw), x.state, Math.round(x.hp), x.state === 'attack' ? x.atkKey || 0 : 0, r2(x.atk?.t || 0), r2(x.y || 0)]);
      }
      this.sendAll({ t: 'snap', e });
    }
  }
}
