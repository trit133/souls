# Region 2: The Sunless Deep (under the Glass Wastes)

Designed and built 2026-11-26 (the Status section at the end lists what's in and what's left). The rules carry over from region 1:
- each raid area is a hand-built map of about 95 m on walkable heights (`src/terrain.js`);
- three shrines a raid open the hidden boss room, and each area needs the gem of the boss before it;
- all three gems open the final area, and enemy positions change every raid;
- materials go straight to the stash.

**Each area is harder than the last, and region 2 as a whole starts above where region 1 ended.**

## The theme: down through the dark

> *On the surface the Glass Wastes are a desert of fused sand, melted to glass by the weapon that ended the war. But
> the regime came here long before the war, for what was under the sand: **seer-glass**, the crystal their augurs
> looked through to steal the future. They sank shafts a mile deep to mine it. When the weapon fell, the miners were
> sealed in below. Their great-grandchildren never saw the sky. They built towns in the caves, then cities in the
> caverns, and they still dig down toward the place where the glass is born: the Crucible, a sea of fire at the bottom
> of the world.*

The whole region is underground, and **you go down through it**:
- **Area 1:** a mining town in the upper caves;
- **Area 2:** the tunnels bored through the middle depths;
- **Area 3:** a great city in a crystal cavern;
- **Final area:** the red lava cavern at the bottom.

The world map pin stays where it is, on the Glass Wastes. The region map shows the layers going down: a cutaway of
the earth with the four places stacked from top to bottom, connected by shafts.

**Light:**
- **General:** underground, so there's no sun. The darkness is only a little darker than region 1's evening areas.
  Torches, lanterns and braziers are everywhere, and they light their surroundings well, with real shadows from the
  enhanced lighting. The vision cone stays on as it does in dark places now.
- **Area 1:** the brightest. Daylight falls through cracks in the glass ceiling far above, in thin white shafts.
- **Area 2:** the darkest. Torches, plus teal glowing fungus.
- **Area 3:** bright again, lit by violet and cyan crystal.
- **Final area:** lit red from below by the lava.

**Camera note:** the camera looks down from above, so a cave can't have a visible roof over you. Caves read through:
- rock walls rising tall around every edge, and stalactites and roots hanging at the edges of the view;
- darkness overhead (black fog above the walls rather than sky);
- dust and drips falling;
- light shafts from above (Area 1), and embers rising into black (the Crucible).

## Gold: about 30% more

Every source of gold in region 2 pays **1.3×** region 1:
- kill gold, chest gold and the boss's gold;
- the area-clear bonus;
- the region's trader quests.

This is one multiplier per region (`GOLD_MUL: { r1: 1, r2: 1.3 }`), so later regions can climb the same way.

*(Region 2 materials are already worth 2× region 1's when you sell them (`REGION_WORTH.r2 = 2`). That's a question
for Jonah: keep it at 2×, or bring it in line at 1.3×.)*

## Difficulty

| | Area 1 | Area 2 | Area 3 | Final |
|---|---|---|---|---|
| Regular enemy health | 300-340 | 360-420 | 440-520 | mix of all |
| Heavy enemy health | 700 | 820 | 950 | |
| Typical hit | 30-36 | 34-42 | 40-48 | |
| Armour / resistance | +12 over r1 area 1 | +16 | +20 | |
| Loot tops out at | rare | epic | legendary | (no loot, as the Bastion) |

## New materials (10)

| Rarity | Materials |
|---|---|
| Common | Ore Chunk, Lamp Oil, Pit Timber |
| Uncommon | Raw Seer-Glass, Glowcap, Rivet Spool |
| Rare | Prism Lens, Borer Tooth |
| Epic | Geode Heart |
| Legendary | Kiln Ember |

## New ground and wall textures

**Ground** (a third texture set alongside `surface` and `under`):
- cave rock;
- gravel and ore dust;
- packed mud;
- boards (mine walkways and town decks);
- in the deeper areas, crystal floor and cooled lava crust.

**Walls** (`wallTex`): timber shoring, carved stone, rough cave rock, crystal and obsidian.

**Plants:** in place of grass:
- pale cave moss;
- glowing mushrooms (teal in Area 2, which also give off light);
- hanging roots;
- crystal clusters growing from the walls and floor (Area 3).

---

## Area 1: Lanternhold (the mining town)

> *The first town below. Built on scaffolds and ledges down the sides of the main shaft, lit by a thousand lanterns,
> because the dark down here takes people who wander. The miners still work the seams. Something in the glass dust has
> got into their lungs and their heads.*

**Look:**
- timber houses on stilts and ledges, rope bridges, and lift cages on chains;
- mine-cart rails, ore chutes, and lanterns on every post;
- shafts of daylight falling from cracks in the glass far overhead;
- warm amber lantern light against the cold white of the shafts.

**Layout (~95 m, five tiers going down):**
- **The Top Landing:** where you come in on a lift cage, with the camp.
- **The Ledges:** houses cut into the cave wall, with rope bridges between the ledges.
- **The Market Floor:** a big open cavern floor with stalls, a dry well and a lantern-tree (a dead tree hung with
  lamps).
- **The Workings:** ore heaps, sorting sheds and rails, with a cart line running down a long ramp.
- **The Sump Pit:** the deepest point, with water and the pumps.
- **Boss sites:** the Foreman's Hall, the Lamp Chapel, the Winding House (the great winch over the shaft).
- **Basements:** old galleries behind the houses and abandoned seams.

**Enemies (the Lanternhold miners):**
- **Shaft Rat** (fodder): a scrawny miner with a hand pick. They come in packs of 4-6, low health and fast. Their pick
  jab is quick and weak. Easy to kill, dangerous in a crowd.
- **Rivet Gunner** (ranged): a pneumatic rivet gun with a hose to a tank on his back. He fires a burst of three rivets,
  then **vents steam to reload** for 1.5 s, which is your window to close in. He backs off to keep about 8 m away.
- **Shaft Creeper** (assassin):
  - **Unseen in the dark:** he's thin and pale with lamp-black skin, and invisible outside light. You see him only
    inside your vision cone or near a torch; out in the dark, all you see is two pin-points of eye.
  - **Pounce:** he drops on you from a ledge, strikes a fast three-hit dagger combo, then retreats into the dark.
  - Low health: he dies quickly once you catch him.
- **Ore Hauler** (heavy): a huge miner in a steam-powered frame, a rock drill on one arm and an ore bucket on the other.
  - *Drill:* a grinding thrust.
  - *Bucket Slam:* shakes the ceiling, so **rocks fall** in marked circles around him.
  - *Charge:* a short rush.
  - Super armour.

**Shrines (one new, two old):**
- **New: the Ore Cart.** A loaded cart on rails sits about 25 m from the shrine. Stand next to it to push it along the
  rails. It stops when no one is beside it. Miners come to stop you, Shaft Rats in waves, and the cart reaching the
  shrine breaks it. In a party, more players pushing makes it go faster.
- **Old:** the Elite pack and the Circle (hold the ground).

**Boss: the Lamp-King.** The town's foreman-lord, swollen and tall, carrying a huge iron lantern-cage on his back with
something burning and screaming inside it. His weapon is a long-handled pick-hammer.
- *Snuff:* he slams his hand on the lantern and **every light in the arena goes out** for 8 s. Only his lantern glows,
  so you track him by it, and his attacks are telegraphed by the glow brightening. Your vision cone still works.
- *Lantern Toss:* he hurls the cage on its chain. It bursts into a ring of fire where it lands, then he hauls it back.
- *Pick-hammer:* a three-hit combo, and a ground strike that sends a crack running along the floor.
- **Second phase:** the lantern breaks open and the fire inside rides on his shoulders. His hits now carry Fire, and
  he relights the arena only in a ring around himself.
- Drops the **Lamp-King's Gem** (his lantern-cage face).

---

## Area 2: The Wormways (the tunnels)

> *Below the town the regime's borers went down: drilling engines the size of chapels, half machine, half something
> grown. Some of them never stopped. The Wormways are the tunnels they left, hundreds of them, crossing over and under
> each other, round and smooth as the inside of a gun barrel.*

**Look:**
- round bored tunnels with spiral drill marks on the walls;
- old rails, and dead borer shells that are big enough to walk through;
- webs of roots, and teal glowing fungus;
- torches only where people still live.

It's the darkest area of the region.

**Layout (~95 m, a tangle on three levels):**
- **Unique feature:** tunnels **cross over and under each other**. A bridge-tunnel runs across the top of a lower one,
  you can see enemies walking below you, and you can drop down onto them.
- **Chambers** where tunnels meet:
  - a fungus farm;
  - a borer graveyard, where you walk through the shells;
  - a squatters' camp;
  - a flooded junction, where the water is only visual (it doesn't slow you).
- **Boss sites:** the Borer's Nest, the Spiral Shaft (a corkscrew ramp down), the Grinding Hall.
- **Basements:** the borers' maintenance crawlways.

**Enemies (the things that live in the tunnels, and the cult that feeds them):**
- **Burrow Grub** (fodder): a pale, fat larva the size of a dog. Slow and weak. It **bursts in acid when killed**,
  leaving a small pool for 3 s, so finish it from range or step back. They come in groups.
- **Spore Lobber** (ranged): a fungus-grown cultist with a sack of spore pods on its back. It lobs pods that burst into
  a **lingering poison cloud** that lasts 4 s, which denies you ground. It's weak up close.
- **Burrower** (assassin):
  - *Under the floor:* it travels underground as a moving mound of dirt that you can't hit.
  - *Erupt:* **cracks spread under your feet** for 0.8 s, then it bursts up with two sickle claws. Roll away from
    the cracks.
  - It attacks fast for a few seconds, then dives back under.
- **Borer Thrall** (heavy): a cultist fused into a small boring engine, with a rotating drill for a head and treads
  for legs.
  - *Drill Charge:* a straight line that **cuts through cover**.
  - *Spin:* a 360° tail sweep.
  - *Dig In:* it vanishes and resurfaces under you.
  - Super armour.

**Shrines:**
- **New: the Lantern Run.** The shrine is dark. A burning lantern sits on a hook at a lit brazier somewhere along the
  tunnels. Pick it up and carry it back to the shrine.
  - You can still fight while carrying it, but **if you're hit, it drops**. Another hit while it's on the floor puts
    it out, and it returns to the brazier.
  - Enemies go for the carrier. The lantern also lights the dark tunnels around you as you go.
  - In a party, anyone can pick it up.
- **Old:** the Altar (effigies) and the Valves (here they're the old pump valves).

**Boss: the Mother Borer.** The first of the drilling engines, grown into something alive. She's a great segmented worm
of iron plates and grey flesh with a spinning drill-mouth, and she fills a round chamber.
- *Dive and Erupt:* she sinks into the floor. A ring of cracks marks where she'll burst up 1.2 s later.
- *Sweep:* her body arcs across the chamber at head height on the surface; you **roll under it**.
- *Brood:* grubs pour out of vents in her sides.
- *Weak points:* three glowing **vent-hearts** along her back are open only after an Erupt. Breaking them stuns her and
  deals big damage.
- **Second phase:** she bores right through the arena wall and back in from different sides, faster.
- Drops the **Borer Gem** (a drill-mouth).

---

## Area 3: Glasshallow (the crystal city)

> *A cavern so big it has weather: mist rising from a black lake, its walls studded with seer-glass that glows
> violet and blue. The Glass-Wrights built their city here around the largest vein ever found, and they worship it.
> They stare into it until they see the future, and then they never look away.*

**Look:**
- an underground city of carved pale stone, with spires that grow into the crystal;
- bridges over a black lake, and stairs cut into the cavern wall;
- great crystal pillars glowing violet and cyan;
- priests in white and silver.

Brighter than the other areas, because the crystal light fills it.

**Layout (~95 m, a city climbing out of the lake):**
- **The Lake Quarter:** stone docks and moored boats, low.
- **The Terraced Streets:** houses carved into the rock, climbing.
- **The Glass Gardens:** an open plaza of crystal "trees".
- **The Upper City:** around the Vein, the giant crystal seam.
- **Boss sites:** the Hall of Mirrors, the Lens Cathedral, the Vein Altar.
- **Basements:** reliquary vaults and drowned cellars.

**Enemies (the Glass-Wrights):**
- **Glass Acolyte** (the regular melee): a pale robed figure with crystal grown through its skin and a curved glass
  sickle. It **shatters on death**, a small burst of shards that hurts at 1.5 m. Fair health, and it comes in pairs.
- **Prism Lancer** (ranged): carries a tall lens-staff and fires a beam of light that **bounces once off any crystal
  pillar**. You can be hit from an angle you didn't expect, but you can also see the line it will take, because the
  beam traces faintly before it fires.
- **Mirror Shade** (assassin):
  - *Mirrors:* it splits into **three identical copies**. Only one is real, and the others break in one hit.
  - *Behind you:* the real one tries to get behind you while the copies distract.
  - *Tell:* the real one casts a shadow and the copies don't, which the lighting system can show.
- **Shardback** (heavy): a giant of the Wrights' guard, armoured in crystal plates.
  - *Plates:* its plates **take most damage until cracked**. Each plate shows cracks as you hit it, then falls off,
    and the flesh under it takes full damage. Three plates: chest, back, shoulders.
  - *Shard Spray:* a cone of crystal.
  - *Crystal Wall:* it raises a line of crystal from the floor that blocks movement for 4 s.
  - Super armour.

**Shrines:**
- **New: the Prism.** The shrine crystal is dark. A beam of light comes from a crystal on the cavern wall, and three
  **mirrors** on pivots stand around the square. Stand at a mirror to turn it a notch every second.
  - The beam visibly bounces mirror to mirror; get all three angles right and the light reaches the shrine and breaks
    it.
  - Enemies come while you work. The right angle for each mirror is shown by a faint mark on its base.
- **Old:** the Choir Bells (crystal chimes here, since the Wrights sing to their glass) and the Elite pack.

**Boss: the Glass Hierophant.** The high priest of the Vein, who has looked into it so long he's more glass than man:
tall, robed, his face a smooth mirror, with a glass crozier.
- *Foresight:* like the Augur but stronger. He marks **three** places where you'll be, in a sequence along your path.
- *Reflections:* he steps into one of the mirror-pillars around his arena and **comes out of a different one**. Break
  the pillars (each takes a few hits) to take away his doors.
- *Shard Rain:* crystal falls across half the arena, and the safe half is marked.
- **Second phase:** two **reflections** of him fight alongside him. They copy his attacks a half-second late, so the
  rhythm is the real test.
- Drops the **Hierophant's Gem** (a mirror face).

---

## The final area: The Crucible (the bottom)

> *At the bottom of every shaft, past the last tunnel, the earth opens into a cavern too big to see the roof of. It is
> red. Rivers of lava run across the floor, and the heat makes the air shake. This is where seer-glass is born,
> fused out of the rock by the fire, and this is where the regime's first glassmaker went down to see the future
> first, and never came back up.*

**Look:**
- a vast dark-red cavern, the ceiling lost in black, embers rising into it;
- black basalt and cooled lava crust, rivers and pools of lava here and there;
- chains hanging down from nowhere;
- the regime's abandoned foundry built into the rock;
- everything lit red from below.

**Layout (like the Sentinel's Bastion: an approach, then the arena):**
- **The approach:** a descent on terrain tiers down basalt ledges:
  - lava channels you cross on chained bridges and cooled-crust paths;
  - the ruined Kiln-Works, where the first seer-glass was poured;
  - the region's hardest enemies, one of each type from all three areas, two of them elites.
- **The Gem Door:** the three gems set in a gate of black glass.
- **Lava:** it does damage over time if you step in it and is never walkable by enemies. It glows and bubbles. It's
  only at the edges and in channels, never in the way of the main fight.

**Final boss: The Kilnfather.** The regime's first glassmaker, who poured the first seer-glass. He stepped into the
Crucible to see the whole future at once, and he's been standing in it ever since. Now he's a giant of half-cooled
glass over a body of molten rock, light moving inside him, holding the long iron blowpipe he made the first glass with.
He's the region's master. The arena is a round floor of black glass in a lake of lava.

**Phase 1: the Glassmaker**
- *Blowpipe:* sweeping polearm combos with long reach.
- *Gather:* he dips the pipe in the lava and **blows a glowing globe** that flies to a spot and **hardens into a glass
  pillar**. Pillars block shots, and both of you can use them for cover. They last 20 s.
- *Quench:* a slam that cools the floor around him into spikes of glass.

**Phase 2: the Crucible rises (at 60% health)**
- The lava climbs. **Rings of the arena floor flood with lava in a pattern** (inner ring, then outer ring, then
  halves), with a clear warning glow first.
- He walks through the lava untouched. You have to move between the safe parts while fighting him.
- He can **Quench** a path across the lava, which also makes a path for you.

**Phase 3: Shatter (at 25% health)**
- His glass shell cracks off and the molten core shows: faster, hitting harder with Fire.
- *Foresight:* he sees the future the way the Hierophant did. His attacks come out **aimed where you're going to be**.
- Breaking a pillar he made sprays shards that hurt him too. Using the arena against him is the way to win.

**Defeat:** he cools and freezes mid-reach into a statue of black glass, then cracks apart. The lava drains back
down, and the gate to the region beyond opens (the Forge Reaches).

---

## Shrine summary

| Area | New shrine | Old shrines mixed in |
|---|---|---|
| Lanternhold | Ore Cart (push it to the shrine) | Elite pack, Circle |
| The Wormways | Lantern Run (carry the light home, don't get hit) | Altar, Valves |
| Glasshallow | Prism (turn three mirrors to aim the beam) | Choir Bells (as crystal chimes), Elite pack |

All three new shrines need to work in a party. Anyone can push, carry or turn, the same as the Valves and Bells.

## Other parts of region 2 (later)

- **Traders:** Old Kettle (half-servitor tinker) opens after the Lamp-King, and Mama Sorrow (fortune-teller) after the
  Kilnfather. Their booths are already standing in the Bazaar.
- **Region weapons** (workbench): one per class, made from region 2's materials.
- **Region map art:** a cutaway of the layers, for Jonah to paint. I can write the prompt.
- **Runes:** region 2's set of 25.

## Suggested build order

1. The cave textures, the underground lighting (a `SKIES` entry per area) and the cave look of walls and edges, tried
   in the training ring first.
2. Lanternhold's map, its four enemies, the Ore Cart shrine, then the Lamp-King.
3. The Wormways with its enemies, the Lantern Run shrine and the Mother Borer.
4. Glasshallow with its enemies, the Prism shrine and the Hierophant.
5. The Crucible and the Kilnfather.
6. Gold ×1.3, materials, the traders, the region map.

---

## Status (built 2026-11-26)

Jonah's answers:
- The region has a new name: **the Sunless Deep**.
- It has its own set of materials, worth 1.3× region 1's (not 2×). The stash shows a section per region.
- The lava cavern is the final area, with a short approach and then a separate, more lava-filled arena for the boss.
- He approved the lineup.

**What's in:**
- **The region:** region 2 opens on the world map. Its first area opens once Varek has fallen (joeandre has everything
  open, through `regionKeys`).
- **Region map:** drawn in code (`mapart.js drawDeep`) as a cutaway: the glass crust at the top, strata going down,
  a cavern round each place, the shafts between them, and the fire at the bottom.
- **The three raid areas:**
  - **Lanternhold** (`lanternhold.js`): five ledges stepping down the shaft, lanterns, light shafts. Its own shrine
    is the Ore Cart.
  - **The Wormways** (`wormways.js`): trenches bored through the rock under arches, galleries above them that you
    can drop from, the fungus farm, the borer graveyard. Its own shrine is the Lantern Run.
  - **Glasshallow** (`glasshallow.js`): four terraces out of a black lake, crystal pillars that the Lancers bank
    their beams off, the Lens Cathedral, the Vein. Its own shrine is the Prism.
  - All three are built on `deep.js`: dim everywhere, so the vision cone is always on, with cave walls, a lift cage
    at the way in, and lamps.
- **The final area** (`modules.js FINAL_MODULES`):
  - **The Crucible:** a descent from 8 m to 0 m over a chained bridge across a lava channel and through the
    Kiln-Works, where the lava pools burn you. The Deep's hardest enemies stand along the way, two of them elites,
    and the Gem Door of black glass is at the end.
  - **The Kiln:** a basalt island in a lake of lava.
- **12 enemies** (`deepfoes.js`) and **4 bosses** (`deepbosses.js`), as designed above. The bosses have their own
  arenas and use music from region 1 for now (the Lamp-King Hask's, the Borer Gorrath's, the Hierophant Vael's,
  the Kilnfather Varek's).
- **Shrines:** the Ore Cart, the Lantern Run and the Prism (`city.js`, `seals.js`). Each area also draws two of
  region 1's shrines.
- **Materials and traders:** 10 materials, 3 gems and 2 relics, each with its own icon. Old Kettle and Mama Sorrow
  trade only the Deep's goods and have 8 quests each. Gold is ×1.3 (`progress.js GOLD_RATE`).
- **Textures and lighting:** the cave texture sets (cave, glass, deep), moss, glowing mushrooms and crystals, and a
  sky for each area (`lighting.js`).
- **Tests:**
  - `scripts/look-deep.mjs r2a1|r2a2|r2a3`: shots, reach and a walk.
  - `scripts/deep-foes.mjs <area>`: each enemy type fought alone.
  - `scripts/deep-boss.mjs <area>`: a boss fought through both phases, then its gem.
  - `scripts/deep-shrines.mjs`: the three new shrines.
  - `scripts/look-crucible.mjs`: the approach, the walk down and the lava.
  - Region 1 is unchanged (`raid-fingerprint`, `layout-fingerprint`).

**Not done yet:**
- region 2's crafted weapons and runes;
- its own boss music;
- its own chest and drum looks (the default ones are used);
- party testing of the new shrines and of the Shade's copies;
- a painted region map (the code-drawn one stands in).
