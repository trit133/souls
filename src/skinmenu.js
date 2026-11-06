// Skins screen: tabs per character, a rotating pixel-art preview, cards with kill progress and Equip.
import * as THREE from 'three';
import { buildHumanoid } from './models.js';
import { locomotion } from './anims.js';
import { PixelPass } from './pixel.js';
import { CHARS } from './player.js';
import { skinList, skinModel, unlocked } from './skins.js';

const $ = (id) => document.getElementById(id);
const NAMES = { knight: 'Knight', rogue: 'Rogue', mage: 'Spellsword' };

export class SkinMenu {
  constructor(game) {
    this.game = game;
    this.kind = 'knight'; this.sel = 'default';
    this.renderer = null; this.rig = null; this.raf = 0;
    document.querySelectorAll('[data-skin-kind]').forEach((b) => b.addEventListener('click', () => { this.kind = b.dataset.skinKind; this.sel = this.equipped(); this.render(); }));
    $('skins-back').addEventListener('click', () => this.close());
  }

  kills(kind) { return this.game.accounts.data?.kills?.[kind] || 0; }
  equipped(kind = this.kind) { return this.game.equippedSkin(kind); }

  open(kind) {
    this.kind = kind || this.game.lobbyKind || 'knight';
    this.sel = this.equipped();
    this.game.ui.show('skins');
    this.render();
    if (!this.raf) { this.last = performance.now(); this.raf = requestAnimationFrame((t) => this.tick(t)); }
  }

  close() {
    this.game.ui.show('skins', false);
    cancelAnimationFrame(this.raf); this.raf = 0;
    if (this.game.mp.code) this.game.mp.setKind(this.game.lobbyKind || 'knight'); // teammates see the new skin
    this.game.refreshTitle?.(); this.game.renderLobby?.();
  }

  equip(id) {
    const d = this.game.accounts.data;
    if (!d || !this.game.accounts.user) return;
    d.skins = d.skins || {};
    d.skins[this.kind] = id;
    this.game.accounts.save();
    this.render();
  }

  render() {
    document.querySelectorAll('[data-skin-kind]').forEach((b) => b.classList.toggle('on', b.dataset.skinKind === this.kind));
    const kills = this.kills(this.kind), eq = this.equipped(), signed = !!this.game.accounts.user;
    $('skin-note').textContent = signed ? `${NAMES[this.kind]} kills: ${kills}` : 'Sign in to unlock and keep skins (kills count on your account).';
    $('skin-list').replaceChildren(...skinList(this.kind).map((s) => {
      const open = signed && unlocked(this.kind, s.id, kills);
      const el = document.createElement('div');
      el.className = 'skin' + (s.id === this.sel ? ' sel' : '') + (open ? '' : ' locked');
      const pct = s.kills ? Math.min(100, (kills / s.kills) * 100) : 100;
      el.innerHTML = `<div class="sname"></div><div class="sdesc"></div><div class="sprog"></div>${s.kills ? `<div class="sbar"><i style="width:${pct}%"></i></div>` : ''}`;
      el.querySelector('.sname').textContent = s.name;
      el.querySelector('.sdesc').textContent = s.desc;
      el.querySelector('.sprog').textContent = !s.kills ? 'Default' : open ? `Unlocked · ${s.kills} kills` : `${Math.min(kills, s.kills)} / ${s.kills} kills`;
      const b = document.createElement('button');
      b.className = 'mini-btn';
      b.textContent = s.id === eq ? 'Equipped' : open ? 'Equip' : 'Locked';
      b.disabled = s.id === eq || !open;
      b.addEventListener('click', (ev) => { ev.stopPropagation(); this.equip(s.id); });
      el.append(b);
      el.addEventListener('click', () => { this.sel = s.id; this.render(); });
      return el;
    }));
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
    const w = cv.clientWidth || 240, h = cv.clientHeight || 300;
    this.pixel.setSize(w, h, window.devicePixelRatio || 1, 150);
    // pixel.js lays the canvas out for full screen; keep it in its box
    cv.style.position = 'static'; cv.style.width = w + 'px'; cv.style.height = h + 'px';
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    if (this.rig) this.scene.remove(this.rig.root);
    this.rig = buildHumanoid({ ...skinModel(CHARS[this.kind].model, this.kind, this.sel), scale: 1 });
    this.rig.idle = true;
    this.scene.add(this.rig.root);
    this.phase = 0;
  }

  tick(now) {
    this.raf = requestAnimationFrame((t) => this.tick(t));
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    if (!this.rig) return;
    this.rig.root.rotation.y += dt * 0.7;
    this.rig.setGlow?.(0.8 + Math.sin(now / 600) * 0.2);
    this.rig.apply(locomotion(CHARS[this.kind].style, 0, 0, false, now / 1000), dt, 10);
    this.pixel.render(this.scene, this.camera);
  }
}
