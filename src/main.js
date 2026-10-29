import * as THREE from 'three';
import './style.css';
import { Input } from './input.js';
import { Audio } from './audio.js';
import { FX } from './fx.js';
import { World, ARENA, FOG_Z } from './world.js';
import { Player } from './player.js';
import { Enemy } from './enemies.js';
import { Boss, BOSS_MOVES } from './boss.js';
import { UI } from './ui.js';
import { angDiff } from './actor.js';

const $ = (id) => document.getElementById(id);

const SPAWNS = [
  ['grunt', 1.5, -15, Math.PI],
  ['grunt', -6.2, -31.2, 1.2, { sit: true }],
  ['spear', -2.0, -35.6, -2.4, { sit: true }],
  ['archer', 9.5, -37, Math.PI * 0.95],
  ['grunt', 8.2, -43.5, Math.PI, { patrol: { x: -2, z: -45 } }],
  ['spear', 3.8, -50, Math.PI],
  ['archer', -10.5, -53, Math.PI * 1.1],
  ['grunt', -2.5, -55.5, Math.PI],
  ['brute', 0, -70.5, Math.PI],
];

class Game {
  constructor() {
    this.canvas = $('game');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: dpr < 2, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(dpr);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x15130f);
    this.scene.fog = new THREE.Fog(0x1a1712, 24, 55);
    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 200);
    this.camPos = new THREE.Vector3(0, 14, 14);
    this.camLook = new THREE.Vector3();

    this.scene.add(new THREE.HemisphereLight(0x9aa6c8, 0x4a3a28, 2.0));
    const sun = new THREE.DirectionalLight(0xffd8a8, 2.0);
    sun.position.set(-8, 14, 6); this.scene.add(sun);

    this.input = new Input();
    this.audio = new Audio();
    this.fx = new FX(this.scene);
    this.world = new World(this.scene);
    this.ui = new UI();

    this.time = 0;
    this.freeze = 0;
    this.slow = 0;
    this.tokens = 0;
    this.maxTokens = 2;
    this.projectiles = [];
    this.rings = [];
    this.mode = 'title';
    this.enemies = SPAWNS.map(([t, x, z, yaw, o]) => new Enemy(this, t, x, z, yaw, o));
    this.boss = new Boss(this);
    this.bossMoves = BOSS_MOVES;
    this.player = null;
    this.bossActive = false;
    this.bossDefeated = false;
    this.lockSprite = this.makeLockSprite();
    this.respawnAt = this.world.bonfires[0];
    this.deaths = 0;

    this.bindUI();
    this.resize();
    addEventListener('resize', () => this.resize());
    window.visualViewport?.addEventListener('resize', () => this.resize());
    this.last = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  enemiesAll() {
    return this.bossActive && this.boss.alive ? [...this.enemies, this.boss] : this.enemies;
  }

  makeLockSprite() {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(255,255,255,0.95)'; g.beginPath(); g.arc(32, 32, 13, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(200,40,30,1)'; g.beginPath(); g.arc(32, 32, 8, 0, Math.PI * 2); g.fill();
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
    s.scale.setScalar(0.45); s.renderOrder = 10; s.visible = false;
    this.scene.add(s);
    return s;
  }

  // ---------- UI / flow ----------
  bindUI() {
    document.querySelectorAll('.char').forEach((b) => b.addEventListener('click', () => {
      this.audio.unlock();
      this.start(b.dataset.char);
    }));
    $('resume').addEventListener('click', () => this.setPaused(false));
    $('restart').addEventListener('click', () => this.toTitle());
    $('again').addEventListener('click', () => this.toTitle());
    const pr = $('prompt');
    const tapPrompt = (e) => { e.preventDefault(); this.input.pressed.add('interact'); };
    pr.addEventListener('touchstart', tapPrompt, { passive: false });
    pr.addEventListener('click', tapPrompt);
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.mode === 'play') this.setPaused(true); });
    // resume audio on any touch (iOS suspends it when backgrounded)
    addEventListener('touchstart', () => this.audio.ctx && this.audio.ctx.state !== 'running' && this.audio.unlock(), { passive: true });
  }

  start(kind) {
    if (this.player) this.player.remove();
    this.kind = kind;
    const b = this.world.bonfires[0];
    this.player = new Player(this, kind, b.x, b.z - 2);
    this.respawnAt = b;
    for (const bf of this.world.bonfires) { bf.lit = false; bf.light.intensity = 0; }
    b.lit = true;
    for (const e of this.enemies) e.reset();
    this.tokens = 0;
    this.resetBoss();
    this.bossDefeated = false;
    this.world.fog.visible = true;
    this.deaths = 0;
    this.startTime = this.time;
    this.mode = 'play';
    this.ui.setMaxHp(this.player.maxHp, this.player.maxSt);
    this.ui.hp.snap(1); this.ui.st.snap(1);
    $('b-special').textContent = kind === 'knight' ? 'BLOCK' : 'PARRY';
    this.ui.show('menu', false); this.ui.show('hud'); this.ui.show('victory', false); this.ui.show('death', false);
    this.ui.show('touch', this.input.isTouch);
    this.camPos.set(this.player.pos.x, 14, this.player.pos.z + 12);
    this.ui.toast('THE ASHEN CAMP', 3);
    this.input.reset();
  }

  toTitle() {
    this.mode = 'title';
    this.audio.stopMusic();
    this.ui.show('pause', false); this.ui.show('victory', false); this.ui.show('death', false);
    this.ui.show('hud', false); this.ui.show('touch', false); this.ui.show('menu');
    this.ui.prompt(null);
    this.ui.enemyBars([]);
  }

  setPaused(v) {
    if (v && this.mode !== 'play') return;
    if (!v && this.mode !== 'paused') return;
    this.mode = v ? 'paused' : 'play';
    this.ui.show('pause', v);
    this.input.reset();
    if (!v) this.audio.unlock();
  }

  resetBoss() {
    this.boss.reset();
    this.bossActive = false;
    this.world.setArenaLocked(false);
    this.world.braziersLit = false;
    this.ui.show('boss', false);
    this.audio.stopMusic();
    this.projectiles.forEach((p) => this.scene.remove(p.mesh)); this.projectiles = [];
    this.rings = [];
  }

  startBossFight() {
    this.bossActive = true;
    this.world.setArenaLocked(true);
    this.world.braziersLit = true;
    this.audio.play('fog');
    this.boss.wake();
    this.ui.show('boss');
    this.ui.boss.snap(1);
    this.audio.startMusic(1);
    setTimeout(() => this.bossActive && this.audio.play('roar', 0.8), 1200);
  }

  rest(b) {
    const p = this.player;
    p.setState('rest');
    p.hp = p.maxHp; p.st = p.maxSt; p.flasks = p.maxFlasks;
    p.yaw = Math.atan2(b.x - p.pos.x, b.z - p.pos.z);
    p.lock = null;
    if (!b.lit) { b.lit = true; this.ui.toast('BONFIRE LIT', 2.5); this.audio.play('bonfire'); }
    else this.audio.play('heal');
    this.respawnAt = b;
    for (const e of this.enemies) e.reset();
    this.tokens = 0;
  }

  onPlayerDeath() {
    this.deaths++;
    this.audio.play('death');
    this.audio.stopMusic(2);
    this.ui.show('death');
    setTimeout(() => {
      this.ui.show('death', false);
      const b = this.respawnAt;
      this.player.respawn(b.x, b.z - 1.6);
      for (const e of this.enemies) e.reset();
      this.tokens = 0;
      if (!this.bossDefeated) this.resetBoss();
      this.fx.clear();
      this.camPos.set(b.x, 14, b.z + 12);
      this.player.setState('rest');
      this.player.t = 0.6;
    }, 3800);
  }

  onBossDeath() {
    this.bossDefeated = true;
    this.audio.stopMusic(3);
    this.fx.addShake(0.8);
    this.slow = 1.6;
    setTimeout(() => {
      this.audio.play('victory');
      const s = Math.round(this.time - this.startTime);
      $('victory-stats').textContent = `Time ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}  ·  Deaths ${this.deaths}  ·  ${this.kind === 'knight' ? 'Knight' : 'Rogue'}`;
      this.ui.show('victory');
      this.ui.show('boss', false);
      this.world.setArenaLocked(false);
      this.world.fog.visible = false;
    }, 2600);
  }

  // ---------- combat resolution ----------
  resolveHit(att, tg, h, def) {
    const info = {
      dmg: h.dmg, poise: h.poise, knock: h.knock, srcPos: att.pos, attacker: att,
      parryable: !(def.unparryable || h.unparryable), unblockable: !!def.unblockable,
    };
    const hp = new THREE.Vector3(tg.pos.x, 1.1 * tg.rig.root.scale.y, tg.pos.z);
    const dir = new THREE.Vector3(tg.pos.x - att.pos.x, 0, tg.pos.z - att.pos.z).normalize();
    if (tg === this.player) {
      const r = tg.receive(info);
      if (r === 'parry') {
        att.onParried();
        this.audio.play('parry');
        const w = tg.rig.tipL ? tg.rig.tipL.getWorldPosition(new THREE.Vector3()) : hp;
        this.fx.sparks(w, null, 26, [1, 0.95, 0.7]);
        this.hitstop(0.12); this.slow = 0.35;
        this.fx.addShake(0.4);
      } else if (r === 'block' || r === 'guardbreak') {
        this.audio.play('clang');
        const s = tg.rig.shield ? tg.rig.shield.getWorldPosition(new THREE.Vector3()) : hp;
        this.fx.sparks(s, dir.clone().negate(), 14);
        this.hitstop(0.05); this.fx.addShake(r === 'guardbreak' ? 0.6 : 0.25);
        if (r === 'guardbreak') this.audio.play('bigHit');
      } else if (r === 'hit') {
        this.audio.play(h.knock === 'heavy' ? 'bigHit' : 'hurt');
        this.fx.blood(hp, dir, 12);
        this.hitstop(h.knock === 'heavy' ? 0.1 : 0.07);
        this.fx.addShake(h.knock === 'heavy' ? 0.7 : 0.4);
      }
      if (h.knockback && (r === 'hit' || r === 'block')) tg.kb.copy(dir).multiplyScalar(h.knockback);
      return;
    }
    const r = tg.receive(info);
    if (r === 'none') return;
    const heavy = def.heavyHit;
    this.audio.play(heavy ? 'bigHit' : 'hit', 0.9);
    this.fx.blood(hp, dir, heavy ? 16 : 9);
    this.fx.sparks(hp, dir, 5, [1, 0.6, 0.3]);
    this.hitstop(r === 'kill' ? 0.11 : heavy ? 0.09 : 0.055);
    this.fx.addShake(def.onHitShake || (r === 'kill' ? 0.35 : 0.15));
  }

  riposteHit(p, tg, dmg) {
    const hp = new THREE.Vector3(tg.pos.x, 1.2 * tg.rig.root.scale.y, tg.pos.z);
    tg.hp -= dmg;
    tg.rig.flash(1, 0.3, 0.2);
    if (tg.hp <= 0) tg.hp = 0;
    if (tg.hpShow !== undefined) tg.hpShow = 4;
    this.audio.play('riposte');
    this.fx.blood(hp, p.fwd().clone(), 30);
    this.fx.burst(hp, 20, [1, 0.3, 0.2], 5, 0.6, 0.25);
    this.hitstop(0.16);
    this.fx.addShake(0.7);
    tg.kb.copy(p.fwd()).multiplyScalar(5);
  }

  hitstop(t) { this.freeze = Math.max(this.freeze, t); }

  impact(x, z, radius, shake) {
    this.fx.shockwave(x, z, radius);
    this.fx.dust({ x, z }, 14, radius * 0.8);
    this.fx.sparks({ x, y: 0.2, z }, null, 10, [1, 0.6, 0.25]);
    this.fx.scorch(x, z, radius * 0.4);
    this.fx.addShake(shake);
    this.audio.play('slam', Math.min(1, shake + 0.3));
  }

  spawnArrow(e) {
    const p = this.player;
    const from = new THREE.Vector3(e.pos.x, 1.45, e.pos.z);
    const f = e.fwd();
    from.addScaledVector(f, 0.6);
    const to = new THREE.Vector3(p.pos.x, 1.1, p.pos.z);
    const dir = to.sub(from).normalize();
    // archers aim where they are facing (tracking stops just before release) — sidesteps work
    const flat = new THREE.Vector3(dir.x, 0, dir.z).normalize();
    if (Math.abs(angDiff(Math.atan2(flat.x, flat.z), e.yaw)) > 0.25) dir.set(f.x, dir.y, f.z).normalize();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.8), new THREE.MeshBasicMaterial({ color: 0xd8c8a0 }));
    mesh.position.copy(from);
    mesh.lookAt(from.clone().add(dir));
    this.scene.add(mesh);
    this.projectiles.push({ kind: 'arrow', pos: from, vel: dir.multiplyScalar(18), life: 1.6, mesh, r: 0.3, dmg: 12 });
  }

  spawnFireWave(b, off) {
    const f = b.fwd().clone();
    for (const a of [-0.3, 0, 0.3]) {
      const d = f.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), a);
      const pos = new THREE.Vector3(b.pos.x + f.x * off, 0.3, b.pos.z + f.z * off);
      this.projectiles.push({ kind: 'fire', pos, vel: d.multiplyScalar(10), life: 1.1, r: 0.85, dmg: 20, mesh: null });
    }
    this.audio.play('fire');
  }

  spawnFireRing(x, z, maxR, dur, dmg) {
    this.rings.push({ x, z, maxR, dur, dmg, t: 0, hit: false });
    this.audio.play('fire');
  }

  updateProjectiles(dt) {
    const p = this.player;
    this.projectiles = this.projectiles.filter((q) => {
      q.life -= dt;
      q.pos.addScaledVector(q.vel, dt);
      if (q.mesh) q.mesh.position.copy(q.pos);
      if (q.kind === 'fire') {
        for (let i = 0; i < 3; i++) this.fx.flame({ x: q.pos.x, y: 0.1, z: q.pos.z }, 1.1);
        if (Math.random() < dt * 20) this.fx.scorch(q.pos.x, q.pos.z, 0.7);
      }
      let dead = q.life <= 0 || !this.world.walkable(q.pos.x, q.pos.z, -0.5);
      if (!dead && p.alive && Math.hypot(q.pos.x - p.pos.x, q.pos.z - p.pos.z) < q.r + p.radius) {
        const src = q.pos.clone().addScaledVector(q.vel, -0.1);
        const r = p.receive({ dmg: q.dmg, poise: 20, knock: 'light', srcPos: src, parryable: false });
        if (r === 'hit') { this.audio.play('hurt'); this.fx.blood(new THREE.Vector3(p.pos.x, 1.1, p.pos.z), q.vel.clone().normalize(), 8); this.hitstop(0.05); this.fx.addShake(0.3); }
        if (r === 'block') { this.audio.play('clang', 0.6); this.fx.sparks(new THREE.Vector3(p.pos.x, 1.1, p.pos.z), null, 8); }
        if (r !== 'dodge') dead = true;
      }
      if (dead && q.mesh) { this.scene.remove(q.mesh); q.mesh.geometry.dispose(); }
      return !dead;
    });
    this.rings = this.rings.filter((g) => {
      g.t += dt;
      const r = g.maxR * Math.min(1, g.t / g.dur);
      for (let i = 0; i < 10; i++) {
        const a = Math.random() * Math.PI * 2;
        this.fx.flame({ x: g.x + Math.cos(a) * r, y: 0.1, z: g.z + Math.sin(a) * r }, 0.9);
      }
      const d = Math.hypot(p.pos.x - g.x, p.pos.z - g.z);
      if (!g.hit && p.alive && Math.abs(d - r) < 0.7) {
        const res = p.receive({ dmg: g.dmg, poise: 20, knock: 'light', srcPos: new THREE.Vector3(g.x, 0, g.z), parryable: false });
        if (res !== 'dodge') g.hit = true;
        if (res === 'hit') { this.audio.play('hurt'); this.hitstop(0.05); this.fx.addShake(0.3); }
      }
      return g.t < g.dur;
    });
  }

  // ---------- frame ----------
  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.fx.setScale(h * this.renderer.getPixelRatio() * 0.9);
  }

  loop(now) {
    requestAnimationFrame((t) => this.loop(t));
    let rdt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (this.mode === 'play' || this.mode === 'title') {
      let dt = rdt;
      if (this.freeze > 0) { this.freeze -= rdt; dt = 0; }
      else if (this.slow > 0) { this.slow -= rdt; dt *= 0.35; }
      this.step(dt, rdt);
    }
    this.renderer.render(this.scene, this.camera);
  }

  step(dt, rdt) {
    this.time += dt;
    const presses = this.input.drain();
    const p = this.player;

    if (this.mode === 'play') {
      if (presses.has('pause')) { this.setPaused(true); return; }
      if (presses.has('lock') && p.alive) this.toggleLock();

      if (dt > 0) {
        p.update(dt, this.input, presses);
        for (const e of this.enemies) e.update(dt);
        this.boss.update(dt);
        this.separate();
        this.updateProjectiles(dt);
      } else {
        // keep buffered inputs during hitstop
        for (const a of presses) if (a !== 'lock' && a !== 'pause' && a !== 'interact') p.push(a);
      }

      // bonfire / fog interaction
      let near = null;
      for (const b of this.world.bonfires) if (Math.hypot(b.x - p.pos.x, b.z - p.pos.z) < 2.4) near = b;
      const threatened = this.enemies.some((e) => e.alive && (e.state === 'chase' || e.state === 'attack') && e.distTo(p) < 14) || this.bossActive;
      if (near && p.alive && p.state === 'move' && !threatened) {
        this.ui.prompt(this.input.lastDevice === 'touch' ? (near.lit ? 'Tap to rest' : 'Tap to light bonfire') : (near.lit ? 'F: Rest at bonfire' : 'F: Light bonfire'));
        if (presses.has('interact')) this.rest(near);
      } else if (performance.now() > (this.ui.smallT || 0)) this.ui.prompt(null);
      if (!this.bossActive && !this.bossDefeated && p.alive && p.pos.z < FOG_Z - 2.2) this.startBossFight();

      this.ui.update(rdt, p);
      if (this.bossActive) this.ui.boss.set(this.boss.hp / this.boss.maxHp, rdt);
      this.updateEnemyBars();
    }

    this.world.update(dt, this.time, this.fx);
    this.fx.update(dt);
    this.updateCamera(rdt);
  }

  toggleLock() {
    const p = this.player;
    if (p.lock) { p.lock = null; return; }
    const mv = this.input.move();
    const aim = Math.hypot(mv.x, mv.y) > 0.2 ? Math.atan2(mv.x, -mv.y) : p.yaw;
    let best = null, bs = Infinity;
    for (const e of this.enemiesAll()) {
      if (!e.alive) continue;
      const d = p.distTo(e);
      if (d > 16) continue;
      const s = d + Math.abs(angDiff(aim, p.yawTo(e.pos))) * 4;
      if (s < bs) { bs = s; best = e; }
    }
    p.lock = best;
  }

  separate() {
    const all = [this.player, ...this.enemies.filter((e) => e.alive)];
    if (this.bossActive && this.boss.alive && this.boss.y < 1) all.push(this.boss);
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
      const a = all[i], b = all[j];
      if (!a.alive && a !== this.player) continue;
      if (a === this.player && (a.state === 'dead')) continue;
      const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, d = Math.hypot(dx, dz), m = a.radius + b.radius;
      if (d < m && d > 1e-4) {
        const push = (m - d);
        // the boss and brutes are immovable for the player
        const wa = b.isBoss || b.type === 'brute' ? 1 : 0.5, wb = 1 - wa;
        a.move(-dx / d * push * wa, -dz / d * push * wa);
        b.move(dx / d * push * wb, dz / d * push * wb);
      }
    }
  }

  updateEnemyBars() {
    const list = [];
    const v = new THREE.Vector3();
    const w = window.innerWidth, h = window.innerHeight;
    for (const e of this.enemies) {
      if (!e.alive || (e.hpShow <= 0 && this.player.lock !== e)) continue;
      v.set(e.pos.x, 2.25 * e.rig.root.scale.y, e.pos.z).project(this.camera);
      if (v.z > 1) continue;
      list.push({ x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, v: e.hp / e.maxHp });
    }
    this.ui.enemyBars(list);
  }

  updateCamera(dt) {
    const cam = this.camera;
    if (this.mode === 'title' || !this.player) {
      const a = this.time * 0.08;
      const b = this.world.bonfires[0];
      this.camPos.set(b.x + Math.sin(a) * 9, 6, b.z + Math.cos(a) * 9);
      cam.position.copy(this.camPos);
      cam.lookAt(b.x, 1, b.z);
      return;
    }
    const p = this.player;
    if (this.debugCam) {
      const d = this.debugCam, t = d.follow ? d.follow.pos : { x: 0, z: 0 };
      cam.position.set(t.x + d.off[0], d.off[1], t.z + d.off[2]); cam.lookAt(t.x, d.lookY ?? 1, t.z); return;
    }
    const aspect = cam.aspect;
    let dist = this.bossActive ? 1.22 : 1;
    if (aspect < 1.3) dist *= 1.35;
    const off = new THREE.Vector3(0, 10.5 * dist, 8.4 * dist);
    const focus = new THREE.Vector3(p.pos.x, 0.8, p.pos.z);
    if (p.lock && p.lock.alive) {
      const t = p.lock.pos;
      const d = Math.min(8, p.distTo(p.lock));
      const k = d / Math.max(0.01, p.distTo(p.lock));
      focus.x += (t.x - p.pos.x) * k * 0.4; focus.z += (t.z - p.pos.z) * k * 0.4;
    } else if (this.bossActive && this.boss.alive) {
      focus.x += (this.boss.pos.x - p.pos.x) * 0.22; focus.z += (this.boss.pos.z - p.pos.z) * 0.22;
    } else if (p.vel) {
      focus.addScaledVector(p.vel, 0.18);
    }
    const want = focus.clone().add(off);
    const k = 1 - Math.exp(-5 * dt);
    this.camPos.lerp(want, k);
    this.camLook.lerp(focus, 1 - Math.exp(-7 * dt));
    const sh = this.fx.shakeOffset(new THREE.Vector3());
    cam.position.copy(this.camPos).add(sh);
    cam.lookAt(this.camLook.x + sh.x * 0.5, this.camLook.y, this.camLook.z - 0.6);

    // lock-on marker
    const L = p.lock;
    this.lockSprite.visible = !!(L && L.alive);
    if (L && L.alive) this.lockSprite.position.set(L.pos.x, L.y + 1.25 * L.rig.root.scale.y, L.pos.z);
  }
}

window.game = new Game();
