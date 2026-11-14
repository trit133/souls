// The world map's and the region maps' art (worldmap.js), drawn in code like a cartographer's plate: a hill-shaded
// relief from a height field (low ash plains, grey uplands, white-capped peaks), mountain ranges drawn peak by peak
// with a lit and a shaded face, rivers dark as old blood running down the valleys to the sea, the coast picked out
// with ripple lines, roads that wind round the high ground, dotted borders, dead forests, ruins, battlefields and
// graves; each place a drawn structure (a burned city, a flooded pit, a cathedral on a crag, a keep); a frame, a
// compass rose and a scale bar. Regions not yet found lie under fog with a question mark. Dark: black, ash greys,
// blood red, bone white. Everything comes from fixed seeds, so the maps are the same every time; each is drawn once
// and kept.
// drawWorld(canvas, regions) / drawRegion(canvas, region, areas, opened)  (positions 0..1 across the art)

export const MAP_W = 960, MAP_H = 540; // the art's size
const LO = 2; // the terrain is worked out at half size and laid down in 2 x 2 blocks (the pixel look)
const TW = MAP_W / LO, TH = MAP_H / LO;

// ---------- noise ----------
function noise(seed) {
  const h = (x, y) => { let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1274126177); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967295; };
  const sm = (t) => t * t * (3 - 2 * t);
  const v = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), u = sm(x - xi), w = sm(y - yi);
    const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
  };
  const fbm = (x, y, oct = 5) => { let s = 0, amp = 0.5, f = 1, n = 0; for (let i = 0; i < oct; i++) { s += v(x * f + i * 17.3, y * f - i * 9.1) * amp; n += amp; amp *= 0.5; f *= 2.03; } return s / n; };
  const ridged = (x, y, oct = 4) => { let s = 0, amp = 0.5, f = 1, n = 0; for (let i = 0; i < oct; i++) { s += (1 - Math.abs(v(x * f + i * 7.7, y * f + i * 3.1) * 2 - 1)) ** 2 * amp; n += amp; amp *= 0.5; f *= 2.1; } return s / n; };
  return { v, fbm, ridged };
}
function rand(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
// distance from (x, y) to a polyline [[x, y], ...] (in the same units)
function segDist(x, y, pts) {
  let best = 1e9;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1;
    const t = clamp(((x - ax) * dx + (y - ay) * dy) / L), px = ax + dx * t, py = ay + dy * t;
    best = Math.min(best, Math.hypot(x - px, y - py));
  }
  return best;
}

// the palette: night sea, ash lowland, slate upland, bone peaks; blood for rivers, borders and fire
const C = {
  sea0: hex('#050608'), sea1: hex('#0d0f13'), shoal: hex('#171a20'),
  low: hex('#1a1818'), mid: hex('#252222'), high: hex('#353130'), peak: hex('#55504d'), snow: hex('#8a847c'),
  ash: hex('#262221'), scorch: hex('#140f0e'),
};
const INK = '#08070a', BONE = '#d8d0c0', BONE_DIM = 'rgba(216,208,192,0.55)', BLOOD = '#8a1a14', BLOOD_HI = '#c4281e', EMBER = '#ff5a24';

// ---------- the relief ----------
// h(u, v) -> height (< 0 is sea) over 0..1; lay it down hill-shaded, with coast ripples, into a TW x TH image scaled up
function relief(ctx, h, o = {}) {
  const H = new Float32Array(TW * TH);
  for (let j = 0; j < TH; j++) for (let i = 0; i < TW; i++) H[j * TW + i] = h(i / TW, j / TH);
  const img = ctx.createImageData(TW, TH), d = img.data;
  const at = (i, j) => H[clamp(j, 0, TH - 1) * TW + clamp(i, 0, TW - 1)];
  for (let j = 0; j < TH; j++) for (let i = 0; i < TW; i++) {
    const e = H[j * TW + i];
    let c;
    if (e < 0) {
      // the sea: deeper is darker, a pale shoal along the coast, ripple lines following it out, faint swell hatching
      const dep = clamp(-e * 4);
      c = mixc(C.sea1, C.sea0, dep);
      if (e > -0.025) c = C.shoal;
      else if ([0.055, 0.1, 0.16].some((r) => Math.abs(-e - r) < 0.006)) c = mixc(c, C.shoal, 0.75);
      if ((j % 4 === 0) && ((i + (j >> 2) * 3) % 9 < 4) && dep > 0.25) c = mixc(c, C.shoal, 0.35);
    } else {
      // the land: its height's colour, lit from the north-west, a dark edge on the coast
      const gx = at(i + 1, j) - at(i - 1, j), gy = at(i, j + 1) - at(i, j - 1);
      const shade = clamp(1 + (-gx - gy) * 8, 0.5, 1.35);
      c = e < 0.25 ? mixc(C.low, C.mid, e / 0.25) : e < 0.55 ? mixc(C.mid, C.high, (e - 0.25) / 0.3) : e < 0.8 ? mixc(C.high, C.peak, (e - 0.55) / 0.25) : mixc(C.peak, C.snow, clamp((e - 0.8) / 0.15));
      c = c.map((x) => x * shade);
      if (o.tint) c = o.tint(i / TW, j / TH, e, c) || c;
      if (e < 0.012) c = mixc(c, [10, 9, 10], 0.7); // (the coast's ink line)
      // a stipple of grit on the plains
      if (e < 0.3 && ((i * 7 + j * 13) % 17 === 0)) c = c.map((x) => x * 0.7);
    }
    const k = (j * TW + i) * 4; d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255;
  }
  const off = document.createElement('canvas'); off.width = TW; off.height = TH; off.getContext('2d').putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = false; ctx.drawImage(off, 0, 0, MAP_W, MAP_H);
  return { H, h: (u, v) => H[clamp(Math.floor(v * TH), 0, TH - 1) * TW + clamp(Math.floor(u * TW), 0, TW - 1)] };
}

// ---------- drawn things ----------
// a mountain: a peak with a lit west face and a shaded east face, an ink outline, a white cap if high enough
function peak(c, x, y, s, e) {
  const top = [x, y - s * 1.25], l = [x - s, y], r = [x + s * 1.05, y];
  c.fillStyle = e > 0.84 ? '#6e6862' : '#45403f'; c.beginPath(); c.moveTo(...l); c.lineTo(...top); c.lineTo(x + s * 0.1, y); c.closePath(); c.fill();
  c.fillStyle = e > 0.84 ? '#2a2627' : '#171415'; c.beginPath(); c.moveTo(x + s * 0.1, y); c.lineTo(...top); c.lineTo(...r); c.closePath(); c.fill();
  if (e > 0.86) { c.fillStyle = '#d8d2c6'; c.beginPath(); c.moveTo(top[0] - s * 0.32, top[1] + s * 0.42); c.lineTo(...top); c.lineTo(top[0] + s * 0.35, top[1] + s * 0.45); c.lineTo(top[0] + s * 0.05, top[1] + s * 0.3); c.closePath(); c.fill(); }
  // hatching down the shaded face
  c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 1;
  for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(top[0] + s * 0.25 * k * 0.9, top[1] + s * 0.35 * k); c.lineTo(top[0] + s * 0.2 * k, y); c.stroke(); }
  c.strokeStyle = INK; c.lineWidth = 1.2; c.beginPath(); c.moveTo(...l); c.lineTo(...top); c.lineTo(...r); c.stroke();
}
// mountains wherever the land is high: a jittered grid, drawn back to front
function ranges(c, H, r, thr = 0.5, step = 13, scale = 1, keep = 0.75) {
  const list = [];
  for (let y = step; y < MAP_H - 6; y += step * 0.7) for (let x = step; x < MAP_W - 6; x += step) {
    const px = x + (r() - 0.5) * step * 0.9, py = y + (r() - 0.5) * step * 0.6, e = H.h(px / MAP_W, py / MAP_H);
    if (e > thr + r() * 0.08 && r() < keep) list.push([px, py, e]);
  }
  list.sort((a, b) => a[1] - b[1]);
  for (const [x, y, e] of list) peak(c, x, y, (4 + (e - thr) * 26 + r() * 4) * scale * (0.75 + r() * 0.5), e);
}
// a river along a course (points in pixels), meandering, widening toward its mouth; an ink bank either side
function riverAlong(c, pts, N, maxW = 3, H = null) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], L = Math.hypot(bx - ax, by - ay), n = Math.max(2, L / 5 | 0), nx = -(by - ay) / L, ny = (bx - ax) / L;
    for (let k = 0; k < n; k++) { const t = k / n, m = (N.v((i * n + k) * 0.13, 3.7) - 0.5) * 18 * Math.sin(Math.PI * t) + (N.v((i * n + k) * 0.5, 9.1) - 0.5) * 4; out.push([ax + (bx - ax) * t + nx * m, ay + (by - ay) * t + ny * m]); }
  }
  out.push(pts[pts.length - 1]);
  if (H) { const k = out.findIndex((p, i) => i > 3 && H.h(p[0] / MAP_W, p[1] / MAP_H) < -0.01); if (k > 0) out.length = k + 1; } // (into the sea, no further)
  const draw = (col, add) => { for (let i = 1; i < out.length; i++) { const t = i / out.length; c.strokeStyle = col; c.lineWidth = 0.8 + t * maxW + add; c.lineCap = 'round'; c.beginPath(); c.moveTo(...out[i - 1]); c.lineTo(...out[i]); c.stroke(); } };
  draw('#0a0607', 2.4); draw('#3a0a08', 1); draw(BLOOD, 0);
  for (let i = 4; i < out.length; i += 7) { c.fillStyle = 'rgba(220,80,60,0.5)'; c.fillRect(out[i][0], out[i][1], 1, 1); } // (a glint on the water)
  return out;
}
// the old fire's scars: glowing fissures across burned ground
function fissure(c, x, y, len, ang, r) {
  const pts = [[x, y]];
  for (let k = 0; k < 8; k++) { ang += (r() - 0.5) * 0.9; x += Math.cos(ang) * len / 8; y += Math.sin(ang) * len / 8; pts.push([x, y]); }
  for (const [w, col] of [[3, '#1a0606'], [1.6, '#6a140e'], [0.7, '#ff6a2a']]) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(...p) : c.moveTo(...p))); c.stroke(); }
}
// ash ground: craters, stipple, the ghosts of old field walls
function ashGround(c, H, r, n, lo = 0.02, hi = 0.3) {
  for (let k = 0; k < n; k++) {
    const x = r() * MAP_W, y = r() * MAP_H, e = H.h(x / MAP_W, y / MAP_H); if (e < lo || e > hi) continue;
    const q = r();
    if (q < 0.35) { const s = 1.5 + r() * 3; c.fillStyle = 'rgba(0,0,0,0.5)'; c.beginPath(); c.ellipse(x, y, s, s * 0.6, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = 'rgba(110,104,98,0.35)'; c.lineWidth = 1; c.beginPath(); c.ellipse(x, y + 0.6, s + 1, s * 0.6 + 0.6, 0, 0.1, Math.PI - 0.1); c.stroke(); }
    else if (q < 0.42) { c.strokeStyle = 'rgba(90,84,80,0.16)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 8 + r() * 10, y + (r() - 0.5) * 3); c.lineTo(x + 10 + r() * 8, y + 6 + r() * 4); c.stroke(); } // (the line of an old field wall)
    else { c.fillStyle = 'rgba(120,112,106,0.25)'; c.fillRect(x, y, 1, 1); c.fillRect(x + 2, y + 1, 1, 1); }
  }
}
// hills: low humps with a shaded side, where the land rises but isn't mountain
function hills(c, H, r, lo, hi) {
  for (let k = 0; k < 900; k++) {
    const x = r() * MAP_W, y = r() * MAP_H, e = H.h(x / MAP_W, y / MAP_H);
    if (e < lo || e > hi) continue;
    c.strokeStyle = 'rgba(8,7,10,0.7)'; c.lineWidth = 1.2; c.beginPath(); c.arc(x, y + 3, 5, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
    c.strokeStyle = 'rgba(120,112,106,0.35)'; c.beginPath(); c.arc(x - 1, y + 3, 5, Math.PI * 1.2, Math.PI * 1.5); c.stroke();
  }
}
// a dead forest: clusters of bare black trees
function deadWood(c, x, y, n, r, spread = 14) {
  for (let k = 0; k < n; k++) {
    const px = x + (r() - 0.5) * spread * 2, py = y + (r() - 0.5) * spread, hgt = 4 + r() * 4;
    c.strokeStyle = '#0c0a0b'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(px, py); c.lineTo(px, py - hgt);
    c.moveTo(px, py - hgt * 0.6); c.lineTo(px - 2, py - hgt * 0.85); c.moveTo(px, py - hgt * 0.45); c.lineTo(px + 2.4, py - hgt * 0.7); c.stroke();
  }
}
// a river: from a source down the steepest way to the sea (or a basin), widening as it goes
function river(c, H, x, y, maxW = 3) {
  const pts = [[x, y]];
  for (let s = 0; s < 400; s++) {
    const e = H.h(x / MAP_W, y / MAP_H); if (e < 0) break;
    let best = null, be = e;
    for (let a = 0; a < 16; a++) { const q = a / 16 * Math.PI * 2, nx = x + Math.cos(q) * 4, ny = y + Math.sin(q) * 4, ne = H.h(nx / MAP_W, ny / MAP_H) + Math.sin(a * 2.3 + s) * 0.004; if (ne < be) { be = ne; best = [nx, ny]; } }
    if (!best) { x += (Math.random() - 0.5) * 0; break; }
    [x, y] = best; pts.push([x, y]);
  }
  if (pts.length < 6) return pts;
  for (let i = 1; i < pts.length; i++) {
    const t = i / pts.length;
    c.strokeStyle = '#2a0806'; c.lineWidth = 1 + t * maxW + 1.5; c.beginPath(); c.moveTo(...pts[i - 1]); c.lineTo(...pts[i]); c.stroke();
  }
  for (let i = 1; i < pts.length; i++) {
    const t = i / pts.length;
    c.strokeStyle = BLOOD; c.lineWidth = 0.6 + t * maxW; c.beginPath(); c.moveTo(...pts[i - 1]); c.lineTo(...pts[i]); c.stroke();
  }
  return pts;
}
// a road between two places: found across a coarse grid, dear over steep or high ground, never over the sea; drawn
// as a dashed bone line with a dark bed under it
function road(c, H, a, b, o = {}) {
  const S = 6, W = Math.ceil(MAP_W / S), Hh = Math.ceil(MAP_H / S), idx = (i, j) => j * W + i;
  const cost = (i, j) => { const e = H.h((i + 0.5) / W, (j + 0.5) / Hh); if (e < 0) return Infinity; const s = Math.abs(H.h((i + 1.5) / W, (j + 0.5) / Hh) - e) + Math.abs(H.h((i + 0.5) / W, (j + 1.5) / Hh) - e); return 1 + e * (o.high ?? 6) + s * 60; };
  const si = Math.floor(a[0] / S), sj = Math.floor(a[1] / S), ti = Math.floor(b[0] / S), tj = Math.floor(b[1] / S);
  const dist = new Float64Array(W * Hh).fill(Infinity), prev = new Int32Array(W * Hh).fill(-1), done = new Uint8Array(W * Hh);
  dist[idx(si, sj)] = 0; const open = [[0, si, sj]];
  while (open.length) {
    let m = 0; for (let k = 1; k < open.length; k++) if (open[k][0] < open[m][0]) m = k;
    const [, i, j] = open.splice(m, 1)[0], k0 = idx(i, j);
    if (done[k0]) continue; done[k0] = 1;
    if (i === ti && j === tj) break;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= W || nj >= Hh) continue;
      const k = idx(ni, nj), cst = cost(ni, nj) * (di && dj ? 1.414 : 1);
      if (dist[k0] + cst < dist[k]) { dist[k] = dist[k0] + cst; prev[k] = k0; open.push([dist[k] + Math.hypot(ni - ti, nj - tj) * 1.2, ni, nj]); }
    }
  }
  const pts = []; let k = idx(ti, tj);
  while (k >= 0) { pts.push([(k % W + 0.5) * S, (Math.floor(k / W) + 0.5) * S]); k = prev[k]; }
  pts.reverse(); pts[0] = a; pts[pts.length - 1] = b;
  // smoothed
  const sm = pts.map((p, i) => (i === 0 || i === pts.length - 1 ? p : [(pts[i - 1][0] + p[0] * 2 + pts[i + 1][0]) / 4, (pts[i - 1][1] + p[1] * 2 + pts[i + 1][1]) / 4]));
  const line = (w, col, dash) => { c.setLineDash(dash); c.strokeStyle = col; c.lineWidth = w; c.beginPath(); sm.forEach((p, i) => (i ? c.lineTo(...p) : c.moveTo(...p))); c.stroke(); };
  line(o.w ? o.w + 2 : 4, 'rgba(6,5,6,0.85)', []);
  line(o.w || 1.6, o.color || '#b8ac90', o.dash || [5, 3]);
  c.setLineDash([]);
  return sm;
}
// a road along a course (pixels), wandering a little, with a dark bed under the dashes and a milestone now and then
function roadAlong(c, pts, N, o = {}) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], L = Math.hypot(bx - ax, by - ay) || 1, n = Math.max(2, L / 6 | 0), nx = -(by - ay) / L, ny = (bx - ax) / L;
    for (let k = 0; k < n; k++) { const t = k / n, m = (N.v((i * n + k) * 0.2, 7.3) - 0.5) * 8 * Math.sin(Math.PI * t); out.push([ax + (bx - ax) * t + nx * m, ay + (by - ay) * t + ny * m]); }
  }
  out.push(pts[pts.length - 1]);
  const line = (w, col, dash) => { c.setLineDash(dash); c.strokeStyle = col; c.lineWidth = w; c.lineJoin = 'round'; c.beginPath(); out.forEach((p, i) => (i ? c.lineTo(...p) : c.moveTo(...p))); c.stroke(); };
  line((o.w || 1.6) + 2.5, 'rgba(6,5,6,0.85)', []);
  line(o.w || 1.6, o.color || '#b8ac90', o.dash || [5, 3]);
  c.setLineDash([]);
  for (let i = 12; i < out.length - 6; i += 16) { c.fillStyle = '#8a8478'; c.fillRect(out[i][0] + 4, out[i][1] - 3, 2, 3); }
  return out;
}
// a border: a dotted red line round a region's lands (where the nearest region changes)
function borders(c, H, centres) {
  c.fillStyle = 'rgba(150,28,20,0.5)';
  const near = (x, y) => { let b = 0, bd = 1e9; centres.forEach(([cx, cy], k) => { const d = Math.hypot(x - cx, (y - cy) * 1.2); if (d < bd) { bd = d; b = k; } }); return b; };
  for (let y = 4; y < MAP_H - 4; y += 3) for (let x = 4; x < MAP_W - 4; x += 3) {
    if (H.h(x / MAP_W, y / MAP_H) < 0.02) continue;
    const k = near(x, y);
    if (near(x + 3, y) !== k || near(x, y + 3) !== k) if (((x + y) / 3 | 0) % 3 !== 0) c.fillRect(x, y, 2, 2);
  }
}
// a label: small capitals in bone with an ink halo; spaced out and optionally curved along an angle
function label(c, text, x, y, o = {}) {
  c.save();
  c.font = `${o.italic ? 'italic ' : ''}${o.bold ? 'bold ' : ''}${o.size || 11}px Georgia, 'Times New Roman', serif`;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.translate(x, y); if (o.rot) c.rotate(o.rot);
  const t = o.spaced ? text.split('').join(String.fromCharCode(8202)) : text;
  c.lineWidth = 3; c.strokeStyle = 'rgba(5,4,6,0.9)'; c.strokeText(t, 0, 0);
  c.fillStyle = o.color || BONE_DIM; c.fillText(t, 0, 0);
  c.restore();
}
// small marks: a battlefield (crossed swords), graves, a ruined tower, a skull, a wreck, a gallows
const MARK = {
  swords(c, x, y) { c.strokeStyle = BONE; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x - 5, y - 5); c.lineTo(x + 5, y + 5); c.moveTo(x + 5, y - 5); c.lineTo(x - 5, y + 5); c.stroke(); c.strokeStyle = BLOOD_HI; c.beginPath(); c.moveTo(x - 6, y - 1); c.lineTo(x - 2, y - 5); c.moveTo(x + 6, y - 1); c.lineTo(x + 2, y - 5); c.stroke(); },
  graves(c, x, y, r) { for (let k = 0; k < 7; k++) { const px = x + (k % 4) * 5 - 8 + (r() - 0.5) * 2, py = y + Math.floor(k / 4) * 5; c.fillStyle = '#8a8478'; c.fillRect(px, py - 3, 1, 4); c.fillRect(px - 1, py - 2, 3, 1); } },
  tower(c, x, y) { c.fillStyle = '#5a5452'; c.fillRect(x - 3, y - 10, 6, 10); c.fillStyle = '#2a2628'; c.fillRect(x, y - 10, 3, 10); c.fillStyle = INK; c.fillRect(x - 3, y - 12, 2, 2); c.fillRect(x + 1, y - 13, 2, 3); c.fillStyle = BLOOD_HI; c.fillRect(x - 1, y - 6, 1, 2); },
  skull(c, x, y) { c.fillStyle = BONE; c.beginPath(); c.arc(x, y - 2, 3.5, 0, Math.PI * 2); c.fill(); c.fillRect(x - 2, y + 1, 4, 2.5); c.fillStyle = INK; c.fillRect(x - 2, y - 2.5, 1.5, 1.5); c.fillRect(x + 0.6, y - 2.5, 1.5, 1.5); },
  gallows(c, x, y) { c.strokeStyle = '#6a625a'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x - 3, y); c.lineTo(x - 3, y - 11); c.lineTo(x + 4, y - 11); c.moveTo(x - 3, y - 8); c.lineTo(x, y - 11); c.stroke(); c.strokeStyle = BONE; c.lineWidth = 1; c.beginPath(); c.moveTo(x + 3, y - 11); c.lineTo(x + 3, y - 6); c.stroke(); c.fillStyle = INK; c.fillRect(x + 2, y - 6, 2, 4); },
  wreck(c, x, y) { c.fillStyle = '#3a3634'; c.save(); c.translate(x, y); c.rotate(-0.4); c.fillRect(-9, -3, 18, 6); c.fillStyle = '#5a5452'; c.fillRect(-9, -3, 18, 2); c.fillStyle = INK; c.fillRect(4, -7, 3, 5); c.fillRect(-6, 3, 4, 2); c.fillStyle = BLOOD; c.fillRect(-2, -1, 2, 2); c.restore(); },
  ruin(c, x, y) { c.fillStyle = '#4a4544'; c.fillRect(x - 6, y - 4, 3, 4); c.fillRect(x - 2, y - 7, 3, 7); c.fillRect(x + 3, y - 3, 3, 3); c.fillStyle = INK; c.fillRect(x - 7, y, 14, 1); },
};
// a hamlet or ruined town: three roofs round a church tower, a dot of fire if anyone's left; its name beside it
function town(c, x, y, name, lit, r) {
  for (const [dx, dy] of [[-5, 1], [3, 2], [-1, -3]]) { c.fillStyle = '#4e4846'; c.fillRect(x + dx - 2, y + dy - 2, 5, 4); c.fillStyle = '#2a2628'; c.beginPath(); c.moveTo(x + dx - 3, y + dy - 2); c.lineTo(x + dx + 0.5, y + dy - 5); c.lineTo(x + dx + 4, y + dy - 2); c.fill(); }
  c.fillStyle = '#5e5856'; c.fillRect(x + 6, y - 7, 2, 9); c.fillStyle = '#2a2628'; c.beginPath(); c.moveTo(x + 5.5, y - 7); c.lineTo(x + 7, y - 11); c.lineTo(x + 8.5, y - 7); c.fill();
  if (lit) { c.fillStyle = EMBER; c.fillRect(x - 1, y, 1, 1); }
  c.strokeStyle = INK; c.lineWidth = 1; c.beginPath(); c.arc(x + 1, y, 10, 0, Math.PI * 2); c.stroke();
  label(c, name, x + 1, y + 17, { size: 9, italic: true });
}
// a compass rose: a star of eight points, the north one red, a ring, N
function compass(c, x, y, R) {
  c.save(); c.translate(x, y);
  c.strokeStyle = BONE_DIM; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, R * 0.78, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.arc(0, 0, R * 0.7, 0, Math.PI * 2); c.stroke();
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4, L = k % 2 ? R * 0.55 : R, w = k % 2 ? R * 0.1 : R * 0.16;
    c.save(); c.rotate(a);
    c.fillStyle = k === 0 ? BLOOD_HI : '#cfc6b4'; c.beginPath(); c.moveTo(0, -L); c.lineTo(w, 0); c.lineTo(0, 0); c.closePath(); c.fill();
    c.fillStyle = k === 0 ? '#5a0e0a' : '#3a3634'; c.beginPath(); c.moveTo(0, -L); c.lineTo(-w, 0); c.lineTo(0, 0); c.closePath(); c.fill();
    c.restore();
  }
  c.fillStyle = INK; c.beginPath(); c.arc(0, 0, 2.5, 0, Math.PI * 2); c.fill();
  label(c, 'N', 0, -R - 9, { size: 12, bold: true, color: BONE });
  c.restore();
}
// the plate's frame: an ink border, a red rule, a bone rule, diamonds at the corners and halfway, tick marks
function frame(c, title) {
  c.strokeStyle = INK; c.lineWidth = 14; c.strokeRect(0, 0, MAP_W, MAP_H);
  c.strokeStyle = '#3a3634'; c.lineWidth = 2; c.strokeRect(9, 9, MAP_W - 18, MAP_H - 18);
  c.strokeStyle = BLOOD; c.lineWidth = 1; c.strokeRect(13, 13, MAP_W - 26, MAP_H - 26);
  for (let x = 20; x < MAP_W - 16; x += 12) { c.fillStyle = (x / 12 | 0) % 2 ? '#3a3634' : '#8a8478'; c.fillRect(x, 10, 6, 2); c.fillRect(x, MAP_H - 12, 6, 2); }
  for (let y = 20; y < MAP_H - 16; y += 12) { c.fillStyle = (y / 12 | 0) % 2 ? '#3a3634' : '#8a8478'; c.fillRect(10, y, 2, 6); c.fillRect(MAP_W - 12, y, 2, 6); }
  for (const [x, y] of [[13, 13], [MAP_W - 13, 13], [13, MAP_H - 13], [MAP_W - 13, MAP_H - 13], [MAP_W / 2, 13], [MAP_W / 2, MAP_H - 13]]) {
    c.fillStyle = BLOOD_HI; c.beginPath(); c.moveTo(x, y - 6); c.lineTo(x + 6, y); c.lineTo(x, y + 6); c.lineTo(x - 6, y); c.closePath(); c.fill();
    c.fillStyle = INK; c.fillRect(x - 1, y - 1, 2, 2);
  }
  if (title) {
    const w = title.length * 9 + 40;
    c.fillStyle = 'rgba(8,7,9,0.92)'; c.fillRect(MAP_W / 2 - w / 2, 4, w, 20);
    c.strokeStyle = BLOOD; c.lineWidth = 1; c.strokeRect(MAP_W / 2 - w / 2 + 0.5, 4.5, w - 1, 19);
    label(c, title.toUpperCase(), MAP_W / 2, 14.5, { size: 12, bold: true, spaced: true, color: BONE });
  }
}
function scaleBar(c, x, y, unit) {
  for (let k = 0; k < 5; k++) { c.fillStyle = k % 2 ? BONE : INK; c.fillRect(x + k * 14, y, 14, 4); }
  c.strokeStyle = BONE_DIM; c.strokeRect(x - 0.5, y - 0.5, 71, 5);
  label(c, unit, x + 35, y + 13, { size: 9, italic: true });
}
// fog over the unknown: a bank of drawn clouds (a pale scalloped edge, dark within, hatched), a large red question mark
function fog(c, x, y, R, r) {
  c.save();
  const puffs = [];
  for (let k = 0; k < 16; k++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * R * 0.7; puffs.push([x + Math.cos(a) * d, y + Math.sin(a) * d * 0.55, R * (0.22 + r() * 0.2)]); }
  const g = c.createRadialGradient(x, y, 0, x, y, R * 1.3); g.addColorStop(0, 'rgba(8,7,9,0.85)'); g.addColorStop(1, 'rgba(8,7,9,0)');
  c.fillStyle = g; c.beginPath(); c.ellipse(x, y, R * 1.3, R * 0.85, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(120,112,108,0.55)'; for (const [px, py, pr] of puffs) { c.beginPath(); c.arc(px, py, pr + 1.6, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = '#121014'; for (const [px, py, pr] of puffs) { c.beginPath(); c.arc(px, py, pr, 0, Math.PI * 2); c.fill(); }
  // hatching inside, and a curl or two
  c.save(); c.beginPath(); for (const [px, py, pr] of puffs) { c.moveTo(px + pr, py); c.arc(px, py, pr, 0, Math.PI * 2); } c.clip();
  c.strokeStyle = 'rgba(90,84,82,0.35)'; c.lineWidth = 1; for (let k = -R * 2; k < R * 2; k += 5) { c.beginPath(); c.moveTo(x + k, y - R); c.lineTo(x + k + R * 0.8, y + R); c.stroke(); }
  c.restore();
  c.strokeStyle = 'rgba(150,142,136,0.6)'; c.lineWidth = 1.2; for (let k = 0; k < 4; k++) { const [px, py, pr] = puffs[k]; c.beginPath(); c.arc(px, py, pr * 0.55, Math.PI * 0.3, Math.PI * 1.7); c.stroke(); }
  c.font = `bold ${Math.round(R * 0.62)}px Georgia, serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.lineWidth = 6; c.strokeStyle = INK; c.strokeText('?', x, y + 2); c.fillStyle = BLOOD_HI; c.fillText('?', x, y + 2);
  c.restore();
}
// a vignette: the plate darkens to its edges
function vignette(c) {
  const g = c.createRadialGradient(MAP_W / 2, MAP_H / 2, MAP_H * 0.35, MAP_W / 2, MAP_H / 2, MAP_W * 0.62);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
  c.fillStyle = g; c.fillRect(0, 0, MAP_W, MAP_H);
}
// smoke rising from a burning place, drifting east
function smoke(c, x, y, r, n = 6) {
  for (let k = 0; k < n; k++) { const t = k / n, px = x + t * 26 + (r() - 0.5) * 4, py = y - t * 30, rr = 3 + t * 7; c.fillStyle = `rgba(70,64,62,${0.45 * (1 - t)})`; c.beginPath(); c.arc(px, py, rr, 0, Math.PI * 2); c.fill(); }
}

// =====================================================================================================
// THE WORLD
// =====================================================================================================
// each region's look on the world map (its emblem; its tint on the land)
const REGION_ART = {
  // the Shattered March: a burned city in a valley, a camp, the old front's trenches
  r1(c, x, y, r) {
    for (let k = 0; k < 26; k++) { const px = x - 18 + (k % 7) * 6 + (r() - 0.5) * 2, py = y - 6 + Math.floor(k / 7) * 5; c.fillStyle = r() < 0.3 ? '#141012' : '#4e4846'; c.fillRect(px, py, 4, 3); c.fillStyle = INK; c.fillRect(px, py + 3, 4, 1); if (r() < 0.2) { c.fillStyle = EMBER; c.fillRect(px + 1, py, 1, 1); } }
    smoke(c, x + 2, y - 8, r); smoke(c, x - 10, y - 6, r, 4);
    c.strokeStyle = '#6a625a'; c.lineWidth = 1; c.beginPath(); for (let k = 0; k < 8; k++) c.lineTo(x - 30 + k * 6, y + 18 + (k % 2) * 3); c.stroke(); // trenches
  },
  // the Glass Wastes: a pale salt-glass flat, shards standing out of it
  r2(c, x, y, r) { for (let k = 0; k < 14; k++) { const px = x + (r() - 0.5) * 60, py = y + (r() - 0.5) * 30, hgt = 5 + r() * 8; c.fillStyle = '#cfd4d8'; c.beginPath(); c.moveTo(px, py); c.lineTo(px + 2, py - hgt); c.lineTo(px + 4, py); c.closePath(); c.fill(); c.fillStyle = '#6a7074'; c.fillRect(px + 2, py - hgt * 0.6, 2, hgt * 0.6); } },
  // the Forge Reaches: a volcano, lava down its flank, smokestacks
  r3(c, x, y, r) {
    c.fillStyle = '#2a2424'; c.beginPath(); c.moveTo(x - 26, y + 12); c.lineTo(x - 6, y - 16); c.lineTo(x + 6, y - 16); c.lineTo(x + 28, y + 12); c.closePath(); c.fill();
    c.strokeStyle = EMBER; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x, y - 15); c.lineTo(x - 4, y - 4); c.lineTo(x + 2, y + 2); c.lineTo(x - 3, y + 11); c.stroke();
    smoke(c, x, y - 18, r, 8); for (const s of [-1, 1]) { c.fillStyle = '#3a3434'; c.fillRect(x + s * 34, y - 8, 4, 18); smoke(c, x + s * 34 + 2, y - 10, r, 4); }
  },
  // the Drowned Choir: a black lake with a cathedral's spires sinking in it
  r4(c, x, y, r) {
    c.fillStyle = '#07080a'; c.beginPath(); c.ellipse(x, y + 4, 34, 15, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#1c2026'; c.lineWidth = 1; c.beginPath(); c.ellipse(x, y + 4, 38, 18, 0, 0, Math.PI * 2); c.stroke();
    for (const [dx, h] of [[-8, 14], [0, 22], [8, 12]]) { c.fillStyle = '#4a4648'; c.fillRect(x + dx - 2, y + 4 - h, 4, h); c.beginPath(); c.moveTo(x + dx - 3, y + 4 - h); c.lineTo(x + dx, y - h - 3); c.lineTo(x + dx + 3, y + 4 - h); c.fill(); }
  },
  // the Seat of Augury: the great spire where it began, an eye at its top
  r5(c, x, y, r) {
    c.fillStyle = '#5a5458'; c.fillRect(x - 3, y - 34, 6, 40); c.fillStyle = '#2a2628'; c.fillRect(x, y - 34, 3, 40);
    c.beginPath(); c.moveTo(x - 4, y - 34); c.lineTo(x, y - 48); c.lineTo(x + 4, y - 34); c.fillStyle = '#6a6468'; c.fill();
    c.strokeStyle = BLOOD_HI; c.lineWidth = 1.3; c.beginPath(); c.ellipse(x, y - 40, 5, 2.6, 0, 0, Math.PI * 2); c.stroke(); c.fillStyle = BLOOD_HI; c.fillRect(x - 1, y - 41, 2, 2);
    for (const s of [-1, 1]) { c.fillStyle = '#3a3638'; c.fillRect(x + s * 9 - 2, y - 14, 4, 20); }
  },
};

const cache = new Map();
function cached(canvas, key, draw) {
  let img = cache.get(key);
  if (!img) { img = document.createElement('canvas'); img.width = MAP_W; img.height = MAP_H; draw(img.getContext('2d')); cache.set(key, img); }
  const c = canvas.getContext('2d'); c.imageSmoothingEnabled = false; c.drawImage(img, 0, 0);
}

// the whole continent: the regions on it, the roads between, the unknown ones in fog
export function drawWorld(canvas, regions) {
  cached(canvas, 'world:' + regions.map((R) => R.id + (R.open ? 1 : 0)).join(), (c) => {
    const N = noise(1931), r = rand(4417);
    const P = regions.map((R) => [R.x, R.y]);
    // the Ironspine: a range across the middle of the continent; the Teeth along the north coast
    const spine = [[0.12, 0.47], [0.3, 0.44], [0.46, 0.5], [0.6, 0.55], [0.72, 0.52], [0.9, 0.58]];
    const teeth = [[0.2, 0.22], [0.3, 0.16], [0.46, 0.2], [0.66, 0.16], [0.82, 0.24]];
    const h = (u, v) => {
      const ex = (u - 0.5) / 0.44, ey = (v - 0.52) / 0.4, ell = 1 - Math.sqrt(ex * ex + ey * ey);
      let e = (N.fbm(u * 2.6, v * 2.6) - 0.5) * 1.15 + (N.fbm(u * 9, v * 9, 3) - 0.5) * 0.25 + ell * 0.5 - 0.07;
      for (const [x, y] of P) e += Math.max(0, 0.18 - Math.hypot(u - x, (v - y) * 1.3)) * 1.2; // (every region on land)
      e -= Math.max(0, 0.07 - Math.hypot(u - 0.52, v - 0.33)) * 4; // an inland sea, the Cinder Mere
      if (e < 0) return e;
      const m = Math.max(0, 1 - segDist(u, v, spine) / 0.055) + Math.max(0, 1 - segDist(u, v, teeth) / 0.045) * 0.8;
      return e * 0.6 + m * N.ridged(u * 9, v * 9) * 0.75 + N.fbm(u * 14, v * 14, 3) * 0.08;
    };
    const H = relief(c, h, {
      // each region's ground a touch its own: ash for the March, pale for the Wastes, scorched for the Forge
      tint: (u, v, e, col) => {
        const near = (k, rad) => Math.max(0, 1 - Math.hypot(u - P[k][0], (v - P[k][1]) * 1.3) / rad);
        let c2 = col;
        if (regions[1]) c2 = mixc(c2, [92, 94, 98], near(1, 0.13) * 0.45);
        if (regions[2]) c2 = mixc(c2, [36, 18, 16], near(2, 0.12) * 0.6);
        if (regions[3]) c2 = mixc(c2, [16, 20, 22], near(3, 0.1) * 0.5);
        return c2;
      },
    });
    ashGround(c, H, r, 1600, 0.02, 0.32);
    hills(c, H, r, 0.28, 0.5);
    // the old fire's scars across the March and the Forge
    for (let k = 0; k < 7; k++) { const x = (0.15 + r() * 0.7) * MAP_W, y = (0.3 + r() * 0.55) * MAP_H; if (H.h(x / MAP_W, y / MAP_H) > 0.05) fissure(c, x, y, 30 + r() * 40, r() * 6, r); }
    // rivers off the Ironspine and the Teeth down to the sea (drawn along their valleys)
    const px = (pts) => pts.map(([x, y]) => [x * MAP_W, y * MAP_H]);
    for (const course of [[[0.3, 0.47], [0.27, 0.6], [0.2, 0.72], [0.12, 0.84], [0.06, 0.92]], [[0.5, 0.52], [0.52, 0.66], [0.5, 0.8], [0.54, 0.95]], [[0.74, 0.55], [0.8, 0.66], [0.9, 0.74], [0.97, 0.78]], [[0.44, 0.22], [0.47, 0.3], [0.51, 0.33]], [[0.66, 0.2], [0.62, 0.3], [0.55, 0.33]], [[0.24, 0.24], [0.16, 0.3], [0.06, 0.34]]]) riverAlong(c, px(course), N, 2.8, H);
    ranges(c, H, r, 0.36, 12, 1, 0.85);
    // dead forests in the lowlands
    for (let k = 0; k < 14; k++) { const x = (0.15 + r() * 0.7) * MAP_W, y = (0.2 + r() * 0.65) * MAP_H, e = H.h(x / MAP_W, y / MAP_H); if (e > 0.06 && e < 0.32) deadWood(c, x, y, 8, r); }
    borders(c, H, P.map(([x, y]) => [x * MAP_W, y * MAP_H]));
    // the roads: the pilgrims' way from the March to the Seat, with its branches
    const at = (k) => [P[k][0] * MAP_W, P[k][1] * MAP_H + 10];
    for (const [a, b] of [[0, 3], [0, 1], [1, 2], [2, 4], [3, 4]]) if (regions[a] && regions[b]) road(c, H, at(a), at(b), { w: 1.8 });
    // places of interest across the continent
    const marks = [['swords', 0.42, 0.62], ['graves', 0.2, 0.74], ['tower', 0.56, 0.38], ['skull', 0.86, 0.72], ['wreck', 0.66, 0.84], ['tower', 0.16, 0.36], ['gallows', 0.47, 0.76], ['ruin', 0.8, 0.44], ['swords', 0.26, 0.54], ['ruin', 0.34, 0.82], ['skull', 0.12, 0.6]];
    for (const [k, x, y] of marks) if (H.h(x, y) > 0.02) MARK[k](c, x * MAP_W, y * MAP_H, r);
    // the regions' emblems; the unknown ones lie under fog
    regions.forEach((R, k) => { if (!R.open) return; c.save(); c.translate(R.x * MAP_W, R.y * MAP_H); c.scale(1.7, 1.7); REGION_ART[R.id]?.(c, 0, 0, r); c.restore(); });
    // towns and ruins along the roads, named
    for (const [x, y, name, lit] of [[0.2, 0.66, 'Cairnmouth', 1], [0.36, 0.72, 'Hollow Vigil', 0], [0.44, 0.42, 'Grey Abbey', 1], [0.6, 0.66, 'The Pyres', 0], [0.27, 0.36, 'Saint Iber\'s Rest', 0], [0.7, 0.44, 'Fort Varn', 1], [0.16, 0.5, 'Ashgate', 0], [0.82, 0.62, 'Lantern Hold', 0]]) if (H.h(x, y) > 0.03 && !regions.some((R) => !R.open && Math.hypot(R.x - x, (R.y - y) * 1.6) < 0.13)) town(c, x * MAP_W, y * MAP_H, name, lit, r);
    regions.forEach((R) => { if (!R.open) fog(c, R.x * MAP_W, R.y * MAP_H - 6, 70, r); });
    // the sea's names, the ranges' names
    label(c, 'THE SEA OF CINDERS', MAP_W * 0.13, MAP_H * 0.9, { size: 13, italic: true, spaced: true, rot: -0.12 });
    label(c, 'THE BLACK MERIDIAN', MAP_W * 0.9, MAP_H * 0.16, { size: 11, italic: true, spaced: true, rot: 0.5 });
    label(c, 'The Ironspine', MAP_W * 0.62, MAP_H * 0.6, { size: 11, italic: true, rot: 0.2 });
    label(c, 'The Teeth', MAP_W * 0.4, MAP_H * 0.12, { size: 10, italic: true, rot: -0.15 });
    label(c, 'Cinder Mere', MAP_W * 0.52, MAP_H * 0.33, { size: 9, italic: true });
    // sea monsters and wrecks off the coast, as the old maps had them
    seaBeast(c, MAP_W * 0.07, MAP_H * 0.22); seaBeast(c, MAP_W * 0.93, MAP_H * 0.86);
    compass(c, 68, MAP_H - 76, 34);
    scaleBar(c, 120, MAP_H - 40, 'a hundred leagues');
    vignette(c);
    frame(c, null);
  });
}
// a sea serpent's coils breaking the water
function seaBeast(c, x, y) {
  c.strokeStyle = '#2a2a30'; c.lineWidth = 3;
  for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(x + k * 12, y, 5, Math.PI, 0); c.stroke(); }
  c.fillStyle = '#2a2a30'; c.beginPath(); c.moveTo(x + 30, y); c.lineTo(x + 38, y - 8); c.lineTo(x + 40, y - 2); c.closePath(); c.fill();
  c.fillStyle = BLOOD_HI; c.fillRect(x + 36, y - 6, 1.5, 1.5);
  c.strokeStyle = 'rgba(160,160,170,0.25)'; c.lineWidth = 1; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(x - 6 + k * 12, y + 1); c.lineTo(x + k * 12, y + 1); c.stroke(); }
}

// =====================================================================================================
// A REGION
// =====================================================================================================
// the Shattered March: a long valley climbing from the burned ward in the south-west to the Spire's crag in the
// north-east, mountains on both sides, the Ashflow river down its floor to the sea, the pilgrims' road along it,
// the old front's trenches across it, a pass east to the Bastion
const STRUCT = {
  // Ashfall Ward: a walled grid of burned blocks, fires still going, smoke drifting, a camp outside the south gate
  r1a1(c, x, y, r) {
    c.strokeStyle = '#5a5452'; c.lineWidth = 3; c.beginPath(); c.ellipse(x, y, 62, 40, 0, 0.15, Math.PI * 2 - 0.15); c.stroke();
    c.strokeStyle = INK; c.lineWidth = 1; c.beginPath(); c.ellipse(x, y, 64, 42, 0, 0.15, Math.PI * 2 - 0.15); c.stroke();
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; c.fillStyle = '#6a6462'; c.fillRect(x + Math.cos(a) * 62 - 3, y + Math.sin(a) * 40 - 4, 6, 6); }
    for (let j = -4; j <= 4; j++) for (let i = -7; i <= 7; i++) {
      const px = x + i * 8 + (j % 2) * 2, py = y + j * 8;
      if (((px - x) / 58) ** 2 + ((py - y) / 36) ** 2 > 1 || r() < 0.12) continue;
      const burned = r() < 0.3, w = 5 + (r() * 2 | 0), hh = 4 + (r() * 3 | 0);
      c.fillStyle = burned ? '#151113' : r() < 0.5 ? '#57514f' : '#45403f'; c.fillRect(px, py - hh + 4, w, hh);
      c.fillStyle = burned ? '#0a0809' : '#2a2628'; c.fillRect(px + w - 2, py - hh + 4, 2, hh);
      if (burned && r() < 0.5) { c.fillStyle = EMBER; c.fillRect(px + 1, py + 1, 1, 1); }
    }
    // the chapel's tower, the manufactorum's stacks
    c.fillStyle = '#6a6462'; c.fillRect(x - 22, y - 30, 5, 18); c.beginPath(); c.moveTo(x - 23, y - 30); c.lineTo(x - 19.5, y - 38); c.lineTo(x - 16, y - 30); c.fill();
    for (const s of [0, 6]) { c.fillStyle = '#3a3434'; c.fillRect(x + 24 + s, y - 26, 3, 16); }
    for (const [dx, dy] of [[-10, -8], [8, -2], [24, -24], [-30, 4]]) smoke(c, x + dx, y + dy, r, 7);
    // the crusade's camp outside the south gate
    for (let k = 0; k < 4; k++) { const px = x - 12 + k * 8, py = y + 54; c.fillStyle = '#5a5248'; c.beginPath(); c.moveTo(px - 3, py); c.lineTo(px, py - 5); c.lineTo(px + 3, py); c.fill(); }
    c.fillStyle = EMBER; c.fillRect(x + 1, y + 50, 2, 2);
  },
  // the Sump Lines: a great flooded pit stepped in terraces, pump towers with red lamps round it, rails running into
  // tunnel mouths in the slopes, sinkholes of black water
  r1a2(c, x, y, r) {
    for (let k = 0; k < 5; k++) { c.fillStyle = ['#2a2628', '#221e20', '#1a1618', '#121012', '#0a0a0c'][k]; c.beginPath(); c.ellipse(x, y + k * 2, 46 - k * 8, 26 - k * 5, 0, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#0f1a18'; c.beginPath(); c.ellipse(x, y + 10, 10, 5, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#2e4a42'; c.lineWidth = 1; c.beginPath(); c.ellipse(x, y + 10, 12, 6, 0, 0, Math.PI * 2); c.stroke();
    for (const [dx, dy] of [[-40, -14], [36, -18], [44, 10], [-34, 18]]) {
      c.fillStyle = '#4a4446'; c.fillRect(x + dx - 2, y + dy - 14, 4, 14); c.fillStyle = '#2a2628'; c.fillRect(x + dx, y + dy - 14, 2, 14);
      c.fillStyle = '#5a5452'; c.fillRect(x + dx - 4, y + dy - 16, 8, 2); c.fillStyle = BLOOD_HI; c.fillRect(x + dx - 1, y + dy - 18, 2, 2);
    }
    // rails into the tunnel mouths
    for (const [x0, y0, x1, y1] of [[x - 70, y + 30, x - 16, y + 6], [x + 70, y - 30, x + 14, y - 4]]) {
      c.strokeStyle = '#6a6462'; c.lineWidth = 1; for (const o of [-1.5, 1.5]) { c.beginPath(); c.moveTo(x0, y0 + o); c.lineTo(x1, y1 + o); c.stroke(); }
      for (let t = 0; t < 1; t += 0.08) { const px = x0 + (x1 - x0) * t, py = y0 + (y1 - y0) * t; c.fillStyle = '#3a3434'; c.fillRect(px - 1, py - 3, 2, 6); }
    }
    for (const [dx, dy] of [[-62, -20], [58, 24]]) { c.fillStyle = INK; c.beginPath(); c.arc(x + dx, y + dy, 6, Math.PI, 0); c.fill(); c.fillRect(x + dx - 6, y + dy, 12, 2); c.strokeStyle = '#6a6462'; c.beginPath(); c.arc(x + dx, y + dy, 7, Math.PI, 0); c.stroke(); }
    for (const [dx, dy] of [[-22, 34], [30, -32], [52, -4]]) { c.fillStyle = '#081210'; c.beginPath(); c.ellipse(x + dx, y + dy, 6, 3, 0, 0, Math.PI * 2); c.fill(); }
  },
  // Saint Orsk's Spire: a cathedral-fortress on a crag, the spire tall over it, walls stepping down, bells, a red
  // window
  r1a3(c, x, y, r) {
    c.fillStyle = '#3a3638'; c.beginPath(); c.moveTo(x - 46, y + 18); c.lineTo(x - 28, y - 4); c.lineTo(x - 10, y - 10); c.lineTo(x + 18, y - 8); c.lineTo(x + 40, y + 2); c.lineTo(x + 50, y + 18); c.closePath(); c.fill();
    c.fillStyle = '#1e1c1e'; c.beginPath(); c.moveTo(x + 10, y - 9); c.lineTo(x + 40, y + 2); c.lineTo(x + 50, y + 18); c.lineTo(x + 8, y + 18); c.closePath(); c.fill();
    c.strokeStyle = INK; c.lineWidth = 1; for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(x - 40 + k * 15, y + 18); c.lineTo(x - 34 + k * 14, y + 4); c.stroke(); }
    // the walls and the nave
    c.fillStyle = '#5e5856'; c.fillRect(x - 26, y - 22, 52, 14); c.fillStyle = '#2e2a2c'; c.fillRect(x + 8, y - 22, 18, 14);
    for (let k = 0; k < 7; k++) { c.fillStyle = '#5e5856'; c.fillRect(x - 26 + k * 8, y - 25, 4, 3); }
    c.fillStyle = '#6e6866'; c.fillRect(x - 14, y - 36, 22, 14); c.beginPath(); c.moveTo(x - 16, y - 36); c.lineTo(x - 3, y - 46); c.lineTo(x + 10, y - 36); c.fill();
    // the spire
    c.fillStyle = '#76706c'; c.fillRect(x + 12, y - 58, 8, 36); c.fillStyle = '#3a3638'; c.fillRect(x + 16, y - 58, 4, 36);
    c.beginPath(); c.moveTo(x + 11, y - 58); c.lineTo(x + 16, y - 82); c.lineTo(x + 21, y - 58); c.fillStyle = '#5a5452'; c.fill();
    c.strokeStyle = BLOOD_HI; c.lineWidth = 1.2; c.beginPath(); c.ellipse(x + 16, y - 66, 3.5, 2, 0, 0, Math.PI * 2); c.stroke();
    c.fillStyle = BLOOD_HI; c.fillRect(x - 6, y - 32, 3, 6); c.fillRect(x + 1, y - 32, 3, 6);
    for (const dx of [-24, 24]) { c.fillStyle = '#6e6866'; c.fillRect(x + dx - 3, y - 32, 6, 12); c.beginPath(); c.moveTo(x + dx - 4, y - 32); c.lineTo(x + dx, y - 40); c.lineTo(x + dx + 4, y - 32); c.fill(); }
  },
  // the Sentinel's Bastion: a black keep in the pass, round towers, a gate with three gems burning over it
  r1f(c, x, y, r) {
    c.fillStyle = '#2a2628'; c.fillRect(x - 30, y - 18, 60, 22); c.fillStyle = '#141214'; c.fillRect(x + 6, y - 18, 24, 22);
    for (let k = 0; k < 8; k++) { c.fillStyle = '#3a3638'; c.fillRect(x - 30 + k * 8, y - 21, 4, 3); }
    for (const dx of [-34, 34]) { c.fillStyle = '#3e3a3c'; c.fillRect(x + dx - 6, y - 30, 12, 34); c.fillStyle = '#1e1c1e'; c.fillRect(x + dx, y - 30, 6, 34); c.beginPath(); c.moveTo(x + dx - 7, y - 30); c.lineTo(x + dx, y - 40); c.lineTo(x + dx + 7, y - 30); c.fillStyle = '#4a4648'; c.fill(); }
    c.fillStyle = '#46424a'; c.fillRect(x - 9, y - 40, 18, 22); c.beginPath(); c.moveTo(x - 10, y - 40); c.lineTo(x, y - 52); c.lineTo(x + 10, y - 40); c.fill();
    c.fillStyle = INK; c.beginPath(); c.arc(x, y - 2, 6, Math.PI, 0); c.fill(); c.fillRect(x - 6, y - 2, 12, 6);
    for (const [k, col] of [[-6, '#ff3a1a'], [0, '#d8f0ff'], [6, '#ffb040']]) { c.fillStyle = col; c.fillRect(x + k - 1.5, y - 14, 3, 3); }
  },
};

export function drawRegion(canvas, region, areas, opened = {}) {
  cached(canvas, 'region:' + region.id + ':' + areas.map((a) => a.id + (opened[a.id] ? 1 : 0)).join(), (c) => {
    const N = noise(region.id.charCodeAt(1) * 977 + 5), r = rand(region.id.charCodeAt(1) * 31 + 7);
    const A = areas.map((a) => [a.x, a.y]);
    // the valley floor: from the sea in the south-west, past each area to the Spire; a pass east to the Bastion
    const bend = (a, b, k) => { const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); return [mx - dy / L * k, my + dx / L * k]; };
    const main = [[0.02, 0.98], [0.14, 0.86], A[0], bend(A[0], A[1], 0.07), A[1], bend(A[1], A[2], -0.06), A[2], [0.9, 0.08]], pass = A[3] ? [A[2], [0.86, 0.4], A[3], [1.02, 0.7]] : [];
    const h = (u, v) => {
      const dv = segDist(u, v * 0.85, main.map(([x, y]) => [x, y * 0.85])), dp = pass.length ? segDist(u, v, pass) : 9;
      const vall = Math.min(dv / 0.16, dp / 0.07);
      let e = 0.08 + Math.min(1, vall) ** 1.6 * 0.62 + (N.fbm(u * 5, v * 5) - 0.5) * 0.25;
      e += Math.max(0, vall - 0.9) * N.ridged(u * 7, v * 7) * 0.55;
      for (const [x, y] of A) e -= Math.max(0, 0.07 - Math.hypot(u - x, (v - y) * 1.2)) * 2.4; // (each place on level ground)
      e -= Math.max(0, 0.22 - Math.hypot(u, (v - 1) * 1.4)) * 3; // the sea in the south-west corner
      return e;
    };
    const H = relief(c, h, { tint: (u, v, e, col) => mixc(col, [30, 16, 14], Math.max(0, 0.6 - Math.hypot(u - A[0][0], v - A[0][1]) * 4) * 0.5) }); // (ground scorched round the ward)
    ashGround(c, H, r, 2200, 0.0, 0.34);
    hills(c, H, r, 0.3, 0.52);
    for (let k = 0; k < 5; k++) { const x = (0.2 + r() * 0.5) * MAP_W, y = (0.35 + r() * 0.5) * MAP_H; if (H.h(x / MAP_W, y / MAP_H) < 0.3 && !A.some(([ax, ay]) => Math.hypot(x / MAP_W - ax, y / MAP_H - ay) < 0.1)) fissure(c, x, y, 26 + r() * 30, r() * 6, r); }
    // the Ashflow: from springs under the Spire down the valley floor to the sea, a tributary off the Grey Teeth
    const P = (pts) => pts.map(([x, y]) => [x * MAP_W, y * MAP_H]);
    const m1 = bend(A[0], A[1], 0.07), m2 = bend(A[1], A[2], -0.06);
    riverAlong(c, P([[A[2][0] - 0.02, A[2][1] + 0.07], [m2[0] + 0.02, m2[1] + 0.05], [A[1][0] + 0.03, A[1][1] + 0.08], [m1[0] + 0.03, m1[1] + 0.06], [A[0][0] + 0.07, A[0][1] + 0.1], [0.14, 0.9], [0.04, 0.99]]), N, 4);
    riverAlong(c, P([[0.36, 0.2], [0.4, 0.34], [0.45, 0.46], [A[1][0] + 0.02, A[1][1] + 0.12]]), N, 1.6);
    ranges(c, H, r, 0.6, 24, 1.55, 0.5);
    for (let k = 0; k < 12; k++) { const x = (0.1 + r() * 0.8) * MAP_W, y = (0.15 + r() * 0.75) * MAP_H, e = H.h(x / MAP_W, y / MAP_H); if (e > 0.12 && e < 0.36 && !A.some(([ax, ay]) => Math.hypot(x / MAP_W - ax, y / MAP_H - ay) < 0.12)) deadWood(c, x, y, 10, r, 18); }
    // the old front: a zigzag of trenches across the valley, graves behind it, a wrecked war-engine, a battlefield
    const tx = (A[0][0] + A[1][0]) / 2 * MAP_W, ty = (A[0][1] + A[1][1]) / 2 * MAP_H;
    c.strokeStyle = '#0c0a0b'; c.lineWidth = 2.4; c.beginPath(); for (let k = 0; k < 12; k++) c.lineTo(tx - 70 + k * 12, ty - 40 + k * 7 + (k % 2 ? -5 : 5)); c.stroke();
    c.strokeStyle = '#6a625a'; c.lineWidth = 0.8; c.beginPath(); for (let k = 0; k < 12; k++) c.lineTo(tx - 70 + k * 12, ty - 41 + k * 7 + (k % 2 ? -5 : 5)); c.stroke();
    for (let k = 0; k < 20; k++) { c.fillStyle = '#4a4442'; c.fillRect(tx - 60 + r() * 110, ty - 30 + r() * 50, 2, 2); } // shell holes
    MARK.graves(c, tx - 40, ty + 20, r); MARK.graves(c, tx - 20, ty + 26, r); MARK.wreck(c, tx + 30, ty + 6); MARK.swords(c, tx - 4, ty - 18);
    // the roads: the pilgrims' road up the valley through every place, the pass road to the Bastion
    const at = (k) => [A[k][0] * MAP_W, A[k][1] * MAP_H + 4];
    roadAlong(c, [[0.1 * MAP_W, 0.95 * MAP_H], [0.18 * MAP_W, 0.84 * MAP_H], at(0), [m1[0] * MAP_W - 10, m1[1] * MAP_H - 6], at(1), [m2[0] * MAP_W - 6, m2[1] * MAP_H - 4], at(2)], N, { w: 2.2 });
    if (A[3]) roadAlong(c, [at(2), [0.85 * MAP_W, 0.3 * MAP_H], at(3)], N, { w: 1.8, dash: [3, 3], color: '#a89c84' });
    // a broken viaduct over the Ashflow, a gallows hill, a ruined watchtower, a skull marker on the high pass
    MARK.gallows(c, A[1][0] * MAP_W - 90, A[1][1] * MAP_H + 40); MARK.tower(c, A[2][0] * MAP_W - 110, A[2][1] * MAP_H + 20);
    MARK.ruin(c, A[0][0] * MAP_W + 110, A[0][1] * MAP_H + 50); MARK.skull(c, 0.84 * MAP_W, 0.44 * MAP_H); MARK.tower(c, 0.62 * MAP_W, 0.72 * MAP_H);
    // hamlets on the valley floor and up the side valleys
    for (const [x, y, name, lit] of [[0.2, 0.82, 'Weir End', 1], [0.42, 0.62, 'Kessel', 0], [0.6, 0.32, 'Orsk\'s Rest', 1], [0.3, 0.42, 'Coldwell', 0], [0.7, 0.56, 'Brann\'s Ford', 0]]) town(c, x * MAP_W, y * MAP_H, name, lit, r);
    // the places
    areas.forEach((a) => STRUCT[a.id]?.(c, a.x * MAP_W, a.y * MAP_H, r));
    // names on the land
    label(c, 'The Ashflow', 0.24 * MAP_W, 0.74 * MAP_H, { size: 11, italic: true, rot: -0.6, color: 'rgba(196,60,50,0.8)' });
    label(c, 'THE OLD FRONT', tx + 10, ty - 56, { size: 10, italic: true, spaced: true, rot: 0.5 });
    label(c, 'Pilgrims\' Road', (A[1][0] + A[2][0]) / 2 * MAP_W - 30, (A[1][1] + A[2][1]) / 2 * MAP_H + 18, { size: 10, italic: true, rot: -0.65 });
    label(c, 'GALLOWS HILL', A[1][0] * MAP_W - 90, A[1][1] * MAP_H + 52, { size: 8, italic: true });
    label(c, 'The Grey Teeth', 0.2 * MAP_W, 0.2 * MAP_H, { size: 12, italic: true, spaced: true, rot: -0.2 });
    label(c, 'Kessel Heights', 0.64 * MAP_W, 0.88 * MAP_H, { size: 11, italic: true, spaced: true });
    label(c, 'Sentinel\'s Pass', 0.86 * MAP_W, 0.48 * MAP_H, { size: 9, italic: true, rot: 0.6 });
    label(c, 'the Grey Shallows', 0.06 * MAP_W, 0.88 * MAP_H, { size: 9, italic: true, rot: -0.3 });
    compass(c, MAP_W - 70, 74, 32);
    scaleBar(c, 40, MAP_H - 40, 'ten leagues');
    vignette(c);
    frame(c, null);
  });
}
