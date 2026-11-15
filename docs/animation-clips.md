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
- **In use now:** Mixamo's Locomotion Pack (`assets-src/mixamo/Locomotion Pack./`, baked as `mIdle`, `mWalk`, `mRun`,
  `strafeWalkL/R`, `strafeRunL/R` and `turnL/R`), plus Quaternius' `sprint`. The clips travel (root motion), so their
  speed is measured from how far the hips go. Every gait clip starts on the same footfall (left foot planted).
- `gaitPose(actor, style, dt, { speed, dir, turn, sprint, time, scale })` gives the pose for a moving body, split as
  games do it:
  - **The lower body:** an 8-way blend by the direction of travel against facing:
    - forward is walk, run or sprint by real ground speed,
    - left and right are Mixamo's strafe walk and strafe run,
    - back is the forward gait reversed (the pack has no backward clip),
    - diagonals mix neighbours (blended as rotations), with a small hip warp.
    The cycle runs as far as the ground covered, so the feet don't slide. Turning on the spot plays Mixamo's turn
    with the spin taken out, so the feet step round.
  - **The upper body:** worked out in the world. The chest is squared to where the body faces (Mixamo's strafes turn
    the hips about 66 degrees), with the posture pass (`POSTURE`: lean kept, arms in, crouch) and the shoulders
    (`SHOULDERS`: swing, dip, sway). The head stays level. The weapon's hold (`anims.js` `styleArms`) goes on top.
- Today only the Templar moves on it (`player.js` move state, and his copy on teammates' screens in `mp.js`). Any
  other character or enemy can switch by calling `gaitPose` in place of `locomotion()`.
- Wanted next from Mixamo: a walk and run **backward** (to replace the reversed gait). Download them as FBX, No
  Character, 30 fps, no keyframe reduction, then bake as `backWalk` and `backRun`.

## Checks
- `scripts/look-gait.mjs [kind]`: the gait as the game draws it (walk, jog, sprint, strafe left/right, back, diagonal).
- The retarget is exact: the limbs are within 0.1° of the source skeleton's.
