// The party tab: your room and its chat, away from the lobby screen.
// In the Sanctum it sits top right under your gold, with the party, the chat and a Lobby button
// (back to the lobby screen). In a party raid only the chat shows, bottom left: new lines fade
// after a while and Enter (the 'chat' bind) or the touch Chat button opens the box to type.
import { pxButton } from './pixelmenus.js';

const $ = (id) => document.getElementById(id);
const FADE = 10000; // ms a raid line stays up
const CHAR_NAMES = { knight: 'Templar', rogue: 'Shrike', mage: 'Adept' };

export class PartyTab {
  constructor(game) {
    this.game = game;
    this.mode = null; // 'sanctum' | 'raid' | null (hidden)
    this.folded = false; this.unread = 0; this.typing = false; this.fadeAt = 0;
    const el = document.createElement('div');
    el.id = 'ptab'; el.className = 'hidden';
    el.innerHTML = `
      <div class="pt-head"><button class="pt-fold" id="pt-fold" aria-expanded="true">Party <b id="pt-code"></b> <span id="pt-unread"></span></button><button class="mini-btn" id="pt-lobby">Lobby</button></div>
      <div class="pt-body">
        <div id="pt-members"></div>
        <div id="pt-log" role="log" aria-live="polite"></div>
        <form id="pt-form" autocomplete="off"><input id="pt-input" maxlength="140" placeholder="Say something…" enterkeyhint="send" /><button class="mini-btn" type="submit">Send</button></form>
      </div>
      <button class="mini-btn" id="pt-talk">Chat</button>`;
    document.body.append(el);
    this.el = el;
    for (const b of el.querySelectorAll('.mini-btn')) pxButton(b, b.id === 'pt-lobby' ? 'blood' : 'rust', 2);
    $('pt-fold').addEventListener('click', () => { this.folded = !this.folded; this.layout(); });
    $('pt-lobby').addEventListener('click', () => { this.game.audio.play('uiTick', 1); this.game.openLobby(); });
    $('pt-talk').addEventListener('click', () => this.open());
    $('pt-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const inp = $('pt-input');
      if (!inp.value.trim()) { this.close(); return; }
      if (this.game.mp.chat(inp.value)) { inp.value = ''; if (this.mode === 'raid') this.close(); }
    });
    $('pt-input').addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); this.close(); } });
    $('pt-input').addEventListener('blur', () => { if (this.mode === 'raid') setTimeout(() => { if (document.activeElement !== $('pt-input')) this.close(); }); });
    // the chat key (Enter by default) opens the box; the game ignores keys typed into it (input.js)
    addEventListener('keydown', (e) => {
      if (!this.mode || e.repeat || this.game.input.capture || e.target.closest?.('input, textarea, select, button')) return;
      if (!(this.game.settings?.binds?.chat || []).includes(e.code)) return;
      e.preventDefault(); this.open();
    });
  }

  open() {
    if (!this.mode) return;
    this.folded = false; this.typing = true; this.unread = 0;
    this.game.input.reset(); this.game.input.keys.clear();
    this.layout();
    $('pt-input').focus();
    const log = $('pt-log'); log.scrollTop = log.scrollHeight;
  }

  close() {
    if (!this.typing) return;
    this.typing = false;
    if (document.activeElement === $('pt-input')) $('pt-input').blur();
    this.fadeAt = 0; this.layout();
  }

  // where the tab belongs right now (called every frame; cheap unless something changed)
  sync() {
    const g = this.game, m = g.mp, shown = (id) => !$(id).classList.contains('hidden');
    let mode = null;
    if (m.code && !m.active && g.hermitage?.active && !g.hermitage.guideOpen && g.mode === 'title' && !shown('lobby')) mode = 'sanctum'; // (the guide is big: out of its way)
    else if (m.active && shown('hud') && !shown('pause')) mode = 'raid';
    if (mode !== this.mode) {
      this.mode = mode;
      if (!mode) this.close();
      this.typing = this.typing && !!mode;
      document.body.classList.toggle('pt-on', mode === 'sanctum');
      this.render(); this.layout();
    }
    // the Sanctum's side panels (stash, jukebox, workbench) sit under the tab: fold it while one is open
    if (mode === 'sanctum') {
      const h = g.hermitage, side = !!(h.stashOpen || h.jukeOpen || h.workOpen);
      if (side !== this.squeezed) {
        this.squeezed = side; this.layout();
        document.body.style.setProperty('--pt-bottom', Math.ceil(this.el.getBoundingClientRect().bottom + 10) + 'px');
      }
    }
    if (mode === 'raid' && !this.typing && performance.now() > this.fadeAt) this.fade();
  }

  layout() {
    const el = this.el, open = this.mode === 'sanctum' ? !this.folded && !this.squeezed : this.typing;
    el.classList.toggle('hidden', !this.mode);
    el.classList.toggle('raid', this.mode === 'raid');
    el.classList.toggle('folded', !open);
    el.classList.toggle('typing', this.typing);
    el.classList.toggle('touch', this.game.input.isTouch);
    $('pt-fold').setAttribute('aria-expanded', open);
    if (open && this.mode === 'sanctum') this.unread = 0;
    $('pt-unread').textContent = this.unread ? `· ${this.unread} new` : '';
  }

  // hide raid lines older than FADE (the whole log shows while typing)
  fade() {
    const now = Date.now();
    let next = Infinity;
    for (const d of $('pt-log').children) {
      const left = +d.dataset.at + FADE - now;
      d.classList.toggle('old', left <= 0);
      if (left > 0) next = Math.min(next, left);
    }
    this.fadeAt = performance.now() + Math.min(next, 1000);
  }

  // a new line came in (mp.addChat)
  onLine(line) {
    if (line.me) return;
    if (this.mode === 'sanctum' && (this.folded || this.squeezed)) { this.unread++; this.layout(); }
  }

  render() {
    const m = this.game.mp, esc = (s) => String(s).replace(/[<&>"]/g, '');
    $('pt-code').textContent = m.code || '';
    $('pt-members').innerHTML = m.members.map((x) => `<div class="pt-m k-${esc(x.kind)}"><span>${esc(x.name)}</span><i>${CHAR_NAMES[x.kind] || ''}${x.id === m.host ? ' · Host' : ''}</i></div>`).join('');
    const log = $('pt-log'), atEnd = log.scrollHeight - log.scrollTop - log.clientHeight < 30;
    log.replaceChildren(...m.chatLog.map((l) => {
      const d = document.createElement('div');
      d.className = 'chat-line' + (l.sys ? ' sys' : '') + (l.me ? ' me' : '');
      d.dataset.at = l.at || 0;
      if (!l.sys) { const n = document.createElement('b'); n.textContent = l.name; d.append(n, ' '); }
      d.append(l.text);
      return d;
    }));
    if (atEnd || this.mode === 'raid') log.scrollTop = log.scrollHeight;
    this.fadeAt = 0;
  }
}
