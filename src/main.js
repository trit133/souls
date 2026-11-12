import { NUM, migrateNumbers } from './scale.js';
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
import { Dungeon, mix } from './dungeon.js';
import { City } from './city.js';
import { AREAS } from './regions.js';
import { WorldMap } from './worldmap.js';
import { pickLayout } from './modules.js';
import { Seals } from './seals.js';
import { Chests } from './chests.js';
import { Minimap } from './minimap.js';
import { Player } from './player.js';
import { Enemy, NIGHT } from './enemies.js';
import { Boss, BOSS_MOVES, BOSSES } from './boss.js';
import { UI } from './ui.js';
import { angDiff } from './actor.js';
import { BOONS, rollBoons } from './boons.js';
import { STATUS } from './status.js';
import { OnlineAccounts } from './account.js';
import { Multiplayer } from './mp.js';
import { rng } from './world.js';
import { MINI_GOLD, BOSS_GOLD, extraEnemyShare, killGold, partyShare } from './progress.js';
const FULL_CLEAR_EMERALDS = 5; // for killing everything in a dungeon
import { wornOutfit, migrateCosmetics, cosmetics, tickOutfitColors } from './outfits.js';
import { treeStats, migrateUpgrades, migrateTree, TREE_VERSION } from './skilltree.js';
import { playerParts, enemyParts, scaleParts, sumParts, ELEMS, TYPES, TYPE_COLOR, BUILD_PER_DMG, SPELL_BUILD, rollElems, mitigate } from './damage.js';
import { TreeUI } from './treeui.js';
import { SkinMenu } from './skinmenu.js';
import { FireTitle } from './title.js';
import { attachCardFx } from './cardfx.js';
import { Home } from './home.js';
import { Hermitage } from './hermitage.js';
import { rollDefenses, enemyMitigate, enemyBuildMul, critRoll, RES_ELEMS } from './defenses.js';
import { ELITE } from './enemies.js';
import { currentRecord } from './records.js';
import { pixelMenus, syncRanges } from './pixelmenus.js';
import { LayoutEditor, applyLayout } from './touchlayout.js';
import { ACTIONS, DEFAULTS, normalize, loadGuest, saveGuest, keyLabel } from './settings.js';

// render no more than ~1080p worth of pixels; bigger screens (ultrawide, 4K) are upscaled

const $ = (id) => document.getElementById(id);
const HEART_CHANCE = 0.33, HEART_HEAL = 20 * NUM; // hearts: a third of enemies drop one, healing 20 (at the old size, like every number: scale.js)
const PARRY_EARLY = 0.23, PARRY_LATE = 0; // seconds before impact
const CHAR_NAMES = { knight: 'Templar', rogue: 'Shrike', mage: 'Adept' };
const MANA_PER_HIT = 10;
// player spells: little blue bolts, and exploding fireballs (bigger once evolved)
const SPELLS = {
  bolt: { dmg: 8 * NUM, speed: 17, life: 1.3, r: 0.35, size: 0.2, color: 0x5ab0ff, poise: 0, noKnock: true },
  fire: { dmg: 120 * NUM, speed: 12, life: 1.6, r: 0.7, size: 0.5, color: 0xff7a1a, poise: 69, aoe: 3 },
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

    this.hemi = new THREE.HemisphereLight(0x9aa6c8, 0x4a3a28, 2.0); this.scene.add(this.hemi);
    const sun = new THREE.DirectionalLight(0xffd8a8, 2.0);
    sun.position.set(-8, 14, 6); this.scene.add(sun); this.sun = sun;
    this.nightLights = null;

    this.input = new Input();
    document.documentElement.classList.toggle('phone', this.input.isPhone); // the phone layout (style.css html.phone)
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
    this.hearts = [];
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
    this.reserves = [];
    this.seals = new Seals(this);
    this.chests = new Chests(this);
    this.minimap = new Minimap(this);
    this.buildRun();

    this.bindUI();
    new FireTitle($('title-fire'), 'THE LAST CRUSADE');
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

  // A raid: one area off the world map (regions.js), picked there (the first area by default).
  // (?chain in the address plays the old chain of rooms instead, ?dungeon the old run of three dungeons and Varek:
  // the older test scripts use them)
  newLayout() {
    const q = new URLSearchParams(location.search), night = !!(this.nightRaid && this.nightUnlocked);
    if (q.has('chain')) return pickLayout();
    if (q.has('dungeon')) return night ? 'night' : 'dungeon';
    return { raid: AREAS[this.raidArea]?.open ? this.raidArea : 'r1a1', night };
  }

  // Night Raid unlocks (for the whole account) once you beat the second mini boss of a run
  get nightUnlocked() { return !!(this.accounts.user && this.accounts.data?.nightRaid); }
  refreshNight() {
    const on = this.nightUnlocked, label = `Night Raid: ${this.nightRaid && on ? 'On' : 'Off'}`;
    if (!on) this.nightRaid = false;
    for (const id of ['hm-night', 'lobby-night', 'wm-night']) {
      const b = $(id); if (!b) continue;
      if (id !== 'wm-night') b.classList.toggle('hidden', !on || (id === 'lobby-night' && !this.mp.isHost)); // (the map's own panel shows its toggle)
      b.classList.toggle('on', !!this.nightRaid);
      const lab = b.querySelector('.tile-t');
      if (lab?.plabel) lab.plabel.set(label); else if (lab) lab.textContent = label; else b.textContent = label;
    }
  }

  // Night Raid: near darkness; each player sees a 5 m cone ahead (and a faint glow round them), torches light
  // their surroundings, glowing eyes and fires show in the dark
  setNight(on) {
    // a faint cold moonlight: walls show as dark blue shapes, nothing more
    this.darkK = 0; // (a raid's dark places dim this again: darkLight)
    this.hemi.intensity = on ? 0.3 : 2.0;
    this.hemi.color.set(on ? 0x40507a : 0x9aa6c8); this.hemi.groundColor.set(on ? 0x08080a : 0x4a3a28);
    this.sun.intensity = on ? 0 : 2.0;
    this.world.nightLight = on ? { power: 0.3, range: 0.6 } : null; // torches, braziers and bonfires: 30% as bright, 60% the reach
    this.scene.background.set(on ? 0x040508 : 0x15130f);
    this.scene.fog.color.set(on ? 0x040508 : 0x1a1712);
    const cones = on || !!this.run?.raid; // (a raid has dark places too: houses, basements)
    if (cones && !this.nightLights) {
      // one cone and one glow per player (up to 3); added once, so shaders compile once
      this.nightLights = [0, 1, 2].map(() => {
        const cone = new THREE.SpotLight(0xffdcae, 0, 8, 1.05, 0.45, 1.2), glow = new THREE.PointLight(0xffc890, 0, 2.4, 1.5);
        this.scene.add(cone, cone.target, glow);
        return { cone, glow };
      });
    }
    if (!cones && this.nightLights) { for (const L of this.nightLights) this.scene.remove(L.cone, L.cone.target, L.glow); this.nightLights = null; }
  }

  updateNightLights() {
    if (!this.nightLights) return;
    const players = this.mode === 'title' ? [] : this.allPlayers(), D = this.world.dungeon;
    this.nightLights.forEach((L, i) => {
      const p = players[i];
      // at night always; in a raid by day, wherever that player is in the dark (a house, a basement)
      const want = !p ? 0 : this.night ? 1 : D?.darkAt?.(p.pos.x, p.pos.z) ? 1 : 0;
      L.k = (L.k || 0) + (want - (L.k || 0)) * 0.12;
      L.cone.intensity = p && p.alive !== false ? 17 * L.k : 0; L.glow.intensity = p ? 0.7 * L.k : 0;
      if (!p) return;
      const f = { x: Math.sin(p.yaw), z: Math.cos(p.yaw) };
      L.cone.position.set(p.pos.x - f.x * 1.2, 3.4, p.pos.z - f.z * 1.2); // from above and behind: lights the ground ahead, not you
      L.cone.target.position.set(p.pos.x + f.x * 4, 0, p.pos.z + f.z * 4);
      L.glow.position.set(p.pos.x, 1.4, p.pos.z);
    });
  }

  // a party fights 15% / 30% more regular enemies, placed near the originals
  extraSpawns(players, seed) {
    const share = extraEnemyShare(players), pool = this.world.spawns.filter((s) => s.type !== 'brute' && !s.o.reserve && !s.o.effigy && !s.o.elite);
    const r = rng(seed + 7), out = [];
    for (let i = 0, n = Math.round(pool.length * share); i < n; i++) {
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

  // layout: 'dungeon' for a run of dungeons, or a list of module keys (a chain, as the tests use)
  buildRun(layout = this.newLayout(), seed = (Math.random() * 1e9) | 0, players = 1) {
    this.runSeed = seed; this.runPlayers = players;
    if (layout?.raid) {
      // a raid: one hand-built area, its shrines and its boss (city.js)
      const area = AREAS[layout.raid];
      this.run = { raid: area.id, night: !!layout.night, minis: [area.boss] };
      this.act = 0;
      return this.buildLevel({ dungeon: new City(seed, area, players) }, seed, players);
    }
    if (layout === 'dungeon' || layout === 'night') {
      const r = rng(mix(seed + 3)), minis = ['hask', 'vael', 'gorrath'];
      for (let i = 2; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [minis[i], minis[j]] = [minis[j], minis[i]]; }
      this.run = { minis, night: layout === 'night' };
      return this.buildAct(0);
    }
    this.run = null; this.act = 0; this.night = false;
    this.buildLevel(layout, seed, players);
  }

  // act 0-2: a dungeon ending in that act's mini boss; act 3: the approach and Varek's throne
  buildAct(n) {
    this.act = n;
    const seed = this.runSeed + n * 7919;
    this.buildLevel(n < 3 ? { dungeon: new Dungeon(seed, n, this.run.minis[n], this.runPlayers) } : ['gate', 'boss'], seed, this.runPlayers);
  }

  buildLevel(layout, seed, players) {
    for (const e of [...this.enemies, ...this.reserves]) e.remove();
    for (const b of this.bosses) b.remove();
    this.projectiles.forEach((p) => this.scene.remove(p.mesh)); this.projectiles = []; this.pfx?.clear(); this.rings = [];
    this.clearHearts();
    this.layout = layout;
    this.portal = null;
    this.night = !!this.run?.night;
    this.setNight(this.night);
    this.world.build(layout, seed);
    // tier = mini bosses passed before a module (in a run of dungeons, the act); everything after them is stronger
    const tierAt = this.run ? () => this.act : (i) => layout.slice(0, i).filter((k) => k.startsWith('mini:')).length;
    const spawns = [...this.world.spawns, ...this.extraSpawns(players, seed)];
    const all = spawns.map((s) => (s.enemy = new Enemy(this, s.type, s.x, s.z, s.yaw, { ...s.o, mod: s.mod, tier: tierAt(s.mod), players, night: this.night })));
    for (const e of all) e.roam = this.world.dungeon?.roam(e.mod) ?? null;
    this.enemies = all.filter((e) => !e.reserve);
    this.reserves = all.filter((e) => e.reserve); // seal events call these in (seals.js)
    this.clearTotal = this.enemies.filter((e) => !e.event && !e.effigy).length; this.clearKilled = 0; this.clearPaid = false;
    this.encounters = this.world.encounters;
    this.bosses = this.encounters.map((enc) => {
      enc.boss = new Boss(this, enc.kind === 'mini' ? BOSSES[enc.bossId] : BOSSES.varek, enc.arena, enc.mod, tierAt(enc.mod), players);
      enc.boss.enc = enc;
      if (this.night) { enc.boss.maxHp = enc.boss.hp = Math.round(enc.boss.maxHp * NIGHT.hp); enc.boss.dmgScale *= NIGHT.dmg; } // bosses too, at night
      return enc.boss;
    });
    this.boss = this.encounters.find((e) => e.kind === 'boss')?.boss || null;
    // stable ids shared by every device in a party; guests' copies are host-driven puppets
    this.netMap = {};
    const puppet = this.mp?.active && !this.mp.isHost;
    all.forEach((e, i) => { e.netId = i; e.puppet = puppet; this.netMap[i] = e; });
    this.bosses.forEach((b, i) => { b.netId = 1000 + i; b.puppet = puppet; this.netMap[1000 + i] = b; });
    // regular enemies carrying elemental damage: more of them the further into the run (same roll on every device)
    const er = rng(seed + 13);
    for (const e of all) e.setElems(rollElems(e.tier, er));
    // armour and resistances (defenses.js): every enemy and boss rolls its own, the same on every device
    const dr = rng(seed + 29);
    for (const e of all) e.def = e.effigy ? { armor: 0, res: {}, crit: 0, critDmg: 0 } : rollDefenses(dr, { type: e.type, elite: !!e.elite, tier: e.tier });
    for (const b of this.bosses) b.def = rollDefenses(dr, { boss: b.cfg.id, tier: b.tier });
    this.tokens = 0;
    this.resetEncounters();
    this.seals.setup(this.world);
    this.chests.setup(this.world);
    this.minimap.setup(this.world);
  }

  // the menus' music: the record in the jukebox (records.js)
  titleSong() { return currentRecord(this.accounts.user ? this.accounts.data : null).song; }

  // the share of a dungeon's enemies killed (not counting ones called in by seals)
  clearPct() { return this.clearTotal ? Math.min(100, Math.floor(this.clearKilled / this.clearTotal * 100)) : 0; }
  get areaName() { return this.world.dungeon ? this.world.dungeon.def.name : this.world.mods[0]?.name || ''; }

  // a seal calls in an enemy that was waiting off stage (the host tells the party which, and where)
  activateReserve(e, x, z) {
    if (!e.reserve) return;
    e.reserve = false;
    this.reserves = this.reserves.filter((r) => r !== e);
    this.enemies.push(e);
    e.pos.set(x, 0, z); e.home = { x, z, yaw: e.yaw }; e.rig.root.visible = true;
    this.pfx?.play('poof', e.pos.clone().setY(0.4), { size: 1.3 });
    this.fx.burst({ x, y: 1, z }, 16, [0.6, 0.2, 0.8], 3, 0.6, 0.25);
    if (!this.isGuest) { e.alertDelay = 0.35; if (this.mp.active) this.mp.sendAll({ t: 'rsv', id: e.netId, x: Math.round(x * 100) / 100, z: Math.round(z * 100) / 100 }); }
  }

  // into the next act: the world is rebuilt round the party, who keep everything they carry
  enterAct(n) {
    if (!this.run || n === this.act || n > 3) return;
    this.buildAct(n);
    const p = this.player;
    p.pos.set(this.world.start.x, 0, this.world.start.z); p.lock = null; p.kb.set(0, 0, 0);
    if (!p.alive) p.revive(0.5);
    this.lastGood = null;
    this.roomGold = {}; this.roomKills = {};
    this.seenMod = n;
    this.camPos.set(p.pos.x, 14, p.pos.z + 12);
    this.ui.setProgress(n + 1, 4);
    this.audio.play('fog');
    this.audio.ambience(this.night ? 'night' : 'day', n);
    this.ui.toast(this.areaName.toUpperCase(), 3);
  }

  // the stair down out of a beaten mini boss's arena: anyone can take the party on
  descend() {
    if (!this.portal || this.act >= 3) return;
    if (this.mp.active && this.isGuest) { this.mp.send({ t: 'descend' }); return; }
    const n = this.act + 1;
    if (this.mp.active) this.mp.sendAll({ t: 'act', n });
    this.enterAct(n);
  }

  // a raid's stairs: down into a basement or back up (each player goes alone; the party sees you blink across)
  takeStair(s) {
    const p = this.player;
    p.pos.set(s.to.x, 0, s.to.z); p.vel.set(0, 0, 0); p.lock = null;
    this.lastGood = null;
    this.camPos.set(p.pos.x, 14, p.pos.z + 12); this.camLook.set(p.pos.x, 0.8, p.pos.z);
    this.audio.play('roll', 0.6);
    this.ui.toastSmall(s.name.toUpperCase());
  }

  // in a raid's dark places (under a roof, underground) the daylight goes, as at night: you see by your cone and
  // the lamps; back out in the open it returns
  darkLight(dt) {
    const D = this.world.dungeon;
    if (!D?.darkAt || this.night) return;
    const dark = this.player && D.darkAt(this.player.pos.x, this.player.pos.z) ? 1 : 0;
    const k = (this.darkK = (this.darkK || 0) + (dark - (this.darkK || 0)) * Math.min(1, dt * 4));
    this.hemi.intensity = 2.0 - 1.72 * k; this.sun.intensity = 2.0 * (1 - k);
    (this._sky ||= [new THREE.Color(0x9aa6c8), new THREE.Color(0x40507a), new THREE.Color(0x1a1712), new THREE.Color(0x040508)]);
    this.hemi.color.lerpColors(this._sky[0], this._sky[1], k);
    this.scene.fog.color.lerpColors(this._sky[2], this._sky[3], k);
  }

  openPortal(enc) {
    const A = enc.arena, group = this.world.mods[enc.mod].group;
    const g = new THREE.Group(); g.position.set(A.x, 0, A.z);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.6, 24), new THREE.MeshBasicMaterial({ color: 0x050708 }));
    disc.rotation.x = -Math.PI / 2; disc.position.y = 0.05; g.add(disc);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.6, 1.95, 32), new THREE.MeshBasicMaterial({ color: 0x7ae0ff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; g.add(ring);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 7, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0x7ae0ff, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.y = 3.5; g.add(beam);
    group.add(g);
    this.portal = { x: A.x, z: A.z, g, ring };
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
    $('resume').addEventListener('click', () => this.setPaused(false));
    $('restart').addEventListener('click', () => this.toTitle());
    const readyOr = (btn, solo) => () => {
      if (!this.mp.active) return solo();
      $(btn).disabled = true;
      this.mp.setReady();
    };
    $('again').addEventListener('click', readyOr('again', () => (this.run?.raid ? this.backToMap() : this.toTitle())));
    $('retry').addEventListener('click', readyOr('retry', () => { this.audio.unlock(); this.start(this.kind); }));
    $('go-title').addEventListener('click', () => this.toTitle());
    // after a run: solo opens the upgrade shop here; a party goes back to the room's lobby (upgrades inside)
    for (const id of ['go-lobby', 'victory-lobby']) $(id).addEventListener('click', () => this.afterRunLobby());
    $('btn-settings').addEventListener('click', () => this.openSettings());
    this.hermitage = new Hermitage(this);
    this.worldMap = new WorldMap(this);
    $('btn-herm').addEventListener('click', () => { this.audio.unlock(); this.hermitage.open(); });
    $('lobby-night').addEventListener('click', () => { this.nightRaid = !this.nightRaid; this.refreshNight(); });
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
    $('shop-back').addEventListener('click', () => { this.ui.show('shop', false); this.refreshTitle(); this.renderLobby(); });
    $('acct-back').addEventListener('click', () => { this.ui.show('account', false); if (this.hermitage) this.hermitage.pending = false; });
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
    // browsers hold sound back until the first tap or key: the title theme starts there
    const firstGesture = () => {
      this.audio.unlock();
      if (!this.audio.ctx) return;
      if (this.mode === 'title' || this.mode === 'lobby') this.audio.titleMusic(this.titleSong());
      for (const ev of ['click', 'touchend', 'keydown']) removeEventListener(ev, firstGesture, true);
    };
    for (const ev of ['click', 'touchend', 'keydown']) addEventListener(ev, firstGesture, true);
    // resume audio on any touch (iOS suspends it when backgrounded)
    addEventListener('touchstart', () => this.audio.ctx && this.audio.ctx.state !== 'running' && this.audio.unlock(), { passive: true });
  }

  // the world map (worldmap.js) over the Sanctum: pick an area and the raid begins
  openWorldMap() {
    this.audio.unlock();
    this.worldMap.open((id) => { this.raidArea = id; this.hermitage.begin(); });
  }
  backToMap() {
    this.toTitle();
    this.hermitage.open(this.kind);
    if (this.hermitage.active) this.openWorldMap();
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
    if (this.hermitage?.active) this.hermitage.close(false);
    if (this.player) this.player.remove();
    this.overShown = false;
    this.kind = kind;
    if (party) this.buildRun(party.layout, party.seed, party.players); else this.buildRun();
    this.waitingOnParty = false; this.reviving = null;
    this.respawnAt = this.run ? { ...this.world.start } : { x: 0, z: -2.5 };
    this.player = new Player(this, kind, this.respawnAt.x, this.respawnAt.z, this.accounts.user ? treeStats(kind, this.accounts.data) : {});
    this.runGold = 0; this.minisFelled = 0; this.secGold = [0, 0, 0, 0]; this.roomGold = {}; this.roomKills = {};
    this.runBanked = 0; this.bankedKeys = new Set();
    this.ui.setRunGold(0);
    $('run-gold').title = 'Gold banked to your account this run';
    if (this.accounts.data) { this.accounts.data.stats.runs++; this.accounts.save(); }
    this.ui.setBoons([]);
    this.ui.setProgress(1, this.run ? 4 : this.world.mods.length);
    $('progress').classList.toggle('hidden', !!this.run?.raid);
    document.querySelector('#victory .banner').textContent = 'THE LAST SENTINEL FALLS';
    this.minimap.el.classList.toggle('touch', this.input.isTouch);
    this.ui.show('gameover', false); this.ui.show('reward', false);
    this.lastGood = null;
    this.seenMod = 0;
    this.deaths = 0;
    this.startTime = this.time;
    this.mode = 'play';
    this.audio.ambience(this.night ? 'night' : 'day', this.act);
    this.ui.setMaxHp(this.player.maxHp, this.player.maxSt);
    this.ui.hp.snap(1); this.ui.st.snap(1);
    $('b-special').textContent = { knight: 'BLOCK', rogue: 'PARRY', mage: 'FIRE' }[kind];
    $('b-heavy').textContent = kind === 'mage' ? 'BOLT' : 'R2';
    document.querySelector('.bar.mn').classList.toggle('hidden', kind !== 'mage');
    this.ui.show('menu', false); this.ui.show('hud'); this.ui.show('victory', false); this.ui.show('death', false);
    this.ui.show('touch', this.input.isTouch);
    this.camPos.set(this.player.pos.x, 14, this.player.pos.z + 12);
    this.ui.toast((this.night ? 'NIGHT RAID · ' : '') + this.areaName.toUpperCase(), 3);
    this.input.reset();
  }

  toTitle() {
    this.mode = 'title';
    $('retry').textContent = 'Try Again'; $('again').textContent = 'Play Again';
    if (this.mp.active || this.mp.code) this.mp.leave();
    this.audio.titleMusic(this.titleSong());
    this.ui.show('pause', false); this.ui.show('victory', false); this.ui.show('death', false);
    this.ui.show('gameover', false); this.ui.show('reward', false);
    this.ui.show('hud', false); this.ui.show('touch', false); this.ui.show('menu');
    this.ui.prompt(null);
    this.ui.enemyBars([]);
    this.refreshTitle();
    if (this.accounts.user) this.hermitage.open(this.kind); // back to the hideout
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
      this.world.setGate(enc.gateIn, !enc.sealed, true); // fog you can walk through (a dungeon's door stays shut until its seals break)
      if (enc.gateOut) this.world.setGate(enc.gateOut, false, true);
    }
    this.ui.show('boss', false);
    this.audio.stopMusic();
    this.projectiles.forEach((p) => this.scene.remove(p.mesh)); this.projectiles = []; this.pfx?.clear();
    this.rings = []; this.clearHearts();
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
    $('kb-help').innerHTML = `<b>Keyboard:</b> ${k('up')} ${k('left')} ${k('down')} ${k('right')} move · ${k('sprint')} sprint · ${k('roll')} roll · ${k('attack')} attack · ${k('heavy')} heavy · ${k('special')} block/parry · ${k('heal')} inject · ${k('lock')} lock-on · ${k('interact')} interact · ${k('pause')} pause`;
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
    // gold from before the numbers grew ×10 (scale.js): first, so later refunds are already in the new size
    if (A.user && A.data && migrateNumbers(A.data)) A.save();
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
    this.refreshNight();
    // signed out: only the sign-in tile; signed in: the menu (or the character select, if that was open)
    this.home ||= new Home(this); // (bindUI refreshes the title before the constructor gets here)
    this.home.setGold(A.user ? A.data.gold : null);
    this.home.show(!A.user ? 'out' : this.home.view === 'out' ? 'in' : this.home.view);
    // signing in from the Hermitage tile carries on into the Hermitage
    if (this.hermitage) {
      this.hermitage.refresh();
      if (!A.user && this.hermitage.active) this.hermitage.close(); // signed out: back to the title
      if (A.user && this.hermitage.pending) { this.hermitage.pending = false; this.ui.show('account', false); this.hermitage.open(); }
    }
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
    // Second Wind (Knight notable): a kill heals the one who landed it
    const p = this.player, kh = p?.tree?.killHeal;
    if (kh && p.alive && e.lastHitBy === p) p.hp = Math.min(p.maxHp, p.hp + p.maxHp * kh / 100);
    if (this.isGuest) return;
    // solo: your kill. A party shares each room's kills when it's cleared (see openRoom)
    if (this.mp.active) this.roomKills[e.mod] = (this.roomKills[e.mod] || 0) + 1;
    else if (!e.effigy) this.creditKill(e);
    // gold for the kill (progress.js), the same for everyone in the party; Night Raid doubles half of them
    let n = e.vanished ? 0 : killGold(e); // (a held circle's leftovers fade away: no gold or hearts)
    if (this.night && n && Math.random() < 0.5) n *= 2;
    if (n) { this.earnKill(n, e); if (this.mp.active) this.mp.sendAll({ t: 'kgold', n, id: e.netId }); }
    // a third of enemies drop a heart (the host decides and tells the party)
    if (!e.effigy && !e.vanished && Math.random() < HEART_CHANCE) {
      const id = `h${this.heartN = (this.heartN || 0) + 1}`;
      this.spawnHeart(e.pos.x, e.pos.z, id);
      if (this.mp.active) this.mp.sendAll({ t: 'heart', x: e.pos.x, z: e.pos.z, id });
    }
    if (this.world.dungeon && !e.event && !e.effigy) {
      this.clearKilled++;
      if (this.mp.active) this.mp.sendAll({ t: 'prog', k: this.clearKilled });
      if (this.clearKilled >= this.clearTotal) this.fullClear();
    }
  }

  // ---------- hearts ----------
  // a red pixel heart that bobs where an enemy fell; walk over it (when hurt) to heal HEART_HEAL. In a party the
  // first to reach it takes it
  heartTex() {
    if (this._heartTex) return this._heartTex;
    const rows = ['.##...##.', '####.####', '#########', '#########', '.#######.', '..#####..', '...###...', '....#....'];
    const c = document.createElement('canvas'); c.width = 11; c.height = 10; const x = c.getContext('2d');
    rows.forEach((r, y) => [...r].forEach((ch, i) => { if (ch !== '#') return; x.fillStyle = '#5a0a0e'; x.fillRect(i + 1, y + 1, 1, 1); }));
    rows.forEach((r, y) => [...r].forEach((ch, i) => { if (ch !== '#') return; x.fillStyle = (y < 2 && i < 3) ? '#ff9a9a' : '#e0202a'; x.fillRect(i, y, 1, 1); }));
    const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
    return (this._heartTex = t);
  }
  spawnHeart(x, z, id) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.heartTex(), transparent: true, depthWrite: false }));
    s.scale.set(0.55, 0.5, 1); s.position.set(x, 0.6, z); this.scene.add(s);
    this.hearts.push({ id, x, z, s, t: Math.random() * 6 });
  }
  takeHeart(id, net = false) {
    const i = this.hearts.findIndex((h) => h.id === id);
    if (i < 0) return;
    const [h] = this.hearts.splice(i, 1);
    this.scene.remove(h.s); h.s.material.dispose();
    if (!net && this.mp.active) this.mp.sendAll({ t: 'heartTaken', id });
  }
  clearHearts() { for (const h of this.hearts || []) { this.scene.remove(h.s); h.s.material.dispose(); } this.hearts = []; }
  updateHearts(dt) {
    const p = this.player;
    for (const h of [...this.hearts]) {
      h.t += dt; h.s.position.y = 0.6 + Math.sin(h.t * 3) * 0.12;
      if (!p?.alive || p.hp >= p.maxHp || Math.hypot(p.pos.x - h.x, p.pos.z - h.z) > 1.1) continue;
      const got = Math.min(HEART_HEAL, p.maxHp - p.hp);
      p.hp += got;
      this.statusPopup(p, `+${Math.round(got)}`, '#ff6a6a');
      this.audio.play('heal', 0.6);
      this.fx.burst({ x: h.x, y: 0.7, z: h.z }, 10, [1, 0.3, 0.3], 2.5, 0.6, 0.15);
      this.takeHeart(h.id);
    }
  }

  // a kill's gold (solo all of it; in a party everyone gets a share of every kill), banked at once
  earnKill(n, e) {
    const share = this.mp.active ? partyShare(this.runPlayers || this.mp.members.length || 2) : 1, g = Math.round(n * share);
    if (!g) return;
    this.runBanked += g;
    this.ui.setRunGold(this.runBanked);
    if (e) this.statusPopup(e, `+${g}`, '#e8c25a');
    const A = this.accounts;
    if (A.data) {
      A.data.gold += g; A.data.stats.goldEarned += g;
      clearTimeout(this.goldSave); this.goldSave = setTimeout(() => A.save(), 1500); // (saved a moment after the last kill)
    }
  }

  // every enemy in the dungeon dead: emeralds for everyone
  fullClear(net = false) {
    if (this.clearPaid) return;
    this.clearPaid = true; this.clearKilled = this.clearTotal;
    if (!net && this.mp.active) this.mp.sendAll({ t: 'clear100' });
    this.addEmeralds(FULL_CLEAR_EMERALDS);
    this.ui.toast(`SECTOR PURGED · +${FULL_CLEAR_EMERALDS} EMERALDS`, 3.5);
    this.audio.play('victory');
  }

  addEmeralds(n) {
    const d = this.accounts.data;
    if (!d || !this.accounts.user) return;
    cosmetics(d).emeralds += n;
    this.ui.emeralds?.(d.emeralds);
    this.accounts.save();
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

  sameRoom(e, p) {
    const m = this.world.moduleAt(p.pos.x, p.pos.z).i;
    return e.roam ? e.roam.has(m) : m === e.mod;
  }

  // open a room's exit once all of its enemies are dead (host / solo decide). In a dungeon there are no exits:
  // each chamber pays its gold once everything in it (and anything its seal might still call in) is dead
  stepRooms() {
    if (this.world.dungeon) {
      for (const m of this.world.mods) {
        if (m.cleared || (!m.cell && !m.zone) || this.enemies.some((e) => e.alive && e.mod === m.i) || this.reserves.some((e) => e.mod === m.i)) continue;
        m.cleared = true;
        const n = this.roomGold[m.i] || 0, k = this.roomKills[m.i] || 0;
        this.roomGold[m.i] = 0; this.roomKills[m.i] = 0;
        if (!n && !k) continue;
        if (n) this.addRunGold(n);
        this.openRoom(m.i, n, k);
        if (this.mp.active) this.mp.sendAll({ t: 'room', i: m.i, n, k });
      }
      return;
    }
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
    this.bankNow(n, 'room' + this.act + ':' + i);
    if (this.world.dungeon) { if (n) this.ui.toastSmall(`Chamber cleared · ◆ +${n}`); return; }
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
      if (!e.engaged) { e.engagedTo = null; if (was) e.watchCd = e.watchGap(); }
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
    this.audio.ambience(null);
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
        this.run?.raid ? `Fell in ${this.areaName} · shrines broken ${Math.min(3, this.seals.broken)}/3` : this.run ? `Reached ${this.areaName} (${this.act + 1} of 4)` : `Reached area ${this.seenMod + 1} of ${this.world.mods.length} — ${this.world.mods[this.seenMod].name}`,
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
    $('again').textContent = party ? 'Ready Up' : this.run?.raid ? 'Back to Map' : 'Play Again';
    $('go-lobby').textContent = $('victory-lobby').textContent = party ? 'Lobby & Skill Trees' : 'Skill Trees';
    $('go-lobby').classList.toggle('hidden', !party && !this.accounts.user);
    $('victory-lobby').classList.toggle('hidden', !party && !this.accounts.user);
    $('again').disabled = false;
    $('victory-ready').textContent = '';
    this.mp.ready.clear();
  }

  afterRunLobby() {
    this.audio.titleMusic(this.titleSong());
    if (!this.mp.active) { this.treeUI.open(this.kind); return; }
    this.mode = 'lobby';
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
    this.refreshNight();
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
    lock.textContent = mageOpen ? 'Hits build mana · cryo lance & plasma' : 'Locked · tap to unlock in Skill Trees';
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
    cards.push({ key: 'rest', rest: true, name: 'Rest', desc: `Restore all vital function (${Math.round(p.hp)}/${p.maxHp}) and refill your injectors (${p.flasks}/${p.maxFlasks}).` });
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
    // a boss pays everyone in the party its full drop (double at night)
    let drop;
    if (net && this.isGuest) drop = net.drop || 0;
    else { drop = (enc.kind === 'mini' ? MINI_GOLD[section] : BOSS_GOLD) * (this.night ? 2 : 1); this.addRunGold(drop, enc.boss); }
    this.bankNow(drop, 'boss' + this.encounters.indexOf(enc));
    return { drop, bonus: 0 };
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
      if (this.minisFelled >= 2 && this.accounts.user && this.accounts.data && !this.accounts.data.nightRaid) {
        this.accounts.data.nightRaid = true; this.accounts.save();
        setTimeout(() => this.ui.toast('NIGHT RAID UNLOCKED', 3), 4800);
      }
      this.announceBossDeath(enc, pay);
      if (enc.raid) { this.raidComplete(enc); return; } // a raid ends with its boss
      // the way on opens right away (in a dungeon: a stair down in the arena); fanfare, then the reward choice
      this.world.setGate(enc.gateIn, true, false);
      if (enc.gateOut) this.world.setGate(enc.gateOut, true, false);
      if (enc.dungeon && this.act < 3) this.openPortal(enc);
      if (this.mp.active && !this.player.alive && this.mode === 'play') {
        this.player.revive(0.5);
        this.mp.sendAll({ t: 'up' });
        this.ui.toast('BACK ON YOUR FEET', 2);
      }
      setTimeout(() => {
        if (this.mode !== 'play' || !this.player.alive) return;
        this.audio.play('victory');
        this.audio.calm();
        this.ui.toast('THE HERETIC IS PURGED', 2);
        this.ui.show('boss', false);
        setTimeout(() => this.mode === 'play' && this.player.alive && this.offerReward(), 1300);
      }, 2000);
      return;
    }
    this.audio.ambience(null);
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

  // the raid's boss is dead: the area is won (gold banked as it came), then back to the map
  raidComplete(enc) {
    this.world.setGate(enc.gateIn, true, false);
    this.projectiles.forEach((p) => this.scene.remove(p.mesh)); this.projectiles = []; this.pfx?.clear(); this.rings = [];
    if (this.mp.active && !this.player.alive && this.mode === 'play') { this.player.revive(0.5); this.mp.sendAll({ t: 'up' }); }
    const d = this.accounts.data;
    if (d) { d.raids = d.raids || {}; d.raids[this.run.raid] = (d.raids[this.run.raid] || 0) + 1; this.accounts.save(); }
    setTimeout(() => {
      if (this.mode !== 'play') return;
      this.audio.play('victory');
      this.audio.ambience(null);
      const s = Math.round(this.time - this.startTime);
      document.querySelector('#victory .banner').textContent = `${this.areaName.toUpperCase()} IS PURGED`;
      $('victory-stats').innerHTML = `${enc.boss.name.split(',')[0]} has fallen  ·  ${CHAR_NAMES[this.kind]}<br>Time ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}  ·  ${this.clearPct()}% of the ward cleared<br>Banked this raid: ◆ ${this.runBanked}${this.accounts.user ? '' : ' (guest: not saved)'}`;
      this.showRetry();
      this.ui.show('victory');
      this.ui.show('boss', false);
      this.mode = 'over';
    }, 2600);
  }

  announceBossDeath(enc, pay) {
    if (this.mp.active && this.mp.isHost) this.mp.sendAll({ t: 'bossdead', i: this.encounters.indexOf(enc), ...pay });
  }

  // ---------- combat resolution ----------
  resolveHit(att, tg, h, def) {
    const info = { // (moves are written at the old size: scale.js)
      dmg: h.dmg * NUM, poise: h.poise, knock: h.knock, srcPos: att.pos, attacker: att, hit: h,
      parryable: !!(h.parry ?? def.parry), unblockable: !!def.unblockable,
    };
    if (att !== this.player) { info.dmg *= att.dmgScale || 1; info.elems = att.elems; info.buildMul = att.elemBuild ?? 1; }
    if (h.pctHp) { info.dmg = (tg.maxHp || 100) * h.pctHp; info.elems = null; } // a share of the target's health, pure force (the hold burst)
    // an enemy's critical hit (its rolled chance and bonus: defenses.js)
    else if (att !== this.player) { const cm = critRoll(att.def?.crit, att.def?.critDmg); if (cm > 1) { info.dmg *= cm; info.crit = true; } }
    if (att === this.player && def.comboMove) info.combo = true; // a combo hit: can hold a weak enemy (hold.js)
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
        if (info.crit) this.critTaken(tg);
      }
      if (h.knockback && (r === 'hit' || r === 'block') && !tg.comboArmored() && !tg.chargeArmored()) tg.kb.copy(dir).multiplyScalar(h.knockback); // (no shove mid-combo or mid charge)
      return;
    }
    if (att === this.player) {
      // skill tree: flat damage, knife and counter bonuses, stun buildup
      // the weapon is physical; the tree and Infusions add each damage type
      const T = att.tree || {};
      let mul = att.dmgMul * (att.c.caster ? 1 + (T.knifeDmg || 0) / 100 : 1) * (def === att.c.attacks.guardCounter ? 1 + (T.counter || 0) / 100 : 1);
      // notables and keystones (skilltree.js)
      const heavyMove = !!(def.finisher || def.heavyHit || def === att.c.attacks.heavy);
      mul *= this.treeMul(T, att, tg);
      if (T.finisherPct && def.finisher) mul *= 1 + T.finisherPct / 100;
      if (T.headsman) mul *= heavyMove ? 1.4 : 0.8;
      if (T.spellblade && att.c.caster) mul *= 0.8; // Spellblade: the knife is weaker
      info.parts = scaleParts(playerParts(T, att.statusLv, info.dmg), mul);
      // some combo moves turn part of the weapon's physical damage into an element (Rimeblade, Shatter: frost)
      if (def.convert) for (const [k, sh] of Object.entries(def.convert)) { info.parts[k] = (info.parts[k] || 0) + info.parts.phys * sh; info.parts.phys *= 1 - sh; }
      if (T.emberOath) { info.parts.fire = (info.parts.fire || 0) + info.parts.phys * 0.5 * (1 + (T.firePct || 0) / 100); info.parts.phys *= 0.5; } // Ember Oath: half the steel burns
      for (const [k, m] of Object.entries(this.elemMul(T))) if (info.parts[k]) info.parts[k] *= m; // Plaguelord, Pyromania, Rime Heart
      if (T.counterSt && def === att.c.attacks.guardCounter) att.st = Math.min(att.maxSt, att.st + T.counterSt);
      // the target's armour and resistances (defenses.js); its status build-up is cut by the full resistance
      const mit = enemyMitigate(info.parts, tg.def);
      info.parts = mit.parts; info.buildParts = mit.build;
      // your critical hit: +50% and the tree's crit damage, build-up too
      const cm = critRoll(T.critChance, T.critPower);
      if (cm > 1) { info.parts = scaleParts(info.parts, cm); info.buildParts = scaleParts(info.buildParts, cm); info.crit = true; }
      info.dmg = sumParts(info.parts);
      // a combo staggers each enemy at most once
      if ((def.comboMove || att.cmb) && att.cmbStag?.has(tg)) info.poise = 0;
      info.poise *= 1 + (T.stun || 0) / 100;
    }
    const hp0 = tg.hp;
    const r = tg.receive(info);
    if (r === 'none') return;
    if (r === 'stagger' && att === this.player && (def.comboMove || att.cmb)) att.cmbStag?.add(tg);
    if (att === this.player && att.cmbDepth && (def.comboMove || att.cmb)) att.cmbHit?.add(att.cmbDepth); // (a combo move that landed)
    const heavy = def.heavyHit, dealt = tg.puppet ? info.dmg : Math.max(0, hp0 - tg.hp);
    const shown = scaleParts(info.parts || { phys: info.dmg }, info.dmg > 0 ? dealt / info.dmg : 0);
    this.dmgPops(tg, shown, info.crit ? 'critical' : heavy ? 'heavy' : 'me');
    if (info.crit) { this.audio.play('bigHit', 0.7); this.fx.addShake(0.2); }
    if (att === this.player && att.c.caster) att.mana = Math.min(att.maxMana, att.mana + MANA_PER_HIT + (att.tree?.manaHit || 0)); // knife hits only
    if (att === this.player && tg.alive) this.applyStatus(tg, info.buildParts || info.parts, BUILD_PER_DMG);
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
      this.spellDamage({ dmg, poise: staggered ? 0 : poise, pos: p.pos.clone(), kind: elem === 'fire' ? 'fire' : 'bolt', combo: true }, e);
      if (e.state === 'hurt' && st0 !== 'hurt') p.cmbStag?.add(e);
    }
  }

  // a riposte or finisher: `base` physical, flat tree damage counted `flatHits` times (a parry stab hits like three lights)
  riposteHit(p, tg, base, flatHits = 1) {
    const T = { ...(p.tree || {}) };
    for (const k of TYPES) if (T[k + 'Dmg']) T[k + 'Dmg'] *= flatHits;
    const raw = scaleParts(playerParts(T, p.statusLv, base), p.dmgMul * (1 + (p.tree?.ripDmg || 0) / 100) * (p.tree?.glassFang ? 1.4 : 1)); // (Glass Fang)
    const mit = enemyMitigate(raw, tg.def), parts = mit.parts; // (through its armour and resistances)
    const dmg = sumParts(parts);
    if (tg.alive) this.applyStatus(tg, mit.build, BUILD_PER_DMG);
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
      this.mp.send({ t: 'hit', id: e.netId, dmg: 10 * NUM * p.dmgMul * (1 - (e.def?.armor || 0) / 100), poise: 12, kb: [dir.x * push, dir.z * push] });
      e.hp = Math.max(1, e.hp - 10 * NUM * p.dmgMul * (1 - (e.def?.armor || 0) / 100)); e.hpShow = 4;
    } else {
      const r = e.receive({ dmg: 10 * NUM * p.dmgMul * (1 - (e.def?.armor || 0) / 100), poise: 12, srcPos: p.pos, attacker: p, noKnock: true });
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

  // a bright white ring on attackers during their parry window (rogue only: knights block): a soft glow, a dark
  // edge so it reads on light ground, and a thick white band that pulses
  makeParryCues() {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    g.shadowColor = 'rgba(255,255,255,1)'; g.shadowBlur = 14;
    g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 22; g.beginPath(); g.arc(64, 64, 44, 0, Math.PI * 2); g.stroke();
    g.shadowBlur = 0;
    g.strokeStyle = 'rgba(20,16,12,0.9)'; g.lineWidth = 16; g.beginPath(); g.arc(64, 64, 44, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,1)'; g.lineWidth = 11; g.beginPath(); g.arc(64, 64, 44, 0, Math.PI * 2); g.stroke();
    const tex = new THREE.CanvasTexture(c);
    this.parryCues = [];
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 1, depthTest: false }));
      s.renderOrder = 11; s.visible = false; this.scene.add(s); this.parryCues.push(s);
    }
  }

  updateParryCues() {
    const p = this.player;
    const list = p && p.alive && p.kind === 'rogue' && !(p.parryCd > 0) && this.mode === 'play' ? this.parryTargets(p) : [];
    const pulse = 1 + Math.sin(this.time * 30) * 0.06;
    this.parryCues.forEach((s, i) => {
      const t = list[i];
      s.visible = !!t;
      if (!t) return;
      const k = t.e.rig.root.scale.y;
      s.position.set(t.e.pos.x, t.e.y + 1.35 * k, t.e.pos.z);
      s.scale.setScalar((0.6 + 0.2 * k) * pulse);
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
    this.addProj(this.foeCrit(e, { kind: 'arrow', pos: from, vel: dir.multiplyScalar(18), life: 1.6, mesh, r: 0.3, dmg: 12 * NUM * e.dmgScale, elems: e.elems }));
  }

  spawnFireWave(b, off) {
    const f = b.fwd().clone();
    for (const a of [-0.3, 0, 0.3]) {
      const d = f.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), a);
      const pos = new THREE.Vector3(b.pos.x + f.x * off, 0.3, b.pos.z + f.z * off);
      this.addProj(this.foeCrit(b, { kind: 'fire', pos, vel: d.multiplyScalar(10), life: 1.1, r: 0.85, dmg: 20 * NUM * b.dmgScale, mesh: null, elems: { fire: 0.4 } }));
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
    this.addProj(this.foeCrit(b, { kind: 'rock', pos: from, vel: dir.multiplyScalar(15), life: 2, mesh, r: 0.95, dmg: 26 * NUM * b.dmgScale, knock: 'heavy', elems: b.elems, buildMul: b.elemBuild }));
    this.audio.play('heavySwing', 1);
  }

  // a shot rolls its shooter's crit when it's loosed
  foeCrit(att, q) {
    const cm = critRoll(att.def?.crit, att.def?.critDmg);
    if (cm > 1) { q.dmg *= cm; q.crit = true; }
    return q;
  }
  // an enemy's critical hit landing on you: a callout over your head and a harder shake
  critTaken(p) {
    this.statusPopup(p, 'Critical!', '#ff8a3c');
    this.fx.addShake(0.35);
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
    if (r === 'hit') { this.audio.play('hurt'); this.mp.event({ k: 'hurt' }); this.fx.blood(chest, null, 8); this.pfx.play('hurt', chest, { dir: chest.clone().sub(src) }); this.hitstop(0.05); this.fx.addShake(0.3); if (q.crit) this.critTaken(t); }
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

  // skill tree bonuses that depend on the target and on you: Executioner's Mark, Last Stand, Pyre, Exsanguinate,
  // Wither, Shatterpoint (skilltree.js)
  treeMul(T, att, tg) {
    let m = 1;
    const st = tg.status;
    if (T.execute && tg.maxHp && tg.hp / tg.maxHp < 0.3) m *= 1 + T.execute / 100;
    if (T.lowHpDmg && att.hp / att.maxHp < 0.5) m *= 1 + T.lowHpDmg / 100;
    if (T.burnDmg && st?.dots?.fire) m *= 1 + T.burnDmg / 100;
    if (T.bleedTgt && st && st.meter.bleed / st.resist.bleed >= 0.5) m *= 1 + T.bleedTgt / 100;
    if (T.poisonedDmg && st?.dots?.poison) m *= 1 + T.poisonedDmg / 100;
    if (T.frozenDmg && st?.frostT > 0) m *= 1 + T.frozenDmg / 100;
    return m;
  }
  // keystones that change an element: Plaguelord, Pyromania, Rime Heart
  elemMul(T) {
    const m = {};
    if (T.plague) { m.poison = 1.5; m.phys = 0.8; }
    if (T.pyromania) m.fire = (m.fire || 1) * 1.4;
    if (T.rimeHeart) { m.frost = (m.frost || 1) * 1.4; m.fire = (m.fire || 1) * 0.5; }
    return m;
  }

  spellDamage(q, e, mul = 1) {
    const T = this.player.tree || {}, el0 = q.kind === 'fire' ? 'fire' : 'frost';
    mul *= this.treeMul(T, this.player, e) * (this.elemMul(T)[el0] || 1) * (T.spellblade ? 1.3 : 1); // (Spellblade: spells +30%)
    const res = Math.min(75, e.def?.res?.[el0] || 0) / 100; // the target's resistance to the spell's element
    const cm = critRoll(T.critChance, T.critPower); // (a spell can crit too)
    const raw = q.dmg * mul * cm * this.player.dmgMul * (1 + (T.spellDmg || 0) / 100);
    const hp0 = e.hp, sd = raw * (1 - res);
    const r = e.receive({ dmg: sd, poise: q.poise, srcPos: q.pos, attacker: this.player, noKnock: q.noKnock, combo: !!q.combo });
    if (r === 'none') return;
    // the bolt is frost, the fireball fire
    const el = q.kind === 'fire' ? 'fire' : 'frost', dealt = e.puppet ? sd : hp0 - e.hp;
    this.dmgPops(e, { [el]: dealt }, cm > 1 ? 'critical' : q.kind === 'fire' ? 'heavy' : 'me');
    if (cm > 1) this.fx.addShake(0.2);
    this.fx.sparks(new THREE.Vector3(e.pos.x, 1.1 * e.rig.root.scale.y, e.pos.z), null, 8, q.kind === 'fire' ? [1, 0.6, 0.2] : [0.5, 0.75, 1]);
    this.audio.play(q.kind === 'fire' ? 'bigHit' : 'hit', 0.8);
    this.mp.event({ k: 'hit', id: e.netId, heavy: q.kind === 'fire', d: { [el]: Math.round(dealt) } });
    this.hitstop(q.kind === 'fire' ? 0.08 : 0.04);
    if (e.alive) this.applyStatus(e, { [el]: raw * enemyBuildMul(res) }, SPELL_BUILD);
  }

  // Blue bolts and fireballs fly straight; a fireball bursts on contact or at range.
  updateSpell(q, dt) {
    for (let i = 0; i < (q.kind === 'fire' ? 2 : 1); i++) {
      const b = q.kind === 'fire' ? [1, 0.45, 0.1] : [0.45, 0.7, 1];
      this.fx.add.spawn({ x: q.pos.x + (Math.random() - 0.5) * q.r, y: q.pos.y + (Math.random() - 0.5) * q.r, z: q.pos.z + (Math.random() - 0.5) * q.r, life: 0.3, size: q.r * 0.8, size1: 0.03, r: b[0], g: b[1], b: b[2] });
    }
    const wall = this.hitsWall(q, dt);
    if (wall) q.pos.addScaledVector(q.vel, -dt); // (bursts on the wall's face, not inside it)
    let dead = q.life <= 0 || !this.world.walkable(q.pos.x, q.pos.z, -0.5) || wall;
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
      for (const e of this.enemiesAll()) if (e.alive && Math.hypot(q.pos.x - e.pos.x, q.pos.z - e.pos.z) < q.aoe + e.radius && this.world.lineClear(q.pos.x, q.pos.z, e.pos.x, e.pos.z)) this.spellDamage(q, e);
    } else if (hit) this.spellDamage(q, hit);
    return true;
  }

  spawnFireRing(x, z, maxR, dur, dmg) {
    if (this.mp.active) this.mp.sendAll({ t: 'ring', x, z, maxR, dur });
    this.rings.push(this.foeCrit(this.activeEnc?.boss || {}, { x, z, maxR, dur, dmg: dmg * NUM * (this.activeEnc?.boss.dmgScale || 1), t: 0, hit: new Set() }));
    this.audio.play('fire');
  }

  // an outline that shows through whatever stands between the camera and an actor (a raid's buildings and walls)
  ghostSet(a, on, color) {
    if (!on && !a.ghost) return;
    if (!a.ghost) {
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45, depthTest: false, depthWrite: false });
      const list = [];
      a.rig.root.traverse((o) => { if (o.isMesh && o.geometry && !o.userData.ghost) list.push(o); });
      a.ghost = list.map((o) => { const g = new THREE.Mesh(o.geometry, mat); g.userData.ghost = true; g.renderOrder = 20; g.visible = false; o.add(g); return g; });
      a.ghostOn = false;
    }
    if (a.ghostOn === on) return;
    a.ghostOn = on;
    for (const g of a.ghost) g.visible = on;
  }
  updateGhosts() {
    const D = this.world.dungeon;
    if (!D?.hides) return;
    for (const p of this.allPlayers()) this.ghostSet(p, p.alive !== false && D.hides(p.pos.x, p.pos.z), 0xf0e0b8);
    const me = this.player.pos;
    for (const e of this.enemies) {
      if (D.fadedAt?.(e.pos.x, e.pos.z)) { e.rig.root.visible = false; continue; } // (in a building faded to glass: unseen)
      const near = e.alive && e.rig.root.visible && Math.abs(e.pos.x - me.x) < 20 && Math.abs(e.pos.z - me.z) < 20;
      this.ghostSet(e, near && D.hides(e.pos.x, e.pos.z), 0xd04030);
    }
  }

  // a shot that has gone into a wall this frame (checked at its end and half way back, so a fast one can't skip it)
  hitsWall(q, dt) {
    return this.world.blocked(q.pos.x, q.pos.z, 0.05) || this.world.blocked(q.pos.x - q.vel.x * dt / 2, q.pos.z - q.vel.z * dt / 2, 0.05);
  }

  updateProjectiles(dt) {
    const p = this.player;
    this.projectiles = this.projectiles.filter((q) => {
      q.life -= dt;
      q.pos.addScaledVector(q.vel, dt);
      if (q.mesh) q.mesh.position.copy(q.pos);
      if (q.ghost) {
        if (!q.mesh && q.kind === 'fire') for (let i = 0; i < 3; i++) this.fx.flame({ x: q.pos.x, y: 0.1, z: q.pos.z }, 1.1);
        const over = q.life <= 0 || this.hitsWall(q, dt);
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
      let dead = q.life <= 0 || !this.world.walkable(q.pos.x, q.pos.z, -0.5) || q.pos.y < 0.25 || this.hitsWall(q, dt);
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
        if (this.projectileHit(t, { dmg: g.dmg, crit: g.crit, src: [g.x, g.z], elems: { fire: 0.4 } }) !== 'dodge') g.hit.add(t);
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
    this.hermitage?.resize(aspect);
    this.fx.setScale(px.h * 0.9 * (48 / this.camera.fov));
  }

  loop(now) {
    requestAnimationFrame((t) => this.loop(t));
    let rdt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (this.hermitage?.active && this.mode === 'title') {
      this.hermitage.update(rdt);
      this.pixel.render(this.hermitage.scene, this.hermitage.camera);
      return;
    }
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
      if (presses.has('map')) this.minimap.toggle();

      if (dt > 0) {
        if (!this.isGuest) { this.assignEngagement(); this.stepRooms(); }
        p.update(dt, this.input, presses);
        const ps = this.allPlayers().map((x) => x.pos);
        const close = (o, r) => ps.some((q) => Math.abs(o.pos.z - q.z) < r && Math.abs(o.pos.x - q.x) < r);
        for (const e of this.enemies) {
          // distance culling: far enemies neither think nor draw
          const near = close(e, 42);
          e.rig.root.visible = near && !(e.state === 'dead' && e.t > (e.effigy ? 3 : 4.5));
          if (near) e.update(dt);
        }
        this.blazeAura(dt);
        for (const b of this.bosses) {
          const near = close(b, 50);
          if (!near) b.rig.root.visible = false;
          else if (b.state !== 'dead') b.rig.root.visible = true;
          if (near) b.update(dt);
        }
        this.separate();
        this.updateProjectiles(dt);
        this.updateHearts(dt);
        this.seals.update(dt);
        this.chests.update(dt);
        this.mp.tick(dt);
        this.stepRevive(dt);
      } else {
        // keep buffered inputs during hitstop
        for (const a of presses) if (a !== 'lock' && a !== 'pause' && a !== 'interact') p.push(a);
      }

      // standing over a downed teammate
      const down = this.mp.active && p.alive && p.state === 'move' ? [...this.mp.peers.values()].find((x) => !x.alive && p.distTo(x) < 2.4) : null;
      const atPortal = this.portal && p.alive && Math.hypot(p.pos.x - this.portal.x, p.pos.z - this.portal.z) < 2.2;
      const sealLine = this.seals.promptFor(p);
      const stair = p.alive && p.state === 'move' && !this.bossActive ? this.world.dungeon?.stairAt?.(p.pos.x, p.pos.z) : null;
      const chest = this.chests.promptFor(p, this.input.lastDevice === 'touch' ? 'Tap' : 'F');
      if (down) {
        this.ui.prompt(`${this.input.lastDevice === 'touch' ? 'Tap' : 'F'}: Revive ${down.name} (all lose 10% max health)`);
        if (presses.has('interact')) this.startRevive(down);
      } else if (atPortal) {
        this.ui.prompt(`${this.input.lastDevice === 'touch' ? 'Tap' : 'F'}: Descend${this.mp.active ? ' (takes the whole party)' : ''}`);
        if (presses.has('interact')) this.descend();
      } else if (stair) {
        this.ui.prompt(`${this.input.lastDevice === 'touch' ? 'Tap' : 'F'}: ${stair.label}`);
        if (presses.has('interact')) this.takeStair(stair);
      } else if (chest) {
        this.ui.prompt(chest.line);
        if (presses.has('interact')) this.chests.tryOpen(chest.c);
      } else if (sealLine) this.ui.prompt(sealLine);
      else if (performance.now() > (this.ui.smallT || 0)) this.ui.prompt(null);
      if (this.portal) this.portal.ring.material.opacity = 0.6 + Math.sin(this.time * 5) * 0.3;
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
      // area title when reaching a new module (a chain of modules only)
      if (!this.run) {
        const m = this.world.moduleAt(p.pos.z);
        if (m.i > this.seenMod) { this.seenMod = m.i; this.ui.toast(m.name.toUpperCase(), 3); this.ui.setProgress(m.i + 1, this.world.mods.length); }
      }
      this.minimap.update(rdt);
      this.updateFoePanel(rdt);

      this.ui.update(rdt, p);
      this.ui.party(this.mp.active ? [...this.mp.peers.values()] : []);
      if (enc) {
        this.ui.boss.set(enc.boss.hp / enc.boss.maxHp, rdt);
        this.ui.bossStatus(enc.boss.status.bars().map((b) => ({ v: b.v, color: STATUS[b.k].color })));
      }
      this.updateEnemyBars();
    }

    this.updateParryCues();
    this.updateNightLights();
    this.world.update(dt, this.time, this.fx, this.player && this.mode !== 'title' ? this.player.pos : { x: 0, z: -4 });
    this.fx.update(dt);
    this.pfx.update(dt);
    tickOutfitColors(this.time); // effect colours on outfits (molten, frost, void, gilded)
    if (this.mode === 'play' || this.mode === 'wait') this.weaponFx.update(dt);
    this.updateCamera(rdt);
    if (this.mode !== 'title') this.darkLight(rdt);
    if (this.mode === 'play' && this.player) this.updateGhosts();
  }

  // the enemy you're locked on to: its armour, resistances and elements in a small panel at the top right (under the map)
  updateFoePanel(dt) {
    if ((this.foeT = (this.foeT || 0) - dt) > 0) return;
    this.foeT = 0.1;
    const el = (this.foeEl ||= Object.assign(document.createElement('div'), { id: 'foe-panel', className: 'hidden' }));
    if (!el.isConnected) document.getElementById('hud').append(el);
    const foe = this.player.lock?.alive ? this.player.lock : null;
    el.classList.toggle('hidden', !foe);
    if (!foe) { this.foeShown = null; return; }
    const map = this.minimap.el.classList.contains('hidden') ? null : this.minimap.el.getBoundingClientRect();
    el.style.top = (map ? map.bottom + (this.input.isPhone ? 4 : 8) : 12) + 'px';
    if (this.foeShown === foe) return;
    this.foeShown = foe;
    const NAMES = { grunt: 'Zealot', spear: 'Pike Zealot', archer: 'Needle Gunner', brute: 'War Servitor', effigy: 'Heretic Idol' };
    const name = foe.isBoss ? foe.name.split(',')[0] : `${foe.elite ? ELITE[foe.elite].name + ' ' : ''}${NAMES[foe.type] || foe.type}`;
    const d = foe.def || { armor: 0, res: {} }, deals = Object.keys(foe.elems || {});
    // damage per hit: its moves' hits averaged (an archer's arrow), with its scaling and the elements it adds
    const hits = foe.type === 'archer' ? [12] : Object.entries(foe.moves || {}).filter(([k]) => k !== 'holdBurst').flatMap(([, m]) => (m.hits || []).filter((h) => h.dmg > 0 && !h.pctHp).map((h) => h.dmg));
    const perHit = hits.length ? Math.round(sumParts(enemyParts((hits.reduce((a, b) => a + b, 0) / hits.length) * NUM * (foe.dmgScale || 1), foe.elems))) : 0;
    const res = RES_ELEMS.filter((k) => d.res?.[k]).map((k) => `<span class="fp-res" style="color:${TYPE_COLOR[k]}">${k[0].toUpperCase() + k.slice(1)} ${d.res[k]}%</span>`).join('') || '<span class="fp-none">none</span>';
    el.innerHTML = `<div class="fp-name">${name}</div>`
      + (perHit ? `<div class="fp-row"><b>Damage per hit</b><span>${perHit}</span></div>` : '')
      + `<div class="fp-row"><b>Crit chance</b><span>${d.crit || 0}%</span></div><div class="fp-row"><b>Crit damage</b><span>+${50 + (d.critDmg || 0)}%</span></div>`
      + `<div class="fp-row"><b>Armour</b><span>${d.armor}%</span></div><div class="fp-bar"><i style="width:${d.armor / 0.6}%"></i></div>`
      + `<div class="fp-row"><b>Resistances</b></div><div class="fp-list">${res}</div>`
      + (deals.length ? `<div class="fp-row"><b>Deals</b></div><div class="fp-list">${deals.map((k) => `<span class="fp-res" style="color:${TYPE_COLOR[k]}">${k[0].toUpperCase() + k.slice(1)}</span>`).join('')}</div>` : '');
  }

  // blazing elites burn anyone standing close (each device burns its own player)
  blazeAura(dt) {
    const p = this.player;
    if (!p?.alive || (this.blazeT = (this.blazeT || 0) - dt) > 0) return;
    for (const e of this.enemies) {
      if (e.elite !== 'blazing' || !e.alive || p.distTo(e) > 2.6) continue;
      this.blazeT = 0.5;
      if (p.iframe()) return;
      const mit = mitigate({ fire: 3 * NUM * (e.dmgScale || 1) }, p.tree, 1);
      p.hp -= mit.total; p.rig.flash(1, 0.5, 0.2);
      for (const [k, v] of Object.entries(mit.build)) if (v > 0) p.status.add(k, v, this);
      if (p.hp <= 0) p.die();
      return;
    }
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
    const pp = this.player.pos, all = [this.player, ...this.enemies.filter((e) => e.alive && Math.abs(e.pos.z - pp.z) < 30 && Math.abs(e.pos.x - pp.x) < 30)];
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
