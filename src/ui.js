// DOM HUD: bars with trailing "chip" damage, boss bar, prompts, toasts, enemy health bars.
const $ = (id) => document.getElementById(id);

class Bar {
  constructor(el) { this.fill = el.querySelector('.fill'); this.chip = el.querySelector('.chip'); this.v = 1; this.c = 1; this.hold = 0; }
  set(v, dt) {
    v = Math.max(0, Math.min(1, v));
    if (v < this.v) this.hold = 0.7;
    this.v = v;
    if (this.c < v) this.c = v;
    else if ((this.hold -= dt) <= 0) this.c = Math.max(v, this.c - dt * 0.5);
    this.fill.style.transform = `scaleX(${v})`;
    if (this.chip) this.chip.style.transform = `scaleX(${this.c})`;
  }
  snap(v) { this.v = this.c = v; this.set(v, 0); }
}

export class UI {
  constructor() {
    this.hp = new Bar(document.querySelector('.bar.hp'));
    this.st = new Bar(document.querySelector('.bar.st'));
    this.boss = new Bar(document.querySelector('.bar.bosshp'));
    this.toastEl = $('toast');
    this.promptEl = $('prompt');
    this.flaskEl = $('flask-count');
    this.bars = [];
    this.barLayer = document.createElement('div');
    this.barLayer.style.cssText = 'position:fixed;inset:0;pointer-events:none;';
    document.body.insertBefore(this.barLayer, $('hud'));
    this.toastT = null;
  }

  show(id, v = true) { $(id).classList.toggle('hidden', !v); }

  setMaxHp(hp, st) {
    document.querySelector('.bar.hp').style.width = Math.min(100, hp / 1.6) + '%';
    document.querySelector('.bar.st').style.width = Math.min(100, st / 1.3) + '%';
  }

  update(dt, p) {
    this.hp.set(p.hp / p.maxHp, dt);
    this.st.set(p.st / p.maxSt, dt);
    this.st.fill.parentElement.classList.toggle('tired', p.fatigue > 0.45);
    this.flaskEl.textContent = p.flasks;
  }

  // red flash on the stamina bar after a whiffed parry
  staminaPenalty() {
    const el = document.querySelector('.bar.st');
    el.classList.remove('penalty'); void el.offsetWidth; el.classList.add('penalty');
  }

  toast(text, dur = 2.5) {
    this.toastEl.textContent = text;
    this.toastEl.classList.toggle('show', !!text && dur > 0);
    clearTimeout(this.toastT);
    if (dur > 0) this.toastT = setTimeout(() => this.toastEl.classList.remove('show'), dur * 1000);
  }
  toastSmall(text) { this.prompt(text); this.smallT = performance.now() + 1200; }

  prompt(text) {
    if (!text) { this.promptEl.classList.add('hidden'); this.promptText = null; return; }
    if (this.promptText !== text) { this.promptEl.textContent = text; this.promptText = text; }
    this.promptEl.classList.remove('hidden');
  }

  // run progress + acquired power-up tags
  setProgress(i, n) { document.getElementById('progress').textContent = `AREA ${i}/${n}`; }
  setBoons(list) {
    document.getElementById('boon-tags').innerHTML = list.map((b) => `<span class="boon-tag" style="color:${b.color}">${b.tag}${b.n > 1 ? ' ×' + b.n : ''}</span>`).join('');
  }
  bossStatus(bars) {
    const el = document.getElementById('boss-status');
    el.innerHTML = bars.map((b) => `<div class="smeter"><div style="background:${b.color};transform:scaleX(${b.v})"></div></div>`).join('');
  }
  popup(x, y, text, color) {
    const d = document.createElement('div');
    d.className = 'popup'; d.textContent = text; d.style.color = color;
    d.style.left = x + 'px'; d.style.top = y + 'px';
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 1200);
  }

  // reward picker: cards = [{ key, name, desc, rest? }]; resolves with the chosen key
  showReward(cards, onPick) {
    const wrap = document.getElementById('reward-cards');
    wrap.innerHTML = '';
    let done = false;
    const pick = (k) => { if (done) return; done = true; removeEventListener('keydown', onKey); this.show('reward', false); onPick(k); };
    cards.forEach((c, i) => {
      const b = document.createElement('button');
      b.className = 'rcard' + (c.rest ? ' rest' : '');
      b.innerHTML = `<div class="rname" style="color:${c.color || ''}">${c.name}</div><div class="rdesc">${c.desc}</div><div class="rkey">[${i + 1}]</div>`;
      b.addEventListener('click', () => pick(c.key));
      wrap.appendChild(b);
    });
    const onKey = (e) => { const n = parseInt(e.key, 10); if (n >= 1 && n <= cards.length) pick(cards[n - 1].key); };
    addEventListener('keydown', onKey);
    this.show('reward');
  }

  // floating health bars above damaged enemies
  enemyBars(list) {
    while (this.bars.length < list.length) {
      const d = document.createElement('div');
      d.style.cssText = 'position:absolute;width:64px;height:5px;margin-left:-32px;background:rgba(0,0,0,.6);border:1px solid #4a4030;';
      const f = document.createElement('div');
      f.style.cssText = 'height:100%;background:#a8302a;transform-origin:left;';
      const st = document.createElement('div');
      st.style.cssText = 'position:absolute;left:0;right:0;top:6px;';
      d.appendChild(f); d.appendChild(st); this.barLayer.appendChild(d);
      this.bars.push({ d, f, s: st });
    }
    this.bars.forEach((b, i) => {
      const e = list[i];
      if (!e) { b.d.style.display = 'none'; return; }
      b.d.style.display = 'block';
      b.d.style.transform = `translate(${e.x}px, ${e.y}px)`;
      b.f.style.transform = `scaleX(${e.v})`;
      const sm = (e.status || []).map((s) => `<div style="height:3px;margin-top:2px;background:rgba(0,0,0,.6)"><div style="height:100%;background:${s.color};width:${(s.v * 100).toFixed(0)}%"></div></div>`).join('');
      if (b.sm !== sm) { b.sm = sm; b.s.innerHTML = sm; }
    });
  }
}
