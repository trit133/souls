// Supply chests: 2-4 a raid map, each in a building with a couple more enemies than usual round it (the map places
// them: city.js). A chest stays locked until its guards are dead; then F opens it for the whole party:
//   gold   - 2-3x what its guards were worth (in a party, everyone gets the same cut as a kill: partyShare)
//   emeralds - 1-10 (1-5 in a party)
//   an injector for the rest of the raid (not past your maximum). In a party only the first chest opened gives one;
//            the others heal everyone 30% of their max health instead
// The large chest in a raid's hoard vault (with two small ones beside it, all three behind the same guards) pays
// 4-6x the guards' gold, 10-20 emeralds (5-10 in a party) and always an injector, the party's first-chest one aside.
// Every chest also has a rarity (common to legendary, from the area's loot table: regions.js), shown by the colour of
// its glow: the rarer it is, the more guards round it and the tougher they are (city.js), and it holds materials
// (items.js) of that rarity and below. A party each get about half as much, all the same.
// The host (or a solo player) decides what's inside and tells the party ('chest'); a guest asks with 'chestReq'.
// Supply drums: smash one (any swing that reaches it, or a spell) and it bursts apart into staves and hoops; out comes a
// material or two off the area's drum table (the plain drums standing in houses and cellars are often empty). Shared
// in a party the same way ('drum' / 'drumReq').
import * as THREE from 'three';
import { KILL_GOLD, killGold, partyShare } from './progress.js';
import { RARITY, rollChest, rollDrum } from './items.js';
import { AREAS } from './regions.js';

const REACH = 1.9, HEAL_PCT = 0.3;
const LOCKED = 0xc02a1e;

// a squat iron-bound munitions chest with a lid that swings up and a lit lock: what the map builds at (x, z)
export function buildChest(w, x, z, yaw, big = false, rarity = 'common') {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = yaw; g.userData.noMerge = true;
  if (big) g.scale.setScalar(1.55);
  const part = (geo, mat, px, py, pz, parent = g) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); parent.add(m); return m; };
  const W = 1.1, D = 0.66, H = 0.5, brass = new THREE.MeshBasicMaterial({ color: 0x8a6428 }); // (unlit: it reads in a dark house)
  part(new THREE.BoxGeometry(W, H, D), w.mats.wood, 0, H / 2, 0);
  for (const s of [-1, 1]) part(new THREE.BoxGeometry(0.09, H + 0.02, D + 0.04), brass, s * W * 0.32, H / 2, 0, g); // bands
  part(new THREE.BoxGeometry(W + 0.04, 0.07, D + 0.04), w.mats.metal, 0, 0.04, 0); // foot
  // the lid hinges along the back edge
  const lid = new THREE.Group(); lid.position.set(0, H, -D / 2); g.add(lid);
  part(new THREE.BoxGeometry(W + 0.04, 0.16, D + 0.04), w.mats.wood, 0, 0.08, D / 2, lid);
  for (const s of [-1, 1]) part(new THREE.BoxGeometry(0.1, 0.18, D + 0.08), brass, s * W * 0.32, 0.08, D / 2, lid);
  const glow = new THREE.MeshBasicMaterial({ color: LOCKED });
  const lock = part(new THREE.BoxGeometry(0.16, 0.18, 0.05), glow, 0, H - 0.08, D / 2 + 0.03);
  // a faint glow on the floor so it shows in a dark house
  const halo = new THREE.Mesh(new THREE.CircleGeometry(1.4, 20), new THREE.MeshBasicMaterial({ color: rarityHex(rarity), transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.rotation.x = -Math.PI / 2; halo.position.y = 0.04; g.add(halo);
  w.add(g);
  w.ob(x, z, big ? 1.05 : 0.7);
  return { x, z, big, rarity, group: g, lid, lock, halo, glow };
}
const rarityHex = (r) => parseInt(RARITY[r].color.slice(1), 16);

// a supply drum: a rusted promethium drum with hazard bands and an amber seal light; smash it for what's inside
export function buildDrum(w, x, z, plain = false) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.userData.noMerge = true;
  const part = (geo, mat, py) => { const m = new THREE.Mesh(geo, mat); m.position.y = py; g.add(m); return m; };
  part(new THREE.CylinderGeometry(0.34, 0.36, 0.95, 8), plain ? w.mats.logDark : w.mats.rust, 0.48);
  for (const y of [0.22, 0.74]) part(new THREE.CylinderGeometry(0.37, 0.37, 0.1, 8), plain ? w.mats.metal : w.mats.hazard, y);
  part(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 8), w.mats.metal, 0.97);
  if (!plain) part(new THREE.BoxGeometry(0.1, 0.08, 0.1), new THREE.MeshBasicMaterial({ color: 0xffb040 }), 1.02); // (the amber seal: a supply drum)
  w.add(g);
  w.ob(x, z, 0.42);
  return { x, z, plain, group: g, ob: w.obstacles[w.obstacles.length - 1] };
}

export class Chests {
  constructor(game) { this.game = game; this.list = []; }

  setup(world) {
    this.list = (world.chests || []).map((def, i) => ({ i, def, opened: false, lidT: 0 }));
    this.drums = (world.drums || []).map((def, i) => ({ i, def, broken: false, asked: false }));
    for (const d of this.debris || []) this.game.scene.remove(d.m);
    this.debris = [];
    this.region = world.dungeon?.area?.region || 'r1';
    this.loot = world.dungeon?.area?.loot || null;
    this.potGiven = false; // (a party: the first chest's injector)
  }

  locked(c) { return c.def.guards.some((sp) => sp.enemy?.alive); }

  update(dt) {
    const t = this.game.time;
    this.updateDebris(dt);
    for (const c of this.list) {
      const d = c.def, rc = rarityHex(d.rarity || 'common'), col = c.opened ? 0x3a2a10 : this.locked(c) ? LOCKED : rc;
      d.glow.color.setHex(col); d.halo.material.color.setHex(c.opened ? 0x3a2a10 : rc); // (the glow: its rarity)
      d.halo.material.opacity = c.opened ? 0 : 0.26 + Math.sin(t * 3 + c.i) * 0.08;
      if (c.opened && c.lidT < 1) { c.lidT = Math.min(1, c.lidT + dt * 3); d.lid.rotation.x = -1.9 * (1 - (1 - c.lidT) ** 3); }
    }
  }

  near(p) { return p.alive && p.state === 'move' ? this.list.find((c) => !c.opened && Math.hypot(p.pos.x - c.def.x, p.pos.z - c.def.z) < REACH + (c.def.big ? 0.5 : 0)) : null; }

  promptFor(p, key) {
    const c = this.near(p);
    if (!c) return null;
    const kind = `${RARITY[c.def.rarity || 'common'].name} ${c.def.big ? 'hoard' : 'chest'}`;
    if (this.locked(c)) return { c, line: `${kind} sealed · kill its guards (${c.def.guards.filter((sp) => sp.enemy?.alive).length} left)` };
    return { c, line: `${key}: Open the ${kind.toLowerCase()}${this.game.mp.active ? ' (for the whole party)' : ''}` };
  }

  // F at a chest: the host / solo opens it; a guest asks the host
  tryOpen(c) {
    const g = this.game;
    if (c.opened || this.locked(c)) return;
    if (g.isGuest) { g.mp.send({ t: 'chestReq', i: c.i }); return; }
    this.open(c);
  }

  // what's inside, decided once (host / solo), then given to everyone
  open(c) {
    const g = this.game;
    if (c.opened || this.locked(c)) return;
    const party = g.mp.active, players = party ? (g.runPlayers || g.mp.members.length || 2) : 1;
    const worth = c.def.guards.reduce((s, sp) => s + (sp.enemy ? killGold(sp.enemy) : 0), 0) || 2 * KILL_GOLD[0]; // (no guards placed: as if two)
    const big = c.def.big;
    const gold = Math.round(worth * (big ? 4 + Math.random() * 2 : 2 + Math.random()) * (party ? partyShare(players) : 1));
    const em = big ? (party ? 5 + Math.floor(Math.random() * 6) : 10 + Math.floor(Math.random() * 11)) : 1 + Math.floor(Math.random() * (party ? 5 : 10));
    const pot = big || !party || !this.potGiven;
    if (party && !big) this.potGiven = true;
    const items = this.loot ? rollChest(Math.random, this.region, c.def.rarity || 'common', { big, party }) : {};
    const msg = { t: 'chest', i: c.i, gold, em, pot: pot ? 1 : 0, big: big ? 1 : 0, items };
    if (party) g.mp.sendAll(msg);
    this.onOpen(msg);
  }

  // a chest opened (here or by the host): its gold, emeralds and the injector or the heal, for this player
  onOpen(d) {
    const g = this.game, c = this.list[d.i];
    if (!c || c.opened) return;
    c.opened = true;
    if (d.pot && !d.big) this.potGiven = true;
    const p = g.player, lines = [];
    if (d.gold && g.bankNow(d.gold, `chest${g.act}:${d.i}`)) { lines.push(`◆ +${d.gold}`); g.statusPopup(p, `+${d.gold}`, '#e8c25a'); }
    if (d.em) { g.addEmeralds(d.em); lines.push(`+${d.em} emerald${d.em > 1 ? 's' : ''}`); }
    if (d.items && Object.keys(d.items).length) { g.addLoot(d.items); g.lootFeed(d.items); }
    if (p?.alive) {
      if (d.pot) {
        if (p.flasks < p.maxFlasks) { p.flasks++; lines.push('+1 injector'); } else lines.push('injectors full');
      } else {
        const got = Math.min(p.maxHp * HEAL_PCT, p.maxHp - p.hp);
        p.hp += got;
        if (got > 0) g.statusPopup(p, `+${Math.round(got)}`, '#ff6a6a');
        lines.push('healed 30%');
      }
    }
    g.ui.toast(`${RARITY[c.def.rarity || 'common'].name.toUpperCase()} ${c.def.big ? 'HOARD' : 'CACHE'} · ${lines.join(' · ')}`, 4);
    g.audio.play('heal', 0.7);
    g.fx.burst({ x: c.def.x, y: 0.8, z: c.def.z }, c.def.big ? 40 : 18, [1, 0.78, 0.3], 3, 0.7, 0.2);
  }

  // ---------- supply drums ----------
  // a swing of yours in its striking moment that reaches a drum (in front of you) smashes it; so does a spell
  updateDrums() {
    const g = this.game, p = g.player, a = p?.atk;
    if (!p?.alive || !a || !['attack', 'riposte', 'charge'].includes(p.state)) return;
    const hits = a.def.hits || [], live = !hits.length ? p.trailOn : hits.some((h) => a.t >= h.t0 - 0.05 && a.t <= h.t1 + 0.08);
    if (!live) return;
    const reach = Math.max(2.4, ...hits.map((h) => (h.range || 2) + 0.6)), f = p.fwd();
    for (const d of this.drums) {
      const dx = d.def.x - p.pos.x, dz = d.def.z - p.pos.z, dist = Math.hypot(dx, dz);
      if (dist > reach || (dist > 0.7 && (dx * f.x + dz * f.z) / dist < -0.1)) continue;
      if (g.world.lineClear && !g.world.lineClear(p.pos.x, p.pos.z, d.def.x, d.def.z)) continue;
      this.hitDrum(d);
    }
  }
  // a spell or blast at (x, z), r across
  drumsAt(x, z, r) { for (const d of this.drums) if (Math.hypot(d.def.x - x, d.def.z - z) < r + 0.45) this.hitDrum(d); }
  hitDrum(d) {
    const g = this.game;
    if (d.broken || d.asked) return;
    if (g.isGuest) { d.asked = true; g.mp.send({ t: 'drumReq', i: d.i }); this.breakApart(d); return; } // (it falls apart here at once; the host says what was in it)
    this.smash(d);
  }
  // what's inside, decided once (host / solo), then given to everyone. A plain drum is empty half the time
  smash(d) {
    const g = this.game;
    if (d.broken || !this.loot) return;
    const empty = d.def.plain && Math.random() < 0.5;
    const msg = { t: 'drum', i: d.i, items: empty ? {} : rollDrum(Math.random, this.region, this.loot.drum, g.mp.active) };
    if (g.mp.active) g.mp.sendAll(msg);
    this.onDrum(msg);
  }
  onDrum(m) {
    const g = this.game, d = this.drums[m.i];
    if (!d || d.broken) return;
    d.broken = true;
    this.breakApart(d);
    if (Object.keys(m.items || {}).length) { g.addLoot(m.items); g.lootFeed(m.items); }
  }
  // it bursts: eight staves, two hoops and the lid fly out, bounce and settle, then sink away
  breakApart(d) {
    if (d.apart) return;
    d.apart = true;
    const g = this.game, M = g.world.mats, D = d.def, plain = D.plain;
    D.group.visible = false;
    const obs = g.world.obstacles, k = obs.indexOf(D.ob); if (k >= 0) obs.splice(k, 1); // (nothing left to walk round)
    const add = (geo, mat, x, y, z, ry, v, spin) => {
      const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; g.scene.add(m);
      this.debris.push({ m, v, spin, t: 0, rest: false });
    };
    const stave = new THREE.BoxGeometry(0.22, 0.92, 0.06);
    for (let n = 0; n < 8; n++) {
      const a = (n / 8) * Math.PI * 2 + Math.random() * 0.3, sp = 1.8 + Math.random() * 2.2;
      add(stave, plain ? M.logDark : M.rust, D.x + Math.cos(a) * 0.32, 0.48, D.z + Math.sin(a) * 0.32, -a + Math.PI / 2,
        new THREE.Vector3(Math.cos(a) * sp, 2 + Math.random() * 2.5, Math.sin(a) * sp), new THREE.Vector3((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 9));
    }
    const hoop = new THREE.TorusGeometry(0.36, 0.035, 4, 10);
    for (const y of [0.22, 0.74]) {
      const a = Math.random() * 6.28;
      add(hoop, plain ? M.metal : M.hazard, D.x, y, D.z, 0, new THREE.Vector3(Math.cos(a) * 1.2, 1.5 + Math.random() * 2, Math.sin(a) * 1.2), new THREE.Vector3(3 + Math.random() * 4, 0, Math.random() * 3));
    }
    add(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 8), M.metal, D.x, 0.97, D.z, 0, new THREE.Vector3((Math.random() - 0.5) * 2, 4 + Math.random() * 2, (Math.random() - 0.5) * 2), new THREE.Vector3(6, 0, 4));
    g.fx.burst({ x: D.x, y: 0.6, z: D.z }, 14, plain ? [0.4, 0.35, 0.3] : [0.7, 0.45, 0.2], 3, 0.5, 0.18);
    g.fx.dust?.({ x: D.x, y: 0, z: D.z }, 4, 0.5);
    g.audio.play('clang', 0.55);
  }
  updateDebris(dt) {
    for (const d of this.debris) {
      d.t += dt;
      const m = d.m;
      if (!d.rest) {
        d.v.y -= 14 * dt;
        m.position.addScaledVector(d.v, dt);
        m.rotation.x += d.spin.x * dt; m.rotation.y += d.spin.y * dt; m.rotation.z += d.spin.z * dt;
        if (m.position.y < 0.04) {
          m.position.y = 0.04;
          if (Math.abs(d.v.y) < 2.2) { d.rest = true; m.rotation.x = Math.PI / 2; m.rotation.z = 0; } // (lies flat where it lands)
          else { d.v.y *= -0.35; d.v.x *= 0.5; d.v.z *= 0.5; d.spin.multiplyScalar(0.5); }
        }
      } else if (d.t > 7) m.position.y -= dt * 0.15; // (after a while it sinks into the dirt)
    }
    this.debris = this.debris.filter((d) => { if (d.t < 9) return true; this.game.scene.remove(d.m); return false; });
  }
}
