// Basement markers: once anyone in the party has gone down a raid's stair, an icon floats over that building on the
// surface (and sits on the map) saying what's below: a shrine in its colour (greyed and crossed once broken), the
// hoard's chest (open once all three chests are looted), or the boss's skull. A party shares them ('bfound').
import * as THREE from 'three';

const MARK_Y = 3.2;
const ICONS = {
  shrine: ['....#....', '...###...', '..##@##..', '.##@@@##.', '##@@@@@##', '.##@@@##.', '..##@##..', '...###...', '....#....'],
  skull: ['..#####..', '.#######.', '##@@#@@##', '##@@#@@##', '#########', '.###.###.', '..#####..', '..#.#.#..', '.........'],
  chest: ['.........', '.#######.', '#@@@@@@@#', '#########', '#@@@#@@@#', '#@@@@@@@#', '#@@@@@@@#', '#########', '.........'],
  chestOpen: ['#######..', '#@@@@@#..', '.#######.', '#.......#', '#########', '#@@@@@@@#', '#@@@@@@@#', '#########', '.........'],
};

export class Basements {
  constructor(game) { this.game = game; this.list = []; this.tex = new Map(); }

  // a 9 x 9 pixel icon with a dark outline, in the colours given ('#' edge, '@' fill)
  icon(name, edge, fill, cross = false) {
    const key = name + edge + fill + cross;
    if (this.tex.has(key)) return this.tex.get(key);
    const rows = ICONS[name], c = document.createElement('canvas'); c.width = c.height = 11;
    const x = c.getContext('2d');
    rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === '.') return; x.fillStyle = '#000'; x.fillRect(i, j + 1, 2, 2); }));
    rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === '.') return; x.fillStyle = ch === '#' ? edge : fill; x.fillRect(i + 1, j + 1, 1, 1); }));
    if (cross) { x.fillStyle = '#d8d0c0'; for (let k = 1; k < 10; k++) { x.fillRect(k, k, 1, 1); x.fillRect(10 - k, k, 1, 1); } }
    const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
    const out = { t, c };
    this.tex.set(key, out);
    return out;
  }

  setup(world) {
    const g = this.game;
    for (const e of this.list) { g.scene.remove(e.sprite); e.sprite.material.dispose(); }
    this.list = [];
    const D = world.dungeon;
    for (const u of D?.unders || []) {
      const b = u.b, shrine = g.seals.list.find((s) => s.def.mod === u.mod.i);
      const chests = g.chests.list.filter((c) => D.underAt?.(c.def.x, c.def.z) === u);
      const what = u.kind === 'boss' ? 'boss' : shrine ? 'shrine' : chests.length ? 'cache' : null;
      if (!what) continue;
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, depthTest: false }));
      // on the building's south face (the side the camera looks from) at head height, drawn over the walls: the
      // close camera never sees as high as a roof
      sprite.position.set(b.cx, MARK_Y, b.z1 + 0.4); sprite.scale.set(1.9, 1.9, 1); sprite.visible = false; sprite.renderOrder = 5;
      g.scene.add(sprite);
      this.list.push({ k: u.k, u, b, what, shrine, chests, sprite, found: false, look: null });
    }
  }

  // what an entry shows now
  look(e) {
    if (e.what === 'boss') return this.icon('skull', '#7a1410', '#e8dccb');
    if (e.what === 'cache') return e.chests.every((c) => c.opened) ? this.icon('chestOpen', '#3a3026', '#6a5a44') : this.icon('chest', '#5a3a12', '#e8b040');
    const col = '#' + e.shrine.def.color.toString(16).padStart(6, '0');
    return e.shrine.def.broken || e.shrine.state === 'broken' ? this.icon('shrine', '#333', '#666', true) : this.icon('shrine', '#222', col);
  }

  // someone went down basement k's stair
  found(k, net = false) {
    const e = this.list.find((x) => x.k === k);
    if (!e || e.found) return;
    e.found = true; e.sprite.visible = true;
    if (!net && this.game.mp.active) this.game.mp.sendAll({ t: 'bfound', k });
  }

  update() {
    const t = this.game.time;
    for (const e of this.list) {
      if (!e.found) continue;
      const L = this.look(e);
      if (L !== e.look) { e.look = L; e.sprite.material.map = L.t; e.sprite.material.needsUpdate = true; }
      e.sprite.position.y = MARK_Y + Math.sin(t * 2 + e.k) * 0.15;
    }
  }

  // on the map: the icon on the building
  drawMap(ctx, P, sc, here) {
    for (const e of this.list) {
      if (!e.found || !e.look || !here(e.b.cx, e.b.cz)) continue;
      const [a, b] = P(e.b.cx, e.b.cz), s = 7 / sc;
      ctx.drawImage(e.look.c, a - s, b - s, s * 2, s * 2);
    }
  }
}
