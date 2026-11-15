// The baker's browser half (scripts/bake-anims.mjs loads this through the dev server): turns animation clips made
// for a skinned humanoid skeleton (Quaternius UAL, Mixamo) into our box rig's poses (models.js: hips, torso, head,
// armL/R, foreL/R, handL/R, legL/R, shinL/R, by), one per frame.
//
// Retargeting: for each of our joints a source bone drives it. Each frame, the bone's rotation away from its rest
// pose (delta = Q(t) * Q(rest)^-1, in the character's space) is applied on top of a fixed correction C that turns our
// joint's rest direction (arms and legs hang straight down, the spine points up) onto the bone's rest direction (the
// source's T-pose arms point sideways). So our limb points where the source limb points and twists as it twists.
// Our joint's local rotation is then that world rotation in its parent's frame, as XYZ Euler angles (Rig.apply).
// The hips' height change gives `by` (scaled from the source's leg length to ours). For a looping walk/run the
// baker also measures how fast the planted foot slides back (the clip's ground speed) and the frame the left foot
// is furthest forward (so every gait clip can start in step).
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

const UP = new THREE.Vector3(0, 1, 0), DOWN = new THREE.Vector3(0, -1, 0);
// our joint <- the source bone driving it, the bone its direction points to, our rest direction, our parent joint
// (names for Quaternius / Unreal-style skeletons; Mixamo's are mapped onto these below)
const MAP = [
  ['hips', 'pelvis', 'spine_01', UP, null],
  ['torso', 'spine_03', 'neck_01', UP, 'hips'],
  ['head', 'Head', null, UP, 'torso'],
  ['armL', 'upperarm_l', 'lowerarm_l', DOWN, 'torso'],
  ['foreL', 'lowerarm_l', 'hand_l', DOWN, 'armL'],
  ['handL', 'hand_l', 'middle_01_l', DOWN, 'foreL'],
  ['armR', 'upperarm_r', 'lowerarm_r', DOWN, 'torso'],
  ['foreR', 'lowerarm_r', 'hand_r', DOWN, 'armR'],
  ['handR', 'hand_r', 'middle_01_r', DOWN, 'foreR'],
  ['legL', 'thigh_l', 'calf_l', DOWN, 'hips'],
  ['shinL', 'calf_l', 'foot_l', DOWN, 'legL'],
  ['legR', 'thigh_r', 'calf_r', DOWN, 'hips'],
  ['shinR', 'calf_r', 'foot_r', DOWN, 'legR'],
];
const MIXAMO = { pelvis: 'Hips', spine_01: 'Spine', spine_03: 'Spine2', neck_01: 'Neck', Head: 'Head', upperarm_l: 'LeftArm', lowerarm_l: 'LeftForeArm', hand_l: 'LeftHand', middle_01_l: 'LeftHandMiddle1', upperarm_r: 'RightArm', lowerarm_r: 'RightForeArm', hand_r: 'RightHand', middle_01_r: 'RightHandMiddle1', thigh_l: 'LeftUpLeg', calf_l: 'LeftLeg', foot_l: 'LeftFoot', thigh_r: 'RightUpLeg', calf_r: 'RightLeg', foot_r: 'RightFoot', ball_l: 'LeftToeBase', ball_r: 'RightToeBase' };
const OUR_HIP = 0.95; // models.js hipH

export async function load(url) {
  if (/\.fbx$/i.test(url)) { const o = await new FBXLoader().loadAsync(url); return { scene: o, animations: o.animations }; }
  return new GLTFLoader().loadAsync(url);
}

export function list(gltf) { return gltf.animations.map((a) => ({ name: a.name, dur: +a.duration.toFixed(3) })); }

// bake one clip: { name, dur, fps, loop, speed, sync, f: { joint: [x,y,z, x,y,z, ...] }, by: [...] }
export function bake(gltf, clipName, o = {}) {
  const root = gltf.scene, clip = gltf.animations.find((a) => a.name === clipName);
  if (!clip) throw new Error('no clip ' + clipName);
  const bones = {};
  root.traverse((n) => { if (n.isBone || n.type === 'Bone' || n.name) bones[n.name.replace(/^mixamorig:?/, '')] = bones[n.name.replace(/^mixamorig:?/, '')] || n; });
  const bone = (k) => bones[k] || bones[MIXAMO[k]];
  const fps = o.fps || 30;
  root.updateMatrixWorld(true);
  const rootInv = new THREE.Quaternion(); root.getWorldQuaternion(rootInv).invert();
  const wq = (b) => rootInv.clone().multiply(b.getWorldQuaternion(new THREE.Quaternion()));
  const wp = (b) => b.getWorldPosition(new THREE.Vector3());
  // the rest pose: the skeleton as it stands before any clip plays
  const rest = {}, C = {};
  for (const [j, b, toward, ours] of MAP) {
    const B = bone(b); if (!B) throw new Error('no bone ' + b);
    rest[j] = wq(B);
    let dir;
    if (toward && bone(toward)) dir = wp(bone(toward)).sub(wp(B)).normalize();
    else dir = UP.clone(); // (the head: straight up from the neck)
    C[j] = new THREE.Quaternion().setFromUnitVectors(ours, dir);
  }
  const pelvis = bone('pelvis'), restY = wp(pelvis).y;
  const legLen = wp(bone('thigh_l')).y - wp(bone('foot_l')).y + 0.08; // (hip to sole, about)
  const k = OUR_HIP / Math.max(0.1, restY), size = OUR_HIP / Math.max(0.1, legLen + (restY - wp(bone('thigh_l')).y));
  const mixer = new THREE.AnimationMixer(root), act = mixer.clipAction(clip); act.play();
  const n = Math.max(2, Math.round(clip.duration * fps)), out = { name: o.as || clipName, src: clipName, dur: +clip.duration.toFixed(4), fps, f: {}, by: [] };
  for (const [j] of MAP) out.f[j] = [];
  const footZ = [], footY = [];
  const world = {}, tmp = new THREE.Quaternion(), e = new THREE.Euler();
  for (let i = 0; i < n; i++) {
    mixer.setTime(i / n * clip.duration); root.updateMatrixWorld(true);
    for (const [j, b, , , parent] of MAP) {
      const delta = wq(bone(b)).multiply(rest[j].clone().invert());
      world[j] = delta.multiply(C[j]);
      const local = parent ? tmp.copy(world[parent]).invert().multiply(world[j]) : tmp.copy(world[j]);
      e.setFromQuaternion(local, 'XYZ');
      out.f[j].push(+e.x.toFixed(3), +e.y.toFixed(3), +e.z.toFixed(3));
    }
    out.by.push(+((wp(pelvis).y - restY) * k).toFixed(3));
    const fl = wp(bone('foot_l')), fr = wp(bone('foot_r')), pz = wp(pelvis).z;
    footZ.push([fl.z - pz, fr.z - pz]); footY.push([fl.y, fr.y]);
  }
  mixer.stopAllAction();
  // a gait's ground speed: while a foot is the lower one (planted), how fast it moves back under the body
  if (o.gait) {
    let dist = 0, time = 0;
    for (let i = 0; i < n; i++) {
      const a = footZ[i], b = footZ[(i + 1) % n], low = footY[i][0] < footY[i][1] ? 0 : 1;
      const d = a[low] - b[low]; if (d > 0) { dist += d; time += clip.duration / n; }
    }
    out.speed = +(time ? dist / time * size : 0).toFixed(3); // (in our units: m/s for our rig's leg length)
    // in step: the frame the left foot is furthest forward
    let best = 0; for (let i = 1; i < n; i++) if (footZ[i][0] > footZ[best][0]) best = i;
    out.sync = +(best / n).toFixed(4);
  }
  out.loop = !!o.loop;
  return out;
}

// for the check sheet: the source skeleton's joints at time t (character space, our scale)
export function skeletonAt(gltf, clipName, t) {
  const root = gltf.scene, clip = gltf.animations.find((a) => a.name === clipName), bones = {};
  root.traverse((n) => { bones[n.name.replace(/^mixamorig:?/, '')] = n; });
  const mixer = new THREE.AnimationMixer(root); mixer.clipAction(clip).play(); mixer.setTime(t); root.updateMatrixWorld(true);
  const names = ['pelvis', 'spine_03', 'Head', 'upperarm_l', 'lowerarm_l', 'hand_l', 'upperarm_r', 'lowerarm_r', 'hand_r', 'thigh_l', 'calf_l', 'foot_l', 'thigh_r', 'calf_r', 'foot_r'];
  const out = {}; for (const k of names) { const b = bones[k] || bones[MIXAMO[k]]; if (b) out[k] = b.getWorldPosition(new THREE.Vector3()).toArray(); }
  mixer.stopAllAction();
  return out;
}
