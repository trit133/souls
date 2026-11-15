// What grows back over the ruins, and what lies on the ground: grass tufts and weeds that sway, ivy down the faces of
// terraces, bushes, sickly trees, fallen leaves, pebbles and puddles. Grass and weeds follow the textured ground
// (ground.js): tufts where it's grass, a weed in the odd crack of the flagstones and cobbles. The rest a map asks
// for (world.flora). All of it is visual: nothing here blocks or slows, except a tree's trunk.
// Each kind is one instanced mesh (thousands cost one draw), shaded flat like everything else; the pixel pass on
// top turns them into pixel art.
import * as THREE from 'three';
import { paintAt } from './ground.js';

export const FLORA_TIME = { value: 0 }; // (the wind's clock: world.update)
const vh = (x, z, k = 0) => { const v = Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453; return v - Math.floor(v); };

// ---------- the pieces ----------
// a tuft: seven blades fanning out from a point, leaning outward, base 0.05 wide, about 0.4 tall at scale 1
function tuftGeo(blades = 7) {
  const p = [];
  for (let i = 0; i < blades; i++) {
    const a = (i / blades) * Math.PI * 2 + (i % 2) * 0.4, r = 0.04 + (i % 3) * 0.03, h = 0.26 + ((i * 37) % 7) * 0.025, lean = 0.08 + (i % 4) * 0.03;
    const cx = Math.cos(a) * r, cz = Math.sin(a) * r, px = -Math.sin(a) * 0.025, pz = Math.cos(a) * 0.025;
    p.push(cx - px, 0, cz - pz, cx + px, 0, cz + pz, cx + Math.cos(a) * lean, h, cz + Math.sin(a) * lean);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.computeVertexNormals();
  // normals straight up: lit like the ground they grow from, never black on their shady side
  const n = g.attributes.normal; for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
  return g;
}
// a leaf: a little diamond (ivy, fallen leaves)
function leafGeo(s = 0.12) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, -s / 2, 0, s * 0.42, 0, 0, 0, s / 2, 0, 0, -s / 2, 0, 0, s / 2, 0, -s * 0.42, 0, 0], 3));
  g.computeVertexNormals(); return g;
}
// grass that sways: the top of each blade moves with a slow wind and a quicker flutter, each tuft out of step
function swayMat() {
  const m = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uWind = FLORA_TIME;
    sh.vertexShader = 'uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      { vec4 ip = instanceMatrix[3]; float k = position.y * 2.4;
        float s = sin(uWind * 1.5 + ip.x * 0.55 + ip.z * 0.4) * 0.07 + sin(uWind * 3.7 + ip.x * 1.9 - ip.z * 1.3) * 0.025;
        transformed.x += s * k; transformed.z += s * 0.5 * k; }`);
  };
  m.customProgramCacheKey = () => 'flora-sway';
  return m;
}
const GRASS = [0x3e4c22, 0x465426, 0x38461f, 0x4e5a28, 0x42502a, 0x56582a, 0x4a4426]; // sickly greens, the odd yellowed and dead tuft
const WEED = [0x56602a, 0x606630, 0x4a5626, 0x6a6434];
const IVY = [0x2e3f22, 0x34482a, 0x3c5230, 0x2a3820, 0x4a5a2c];
const LEAF = [0x6a4a24, 0x7a5a2a, 0x5a3e20, 0x6e6a30, 0x4a3a22, 0x8a6a34];
const BUSH = [0x34442a, 0x3c4c2e, 0x2e3a24, 0x485430, 0x4a4228];
const PEBBLE = [0x6a6560, 0x5a5650, 0x4c4844, 0x7a746a];

class Batch {
  constructor(geo, mat, max) { this.mesh = new THREE.InstancedMesh(geo, mat, max); this.n = 0; this.max = max; this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.e = new THREE.Euler(); this.c = new THREE.Color(); this.mesh.userData.noMerge = true; }
  add(x, y, z, rx, ry, rz, s, color, sy = s) {
    if (this.n >= this.max) return;
    this.m.compose(new THREE.Vector3(x, y, z), this.q.setFromEuler(this.e.set(rx, ry, rz)), new THREE.Vector3(s, sy, s));
    this.mesh.setMatrixAt(this.n, this.m); this.mesh.setColorAt(this.n, this.c.setHex(color)); this.n++;
  }
  done(group) { if (!this.n) return; this.mesh.count = this.n; this.mesh.instanceMatrix.needsUpdate = true; if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true; group.add(this.mesh); }
}

// ---------- growing it ----------
// over a module's ground: tufts where it's grass, weeds in the cracks, ivy down the terraces' faces, then what the
// map asked for (w.flora: bushes, trees, leaves, puddles, pebbles)
export function growFlora(w, m, st) { // m: the patch { x0, x1, z0, z1, group }
  const TX = st.tex; if (!TX) return;
  const sway = swayMat(), flat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, flatShading: true });
  const grass = new Batch(tuftGeo(7), sway, 9000), weeds = new Batch(tuftGeo(5), sway, 2000);
  const ivy = new Batch(leafGeo(0.13), flat, 6000), leaves = new Batch(leafGeo(0.09), flat, 3000);
  const bush = new Batch(new THREE.IcosahedronGeometry(0.34, 0), new THREE.MeshLambertMaterial({ flatShading: true }), 600);
  const pebble = new Batch(new THREE.DodecahedronGeometry(0.06, 0), new THREE.MeshLambertMaterial({ flatShading: true }), 1500);
  const T = w.terrain, { x0, x1, z0, z1 } = m;
  const groundAt = (x, z) => { const inside = w.area(x, z, -0.6), f = T.floorAt(x, z); return { inside, y: inside ? f : f + w.heightAt(x, z, st) - 0.04 }; };
  const steep = (x, z) => { const h = T.floorAt(x, z); return Math.abs(T.floorAt(x + 0.3, z) - h) > 0.3 || Math.abs(T.floorAt(x - 0.3, z) - h) > 0.3 || Math.abs(T.floorAt(x, z + 0.3) - h) > 0.3 || Math.abs(T.floorAt(x, z - 0.3) - h) > 0.3; };
  // grass and weeds, on a jittered 0.4 m grid
  for (let z = z0; z < z1; z += 0.4) for (let x = x0; x < x1; x += 0.4) {
    const jx = x + (vh(x, z, 1) - 0.5) * 0.4, jz = z + (vh(x, z, 2) - 0.5) * 0.4;
    const G = groundAt(jx, jz), sp = paintAt(w.paints, jx, jz, G.inside ? TX.walk : TX.out);
    if (steep(jx, jz) || w.blocked(jx, jz, 0.1)) continue;
    const r = vh(jx, jz, 3), clump = 0.55 + 0.45 * Math.sin(jx * 0.9 + jz * 0.7) * Math.sin(jx * 0.31 - jz * 0.43);
    if (sp[2] > 0.45 && r < sp[2] * 0.85 * clump) {
      const s = 0.7 + vh(jx, jz, 4) * 0.8;
      grass.add(jx, G.y, jz, 0, vh(jx, jz, 5) * 6.28, 0, s, GRASS[Math.floor(vh(jx, jz, 6) * GRASS.length)], s * (0.8 + vh(jx, jz, 7) * 0.6));
    } else if ((sp[0] + sp[3]) > 0.5 && r < 0.035) {
      // a weed in a crack
      const s = 0.45 + vh(jx, jz, 4) * 0.4;
      weeds.add(jx, G.y, jz, 0, vh(jx, jz, 5) * 6.28, 0, s, WEED[Math.floor(vh(jx, jz, 6) * WEED.length)]);
    } else if (sp[1] > 0.5 && r < 0.05) {
      pebble.add(jx, G.y + 0.02, jz, vh(jx, jz, 8) * 3, vh(jx, jz, 9) * 3, 0, 0.6 + vh(jx, jz, 4) * 1.2, PEBBLE[Math.floor(vh(jx, jz, 6) * PEBBLE.length)], 0.5);
    }
  }
  // ivy: falling down the faces of terraces from their coping, in strands
  for (const F of T.faces || []) {
    if (F.z < z0 || F.z >= z1 || F.x < x0 || F.x >= x1 || vh(F.x, F.z, 11) > (F.ivy ?? 0.32)) continue;
    const strands = 1 + Math.floor(vh(F.x, F.z, 12) * 3);
    for (let k = 0; k < strands; k++) {
      const along = (vh(F.x, F.z, 13 + k) - 0.5) * F.w, len = (F.top - F.low) * (0.35 + vh(F.x, F.z, 20 + k) * 0.65);
      for (let d = 0.05; d < len; d += 0.07) {
        const wob = Math.sin(d * 5 + k) * 0.08 + (vh(F.x + d, F.z, 30 + k) - 0.5) * 0.12, spread = (1 - d / len) * 0.18 + 0.05;
        for (let q = 0; q < 2; q++) {
          const o = along + wob + (vh(F.x, F.z + d, 40 + q) - 0.5) * spread * 2;
          const px = F.x + (F.ax === 'x' ? o : 0) + F.nx * 0.03, pz = F.z + (F.ax === 'z' ? o : 0) + F.nz * 0.03;
          ivy.add(px, F.top - d, pz, (vh(px, d, 41) - 0.5) * 0.8, Math.atan2(F.nx, F.nz), (vh(px, d, 42) - 0.5) * 1.6, 0.8 + vh(px, d, 43) * 0.6, IVY[Math.floor(vh(px, d, 44) * IVY.length)]);
        }
      }
      // and a cushion of it along the coping
      for (let s = -0.3; s <= 0.3; s += 0.1) {
        const px = F.x + (F.ax === 'x' ? along + s : F.nx * -0.05), pz = F.z + (F.ax === 'z' ? along + s : F.nz * -0.05);
        ivy.add(px, F.top + 0.07, pz, -Math.PI / 2 + (vh(px, pz, 45) - 0.5) * 0.6, vh(px, pz, 46) * 6, 0, 0.9, IVY[Math.floor(vh(px, pz, 47) * IVY.length)]);
      }
    }
  }
  // what the map asked for
  for (const P of w.flora || []) {
    if (P.z < z0 || P.z >= z1 || P.x < x0 || P.x >= x1) continue;
    const y0 = T.floorAt(P.x, P.z);
    if (P.kind === 'bush') {
      const n = P.n ?? 4;
      for (let i = 0; i < n; i++) {
        const a = vh(P.x, P.z, i) * 6.28, r = (P.r ?? 0.7) * Math.sqrt(vh(P.x, P.z, i + 9)), s = (P.s ?? 1) * (0.7 + vh(P.x, P.z, i + 20) * 0.6);
        const x = P.x + Math.cos(a) * r, z = P.z + Math.sin(a) * r;
        bush.add(x, y0 + 0.18 * s, z, vh(x, z, 1) * 3, vh(x, z, 2) * 3, 0, s, BUSH[Math.floor(vh(x, z, 3) * BUSH.length)], s * 0.8);
      }
      for (let i = 0; i < 10; i++) { const a = vh(P.x, P.z, i + 40) * 6.28, r = 0.3 + vh(P.x, P.z, i + 50) * 1.0; grass.add(P.x + Math.cos(a) * r, y0, P.z + Math.sin(a) * r, 0, a, 0, 1.1, GRASS[i % GRASS.length]); }
    } else if (P.kind === 'leaves') {
      for (let i = 0; i < (P.n ?? 60); i++) {
        const a = vh(P.x, P.z, i) * 6.28, r = (P.r ?? 2) * Math.sqrt(vh(P.x, P.z, i + 100)), x = P.x + Math.cos(a) * r, z = P.z + Math.sin(a) * r;
        leaves.add(x, T.floorAt(x, z) + 0.02, z, -Math.PI / 2, vh(x, z, 3) * 6, 0, 0.8 + vh(x, z, 4) * 0.6, LEAF[Math.floor(vh(x, z, 5) * LEAF.length)]);
      }
    } else if (P.kind === 'puddle') puddle(w, P.x, y0, P.z, P.r ?? 0.9);
    else if (P.kind === 'tree') tree(w, P.x, y0, P.z, P.s ?? 1, P.dead);
  }
  for (const B of [grass, weeds, ivy, leaves, bush, pebble]) B.done(m.group);
}

// a puddle: still black water with a pale rim of wet grit
function puddle(w, x, y, z, r) {
  const seg = 11, pts = [];
  for (let i = 0; i < seg; i++) { const a = (i / seg) * Math.PI * 2, rr = r * (0.7 + vh(x + i, z, 1) * 0.5); pts.push(new THREE.Vector2(Math.cos(a) * rr, Math.sin(a) * rr)); }
  const sh = new THREE.Shape(pts);
  const rim = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshLambertMaterial({ color: 0x2c2a26, flatShading: true }));
  rim.rotation.x = -Math.PI / 2; rim.position.set(x, y + 0.015, z); rim.scale.setScalar(1.12); w.add(rim);
  const water = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshPhongMaterial({ color: 0x141a1c, specular: 0x8a9aa0, shininess: 60, flatShading: true }));
  water.rotation.x = -Math.PI / 2; water.position.set(x, y + 0.025, z); water.userData.noMerge = true; w.add(water);
}
// a tree that's still alive, barely: a crooked trunk, a few limbs, clumps of sickly leaves (or bare, dead)
function tree(w, x, y, z, s, dead) {
  const M = w.mats, bark = new THREE.MeshLambertMaterial({ color: 0x3a2e24, flatShading: true }), g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.26 * s, 3.2 * s, 6), bark); trunk.position.y = 1.6 * s; trunk.rotation.z = 0.08; g.add(trunk);
  const limbs = [[0.6, 2.2, 0.9], [-0.7, 2.6, -0.5], [0.2, 3.0, -0.8], [-0.4, 1.9, 0.7]];
  for (const [lx, ly, lz] of limbs) {
    const L = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * s, 0.09 * s, 1.3 * s, 5), bark);
    L.position.set(lx * 0.5 * s, ly * s, lz * 0.5 * s); L.rotation.set(lz * 0.9, 0, -lx * 0.9); g.add(L);
  }
  if (!dead) {
    const greens = [0x3a4a28, 0x44522c, 0x4e5a30, 0x3e4426];
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9, r = 0.5 + (i % 3) * 0.35, blob = new THREE.Mesh(new THREE.IcosahedronGeometry((0.55 + (i % 2) * 0.25) * s, 0), new THREE.MeshLambertMaterial({ color: greens[i % greens.length], flatShading: true }));
      blob.position.set(Math.cos(a) * r * s, (2.7 + (i % 3) * 0.35) * s, Math.sin(a) * r * s); blob.rotation.set(i, i * 2, 0); g.add(blob);
    }
  }
  g.position.set(x, y, z); g.rotation.y = vh(x, z, 1) * 6; w.add(g);
  w.ob(x, z, 0.35 * s);
}
