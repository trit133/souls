// Online accounts talk to server/index.js. A copy of the profile is cached so a slow or
// missing connection doesn't lose progress. LocalAccounts is the older browser-only store,
// kept so those accounts can carry over when the same login signs up online.

const KEY = 'ashenVigil.accounts.v1';
const SESSION = 'ashenVigil.session.v1';

export function freshProfile() {
  return { gold: 0, upgrades: {}, stats: { runs: 0, extracts: 0, wins: 0, bestArea: 0, goldEarned: 0 } };
}

const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));

async function hashPassword(password, saltB64) {
  const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' }, key, 256);
  return b64(bits);
}

export class LocalAccounts {
  constructor() {
    navigator.storage?.persist?.(); // ask the browser not to clear saves automatically
    this.user = null;
    this.data = null;
    const s = localStorage.getItem(SESSION);
    const all = this._all();
    if (s && all[s]) { this.user = s; this.data = { ...freshProfile(), ...all[s].data }; }
  }

  _all() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
  _write(all) { localStorage.setItem(KEY, JSON.stringify(all)); }

  static validate(name, password) {
    if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) return 'Username: 3-16 letters, numbers or _';
    if (!password || password.length < 6) return 'Password: at least 6 characters';
    return null;
  }

  async signUp(name, password) {
    const err = LocalAccounts.validate(name, password);
    if (err) throw new Error(err);
    const id = name.toLowerCase();
    const all = this._all();
    if (all[id]) throw new Error('That username is taken');
    const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
    all[id] = { name, salt, hash: await hashPassword(password, salt), data: freshProfile() };
    this._write(all);
    return this._login(id, all[id]);
  }

  async signIn(name, password) {
    const id = (name || '').toLowerCase();
    const acc = this._all()[id];
    if (!acc || (await hashPassword(password || '', acc.salt)) !== acc.hash) throw new Error('Wrong username or password');
    return this._login(id, acc);
  }

  _login(id, acc) {
    this.user = id;
    this.data = { ...freshProfile(), ...acc.data };
    localStorage.setItem(SESSION, id);
    return this.data;
  }

  get displayName() { return this.user ? this._all()[this.user]?.name || this.user : null; }

  // read a local profile without signing in to it
  async peek(name, password) {
    const acc = this._all()[(name || '').toLowerCase()];
    if (!acc || (await hashPassword(password || '', acc.salt)) !== acc.hash) return null;
    return { ...freshProfile(), ...acc.data };
  }

  signOut() { this.user = null; this.data = null; localStorage.removeItem(SESSION); }

  save() {
    if (!this.user) return;
    const all = this._all();
    if (!all[this.user]) return;
    all[this.user].data = this.data;
    this._write(all);
  }
}

export const SERVER = new URLSearchParams(location.search).get('server') || 'https://h-e-r-b-i-e-optiplex-5090.tailad4548.ts.net/souls';
const CACHE = 'ashenVigil.online.v1';

export class OnlineAccounts {
  constructor(onChange = () => {}) {
    this.onChange = onChange;
    this.user = null; this.data = null; this.token = null; this.displayName = null;
    let c = null;
    try { c = JSON.parse(localStorage.getItem(CACHE)); } catch { /* no cache */ }
    if (c?.token) {
      this.token = c.token; this.user = c.name.toLowerCase(); this.displayName = c.name;
      this.data = { ...freshProfile(), ...c.data }; this.dirty = !!c.dirty;
      this.sync();
    }
  }

  // Network failures (Safari: "Load failed") are retried, then explained in plain words
  async request(method, path, body) {
    for (let i = 0; ; i++) {
      try {
        return await fetch(SERVER + path, {
          method, headers: { 'content-type': 'application/json', ...(this.token ? { authorization: 'Bearer ' + this.token } : {}) },
          body: body ? JSON.stringify(body) : undefined,
        });
      } catch {
        this.retried = true;
        if (i >= 2) throw new Error("Can't reach the game server. Try switching between Wi-Fi and cellular, or turn off any VPN or iCloud Private Relay.");
        await new Promise((ok) => setTimeout(ok, 700 * (i + 1)));
      }
    }
  }

  async call(method, path, body) {
    const r = await this.request(method, path, body);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.error || 'Server error'); e.status = r.status; throw e; }
    return j;
  }

  // on startup: push unsaved progress, otherwise take the server's copy
  async sync() {
    try {
      if (this.dirty) return await this.flush();
      const me = await this.call('GET', '/api/me');
      this.data = { ...freshProfile(), ...me.data };
      this.cache();
      this.onChange();
    } catch (e) { if (e.status === 401) { this.signOut(); this.onChange(); } }
  }

  cache() { localStorage.setItem(CACHE, JSON.stringify({ token: this.token, name: this.displayName, data: this.data, dirty: !!this.dirty })); }

  _login(r) {
    this.token = r.token; this.displayName = r.name; this.user = r.name.toLowerCase();
    this.data = { ...freshProfile(), ...r.data }; this.dirty = false;
    this.cache();
  }

  async signUp(name, password) {
    const err = LocalAccounts.validate(name, password);
    if (err) throw new Error(err);
    let data = freshProfile();
    try { data = await new LocalAccounts().peek(name, password) || data; } catch { /* nothing to import */ }
    this.retried = false;
    try {
      this._login(await this.call('POST', '/api/signup', { name, password, data }));
    } catch (e) {
      // the first try may have worked with its reply lost
      if (e.status === 409 && this.retried) return this.signIn(name, password);
      throw e;
    }
  }

  async signIn(name, password) { this._login(await this.call('POST', '/api/login', { name, password })); }

  signOut() {
    if (this.token) this.call('POST', '/api/logout').catch(() => {});
    this.user = this.data = this.token = this.displayName = null;
    localStorage.removeItem(CACHE);
  }

  // saves go out one at a time; the newest always wins
  save() {
    if (!this.user) return;
    this.dirty = true;
    this.cache();
    this.flush();
  }

  async flush() {
    if (this.saving) { this.again = true; return; }
    this.saving = true;
    try {
      await this.call('PUT', '/api/save', { data: this.data });
      this.dirty = false; this.cache();
    } catch { /* stays dirty; retried on the next save or launch */ }
    this.saving = false;
    if (this.again) { this.again = false; this.flush(); }
  }
}
