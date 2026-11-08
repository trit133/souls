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
  - **Sister Vael** (Moonlit Cloister): a moon-masked assassin with a swinging silver braid, a split cloak and two crescent daggers; sidesteps your swings, lunges and dives.
  - **Gorrath** (Slag Forge): giant maul; slams, sweeps, rear stomp, thrown boulders.
- **After each mini boss:** pick 1 of 3 random power-ups, or **Rest** (full HP and flasks refilled). Power-ups stack:
  - +25 max HP
  - +15 max stamina
  - +15% damage
  - +15% roll distance
  - +10% attack speed
  - Bleed, Poison, Frost or Fire Infusion: each hit adds 15% of its physical damage as that element (+8% for each extra)
- **Damage types** (`src/damage.js`): physical, fire, bleed, poison and frost. A hit's total comes off the health bar; only elemental damage builds status (bleed damage builds bleed, and so on). Every character's weapon is physical; the skill tree and Infusions add the rest.
- **Status effects** (Elden Ring-style buildup): each point of elemental damage fills that status's meter (×3.5 for melee, ×1.5 for spells, ×4 for enemy hits). When it's full the effect procs and the meter resets. After its first proc on an enemy or a player, that status needs twice the buildup.
  - On enemies: bleed is a burst of 15% max HP + 45; frost 10% + 25 and slowed for 6 seconds; poison 20% + 60 over 10 seconds; fire 25% + 50 over 3.5 seconds. Bosses take roughly half the percentage.
  - On players: bleed a burst of 15% max health; fire 15% over 3.5 seconds; poison 15% over 10 seconds; frost 6% and slowed for 4 seconds. Your meters show as icons over your health bar.
  - Enemies show small status icons above their health bar while a meter is filling; the icon flashes when it procs.
- **Enemy elements:** part of an enemy's hit is elemental, taken out of its physical damage so the total stays the same (25% with one element, 15% each with two). Regular enemies carry one more often the deeper you go: 1 in 8 before the first mini boss, 1 in 6 before the second, 1 in 3 before the third, 1 in 2 (some with two) up to Varek; the second section's rows are already in `ELEM_CHANCE`. Hask hits with bleed, Vael with frost and bleed (half the buildup per hit: she hits fast), Gorrath with fire, Varek with fire once he ignites. Their weapons show it.
- **Armour and resistances** (skill tree): the Knight's armour cuts physical damage (up to 20%). Each 1% of an element's resistance cuts its buildup on you by 1% and its damage by 0.5% (up to 50%: half the buildup, a quarter less damage).
- **Weapon effects** (`src/weaponfx.js`): any element you deal at least 1.5 of on a light hit shows on your blade as pixel particles: bleed drips red, fire burns, frost radiates white cold, poison drips green. Two or three blend into a named look (Bloodfire, Crimson Rime, Black Blood, Frostfire, Venom Flame, Rime Venom, Ember Blood Ice, Plague Fire, Frozen Plague, Elemental Venom); all four flash gold. Teammates see yours.
- Module code lives in `src/modules.js`, power-ups in `src/boons.js`, and status effects in `src/status.js`.

## Home screen
`src/home.js`, pixel art in `src/pixelui.js`. You must be signed in to play: signed out, the title shows a big **Sign in to play** tile, Settings and Fullscreen. Signed in, it is a Smash-style menu of square tiles in reds and oranges, each in a riveted pixel-art frame with a pixel icon: big **Single Player** and **Multiplayer** tiles, then smaller **Skill Trees** (with your gold), **Skins** and **Settings**, and a Fullscreen bar. Labels use the title's pixel font, lit like hot metal with a sweeping shine; hovering a tile lights its frame, lifts it, sets its letters burning and sends up pixel embers. Arrow keys move between tiles. **Single Player** opens the character select: the class cards with their hover animations, and dark "?" tiles for the six characters still to come. Sign Out is in Settings. The sign-in box, Skins, Settings and the multiplayer lobby share the look (`src/pixelmenus.js`): pixel-font headings, buttons as riveted pixel tiles in reds and oranges (their labels redraw whenever the game changes the text), dark pixel-framed panels, a padlock on locked skins and classes, segmented progress bars and sliders, and the room code in big fiery letters. `scripts/menus.mjs` takes screenshots.

## Gold and permanent upgrades
- **Earning:** enemies are worth 1 (a brute 3). A room's coins pay out when the room is cleared. Mini bosses drop 15, 20, then 25, and Varek 30.
- **Banking:** a room's coins go to your account permanently the moment the room is cleared (×1). Boss drops bank when the boss dies. Dying keeps everything banked so far; there is no cash-out.
- **Section bonus:** the run has four sections, ending at each mini boss and at Varek, with rates ×1, ×1.5, ×2, ×3. Beating the boss that closes a section banks the extra on that section's gold (+0%, +50%, +100%, +200%).
- **Rooms:** each room's exit is fogged until every enemy in it is dead. Enemies never notice or chase you across rooms.
- **Fights:** one enemy at a time fights each player. Others who have noticed you hover nearby with their weapon up, drifting in and out, and step in for one attack every 10-15s. Hitting one of them makes it your fight.
- **Enemy tiers:** each mini boss passed gives everything after it +10% health, damage, move speed and attack speed (additive). In a party, regular enemies instead get +20% / +40% / +60% health and +15% / +20% / +25% damage per stage (speeds as solo).
- **Boss stun:** a boss knocked to its knees by stun needs twice as much for every knockdown after the first. Eyes turn red, then orange, then white with a red halo.
- **Skill trees** (title screen, lobby and after a run; `src/skilltree.js`, screen in `src/treeui.js`): each character has its own web of 215 nodes over 22 rings around a start node: the Knight's a cross with octagon rings and wheels in the gaps, the Rogue's a spiral of long and short arms with sweeping arcs, the Spellsword's a five-point star with gem wheels and forks. Every tree has about 10 nodes a ring: 80 in rings 1-8, 70 in rings 9-15 and 65 in rings 16-22, so each costs about the same to complete (~31,000 gold). Nodes never overlap and link lines never cross (`scripts/gen-trees.mjs` saves the positions to `src/treelayout.js`; run it after changing a shape). Hover a node to see what it gives; **click once to unlock** it (it must touch a node you own). Prices: rings 1-8 10 -> 80, rings 9-15 100 -> 200, rings 16-22 250 -> 350; evolution 150; rune sockets 1.5x their ring.
  - **Node limit per tree**, from that character's own progress: 45 in the first section, 70 once that character has beaten Varek, 100 in the second section and 130 after beating it (the second section is still to come).
  - **Backgrounds** (`src/treebg.js`): a pixel-art scene per character, painted in code at about the game's resolution, with the middle kept dark for the web (no painted rings: the tree draws its own). The scene drifts a tenth of the way with the tree when you drag it, and scales slightly with the zoom. Knight: the Hall of Fallen Kings (two knight statues with planted swords, torn crimson banners, broken stained glass with moonbeams, gold braziers, a royal floor circle, rising embers). Rogue: the Shadow Realm (floating broken arches, black chains, stairs to nowhere, a hollow-faced hooded statue, a skeletal hand holding a crimson dagger-crystal, trapped shadow figures, black flames, violet smoke, flickering red sigils). Spellsword: the Library Beyond (towering shelves, star-filled windows with distant lightning, a floating spellbook streaming cyan runes, a staff in a crystal chamber with orbiting gold rings, an astronomical clock, faint arcane diagrams). Braziers, black flames, spirit flames, the rune circle and moonbeams are pixelfx effects.
  - **Stats panel** on the left of the tree screen: that character's health, stamina, flasks, speeds, damage per type with a light hit worked out, armour and resistances, and their own bonuses. Hovering a node you don't own shows what it would change (in green).
  - Inner rings: flat health and stamina. Middle rings: more of those and early +1% health or stamina. Outer rings: mostly percentages (health, stamina, move or attack speed, potion healing), some bigger flat chunks, and two extra flasks.
  - **Damage nodes** for every type in every tree, leaning to the character's own. Knight: the most physical, +15 flat over ten nodes and +5/8/10/12/15% (50%). Rogue bleed and Spellsword frost: +7 flat and +15/20/25/30/35% (125%), plus +6 physical flat and +5/8% physical. Every other element: +1 and +2 flat and +15/20/25% (60%). Small values near the centre, the biggest at the edge.
  - **Resistances** in every tree: fire, bleed, poison and frost, 6 / 8 / 10 / 12 / 14% each (50% in all). **Armour** (Knight only): 10 nodes, 20% in all.
  - Character nodes, small and large (capped so a full tree stays fair): Knight block stamina drain, shield chip, stun buildup, guard counter damage, charge cooldown and knockback; Rogue parry cooldown, crit damage, roll invincibility, attack and roll stamina cost, parry window (+1 / +3 ms, max 10 ms); Spellsword max mana, mana per hit, bolt and fireball cost, spell damage, blast radius, knife damage.
  - Evolution: 6 rings out. Three empty rune sockets sit on ring 10 (dashed violet), a third of the way round from each other and joined by the same 3-node chain on every tree, so going socket to socket costs the same for every character. Runes come later.
  - **Reset**: click owned nodes to mark them (anything they would cut off is marked too), then Confirm to get their full price back.
  - Hover shows a node's details and they clear as soon as you move off; on touch a tap buys and shows it until the next tap.
  - The old shop's spending, and anything bought on earlier tree layouts (including the 180-node one), is refunded once at the price paid; the Spellsword unlock (100) stays. `scripts/tree.mjs` tests it; `scripts/treecheck.mjs` checks the layout (no overlaps).
- **Spellsword:** R1 knife hits (11 and 14 damage, 20% slower swings, 14-15 stamina) give 10 mana (the only mana source). R2 fires a blue bolt (8 mana, 8 frost damage, no stagger or knockback). L1 fires an exploding fireball (75 mana, 120 fire damage). Starts with 100 mana; the mana bar shows the exact amount.
- **Accounts:** online, in `server/` (Node + SQLite). Passwords are hashed with scrypt, and each device gets its own login token. Rules live in `src/progress.js`.

## Skins
Each character unlocks skins from their own kills (saved on the account; solo counts killing blows, a party splits each cleared room's kills evenly, rounded up, and every boss counts for everyone): **100** and **250** kills are recolours, **500** is a new look with its own pieces. Pick them in **Skins** on the title screen or in the lobby; teammates see your skin. Defined in `src/skins.js`; the 500-kill builds are `paladin`, `wraith` and `starborn` in `src/kits.js`. `scripts/skins.mjs` tests unlocking and takes preview shots.

| | 100 | 250 | 500 |
|---|---|---|---|
| Knight | Ember Guard (crimson, gold) | Nightguard (black steel, violet) | Radiant Paladin: winged helm, halo, flowing cape, sun kite shield, glowing blade |
| Rogue | Ashwalker (pale grey, white scarf) | Viper (black, venom green) | Wraith: bone mask with burning eyes, ghostly wisps, spectral red blades |
| Spellsword | Ember Mage (crimson, fire runes) | Verdant (emerald, green runes) | Starborn: crystal shoulders, star-flecked cape, crown of orbiting crystals, violet blade |

## Multiplayer (2-3 players)
Create a room, share the 4-letter code, and the host starts the run. The host's browser runs the enemies; each player runs their own character, so dodges are judged on that player's device. Code is in `src/mp.js`.

| | 2 players | 3 players |
|---|---|---|
| Bosses and brutes: health | +75% | +200% |
| Bosses and brutes: damage / attack speed | +20% / +10%, 30% shorter gaps | same |
| Regular enemies: health | +10% | +13% |
| Regular enemies: damage | +10% | +12% |
| All enemies: move speed | +10% | +10% |
| Extra regular enemies | +30% | +60% |

- **Gold:** every signed-in player banks the full room and boss amounts on their own account, including section bonuses.
- **Going down:** you stay down until a teammate revives you (50% health). Each revive takes 10% of max health from everyone for the rest of the run. If everyone is down, the run ends.
- **Rewards:** each player picks their own, and the run resumes when everyone standing has chosen.
- **Teammates:** their attacks play out on your screen from instant events, and their sounds play at half volume. Every ability effect (ground pound, knee impact, shroud, red slash, rune impale, cast glow and circle, explosions, heals, shield bashes, status bursts, Varek's Ember Burst and ignite) is a named effect in `src/vfx.js`: the device that performs it plays it and sends it, and every other screen plays the same thing. Jumps, the shroud vanish, reverse grips and the shield-charge shield show on teammates too. `scripts/mpfx.mjs` checks it with two devices.
- **After a run:** everyone taps Ready Up, and the host's device rolls a new run in the same room. **Lobby & Upgrades** goes back to the room's lobby to shop and change class; the host can start from there.
- **Down when a mini boss dies:** you get back up at half health (no revive penalty) and pick a reward like everyone else.
- If the host leaves, the run ends for everyone.

## Server
Runs as the user service `souls-server` on port 4100, public at `/souls` through Tailscale Funnel. Data is in `server/data/` (gitignored). The unit file is in `deploy/`. To reinstall: `cd server && npm i`.

**Pixel-art look** (`src/pixel.js`): the 3D scene renders at about 270 game pixels tall, gets 1-pixel outlines, hard 3-step lighting and a fixed palette with ordered dithering, and is scaled up by a whole number with CSS `image-rendering: pixelated`. This is also cheap on big and ultrawide screens. Screens wider than 2.4:1 get a 2.4:1 horizontal view. `scripts/look.mjs <tag>` takes review screenshots.

**Living models** (`src/models.js`, `src/kits.js`): every character is built from boxes with per-character detail. Cloth, capes, plumes, scarves and hair hang on springs that react to movement, turns and a gusting wind; armor plates rattle on footsteps and hits (the Knight's also clink); arms, torso and head get a little follow-through. The Rogue is a hooded, cloaked figure with curved daggers and an idle dagger flip; the Spellsword's coat runes glow with her mana and glyphs orbit her off hand; Varek's armor cracks glow once he ignites. All visual: hit-boxes are circles around each actor.

**Combat effects** (`src/pfx.js`): pixelfx effects drawn into small canvases on camera-facing sprites, on the same pixel grid as the scene: hit sparks, crits, parries, blocks, heals, death poofs, the Spellsword's charge-up, magic circle, blue bolt and churning fireball with explosion, and Varek's Ember Burst. Effects copied from the pixelfx library live in `src/pixelfx/fx/`. `scripts/models.mjs` and `scripts/effects.mjs` take review screenshots.

It runs in desktop browsers and on iPhone (landscape, touch controls). You can add it to the Home Screen for fullscreen.

## Run

```bash
npm install
npm run dev      # http://localhost:5173 (also exposed on LAN for phone testing)
npm run build    # static build in dist/ — deployable to any static host
```

## Characters
- **Knight**: longsword and shield. 150 HP, 3-hit combo plus heavy. Hold **L1** to block: it drains 10 stamina a second and a quarter of each blocked hit still gets through. Press **heavy** right after blocking a hit for a guard counter, a quick forehand-backhand (21 + 21). The Knight builds the most stun by far (light 15, third swing 25, heavy 37).
- **Rogue**: twin daggers. 105 HP, fast 4-hit combo, lunge heavy, longer i-frames. **L1** parries (tight window, 8 s cooldown from any attempt, 5 s with Red Riposte, 1.5 s less after a successful parry; the HUD shows it). A successful parry opens a riposte. Builds little stun.

## Controls
Every keyboard and mouse binding can be changed in **Settings** (title screen or pause menu), along with Pixel size (Chunky / Medium / Fine: about 180, 270 or 360 game pixels tall), master, music, effects and teammate volume, screen shake, and touch button size and opacity. Signed-in players keep their settings on their account across devices; guests keep them on the device. Defaults:

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
- **Combos** (`src/combos.js`): start with a normal attack; at a set moment in each move the weapon glints and a little red mark shows over your head, and pressing the next input within **180 ms** continues the combo (a chime plays). Pressing outside the window does that button's normal move; doing nothing ends it. Combos branch from shared openings. Each class has three 3-move combos and one 4-move combo whose moves play 15% faster (the four evolution combos to come split the same way). Every attack costs 10% less stamina than its listed cost; combo moves cost a fixed, larger amount. A full combo deals about 20% more than its normal inputs. Every combo move can be interrupted (a hit cancels the combo), and a combo staggers each enemy at most once, so nothing gets stun-locked. Combo moves turn to an enemy right behind you (after the roll steps). The skill tree screen lists them under the stats. `scripts/combos.mjs` plays each one on time, early and late.

| | Knight | Rogue | Spellsword |
|---|---|---|---|
| 3-move | **Crown Cleave** R1 R1 R1: two cuts, a two-handed overhead with a gold shockwave (95) | **Thousand Cuts** R1 R1 R1: two stabs, four rapid cuts (61) | **Rimeblade** R1 R1 R1: two cuts, a frost thrust bursting into ice (45) |
| 3-move | **Bulwark Breaker** R1 R2 R2: slash, shield bash, leaping slam (95) | **Viper's Dance** R1 Roll R1: stab, flank roll, spinning cross-cut (64) | **Shatter** R1 R2 R1: cut, bolt, rune strike detonating frost (47) |
| 3-move | **Iron Tempest** R2 R1 R2: heavy, a full spin, lunging thrust (96) | **Hemorrhage** R2 R1 R2: lunge, cut, X slash that bursts blood (66) | **Glacial Lance** R2 R1 R2: bolt, cut, three ice lances (44, 16 mana) |
| 4-move, faster | **Vanguard** R1 Roll R1 R2: slash, roll, rising cut, impaling stab (120) | **Shadow Reel** R1 R1 Roll R2: two cuts, back-flip, diving stab (99) | **Arc Step** R1 Roll R1 R2: cut, roll, cut, frost nova (59, 12 mana) |
- **Stamina:** at 0 you can't attack, roll, backstep or parry (combos stop too) until it refills a little. Long attack strings slow walking by at most 10%.
- Inputs are buffered (0.4s). Combos chain inside a window. Rolls can cancel attack recovery after a set point.
- Hitstop, camera shake, weapon trails, and poise/stagger on both sides.
- **Damage numbers** pop out of enemies and fade, one per damage type in the hit: physical white, fire orange, bleed red, poison green, frost icy blue. Heavy hits are bigger, crits gold; teammates' are dimmer. Status damage shows in its colour (damage over time is added up and shown in batches).
- One enemy fights each player at a time; the others watch and strike every 10-15s. Enemy types: grunts (slash, double, and a long dash-and-slam leap from up to 4.8 m), spearmen (long thrusts, sweep when you are close), archers (keep distance, arrows can be sidestepped), and a super-armored brute (telegraphed slam and a stomp when you stand behind it).
- **Varek, the Ashen Warden** has 1300 HP.
  - Phase 1: sweeps, a 2-hit combo, a *delayed* overhead, a lunge thrust, a leap slam with a ground telegraph, and a spin if you hug his back.
  - At 55% HP he roars and his blade ignites. He gets faster and adds a 3-hit combo, fire waves, a fire ring on his leap, and Ember Burst (a telegraphed AoE).
  - Parry or poise-break him for a critical. He punishes healing at mid range.
- Red glints and red ground circles mark unparryable attacks.
- **Parry (Rogue):**
  - Timing: press it within the 0.23s before a parryable hit lands. A faint white ring on the attacker shows exactly that window.
  - What can be parried: only certain light attacks (grunt slashes, spear thrust and sweep, archer bash, Varek's sweeps, Hask's chop and flurry). Projectiles, slams, overheads, leaps, charges, lunges, spins and stomps never can.
  - A missed parry costs half your max stamina, and regen is delayed 1.6s.
- **Critical hits** (on a parried enemy, or a boss knocked to its knees by a poise break): each character has its own.
  - Knight, Flying Knee: 110. Leaps high and drives a knee into the enemy's head; blood sprays off it.
  - Rogue after a parry, Parry Stab: 48 (three light hits plus 3× the tree's flat damage of every type, times damage bonuses; ×2.3 on bosses, 110). Kills an archer outright; swordsmen and spearmen need to be hurt first. Flips the dagger to a reverse grip and plunges elbow first. Evolved: blinks behind the enemy in a red flash and stabs it in the back.
  - Rogue on a downed enemy, Shroud Slash: 170. Vanishes in a black shroud and reappears past the enemy through a red slash.
  - Spellsword, Rune Impale: 130. Hops up and drives the rune blade down into a burst of runes.
  - Code: `CRITS` in `src/player.js`; `scripts/crits.mjs` checks damage, timing and positions; `scripts/balance.mjs` checks stun counts, the parry cooldown, the shield charge, party stage scaling and the after-run buttons.

## Tests
`scripts/smoke.mjs` (screenshots + runtime errors), `scripts/sim.mjs` (mechanics + bot fights), `scripts/modules.mjs` (layout connectivity, mini bosses, rewards, status, run over), `scripts/economy.mjs` (accounts, gold, tiers, shop), `scripts/spell.mjs` (potions, Spellsword, evolutions), `scripts/party.mjs` (online accounts and a 3-player run) and `scripts/settings.mjs` (rebinding, volumes, per-account settings), `scripts/rooms.mjs` (fight engagement, room gates, section gold), `scripts/bank.mjs` (per-room banking, boss bonuses, ultrawide render size), `scripts/stamina.mjs` (empty-stamina lockout, mana costs, grunt leap reach), `scripts/treebg.mjs` (skill tree background screenshots), `scripts/status.mjs` (damage types, status buildup, per-type damage numbers, enemy elements, armour and resistances, riposte per enemy, weapon effect and stats panel screenshots) and `scripts/parry.mjs` run against `npx vite preview --port 4173`. Add `?server=` to the URL to use a test server.
