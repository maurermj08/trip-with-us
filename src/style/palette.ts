export const P = {
  skyTop: 0x5fb0ef,
  skyBottom: 0xd4f0fd,
  mornTop: 0x8cc4ef,
  mornBottom: 0xfde7d6,
  goldTop: 0x7a9ee0,
  goldBottom: 0xffd9a8,
  duskTop: 0x3c3f86,
  duskMid: 0xc7789f,
  duskBottom: 0xffb784,

  haze: 0xc3dbec,
  cloud: 0xffffff,

  hill: 0xa9d88f,
  hillTree: 0x91c97a,
  grassFar: 0x97d27a,
  grass: 0x86c86a,
  grassDark: 0x6fb257,
  grassNear: 0x7bc260,

  road: 0x60656d,
  roadEdge: 0x575b62,
  edgeYellow: 0xf4c84a,
  laneWhite: 0xffffff,
  gravel: 0xa79f8e,
  curb: 0xd9d4c7,
  sidewalk: 0xe2dccd,

  barrier: 0xdcd7ca,
  barrierShade: 0xc5bfb0,
  pole: 0xa3abb4,
  lamp: 0xfff1bf,

  signGreen: 0x1d7a4c,
  signGreenDark: 0x166a40,
  signPost: 0x9aa2ab,
  shieldBlue: 0x1f4fa3,
  shieldRed: 0xd23b3b,
  scBlue: 0x23408e,

  mini: {
    blue: 0x1f5f9e,
    blueDark: 0x174a7c,
    blueLight: 0x6aa6dd,
    roof: 0xf7f7f4,
    clad: 0x2a2d31,
    well: 0x16181b,
    glass: 0x28323c,
    window: 0xc9e2f2,
    silver: 0xd5dbe1,
    tire: 0x24262a,
    tireWall: 0x303338,
    rimDark: 0x5b636c,
    headlight: 0xfff6d2,
    tail: 0xe0413d,
    amber: 0xffa62b,
  },

  duckYellow: 0xffcf3a,
  duckYellowDark: 0xf0b820,
  duckOrange: 0xff9a2e,
  duckiesRed: 0xd8392b,
  duckiesRedDark: 0xb92d21,
  cap: 0xd8392b,

  rainbow: [0xf4b6c6, 0xf7dd8a, 0xb8e2c6, 0xb6d3ef, 0xd8c6ee, 0xf8c8a2, 0xf2a99b, 0xf4e8c4, 0xa9dcd9],
  shutter: 0x2f5a46,

  cardboard: 0xd1a066,
  cardboardDark: 0xb98a50,
  tape: 0xe9cf9c,
  water: 0x5fb1de,
  waterDeep: 0x3f90c4,
  puddle: 0x7fbde4,
  mud: 0x7a5534,
  mudLight: 0x93693f,
  rock: 0xa09d95,
  rockDark: 0x8a8780,
  wood: 0xc99a62,
  woodDark: 0xa97b46,

  trunk: 0x8a6342,
  leaf: 0x5fae58,
  leafLight: 0x79c46a,
  pine: 0x3f8f5a,
  pineLight: 0x52a46b,
  palm: 0x4f9e55,
  moss: 0xa9b89a,

  white: 0xffffff,
  black: 0x000000,
  warmWindow: 0xffd77a,
  windowGlass: 0xffffff,
} as const;

export const SKIN = [0xf3c9a5, 0xd9a07a, 0xa86f4c, 0x7a4e33, 0xf6d7bd];

export function lerpColor(a: number, b: number, t: number): number {
  t = Math.max(0, Math.min(1, t));
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (
    (Math.round(ar + (br - ar) * t) << 16) |
    (Math.round(ag + (bg - ag) * t) << 8) |
    Math.round(ab + (bb - ab) * t)
  );
}

export function darken(c: number, amt: number): number {
  return lerpColor(c, 0x000000, amt);
}

export function lighten(c: number, amt: number): number {
  return lerpColor(c, 0xffffff, amt);
}

export function hex(c: number): string {
  return '#' + c.toString(16).padStart(6, '0');
}
