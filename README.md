# Ashen Vigil

A pseudo-3D souls-like roguelite built with Three.js + Vite. Each run is 11 areas assembled from modules. Every third area is a mini boss that rewards you with a power-up or a full rest, and the last is a two-phase boss. There are no bonfires: death ends the run.

## Run structure
- **11 slots:** 1, 2, 4, 5, 7, 8 and 10 use all 7 regular modules in random order. Slots 3, 6 and 9 are the three mini bosses (shuffled). Slot 11 is **Varek** in the Throne of Ash.
- **Regular modules:**
  - The Broken Road: winding ruins.
  - The Ashen Camp: palisade war camp.
  - The Hanging Span: narrow bridge over a chasm.
  - The Burned Hamlet: houses to path around, plus a brute.
  - The Ossuary Hall: pillared crypt with blue torches.
  - The Sunken Mire: bog pools that slow you.
  - The Warden's Gate: brute courtyard plus archers past the gate.
- **Mini bosses:**
  - **Brother Hask** (Executioner's Pit): axe; flurry, delayed chop, charge, hop slam.
  - **Sister Vael** (Moonlit Cloister): twin daggers; sidesteps your swings, lunges and dives.
  - **Gorrath** (Slag Forge): giant maul; slams, sweeps, rear stomp, thrown boulders.
- **After each mini boss:** pick 1 of 3 random power-ups, or **Rest** (full HP and flasks refilled). Power-ups stack:
  - +25 max HP
  - +15 max stamina
  - +15% damage
  - +15% roll distance
  - +10% attack speed
  - Bleed, Poison, Frost or Fire infusion
- **Status effects** (Elden Ring-style buildup): each hit fills the enemy's meter. When it's full the effect procs and the meter resets. Bosses resist ×1.3 more after each proc.
  - Bleed: a burst of 15% max HP + 45.
  - Frost: a burst of 10% + 25, and the enemy is slowed for 6 seconds.
  - Poison: 20% + 60 over 10 seconds.
  - Fire: 25% + 50 over 3.5 seconds.
  - Bosses take roughly half the percentage.
- Module code lives in `src/modules.js`, power-ups in `src/boons.js`, and status effects in `src/status.js`.

## Gold and permanent upgrades
- **Earning:** +1 per enemy; mini bosses pay 2, 3, then 4; Varek pays 7.
- **Keeping it:** gold is lost on death. After a mini boss you may leave the run instead of continuing: ×1 after the first, ×1.5 after the second, ×2 after the third. Beating Varek banks ×3.
- **Enemy tiers:** each mini boss passed gives everything after it +10% health, damage, move speed and attack speed (additive). Eyes turn red, then orange, then white with a red halo.
- **Upgrades** (title screen): costs start at 10 and go ×1.5 rounded up (10, 15, 23, 35, 53...), per upgrade.
  - Damage: +3%, then +4% from the 4th level.
  - Health: +5%, then +8%.
  - Move speed: +2%, then +4%.
  - Attack speed: +2%, then +4%.
  - Stamina: +6%, then +8%.
  - Mana: locked until the game has spells.
- **Accounts:** `src/account.js` stores accounts in the browser's localStorage with PBKDF2-hashed passwords. They are per device; an online backend can replace that class. Rules live in `src/progress.js`.

It runs in desktop browsers and on iPhone (landscape, touch controls). You can add it to the Home Screen for fullscreen.

## Run

```bash
npm install
npm run dev      # http://localhost:5173 (also exposed on LAN for phone testing)
npm run build    # static build in dist/ — deployable to any static host
```

## Characters
- **Knight**: longsword and shield. 150 HP, 3-hit combo plus heavy. Hold **L1** to block. Press **heavy** right after blocking a hit for a guard counter.
- **Rogue**: twin daggers. 105 HP, fast 4-hit combo, lunge heavy, longer i-frames. **L1** parries (tight window). A successful parry opens a riposte.

## Controls
| | Keyboard / mouse | Touch |
|---|---|---|
| Move | WASD | left-side stick |
| Light / heavy | J or LMB / L or RMB | R1 / R2 |
| Roll (neutral = backstep) | Space / K | ROLL |
| Sprint | Shift | hold ROLL |
| Block / parry | Q / Ctrl | BLOCK / PARRY |
| Heal | E | HEAL |
| Lock-on | Tab / MMB | LOCK |
| Rest at bonfire | F | tap the prompt |

## Combat notes
- Inputs are buffered (0.4s). Combos chain inside a window. Rolls can cancel attack recovery after a set point.
- Hitstop, camera shake, weapon trails, and poise/stagger on both sides.
- A maximum of 2 camp enemies attack at once; the others circle. Enemy types: grunts (slash, double, leap), spearmen (long thrusts, sweep when you are close), archers (keep distance, arrows can be sidestepped), and a super-armored brute (telegraphed slam and a stomp when you stand behind it).
- **Varek, the Ashen Warden** has 1300 HP.
  - Phase 1: sweeps, a 2-hit combo, a *delayed* overhead, a lunge thrust, a leap slam with a ground telegraph, and a spin if you hug his back.
  - At 55% HP he roars and his blade ignites. He gets faster and adds a 3-hit combo, fire waves, a fire ring on his leap, and Ember Burst (a telegraphed AoE).
  - Parry or poise-break him for a critical. He punishes healing at mid range.
- Red glints and red ground circles mark unparryable attacks.
- **Parry (Rogue):**
  - Timing: press it within the 0.25s before a parryable hit lands. A faint white ring on the attacker shows exactly that window.
  - What can be parried: only certain light attacks (grunt slashes, spear thrust and sweep, archer bash, Varek's sweeps, Hask's chop and flurry). Projectiles, slams, overheads, leaps, charges, lunges, spins and stomps never can.
  - A missed parry costs half your max stamina, and regen is delayed 1.6s.

## Tests
`scripts/smoke.mjs` (screenshots + runtime errors), `scripts/sim.mjs` (mechanics + bot fights), `scripts/modules.mjs` (layout connectivity, mini bosses, rewards, status, run over), `scripts/economy.mjs` (accounts, gold, tiers, shop) and `scripts/parry.mjs` run against `npx vite preview --port 4173`.
