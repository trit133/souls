// Skill tree screen: the selected character's web drawn in SVG. Hover (or tap) a node to see what it
// gives; buy it from the tooltip. Drag to pan, wheel / pinch / buttons to zoom.
import { TREES, RING, nodeCost, owned, canTake, describe, iconKey, neighbours } from './skilltree.js';
import { iconPath } from './icons.js';

const $ = (id) => document.getElementById(id);
const NAMES = { knight: 'Knight', rogue: 'Rogue', mage: 'Spellsword' };
const THEME = { knight: '#9ab4e8', rogue: '#e05a48', mage: '#b48aff' };
const MAGE_UNLOCK = 100;

export class TreeUI {
  constructor(game) {
    this.game = game;
    this.kind = 'knight';
    this.view = { x: 0, y: 0, z: 1 };
    this.sel = null; this.hover = null;
    this.resetting = false; this.marked = new Set();
    $('tree-reset').addEventListener('click', () => { this.resetting = !this.resetting; this.marked.clear(); this.sel = null; this.hideTip(); this.render(); });
    $('tree-reset-cancel').addEventListener('click', () => { this.resetting = false; this.marked.clear(); this.render(); });
    $('tree-reset-ok').addEventListener('click', () => this.confirmReset());
    document.querySelectorAll('[data-tree-kind]').forEach((b) => b.addEventListener('click', () => { this.kind = b.dataset.treeKind; this.sel = null; this.resetting = false; this.marked.clear(); this.fit(); this.render(); }));
    $('tree-back').addEventListener('click', () => this.close());
    $('tree-unlock').addEventListener('click', () => this.unlockMage());
    document.querySelectorAll('[data-tz]').forEach((b) => b.addEventListener('click', () => {
      const z = b.dataset.tz;
      if (z === 'fit') this.fit(); else this.zoom(z === 'in' ? 1.35 : 1 / 1.35);
      this.applyView();
    }));
    this.bindPan();
  }

  get data() { return this.game.accounts.data; }
  get tree() { return TREES[this.kind]; }
  get locked() { return this.kind === 'mage' && !this.data?.upgrades?.mage; }

  open(kind) {
    this.kind = kind || this.game.lobbyKind || this.game.kind || 'knight';
    this.sel = null;
    this.game.ui.show('tree');
    this.fit(); this.render();
  }

  close() {
    this.game.ui.show('tree', false);
    this.hideTip();
    this.game.refreshTitle?.(); this.game.renderLobby?.();
  }

  // ---------- view ----------
  radius() { let r = 0; for (const n of this.tree.nodes.values()) r = Math.max(r, Math.hypot(n.x, n.y)); return r + RING; }
  fit() { this.view = { x: 0, y: 0, z: 1 }; }
  zoom(f, cx = null, cy = null) {
    const v = this.view, z = Math.min(5, Math.max(0.6, v.z * f));
    if (cx !== null) { v.x = cx - (cx - v.x) * (v.z / z); v.y = cy - (cy - v.y) * (v.z / z); }
    v.z = z;
  }
  applyView() {
    const svg = $('tree-svg'), R = this.radius(), w = svg.clientWidth || 800, h = svg.clientHeight || 600;
    const base = (2 * R) / Math.min(w, h), s = base / this.view.z;
    svg.setAttribute('viewBox', `${this.view.x - (w * s) / 2} ${this.view.y - (h * s) / 2} ${w * s} ${h * s}`);
    this.unitPx = 1 / s;
  }
  toTree(px, py) {
    const svg = $('tree-svg'), r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
    return { x: vb.x + ((px - r.left) / r.width) * vb.width, y: vb.y + ((py - r.top) / r.height) * vb.height };
  }

  bindPan() {
    const svg = $('tree-svg'), pts = new Map();
    let drag = null, pinch = null, moved = 0;
    svg.addEventListener('pointerdown', (e) => {
      svg.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      moved = 0;
      if (pts.size === 1) drag = { x: e.clientX, y: e.clientY, vx: this.view.x, vy: this.view.y };
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: this.view.z }; drag = null; }
    });
    svg.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) {
        // mouse hover shows a node's tooltip
        const id = e.target.closest?.('[data-node]')?.dataset.node || null;
        if (id !== this.hover) { this.hover = id; if (!this.sel) this.showTip(id); }
        return;
      }
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pts.size === 2) {
        const [a, b] = [...pts.values()];
        this.view.z = Math.min(5, Math.max(0.6, pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d));
        this.applyView(); return;
      }
      if (drag) {
        moved += Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0);
        const vb = svg.viewBox.baseVal, r = svg.getBoundingClientRect(), k = vb.width / r.width;
        this.view.x = drag.vx - (e.clientX - drag.x) * k; this.view.y = drag.vy - (e.clientY - drag.y) * k;
        this.applyView();
      }
    });
    const up = (e) => {
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = null;
      if (pts.size === 0) {
        if (drag && moved < 6) {
          const id = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('[data-node]')?.dataset.node || null;
          this.click(id);
        }
        drag = null;
      }
    };
    svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
    svg.addEventListener('pointerleave', () => { this.hover = null; if (!this.sel) this.hideTip(); });
    svg.addEventListener('wheel', (e) => { e.preventDefault(); const p = this.toTree(e.clientX, e.clientY); this.zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, p.x, p.y); this.applyView(); }, { passive: false });
  }

  // one click: buy it if you can; in reset mode, mark or unmark it
  click(id) {
    if (!id) { this.sel = null; this.hideTip(); return; }
    if (this.resetting) { this.toggleMark(id); return; }
    const have = this.data ? owned(this.data, this.kind) : new Set(['start']);
    const n = this.tree.nodes.get(id);
    if (!have.has(id) && canTake(this.tree, have, id) && this.game.accounts.user && !this.locked && (this.data?.gold ?? 0) >= nodeCost(n)) this.buy(id);
    this.sel = id; this.showTip(id);
  }

  // ---------- reset ----------
  // nodes that go: the marked ones plus anything they cut off from the start
  removal() {
    const have = owned(this.data, this.kind), keep = new Set(), q = ['start'];
    keep.add('start');
    while (q.length) for (const nb of neighbours(this.tree, q.shift())) if (have.has(nb) && !this.marked.has(nb) && !keep.has(nb)) { keep.add(nb); q.push(nb); }
    return [...have].filter((id) => !keep.has(id));
  }
  toggleMark(id) {
    const have = owned(this.data, this.kind);
    if (id === 'start' || !have.has(id)) return;
    if (this.marked.has(id)) this.marked.delete(id); else this.marked.add(id);
    this.render();
  }
  confirmReset() {
    const d = this.data, gone = this.removal();
    if (!d || !gone.length) { this.resetting = false; this.render(); return; }
    const refund = gone.reduce((s, id) => s + nodeCost(this.tree.nodes.get(id)), 0);
    d.tree[this.kind] = (d.tree[this.kind] || []).filter((id) => !gone.includes(id));
    d.gold += refund;
    this.game.accounts.save();
    this.game.audio.play('fog');
    this.game.ui.toastSmall?.(`Refunded ◆ ${refund}`);
    this.resetting = false; this.marked.clear();
    this.render();
  }

  // ---------- drawing ----------
  render() {
    const T = this.tree, have = this.data ? owned(this.data, this.kind) : new Set(['start']);
    const gone = this.resetting ? new Set(this.removal()) : new Set();
    const refund = [...gone].reduce((s, id) => s + nodeCost(T.nodes.get(id)), 0);
    $('tree-wrap').classList.toggle('resetting', this.resetting);
    $('tree-resetbar').classList.toggle('hidden', !this.resetting);
    $('tree-reset').textContent = this.resetting ? 'Resetting…' : 'Reset';
    $('tree-reset').disabled = !this.game.accounts.user || have.size < 2;
    $('tree-reset-info').textContent = gone.size ? `${gone.size} node${gone.size > 1 ? 's' : ''} · refund ◆ ${refund}` : 'Click owned nodes to remove them';
    $('tree-reset-ok').disabled = !gone.size;
    const gold = this.data?.gold ?? 0, col = THEME[this.kind];
    document.querySelectorAll('[data-tree-kind]').forEach((b) => b.classList.toggle('on', b.dataset.treeKind === this.kind));
    $('tree-gold').textContent = this.game.accounts.user ? `◆ ${gold} gold` : 'Sign in to grow your trees';
    $('tree-count').textContent = `${NAMES[this.kind]} · ${have.size - 1} / ${T.nodes.size - 1} nodes`;
    $('tree-lock').classList.toggle('hidden', !this.locked);
    $('tree-unlock').textContent = `Unlock Spellsword · ◆ ${MAGE_UNLOCK}`;
    $('tree-unlock').disabled = !this.game.accounts.user || gold < MAGE_UNLOCK;
    const R = this.radius();
    let s = `<defs><radialGradient id="tg-bg"><stop offset="0" stop-color="${col}" stop-opacity=".14"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>`;
    s += `<circle cx="0" cy="0" r="${R}" fill="url(#tg-bg)"/>`;
    for (let d = 1; d * RING < R; d++) s += `<circle cx="0" cy="0" r="${d * RING}" fill="none" stroke="#fff" stroke-opacity=".035" stroke-width=".3"/>`;
    // links: owned both ends = gold, reachable = theme, else dim
    for (const [a, b] of T.edges) {
      const A = T.nodes.get(a), B = T.nodes.get(b), ha = have.has(a), hb = have.has(b);
      const cls = (gone.has(a) || gone.has(b)) && ha && hb ? 'gone' : ha && hb ? 'own' : ha || hb ? 'reach' : '';
      s += `<line class="te ${cls}" x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}"/>`;
    }
    for (const n of T.nodes.values()) {
      const got = have.has(n.id), can = !got && canTake(T, have, n.id) && !this.locked;
      const r = n.role === 'start' ? 4.6 : n.role === 'socket' || n.evo ? 5 : n.big ? 3.8 : /^(hp|st|dmg)$/.test(Object.keys(n.give)[0] || '') ? 2.6 : 3.1;
      const cls = `tn ${got ? 'own' : can ? 'can' : ''} ${gone.has(n.id) ? (this.marked.has(n.id) ? 'mark' : 'orphan') : ''} ${n.role} ${n.big ? 'big' : ''} ${this.sel === n.id ? 'sel' : ''}`;
      const shape = n.role === 'socket'
        ? `<polygon points="${[0, 1, 2, 3, 4, 5].map((i) => `${Math.cos(Math.PI / 6 + (i * Math.PI) / 3) * r},${Math.sin(Math.PI / 6 + (i * Math.PI) / 3) * r}`).join(' ')}"/>`
        : `<circle r="${r}"/>`;
      const ir = r * 1.25;
      s += `<g class="${cls}" data-node="${n.id}" transform="translate(${n.x} ${n.y})" style="--c:${col}">${shape}`
        + `<svg x="${-ir / 2}" y="${-ir / 2}" width="${ir}" height="${ir}" viewBox="0 0 24 24" class="ti">${iconPath(iconKey(n))}</svg></g>`;
    }
    $('tree-svg').innerHTML = s;
    this.applyView();
    if (this.sel) this.showTip(this.sel);
  }

  showTip(id) {
    const tip = $('tree-tip');
    const n = id && this.tree.nodes.get(id);
    if (!n) { this.hideTip(); return; }
    const have = this.data ? owned(this.data, this.kind) : new Set(['start']);
    const { name, lines } = describe(n), cost = nodeCost(n), got = have.has(id), can = canTake(this.tree, have, id);
    const gold = this.data?.gold ?? 0, signed = !!this.game.accounts.user;
    const status = got ? (this.resetting ? 'Click to mark for reset' : 'Owned')
      : this.locked ? 'Unlock the Spellsword first' : !signed ? 'Sign in to buy' : !can ? 'Connect to it from a node you own'
        : gold >= cost ? 'Click to unlock' : `Need ◆ ${cost - gold} more`;
    tip.innerHTML = `<div class="tt-name"></div>${lines.map(() => '<div class="tt-line"></div>').join('')}<div class="tt-ring">Ring ${n.ring}${cost ? ` · ◆ ${cost}` : ''}</div><div class="tt-status"></div>`;
    tip.querySelector('.tt-name').textContent = name;
    tip.querySelectorAll('.tt-line').forEach((el, i) => { el.textContent = lines[i]; });
    tip.querySelector('.tt-status').textContent = status;
    // place it beside the node
    const wrap = $('tree-wrap').getBoundingClientRect(), svg = $('tree-svg'), vb = svg.viewBox.baseVal, r = svg.getBoundingClientRect();
    const px = r.left + ((n.x - vb.x) / vb.width) * r.width - wrap.left, py = r.top + ((n.y - vb.y) / vb.height) * r.height - wrap.top;
    tip.classList.remove('hidden');
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    tip.style.left = Math.min(wrap.width - tw - 6, Math.max(6, px + 14)) + 'px';
    tip.style.top = Math.min(wrap.height - th - 6, Math.max(6, py - th / 2)) + 'px';
  }

  hideTip() { $('tree-tip').classList.add('hidden'); }

  buy(id) {
    const d = this.data, n = this.tree.nodes.get(id);
    if (!d || !n || this.locked) return;
    const have = owned(d, this.kind), cost = nodeCost(n);
    if (have.has(id) || !canTake(this.tree, have, id) || d.gold < cost) return;
    d.gold -= cost;
    d.tree = d.tree || {};
    (d.tree[this.kind] = d.tree[this.kind] || []).push(id);
    this.game.accounts.save();
    this.game.audio.play('heal');
    this.render();
  }

  unlockMage() {
    const d = this.data;
    if (!d || d.upgrades?.mage || d.gold < MAGE_UNLOCK) return;
    d.gold -= MAGE_UNLOCK; d.upgrades.mage = 1;
    this.game.accounts.save(); this.game.audio.play('heal');
    this.render();
  }
}
