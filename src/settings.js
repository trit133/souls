// Player settings: key bindings, volumes, screen shake and touch layout.
// Signed-in players keep them on their account; guests keep them on this device.
import { GFX_PRESETS, GFX_KEYS } from './lighting.js';

export const ACTIONS = [
  ['up', 'Move up'], ['down', 'Move down'], ['left', 'Move left'], ['right', 'Move right'],
  ['sprint', 'Sprint'], ['attack', 'Light attack (R1)'], ['heavy', 'Heavy / Bolt (R2)'], ['roll', 'Roll / backstep'],
  ['special', 'Block / Parry / Plasma (L1)'], ['heal', 'Inject (heal)'], ['lock', 'Lock on'], ['interact', 'Interact / revive'], ['map', 'Map'], ['inventory', 'Pouch (raid inventory)'], ['ping', 'Ping (hold: emote / alert wheel)'], ['summon', 'Summon (rune)'], ['runebuff', 'Rune buff'], ['chat', 'Party chat'], ['pause', 'Pause'],
];

export const DEFAULT_BINDS = {
  up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  sprint: ['ShiftLeft', 'ShiftRight'], attack: ['KeyJ', 'Mouse0'], heavy: ['KeyL', 'Mouse2'], roll: ['Space', 'KeyK'],
  special: ['KeyQ', 'ControlLeft'], heal: ['KeyE', ''], lock: ['Tab', 'Mouse1'], interact: ['KeyF', ''], map: ['KeyM', ''], inventory: ['KeyI', ''], ping: ['KeyG', ''], summon: ['KeyR', ''], runebuff: ['KeyT', ''], chat: ['Enter', ''], pause: ['Escape', 'KeyP'],
};

// quality: pixel size of the game picture (see PIXEL_H in pixel.js)
// gfx: the graphics preset (lighting.js GFX_PRESETS: phones start on Medium, everything else High; 'custom' once a
// switch is changed), its switches, the palette (Strict: the pixel palette; Soft: smooth light) and the FPS counter
const PHONE = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse) and (hover: none)').matches;
export const DEFAULTS = { master: 0.7, music: 1, sfx: 1, team: 0.5, shake: 1, touchSize: 1, touchOpacity: 1, touchLayout: {}, quality: 'medium', gfx: PHONE ? 'medium' : 'high', palette: 'soft', fps: false, binds: DEFAULT_BINDS };
export const QUALITY = { chunky: 1, medium: 1, fine: 1 };

const LOCAL = 'ashenVigil.settings.v1';

// fill in anything missing (e.g. actions added after a player saved)
export function normalize(s) {
  const out = { ...DEFAULTS, ...(s || {}) };
  if (!(out.quality in QUALITY)) out.quality = DEFAULTS.quality; // older Auto/High/Low values
  if (!(out.gfx in GFX_PRESETS) && out.gfx !== 'custom') out.gfx = DEFAULTS.gfx;
  for (const k of GFX_KEYS) if (out.gfx !== 'custom' || out[k] === undefined) out[k] = GFX_PRESETS[out.gfx === 'custom' ? DEFAULTS.gfx : out.gfx][k];
  if (!['off', 'low', 'high'].includes(out.shadows)) out.shadows = 'low';
  if (out.palette !== 'strict') out.palette = 'soft';
  out.fps = !!out.fps;
  // touchLayout: { action or 'stick': [x, y] } screen fractions (see touchlayout.js)
  if (!out.touchLayout || typeof out.touchLayout !== 'object') out.touchLayout = {};
  out.binds = {};
  for (const [a] of ACTIONS) {
    const b = s?.binds?.[a];
    out.binds[a] = Array.isArray(b) ? [b[0] || '', b[1] || ''] : [...DEFAULT_BINDS[a]];
  }
  return out;
}

export const loadGuest = () => { try { return normalize(JSON.parse(localStorage.getItem(LOCAL))); } catch { return normalize(); } };
export const saveGuest = (s) => localStorage.setItem(LOCAL, JSON.stringify(s));

export function keyLabel(code) {
  if (!code) return '—';
  const names = { Space: 'Space', Escape: 'Esc', Tab: 'Tab', Enter: 'Enter', Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', CapsLock: 'Caps', Mouse0: 'Left click', Mouse1: 'Middle click', Mouse2: 'Right click', Mouse3: 'Mouse 4', Mouse4: 'Mouse 5' };
  if (names[code]) return names[code];
  return code.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Arrow(.*)/, '$1 ↑').replace(/^Numpad/, 'Num ')
    .replace(/(Up|Down|Left|Right) ↑$/, (m, d) => ({ Up: '↑', Down: '↓', Left: '←', Right: '→' })[d])
    .replace(/(Shift|Control|Alt|Meta)(Left|Right)/, (m, k, side) => `${side === 'Left' ? 'L' : 'R'}-${k === 'Control' ? 'Ctrl' : k}`);
}
