// Unified keyboard / mouse / touch input. Actions are edge-triggered presses
// (collected into `pressed` and drained once per frame) plus held states.

const KEYMAP = {
  KeyJ: 'attack', KeyL: 'heavy', Space: 'roll', KeyK: 'roll',
  KeyQ: 'special', ControlLeft: 'special', KeyE: 'heal', Tab: 'lock',
  KeyF: 'interact', Escape: 'pause', KeyP: 'pause',
};

export class Input {
  constructor() {
    this.keys = new Set();
    this.pressed = new Set();
    this.held = { special: false, roll: false };
    this.stick = { x: 0, y: 0, active: false, id: null, ox: 0, oy: 0 };
    this.isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    this.lastDevice = this.isTouch ? 'touch' : 'kb';
    this._bindKeyboard();
    this._bindMouse();
    this._bindTouch();
  }

  _press(a) { this.pressed.add(a); }

  _bindKeyboard() {
    addEventListener('keydown', (e) => {
      if (e.code === 'Tab' || e.code === 'Space') e.preventDefault();
      this.lastDevice = 'kb';
      if (e.repeat) return;
      this.keys.add(e.code);
      const a = KEYMAP[e.code];
      if (a) { this._press(a); if (a in this.held) this.held[a] = true; }
    });
    addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      const a = KEYMAP[e.code];
      if (a && a in this.held) {
        // another key may still hold the same action
        this.held[a] = Object.entries(KEYMAP).some(([k, v]) => v === a && this.keys.has(k));
      }
    });
    addEventListener('blur', () => { this.keys.clear(); this.held.special = false; this.held.roll = false; });
  }

  _bindMouse() {
    const canvas = document.getElementById('game');
    canvas.addEventListener('mousedown', (e) => {
      this.lastDevice = 'kb';
      if (e.button === 0) this._press('attack');
      if (e.button === 2) this._press('heavy');
      if (e.button === 1) { e.preventDefault(); this._press('lock'); }
    });
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
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (x || y) { const l = Math.hypot(x, y); return { x: x / l, y: y / l }; }
    if (this.stick.active) return { x: this.stick.x, y: this.stick.y };
    return { x: 0, y: 0 };
  }

  sprintHeld() {
    return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.held.roll;
  }

  drain() { const p = this.pressed; this.pressed = new Set(); return p; }

  reset() {
    this.pressed.clear(); this.held.special = false; this.held.roll = false;
    document.querySelectorAll('#touch .btn.down').forEach((b) => b.classList.remove('down'));
  }
}
