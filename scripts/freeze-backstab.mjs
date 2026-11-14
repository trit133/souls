// The Psy-Staff's sigil (radius 5.5, 10 s between casts) freezes the enemies inside it when laid for 5 s (a boss or
// mini boss isn't frozen: it's chilled for 4 s, moving and swinging at 30%),
// held in place in a block of ice, hurt by hits but not knocked out of it, and thawing back into the fight; a party
// guest sees the same. The Ghost Veil's first strike is always the backstab (the Wrist Blades' rip: triple damage,
// facing or not). The Penitent Slab's second swing is slower and hits harder; the staff's heavy fires a laser.
// node scripts/freeze-backstab.mjs [url with ?server=]
import { chromium } from 'playwright';
const SRV = 'http://127.0.0.1:4111', URL = process.argv[2] || `http://localhost:4173/?server=${encodeURIComponent(SRV)}`;
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests'] });
const errs = [];
const device = async (n) => {
  const page = await (await b.newContext({ viewport: { width: 640, height: 360 } })).newPage();
  page.on('pageerror', (e) => errs.push(n + ': ' + e.message + '\n' + e.stack));
  await page.goto(URL); await page.waitForTimeout(500);
  return page;
};
const log = (k, v) => console.log(k.padEnd(13), JSON.stringify(v));
const res = {};

// ---- alone: the mechanics, stepped by hand
const A = await device('A');
Object.assign(res, await A.evaluate(() => {
  const g = game, out = {}; g.loop = () => {}; g.audio.play = () => {};
  const run = (s) => { for (let i = 0; i < Math.round(s * 60); i++) g.step(1 / 60, 1 / 60); };
  const begin = (kind, weapon, evo = null) => { g.loadoutFor = () => ({ weapon, evo }); g.start(kind); const p = g.player; p.hp = p.maxHp = 1e7; p.st = p.maxSt = 1e5; p.mana = p.maxMana = 1e4; return p; };

  // 1. the sigil
  let p = begin('mage', 'psystaff');
  const grunts = g.enemies.filter((e) => e.alive && e.type === 'grunt' && !e.reserve).slice(0, 3);
  for (const e of g.enemies) if (!grunts.includes(e)) { e.update = () => {}; e.rig.root.visible = false; }
  const X = p.pos.x, Z = p.pos.z;
  grunts[0].pos.set(X + 4.2, 0, Z); grunts[1].pos.set(X, 0, Z + 5.0); grunts[2].pos.set(X - 8, 0, Z);
  for (const e of grunts) { e.sitting = false; e.target = p; e.setState('chase'); }
  run(0.1);
  p.castSigil(p.pos.clone().set(0, 0, 1), 0); run(0.45);
  p.setState('move'); out.cooldown = { again: p.castSigil(p.pos.clone().set(0, 0, 1), 0), left: +p.sigilCd.toFixed(1), hud: (g.ui.update(0, p), document.getElementById('ability').textContent) };
  out.sigil = { states: grunts.map((e) => e.state), left: grunts.map((e) => +((e.frozenUntil || 0) - g.time).toFixed(1)), ice: grunts.map((e) => !!e.ice?.visible) };
  const hp0 = grunts[0].hp; g.resolveHit(p, grunts[0], p.c.attacks.t3.hits[0], p.c.attacks.t3); run(0.05);
  out.hitFrozen = { hpLost: Math.round(hp0 - grunts[0].hp), state: grunts[0].state };
  const pos0 = grunts[1].pos.clone(); run(3); out.heldStill = +grunts[1].pos.distanceTo(pos0).toFixed(2);
  run(2); out.thawed = { states: grunts.slice(0, 2).map((e) => e.state), ice: grunts.slice(0, 2).map((e) => !!e.ice?.visible) };
  // a boss inside: chilled, not frozen (after the cooldown)
  const boss = g.bosses[0];
  const enc = g.encounters.find((x) => x.boss); // (a boss is in the fight once its encounter starts)
  run(p.sigilCd + 0.05); // (the cooldown runs out)
  if (enc) { g.startEncounter(enc); const boss = enc.boss; boss.update = Object.getPrototypeOf(boss).update; boss.setState('neutral'); boss.pos.set(p.pos.x + 2, 0, p.pos.z + 2); p.iframe = () => true; run(0.1); p.mana = 1e4; p.setState('move'); out.cdOver = p.castSigil(p.pos.clone().set(0, 0, 1), 0); run(0.45); out.boss = { state: boss.state, chillLeft: +((boss.chillUntil || 0) - g.time).toFixed(1), speed: boss.chillMul(), frost: boss.chillFxUntil > g.time }; }

  // 2. the laser
  p = begin('mage', 'psystaff');
  p.doAttack('heavy', p.pos.clone().set(0, 0, 1), 0);
  let beams = 0; for (let i = 0; i < 30; i++) { g.step(1 / 60, 1 / 60); beams = Math.max(beams, g.beams?.length || 0); }
  out.laser = beams;

  // 3. the Ghost Veil's strike: always the rip, always triple, facing or not
  const dmgOf = (veil) => {
    const q = begin('rogue', 'wristblade', 'ghostVeil');
    const e = g.enemies.find((x) => x.alive && x.type === 'grunt' && !x.reserve);
    for (const x of g.enemies) if (x !== e) x.update = () => {};
    e.update = () => {}; e.pos.set(q.pos.x, 0, q.pos.z + 1.4); e.yaw = Math.PI; // facing him
    q.yaw = 0; q.setState('move'); if (veil) q.veilT = 3;
    let dmg = 0, backstab = false; const rec = e.receive.bind(e); e.receive = (info) => { dmg += info.dmg; backstab ||= !!info.backstab; return rec(info); };
    q.doAttack('w1', q.pos.clone().set(0, 0, 1), 0);
    const key = q.atkKey; run(0.9);
    return { key, dmg: Math.round(dmg), backstab };
  };
  const plain = dmgOf(false), veiled = dmgOf(true);
  out.veil = { plain, veiled, ratio: +(veiled.dmg / plain.dmg).toFixed(2) };

  // 4. the slab's second swing
  const G = (begin('knight', 'greatsword'), g.player.c.attacks);
  out.slab = { g1: [G.g1.dur, G.g1.hits[0].dmg], g2: [G.g2.dur, G.g2.hits[0].t0, G.g2.hits[0].dmg], gc2: G.gc2.hits[0].dmg, gRise: [G.gRise.dur, G.gRise.hits[0].t0] };
  return out;
}));

// ---- a party: the host's sigil freezes, the guest sees the ice
const H = await device('H'), Gst = await device('G');
const auth = async (p, u) => { await p.click('#btn-herm'); await p.fill('#acct-user', u); await p.fill('#acct-pass', 'secret123'); await p.click('#acct-signup'); await p.waitForTimeout(600); };
const u = 'fz' + Date.now() % 100000;
await auth(H, u + 'h'); await auth(Gst, u + 'g');
await H.evaluate(() => { game.loadoutFor = () => ({ weapon: 'psystaff', evo: null }); });
await H.evaluate(() => game.hermitage.open('mage'));
await H.click('#hm-party'); await H.click('#lobby-create'); await H.waitForTimeout(400);
const code = await H.textContent('#lobby-code');
await Gst.click('#hm-party'); await Gst.fill('#lobby-input', code); await Gst.click('#lobby-joinbtn'); await Gst.waitForTimeout(400);
await H.click('#lobby-start'); await H.waitForTimeout(2500);
const id = await H.evaluate(() => {
  const g = game, p = g.player; p.hp = p.maxHp = 1e7; p.mana = p.maxMana = 1e4;
  const e = g.enemies.find((x) => x.alive && x.type === 'grunt' && !x.reserve);
  for (const x of g.enemies) if (x !== e) x.update = () => {};
  e.pos.set(p.pos.x + 2, 0, p.pos.z + 1); e.sitting = false; e.target = p; e.setState('chase');
  window.__e = e.netId; return e.netId;
});
await Gst.evaluate((id) => { const p = game.player; p.hp = p.maxHp = 1e7; const e = game.netMap[id]; p.pos.set(e.pos.x - 2, 0, e.pos.z + 3); game.lastGood = null; }, id);
await H.waitForTimeout(600);
// (the host's page runs in real time and may be mid-flinch: cast until the sigil is down)
for (let i = 0; i < 4 && !(await H.evaluate(() => game.sigils?.length || 0)); i++) { await H.evaluate(() => { const p = game.player; p.setState('move'); p.castSigil(p.pos.clone().set(0, 0, 1), 0); }); await H.waitForTimeout(900); }
await H.waitForTimeout(400);
res.party = await Promise.all([H.evaluate(() => { const e = game.netMap[window.__e]; return [e.state, !!e.ice?.visible]; }), Gst.evaluate((id) => { const e = game.netMap[id]; return [e.state, !!e.ice?.visible, game.sigils?.length || 0]; }, id)]);
await b.close();

for (const [k, v] of Object.entries(res)) log(k, v);
const s = res.sigil, ok = s.states[0] === 'frozen' && s.states[1] === 'frozen' && s.states[2] !== 'frozen' && Math.abs(s.left[0] - 4.8) < 0.2 && s.ice[0] && !s.ice[2]
  && res.hitFrozen.hpLost > 0 && res.hitFrozen.state === 'frozen' && res.heldStill < 0.05 && !res.thawed.states.includes('frozen') && !res.thawed.ice.includes(true)
  && res.cooldown.again === false && Math.abs(res.cooldown.left - 9.6) < 0.2 && /Sigil \d+s/.test(res.cooldown.hud) && res.cdOver === true
  && res.boss?.state !== 'frozen' && Math.abs(res.boss.chillLeft - 3.8) < 0.2 && res.boss.speed === 0.3 && res.boss.frost && res.laser === 1
  && res.veil.plain.key === 'w1' && res.veil.veiled.key === 'wRip' && res.veil.veiled.backstab && !res.veil.plain.backstab && res.veil.ratio > 2.6 && res.veil.ratio < 3.4
  && res.slab.g2[0] === 1.25 && res.slab.g2[2] === 54 && res.slab.gc2 === 58 && res.slab.gRise[0] === 0.95 && res.slab.gRise[1] === 0.34
  && res.party[0][0] === 'frozen' && res.party[0][1] && res.party[1][0] === 'frozen' && res.party[1][1] && res.party[1][2] === 1;
console.log(ok ? 'freeze and backstab work' : 'FREEZE/BACKSTAB PROBLEM');
console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'OK no errors');
