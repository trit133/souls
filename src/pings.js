// Pings, emotes and quick alerts. Tap the ping key (G) to mark the ground under the cursor (an enemy
// under it gets a red marker that follows it); hold it for a wheel: emotes on the left half, alerts on
// the right (said in the party chat and over your head). Touch: the ping button (tap = where you stand,
// hold and drag = the wheel). Everyone in the party sees the markers, the minimap dots, edge arrows
// and the bubbles; solo they show only here.
import * as THREE from 'three';

const $ = (id) => document.getElementById(id);
const HOLD = 0.22, LIFE = 4, DEAD_ZONE = 34, R = 112;
const COLORS = [0xffc23d, 0x5ad0ff, 0xff6ad0], ENEMY = 0xff3a2a;
const hex = (c) => '#' + c.toString(16).padStart(6, '0');

// emotes: a few keyframed poses (joints as in anims.js), played over standing still
export const EMOTES = {
  wave: { label: 'Wave', bubble: 'o/', dur: 1.8, emote: true, keys: [
    [0.2, { armR: [-2.75, 0, -0.5], foreR: [-0.5, 0, 0], head: [-0.1, 0, 0] }],
    [0.45, { armR: [-2.75, 0, 0.05], foreR: [-0.3, 0, 0] }], [0.7, { armR: [-2.75, 0, -0.5], foreR: [-0.5, 0, 0] }],
    [0.95, { armR: [-2.75, 0, 0.05], foreR: [-0.3, 0, 0] }], [1.2, { armR: [-2.75, 0, -0.5], foreR: [-0.5, 0, 0] }],
    [1.5, { armR: [-2.6, 0, -0.3], foreR: [-0.4, 0, 0] }], [1.8, {}]] },
  bow: { label: 'Bow', bubble: '_o_', dur: 1.9, emote: true, keys: [
    [0.35, { torso: [0.15, 0, 0], armR: [-0.5, 0, -0.1], foreR: [-1.6, 0, 0], legR: [0.25, 0, 0], shinR: [0.2, 0, 0] }],
    [0.75, { torso: [0.85, 0, 0], head: [0.35, 0, 0], armR: [-0.4, 0, -0.1], foreR: [-1.6, 0, 0], armL: [0.3, 0, 0.15], legR: [0.3, 0, 0], shinR: [0.35, 0, 0], by: -0.08 }],
    [1.25, { torso: [0.85, 0, 0], head: [0.35, 0, 0], armR: [-0.4, 0, -0.1], foreR: [-1.6, 0, 0], armL: [0.3, 0, 0.15], legR: [0.3, 0, 0], shinR: [0.35, 0, 0], by: -0.08 }],
    [1.9, {}]] },
  cheer: { label: 'Cheer', bubble: '\\o/', dur: 1.7, emote: true, keys: [
    [0.15, { armR: [-1.0, 0, -0.3], armL: [-1.0, 0, 0.3], by: -0.12, legL: [-0.3, 0, 0], legR: [-0.3, 0, 0], shinL: [0.5, 0, 0], shinR: [0.5, 0, 0] }],
    [0.4, { armR: [-2.9, 0, -0.45], armL: [-2.9, 0, 0.45], foreR: [-0.2, 0, 0], foreL: [-0.2, 0, 0], head: [-0.35, 0, 0], torso: [-0.15, 0, 0], by: 0.18 }],
    [0.65, { armR: [-2.7, 0, -0.35], armL: [-2.7, 0, 0.35], by: -0.06, legL: [-0.2, 0, 0], legR: [-0.2, 0, 0], shinL: [0.3, 0, 0], shinR: [0.3, 0, 0] }],
    [0.9, { armR: [-2.9, 0, -0.45], armL: [-2.9, 0, 0.45], foreR: [-0.2, 0, 0], foreL: [-0.2, 0, 0], head: [-0.35, 0, 0], torso: [-0.15, 0, 0], by: 0.18 }],
    [1.25, { armR: [-2.7, 0, -0.4], armL: [-2.7, 0, 0.4], head: [-0.2, 0, 0] }], [1.7, {}]] },
  laugh: { label: 'Laugh', bubble: 'ha ha', dur: 1.8, emote: true, keys: [
    [0.2, { torso: [-0.3, 0, 0], head: [-0.45, 0, 0], armL: [-0.4, 0, 0.2], foreL: [-1.3, 0, 0], armR: [-0.4, 0, -0.2], foreR: [-1.3, 0, 0] }],
    ...[0.4, 0.6, 0.8, 1.0, 1.2].map((t, i) => [t, { torso: [i % 2 ? -0.3 : 0.15, 0, i % 2 ? 0.05 : -0.05], head: [i % 2 ? -0.45 : 0.1, 0, 0], armL: [-0.4, 0, 0.2], foreL: [-1.3, 0, 0], armR: [-0.4, 0, -0.2], foreR: [-1.3, 0, 0], by: i % 2 ? 0 : -0.05 }]),
    [1.8, {}]] },
};
export const ALERTS = {
  here: { label: 'Over here!', bubble: 'Over here!' },
  heal: { label: 'Need healing', bubble: 'Need healing!' },
  back: { label: 'Retreat!', bubble: 'Retreat!' },
  down: { label: "I'm down!", bubble: "I'm down!" },
};
// the wheel, clockwise from straight up: alerts on the right, emotes on the left
const WHEEL = [['alert', 'here'], ['alert', 'heal'], ['alert', 'back'], ['alert', 'down'], ['emote', 'laugh'], ['emote', 'cheer'], ['emote', 'bow'], ['emote', 'wave']];

export class Pings {
  constructor(game) {
    this.game = game;
    this.list = []; // { obj, x, z, t, color, target, arrow }
    this.bubbles = []; // { el, actor, t }
    this.sentAt = [];
    this.mouse = { x: innerWidth / 2, y: innerHeight / 2, seen: false };
    this.down = null; // { at, x, y, touch } while the key (or button) is held
    this.wheelOn = false; this.sel = -1;
    this.ray = new THREE.Raycaster(); this.ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.buildDom();
    addEventListener('mousemove', (e) => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; this.mouse.seen = true; });
    const mine = (e) => (this.game.settings?.binds?.ping || []).includes(e.code);
    addEventListener('keydown', (e) => {
      if (!mine(e) || e.repeat || this.game.input.capture || e.target.closest?.('input, textarea, select')) return;
      if (this.live()) this.press(this.mouse.x, this.mouse.y, false);
    });
    addEventListener('keyup', (e) => { if (mine(e)) this.release(); });
    addEventListener('blur', () => this.cancel());
  }

  buildDom() {
    const wheel = document.createElement('div');
    wheel.id = 'pwheel'; wheel.className = 'hidden';
    wheel.innerHTML = '<div class="pw-ring"></div><div class="pw-hub">Cancel</div><div class="pw-pointer"></div>' + WHEEL.map(([kind, k], i) => {
      const a = (i + 0.5) / WHEEL.length * Math.PI * 2, def = kind === 'emote' ? EMOTES[k] : ALERTS[k];
      return `<div class="pw-opt ${kind}" data-i="${i}" style="left:${Math.sin(a) * R}px;top:${-Math.cos(a) * R}px">${def.label}</div>`;
    }).join('') + '<div class="pw-side l">Emotes</div><div class="pw-side r">Alerts</div>';
    const layer = document.createElement('div'); layer.id = 'pings-ui';
    document.body.append(wheel, layer);
    this.wheel = wheel; this.layer = layer;
    // the touch button (in the touch controls; tap pings, hold opens the wheel and the finger picks)
    const btn = document.createElement('button');
    btn.id = 'b-ping'; btn.className = 'btn small'; btn.textContent = 'PING';
    $('buttons')?.append(btn);
    const at = (e) => { const t = [...e.changedTouches].find((x) => x.identifier === this.down?.id) || e.changedTouches[0]; return t; };
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault(); e.stopPropagation();
      if (this.game.input.layoutEdit || !this.live()) return;
      const t = e.changedTouches[0];
      btn.classList.add('down');
      this.press(t.clientX, t.clientY, true, t.identifier);
    }, { passive: false });
    btn.addEventListener('touchmove', (e) => { e.preventDefault(); const t = at(e); if (t) { this.mouse.x = t.clientX; this.mouse.y = t.clientY; } }, { passive: false });
    const up = (e) => { e.preventDefault(); btn.classList.remove('down'); this.release(); };
    btn.addEventListener('touchend', up, { passive: false });
    btn.addEventListener('touchcancel', (e) => { btn.classList.remove('down'); this.cancel(); });
  }

  // in a raid, playing (or waiting to be revived), menus closed
  live() {
    const g = this.game;
    return !!g.player && (g.mode === 'play' || g.mode === 'wait') && !$('hud').classList.contains('hidden') && $('pause').classList.contains('hidden');
  }

  press(x, y, touch, id = null) {
    this.down = { at: performance.now(), x, y, touch, id };
    if (touch) { this.mouse.x = x; this.mouse.y = y; }
  }

  release() {
    const d = this.down;
    if (!d) return;
    this.down = null;
    if (this.wheelOn) { const i = this.sel; this.hideWheel(); if (i >= 0) this.choose(...WHEEL[i]); return; }
    if (!this.live()) return;
    if (d.touch || !this.mouse.seen) { const p = this.game.player; this.ping(p.pos.x, p.pos.z, null); } else this.pingAt(this.mouse.x, this.mouse.y);
  }

  cancel() { this.down = null; this.hideWheel(); }

  showWheel() {
    const d = this.down, m = R + 70;
    // centred on the cursor (or the finger), kept on screen
    this.cx = Math.max(m, Math.min(innerWidth - m, d.touch ? d.x - R * 0.2 : this.mouse.x));
    this.cy = Math.max(m * 0.8, Math.min(innerHeight - m * 0.8, d.touch ? d.y - R : this.mouse.y));
    if (!d.touch) { this.mouse.x = this.cx; this.mouse.y = this.cy; }
    this.wheel.style.left = this.cx + 'px'; this.wheel.style.top = this.cy + 'px';
    this.wheel.classList.remove('hidden');
    this.wheelOn = true; this.sel = -1;
    this.game.audio.play('uiTick', 1);
  }

  hideWheel() { this.wheelOn = false; this.sel = -1; this.wheel.classList.add('hidden'); }

  choose(kind, k) {
    const g = this.game, p = g.player;
    if (kind === 'emote') {
      if (!p?.emote(k)) return;
      this.bubble(p, EMOTES[k].bubble, 'emote');
      g.mp.event({ k: 'emote', n: k });
    } else {
      const a = ALERTS[k];
      this.bubble(p, a.bubble, 'alert');
      g.mp.event({ k: 'alert', n: k });
      if (g.mp.code) g.mp.chat(a.label); else g.ui.toastSmall?.(a.label);
      if (k === 'here' && p) this.ping(p.pos.x, p.pos.z, null);
      g.audio.play('ping', 0.7);
    }
  }

  // a tap: the ground under the cursor, or the enemy standing there
  pingAt(sx, sy) {
    const g = this.game, cv = g.renderer?.domElement || $('game'), r = cv.getBoundingClientRect();
    const ndc = new THREE.Vector2(((sx - r.left) / r.width) * 2 - 1, -((sy - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(ndc, g.camera);
    const hit = new THREE.Vector3();
    if (!this.ray.ray.intersectPlane(this.ground, hit)) return;
    let best = null, bd = 1.8;
    for (const e of g.enemiesAll()) {
      if (!e.alive) continue;
      const d = Math.hypot(e.pos.x - hit.x, e.pos.z - hit.z) - (e.radius || 0.5);
      if (d < bd) { bd = d; best = e; }
    }
    this.ping(hit.x, hit.z, best);
  }

  ping(x, z, target) {
    const now = performance.now();
    this.sentAt = this.sentAt.filter((t) => now - t < 2000);
    if (this.sentAt.length >= 3) return;
    this.sentAt.push(now);
    const g = this.game;
    this.add(x, z, target, this.colorOf(g.mp.id), true);
    g.mp.event({ k: 'ping', x: Math.round(x * 100) / 100, z: Math.round(z * 100) / 100, id: target?.netId ?? undefined });
  }

  colorOf(pid) {
    const i = this.game.mp.members.findIndex((m) => m.id === pid);
    return COLORS[Math.max(0, i) % COLORS.length];
  }

  // from a teammate (mp.js onEvent)
  onNet(from, d) {
    const g = this.game, peer = g.mp.peers.get(from);
    if (d.k === 'ping') {
      if (!Number.isFinite(d.x) || !Number.isFinite(d.z)) return;
      this.add(d.x, d.z, d.id !== undefined ? g.netMap?.[d.id] : null, this.colorOf(from), false);
    } else if (d.k === 'emote' && EMOTES[d.n] && peer) { peer.startPlay(EMOTES[d.n]); this.bubble(peer, EMOTES[d.n].bubble, 'emote'); }
    else if (d.k === 'alert' && ALERTS[d.n] && peer) { this.bubble(peer, ALERTS[d.n].bubble, 'alert'); g.audio.remote('ping', 0.7); }
  }

  add(x, z, target, color, mine) {
    const g = this.game;
    if (target && !target.alive) target = null;
    if (target) color = ENEMY;
    const grp = new THREE.Group();
    const add = (geo, opacity) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); grp.add(m); return m; };
    const beam = add(new THREE.CylinderGeometry(0.09, 0.2, 5, 8, 1, true), 0.55); beam.position.y = 2.5;
    const core = add(new THREE.CylinderGeometry(0.03, 0.06, 5, 6, 1, true), 0.9); core.position.y = 2.5;
    const disc = add(new THREE.RingGeometry(0.45, 0.62, 32), 0.85); disc.rotation.x = -Math.PI / 2; disc.position.y = 0.05;
    const wave = add(new THREE.RingGeometry(0.8, 1, 40), 0.7); wave.rotation.x = -Math.PI / 2; wave.position.y = 0.06;
    const tip = add(new THREE.OctahedronGeometry(0.22), 0.95); tip.position.y = 5.15;
    grp.position.set(x, 0, z);
    g.scene.add(grp);
    const arrow = document.createElement('div'); arrow.className = 'ping-arrow'; arrow.style.color = hex(color);
    this.layer.append(arrow);
    this.list.push({ obj: grp, beam, core, disc, wave, tip, x, z, t: 0, color, target, arrow });
    if (this.list.length > 9) this.drop(this.list[0]);
    g.audio[mine ? 'play' : 'remote'](target ? 'pingFoe' : 'ping', 0.9);
  }

  drop(p) {
    this.game.scene.remove(p.obj);
    p.obj.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
    p.arrow.remove();
    this.list.splice(this.list.indexOf(p), 1);
  }

  bubble(actor, text, kind) {
    if (!actor) return;
    for (const b of this.bubbles.filter((b) => b.actor === actor)) { b.el.remove(); this.bubbles.splice(this.bubbles.indexOf(b), 1); }
    const el = document.createElement('div'); el.className = 'ping-bubble ' + kind; el.textContent = text;
    this.layer.append(el);
    this.bubbles.push({ el, actor, t: 0 });
  }

  // a run ended or restarted
  clear() {
    for (const p of [...this.list]) this.drop(p);
    for (const b of this.bubbles) b.el.remove();
    this.bubbles = []; this.cancel();
  }

  // every frame (main.js loop)
  update(dt) {
    const g = this.game, live = this.live();
    if (!live && (this.down || this.wheelOn)) this.cancel();
    if (this.down && !this.wheelOn && performance.now() - this.down.at > HOLD * 1000) this.showWheel();
    if (this.wheelOn) {
      const dx = this.mouse.x - this.cx, dy = this.mouse.y - this.cy;
      const sel = Math.hypot(dx, dy) < DEAD_ZONE ? -1 : Math.floor((((Math.atan2(dx, -dy) / (Math.PI * 2)) + 1) % 1) * WHEEL.length);
      if (sel !== this.sel) {
        this.sel = sel;
        for (const o of this.wheel.querySelectorAll('.pw-opt')) o.classList.toggle('on', +o.dataset.i === sel);
        this.wheel.classList.toggle('picking', sel >= 0);
        const ptr = this.wheel.querySelector('.pw-pointer');
        if (sel >= 0) ptr.style.transform = `rotate(${(sel + 0.5) / WHEEL.length * 360}deg)`;
        if (sel >= 0) g.audio.play('uiTick', 0.6);
      }
    }
    const w = innerWidth, h = innerHeight, v = new THREE.Vector3();
    for (const p of [...this.list]) {
      p.t += dt;
      if (p.t > LIFE || !g.player) { this.drop(p); continue; }
      if (p.target) { if (p.target.alive) { p.x = p.target.pos.x; p.z = p.target.pos.z; } else p.target = null; }
      p.obj.position.set(p.x, 0, p.z);
      const fade = Math.min(1, (LIFE - p.t) / 0.6), pop = Math.min(1, p.t / 0.15);
      p.beam.material.opacity = 0.55 * fade; p.core.material.opacity = 0.9 * fade; p.tip.material.opacity = 0.95 * fade;
      p.beam.scale.set(1, pop, 1); p.core.scale.set(1, pop, 1);
      p.tip.rotation.y += dt * 3; p.tip.position.y = 5.15 + Math.sin(p.t * 5) * 0.12;
      p.disc.material.opacity = 0.85 * fade;
      const k = (p.t % 1.1) / 1.1; // a ring pulsing out from the foot, again and again
      p.wave.scale.setScalar(0.4 + k * 1.8); p.wave.material.opacity = 0.75 * (1 - k) * fade;
      // off screen: an arrow at the edge pointing to it
      v.set(p.x, 1, p.z).project(g.camera);
      let sx = (v.x * 0.5 + 0.5) * w, sy = (-v.y * 0.5 + 0.5) * h;
      const behind = v.z > 1, pad = 28;
      if (behind) { sx = w - sx; sy = h - sy; }
      const off = behind || sx < 0 || sx > w || sy < 0 || sy > h;
      p.arrow.classList.toggle('on', off && g.mode !== 'title');
      if (off) {
        const cx = w / 2, cy = h / 2, dx = sx - cx, dy = sy - cy, s = Math.min((cx - pad) / Math.abs(dx || 1e-6), (cy - pad) / Math.abs(dy || 1e-6));
        p.arrow.style.transform = `translate(${cx + dx * s}px, ${cy + dy * s}px) rotate(${Math.atan2(dy, dx)}rad)`;
        p.arrow.style.opacity = fade;
      }
    }
    for (const b of [...this.bubbles]) {
      b.t += dt;
      const a = b.actor;
      if (b.t > 3 || !a.rig?.root.parent) { b.el.remove(); this.bubbles.splice(this.bubbles.indexOf(b), 1); continue; }
      v.set(a.pos.x, 2.5 * a.rig.root.scale.y + (a.y || 0), a.pos.z).project(g.camera);
      b.el.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px, ${(-v.y * 0.5 + 0.5) * h}px) translate(-50%, -100%)`;
      b.el.style.opacity = v.z > 1 ? 0 : Math.min(1, (3 - b.t) / 0.4);
    }
  }

  // markers on the minimap (and the big map)
  drawMap(ctx, P, sc, here) {
    const pulse = 0.5 + Math.sin(this.game.time * 8) * 0.5;
    for (const p of this.list) {
      if (!here(p.x, p.z)) continue;
      const [a, b] = P(p.x, p.z), col = hex(p.color);
      ctx.strokeStyle = col; ctx.lineWidth = 2 / sc;
      ctx.globalAlpha = 0.5 + 0.5 * pulse;
      ctx.beginPath(); ctx.arc(a, b, (5 + pulse * 3) / sc, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1; ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(a, b, 2.5 / sc, 0, Math.PI * 2); ctx.fill();
    }
  }
}
