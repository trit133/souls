# Ashen Vigil

A pseudo-3D souls-like tester built with Three.js + Vite. You fight through an enemy camp, reach a bonfire, then face one two-phase boss. It runs in desktop browsers and on iPhone (landscape, touch controls). You can add it to the Home Screen for fullscreen.

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

## Tests
`scripts/smoke.mjs` (screenshots + runtime errors) and `scripts/sim.mjs` (deterministic mechanics checks + bot fights) run against `npx vite preview --port 4173`.
