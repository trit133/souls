// Lobby: two players chat, switch class, and open Upgrades and Settings without leaving the room.
// Needs: vite preview on :4173 and `DB_PATH=/tmp/x.db PORT=4111 node server/index.js`.
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const SRV = 'http://127.0.0.1:4111', URL = process.argv[2] || `http://localhost:4173/?server=${encodeURIComponent(SRV)}`;
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests'] });
mkdirSync('.shots', { recursive: true });
const errs = [];
const device = async (n, viewport) => {
  const ctx = await b.newContext({ viewport }), page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push(n + ': ' + e.message + '\n' + e.stack));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(n + ' console: ' + m.text()); });
  await page.goto(URL); await page.waitForTimeout(600);
  return page;
};
const auth = async (p, u) => { await p.click('#btn-acct'); await p.fill('#acct-user', u); await p.fill('#acct-pass', 'secret123'); await p.click('#acct-signup'); await p.waitForTimeout(600); };
const visible = (p, sel) => p.isVisible(sel);
const text = (p, sel) => p.textContent(sel);
let fails = 0;
const check = (name, ok, detail = '') => { console.log((ok ? 'ok   ' : 'FAIL ') + name + (detail ? '  ' + detail : '')); if (!ok) fails++; };

const A = await device('A', { width: 1280, height: 720 }), B = await device('B', { width: 740, height: 390 });
await A.screenshot({ path: '.shots/ui-title.png' });
const u = 'l' + Date.now() % 100000;
await auth(A, u + 'a'); await auth(B, u + 'b');

await A.click('#btn-mp'); await A.waitForTimeout(200);
await A.screenshot({ path: '.shots/ui-lobby-out.png' });
check('chat hidden before joining', !(await visible(A, '#chat-log')));
await A.click('#lobby-create'); await A.waitForTimeout(700);
const code = (await text(A, '#lobby-code')).trim();
check('room created', /^[A-Z]{4}$/.test(code), code);
check('back button says Leave Room', (await text(A, '#lobby-back')) === 'Leave Room');

await B.click('#btn-mp'); await B.fill('#lobby-input', code); await B.press('#lobby-input', 'Enter'); await B.waitForTimeout(700);
check('B joined by pressing Enter', (await text(B, '#lobby-code')).trim() === code);
check('A sees the join notice', (await text(A, '#chat-log')).includes(u + 'b joined'));

await A.fill('#chat-input', 'hello <b>there</b>'); await A.press('#chat-input', 'Enter'); await A.waitForTimeout(400);
check('B receives chat, as plain text', (await text(B, '#chat-log')).includes('hello <b>there</b>'));
check('A input clears after sending', (await A.inputValue('#chat-input')) === '');
await B.fill('#chat-input', 'ready when you are'); await B.click('#chat-form button'); await B.waitForTimeout(400);
check('A receives reply', (await text(A, '#chat-log')).includes('ready when you are'));

await B.click('[data-pick="rogue"]'); await B.waitForTimeout(400);
check('A sees B switch to Rogue', (await text(A, '#lobby-members')).includes('Rogue'));

// Spellsword is locked for a new account: it opens Upgrades on top of the lobby
await B.click('[data-pick="mage"]'); await B.waitForTimeout(200);
check('locked class opens Upgrades', await visible(B, '#shop'));
await B.click('#shop-back'); await B.waitForTimeout(200);
check('back in the lobby after Upgrades', await visible(B, '#lobby') && (await text(B, '#lobby-code')).trim() === code);

await B.click('#lobby-shop'); await B.waitForTimeout(200);
check('Upgrades button opens shop', await visible(B, '#shop'));
await B.click('#shop-back');
await B.click('#lobby-settings'); await B.waitForTimeout(200);
check('Settings button opens settings', await visible(B, '#settings'));
await B.click('#set-back'); await B.waitForTimeout(200);
check('still in the room after Settings', (await text(B, '#lobby-code')).trim() === code);

await A.fill('#chat-input', 'starting soon'); await A.press('#chat-input', 'Enter'); await A.waitForTimeout(400);
await A.screenshot({ path: '.shots/ui-lobby-room.png' });
await B.screenshot({ path: '.shots/ui-lobby-room-phone.png' });

await B.click('#lobby-back'); await B.waitForTimeout(500);
check('B left but lobby stays open', await visible(B, '#lobby-join') && await visible(B, '#lobby'));
check('A sees B leave', (await text(A, '#chat-log')).includes(u + 'b left'));
check('Start disabled when alone', await A.isDisabled('#lobby-start'));

console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no page errors');
await b.close();
process.exit(fails || errs.length ? 1 : 0);
