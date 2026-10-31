// Small line icons for the upgrade screen (24x24 SVG paths).
const P = {
  dmg: '<path d="M19 3l2 2-11 11-3 1 1-3zM6 15l3 3M4 18l2 2M4 20l-1 1"/>',
  hp: '<path d="M12 20S4 15 4 9a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 6-8 11-8 11z"/>',
  move: '<path d="M4 16c3 0 3-2 6-2l4 3h6v2H9l-5-1zM13 14l-1-4 4-2M15 6a1.5 1.5 0 1 0 0-.1"/>',
  aspd: '<path d="M13 3L6 13h5l-1 8 8-11h-5z"/>',
  st: '<path d="M3 12h4l2-5 4 10 2-5h6"/>',
  flask: '<path d="M10 3h4M11 3v5l-5 9a2 2 0 0 0 2 3h8a2 2 0 0 0 2-3l-5-9V3M12 11v6M9 14h6"/>',
  potion: '<path d="M10 3h4M11 3v5l-5 9a2 2 0 0 0 2 3h8a2 2 0 0 0 2-3l-5-9V3M8 15h8"/>',
  mage: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18 16l.8 2.2L21 19l-2.2.8L18 22l-.8-2.2L15 19l2.2-.8z"/>',
  mana: '<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>',
  evo_knight: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.500-1-8-4-8-9V6z"/><path d="M12 8v8M8 12h8"/>',
  evo_rogue: '<path d="M5 19L17 7l2-3-3 2L4 18zM19 19L7 7 5 4l3 2 12 12z"/>',
  evo_mage: '<path d="M9 21a5 5 0 0 1-3-9c0 2 1 3 2 3 0-4 2-9 6-12 0 4 4 6 4 12a6 6 0 0 1-5 6"/>',
};
export const icon = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${P[k] || ''}</svg>`;
