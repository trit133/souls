// Runes (runes.js): forged at the workbench, kept in the stash's Runes tab, socketed in a tree's three sockets (one of
// each type, supports as often as you like); in a raid each type works: a longer roll and its ember trail, an aura that
// slows and burns, a summon on its key (servo-skull, hound, Varek's echo) that fights then goes, a buff on its key a set
// number of times, Second Wind, Last Stand, Sandevistan (afterimages, the world slowed alone); Varek's death grants his
// five; a teammate sees your aura ring and summons. Screenshots /tmp/runes-*.png. node scripts/runes.mjs [url ?server=]
import { chromium } from 'playwright';
const SRV = 'http://127.0.0.1:4111', URL = process.argv[2] || `http://localhost:5180/?server=${encodeURIComponent(SRV)}`;
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests'] });
const errs = [];
const device = async (n, w = 1280, h = 720) => {
  const page = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
  page.on('pageerror', (e) => errs.push(n + ': ' + e.message + '\n' + e.stack));
  await page.goto(URL); await page.waitForTimeout(700);
  return page;
};
const auth = async (p, u) => { await p.click('#btn-herm'); await p.fill('#acct-user', u); await p.fill('#acct-pass', 'secret123'); await p.click('#acct-signup'); await p.waitForTimeout(900); await p.evaluate(() => game.hermitage.setGuide(false)); };
const log = (k, v) => console.log(k.padEnd(13), JSON.stringify(v));
const out = {};
const A = await device('A');
const u = 'ru' + Date.now() % 100000;
await auth(A, u + 'a');

// 1. the workbench's Runes tab: forge Long Stride from the stash
await A.evaluate(() => { const d = game.accounts.data; d.items = { scrap_iron: 40, ash_rag: 40, copper_coil: 20, spent_casings: 20, promethium_residue: 20, cracked_lens: 20, servo_motor: 10, purity_seal: 10, augury_shard: 5 }; game.hermitage.setWork(true); });
await A.click('#hm-work .wk-tabs [data-wt=runes]'); await A.waitForTimeout(200);
out.bench = await A.evaluate(() => ({ tiles: document.querySelectorAll('#wk-grid .wk-tile').length, canForge: document.querySelectorAll('#wk-grid .wk-can').length }));
await A.hover('#wk-grid .wk-tile:first-child'); await A.waitForTimeout(150);
await A.screenshot({ path: '/tmp/runes-bench.png' });
await A.click('#wk-detail .wk-go'); await A.waitForTimeout(200);
out.forged = await A.evaluate(() => ({ owns: !!game.accounts.data.runes?.long_stride, scrap: game.accounts.data.items.scrap_iron }));
// forge the rest of what's affordable (as the workbench would) and look at the stash's Runes tab
await A.evaluate(() => { const d = game.accounts.data; for (const id of ['cinder_halo', 'scrap_hound', 'litany_fury', 'far_step', 'second_wind', 'chill_halo', 'iron_blood']) d.runes[id] = 1; game.hermitage.setWork(false); game.hermitage.setStash(true); game.hermitage.stashTab = 'runes'; game.hermitage.renderStash(); });
out.stash = await A.evaluate(() => ({ shown: document.querySelectorAll('#hm-slots .hm-slot canvas').length, note: document.getElementById('hm-worth').textContent }));
await A.screenshot({ path: '/tmp/runes-stash.png' });

// 2. sockets: the tree's three sockets, one of each type, supports repeat
out.sockets = await A.evaluate(() => {
  const g = game, d = g.accounts.data, tree = g.treeUI;
  g.hermitage.setStash(false); tree.open('knight');
  const sockets = [...tree.tree.nodes.values()].filter((n) => n.role === 'socket').map((n) => n.id);
  d.tree.knight = [...new Set([...(d.tree.knight || []), ...sockets])]; // (owned, for the test)
  tree.render();
  const res = {};
  tree.click(sockets[0]); res.pickerOpen = !document.getElementById('tree-tip').classList.contains('hidden') && document.querySelectorAll('#tree-tip .tt-runes .tt-pick').length;
  tree.pick(sockets[0], 'cinder_halo');
  tree.click(sockets[1]); res.blocked = [...document.querySelectorAll('#tree-tip .tt-runes .tt-pick')].filter((b) => b.disabled).map((b) => b.dataset.pick);
  tree.pick(sockets[1], 'chill_halo'); res.secondAuraRefused = !d.runeSlots.knight[sockets[1]];
  tree.pick(sockets[1], 'long_stride'); tree.pick(sockets[2], 'far_step');
  res.slots = { ...d.runeSlots.knight };
  res.icon = !!document.querySelector(`#tree-svg [data-node="${sockets[0]}"] image`);
  return { ...res, sockets };
});
await A.screenshot({ path: '/tmp/runes-tree.png' });
await A.evaluate(() => game.treeUI.close?.());

// 3. in a raid: roll distance, the aura burn and slow
out.raid = await A.evaluate(() => {
  const g = game, d = g.accounts.data; g.loop = () => {}; g.audio.play = () => {};
  const run = (s) => { for (let i = 0; i < Math.round(s * 60); i++) g.step(1 / 60, 1 / 60); };
  const begin = () => { g.hermitage.close(false); g.start('knight'); const p = g.player; p.st = p.maxSt = 1e5; for (const e of g.enemies) e.update = () => {}; return p; };
  let p = begin();
  const res = { L: { dist: +p.runeL.roll.dist.toFixed(2), aura: p.runeL.aura && [p.runeL.aura.r, p.runeL.aura.burn] } };
  // a roll's distance
  const x0 = p.pos.clone(); p.setState('move'); p.startRoll(p.fwd()); run(0.8); res.rollDist = +p.pos.distanceTo(x0).toFixed(2);
  // the aura burns a grunt standing in it
  const e = g.enemies.find((x) => x.alive && x.type === 'grunt' && !x.reserve); e.pos.set(p.pos.x + 1.5, 0, p.pos.z); const hp0 = e.hp;
  run(1.1); res.burned = Math.round(hp0 - e.hp);
  res.ring = !!g.runes.ring?.visible;
  // a plain run for the roll's base distance
  d.runeSlots.knight = {}; p = begin(); const y0 = p.pos.clone(); p.setState('move'); p.startRoll(p.fwd()); run(0.8); res.baseRoll = +p.pos.distanceTo(y0).toFixed(2);
  return res;
});

// 4. summon, buff, Second Wind
out.keys = await A.evaluate(() => {
  const g = game, d = g.accounts.data;
  const socks = [...g.treeUI.tree.nodes.values()].filter((n) => n.role === 'socket').map((n) => n.id);
  d.runeSlots.knight = { [socks[0]]: 'scrap_hound', [socks[1]]: 'litany_fury', [socks[2]]: 'second_wind' };
  const run = (s) => { for (let i = 0; i < Math.round(s * 60); i++) g.step(1 / 60, 1 / 60); };
  g.start('knight'); const p = g.player; p.st = p.maxSt = 1e5; for (const e of g.enemies) e.update = () => {};
  const res = {};
  const e = g.enemies.find((x) => x.alive && x.type === 'grunt' && !x.reserve); e.pos.set(p.pos.x + 4, 0, p.pos.z + 1); const hp0 = e.hp;
  g.input.pressed.add('summon'); run(0.1);
  res.pets = g.runes.pets.length; res.cd = Math.round(p.summonCd);
  g.input.pressed.add('summon'); run(0.05); res.stillOnCd = g.runes.pets.length === 1 && p.summonCd > 40;
  run(3); res.houndBit = Math.round(hp0 - e.hp);
  const dm = p.dmgMul; g.input.pressed.add('runebuff'); run(0.1); res.buff = { on: p.buffKind, mul: +(p.dmgMul / dm).toFixed(2), uses: p.buffUses };
  g.input.pressed.add('runebuff'); run(0.1); res.buffSpentStays = p.buffUses === 0;
  run(12.5); res.buffOver = { kind: p.buffKind, mul: +(p.dmgMul / dm).toFixed(2) };
  run(10); res.petGone = g.runes.pets.length;
  res.hud = document.getElementById('rune-hud').textContent;
  // Second Wind: a fall caught once
  p.hp = 5; p.receive({ dmg: 1e6, poise: 0, srcPos: e.pos, parryable: false }); res.wind = { alive: p.alive, hp: Math.round(p.hp / p.maxHp * 100), left: p.winds };
  p.hp = 5; p.receive({ dmg: 1e6, poise: 0, srcPos: e.pos, parryable: false }); res.secondFall = p.alive;
  return res;
});
await A.evaluate(() => { game.toTitle(); });

// 5. Varek falls: his five runes; then Sandevistan, the Halo, the Echo and Last Stand in a raid
out.varek = await A.evaluate(() => {
  const g = game, d = g.accounts.data, socks = [...g.treeUI.tree.nodes.values()].filter((n) => n.role === 'socket').map((n) => n.id);
  g.loop = () => {}; g.audio.play = () => {};
  d.gems = { gem_hask: 1, gem_vael: 1, gem_gorrath: 1 }; g.raidArea = 'r1f'; g.start('knight'); // (the Sentinel's Bastion: Varek's raid, behind the three gems)
  const enc = g.encounters.find((x) => x.boss?.cfg?.id === 'varek');
  if (enc) { g.startEncounter(enc); g.onBossDeath(enc.boss); }
  const got = ['sandevistan', 'varek_halo', 'sentinel_echo', 'last_stand', 'archon_mantle'].filter((id) => d.runes[id]);
  g.toTitle(); g.raidArea = 'r1a1';
  d.runeSlots.knight = { [socks[0]]: 'sandevistan', [socks[1]]: 'sentinel_echo', [socks[2]]: 'last_stand' };
  return { encounter: !!enc, got };
});
out.unique = await A.evaluate(() => {
  const g = game, run = (s) => { for (let i = 0; i < Math.round(s * 60); i++) g.step(1 / 60, 1 / 60); };
  g.loop = () => {}; g.audio.play = () => {};
  g.start('knight'); const p = g.player; p.st = p.maxSt = 1e5;
  const res = { dist: +p.runeL.roll.dist.toFixed(2) };
  p.setState('move'); p.startRoll(p.fwd()); run(0.1);
  res.ghosts = g.runes.ghosts.length; res.foeTime = g.runes.foeTime;
  run(1.2); res.foeTimeAfter = g.runes.foeTime;
  g.input.pressed.add('summon'); run(0.1); res.echo = g.runes.pets.map((x) => x.pet);
  const e = g.enemies.find((x) => x.alive && x.type === 'grunt' && !x.reserve); for (const x of g.enemies) if (x !== e) x.update = () => {}; e.update = () => {};
  e.pos.set(p.pos.x + 3, 0, p.pos.z); const hp0 = e.hp; run(3); res.echoHit = Math.round(hp0 - e.hp);
  g.input.pressed.add('runebuff'); run(0.1);
  p.hp = 50; p.receive({ dmg: 1e6, poise: 0, srcPos: e.pos, parryable: false }); res.stand = { alive: p.alive, hp: p.hp };
  return res;
});
// shots: the echo, a Sandevistan roll, the hound
await A.evaluate(() => {
  const g = game, p = g.player, run = (s) => { for (let i = 0; i < Math.round(s * 60); i++) g.step(1 / 60, 1 / 60); };
  document.getElementById('hud').style.display = 'none';
  p.setState('move'); p.startRoll(p.fwd()); run(0.22);
  const c = g.camera; c.position.set(p.pos.x + 4, 3.5, p.pos.z + 5); c.lookAt(p.pos.x, 1, p.pos.z); g.camLock = true; g.pixel.render(g.scene, c);
});
await A.screenshot({ path: '/tmp/runes-sande-echo.png' });
await A.evaluate(() => { document.getElementById('hud').style.display = ''; game.camLock = false; game.toTitle(); });

// 6. a party: the guest sees the host's aura ring and summons; the host slows enemies in the guest's aura
const H = await device('H', 900, 500), Gp = await device('G', 900, 500);
await auth(H, u + 'h'); await auth(Gp, u + 'g');
await H.evaluate(() => { const g = game, d = g.accounts.data; g.treeUI.open('knight'); const s = [...g.treeUI.tree.nodes.values()].filter((n) => n.role === 'socket').map((n) => n.id); g.treeUI.close?.(); d.tree.knight = s; d.runes = { varek_halo: 1, scrap_hound: 1 }; d.runeSlots = { knight: { [s[0]]: 'varek_halo', [s[1]]: 'scrap_hound' } }; });
await Gp.evaluate(() => { const g = game, d = g.accounts.data; g.treeUI.open('knight'); const s = [...g.treeUI.tree.nodes.values()].filter((n) => n.role === 'socket').map((n) => n.id); g.treeUI.close?.(); d.tree.knight = s; d.runes = { chill_halo: 1 }; d.runeSlots = { knight: { [s[0]]: 'chill_halo' } }; });
await H.click('#hm-party'); await H.click('#lobby-create'); await H.waitForTimeout(400);
const code = await H.textContent('#lobby-code');
await Gp.click('#hm-party'); await Gp.fill('#lobby-input', code); await Gp.click('#lobby-joinbtn'); await Gp.waitForTimeout(400);
await H.click('#lobby-start'); await H.waitForTimeout(2500);
await H.evaluate(() => { game.player.hp = game.player.maxHp = 1e7; game.input.pressed.add('summon'); });
await H.waitForTimeout(1500);
out.party = await Promise.all([
  Gp.evaluate(() => { const r = [...game.mp.peers.values()][0], R = game.runes.remote[r.pid]; return { ring: !!R?.ring, pets: R?.pets.map((x) => x.pet) || [] }; }),
  H.evaluate(() => { const r = [...game.mp.peers.values()][0], p = game.player; p.pos.set(r.pos.x + 30, 0, r.pos.z); return { guestAura: r.net?.ra || null, slowAtGuest: +game.runes.slowAt(r.pos.x + 1, r.pos.z).toFixed(2) }; }), // (the host stepped well away: only the guest's aura counts)
]);
await b.close();
for (const [k, v] of Object.entries(out)) log(k, v);
const R = out.raid, K = out.keys, U = out.unique, S = out.sockets;
const ok = out.bench.tiles === 25 && out.bench.canForge > 0 && out.forged.owns && out.forged.scrap === 34 && out.stash.shown === 8
  && S.pickerOpen > 0 && S.blocked.includes('chill_halo') && S.secondAuraRefused && S.icon && Object.values(S.slots).sort().join() === 'cinder_halo,far_step,long_stride'
  && Math.abs(R.L.dist - 1.23) < 0.01 && R.rollDist > R.baseRoll * 1.15 && R.burned > 0 && R.ring
  && K.pets === 1 && K.cd === 45 && K.stillOnCd && K.houndBit > 0 && K.buff.on === 'fury' && K.buff.mul === 1.15 && K.buff.uses === 0 && K.buffSpentStays && K.buffOver.kind === null && K.buffOver.mul === 1 && K.petGone === 0
  && K.wind.alive && K.wind.hp === 30 && K.wind.left === 0 && !K.secondFall
  && out.varek.encounter && out.varek.got.length === 5 && U.dist === 1.6 && U.ghosts > 0 && U.foeTime === 0.25 && U.foeTimeAfter === 1 && U.echo.join() === 'echo' && U.echoHit > 0 && U.stand.alive && U.stand.hp === 1
  && out.party[0].ring && out.party[0].pets.join() === 'hound' && out.party[1].guestAura && out.party[1].slowAtGuest === 0.88;
console.log(ok ? 'runes work' : 'RUNES PROBLEM');
console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'OK no errors');
