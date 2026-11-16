// The skill tree's side art (Jonah's paintings: public/tree, web-sized by scripts/tree-art.py into public/tree/web) and
// what burns and glows in each, for treebg.js. Positions are in the original images' pixels.
//   edge: where the building itself ends toward the middle (the rubble and floor beyond may run under the tree)
//   fires: [x, y, size] the base of a flame in a brazier or fire bowl: a pixel fire plays there, in the art's own colour
//   lights: [x, y, radius, colour, flicker] a lamp, candle, tube or crystal: a soft glow over it that breathes or flickers
//     (flicker 0: steady and slow, a machine's light; 1: a flame's restless flicker)
import CROPS from './treeart.json';

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
    },
    right: {
      edge: 380,
      fires: [],
      lights: [[910, 570, 160, VIOLET, 0], [1165, 435, 40, CANDLE, 1], [1362, 170, 35, CANDLE, 1], [1295, 170, 30, CANDLE, 1], [1220, 625, 40, CANDLE, 1], [1080, 632, 35, CANDLE, 1], [1125, 720, 35, CANDLE, 1], [1185, 835, 35, CANDLE, 1], [1105, 300, 45, VIOLET, 0], [1390, 500, 40, VIOLET, 0], [975, 820, 40, CYAN, 0], [880, 820, 35, CYAN, 0]],
    },
  },
};
// each side's web image and its trim (the positions above are moved into it when drawn)
export const artOf = (kind, side) => ({ src: `${import.meta.env?.BASE_URL || '/'}tree/web/${kind}-${side}.webp`, crop: CROPS[`${kind}-${side}`], ...TREE_ART[kind][side] });
