import * as THREE from 'three';

// Level: start shrine -> narrow path -> war camp -> gate path -> bonfire -> fog -> boss arena.
// Walkable space = union of overlapping rects + arena circle. Obstacles are circles.

export const ARENA = { x: 0, z: -114, r: 19 };
export const FOG_Z = -92.5;

const RECTS = [
  { x0: -7, x1: 7, z0: -6, z1: 8 },        // start shrine
  { x0: -4.5, x1: 4.5, z0: -24, z1: -4 },  // approach path
  { x0: -17, x1: 17, z0: -60, z1: -22 },   // camp
  { x0: -5, x1: 5, z0: -76, z1: -58 },     // gate path
  { x0: -8, x1: 8, z0: -89, z1: -74 },     // bonfire courtyard
];
const FOG_RECT = { x0: -3, x1: 3, z0: -97, z1: -87 };

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export class World {
  constructor(scene) {
    this.scene = scene;
    this.obstacles = [];
    this.bonfires = [];
    this.fires = [];
    this.braziers = [];
    this.arenaLocked = false;
    this.fogOpen = true;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.rand = rng(1337);
    this.mats = {
      log: new THREE.MeshLambertMaterial({ color: 0x4a3524, flatShading: true }),
      logDark: new THREE.MeshLambertMaterial({ color: 0x33251a, flatShading: true }),
      rock: new THREE.MeshLambertMaterial({ color: 0x5a564e, flatShading: true }),
      rockDark: new THREE.MeshLambertMaterial({ color: 0x3c3a35, flatShading: true }),
      cloth: new THREE.MeshLambertMaterial({ color: 0x6b5a3e, flatShading: true, side: THREE.DoubleSide }),
      clothRed: new THREE.MeshLambertMaterial({ color: 0x6a1e1a, flatShading: true, side: THREE.DoubleSide }),
      stone: new THREE.MeshLambertMaterial({ color: 0x6e6a62, flatShading: true }),
      ash: new THREE.MeshLambertMaterial({ color: 0x2a2622, flatShading: true }),
      metal: new THREE.MeshLambertMaterial({ color: 0x8a8a90, flatShading: true }),
      wood: new THREE.MeshLambertMaterial({ color: 0x6a4a2a, flatShading: true }),
      leaf: new THREE.MeshLambertMaterial({ color: 0x2c3324, flatShading: true }),
    };
    this.buildGround();
    this.buildBorders();
    this.buildStart();
    this.buildCamp();
    this.buildGate();
    this.buildArena();
  }

  // ---------- collision ----------
  walkable(x, z, r = 0, restricted = false) {
    for (const R of RECTS) if (x >= R.x0 + r && x <= R.x1 - r && z >= R.z0 + r && z <= R.z1 - r) return true;
    if (restricted) return false; // camp enemies never leave the camp side of the fog
    if (!this.arenaLocked && x >= FOG_RECT.x0 + r && x <= FOG_RECT.x1 - r && z >= FOG_RECT.z0 + r && z <= FOG_RECT.z1 - r) return true;
    const dx = x - ARENA.x, dz = z - ARENA.z;
    if (Math.hypot(dx, dz) <= ARENA.r - r) return true;
    return false;
  }

  // Move from `from` toward `to` (Vector3s, y ignored), sliding along walls. Mutates `to`.
  resolve(from, to, r, restricted = false) {
    if (!this.walkable(to.x, to.z, r, restricted)) {
      if (this.walkable(to.x, from.z, r, restricted)) to.z = from.z;
      else if (this.walkable(from.x, to.z, r, restricted)) to.x = from.x;
      else { to.x = from.x; to.z = from.z; }
    }
    for (const o of this.obstacles) {
      const dx = to.x - o.x, dz = to.z - o.z;
      const d = Math.hypot(dx, dz), m = o.r + r;
      if (d < m && d > 1e-5) {
        const nx = to.x + dx / d * (m - d), nz = to.z + dz / d * (m - d);
        if (this.walkable(nx, nz, r, restricted)) { to.x = nx; to.z = nz; }
        else { to.x = from.x; to.z = from.z; }
      }
    }
    return to;
  }

  addObstacle(x, z, r) { this.obstacles.push({ x, z, r }); }

  // ---------- visuals ----------
  buildGround() {
    const size = 140, seg = 140;
    const g = new THREE.PlaneGeometry(size, size, seg, seg);
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0, -55);
    const pos = g.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const dirt = new THREE.Color(0x6a5a44), dirt2 = new THREE.Color(0x574a38), grass = new THREE.Color(0x323826),
      stone = new THREE.Color(0x6e6a62), stone2 = new THREE.Color(0x5c5850), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const n = Math.sin(x * 0.7) * Math.cos(z * 0.6) * 0.5 + Math.sin(x * 2.3 + z * 1.7) * 0.25 + (this.rand() - 0.5) * 0.4;
      const inArena = Math.hypot(x - ARENA.x, z - ARENA.z) < ARENA.r + 0.5;
      let inside = this.walkable(x, z, -0.6) || inArena;
      if (inArena) c.copy(stone).lerp(stone2, 0.5 + n * 0.5);
      else if (inside) c.copy(dirt).lerp(dirt2, 0.5 + n * 0.5);
      else {
        // distance to walkable approximated by margin probes; terrain rises away from paths
        let h = 0;
        for (const m of [-1.5, -3, -5, -8]) { if (!this.walkable(x, z, m)) h += 1; }
        pos.setY(i, h * 0.55 + n * 0.3 * h * 0.3);
        c.copy(grass).lerp(dirt2, Math.max(0, 0.6 - h * 0.15) + n * 0.15);
      }
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
    this.group.add(m);

    // arena flagstone rings
    const rings = new THREE.Mesh(new THREE.RingGeometry(6, 6.25, 48), new THREE.MeshBasicMaterial({ color: 0x3a3833 }));
    rings.rotation.x = -Math.PI / 2; rings.position.set(ARENA.x, 0.02, ARENA.z); this.group.add(rings);
    const r2 = rings.clone(); r2.scale.setScalar(2); this.group.add(r2);
  }

  rock(x, z, s, dark) {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), dark ? this.mats.rockDark : this.mats.rock);
    m.position.set(x, s * 0.35, z);
    m.rotation.set(this.rand() * 3, this.rand() * 3, this.rand() * 3);
    m.scale.y = 0.6 + this.rand() * 0.6;
    this.group.add(m);
    return m;
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
    this.group.add(g);
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
    this.group.add(g);
  }

  buildBorders() {
    // scatter rocks and trees just outside walkable space; keep anything south of a path low
    for (let x = -30; x <= 30; x += 1.6) {
      for (let z = 14; z >= -136; z -= 1.6) {
        const jx = x + (this.rand() - 0.5) * 1.2, jz = z + (this.rand() - 0.5) * 1.2;
        if (this.walkable(jx, jz, -0.4)) continue;
        if (Math.hypot(jx - ARENA.x, jz - ARENA.z) < ARENA.r + 2.5) continue;
        if (jz < FOG_Z + 6 && jz > FOG_Z - 6 && Math.abs(jx) < 6) continue;
        const near = this.walkable(jx, jz, -2.2);
        const mid = this.walkable(jx, jz, -6);
        const southOfPath = this.walkable(jx, jz - 4, -0.5) && !this.walkable(jx, jz + 4, -0.5);
        const p = this.rand();
        if (near && p < 0.4) this.rock(jx, jz, 0.35 + this.rand() * (southOfPath ? 0.25 : 0.55), this.rand() < 0.5);
        else if (mid && !near && p < 0.22 && !southOfPath) {
          if (this.rand() < 0.5) this.pine(jx, jz, 4 + this.rand() * 3); else this.deadTree(jx, jz, 3 + this.rand() * 2);
        } else if (!mid && p < 0.06) this.pine(jx, jz, 5 + this.rand() * 4);
      }
    }
  }

  campfire(x, z, light = true) {
    const g = new THREE.Group();
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), this.mats.rockDark);
      s.position.set(Math.cos(a) * 0.6, 0.1, Math.sin(a) * 0.6); g.add(s);
    }
    for (let i = 0; i < 3; i++) {
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.9, 5), this.mats.log);
      l.rotation.z = Math.PI / 2; l.rotation.y = i * 1.05; l.position.y = 0.12; g.add(l);
    }
    g.position.set(x, 0, z); this.group.add(g);
    this.addObstacle(x, z, 0.75);
    const f = { x, z, y: 0.25, scale: 1 };
    if (light) { f.light = new THREE.PointLight(0xff8a3a, 14, 11, 1.6); f.light.position.set(x, 1.2, z); this.scene.add(f.light); }
    this.fires.push(f);
    return f;
  }

  bonfire(x, z, id) {
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
    g.position.set(x, 0, z); this.group.add(g);
    this.addObstacle(x, z, 0.7);
    const light = new THREE.PointLight(0xffa04a, 0, 12, 1.5); light.position.set(x, 1.4, z); this.scene.add(light);
    const b = { x, z, id, lit: false, light };
    this.bonfires.push(b);
    return b;
  }

  tent(x, z, rot, s = 1) {
    const g = new THREE.Group();
    const c = new THREE.Mesh(new THREE.ConeGeometry(1.8 * s, 2.4 * s, 4, 1, true), this.rand() < 0.3 ? this.mats.clothRed : this.mats.cloth);
    c.position.y = 1.2 * s; c.rotation.y = Math.PI / 4; g.add(c);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.9 * s, 4), this.mats.log); pole.position.y = 1.45 * s; g.add(pole);
    g.position.set(x, 0, z); g.rotation.y = rot; this.group.add(g);
    this.addObstacle(x, z, 1.45 * s);
  }

  crate(x, z, s = 0.8) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), this.mats.wood);
    m.position.set(x, s / 2, z); m.rotation.y = this.rand() * 1.5; this.group.add(m);
    this.addObstacle(x, z, s * 0.62);
  }
  barrel(x, z) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.9, 8), this.mats.wood);
    m.position.set(x, 0.45, z); this.group.add(m);
    this.addObstacle(x, z, 0.4);
  }
  banner(x, z, color) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 4, 5), this.mats.log);
    pole.position.set(x, 2, z); this.group.add(pole);
    const cl = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.6), color ? this.mats.clothRed : this.mats.cloth);
    cl.position.set(x + 0.42, 3.1, z); this.group.add(cl);
    this.addObstacle(x, z, 0.2);
  }
  palisade(x0, z0, x1, z1, h = 2.6) {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(len / 0.42);
    for (let i = 0; i <= n; i++) {
      const t = i / n, hh = h * (0.85 + this.rand() * 0.3);
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, hh, 5), this.mats.log);
      l.position.set(x0 + (x1 - x0) * t, hh / 2, z0 + (z1 - z0) * t); this.group.add(l);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 5), this.mats.log);
      tip.position.set(l.position.x, hh + 0.2, l.position.z); this.group.add(tip);
    }
  }
  rack(x, z) {
    const g = new THREE.Group();
    for (const s of [-0.6, 0.6]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 0.1), this.mats.log); p.position.set(s, 0.6, 0); g.add(p); }
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.08), this.mats.log); bar.position.y = 1.1; g.add(bar);
    for (let i = 0; i < 4; i++) {
      const sp = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.6, 0.03), this.mats.metal);
      sp.position.set(-0.45 + i * 0.3, 0.9, 0.08); sp.rotation.x = -0.15; g.add(sp);
    }
    g.position.set(x, 0, z); this.group.add(g); this.addObstacle(x, z, 0.6);
  }

  buildStart() {
    this.bonfire(0, 2.5, 'shrine');
    // ruined shrine pillars
    for (const [x, z, h] of [[-5.5, 6, 3.4], [5.5, 6, 2.2], [-5.5, -1, 1.6], [5.5, -1, 3.0]]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, h, 7), this.mats.stone);
      p.position.set(x, h / 2, z); this.group.add(p); this.addObstacle(x, z, 0.5);
    }
  }

  buildCamp() {
    // palisade walls on camp sides with the path openings north/south
    this.palisade(-17, -22, -17, -60); this.palisade(17, -22, 17, -60);
    this.palisade(-17, -60, -5.5, -60); this.palisade(5.5, -60, 17, -60);
    this.palisade(-17, -22, -5, -22, 1.2); this.palisade(5, -22, 17, -22, 1.2);
    this.banner(-5.4, -23, true); this.banner(5.4, -23, true);
    this.banner(-5.8, -59, true); this.banner(5.8, -59, true);

    this.tent(-12.5, -27, 0.3); this.tent(12.5, -29, -0.2);
    this.tent(-13, -50, 0.1, 1.1); this.tent(12.8, -53, 0.5, 1.1); this.tent(13, -40, 0);
    this.campfire(-4, -33); this.campfire(6, -47);
    this.crate(-15, -36); this.crate(-14.2, -37); this.crate(-15, -37.2, 0.6);
    this.barrel(15, -34.5); this.barrel(15.3, -35.5); this.barrel(-9, -56);
    this.crate(8, -57); this.crate(9, -57.4, 0.6);
    this.rack(-8, -42); this.rack(9.5, -24.5);
    this.rock(-1, -41, 0.8, true); this.addObstacle(-1, -41, 0.7);
    this.rock(11, -45, 1.0); this.addObstacle(11, -45, 0.85);
  }

  buildGate() {
    // stone gatehouse between camp and courtyard
    for (const s of [-1, 1]) {
      const t = new THREE.Mesh(new THREE.BoxGeometry(2.2, 5, 2.2), this.mats.stone);
      t.position.set(s * 6.2, 2.5, -67); this.group.add(t);
    }
    this.campfire(0, -61.5, false).scale = 0.6;
    this.bonfire(0, -81, 'gate');
    this.rock(-6.5, -86, 0.9); this.rock(6.6, -77, 0.7);

    // fog wall
    this.fogMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { uT: { value: 0 }, uA: { value: 1 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
      fragmentShader: `uniform float uT; uniform float uA; varying vec2 vUv;
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
        float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
          return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
        void main(){
          vec2 p = vUv*vec2(6.,4.);
          float v = n(p + vec2(uT*0.3, -uT*0.5)) * .6 + n(p*2.1 - vec2(uT*0.2, uT*0.9)) * .4;
          float edge = smoothstep(0., .15, vUv.x) * smoothstep(1., .85, vUv.x) * smoothstep(1., .6, vUv.y);
          gl_FragColor = vec4(vec3(.85,.88,.95) * (0.7+v*0.5), (0.25 + v*0.5) * edge * uA);
        }`,
    });
    const fog = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 4.5), this.fogMat);
    fog.position.set(0, 2.25, FOG_Z); this.group.add(fog); this.fog = fog;
    for (const s of [-1, 1]) {
      const a = new THREE.Mesh(new THREE.BoxGeometry(1.2, 5.5, 1.4), this.mats.stone);
      a.position.set(s * 3.7, 2.75, FOG_Z); this.group.add(a);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(8.6, 1, 1.4), this.mats.stone);
    lintel.position.set(0, 5.6, FOG_Z); this.group.add(lintel);
  }

  buildArena() {
    const { x, z, r } = ARENA;
    const n = 22;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2;
      const px = x + Math.cos(a) * (r + 0.9), pz = z + Math.sin(a) * (r + 0.9);
      if (Math.abs(px) < 4.5 && pz > z) continue; // entrance gap
      const south = Math.sin(a) > 0.2;
      const h = south ? 0.8 + this.rand() * 0.5 : (i % 3 === 0 ? 1.5 + this.rand() : 4 + this.rand() * 2.5);
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, h, 7), this.mats.stone);
      p.position.set(px, h / 2, pz); this.group.add(p);
      if (!south && i % 3 === 0) { const rb = this.rock(px + 0.6, pz + 0.3, 0.45); rb.material = this.mats.stone; }
      if (!south && i % 2 === 1) {
        const w = new THREE.Mesh(new THREE.BoxGeometry(1.2, h * 0.35, 3.6), this.mats.stone);
        w.position.set(px, h * 0.17, pz); w.lookAt(x, h * 0.17, z); w.rotateY(Math.PI / 2); this.group.add(w);
      }
    }
    // braziers
    for (const [bx, bz] of [[-12, z - 11], [12, z - 11], [-14.5, z + 6], [14.5, z + 6]]) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.3, 1.2, 7), this.mats.metal);
      b.position.set(bx, 0.6, bz); this.group.add(b);
      this.addObstacle(bx, bz, 0.55);
      this.fires.push({ x: bx, z: bz, y: 1.25, scale: 0.8, brazier: true });
    }
    const al = new THREE.PointLight(0xff7a3a, 22, 34, 1.3); al.position.set(x, 6, z - 4); this.scene.add(al); this.arenaLight = al;
    // great statue behind the arena (decor, outside walkable)
    const st = new THREE.Group();
    const ped = new THREE.Mesh(new THREE.BoxGeometry(5, 2, 4), this.mats.stone); ped.position.y = 1; st.add(ped);
    const bodyM = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.6, 6, 6), this.mats.stone); bodyM.position.y = 5; st.add(bodyM);
    const hd = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9, 0), this.mats.stone); hd.position.y = 8.6; st.add(hd);
    const sw = new THREE.Mesh(new THREE.BoxGeometry(0.3, 7, 0.8), this.mats.stone); sw.position.set(0, 4.5, 1.8); st.add(sw);
    st.position.set(x, 0, z - r - 5); this.group.add(st);
  }

  setArenaLocked(v) {
    this.arenaLocked = v;
    this.fog.visible = v || this.fogOpen;
  }

  update(dt, time, fx) {
    this.fogMat.uniforms.uT.value = time;
    for (const f of this.fires) {
      if (f.brazier && !this.braziersLit) continue;
      if (Math.random() < dt * 30 * f.scale) fx.flame({ x: f.x, y: f.y, z: f.z }, f.scale);
      if (Math.random() < dt * 4) fx.ember({ x: f.x, y: f.y + 0.4, z: f.z });
      if (f.light) f.light.intensity = 12 + Math.sin(time * 13 + f.x) * 1.5 + Math.sin(time * 7.3) * 1.5;
    }
    for (const b of this.bonfires) {
      if (!b.lit) continue;
      if (Math.random() < dt * 22) fx.flame({ x: b.x, y: 0.3, z: b.z }, 0.8);
      if (Math.random() < dt * 5) fx.ember({ x: b.x, y: 0.8, z: b.z });
      b.light.intensity = 10 + Math.sin(time * 11) * 1.5;
    }
    if (this.arenaLight) this.arenaLight.intensity = this.braziersLit ? 26 + Math.sin(time * 9) * 2 : 4;
  }
}
