import { decorate, updateAmbient } from './decor.js';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MODULES, MINI_ARENAS, BOSS_ARENA } from './modules.js';

// The level is either a chain of modules laid out along -Z (the approach to Varek, and the old layouts the tests
// use) or a dungeon (dungeon.js: chambers on a grid, built in world coordinates). Each module / chamber adds
// walkable shapes (rects/circles, optionally gated), solid blockers, slow zones, obstacles, props, enemy spawns and
// encounters. Module-local distance `d` maps to z = z0 - d (a dungeon uses world z directly).

export { GROUND };
export function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// The Last Crusade: grimy ferrocrete, deck plating, slag, basalt vaults, coolant sludge. `grid`: a deck-plate seam
// every that many metres (darker), `seam` how dark
const GROUND = {
  dirt: { walk: [0x5e554a, 0x4c443a], out: [0x2a2724, 0x45403a], grid: 3, seam: 0.8 },
  stone: { walk: [0x5c5d5e, 0x4c4d50], out: [0x2c2d2e, 0x44454a], grid: 2, seam: 0.72 },
  ash: { walk: [0x4a403a, 0x3a322e], out: [0x221c1a, 0x3a2a24] },
  crypt: { walk: [0x4a4a52, 0x3c3c44], out: [0x1e1e24, 0x2a2a32], wall: true, grid: 2, seam: 0.75 },
  bog: { walk: [0x3e4a40, 0x323c34], out: [0x1c2620, 0x2a3a30] },
  chasm: { walk: [0x58585a, 0x48484c], out: [0x0a0a0c, 0x121214], void: true, grid: 2, seam: 0.7 },
  arena: { walk: [0x5a5a5e, 0x48484e], out: [0x262628, 0x3e3e44], grid: 2.5, seam: 0.7 },
  // a raid's ruined city (city.js): cracked ferrocrete streets (interiors and pavements are tinted by the city)
  city: { walk: [0x4c4a46, 0x3e3c39], out: [0x24221f, 0x36332f], grid: 4, seam: 0.86, sub: 2 },
  // cellars, sewers and bunkers under it: wet walls stepping up round the rooms
  under: { walk: [0x3c403c, 0x303430], out: [0x121412, 0x20241f], wall: true, grid: 2, seam: 0.74 },
};
// a visual-only random 0..1 from a position (never the world's rand: that stream lays out the levels)
const vh = (x, z, k = 0) => { const v = Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453; return v - Math.floor(v); };

export class World {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    scene.add(this.root);
    this.mats = {
      // (names kept from the old world; the looks are The Last Crusade's: iron for wood, ferrocrete for stone)
      log: new THREE.MeshLambertMaterial({ color: 0x3a3632, flatShading: true }), // iron poles and beams
      logDark: new THREE.MeshLambertMaterial({ color: 0x24221f, flatShading: true }), // blackened girders
      rock: new THREE.MeshLambertMaterial({ color: 0x55524c, flatShading: true }), // ferrocrete rubble
      rockDark: new THREE.MeshLambertMaterial({ color: 0x34322e, flatShading: true }),
      cloth: new THREE.MeshLambertMaterial({ color: 0x3e382c, flatShading: true, side: THREE.DoubleSide }), // oiled canvas
      clothRed: new THREE.MeshLambertMaterial({ color: 0x6a1412, flatShading: true, side: THREE.DoubleSide }), // crusade red
      stone: new THREE.MeshLambertMaterial({ color: 0x5e5c58, flatShading: true }), // ferrocrete
      stoneDark: new THREE.MeshLambertMaterial({ color: 0x3a3a40, flatShading: true }), // basalt and plate
      ash: new THREE.MeshLambertMaterial({ color: 0x262220, flatShading: true }),
      char: new THREE.MeshLambertMaterial({ color: 0x2a2826, flatShading: true }), // bunker walls
      metal: new THREE.MeshLambertMaterial({ color: 0x74767c, flatShading: true }), // gunmetal
      wood: new THREE.MeshLambertMaterial({ color: 0x3e4232, flatShading: true }), // munitions-drab
      plank: new THREE.MeshLambertMaterial({ color: 0x3c3a36, flatShading: true }), // gantry grating
      leaf: new THREE.MeshLambertMaterial({ color: 0x2a2a30, flatShading: true }), // spire plate
      reed: new THREE.MeshLambertMaterial({ color: 0x5a3622, flatShading: true }), // rusted rebar
      bone: new THREE.MeshLambertMaterial({ color: 0xbab09a, flatShading: true }),
      ground: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
      water: new THREE.MeshLambertMaterial({ color: 0x1a3a34, transparent: true, opacity: 0.85 }), // coolant
      // new: brass trim, hazard paint, rust, and the glows (emissive, so they merge with the rest: lamp lenses, beacons, windows)
      brass: new THREE.MeshLambertMaterial({ color: 0x6a5634, flatShading: true }),
      hazard: new THREE.MeshLambertMaterial({ color: 0x9a7a1e, flatShading: true }),
      rust: new THREE.MeshLambertMaterial({ color: 0x5e3a24, flatShading: true }),
      glowAmber: new THREE.MeshLambertMaterial({ color: 0x000000, emissive: 0xffb04a, flatShading: true }),
      glowRed: new THREE.MeshLambertMaterial({ color: 0x000000, emissive: 0xff3a24, flatShading: true }),
      glowBlue: new THREE.MeshLambertMaterial({ color: 0x000000, emissive: 0x8ad8ff, flatShading: true }),
      glowWindow: new THREE.MeshLambertMaterial({ color: 0x000000, emissive: 0xd8822a, flatShading: true }),
    };
    this.fogMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { uT: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
      fragmentShader: `uniform float uT; varying vec2 vUv;
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
        float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
          return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
        void main(){
          vec2 p = vUv*vec2(6.,4.);
          float v = n(p + vec2(uT*0.3, -uT*0.5)) * .6 + n(p*2.1 - vec2(uT*0.2, uT*0.9)) * .4;
          float edge = smoothstep(0., .15, vUv.x) * smoothstep(1., .85, vUv.x) * smoothstep(1., .6, vUv.y);
          // an energy barrier: a crimson field with a scrolling lattice and scanlines
          vec2 q = vUv * vec2(14., 10.); q.x += mod(floor(q.y), 2.) * .5;
          float cell = max(abs(fract(q.x) - .5), abs(fract(q.y) - .5));
          float lat = smoothstep(.42, .5, cell);
          float scan = .5 + .5 * sin(vUv.y * 60. - uT * 6.);
          vec3 col = mix(vec3(.95,.22,.12), vec3(1.,.75,.45), lat * .8 + scan * .15);
          gl_FragColor = vec4(col * (0.75 + v * 0.4), (0.18 + v * 0.3 + lat * .35) * edge);
        }`,
    });
    // fixed pool of point lights, reassigned to the nearest sources each frame
    // (a constant light count avoids shader recompiles on mobile)
    this.lightPool = [];
    for (let i = 0; i < 4; i++) {
      const l = new THREE.PointLight(0xff8a3a, 0, 12, 1.5);
      scene.add(l); this.lightPool.push(l);
    }
  }

  // ---------- build ----------
  build(layout, seed = 1) {
    this.clear();
    this.rand = rng(seed);
    this.layout = layout;
    if (layout.dungeon) { layout.dungeon.build(this); return; } // a dungeon builds itself (dungeon.js)
    let z0 = 0;
    layout.forEach((key, i) => {
      const def = key.startsWith('mini:') ? MINI_ARENAS[key.slice(5)] : key === 'boss' ? BOSS_ARENA : MODULES[key];
      const group = new THREE.Group();
      this.root.add(group);
      const mod = { i, key, name: def.name, z0, z1: z0 - def.len, len: def.len, cx: 0, cz: z0 - def.len / 2, group, ground: def.ground };
      this.mods.push(mod);
      this.cur = mod;
      this.Z = (d) => z0 - d;
      def.build(this, this.Z, mod);
      decorate(this, key, mod); // set dressing and ambient life (never in the walkable area)
      z0 -= def.len;
    });
    // terrain + borders need every module's walkable space, so they go second
    for (const m of this.mods) {
      this.cur = m;
      this.buildGround(m);
      this.scatterBorders(m);
      this.mergeStatic(m.group);
    }
    this.cur = null;
  }

  clear() {
    for (const m of [...(this.mods || []), ...(this.tiles || [])]) {
      m.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      this.root.remove(m.group);
    }
    this.mods = [];
    this.shapes = [];
    this.solids = [];
    this.slows = [];
    this.obstacles = [];
    this.spawns = [];
    this.encounters = [];
    this.gates = {};
    this.bonfires = [];
    this.lights = [];
    this.fires = [];
    this.ambient = [];
    this.tiles = [];
    this.dungeon = null; this.cutaway = false; this.seals = []; this.chests = []; this.drums = [];
    this.hash = null; this.hashN = -1; this.shash = null; this.shashN = -1;
    this.start = { x: 0, z: -3 };
  }

  // ---------- shape lookup ----------
  // shapes bucketed on an 8 m grid (each in every bucket within 9 m of it), so a big dungeon tests only the few
  // shapes near a point
  bucket(x, z) {
    if (this.hashN !== this.shapes.length) {
      this.hash = new Map(); this.hashN = this.shapes.length;
      for (const s of this.shapes) {
        const b = s.t === 'r' ? [s.x0, s.x1, s.z0, s.z1] : [s.x - s.r, s.x + s.r, s.z - s.r, s.z + s.r];
        for (let i = Math.floor((b[0] - 9) / 8); i <= Math.floor((b[1] + 9) / 8); i++) {
          for (let j = Math.floor((b[2] - 9) / 8); j <= Math.floor((b[3] + 9) / 8); j++) {
            const k = i * 100003 + j;
            let l = this.hash.get(k); if (!l) this.hash.set(k, (l = []));
            l.push(s);
          }
        }
      }
    }
    return this.hash.get(Math.floor(x / 8) * 100003 + Math.floor(z / 8)) || [];
  }

  // solids bucketed the same way (a city has a thousand wall pieces); each sits in every bucket within 3 m of it
  solidBucket(x, z) {
    if (this.shashN !== this.solids.length) {
      this.shash = new Map(); this.shashN = this.solids.length;
      for (const s of this.solids) {
        for (let i = Math.floor((s.x0 - 3) / 8); i <= Math.floor((s.x1 + 3) / 8); i++) {
          for (let j = Math.floor((s.z0 - 3) / 8); j <= Math.floor((s.z1 + 3) / 8); j++) {
            const k = i * 100003 + j;
            let l = this.shash.get(k); if (!l) this.shash.set(k, (l = []));
            l.push(s);
          }
        }
      }
    }
    return this.shash.get(Math.floor(x / 8) * 100003 + Math.floor(z / 8)) || [];
  }
  // no solid between two points (walls stop sight, shots and swings)
  lineClear(ax, az, bx, bz) {
    const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.3);
    for (let i = 1; i < n; i++) if (this.blocked(ax + (bx - ax) * i / n, az + (bz - az) * i / n, 0)) return false;
    return true;
  }
  // inside a solid (a wall, a rubble heap)
  blocked(x, z, r = 0) {
    for (const s of this.solidBucket(x, z)) if (x > s.x0 - r && x < s.x1 + r && z > s.z0 - r && z < s.z1 + r) return true;
    return false;
  }

  // ---------- collision primitives (module-aware) ----------
  rect(x0, x1, d0, d1, o = {}) {
    const za = this.Z(d0), zb = this.Z(d1);
    this.shapes.push({ t: 'r', x0, x1, z0: Math.min(za, zb), z1: Math.max(za, zb), mod: this.cur.i, gate: o.gate });
  }
  circle(x, d, r, o = {}) { this.shapes.push({ t: 'c', x, z: this.Z(d), r, mod: this.cur.i, gate: o.gate }); }
  solid(x0, x1, d0, d1) {
    const za = this.Z(d0), zb = this.Z(d1);
    this.solids.push({ x0, x1, z0: Math.min(za, zb), z1: Math.max(za, zb) });
  }
  slow(x, d, r, f) { this.slows.push({ x, z: this.Z(d), r, f }); }
  ob(x, z, r) { this.obstacles.push({ x, z, r }); }
  spawn(type, x, d, yaw = 0, o = {}) { this.spawns.push({ type, x, z: this.Z(d), yaw, o, mod: this.cur.i }); }
  gate(id, d, width = 6, open = true) {
    const z = this.Z(d);
    const fog = new THREE.Mesh(new THREE.PlaneGeometry(width + 0.4, 4.5), this.fogMat);
    fog.position.set(0, 2.25, z); fog.userData.noMerge = true;
    this.cur.group.add(fog);
    for (const s of [-1, 1]) this.box(1.2, 5.5, 1.4, this.mats.stone, s * (width / 2 + 0.7), 2.75, z);
    this.box(width + 2.6, 1, 1.4, this.mats.stone, 0, 5.6, z);
    this.gates[id] = { id, x: 0, z, open, fog };
    return this.gates[id];
  }
  // a gate anywhere (world coords) across a corridor that runs along x (alongX) or along z
  // (one across an east-west corridor is seen side on: its south post stays low and there is no lintel, so it never
  // stands between you and the camera)
  gateAt(id, x, z, alongX, width = 6, open = true) {
    const fh = alongX ? 3.2 : 4.5;
    const fog = new THREE.Mesh(new THREE.PlaneGeometry(width + 0.4, fh), this.fogMat);
    fog.position.set(x, fh / 2, z); fog.userData.noMerge = true;
    if (alongX) fog.rotation.y = Math.PI / 2;
    this.cur.group.add(fog);
    for (const s of [-1, 1]) {
      const o = s * (width / 2 + 0.7), h = alongX && s > 0 ? 1.1 : 5.5;
      this.box(alongX ? 1.4 : 1.2, h, alongX ? 1.2 : 1.4, this.mats.stone, x + (alongX ? 0 : o), h / 2, z + (alongX ? o : 0));
    }
    if (!alongX) this.box(width + 2.6, 1, 1.4, this.mats.stone, x, 5.6, z);
    this.gates[id] = { id, x, z, alongX, open, fog };
    return this.gates[id];
  }
  setGate(id, open, fogVisible = !open) {
    const g = this.gates[id]; if (!g) return;
    g.open = open; g.fog.visible = fogVisible;
  }

  walkable(x, z, r = 0, mod = null, ignoreGates = false) {
    if (this.blocked(x, z, r)) return false;
    for (const s of this.bucket(x, z)) {
      if (mod !== null && (typeof mod === 'number' ? s.mod !== mod : !mod.has(s.mod))) continue; // a module, or a set of them
      if (s.gate && !ignoreGates && !this.gates[s.gate].open) continue;
      if (s.t === 'r') { if (x >= s.x0 + r && x <= s.x1 - r && z >= s.z0 + r && z <= s.z1 - r) return true; }
      else if (Math.hypot(x - s.x, z - s.z) <= s.r - r) return true;
    }
    return false;
  }

  // footprint test used for terrain/borders (ignores gates and solids)
  area(x, z, m = 0) {
    for (const s of this.bucket(x, z)) {
      if (s.t === 'r') { if (x >= s.x0 + m && x <= s.x1 - m && z >= s.z0 + m && z <= s.z1 - m) return true; }
      else if (Math.hypot(x - s.x, z - s.z) <= s.r - m) return true;
    }
    return false;
  }

  // the terrain height at a point, as buildGround raises it (walls step up away from the walkable area)
  groundY(x, z) { return this.heightAt(x, z, GROUND[this.styleAt(x, z)] || GROUND.dirt); }

  styleAt(x, z) { return this.dungeon ? this.dungeon.styleAt(x, z) : this.moduleAt(x, z)?.ground; }

  // terrain steps up away from the walkable area. In a dungeon (cutaway) anything just south of a walkable space
  // (between it and the camera) stays one step high, so walls never hide you
  heightAt(x, z, st) {
    if (this.area(x, z, -0.6)) return 0;
    if (st.void) return this.area(x, z, -1.6) ? -1.5 : -9;
    let h = 0;
    for (const mm of [-1.5, -3, -5, -8]) if (!this.area(x, z, mm)) h += 1;
    if (this.cutaway && h > 1 && this.southOf(x, z)) h = 1;
    return h * (st.wall ? 1.1 : 0.55);
  }
  southOf(x, z, k = 8) { for (let d = 1.5; d <= k; d += 1.5) if (this.area(x, z - d, 0)) return true; return false; }

  slowAt(x, z) {
    let f = 1;
    for (const s of this.slows) if (Math.hypot(x - s.x, z - s.z) < s.r) f = Math.min(f, s.f);
    return f;
  }

  // Move from `from` toward `to` (Vector3s, y ignored), sliding along walls. Mutates `to`.
  resolve(from, to, r, mod = null) {
    if (!this.walkable(to.x, to.z, r, mod)) {
      if (this.walkable(to.x, from.z, r, mod)) to.z = from.z;
      else if (this.walkable(from.x, to.z, r, mod)) to.x = from.x;
      else { to.x = from.x; to.z = from.z; }
    }
    for (const o of this.obstacles) {
      const dx = to.x - o.x, dz = to.z - o.z;
      if (Math.abs(dx) > 4 || Math.abs(dz) > 4) continue;
      const d = Math.hypot(dx, dz), m = o.r + r;
      if (d < m && d > 1e-5) {
        const nx = to.x + dx / d * (m - d), nz = to.z + dz / d * (m - d);
        if (this.walkable(nx, nz, r, mod)) { to.x = nx; to.z = nz; }
        else { to.x = from.x; to.z = from.z; }
      }
    }
    return to;
  }

  // moduleAt(x, z), or moduleAt(z) along a chain of modules
  moduleAt(x, z) {
    if (z === undefined) { z = x; x = 0; }
    if (this.dungeon) return this.dungeon.modAt(x, z);
    for (const m of this.mods) if (z <= m.z0 && z > m.z1) return m;
    return z > 0 ? this.mods[0] : this.mods[this.mods.length - 1];
  }

  // ---------- terrain ----------
  buildGround(m) { m.group.add(this.groundMesh(0, m.z0 - m.len / 2, 76, m.len, m.ground)); }

  // a patch of terrain centred on (cx, cz), w × l metres
  groundMesh(cx, cz, W, L, ground) {
    const st = GROUND[ground] || GROUND.dirt;
    const sub = st.sub ?? (st.grid ? 3 : 1); // (plated floors get a finer mesh so the seams read as lines)
    const g = new THREE.PlaneGeometry(W, L, W * sub, Math.round(L) * sub);
    g.rotateX(-Math.PI / 2);
    g.translate(cx, 0, cz);
    const pos = g.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const w0 = new THREE.Color(st.walk[0]), w1 = new THREE.Color(st.walk[1]), o0 = new THREE.Color(st.out[0]), o1 = new THREE.Color(st.out[1]), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const n = Math.sin(x * 0.7) * Math.cos(z * 0.6) * 0.5 + Math.sin(x * 2.3 + z * 1.7) * 0.25 + (this.rand() - 0.5) * 0.4;
      if (this.area(x, z, -0.6)) {
        c.copy(w0).lerp(w1, 0.5 + n * (st.grid ? 0.25 : 0.5));
        this.dungeon?.groundTint?.(x, z, c, n); // (a city: pavements, interiors, rubble)
        // deck plating: darker seams on a grid, the odd plate a shade off
        if (st.grid) {
          const gx = Math.abs(((x / st.grid) % 1 + 1) % 1 - 0.5) > 0.5 - 0.18 / st.grid, gz = Math.abs(((z / st.grid) % 1 + 1) % 1 - 0.5) > 0.5 - 0.18 / st.grid;
          if (gx || gz) c.multiplyScalar(st.seam);
          else c.multiplyScalar(0.95 + vh(Math.floor(x / st.grid), Math.floor(z / st.grid), 1) * 0.1);
        }
      }
      else if (st.void) {
        const edge = this.area(x, z, -1.6);
        pos.setY(i, edge ? -1.5 : -9);
        c.copy(edge ? o1 : o0);
      } else {
        const h = this.heightAt(x, z, st) / (st.wall ? 1.1 : 0.55);
        pos.setY(i, h * (st.wall ? 1.1 : 0.55) + n * 0.1 * h);
        c.copy(o0).lerp(o1, Math.max(0, 0.6 - h * 0.15) + n * 0.15);
      }
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, this.mats.ground);
    mesh.userData.noMerge = true;
    return mesh;
  }

  scatterBorders(m) { this.scatter(m.ground, -32, 32, m.z1, m.z0); }

  // rocks, trees and crypt blocks on the raised ground around the walkable area, in the box x0..x1, z0..z1
  scatter(style, X0, X1, Z0, Z1) {
    if (style === 'chasm') {
      // jagged cliff teeth along ledge edges only
      for (let x = Math.max(X0, -20 + (X0 + X1) / 2); x <= Math.min(X1, 20 + (X0 + X1) / 2); x += 1.5) for (let z = Z1; z > Z0; z -= 1.5) {
        if (this.area(x, z, -0.3) || !this.area(x, z, -1.8)) continue;
        if (this.rand() < 0.5) this.rock(x, z, 0.3 + this.rand() * 0.4, true);
      }
      return;
    }
    for (let x = X0; x <= X1; x += 1.6) {
      for (let z = Z1 - 0.8; z > Z0; z -= 1.6) {
        const jx = x + (this.rand() - 0.5) * 1.2, jz = z + (this.rand() - 0.5) * 1.2;
        if (this.area(jx, jz, -0.5)) continue;
        if (Object.values(this.gates).some((g) => Math.abs(jz - g.z) < 5 && Math.abs(jx - g.x) < 7)) continue;
        const near = this.area(jx, jz, -2.2), mid = this.area(jx, jz, -6);
        const southOfPath = this.cutaway ? this.southOf(jx, jz, 10) : this.area(jx, jz - 4, -0.5) && !this.area(jx, jz + 4, -0.5);
        const p = this.rand();
        if (style === 'crypt') {
          if (near && p < 0.5) this.box(1.6, southOfPath ? 0.8 : 3.5 + this.rand() * 1.5, 1.6, this.mats.stoneDark, jx, null, jz);
          continue;
        }
        if (near && p < 0.4) this.rock(jx, jz, 0.35 + this.rand() * (southOfPath ? 0.25 : 0.55), this.rand() < 0.5);
        else if (mid && !near && p < 0.22 && !southOfPath) {
          if (style === 'bog' || style === 'ash' || this.rand() < 0.5) this.deadTree(jx, jz, 3 + this.rand() * 2);
          else this.pine(jx, jz, 4 + this.rand() * 3);
        } else if (!mid && p < 0.06 && style !== 'ash') this.pine(jx, jz, 5 + this.rand() * 4);
      }
    }
  }

  // merge every static Lambert mesh in a module into one mesh per material
  mergeStatic(group) {
    group.updateMatrixWorld(true);
    const buckets = new Map(), kill = [];
    group.traverse((o) => {
      if (!o.isMesh || o.userData.noMerge || !(o.material instanceof THREE.MeshLambertMaterial)) return;
      let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
      g.applyMatrix4(o.matrixWorld);
      if (!buckets.has(o.material)) buckets.set(o.material, []);
      buckets.get(o.material).push(g);
      kill.push(o);
    });
    for (const o of kill) { o.parent.remove(o); o.geometry.dispose(); }
    for (const [mat, list] of buckets) {
      const merged = mergeGeometries(list, false);
      list.forEach((g) => g.dispose());
      if (merged) group.add(new THREE.Mesh(merged, mat));
    }
  }

  // ---------- props (world coords) ----------
  add(o) { this.cur.group.add(o); return o; }
  box(w, h, d, mat, x, y, z, ry = 0) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y ?? h / 2, z); m.rotation.y = ry;
    return this.add(m);
  }
  cyl(rt, rb, h, mat, x, y, z, seg = 7) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
    m.position.set(x, y ?? h / 2, z);
    return this.add(m);
  }
  // ---------- props in The Last Crusade's look. Each keeps its old calls to this.rand() in the same order and
  // its collision (ob / solids / slows) exactly: the rand stream lays out the levels. Extra detail uses vh() ----------
  // a mesh at a local offset inside a group
  part(g, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m; }
  rock(x, z, s, dark, block = false) {
    // a broken ferrocrete slab, now and then with rebar curling out of it
    const g = new THREE.Group();
    const slab = this.part(g, new THREE.BoxGeometry(s * 1.5, s * 0.9, s * 1.2), dark ? this.mats.rockDark : this.mats.rock, 0, 0, 0);
    if (vh(x, z, 2) < 0.5) this.part(g, new THREE.BoxGeometry(s * 0.9, s * 0.5, s * 0.8), dark ? this.mats.rock : this.mats.rockDark, s * 0.35, s * 0.45, -s * 0.1, 0, 0.5);
    if (vh(x, z, 3) < 0.45) for (let i = 0; i < 2; i++) this.part(g, new THREE.CylinderGeometry(0.025, 0.025, s * 1.4, 3), this.mats.reed, (i - 0.5) * s * 0.5, s * 0.7, 0, 0.3 + i * 0.4, 0, 0.5 - i);
    g.position.set(x, s * 0.35, z);
    g.rotation.set(this.rand() * 3 * 0.12, this.rand() * 3, this.rand() * 3 * 0.12); // (three rand calls, as before)
    g.scale.y = 0.6 + this.rand() * 0.6;
    if (block) this.ob(x, z, s * 0.85);
    void slab;
    return this.add(g);
  }
  deadTree(x, z, h) {
    // a ruined girder pylon: a blackened I-beam with struts, the odd dangling chain and a dead warning lamp
    const g = new THREE.Group();
    this.part(g, new THREE.BoxGeometry(0.24, h, 0.08), this.mats.logDark, 0, h / 2, 0);
    for (const sx of [-1, 1]) this.part(g, new THREE.BoxGeometry(0.06, h, 0.26), this.mats.logDark, sx * 0.12, h / 2, 0);
    for (let i = 0; i < 3; i++) {
      const b = this.part(g, new THREE.BoxGeometry(0.07, h * 0.45, 0.07), this.mats.logDark, 0, 0, 0);
      b.position.y = h * (0.55 + i * 0.13); b.rotation.z = (i % 2 ? 1 : -1) * (0.7 + this.rand() * 0.4);
      b.rotation.y = this.rand() * 6; b.position.x = Math.sin(b.rotation.z) * -h * 0.2;
    }
    if (vh(x, z, 4) < 0.5) for (let i = 0; i < 4; i++) this.part(g, new THREE.BoxGeometry(0.05, 0.16, 0.05), this.mats.metal, 0.3, h * 0.78 - i * 0.18, 0, 0, 0, (i % 2) * 0.6);
    if (vh(x, z, 5) < 0.35) this.part(g, new THREE.BoxGeometry(0.14, 0.12, 0.14), this.mats.glowRed, 0, h + 0.06, 0);
    g.position.set(x, 0, z); g.rotation.y = this.rand() * 6;
    return this.add(g);
  }
  pine(x, z, h) {
    // a gothic spire-pylon: a tiered plate tower with buttress fins, a finial and a red aircraft-warning lamp
    const g = new THREE.Group();
    this.part(g, new THREE.CylinderGeometry(0.1, 0.22, h * 0.3, 4), this.mats.logDark, 0, h * 0.15, 0, 0, Math.PI / 4);
    for (let i = 0; i < 3; i++) {
      const c = this.part(g, new THREE.ConeGeometry(h * (0.3 - i * 0.07), h * 0.42, 4), this.mats.leaf, 0, h * (0.38 + i * 0.2), 0, 0, Math.PI / 4);
      if (i < 2) this.part(g, new THREE.BoxGeometry(h * (0.5 - i * 0.12), 0.06, 0.06), this.mats.brass, 0, h * (0.3 + i * 0.2), 0, 0, Math.PI / 4 + i);
      void c;
    }
    this.part(g, new THREE.CylinderGeometry(0.02, 0.04, h * 0.25, 3), this.mats.metal, 0, h * 0.98, 0);
    this.part(g, new THREE.BoxGeometry(0.12, 0.1, 0.12), vh(x, z, 6) < 0.6 ? this.mats.glowRed : this.mats.glowAmber, 0, h * 1.1, 0);
    g.position.set(x, 0, z);
    return this.add(g);
  }
  pillar(x, z, h, broken = false) {
    // a ferrocrete column with iron bands; a broken one ends in torn rebar
    this.cyl(0.42, 0.5, h, this.mats.stone, x, h / 2, z);
    for (const t of [0.12, 0.55]) if (t * h < h - 0.2) this.cyl(0.52, 0.52, 0.16, this.mats.logDark, x, h * t, z, 7);
    if (!broken) {
      this.box(1.1, 0.25, 1.1, this.mats.stone, x, h + 0.12, z);
      this.box(0.7, 0.22, 0.7, this.mats.logDark, x, h + 0.35, z, Math.PI / 4);
      this.box(0.12, 0.1, 0.12, this.mats.glowRed, x, h + 0.5, z);
    } else for (let i = 0; i < 3; i++) { const r = this.cyl(0.025, 0.025, 0.7, this.mats.reed, x + (i - 1) * 0.18, h + 0.3, z, 3); r.rotation.z = (i - 1) * 0.5; }
    this.ob(x, z, 0.5);
  }
  fallenColumn(x, z, len, ry) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, len, 7), this.mats.stone);
    m.rotation.z = Math.PI / 2; m.rotation.y = ry; m.position.set(x, 0.4, z);
    this.add(m);
    for (const t of [-0.3, 0.1, 0.4]) {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.14, 7), this.mats.logDark);
      band.rotation.z = Math.PI / 2; band.rotation.y = ry; band.position.set(x + Math.cos(ry) * len * t, 0.4, z - Math.sin(ry) * len * t);
      this.add(band);
    }
    const n = Math.ceil(len / 0.8);
    for (let i = 0; i <= n; i++) {
      const t = i / n - 0.5;
      this.ob(x + Math.cos(ry) * len * t, z - Math.sin(ry) * len * t, 0.45);
    }
  }
  tent(x, z, rot, s = 1) {
    // a field shelter: oiled canvas over an iron frame, with a vox antenna
    const g = new THREE.Group();
    const c = new THREE.Mesh(new THREE.ConeGeometry(1.8 * s, 2.4 * s, 4, 1, true), this.rand() < 0.3 ? this.mats.clothRed : this.mats.cloth);
    c.position.y = 1.2 * s; c.rotation.y = Math.PI / 4; g.add(c);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.9 * s, 4), this.mats.log); pole.position.y = 1.45 * s; g.add(pole);
    this.part(g, new THREE.CylinderGeometry(0.015, 0.015, 1.4 * s, 3), this.mats.metal, 0.1, 3.2 * s, 0);
    this.part(g, new THREE.BoxGeometry(0.06, 0.06, 0.06), this.mats.glowRed, 0.1, 3.9 * s, 0);
    g.position.set(x, 0, z); g.rotation.y = rot;
    this.add(g); this.ob(x, z, 1.45 * s);
  }
  crate(x, z, s = 0.8) {
    // a munitions crate: drab plate, steel corners and a hazard stripe
    const g = new THREE.Group();
    this.part(g, new THREE.BoxGeometry(s, s, s), this.mats.wood, 0, 0, 0);
    this.part(g, new THREE.BoxGeometry(s * 1.02, s * 0.12, s * 1.02), this.mats.logDark, 0, s * 0.3, 0);
    this.part(g, new THREE.BoxGeometry(s * 1.02, s * 0.12, s * 1.02), this.mats.logDark, 0, -s * 0.3, 0);
    this.part(g, new THREE.BoxGeometry(s * 0.5, s * 0.08, s * 1.03), this.mats.hazard, 0, 0, 0);
    g.position.set(x, s / 2, z); g.rotation.y = this.rand() * 1.5;
    this.add(g); this.ob(x, z, s * 0.62);
  }
  barrel(x, z) {
    // a promethium drum with ribs and a hazard band
    this.cyl(0.35, 0.35, 0.9, this.mats.rust, x, 0.45, z, 8);
    for (const y of [0.18, 0.72]) this.cyl(0.37, 0.37, 0.06, this.mats.logDark, x, y, z, 8);
    this.cyl(0.36, 0.36, 0.14, this.mats.hazard, x, 0.45, z, 8);
    this.cyl(0.08, 0.08, 0.06, this.mats.metal, x + 0.15, 0.92, z, 6);
    this.ob(x, z, 0.4);
  }
  banner(x, z, red = true) {
    // a crusade standard: iron pole with a crossbar and finial, the cloth marked with a pale cross-and-cog
    this.cyl(0.05, 0.06, 4, this.mats.log, x, 2, z, 5);
    this.box(1.0, 0.06, 0.06, this.mats.brass, x + 0.42, 3.92, z);
    this.box(0.12, 0.3, 0.12, this.mats.brass, x, 4.1, z, Math.PI / 4);
    const cl = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.6), red ? this.mats.clothRed : this.mats.cloth);
    cl.position.set(x + 0.42, 3.1, z); this.add(cl);
    for (const [w, hh] of [[0.12, 0.7], [0.5, 0.12]]) { const e = new THREE.Mesh(new THREE.PlaneGeometry(w, hh), this.mats.bone); e.position.set(x + 0.42, 3.25, z + 0.01); this.add(e); }
    this.ob(x, z, 0.2);
  }
  palisade(x0, z0, x1, z1, h = 2.6) {
    // a steel barricade: I-beam posts with spiked caps and plate between them
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(len / 0.42), ang = Math.atan2(x1 - x0, z1 - z0);
    for (let i = 0; i <= n; i++) {
      const t = i / n, hh = h * (0.85 + this.rand() * 0.3);
      const px = x0 + (x1 - x0) * t, pz = z0 + (z1 - z0) * t;
      if (i % 3 === 0) {
        this.box(0.24, hh, 0.24, this.mats.logDark, px, hh / 2, pz, ang);
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.45, 4), this.mats.metal);
        tip.position.set(px, hh + 0.22, pz); this.add(tip);
      } else this.box(0.44, hh * 0.82, 0.1, (i % 2 ? this.mats.log : this.mats.rust), px, hh * 0.41, pz, ang + Math.PI / 2);
    }
  }
  rack(x, z) {
    for (const s of [-0.6, 0.6]) this.box(0.1, 1.2, 0.1, this.mats.log, x + s, 0.6, z);
    this.box(1.4, 0.08, 0.08, this.mats.brass, x, 1.1, z);
    for (let i = 0; i < 4; i++) {
      const sp = this.box(0.04, 1.6, 0.04, this.mats.metal, x - 0.45 + i * 0.3, 0.9, z + 0.08); sp.rotation.x = -0.15;
      this.box(0.1, 0.12, 0.06, this.mats.glowRed, x - 0.45 + i * 0.3, 1.7, z + 0.2); // (charge lamps on the pike heads)
    }
    this.ob(x, z, 0.6);
  }
  // decorative fire (a promethium brazier: iron bowl on a tripod with a grille). `cond` gates whether it burns.
  brazier(x, z, o = {}) {
    this.cyl(0.5, 0.36, 0.4, this.mats.logDark, x, 1.0, z, 8);
    this.cyl(0.52, 0.52, 0.06, this.mats.brass, x, 1.2, z, 8);
    for (let i = 0; i < 3; i++) { const l = this.box(0.08, 1.0, 0.08, this.mats.log, x + Math.cos(i * 2.1) * 0.25, 0.5, z + Math.sin(i * 2.1) * 0.25); l.rotation.set(Math.sin(i * 2.1) * 0.25, 0, -Math.cos(i * 2.1) * 0.25); }
    this.ob(x, z, 0.55);
    const f = { x, z, y: 1.25, scale: o.scale ?? 0.8, cond: o.cond, color: o.color ?? 0xff8a3a, cold: o.cold };
    this.fires.push(f);
    if (o.light !== false) this.lights.push({ x, y: 2, z, color: f.color, power: o.power ?? 12, range: 11, src: f });
    return f;
  }
  firePit(x, z) {
    // a field heater: a ring of armour plate round a burning fuel-cell stack
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.12), i % 2 ? this.mats.logDark : this.mats.rust);
      s.position.set(x + Math.cos(a) * 0.6, 0.11, z + Math.sin(a) * 0.6); s.rotation.y = -a + Math.PI / 2; this.add(s);
    }
    for (let i = 0; i < 3; i++) {
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.9, 6), this.mats.hazard);
      l.rotation.z = Math.PI / 2; l.rotation.y = i * 1.05; l.position.set(x, 0.12, z); this.add(l);
    }
    this.ob(x, z, 0.75);
    const f = { x, z, y: 0.25, scale: 1 };
    this.fires.push(f);
    this.lights.push({ x, y: 1.2, z, color: 0xff8a3a, power: 14, range: 11, src: f });
  }
  torch(x, z, color = 0xff8a3a, cold = false) {
    // a sodium work-lamp on an iron post (blue-white for the cold ones): a lit lens, no flame
    this.cyl(0.06, 0.09, 2.2, this.mats.logDark, x, 1.1, z, 5);
    this.box(0.36, 0.06, 0.06, this.mats.log, x, 2.15, z);
    this.box(0.3, 0.2, 0.22, this.mats.logDark, x, 2.3, z);
    this.box(0.24, 0.08, 0.24, cold ? this.mats.glowBlue : this.mats.glowAmber, x, 2.18, z);
    this.box(0.06, 0.14, 0.06, this.mats.hazard, x, 0.3, z);
    const f = { x, z, y: 2.25, scale: 0.4, color, cold, lamp: true };
    this.fires.push(f);
    this.lights.push({ x, y: 2.4, z, color, power: 8, range: 9, src: f });
  }
  bonfire(x, z) {
    // a reliquary beacon: a hexagonal plinth with a ring of vents, a sacred blade standing in a cage of brass ribs,
    // and a plasma core that ignites (blue-white flame) when it is lit
    const g = new THREE.Group();
    this.part(g, new THREE.CylinderGeometry(0.62, 0.78, 0.26, 6), this.mats.stoneDark, 0, 0.13, 0);
    this.part(g, new THREE.CylinderGeometry(0.5, 0.56, 0.12, 6), this.mats.brass, 0, 0.32, 0);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      this.part(g, new THREE.BoxGeometry(0.05, 0.62, 0.05), this.mats.brass, Math.cos(a) * 0.3, 0.68, Math.sin(a) * 0.3, Math.sin(a) * -0.32, 0, Math.cos(a) * 0.32);
      this.part(g, new THREE.BoxGeometry(0.16, 0.05, 0.08), this.mats.logDark, Math.cos(a) * 0.66, 0.27, Math.sin(a) * 0.66, 0, -a, 0);
    }
    this.part(g, new THREE.OctahedronGeometry(0.13, 0), this.mats.glowBlue, 0, 0.5, 0);
    const sword = new THREE.Group();
    sword.add(new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.2, 0.1), this.mats.metal));
    this.part(sword, new THREE.BoxGeometry(0.015, 1.0, 0.11), this.mats.glowBlue, 0, -0.05, 0);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.06, 0.07), this.mats.brass); guard.position.y = 0.6; sword.add(guard);
    this.part(sword, new THREE.BoxGeometry(0.05, 0.24, 0.05), this.mats.logDark, 0, 0.75, 0);
    sword.position.y = 0.95; sword.rotation.z = 0.06; g.add(sword);
    g.position.set(x, 0, z); this.add(g);
    this.ob(x, z, 0.7);
    const b = { x, z, lit: false, beacon: true };
    this.bonfires.push(b);
    this.lights.push({ x, y: 1.4, z, color: 0x9ad0ff, power: 11, range: 12, src: b, isBonfire: true });
    return b;
  }
  house(x, z, w, d, ry = 0) {
    // a hab-bunker: ferrocrete block with a slab roof and parapet, lit window slits, a pipe down one corner
    // (solid footprint so you path around it)
    const h = 2.4;
    this.box(w, h, d, this.mats.char, x, h / 2, z, ry);
    this.box(w + 0.3, 0.25, d + 0.3, this.mats.stoneDark, x, h + 0.12, z, ry);
    const c = Math.cos(ry), sn = Math.sin(ry);
    const loc = (lx, lz) => [x + lx * c + lz * sn, z - lx * sn + lz * c];
    for (const [lx, lz] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) { const [px, pz] = loc(lx, lz); this.box(0.25, 0.4, 0.25, this.mats.stoneDark, px, h + 0.4, pz, ry); }
    for (const t of [-0.25, 0.25]) { const [px, pz] = loc(w * t, d / 2 + 0.02); this.box(w * 0.18, 0.14, 0.04, vh(px, pz, 7) < 0.6 ? this.mats.glowWindow : this.mats.logDark, px, h * 0.62, pz, ry); }
    { const [px, pz] = loc(w / 2 - 0.1, d / 2 + 0.1); this.cyl(0.08, 0.08, h, this.mats.rust, px, h / 2, pz, 5); }
    this.solids.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
  }
  pool(x, z, r) {
    // a coolant spill, ringed with rusted rebar
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 18), this.mats.water);
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.04, z); m.userData.noMerge = true;
    this.add(m);
    this.slows.push({ x, z, r: r * 0.95, f: 0.5 });
    for (let i = 0; i < 6; i++) {
      const a = this.rand() * 6.28, rr = r * (0.9 + this.rand() * 0.25);
      const reed = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.9 + this.rand() * 0.6, 3), this.mats.reed);
      reed.position.set(x + Math.cos(a) * rr, 0.5, z + Math.sin(a) * rr); reed.rotation.z = (vh(a, rr) - 0.5) * 0.6; this.add(reed);
    }
  }

  // ---------- per-frame ----------
  update(dt, time, fx, focus) {
    this.fogMat.uniforms.uT.value = time;
    updateAmbient(this, dt, time, fx, focus);
    const near = (o) => !focus || (Math.abs(o.z - focus.z) < 40 && Math.abs(o.x - focus.x) < 40);
    for (const f of this.fires) {
      if ((f.cond && !f.cond()) || !near(f)) continue;
      if (f.lamp) { if (Math.random() < dt * 0.6) fx.add.spawn({ x: f.x + (Math.random() - 0.5) * 0.2, y: f.y - 0.1, z: f.z, vy: -1.5, life: 0.35, size: 0.08, size1: 0.02, r: 1, g: 0.8, b: 0.4, alpha: 1 }); continue; } // (a lamp: the odd spark)
      if (Math.random() < dt * 30 * f.scale) {
        if (f.cold) fx.add.spawn({ x: f.x + (Math.random() - 0.5) * 0.2, y: f.y, z: f.z + (Math.random() - 0.5) * 0.2, vy: 1.2, life: 0.5, size: 0.5 * f.scale + 0.15, size1: 0.05, r: 0.35, g: 0.7, b: 1, alpha: 0.8 });
        else fx.flame({ x: f.x, y: f.y, z: f.z }, f.scale);
      }
      if (!f.cold && Math.random() < dt * 4) fx.ember({ x: f.x, y: f.y + 0.4, z: f.z });
    }
    for (const b of this.bonfires) {
      if (!b.lit || !near(b)) continue;
      // a lit beacon: a column of blue-white plasma round the blade, and sparks
      if (Math.random() < dt * 26) fx.add.spawn({ x: b.x + (Math.random() - 0.5) * 0.35, y: 0.45, z: b.z + (Math.random() - 0.5) * 0.35, vy: 1.6 + Math.random(), life: 0.55, size: 0.42, size1: 0.05, r: 0.45, g: 0.8, b: 1, alpha: 0.85 });
      if (Math.random() < dt * 6) fx.add.spawn({ x: b.x, y: 1.2, z: b.z, vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 2, vz: (Math.random() - 0.5) * 2, life: 0.6, size: 0.07, size1: 0.02, r: 0.85, g: 0.95, b: 1, alpha: 1 });
    }
    if (focus) this.dungeon?.update?.(dt, time, focus); // (a city: roofs lift off the building you're in)
    // module culling: only the current module and its neighbours are drawn
    if (focus && this.dungeon) {
      // a dungeon: chambers and terrain tiles near you
      for (const m of this.mods) m.group.visible = Math.abs(m.cx - focus.x) < 46 + (m.r || 0) && Math.abs(m.cz - focus.z) < 46 + (m.r || 0);
      for (const t of this.tiles) t.group.visible = Math.abs(t.x - focus.x) < 44 && Math.abs(t.z - focus.z) < 44;
    } else if (focus) {
      const cur = this.moduleAt(focus.z).i;
      for (const m of this.mods) m.group.visible = Math.abs(m.i - cur) <= 1;
    }
    // assign pooled lights to the nearest active sources
    const active = this.lights.filter((l) => (l.isBonfire ? l.src.lit : !(l.src.cond && !l.src.cond())));
    if (focus) active.sort((a, b) => Math.hypot(a.x - focus.x, a.z - focus.z) - Math.hypot(b.x - focus.x, b.z - focus.z));
    this.lightPool.forEach((L, i) => {
      const s = active[i];
      if (!s) { L.intensity = 0; return; }
      const k = this.nightLight || { power: 1, range: 1 }; // (Night Raid: torches and fires light much less)
      L.position.set(s.x, s.y, s.z); L.color.set(s.color); L.distance = s.range * k.range;
      L.intensity = (s.power + Math.sin(time * 11 + s.x * 3) * s.power * 0.1) * k.power;
    });
  }
}
