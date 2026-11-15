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
