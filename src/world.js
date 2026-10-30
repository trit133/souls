import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MODULES, MINI_ARENAS, BOSS_ARENA } from './modules.js';

// The level is a chain of modules laid out along -Z. Each module adds walkable
// shapes (rects/circles, optionally gated), solid blockers, slow zones, obstacles,
// props, enemy spawns and encounters. Module-local distance `d` maps to z = z0 - d.

export function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

const GROUND = {
  dirt: { walk: [0x6a5a44, 0x574a38], out: [0x323826, 0x574a38] },
  stone: { walk: [0x6e6a62, 0x5c5850], out: [0x34362c, 0x4e4a40] },
  ash: { walk: [0x4a4440, 0x3a3532], out: [0x2a2624, 0x3a3230] },
  crypt: { walk: [0x55555a, 0x45454c], out: [0x26262a, 0x303036], wall: true },
  bog: { walk: [0x4a5038, 0x3c4230], out: [0x283020, 0x343c28] },
  chasm: { walk: [0x6a6258, 0x584f44], out: [0x0c0b0a, 0x141210], void: true },
  arena: { walk: [0x6e6a62, 0x5c5850], out: [0x2e2c26, 0x48443c] },
};

export class World {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    scene.add(this.root);
    this.mats = {
      log: new THREE.MeshLambertMaterial({ color: 0x4a3524, flatShading: true }),
      logDark: new THREE.MeshLambertMaterial({ color: 0x33251a, flatShading: true }),
      rock: new THREE.MeshLambertMaterial({ color: 0x5a564e, flatShading: true }),
      rockDark: new THREE.MeshLambertMaterial({ color: 0x3c3a35, flatShading: true }),
      cloth: new THREE.MeshLambertMaterial({ color: 0x6b5a3e, flatShading: true, side: THREE.DoubleSide }),
      clothRed: new THREE.MeshLambertMaterial({ color: 0x6a1e1a, flatShading: true, side: THREE.DoubleSide }),
      stone: new THREE.MeshLambertMaterial({ color: 0x6e6a62, flatShading: true }),
      stoneDark: new THREE.MeshLambertMaterial({ color: 0x4a4a50, flatShading: true }),
      ash: new THREE.MeshLambertMaterial({ color: 0x2a2622, flatShading: true }),
      char: new THREE.MeshLambertMaterial({ color: 0x241e1a, flatShading: true }),
      metal: new THREE.MeshLambertMaterial({ color: 0x8a8a90, flatShading: true }),
      wood: new THREE.MeshLambertMaterial({ color: 0x6a4a2a, flatShading: true }),
      plank: new THREE.MeshLambertMaterial({ color: 0x5a4430, flatShading: true }),
      leaf: new THREE.MeshLambertMaterial({ color: 0x2c3324, flatShading: true }),
      reed: new THREE.MeshLambertMaterial({ color: 0x5a5a32, flatShading: true }),
      bone: new THREE.MeshLambertMaterial({ color: 0xbab09a, flatShading: true }),
      ground: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
      water: new THREE.MeshLambertMaterial({ color: 0x1e2a1c, transparent: true, opacity: 0.85 }),
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
          gl_FragColor = vec4(vec3(.85,.88,.95) * (0.7+v*0.5), (0.25 + v*0.5) * edge);
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
    let z0 = 0;
    layout.forEach((key, i) => {
      const def = key.startsWith('mini:') ? MINI_ARENAS[key.slice(5)] : key === 'boss' ? BOSS_ARENA : MODULES[key];
      const group = new THREE.Group();
      this.root.add(group);
      const mod = { i, key, name: def.name, z0, z1: z0 - def.len, len: def.len, group, ground: def.ground };
      this.mods.push(mod);
      this.cur = mod;
      this.Z = (d) => z0 - d;
      def.build(this, this.Z, mod);
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
    for (const m of this.mods || []) {
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
    this.start = { x: 0, z: -3 };
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
    this.gates[id] = { id, z, open, fog };
    return this.gates[id];
  }
  setGate(id, open, fogVisible = !open) {
    const g = this.gates[id]; if (!g) return;
    g.open = open; g.fog.visible = fogVisible;
  }

  walkable(x, z, r = 0, mod = null, ignoreGates = false) {
    for (const s of this.solids) if (x > s.x0 - r && x < s.x1 + r && z > s.z0 - r && z < s.z1 + r) return false;
    for (const s of this.shapes) {
      if (mod !== null && s.mod !== mod) continue;
      if (s.gate && !ignoreGates && !this.gates[s.gate].open) continue;
      if (s.t === 'r') { if (x >= s.x0 + r && x <= s.x1 - r && z >= s.z0 + r && z <= s.z1 - r) return true; }
      else if (Math.hypot(x - s.x, z - s.z) <= s.r - r) return true;
    }
    return false;
  }

  // footprint test used for terrain/borders (ignores gates and solids)
  area(x, z, m = 0) {
    for (const s of this.shapes) {
      if (s.t === 'r') { if (x >= s.x0 + m && x <= s.x1 - m && z >= s.z0 + m && z <= s.z1 - m) return true; }
      else if (Math.hypot(x - s.x, z - s.z) <= s.r - m) return true;
    }
    return false;
  }

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

  moduleAt(z) {
    for (const m of this.mods) if (z <= m.z0 && z > m.z1) return m;
    return z > 0 ? this.mods[0] : this.mods[this.mods.length - 1];
  }

  // ---------- terrain ----------
  buildGround(m) {
    const st = GROUND[m.ground] || GROUND.dirt;
    const W = 76, L = m.len;
    const g = new THREE.PlaneGeometry(W, L, W, Math.round(L));
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0, m.z0 - L / 2);
    const pos = g.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const w0 = new THREE.Color(st.walk[0]), w1 = new THREE.Color(st.walk[1]), o0 = new THREE.Color(st.out[0]), o1 = new THREE.Color(st.out[1]), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const n = Math.sin(x * 0.7) * Math.cos(z * 0.6) * 0.5 + Math.sin(x * 2.3 + z * 1.7) * 0.25 + (this.rand() - 0.5) * 0.4;
      if (this.area(x, z, -0.6)) c.copy(w0).lerp(w1, 0.5 + n * 0.5);
      else if (st.void) {
        const edge = this.area(x, z, -1.6);
        pos.setY(i, edge ? -1.5 : -9);
        c.copy(edge ? o1 : o0);
      } else {
        let h = 0;
        for (const mm of [-1.5, -3, -5, -8]) if (!this.area(x, z, mm)) h += 1;
        pos.setY(i, h * (st.wall ? 1.1 : 0.55) + n * 0.1 * h);
        c.copy(o0).lerp(o1, Math.max(0, 0.6 - h * 0.15) + n * 0.15);
      }
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, this.mats.ground);
    mesh.userData.noMerge = true;
    m.group.add(mesh);
  }

  scatterBorders(m) {
    const style = m.ground;
    if (style === 'chasm') {
      // jagged cliff teeth along ledge edges only
      for (let x = -20; x <= 20; x += 1.5) for (let z = m.z0; z > m.z1; z -= 1.5) {
        if (this.area(x, z, -0.3) || !this.area(x, z, -1.8)) continue;
        if (this.rand() < 0.5) this.rock(x, z, 0.3 + this.rand() * 0.4, true);
      }
      return;
    }
    for (let x = -32; x <= 32; x += 1.6) {
      for (let z = m.z0 - 0.8; z > m.z1; z -= 1.6) {
        const jx = x + (this.rand() - 0.5) * 1.2, jz = z + (this.rand() - 0.5) * 1.2;
        if (this.area(jx, jz, -0.5)) continue;
        if (Object.values(this.gates).some((g) => Math.abs(jz - g.z) < 5 && Math.abs(jx) < 7)) continue;
        const near = this.area(jx, jz, -2.2), mid = this.area(jx, jz, -6);
        const southOfPath = this.area(jx, jz - 4, -0.5) && !this.area(jx, jz + 4, -0.5);
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
  rock(x, z, s, dark, block = false) {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), dark ? this.mats.rockDark : this.mats.rock);
    m.position.set(x, s * 0.35, z);
    m.rotation.set(this.rand() * 3, this.rand() * 3, this.rand() * 3);
    m.scale.y = 0.6 + this.rand() * 0.6;
    if (block) this.ob(x, z, s * 0.85);
    return this.add(m);
  }
  deadTree(x, z, h) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, h, 5), this.mats.logDark);
    trunk.position.y = h / 2; g.add(trunk);
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.1, h * 0.45, 4), this.mats.logDark);
      b.position.y = h * (0.55 + i * 0.13); b.rotation.z = (i % 2 ? 1 : -1) * (0.7 + this.rand() * 0.4);
      b.rotation.y = this.rand() * 6; b.position.x = Math.sin(b.rotation.z) * -h * 0.2; g.add(b);
    }
    g.position.set(x, 0, z); g.rotation.y = this.rand() * 6;
    return this.add(g);
  }
  pine(x, z, h) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.18, h * 0.3, 5), this.mats.logDark);
    trunk.position.y = h * 0.15; g.add(trunk);
    for (let i = 0; i < 3; i++) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(h * (0.32 - i * 0.07), h * 0.42, 6), this.mats.leaf);
      c.position.y = h * (0.38 + i * 0.2); g.add(c);
    }
    g.position.set(x, 0, z);
    return this.add(g);
  }
  pillar(x, z, h, broken = false) {
    this.cyl(0.42, 0.5, h, this.mats.stone, x, h / 2, z);
    if (!broken) this.box(1.1, 0.25, 1.1, this.mats.stone, x, h + 0.12, z);
    this.ob(x, z, 0.5);
  }
  fallenColumn(x, z, len, ry) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, len, 7), this.mats.stone);
    m.rotation.z = Math.PI / 2; m.rotation.y = ry; m.position.set(x, 0.4, z);
    this.add(m);
    const n = Math.ceil(len / 0.8);
    for (let i = 0; i <= n; i++) {
      const t = i / n - 0.5;
      this.ob(x + Math.cos(ry) * len * t, z - Math.sin(ry) * len * t, 0.45);
    }
  }
  tent(x, z, rot, s = 1) {
    const g = new THREE.Group();
    const c = new THREE.Mesh(new THREE.ConeGeometry(1.8 * s, 2.4 * s, 4, 1, true), this.rand() < 0.3 ? this.mats.clothRed : this.mats.cloth);
    c.position.y = 1.2 * s; c.rotation.y = Math.PI / 4; g.add(c);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.9 * s, 4), this.mats.log); pole.position.y = 1.45 * s; g.add(pole);
    g.position.set(x, 0, z); g.rotation.y = rot;
    this.add(g); this.ob(x, z, 1.45 * s);
  }
  crate(x, z, s = 0.8) { this.box(s, s, s, this.mats.wood, x, s / 2, z, this.rand() * 1.5); this.ob(x, z, s * 0.62); }
  barrel(x, z) { this.cyl(0.35, 0.35, 0.9, this.mats.wood, x, 0.45, z, 8); this.ob(x, z, 0.4); }
  banner(x, z, red = true) {
    this.cyl(0.05, 0.06, 4, this.mats.log, x, 2, z, 5);
    const cl = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.6), red ? this.mats.clothRed : this.mats.cloth);
    cl.position.set(x + 0.42, 3.1, z); this.add(cl);
    this.ob(x, z, 0.2);
  }
  palisade(x0, z0, x1, z1, h = 2.6) {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(len / 0.42);
    for (let i = 0; i <= n; i++) {
      const t = i / n, hh = h * (0.85 + this.rand() * 0.3);
      const px = x0 + (x1 - x0) * t, pz = z0 + (z1 - z0) * t;
      this.cyl(0.2, 0.2, hh, this.mats.log, px, hh / 2, pz, 5);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 5), this.mats.log);
      tip.position.set(px, hh + 0.2, pz); this.add(tip);
    }
  }
  rack(x, z) {
    for (const s of [-0.6, 0.6]) this.box(0.1, 1.2, 0.1, this.mats.log, x + s, 0.6, z);
    this.box(1.4, 0.08, 0.08, this.mats.log, x, 1.1, z);
    for (let i = 0; i < 4; i++) {
      const sp = this.box(0.03, 1.6, 0.03, this.mats.metal, x - 0.45 + i * 0.3, 0.9, z + 0.08); sp.rotation.x = -0.15;
    }
    this.ob(x, z, 0.6);
  }
  // decorative fire (brazier bowl). `cond` gates whether it burns.
  brazier(x, z, o = {}) {
    this.cyl(0.5, 0.3, 1.2, this.mats.metal, x, 0.6, z);
    this.ob(x, z, 0.55);
    const f = { x, z, y: 1.25, scale: o.scale ?? 0.8, cond: o.cond, color: o.color ?? 0xff8a3a, cold: o.cold };
    this.fires.push(f);
    if (o.light !== false) this.lights.push({ x, y: 2, z, color: f.color, power: o.power ?? 12, range: 11, src: f });
    return f;
  }
  firePit(x, z) {
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), this.mats.rockDark);
      s.position.set(x + Math.cos(a) * 0.6, 0.1, z + Math.sin(a) * 0.6); this.add(s);
    }
    for (let i = 0; i < 3; i++) {
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.9, 5), this.mats.log);
      l.rotation.z = Math.PI / 2; l.rotation.y = i * 1.05; l.position.set(x, 0.12, z); this.add(l);
    }
    this.ob(x, z, 0.75);
    const f = { x, z, y: 0.25, scale: 1 };
    this.fires.push(f);
    this.lights.push({ x, y: 1.2, z, color: 0xff8a3a, power: 14, range: 11, src: f });
  }
  torch(x, z, color = 0xff8a3a, cold = false) {
    this.cyl(0.06, 0.08, 2.2, this.mats.logDark, x, 1.1, z, 5);
    const f = { x, z, y: 2.25, scale: 0.4, color, cold };
    this.fires.push(f);
    this.lights.push({ x, y: 2.4, z, color, power: 8, range: 9, src: f });
  }
  bonfire(x, z) {
    const g = new THREE.Group();
    const ash = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.75, 0.25, 8), this.mats.ash);
    ash.position.y = 0.12; g.add(ash);
    for (let i = 0; i < 6; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), this.mats.ash);
      b.position.set(Math.cos(i) * 0.25, 0.3, Math.sin(i) * 0.25); b.rotation.set(Math.cos(i) * 0.4, 0, Math.sin(i) * 0.4); g.add(b);
    }
    const sword = new THREE.Group();
    sword.add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.1, 0.08), this.mats.metal));
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.05), this.mats.metal); guard.position.y = 0.55; sword.add(guard);
    sword.position.y = 0.6; sword.rotation.z = 0.12; g.add(sword);
    g.position.set(x, 0, z); this.add(g);
    this.ob(x, z, 0.7);
    const b = { x, z, lit: false };
    this.bonfires.push(b);
    this.lights.push({ x, y: 1.4, z, color: 0xffa04a, power: 11, range: 12, src: b, isBonfire: true });
    return b;
  }
  house(x, z, w, d, ry = 0) {
    // charred hut: solid footprint so you path around it
    const h = 2.4;
    this.box(w, h, d, this.mats.char, x, h / 2, z, ry);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.78, 1.6, 4), this.mats.logDark);
    roof.position.set(x, h + 0.8, z); roof.rotation.y = Math.PI / 4 + ry; roof.scale.z = d / w; this.add(roof);
    this.solids.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
  }
  pool(x, z, r) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 18), this.mats.water);
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.04, z); m.userData.noMerge = true;
    this.add(m);
    this.slows.push({ x, z, r: r * 0.95, f: 0.5 });
    for (let i = 0; i < 6; i++) {
      const a = this.rand() * 6.28, rr = r * (0.9 + this.rand() * 0.25);
      const reed = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.9 + this.rand() * 0.6, 3), this.mats.reed);
      reed.position.set(x + Math.cos(a) * rr, 0.5, z + Math.sin(a) * rr); this.add(reed);
    }
  }

  // ---------- per-frame ----------
  update(dt, time, fx, focus) {
    this.fogMat.uniforms.uT.value = time;
    const near = (o) => !focus || Math.abs(o.z - focus.z) < 40;
    for (const f of this.fires) {
      if ((f.cond && !f.cond()) || !near(f)) continue;
      if (Math.random() < dt * 30 * f.scale) {
        if (f.cold) fx.add.spawn({ x: f.x + (Math.random() - 0.5) * 0.2, y: f.y, z: f.z + (Math.random() - 0.5) * 0.2, vy: 1.2, life: 0.5, size: 0.5 * f.scale + 0.15, size1: 0.05, r: 0.35, g: 0.7, b: 1, alpha: 0.8 });
        else fx.flame({ x: f.x, y: f.y, z: f.z }, f.scale);
      }
      if (!f.cold && Math.random() < dt * 4) fx.ember({ x: f.x, y: f.y + 0.4, z: f.z });
    }
    for (const b of this.bonfires) {
      if (!b.lit || !near(b)) continue;
      if (Math.random() < dt * 22) fx.flame({ x: b.x, y: 0.3, z: b.z }, 0.8);
      if (Math.random() < dt * 5) fx.ember({ x: b.x, y: 0.8, z: b.z });
    }
    // module culling: only the current module and its neighbours are drawn
    if (focus) {
      const cur = this.moduleAt(focus.z).i;
      for (const m of this.mods) m.group.visible = Math.abs(m.i - cur) <= 1;
    }
    // assign pooled lights to the nearest active sources
    const active = this.lights.filter((l) => (l.isBonfire ? l.src.lit : !(l.src.cond && !l.src.cond())));
    if (focus) active.sort((a, b) => Math.hypot(a.x - focus.x, a.z - focus.z) - Math.hypot(b.x - focus.x, b.z - focus.z));
    this.lightPool.forEach((L, i) => {
      const s = active[i];
      if (!s) { L.intensity = 0; return; }
      L.position.set(s.x, s.y, s.z); L.color.set(s.color); L.distance = s.range;
      L.intensity = s.power + Math.sin(time * 11 + s.x * 3) * s.power * 0.1;
    });
  }
}
