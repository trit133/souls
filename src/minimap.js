// The dungeon map. A small map in the top-right corner fills in as you (and your party) explore; M (or a tap on it)
// opens the whole map. Unbroken seals always glow on it, even in unexplored dark, so there is a direction to head;
// the boss door and the arena show once seen. Under it: the dungeon's name, seals broken and how much is cleared.
// Only in dungeons (hidden on the way to Varek).
const VIEW = 84; // metres across the corner map

export class Minimap {
  constructor(game) {
    this.game = game;
    const hud = document.getElementById('hud');
    this.el = document.createElement('div'); this.el.id = 'minimap'; this.el.className = 'hidden';
    this.cv = document.createElement('canvas'); this.cv.width = this.cv.height = 168;
    this.info = document.createElement('div'); this.info.id = 'mm-info';
    this.el.append(this.cv, this.info);
    hud.append(this.el);
    this.big = document.createElement('div'); this.big.id = 'bigmap'; this.big.className = 'hidden';
    this.bcv = document.createElement('canvas'); this.big.append(this.bcv);
    const hint = document.createElement('div'); hint.className = 'bm-hint'; hint.textContent = 'M or tap to close'; this.big.append(hint);
    hud.append(this.big);
    this.el.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.toggle(); });
    this.big.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.toggle(false); });
    this.t = 0; this.on = false;
  }

  setup(world) {
    this.world = world;
    this.toggle(false);
    if (!world.dungeon) { this.el.classList.add('hidden'); this.mask = null; return; }
    this.el.classList.remove('hidden');
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const s of world.shapes) {
      const b = s.t === 'r' ? [s.x0, s.x1, s.z0, s.z1] : [s.x - s.r, s.x + s.r, s.z - s.r, s.z + s.r];
      x0 = Math.min(x0, b[0]); x1 = Math.max(x1, b[1]); z0 = Math.min(z0, b[2]); z1 = Math.max(z1, b[3]);
    }
    this.x0 = Math.floor(x0) - 3; this.z0 = Math.floor(z0) - 3;
    this.W = Math.ceil(x1 - this.x0) + 4; this.H = Math.ceil(z1 - this.z0) + 4;
    // walkable cells (1 m), the wall line round them, what has been seen
    this.mask = new Uint8Array(this.W * this.H);
    for (let j = 0; j < this.H; j++) for (let i = 0; i < this.W; i++) if (world.area(this.x0 + i + 0.5, this.z0 + j + 0.5, 0)) this.mask[j * this.W + i] = 1;
    for (let j = 1; j < this.H - 1; j++) for (let i = 1; i < this.W - 1; i++) {
      const k = j * this.W + i;
      if (!this.mask[k] && (this.mask[k - 1] === 1 || this.mask[k + 1] === 1 || this.mask[k - this.W] === 1 || this.mask[k + this.W] === 1)) this.mask[k] = 2;
    }
    this.seen = new Uint8Array(this.W * this.H);
    this.off = document.createElement('canvas'); this.off.width = this.W; this.off.height = this.H;
    this.octx = this.off.getContext('2d');
    this.img = this.octx.createImageData(this.W, this.H);
    this.dirty = true;
    this.t = 0;
  }

  toggle(v = !this.on) {
    this.on = !!v && !!this.mask;
    this.big.classList.toggle('hidden', !this.on);
  }

  // fill in what is round (x, z)
  reveal(x, z, r = 13) {
    const ci = Math.round(x - this.x0), cj = Math.round(z - this.z0), d = this.img.data;
    for (let j = Math.max(0, cj - r); j <= Math.min(this.H - 1, cj + r); j++) {
      for (let i = Math.max(0, ci - r); i <= Math.min(this.W - 1, ci + r); i++) {
        const k = j * this.W + i;
        if (this.seen[k] || (i - ci) ** 2 + (j - cj) ** 2 > r * r) continue;
        this.seen[k] = 1;
        const m = this.mask[k];
        if (!m) continue;
        const c = m === 1 ? [138, 122, 98, 235] : [222, 200, 160, 255];
        d.set(c, k * 4);
        this.dirty = true;
      }
    }
  }
  seenAt(x, z) { const i = Math.round(x - this.x0), j = Math.round(z - this.z0); return i >= 0 && j >= 0 && i < this.W && j < this.H && this.seen[j * this.W + i]; }

  update(dt) {
    if (!this.mask) return;
    const g = this.game;
    if ((this.t -= dt) <= 0) {
      this.t = 0.15;
      for (const p of g.allPlayers()) this.reveal(p.pos.x, p.pos.z, g.night ? 7 : 13); // you see less at night
      if (this.dirty) { this.octx.putImageData(this.img, 0, 0); this.dirty = false; }
      const s = g.seals;
      this.info.textContent = `${g.night ? 'NIGHT RAID · ' : ''}${this.world.dungeon.def.name.toUpperCase()} · SEALS ${Math.min(3, s.broken)}/3 · ${g.clearPct()}% CLEARED`;
      const p = g.player;
      this.draw(this.cv, p.pos.x, p.pos.z, this.cv.width / VIEW);
      if (this.on) {
        const w = Math.min(innerWidth * 0.86, innerHeight * 0.86 * this.W / this.H), h = w * this.H / this.W;
        if (this.bcv.width !== Math.round(w)) { this.bcv.width = Math.round(w); this.bcv.height = Math.round(h); }
        this.draw(this.bcv, this.x0 + this.W / 2, this.z0 + this.H / 2, this.bcv.width / this.W);
      }
    }
  }

  draw(cv, fx, fz, sc) {
    const g = this.game, ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(10,8,6,0.62)'; ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W / 2, H / 2); ctx.scale(sc, sc); ctx.translate(-(fx - this.x0), -(fz - this.z0));
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.off, 0, 0);
    const P = (x, z) => [x - this.x0, z - this.z0];
    const dot = (x, z, r, col) => { const [a, b] = P(x, z); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(a, b, r / sc, 0, Math.PI * 2); ctx.fill(); };
    const pulse = 0.6 + Math.sin(g.time * 4) * 0.4;
    // the start fire
    dot(this.world.start.x, this.world.start.z - 6.7, 3, '#ffa040');
    // the boss door and arena, once seen
    const enc = this.world.dungeon.enc;
    const gate = enc && this.world.gates[enc.gateIn];
    if (gate && this.seenAt(gate.x, gate.z)) {
      const [a, b] = P(gate.x, gate.z), s = 4 / sc;
      ctx.fillStyle = enc.sealed ? '#c040ff' : '#ff4030'; ctx.fillRect(a - s, b - s, s * 2, s * 2);
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1 / sc; ctx.strokeRect(a - s, b - s, s * 2, s * 2);
    }
    if (enc && this.seenAt(enc.arena.x, enc.arena.z)) { const [a, b] = P(enc.arena.x, enc.arena.z); ctx.strokeStyle = '#ff5a40'; ctx.lineWidth = 2 / sc; ctx.beginPath(); ctx.arc(a, b, enc.arena.r, 0, Math.PI * 2); ctx.stroke(); }
    // seals: glowing until broken, seen or not
    for (const s of g.seals.list) {
      const d = s.def;
      if (d.broken) { const [a, b] = P(d.x, d.z), k = 3 / sc; ctx.strokeStyle = '#777'; ctx.lineWidth = 1.5 / sc; ctx.beginPath(); ctx.moveTo(a - k, b - k); ctx.lineTo(a + k, b + k); ctx.moveTo(a + k, b - k); ctx.lineTo(a - k, b + k); ctx.stroke(); continue; }
      const col = '#' + d.color.toString(16).padStart(6, '0');
      ctx.globalAlpha = 0.35 * pulse; dot(d.x, d.z, 7, col); ctx.globalAlpha = 1; dot(d.x, d.z, 3, col);
    }
    if (g.portal) dot(g.portal.x, g.portal.z, 4, '#7ae0ff');
    // teammates, then you
    for (const r of g.mp.active ? g.mp.peers.values() : []) dot(r.pos.x, r.pos.z, 3, r.alive ? '#7ad870' : '#555');
    const p = g.player, [a, b] = P(p.pos.x, p.pos.z), k = 5 / sc;
    ctx.translate(a, b); ctx.rotate(-p.yaw + Math.PI);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1 / sc;
    ctx.beginPath(); ctx.moveTo(0, -k * 1.3); ctx.lineTo(k, k); ctx.lineTo(-k, k); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
}
