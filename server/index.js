// Ashen Vigil server: online accounts, saves, and a WebSocket relay for party rooms.
// Each player gets their own login token; only a hash of it is stored.
import http from 'node:http';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { WebSocketServer } from 'ws';

const PORT = +(process.env.PORT || 4100);
const DB = process.env.DB_PATH || new URL('./data/souls.db', import.meta.url).pathname;
const ORIGINS = new Set(['https://trit133.github.io', 'http://localhost:4173', 'http://localhost:5173', 'http://127.0.0.1:4173']);
const MAX_SAVE = 16 * 1024, MAX_PARTY = 3;

if (DB !== ':memory:') mkdirSync(new URL('.', 'file://' + DB).pathname, { recursive: true });
const db = new DatabaseSync(DB);
db.exec(`PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, salt TEXT NOT NULL, hash TEXT NOT NULL, data TEXT NOT NULL, created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, created INTEGER NOT NULL);`);

const sha = (s) => createHash('sha256').update(s).digest('hex');
const scrypt = (p, salt) => scryptSync(p, salt, 32).toString('hex');
const newToken = (id) => {
  const t = randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(sha(t), id, Date.now());
  return t;
};
const userFor = (token) => {
  if (typeof token !== 'string' || !token) return null;
  return db.prepare('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?').get(sha(token)) || null;
};

// login attempts per address
const tries = new Map();
function limited(ip) {
  const now = Date.now(), r = tries.get(ip);
  if (!r || now > r.until) { tries.set(ip, { n: 1, until: now + 60000 }); return false; }
  return ++r.n > 15;
}

const api = {
  async 'POST /api/signup'(b) {
    const { name, password, data } = b;
    if (typeof name !== 'string' || !/^[A-Za-z0-9_]{3,16}$/.test(name)) throw [400, 'Username: 3-16 letters, numbers or _'];
    if (typeof password !== 'string' || password.length < 6 || password.length > 200) throw [400, 'Password: at least 6 characters'];
    const id = name.toLowerCase();
    if (db.prepare('SELECT 1 FROM users WHERE id = ?').get(id)) throw [409, 'That username is taken'];
    const salt = randomBytes(16).toString('hex');
    const json = JSON.stringify(data && typeof data === 'object' ? data : {});
    if (json.length > MAX_SAVE) throw [400, 'Save too large'];
    db.prepare('INSERT INTO users VALUES (?,?,?,?,?,?)').run(id, name, salt, scrypt(password, salt), json, Date.now());
    return { token: newToken(id), name, data: JSON.parse(json) };
  },
  async 'POST /api/login'(b) {
    const u = db.prepare('SELECT * FROM users WHERE id = ?').get(String(b.name || '').toLowerCase());
    const given = Buffer.from(scrypt(String(b.password || ''), u ? u.salt : 'x'), 'hex');
    if (!u || !timingSafeEqual(given, Buffer.from(u.hash, 'hex'))) throw [401, 'Wrong username or password'];
    return { token: newToken(u.id), name: u.name, data: JSON.parse(u.data) };
  },
  async 'GET /api/me'(b, u) {
    if (!u) throw [401, 'Signed out'];
    return { name: u.name, data: JSON.parse(u.data) };
  },
  async 'PUT /api/save'(b, u) {
    if (!u) throw [401, 'Signed out'];
    const json = JSON.stringify(b.data ?? {});
    if (json.length > MAX_SAVE) throw [400, 'Save too large'];
    db.prepare('UPDATE users SET data = ? WHERE id = ?').run(json, u.id);
    return { ok: true };
  },
  async 'POST /api/logout'(b, u, token) {
    if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha(token));
    return { ok: true };
  },
};

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'authorization,content-type');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  }
  // one line per request (never bodies, so never passwords) to diagnose connection reports
  const began = Date.now();
  res.on('finish', () => console.log(`${req.method} ${req.url.split('?')[0]} ${res.statusCode} ${Date.now() - began}ms origin=${origin || '-'} ua=${(req.headers['user-agent'] || '-').slice(0, 60)}`));
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const send = (code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
  const path = req.url.split('?')[0].replace(/^\/souls/, '');
  if (path === '/health') return send(200, { ok: true });
  const fn = api[`${req.method} ${path}`];
  if (!fn) return send(404, { error: 'Not found' });
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
  if (path === '/api/login' || path === '/api/signup') if (limited(ip)) return send(429, { error: 'Too many tries. Wait a minute.' });
  try {
    let raw = '';
    for await (const c of req) { raw += c; if (raw.length > MAX_SAVE + 1024) throw [413, 'Too large']; }
    const body = raw ? JSON.parse(raw) : {};
    const token = (req.headers.authorization || '').replace(/^Bearer /, '');
    send(200, await fn(body, userFor(token), token));
  } catch (e) {
    if (Array.isArray(e)) return send(e[0], { error: e[1] });
    console.error(e);
    send(400, { error: 'Bad request' });
  }
});

// ---------- rooms: the host's browser runs the enemies; this only relays ----------
const rooms = new Map();
const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });
const code = () => { let c; do c = Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[randomBytes(1)[0] % 24]).join(''); while (rooms.has(c)); return c; };
const out = (ws, m) => ws.readyState === 1 && ws.send(JSON.stringify(m));
const roster = (r) => {
  const m = { t: 'roster', code: r.code, host: r.host.pid, started: r.started, members: r.members.map((x) => ({ id: x.pid, name: x.name, kind: x.kind })) };
  r.members.forEach((x) => out(x, m));
};
function leave(ws) {
  const r = ws.room;
  if (!r) return;
  ws.room = null;
  r.members = r.members.filter((x) => x !== ws);
  if (r.host === ws) {
    r.members.forEach((x) => { x.room = null; out(x, { t: 'closed', reason: 'The host left' }); });
    rooms.delete(r.code);
  } else { r.members.forEach((x) => out(x, { t: 'left', id: ws.pid })); roster(r); }
}

server.on('upgrade', (req, sock, head) => {
  if (req.url.split('?')[0].replace(/^\/souls/, '') !== '/ws') return sock.destroy();
  wss.handleUpgrade(req, sock, head, (ws) => wss.emit('connection', ws));
});
let pids = 1;
wss.on('connection', (ws) => {
  ws.pid = pids++;
  ws.alive = true;
  ws.on('pong', () => { ws.alive = true; });
  ws.on('close', () => leave(ws));
  ws.on('error', () => ws.terminate());
  ws.on('message', (raw) => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (!ws.user) {
      if (m.t !== 'auth') return;
      const u = userFor(m.token);
      if (!u) { out(ws, { t: 'error', error: 'Please sign in again' }); return ws.close(); }
      ws.user = u.id; ws.name = u.name;
      return out(ws, { t: 'hello', id: ws.pid });
    }
    const r = ws.room;
    if (m.t === 'relay') {
      if (!r) return;
      const msg = JSON.stringify({ t: 'relay', from: ws.pid, d: m.d });
      for (const x of r.members) if (x !== ws && (m.to === undefined || x.pid === m.to) && x.readyState === 1) x.send(msg);
    } else if (m.t === 'create') {
      leave(ws);
      const room = { code: code(), host: ws, members: [ws], started: false };
      rooms.set(room.code, room); ws.room = room; ws.kind = String(m.kind || 'knight');
      roster(room);
    } else if (m.t === 'join') {
      const room = rooms.get(String(m.code || '').toUpperCase());
      if (!room) return out(ws, { t: 'error', error: 'Room not found' });
      if (room.started) return out(ws, { t: 'error', error: 'That run has started' });
      if (room.members.length >= MAX_PARTY) return out(ws, { t: 'error', error: 'Room is full' });
      if (room.members.some((x) => x.user === ws.user)) return out(ws, { t: 'error', error: 'Already in that room' });
      leave(ws);
      room.members.push(ws); ws.room = room; ws.kind = String(m.kind || 'knight');
      roster(room);
    } else if (m.t === 'kind' && r) { ws.kind = String(m.kind); roster(r); } else if (m.t === 'started' && r?.host === ws) { r.started = true; roster(r); } else if (m.t === 'leave') leave(ws);
  });
});
setInterval(() => { for (const ws of wss.clients) { if (!ws.alive) { ws.terminate(); continue; } ws.alive = false; ws.ping(); } }, 15000);

server.listen(PORT, '127.0.0.1', () => console.log('souls server on', PORT));
