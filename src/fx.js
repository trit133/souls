import * as THREE from 'three';

// ---------- GPU point particles ----------
const VS = `
attribute float size; attribute float alpha; attribute vec3 color;
varying float vA; varying vec3 vC;
uniform float uScale;
void main(){
  vec4 mv = modelViewMatrix * vec4(position,1.0);
  gl_PointSize = size * uScale / -mv.z;
  gl_Position = projectionMatrix * mv;
  vA = alpha; vC = color;
}`;
const FS = `
varying float vA; varying vec3 vC;
void main(){
  vec2 d = gl_PointCoord - 0.5; float r = length(d);
  if (r > 0.5) discard;
  gl_FragColor = vec4(vC, vA * smoothstep(0.5, 0.15, r));
}`;

class ParticleSystem {
  constructor(scene, max, additive) {
    this.max = max;
    this.n = 0;
    this.p = [];
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: { uScale: { value: 600 } },
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.geo = g;
    scene.add(this.points);
  }
  spawn(o) {
    if (this.p.length >= this.max) this.p.shift();
    this.p.push({
      x: o.x, y: o.y, z: o.z, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0,
      life: o.life, age: 0, size: o.size, size1: o.size1 ?? o.size, r: o.r, g: o.g, b: o.b,
      grav: o.grav ?? 0, drag: o.drag ?? 0, a0: o.alpha ?? 1,
    });
  }
  update(dt) {
    let i = 0;
    const keep = [];
    for (const q of this.p) {
      q.age += dt;
      if (q.age >= q.life) continue;
      q.vy -= q.grav * dt;
      const d = Math.exp(-q.drag * dt);
      q.vx *= d; q.vy *= d; q.vz *= d;
      q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
      if (q.y < 0.02 && q.grav > 0) { q.y = 0.02; q.vy *= -0.3; q.vx *= 0.6; q.vz *= 0.6; }
      const t = q.age / q.life;
      this.pos[i * 3] = q.x; this.pos[i * 3 + 1] = q.y; this.pos[i * 3 + 2] = q.z;
      this.col[i * 3] = q.r; this.col[i * 3 + 1] = q.g; this.col[i * 3 + 2] = q.b;
      this.size[i] = q.size + (q.size1 - q.size) * t;
      this.alpha[i] = q.a0 * (1 - t * t);
      keep.push(q); i++;
    }
    this.p = keep;
    this.geo.setDrawRange(0, i);
    for (const k of ['position', 'color', 'size', 'alpha']) this.geo.attributes[k].needsUpdate = true;
  }
  clear() { this.p = []; }
}

// ---------- weapon trail ribbon ----------
export class Trail {
  constructor(scene, color = 0xffffff, n = 16, opacity = 0.55) {
    this.n = n;
    this.samples = [];
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(n * 2 * 3);
    this.al = new Float32Array(n * 2);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('alpha', new THREE.BufferAttribute(this.al, 1).setUsage(THREE.DynamicDrawUsage));
    const idx = [];
    for (let i = 0; i < n - 1; i++) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      idx.push(a, b, c, b, d, c);
    }
    g.setIndex(idx);
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: new THREE.Color(color) }, uOp: { value: opacity } },
      vertexShader: `attribute float alpha; varying float vA; void main(){ vA=alpha; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
      fragmentShader: `uniform vec3 uColor; uniform float uOp; varying float vA; void main(){ gl_FragColor=vec4(uColor, vA*uOp);} `,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.geo = g;
    scene.add(this.mesh);
    this.a = new THREE.Vector3(); this.b = new THREE.Vector3();
  }
  update(dt, active, baseObj, tipObj) {
    for (const s of this.samples) s.age += dt;
    if (active && baseObj) {
      baseObj.getWorldPosition(this.a); tipObj.getWorldPosition(this.b);
      this.samples.unshift({ a: this.a.clone(), b: this.b.clone(), age: 0 });
    }
    const life = 0.13;
    this.samples = this.samples.filter((s) => s.age < life).slice(0, this.n);
    const m = this.samples.length;
    for (let i = 0; i < this.n; i++) {
      const s = this.samples[Math.min(i, m - 1)];
      if (!s) { this.al[i * 2] = this.al[i * 2 + 1] = 0; continue; }
      const k = i < m ? (1 - s.age / life) * (1 - i / this.n) : 0;
      this.pos.set([s.a.x, s.a.y, s.a.z], i * 6);
      this.pos.set([s.b.x, s.b.y, s.b.z], i * 6 + 3);
      this.al[i * 2] = k * 0.15; this.al[i * 2 + 1] = k;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.alpha.needsUpdate = true;
    this.mesh.visible = m > 1;
  }
  setColor(c) { this.mat.uniforms.uColor.value.set(c); }
  dispose(scene) { scene.remove(this.mesh); this.geo.dispose(); this.mat.dispose(); }
}

// ---------- FX manager ----------
export class FX {
  constructor(scene) {
    this.scene = scene;
    this.add = new ParticleSystem(scene, 700, true);
    this.norm = new ParticleSystem(scene, 300, false);
    this.decals = [];
    this.shake = 0;
    this.shakeT = 0;
  }
  setScale(px) { this.add.mat.uniforms.uScale.value = px; this.norm.mat.uniforms.uScale.value = px; }

  sparks(p, dir, n = 12, color = [1, 0.8, 0.4]) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 7;
      this.add.spawn({
        x: p.x, y: p.y, z: p.z,
        vx: Math.cos(a) * sp * 0.6 + (dir ? dir.x * 4 : 0), vy: 1 + Math.random() * 5, vz: Math.sin(a) * sp * 0.6 + (dir ? dir.z * 4 : 0),
        life: 0.25 + Math.random() * 0.3, size: 0.18, size1: 0.02, r: color[0], g: color[1], b: color[2], grav: 14, drag: 2,
      });
    }
  }
  blood(p, dir, n = 10) {
    for (let i = 0; i < n; i++) {
      this.norm.spawn({
        x: p.x, y: p.y, z: p.z,
        vx: (dir?.x || 0) * 4 + (Math.random() - 0.5) * 3, vy: 1.5 + Math.random() * 3, vz: (dir?.z || 0) * 4 + (Math.random() - 0.5) * 3,
        life: 0.4 + Math.random() * 0.3, size: 0.22, size1: 0.1, r: 0.45, g: 0.03, b: 0.03, grav: 12, drag: 1, alpha: 0.9,
      });
    }
  }
  dust(p, n = 6, spread = 0.6, color = [0.45, 0.4, 0.33]) {
    for (let i = 0; i < n; i++) {
      this.norm.spawn({
        x: p.x + (Math.random() - 0.5) * spread, y: 0.1, z: p.z + (Math.random() - 0.5) * spread,
        vx: (Math.random() - 0.5) * 2, vy: 0.4 + Math.random() * 0.8, vz: (Math.random() - 0.5) * 2,
        life: 0.5 + Math.random() * 0.4, size: 0.4, size1: 1.0, r: color[0], g: color[1], b: color[2], drag: 3, alpha: 0.35,
      });
    }
  }
  ember(p, spread = 0.4, up = 1.5, scale = 1) {
    this.add.spawn({
      x: p.x + (Math.random() - 0.5) * spread, y: p.y, z: p.z + (Math.random() - 0.5) * spread,
      vx: (Math.random() - 0.5) * 0.6, vy: up * (0.6 + Math.random() * 0.8), vz: (Math.random() - 0.5) * 0.6,
      life: 0.6 + Math.random() * 0.9, size: 0.14 * scale, size1: 0.02, r: 1, g: 0.45 + Math.random() * 0.3, b: 0.1,
    });
  }
  flame(p, s = 1) {
    this.add.spawn({
      x: p.x + (Math.random() - 0.5) * 0.3 * s, y: p.y, z: p.z + (Math.random() - 0.5) * 0.3 * s,
      vx: (Math.random() - 0.5) * 0.4, vy: 1.2 + Math.random() * 1.2, vz: (Math.random() - 0.5) * 0.4,
      life: 0.35 + Math.random() * 0.3, size: 0.55 * s, size1: 0.1, r: 1, g: 0.42 + Math.random() * 0.2, b: 0.08, alpha: 0.8,
    });
  }
  heal(p) {
    for (let i = 0; i < 3; i++) {
      const a = Math.random() * Math.PI * 2;
      this.add.spawn({
        x: p.x + Math.cos(a) * 0.5, y: 0.2 + Math.random() * 0.5, z: p.z + Math.sin(a) * 0.5, vy: 1.5 + Math.random(),
        life: 0.8, size: 0.18, size1: 0.04, r: 1, g: 0.75, b: 0.35,
      });
    }
  }
  burst(p, n, color, speed = 6, life = 0.9, size = 0.3) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, e = Math.random() * 1.2;
      this.add.spawn({
        x: p.x, y: p.y, z: p.z, vx: Math.cos(a) * speed * Math.cos(e), vy: Math.sin(e) * speed, vz: Math.sin(a) * speed * Math.cos(e),
        life: life * (0.5 + Math.random() * 0.5), size, size1: 0.02, r: color[0], g: color[1], b: color[2], drag: 2.5,
      });
    }
  }

  // ground telegraph circle that fills up until `dur`, then vanishes
  telegraph(x, z, radius, dur, color = 0xff3a1a) {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.RingGeometry(radius * 0.94, radius, 40),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, depthWrite: false }));
    const fill = new THREE.Mesh(new THREE.CircleGeometry(radius, 40),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, depthWrite: false }));
    ring.rotation.x = fill.rotation.x = -Math.PI / 2;
    g.add(ring, fill); g.position.set(x, 0.04, z);
    this.scene.add(g);
    const d = { obj: g, t: 0, dur, kind: 'tele', fill, ring };
    this.decals.push(d);
    return d;
  }
  shockwave(x, z, radius, color = 0xffa040, dur = 0.45) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 48),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.06, z);
    this.scene.add(m);
    this.decals.push({ obj: m, t: 0, dur, kind: 'wave', radius });
  }
  scorch(x, z, r) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 20),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.03, z);
    this.scene.add(m);
    this.decals.push({ obj: m, t: 0, dur: 4, kind: 'scorch' });
  }

  addShake(a) { this.shake = Math.min(1.2, Math.max(this.shake, a)); }

  update(dt) {
    this.add.update(dt); this.norm.update(dt);
    this.shake = Math.max(0, this.shake - dt * 2.8);
    this.shakeT += dt;
    this.decals = this.decals.filter((d) => {
      d.t += dt;
      const k = d.t / d.dur;
      if (k >= 1 || d.dead) { this.scene.remove(d.obj); d.obj.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); }); return false; }
      if (d.kind === 'tele') {
        d.fill.scale.setScalar(Math.max(0.01, k));
        d.ring.material.opacity = 0.5 + 0.4 * Math.sin(d.t * 20);
      } else if (d.kind === 'wave') {
        d.obj.scale.setScalar(d.radius * (0.2 + 0.8 * Math.sqrt(k)));
        d.obj.material.opacity = 0.8 * (1 - k);
      } else if (d.kind === 'scorch') {
        d.obj.material.opacity = 0.45 * (1 - k * k);
      }
      return true;
    });
  }
  shakeOffset(out) {
    const s = this.shake * this.shake * 0.35, t = this.shakeT * 60;
    out.set(Math.sin(t * 1.1) * s, Math.sin(t * 1.7 + 1) * s * 0.6, Math.cos(t * 1.3) * s);
    return out;
  }
  clear() {
    this.add.clear(); this.norm.clear();
    for (const d of this.decals) d.dead = true;
  }
}
