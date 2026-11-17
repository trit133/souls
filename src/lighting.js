// Enhanced lighting, in the Proving Ring for now (the Sanctum's training arena): a low golden evening sun that casts
// real shadows from everything (you, the dummy, the pillars, the terraces, whatever the pads call in), the braziers'
// and pads' lights casting their own, light shafts through the dusty air between the pillars, bloom on fire and
// glow, soft shadow in the creases, a filmic tone curve, and the palette: Strict (the game's own pixel palette, the
// light in hard bands) or Soft (smooth light, finely posterized). The Graphics settings pick how much of it runs.
// Everywhere else the game looks as it always has; leaving the ring puts everything back.
import * as THREE from 'three';

// what each quality preset turns on (settings.js keeps the player's own choices; 'custom' once they change one)
export const GFX_PRESETS = {
  low: { shadows: 'off', torchShadows: false, godRays: false, bloom: false, ao: false },
  medium: { shadows: 'low', torchShadows: false, godRays: false, bloom: true, ao: false },
  high: { shadows: 'high', torchShadows: true, godRays: true, bloom: true, ao: false },
  ultra: { shadows: 'high', torchShadows: true, godRays: true, bloom: true, ao: true },
};
export const GFX_KEYS = ['shadows', 'torchShadows', 'godRays', 'bloom', 'ao'];

// the evening: the sun low in the north-west, behind the ring's tall back pillars, shining toward the camera
const EVENING = {
  sunDir: new THREE.Vector3(-0.62, 0.34, -0.71).normalize(), sun: 0xffa45a, sunPower: 3.6,
  sky: 0x8a86b0, ground: 0x3a2416, hemi: 0.8, fog: 0x6a4630, fogNear: 22, fogFar: 64, bg: 0x3a2618,
};
const SHADOW_SIZE = { low: 1024, high: 2048 };
const BOX = 18; // (half the sun's shadow box, metres: the whole ring)
const ACTORS = 2; // (the layer people are on too: the lamps' shadows draw only them, the sun already shadows the rest)

export class Lighting {
  constructor(game) {
    this.game = game;
    this.on = false; this.key = '';
    this.marked = new Set(); this.discs = new Set(); this.soft = new Set();
    this.t = 0;
    this.fps = document.createElement('div'); this.fps.id = 'fps'; this.fps.className = 'hidden'; document.body.append(this.fps);
    this.fpsAcc = 0; this.fpsN = 0;
  }

  // the settings' graphics choices (main.js applySettings)
  configure(s) { this.s = s; this.fps.classList.toggle('hidden', !s.fps); this.key = ''; }

  // each frame, before drawing: on in the ring, off anywhere else; the scene kept up to date while on
  update(dt) {
    const g = this.game, s = this.s || {};
    if (s.fps) this.countFps(dt);
    const want = !!(g.training && g.mode === 'play' && !g.night && g.world?.mods?.[0]?.key === 'training');
    const key = want ? JSON.stringify([s.shadows, s.torchShadows, s.godRays, s.bloom, s.ao, s.palette]) : '';
    if (key !== this.key) { if (this.on) this.exit(); if (want) this.enter(); this.key = key; }
    if (!this.on) return;
    this.t -= dt;
    if (this.t <= 0) { this.t = 0.5; this.mark(); }
    this.follow();
    if (this.torches === 2) { const L = g.world.lightPool[(this.frame = (this.frame || 0) + 1) % 2]; if (L) L.shadow.needsUpdate = true; }
  }

  enter() {
    const g = this.game, s = this.s, r = g.renderer, sun = g.sun;
    this.on = true;
    // the daylight as it was, to put back
    this.saved = {
      sunPos: sun.position.clone(), sunCol: sun.color.getHex(), sunI: sun.intensity, hemiSky: g.hemi.color.getHex(), hemiGround: g.hemi.groundColor.getHex(), hemiI: g.hemi.intensity,
      fog: g.scene.fog.color.getHex(), fogNear: g.scene.fog.near, fogFar: g.scene.fog.far, bg: g.scene.background.getHex(),
    };
    const E = EVENING;
    sun.color.set(E.sun); sun.intensity = E.sunPower;
    g.hemi.color.set(E.sky); g.hemi.groundColor.set(E.ground); g.hemi.intensity = E.hemi;
    g.scene.fog.color.set(E.fog); g.scene.fog.near = E.fogNear; g.scene.fog.far = E.fogFar; g.scene.background.set(E.bg);
    if (!sun.target.parent) g.scene.add(sun.target);
    // shadows: the sun's (and the light shafts need its shadow map even if shadows are off)
    this.shadows = s.shadows !== 'off';
    const sunMap = this.shadows || s.godRays;
    r.shadowMap.enabled = sunMap; r.shadowMap.type = THREE.PCFShadowMap;
    sun.castShadow = sunMap;
    if (sunMap) {
      const size = SHADOW_SIZE[s.shadows] || 1024;
      sun.shadow.mapSize.set(size, size); sun.shadow.map?.dispose(); sun.shadow.map = null;
      Object.assign(sun.shadow.camera, { left: -BOX, right: BOX, top: BOX, bottom: -BOX, near: 1, far: 90 });
      sun.shadow.camera.updateProjectionMatrix();
      sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03; sun.shadow.radius = s.shadows === 'high' ? 2 : 1;
    }
    // the nearest lamp (the braziers, the pads' glow) casts shadows too; on Ultra the nearest two, taking turns to
    // redraw theirs (each lamp's shadow is six views of every person near it: the costliest thing here)
    this.torches = this.shadows && s.torchShadows ? (s.gfx === 'ultra' ? 2 : 1) : 0;
    g.world.lightPool.forEach((L, i) => {
      L.castShadow = i < this.torches;
      L.shadow.autoUpdate = this.torches < 2;
      if (L.castShadow) { L.shadow.mapSize.set(256, 256); L.shadow.camera.near = 0.2; L.shadow.camera.layers.set(ACTORS); L.shadow.bias = -0.003; L.shadow.radius = 2; }
    });
    // the pixel pass's share
    g.pixel.fx = {
      rays: s.godRays ? { sun, steps: s.shadows === 'high' ? 32 : 24, strength: 0.028 } : null,
      bloom: s.bloom ? 0.9 : 0, ao: !!s.ao, soft: s.palette === 'soft', tone: 1.25,
    };
    this.marked.clear(); this.discs.clear(); this.soft.clear();
    this.mark();
    this.follow();
  }

  exit() {
    const g = this.game, sun = g.sun, S = this.saved;
    this.on = false;
    sun.position.copy(S.sunPos); sun.target.position.set(0, 0, 0); sun.target.updateMatrixWorld();
    sun.color.set(S.sunCol); sun.intensity = S.sunI;
    g.hemi.color.set(S.hemiSky); g.hemi.groundColor.set(S.hemiGround); g.hemi.intensity = S.hemiI;
    g.scene.fog.color.set(S.fog); g.scene.fog.near = S.fogNear; g.scene.fog.far = S.fogFar; g.scene.background.set(S.bg);
    sun.castShadow = false; g.renderer.shadowMap.enabled = false;
    g.world.lightPool.forEach((L) => { L.castShadow = false; L.shadow.autoUpdate = true; });
    for (const o of this.marked) { o.castShadow = false; o.receiveShadow = false; o.layers.disable(ACTORS); }
    for (const d of this.discs) d.visible = true;
    for (const m of this.soft) { delete m.defines.SOFT_LIGHT; m.needsUpdate = true; }
    this.marked.clear(); this.discs.clear(); this.soft.clear();
    g.pixel.fx = null;
  }

  // everything solid in the scene casts and takes shadows (glows, effects and see-through things don't); the fake
  // shadow discs under people go (the real ones are there now); the Soft palette smooths the light on every material
  mark() {
    const g = this.game, soft = this.s.palette === 'soft';
    g.scene.traverse((o) => {
      if (!o.isMesh || this.marked.has(o)) return;
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      if (soft) for (const m of ms) if (m?.isMeshLambertMaterial && !this.soft.has(m)) { m.defines = { ...(m.defines || {}), SOFT_LIGHT: '' }; m.needsUpdate = true; this.soft.add(m); }
      if (!this.shadows && !this.s.godRays) return;
      const solid = ms.every((m) => m && !m.isMeshBasicMaterial && !m.isShaderMaterial && !m.isPointsMaterial && m.blending === THREE.NormalBlending && (!m.transparent || m.opacity > 0.9));
      if (!solid) return;
      o.castShadow = true; o.receiveShadow = this.shadows;
      this.marked.add(o);
    });
    if (this.shadows) for (const a of [...(g.allPlayers?.() || [g.player]), ...(g.enemiesAll?.() || [])]) {
      const d = a?.rig?.shadow; if (d && !this.discs.has(d)) { d.visible = false; this.discs.add(d); }
      if (this.torches) a?.rig?.root?.traverse((o) => { if (o.isMesh && o.castShadow) o.layers.enable(ACTORS); });
    }
  }

  // the sun's shadow box follows you (snapped to its texels so the edges don't crawl as you move)
  follow() {
    const g = this.game, sun = g.sun, p = g.player?.pos;
    if (!p) return;
    const step = (BOX * 2) / (sun.shadow.mapSize.x || 1024);
    const tx = Math.round(p.x / step) * step, tz = Math.round(p.z / step) * step;
    sun.target.position.set(tx, 0, tz); sun.target.updateMatrixWorld();
    sun.position.copy(EVENING.sunDir).multiplyScalar(40).add(sun.target.position);
  }

  countFps(dt) {
    this.fpsAcc += dt; this.fpsN++;
    if (this.fpsAcc >= 0.5) { this.fps.textContent = `${Math.round(this.fpsN / this.fpsAcc)} FPS`; this.fpsAcc = 0; this.fpsN = 0; }
  }
}
