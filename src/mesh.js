// Small mesh helpers shared by models.js (the rig) and kits.js (per-character detail).
import * as THREE from 'three';

export function box(w, h, d, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
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
