// The wardrobe (customizer): one framed window in the middle of the screen. Header: the character's name, tabs to
// switch character, emeralds, close (X or Esc). Left: the character's slots, each showing the piece it wears.
// Middle: the model, big, turning slowly (drag to turn it yourself), with the 3 saved outfits under it (the
// selected one is worn). Right: the chosen slot's pieces, then its main and trim colours (hover a swatch for its
// name). Owned pieces and colours apply at once; anything not owned is tried on in the preview and the bar along
// the bottom offers Cancel / Buy (emeralds). Purchases and outfits are saved on the account; teammates see them.
import * as THREE from 'three';
import { buildHumanoid } from './models.js';
import { locomotion } from './anims.js';
import { PixelPass } from './pixel.js';
import { CHARS, weaponChar } from './player.js';
import { outfitModel } from './playerkits.js';
import { CHANNELS, slotsFor, COLORS, OUTFIT_SLOTS, pieceList, piecePrice, colorPrice, pieceKey, ownsPiece, ownsColor, cosmetics, wornOutfit, tickOutfitColors, forgetRig } from './outfits.js';

const $ = (id) => document.getElementById(id);
const NAMES = { knight: 'Templar', rogue: 'Shrike', mage: 'Adept' }; // (display names: The Last Crusade)
const hexCss = (h) => '#' + h.toString(16).padStart(6, '0');

export class SkinMenu {
  constructor(game) {
    this.game = game;
    this.kind = 'knight'; this.slot = null; this.try = null; // try: { type: 'piece'|'main'|'trim', id }
    this.renderer = null; this.rig = null; this.raf = 0;
    document.querySelectorAll('[data-skin-kind]').forEach((b) => b.addEventListener('click', () => { this.kind = b.dataset.skinKind; this.slot = this.slots(this.kind)[0].id; this.try = null; this.render(); }));
    document.querySelectorAll('[data-outfit]').forEach((b) => b.addEventListener('click', () => this.useOutfit(+b.dataset.outfit)));
    $('skins-back').addEventListener('click', () => this.close());
    $('cz-buy').addEventListener('click', () => this.buy());
    $('cz-cancel').addEventListener('click', () => { this.try = null; this.render(); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('skins').classList.contains('hidden')) { e.preventDefault(); this.close(); } });
    // drag the model round; it carries on turning slowly a moment after you let go
    const cv = $('skin-view');
    cv.addEventListener('pointerdown', (e) => { this.drag = { x: e.clientX }; this.held = 2; cv.setPointerCapture(e.pointerId); $('cz-drag').classList.add('gone'); });
    cv.addEventListener('pointermove', (e) => { if (!this.drag || !this.rig) return; this.rig.root.rotation.y += (e.clientX - this.drag.x) * 0.012; this.drag.x = e.clientX; });
    const up = () => { this.drag = null; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  }

  get data() { const d = this.game.accounts.data; return d && this.game.accounts.user ? cosmetics(d) : null; }
  get outfits() { return this.data?.outfits[this.kind]; }
  get fit() { const o = this.outfits; return o ? o.slots[o.active || 0] : { pieces: {}, colors: {} }; }

  open(kind) {
    this.kind = kind || this.game.lobbyKind || 'knight';
    this.slot = this.slots(this.kind)[0].id; this.try = null;
    this.game.ui.show('skins');
    this.render();
    if (!this.raf) { this.last = performance.now(); this.raf = requestAnimationFrame((t) => this.tick(t)); }
  }

  close() {
    this.game.ui.show('skins', false);
    cancelAnimationFrame(this.raf); this.raf = 0;
    if (this.game.mp.code) this.game.mp.setKind(this.game.lobbyKind || 'knight'); // teammates see the new outfit
    this.game.refreshTitle?.(); this.game.renderLobby?.();
    this.game.hermitage?.refreshCharacter(); // the hideout shows the new look
  }

  save() { this.game.accounts.save(); }
  useOutfit(i) { if (!this.outfits) return; this.outfits.active = i; this.try = null; this.save(); this.render(); }

  // wear a piece or colour you own; try on one you don't
  pick(type, id) {
    const d = this.data, fit = this.fit;
    if (!d) return;
    const owned = type === 'piece' ? ownsPiece(d, this.kind, this.slot, id) : ownsColor(d, id);
    if (!owned) { this.try = { type, id }; this.render(); return; }
    this.try = null;
    if (type === 'piece') fit.pieces[this.slot] = id;
    else { const c = fit.colors[this.slot] || ['default', 'default', 'default', 'default']; while (c.length < 4) c.push('default'); c[CHANNELS.indexOf(type)] = id; fit.colors[this.slot] = c; }
    this.save(); this.render();
  }

  priceOf(t) {
    if (!t) return 0;
    if (t.type === 'piece') { const list = pieceList(this.kind, this.slot), i = list.findIndex((p) => p.id === t.id); return piecePrice(list[i], i, this.slot); }
    return colorPrice(COLORS.find((c) => c.id === t.id));
  }

  buy() {
    const d = this.data, t = this.try;
    if (!d || !t) return;
    const price = this.priceOf(t);
    if (d.emeralds < price) return;
    d.emeralds -= price;
    if (t.type === 'piece') d.cosmetics.pieces.push(pieceKey(this.kind, this.slot, t.id));
    else d.cosmetics.colors.push(t.id);
    this.game.audio.play('heal');
    this.pick(t.type, t.id); // and wear it
  }

  // the outfit shown in the preview: what is worn, plus whatever is being tried on
  shown() {
    const out = this.data ? wornOutfit(this.data, this.kind) : {};
    const t = this.try;
    if (t) {
      const s = (out[this.slot] ||= { piece: pieceList(this.kind, this.slot)[0].id, main: 'default', trim: 'default', detail: 'default', glow: 'default' });
      if (t.type === 'piece') s.piece = t.id; else s[t.type] = t.id;
    }
    return out;
  }

  render() {
    const d = this.data, signed = !!d, fit = this.fit, kind = this.kind;
    document.querySelectorAll('[data-skin-kind]').forEach((b) => b.classList.toggle('on', b.dataset.skinKind === kind));
    document.querySelectorAll('[data-outfit]').forEach((b) => b.classList.toggle('on', +b.dataset.outfit === (this.outfits?.active || 0)));
    $('cz-emeralds').textContent = signed ? `${d.emeralds} emeralds` : '';
    $('skin-note').textContent = signed ? 'Emeralds: 1 for every kill, 2 for a boss. The selected outfit is the one you wear.' : 'Sign in to customize (emeralds and outfits are kept on your account).';
    // slots, each with the piece it wears
    const all = d ? wornOutfit(d, kind) : {};
    $('cz-slots').replaceChildren(...this.slots(kind).map((s) => {
      const b = document.createElement('button');
      b.className = 'cz-slot' + (s.id === this.slot ? ' on' : '') + (this.try && s.id === this.slot ? ' trying' : '');
      const piece = pieceList(kind, s.id).find((p) => p.id === all[s.id]?.piece) || pieceList(kind, s.id)[0];
      b.innerHTML = '<b></b><span></span>';
      b.querySelector('b').textContent = s.name;
      b.querySelector('span').textContent = piece?.name || '';
      b.addEventListener('click', () => { this.slot = s.id; this.try = null; this.render(); });
      return b;
    }));
    $('cz-pieces-h').textContent = `Pieces · ${this.slots(kind).find((s) => s.id === this.slot)?.name || ''}`;
    // pieces for the slot
    const worn = d ? wornOutfit(d, kind)[this.slot] : null;
    $('cz-pieces').replaceChildren(...pieceList(kind, this.slot).map((p, i) => {
      const own = signed && ownsPiece(d, kind, this.slot, p.id), on = worn?.piece === p.id, trying = this.try?.type === 'piece' && this.try.id === p.id;
      const el = document.createElement('div');
      el.className = 'cz-piece' + (on ? ' on' : '') + (trying ? ' trying' : '') + (own ? '' : ' locked') + (p.special ? ' special' : '');
      el.innerHTML = '<div class="cz-pname"></div><div class="cz-pdesc"></div><div class="cz-pprice"></div>';
      el.querySelector('.cz-pname').textContent = p.name + (p.special ? ' ✦' : '');
      el.querySelector('.cz-pdesc').textContent = p.desc;
      el.querySelector('.cz-pprice').textContent = on ? 'Worn' : own ? 'Owned' : `${piecePrice(p, i, this.slot)} emeralds`;
      el.addEventListener('click', () => this.pick('piece', p.id));
      return el;
    }));
    // colours: main, trim, detail and glow rows (Default + 15)
    const row = (type, label) => {
      const wrap = document.createElement('div'); wrap.className = 'cz-crow';
      const lab = document.createElement('span'); lab.className = 'cz-clabel'; lab.textContent = label; wrap.append(lab);
      const cur = worn?.[type] || 'default';
      for (const c of [{ id: 'default', name: 'Default' }, ...COLORS]) {
        const own = signed && ownsColor(d, c.id), trying = this.try?.type === type && this.try.id === c.id;
        const sw = document.createElement('button');
        sw.className = 'cz-swatch' + (c.id === cur ? ' on' : '') + (trying ? ' trying' : '') + (own ? '' : ' locked') + (c.fx ? ' fx fx-' + c.fx : '') + (c.id === 'default' ? ' dflt' : '');
        sw.title = c.name + (own ? '' : ` · ${colorPrice(c)} emeralds`);
        if (c.hex !== undefined) sw.style.background = hexCss(c.hex);
        sw.addEventListener('click', () => this.pick(type, c.id));
        sw.addEventListener('pointerenter', () => { $('cz-cname').textContent = sw.title; });
        sw.addEventListener('pointerleave', () => { $('cz-cname').textContent = ''; });
        wrap.append(sw);
      }
      return wrap;
    };
    $('cz-colors').replaceChildren(row('main', 'Main'), row('trim', 'Trim'), row('detail', 'Detail'), row('glow', 'Glow'));
    // the bar along the bottom: what you're trying on, Cancel and Buy (or the note when trying nothing)
    const t = this.try, price = this.priceOf(t), b = $('cz-buy');
    for (const id of ['cz-buy', 'cz-cancel']) $(id).classList.toggle('hidden', !t);
    $('skin-note').classList.toggle('hidden', !!t);
    $('cz-trying').textContent = '';
    if (t) {
      const name = t.type === 'piece' ? pieceList(kind, this.slot).find((p) => p.id === t.id)?.name : COLORS.find((c) => c.id === t.id)?.name;
      const slot = this.slots(kind).find((s) => s.id === this.slot)?.name;
      $('cz-trying').textContent = `Trying on: ${name} (${t.type === 'piece' ? slot : `${slot} ${t.type} colour`})${d && d.emeralds < price ? ` · you have ${d.emeralds}` : ''}`;
      b.textContent = `Buy · ${price}`;
      b.disabled = !d || d.emeralds < price;
    }
    this.buildPreview();
  }

  // a small scene of its own, drawn through the same pixel pass as the game
  buildPreview() {
    const cv = $('skin-view');
    if (!this.renderer) {
      this.renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: false });
      this.pixel = new PixelPass(this.renderer);
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x0e0c0a);
      this.scene.add(new THREE.HemisphereLight(0x9aa6c8, 0x4a3a28, 2.0));
      const sun = new THREE.DirectionalLight(0xffd8a8, 2.2); sun.position.set(-3, 5, 4); this.scene.add(sun);
      const ground = new THREE.Mesh(new THREE.CircleGeometry(1.4, 24), new THREE.MeshLambertMaterial({ color: 0x3a332a }));
      ground.rotation.x = -Math.PI / 2; this.scene.add(ground);
      this.camera = new THREE.PerspectiveCamera(32, cv.clientWidth / cv.clientHeight || 0.8, 0.1, 50);
      this.camera.position.set(0, 1.6, 4.6); this.camera.lookAt(0, 1.0, 0);
    }
    this.fitStage();
    const rot = this.rig?.root.rotation.y || 0;
    if (this.rig) { this.scene.remove(this.rig.root); forgetRig(this.rig.root); }
    this.rig = buildHumanoid({ ...outfitModel(this.char(this.kind).model, this.kind, this.shown()), scale: 1 });
    this.rig.idle = true; this.rig.root.rotation.y = rot;
    this.scene.add(this.rig.root);
  }

  // the weapon in hand (weapons.js): its own skin slot shows, the others' don't, and the preview holds it
  char(kind) { return weaponChar(kind, this.game.loadoutFor(kind).weapon) || CHARS[kind]; }
  slots(kind) { return slotsFor(kind, this.game.loadoutFor(kind).weapon); }

  // the preview fills the stage in the middle (and follows it when the window changes size)
  fitStage() {
    const st = $('cz-stage'), w = Math.max(120, st.clientWidth), h = Math.max(160, st.clientHeight);
    if (w === this.sw && h === this.sh) return;
    this.sw = w; this.sh = h;
    const cv = $('skin-view');
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    this.pixel.setSize(w, h, window.devicePixelRatio || 1, Math.round(Math.min(260, Math.max(150, h / 2.6))));
    this.camera.aspect = w / h; this.camera.fov = w / h < 0.75 ? 38 : 30; this.camera.updateProjectionMatrix();
  }

  tick(now) {
    this.raf = requestAnimationFrame((t) => this.tick(t));
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    if (!this.rig) return;
    this.fitStage();
    if (this.held > 0) this.held -= dt; // just dragged: hold still a moment
    else if (!this.drag) this.rig.root.rotation.y += dt * 0.7;
    this.rig.setGlow?.(0.8 + Math.sin(now / 600) * 0.2);
    this.rig.apply(locomotion(this.char(this.kind).style, 0, 0, false, now / 1000), dt, 10);
    tickOutfitColors(now / 1000);
    this.pixel.render(this.scene, this.camera);
  }
}
export { OUTFIT_SLOTS };
