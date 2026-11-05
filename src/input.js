// Unified keyboard / mouse / touch input. Actions are edge-triggered presses
// (collected into `pressed` and drained once per frame) plus held states.

import { DEFAULT_BINDS } from './settings.js';

const MOVES = new Set(['up', 'down', 'left', 'right', 'sprint']);

export class Input {
  constructor() {
    this.keys = new Set();
    this.pressed = new Set();
    this.held = { special: false, roll: false };
    this.stick = { x: 0, y: 0, active: false, id: null, ox: 0, oy: 0 };
    this.isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    this.lastDevice = this.isTouch ? 'touch' : 'kb';
    this.capture = null; // set while the settings screen waits for a key
    this.setBinds(DEFAULT_BINDS);
    this._bindKeyboard();
    this._bindMouse();
    this._bindTouch();
  }

  _press(a) { this.pressed.add(a); }

  // binds: { action: [code, code] }; mouse buttons are 'Mouse0'..'Mouse4'
  setBinds(binds) {
    this.binds = binds;
    this.codeMap = new Map();
    for (const [a, codes] of Object.entries(binds)) for (const c of codes) if (c) this.codeMap.set(c, a);
  }

  isDown(action) { return (this.binds[action] || []).some((c) => c && this.keys.has(c)); }

  _down(code) {
    this.keys.add(code);
    const a = this.codeMap.get(code);
    if (!a || MOVES.has(a)) return;
    this._press(a);
    if (a in this.held) this.held[a] = true;
  }

  _up(code) {
    this.keys.delete(code);
    const a = this.codeMap.get(code);
    if (a && a in this.held) this.held[a] = this.isDown(a); // another key may still hold it
  }

  _bindKeyboard() {
    addEventListener('keydown', (e) => {
      if (this.capture) { e.preventDefault(); this.capture(e.code); return; }
      if (e.target instanceof HTMLInputElement) return; // typing in the account form
      if (e.code === 'Tab' || e.code === 'Space') e.preventDefault();
      this.lastDevice = 'kb';
      if (e.repeat) return;
      this._down(e.code);
    });
    addEventListener('keyup', (e) => this._up(e.code));
    addEventListener('blur', () => { this.keys.clear(); this.held.special = false; this.held.roll = false; });
  }

  _bindMouse() {
    const canvas = document.getElementById('game');
    addEventListener('mousedown', (e) => {
      if (this.capture) { e.preventDefault(); this.capture('Mouse' + e.button); }
    }, true);
    canvas.addEventListener('mousedown', (e) => {
      if (this.capture) return;
      this.lastDevice = 'kb';
      if (e.button === 1) e.preventDefault();
      this._down('Mouse' + e.button);
    });
    addEventListener('mouseup', (e) => this._up('Mouse' + e.button));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  _bindTouch() {
    const zone = document.getElementById('stick-zone');
    const base = document.getElementById('stick-base');
    const knob = document.getElementById('stick-knob');
    const R = 52;
    const setKnob = (dx, dy) => { knob.style.transform = `translate(${dx}px, ${dy}px)`; };
    const home = () => { base.style.left = ''; base.style.top = ''; };

    zone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.lastDevice = 'touch';
      if (this.stick.id !== null) return;
      const t = e.changedTouches[0];
      this.stick.id = t.identifier; this.stick.active = true;
      this.stick.ox = t.clientX; this.stick.oy = t.clientY;
      base.style.left = t.clientX + 'px'; base.style.top = t.clientY + 'px';
      base.classList.add('active');
    }, { passive: false });
    const move = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier !== this.stick.id) continue;
        e.preventDefault();
        let dx = t.clientX - this.stick.ox, dy = t.clientY - this.stick.oy;
        const d = Math.hypot(dx, dy);
        if (d > R) {
          // drag the base along so direction changes stay responsive
          const over = d - R;
          this.stick.ox += dx / d * over; this.stick.oy += dy / d * over;
          base.style.left = this.stick.ox + 'px'; base.style.top = this.stick.oy + 'px';
          dx = dx / d * R; dy = dy / d * R;
        }
        setKnob(dx, dy);
        const len = Math.max(Math.hypot(dx, dy), 1e-6);
        const m = Math.min(1, len / R);
        const dead = 0.15;
        const s = m < dead ? 0 : Math.min(1, (m - dead) / (0.85 - dead));
        this.stick.x = dx / len * s;
        this.stick.y = -dy / len * s;
      }
    };
    const end = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier !== this.stick.id) continue;
        this.stick.id = null; this.stick.active = false; this.stick.x = 0; this.stick.y = 0;
        setKnob(0, 0); base.classList.remove('active'); home();
      }
    };
    zone.addEventListener('touchmove', move, { passive: false });
    zone.addEventListener('touchend', end);
    zone.addEventListener('touchcancel', end);

    document.querySelectorAll('#touch [data-act]').forEach((btn) => {
      const a = btn.dataset.act;
      const down = (e) => {
        e.preventDefault(); e.stopPropagation();
        this.lastDevice = 'touch';
        btn.classList.add('down');
        this._press(a);
        if (a in this.held) this.held[a] = true;
      };
      const up = (e) => {
        e.preventDefault();
        btn.classList.remove('down');
        if (a in this.held) this.held[a] = false;
      };
      btn.addEventListener('touchstart', down, { passive: false });
      btn.addEventListener('touchend', up, { passive: false });
      btn.addEventListener('touchcancel', up, { passive: false });
      btn.addEventListener('mousedown', down);
      btn.addEventListener('mouseup', up);
    });
  }

  // Returns {x, y} with y = "up the screen"; magnitude <= 1.
  move() {
    let x = 0, y = 0;
    if (this.isDown('up')) y += 1;
    if (this.isDown('down')) y -= 1;
    if (this.isDown('right')) x += 1;
    if (this.isDown('left')) x -= 1;
    if (x || y) { const l = Math.hypot(x, y); return { x: x / l, y: y / l }; }
    if (this.stick.active) return { x: this.stick.x, y: this.stick.y };
    return { x: 0, y: 0 };
  }

  sprintHeld() {
    return this.isDown('sprint') || this.held.roll;
  }

  drain() { const p = this.pressed; this.pressed = new Set(); return p; }

  reset() {
    this.pressed.clear(); this.held.special = false; this.held.roll = false;
    document.querySelectorAll('#touch .btn.down').forEach((b) => b.classList.remove('down'));
  }
}
