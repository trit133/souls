// Settings: rebinding (keyboard + mouse, conflicts, clear), volumes, per-account storage.
import { chromium } from 'playwright';
const SRV = 'http://127.0.0.1:4111', URL = `http://localhost:4173/?server=${encodeURIComponent(SRV)}`;
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = [];
const dev = async () => { const p = await (await b.newContext({ viewport: { width: 900, height: 520 } })).newPage(); p.on('pageerror', (e) => errs.push(e.message)); await p.goto(URL); await p.waitForTimeout(500); return p; };
const auth = async (p, u, btn) => { await p.click('#btn-acct'); await p.fill('#acct-user', u); await p.fill('#acct-pass', 'secret123'); await p.click(btn); await p.waitForTimeout(700); };
const log = (k, v) => console.log(k.padEnd(18), JSON.stringify(v));
const A = await dev(), u = 'set' + Date.now() % 100000;
await auth(A, u, '#acct-signup');
await A.click('#btn-settings');
log('owner', await A.textContent('#set-owner'));
// rebind attack (row 6, primary) to G
const btn = (row, slot) => A.locator('#binds button').nth(row * 2 + slot);
await btn(5, 0).click(); await A.keyboard.press('KeyG'); await A.waitForTimeout(100);
// rebind roll primary to KeyJ... then put heal on right click (taken by heavy -> moves)
await btn(11, 1).click(); await A.mouse.click(300, 300, { button: 'right' }); await A.waitForTimeout(100);
await btn(9, 1).click(); await A.keyboard.press('Backspace'); await A.waitForTimeout(100);
await btn(4, 0).click(); await A.keyboard.press('Escape'); await A.waitForTimeout(100);
log('binds', await A.evaluate(() => ({ attack: game.settings.binds.attack, heavy: game.settings.binds.heavy, interact: game.settings.binds.interact, heal: game.settings.binds.heal, sprint: game.settings.binds.sprint })));
await A.locator('[data-set=music]').fill('20'); await A.locator('[data-set=music]').dispatchEvent('change');
await A.locator('[data-set=shake]').fill('0'); await A.locator('[data-set=shake]').dispatchEvent('change');
await A.waitForTimeout(500);
log('help text', await A.textContent('#kb-help'));
// the new binding drives the game
await A.click('#set-back');
await A.click('.char[data-char="knight"]'); await A.waitForTimeout(600);
const r = await A.evaluate(async () => {
  game.loop = () => {}; game.audio.play = () => {};
  const p = game.player; p.setState('move');
  const fire = (code) => { dispatchEvent(new KeyboardEvent('keydown', { code })); dispatchEvent(new KeyboardEvent('keyup', { code })); };
  fire('KeyJ'); game.step(1 / 60, 1 / 60); const oldKey = p.state;
  p.setState('move'); p.st = p.maxSt; fire('KeyG'); game.step(1 / 60, 1 / 60); const newKey = p.state;
  p.setState('move'); dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' })); for (let i = 0; i < 20; i++) game.step(1 / 60, 1 / 60); dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
  return { oldJ: oldKey, newG: newKey, wMoves: +p.speed.toFixed(1), shake: game.fx.shakeMul };
});
log('in game', r);
// another device signs in to the same account and gets the same settings
const B = await dev(); await auth(B, u, '#acct-signin');
log('other device', await B.evaluate(() => [game.settings.binds.attack, game.settings.music, game.settings.shake]));
// a different account keeps its own (defaults)
const C = await dev(); await auth(C, u + 'x', '#acct-signup');
log('other account', await C.evaluate(() => [game.settings.binds.attack, game.settings.music]));
// pause menu has settings
await C.click('.char[data-char="knight"]'); await C.waitForTimeout(500); await C.keyboard.press('Escape'); await C.waitForTimeout(200);
await C.click('#pause-settings'); log('from pause', await C.isVisible('#settings'));
if (errs.length) { console.log('ERRORS', errs.slice(0, 4)); process.exitCode = 1; } else console.log('OK no errors');
await b.close();
