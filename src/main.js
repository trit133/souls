import { PixelPass, PIXEL_H } from './pixel.js';
import * as THREE from 'three';
import './style.css';
import { Input } from './input.js';
import { Audio } from './audio.js';
import { FX } from './fx.js';
import { PFX } from './pfx.js';
import { VFX, pack, unpack } from './vfx.js';
import { WeaponFx } from './weaponfx.js';
import { World } from './world.js';
import { pickLayout } from './modules.js';
import { Player } from './player.js';
import { Enemy } from './enemies.js';
import { Boss, BOSS_MOVES, BOSSES } from './boss.js';
import { UI } from './ui.js';
import { angDiff } from './actor.js';
import { BOONS, rollBoons } from './boons.js';
import { STATUS } from './status.js';
import { OnlineAccounts } from './account.js';
import { Multiplayer } from './mp.js';
import { rng } from './world.js';
import { enemyGold, MINI_GOLD, BOSS_GOLD, SECTION_MULT, sectionBonus, extraEnemyShare } from './progress.js';
import { wornOutfit, migrateCosmetics, cosmetics, tickOutfitColors } from './outfits.js';
import { treeStats, migrateUpgrades, migrateTree, TREE_VERSION } from './skilltree.js';
import { playerParts, scaleParts, sumParts, ELEMS, TYPES, TYPE_COLOR, BUILD_PER_DMG, SPELL_BUILD, rollElems } from './damage.js';
import { TreeUI } from './treeui.js';
import { SkinMenu } from './skinmenu.js';
import { FireTitle } from './title.js';
import { attachCardFx } from './cardfx.js';
import { Home } from './home.js';
import { pixelMenus, syncRanges } from './pixelmenus.js';
import { LayoutEditor, applyLayout } from './touchlayout.js';
import { ACTIONS, DEFAULTS, normalize, loadGuest, saveGuest, keyLabel } from './settings.js';

// render no more than ~1080p worth of pixels; bigger screens (ultrawide, 4K) are upscaled

const $ = (id) => document.getElementById(id);
const PARRY_EARLY = 0.23, PARRY_LATE = 0; // seconds before impact
const CHAR_NAMES = { knight: 'Knight', rogue: 'Rogue', mage: 'Spellsword' };
const MANA_PER_HIT = 10;
// player spells: little blue bolts, and exploding fireballs (bigger once evolved)
const SPELLS = {
  bolt: { dmg: 8, speed: 17, life: 1.3, r: 0.35, size: 0.2, color: 0x5ab0ff, poise: 0, noKnock: true },
  fire: { dmg: 120, speed: 12, life: 1.6, r: 0.7, size: 0.5, color: 0xff7a1a, poise: 69, aoe: 3 },
};


// damage parts for the wire: whole numbers, zeros dropped
const packParts = (p) => Object.fromEntries(Object.entries(p).filter(([, v]) => v >= 0.5).map(([k, v]) => [k, Math.round(v)]));

class Game {
  constructor() {
    this.canvas = $('game');
    // the scene is drawn small and scaled up by src/pixel.js, so no antialiasing
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false, powerPreference: 'high-performance' });
    this.pixel = new PixelPass(this.renderer);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x15130f);
    this.scene.fog = new THREE.Fog(0x1a1712, 24, 55);
    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 200);
    this.camPos = new THREE.Vector3(0, 14, 14);
    this.camLook = new THREE.Vector3();

    this.scene.add(new THREE.HemisphereLight(0x9aa6c8, 0x4a3a28, 2.0));
    const sun = new THREE.DirectionalLight(0xffd8a8, 2.0);
    sun.position.set(-8, 14, 6); this.scene.add(sun);

    this.input = new Input();
    this.audio = new Audio();
    this.fx = new FX(this.scene);
    this.pfx = new PFX(this);
    this.weaponFx = new WeaponFx(this);
    this.world = new World(this.scene);
    this.ui = new UI();

    this.time = 0;
    this.freeze = 0;
    this.slow = 0;
    this.tokens = 0;
    this.maxTokens = 99; // replaced by assignEngagement()
    this.projectiles = [];
    this.rings = [];
    this.mode = 'title';
    this.enemies = [];
    this.bosses = [];
    this.encounters = [];
    this.bossMoves = BOSS_MOVES;
    this.player = null;
    this.lockSprite = this.makeLockSprite();
    this.makeParryCues();
    // the server's copy may carry settings changed on another device
    this.accounts = new OnlineAccounts(() => { this.settingsFor = null; if (this.mode === 'title') this.refreshTitle(); else this.loadSettings(); });
    this.mp = new Multiplayer(this);
    this.fx.rawTelegraph = this.fx.telegraph.bind(this.fx);
    this.fx.telegraph = (x, z, r, dur, color) => {
      if (this.mp.active && this.mp.isHost) this.mp.sendAll({ t: 'tele', x, z, r, dur, color });
      return this.fx.rawTelegraph(x, z, r, dur, color);
    };
    this.runGold = 0; this.secGold = [0, 0, 0, 0]; this.roomGold = {}; this.roomKills = {};
    this.runBanked = 0; this.bankedKeys = new Set();
    this.minisFelled = 0;
    this.deaths = 0;
    this.buildRun();

    this.bindUI();
    new FireTitle($('title-fire'), 'ASHEN VIGIL');
    document.querySelectorAll('.char[data-char]').forEach((el) => attachCardFx(el, el.dataset.char));
    this.home ||= new Home(this);
    pixelMenus();
    document.querySelectorAll('.pick[data-pick]').forEach((el) => attachCardFx(el, el.dataset.pick));
    this.resize();
    addEventListener('resize', () => this.resize());
    window.visualViewport?.addEventListener('resize', () => this.resize());
    this.last = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  // the encounter currently being fought (mini boss or final boss), if any
  get activeEnc() { return this.encounters.find((e) => e.active) || null; }
  get bossActive() { return !!this.activeEnc; }
  get bossDefeated() { return this.encounters.find((e) => e.kind === 'boss')?.defeated; }

  enemiesAll() {
    const enc = this.activeEnc;
    return enc && enc.boss.alive ? [...this.enemies, enc.boss] : this.enemies;
  }

  // Assemble a new level from a fresh random module layout.
  newLayout() { return pickLayout(); }

  // a party fights 30% / 60% more regular enemies, placed near the originals
  extraSpawns(players, seed) {
    const share = extraEnemyShare(players), pool = this.world.spawns.filter((s) => s.type !== 'brute');
    const r = rng(seed + 7), out = [];
    for (let i = 0, n = Math.round(this.world.spawns.length * share); i < n; i++) {
      const s = pool[Math.floor(r() * pool.length)];
      for (let tries = 0; tries < 12; tries++) {
        const a = r() * Math.PI * 2, d = 1.4 + r() * 1.6, x = s.x + Math.cos(a) * d, z = s.z + Math.sin(a) * d;
        if (!this.world.walkable(x, z, 0.5, s.mod)) continue;
        out.push({ ...s, x, z, o: { ...s.o, patrol: null } });
        break;
      }
    }
    return out;
  }

  buildRun(layout = pickLayout(), seed = (Math.random() * 1e9) | 0, players = 1) {
    for (const e of this.enemies) e.remove();
    for (const b of this.bosses) b.remove();
    this.projectiles.forEach((p) => this.scene.remove(p.mesh)); this.projectiles = []; this.pfx?.clear(); this.rings = [];
    this.layout = layout;
    this.world.build(layout, seed);
    // tier = mini bosses passed before a module; everything after them is stronger
    const tierAt = (i) => layout.slice(0, i).filter((k) => k.startsWith('mini:')).length;
    const spawns = [...this.world.spawns, ...this.extraSpawns(players, seed)];
    this.enemies = spawns.map((s) => new Enemy(this, s.type, s.x, s.z, s.yaw, { ...s.o, mod: s.mod, tier: tierAt(s.mod), players }));
    this.encounters = this.world.encounters;
    this.bosses = this.encounters.map((enc) => {
      enc.boss = new Boss(this, enc.kind === 'mini' ? BOSSES[enc.bossId] : BOSSES.varek, enc.arena, enc.mod, tierAt(enc.mod), players);
      enc.boss.enc = enc;
      return enc.boss;
    });
    this.boss = this.encounters.find((e) => e.kind === 'boss').boss;
    // stable ids shared by every device in a party; guests' copies are host-driven puppets
    this.netMap = {};
    const puppet = this.mp?.active && !this.mp.isHost;
    this.enemies.forEach((e, i) => { e.netId = i; e.puppet = puppet; this.netMap[i] = e; });
    this.bosses.forEach((b, i) => { b.netId = 1000 + i; b.puppet = puppet; this.netMap[1000 + i] = b; });
    // regular enemies carrying elemental damage: more of them the further into the run (same roll on every device)
    const er = rng(seed + 13);
    for (const e of this.enemies) e.setElems(rollElems(e.tier, er));
    this.tokens = 0;
    this.resetEncounters();
  }

  makeLockSprite() {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(255,255,255,0.95)'; g.beginPath(); g.arc(32, 32, 13, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(200,40,30,1)'; g.beginPath(); g.arc(32, 32, 8, 0, Math.PI * 2); g.fill();
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
    s.scale.setScalar(0.45); s.renderOrder = 10; s.visible = false;
    this.scene.add(s);
    return s;
  }

  // ---------- UI / flow ----------
  bindUI() {
    document.querySelectorAll('.char[data-char]').forEach((b) => b.addEventListener('click', () => {
      this.audio.unlock();
      // you must be signed in to play
      if (!this.accounts.user) { $('acct-err').textContent = 'Sign in to play'; this.ui.show('account'); return; }
      if (b.dataset.char === 'mage' && !this.accounts.data?.upgrades.mage) { this.treeUI.open('mage'); return; }
      this.start(b.dataset.char);
    }));
    $('resume').addEventListener('click', () => this.setPaused(false));
    $('restart').addEventListener('click', () => this.toTitle());
    const readyOr = (btn, solo) => () => {
      if (!this.mp.active) return solo();
      $(btn).disabled = true;
      this.mp.setReady();
    };
    $('again').addEventListener('click', readyOr('again', () => this.toTitle()));
    $('retry').addEventListener('click', readyOr('retry', () => { this.audio.unlock(); this.start(this.kind); }));
    $('go-title').addEventListener('click', () => this.toTitle());
    // after a run: solo opens the upgrade shop here; a party goes back to the room's lobby (upgrades inside)
    for (const id of ['go-lobby', 'victory-lobby']) $(id).addEventListener('click', () => this.afterRunLobby());
    $('btn-mp').addEventListener('click', () => { this.audio.unlock(); this.openLobby(); });
    $('btn-settings').addEventListener('click', () => this.openSettings());
    $('btn-settings-out').addEventListener('click', () => this.openSettings());
    $('btn-solo').addEventListener('click', () => { this.audio.unlock(); this.home.show('chars'); document.querySelector('.char[data-char]')?.focus({ preventScroll: true }); });
    $('chars-back').addEventListener('click', () => this.home.show('in'));
    $('set-signout').addEventListener('click', () => { this.accounts.signOut(); this.closeSettings(); this.refreshTitle(); });
    // fullscreen has to start from a click; phones that support it also lock to landscape. Hidden where the
    // browser can't (iPhone Safari), and the label follows Esc / F11 too
    const fsOn = () => document.fullscreenElement || document.webkitFullscreenElement;
    const fsOk = document.fullscreenEnabled || document.webkitFullscreenEnabled;
    const fsLabel = () => document.querySelectorAll('[data-fs]').forEach((b) => {
      const text = fsOn() ? 'Exit Fullscreen' : 'Fullscreen', lab = b.querySelector('.tile-t'); // the home tile's label is pixel art
      if (lab?.plabel) lab.plabel.set(text); else if (lab) lab.textContent = text; else b.textContent = text;
      b.classList.toggle('hidden', !fsOk);
    });
    const toggleFs = () => {
      if (fsOn()) return (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      const el = document.documentElement, req = el.requestFullscreen || el.webkitRequestFullscreen;
      Promise.resolve(req.call(el, { navigationUI: 'hide' }))
        .then(() => screen.orientation?.lock?.('landscape').catch(() => {}))
        .catch(() => {});
    };
    document.querySelectorAll('[data-fs]').forEach((b) => b.addEventListener('click', toggleFs));
    document.addEventListener('fullscreenchange', fsLabel);
    document.addEventListener('webkitfullscreenchange', fsLabel);
    fsLabel();
    $('pause-settings').addEventListener('click', () => this.openSettings());
    $('set-back').addEventListener('click', () => this.closeSettings());
    $('set-quality').addEventListener('change', (e) => { this.settings.quality = e.target.value; this.applySettings(this.settings); this.saveSettings(); });
    $('set-reset').addEventListener('click', () => { this.applySettings(normalize()); this.saveSettings(); this.renderSettings(); });
    document.querySelectorAll('[data-set]').forEach((el) => {
      el.addEventListener('input', () => {
        this.settings[el.dataset.set] = el.value / 100;
        el.nextElementSibling.textContent = el.value + '%';
        this.applySettings(this.settings);
        if (el.dataset.set === 'sfx' || el.dataset.set === 'master') { this.audio.unlock(); this.audio.play('hit', 0.6); }
      });
      el.addEventListener('change', () => this.saveSettings());
    });
    // in a room, Leave keeps the lobby open; outside one, Back closes it
    $('lobby-back').addEventListener('click', () => {
      if (this.mp.code) { this.mp.leave(); $('lobby-err').textContent = ''; this.renderLobby(); } else this.ui.show('lobby', false);
    });
    const tryNet = (fn) => fn().catch((e) => this.lobbyError(e.message));
    $('lobby-create').addEventListener('click', () => tryNet(() => this.mp.create(this.lobbyKind)));
    $('lobby-joinbtn').addEventListener('click', () => tryNet(() => this.mp.join($('lobby-input').value.trim(), this.lobbyKind)));
    $('lobby-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('lobby-joinbtn').click(); });
    $('lobby-start').addEventListener('click', () => this.mp.startRun());
    $('lobby-shop').addEventListener('click', () => { this.treeUI.open(); });
    this.skinMenu = new SkinMenu(this);
    this.treeUI = new TreeUI(this);
    this.layoutEditor = new LayoutEditor(this);
    $('btn-skins').addEventListener('click', () => { this.audio.unlock(); this.skinMenu.open(); });
    $('lobby-skins').addEventListener('click', () => this.skinMenu.open(this.lobbyKind));
    $('lobby-settings').addEventListener('click', () => this.openSettings());
    $('lobby-copy').addEventListener('click', () => {
      navigator.clipboard?.writeText(this.mp.code || '').then(() => { $('lobby-copy').textContent = 'Copied'; setTimeout(() => { $('lobby-copy').textContent = 'Copy'; }, 1500); }, () => {});
    });
    $('chat-form').addEventListener('submit', (e) => {
      e.preventDefault();
      if (this.mp.chat($('chat-input').value)) $('chat-input').value = '';
    });
    document.querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => {
      // a locked Spellsword opens Upgrades, where it can be bought without leaving the room
      if (b.dataset.pick === 'mage' && !this.accounts.data?.upgrades.mage) { this.treeUI.open('mage'); return; }
      this.lobbyKind = b.dataset.pick; if (this.mp.code) this.mp.setKind(this.lobbyKind); this.renderLobby();
    }));
    $('btn-shop').addEventListener('click', () => { this.treeUI.open(); });
    $('shop-back').addEventListener('click', () => { this.ui.show('shop', false); this.refreshTitle(); this.renderLobby(); });
    $('btn-acct').addEventListener('click', () => { this.audio.unlock(); $('acct-err').textContent = ''; this.ui.show('account'); });
    $('acct-back').addEventListener('click', () => this.ui.show('account', false));
    const auth = async (fn) => {
      try {
        await fn($('acct-user').value.trim(), $('acct-pass').value);
        $('acct-pass').value = '';
        this.ui.show('account', false); this.refreshTitle();
      } catch (e) { $('acct-err').textContent = e.message; }
    };
    $('acct-form').addEventListener('submit', (e) => { e.preventDefault(); auth((u, p) => this.accounts.signIn(u, p)); });
    $('acct-signup').addEventListener('click', () => auth((u, p) => this.accounts.signUp(u, p)));
    this.refreshTitle();
    const pr = $('prompt');
    const tapPrompt = (e) => { e.preventDefault(); this.input.pressed.add('interact'); };
    pr.addEventListener('touchstart', tapPrompt, { passive: false });
    pr.addEventListener('click', tapPrompt);
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.mode === 'play') this.setPaused(true); });
    // resume audio on any touch (iOS suspends it when backgrounded)
    addEventListener('touchstart', () => this.audio.ctx && this.audio.ctx.state !== 'running' && this.audio.unlock(), { passive: true });
  }

  get isGuest() { return this.mp.active && !this.mp.isHost; }

  // every player in the run: this device's plus teammates
  allPlayers() { return this.mp.active ? [this.player, ...this.mp.peers.values()] : [this.player]; }

  targetOf(e) {
    let best = this.player, bd = Infinity;
    for (const p of this.allPlayers()) {
      if (!p.alive) continue;
      const d = e.distTo(p);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }

  startParty(kind, layout, seed, players) { this.ui.show('lobby', false); this.start(kind, { layout, seed, players }); }

  start(kind, party = null) {
    if (this.player) this.player.remove();
    this.overShown = false;
    this.kind = kind;
    if (party) this.buildRun(party.layout, party.seed, party.players); else this.buildRun();
    this.waitingOnParty = false; this.reviving = null;
    this.respawnAt = { x: 0, z: -2.5 };
    this.player = new Player(this, kind, this.respawnAt.x, this.respawnAt.z, this.accounts.user ? treeStats(kind, this.accounts.data) : {});
    this.runGold = 0; this.minisFelled = 0; this.secGold = [0, 0, 0, 0]; this.roomGold = {}; this.roomKills = {};
    this.runBanked = 0; this.bankedKeys = new Set();
    this.ui.setRunGold(0);
    $('run-gold').title = 'Gold banked to your account this run';
    if (this.accounts.data) { this.accounts.data.stats.runs++; this.accounts.save(); }
    this.ui.setBoons([]);
    this.ui.setProgress(1, this.world.mods.length);
    this.ui.show('gameover', false); this.ui.show('reward', false);
    this.lastGood = null;
    this.seenMod = 0;
    this.deaths = 0;
    this.startTime = this.time;
    this.mode = 'play';
    this.ui.setMaxHp(this.player.maxHp, this.player.maxSt);
    this.ui.hp.snap(1); this.ui.st.snap(1);
    $('b-special').textContent = { knight: 'BLOCK', rogue: 'PARRY', mage: 'FIRE' }[kind];
    $('b-heavy').textContent = kind === 'mage' ? 'BOLT' : 'R2';
    document.querySelector('.bar.mn').classList.toggle('hidden', kind !== 'mage');
    this.ui.show('menu', false); this.ui.show('hud'); this.ui.show('victory', false); this.ui.show('death', false);
    this.ui.show('touch', this.input.isTouch);
    this.camPos.set(this.player.pos.x, 14, this.player.pos.z + 12);
    this.ui.toast(this.world.mods[0].name.toUpperCase(), 3);
    this.input.reset();
  }

  toTitle() {
    this.mode = 'title';
    $('retry').textContent = 'Try Again'; $('again').textContent = 'Play Again';
    if (this.mp.active || this.mp.code) this.mp.leave();
    this.audio.stopMusic();
    this.ui.show('pause', false); this.ui.show('victory', false); this.ui.show('death', false);
    this.ui.show('gameover', false); this.ui.show('reward', false);
    this.ui.show('hud', false); this.ui.show('touch', false); this.ui.show('menu');
    this.ui.prompt(null);
    this.ui.enemyBars([]);
    this.refreshTitle();
  }

  setPaused(v) {
    // a party keeps running: the menu just opens over the game
    if (this.mp.active) { this.ui.show('pause', v); return; }
    if (v && this.mode !== 'play') return;
    if (!v && this.mode !== 'paused') return;
    this.mode = v ? 'paused' : 'play';
    this.ui.show('pause', v);
    this.input.reset();
    if (!v) this.audio.unlock();
  }

  // put every unbeaten encounter back to its pre-fight state
  resetEncounters() {
    for (const enc of this.encounters) {
      enc.active = false;
      if (enc.defeated) {
        this.world.setGate(enc.gateIn, true, false);
        if (enc.gateOut) this.world.setGate(enc.gateOut, true, false);
        continue;
      }
      enc.boss.reset();
      this.world.setGate(enc.gateIn, true, true); // fog you can walk through
      if (enc.gateOut) this.world.setGate(enc.gateOut, false, true);
    }
    this.ui.show('boss', false);
    this.audio.stopMusic();
    this.projectiles.forEach((p) => this.scene.remove(p.mesh)); this.projectiles = []; this.pfx?.clear();
    this.rings = [];
  }

  startEncounter(enc) {
    enc.active = true;
    if (this.mp.active && this.mp.isHost) this.mp.sendAll({ t: 'enc', i: this.encounters.indexOf(enc) });
    // the whole party is pulled in when the fog closes
    const p = this.player, A = enc.arena;
    if (Math.hypot(p.pos.x - A.x, p.pos.z - A.z) > A.r - 1) { p.pos.set(A.x, 0, A.z + A.r - 3); this.lastGood = null; this.camPos.set(p.pos.x, 14, p.pos.z + 12); }
    this.world.setGate(enc.gateIn, false, true);
    this.audio.play('fog');
    enc.boss.wake();
    $('boss-name').textContent = enc.boss.name;
    this.ui.show('boss');
    this.ui.boss.snap(1);
    this.audio.startMusic(enc.kind === 'mini' ? enc.bossId : 'varek');
    setTimeout(() => enc.active && this.audio.play('roar', enc.kind === 'mini' ? 0.5 : 0.8), 1200);
  }

  // ---------- settings (per account; guests keep them on this device) ----------
  loadSettings() {
    const key = this.accounts.user || '';
    if (this.settingsFor === key && this.settings) return;
    this.settingsFor = key;
    // an account starts from defaults; guests use this device's settings
    this.applySettings(this.accounts.user ? normalize(this.accounts.data?.settings) : loadGuest());
  }

  applySettings(s) {
    this.settings = s;
    this.input.setBinds(s.binds);
    this.audio.setVolumes({ master: s.master, music: s.music, sfx: s.sfx, team: s.team });
    this.fx.shakeMul = s.shake;
    const root = document.documentElement.style;
    root.setProperty('--touch-size', s.touchSize); root.setProperty('--touch-opacity', s.touchOpacity);
    if (!this.layoutEditor?.layout) applyLayout(s.touchLayout);
    if (this.camera) this.resize();
    const b = s.binds, k = (a) => b[a].filter(Boolean).map(keyLabel).join('/') || '—';
    $('kb-help').innerHTML = `<b>Keyboard:</b> ${k('up')} ${k('left')} ${k('down')} ${k('right')} move · ${k('sprint')} sprint · ${k('roll')} roll · ${k('attack')} attack · ${k('heavy')} heavy · ${k('special')} block/parry · ${k('heal')} heal · ${k('lock')} lock-on · ${k('interact')} interact · ${k('pause')} pause`;
  }

  saveSettings() {
    if (this.accounts.user) { this.accounts.data.settings = this.settings; this.accounts.save(); } else saveGuest(this.settings);
  }

  openSettings() {
    this.renderSettings();
    syncRanges();
    $('set-signout').classList.toggle('hidden', !this.accounts.user || this.mode !== 'title');
    this.ui.show('settings');
  }

  closeSettings() {
    this.input.capture = null;
    this.ui.show('settings', false);
  }

  renderSettings() {
    const s = this.settings;
    $('set-owner').textContent = this.accounts.user ? `Saved to ${this.accounts.displayName}'s account` : 'Guest: saved on this device only. Sign in to keep them on your account.';
    $('set-quality').value = s.quality;
    document.querySelectorAll('[data-set]').forEach((el) => {
      const k = el.dataset.set;
      el.value = Math.round(s[k] * 100);
      el.nextElementSibling.textContent = el.value + '%';
    });
    const wrap = $('binds');
    wrap.innerHTML = '';
    for (const [a, label] of ACTIONS) {
      const name = document.createElement('div'); name.textContent = label; wrap.appendChild(name);
      for (const slot of [0, 1]) {
        const btn = document.createElement('button');
        const code = s.binds[a][slot];
        btn.textContent = keyLabel(code);
        btn.classList.toggle('empty', !code);
        btn.addEventListener('click', () => this.captureBind(btn, a, slot));
        wrap.appendChild(btn);
      }
    }
  }

  // wait for the next key / mouse button; a key already used elsewhere moves here
  captureBind(btn, action, slot) {
    if (this.input.capture) return;
    btn.textContent = 'Press a key…'; btn.classList.add('wait');
    // safe to listen right away: this click's own mouse press has already happened
    {
      this.input.capture = (code) => {
        this.input.capture = null;
        const b = this.settings.binds;
        if (code === 'Escape') return this.renderSettings();
        if (code === 'Backspace' || code === 'Delete') b[action][slot] = '';
        else {
          for (const [a] of ACTIONS) b[a] = b[a].map((c) => (c === code ? '' : c));
          b[action][slot] = code;
        }
        this.applySettings(this.settings); this.saveSettings(); this.renderSettings();
      };
    }
  }

  refreshTitle() {
    this.loadSettings();
    const A = this.accounts;
    // the old upgrade shop became skill trees: its spending comes back once as gold
    if (A.user && A.data && !A.data.treeMigrated) {
      const back = migrateUpgrades(A.data);
      A.save();
      if (back) setTimeout(() => this.ui.toast(`SKILL TREES ARE HERE · ◆ ${back} REFUNDED`, 4), 300);
    }
    if (A.user && A.data && !(A.data.treeV >= TREE_VERSION)) {
      const back = migrateTree(A.data);
      A.save();
      if (back) setTimeout(() => this.ui.toast(`SKILL TREES REBUILT · ◆ ${back} REFUNDED`, 4), 300);
    }
    // skins became outfits: every kill so far is an emerald, unlocked skins became pieces and colours
    if (A.user && A.data && !A.data.cosmeticsV1) {
      const em = migrateCosmetics(A.data);
      A.save();
      if (em) setTimeout(() => this.ui.toast(`THE CUSTOMIZER IS HERE · ${em} EMERALDS FROM YOUR KILLS`, 4.5), 900);
    }
    $('acct-name').textContent = A.user ? A.displayName : '';
    $('acct-gold').textContent = A.user ? `◆ ${A.data.gold}` : '';
    // signed out: only the sign-in tile; signed in: the menu (or the character select, if that was open)
    this.home ||= new Home(this); // (bindUI refreshes the title before the constructor gets here)
    this.home.setGold(A.user ? A.data.gold : null);
    this.home.show(!A.user ? 'out' : this.home.view === 'out' ? 'in' : this.home.view);
    const open = !!A.data?.upgrades.mage;
    document.querySelector('.char[data-char="mage"]').classList.toggle('locked', !open);
    $('mage-lock').textContent = open ? '' : 'Locked · unlock for ◆ 100 in Skill Trees';
  }



  // gold goes into the current section of the run (sections end at each mini boss)
  addRunGold(n, a) {
    if (this.isGuest) return; // the host keeps the party's pot
    this.runGold += n;
    this.secGold[Math.min(3, this.minisFelled)] += n;
    if (this.mp.active) this.mp.sendAll({ t: 'gold', n: this.runGold, s: this.secGold });
    if (a) this.statusPopup(a, `+${n}`, '#e8c25a');
  }

  // kills fill the room's pot; it pays out when the room is cleared
  onEnemyKilled(e) {
    if (this.isGuest) return;
    // solo: your kill. A party shares each room's kills when it's cleared (see openRoom)
    if (this.mp.active) this.roomKills[e.mod] = (this.roomKills[e.mod] || 0) + 1;
    else this.creditKill(e);
    const n = enemyGold(e.type);
    this.roomGold[e.mod] = (this.roomGold[e.mod] || 0) + n;
    this.statusPopup(e, `+${n}`, '#a89060');
  }

  // the killing blow earns that player emeralds (the host tells teammates about theirs); a boss is worth 2
  creditKill(e) {
    const k = e.lastHitBy;
    if (k === this.player) this.addKill(1, !!e.isBoss);
    else if (k?.pid && this.mp.active) this.mp.send({ t: 'kill', boss: !!e.isBoss }, k.pid);
  }

  // kills: counted per character, and each one is an emerald (a boss, 2) to spend in the customizer
  addKill(add = 1, boss = false) {
    const d = this.accounts.data, kind = this.kind;
    if (!d || !this.accounts.user || add <= 0) return;
    d.kills = d.kills || {};
    d.kills[kind] = (d.kills[kind] || 0) + add;
    cosmetics(d).emeralds += add * (boss ? 2 : 1);
    this.ui.emeralds?.(d.emeralds);
  }

  // the outfit a character wears ({} for guests: the default look)
  equippedOutfit(kind) { return this.accounts.user && this.accounts.data ? wornOutfit(cosmetics(this.accounts.data), kind) : {}; }

  sameRoom(e, p) { return this.world.moduleAt(p.pos.z).i === e.mod; }

  // open a room's exit once all of its enemies are dead (host / solo decide)
  stepRooms() {
    for (const m of this.world.mods) {
      const g = this.world.gates['exit' + m.i];
      if (!g || g.open || this.enemies.some((e) => e.alive && e.mod === m.i)) continue;
      const n = this.roomGold[m.i] || 0;
      this.roomGold[m.i] = 0;
      if (n) this.addRunGold(n);
      const k = this.roomKills[m.i] || 0;
      this.roomKills[m.i] = 0;
      this.openRoom(m.i, n, k);
      if (this.mp.active) this.mp.sendAll({ t: 'room', i: m.i, n, k });
    }
  }

  openRoom(i, n, kills = 0) {
    this.world.setGate('exit' + i, true, false);
    // party: the room's kills are split evenly (rounded up) for everyone's skins
    if (kills && this.mp.active && !this.bankedKeys.has('kills' + i)) {
      this.bankedKeys.add('kills' + i);
      this.addKill(Math.ceil(kills / Math.max(1, this.mp.members.length || this.allPlayers().length)));
    }
    this.bankNow(n, 'room' + i);
    this.ui.toast(`AREA CLEARED${n ? ` · ◆ +${n} ${this.accounts.user ? 'banked' : '(guest: not saved)'}` : ''}`, 2.5);
    this.audio.play('fog');
  }

  // gold is kept on the account the moment it is earned (room clear / boss); each
  // reward is keyed so a repeated message can never pay twice
  bankNow(n, key) {
    if (!n || this.bankedKeys.has(key)) return 0;
    this.bankedKeys.add(key);
    this.runBanked += n;
    this.ui.setRunGold(this.runBanked);
    const A = this.accounts;
    if (A.data) {
      A.data.gold += n;
      A.data.stats.goldEarned += n;
      A.data.stats.bestArea = Math.max(A.data.stats.bestArea, this.seenMod + 1);
      A.save();
    }
    return n;
  }

  // one enemy fights each player; everyone else that has noticed them waits its turn
  assignEngagement() {
    const fighting = this.enemies.filter((e) => e.alive && !e.puppet && e.state !== 'idle' && e.state !== 'sit' && e.state !== 'return' && e.state !== 'dead');
    const taken = new Set(), now = this.time;
    for (const p of this.allPlayers()) {
      if (!p.alive) continue;
      const mine = fighting.filter((e) => !taken.has(e) && this.targetOf(e) === p);
      if (!mine.length) continue;
      const hitByMe = mine.filter((e) => now - (e.lastHitBy[p.uid] ?? -99) < 2.5).sort((a, b) => b.lastHitBy[p.uid] - a.lastHitBy[p.uid])[0];
      const current = mine.find((e) => e.engagedTo === p.uid && e.distTo(p) < 9);
      const pick = hitByMe || current || mine.reduce((a, b) => (a.distTo(p) <= b.distTo(p) ? a : b));
      taken.add(pick); pick.engagedTo = p.uid;
    }
    for (const e of this.enemies) {
      const was = e.engaged;
      e.engaged = taken.has(e);
      if (!e.engaged) { e.engagedTo = null; if (was) e.watchCd = 10 + Math.random() * 5; }
    }
  }

  // No checkpoints: death ends the run (banked gold is already safe on the account).
  // In a party you go down instead; the run ends only when everyone is down.
  onPlayerDeath() {
    this.deaths++;
    this.audio.play('death');
    if (this.mp.active) {
      this.ui.toast('YOU ARE DOWN', 3);
      this.mp.sendAll({ t: 'down' });
      this.mp.checkWipe();
      return;
    }
    this.gameOver();
  }

  gameOver() {
    if (this.overShown) return;
    this.overShown = true;
    this.audio.stopMusic(2);
    this.ui.show('reward', false);
    this.ui.show('death');
    const s = Math.round(this.time - this.startTime);
    const felled = this.encounters.filter((e) => e.defeated).map((e) => e.boss.name.split(',')[0]);
    setTimeout(() => {
      if (this.mode === 'title') return;
      this.ui.show('death', false);
      this.mode = 'over';
      $('gameover-title').textContent = 'The run has ended';
      if (this.accounts.data) { this.accounts.data.stats.bestArea = Math.max(this.accounts.data.stats.bestArea, this.seenMod + 1); this.accounts.save(); }
      $('gameover-stats').innerHTML = [
        `Banked this run: ◆ ${this.runBanked}${this.accounts.user ? '' : ' (guest: not saved)'}`,
        `Reached area ${this.seenMod + 1} of ${this.world.mods.length} — ${this.world.mods[this.seenMod].name}`,
        `Bosses felled: ${felled.length ? felled.join(', ') : 'none'}`,
        `Boons: ${this.player.boonList.length ? this.player.boonList.map((x) => BOONS[x.key].name + (x.n > 1 ? ' ×' + x.n : '')).join(', ') : 'none'}`,
        `Time ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`,
      ].join('<br>');
      this.ui.show('hud', false); this.ui.show('touch', false);
      this.showRetry();
      this.ui.show('gameover');
    }, 3400);
  }

  // ---------- party ----------
  // a revive costs every player 10% of their max health for the rest of the run
  onRevive(pid) {
    const p = this.player;
    p.maxHp = Math.max(1, Math.round(p.maxHp * 0.9));
    p.hp = Math.min(p.hp, p.maxHp);
    this.ui.setMaxHp(p.maxHp, p.maxSt);
    if (pid === this.mp.id) p.revive(0.5);
    else { const r = this.mp.peers.get(pid); if (r) r.alive = true; }
    this.ui.toast('REVIVED · ALL LOSE 10% MAX HEALTH', 2.5);
    this.audio.play('heal');
  }

  startRevive(target) {
    this.reviving = { pid: target.pid, t: 1.5 };
    this.player.setState('rest');
  }

  stepRevive(dt) {
    const R = this.reviving, p = this.player;
    if (!R) return;
    const tg = this.mp.peers.get(R.pid);
    if (p.state !== 'rest' || !tg || tg.alive) { this.reviving = null; return; }
    if ((R.t -= dt) <= 0) {
      this.reviving = null;
      this.mp.sendAll({ t: 'revive', pid: R.pid });
      this.onRevive(R.pid);
      p.setState('move');
    }
  }

  resumeParty() {
    this.waitingOnParty = false;
    this.ui.prompt(null);
    this.mode = 'play';
    this.last = performance.now();
  }

  // run-end button: Try Again alone; in a party everyone readies up
  showRetry() {
    const party = this.mp.active;
    $('retry').textContent = party ? 'Ready Up' : 'Try Again';
    $('retry').disabled = false;
    $('ready-status').textContent = '';
    $('again').textContent = party ? 'Ready Up' : 'Play Again';
    $('go-lobby').textContent = $('victory-lobby').textContent = party ? 'Lobby & Skill Trees' : 'Skill Trees';
    $('go-lobby').classList.toggle('hidden', !party && !this.accounts.user);
    $('victory-lobby').classList.toggle('hidden', !party && !this.accounts.user);
    $('again').disabled = false;
    $('victory-ready').textContent = '';
    this.mp.ready.clear();
  }

  afterRunLobby() {
    if (!this.mp.active) { this.treeUI.open(this.kind); return; }
    this.mode = 'lobby';
    this.audio.stopMusic();
    for (const s of ['gameover', 'victory', 'death', 'reward', 'hud', 'touch']) this.ui.show(s, false);
    this.ui.prompt(null); this.ui.enemyBars([]);
    this.ui.show('menu');
    this.refreshTitle();
    this.openLobby();
  }

  renderReady(n, total) {
    const text = n < 0 ? 'Everyone else left. Go back to the title to start a new room.' : `${n} of ${total} ready`;
    $('ready-status').textContent = text; $('victory-ready').textContent = text;
  }

  // ---------- lobby ----------
  openLobby() {
    this.lobbyKind = this.lobbyKind || 'knight';
    $('lobby-err').textContent = '';
    this.renderLobby();
    this.ui.show('lobby');
  }

  lobbyError(e) { $('lobby-err').textContent = e; }

  renderLobby() {
    const m = this.mp, inRoom = !!m.code;
    const esc = (s) => String(s).replace(/[<&>"]/g, '');
    $('lobby-join').classList.toggle('hidden', inRoom);
    $('lobby-chat').classList.toggle('hidden', !inRoom);
    $('lobby-party').classList.toggle('hidden', !inRoom);
    $('lobby-coderow').classList.toggle('hidden', !inRoom);
    $('lobby-code').textContent = m.code || '';
    const slots = m.members.map((x) => `<div class="member k-${esc(x.kind)}"><span class="mname">${esc(x.name)}</span><span class="mclass">${CHAR_NAMES[x.kind] || ''}</span>${x.id === m.host ? '<span class="tag">Host</span>' : ''}${x.id === m.id ? '<span class="tag you">You</span>' : ''}</div>`);
    while (inRoom && slots.length < 3) slots.push('<div class="member open"><span class="mname">Open slot</span></div>');
    $('lobby-members').innerHTML = slots.join('');
    $('lobby-start').classList.toggle('hidden', !m.isHost);
    $('lobby-start').disabled = m.members.length < 2;
    $('lobby-back').textContent = inRoom ? 'Leave Room' : 'Back';
    $('lobby-wait').textContent = !inRoom ? '' : m.isHost ? (m.members.length < 2 ? 'Share the code. Needs 2 or 3 players.' : 'Everyone ready? Start when you are.') : 'Waiting for the host to start';
    const mageOpen = !!this.accounts.data?.upgrades.mage;
    document.querySelectorAll('[data-pick]').forEach((b) => {
      b.classList.toggle('on', b.dataset.pick === this.lobbyKind);
      b.classList.toggle('locked', b.dataset.pick === 'mage' && !mageOpen);
      b.setAttribute('aria-pressed', b.dataset.pick === this.lobbyKind);
    });
    const lock = document.querySelector('[data-pick="mage"] > span'); // (the name above is a pixel label)
    lock.textContent = mageOpen ? 'Hits build mana · bolt & fireball' : 'Locked · tap to unlock in Skill Trees';
    this.renderChat();
  }

  renderChat() {
    const log = $('chat-log');
    const atEnd = log.scrollHeight - log.scrollTop - log.clientHeight < 30;
    log.replaceChildren(...this.mp.chatLog.map((l) => {
      const d = document.createElement('div');
      d.className = 'chat-line' + (l.sys ? ' sys' : '') + (l.me ? ' me' : '');
      if (!l.sys) { const n = document.createElement('b'); n.textContent = l.name; d.append(n, ' '); }
      d.append(l.text);
      return d;
    }));
    if (atEnd) log.scrollTop = log.scrollHeight;
  }

  onPartyClosed(reason, wasRunning = true) {
    this.ui.show('lobby', false);
    if (this.mode !== 'title' && wasRunning) { this.toTitle(); }
    if (reason) { this.renderLobby(); this.ui.show('lobby'); this.lobbyError(reason); }
  }

  // After a mini boss: pick one of three power-ups, or rest (full HP + flasks).
  offerReward() {
    const p = this.player;
    this.mode = 'reward';
    this.input.reset();
    const cards = rollBoons().map((k) => ({ key: k, name: BOONS[k].name, color: BOONS[k].color, desc: BOONS[k].desc(p) }));
    cards.push({ key: 'rest', rest: true, name: 'Rest', desc: `Restore all health (${Math.round(p.hp)}/${p.maxHp}) and refill your flasks (${p.flasks}/${p.maxFlasks}).` });
    this.ui.showReward(cards, (k) => this.claimReward(k), '');
    $('cashout').classList.add('hidden'); // gold is banked as you go, so there is nothing to cash out
  }

  claimReward(k) {
    const p = this.player;
    if (k === 'rest') {
      p.hp = p.maxHp; p.st = p.maxSt; p.flasks = p.maxFlasks;
      this.audio.play('bonfire');
      this.fx.burst({ x: p.pos.x, y: 1, z: p.pos.z }, 30, [1, 0.75, 0.35], 3, 0.9, 0.22);
    } else {
      BOONS[k].apply(p);
      const e = p.boonList.find((x) => x.key === k);
      if (e) e.n++; else p.boonList.push({ key: k, n: 1 });
      this.ui.setMaxHp(p.maxHp, p.maxSt);
      this.ui.setBoons(p.boonList.map((x) => ({ tag: BOONS[x.key].tag, color: BOONS[x.key].color, n: x.n })));
      this.audio.play('heal');
      this.fx.burst({ x: p.pos.x, y: 1, z: p.pos.z }, 30, [1, 0.9, 0.6], 3, 0.9, 0.22);
    }
    if (this.mp.active) {
      this.mode = 'wait';
      this.waitingOnParty = true;
      this.ui.prompt('Waiting for the party…');
      if (this.isGuest) this.mp.send({ t: 'picked' }); else this.mp.checkPicks();
      return;
    }
    this.mode = 'play';
    this.last = performance.now();
  }

  // A boss's drop and its section bonus bank straight away. The host works out the
  // amounts and sends them (`net`) so every device banks exactly the same.
  bossPayout(enc, net) {
    const section = enc.kind === 'mini' ? this.minisFelled : 3;
    let drop, bonus;
    if (net && this.isGuest) { drop = net.drop || 0; bonus = net.bonus || 0; } else {
      drop = enc.kind === 'mini' ? MINI_GOLD[section] : BOSS_GOLD;
      this.addRunGold(drop, enc.boss); // counts toward the section this boss closes
      bonus = sectionBonus(this.secGold, section);
    }
    const key = 'boss' + this.encounters.indexOf(enc);
    this.bankNow(drop + bonus, key);
    if (bonus) setTimeout(() => this.ui.toast(`SECTION BONUS ×${SECTION_MULT[section]} · ◆ +${bonus}`, 2.5), 4600);
    return { drop, bonus };
  }

  onBossDeath(boss, net = null) {
    const enc = boss.enc;
    if (enc.defeated) return;
    if (this.mp.active) this.addKill(1, true); // a boss counts once for everyone in the party (2 emeralds each)
    else this.creditKill(boss);
    enc.defeated = true;
    enc.active = false;
    this.audio.stopMusic(3);
    this.fx.addShake(0.8);
    this.slow = 1.6;
    if (enc.kind === 'mini') {
      const pay = this.bossPayout(enc, net);
      this.minisFelled++;
      this.announceBossDeath(enc, pay);
      // the way on opens right away; fanfare, then the reward choice
      this.world.setGate(enc.gateIn, true, false);
      this.world.setGate(enc.gateOut, true, false);
      if (this.mp.active && !this.player.alive && this.mode === 'play') {
        this.player.revive(0.5);
        this.mp.sendAll({ t: 'up' });
        this.ui.toast('BACK ON YOUR FEET', 2);
      }
      setTimeout(() => {
        if (this.mode !== 'play' || !this.player.alive) return;
        this.audio.play('victory');
        this.ui.toast('GREAT FOE FELLED', 2);
        this.ui.show('boss', false);
        setTimeout(() => this.mode === 'play' && this.player.alive && this.offerReward(), 1300);
      }, 2000);
      return;
    }
    // nothing left can hurt the player once Varek falls
    this.projectiles.forEach((p) => this.scene.remove(p.mesh)); this.projectiles = []; this.pfx?.clear(); this.rings = [];
    const pay = this.bossPayout(enc, net);
    this.announceBossDeath(enc, pay);
    if (this.accounts.data) {
      const st = this.accounts.data.stats;
      st.wins++;
      st.winsBy = st.winsBy || {}; st.winsBy[this.kind] = (st.winsBy[this.kind] || 0) + 1; // raises this tree's node limit
      this.accounts.save();
    }
    const goldLine = `Banked this run: ◆ ${this.runBanked}${pay.bonus ? ` (incl. ×3 bonus ◆ ${pay.bonus})` : ''}${this.accounts.user ? '' : ' (guest: not saved)'}`;
    setTimeout(() => {
      this.audio.play('victory');
      const s = Math.round(this.time - this.startTime);
      $('victory-stats').innerHTML = `Time ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}  ·  ${CHAR_NAMES[this.kind]}<br>${goldLine}<br>Boons: ${this.player.boonList.map((x) => BOONS[x.key].name + (x.n > 1 ? ' ×' + x.n : '')).join(', ') || 'none'}`;
      this.showRetry();
      this.ui.show('victory');
      this.ui.show('boss', false);
      this.world.setGate(enc.gateIn, true, false);
    }, 2600);
  }

  announceBossDeath(enc, pay) {
    if (this.mp.active && this.mp.isHost) this.mp.sendAll({ t: 'bossdead', i: this.encounters.indexOf(enc), ...pay });
  }

  // ---------- combat resolution ----------
  resolveHit(att, tg, h, def) {
    const info = {
      dmg: h.dmg, poise: h.poise, knock: h.knock, srcPos: att.pos, attacker: att, hit: h,
      parryable: !!(h.parry ?? def.parry), unblockable: !!def.unblockable,
    };
    if (att !== this.player) { info.dmg *= att.dmgScale || 1; info.elems = att.elems; info.buildMul = att.elemBuild ?? 1; }
    if (tg.isRemote) { this.mp.send({ t: 'dmg', id: att.netId, k: att.atkKey, i: def.hits.indexOf(h) }, tg.pid); return; }
    const hp = new THREE.Vector3(tg.pos.x, 1.1 * tg.rig.root.scale.y, tg.pos.z);
    const dir = new THREE.Vector3(tg.pos.x - att.pos.x, 0, tg.pos.z - att.pos.z).normalize();
    if (tg === this.player) {
      const r = tg.receive(info);
      if (r === 'parry') {
        att.onParried();
        this.audio.play('parry');
        this.mp.event({ k: 'parry' });
        if (tg.evolved) { this.ui.redFlash(); tg.rig.flash(1, 0.1, 0.1); tg.instantRiposte(att); }
        const w = tg.rig.tipL ? tg.rig.tipL.getWorldPosition(new THREE.Vector3()) : hp;
        this.fx.sparks(w, null, 26, [1, 0.95, 0.7]);
        this.pfx.play('parry', w);
        this.hitstop(0.12); if (!tg.evolved) this.slow = 0.35;
        this.fx.addShake(0.4);
      } else if (r === 'block' || r === 'guardbreak') {
        this.audio.play('clang');
        this.mp.event({ k: 'block' });
        const s = tg.rig.shield ? tg.rig.shield.getWorldPosition(new THREE.Vector3()) : hp;
        this.fx.sparks(s, dir.clone().negate(), 14);
        this.pfx.play('block', s, { dir: dir.clone().negate() });
        this.hitstop(0.05); this.fx.addShake(r === 'guardbreak' ? 0.6 : 0.25);
        if (r === 'guardbreak') this.audio.play('bigHit');
      } else if (r === 'hit') {
        this.audio.play(h.knock === 'heavy' ? 'bigHit' : 'hurt');
        this.mp.event({ k: 'hurt', heavy: h.knock === 'heavy' });
        this.fx.blood(hp, dir, 12);
        this.pfx.play('hurt', hp, { dir });
        this.hitstop(h.knock === 'heavy' ? 0.1 : 0.07);
        this.fx.addShake(h.knock === 'heavy' ? 0.7 : 0.4);
      }
      if (h.knockback && (r === 'hit' || r === 'block') && !tg.comboArmored()) tg.kb.copy(dir).multiplyScalar(h.knockback); // (no shove mid-combo)
      return;
    }
    if (att === this.player) {
      // skill tree: flat damage, knife and counter bonuses, stun buildup
      // the weapon is physical; the tree and Infusions add each damage type
      const T = att.tree || {};
      const mul = att.dmgMul * (att.c.caster ? 1 + (T.knifeDmg || 0) / 100 : 1) * (def === att.c.attacks.guardCounter ? 1 + (T.counter || 0) / 100 : 1);
      info.parts = scaleParts(playerParts(T, att.statusLv, info.dmg), mul);
      // some combo moves turn part of the weapon's physical damage into an element (Rimeblade, Shatter: frost)
      if (def.convert) for (const [k, sh] of Object.entries(def.convert)) { info.parts[k] = (info.parts[k] || 0) + info.parts.phys * sh; info.parts.phys *= 1 - sh; }
      info.dmg = sumParts(info.parts);
      // a combo staggers each enemy at most once
      if ((def.comboMove || att.cmb) && att.cmbStag?.has(tg)) info.poise = 0;
      info.poise *= 1 + (T.stun || 0) / 100;
    }
    const hp0 = tg.hp;
    const r = tg.receive(info);
    if (r === 'none') return;
    if (r === 'stagger' && att === this.player && (def.comboMove || att.cmb)) att.cmbStag?.add(tg);
    const heavy = def.heavyHit, dealt = tg.puppet ? info.dmg : Math.max(0, hp0 - tg.hp);
    const shown = scaleParts(info.parts || { phys: info.dmg }, info.dmg > 0 ? dealt / info.dmg : 0);
    this.dmgPops(tg, shown, heavy ? 'heavy' : 'me');
    if (att === this.player && att.c.caster) att.mana = Math.min(att.maxMana, att.mana + MANA_PER_HIT + (att.tree?.manaHit || 0)); // knife hits only
    if (att === this.player && tg.alive) this.applyStatus(tg, info.parts, BUILD_PER_DMG);
    this.audio.play(heavy ? 'bigHit' : 'hit', 0.9);
    this.mp.event({ k: 'hit', id: tg.netId, heavy: !!heavy, d: packParts(shown) });
    this.fx.blood(hp, dir, heavy ? 16 : 9);
    this.fx.sparks(hp, dir, 5, [1, 0.6, 0.3]);
    this.pfx.play(heavy ? 'heavyHit' : 'hit', hp, { dir });
    this.hitstop(r === 'kill' ? 0.11 : heavy ? 0.09 : 0.055);
    this.fx.addShake(def.onHitShake || (r === 'kill' ? 0.35 : 0.15));
  }

  // status build-up: each point of elemental damage adds `per` to that status's meter
  applyStatus(tg, parts, per) {
    if (!tg.status || !parts) return;
    for (const k of ELEMS) if (parts[k] > 0) tg.status.add(k, parts[k] * per, this);
  }

  // one floating number per damage type in a hit, each in its type's colour, fanned out a little
  dmgPops(e, parts, style = 'me') {
    if (!e?.rig || !parts) return;
    const list = TYPES.filter((k) => parts[k] > 0.5);
    const v = new THREE.Vector3(e.pos.x, 2.2 * e.rig.root.scale.y + (e.y || 0), e.pos.z).project(this.camera);
    if (v.z > 1) return;
    const x = (v.x * 0.5 + 0.5) * innerWidth, y = (-v.y * 0.5 + 0.5) * innerHeight;
    list.forEach((k, i) => {
      const color = k === 'phys' ? null : TYPE_COLOR[k];
      this.ui.dmgNumber(x + (i - (list.length - 1) / 2) * 30, y - i * 7, Math.round(parts[k]), style, color, i * 45);
    });
  }

  // damage dealt by status effects (bleed/frost bursts, poison/fire ticks)
  // floating damage numbers: yours white, heavy hits bigger, crits gold, teammates grey, status in its colour
  dmgPop(e, amount, kind = 'me') {
    if (!(amount > 0.5) || !e?.rig) return;
    if (kind.startsWith('dot:')) {
      // damage over time: gather it and show it about twice a second
      e.dotAcc = (e.dotAcc || 0) + amount;
      if ((e.dotT = (e.dotT ?? 0) - 1) > 0 && e.dotAcc < 40) return;
      e.dotT = 30; amount = e.dotAcc; e.dotAcc = 0;
    }
    const v = new THREE.Vector3(e.pos.x, 2.2 * e.rig.root.scale.y + (e.y || 0), e.pos.z).project(this.camera);
    if (v.z > 1) return;
    const st = kind.split(':')[1];
    this.ui.dmgNumber((v.x * 0.5 + 0.5) * innerWidth, (-v.y * 0.5 + 0.5) * innerHeight, Math.round(amount), kind.split(':')[0], st ? STATUS[st].color : null);
  }

  statusDamage(a, dmg, dot = false, kind = null) {
    if (!a.isPlayer) this.dmgPop(a, Math.min(dmg, a.hp), (dot ? 'dot:' : 'status:') + (kind || 'bleed'));
    if (!a.alive) return;
    a.hp -= dmg;
    if (!dot) a.rig.flash(1, 0.4, 0.4);
    if (a.hpShow !== undefined) a.hpShow = 4;
    if (a.hp <= 0) { a.hp = 0; if (a.state !== 'riposted') a.die(); }
  }

  statusPopup(a, text, color) {
    const v = new THREE.Vector3(a.pos.x, 2.6 * a.rig.root.scale.y + a.y, a.pos.z).project(this.camera);
    if (v.z > 1) return;
    this.ui.popup((v.x * 0.5 + 0.5) * innerWidth, (-v.y * 0.5 + 0.5) * innerHeight, text, color);
  }

  // a combo finisher's burst round the player (Arc Step's frost nova): spell damage to everything within `r`
  comboBlast(p, r, dmg, poise, elem = 'frost') {
    for (const e of this.enemiesAll()) if (e.alive && Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z) < r + e.radius) {
      const st0 = e.state, staggered = p.cmbStag?.has(e); // (a combo staggers each enemy once)
      this.spellDamage({ dmg, poise: staggered ? 0 : poise, pos: p.pos.clone(), kind: elem === 'fire' ? 'fire' : 'bolt' }, e);
      if (e.state === 'hurt' && st0 !== 'hurt') p.cmbStag?.add(e);
    }
  }

  // a critical hit: `base` physical, flat tree damage counted `flatHits` times (a parry stab hits like three lights)
  riposteHit(p, tg, base, flatHits = 1) {
    const T = { ...(p.tree || {}) };
    for (const k of TYPES) if (T[k + 'Dmg']) T[k + 'Dmg'] *= flatHits;
    const parts = scaleParts(playerParts(T, p.statusLv, base), p.dmgMul * (1 + (p.tree?.critDmg || 0) / 100));
    const dmg = sumParts(parts);
    if (tg.alive) this.applyStatus(tg, parts, BUILD_PER_DMG);
    this.mp.event({ k: 'rip', id: tg.netId, d: packParts(parts) });
    this.dmgPops(tg, parts, 'crit');
    if (tg.puppet) { this.mp.send({ t: 'rip', id: tg.netId, dmg }); tg.rig.flash(1, 0.3, 0.2); this.audio.play('riposte'); this.hitstop(0.16); this.fx.addShake(0.7); return; }
    const hp = new THREE.Vector3(tg.pos.x, 1.2 * tg.rig.root.scale.y, tg.pos.z);
    tg.lastHitBy = p;
    tg.hp -= dmg;
    tg.rig.flash(1, 0.3, 0.2);
    if (tg.hp <= 0) tg.hp = 0;
    if (tg.hpShow !== undefined) tg.hpShow = 4;
    this.audio.play('riposte');
    this.fx.blood(hp, p.fwd().clone(), 30);
    this.fx.burst(hp, 20, [1, 0.3, 0.2], 5, 0.6, 0.25);
    this.pfx.play('crit', hp);
    this.hitstop(0.16);
    this.fx.addShake(0.7);
    tg.kb.copy(p.fwd()).multiplyScalar(5);
  }

  // evolved knight's shield charge meeting an enemy: a little damage and a hard shove
  shieldBash(p, e, dir) {
    const push = (e.isBoss ? 4 : e.type === 'brute' ? 7 : 12) * (1 + (p.tree?.chargeKb || 0) / 100);
    const hp = new THREE.Vector3(e.pos.x, 1.1 * e.rig.root.scale.y, e.pos.z);
    if (e.puppet) {
      this.mp.send({ t: 'hit', id: e.netId, dmg: 10 * p.dmgMul, poise: 12, kb: [dir.x * push, dir.z * push] });
      e.hp = Math.max(1, e.hp - 10 * p.dmgMul); e.hpShow = 4;
    } else {
      const r = e.receive({ dmg: 10 * p.dmgMul, poise: 12, srcPos: p.pos, attacker: p, noKnock: true });
      if (r !== 'none') e.kb.copy(dir).multiplyScalar(push);
    }
    this.vfx('bash', hp, dir.clone());
    this.hitstop(0.05);
  }

  hitstop(t) { this.freeze = Math.max(this.freeze, t); }

  // a named effect, here and on every teammate's screen (see vfx.js)
  vfx(name, ...args) {
    VFX[name]?.(this, ...args, true);
    if (this.mp.active) this.mp.event({ k: 'fx', n: name, a: args.map(pack) });
  }
  playVfx(name, args) { if (VFX[name]) VFX[name](this, ...args.map(unpack), false); }
  // { p: pid } -> a player on this screen; { e: netId } -> an enemy
  playerRef(r) { return !r ? null : r.p === this.mp.id || r.p === 'me' ? this.player : this.mp.peers.get(r.p); }
  entityRef(r) { return !r ? null : r.e != null ? this.mp.entity(r.e) || (this.enemiesAll().find((x) => x.netId === r.e)) : null; }
  myRef() { return { p: this.mp.active ? this.mp.id : 'me' }; }

  // Parry window: from PARRY_EARLY seconds before a parryable hit lands until it lands.
  // Attackers whose next parryable hit is inside that window and would reach the player.
  parryTargets(p, slack = 0) {
    const out = [];
    for (const e of this.enemiesAll()) {
      if (!e.alive) continue;
      const np = e.nextParry();
      const early = PARRY_EARLY + (p.evolved ? 0.05 : 0) + (p.tree?.parryWin || 0) / 1000; // Red Riposte adds 50ms
      if (!np || np.tth < PARRY_LATE - slack || np.tth > early + slack) continue;
      if (e.distTo(p) > (np.h.range ?? 3) + p.radius + 0.8) continue;
      if (Math.abs(angDiff(e.yaw, e.yawTo(p.pos))) > (np.h.arc ?? 2) / 2 + 0.5) continue;
      out.push({ e, np });
    }
    return out.sort((a, b) => a.e.distTo(p) - b.e.distTo(p));
  }

  // faint white ring on attackers during their parry window (rogue only: knights block)
  makeParryCues() {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    g.strokeStyle = 'rgba(255,255,255,1)'; g.lineWidth = 5;
    g.beginPath(); g.arc(32, 32, 24, 0, Math.PI * 2); g.stroke();
    const tex = new THREE.CanvasTexture(c);
    this.parryCues = [];
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.5, depthTest: false }));
      s.renderOrder = 11; s.visible = false; this.scene.add(s); this.parryCues.push(s);
    }
  }

  updateParryCues() {
    const p = this.player;
    const list = p && p.alive && p.kind === 'rogue' && !(p.parryCd > 0) && this.mode === 'play' ? this.parryTargets(p) : [];
    this.parryCues.forEach((s, i) => {
      const t = list[i];
      s.visible = !!t;
      if (!t) return;
      const k = t.e.rig.root.scale.y;
      s.position.set(t.e.pos.x, t.e.y + 1.35 * k, t.e.pos.z);
      s.scale.setScalar(0.32 + 0.12 * k);
    });
  }

  impact(x, z, radius, shake) {
    if (this.mp.active && this.mp.isHost) this.mp.sendAll({ t: 'impact', x, z, r: radius, s: shake });
    this.fx.shockwave(x, z, radius);
    this.fx.dust({ x, z }, 14, radius * 0.8);
    this.fx.sparks({ x, y: 0.2, z }, null, 10, [1, 0.6, 0.25]);
    this.fx.scorch(x, z, radius * 0.4);
    this.fx.addShake(shake);
    this.audio.play('slam', Math.min(1, shake + 0.3));
  }

  spawnArrow(e) {
    const p = this.targetOf(e);
    const from = new THREE.Vector3(e.pos.x, 1.45, e.pos.z);
    const f = e.fwd();
    from.addScaledVector(f, 0.6);
    const to = new THREE.Vector3(p.pos.x, 1.1, p.pos.z);
    const dir = to.sub(from).normalize();
    // archers aim where they are facing (tracking stops just before release) — sidesteps work
    const flat = new THREE.Vector3(dir.x, 0, dir.z).normalize();
    if (Math.abs(angDiff(Math.atan2(flat.x, flat.z), e.yaw)) > 0.25) dir.set(f.x, dir.y, f.z).normalize();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.8), new THREE.MeshBasicMaterial({ color: 0xd8c8a0 }));
    mesh.position.copy(from);
    mesh.lookAt(from.clone().add(dir));
    this.scene.add(mesh);
    this.addProj({ kind: 'arrow', pos: from, vel: dir.multiplyScalar(18), life: 1.6, mesh, r: 0.3, dmg: 12 * e.dmgScale, elems: e.elems });
  }

  spawnFireWave(b, off) {
    const f = b.fwd().clone();
    for (const a of [-0.3, 0, 0.3]) {
      const d = f.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), a);
      const pos = new THREE.Vector3(b.pos.x + f.x * off, 0.3, b.pos.z + f.z * off);
      this.addProj({ kind: 'fire', pos, vel: d.multiplyScalar(10), life: 1.1, r: 0.85, dmg: 20 * b.dmgScale, mesh: null, elems: { fire: 0.4 } });
    }
    this.audio.play('fire');
  }

  // Gorrath's thrown boulder: arcs down toward where the player stands
  spawnRock(b) {
    const p = this.targetOf(b);
    const f = b.fwd();
    const from = new THREE.Vector3(b.pos.x + f.x * 1.2, 4.2, b.pos.z + f.z * 1.2);
    const to = new THREE.Vector3(p.pos.x, 0.6, p.pos.z);
    const dir = to.clone().sub(from).normalize();
    const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), this.world.mats.rockDark);
    mesh.position.copy(from); this.scene.add(mesh);
    this.addProj({ kind: 'rock', pos: from, vel: dir.multiplyScalar(15), life: 2, mesh, r: 0.95, dmg: 26 * b.dmgScale, knock: 'heavy', elems: b.elems, buildMul: b.elemBuild });
    this.audio.play('heavySwing', 1);
  }

  // shots are shown on every device; only their owner's device applies them
  addProj(q) {
    this.projectiles.push(q);
    if (!this.mp.active) return;
    const look = q.kind === 'arrow' ? 'arrow' : q.kind === 'rock' ? 'rock' : q.friendly ? q.kind : null;
    this.mp.sendAll({ t: 'proj', kind: q.kind, look, p: q.pos.toArray(), v: q.vel.toArray(), life: q.life, big: q.r });
  }

  addGhost(d) {
    let mesh = null;
    if (d.look === 'arrow') mesh = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.8), new THREE.MeshBasicMaterial({ color: 0xd8c8a0 }));
    else if (d.look === 'rock') mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), this.world.mats.rockDark);
    else if (d.look) { mesh = new THREE.Mesh(new THREE.SphereGeometry(d.big * 0.7, 10, 8), new THREE.MeshBasicMaterial({ color: d.look === 'bolt' ? 0x5ab0ff : 0xff7a1a })); mesh.visible = false; }
    const pos = new THREE.Vector3(...d.p), vel = new THREE.Vector3(...d.v);
    if (mesh) { mesh.position.copy(pos); if (d.look === 'arrow') mesh.lookAt(pos.clone().add(vel)); this.scene.add(mesh); }
    const q = { ghost: true, kind: d.kind, pos, vel, life: d.life, mesh };
    if (d.look === 'bolt' || d.look === 'fire') q.pfx = this.pfx.play(d.look === 'fire' ? (d.big > 0.8 ? 'bigFireball' : 'fireball') : 'bolt', pos, { follow: q });
    this.projectiles.push(q);
    if (d.look === 'bolt' || d.look === 'fire') this.audio.remote(d.look === 'fire' ? 'fire' : 'bow', 0.7);
  }

  // a hostile shot reaching a player on this device
  projectileHit(t, q) {
    const src = new THREE.Vector3(q.src[0], 0, q.src[1]);
    const r = t.receive({ dmg: q.dmg, poise: 20, knock: q.knock || 'light', srcPos: src, parryable: false, elems: q.elems, buildMul: q.buildMul });
    if (t.isRemote) return r;
    const chest = new THREE.Vector3(t.pos.x, 1.1, t.pos.z);
    if (r === 'hit') { this.audio.play('hurt'); this.mp.event({ k: 'hurt' }); this.fx.blood(chest, null, 8); this.pfx.play('hurt', chest, { dir: chest.clone().sub(src) }); this.hitstop(0.05); this.fx.addShake(0.3); }
    if (r === 'block') { this.audio.play('clang', 0.6); this.mp.event({ k: 'block' }); this.fx.sparks(chest, null, 8); }
    return r;
  }

  spawnSpell(p, kind, spread = 0, dmg = null) { // dmg: override (combo finishers' lances)
    const S = SPELLS[kind], big = kind === 'fire' && p.evolved ? 1.45 : 1;
    const f = p.fwd().clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), spread);
    const pos = new THREE.Vector3(p.pos.x + f.x * 0.8, 1.25, p.pos.z + f.z * 0.8);
    // the sphere only carries the shot; what you see is the pixelfx bolt or fireball riding on it
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(S.size * big, 10, 8), new THREE.MeshBasicMaterial({ color: S.color }));
    mesh.position.copy(pos); mesh.visible = false; this.scene.add(mesh);
    const q = { kind, friendly: true, pos, vel: f.multiplyScalar(S.speed), life: S.life, mesh, r: S.r * big, dmg: dmg ?? S.dmg, poise: S.poise, noKnock: !!S.noKnock, aoe: S.aoe ? S.aoe * big * (1 + (p.tree?.fireRadius || 0) / 100) : 0 };
    q.pfx = this.pfx.play(kind === 'fire' ? (big > 1 ? 'bigFireball' : 'fireball') : 'bolt', pos, { follow: q });
    this.addProj(q);
    this.audio.play(kind === 'fire' ? 'fire' : 'bow', 0.7);
  }

  spellDamage(q, e, mul = 1) {
    const hp0 = e.hp, sd = q.dmg * mul * this.player.dmgMul * (1 + (this.player.tree?.spellDmg || 0) / 100);
    const r = e.receive({ dmg: sd, poise: q.poise, srcPos: q.pos, attacker: this.player, noKnock: q.noKnock });
    if (r === 'none') return;
    // the bolt is frost, the fireball fire
    const el = q.kind === 'fire' ? 'fire' : 'frost', dealt = e.puppet ? sd : hp0 - e.hp;
    this.dmgPops(e, { [el]: dealt }, q.kind === 'fire' ? 'heavy' : 'me');
    this.fx.sparks(new THREE.Vector3(e.pos.x, 1.1 * e.rig.root.scale.y, e.pos.z), null, 8, q.kind === 'fire' ? [1, 0.6, 0.2] : [0.5, 0.75, 1]);
    this.audio.play(q.kind === 'fire' ? 'bigHit' : 'hit', 0.8);
    this.mp.event({ k: 'hit', id: e.netId, heavy: q.kind === 'fire', d: { [el]: Math.round(dealt) } });
    this.hitstop(q.kind === 'fire' ? 0.08 : 0.04);
    if (e.alive) this.applyStatus(e, { [el]: sd }, SPELL_BUILD);
  }

  // Blue bolts and fireballs fly straight; a fireball bursts on contact or at range.
  updateSpell(q, dt) {
    for (let i = 0; i < (q.kind === 'fire' ? 2 : 1); i++) {
      const b = q.kind === 'fire' ? [1, 0.45, 0.1] : [0.45, 0.7, 1];
      this.fx.add.spawn({ x: q.pos.x + (Math.random() - 0.5) * q.r, y: q.pos.y + (Math.random() - 0.5) * q.r, z: q.pos.z + (Math.random() - 0.5) * q.r, life: 0.3, size: q.r * 0.8, size1: 0.03, r: b[0], g: b[1], b: b[2] });
    }
    let dead = q.life <= 0 || !this.world.walkable(q.pos.x, q.pos.z, -0.5);
    let hit = null;
    if (!dead) for (const e of this.enemiesAll()) {
      if (e.alive && e.y < 1.5 && Math.hypot(q.pos.x - e.pos.x, q.pos.z - e.pos.z) < q.r + e.radius) { hit = e; dead = true; break; }
    }
    if (!dead) return false;
    if (q.pfx) this.pfx.kill(q.pfx);
    if (q.aoe) this.vfx('explosion', new THREE.Vector3(q.pos.x, 0, q.pos.z), q.aoe / 3);
    else this.vfx('boltHit', q.pos.clone());
    if (q.aoe) {
      this.fx.shockwave(q.pos.x, q.pos.z, q.aoe, 0xff8a30, 0.4);
      this.fx.burst(q.pos, 40, [1, 0.5, 0.1], 7, 0.7, 0.4);
      this.fx.addShake(0.35);
      for (const e of this.enemiesAll()) if (e.alive && Math.hypot(q.pos.x - e.pos.x, q.pos.z - e.pos.z) < q.aoe + e.radius) this.spellDamage(q, e);
    } else if (hit) this.spellDamage(q, hit);
    return true;
  }

  spawnFireRing(x, z, maxR, dur, dmg) {
    if (this.mp.active) this.mp.sendAll({ t: 'ring', x, z, maxR, dur });
    this.rings.push({ x, z, maxR, dur, dmg: dmg * (this.activeEnc?.boss.dmgScale || 1), t: 0, hit: new Set() });
    this.audio.play('fire');
  }

  updateProjectiles(dt) {
    const p = this.player;
    this.projectiles = this.projectiles.filter((q) => {
      q.life -= dt;
      q.pos.addScaledVector(q.vel, dt);
      if (q.mesh) q.mesh.position.copy(q.pos);
      if (q.ghost) {
        if (!q.mesh && q.kind === 'fire') for (let i = 0; i < 3; i++) this.fx.flame({ x: q.pos.x, y: 0.1, z: q.pos.z }, 1.1);
        const over = q.life <= 0;
        if (over && q.mesh) { this.scene.remove(q.mesh); q.mesh.geometry.dispose(); }
        if (over && q.pfx) this.pfx.kill(q.pfx);
        return !over;
      }
      if (q.friendly) {
        const over = this.updateSpell(q, dt);
        if (over) { this.scene.remove(q.mesh); q.mesh.geometry.dispose(); }
        return !over;
      }
      if (q.kind === 'fire') {
        for (let i = 0; i < 3; i++) this.fx.flame({ x: q.pos.x, y: 0.1, z: q.pos.z }, 1.1);
        if (Math.random() < dt * 20) this.fx.scorch(q.pos.x, q.pos.z, 0.7);
      }
      if (q.kind === 'rock') { q.mesh.rotation.x += dt * 8; q.mesh.rotation.z += dt * 5; }
      let dead = q.life <= 0 || !this.world.walkable(q.pos.x, q.pos.z, -0.5) || q.pos.y < 0.25;
      if (dead && q.kind === 'rock') this.impact(q.pos.x, q.pos.z, 1.6, 0.35);
      // the evolved spectral shield stops shots at the wall, ahead of the knight
      if (!dead) for (const t of this.allPlayers()) {
        const wall = t.spectral?.visible ? 0.75 : 0;
        if (!t.alive || Math.hypot(q.pos.x - t.pos.x, q.pos.z - t.pos.z) >= q.r + t.radius + wall) continue;
        const b = q.pos.clone().addScaledVector(q.vel, -0.1);
        if (this.projectileHit(t, { dmg: q.dmg, knock: q.knock, src: [b.x, b.z], elems: q.elems, buildMul: q.buildMul }) !== 'dodge') { dead = true; break; }
      }
      if (dead && q.mesh) { this.scene.remove(q.mesh); q.mesh.geometry.dispose(); }
      return !dead;
    });
    this.rings = this.rings.filter((g) => {
      g.t += dt;
      const r = g.maxR * Math.min(1, g.t / g.dur);
      for (let i = 0; i < 10; i++) {
        const a = Math.random() * Math.PI * 2;
        this.fx.flame({ x: g.x + Math.cos(a) * r, y: 0.1, z: g.z + Math.sin(a) * r }, 0.9);
      }
      if (!g.ghost) for (const t of this.allPlayers()) {
        if (g.hit.has(t) || !t.alive || Math.abs(Math.hypot(t.pos.x - g.x, t.pos.z - g.z) - r) >= 0.7) continue;
        if (this.projectileHit(t, { dmg: g.dmg, src: [g.x, g.z], elems: { fire: 0.4 } }) !== 'dodge') g.hit.add(t);
      }
      return g.t < g.dur;
    });
  }

  // ---------- frame ----------
  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    // the scene renders at about PIXEL_H game pixels tall; CSS scales the canvas up (see pixel.js)
    const px = this.pixel.setSize(w, h, window.devicePixelRatio || 1, PIXEL_H[this.settings?.quality] || PIXEL_H.medium);
    // 21:9 gets its full width; anything wider (32:9) keeps the 21:9 horizontal view
    const aspect = px.w / px.h, maxA = 2.4;
    this.camera.aspect = aspect;
    this.camera.fov = aspect > maxA ? 2 * Math.atan(Math.tan((48 / 2) * Math.PI / 180) * maxA / aspect) * 180 / Math.PI : 48;
    this.camera.updateProjectionMatrix();
    this.fx.setScale(px.h * 0.9 * (48 / this.camera.fov));
  }

  loop(now) {
    requestAnimationFrame((t) => this.loop(t));
    let rdt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (this.mode === 'play' || this.mode === 'title') {
      let dt = rdt;
      if (this.freeze > 0) { this.freeze -= rdt; dt = 0; }
      else if (this.slow > 0) { this.slow -= rdt; dt *= 0.35; }
      this.step(dt, rdt);
    }
    this.pixel.render(this.scene, this.camera);
  }

  step(dt, rdt) {
    this.time += dt;
    const presses = this.input.drain();
    const p = this.player;

    if (this.mode === 'play') {
      if (presses.has('pause')) { this.setPaused(true); return; }
      if (presses.has('lock') && p.alive) this.toggleLock();

      if (dt > 0) {
        if (!this.isGuest) { this.assignEngagement(); this.stepRooms(); }
        p.update(dt, this.input, presses);
        const zs = this.allPlayers().map((x) => x.pos.z);
        for (const e of this.enemies) {
          // distance culling: far enemies neither think nor draw
          const near = zs.some((z) => Math.abs(e.pos.z - z) < 42);
          e.rig.root.visible = near && !(e.state === 'dead' && e.t > 4.5);
          if (near) e.update(dt);
        }
        for (const b of this.bosses) {
          const near = zs.some((z) => Math.abs(b.pos.z - z) < 50);
          if (!near) b.rig.root.visible = false;
          else if (b.state !== 'dead') b.rig.root.visible = true;
          if (near) b.update(dt);
        }
        this.separate();
        this.updateProjectiles(dt);
        this.mp.tick(dt);
        this.stepRevive(dt);
      } else {
        // keep buffered inputs during hitstop
        for (const a of presses) if (a !== 'lock' && a !== 'pause' && a !== 'interact') p.push(a);
      }

      // standing over a downed teammate
      const down = this.mp.active && p.alive && p.state === 'move' ? [...this.mp.peers.values()].find((x) => !x.alive && p.distTo(x) < 2.4) : null;
      if (down) {
        this.ui.prompt(`${this.input.lastDevice === 'touch' ? 'Tap' : 'F'}: Revive ${down.name} (all lose 10% max health)`);
        if (presses.has('interact')) this.startRevive(down);
      } else if (performance.now() > (this.ui.smallT || 0)) this.ui.prompt(null);
      // trigger only once the player is fully inside the arena circle, so locking the
      // fog never leaves them standing on ground that just stopped being walkable
      if (!this.bossActive && !this.isGuest) for (const enc of this.encounters) {
        const A = enc.arena;
        if (!enc.defeated && this.allPlayers().some((t) => t.alive && Math.hypot(t.pos.x - A.x, t.pos.z - A.z) < A.r - 2)) { this.startEncounter(enc); break; }
      }
      // safety net: never let the player end up on non-walkable ground
      const enc = this.activeEnc;
      if (this.world.walkable(p.pos.x, p.pos.z, p.radius)) { (this.lastGood ||= p.pos.clone()).copy(p.pos); }
      else if (this.lastGood && this.world.walkable(this.lastGood.x, this.lastGood.z, p.radius)) p.pos.copy(this.lastGood);
      else if (enc) { p.pos.x += (enc.arena.x - p.pos.x) * 0.2; p.pos.z += (enc.arena.z - p.pos.z) * 0.2; }
      // area title when reaching a new module
      const m = this.world.moduleAt(p.pos.z);
      if (m.i > this.seenMod) { this.seenMod = m.i; this.ui.toast(m.name.toUpperCase(), 3); this.ui.setProgress(m.i + 1, this.world.mods.length); }

      this.ui.update(rdt, p);
      this.ui.party(this.mp.active ? [...this.mp.peers.values()] : []);
      if (enc) {
        this.ui.boss.set(enc.boss.hp / enc.boss.maxHp, rdt);
        this.ui.bossStatus(enc.boss.status.bars().map((b) => ({ v: b.v, color: STATUS[b.k].color })));
      }
      this.updateEnemyBars();
    }

    this.updateParryCues();
    this.world.update(dt, this.time, this.fx, this.player && this.mode !== 'title' ? this.player.pos : { x: 0, z: -4 });
    this.fx.update(dt);
    this.pfx.update(dt);
    tickOutfitColors(this.time); // effect colours on outfits (molten, frost, void, gilded)
    if (this.mode === 'play' || this.mode === 'wait') this.weaponFx.update(dt);
    this.updateCamera(rdt);
  }

  toggleLock() {
    const p = this.player;
    if (p.lock) { p.lock = null; return; }
    const mv = this.input.move();
    const aim = Math.hypot(mv.x, mv.y) > 0.2 ? Math.atan2(mv.x, -mv.y) : p.yaw;
    let best = null, bs = Infinity;
    for (const e of this.enemiesAll()) {
      if (!e.alive) continue;
      const d = p.distTo(e);
      if (d > 16) continue;
      const s = d + Math.abs(angDiff(aim, p.yawTo(e.pos))) * 4;
      if (s < bs) { bs = s; best = e; }
    }
    p.lock = best;
  }

  separate() {
    const all = [this.player, ...this.enemies.filter((e) => e.alive && Math.abs(e.pos.z - this.player.pos.z) < 30)];
    const enc = this.activeEnc;
    if (enc && enc.boss.alive && enc.boss.y < 1) all.push(enc.boss);
    const p = this.player;
    if (p.spectral?.visible) {
      // the spectral shield is a solid wall: enemies can't walk through it
      const f = p.fwd(), hw = p.spectralWidth / 2;
      const cx = p.pos.x + f.x * 0.75, cz = p.pos.z + f.z * 0.75;
      for (const e of all) {
        if (e === p) continue;
        const dx = e.pos.x - cx, dz = e.pos.z - cz, d = Math.hypot(dx, dz), m = hw + e.radius;
        if (d < m && d > 1e-4) e.move(dx / d * (m - d), dz / d * (m - d));
      }
    }
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
      const a = all[i], b = all[j];
      if (!a.alive && a !== this.player) continue;
      if (a === this.player && (a.state === 'dead')) continue;
      const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, d = Math.hypot(dx, dz), m = a.radius + b.radius;
      if (d < m && d > 1e-4) {
        const push = (m - d);
        // the boss and brutes are immovable for the player
        const wa = b.isBoss || b.type === 'brute' ? 1 : 0.5, wb = 1 - wa;
        a.move(-dx / d * push * wa, -dz / d * push * wa);
        b.move(dx / d * push * wb, dz / d * push * wb);
      }
    }
  }

  updateEnemyBars() {
    const list = [];
    const v = new THREE.Vector3();
    const w = window.innerWidth, h = window.innerHeight;
    for (const e of this.enemies) {
      if (!e.alive || (e.hpShow <= 0 && this.player.lock !== e && !e.status.bars().length)) continue;
      v.set(e.pos.x, 2.25 * e.rig.root.scale.y, e.pos.z).project(this.camera);
      if (v.z > 1) continue;
      list.push({ x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, v: e.hp / e.maxHp, status: e.status.bars().map((b) => ({ k: b.k, flash: b.flash, color: STATUS[b.k].color })) });
    }
    this.ui.enemyBars(list);
  }

  updateCamera(dt) {
    const cam = this.camera;
    if (this.mode === 'title' || !this.player) {
      const a = this.time * 0.08;
      const b = { x: 0, z: -8 };
      this.camPos.set(b.x + Math.sin(a) * 11, 7, b.z + Math.cos(a) * 11);
      cam.position.copy(this.camPos);
      cam.lookAt(b.x, 1, b.z);
      return;
    }
    const p = this.player;
    if (this.debugCam) {
      const d = this.debugCam, t = d.follow ? d.follow.pos : { x: 0, z: 0 };
      cam.position.set(t.x + d.off[0], d.off[1], t.z + d.off[2]); cam.lookAt(t.x, d.lookY ?? 1, t.z); return;
    }
    const aspect = cam.aspect;
    let dist = this.bossActive ? 1.22 : 1;
    if (aspect < 1.3) dist *= 1.35;
    const off = new THREE.Vector3(0, 10.5 * dist, 8.4 * dist);
    const focus = new THREE.Vector3(p.pos.x, 0.8, p.pos.z);
    if (p.lock && p.lock.alive) {
      const t = p.lock.pos;
      const d = Math.min(8, p.distTo(p.lock));
      const k = d / Math.max(0.01, p.distTo(p.lock));
      focus.x += (t.x - p.pos.x) * k * 0.4; focus.z += (t.z - p.pos.z) * k * 0.4;
    } else if (this.activeEnc && this.activeEnc.boss.alive) {
      const B = this.activeEnc.boss;
      focus.x += (B.pos.x - p.pos.x) * 0.22; focus.z += (B.pos.z - p.pos.z) * 0.22;
    } else if (p.vel) {
      focus.addScaledVector(p.vel, 0.18);
    }
    const want = focus.clone().add(off);
    const k = 1 - Math.exp(-5 * dt);
    this.camPos.lerp(want, k);
    this.camLook.lerp(focus, 1 - Math.exp(-7 * dt));
    const sh = this.fx.shakeOffset(new THREE.Vector3());
    cam.position.copy(this.camPos).add(sh);
    cam.lookAt(this.camLook.x + sh.x * 0.5, this.camLook.y, this.camLook.z - 0.6);

    // lock-on marker
    const L = p.lock;
    this.lockSprite.visible = !!(L && L.alive);
    if (L && L.alive) this.lockSprite.position.set(L.pos.x, L.y + 1.25 * L.rig.root.scale.y, L.pos.z);
  }
}

window.game = new Game();
