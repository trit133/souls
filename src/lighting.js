// Enhanced lighting: in the Proving Ring (the Sanctum's training arena), the region's four raid areas and the three
// hideouts. Outdoors, a sun with each place's own time of day that casts real shadows from everything (you, enemies,
// the houses and ruins, the terraces), the nearest torch casting shadows of people too, light shafts through the
// dusty air, bloom on fire and glow, soft shadow in the creases and a filmic tone curve. In a hideout, the lamps over
// the things you use cast their pools of light with shadows, the hearth throws your shadow across the floor and up the
// walls, and a cold moonbeam slants down from a grate above with dust drifting in it. The palette: Strict (the game's
// own pixel palette, the light in hard bands) or Soft (smooth light, finely posterized). The Graphics settings pick
// how much of it runs. Fires, torches and lamps keep their brightness; Night Raids keep their own dark, torch-lit
// look; everywhere else (the Bazaar, the old runs) looks as it always has, and leaving puts everything back.
import * as THREE from 'three';

// what each quality preset turns on (settings.js keeps the player's own choices; 'custom' once they change one)
export const GFX_PRESETS = {
  low: { shadows: 'off', torchShadows: false, godRays: false, bloom: false, ao: false },
  medium: { shadows: 'low', torchShadows: false, godRays: false, bloom: true, ao: false },
  high: { shadows: 'high', torchShadows: true, godRays: true, bloom: true, ao: false },
  ultra: { shadows: 'high', torchShadows: true, godRays: true, bloom: true, ao: true },
};
export const GFX_KEYS = ['shadows', 'torchShadows', 'godRays', 'bloom', 'ao'];

// each place's sky: where the sun is (the direction toward it), its colour and strength, the sky's and the
// ground's light, the haze, how thick the shafts are and the exposure
const sky = (o) => ({ ...o, sunDir: new THREE.Vector3(...o.sunDir).normalize() });
const SKIES = {
  // the Proving Ring: low golden evening, the sun behind the ring's tall back pillars, shining toward the camera
  ring: sky({ sunDir: [-0.62, 0.34, -0.71], sunColor: 0xffa45a, sun: 3.6, hemiColor: 0x8a86b0, ground: 0x3a2416, hemi: 0.8, fog: 0x6a4630, fogNear: 22, fogFar: 64, bg: 0x3a2618, rays: 0.028, tone: 1.25 }),
  // Ashfall Ward: a smoky red-gold sunset low behind the Crest, its light streaming down the hill between the houses
  r1a1: sky({ sunDir: [-0.3, 0.36, -0.88], sunColor: 0xff9450, sun: 4.8, hemiColor: 0xa08ea0, ground: 0x4a3020, hemi: 1.5, fog: 0x4e3224, fogNear: 30, fogFar: 95, bg: 0x2e1c14, rays: 0.013, tone: 1.3 }),
  // the Sump Lines: evening, the sun still out but low over the pumps, gold through a faint green haze
  r1a2: sky({ sunDir: [-0.74, 0.27, -0.6], sunColor: 0xffbe6a, sun: 3.8, hemiColor: 0x94aa96, ground: 0x34301e, hemi: 1.3, fog: 0x3e3e26, fogNear: 28, fogFar: 90, bg: 0x22241a, rays: 0.016, tone: 1.3 }),
  // Saint Orsk's Spire: bright day, the sun high and a little warm, a pale blue sky
  r1a3: sky({ sunDir: [-0.42, 0.78, -0.46], sunColor: 0xfff0d6, sun: 4.6, hemiColor: 0xc4d4ec, ground: 0x5a4a36, hemi: 2.3, fog: 0x8c98a6, fogNear: 50, fogFar: 140, bg: 0x404a56, rays: 0.006, tone: 1.15 }),
  // the Sentinel's Bastion: bright day as well, the sun high over the throne
  r1f: sky({ sunDir: [0.36, 0.8, -0.48], sunColor: 0xfff2dc, sun: 4.6, hemiColor: 0xc8d4e8, ground: 0x544636, hemi: 2.3, fog: 0x8a94a0, fogNear: 50, fogFar: 140, bg: 0x3c444e, rays: 0.006, tone: 1.15 }),
};
const SHADOW_SIZE = { low: 1024, high: 2048 };
const BOX = 18; // (half the sun's shadow box, metres: it follows you)
const ACTORS = 2; // (the layer people are on too: the lamps' shadows draw only them, the sun already shadows the rest)

export class Lighting {
  constructor(game) {
    this.game = game;
    this.on = null; this.key = '';
    this.marked = new Set(); this.discs = new Set(); this.soft = new Set();
    this.t = 0;
    this.fps = document.createElement('div'); this.fps.id = 'fps'; this.fps.className = 'hidden'; document.body.append(this.fps);
    this.fpsAcc = 0; this.fpsN = 0;
  }

  // the settings' graphics choices (main.js applySettings)
  configure(s) { this.s = s; this.fps.classList.toggle('hidden', !s.fps); this.key = ''; }

  // where the lighting is on: a hideout, or an outdoor place with its own sky; null anywhere else
  site() {
    const g = this.game;
    if (g.mode === 'title') return g.hermitage?.active && g.hermitage.scene && !g.bazaar?.active ? 'hideout' : null;
    if (g.mode !== 'play' || g.night) return null;
    if (g.training && g.world?.mods?.[0]?.key === 'training') return 'ring';
    return SKIES[g.run?.raid] ? g.run.raid : null;
  }
  // the sky in use (main.js darkLight dims it in a raid's dark places)
  get sky() { return this.on && this.on !== 'hideout' ? SKIES[this.on] : null; }

  // each frame, before drawing: on where it belongs, off anywhere else; the scene kept up to date while on
  update(dt) {
    const g = this.game, s = this.s || {};
    if (s.fps) this.countFps(dt);
    const site = this.site();
    const key = site ? JSON.stringify([site, site === 'hideout' ? g.hermitage.scene.uuid : g.layout && g.runSeed, s.shadows, s.torchShadows, s.godRays, s.bloom, s.ao, s.palette]) : '';
    if (key !== this.key) { if (this.on) this.exit(); if (site) this.enter(site); this.key = key; }
    if (!this.on) return;
    this.t -= dt;
    if (this.t <= 0) { this.t = 0.5; this.mark(); }
    if (this.on !== 'hideout') {
      this.follow();
      if (this.torches === 2) { const L = g.world.lightPool[(this.frame = (this.frame || 0) + 1) % 2]; if (L) L.shadow.needsUpdate = true; }
    }
  }

  enter(site) {
    const g = this.game, s = this.s, r = g.renderer;
    this.on = site;
    this.shadows = s.shadows !== 'off';
    this.marked.clear(); this.discs.clear(); this.soft.clear();
    r.shadowMap.enabled = this.shadows || s.godRays; r.shadowMap.type = THREE.PCFShadowMap;
    if (site === 'hideout') this.enterHideout(); else this.enterOutdoors(SKIES[site]);
    this.mark();
  }

  enterOutdoors(S) {
    const g = this.game, s = this.s, sun = g.sun;
    this.scene = g.scene;
    // the daylight as it was, to put back
    this.saved = {
      sunPos: sun.position.clone(), sunCol: sun.color.getHex(), sunI: sun.intensity, hemiSky: g.hemi.color.getHex(), hemiGround: g.hemi.groundColor.getHex(), hemiI: g.hemi.intensity,
      fog: g.scene.fog.color.getHex(), fogNear: g.scene.fog.near, fogFar: g.scene.fog.far, bg: g.scene.background.getHex(),
    };
    sun.color.set(S.sunColor); sun.intensity = S.sun;
    g.hemi.color.set(S.hemiColor); g.hemi.groundColor.set(S.ground); g.hemi.intensity = S.hemi;
    g.scene.fog.color.set(S.fog); g.scene.fog.near = S.fogNear; g.scene.fog.far = S.fogFar; g.scene.background.set(S.bg);
    if (!sun.target.parent) g.scene.add(sun.target);
    // the sun's shadows (the light shafts need its shadow map even with shadows off)
    const sunMap = this.shadows || s.godRays;
    sun.castShadow = sunMap;
    if (sunMap) {
      const size = SHADOW_SIZE[s.shadows] || 1024;
      sun.shadow.mapSize.set(size, size); sun.shadow.map?.dispose(); sun.shadow.map = null;
      Object.assign(sun.shadow.camera, { left: -BOX, right: BOX, top: BOX, bottom: -BOX, near: 1, far: 90 });
      sun.shadow.camera.updateProjectionMatrix();
      sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03; sun.shadow.radius = s.shadows === 'high' ? 2 : 1;
    }
    // the nearest torch (braziers, bonfires, the pads' glow) casts shadows of people too; on Ultra the nearest two,
    // taking turns to redraw theirs (each is six views of every person near it: the costliest thing here)
    this.torches = this.shadows && s.torchShadows ? (s.gfx === 'ultra' ? 2 : 1) : 0;
    g.world.lightPool.forEach((L, i) => {
      L.castShadow = i < this.torches;
      L.shadow.autoUpdate = this.torches < 2;
      if (L.castShadow) { L.shadow.mapSize.set(256, 256); L.shadow.camera.near = 0.2; L.shadow.camera.layers.set(ACTORS); L.shadow.bias = -0.003; L.shadow.radius = 2; }
    });
    g.pixel.fx = {
      rays: s.godRays ? { light: sun, steps: s.shadows === 'high' ? 32 : 24, strength: S.rays, fall: 0.32 } : null,
      bloom: s.bloom ? 0.9 : 0, ao: !!s.ao, soft: s.palette === 'soft', tone: S.tone,
    };
    this.follow();
  }

  // a hideout: its own lights cast shadows (the hearth's only on High and up: the all-round kind costs the most);
  // the moonbeam is added for the light shafts; nothing is dimmed
  enterHideout() {
    const g = this.game, s = this.s, H = g.hermitage;
    this.scene = H.scene;
    this.hideoutLights = [];
    if (this.shadows) {
      for (const { sl } of H.lamps || []) { sl.castShadow = true; sl.shadow.mapSize.set(512, 512); sl.shadow.bias = -0.002; sl.shadow.radius = 2; sl.shadow.camera.near = 0.2; this.hideoutLights.push(sl); }
      if (s.shadows === 'high' && H.fireLight) { const F = H.fireLight; F.castShadow = true; F.shadow.mapSize.set(512, 512); F.shadow.camera.near = 0.15; F.shadow.bias = -0.003; F.shadow.radius = 3; this.hideoutLights.push(F); }
    }
    if (s.godRays) {
      const m = (this.moon = new THREE.SpotLight(0xa8c4ff, 7, 16, 0.2, 0.6, 1.1));
      m.position.set(-2.4, 7.5, -3.2); m.target.position.set(-0.8, 0, 0.7);
      m.castShadow = true; m.shadow.mapSize.set(512, 512); m.shadow.bias = -0.002; m.shadow.camera.near = 1;
      H.scene.add(m, m.target); this.hideoutLights.push(m);
    }
    g.pixel.fx = {
      rays: this.moon ? { light: this.moon, steps: 28, strength: 0.045, fall: 0 } : null,
      bloom: s.bloom ? 0.8 : 0, ao: !!s.ao, soft: s.palette === 'soft', tone: 1.3,
    };
  }

  exit() {
    const g = this.game;
    if (this.on === 'hideout') {
      for (const L of this.hideoutLights) L.castShadow = false;
      if (this.moon) { this.moon.parent?.remove(this.moon.target, this.moon); this.moon.shadow.map?.dispose(); this.moon.dispose?.(); this.moon = null; }
    } else {
      const sun = g.sun, S = this.saved;
      sun.position.copy(S.sunPos); sun.target.position.set(0, 0, 0); sun.target.updateMatrixWorld();
      sun.color.set(S.sunCol); sun.intensity = S.sunI;
      g.hemi.color.set(S.hemiSky); g.hemi.groundColor.set(S.hemiGround); g.hemi.intensity = S.hemiI;
      g.scene.fog.color.set(S.fog); g.scene.fog.near = S.fogNear; g.scene.fog.far = S.fogFar; g.scene.background.set(S.bg);
      sun.castShadow = false;
      g.world.lightPool.forEach((L) => { L.castShadow = false; L.shadow.autoUpdate = true; });
    }
    this.on = null;
    g.renderer.shadowMap.enabled = false;
    for (const o of this.marked) { o.castShadow = false; o.receiveShadow = false; o.layers.disable(ACTORS); }
    for (const d of this.discs) d.visible = true;
    for (const m of this.soft) { delete m.defines.SOFT_LIGHT; m.needsUpdate = true; }
    this.marked.clear(); this.discs.clear(); this.soft.clear();
    g.pixel.fx = null;
  }

  // everything solid casts and takes shadows (glows, effects and see-through things don't); the fake shadow discs
  // under people go (the real ones are there now); the Soft palette smooths the light on every material
  mark() {
    const g = this.game, soft = this.s.palette === 'soft', casting = this.shadows || this.s.godRays;
    this.scene.traverse((o) => {
      if (!o.isMesh || this.marked.has(o)) return;
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      if (soft) for (const m of ms) if (m?.isMeshLambertMaterial && !this.soft.has(m)) { m.defines = { ...(m.defines || {}), SOFT_LIGHT: '' }; m.needsUpdate = true; this.soft.add(m); }
      if (!casting) return;
      const solid = ms.every((m) => m && !m.isMeshBasicMaterial && !m.isShaderMaterial && !m.isPointsMaterial && m.blending === THREE.NormalBlending && (!m.transparent || m.opacity > 0.9));
      if (!solid) return;
      o.castShadow = true; o.receiveShadow = this.shadows;
      this.marked.add(o);
    });
    if (!this.shadows) return;
    const people = this.on === 'hideout' ? [g.hermitage.rig] : [...(g.allPlayers?.() || [g.player]), ...(g.enemiesAll?.() || [])].map((a) => a?.rig);
    for (const rig of people) {
      const d = rig?.shadow; if (d && !this.discs.has(d)) { d.visible = false; this.discs.add(d); }
      if (this.torches) rig?.root?.traverse((o) => { if (o.isMesh && o.castShadow) o.layers.enable(ACTORS); });
    }
  }

  // the sun's shadow box follows you (snapped to its texels so the edges don't crawl as you move)
  follow() {
    const g = this.game, sun = g.sun, p = g.player?.pos;
    if (!p) return;
    const step = (BOX * 2) / (sun.shadow.mapSize.x || 1024);
    const tx = Math.round(p.x / step) * step, tz = Math.round(p.z / step) * step;
    sun.target.position.set(tx, 0, tz); sun.target.updateMatrixWorld();
    sun.position.copy(SKIES[this.on].sunDir).multiplyScalar(40).add(sun.target.position);
  }

  countFps(dt) {
    this.fpsAcc += dt; this.fpsN++;
    if (this.fpsAcc >= 0.5) { this.fps.textContent = `${Math.round(this.fpsN / this.fpsAcc)} FPS`; this.fpsAcc = 0; this.fpsN = 0; }
  }
}
