// The skill tree's side art (Jonah's paintings: public/tree, web-sized by scripts/tree-art.py into public/tree/web) and
// what burns and glows in each, for treebg.js. Positions are in the original images' pixels.
//   edge: where the building itself ends toward the middle (the rubble and floor beyond may run under the tree)
//   fires: [x, y, size] the base of a flame in a brazier or fire bowl: a pixel fire plays there, in the art's own colour
//   lights: [x, y, radius, colour, flicker] a lamp, candle, tube or crystal: a soft glow over it that breathes or flickers
//     (flicker 0: steady and slow, a machine's light; 1: a flame's restless flicker)
//   anims: things that move over the painting (treebg.js draws them, on the same pixel grid):
//     orbit [x, y, rx, ry, balls, colour, speed]: glowing balls circling (the far side dimmer, behind)
//     crystal [x, y, half-width, half-height]: a jewel spinning on its long axis, covering the painted one
//     bubbles [x0, y0, x1, y1, colour]: motes rising through a jar or a tube
//     gimbal [x, y, r]: an armillary's rings turning
//     sand [x, yNeck, yBottom]: sand running through an hourglass
//     flame [x, y]: a candle's flame tip, flickering
//     sparks [x, y, r, colour]: sparks drifting up round something
import CROPS from './treeart.json';
// the pieces painted by hand at their true pixel size (scripts/paint-tree-sides.py) bring their own fires, lights and
// moving parts, in their own pixels, and replace the entries below
import PAINTED from './treepainted.json';

const FIRE = '#ffb050', CANDLE = '#ffc878', RED = '#ff3a3a', CYAN = '#5ae0ff', VIOLET = '#b070ff';
export const TREE_ART = {
  knight: {
    left: {
      edge: 880,
      fires: [[250, 672, 1]],
      lights: [[250, 650, 120, FIRE, 1], [700, 505, 95, FIRE, 1], [158, 515, 70, CYAN, 0], [207, 520, 60, CYAN, 0], [243, 140, 55, RED, 0], [218, 365, 40, FIRE, 0.6], [75, 860, 30, CYAN, 0]],
    },
    right: {
      edge: 430,
      fires: [[1212, 615, 1], [1605, 625, 1]],
      lights: [[1212, 600, 120, FIRE, 1], [1605, 610, 120, FIRE, 1], [1503, 300, 95, RED, 0], [1503, 160, 70, RED, 0], [928, 410, 70, RED, 0], [1078, 90, 40, RED, 0.3], [1352, 700, 70, RED, 0]],
    },
  },
  rogue: {
    left: {
      edge: 1100,
      fires: [],
      lights: [[650, 610, 110, FIRE, 1], [214, 330, 120, RED, 0], [152, 780, 45, RED, 0], [228, 935, 30, RED, 0], [385, 75, 45, CYAN, 0], [200, 585, 35, CYAN, 0]],
    },
    right: {
      edge: 600,
      fires: [[1287, 690, 1]],
      lights: [[1287, 680, 120, FIRE, 1], [1500, 270, 110, RED, 0], [1500, 120, 60, RED, 0], [1180, 600, 45, CYAN, 0]],
    },
  },
  mage: {
    left: {
      edge: 1100,
      fires: [],
      lights: [[140, 425, 60, CANDLE, 1], [470, 575, 45, CANDLE, 1], [455, 860, 50, CANDLE, 1], [440, 285, 55, VIOLET, 0], [240, 735, 65, VIOLET, 0], [700, 600, 190, CYAN, 0], [255, 150, 35, VIOLET, 0], [990, 1090, 70, CYAN, 0], [930, 150, 40, CYAN, 0]],
      anims: [
        ['orbit', 705, 700, 165, 40, 4, CYAN, 1.1], ['orbit', 705, 610, 140, 30, 3, VIOLET, -0.8], ['orbit', 705, 780, 120, 22, 3, '#a8f4ff', 1.6], // (round the floating book)
        ['sparks', 705, 640, 120, CYAN],
        ['bubbles', 410, 235, 470, 300, VIOLET], ['bubbles', 205, 665, 275, 760, VIOLET],
        ['gimbal', 265, 345, 42], ['sand', 245, 140, 168],
        ['flame', 100, 430], ['flame', 161, 406], ['flame', 184, 432], ['flame', 455, 570], ['flame', 427, 858], ['flame', 473, 854],
      ],
    },
    right: {
      // (painted by hand at its true pixel size: scripts/paint-adept-right.py; crisp, no smoothing)
      native: true, edge: 100,
      fires: [],
      anims: [
        ['bubbles', 208, 100, 252, 204, VIOLET], ['crystal', 230, 150, 13, 32], ['sparks', 230, 150, 24, '#e0b0ff'], // (the jewel in its tube: spinning, bigger than the painted one)
        ['orbit', 230, 88, 45, 6, 3, '#ffd080', 0.9], // (round the dome's brass ring)
        ['bubbles', 307, 78, 320, 98, VIOLET], ['gimbal', 382, 82, 13], ['sand', 390, 154, 164],
        ['flame', 321, 122], ['flame', 329, 118], ['flame', 336, 124], ['flame', 393, 19], ['flame', 307, 188], ['flame', 369, 123], ['flame', 335, 224], ['flame', 343, 221],
      ],
      lights: [[230, 152, 46, VIOLET, 0], [230, 88, 30, '#ffd080', 0], [313, 87, 13, VIOLET, 0], [390, 156, 10, VIOLET, 0], [274, 206, 12, CYAN, 0], [230, 237, 12, CYAN, 0],
        [329, 120, 14, CANDLE, 1], [393, 19, 10, CANDLE, 1], [307, 188, 10, CANDLE, 1], [369, 123, 9, CANDLE, 1], [339, 222, 12, CANDLE, 1]],
    },
  },
};
// each side's web image and its trim (the positions above are moved into it when drawn)
export const artOf = (kind, side) => ({ src: `${import.meta.env?.BASE_URL || '/'}tree/web/${kind}-${side}.webp`, crop: CROPS[`${kind}-${side}`], ...(PAINTED[`${kind}-${side}`] || TREE_ART[kind][side]) });
