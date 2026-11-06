// Class card hover animations (title screen and lobby): a pixelfx effect per class, replayed on a beat while the
// pointer or keyboard focus is on the card, drawn into a low-res canvas behind the card's text. One shared
// animation loop runs only while some card is showing one.
import { createFrame, clearFrame, createFx, composite } from './pixelfx/core/index.js';
import * as glimmer from './pixelfx/fx/ui/card-glimmer.js';
import * as rogue from './pixelfx/fx/ui/card-rogue.js';
import * as fireball from './pixelfx/fx/ui/card-fireball.js';

const FX = { knight: [glimmer, 3], rogue: [rogue, 4], mage: [fireball, 3] }; // effect, seconds between plays
const PX = 3; // screen px per art px
const FPS = 30;
const active = new Set();
let last = 0, running = false;

function tick(now) {
  const dt = Math.min(0.1, (now - last) / 1000 || 0);
  last = now;
  for (const c of active) c.step(dt);
  if (active.size) requestAnimationFrame(tick); else running = false;
}

export function attachCardFx(el, kind) {
  const [mod, every] = FX[kind] || [];
  if (!mod) return;
  const cv = document.createElement('canvas');
  cv.className = 'cardfx';
  cv.setAttribute('aria-hidden', 'true');
  el.prepend(cv);
  const ctx = cv.getContext('2d');
  let frame = null, img = null, fx = null, t = 0, acc = 0, plays = 0, on = false, offT = null;

  const card = {
    start() {
      clearTimeout(offT);
      const w = Math.max(8, Math.round(el.clientWidth / PX)), h = Math.max(8, Math.round(el.clientHeight / PX));
      if (!frame || frame.w !== w || frame.h !== h) { cv.width = w; cv.height = h; frame = createFrame(w, h); img = new ImageData(w, h); }
      if (!on) { t = 0; fx = null; }
      on = true;
      cv.classList.add('on');
      active.add(card);
      if (!running) { running = true; last = performance.now(); requestAnimationFrame(tick); }
    },
    // the canvas fades out in CSS; keep drawing until it has
    stop() {
      on = false;
      cv.classList.remove('on');
      clearTimeout(offT);
      offT = setTimeout(() => { if (!on) active.delete(card); }, 350);
    },
    step(dt) {
      // a fresh play every `every` seconds, each with its own seed so no two look the same
      if (!fx || t >= every) { t = 0; fx = createFx(mod, { w: frame.w, h: frame.h, seed: (mod.meta.options.seed || 1) + plays++ }); }
      else fx.update(dt);
      t += dt;
      acc += dt;
      if (acc < 1 / FPS) return;
      acc = 0;
      clearFrame(frame);
      if (t < mod.meta.duration) fx.draw(frame);
      composite(frame, img.data, null);
      ctx.putImageData(img, 0, 0);
    },
  };
  el.addEventListener('pointerenter', () => card.start());
  el.addEventListener('pointerleave', () => card.stop());
  el.addEventListener('focus', () => card.start());
  el.addEventListener('blur', () => card.stop());
}
