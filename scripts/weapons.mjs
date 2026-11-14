// Weapons (weapons.js, weaponmoves.js): every weapon fights with its own moves and combos; the new specials (Blade
// Guard, the Wrist Blade's dash, the Psy-Staff's sigil) and evolutions (Beast Within, Ghost Veil, Storm Sigil) work;
// with an account the workbench crafts a weapon and its evolution from the stash, the equipment stand equips it and
// switches the evolution, the wardrobe shows its skin slot, and an old tree evolution comes back built.
// node scripts/weapons.mjs [url with ?server=]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:4173/?server=' + encodeURIComponent('http://127.0.0.1:4111');
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 1100, height: 620 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + '\n' + (e.stack || '').split('\n').slice(0, 3).join('\n')));
await page.goto(url); await page.waitForTimeout(800);

// ---- the mechanics (no account needed: the loadout is set by hand) ----
const mech = await page.evaluate(() => {
  const g = game, res = {}; g.loop = () => {}; g.audio.play = () => {};
  const run = (n, fn) => { for (let i = 0; i < n; i++) { fn && fn(); g.step(1 / 60, 1 / 60); } };
  const begin = (kind, weapon, evo) => { g.loadoutFor = () => ({ weapon, evo }); g.start(kind); const p = g.player; p.hp = p.maxHp = 1e7; p.st = p.maxSt = 500; p.mana = p.maxMana = 500; for (const e of g.enemies) e.update = () => {}; return p; };
  const foe = (p, d = 2) => { const e = g.enemies.find((x) => x.alive && x.type === 'grunt' && !x.elite) || g.enemies.find((x) => x.alive); e.pos.set(p.pos.x, 0, p.pos.z + d); e.yaw = Math.PI; e.mod = g.world.dungeon.modAt(e.pos.x, e.pos.z).i; e.roam = g.world.dungeon.roam(e.mod); return e; };
  const place = (p) => { const s = g.world.dungeon.startAt; p.pos.set(s.x, 0, s.z - 6); g.lastGood = null; p.yaw = 0; };

  // every weapon: its own light, heavy, and a combo's finisher
  for (const [kind, w] of [['knight', 'greatsword'], ['rogue', 'wristblade'], ['mage', 'psystaff']]) {
    const p = begin(kind, w, null); place(p);
    const seen = new Set(); let fin = null;
    // the first light, then each next one the moment the combo's window opens (the red mark)
    g.input.pressed.add('attack'); let pressed = 0;
    run(240, () => { p.st = 500; if (p.atkKey) seen.add(p.atkKey); if (p.atk?.def.finisher) fin = p.atk.def.finisher;
      if (p.cmb && p.cmb.openAt != null && g.time >= p.cmb.openAt && pressed < 2 && p.cmb !== res.lastCmb) { res.lastCmb = p.cmb; g.input.pressed.add('attack'); pressed++; } });
    delete res.lastCmb;
    g.input.pressed.add('heavy'); run(10, () => { if (p.atkKey) seen.add(p.atkKey); });
    res[w] = { moves: [...seen], finisher: fin, model: !!p.rig.wpnR, offhand: !!p.rig.wpnL, combos: p.c.comboList.map((c) => c.name) };
  }

  // Blade Guard and Beast Within
  { const p = begin('knight', 'greatsword', 'berserk'); place(p); const e = foe(p);
    p.yaw = 0; g.input.held.special = true; run(10);
    const hp0 = p.hp; const r = p.receive({ dmg: 100, srcPos: e.pos, attacker: e, hit: {}, knock: 'heavy' }); const lost = hp0 - p.hp;
    g.input.pressed.add('heavy'); run(4);
    const rage = { t: +p.rageT.toFixed(1), cd: p.rageCd };
    g.input.held.special = false; run(5); p.st = 500;
    const s0 = p.state; p.receive({ dmg: 100, srcPos: e.pos, attacker: e, hit: {}, knock: 'heavy' });
    res.guard = { blocked: r, lostOf100: Math.round(lost), rage, staggeredInRage: p.state !== s0 && p.state !== 'move' };
  }
  // the dash and Ghost Veil
  { const p = begin('rogue', 'wristblade', 'ghostVeil'); place(p); const x0 = p.pos.clone();
    g.input.pressed.add('special'); run(3); const inDash = p.state === 'dash', untouchable = p.iframe();
    run(20); const moved = +p.pos.distanceTo(x0).toFixed(1), cd = +p.dashCd.toFixed(1);
    g.input.pressed.add('special'); run(3); const again = p.state === 'dash';
    const hunter = foe(p, 5); delete hunter.update; hunter.setState('chase'); run(2);
    const veil = { t: +p.veilT.toFixed(1), shade: !!p.veiled, hunterGivesUp: hunter.state === 'return' };
    // a strike from behind out of the veil, against the same strike in the open
    const e = foe(p, 1.2); e.yaw = 0; p.yaw = 0; // (it faces away from you)
    e.hp = e.maxHp = 1e6; const h0 = e.hp; g.resolveHit(p, e, p.c.attacks.w1.hits[0], p.c.attacks.w1); const plain = h0 - e.hp;
    p.veilStrike = true; const h1 = e.hp; g.resolveHit(p, e, p.c.attacks.w1.hits[0], p.c.attacks.w1); const back = h1 - e.hp;
    res.dash = { inDash, untouchable, moved, cd, again, veil, backstabX: +(back / plain).toFixed(1) };
  }
  // the Warding Sigil and Storm Sigil
  { const p = begin('mage', 'psystaff', 'stormSigil'); place(p); const e = foe(p, 2); e.hp = e.maxHp = 1e6; delete e.update;
    const m0 = p.mana; g.input.pressed.add('special'); run(45);
    const S = g.sigils?.[0];
    const slow = g.sigilSlowAt(e.pos.x, e.pos.z);
    const q = { pos: e.pos.clone().setY(1), vel: new (p.pos.constructor)(0, 0, 1), life: 2, r: 0.3, dmg: 1, kind: 'arrow' }; g.projectiles.push(q); run(2);
    const h0 = e.hp; run(80);
    res.sigil = { placed: !!S, storm: !!S?.storm, manaCost: Math.round(m0 - p.mana), slow, shotBroke: !g.projectiles.includes(q), zapped: e.hp < h0 };
    run(360); res.sigil.gone = !g.sigils.length;
  }
  return res;
});

// ---- the workbench, the equipment stand, the wardrobe, and the tree's old evolution (an account) ----
await page.evaluate(() => game.toTitle()); await page.waitForTimeout(300);
await page.click('#btn-herm'); await page.fill('#acct-user', 'wpn' + Date.now().toString().slice(-6)); await page.fill('#acct-pass', 'secret123');
await page.click('#acct-signup'); await page.waitForTimeout(1500);
const bench = await page.evaluate(() => {
  const g = game, d = g.accounts.data, W = g.weaponsLib, res = {};
  delete g.loadoutFor; // (back to the real one)
  g.hermitage.setGuide(false);
  // an old account that bought the Templar's evolution in the tree: it comes back built at the workbench
  d.treeV = 18; d.tree = { ...(d.tree || {}), knight: [W.TREES.knight.evoId] }; g.refreshTitle();
  res.migrated = { treeV: d.treeV, aegis: !!d.weapons?.evos?.aegisRam, node: W.TREES.knight.nodes.get(W.TREES.knight.evoId)?.notable };
  // enough materials for the greatsword and its evolution
  d.items = { scrap_iron: 40, spent_casings: 20, ash_rag: 20, copper_coil: 10, promethium_residue: 10, cracked_lens: 10, servo_motor: 6, purity_seal: 6, augury_shard: 4, oracle_core: 2 };
  g.hermitage.setKind('knight', true); g.hermitage.setWork(true);
  // the grid's tiles: an owned one ticked, an unmade one dark (! when it can be made), the regions to come '?'
  res.menu = [...document.querySelectorAll('#wk-grid .wk-tile')].map((t) => t.querySelector('.wk-n').textContent + (t.querySelector('.wk-q') ? ' [?]' : '') + (t.querySelector('.wk-ok') ? ' [owned]' : '') + (t.querySelector('.wk-can') ? ' [can forge]' : ''));
  return res;
});
await page.screenshot({ path: '/tmp/wpn-workbench.png' });
// hover the slab's tile: the detail fills in; hover a recipe row: the material's card; then forge it
await page.hover('#wk-grid .wk-tile:nth-child(2)'); await page.waitForTimeout(150);
const detail = await page.evaluate(() => ({ title: document.querySelector('#wk-detail h3')?.textContent, sections: [...document.querySelectorAll('#wk-detail h4')].map((h) => h.textContent), rows: document.querySelectorAll('#wk-detail .wk-mat').length, button: document.querySelector('#wk-detail .wk-go')?.textContent }));
await page.hover('#wk-detail .wk-mat:last-of-type'); await page.waitForTimeout(150);
detail.tip = await page.evaluate(() => !document.getElementById('wk-tip').classList.contains('hidden') && document.getElementById('wk-tip').innerText.replace(/\n/g, ' | '));
await page.screenshot({ path: '/tmp/wpn-workbench.png' });
await page.click('#wk-detail .wk-go'); await page.waitForTimeout(200); // forge the slab (still the one shown)
const crafted = await page.evaluate(() => ({ owned: !!game.accounts.data.weapons.owned.greatsword, iron: game.accounts.data.items.scrap_iron, menu: [...document.querySelectorAll('#wk-grid .wk-tile .wk-n')].map((x) => x.textContent) }));
await page.click('.wk-tabs [data-wt=evos]'); await page.waitForTimeout(100);
await page.click('#wk-grid .wk-tile:nth-child(2)'); await page.click('#wk-detail .wk-go'); await page.waitForTimeout(200); // build Beast Within
await page.screenshot({ path: '/tmp/wpn-workbench-evos.png' });
const built = await page.evaluate(() => ({ berserk: !!game.accounts.data.weapons.evos.berserk }));
await page.evaluate(() => game.hermitage.setEquip(true)); await page.waitForTimeout(200);
await page.screenshot({ path: '/tmp/wpn-equip.png' });
// equip the slab (the card that isn't equipped)
await page.click('#hm-equip-body .wb-card:not(.on) > .wb-go'); await page.waitForTimeout(300);
const equipped = await page.evaluate(() => ({ load: game.loadoutFor('knight'), rigHasShield: !!game.hermitage.rig?.shield }));
await page.click('#hm-equip-body .wb-card.on .wb-evo .wb-go'); await page.waitForTimeout(150); // switch Beast Within off
const evoOff = await page.evaluate(() => game.loadoutFor('knight'));
const wardrobe = await page.evaluate(() => { game.hermitage.setEquip(false); return game.skinMenu.slots('knight').map((s) => s.id); });
await b.close();
const out = { ...mech, bench, detail, crafted, built, equipped, evoOff, wardrobe };
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(10), JSON.stringify(v));
const ok = ['greatsword', 'wristblade', 'psystaff'].every((w) => out[w].moves.length >= 3 && out[w].finisher && out[w].model)
  && out.guard.blocked === 'block' && out.guard.lostOf100 <= 30 && out.guard.rage.t > 7 && !out.guard.staggeredInRage
  && out.dash.inDash && out.dash.untouchable && out.dash.moved > 2.5 && out.dash.cd > 2 && !out.dash.again && out.dash.veil.shade && out.dash.veil.hunterGivesUp && out.dash.backstabX >= 2.9
  && out.sigil.placed && out.sigil.storm && out.sigil.slow === 0.5 && out.sigil.shotBroke && out.sigil.zapped && out.sigil.gone
  && out.bench.migrated.aegis && out.bench.menu.some((m) => m.includes('[?]')) && out.bench.menu.some((m) => m.includes('[can forge]'))
  && out.detail.sections.includes('Recipe') && out.detail.rows >= 6 && out.detail.button === 'Forge' && out.detail.tip && out.detail.tip.includes('Found in') && out.crafted.owned && out.built.berserk && out.equipped.load.weapon === 'greatsword' && out.equipped.load.evo === 'berserk'
  && !out.equipped.rigHasShield && out.evoOff.evo === null && out.wardrobe.includes('greatsword') && !out.wardrobe.includes('shield');
console.log(ok ? 'weapons work' : 'WEAPONS PROBLEM');
console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'OK no errors');
