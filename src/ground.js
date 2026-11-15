// Textured ground: four tiling pixel-art textures drawn in code (flagstones, packed dirt, grass sod, cobbles), blended
// over the ground mesh by per-vertex weights (`splat`: flag, dirt, grass, cobble). Where two meet, each texture's
// own height (its alpha: a stone stands proud of its mortar, a tuft of the soil) decides which shows, so the seams are
// crisp, pixel-sharp and ragged instead of smeared. Everything is shaded as before (Lambert, flat): the vertex colour
// still darkens and lightens it, and the pixel pass on top makes it read as hand-drawn.
// A map paints where each goes (world.paint: a rect or a circle of one surface, with a ragged edge); the ground style
// gives the base (GROUND[...].tex).
import * as THREE from 'three';

const PX = 64, TILE = 4; // each texture is 64 px over 4 m (16 px to the metre, about the pixel pass's own scale)
export const SURFACES = ['flag', 'dirt', 'grass', 'cobble'];

// ---------- drawing the textures (seeded, so they're the same every time) ----------
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const hex = (c) => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
function canvas() { const cv = document.createElement('canvas'); cv.width = cv.height = PX; const c = cv.getContext('2d'); return { cv, c, img: c.createImageData(PX, PX) }; }
// a tiling value noise 0..1 at a period of `per` cells across the tile
function tileNoise(r, per) {
  const g = Array.from({ length: per * per }, () => r());
  return (x, y) => {
    const fx = (x / PX) * per, fy = (y / PX) * per, i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j;
    const at = (a, b) => g[((b % per + per) % per) * per + ((a % per + per) % per)];
    const s = (t) => t * t * (3 - 2 * t);
    return (at(i, j) * (1 - s(u)) + at(i + 1, j) * s(u)) * (1 - s(v)) + (at(i, j + 1) * (1 - s(u)) + at(i + 1, j + 1) * s(u)) * s(v);
  };
}
function put(img, x, y, rgb, a = 255, k = 1) {
  x = ((x % PX) + PX) % PX; y = ((y % PX) + PX) % PX;
  const i = (y * PX + x) * 4; img.data[i] = rgb[0] * k; img.data[i + 1] = rgb[1] * k; img.data[i + 2] = rgb[2] * k; img.data[i + 3] = a;
}

// worn flagstones: courses of uneven slabs in dark mortar, each slab its own shade, cracked and chipped
function drawFlag() {
  const r = rng(0xf1a6), { cv, c, img } = canvas(), n = tileNoise(r, 8);
  const rows = [13, 11, 14, 12, 14]; let y0 = 0;
  const shades = [0x6e6961, 0x66615a, 0x5d5953, 0x736c62, 0x625c55];
  for (const h of rows) {
    let x0 = Math.floor(r() * 20);
    const start = x0;
    while (x0 < start + PX) {
      const w = Math.min(start + PX - x0, 11 + Math.floor(r() * 14));
      const col = hex(shades[Math.floor(r() * shades.length)]), dip = 0.9 + r() * 0.16;
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
        const edge = y === y0 || x === x0;
        const nn = n(x, y), grain = (r() - 0.5) * 0.08;
        const k = edge ? 0.42 : dip * (0.88 + nn * 0.2 + grain) * (y === y0 + 1 || x === x0 + 1 ? 1.08 : 1) * (y === y0 + h - 1 ? 0.9 : 1);
        put(img, x, y, edge ? hex(0x2a2622) : col, edge ? 40 : 190 + Math.floor(nn * 60), k);
      }
      // a crack wandering across the odd slab, a chipped corner
      if (r() < 0.45) { let cx = x0 + 2 + Math.floor(r() * (w - 4)), cy = y0 + 1; for (let s = 0; s < h - 2; s++) { put(img, cx, cy, hex(0x2e2a26), 60, 1); cy++; cx += r() < 0.3 ? 1 : r() < 0.3 ? -1 : 0; } }
      if (r() < 0.35) { put(img, x0 + 1, y0 + 1, hex(0x2a2622), 40); put(img, x0 + 2, y0 + 1, hex(0x3a3530), 60); put(img, x0 + 1, y0 + 2, hex(0x3a3530), 60); }
      x0 += w;
    }
    y0 += h;
  }
  c.putImageData(img, 0, 0); return cv;
}
// packed dirt: grey-brown earth, darker damp blotches, pebbles and grit
function drawDirt() {
  const r = rng(0xd187), { cv, c, img } = canvas(), n = tileNoise(r, 6), m = tileNoise(r, 16);
  const base = hex(0x4c4238), dark = hex(0x3a322b);
  for (let y = 0; y < PX; y++) for (let x = 0; x < PX; x++) {
    const a = n(x, y), b = m(x, y), k = 0.86 + b * 0.22 + (r() - 0.5) * 0.06;
    put(img, x, y, a > 0.62 ? dark : base, 70 + Math.floor(b * 90), k);
  }
  for (let i = 0; i < 70; i++) { const x = Math.floor(r() * PX), y = Math.floor(r() * PX), lt = r() < 0.6; put(img, x, y, hex(lt ? 0x7a7062 : 0x2c2620), 150); if (r() < 0.3) put(img, x + 1, y, hex(lt ? 0x6a6054 : 0x2c2620), 140); }
  c.putImageData(img, 0, 0); return cv;
}
// grass sod: sickly greens in short strokes, yellowed and dead blades through it, dark soil between
function drawGrass() {
  const r = rng(0x9a55), { cv, c, img } = canvas(), n = tileNoise(r, 5);
  for (let y = 0; y < PX; y++) for (let x = 0; x < PX; x++) put(img, x, y, hex(0x2f3520), 120, 0.9 + n(x, y) * 0.2);
  const cols = [0x4c5a28, 0x56632c, 0x5f6a30, 0x46522a, 0x6e6e34, 0x7a7038, 0x5a4c2c];
  for (let i = 0; i < 900; i++) {
    const x = Math.floor(r() * PX), y = Math.floor(r() * PX), len = 1 + Math.floor(r() * 3), col = hex(cols[Math.floor(r() * (n(x, y) > 0.55 ? cols.length : 4))]);
    for (let s = 0; s < len; s++) put(img, x, y - s, col, 200 + s * 18, 1 - s * 0.06 + (s === len - 1 ? 0.1 : 0));
  }
  c.putImageData(img, 0, 0); return cv;
}
// cobbles: rounded setts packed in dark grit, lit on their upper edge, moss in some gaps
function drawCobble() {
  const r = rng(0xc0bb), { cv, c, img } = canvas();
  for (let y = 0; y < PX; y++) for (let x = 0; x < PX; x++) put(img, x, y, hex(r() < 0.12 ? 0x3e4622 : 0x26221e), 30);
  const shades = [0x5e5952, 0x67615a, 0x55504a, 0x6c665c];
  for (let gy = 0; gy < 8; gy++) for (let gx = 0; gx < 8; gx++) {
    const cx = gx * 8 + 4 + (gy % 2) * 4 + Math.floor((r() - 0.5) * 2), cy = gy * 8 + 4 + Math.floor((r() - 0.5) * 2), rx = 3.1 + r() * 0.8, ry = 2.8 + r() * 0.8;
    const col = hex(shades[Math.floor(r() * shades.length)]);
    for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) {
      const d = (x * x) / (rx * rx) + (y * y) / (ry * ry);
      if (d > 1) continue;
      const k = 0.85 + (1 - d) * 0.25 + (y < -1 ? 0.12 : y > 1 ? -0.12 : 0);
      put(img, cx + x, cy + y, col, 140 + Math.floor((1 - d) * 115), k);
    }
  }
  c.putImageData(img, 0, 0); return cv;
}

let TEX = null;
function textures() {
  if (TEX) return TEX;
  TEX = [drawFlag(), drawDirt(), drawGrass(), drawCobble()].map((cv) => {
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
  return TEX;
}

// the textured ground's material: Lambert as before, its colour times the blended textures
let MAT = null;
export function groundMaterial() {
  if (MAT) return MAT;
  const T = textures();
  MAT = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  MAT.onBeforeCompile = (sh) => {
    sh.uniforms.tFlag = { value: T[0] }; sh.uniforms.tDirt = { value: T[1] }; sh.uniforms.tGrass = { value: T[2] }; sh.uniforms.tCobble = { value: T[3] };
    sh.vertexShader = 'attribute vec4 splat;\nvarying vec4 vSplat;\nvarying vec2 vGXZ;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvSplat = splat; vGXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
    sh.fragmentShader = 'uniform sampler2D tFlag, tDirt, tGrass, tCobble;\nvarying vec4 vSplat;\nvarying vec2 vGXZ;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      {
        vec2 uv = vGXZ / ${TILE.toFixed(1)};
        vec4 a = texture2D(tFlag, uv), b = texture2D(tDirt, uv * 1.0 + vec2(0.37, 0.11)), c = texture2D(tGrass, uv + vec2(0.13, 0.71)), d = texture2D(tCobble, uv * 1.6);
        // height blend: each surface's weight lifted by its own texture height; only those near the top show
        vec4 s = vSplat * (0.35 + vec4(a.a, b.a, c.a, d.a));
        float m = max(max(s.x, s.y), max(s.z, s.w));
        vec4 w = max(s - (m - 0.08), 0.0); w /= max(w.x + w.y + w.z + w.w, 1e-4);
        vec3 tex = a.rgb * w.x + b.rgb * w.y + c.rgb * w.z + d.rgb * w.w;
        diffuseColor.rgb *= tex * 2.3;
      }`);
  };
  MAT.customProgramCacheKey = () => 'ground-splat';
  return MAT;
}

// ---------- where each surface goes ----------
// one surface over a rect or a circle (world coords), with a ragged edge `edge` metres wide; amount 0..1
export function paintAt(paints, x, z, base) {
  const w = base.slice();
  for (const p of paints) {
    let d; // distance inside the shape's edge (positive inside)
    if (p.r != null) d = p.r - Math.hypot(x - p.cx, z - p.cz);
    else d = Math.min(x - p.x0, p.x1 - x, z - p.z0, p.z1 - z);
    const e = p.edge ?? 1.2, rag = (Math.sin(x * 1.7 + z * 0.9) * 0.5 + Math.sin(x * 0.53 - z * 1.31) * 0.5) * e * 0.6;
    const c = Math.max(0, Math.min(1, (d + rag) / e + 0.5)) * (p.amount ?? 1);
    if (c <= 0) continue;
    const i = SURFACES.indexOf(p.surface);
    for (let k = 0; k < 4; k++) w[k] = w[k] * (1 - c) + (k === i ? c : 0);
  }
  return w;
}
