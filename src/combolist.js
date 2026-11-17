// The combo list: a Combos button always on screen under the bars (in raids, dungeons and the training arena). It
// drops down the combos of the weapon in hand, each as its inputs in order (the keys you have them bound to, or the
// touch buttons) and what it does, and stays open until it's toggled off (remembered on this device). While a combo
// is going, its row lights up: the moves done, and the one to press next once its window opens.
import { keyLabel } from './settings.js';
import { pxButton } from './pixelmenus.js';

const KEY = 'souls.comboList';
const WORD = { attack: 'Light', heavy: 'Heavy', roll: 'Roll' };
const TOUCH = { attack: 'R1', heavy: 'R2', roll: 'ROLL' };

export class ComboList {
  constructor(game) {
    this.game = game;
    const bars = document.getElementById('bars');
    this.wrap = document.createElement('div'); this.wrap.id = 'combo-hud';
    this.btn = document.createElement('button'); this.btn.id = 'combo-btn'; this.btn.type = 'button'; this.btn.className = 'mini-btn'; this.btn.textContent = 'Combos';
    this.panel = document.createElement('div'); this.panel.id = 'combo-list';
    this.wrap.append(this.btn, this.panel);
    pxButton(this.btn, 'rust', 2);
    bars.append(this.wrap);
    // (its own clicks: never an attack, never the camera)
    for (const ev of ['pointerdown', 'mousedown', 'touchstart']) this.wrap.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
    this.btn.addEventListener('click', (e) => { e.stopPropagation(); this.set(!this.open); this.btn.blur(); });
    let saved = null; try { saved = localStorage.getItem(KEY); } catch {}
    this.open = saved === '1';
    this.list = null; this.lit = '';
    this.set(this.open);
  }

  set(on) {
    this.open = on;
    try { localStorage.setItem(KEY, on ? '1' : '0'); } catch {}
    this.btn.classList.toggle('on', on); // (lit while the list is open)
    this.panel.classList.toggle('hidden', !on);
    if (on) this.render();
  }

  // the label for an input: the key it's bound to (or the touch button) and what it is
  label(input, move) {
    const g = this.game, word = move === 'bolt' ? 'Bolt' : WORD[input] || input;
    const key = g.input?.isTouch ? (input === 'heavy' && g.kind === 'mage' ? 'BOLT' : TOUCH[input]) : keyLabel(g.settings?.binds?.[input]?.find(Boolean));
    return { key: key && key !== '—' ? key : '', word };
  }

  render() {
    const p = this.game.player, list = p?.c?.comboList || [];
    this.list = list; this.lit = '';
    this.panel.innerHTML = list.length ? '' : '<div class="cl-empty">No combos for this weapon</div>';
    for (const c of list) {
      const row = document.createElement('div'); row.className = 'cl-row'; row.dataset.name = c.name;
      const steps = c.steps.map(([input, move], i) => {
        const { key, word } = this.label(input, move);
        return `${i ? '<i class="cl-arrow">›</i>' : ''}<span class="cl-step cl-${input}" data-i="${i}">${key ? `<b>${key}</b>` : ''}${word}</span>`;
      }).join('');
      row.innerHTML = `<div class="cl-name">${c.name}</div><div class="cl-steps">${steps}</div><div class="cl-desc">${c.desc}</div>`;
      this.panel.append(row);
    }
  }

  // each frame: a new weapon or class redraws the list; a combo in progress lights its row
  update() {
    if (!this.open) return;
    const p = this.game.player;
    if ((p?.c?.comboList || []) !== this.list) this.render();
    const C = p?.cmb, lit = C ? `${C.node.names.join('|')}:${C.node.depth}:${C.openAt != null}` : '';
    if (lit === this.lit) return;
    this.lit = lit;
    for (const row of this.panel.children) {
      const on = !!C && C.node.names.includes(row.dataset.name);
      row.classList.toggle('lit', on);
      for (const s of row.querySelectorAll('.cl-step')) {
        const i = +s.dataset.i;
        s.classList.toggle('done', on && i < C.node.depth);
        s.classList.toggle('next', on && C.openAt != null && i === C.node.depth);
      }
    }
  }
}
