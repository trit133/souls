// The title screen's look for the other menus (sign in, skins, settings, multiplayer lobby): headings and button
// labels in the title's pixel font, buttons as riveted pixel tiles in reds and oranges whose frame lights and
// letters burn on hover, panels in dark pixel frames, pixel sliders. Button text stays in the DOM (hidden) and
// a watcher redraws the pixel label whenever the game changes it, so `btn.textContent = 'Equip'` still works.
import { PixelLabel, pixelIcon, frameImage, FRAME } from './pixelui.js';

const SCREENS = ['#account', '#skins', '#settings', '#lobby'];
const live = new Set(); // { L, el }: labels to animate while visible
let raf = 0, last = 0, acc = 0;

function loop(now) {
  const dt = Math.max(0, Math.min(0.1, (now - last) / 1000)); last = now; acc += dt;
  if (acc >= 1 / 20) {
    for (const x of live) if (x.el.isConnected && x.el.offsetParent) x.L.step(acc, x.el.matches(':hover, :focus-visible'));
    acc = 0;
  }
  raf = requestAnimationFrame(loop);
}

// the frames, once, as CSS variables: --pxf-<tone> and --pxf-<tone>-hot
function frames() {
  const root = document.documentElement.style;
  for (const [tone, [rest, hot]] of Object.entries(FRAME)) {
    root.setProperty(`--pxf-${tone}`, `url(${frameImage(rest)})`);
    root.setProperty(`--pxf-${tone}-hot`, `url(${frameImage(hot)})`);
  }
}

// a button as a pixel tile; its text node stays (hidden) and the label follows it
export function pxButton(btn, tone = 'rust', px = 3) {
  if (btn.plabel) return;
  btn.classList.add('pxbtn'); btn.dataset.tone = btn.dataset.tone || tone;
  const holder = document.createElement('span'); holder.className = 'pxlab';
  const text = () => [...btn.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
  const L = new PixelLabel(holder, text(), { px });
  btn.plabel = L;
  btn.appendChild(holder);
  live.add({ L, el: btn });
  new MutationObserver(() => {
    if (btn.contains(holder) && L.text === text().toUpperCase()) return;
    L.set(text());
    if (!btn.contains(holder)) btn.appendChild(holder);
  }).observe(btn, { childList: true, characterData: true, subtree: true });
}

// a heading or short line in the pixel font (follows text changes too)
export function pxText(el, o = {}) {
  if (el.plabel) return;
  const holder = document.createElement('span'); holder.className = 'pxlab';
  const text = () => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
  const L = new PixelLabel(holder, text(), { font: o.font || 'big', px: o.px || 4 });
  el.plabel = L; el.classList.add('pxtext');
  el.appendChild(holder);
  live.add({ L, el: o.hover || el });
  new MutationObserver(() => {
    if (el.contains(holder) && L.text === text().toUpperCase()) return;
    L.set(text());
    if (!el.contains(holder)) el.appendChild(holder);
  }).observe(el, { childList: true, characterData: true, subtree: true });
}

// sliders fill in orange up to their value
function syncRange(r) { r.style.setProperty('--v', ((r.value - r.min) / (r.max - r.min || 1)) * 100 + '%'); }
export function syncRanges() { document.querySelectorAll('#settings input[type=range]').forEach(syncRange); }

export function pixelMenus() {
  frames();
  const q = (sel) => document.querySelectorAll(sel);
  // headings
  for (const s of SCREENS) { const h = document.querySelector(`${s} > h2`); if (h) pxText(h, { px: s === '#lobby' ? 4 : 5 }); }
  for (const h of q('#lobby .panel-head, #settings .shop-head')) pxText(h, { font: 'mini', px: 3 });
  pxText(document.getElementById('lobby-code'), { px: 5 });
  // buttons, by role
  const tone = { 'lobby-start': 'ember', 'lobby-create': 'ember', 'acct-signin': 'ember', 'acct-signup': 'rust', 'lobby-back': 'blood', 'set-signout': 'blood', 'set-back': 'ember', 'skins-back': 'ash', 'acct-back': 'ash' };
  for (const b of q('#account button, #skins > button, #skins #skin-tabs button, #settings > button, #settings #set-layout, #lobby button.menu-btn, #lobby button.mini-btn')) {
    pxButton(b, tone[b.id] || (b.closest('#skin-tabs') ? 'scarlet' : 'rust'), b.classList.contains('menu-btn') ? 3 : 2);
  }
  // the lobby's class picks: framed tiles with their names in the pixel font
  for (const p of q('#lobby .pick')) {
    p.classList.add('pxpick'); const n = p.querySelector('b'); if (n) pxText(n, { font: 'big', px: 2, hover: p });
    const pad = document.createElement('i'); pad.className = 'pxpad'; pixelIcon(pad, 'lock', 2); p.appendChild(pad); // shown while locked
  }
  // skin cards are rebuilt on every change: dress their buttons and padlocks as they appear
  const dressSkins = () => {
    for (const b of q('#skin-list button')) pxButton(b, b.textContent.includes('Equipped') ? 'ember' : 'rust', 2);
    for (const c of q('#skin-list > *')) {
      const locked = !!c.querySelector('button')?.textContent.includes('Locked');
      c.classList.toggle('pxlocked', locked);
      if (locked && !c.querySelector('.pxpad')) { const i = document.createElement('span'); i.className = 'pxpad'; pixelIcon(i, 'lock', 2); c.appendChild(i); }
    }
  };
  new MutationObserver(dressSkins).observe(document.getElementById('skin-list'), { childList: true });
  dressSkins();
  // sliders
  document.addEventListener('input', (e) => { if (e.target.matches?.('#settings input[type=range]')) syncRange(e.target); });
  syncRanges();
  if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
}
