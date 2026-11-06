// Character skins, unlocked by enemy kills with that character (100 / 250 / 500).
// The first two are recolours of the class kit; the last adds its own pieces (kits.js: paladin, wraith, starborn).
// `model` overrides the character's base model colours, `pal` the kit's colours, `variant` the extra build.
export const SKINS = {
  knight: [
    { id: 'default', name: 'Knight of the Vigil', kills: 0, desc: 'Steel plate and a blue tabard.' },
    { id: 'ember', name: 'Ember Guard', kills: 100, desc: 'Crimson plate with gold trim.',
      model: { cloth: 0x3a1412, armor: 0x8a3226, accent: 0x5a1610 }, pal: { hi: 0xc4644a, gold: 0xd8a640, plume: 0xe8b040, field: 0x6a1a14, fuller: 0xc8a070 } },
    { id: 'night', name: 'Nightguard', kills: 250, desc: 'Blackened steel and violet.',
      model: { cloth: 0x16161e, armor: 0x34343e, accent: 0x3e2266 }, pal: { hi: 0x5a5a6a, gold: 0x8a6ac0, plume: 0x6a3ab0, field: 0x1e1e2a, fuller: 0x4a4a58 } },
    { id: 'paladin', name: 'Radiant Paladin', kills: 500, desc: 'White-gold armor, a winged helm, a halo, a flowing cape and a sun shield.', variant: 'paladin',
      model: { cloth: 0xd8d0bc, armor: 0xe6dcc4, accent: 0xd4a040 }, pal: { hi: 0xfff4dc, gold: 0xf0c050, field: 0xf2ead6, fullerGlow: 0xffe08a } },
  ],
  rogue: [
    { id: 'default', name: 'Hooded Blade', kills: 0, desc: 'A charcoal cloak and a red scarf.' },
    { id: 'ash', name: 'Ashwalker', kills: 100, desc: 'A pale grey cloak and a white scarf.',
      model: { cloth: 0x5e5a56, armor: 0x6e6862 }, pal: { cloak: 0x8a8680, hem: 0xbcb8b0, lining: 0x5a5650, scarf: 0xece8e0, wrap: 0xd8d0c0, leather: 0x544a42, eye: 0xe0e8ff } },
    { id: 'viper', name: 'Viper', kills: 250, desc: 'Black and venom green.',
      model: { cloth: 0x141812, armor: 0x26301e }, pal: { cloak: 0x121612, hem: 0x2e4224, lining: 0x2a4a1a, scarf: 0x5aa02a, wrap: 0x3a4a2a, leather: 0x1c2018, eye: 0x9aff4a, steel: 0xa8c8a0 } },
    { id: 'wraith', name: 'Wraith', kills: 500, desc: 'A bone mask with burning eyes, a cloak trailing ghostly wisps, spectral red blades.', variant: 'wraith',
      model: { cloth: 0x121018, armor: 0x1e1a24 }, pal: { cloak: 0x16141c, hem: 0x3a3448, lining: 0x5a1010, scarf: 0x2a2232, wrap: 0x4a4458, leather: 0x1a1620, bladeGlow: 0xff3a2a, bladeCore: 0xffd0c0 } },
  ],
  mage: [
    { id: 'default', name: 'Rune-Scarred', kills: 0, desc: 'A blue coat with frost runes.' },
    { id: 'ember', name: 'Ember Mage', kills: 100, desc: 'A crimson coat with burning runes.',
      model: { cloth: 0x3a1414, armor: 0x8a4434 }, pal: { coat: 0x5a1a1a, trim: 0xd4a040, runeLo: 0x3a1a0a, runeHi: 0xffb040, glyph: 0xffc060, blade: 0xff8a3a, core: 0xfff0c0, hair: 0x2e1e16, hairDk: 0x1a100c } },
    { id: 'verdant', name: 'Verdant', kills: 250, desc: 'An emerald coat with living green runes.',
      model: { cloth: 0x14361e, armor: 0x5a8a5a }, pal: { coat: 0x1a4a2a, trim: 0xd0c890, runeLo: 0x0a2a14, runeHi: 0x7aff9a, glyph: 0xa0ffb0, blade: 0x5aff8a, core: 0xe0ffe8, hair: 0xd8c890, hairDk: 0xa89860 } },
    { id: 'starborn', name: 'Starborn', kills: 500, desc: 'Crystal shoulders, a star-flecked cape and a crown of orbiting crystals.', variant: 'starborn',
      model: { cloth: 0x18143a, armor: 0x4a3a8a }, pal: { coat: 0x1a1438, trim: 0xc8b8ff, runeLo: 0x2a1a5a, runeHi: 0xd0a0ff, glyph: 0xe8d0ff, blade: 0xb07aff, core: 0xffffff, hair: 0xf0f0ff, hairDk: 0xb0b0d8 } },
  ],
};

export const skinList = (kind) => SKINS[kind] || [];
export const skinById = (kind, id) => skinList(kind).find((s) => s.id === id) || skinList(kind)[0];

// the model options for a character wearing a skin
export function skinModel(base, kind, id) {
  const s = skinById(kind, id);
  if (!s || s.id === 'default') return base;
  return { ...base, ...(s.model || {}), pal: s.pal, variant: s.variant };
}

export const unlocked = (kind, id, kills) => (skinById(kind, id)?.kills ?? 0) <= (kills || 0);
