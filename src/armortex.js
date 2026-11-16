// Armour textures: small pixel-art patterns, each in no more than two colours over the piece's own colour, so plate is
// hammered and scratched, cloth woven, leather grained. The two colours are the outfit's texture channels (texA, the
// darker marks, and texB, the lighter ones: outfits.js); left at Default they're a shade darker and a shade lighter than
// the surface they're on. Tiled at real size: mesh.js box gives each face texture coordinates by its own size, so a big
// plate and a small rivet show the pattern at the same scale. Cached by pattern and colours.
import * as THREE from 'three';

const N = 16; // pixels a tile
const cache = new Map();
const hexCss = (h) => '#' + h.toString(16).padStart(6, '0');
export const shade = (hex, f) => { // f < 0 darker, > 0 lighter
  const c = new THREE.Color(hex), t = f < 0 ? new THREE.Color(0, 0, 0) : new THREE.Color(1, 1, 1);
  return c.lerp(t, Math.abs(f)).getHex();
};
// a repeatable random for each pattern, so the same tile comes out every time
const rnd = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };

// each pattern marks pixels 'a' (darker) or 'b' (lighter) on an N x N tile that wraps
const PATTERNS = {
  // hammered plate: dents, a couple of scratches catching the light, a pit or two
  plate(set) {
    const r = rnd(7);
    for (let i = 0; i < 18; i++) set((r() * N) | 0, (r() * N) | 0, 'a');
    for (let k = 0; k < 2; k++) { let x = (r() * N) | 0, y = (r() * N) | 0; const dx = r() < 0.5 ? 1 : -1; for (let i = 0; i < 4; i++) { set(x, y, 'b'); x += dx; y += 1; } }
    for (let i = 0; i < 5; i++) set((r() * N) | 0, (r() * N) | 0, 'b');
  },
  // edging and bands: a finer grain, mostly light glints
  trim(set) {
    const r = rnd(11);
    for (let i = 0; i < 10; i++) set((r() * N) | 0, (r() * N) | 0, 'a');
    for (let y = 0; y < N; y += 4) for (let x = (y / 4) % 2 * 2; x < N; x += 5) set(x, y, 'b');
  },
  // woven cloth: an over-and-under weave, a few lighter slubs
  cloth(set) {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if ((x + (y % 2) * 2) % 4 === 0) set(x, y, 'a');
    const r = rnd(5); for (let i = 0; i < 8; i++) { const x = (r() * N) | 0, y = (r() * N) | 0; set(x, y, 'b'); set(x + 1, y, 'b'); }
  },
  // leather: a mottled grain, a row of stitches
  leather(set) {
    const r = rnd(3);
    for (let i = 0; i < 30; i++) set((r() * N) | 0, (r() * N) | 0, 'a');
    for (let x = 0; x < N; x += 3) set(x, 12, 'b');
    for (let i = 0; i < 6; i++) set((r() * N) | 0, (r() * N) | 0, 'b');
  },
};

export function armorTex(pattern, base, a, b) {
  const key = `${pattern}/${base}/${a}/${b}`;
  if (cache.has(key)) return cache.get(key);
  const cv = document.createElement('canvas'); cv.width = cv.height = N;
  const c = cv.getContext('2d');
  c.fillStyle = hexCss(base); c.fillRect(0, 0, N, N);
  const cols = { a: hexCss(a), b: hexCss(b) };
  (PATTERNS[pattern] || PATTERNS.plate)((x, y, k) => { c.fillStyle = cols[k]; c.fillRect(((x % N) + N) % N, ((y % N) + N) % N, 1, 1); });
  const t = new THREE.CanvasTexture(cv);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, t);
  return t;
}
