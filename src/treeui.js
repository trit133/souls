// Skill tree screen: the selected character's web drawn in SVG. Hover (or tap) a node to see what it
// gives; buy it from the tooltip. Drag to pan, wheel / pinch / buttons to zoom.
import { NUM } from './scale.js';
import { REGIONS, TREES, RING, nodeCost, refundOf, owned, picksOf, isTravel, pickLabel, TRAVEL, RES_PICKS, canTake, describe, iconKey, neighbours, sumStats, STATS, CAPS } from './skilltree.js';
import { CHARS } from './player.js';
import { playerParts, TYPES, TYPE_NAME, TYPE_COLOR, RES_CAP, ARMOR_CAP } from './damage.js';
import { iconPath } from './icons.js';
import { TreeBackground } from './treebg.js';
import { COMBOS } from './combos.js';
import { keyLabel } from './settings.js';

// what a node can be found by: its name, what it gives (and those stats' names) and kind (its region by full name)
const searchText = (n) => (n._search ??= (() => {
  const d = describe(n), kinds = [n.keystone ? 'keystone' : n.notable ? 'notable' : '', n.evo || n.soon ? 'evolution' : '', n.role === 'socket' ? 'socket rune' : ''];
  return [d.name, ...d.lines, ...Object.keys(n.give || {}).map((k) => STATS[k]?.name || ''), ...kinds].join(' ').toLowerCase();
})());

const $ = (id) => document.getElementById(id);
const NAMES = { knight: 'Templar', rogue: 'Shrike', mage: 'Adept' }; // (display names: The Last Crusade)
const THEME = { knight: '#9ab4e8', rogue: '#e05a48', mage: '#b48aff' };
export const MAGE_UNLOCK = 100 * NUM;
// light-hit damage each character's weapon starts from (Knight first swing, Rogue first stab, Spellsword knife)
const LIGHT = { knight: 22 * NUM, rogue: 16 * NUM, mage: 11 * NUM };
// stats the panel shows in its own sections; everything else is listed under the character
const SHOWN = new Set(['hp', 'hpPct', 'st', 'stPct', 'flask', 'potion', 'move', 'aspd', 'armor', 'evolved', 'critChance', 'critPower',
  ...TYPES.flatMap((k) => [k + 'Dmg', k + 'Pct']), ...['fire', 'bleed', 'poison', 'frost'].map((k) => k + 'Res')]);

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
    $('tree-stats-btn').addEventListener('click', () => $('tree-stats').classList.toggle('open'));
    // phone: the tapped node's card has an Upgrade button
    $('tree-tip').addEventListener('click', (e) => {
      const pk = e.target.closest('[data-pick]');
      if (pk && this.picking) { this.pick(this.picking, pk.dataset.pick); return; }
      if (e.target.closest('.tt-buy') && this.sel) this.buy(this.sel);
    });
    // search: every node whose name or description has all the words typed lights up
    const sIn = $('tree-search-input');
    sIn.addEventListener('input', () => this.applySearch());
    sIn.addEventListener('keydown', (e) => { if (e.key === 'Escape') { sIn.value = ''; this.applySearch(); sIn.blur(); } e.stopPropagation(); });
    document.querySelectorAll('[data-tz]').forEach((b) => b.addEventListener('click', () => {
      const z = b.dataset.tz;
      if (z === 'fit') this.fit(); else this.zoom(z === 'in' ? 1.35 : 1 / 1.35);
      this.applyView();
    }));
    this.bindPan();
    this.bg = new TreeBackground($('tree-wrap'));
    addEventListener('resize', () => { if (!$('tree').classList.contains('hidden')) this.bg.start(this.kind); });
  }

  get data() { return this.game.accounts.data; }
  get tree() { return TREES[this.kind]; }
  get locked() { return this.kind === 'mage' && !this.data?.upgrades?.mage; }
  get picks() { return picksOf(this.data, this.kind); }

  open(kind) {
    this.kind = kind || this.game.lobbyKind || this.game.kind || 'knight';
    this.sel = null;
    this.game.ui.show('tree');
    this.fit(); this.view.z = 1.7; // open on the inner rings, where early nodes are; Fit shows the whole web
    this.render();
  }

  close() {
    this.game.ui.show('tree', false);
    this.hideTip();
    this.game.refreshTitle?.(); this.game.renderLobby?.();
  }

  // ---------- view ----------
  radius() { let r = 0; for (const n of this.tree.nodes.values()) r = Math.max(r, Math.hypot(n.x, n.y)); return r + RING; }
  fit() { this.view = { x: 0, y: 0, z: 1 }; }
  // phones zoom in much further: a few nodes can fill the small screen
  get maxZoom() { return this.game.input.isPhone ? 15 : 5; }
  zoom(f, cx = null, cy = null) {
    const v = this.view, z = Math.min(this.maxZoom, Math.max(0.6, v.z * f));
    if (cx !== null) { v.x = cx - (cx - v.x) * (v.z / z); v.y = cy - (cy - v.y) * (v.z / z); }
    v.z = z;
  }
  applyView() {
    const svg = $('tree-svg'), R = this.radius(), w = svg.clientWidth || 800, h = svg.clientHeight || 600;
    const base = (2 * R) / Math.min(w, h), s = base / this.view.z;
    svg.setAttribute('viewBox', `${this.view.x - (w * s) / 2} ${this.view.y - (h * s) / 2} ${w * s} ${h * s}`);
    this.unitPx = 1 / s;
    this.bg?.setView(-this.view.x / s, -this.view.y / s, this.view.z);
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
        if (this.picking) return; // (a travel node's pick stays open until a choice or a click elsewhere)
        if (id !== this.hover) { this.hover = id; this.sel = null; if (id) this.showTip(id); else this.hideTip(); this.renderStats(); }
        return;
      }
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pts.size === 2) {
        const [a, b] = [...pts.values()];
        this.view.z = Math.min(this.maxZoom, Math.max(0.6, pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d));
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
          this.click(id, e.pointerType !== 'mouse');
        }
        drag = null;
      }
    };
    svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
    svg.addEventListener('pointerleave', () => { this.hover = null; if (!this.sel && !this.picking) this.hideTip(); this.renderStats(); });
    svg.addEventListener('wheel', (e) => { e.preventDefault(); const p = this.toTree(e.clientX, e.clientY); this.zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, p.x, p.y); this.applyView(); }, { passive: false });
  }

  // one click: buy it if you can; in reset mode, mark or unmark it
  // mouse: the tooltip just follows the hover; touch (no hover): a tap shows it until the next tap
  // phone: a tap only opens the node's card; buying is its Upgrade button
  click(id, touch = false) {
    this.picking = null;
    if (!id) { this.sel = null; this.hideTip(); if (this.game.input.isPhone) this.render(); return; }
    if (this.resetting) { this.toggleMark(id); return; }
    const have = this.data ? owned(this.data, this.kind) : new Set(['start']);
    const n = this.tree.nodes.get(id);
    // an owned travel node: open its pick to change the stat
    if (have.has(id) && isTravel(n) && this.game.accounts.user) { this.sel = id; this.picking = id; this.render(); return; }
    if (this.game.input.isPhone) { this.sel = id; this.render(); return; }
    if (!have.has(id) && canTake(this.tree, have, id) && this.game.accounts.user && !this.locked && (this.data?.gold ?? 0) >= nodeCost(n, have, this.tree)) { this.buy(id); if (this.picking) return; }
    this.sel = touch ? id : null;
    this.showTip(id);
  }
  // set what a travel node gives
  pick(id, p) {
    const d = this.data; if (!d) return;
    ((d.treePick ??= {})[this.kind] ??= {})[id] = p;
    this.game.accounts.save();
    this.picking = null; this.sel = this.game.input.isPhone ? id : null;
    this.render();
  }

  // ---------- reset ----------
  // nodes that go: the marked ones plus anything they cut off from the start
  removal() {
    const have = owned(this.data, this.kind), keep = new Set(), q = ['start'];
    keep.add('start');
    // (paths run through evolutions still to come, like buying does: canTake)
    while (q.length) for (const nb of neighbours(this.tree, q.shift())) if ((have.has(nb) || this.tree.nodes.get(nb)?.soon) && !this.marked.has(nb) && !keep.has(nb)) { keep.add(nb); q.push(nb); }
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
    const refund = refundOf(this.tree, owned(d, this.kind), gone);
    d.tree[this.kind] = (d.tree[this.kind] || []).filter((id) => !gone.includes(id));
    for (const id of gone) delete d.treePick?.[this.kind]?.[id];
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
    const refund = refundOf(T, have, gone), picks = this.picks;
    $('tree-wrap').classList.toggle('resetting', this.resetting);
    $('tree-resetbar').classList.toggle('hidden', !this.resetting);
    $('tree-reset').textContent = this.resetting ? 'Resetting…' : 'Reset';
    $('tree-reset').disabled = !this.game.accounts.user || have.size < 2;
    $('tree-reset-info').textContent = gone.size ? `${gone.size} node${gone.size > 1 ? 's' : ''} · refund ◆ ${refund}` : 'Click owned nodes to remove them';
    $('tree-reset-ok').disabled = !gone.size;
    const gold = this.data?.gold ?? 0, col = THEME[this.kind];
    document.querySelectorAll('[data-tree-kind]').forEach((b) => b.classList.toggle('on', b.dataset.treeKind === this.kind));
    $('tree-gold').textContent = this.game.accounts.user ? `◆ ${gold} gold` : 'Sign in to grow your trees';
    $('tree-count').textContent = `${NAMES[this.kind]} · ${have.size - 1} nodes`;
    $('tree-lock').classList.toggle('hidden', !this.locked);
    $('tree-unlock').textContent = `Unlock the Adept · ◆ ${MAGE_UNLOCK}`;
    $('tree-unlock').disabled = !this.game.accounts.user || gold < MAGE_UNLOCK;
    const R = this.radius();
    let s = `<defs><radialGradient id="tg-bg"><stop offset="0" stop-color="${col}" stop-opacity=".14"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>`;
    s += `<circle cx="0" cy="0" r="${R}" fill="url(#tg-bg)"/>`;
    for (let d = 1; d * RING < R; d++) s += `<circle cx="0" cy="0" r="${d * RING}" fill="none" stroke="#fff" stroke-opacity=".035" stroke-width=".3"/>`;
    // regions (the Knight's tree): each name the same distance out, turned 45° round the centre from its arm (so
    // the four sit on the corners of a square), level, under the nodes
    (REGIONS[this.kind] || []).forEach((name, g) => {
      const a = -Math.PI / 2 + g * Math.PI / 2 + Math.PI / 4, d = RING * 8;
      // the top two nudged up, the bottom two down: as little as clears the nodes (7 on the Knight's tree)
      const w = name.length * 8.2, x0 = Math.cos(a) * d, y0 = Math.sin(a) * d, dir = Math.sign(y0);
      const under = (y) => [...T.nodes.values()].filter((p) => Math.abs(p.x - x0) < w / 2 + 4 && Math.abs(p.y - y) < 8).length;
      let dy = 7; for (let k = 7, best = Infinity; k <= 20; k++) { const c = under(y0 + dir * k); if (c < best) { best = c; dy = k; } if (!c) break; }
      const y = y0 + dir * dy;
      s += `<text class="treg" x="${Math.cos(a) * d}" y="${y}" text-anchor="middle" dominant-baseline="middle">${name.toUpperCase()}</text>`;
    });
    // links: owned both ends = gold, reachable = theme, else dim
    for (const [a, b] of T.edges) {
      const A = T.nodes.get(a), B = T.nodes.get(b), ha = have.has(a), hb = have.has(b);
      const cls = ((gone.has(a) || gone.has(b)) && ha && hb ? 'gone' : ha && hb ? 'own' : ha || hb ? 'reach' : '') + (A.socketRing && B.socketRing ? ' sr' : '');
      s += `<line class="te ${cls}" x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}"/>`;
    }
    for (const n of T.nodes.values()) {
      const got = have.has(n.id), can = !got && canTake(T, have, n.id) && !this.locked;
      const r = n.role === 'start' ? 4.6 : n.keystone ? 6 : n.role === 'socket' || n.evo || n.soon ? 5 : n.notable ? 4.6 : isTravel(n) ? 2.5 : 3.1;
      const cls = `tn ${got ? 'own' : can ? 'can' : ''} ${n.res ? 'res' : ''} ${gone.has(n.id) ? (this.marked.has(n.id) ? 'mark' : 'orphan') : ''} ${n.role} ${n.big ? 'big' : ''} ${n.keystone ? 'keystone' : n.notable ? 'notable' : ''} ${n.soon ? 'evo soon' : ''} ${this.sel === n.id ? 'sel' : ''}`;
      const shape = n.role === 'socket'
        ? `<polygon points="${[0, 1, 2, 3, 4, 5].map((i) => `${Math.cos(Math.PI / 6 + (i * Math.PI) / 3) * r},${Math.sin(Math.PI / 6 + (i * Math.PI) / 3) * r}`).join(' ')}"/>`
        : `<circle r="${r}"/>`;
      const ir = r * 1.25, ik = iconKey(n, got ? picks[n.id] : null);
      s += `<g class="${cls}" data-node="${n.id}" transform="translate(${n.x} ${n.y})" style="--c:${col}">${shape}`
        + (ik ? `<svg x="${-ir / 2}" y="${-ir / 2}" width="${ir}" height="${ir}" viewBox="0 0 24 24" class="ti">${iconPath(ik)}</svg>` : '') + '</g>';
    }
    $('tree-svg').innerHTML = s;
    this.applySearch();
    this.applyView();
    this.renderStats();
    this.bg.start(this.kind);
    if (this.sel || this.hover) this.showTip(this.sel || this.hover); else this.hideTip();
  }

  // ---------- stats panel ----------
  // this character's totals from the nodes owned; hovering an unowned node previews what it would change
  // the search box (top right): highlight matching nodes and count them
  applySearch() {
    const q = ($('tree-search-input')?.value || '').toLowerCase().trim(), words = q.split(/\s+/).filter(Boolean);
    let n = 0;
    for (const g of $('tree-svg').querySelectorAll('.tn')) {
      const node = this.tree.nodes.get(g.dataset.node);
      const hit = words.length > 0 && node && words.every((w) => searchText(node).includes(w) || w === node.region?.toLowerCase()); // (a region by its full name)
      g.classList.toggle('found', hit); if (hit) n++;
    }
    $('tree-svg').classList.toggle('searching', words.length > 0);
    $('tree-search-count').textContent = words.length ? `${n} found` : '';
  }

  renderStats() {
    const el = $('tree-stats');
    if (!el) return;
    const kind = this.kind, c = CHARS[kind], have = this.data ? owned(this.data, kind) : new Set(['start']);
    const peek = this.sel || this.hover, n = peek && this.tree.nodes.get(peek);
    const picks = picksOf(this.data, kind), cur = sumStats(kind, have, picks), next = n && !have.has(peek) ? sumStats(kind, new Set([...have, peek]), picks) : null;
    const fmt = (v) => (Math.round(v * 100) / 100).toString();
    // one row: label, the value now, and the value after the hovered node if it changes
    const row = (label, f, cls = '', style = '') => {
      const a = f(cur), b = next ? f(next) : a;
      return `<div class="ts-row ${cls}"${style ? ` style="${style}"` : ''}><span>${label}</span><b>${a}${b !== a ? `<em> → ${b}</em>` : ''}</b></div>`;
    };
    const head = (t) => `<div class="ts-head">${t}</div>`;
    const hp = (S) => Math.round((c.hp + (S.hp || 0)) * (1 + (S.hpPct || 0) / 100));
    const st = (S) => Math.round((c.st + (S.st || 0)) * (1 + (S.stPct || 0) / 100));
    let h = head(`${NAMES[kind]} · from the tree`);
    h += row('Health', (S) => `${hp(S)}`) + row('Stamina', (S) => `${st(S)}`);
    h += row('Injectors', (S) => `${c.flasks + (S.flask || 0)}`) + row('Injector healing', (S) => `+${fmt(S.potion || 0)}%`);
    h += row('Move speed', (S) => `+${fmt(S.move || 0)}%`) + row('Attack speed', (S) => `+${fmt(S.aspd || 0)}%`);
    h += head(`Damage · light hit ${LIGHT[kind]} base`);
    for (const k of TYPES) {
      const has = (S) => (S[k + 'Dmg'] || 0) || (S[k + 'Pct'] || 0) || k === 'phys';
      if (!has(cur) && !(next && has(next))) continue;
      h += row(TYPE_NAME[k], (S) => `+${fmt(S[k + 'Dmg'] || 0)} · +${fmt(S[k + 'Pct'] || 0)}%`, 'ts-type', `color:${TYPE_COLOR[k]}`);
    }
    h += row('Light hit', (S) => {
      const p = playerParts(S, {}, LIGHT[kind]);
      return TYPES.filter((k) => p[k] >= 0.05).map((k) => `<i style="color:${TYPE_COLOR[k]}">${fmt(Math.round(p[k] * 10) / 10)}</i>`).join(' + ');
    }, 'ts-hit');
    h += row('Crit chance', (S) => `${fmt(Math.min(CAPS.critChance, S.critChance || 0))} / ${CAPS.critChance}%`);
    h += row('Crit damage', (S) => `+${fmt(50 + Math.min(CAPS.critPower, S.critPower || 0))}%`);
    h += head('Resistances');
    if (kind === 'knight') h += row('Armour (physical)', (S) => `${fmt(Math.min(ARMOR_CAP, S.armor || 0))} / ${ARMOR_CAP}%`);
    for (const k of ['fire', 'bleed', 'poison', 'frost']) h += row(TYPE_NAME[k], (S) => { const r = Math.min(RES_CAP, S[k + 'Res'] || 0); return `${fmt(r)} / ${RES_CAP}% · take ${fmt(100 - r)}%`; }, 'ts-type', `color:${TYPE_COLOR[k]}`);
    h += head(`${NAMES[kind]} bonuses`);
    const keys = [...new Set([...Object.keys(cur), ...Object.keys(next || {})])].filter((k) => !SHOWN.has(k) && STATS[k]);
    for (const k of keys) h += row(STATS[k].name, (S) => (S[k] ? STATS[k].fmt(+fmt(S[k])) + (CAPS[k] && S[k] >= CAPS[k] ? ' (max)' : '') : '—'));
    if (!keys.length) h += '<div class="ts-none">None yet</div>';
    // the combos: inputs as pixel badges (with this player's keys), and the four still to come
    const binds = this.game.settings?.binds || {}, key = (a) => (binds[a]?.[0] ? keyLabel(binds[a][0]) : '');
    const BADGE = { attack: ['R1', 'attack'], heavy: ['R2', 'heavy'], roll: ['ROLL', 'roll'] };
    h += head('Combos · hit the next input as the weapon flashes');
    for (const c of COMBOS[kind] || []) {
      const ins = c.steps.map(([a]) => `<i class="cb cb-${a}" title="${key(BADGE[a][1])}">${BADGE[a][0]}</i>`).join('<b class="cb-arrow">›</b>');
      h += `<div class="ts-combo"><div class="ts-cname">${c.name}</div><div class="ts-cins">${ins}</div><div class="ts-cdesc">${c.desc}</div></div>`;
    }
    for (let i = 0; i < 4; i++) h += '<div class="ts-combo locked"><div class="ts-cname">???</div><div class="ts-cdesc">Unlocked in the skill tree; needs the Evolution.</div></div>';
    h += `<div class="ts-keys">Keys: R1 ${key('attack')} · R2 ${key('heavy')} · Roll ${key('roll')}</div>`;
    el.innerHTML = h;
  }

  showTip(id) {
    const tip = $('tree-tip');
    const n = id && this.tree.nodes.get(id);
    if (!n) { this.hideTip(); return; }
    const have = this.data ? owned(this.data, this.kind) : new Set(['start']);
    const got = have.has(id), { name, lines } = describe(n, got ? this.picks[id] : null), cost = got ? 0 : nodeCost(n, have, this.tree), can = canTake(this.tree, have, id);
    const gold = this.data?.gold ?? 0, signed = !!this.game.accounts.user;
    const phone = this.game.input.isPhone;
    const buyable = !got && !this.locked && signed && can && gold >= cost;
    const status = got ? (this.resetting ? (phone ? 'Tap to mark for reset' : 'Click to mark for reset') : 'Owned')
      : this.locked ? 'Unlock the Adept first' : !signed ? 'Sign in to buy' : !can ? 'Connect to it from a node you own'
        : gold >= cost ? (phone ? 'Ready to unlock' : 'Click to unlock') : `Need ◆ ${cost - gold} more`;
    const picking = this.picking === id && got, opts = n.res ? RES_PICKS : Object.keys(TRAVEL), cur = this.picks[id];
    tip.innerHTML = `<div class="tt-name"></div>${lines.map(() => '<div class="tt-line"></div>').join('')}<div class="tt-ring">Ring ${n.ring}${cost ? ` · ◆ ${cost}` : ''}</div><div class="tt-status"></div>`
      + (picking ? `<div class="tt-picks">${opts.map((p) => `<button class="menu-btn tt-pick${p === cur ? ' on' : ''}" data-pick="${p}">${pickLabel(n, p)}</button>`).join('')}</div>` : '')
      + (phone && !got && !this.resetting ? `<button class="menu-btn tt-buy"${buyable ? '' : ' disabled'}>Upgrade${cost ? ` · ◆ ${cost}` : ''}</button>` : '');
    tip.classList.toggle('picking', picking);
    tip.querySelector('.tt-name').textContent = name;
    tip.querySelectorAll('.tt-line').forEach((el, i) => { el.textContent = lines[i]; });
    tip.querySelector('.tt-status').textContent = picking ? (n.res ? 'Pick an element' : 'Pick a stat') : got && isTravel(n) && !this.resetting ? (phone ? 'Tap to change' : 'Click to change') : status;
    // phone: the card sits at the bottom of the screen (style.css), out from under the finger
    if (phone) { tip.style.left = tip.style.top = ''; tip.classList.remove('hidden'); return; }
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
    const have = owned(d, this.kind), cost = nodeCost(n, have, this.tree);
    if (have.has(id) || !canTake(this.tree, have, id) || d.gold < cost) return;
    d.gold -= cost;
    d.tree = d.tree || {};
    (d.tree[this.kind] = d.tree[this.kind] || []).push(id);
    // a travel node starts as Strength (or Fire); its pick opens straight away
    if (isTravel(n)) { ((d.treePick ??= {})[this.kind] ??= {})[id] = n.res ? 'fire' : 'str'; this.picking = id; this.sel = id; }
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
