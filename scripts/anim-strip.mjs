// Animation filmstrips: every attack of every class and weapon played for real (the player's own attack code, the
// rig's damping and springs), shot at 12 even moments into one strip per move, from the front-right so the weapon
// hand is nearest. A red bar under a frame marks the hit window; the numbers under the strip are the weapon tip's
// sweep (m travelled, degrees turned round the player) across the hit window, so the blade is seen to move while
// the hit is live. Walking and sprinting get a strip too. /tmp/anim/<tag>/<class>-<weapon>-<move>.png
// Enemies and bosses get the same (foe-<name>-<move>.png), run by their own update with the player in front.
// node scripts/anim-strip.mjs [tag] [filter] [url]   filter: comma list of move names, classes, weapons, foes or 'foes'
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
const tag = process.argv[2] || 'now', filter = (process.argv[3] || '').split(',').filter(Boolean), url = process.argv[4] || 'http://localhost:4173/?chain';
const dir = `/tmp/anim/${tag}`; mkdirSync(dir, { recursive: true });
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 1810, height: 640 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto(url); await page.waitForTimeout(700);
await page.evaluate(([ls, zm]) => { document.getElementById('hud').style.display = 'none'; if (ls) globalThis.__leadScale = ls; if (zm) window.__zoom = zm; }, [+process.env.LEAD || 0, +process.env.ZOOM || 0]);

const SETS = [['knight', 'sword'], ['rogue', 'daggers'], ['mage', 'daggers'], ['knight', 'greatsword'], ['rogue', 'wristblade'], ['mage', 'psystaff']];
const report = {};
for (const [kind, weapon] of SETS) {
  const moves = await page.evaluate(({ kind, weapon }) => {
    const g = game; g.loop = () => {}; g.audio.play = () => {};
    g.loadoutFor = () => ({ weapon, evo: null });
    g.start(kind);
    g.buildRun(['ruins', 'camp', 'mini:hask', 'bridge', 'village', 'mini:vael', 'crypt', 'bog', 'mini:gorrath', 'gate', 'boss'], 7);
    const p = g.player;
    for (const e of [...g.enemies, ...g.bosses]) { e.rig.root.visible = false; e.update = () => {}; }
    return Object.entries(p.c.attacks).filter(([, d]) => d && d.keys && d.dur).map(([k]) => k);
  }, { kind, weapon });
  const list = ['walk', 'sprint', ...moves].filter((m) => !filter.length || filter.includes(kind) || filter.includes(weapon) || filter.includes(m));
  if (!list.length) continue;
  for (const move of list) {
    const r = await page.evaluate(async ({ kind, move }) => {
      const g = game, p = g.player, N = 12, W = 150, H = 190;
      // fresh, standing still on open ground, facing +z
      g.start(kind);
      g.buildRun(['ruins', 'camp', 'mini:hask', 'bridge', 'village', 'mini:vael', 'crypt', 'bog', 'mini:gorrath', 'gate', 'boss'], 7);
      for (const e of [...g.enemies, ...g.bosses]) { e.rig.root.visible = false; e.update = () => {}; }
      const P = g.player; P.hp = P.maxHp = 1e7; P.st = P.maxSt = 1e5;
      const X = P.pos.x, Z = P.pos.z - 5; P.pos.set(X, 0, Z); P.yaw = 0; g.lastGood = null;
      for (let i = 0; i < 30; i++) g.step(1 / 60, 1 / 60); // settle the rig
      const strip = document.createElement('canvas'); strip.width = W * N; strip.height = H + 34; strip.id = 'strip'; strip.style.cssText = 'position:fixed;left:0;top:0;z-index:99999';
      const cx = strip.getContext('2d'); cx.fillStyle = '#111'; cx.fillRect(0, 0, strip.width, strip.height);
      document.body.append(strip);
      const cam = g.camera, canvas = g.renderer.domElement;
      const shoot = (i, t, live) => {
        const s = P.rig.root.scale.y || 1, x = P.pos.x, z = P.pos.z, zm = window.__zoom || 1;
        cam.position.set(x - 2.3 * s / zm, (0.95 + 0.8 / zm) * s, z + 2.4 * s / zm); cam.lookAt(x, (0.95 + (zm > 1 ? 0.25 : 0)) * s, z);
        g.pixel.render(g.scene, cam);
        // the middle of the game canvas, scaled into the frame
        const cw = canvas.width, ch = canvas.height, sw = ch * (W / H);
        cx.drawImage(canvas, (cw - sw) / 2, 0, sw, ch, i * W, 0, W, H);
        cx.fillStyle = live ? '#e03030' : '#333'; cx.fillRect(i * W + 2, H + 2, W - 4, 6);
        cx.fillStyle = '#ddd'; cx.font = '12px monospace'; cx.fillText(t.toFixed(2) + 's', i * W + 4, H + 24);
      };
      const tipAt = () => { const v = P.rig.tip.getWorldPosition(P.pos.clone()); return [v.x - P.pos.x, v.y, v.z - P.pos.z]; };
      const out = { move, frames: N };
      if (move === 'walk' || move === 'sprint') {
        const dur = 1.2;
        g.input.move = () => ({ x: 0, y: 1 });
        if (move === 'sprint') g.input.sprintHeld = () => true;
        let t = 0;
        for (let i = 0; i < N; i++) {
          const T = (i / N) * dur;
          while (t < T) { g.step(1 / 60, 1 / 60); t += 1 / 60; }
          shoot(i, T, false);
        }
        g.input.move = () => ({ x: 0, y: 0 }); g.input.sprintHeld = () => false;
      } else {
        const def = P.c.attacks[move];
        P.setState('move'); P.vel.set(0, 0, 0);
        P.doAttack(move, P.pos.clone().set(0, 0, 1), 0);
        const h = def.hits?.[0], tips = [];
        let t = 0, lastDur = def.dur;
        for (let i = 0; i < N; i++) {
          const T = (i / N) * def.dur;
          while (P.state === 'attack' && P.atk.t < T - 1e-6) { g.step(1 / 60, 1 / 60); t += 1 / 60; } // (by the move's own clock)
          shoot(i, T, !!(h && T >= h.t0 && T <= h.t1));
        }
        // the tip through the whole move, step by step: how much of its path falls in the hit window, and when it is
        // fastest (the swing's visual impact) against the window
        if (h) {
          P.setState('move'); P.vel.set(0, 0, 0); P.pos.set(X, 0, Z); P.yaw = 0; g.lastGood = null;
          for (let i = 0; i < 30; i++) g.step(1 / 60, 1 / 60);
          P.doAttack(move, P.pos.clone().set(0, 0, 1), 0);
          let prev = tipAt(), path = 0, inWin = 0, peak = 0, peakT = 0, guard = 0, gripErr = 0, gripT = 0;
          const R = P.rig, gripOff = () => { if (!R.grip || (R.gripW || 0) < 0.9) return 0; R.wpnR.updateWorldMatrix(true, false); const gp = P.pos.clone().set(0, 0, R.grip.z).applyMatrix4(R.wpnR.matrixWorld); return R.j.handL.getWorldPosition(P.pos.clone()).distanceTo(gp); };
          while (P.state === 'attack' && guard++ < 400) {
            const T = P.atk.t; g.step(1 / 60, 1 / 60); if (!P.atk) break;
            const cur = tipAt(), d = Math.hypot(cur[0] - prev[0], cur[1] - prev[1], cur[2] - prev[2]); prev = cur;
            path += d; if (T >= h.t0 && T <= h.t1) inWin += d;
            if (d > peak) { peak = d; peakT = T; }
            if (T >= h.t0 - 0.08 && T <= h.t1 + 0.08) { const ge = gripOff(); if (ge > gripErr) { gripErr = ge; gripT = T; } } // (around the hit: the hands should be on it by then)
          }
          const share = path ? inWin / path : 0;
          out.sweep = { m: +inWin.toFixed(2), share: +share.toFixed(2), peak: +peakT.toFixed(2), hit: [h.t0, h.t1], arc: h.arc, dur: def.dur, gripErr: +gripErr.toFixed(2), gripT: +gripT.toFixed(2) };
          cx.fillStyle = '#9ad'; cx.fillText(`${move}  hit ${h.t0}-${h.t1}s  tip path in window ${inWin.toFixed(2)} m (${Math.round(share * 100)}%)  fastest at ${peakT.toFixed(2)}s   dur ${def.dur}s`, 4 * W + 4, H + 24);
        }
        while (P.state === 'attack' && t < lastDur + 1) { g.step(1 / 60, 1 / 60); t += 1 / 60; }
      }
      return out;
    }, { kind, move });
    const el = await page.$('#strip');
    await el.screenshot({ path: `${dir}/${kind}-${weapon}-${move}.png` });
    await page.evaluate(() => document.getElementById('strip').remove());
    report[`${kind}-${weapon}-${move}`] = r.sweep || null;
    if (r.sweep) { const w = r.sweep, mid = (w.hit[0] + w.hit[1]) / 2, off = w.peak - mid; console.log(`${kind.padEnd(7)} ${weapon.padEnd(11)} ${move.padEnd(12)} in window ${String(w.m).padStart(5)} m ${String(Math.round(w.share * 100)).padStart(3)}%  fastest ${w.peak}s  window ${w.hit.join('-')}  ${off > 0.03 ? 'LATE' : off < -0.03 ? 'EARLY' : 'on time'} ${(off * 1000).toFixed(0)} ms${w.gripErr > 0.08 ? `  GRIP SHORT ${w.gripErr} m at ${w.gripT}s` : ''}`); }
  }
}
// enemies and bosses: each of their attacks, the creature run by its own update with the player standing in front
const FOES = ['grunt', 'spear', 'brute', 'hask', 'vael', 'gorrath', 'varek'].filter((n) => !filter.length || filter.includes(n) || filter.includes('foes'));
for (const name of FOES) {
  const moves = await page.evaluate((name) => {
    const g = game; g.loop = () => {}; g.audio.play = () => {};
    g.loadoutFor = () => ({ weapon: 'sword', evo: null }); g.start('knight');
    g.buildRun(['ruins', 'camp', 'mini:hask', 'bridge', 'village', 'mini:vael', 'crypt', 'bog', 'mini:gorrath', 'gate', 'boss'], 7);
    const who = g.bosses.find((x) => x.cfg.id === name) || g.enemies.find((x) => x.type === name);
    return who ? Object.entries(who.moves).filter(([, d]) => d && d.keys && d.dur && d.hits?.length).map(([k]) => k) : [];
  }, name);
  for (const move of moves) {
    const r = await page.evaluate(async ({ name, move }) => {
      const g = game, N = 12, W = 150, H = 190;
      g.start('knight');
      g.buildRun(['ruins', 'camp', 'mini:hask', 'bridge', 'village', 'mini:vael', 'crypt', 'bog', 'mini:gorrath', 'gate', 'boss'], 7);
      const P = g.player; P.hp = P.maxHp = 1e9; P.iframe = () => true;
      const who = g.bosses.find((x) => x.cfg.id === name) || g.enemies.find((x) => x.type === name);
      for (const e of [...g.enemies, ...g.bosses]) if (e !== who) { e.rig.root.visible = false; e.update = () => {}; }
      const X = P.pos.x, Z = P.pos.z - 5;
      who.pos.set(X, 0, Z); who.yaw = 0; who.sitting = false; who.target = P; who.setState?.('chase'); who.rig.root.visible = true;
      P.pos.set(X, 0, Z + 2.6); P.yaw = Math.PI; g.lastGood = null; P.rig.root.visible = false;
      const sc = who.rig.root.scale.y || 1;
      for (let i = 0; i < 30; i++) { who.rig.apply(who.rig.cur ? { ...who.rig.cur } : {}, 1 / 60, 30); g.step(1 / 60, 1 / 60); }
      const strip = document.createElement('canvas'); strip.width = W * N; strip.height = H + 34; strip.id = 'strip'; strip.style.cssText = 'position:fixed;left:0;top:0;z-index:99999';
      const cx = strip.getContext('2d'); cx.fillStyle = '#111'; cx.fillRect(0, 0, strip.width, strip.height);
      document.body.append(strip);
      const cam = g.camera, canvas = g.renderer.domElement;
      const shoot = (i, t, live) => {
        const x = who.pos.x, z = who.pos.z, d = 2.6 * sc, hgt = 1.0 * sc;
        cam.position.set(x - d, hgt + 1.1 * sc, z + d); cam.lookAt(x, hgt, z);
        g.pixel.render(g.scene, cam);
        const cw = canvas.width, ch = canvas.height, sw = ch * (W / H);
        cx.drawImage(canvas, (cw - sw) / 2, 0, sw, ch, i * W, 0, W, H);
        cx.fillStyle = live ? '#e03030' : '#333'; cx.fillRect(i * W + 2, H + 2, W - 4, 6);
        cx.fillStyle = '#ddd'; cx.font = '12px monospace'; cx.fillText(t.toFixed(2) + 's', i * W + 4, H + 24);
      };
      const def = who.moves[move], h = def.hits[0];
      const tipAt = () => { const v = who.rig.tip.getWorldPosition(who.pos.clone()); return [v.x - who.pos.x, v.y, v.z - who.pos.z]; };
      const begin = () => { who.pos.set(X, 0, Z); who.yaw = 0; who.setState?.('chase'); who.startAttack(def); };
      begin();
      for (let i = 0; i < N; i++) {
        const T = (i / N) * def.dur;
        let guard = 0; while (who.atk && who.atk.def === def && who.atk.t < T - 1e-6 && guard++ < 300) g.step(1 / 60, 1 / 60);
        shoot(i, T, T >= h.t0 && T <= h.t1);
      }
      begin();
      let prev = tipAt(), path = 0, inWin = 0, peak = 0, peakT = 0, guard = 0, gripErr = 0, gripT = 0;
      const R = who.rig, gripOff = () => { if (!R.grip || (R.gripW || 0) < 0.9 || !R.wpnR) return 0; R.wpnR.updateWorldMatrix(true, false); const gp = who.pos.clone().set(0, 0, R.grip.z).applyMatrix4(R.wpnR.matrixWorld); return R.j.handL.getWorldPosition(who.pos.clone()).distanceTo(gp) / sc; };
      while (who.atk && who.atk.def === def && guard++ < 400) {
        const T = who.atk.t; g.step(1 / 60, 1 / 60);
        const cur = tipAt(), d = guard < 3 ? 0 : Math.hypot(cur[0] - prev[0], cur[1] - prev[1], cur[2] - prev[2]); prev = cur; // (the first steps settle the teleport)
        path += d; if (T >= h.t0 && T <= h.t1) inWin += d; if (d > peak) { peak = d; peakT = T; }
        if (T >= h.t0 - 0.08 && T <= h.t1 + 0.08) { const ge = gripOff(); if (ge > gripErr) { gripErr = ge; gripT = T; } }
      }
      const share = path ? inWin / path : 0;
      cx.fillStyle = '#9ad'; cx.fillText(`${name} ${move}  hit ${h.t0}-${h.t1}s  tip path in window ${inWin.toFixed(2)} m (${Math.round(share * 100)}%)  fastest at ${peakT.toFixed(2)}s   dur ${def.dur}s`, 4 * W + 4, H + 24);
      return { sweep: { m: +inWin.toFixed(2), share: +share.toFixed(2), peak: +peakT.toFixed(2), hit: [h.t0, h.t1], arc: h.arc, dur: def.dur, gripErr: +gripErr.toFixed(2), gripT: +gripT.toFixed(2) } };
    }, { name, move });
    const el = await page.$('#strip');
    await el.screenshot({ path: `${dir}/foe-${name}-${move}.png` });
    await page.evaluate(() => document.getElementById('strip').remove());
    report[`foe-${name}-${move}`] = r.sweep;
    const w = r.sweep, mid = (w.hit[0] + w.hit[1]) / 2, off = w.peak - mid;
    console.log(`${('foe ' + name).padEnd(19)} ${move.padEnd(12)} in window ${String(w.m).padStart(5)} m ${String(Math.round(w.share * 100)).padStart(3)}%  fastest ${w.peak}s  window ${w.hit.join('-')}  ${off > 0.03 ? 'LATE' : off < -0.03 ? 'EARLY' : 'on time'} ${(off * 1000).toFixed(0)} ms${w.gripErr > 0.08 ? `  GRIP SHORT ${w.gripErr} m at ${w.gripT}s` : ''}`);
  }
}
writeFileSync(`${dir}/sweep.json`, JSON.stringify(report, null, 1));
await b.close();
// a blade that hardly moves while its hit is live is a visual that doesn't match the mechanics
const off = Object.entries(report).filter(([, s]) => s && (s.peak < s.hit[0] - 0.04 || s.peak > s.hit[1] + 0.04));
console.log(off.length ? 'IMPACT OUTSIDE THE HIT WINDOW: ' + off.map(([k, s]) => `${k} (${s.peak}s vs ${s.hit.join('-')})`).join(', ') : 'every swing is fastest inside its hit window');
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
