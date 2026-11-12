// Title logo: pixelfx's fire-title effect (src/pixelfx, MIT) played live into a small canvas that CSS scales up
// with nearest-neighbour filtering. The effect turns the logo in 3D, bobs a wave through the letters and burns
// each one; it only runs while the title screen is showing.
import { createFrame, clearFrame, createFx, composite } from './pixelfx/core/index.js';
import * as fireTitle from './pixelfx/fx/ui/fire-title.js';

const FPS = 30;

export class FireTitle {
  constructor(canvas, text) {
    const [w, h] = fireTitle.meta.size, [ox, oy] = fireTitle.meta.origin;
    this.cv = canvas; canvas.width = w; canvas.height = h;
    this.ctx = canvas.getContext('2d');
    this.frame = createFrame(w, h, -ox, -oy);
    this.img = new ImageData(w, h);
    this.fx = createFx(fireTitle, { text, scale: 3 }); // (scale 3: THE LAST CRUSADE fits the logo canvas)
    this.acc = 1; this.last = 0;
    this.draw();
    requestAnimationFrame((t) => this.loop(t));
  }

  draw() {
    clearFrame(this.frame);
    this.fx.draw(this.frame);
    composite(this.frame, this.img.data, null);
    this.ctx.putImageData(this.img, 0, 0);
  }

  loop(now) {
    requestAnimationFrame((t) => this.loop(t));
    const dt = Math.min(0.1, (now - this.last) / 1000 || 0);
    this.last = now;
    if (this.cv.offsetParent === null) return; // title screen hidden: nothing to draw
    this.fx.update(dt);
    this.acc += dt;
    if (this.acc < 1 / FPS) return;
    this.acc = 0;
    this.draw();
  }
}
