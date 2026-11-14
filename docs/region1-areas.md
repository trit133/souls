# The Shattered March: Areas 2 and 3

Design notes for the next two raid areas of Region 1, following Ashfall Ward (r1a1). The rules carry over from the
first area: each area is a hand-built map of about 110 m that's the same every raid, small and maze-like, with lots of
places to go into and basements below. Each raid you find and break three shrines (elite, circle and altar), which
opens the hidden boss room. Enemy positions change every raid, and materials go straight into the stash.

Each area has its own look and its own enemies. **Each area is harder than the last:** enemies have more health, hit
harder, and bring new tricks.

| | Ashfall Ward (1) | The Sump Lines (2) | Saint Orsk's Spire (3) |
|---|---|---|---|
| Regular enemy health | 120-140 | 170-190 (~1.35x) | 240-320 (~1.8x) |
| Heavy enemy health | 280 (War Servitor) | 420 (Bilge Hulk) | 560 (Bell-Warden) |
| Typical hit | 16-18 | 20-26 | 26-34 |
| Armour / resistance | low | +5 over area 1 | +10 over area 1 |
| Loot tops out at | rare | epic (Augury Shard) | legendary (Oracle Core) |
| Boss | Hask (Penitent Pit) | Vael (Cryo Cloister) | Gorrath (Slag Foundry) |

(The +5 / +10 armour comes from the defence ranges in `src/defenses.js`.)

---

## Area 2: The Sump Lines

> *When the ward burned, its people went down. The old transit lines flooded with run-off from the promethium
> refineries, and the ones who stayed below changed. Gangs from the ward still go down to work the pumps, because whoever
> runs the pumps runs the water.*

**Look:** black tunnels lined with tile and rust. Knee-deep water, oil-green under the work-lamps, and amber hazard
lights blinking where the power still works. Pipes run along every wall, steam vents hiss, and rusted carriages lie on
their sides. The whole area is underground, so it's **dark everywhere** and the Night Raid vision cone is always on.
Light comes from lamps, burning promethium slicks and the shrines' beams.

**Layout (~110 m, same grid style as Ashfall Ward but tunnels instead of streets):**
- *Lanes* become **tunnels** 4 m wide with a curved ceiling that lifts away near you (the same way a roof does in a
  house). Where Ashfall had rubble walls there's solid rock and collapsed tunnel. Some tunnels have a **flooded channel**
  down the middle that slows you, using the bog-water slow `world.slows` already has. The dry walkways run along the
  edges.
- *Blocks* become **chambers**:
  - **Stations**: platforms with rail beds sunk 1 m lower, waiting benches, tiled pillars, flickering destination
    boards. This is the "house" kind.
  - **Pump rooms**: a big engine in the middle and catwalks round it. This is the "works" kind.
  - **Cisterns**: round flooded halls, slow to cross. This is the "plaza" kind, and surface shrines stand here.
  - **Collapses**: chambers filled with fallen rock. This is the "rubble" kind.
- **Landmarks** (the three possible boss sites, like the chapel, manufactorum and barracks):
  - *Station Ninefold*: a two-block grand concourse with a dead clock and a statue of a regime saint.
  - *The Pump Cathedral*: a huge pumping engine with a stained-glass control window. The gangs pray to it.
  - *The Sluice Works*: floodgates, chains and a drained channel you can walk down.
- **Basements** go deeper: *drainage sumps*, *cold storage* and *the old regime's sealed bunkers*.
- **Ways in and out:** a maintenance lift from the ward (the start and the camp, with a work-crew camp of tarps, lamps
  and a brazier). The boss pit leads out once the boss is dead.
- **Hazard:** **promethium slicks** (black pools with a rainbow sheen). A Torcher's flame, a fire spell or a Blazing
  elite lights one, and it burns for 6 s. You can use this against them.

**Boss:** Sister Vael in a re-dressed Cryo Cloister: the cold pumps at the bottom of the lines, with a frozen floor and
icicles.

### Enemies of the Sump Lines

**Sump Wretch** (`wretch`): *the people who stayed below.* A hunched, swollen mutant with a rebreather grown into its
face, one arm ending in long hooked claws, and greenish-grey skin with blisters that glow. It moves fast and low.
- *Rake*: two quick claw swipes (parryable).
- *Pounce*: a 5 m leaping bite from out of reach.
- *Retch*: a short cone of bile, about 3 m. It can't be parried, does poison damage, and you can see it coming
  because the throat swells and glows.
- Its hits carry Poison. Health 190, light poise, fast. It shows up in packs. Some lie **submerged** in the channels
  and rise when you come close (this uses the existing sitting state).

**Hook Warden** (`hook`): *the sluice gangs' enforcers.* A tall gang heavy in an oilskin coat and a diving-helmet
rebreather, with a 3.5 m chain-gaff (a boat hook) and a lantern on the belt.
- *Gaff*: a long thrust that **drags you in** toward him if it lands. It sets up his friends.
- *Reap*: two wide sweeps.
- *Sink*: an overhead hook slam.
- Health 170, long reach, and he keeps his distance like the Pike Zealot.

**Promethium Torcher** (`torcher`): *they burn the drowned out.* A fire-proofed suit with a quilted hood and smoked
goggles, two fuel tanks on the back joined by hoses to a flamer, and a pilot light that's always burning.
- *Gout*: a 5.5 m cone of flame held for a second, several ticks of Fire damage (dodge to the side).
- *Canister*: a lobbed fuel can that rolls along the floor in flames.
- *Bash*: a tank butt-strike if you're right on top of him.
- Health 130, much tougher than a Needle Gunner. He shoots only with a clear line, and he backs away to about 5 m.

**Bilge Hulk** (`hulk`, heavy): *a pump servitor that went feral.* A huge hunched body of plate and grown flesh. Its
right arm is a pump-drill (a spiral bit, pistons and a fuel tank) and its back is a cluster of intake stacks. Hoses
hang off it.
- *Bore*: a drilling thrust that grinds, three hits in a row.
- *Wallow*: a two-handed slam with a shockwave.
- *Surge*: a 6 m armoured charge with its head down.
- *Stomp*: a rear stomp like the War Servitor's.
- Health 420 and super armour. It breaks out of combo holds like a War Servitor does.

**Mix:** wretch 4, hook 2, torcher 2, hulk 0.5. Chest guards and shrine elites draw from these.

**Loot:** materials up to epic (Augury Shard), so this is where the region's crafted weapons become possible. Drums
are mostly common, chests reach rare and epic, and the hoard rolls rare or epic.

---

## Area 3: Saint Orsk's Spire

> *Saint Orsk was the regime's high augur. From the top of his spire he read the future and gave it to the forges as
> weapons. The war ended but the spire never did: his order still sings in the bell-towers, still reads the future,
> and still turns away anyone who climbs.*

**Look:** a cathedral-fortress of black stone and old gold, its tall windows blown out, its gothic arches propped up
with scaffolding and sandbags. Bells, chains, censers and processional banners everywhere. Candle-lit naves and
violet augury-light leaking from cracks in the walls. Outside it's grey dusk with ash falling. This is the region's
last area, so it has to feel grand and wrong.

**Layout (~110 m, climbing):**
- Built in **three terraces** that step up from south to north: the *Pilgrims' Yard* at the gate, the *Cloister
  Ring*, and the *Choir Heights* at the foot of the spire. Ramps and stairs join them, so each terrace is a chokepoint.
  (The floors are visually raised. Gameplay stays 2D on the same grid.)
- *Lanes* become **cloister walks**: colonnades whose arches you see through but can't walk through.
- *Blocks* become **chapels** (small, candle-dark), **reliquaries** (houses with a basement crypt), **bell-yards**
  (walled, open to the sky), **scriptoria** (stacks of burned books, with tall shelves that act as maze walls), and
  **ossuaries** (walls of bones).
- **Landmarks** (the boss sites): *the Great Nave* (two blocks long, with an altar and a huge cracked window), *the
  Bell Foundry* (moulds, a furnace and a half-cast bell; this is where Gorrath waits), and *the Augury Well* (a round
  shaft full of violet light).
- **Basements:** crypts, catacombs, and *the Seers' Cells* (rows of small cells, each with a chair and a brass
  eye-machine).
- **Hazard: the Toll.** Every 90 s the spire's great bell rings. For 4 s every enemy on the map is **Emboldened**
  (attacks a bit faster, with a gold glint), and the screen shakes a little. It gives the area a rhythm. *(Not built
  yet; it would need a hook in main.js.)*

**Boss:** Gorrath in the Bell Foundry: the Slag Engine is the spire's bell-founder.

### Enemies of Saint Orsk's Spire

**Flagellant** (`flagellant`): *penitents who whip themselves for the future they saw.* Bare-chested and covered in
scars, with a hood and a crown of iron nails, a loincloth hung with purity seals, and a barbed scourge in each hand.
- *Flurry*: four quick lashes in a row (the first and last are parryable, the middle two aren't).
- *Whirl*: a spinning lash all round him.
- *Lunge*: a leaping double overhead from range.
- Every hit carries Bleed. Health 240, and he gets **faster as he's hurt** (his attacks speed up below half health,
  shown as blood mist).

**Spire Castellan** (`castellan`): *the order's armoured gatekeepers.* Plate in black and gold, a tall pointed great
helm with a glowing eye-slit, a tower shield with the Augury Eye on it, and a power-mace that crackles.
- **Guard**: from the front, while he isn't attacking, he takes only **40%** damage and very little poise damage
  (sparks fly off the shield). Get behind him, parry him, or catch him mid-swing.
- *Shield Bash*: a quick shove that knocks you back.
- *Judgement*: an overhead mace that can't be parried, with a telegraph.
- *Advance*: a shield charge that ends in a mace swing.
- Health 320, heavy poise, slow.

**Augur** (`augur`): *Saint Orsk's seers.* A tall robed priest with its eyes sewn shut and a brass oracle-eye fitted
to its brow, a hovering ring of prayer-scrolls, and violet light leaking from the seams of its robe. It holds a
censer-staff.
- **Foretold**: it marks a circle on the ground **where you're about to be** (aimed ahead along your movement). A
  lance of light falls there 1.1 s later. Change direction to dodge it, because walking in a straight line walks you
  into it.
- *Seeing Bolt*: a slow violet orb.
- *Recoil*: if you get within 2.5 m, it blinks about 6 m away in a puff of violet light (2 s cooldown between blinks).
- *Censer swipe*: a weak melee strike.
- Health 160. Its damage is the threat, not its toughness. Kill it first.

**Bell-Warden** (`bellwarden`, heavy): *a giant built to carry the spire's bells.* A huge armoured hulk with a small
bronze bell hanging on a chain from each hand like a flail, a harness of chains and a bell-cage on its back with a
burning censer inside.
- *Toll*: it swings both bells together. A **ring of sound** expands from it out to 7 m (roll through the edge).
- *Swing*: a wide bell sweep.
- *Crush*: a two-handed overhead.
- *Stomp*: a rear stomp.
- Health 560 and super armour.

**Mix:** flagellant 3, castellan 2, augur 1.5, bellwarden 0.5.

**Loot:** up to legendary (Oracle Core). Chests lean uncommon to rare with some epic; the hoard rolls epic or
legendary.

---

## Status

Done 2026-11-14:
- This design, and all eight enemies (`src/foes.js`).
- **Both maps**, open on the world map: `src/sump.js` and `src/spire.js`. Each is a City (`src/city.js`) with its own
  plan (block layout, lanes, landmark and vault sites, shrine kinds) and its own look. The maze, walking grid,
  basements, chests, enemies and boss vault are shared code. Ashfall Ward builds exactly as before
  (`scripts/raid-fingerprint.mjs`).
  - The Sump Lines: tiled tunnel walls with iron ribs, pipe runs, cables and caged hazard lamps. Flooded channels down
    about half the tunnels (they slow you). Stations (rail beds, benches, departure boards), collapsed stations with
    black pools, caged pump yards, round cisterns (the squares, water up to the shrine), and cave-ins. Station Ninefold
    (concourse, ticket booths, a faceless saint, a dead clock tower), the Pump Cathedral (the great engine with
    candles at its foot, a stained-glass control window) and the Sluice Works (a drained channel, hanging floodgates,
    winches). You come down by a maintenance lift. Dim everywhere, with your cone always on. Roofed rooms and
    basements are fully dark.
  - Saint Orsk's Spire: cloister walls of limestone and basalt with buttresses, blind pointed arcades, gold bands,
    crenels and candle niches. Steps between the three terraces. Chapels (pews, altar, icons, a censer), roofless
    chapels, bell-yards with graves, cloister garths with stone penitents, and ossuary heaps. Pitched slate roofs with
    pinnacles. The Great Nave (columns, a great stained window with the Eye, and a tower with a spire), the Bell
    Foundry (furnace, mould pits, a half-cast bell, chimneys, a bell-cote) and the Augury Well (a shaft of violet light
    ringed by seers' chairs, under a dome). The Pilgrims' Gate camp. A building between you and the camera drops to
    its wall stumps, filled with dark, because these are too tall to turn to glass.
- **Area chests and drums** (`CHEST_LOOKS` in `src/chests.js`): Sump pressure lockers (valve-wheel lock, gauge,
  hazard chevrons; the hoard's has two wheels and the regime eagle) and promethium canisters. Spire reliquaries (an
  ebony casket with a chapel-roof lid, gilt corners, a glowing saint icon as the lock, wax seals and candles; the hoard
  is longer, with a sword on the lid) and offering urns (clay ossuary jars for the plain ones). Breaking a drum leaves
  pieces in the area's materials.
- **Two new shrines** (`src/seals.js`), each always one of its area's three:
  - *Flood Valves* (Sump Lines): three valves 6-7 m out. Stand at one for 5 s to turn it (it slips back when you
    leave). The drowned come in every 7 s. All three open breaks it.
  - *Choir Bells* (Spire): three bells in frames (`chime` in foes.js: strikeable, never breaks, no health bar). The
    choir sings a four-note hymn on them every 7 s, each bell lighting in its own colour. Strike them in order. A
    wrong bell starts it over and calls guards. A straggler comes every 14 s anyway.
  - Both work in a party (`scripts/party-shrines.mjs`). The guest can do all the work.
- Loot as designed: the Sump reaches epic, the Spire reaches legendary.
- Tests: `scripts/shrines.mjs`, `scripts/party-shrines.mjs`, `scripts/look-area.mjs` (screenshots),
  `scripts/raid-fingerprint.mjs`. `scripts/raid.mjs` passes on the Sump Lines too. On the Spire it passes apart from
  its glass check, because the Spire cuts buildings to stumps instead.

Next:
1. Promethium slicks that light up, and the Toll (main.js hooks).
2. Re-dress the boss arenas (the Cold Pumps for Vael, the Bell Foundry for Gorrath). They use the old themes with
   new names.
3. Guest-side visuals for the flame and bile cones and the Augur's blink.
4. Whether area 2 should wait until area 1 is cleared (right now all three are open).
