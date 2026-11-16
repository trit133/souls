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
//     lantern [x, y, pivotX, pivotY, w, h]: a hanging lantern swinging from its pivot (drawn over, bigger)
//     radar [x, y, r, mast]: a dish turning; scan [x0, y0, x1, y1, colour]: a light strip with a pulse running along it
//     flow [x0, y0, x1, y1, colour, width]: coolant pulsing along a pipe; smoke [x, y, drift]: smoke curling up
//     blink [x, y, r, colour, period]: an indicator pulsing; arc [x0, y0, x1, y1, colour]: lightning inside a tube
//     bigflame [x, y, w, h]: a lamp's flame, bigger than the painted one; bats [x, y, rx, ry, n]: bats circling
//     pennant [x, y, length, height, colour]: a flag rippling on its pole; holo [x0, y0, x1, y1, colour]: a hologram flickering
import CROPS from './treeart.json';

const FIRE = '#ffb050', CANDLE = '#ffc878', RED = '#ff3a3a', CYAN = '#5ae0ff', VIOLET = '#b070ff';
export const TREE_ART = {
  knight: {
    left: {
      edge: 880,
      fires: [[250, 672, 1]],
      lights: [[250, 650, 120, FIRE, 1], [700, 505, 95, FIRE, 1], [158, 515, 70, CYAN, 0], [207, 520, 60, CYAN, 0], [243, 140, 55, RED, 0], [218, 365, 40, FIRE, 0.6], [75, 860, 30, CYAN, 0]],
      anims: [
        ['lantern', 700, 492, 700, 395, 76, 110], // (the lantern on the bracket, swinging)
        ['scan', 230, 88, 258, 212, RED], ['blink', 222, 360, 12, '#ffa040', 1.7],
        ['bubbles', 132, 450, 186, 580, CYAN], ['bubbles', 194, 470, 224, 580, CYAN],
        ['flow', 700, 168, 930, 100, CYAN, 4], ['smoke', 935, 98, 1], // (coolant along the cannon, smoke at its muzzles)
        ['pennant', 690, 30, 70, 28, '#a42020'], ['bats', 1000, 260, 260, 90, 4], ['blink', 75, 860, 10, CYAN, 1.2],
      ],
    },
    right: {
      edge: 430,
      fires: [[1212, 615, 1], [1605, 625, 1]],
      lights: [[1212, 600, 120, FIRE, 1], [1605, 610, 120, FIRE, 1], [1503, 300, 95, RED, 0], [1503, 160, 70, RED, 0], [928, 410, 70, RED, 0], [1078, 90, 40, RED, 0.3], [1352, 700, 70, RED, 0]],
      anims: [
        ['radar', 1060, 58, 52, 64], // (the dish turning on its mast)
        ['scan', 672, 174, 770, 196, RED], ['smoke', 612, 158, -1], // (the big gun: a charge running down it, smoke at the muzzle)
        ['bubbles', 1488, 60, 1528, 360, RED], ['arc', 1490, 70, 1526, 350, RED], ['bubbles', 908, 355, 945, 450, RED],
        ['scan', 1366, 590, 1384, 760, RED], ['scan', 1430, 590, 1446, 760, RED],
        ['blink', 1020, 570, 16, RED, 2.4], ['blink', 1035, 632, 14, RED, 1.9], ['blink', 825, 728, 16, RED, 2.9],
        ['pennant', 362, 725, 60, 26, '#a42020'], ['bats', 400, 200, 260, 80, 5],
      ],
    },
  },
  rogue: {
    left: {
      edge: 1100,
      fires: [],
      lights: [[650, 610, 110, FIRE, 1], [214, 330, 120, RED, 0], [152, 780, 45, RED, 0], [228, 935, 30, RED, 0], [385, 75, 45, CYAN, 0], [200, 585, 35, CYAN, 0]],
      anims: [
        ['bubbles', 160, 215, 252, 415, RED], ['arc', 165, 220, 248, 410, RED], // (the reactor tube)
        ['bigflame', 655, 640, 34, 60], // (the standing lantern's flame)
        ['scan', 132, 722, 190, 836, RED], ['blink', 225, 930, 14, RED, 1.6],
        ['blink', 190, 577, 9, CYAN, 1.1], ['blink', 270, 577, 9, CYAN, 1.7], ['flow', 380, 20, 380, 180, CYAN, 6],
        ['bats', 1150, 300, 240, 120, 5],
      ],
    },
    right: {
      edge: 600,
      fires: [[1287, 690, 1]],
      lights: [[1287, 680, 120, FIRE, 1], [1500, 270, 110, RED, 0], [1500, 120, 60, RED, 0], [1180, 600, 45, CYAN, 0]],
      anims: [
        ['bubbles', 1450, 10, 1556, 350, RED], ['arc', 1455, 20, 1550, 340, RED], // (the red column)
        ['blink', 1590, 570, 10, CYAN, 1.3], ['blink', 1478, 608, 10, CYAN, 2.1], ['blink', 968, 818, 10, CYAN, 1.7],
        ['sparks', 1287, 640, 60, '#ffb050'], ['bats', 560, 220, 220, 100, 5],
      ],
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
        ['holo', 645, 410, 765, 640, CYAN], ['holo', 615, 305, 665, 410, CYAN], ['holo', 770, 505, 815, 600, CYAN], // (the hologram panels flickering)
        ['blink', 690, 1050, 14, CYAN, 1.4], ['blink', 760, 1085, 14, CYAN, 1.9], ['blink', 850, 1120, 14, CYAN, 2.3],
        ['bubbles', 410, 235, 470, 300, VIOLET], ['bubbles', 205, 665, 275, 760, VIOLET],
        ['gimbal', 265, 345, 42], ['sand', 245, 140, 168],
        ['flame', 100, 430], ['flame', 161, 406], ['flame', 184, 432], ['flame', 455, 570], ['flame', 427, 858], ['flame', 473, 854],
      ],
    },
    right: {
      edge: 380,
      fires: [],
      anims: [
        ['bubbles', 862, 460, 968, 680, VIOLET], ['crystal', 913, 568, 30, 58], ['sparks', 913, 568, 70, '#e0b0ff'], // (the jewel in its tube: spinning, bigger than the painted one)
        ['orbit', 913, 440, 95, 18, 3, '#ffd080', 0.9], // (round the gold ring at the tube's top)
        ['bubbles', 1058, 255, 1095, 310, VIOLET], ['gimbal', 1325, 370, 48], ['sand', 1342, 512, 545],
        ['holo', 940, 810, 1010, 840, CYAN], ['arc', 870, 470, 960, 670, VIOLET], ['blink', 880, 820, 10, CYAN, 1.5], ['blink', 975, 820, 10, CYAN, 2.2],
        ['flame', 1164, 426], ['flame', 1244, 604], ['flame', 1218, 616], ['flame', 1077, 636], ['flame', 1181, 824], ['flame', 1361, 154], ['flame', 1293, 160],
      ],
      lights: [[910, 570, 160, VIOLET, 0], [1165, 435, 40, CANDLE, 1], [1362, 170, 35, CANDLE, 1], [1295, 170, 30, CANDLE, 1], [1220, 625, 40, CANDLE, 1], [1080, 632, 35, CANDLE, 1], [1125, 720, 35, CANDLE, 1], [1185, 835, 35, CANDLE, 1], [1105, 300, 45, VIOLET, 0], [1390, 500, 40, VIOLET, 0], [975, 820, 40, CYAN, 0], [880, 820, 35, CYAN, 0]],
    },
  },
};
// each side's web image and its trim (the positions above are moved into it when drawn)
export const artOf = (kind, side) => ({ src: `${import.meta.env?.BASE_URL || '/'}tree/web/${kind}-${side}.webp`, crop: CROPS[`${kind}-${side}`], ...TREE_ART[kind][side] });
