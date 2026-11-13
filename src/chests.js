// Supply chests: 2-4 a raid map, each in a building with a couple more enemies than usual round it (the map places
// them: city.js). A chest stays locked until its guards are dead; then F opens it for the whole party:
//   gold   - 2-3x what its guards were worth (in a party, everyone gets the same cut as a kill: partyShare)
//   emeralds - 1-10 (1-5 in a party)
//   an injector for the rest of the raid (not past your maximum). In a party only the first chest opened gives one;
//            the others heal everyone 30% of their max health instead
// The large chest in a raid's hoard vault (with two small ones beside it, all three behind the same guards) pays
// 4-6x the guards' gold, 10-20 emeralds (5-10 in a party) and always an injector, the party's first-chest one aside.
// The host (or a solo player) decides what's inside and tells the party ('chest'); a guest asks with 'chestReq'.
import * as THREE from 'three';
import { KILL_GOLD, killGold, partyShare } from './progress.js';

const REACH = 1.9, HEAL_PCT = 0.3;
const LOCKED = 0xc02a1e, OPEN = 0xffc040;

// a squat iron-bound munitions chest with a lid that swings up and a lit lock: what the map builds at (x, z)
export function buildChest(w, x, z, yaw, big = false) {
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
  const halo = new THREE.Mesh(new THREE.CircleGeometry(1.4, 20), new THREE.MeshBasicMaterial({ color: LOCKED, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.rotation.x = -Math.PI / 2; halo.position.y = 0.04; g.add(halo);
  w.add(g);
  w.ob(x, z, big ? 1.05 : 0.7);
  return { x, z, big, group: g, lid, lock, halo, glow };
}

export class Chests {
  constructor(game) { this.game = game; this.list = []; }

  setup(world) {
    this.list = (world.chests || []).map((def, i) => ({ i, def, opened: false, lidT: 0 }));
    this.potGiven = false; // (a party: the first chest's injector)
  }

  locked(c) { return c.def.guards.some((sp) => sp.enemy?.alive); }

  update(dt) {
    const t = this.game.time;
    for (const c of this.list) {
      const d = c.def, col = c.opened ? 0x3a2a10 : this.locked(c) ? LOCKED : OPEN;
      d.glow.color.setHex(col); d.halo.material.color.setHex(col);
      d.halo.material.opacity = c.opened ? 0 : 0.26 + Math.sin(t * 3 + c.i) * 0.08;
      if (c.opened && c.lidT < 1) { c.lidT = Math.min(1, c.lidT + dt * 3); d.lid.rotation.x = -1.9 * (1 - (1 - c.lidT) ** 3); }
    }
  }

  near(p) { return p.alive && p.state === 'move' ? this.list.find((c) => !c.opened && Math.hypot(p.pos.x - c.def.x, p.pos.z - c.def.z) < REACH + (c.def.big ? 0.5 : 0)) : null; }

  promptFor(p, key) {
    const c = this.near(p);
    if (!c) return null;
    if (this.locked(c)) return { c, line: `Chest sealed · kill its guards (${c.def.guards.filter((sp) => sp.enemy?.alive).length} left)` };
    return { c, line: `${key}: Open ${c.def.big ? 'the hoard' : 'chest'}${this.game.mp.active ? ' (for the whole party)' : ''}` };
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
    const msg = { t: 'chest', i: c.i, gold, em, pot: pot ? 1 : 0, big: big ? 1 : 0 };
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
    g.ui.toast(`${c.def.big ? 'RELIQUARY HOARD' : 'SUPPLY CACHE'} · ${lines.join(' · ')}`, 3);
    g.audio.play('heal', 0.7);
    g.fx.burst({ x: c.def.x, y: 0.8, z: c.def.z }, c.def.big ? 40 : 18, [1, 0.78, 0.3], 3, 0.7, 0.2);
  }
}
