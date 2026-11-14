// The deeper areas' shrines in a party of two (seals.js): the guest does the work and both screens agree. Sump
// Lines: the guest stands at each flood valve (the host runs the shrine from where the guest is), the guest sees
// the valves turn and open and the shrine break. Saint Orsk's Spire: the guest strikes the bells (their hits reach
// the host), a wrong note resets the hymn on both screens, the right four break it on both.
// node scripts/party-shrines.mjs [url with ?server=]  (a dev server on :5181 (the room server lets it in) and a room server, e.g.
// cd server && PORT=4196 DB_PATH=:memory: node index.js)
import { chromium } from 'playwright';
const URL = process.argv[2] || `http://localhost:5181/?server=${encodeURIComponent('http://127.0.0.1:4196')}`;
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests'] });
const errs = [], fails = [];
const device = async (n) => {
  const page = await (await b.newContext({ viewport: { width: 640, height: 360 } })).newPage();
  page.on('pageerror', (e) => errs.push(n + ': ' + e.message + '\n' + e.stack));
  await page.goto(URL); await page.waitForTimeout(600);
  return page;
};
const auth = async (p, u) => { await p.click('#btn-herm'); await p.fill('#acct-user', u); await p.fill('#acct-pass', 'secret123'); await p.click('#acct-signup'); await p.waitForTimeout(600); };
const check = (ok, what) => { console.log((ok ? 'ok   ' : 'FAIL ') + what); if (!ok) fails.push(what); };
const A = await device('A'), B = await device('B');
const u = 's' + Date.now() % 100000;
await auth(A, u + 'a'); await auth(B, u + 'b');
for (const p of [A, B]) await p.evaluate(() => game.hermitage.setGuide(false));

await A.click('#hm-party'); await A.click('#lobby-create'); await A.waitForTimeout(400);
const code = await A.textContent('#lobby-code');
await B.click('#hm-party'); await B.fill('#lobby-input', code); await B.click('#lobby-joinbtn'); await A.waitForTimeout(400);

for (const area of ['r1a2', 'r1a3']) {
  await A.evaluate((a) => { game.raidArea = a; game.mp.startRun(); }, area); await A.waitForTimeout(3000);
  const names = [await A.evaluate(() => game.world.dungeon?.def.name), await B.evaluate(() => game.world.dungeon?.def.name)];
  check(names[0] === names[1] && names[0] === (area === 'r1a2' ? 'The Sump Lines' : 'Saint Orsk\'s Spire'), `${area}: both in ${names[0]} / ${names[1]}`);
  for (const p of [A, B]) await p.evaluate(() => { for (const e of game.enemiesAll()) if (!e.T?.still) e.update = () => {}; game.player.hp = game.player.maxHp = 1e8; });
  if (area === 'r1a2') {
    const v = await A.evaluate(() => { const s = game.seals.list.find((x) => x.def.kind === 'valve'); return s.def.valves.map((v) => ({ x: v.x, z: v.z })); });
    for (const q of v) { await B.evaluate((q) => { game.player.pos.set(q.x, 0, q.z); game.player.setState('move'); }, q); await A.waitForTimeout(6500); }
    const host = await A.evaluate(() => { const s = game.seals.list.find((x) => x.def.kind === 'valve'); return { state: s.state, done: s.def.valves.filter((v) => v.done).length }; });
    const guest = await B.evaluate(() => { const s = game.seals.list.find((x) => x.def.kind === 'valve'); return { state: s.state, done: s.def.valves.filter((v) => v.done).length, wheelTurned: s.def.valves.some((v) => Math.abs(v.wheel.rotation.z) > 0.5) }; });
    console.log('valves', JSON.stringify(host), JSON.stringify(guest));
    check(host.state === 'broken' && host.done === 3, 'the guest at the valves: the host opens all three and breaks it');
    check(guest.state === 'broken' && guest.done === 3 && guest.wheelTurned, 'the guest sees the wheels turn, the valves open and the shrine break');
  } else {
    const info = await B.evaluate(() => { const s = game.seals.list.find((x) => x.def.kind === 'bells'); const d = s.def; game.player.pos.set(d.x, 0, d.z + 3); game.player.setState('move'); return { song: d.song }; });
    await A.waitForTimeout(800);
    const strike = (k) => B.evaluate((k) => { const s = game.seals.list.find((x) => x.def.kind === 'bells'), e = s.def.chimes[k].enemy, p = game.player; p.pos.set(e.pos.x, 0, e.pos.z + 1.2); e.receive({ dmg: 400, poise: 20, srcPos: p.pos.clone(), attacker: p }); }, k);
    const wrong = [0, 1, 2].find((k) => k !== info.song[0] && k !== info.song[1]) ?? [0, 1, 2].find((k) => k !== info.song[1]);
    await strike(info.song[0]); await A.waitForTimeout(700);
    const one = [await A.evaluate(() => game.seals.list.find((x) => x.def.kind === 'bells').step), await B.evaluate(() => game.seals.list.find((x) => x.def.kind === 'bells').step)];
    await strike(wrong); await A.waitForTimeout(700);
    const zero = [await A.evaluate(() => game.seals.list.find((x) => x.def.kind === 'bells').step), await B.evaluate(() => game.seals.list.find((x) => x.def.kind === 'bells').step)];
    for (const n of info.song) { await strike(n); await A.waitForTimeout(700); }
    const end = [await A.evaluate(() => game.seals.list.find((x) => x.def.kind === 'bells').state), await B.evaluate(() => game.seals.list.find((x) => x.def.kind === 'bells').state)];
    console.log('bells', info.song.join(''), JSON.stringify({ one, zero, end }));
    check(one[0] === 1 && one[1] === 1, 'the guest strikes the first note: 1/4 on both screens');
    check(zero[0] === 0 && zero[1] === 0, 'a wrong bell: back to 0 on both');
    check(end[0] === 'broken' && end[1] === 'broken', 'the four notes in order: broken on both');
  }
}
await b.close();
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
console.log(fails.length ? `${fails.length} FAILED` : 'all passed');
