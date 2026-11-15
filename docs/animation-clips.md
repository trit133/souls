# Motion clips (baked animations)

The characters are box rigs posed in code (`models.js`), not skinned models. Animation clips made for a humanoid
skeleton are **baked** into our rig's poses (`src/anim-data/clips.json`) and played by `src/clips.js`.

## Where the clips come from
- **Quaternius Universal Animation Library 1 and 2** (CC0, the free Standard packs). Download them from
  quaternius.itch.io and put `UAL1_Standard.glb` and `UAL2_Standard.glb` in `assets-src/ual/`. That folder is not in
  git; only our baked numbers are.
- **Mixamo** (free; fine to use in a game, but the downloaded files must not be shared or shipped). To add a move:
  1. Download it from mixamo.com as **FBX, "Without Skin", 30 fps**. Tick "In Place" for walks and runs.
  2. Put it in `assets-src/mixamo/` and give the file the clip's name, e.g. `strafe_left.fbx` or `walk_back.fbx`.
     Names containing walk, run, jog, strafe or back are measured as gaits.
  3. Run `node scripts/bake-anims.mjs` (with the dev server on :4199). It writes `src/anim-data/clips.json` and a
     check sheet per clip at `/tmp/look/bake-<name>.png`: the source skeleton in grey, our rig in red.

## How it's used
- `gaitPose(actor, style, dt, { speed, dir, turn, sprint, time, scale })` gives the pose for a moving body:
  - idle, walk, jog and sprint, blended by real ground speed, kept in step, and played at their stride's rate,
  - backwards plays the gait reversed,
  - sideways turns the hips toward the way it's going while the chest keeps facing (locked-on strafing),
  - turning leans into the turn.
- The weapon's hold (`anims.js` `styleArms`) goes on top.
- Today only the Templar moves on it (`player.js` move state, and his copy on teammates' screens in `mp.js`). Any
  other character or enemy can switch by calling `gaitPose` in place of `locomotion()`.
- Real strafe and backpedal clips from Mixamo can replace the hip-turn and reverse play: add them as `strafeL`,
  `strafeR` and `back` and blend them in `clips.js`.

## Checks
- `scripts/look-gait.mjs [kind]`: the gait as the game draws it (walk, jog, sprint, strafe left/right, back, diagonal).
- The retarget is exact: the limbs are within 0.1° of the source skeleton's.
