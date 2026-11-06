// Touch layout editor: drag the on-screen buttons and the move stick's resting spot anywhere.
// Positions are button centres stored as fractions of the screen, so a layout survives rotation
// and other phones. A control with no saved position keeps its default spot.

const $ = (id) => document.getElementById(id);
const controls = () => [...document.querySelectorAll('#touch [data-act]'), $('stick-base')];
const keyOf = (el) => el.dataset.act || 'stick';

function place(el, p) {
  if (el.id === 'stick-base') {
    // the stick lives in the left-half zone: x is a fraction of the screen, so double it for the zone
    if (p) { el.style.setProperty('--home-x', p[0] * 200 + '%'); el.style.setProperty('--home-y', p[1] * 100 + '%'); }
    else { el.style.removeProperty('--home-x'); el.style.removeProperty('--home-y'); }
    return;
  }
  el.classList.toggle('free', !!p);
  if (p) {
    // out of #buttons so the position is relative to the whole screen
    if (el.parentNode !== $('touch')) $('touch').appendChild(el);
    el.style.left = p[0] * 100 + '%'; el.style.top = p[1] * 100 + '%';
  } else {
    el.style.left = el.style.top = '';
    if (el.classList.contains('btn') && el.parentNode !== $('buttons')) $('buttons').appendChild(el);
  }
}

export function applyLayout(layout = {}) {
  for (const el of controls()) place(el, layout[keyOf(el)]);
}

// where a control is right now, as screen fractions
function centre(el) {
  const t = $('touch').getBoundingClientRect(), r = el.getBoundingClientRect();
  return [(r.left + r.width / 2 - t.left) / t.width, (r.top + r.height / 2 - t.top) / t.height];
}

export class LayoutEditor {
  constructor(game) {
    this.game = game;
    this.layout = null;
    $('set-layout').addEventListener('click', () => this.open());
    $('layout-save').addEventListener('click', () => this.close(true));
    $('layout-cancel').addEventListener('click', () => this.close(false));
    $('layout-reset').addEventListener('click', () => { this.layout = {}; applyLayout({}); this.freeAll(); });
    for (const el of controls()) el.addEventListener('pointerdown', (e) => this.grab(el, e));
  }

  // show every control at its current spot as a free one, so any of them can be dragged
  freeAll() {
    const shown = controls().map((el) => [el, centre(el)]);
    for (const [el, p] of shown) place(el, p);
  }

  open() {
    const g = this.game;
    this.layout = structuredClone(g.settings.touchLayout || {});
    this.wasHidden = $('touch').classList.contains('hidden');
    g.input.layoutEdit = true;
    g.input.capture = (code) => { if (code === 'Escape') this.close(false); };
    g.ui.show('settings', false);
    g.ui.show('touch');
    $('touch').classList.add('editing');
    g.ui.show('layout-bar');
    this.freeAll();
  }

  close(save) {
    const g = this.game;
    if (save) { g.settings.touchLayout = this.layout; g.saveSettings(); }
    applyLayout(g.settings.touchLayout);
    this.layout = null;
    g.input.layoutEdit = false;
    g.input.capture = null;
    $('touch').classList.remove('editing');
    if (this.wasHidden) g.ui.show('touch', false);
    g.ui.show('layout-bar', false);
    g.openSettings();
  }

  grab(el, e) {
    if (!this.layout) return;
    e.preventDefault(); e.stopPropagation();
    const t = $('touch').getBoundingClientRect(), r = el.getBoundingClientRect();
    const [cx, cy] = centre(el);
    const off = [cx - (e.clientX - t.left) / t.width, cy - (e.clientY - t.top) / t.height];
    // keep the whole control on screen; the stick stays on the left half where it can be touched
    const hx = r.width / 2 / t.width, hy = r.height / 2 / t.height;
    const maxX = el.id === 'stick-base' ? 0.5 - hx : 1 - hx;
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    el.setPointerCapture(e.pointerId);
    el.classList.add('dragging');
    const move = (ev) => {
      if (ev.pointerId !== e.pointerId) return;
      const p = [
        clamp((ev.clientX - t.left) / t.width + off[0], hx, maxX),
        clamp((ev.clientY - t.top) / t.height + off[1], hy, 1 - hy),
      ].map((v) => +v.toFixed(4));
      this.layout[keyOf(el)] = p;
      place(el, p);
    };
    const up = (ev) => {
      if (ev.pointerId !== e.pointerId) return;
      el.classList.remove('dragging');
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }
}
