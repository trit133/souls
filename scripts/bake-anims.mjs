// Bakes humanoid animation clips into our box rig's poses (scripts/bake/clips.js does the work in the browser):
// Quaternius' Universal Animation Library (CC0; the downloaded GLBs live in assets-src/ual, not in git) and any Mixamo
// FBX in assets-src/mixamo (its Locomotion Pack. folder). Writes src/anim-data/clips.json (only our own pose numbers, never the source files)
// and a check sheet, /tmp/look/bake-<clip>.png: the source skeleton (grey) and our rig posed from the bake (red),
// side on and from the front, across the clip.
// node scripts/bake-anims.mjs [url]   (the dev server)
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, existsSync, readdirSync } from 'fs';
mkdirSync('/tmp/look', { recursive: true }); mkdirSync('src/anim-data', { recursive: true });
const url = process.argv[2] || 'http://localhost:5180/';
// what to bake: [file, clip, our name, options]
const JOBS = [
  ['/assets-src/ual/UAL1_Standard.glb', 'Idle_Loop', 'idle', { loop: true }],
  ['/assets-src/ual/UAL1_Standard.glb', 'Walk_Loop', 'walk', { loop: true, gait: true }],
  ['/assets-src/ual/UAL1_Standard.glb', 'Jog_Fwd_Loop', 'jog', { loop: true, gait: true }],
  ['/assets-src/ual/UAL1_Standard.glb', 'Sprint_Loop', 'sprint', { loop: true, gait: true }],
  ['/assets-src/ual/UAL1_Standard.glb', 'Sword_Idle', 'swordIdle', { loop: true }],
  ['/assets-src/ual/UAL2_Standard.glb', 'Idle_Shield_Loop', 'shieldIdle', { loop: true }],
];
// Mixamo's Locomotion Pack (assets-src/mixamo/Locomotion Pack./, FBX, no character, 30 fps; with root motion)
const LP = '/assets-src/mixamo/' + encodeURIComponent('Locomotion Pack.') + '/', lp = (f) => LP + encodeURIComponent(f + '.fbx');
if (existsSync('assets-src/mixamo/Locomotion Pack.')) JOBS.push(
  [lp('idle'), null, 'mIdle', { loop: true }],
  [lp('walking'), null, 'mWalk', { loop: true, gait: true }],
  [lp('running'), null, 'mRun', { loop: true, gait: true }],
  [lp('left strafe walking'), null, 'strafeWalkL', { loop: true, gait: true }],
  [lp('right strafe walking'), null, 'strafeWalkR', { loop: true, gait: true }],
  [lp('left strafe'), null, 'strafeRunL', { loop: true, gait: true }],
  [lp('right strafe'), null, 'strafeRunR', { loop: true, gait: true }],
  [lp('left turn 90'), null, 'turnL', { loop: true, unyaw: true }],
  [lp('right turn 90'), null, 'turnR', { loop: true, unyaw: true }],
);
// any other Mixamo clip dropped straight in assets-src/mixamo: baked under its file name
if (existsSync('assets-src/mixamo')) for (const f of readdirSync('assets-src/mixamo').filter((f) => /\.fbx$/i.test(f))) JOBS.push([`/assets-src/mixamo/${encodeURIComponent(f)}`, null, f.replace(/\.fbx$/i, '').replace(/\W+/g, '_'), { loop: true, gait: /walk|run|jog|strafe|back/i.test(f) }]);

const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 1200, height: 520 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto(url); await page.waitForTimeout(800);
const out = {};
for (const [file, clip, as, o] of JOBS) {
  const res = await page.evaluate(async ({ file, clip, as, o }) => {
    const B = await import('/scripts/bake/clips.js');
    const g = (window.__gl ||= {})[file] ||= await B.load(file);
    const name = clip || g.animations[0].name;
    const data = B.bake(g, name, { ...o, as });
    // the check sheet: 8 frames, side and front, source (grey) and ours (red)
    const { buildHumanoid } = await import('/src/models.js');
    const rig = window.__rig ||= buildHumanoid({ scale: 1 });
    const cv = document.createElement('canvas'); cv.width = 1200; cv.height = 520; const c = cv.getContext('2d');
    c.fillStyle = '#15131a'; c.fillRect(0, 0, 1200, 520);
    const n = data.f.hips.length / 3;
    for (let k = 0; k < 8; k++) {
      const i = Math.floor(k / 8 * n), t = i / n * data.dur;
      const sk = B.skeletonAt(g, name, t);
      const pose = { by: data.by[i] }; for (const j in data.f) pose[j] = data.f[j].slice(i * 3, i * 3 + 3);
      rig.root.position.set(0, 0, 0); rig.root.rotation.set(0, 0, 0); for (let q = 0; q < 240; q++) rig.apply(pose, 1 / 60, 60); rig.root.updateMatrixWorld(true); // (settled: the upper body's follow-through spring)
      const ours = {}; for (const j of ['hips', 'torso', 'head', 'armL', 'foreL', 'handL', 'armR', 'foreR', 'handR', 'legL', 'shinL', 'legR', 'shinR']) ours[j] = rig.j[j].getWorldPosition(rig.j[j].position.clone().set(0, 0, 0)).toArray();
      const feet = { L: rig.j.shinL.localToWorld(rig.j.shinL.position.clone().set(0, -0.47, 0)).toArray(), R: rig.j.shinR.localToWorld(rig.j.shinR.position.clone().set(0, -0.47, 0)).toArray() };
      const hands = { L: rig.j.handL.localToWorld(rig.j.handL.position.clone().set(0, -0.1, 0)).toArray(), R: rig.j.handR.localToWorld(rig.j.handR.position.clone().set(0, -0.1, 0)).toArray() };
      for (const [view, ox] of [['side', 0], ['front', 1]]) {
        const X = 75 + k * 140 + (view === 'front' ? 0 : 0), Y0 = view === 'side' ? 240 : 500, S = 95;
        const P = (p) => [X + (view === 'side' ? p[2] : p[0]) * S, Y0 - p[1] * S];
        const line = (a, bb, col, w) => { if (!a || !bb) return; c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(...P(a)); c.lineTo(...P(bb)); c.stroke(); };
        const h = sk.pelvis ? sk.pelvis[1] : 1, sc = 0.95 / h, s2 = (p) => p && [p[0] * sc, p[1] * sc, p[2] * sc];
        const s = Object.fromEntries(Object.entries(sk).map(([k2, v]) => [k2, s2(v)]));
        for (const [a, bb] of [['pelvis', 'spine_03'], ['spine_03', 'Head'], ['spine_03', 'upperarm_l'], ['upperarm_l', 'lowerarm_l'], ['lowerarm_l', 'hand_l'], ['spine_03', 'upperarm_r'], ['upperarm_r', 'lowerarm_r'], ['lowerarm_r', 'hand_r'], ['pelvis', 'thigh_l'], ['thigh_l', 'calf_l'], ['calf_l', 'foot_l'], ['pelvis', 'thigh_r'], ['thigh_r', 'calf_r'], ['calf_r', 'foot_r']]) line(s[a], s[bb], '#8a8478', 5);
        for (const [a, bb] of [['hips', 'torso'], ['torso', 'head'], ['armL', 'foreL'], ['foreL', 'handL'], ['armR', 'foreR'], ['foreR', 'handR'], ['legL', 'shinL'], ['legR', 'shinR']]) line(ours[a], ours[bb], bb.endsWith('L') || a.endsWith('L') ? '#ff6a4a' : '#d02a20', 2);
        line(ours.shinL, feet.L, '#ff6a4a', 2); line(ours.shinR, feet.R, '#d02a20', 2); line(ours.handL, hands.L, '#ff6a4a', 2); line(ours.handR, hands.R, '#d02a20', 2);
        c.fillStyle = '#5a5452'; c.fillRect(X - 60, Y0, 120, 1);
      }
    }
    c.fillStyle = '#d8d0c0'; c.font = '14px monospace'; c.fillText(`${as} (${name}) · ${data.dur}s · speed ${data.speed ?? '-'} · sync ${data.sync ?? '-'}   grey: source  red: ours (light = left)`, 10, 18);
    return { data, png: cv.toDataURL('image/png') };
  }, { file, clip, as, o });
  out[as] = res.data;
  writeFileSync(`/tmp/look/bake-${as}.png`, Buffer.from(res.png.split(',')[1], 'base64'));
  console.log(as.padEnd(12), `${res.data.dur}s`, res.data.speed != null ? `speed ${res.data.speed} m/s sync ${res.data.sync}` : '');
}
writeFileSync('src/anim-data/clips.json', JSON.stringify(out));
console.log('wrote src/anim-data/clips.json', (JSON.stringify(out).length / 1024).toFixed(0) + ' KB');
await b.close();
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
