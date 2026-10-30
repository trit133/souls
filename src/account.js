// Account storage. LocalAccounts keeps accounts in this browser's localStorage, with
// passwords hashed (PBKDF2-SHA256, random salt). The rest of the game only talks to the
// small interface below (signUp / signIn / signOut / user / data / save), so an online
// backend can replace this class without touching gameplay code.

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

  signOut() { this.user = null; this.data = null; localStorage.removeItem(SESSION); }

  save() {
    if (!this.user) return;
    const all = this._all();
    if (!all[this.user]) return;
    all[this.user].data = this.data;
    this._write(all);
  }
}
