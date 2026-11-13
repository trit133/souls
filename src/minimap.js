// The dungeon map. A small map in the top-right corner fills in as you (and your party) explore; M (or a tap on it)
// opens the whole map. In a dungeon unbroken seals always glow on it, even in unexplored dark, so there is a
// direction to head; in a raid (city.js) the shrines have to be found first, walls show as the lines they are, and
// each basement is its own map (the one you're standing in shows). The boss door and the arena show once seen.
// Under it: the area's name, seals broken and how much is cleared. Only in dungeons and raids.
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
    this.layers = null; this.layer = null;
    if (!world.dungeon) { this.el.classList.add('hidden'); return; }
    this.el.classList.remove('hidden');
    this.raid = !!world.dungeon.layers;
    if (this.raid) this.layers = world.dungeon.layers.map((L) => this.makeLayer(L.x0, L.z0, L.W, L.H));
    else {
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (const s of world.shapes) {
        const b = s.t === 'r' ? [s.x0, s.x1, s.z0, s.z1] : [s.x - s.r, s.x + s.r, s.z - s.r, s.z + s.r];
        x0 = Math.min(x0, b[0]); x1 = Math.max(x1, b[1]); z0 = Math.min(z0, b[2]); z1 = Math.max(z1, b[3]);
      }
      this.layers = [this.makeLayer(Math.floor(x0) - 3, Math.floor(z0) - 3, Math.ceil(x1 - Math.floor(x0) + 3) + 4, Math.ceil(z1 - Math.floor(z0) + 3) + 4)];
    }
    this.layer = this.layers[0];
    this.t = 0;
  }

  // a map of one area: walkable cells (1 m), the wall line round them (and walls standing in them), what has been seen
  makeLayer(x0, z0, W, H) {
    const w = this.world, L = { x0, z0, W, H };
    L.mask = new Uint8Array(W * H);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const x = x0 + i + 0.5, z = z0 + j + 0.5;
      if (!w.area(x, z, 0)) continue;
      L.mask[j * W + i] = this.raid && w.blocked(x, z, 0.3) ? 2 : 1;
    }
    for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) {
      const k = j * W + i;
      if (!L.mask[k] && (L.mask[k - 1] === 1 || L.mask[k + 1] === 1 || L.mask[k - W] === 1 || L.mask[k + W] === 1)) L.mask[k] = 2;
    }
    L.seen = new Uint8Array(W * H);
    L.off = document.createElement('canvas'); L.off.width = W; L.off.height = H;
    L.octx = L.off.getContext('2d');
    L.img = L.octx.createImageData(W, H);
    L.dirty = true;
    return L;
  }

  toggle(v = !this.on) {
    this.on = !!v && !!this.layer;
    this.big.classList.toggle('hidden', !this.on);
  }

  layerAt(x, z) {
    if (!this.raid) return this.layers[0];
    return this.layers[this.world.dungeon.layers.indexOf(this.world.dungeon.layerAt(x, z))] || this.layers[0];
  }
  inLayer(L, x, z) { return x >= L.x0 && z >= L.z0 && x < L.x0 + L.W && z < L.z0 + L.H; }

  // fill in what is round (x, z)
  reveal(x, z, r = 13) {
    const L = this.layerAt(x, z);
    const ci = Math.round(x - L.x0), cj = Math.round(z - L.z0), d = L.img.data;
    for (let j = Math.max(0, cj - r); j <= Math.min(L.H - 1, cj + r); j++) {
      for (let i = Math.max(0, ci - r); i <= Math.min(L.W - 1, ci + r); i++) {
        const k = j * L.W + i;
        if (L.seen[k] || (i - ci) ** 2 + (j - cj) ** 2 > r * r) continue;
        L.seen[k] = 1;
        const m = L.mask[k];
        if (!m) continue;
        const c = m === 1 ? [138, 122, 98, 235] : [222, 200, 160, 255];
        d.set(c, k * 4);
        L.dirty = true;
      }
    }
  }
  seenAt(x, z) { const L = this.layerAt(x, z), i = Math.round(x - L.x0), j = Math.round(z - L.z0); return i >= 0 && j >= 0 && i < L.W && j < L.H && L.seen[j * L.W + i]; }

  update(dt) {
    if (!this.layer) return;
    const g = this.game;
    if ((this.t -= dt) <= 0) {
      this.t = 0.15;
      for (const p of g.allPlayers()) this.reveal(p.pos.x, p.pos.z, g.night ? 7 : 13); // you see less at night
      for (const L of this.layers) if (L.dirty) { L.octx.putImageData(L.img, 0, 0); L.dirty = false; }
      const s = g.seals;
      this.info.textContent = `${g.night ? 'NIGHT RAID · ' : ''}${this.world.dungeon.def.name.toUpperCase()} · ${this.raid ? 'SHRINES' : 'SEALS'} ${Math.min(3, s.broken)}/3 · ${g.clearPct()}% CLEARED`;
      const p = g.player;
      this.layer = this.layerAt(p.pos.x, p.pos.z);
      this.draw(this.cv, p.pos.x, p.pos.z, this.cv.width / VIEW);
      if (this.on) {
        const L = this.layer, w = Math.min(innerWidth * 0.86, innerHeight * 0.86 * L.W / L.H), h = w * L.H / L.W;
        if (this.bcv.width !== Math.round(w)) { this.bcv.width = Math.round(w); this.bcv.height = Math.round(h); }
        this.draw(this.bcv, L.x0 + L.W / 2, L.z0 + L.H / 2, this.bcv.width / L.W);
      }
    }
  }

  draw(cv, fx, fz, sc) {
    const g = this.game, L = this.layer, ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(10,8,6,0.62)'; ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W / 2, H / 2); ctx.scale(sc, sc); ctx.translate(-(fx - L.x0), -(fz - L.z0));
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(L.off, 0, 0);
    const here = (x, z) => this.inLayer(L, x, z);
    const P = (x, z) => [x - L.x0, z - L.z0];
    const dot = (x, z, r, col) => { const [a, b] = P(x, z); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(a, b, r / sc, 0, Math.PI * 2); ctx.fill(); };
    const pulse = 0.6 + Math.sin(g.time * 4) * 0.4;
    // the start fire
    if (here(this.world.start.x, this.world.start.z)) dot(this.world.start.x, this.world.start.z - 6.7, 3, '#ffa040');
    // a raid's stairs, once seen
    for (const s of this.world.dungeon.stairs || []) {
      if (!here(s.x, s.z) || !this.seenAt(s.x, s.z)) continue;
      const [a, b] = P(s.x, s.z), k = 3 / sc;
      ctx.fillStyle = s.down ? '#d0d0d0' : '#9ad0ff'; ctx.fillRect(a - k, b - k, k * 2, k * 2);
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1 / sc; ctx.strokeRect(a - k, b - k, k * 2, k * 2);
    }
    // the boss door and arena, once seen
    const enc = this.world.dungeon.enc;
    const gate = enc && this.world.gates[enc.gateIn];
    if (gate && here(gate.x, gate.z) && this.seenAt(gate.x, gate.z)) {
      const [a, b] = P(gate.x, gate.z), s = 4 / sc;
      ctx.fillStyle = enc.sealed ? '#c040ff' : '#ff4030'; ctx.fillRect(a - s, b - s, s * 2, s * 2);
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1 / sc; ctx.strokeRect(a - s, b - s, s * 2, s * 2);
    }
    if (enc && here(enc.arena.x, enc.arena.z) && this.seenAt(enc.arena.x, enc.arena.z)) { const [a, b] = P(enc.arena.x, enc.arena.z); ctx.strokeStyle = '#ff5a40'; ctx.lineWidth = 2 / sc; ctx.beginPath(); ctx.arc(a, b, enc.arena.r, 0, Math.PI * 2); ctx.stroke(); }
    // seals: glowing until broken (in a raid, once found)
    for (const s of g.seals.list) {
      const d = s.def;
      if (!here(d.x, d.z) || (this.raid && !this.seenAt(d.x, d.z))) continue;
      if (d.broken) { const [a, b] = P(d.x, d.z), k = 3 / sc; ctx.strokeStyle = '#777'; ctx.lineWidth = 1.5 / sc; ctx.beginPath(); ctx.moveTo(a - k, b - k); ctx.lineTo(a + k, b + k); ctx.moveTo(a + k, b - k); ctx.lineTo(a - k, b + k); ctx.stroke(); continue; }
      const col = '#' + d.color.toString(16).padStart(6, '0');
      ctx.globalAlpha = 0.35 * pulse; dot(d.x, d.z, 7, col); ctx.globalAlpha = 1; dot(d.x, d.z, 3, col);
    }
    g.basements?.drawMap(ctx, P, sc, here); // basements someone has been down
    if (g.portal && here(g.portal.x, g.portal.z)) dot(g.portal.x, g.portal.z, 4, '#7ae0ff');
    // teammates, then you
    for (const r of g.mp.active ? g.mp.peers.values() : []) if (here(r.pos.x, r.pos.z)) dot(r.pos.x, r.pos.z, 3, r.alive ? '#7ad870' : '#555');
    const p = g.player, [a, b] = P(p.pos.x, p.pos.z), k = 5 / sc;
    ctx.translate(a, b); ctx.rotate(-p.yaw + Math.PI);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1 / sc;
    ctx.beginPath(); ctx.moveTo(0, -k * 1.3); ctx.lineTo(k, k); ctx.lineTo(-k, k); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
}
