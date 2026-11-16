// Small mesh helpers shared by models.js (the rig) and kits.js (per-character detail).
import * as THREE from 'three';

// (each face's texture coordinates run by its real size, one texture tile every TILE metres: armortex.js patterns show
// at the same scale on a big plate and a small rivet; nothing without a texture is affected)
const TILE = 0.16;
const geoms = new Map();
function boxGeo(w, h, d) {
  const key = `${w},${h},${d}`;
  let g = geoms.get(key);
  if (g) return g;
  g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]]; // (+x, -x, +y, -y, +z, -z faces, 4 corners each)
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / TILE, uv.getY(i) * dims[f][1] / TILE); }
  if (geoms.size < 4000) geoms.set(key, g);
  return g;
}
export function box(w, h, d, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(boxGeo(w, h, d), material);
  m.position.set(x, y, z);
  return m;
}

export function cyl(rt, rb, h, material, seg = 6) {
  return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
}

export function cone(r, h, material, seg = 4) {
  return new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), material);
}

// a box rotated in place (x, y, z Euler)
export function rbox(w, h, d, material, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = box(w, h, d, material, x, y, z);
  m.rotation.set(rx, ry, rz);
  return m;
}

// a pivot group at (x, y, z) under `parent`, for hinged parts
export function pivot(parent, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.set(rx, ry, rz);
  parent.add(g);
  return g;
}
