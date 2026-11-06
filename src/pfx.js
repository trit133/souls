// pixelfx effects in the 3D world. Each live effect draws into its own small canvas (pixelfx frame) at 30 fps;
// the canvas is the texture of a camera-facing sprite placed at the effect's origin (feet, hit point, projectile
// head). Sprites are sized so one effect pixel is `scale` game pixels (see pixel.js), so they sit on the same
// pixel grid as the scene. Purely visual.
import * as THREE from 'three';
import { createFrame, clearFrame, createFx, composite } from './pixelfx/core/index.js';
import * as hitSpark from './pixelfx/fx/impacts/hit-spark.js';
import * as critHit from './pixelfx/fx/impacts/crit-hit.js';
import * as parry from './pixelfx/fx/impacts/parry.js';
import * as heal from './pixelfx/fx/holy/heal.js';
import * as poof from './pixelfx/fx/spawn/poof.js';
import * as plasma from './pixelfx/fx/projectiles/plasma-shot.js';
import * as manaBurst from './pixelfx/fx/arcane/mana-burst.js';
import * as spellCharge from './pixelfx/fx/arcane/spell-charge.js';
import * as magicCircle from './pixelfx/fx/arcane/magic-circle-cast.js';
import * as fireball from './pixelfx/fx/fire/fireball.js';
import * as explosion from './pixelfx/fx/explosions/small-explosion.js';
import * as swordSlash from './pixelfx/fx/melee/sword-slash.js';
import * as groundSlam from './pixelfx/fx/impacts/ground-slam.js';

const ICE = ['#10203a', '#1c3a6a', '#2c5ca8', '#4a8ae0', '#6ab4ff', '#9fd8ff', '#d4f0ff', '#ffffff'];
const BLOOD = ['#2a0808', '#5a1010', '#8a1a14', '#c42a1e', '#ff5a3a', '#ffb08a', '#ffffff'];
const STEEL = ['#3a3a44', '#6a6e7a', '#9aa0aa', '#c8ccd4', '#e8ecf2', '#f8faff', '#ffffff'];
const RED = ['#1a0404', '#4a0808', '#8a1010', '#c41a14', '#ff3a2a', '#ff8a6a', '#ffd8c8', '#ffffff'];
const BLACK = ['#020202', '#080708', '#100e10', '#1a171a', '#262226', '#332e33', '#403a40', '#4e474e'];
const ASH = ['#1a1612', '#2e2822', '#4a423a', '#6e655a', '#948a7c', '#b8ae9e', '#d8d0c0', '#f0ead8'];

// name -> effect, options, size on screen (game px per effect px), how long a loop lasts before it fades
export const PRESETS = {
  hit: { mod: hitSpark, scale: 0.55, aim: true },
  heavyHit: { mod: hitSpark, scale: 0.8, aim: true },
  hurt: { mod: hitSpark, scale: 0.55, aim: true, opts: { palette: BLOOD } },
  block: { mod: hitSpark, scale: 0.5, aim: true, opts: { palette: STEEL } },
  crit: { mod: critHit, scale: 0.55 },
  groundSlam: { mod: groundSlam, scale: 0.42, cut: 1.5 },
  bigCrit: { mod: critHit, scale: 0.8 },
  redCrit: { mod: critHit, scale: 0.6, opts: { palette: RED } },
  redSlash: { mod: swordSlash, scale: 0.75, aim: true, opts: { palette: RED } },
  shroud: { mod: poof, scale: 0.75, opts: { palette: BLACK } },
  redPoof: { mod: poof, scale: 0.55, opts: { palette: RED } },
  parry: { mod: parry, scale: 0.5 },
  heal: { mod: heal, scale: 0.8 },
  poof: { mod: poof, scale: 0.5, opts: { palette: ASH } },
  bolt: { mod: plasma, scale: 0.5, aim: true, opts: { palette: ICE } },
  boltHit: { mod: manaBurst, scale: 0.28, opts: { palette: ICE } },
  fireball: { mod: fireball, scale: 0.55, aim: true },
  bigFireball: { mod: fireball, scale: 0.75, aim: true },
  explosion: { mod: explosion, scale: 0.48, cut: 2.2 },
  charge: { mod: spellCharge, scale: 0.42 },
  chargeIce: { mod: spellCharge, scale: 0.3, opts: { palette: ICE } },
  circle: { mod: magicCircle, scale: 0.36, cut: 1.6 },
  blast: { mod: explosion, scale: 0.55, cut: 3 },
};

const MAX = 48;
const _v = new THREE.Vector3(), _w = new THREE.Vector3();

export class PFX {
  constructor(game) {
    this.game = game;
    this.live = [];
  }

  // world units per game pixel at a point (perspective: farther = bigger)
  pxWorld(pos) {
    const c = this.game.camera, h = this.game.pixel.size.y || 270;
    const d = _v.copy(pos).sub(c.position).dot(c.getWorldDirection(_w));
    return (2 * Math.max(1, d) * Math.tan((c.fov * Math.PI) / 360)) / h;
  }

  /**
   * Play a preset at a world position. o: { dir (Vector3, for aimed effects), follow (object with .pos and
   * optionally .vel, for projectiles), size (extra scale), flip, opts }. Returns a handle with stop().
   */
  play(name, pos, o = {}) {
    const P = PRESETS[name];
    if (!P) return null;
    if (this.live.length >= MAX) this.kill(this.live[0]);
    const meta = P.mod.meta, [w, h] = meta.size, [ox, oy] = meta.origin;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    const tex = new THREE.CanvasTexture(cv);
    tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false });
    const sp = new THREE.Sprite(mat);
    sp.center.set(ox / w, 1 - oy / h);
    sp.renderOrder = 5;
    this.game.scene.add(sp);
    const fx = createFx(P.mod, { ...(P.opts || {}), ...(o.opts || {}), x: ox, y: oy, flip: !!o.flip, seed: (Math.random() * 1e6) | 0 });
    const e = {
      P, fx, sp, mat, tex, ctx, cv, w, h, frame: createFrame(w, h), img: new ImageData(w, h),
      pos: new THREE.Vector3().copy(pos), dir: o.dir ? o.dir.clone() : null, follow: o.follow || null,
      size: o.size || 1, acc: 1, t: 0, stopped: false, life: o.life || 0,
      stop: () => { if (!e.stopped) { e.stopped = true; fx.stop(); } },
    };
    this.live.push(e);
    this.place(e);
    this.draw(e);
    return e;
  }

  place(e) {
    if (e.follow) { e.pos.copy(e.follow.pos); if (e.follow.vel) e.dir = e.follow.vel; }
    e.sp.position.copy(e.pos);
    const k = this.pxWorld(e.pos) * e.P.scale * e.size;
    e.sp.scale.set(e.w * k, e.h * k, 1);
    // aimed effects point right in their art: turn the sprite to the on-screen direction
    if (e.P.aim && e.dir && e.dir.lengthSq() > 1e-6) {
      const c = this.game.camera;
      const a = _v.copy(e.pos).project(c), b = _w.copy(e.pos).add(e.dir).project(c);
      e.mat.rotation = Math.atan2((b.y - a.y) * c.aspect, b.x - a.x);
    }
  }

  draw(e) {
    clearFrame(e.frame);
    e.fx.draw(e.frame);
    composite(e.frame, e.img.data, null);
    e.ctx.putImageData(e.img, 0, 0);
    e.tex.needsUpdate = true;
  }

  update(dt) {
    for (const e of [...this.live]) {
      e.t += dt;
      e.fx.update(dt);
      if (e.P.cut && e.t > e.P.cut) e.stop();
      if (e.life && e.t > e.life) { this.kill(e); continue; }
      if (e.fx.done()) { this.kill(e); continue; }
      this.place(e);
      e.acc += dt;
      if (e.acc >= 1 / 30) { e.acc = 0; this.draw(e); }
    }
  }

  kill(e) {
    const i = this.live.indexOf(e);
    if (i >= 0) this.live.splice(i, 1);
    this.game.scene.remove(e.sp);
    e.tex.dispose(); e.mat.dispose();
  }

  clear() { for (const e of [...this.live]) this.kill(e); }
}
