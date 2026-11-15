// The Templar's effects, drawn in 3D (the pixel pass over the screen turns them into pixel art like everything else):
//   BladeArc  - the swing's arc: a wide ribbon swept by the blade, smoothed between frames, a white-hot edge at the
//               blade's tip fading through the weapon's colour to nothing at the hilt, flickering streaks, lingering a
//               moment (in place of fx.js Trail; the same update / dispose)
//   Fx3D      - one-shot bursts: impact (a hot flash, sparks that streak, fall and bounce, a shock ring facing the way
//               the blow went, steel chips on a heavy hit), slam (a dust ring rolling out, debris thrown up, cracks in
//               the ground glowing and cooling), bash (a fan of steel sparks and a flash)
// All of it is visual. The party sees it through game.vfx (vfx.js) and the 'hit' event (mp.js).
import * as THREE from 'three';

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _v = new THREE.Vector3();
const cr = (p0, p1, p2, p3, t, out) => { // Catmull-Rom between p1 and p2
  const t2 = t * t, t3 = t2 * t;
  return out.set(
    0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
    0.5 * (2 * p1.z + (-p0.z + p2.z) * t + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3));
};

// ---------- the blade's arc ----------
export class BladeArc {
  // color: the weapon's glow; o.heavy: a great blade (a wider, slower, hotter arc), o.life: how long a slice lingers
  constructor(scene, color = 0xdfe8ff, o = {}) {
    this.life = o.life ?? (o.heavy ? 0.3 : 0.22);
    this.n = 48; // ribbon slices
    this.samples = [];
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(this.n * 2 * 3);
    this.uv = new Float32Array(this.n * 2 * 2);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('uv', new THREE.BufferAttribute(this.uv, 2).setUsage(THREE.DynamicDrawUsage));
    const idx = []; for (let i = 0; i < this.n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    g.setIndex(idx);
    const col = new THREE.Color(color);
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      uniforms: { uCol: { value: col }, uHot: { value: o.heavy ? new THREE.Color(1, 0.86, 0.6) : new THREE.Color(1, 1, 1) }, uT: { value: 0 }, uOp: { value: o.heavy ? 1.1 : 0.95 } },
      // uv.x: 0 at the newest slice -> 1 at the oldest; uv.y: 0 at the hilt -> 1 at the tip
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform vec3 uCol; uniform vec3 uHot; uniform float uT; uniform float uOp; varying vec2 vUv;
        void main(){
          float age = vUv.x, span = vUv.y;
          float edge = smoothstep(0.55, 1.0, span);                 // brightest out at the tip
          float body = smoothstep(0.0, 0.5, span) * (1.0 - age);    // fades at the hilt and as it ages
          float core = pow(edge, 3.0) * (1.0 - age * 1.4);          // a white-hot line along the edge
          float streak = 0.75 + 0.25 * sin(span * 46.0 + age * 18.0 - uT * 40.0); // flickering streaks
          vec3 c = mix(uCol, uHot, clamp(core, 0.0, 1.0));
          float a = clamp(body * streak * (0.35 + edge * 0.9) + core * 0.9, 0.0, 1.0) * (1.0 - age);
          gl_FragColor = vec4(c, a * uOp);
        }`,
    });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.geo = g;
    scene.add(this.mesh);
    this.t = 0;
  }
  update(dt, active, baseObj, tipObj) {
    this.t += dt; this.mat.uniforms.uT.value = this.t;
    for (const s of this.samples) s.age += dt;
    if (active && baseObj && tipObj) {
      baseObj.getWorldPosition(_a); tipObj.getWorldPosition(_b);
      // reach a little past the tip (the arc reads bigger than the steel)
      _v.copy(_b).sub(_a);
      this.samples.unshift({ a: _a.clone(), b: _b.clone().addScaledVector(_v, 0.12), age: 0 });
    }
    this.samples = this.samples.filter((s) => s.age < this.life);
    const S = this.samples, m = S.length, n = this.n;
    if (m < 2) { this.mesh.visible = false; return; }
    this.mesh.visible = true;
    // smoothed: the ribbon runs through every sample on a curve (a fast swing doesn't come out as a fan of flat panels)
    const pa = new THREE.Vector3(), pb = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const f = i / (n - 1) * (m - 1), k = Math.min(m - 2, Math.floor(f)), t = f - k;
      const s0 = S[Math.max(0, k - 1)], s1 = S[k], s2 = S[k + 1], s3 = S[Math.min(m - 1, k + 2)];
      cr(s0.a, s1.a, s2.a, s3.a, t, pa); cr(s0.b, s1.b, s2.b, s3.b, t, pb);
      const age = (s1.age + (s2.age - s1.age) * t) / this.life;
      this.pos.set([pa.x, pa.y, pa.z, pb.x, pb.y, pb.z], i * 6);
      this.uv.set([age, 0, age, 1], i * 4);
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.uv.needsUpdate = true;
    this.geo.computeBoundingSphere();
  }
  dispose(scene) { scene.remove(this.mesh); this.geo.dispose(); this.mat.dispose(); }
}

// the Templar's blade arc for his weapon's stance: the Power Sword's blue-white, the Penitent Slab's molten amber
export const knightArc = (scene, style) => new BladeArc(scene, style === 'slab' ? 0xffa860 : 0x8ad0ff, { heavy: style === 'slab' });
export const knightHitColor = (style) => (style === 'slab' ? 0xffb070 : 0x9ad8ff);

// ---------- one-shot bursts ----------
const MAX_SPARKS = 600;
export class Fx3D {
  constructor(scene) {
    this.scene = scene;
    this.list = [];
    // sparks: one batch of streaks (each a quad stretched along its velocity), drawn in a single call
    const g = new THREE.BufferGeometry();
    this.sp = [];
    this.sPos = new Float32Array(MAX_SPARKS * 4 * 3); this.sCol = new Float32Array(MAX_SPARKS * 4 * 4);
    g.setAttribute('position', new THREE.BufferAttribute(this.sPos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.sCol, 4).setUsage(THREE.DynamicDrawUsage));
    const idx = []; for (let i = 0; i < MAX_SPARKS; i++) { const a = i * 4; idx.push(a, a + 1, a + 2, a, a + 2, a + 3); }
    g.setIndex(idx);
    this.sMesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    this.sMesh.frustumCulled = false; this.sGeo = g; scene.add(this.sMesh);
    this.flashTex = radialTex();
  }

  // a struck body: at (point), the blow going along dir; heavy: a great blade's hit
  impact(point, dir, o = {}) {
    const heavy = !!o.heavy, col = new THREE.Color(o.color ?? 0xdfe8ff), d = (dir || _v.set(0, 0, 1)).clone().setY(0).normalize();
    this.flash(point, heavy ? 1.0 : 0.7, col, heavy ? 0.11 : 0.08);
    this.ring(point, d, heavy ? 1.0 : 0.65, col, heavy ? 0.2 : 0.15);
    const n = heavy ? 34 : 20;
    for (let i = 0; i < n; i++) {
      // a cone along the blow, opening up and out
      const v = d.clone().multiplyScalar(4 + Math.random() * (heavy ? 9 : 6)).add(new THREE.Vector3((Math.random() - 0.5) * 7, 1.5 + Math.random() * 5, (Math.random() - 0.5) * 7));
      this.spark(point, v, Math.random() < 0.35 ? [1, 1, 0.95] : [1, 0.7 + Math.random() * 0.2, 0.3], 0.25 + Math.random() * 0.35, 0.05 + Math.random() * 0.04);
    }
    if (heavy) for (let i = 0; i < 6; i++) this.chip(point, d.clone().multiplyScalar(3 + Math.random() * 3).add(new THREE.Vector3((Math.random() - 0.5) * 4, 3 + Math.random() * 3, (Math.random() - 0.5) * 4)));
  }
  // a blow into the ground at (point), radius r
  slam(point, r = 3, o = {}) {
    const col = new THREE.Color(o.color ?? 0xffd8a0);
    this.flash(point.clone().setY(0.4), 1.6, col, 0.12);
    this.dustRing(point, r);
    this.cracks(point, r * 0.8);
    for (let i = 0; i < 10; i++) { const a = Math.random() * Math.PI * 2, s = 2 + Math.random() * 4; this.chip(point.clone().setY(0.2), new THREE.Vector3(Math.cos(a) * s, 4 + Math.random() * 4, Math.sin(a) * s), 0x4a4440); }
    for (let i = 0; i < 26; i++) { const a = Math.random() * Math.PI * 2, s = 3 + Math.random() * 7; this.spark(point.clone().setY(0.15), new THREE.Vector3(Math.cos(a) * s, 1 + Math.random() * 3, Math.sin(a) * s), [1, 0.75, 0.4], 0.3 + Math.random() * 0.3, 0.05); }
  }
  // a shield's bash: a fan of steel sparks out of the face, a flash
  bash(point, dir) {
    const d = (dir || _v.set(0, 0, 1)).clone().setY(0).normalize();
    this.flash(point, 0.8, new THREE.Color(0xcfe0ff), 0.08);
    this.ring(point, d, 0.7, new THREE.Color(0xcfe0ff), 0.16);
    for (let i = 0; i < 26; i++) { const side = (Math.random() - 0.5) * 2; const v = d.clone().multiplyScalar(5 + Math.random() * 5).add(new THREE.Vector3(-d.z * side * 5, Math.random() * 4, d.x * side * 5)); this.spark(point, v, [0.85, 0.92, 1], 0.2 + Math.random() * 0.25, 0.045); }
  }

  // ---------- pieces ----------
  flash(at, size, col, life) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.flashTex, color: col.clone().lerp(new THREE.Color(1, 1, 1), 0.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.position.copy(at); m.scale.setScalar(0.01); this.scene.add(m);
    this.list.push({ m, t: 0, life, upd: (e, k) => { const s = size * (k < 0.3 ? k / 0.3 : 1 - (k - 0.3) * 0.4); e.m.scale.setScalar(s); e.m.material.opacity = 1 - k; } });
  }
  ring(at, dir, size, col, life) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 32), new THREE.MeshBasicMaterial({ color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    m.position.copy(at); m.lookAt(at.clone().add(dir)); m.scale.setScalar(0.1); this.scene.add(m);
    this.list.push({ m, t: 0, life, upd: (e, k) => { e.m.scale.setScalar(0.1 + size * Math.sqrt(k)); e.m.material.opacity = (1 - k) * (1 - k) * 0.6; } });
  }
  dustRing(at, r) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.28, 6, 28), new THREE.MeshBasicMaterial({ color: 0x5a5248, transparent: true, depthWrite: false }));
    m.rotation.x = Math.PI / 2; m.position.set(at.x, 0.25, at.z); m.scale.setScalar(0.2); this.scene.add(m);
    this.list.push({ m, t: 0, life: 0.7, upd: (e, k) => { const s = 0.2 + r * (1 - (1 - k) ** 3); e.m.scale.set(s, s, 1 + k * 2); e.m.position.y = 0.25 + k * 0.4; e.m.material.opacity = 0.7 * (1 - k); } });
  }
  cracks(at, r) {
    const g = new THREE.Group(); g.position.set(at.x, 0.03, at.z);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    for (let k = 0; k < 7; k++) {
      let a = k / 7 * Math.PI * 2 + Math.random() * 0.4, x = 0, z = 0;
      for (let s = 0; s < 4; s++) {
        const len = r / 4 * (0.7 + Math.random() * 0.6), nx = x + Math.cos(a) * len, nz = z + Math.sin(a) * len;
        const seg = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.08 * (1 - s * 0.2)), mat);
        seg.rotation.x = -Math.PI / 2; seg.rotation.z = -a; seg.position.set((x + nx) / 2, 0, (z + nz) / 2); g.add(seg);
        x = nx; z = nz; a += (Math.random() - 0.5) * 0.8;
      }
    }
    this.scene.add(g);
    this.list.push({ m: g, t: 0, life: 1.4, upd: (e, k) => { mat.color.setRGB(1, 0.48 * (1 - k) + 0.1, 0.16 * (1 - k)); mat.opacity = 1 - k * k; } });
  }
  // a chip of steel or stone, tumbling under gravity, bouncing once, then gone
  chip(at, vel, color = 0xb8bcc4) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.12), new THREE.MeshLambertMaterial({ color }));
    m.position.copy(at); this.scene.add(m);
    const v = vel.clone(), spin = new THREE.Vector3(Math.random() * 20, Math.random() * 20, Math.random() * 20);
    this.list.push({ m, t: 0, life: 1.1, upd: (e, k, dt) => {
      v.y -= 22 * dt; e.m.position.addScaledVector(v, dt); e.m.rotation.x += spin.x * dt; e.m.rotation.y += spin.y * dt;
      if (e.m.position.y < 0.03) { e.m.position.y = 0.03; v.y *= -0.35; v.x *= 0.5; v.z *= 0.5; spin.multiplyScalar(0.5); }
    } });
  }
  spark(at, vel, rgb, life, w) {
    if (this.sp.length >= MAX_SPARKS) this.sp.shift();
    this.sp.push({ p: at.clone(), v: vel.clone(), rgb, life, t: 0, w });
  }

  update(dt, camera) {
    for (const e of this.list) { e.t += dt; e.upd(e, Math.min(1, e.t / e.life), dt); }
    this.list = this.list.filter((e) => {
      if (e.t < e.life) return true;
      this.scene.remove(e.m); e.m.traverse((o) => { o.geometry?.dispose(); if (o.material && o.material.map !== this.flashTex) o.material.dispose(); });
      return false;
    });
    // the sparks: fall, drag, bounce off the floor; each drawn as a streak along its velocity, facing the camera
    const S = this.sp, cam = camera?.position;
    for (const s of S) { s.t += dt; s.v.y -= 18 * dt; s.v.multiplyScalar(Math.exp(-2.2 * dt)); s.p.addScaledVector(s.v, dt); if (s.p.y < 0.03) { s.p.y = 0.03; s.v.y *= -0.4; s.v.x *= 0.6; s.v.z *= 0.6; } }
    this.sp = S.filter((s) => s.t < s.life);
    const tail = new THREE.Vector3(), side = new THREE.Vector3(), view = new THREE.Vector3();
    for (let i = 0; i < MAX_SPARKS; i++) {
      const s = this.sp[i], o = i * 12, c = i * 16;
      if (!s) { this.sCol.fill(0, c, c + 16); continue; }
      const k = s.t / s.life;
      tail.copy(s.v).multiplyScalar(0.035);
      view.copy(cam || s.p).sub(s.p).normalize();
      side.copy(tail).cross(view).normalize().multiplyScalar(s.w * (1 - k * 0.5));
      const ax = s.p.x - tail.x, ay = s.p.y - tail.y, az = s.p.z - tail.z;
      this.sPos.set([ax - side.x, ay - side.y, az - side.z, ax + side.x, ay + side.y, az + side.z, s.p.x + side.x, s.p.y + side.y, s.p.z + side.z, s.p.x - side.x, s.p.y - side.y, s.p.z - side.z], o);
      const a = 1 - k, [r, g, b] = s.rgb, cool = Math.min(1, k * 1.4); // (white-hot, cooling to ember red)
      const rr = r, gg = g * (1 - cool * 0.6), bb = b * (1 - cool);
      for (let q = 0; q < 4; q++) this.sCol.set([rr, gg, bb, q < 2 ? a * 0.3 : a], c + q * 4);
    }
    this.sGeo.attributes.position.needsUpdate = true; this.sGeo.attributes.color.needsUpdate = true;
  }
}
// a soft round glow for flashes
function radialTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,240,220,0.8)'); g.addColorStop(1, 'rgba(255,200,150,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); return t;
}
