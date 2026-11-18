// Solves the right arm (armR, foreR, handR) for a pose: where the right hand should be and which way the blade should
// point, in the character's frame (+z ahead, +x his left, y up from the ground), the rest of the body as given. On the
// Templar's rig with the given weapon (the left hand finds the hilt by itself). Prints the angles and how close they get.
// node scripts/solve-arm.mjs '<json: [{ name, pose, hand: [x,y,z], dir: [x,y,z] }, ...]>' [weapon] [url]
import { chromium } from 'playwright';
const specs = JSON.parse(process.argv[2]), weapon = process.argv[3] || 'greatsword', url = process.argv[4] || 'http://localhost:5180/?chain';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 320, height: 200 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto(url); await page.waitForTimeout(700);
const res = await page.evaluate(({ specs, weapon }) => {
  const g = game; g.loop = () => {}; g.loadoutFor = () => ({ weapon, evo: null }); g.start('knight');
  const R = g.player.rig, V = g.player.pos.constructor;
  R.edges = null; R.root.position.set(0, 0, 0); R.root.rotation.set(0, 0, 0);
  const out = [];
  for (const sp of specs) {
    // the twist split as swingPose does it (torso keeps 0.72, the hips take the rest)
    const base = { ...sp.pose }; const ty = base.torso?.[1] || 0;
    if (ty) { base.torso = [base.torso[0], ty * 0.72, base.torso[2]]; base.hips = [0, ty * 0.28, 0]; }
    const dirT = new V(...sp.dir).normalize(), handT = new V(...sp.hand);
    const measure = (a) => {
      const pose = { ...base, ...a, snap: Object.fromEntries(Object.keys({ ...base, ...a }).map((k) => [k, true])) };
      R.apply(pose, 0, 60); R.root.updateMatrixWorld(true);
      const h = R.j.handR.getWorldPosition(new V()), t = R.tip.getWorldPosition(new V()), d = t.clone().sub(h).normalize();
      return { h, d, err: h.distanceTo(handT) * 2 + d.distanceTo(dirT) };
    };
    let best = { a: { armR: [-1, 0, 0], foreR: [-1, 0, 0], handR: [1, 0, 0] } }; best.m = measure(best.a);
    for (let it = 0; it < 4000; it++) {
      const sc = it < 1500 ? 1 : it < 3000 ? 0.3 : 0.08, j = (v) => v + (Math.random() - 0.5) * sc;
      const a = { armR: best.a.armR.map(j), foreR: [Math.min(0, j(best.a.foreR[0])), 0, 0], handR: best.a.handR.map(j) };
      const m = measure(a); if (m.err < best.m.err) best = { a, m };
    }
    const r2 = (v) => +v.toFixed(2);
    out.push({ name: sp.name, armR: best.a.armR.map(r2), foreR: best.a.foreR.map(r2), handR: best.a.handR.map(r2), hand: best.m.h.toArray().map(r2), dir: best.m.d.toArray().map(r2), err: r2(best.m.err) });
  }
  return out;
}, { specs, weapon });
for (const r of res) console.log(`${r.name}: { armR: [${r.armR}], foreR: [${r.foreR}], handR: [${r.handR}] }   hand ${r.hand} dir ${r.dir} err ${r.err}`);
await b.close(); if (errs.length) console.log(errs);
