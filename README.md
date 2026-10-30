# Ashen Vigil

A pseudo-3D souls-like built with Three.js + Vite. Each run is assembled from modular areas. You fight through two areas, then a mini boss guarding the only bonfire, three more areas, and finally a two-phase boss.

## Level structure
- **7 slots:** 1, 2, 4, 5 and 6 are drawn (without repeats) from a pool of 7 regular modules. Slot 3 is **The Executioner's Pit**: mini boss Brother Hask, with the run's only bonfire behind him. Slot 7 is **The Throne of Ash**: Varek.
- **Regular modules:**
  - The Broken Road: winding ruins.
  - The Ashen Camp: palisade war camp.
  - The Hanging Span: narrow bridge over a chasm.
  - The Burned Hamlet: houses to path around, plus a brute.
  - The Ossuary Hall: pillared crypt with blue torches.
  - The Sunken Mire: bog pools that slow you.
  - The Warden's Gate: brute courtyard plus archers past the gate.
- The layout is rolled per new game and stays fixed for that run. Until the bonfire is lit, death sends you back to the start.
- Module code lives in `src/modules.js`. Add a module by adding an entry to `MODULES`.

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
`scripts/smoke.mjs` (screenshots + runtime errors) and `scripts/sim.mjs` (deterministic mechanics checks + bot fights) run against `npx vite preview --port 4173`.
