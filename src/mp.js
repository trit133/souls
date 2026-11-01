import { Actor, angDiff } from './actor.js';
import { buildHumanoid } from './models.js';
import { locomotion, P, sample } from './anims.js';
import { Trail } from './fx.js';
import { CHARS, RIPOSTE } from './player.js';
import { SERVER } from './account.js';

// Party play. The host's browser simulates enemies and bosses and streams snapshots;
// each player simulates only their own character, so dodges and parries are judged on
// the device of the player being hit. All traffic relays through server/index.js.

const r2 = (v) => Math.round(v * 100) / 100;

// another player, as seen on this device
class RemotePlayer extends Actor {
  constructor(game, m) {
    const c = CHARS[m.kind] || CHARS.knight;
    super(game, buildHumanoid({ ...c.model, scale: 1 }), { x: 0, z: -2.5, hp: c.hp, radius: 0.42, team: 'player', poise: 0 });
    this.isRemote = true;
    this.pid = m.id; this.uid = 'R' + m.id; this.name = m.name; this.kind = m.kind; this.c = c;
    this.dmgMul = 1; this.phase = 0; this.s = { st: 'move' }; this.net = null;
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
    this.pos.x += (this.net.x - ox) * k; this.pos.z += (this.net.z - oz) * k;
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
      if (P0.t >= P0.def.dur || st === 'hurt' || st === 'knockdown' || st === 'dead' || st === 'roll') this.play = null;
      else { pose = sample(P0.def.keys, P0.t, base); trail = !!P0.def.trail && P0.t >= P0.def.trail[0] && P0.t <= P0.def.trail[1]; }
    }
    const hand = P0?.def.hand || 'R';
    this.trail.update(dt, trail && hand !== 'L', this.rig.base, this.rig.tip);
    this.trailL?.update(dt, trail && (hand === 'L' || hand === 'B'), this.rig.baseL, this.rig.tipL);
    if (this.play) { /* the swing already set the pose */ }
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
  async create(kind) { await this.connect(); this.raw({ t: 'create', kind }); }
  async join(code, kind) { await this.connect(); this.raw({ t: 'join', code, kind }); }
  setKind(kind) { this.raw({ t: 'kind', kind }); }

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
  }

  dropped() {
    const was = this.active;
    this.ws = null; this.id = null; this.reset();
    this.game.onPartyClosed(was ? 'Connection lost' : null);
  }

  onServer(m) {
    if (m.t === 'roster') {
      this.code = m.code; this.host = m.host; this.members = m.members;
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
    if (d.k === 'swing') { const def = p?.c.attacks[d.a]; if (def) p.startPlay(def, d.r); } else if (d.k === 'riposte') p?.startPlay(RIPOSTE, d.r);
    else if (d.k === 'sfx') g.audio.remote(d.s, d.v ?? 1);
    else if (d.k === 'hit' || d.k === 'rip') {
      // a teammate striking an enemy
      const e = this.entity(d.id);
      g.audio.remote(d.k === 'rip' ? 'riposte' : d.heavy ? 'bigHit' : 'hit', 0.9);
      if (e) {
        e.rig.flash(1, 0.9, 0.8);
        const c = { x: e.pos.x, y: 1.1 * e.rig.root.scale.y, z: e.pos.z };
        g.fx.blood(c, null, d.k === 'rip' ? 24 : 9); g.fx.sparks(c, null, 5, [1, 0.6, 0.3]);
      }
    } else if (p && d.k === 'hurt') {
      // a teammate taking a hit
      p.rig.flash(1, 0.3, 0.2);
      g.fx.blood({ x: p.pos.x, y: 1.1, z: p.pos.z }, null, 12);
      g.audio.remote(d.heavy ? 'bigHit' : 'hurt');
    } else if (p && d.k === 'block') {
      g.fx.sparks({ x: p.pos.x, y: 1.1, z: p.pos.z }, null, 12);
      g.audio.remote('clang');
    } else if (p && d.k === 'parry') {
      g.fx.sparks({ x: p.pos.x, y: 1.2, z: p.pos.z }, null, 22, [1, 0.95, 0.7]);
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
      case 'e': this.onEvent(from, d); break;
      case 'ready': this.ready.add(from); this.afterReady(); break;
      case 'p': this.peers.get(from)?.apply(d); break;
      case 'snap': for (const s of d.e) this.entity(s[0])?.applySnapshot(s); break;
      case 'gold': g.runGold = d.n; g.ui.setRunGold(d.n); break;
      // ----- hits on this player, decided here -----
      case 'dmg': { const e = this.entity(d.id), def = e?.moves[d.k]; if (def) g.resolveHit(e, g.player, def.hits[d.i], def); break; }
      case 'pdmg': g.projectileHit(g.player, { dmg: d.dmg, knock: d.knock, src: d.src }); break;
      // ----- what the host needs to apply -----
      case 'hit': { const e = this.entity(d.id), p = this.peers.get(from); if (e?.alive && p) e.receive({ dmg: d.dmg, poise: d.poise, srcPos: p.pos, attacker: p }); break; }
      case 'status': this.entity(d.id)?.status.add(d.kind, d.amount, g); break;
      case 'parried': { const e = this.entity(d.id); if (e?.alive) e.onParried(); break; }
      case 'riposted': this.entity(d.id)?.beginRiposted(); break;
      case 'rip': { const e = this.entity(d.id); if (e?.alive) { e.hp = Math.max(0, e.hp - d.dmg); e.hpShow = 4; } break; }
      // ----- shared events -----
      case 'proj': g.addGhost(d); break;
      case 'ring': g.rings.push({ ghost: true, x: d.x, z: d.z, maxR: d.maxR, dur: d.dur, dmg: 0, t: 0, hit: new Set() }); break;
      case 'impact': g.impact(d.x, d.z, d.r, d.s); break;
      case 'tele': g.fx.rawTelegraph(d.x, d.z, d.r, d.dur, d.color); break;
      case 'enc': g.startEncounter(g.encounters[d.i]); break;
      case 'bossdead': g.onBossDeath(g.encounters[d.i].boss); break;
      case 'picked': this.picked.add(from); this.checkPicks(); break;
      case 'resume': g.resumeParty(); break;
      case 'cashout': g.cashOut(); break;
      case 'down': if (this.isHost) { const p = this.peers.get(from); if (p) p.alive = false; this.checkWipe(); } break;
      case 'revive': g.onRevive(d.pid); break;
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
    this.sendAll({ t: 'p', x: r2(p.pos.x), z: r2(p.pos.z), yaw: r2(p.yaw), st: p.state, a: p.state === 'attack' ? p.atkKey : 0, tt: r2(p.state === 'attack' ? p.atk?.t || 0 : p.t), b: p.blocking ? 1 : 0, alive: p.alive, hp: Math.round(p.hp), maxHp: p.maxHp });
    if (this.isHost) {
      const zs = g.allPlayers().map((x) => x.pos.z);
      const near = (z) => zs.some((v) => Math.abs(v - z) < 46);
      const e = [];
      for (const x of Object.values(g.netMap)) {
        if (!near(x.pos.z) || (x.state === 'dead' && x.t > 1.5)) continue;
        e.push([x.netId, r2(x.pos.x), r2(x.pos.z), r2(x.yaw), x.state, Math.round(x.hp), x.state === 'attack' ? x.atkKey || 0 : 0, r2(x.atk?.t || 0), r2(x.y || 0)]);
      }
      this.sendAll({ t: 'snap', e });
    }
  }
}
