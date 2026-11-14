// How to Play: the guide behind the tab at the top of the Sanctum (hermitage.js). Short pages, one a topic; the
// controls page reads your own key bindings. Keep it in step with the game when the rules change.
import { keyLabel } from './settings.js';

export const GUIDE = [
  {
    id: 'goal', title: 'The Goal',
    body: () => `
      <p>The old regime looked into the future with sorcery and stole its machines for their arms and armour. It only fed the old wars, until everything burned.</p>
      <p>You are the last of that regime. Fight your way across the broken regions toward the one who started it all.</p>
      <h4>The loop</h4>
      <ol>
        <li>Pick a raid off the <b>world map</b> (Solo Raid or Party Raid).</li>
        <li>In the raid: find and break <b>three shrines</b>, find the boss's hidden lair, kill the boss.</li>
        <li>Grab <b>materials</b> from drums and chests on the way. They're yours the moment you pick them up.</li>
        <li>Come back here and spend your <b>gold</b> on your skill tree and your <b>emeralds</b> on your look.</li>
      </ol>
      <p>Each region has three raid areas. Its bosses each drop a <b>gem</b>; carry all of a region's gems to face its master.</p>`,
  },
  {
    id: 'raid', title: 'A Raid',
    body: () => `
      <p><b>Solo Raid</b> opens the world map. Click a region, pick an open area and press <b>Deploy</b>. You start at the crusade's camp at the gate.</p>
      <h4>The ward</h4>
      <ul>
        <li>The map is the same every time, but the shrines, the boss's lair, the chests and every enemy move each raid.</li>
        <li>It's a maze: narrow lanes, walls, rubble, dead ends. Most houses can be entered through their doorways.</li>
        <li>Houses with a roof are <b>dark</b> inside, and so is everything underground: you see by the light ahead of you.</li>
        <li>Some buildings have <b>stairs down</b> to vaults and bunkers. The boss waits down one of them.</li>
        <li>A building between you and the camera turns to glass so you can still see yourself.</li>
        <li><b>M</b> opens the map. It fills in as you explore; each basement has its own.</li>
      </ul>
      <p>Enemies stay dead once killed. There are only so many; pick your fights.</p>`,
  },
  {
    id: 'shrines', title: 'Shrines & Boss',
    body: () => `
      <p>Three <b>ward shrines</b> are hidden in each raid, on the squares or down in the vaults. A shrine on the surface throws a beam of light over the roofs. Each is guarded one of three ways:</p>
      <ul>
        <li><b>Elite pack:</b> kill the glowing elite and its pack.</li>
        <li><b>Hold the uplink:</b> stand in the ring for 30 seconds while waves come at you. The timer only runs with someone inside.</li>
        <li><b>Heretic idols:</b> break the three idols round the shrine while enemies pour out of it.</li>
      </ul>
      <p>The deeper areas each have a shrine of their own, and it's always one of their three:</p>
      <ul>
        <li><b>Flood valves</b> (The Sump Lines): three valves stand round the shrine. Stand at one for 5 seconds to turn it (it slips back if you leave) while the drowned keep coming. Open all three.</li>
        <li><b>Choir bells</b> (Saint Orsk's Spire): three bells hang round the shrine and the choir sings a hymn of four notes on them, lighting each bell in turn. Strike the bells in that order. A wrong bell starts the hymn over and calls guards in.</li>
      </ul>
      <h4>The boss</h4>
      <p>The boss's lair is under one of the ward's big buildings, behind a door marked <b>LOCKED</b>. It opens once all three shrines are broken. Kill the boss for its <b>gem</b> (or extra gold if you already have it), and a way out opens in its pit.</p>`,
  },
  {
    id: 'loot', title: 'Loot & Escape',
    body: () => `
      <h4>Materials</h4>
      <ul>
        <li><b>Supply drums</b> (rusty, with hazard stripes and an amber light): hit one to smash it open.</li>
        <li><b>Chests</b> glow in their rarity's colour: <span class="g-c">common</span>, <span class="g-u">uncommon</span>, <span class="g-r">rare</span>, <span class="g-e">epic</span>, <span class="g-l">legendary</span>. The rarer the chest, the more guards round it and the tougher they are. It stays sealed until they're dead.</li>
        <li>The <b>hoard</b> deep in one vault holds the best of all, behind a War Servitor and two big elites.</li>
      </ul>
      <h4>Keeping them</h4>
      <p>Everything you pick up goes straight into your stash and is yours to keep, even if you fall. Gold too, the moment you earn it. The pouch lists what you've found this raid.</p>
      <p>Leave whenever you like by the camp gate where you came in, or by the way out in the boss's pit once it's dead.</p>
      <p>Materials wait in your stash. Each is worth gold; a bazaar will buy them one day.</p>`,
  },
  {
    id: 'fight', title: 'Fighting',
    body: () => `
      <ul>
        <li><b>Stamina</b> is everything: attacks, rolls and parries use it. At zero you can't do any of them until it refills.</li>
        <li><b>Roll</b> through attacks; with no direction held you backstep.</li>
        <li><b>Light and heavy attacks</b> chain into <b>combos</b>: when your weapon glints and a red mark shows over your head, press the next input in time.</li>
        <li>The special button belongs to your <b>weapon</b>. With the starting weapons the <b>Templar</b> blocks with his shield, the <b>Shrike</b> parries (a clean parry leaves the enemy open for a deadly strike), the <b>Adept</b> fires plasma fed by the mana her knife hits build. The crafted weapons bring their own: the <b>Penitent Slab</b>'s Blade Guard, the <b>Wrist Blade</b>'s dash, the <b>Psy-Staff</b>'s warding sigil.</li>
        <li><b>Heal</b> with your injectors; a chest gives you another. Red hearts dropped by enemies heal too.</li>
        <li><b>Lock on</b> to keep facing one enemy.</li>
        <li>One enemy fights you at a time; the rest circle and step in now and then. Elites glow and hit harder.</li>
        <li>Walls stop everything: arrows, spells and blades. Use them.</li>
      </ul>`,
  },
  {
    id: 'controls', title: 'Controls',
    body: (g) => {
      const b = g.settings?.binds || {}, k = (a) => (b[a] || []).filter(Boolean).map(keyLabel).join(' / ') || '-';
      const row = (what, a, touch) => `<tr><td>${what}</td><td>${k(a)}</td><td>${touch}</td></tr>`;
      return `
      <table class="g-keys"><tr><th></th><th>Keyboard / mouse</th><th>Touch</th></tr>
        <tr><td>Move</td><td>${[k('up'), k('left'), k('down'), k('right')].map((x) => x.split(' / ')[0]).join(' ')}</td><td>left-side stick</td></tr>
        ${row('Light attack', 'attack', 'R1')}${row('Heavy attack', 'heavy', 'R2')}${row('Roll / backstep', 'roll', 'ROLL')}${row('Sprint', 'sprint', 'hold ROLL')}
        ${row('Block / parry / fire', 'special', 'the special button')}${row('Heal', 'heal', 'HEAL')}${row('Lock on', 'lock', 'LOCK')}
        ${row('Interact (doors, stairs, chests)', 'interact', 'tap the prompt')}${row('Map', 'map', 'tap the corner map')}${row('Pouch (what you carry in a raid)', 'inventory', 'the POUCH button')}${row('Pause', 'pause', '')}
      </table>
      <p>Change any of them in <b>Settings</b>.</p>`;
    },
  },
  {
    id: 'grow', title: 'Getting Stronger',
    body: () => `
      <ul>
        <li><b>Gold</b> comes from kills, chests and bosses. Spend it on your character's <b>skill tree</b>: click your character by the fire.</li>
        <li><b>Emeralds</b> come from kills and chests. Spend them on armour and colours at the <b>wardrobe</b>.</li>
        <li><b>Materials</b> fill the <b>stash</b> chest, shared by all your characters. At the <b>workbench</b> they become new <b>weapons</b> (one per class in each region, needing its rarest materials from the harder areas) and <b>evolutions</b> (one per weapon; the starting weapons' from Ashfall Ward's materials).</li>
        <li>A new weapon isn't stronger, just different: its own moves, combos and special. Equip it, and switch its evolution on or off, at the <b>equipment</b> stand; change its look at the wardrobe.</li>
        <li>Pick a <b>record</b> for the menus at the jukebox.</li>
        <li><b>Night Raid</b>, once unlocked, plays the whole raid in near darkness against tougher enemies for more gold. Toggle it on the map.</li>
      </ul>`,
  },
  {
    id: 'party', title: 'Playing Together',
    body: () => `
      <ul>
        <li><b>Party Raid</b> opens the lobby: create a room and share its four-letter code, or join one. Two or three players.</li>
        <li>More enemies, and tougher ones; every kill pays everyone a share of its gold.</li>
        <li>Chests and drums give everyone the same materials, about half as many each.</li>
        <li>Go down and a teammate can revive you (it costs everyone some max health). If everyone is down, the raid is over.</li>
        <li>A way out takes the whole party with it.</li>
      </ul>`,
  },
];
