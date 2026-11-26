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
// the sets of four a ground can blend (a style picks one: GROUND[...].tex.set): out in the open, and underground
// (no grass down there: old tiles, brick paving, wet grime, flagstones)
// and below the Glass Wastes (region 2, the Sunless Deep): cave rock, ore gravel, cave moss and plank walkways in the
// upper caves; carved flagstones, gravel, moss and seer-glass crystal in Glasshallow; basalt, cooled lava crust, ash
// gravel and obsidian at the bottom
export const TEXSETS = { surface: SURFACES, under: ['tile', 'grime', 'brick', 'flag'], cave: ['rock', 'gravel', 'moss', 'boards'], glass: ['flag', 'gravel', 'moss', 'crystal'], deep: ['basalt', 'crust', 'gravel', 'obsidian'] };

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

// old floor tiles: half-metre squares in grout, glazed in greys and a faded green, cracked, stained, the odd one gone
function drawTile() {
  const r = rng(0x711e), { cv, c, img } = canvas(), n = tileNoise(r, 6);
  const shades = [0x6c6860, 0x625e57, 0x726b61, 0x56605a, 0x5c5850];
  for (let ty = 0; ty < 8; ty++) for (let tx = 0; tx < 8; tx++) {
    const gone = r() < 0.06, col = hex(shades[Math.floor(r() * shades.length)]), k0 = 0.9 + r() * 0.16, crack = r() < 0.2;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const px = tx * 8 + x, py = ty * 8 + y, grout = x === 0 || y === 0, nn = n(px, py);
      if (gone) { put(img, px, py, hex(0x24201c), 30, 0.8 + nn * 0.4); continue; }
      put(img, px, py, grout ? hex(0x2c2824) : col, grout ? 45 : 200 + Math.floor(nn * 50), grout ? 1 : k0 * (0.9 + nn * 0.18) * (x === 1 || y === 1 ? 1.1 : 1) * (x === 7 || y === 7 ? 0.88 : 1));
    }
    if (crack && !gone) { let cx = tx * 8 + 2 + Math.floor(r() * 4), cy = ty * 8 + 1; for (let k = 0; k < 6; k++) { put(img, cx, cy, hex(0x2a2622), 60); cy++; cx += r() < 0.4 ? (r() < 0.5 ? 1 : -1) : 0; } }
  }
  // stains seeping across the tiles
  for (let y = 0; y < PX; y++) for (let x = 0; x < PX; x++) if (n(x * 2, y * 2) > 0.72) { const i = (y * PX + x) * 4; for (let q = 0; q < 3; q++) img.data[i + q] *= 0.78; }
  c.putImageData(img, 0, 0); return cv;
}
// brick paving: courses of small bricks in a running bond, sooty and worn, mortar dark
function drawBrick() {
  const r = rng(0xb41c), { cv, c, img } = canvas(), n = tileNoise(r, 5);
  const shades = [0x5c3c30, 0x664434, 0x52362c, 0x6a4a3a, 0x483028];
  for (let row = 0; row < 16; row++) {
    const off = (row % 2) * 6;
    for (let bx = -1; bx < 6; bx++) {
      const col = hex(shades[Math.floor(r() * shades.length)]), k0 = 0.85 + r() * 0.2;
      for (let y = 0; y < 4; y++) for (let x = 0; x < 12; x++) {
        const px = bx * 12 + off + x, py = row * 4 + y, mortar = x === 0 || y === 0, nn = n(((px % PX) + PX) % PX, py);
        put(img, px, py, mortar ? hex(0x262220) : col, mortar ? 40 : 180 + Math.floor(nn * 70), mortar ? 1 : k0 * (0.86 + nn * 0.24) * (y === 1 ? 1.08 : 1));
      }
    }
  }
  c.putImageData(img, 0, 0); return cv;
}
// wet grime: dark stone gone black with damp, a sheen on it, grit and broken bits
function drawGrime() {
  const r = rng(0x9e1e), { cv, c, img } = canvas(), n = tileNoise(r, 7), m = tileNoise(r, 18);
  for (let y = 0; y < PX; y++) for (let x = 0; x < PX; x++) {
    const a = n(x, y), b = m(x, y), wet = a > 0.6;
    put(img, x, y, hex(wet ? 0x22262a : 0x302c27), 60 + Math.floor(b * 100), (0.85 + b * 0.25) * (wet && b > 0.7 ? 1.35 : 1));
  }
  for (let i = 0; i < 60; i++) { const x = Math.floor(r() * PX), y = Math.floor(r() * PX); put(img, x, y, hex(r() < 0.5 ? 0x5a554c : 0x1a1816), 150); }
  c.putImageData(img, 0, 0); return cv;
}
// ---------- the Sunless Deep's (region 2) ----------
// cave rock: a floor of the living rock, worn smooth in places, strata and cracks, darker hollows
function drawRock() {
  const r = rng(0x70c1), { cv, c, img } = canvas(), n = tileNoise(r, 5), m = tileNoise(r, 13);
  for (let y = 0; y < PX; y++) for (let x = 0; x < PX; x++) {
    const a = n(x, y), b = m(x, y), strata = Math.sin((y + a * 14) * 0.45) > 0.86;
    put(img, x, y, hex(0x4a4540), 110 + Math.floor(b * 120), (0.86 + a * 0.16 + b * 0.12) * (strata ? 0.82 : 1));
  }
  for (let k = 0; k < 7; k++) { let x = Math.floor(r() * PX), y = Math.floor(r() * PX); for (let s = 0; s < 10 + r() * 10; s++) { put(img, x, y, hex(0x221e1a), 50); x += r() < 0.5 ? 1 : 0; y += r() < 0.6 ? 1 : -1; } }
  c.putImageData(img, 0, 0); return cv;
}
// ore gravel: loose grit and chippings, rust and slate, the odd glint of seer-glass
function drawGravel() {
  const r = rng(0x9a7e), { cv, c, img } = canvas(), n = tileNoise(r, 9);
  for (let y = 0; y < PX; y++) for (let x = 0; x < PX; x++) put(img, x, y, hex(0x3a3430), 60, 0.85 + n(x, y) * 0.25);
  const cols = [0x5a524a, 0x6a6058, 0x4a4440, 0x6e4e36, 0x544c46, 0x7a7068];
  for (let i = 0; i < 520; i++) {
    const x = Math.floor(r() * PX), y = Math.floor(r() * PX), col = hex(cols[Math.floor(r() * cols.length)]), big = r() < 0.3;
    put(img, x, y, col, 170 + Math.floor(r() * 80), 1.1); if (big) { put(img, x + 1, y, col, 190, 0.95); put(img, x, y + 1, col, 160, 0.8); }
  }
  for (let i = 0; i < 10; i++) put(img, Math.floor(r() * PX), Math.floor(r() * PX), hex(0x9ad8e8), 255, 1); // (seer-glass glints)
  c.putImageData(img, 0, 0); return cv;
}
// cave moss: pale grey-green cushions on black soil, a few tiny pale caps
function drawMoss() {
  const r = rng(0x3055), { cv, c, img } = canvas(), n = tileNoise(r, 6), m = tileNoise(r, 16);
  for (let y = 0; y < PX; y++) for (let x = 0; x < PX; x++) {
    const a = n(x, y), b = m(x, y);
    put(img, x, y, hex(a > 0.45 ? (b > 0.5 ? 0x5a6a52 : 0x4a5a46) : 0x22241e), a > 0.45 ? 170 + Math.floor(b * 85) : 90, 0.85 + b * 0.3);
  }
  for (let i = 0; i < 26; i++) { const x = Math.floor(r() * PX), y = Math.floor(r() * PX); put(img, x, y, hex(r() < 0.5 ? 0xb8d0b0 : 0x8adcd0), 240); }
  c.putImageData(img, 0, 0); return cv;
}
// plank walkways: boards laid across, gaps between, nail heads, a rotten one here and there
function drawBoards() {
  const r = rng(0xb0a7), { cv, c, img } = canvas(), n = tileNoise(r, 4);
  for (let row = 0; row < 8; row++) {
    const col = hex([0x5a4434, 0x4e3a2c, 0x624a38, 0x463428][Math.floor(r() * 4)]), rot = r() < 0.1, k0 = 0.85 + r() * 0.2;
    for (let y = 0; y < 8; y++) for (let x = 0; x < PX; x++) {
      const py = row * 8 + y, gap = y === 0, nn = n(x, py);
      put(img, x, py, gap ? hex(0x1a1612) : rot ? hex(0x2e2620) : col, gap ? 30 : 190 + Math.floor(nn * 60), gap ? 1 : k0 * (0.85 + nn * 0.2 + Math.sin((x + row * 17) * 0.35) * 0.05));
    }
    for (const x of [6, 38]) put(img, x + (row % 2) * 12, row * 8 + 4, hex(0x8a8a90), 255);
  }
  c.putImageData(img, 0, 0); return cv;
}
// seer-glass crystal: a floor grown through with faceted crystal, violet and cyan, bright edges
function drawCrystal() {
  const r = rng(0xc275), { cv, c, img } = canvas(), n = tileNoise(r, 5);
  for (let y = 0; y < PX; y++) for (let x = 0; x < PX; x++) put(img, x, y, hex(0x2a2636), 80, 0.8 + n(x, y) * 0.3);
  for (let i = 0; i < 22; i++) {
    const cx = Math.floor(r() * PX), cy = Math.floor(r() * PX), s = 3 + Math.floor(r() * 5), col = hex(r() < 0.5 ? 0x8a6ad8 : 0x5ab8d8);
    for (let y = -s; y <= s; y++) for (let x = -s; x <= s; x++) {
      if (Math.abs(x) + Math.abs(y) > s) continue;
      const edge = Math.abs(x) + Math.abs(y) === s, lit = x + y < 0;
      put(img, cx + x, cy + y, edge ? hex(0x1a1624) : col, edge ? 120 : 200 + (s - Math.abs(x) - Math.abs(y)) * 8, edge ? 1 : lit ? 1.35 : 0.85);
    }
  }
  c.putImageData(img, 0, 0); return cv;
}
// basalt: black columnar rock in rough hexes, grey dust in the joints
function drawBasalt() {
  const r = rng(0xba5a), { cv, c, img } = canvas(), n = tileNoise(r, 8);
  for (let y = 0; y < PX; y++) for (let x = 0; x < PX; x++) {
    const gx = x + (Math.floor(y / 10) % 2) * 6, joint = gx % 12 === 0 || y % 10 === 0;
    put(img, x, y, hex(joint ? 0x4a4642 : 0x26221f), joint ? 50 : 160 + Math.floor(n(x, y) * 90), joint ? 1 : 0.85 + n(x, y) * 0.3);
  }
  c.putImageData(img, 0, 0); return cv;
}
// cooled lava crust: black wrinkled rock split by thin cracks still glowing orange
function drawCrust() {
  const r = rng(0xc705), { cv, c, img } = canvas(), n = tileNoise(r, 6), m = tileNoise(r, 14);
  for (let y = 0; y < PX; y++) for (let x = 0; x < PX; x++) {
    const a = n(x, y), b = m(x, y), crack = Math.abs(a - 0.5) < 0.03 || Math.abs(b - 0.55) < 0.02;
    put(img, x, y, hex(crack ? 0xff6a1a : 0x2a1e1a), crack ? 40 : 150 + Math.floor(b * 100), crack ? 1.6 : 0.8 + Math.sin(x * 0.7 + a * 9) * 0.12);
  }
  c.putImageData(img, 0, 0); return cv;
}
// obsidian: glassy black slabs with sharp pale glints
function drawObsidian() {
  const r = rng(0x0b51), { cv, c, img } = canvas(), n = tileNoise(r, 4);
  for (let y = 0; y < PX; y++) for (let x = 0; x < PX; x++) put(img, x, y, hex(0x16141a), 170 + Math.floor(n(x, y) * 80), 0.8 + n(x, y) * 0.5);
  for (let i = 0; i < 16; i++) { let x = Math.floor(r() * PX), y = Math.floor(r() * PX); for (let s = 0; s < 6; s++) { put(img, x, y, hex(0x8a90a8), 230, 1); x++; y--; } }
  c.putImageData(img, 0, 0); return cv;
}
const DRAW = { flag: drawFlag, dirt: drawDirt, grass: drawGrass, cobble: drawCobble, tile: drawTile, brick: drawBrick, grime: drawGrime,
  rock: drawRock, gravel: drawGravel, moss: drawMoss, boards: drawBoards, crystal: drawCrystal, basalt: drawBasalt, crust: drawCrust, obsidian: drawObsidian };
const TEXS = {};
function tex(name) {
  if (TEXS[name]) return TEXS[name];
  const t = new THREE.CanvasTexture(DRAW[name]());
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  return (TEXS[name] = t);
}

// the textured ground's material: Lambert as before, its colour times the blended textures
const MATS = {};
export function groundMaterial(set = 'surface') {
  if (MATS[set]) return MATS[set];
  const T = TEXSETS[set].map(tex);
  const MAT = (MATS[set] = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
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
  MAT.customProgramCacheKey = () => 'ground-splat-' + set;
  return MAT;
}

// ---------- where each surface goes ----------
// one surface over a rect or a circle (world coords), with a ragged edge `edge` metres wide; amount 0..1
export function paintAt(paints, x, z, base, names = SURFACES) {
  const w = base.slice();
  for (const p of paints) {
    const e0 = (p.edge ?? 1.2) * 1.2;
    if (p.r != null ? Math.abs(x - p.cx) > p.r + e0 || Math.abs(z - p.cz) > p.r + e0 : x < p.x0 - e0 || x > p.x1 + e0 || z < p.z0 - e0 || z > p.z1 + e0) continue; // (nowhere near it)
    let d; // distance inside the shape's edge (positive inside)
    if (p.r != null) d = p.r - Math.hypot(x - p.cx, z - p.cz);
    else d = Math.min(x - p.x0, p.x1 - x, z - p.z0, p.z1 - z);
    const e = p.edge ?? 1.2, rag = (Math.sin(x * 1.7 + z * 0.9) * 0.5 + Math.sin(x * 0.53 - z * 1.31) * 0.5) * e * 0.6;
    const c = Math.max(0, Math.min(1, (d + rag) / e + 0.5)) * (p.amount ?? 1);
    if (c <= 0) continue;
    const i = names.indexOf(p.surface);
    if (i < 0) continue; // (a surface of the other set)
    for (let k = 0; k < 4; k++) w[k] = w[k] * (1 - c) + (k === i ? c : 0);
  }
  return w;
}

// ---------- walls and the sides of things ----------
// A grey detail pattern laid over a plain material's colour, projected from whichever way each face looks (so any
// box takes it without UVs): brick courses, cut stone, cracked plaster, planks, corrugated iron, rough rock. It only
// darkens and lightens what's there, so every wall keeps its own colour.
function grey() { const { cv, c, img } = canvas(); return { cv, c, img, set: (x, y, v) => put(img, x, y, [v, v, v], 255) }; }
const WALLS = {
  // brick: courses 8 px high (0.25 m over 2 m), bricks 16 px, staggered, mortar lines, a shade per brick
  brick() { const r = rng(0xb71c), G = grey(), n = tileNoise(r, 8); for (let row = 0; row < 8; row++) { const off = row % 2 ? 8 : 0; for (let bx = -1; bx < 5; bx++) { const k = 150 + Math.floor(r() * 70); for (let y = 0; y < 8; y++) for (let x = 0; x < 16; x++) { const px = bx * 16 + off + x, py = row * 8 + y, m = x === 0 || y === 0; G.set(px, py, m ? 70 : k + (n(((px % PX) + PX) % PX, py) - 0.5) * 50 + (y === 1 ? 18 : 0)); } } } G.c.putImageData(G.img, 0, 0); return G.cv; },
  // cut stone: big blocks in courses, chamfered tops, the odd chipped one
  stone() { const r = rng(0x570e), G = grey(), n = tileNoise(r, 6); const rows = [16, 16, 16, 16]; let y0 = 0; for (const h of rows) { let x0 = Math.floor(r() * 16); const st = x0; while (x0 < st + PX) { const w = Math.min(st + PX - x0, 16 + Math.floor(r() * 16)), k = 150 + Math.floor(r() * 60); for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const m = y === y0 || x === x0; G.set(x, y, m ? 80 : k + (n(((x % PX) + PX) % PX, y) - 0.5) * 60 + (y === y0 + 1 ? 22 : 0) + (y === y0 + h - 1 ? -18 : 0)); } x0 += w; } y0 += h; } G.c.putImageData(G.img, 0, 0); return G.cv; },
  // plaster: near flat, blotched with damp and soot, hairline cracks
  plaster() { const r = rng(0x9a57), G = grey(), n = tileNoise(r, 5), m = tileNoise(r, 14); for (let y = 0; y < PX; y++) for (let x = 0; x < PX; x++) G.set(x, y, 185 + (n(x, y) - 0.5) * 50 + (m(x, y) - 0.5) * 24); for (let k = 0; k < 5; k++) { let x = Math.floor(r() * PX), y = Math.floor(r() * PX); for (let s = 0; s < 18; s++) { G.set(x, y, 95); y++; x += r() < 0.35 ? (r() < 0.5 ? 1 : -1) : 0; } } G.c.putImageData(G.img, 0, 0); return G.cv; },
  // planks: upright boards with grain and dark seams, nail heads
  wood() { const r = rng(0x3d0d), G = grey(), n = tileNoise(r, 4); for (let bx = 0; bx < 8; bx++) { const k = 150 + Math.floor(r() * 60); for (let y = 0; y < PX; y++) for (let x = 0; x < 8; x++) { const px = bx * 8 + x; G.set(px, y, x === 0 ? 60 : k + Math.sin((y + bx * 13) * 0.6 + x) * 10 + (n(px, y) - 0.5) * 40); } for (const y of [6, 38]) G.set(bx * 8 + 4, y, 70); } G.c.putImageData(G.img, 0, 0); return G.cv; },
  // corrugated iron: ribs every 4 px, rust blooms, a seam and its rivets
  metal() { const r = rng(0x3e7a), G = grey(), n = tileNoise(r, 6); for (let y = 0; y < PX; y++) for (let x = 0; x < PX; x++) { const rib = Math.sin(x * Math.PI / 2) * 22; G.set(x, y, 175 + rib + (n(x, y) > 0.66 ? -55 : 0) + (y === 31 ? -60 : 0)); } for (let x = 2; x < PX; x += 8) G.set(x, 33, 230); G.c.putImageData(G.img, 0, 0); return G.cv; },
  // rough rock: crags and strata
  rock() { const r = rng(0x70c4), G = grey(), n = tileNoise(r, 5), m = tileNoise(r, 12); for (let y = 0; y < PX; y++) for (let x = 0; x < PX; x++) { const a = n(x, y), b = m(x, y); G.set(x, y, 120 + a * 90 + (b - 0.5) * 50 + (Math.sin(y * 0.5 + a * 4) > 0.85 ? -40 : 0)); } G.c.putImageData(G.img, 0, 0); return G.cv; },
  // seer-glass: long faceted crystals growing up through it, bright on one face
  crystal() { const r = rng(0xc2a1), G = grey(), n = tileNoise(r, 5); for (let y = 0; y < PX; y++) for (let x = 0; x < PX; x++) G.set(x, y, 110 + n(x, y) * 60); for (let k = 0; k < 9; k++) { const x0 = Math.floor(r() * PX), w = 4 + Math.floor(r() * 5); for (let y = 0; y < PX; y++) for (let x = x0; x < x0 + w; x++) G.set(x, y, x === x0 ? 70 : x < x0 + w / 2 ? 235 : 160); } G.c.putImageData(G.img, 0, 0); return G.cv; },
  // obsidian: glassy black blocks with pale conchoidal glints
  obsidian() { const r = rng(0x0b5d), G = grey(), n = tileNoise(r, 4); for (let y = 0; y < PX; y++) for (let x = 0; x < PX; x++) G.set(x, y, 90 + n(x, y) * 70 + ((x + y) % 21 === 0 ? 120 : 0)); for (let row = 0; row < 4; row++) for (let x = 0; x < PX; x++) G.set(x, row * 16, 50); G.c.putImageData(G.img, 0, 0); return G.cv; },
};
const WTEX = {};
function wallTexture(kind) {
  if (WTEX[kind]) return WTEX[kind];
  const t = new THREE.CanvasTexture(WALLS[kind]());
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  return (WTEX[kind] = t);
}
// lay a pattern over a material (once): kind of WALLS, `scale` metres to a tile (2 by default)
export function wallTex(mat, kind, scale = 2) {
  if (!mat || mat.userData.wallTex || !WALLS[kind]) return mat;
  mat.userData.wallTex = kind;
  const T = wallTexture(kind);
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.tWall = { value: T }; sh.uniforms.uWallScale = { value: 1 / scale };
    sh.vertexShader = 'varying vec3 vWP;\nvarying vec3 vWN;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = 'uniform sampler2D tWall;\nuniform float uWallScale;\nvarying vec3 vWP;\nvarying vec3 vWN;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      {
        vec3 an = abs(vWN);
        vec2 uv = an.y > 0.6 ? vWP.xz : (an.x > an.z ? vWP.zy : vWP.xy);
        float t = texture2D(tWall, uv * uWallScale).r;
        diffuseColor.rgb *= 0.3 + t * 1.05; // (strong enough to read through the pixel pass)
      }`);
  };
  mat.customProgramCacheKey = () => 'wall-' + kind;
  mat.needsUpdate = true;
  return mat;
}
