# Terrain: walkable height

`src/terrain.js`. Every world has one `Terrain` (`world.terrain`); it's flat until a map lays some out, so maps
without terrain play exactly as before.

## Laying it out (world coords)
- `flat(x0, x1, z0, z1, h, { look })`: a terrace at height h. Its edges get retaining walls wherever the ground outside
  is more than `STEP` (0.45 m) lower. `look`: `'stone'` (default), `'brick'` or `'earth'`.
- `slope(x0, x1, z0, z1, h0, h1, axis)`: a ramp or hillside from h0 (at x0 or z0) to h1. `stairs(...)` is the same,
  but built as steps.
- `hill(cx, cz, r, h)`: a rounded rise added to what's under it.
- `ladder(x, z, yaw, h0, h1, { raised })`: its foot at (x, z) on the lower ground, facing `yaw` toward the face.
  A raised ladder lies on the terrace above. Standing at its top shows "Lower the ladder", which opens the shortcut
  for the whole party.

Later parts override earlier ones (hills add on). Heights are baked onto a 0.25 m grid. A slope blends smoothly; a
step bigger than `STEP` stays a sharp edge. Props a module adds are lifted onto the ground under them
(`world.settle`).

## How bodies use it
- `actor.gy` is the ground under a body, and `actor.pos.y` mirrors it, so effects placed at a body follow it up and
  down. `actor.y` is still the jump offset on top of that.
- Moving (`world.resolve`): a rise of more than `STEP` is a wall. A drop of more than `STEP` is a wall for enemies;
  the player walks or rolls off it.
- The player falls (`'fall'`, keeping the speed he left at). A fall under `SAFE_FALL` (2.6 m) lands on the feet
  (`'land'`, knees bent, no damage). A taller one hurts (12% of max health at 2.6 m, +16% per metre more, at most 70%)
  and lands him on his stomach (`'prone'`, then he pushes up; a roll gets out of it early).
- Off a short drop in the middle of an attack, the attack plays out on the way down and he lands on his feet
  without breaking it. If it ends while he's still in the air, he falls as usual. A tall drop cuts it short.
- Ladders: walk into the foot to climb up, or walk out over the top to climb down (`'climb'`, 2.4 m/s). Players only.
- Hits only connect within 1.6 m of height. Shots and spells fly up or down to a target on another level and stop
  at the ground or a terrace face.
- Enemies in a city path on the walking grid (`city.js navLayer`). Two cells join only if a body can step between
  them, so enemies go round to the stairs.

## Trying it
The training arena has a trial patch: a 1.6 m terrace (stairs, a ladder) and a 3.6 m one (a ramp, a pulled-up
ladder). `node scripts/terrain.mjs` plays it all and saves shots to `/tmp/look/terrain-*.png`.

## Ground textures and plants
- `src/ground.js`: four tiling pixel-art textures drawn in code: flagstones, packed dirt, grass sod and cobbles,
  64 px over 4 m. They're blended over the ground by per-vertex weights. Where two meet, each texture's own height
  (a stone stands proud of its mortar) decides which shows, so the seams stay crisp and ragged. A ground style turns
  it on with `tex: { walk, out }` (the base weights on and off the walkable ground; the training ring's `proving`).
  A map paints the rest: `w.paint({ x0, x1, z0, z1 } | { cx, cz, r }, 'flag' | 'dirt' | 'grass' | 'cobble', { edge, amount })`.
- `src/flora.js`, all instanced and visual only:
  - grass tufts wherever the ground is grass, swaying in the wind;
  - a weed in the odd crack of flagstones and cobbles;
  - pebbles on dirt;
  - ivy strands down terrace faces (`o.ivy`: how much, default 0.32);
  - what a map asks for in `w.flora`: `{ kind: 'bush' | 'tree' | 'leaves' | 'puddle', x, z, ... }`. Only a tree's
    trunk blocks.

## Ashfall Ward (`src/ward.js`)
Area 1 is now laid by hand on the hill instead of the maze grid: 95 m across, three tiers climbing north, away from
the camera.
- **Lower Ward (0 m):** the camp gate, the market square (stalls, a dry well), houses, and the Manufactorum (a boss
  site).
- **Dry canal (−1.5 m):** right across the ward, with steps down at the west, middle and east, and two causeway
  bridges up to the Terraces. A pulled-up ladder on its north bank is the shortcut back up.
- **Terraces (2 m):** the Barracks (a boss site), houses on the street, and the Sunken Garden. The garden is a
  shrine square sunk to 0 m, with a grassy bank in from the south and a 4 m drop into it off the Crest.
- **Crest (4 m):** the Chapel (a boss site) over its plaza and a headless saint, the overgrown cemetery with its
  mausoleum and its clearing (a shrine square), and houses. A grand stair and the east ramp come up from the
  Terraces; a pulled-up ladder leads down from the cemetery.

It's a `City` with its own `plan()`: blocks and buildings laid free, with the same shrines, chests, drums, enemies,
basements and walking grid. Everything is built at ground level and then lifted onto the hill (`populate`: each
building's pieces by the floor under it, everything else by `world.settle`).

The houses have:
- a brick plinth, timber framing with braces, sills and shutters (some hanging, some boarded);
- ivy that fades with the building;
- a pitched slate roof with holes, and a chimney;
- inside: a hearth, a rug, a table and stools, shelves;
- barrels and crates by some doors.

`node scripts/look-ward.mjs` shoots the landmarks and checks the tiers' heights, that everything can be reached, a
walk from the gate to the Crest, the canal ladder and the drop into the garden.

### Below the ward, and the way to the boss
- The cellars and vaults use the underground texture set: old tiles, brick paving, wet grime and flagstones, with
  no grass and no weeds (`GROUND.wardUnder`, `TEXSETS.under`).
- A vault or the hoard goes down. Steps in the corridor drop 1.2 m to a sunken hall, with a raised dais (1 m up) at
  its north end, and steps climb from the side passage to a raised chamber.
- The boss's basement (its corridor and the arena) stays flat.
- Terrain far apart gets a grid per cluster (the surface, each basement).
- Breaking the last shrine opens a portal by it (main.js `bossPortal`). It's a stair to the boss's corridor, just
  short of the open blast door. Every player gets one, and each steps through on their own.
- `node scripts/ward-under.mjs` checks the heights, walks a vault, and takes the portal to the arena.
