// The evolved Knight's Shield Charge and its leaping overhead can't be broken by hits: a light slash and a brute's
// heavy slam land mid-charge: no damage, and the charge carries on. node scripts/chargearmor.mjs [url]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:4173/';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 640, height: 400 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto(url); await page.waitForTimeout(700);
const out = await page.evaluate(() => {
  const g = game, o = {}; g.audio.play = () => {}; g.start('knight');
  const p = g.player; p.evolved = true; p.hp = p.maxHp = 1e6;
  const hitWith = (state, heavy) => {
    p.setState('move'); p.chargeCd = 0;
    if (state === 'charge') p.startCharge(p.fwd(), 1); else p.doAttack('chargeSlam', p.fwd(), 1);
    for (let i = 0; i < 3; i++) g.step(1 / 60, 1 / 60);
    const hp0 = p.hp, st0 = p.state;
    p.receive({ dmg: 300, poise: 80, knock: heavy ? 'heavy' : 'light', srcPos: p.pos.clone().add({ x: 1, y: 0, z: 0 }), attacker: null });
    return { before: st0, after: p.state, tookDamage: p.hp < hp0 };
  };
  o.chargeLight = hitWith('charge', false); o.chargeHeavy = hitWith('charge', true);
  o.slamLight = hitWith('slam', false); o.slamHeavy = hitWith('slam', true);
  p.setState('move'); p.receive({ dmg: 300, poise: 80, knock: 'light', srcPos: p.pos.clone().add({ x: 1, y: 0, z: 0 }), attacker: null });
  o.normalStillStaggers = p.state;
  return o;
});
await b.close();
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(20), JSON.stringify(v));
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
