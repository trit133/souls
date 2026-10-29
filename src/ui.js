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

  // floating health bars above damaged enemies
  enemyBars(list) {
    while (this.bars.length < list.length) {
      const d = document.createElement('div');
      d.style.cssText = 'position:absolute;width:64px;height:5px;margin-left:-32px;background:rgba(0,0,0,.6);border:1px solid #4a4030;';
      const f = document.createElement('div');
      f.style.cssText = 'height:100%;background:#a8302a;transform-origin:left;';
      d.appendChild(f); this.barLayer.appendChild(d);
      this.bars.push({ d, f });
    }
    this.bars.forEach((b, i) => {
      const e = list[i];
      if (!e) { b.d.style.display = 'none'; return; }
      b.d.style.display = 'block';
      b.d.style.transform = `translate(${e.x}px, ${e.y}px)`;
      b.f.style.transform = `scaleX(${e.v})`;
    });
  }
}
