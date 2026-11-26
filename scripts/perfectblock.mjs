// The Templar's perfect block (player.js PERFECT): an enemy swings a parryable blow; the shield goes up just before it
// lands -> PERFECT BLOCK: no damage, no stamina, the enemy staggers briefly (0.8 s, can't be riposted) and Bulwark's
// Rhythm runs 5 s (+20% attack speed, +20% move speed, +10% damage, an aura). A second one resets it to 5 s without
// stacking; it wears off. Shield up too early -> an ordinary block at a fifth of the old stamina cost.
// node scripts/perfectblock.mjs [url]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:5180/';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 900, height: 560 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto(url); await page.waitForTimeout(900);
const out = await page.evaluate(() => {
  const g = game, o = {}; g.audio.play = () => {}; g.training = true; g.start('knight');
  const p = g.player; p.hp = p.maxHp = 1e6;
  const base = { aspd: p.aspdMul, move: p.moveMul, dmg: p.dmgMul };
  g.trainPads.spawn(g.world.trainPads[0]);
  const e = g.trainPads.trainees()[0]; e.hp = e.maxHp = 1e6;
  const name = Object.keys(e.T.moves).find((k) => { const m = e.T.moves[k]; return !m.ranged && (m.parry || m.hits?.some((h) => h.parry)); });
  o.enemy = e.T.name + ' / ' + name;
  const step = (n) => { for (let i = 0; i < n; i++) g.step(1 / 60, 1 / 60); };
  // one blow: the shield goes up `lead` seconds before it lands (null: held up from the start)
  const blow = (lead) => {
    g.input.held.special = lead === null; step(2);
    p.setState('move'); p.st = p.maxSt;
    e.pos.set(p.pos.x, 0, p.pos.z + 1.3); e.yaw = e.yawTo(p.pos); p.yaw = p.yawTo(e.pos); e.setState('chase'); e.cd = 99;
    e.startAttack(e.T.moves[name]);
    const hp0 = p.hp, st0 = p.st; let res = null;
    const real = p.receive.bind(p); p.receive = (info) => (res = real(info));
    for (let i = 0; i < 240 && !res; i++) {
      const np = e.nextParry();
      if (lead !== null && np && np.tth <= lead) g.input.held.special = true;
      p.yaw = p.yawTo(e.pos); step(1);
    }
    p.receive = real;
    const r = { res, hpLost: Math.round(hp0 - p.hp), stLost: Math.round(st0 - p.st), enemy: e.state, staggerFor: e.parriedDur, ripostable: e.critable(), rhythm: +(p.rhythmT || 0).toFixed(2), aspd: +(p.aspdMul - base.aspd).toFixed(2), move: +(p.moveMul - base.move).toFixed(2), dmg: +(p.dmgMul / base.dmg).toFixed(2), aura: !!p.rhythmAura };
    g.input.held.special = false; step(1);
    return r;
  };
  o.perfect = blow(0.12);
  step(120); // 2 s on
  o.again = blow(0.1);
  o.late = blow(null);
  step(60 * 6);
  o.after = { rhythm: p.rhythmT, aspd: +(p.aspdMul - base.aspd).toFixed(2), move: +(p.moveMul - base.move).toFixed(2), dmg: +(p.dmgMul / base.dmg).toFixed(2), aura: !!p.rhythmAura };
  return o;
});
await b.close();
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(8), JSON.stringify(v));
const P = out.perfect, A = out.again, L = out.late, F = out.after;
const ok = P.res === 'perfect' && P.hpLost === 0 && P.stLost <= 2 && P.enemy === 'parried' && P.staggerFor === 0.8 && !P.ripostable && P.rhythm > 4.9 && P.aspd === 0.2 && P.move === 0.2 && P.dmg === 1.1 && P.aura
  && A.res === 'perfect' && A.rhythm > 4.9 && A.aspd === 0.2 && A.dmg === 1.1
  && L.res === 'block' && F.rhythm === 0 && F.aspd === 0 && F.move === 0 && F.dmg === 1 && !F.aura;
console.log(ok ? 'all passed' : 'FAILED');
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
