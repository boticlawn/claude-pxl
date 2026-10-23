include("palette.px.js")
// Small cute hotel people. Standing adult: head 8x8 + body 9 = 8x17 before outline.
// Built from form primitives (ball head, block torso/limbs) + painted hair/face grids that keep the
// head's normals, then form + auto outline. Light top-left (default).
material("E", "#c9b384", { steps: 5, at: 3 })   // khaki shorts / trousers
material("F", "#34406e", { steps: 5, at: 3 })   // navy (waiter vest + trousers, swim trunks)

// paint a char grid onto what's there: map char -> color, "_" erases, others skip
const paint = (x0, y0, g, map) => (c) => {
  g.trim().split("\n").forEach((row, y) => [...row.trim()].forEach((ch, x) => {
    const col = ch === "_" ? "_" : map[ch]
    if (col) c.px(x0 + x, y0 + y, col)
  }))
}
// recolor variant helper: swap a material and all its step tones
const sw = (m) => {
  const o = {}
  for (const [a, b] of Object.entries(m)) {
    o[a] = b
    for (const d of [1, 2, 3, 4]) { o[`${a}-${d}`] = `${b}-${d}`; o[`${a}+${d}`] = `${b}+${d}` }
  }
  return o
}

// ---------------------------------------------------------------- heads (8x8 at x,y)
const HAIR = {
  short: `
_.HHHH._
.HHHHHH.
HHHHHHHH
HH.HH.HH
H......H`,
  bob: `
_.HHHH._
.HHHHHH.
HHHHHHHH
HHH.HHHH
HH....HH
H......H
H......H`,
  long: `
_.HHHH._
.HHHHHH.
HHHHHHHH
HH..HHHH
HH....HH
H......H
H......H
H......H`,
  wet: `
_.HHHH._
.HHHHHH.
HHHHHHHH
H.H..H.H`,
  kid: `
...HH...
_.HHHH._
.HHHHHH.
HHHHHHHH
HH....HH`,
  side: `
_.HHHH._
HHHHHHH.
HHHHHHHH
HHHH..HH
HHH.....
HHH.....
HH......`,
  hat: `
H......H
H......H`,
}
const FACE = {
  // rows 4..7 of the head
  smile: `
..E..E..
..E..E..
.C.MM.C.
_......_`,
  open: `
..E..E..
..E..E..
.C.OO.C.
_......_`,
  shades: `
.SSS.SS.
..S...S.
.C.MM.C.
_......_`,
  closed: `
........
.EE..EE.
.C.MM.C.
_......_`,
  right: `
....E.E.
....E.E.
...C.MM.
_.......`,
}
const head = (x, y, { skin = "h", hair = "l", style = "short", face = "smile" } = {}) => [
  ball(x + 3.5, y + 3.5, 3.6, skin),
  paint(x, y, HAIR[style], { H: hair }),
  paint(x, y + 4, FACE[face], { E: "k", S: "k", M: skin + "-2", O: "u-1", C: "o+1" }),
]
const bun = (x, y, hair = "l") => ball(x + 3.5, y - 1, 1.8, hair)
const sunhat = (x, y, c = "s", band = "o") => [
  ball(x + 3.5, y + 0.5, 3.2, c, { ry: 2.5 }),
  block(x - 1, y + 2, 10, 2, c, { bevel: 1 }),
  hline(x, y + 1, 8, band),
]

// ---------------------------------------------------------------- bodies
// standing body 8 wide, torso top at y (9 rows: y..y+8)
const legs = (x, y, skin = "h", shoe = "d-1") => [
  block(x + 2, y + 6, 1, 2, skin, { bevel: 1 }), block(x + 5, y + 6, 1, 2, skin, { bevel: 1 }),
  hline(x + 1, y + 8, 2, shoe), hline(x + 5, y + 8, 2, shoe),
]
const armL = (x, y, skin, sleeve) => [block(x, y + 1, 1, 4, skin, { bevel: 1 }), px(x, y + 1, sleeve)]
const armR = (x, y, skin, sleeve) => [block(x + 7, y + 1, 1, 4, skin, { bevel: 1 }), px(x + 7, y + 1, sleeve)]
const torso = (x, y, shirt, pants) => [
  block(x + 1, y, 6, 5, shirt, { bevel: 1 }),
  block(x + 1, y + 5, 6, 1, pants, { bevel: 0 }),
]
const body = (x, y, shirt, pants = "E", skin = "h", shoe = "d-1") => [
  ...legs(x, y, skin, shoe), ...armL(x, y, skin, shirt), ...armR(x, y, skin, shirt), ...torso(x, y, shirt, pants),
]
const print = (x, y, c) => paint(x, y, `
.P...
...P.
P....
..P..`, { P: c })

// ---------------------------------------------------------------- receptionist (behind counter)
const recep = (armUp) => [
  // shoulders + arms reaching down to the counter
  block(0, 9, 1, 4, "h", { bevel: 1 }), block(9, 9, 1, 4, "h", { bevel: 1 }),
  px(0, 9, "r"), px(9, 9, "r"), px(0, 10, "r"), px(9, 10, "r"),
  block(1, 8, 8, 5, "r", { bevel: 1 }),
  // collar + name tag
  paint(1, 8, `
.ee..ee.
..e..e..
......YY`, { e: "e", Y: "y" }),
  px(4, 8, "h"), px(5, 8, "h"),
  ...(armUp ? [] : []),
]
sprite("ppl_receptionist", { w: 10, h: 13, form: true, outline: "auto" },
  ...recep(), ...head(1, 0, { style: "short" }))
sprite("ppl_receptionist_b", { w: 10, h: 13, form: true, outline: "auto" },
  ...recep(), ...head(1, 1, { skin: "H", style: "bob" }), bun(1, 1))

// waving: right arm raised beside the head, hand swinging
const waveArm = (dx) => [
  rect(9, 9, 1, 4, "_"), px(9, 9, "r"),
  tube(9.5, 8.5, 10 + dx * 0.5, 5, 0.5, "h"), px(9, 8, "r"), px(10, 8, "r"),
  ball(10 + dx, 3.5, 1.2, "h"),
]
anim("ppl_receptionist_wave", { w: 12, h: 13, fps: 4, form: true, outline: "auto" },
  ...recep(), ...head(1, 0, { style: "short", face: "open" }),
  frame(...waveArm(0)), frame(...waveArm(1)), frame(...waveArm(0)), frame(...waveArm(1)))

// ---------------------------------------------------------------- staff
sprite("ppl_chef", { w: 8, h: 20, form: true, outline: "auto" },
  ...body(0, 11, "e", "z-1", "h", "z-2"),
  paint(1, 11, `
..e.e.
...e..
..e.e.
...e..`, { e: "e-2" }),
  px(3, 11, "u"), px(4, 11, "u"),
  ...head(0, 3, { style: "hat" }),
  ball(2, 1.5, 2, "e"), ball(5, 1.5, 2, "e"), ball(3.5, 1, 2.2, "e"),
  block(1, 3, 6, 2, "e", { bevel: 1 }), hline(1, 4, 6, "e-1"))

sprite("ppl_waiter", { w: 11, h: 17, form: true, outline: "auto" },
  ...legs(0, 8, "F", "d-2"),
  ...armL(0, 8, "h", "e"),
  ...torso(0, 8, "e", "F"),
  // vest + bow tie
  paint(1, 8, `
F.KK.F
FF..FF
FF..FF
FF..FF
FFFFFF`, { F: "F", K: "u-1" }),
  // right arm bent up, hand under the tray
  block(7, 9, 1, 2, "e", { bevel: 0 }), block(8, 8, 1, 3, "h", { bevel: 1 }),
  ...head(0, 0, { style: "short" }),
  // tray + coconut drink
  block(6, 6, 5, 1, "z+1", { bevel: 1 }),
  ball(8.5, 4.5, 1.3, "d"), px(9, 3, "y"), px(10, 2, "y"),
)

// ---------------------------------------------------------------- guests
sprite("ppl_guest_a", { w: 10, h: 18, form: true, outline: "auto" },
  ...body(1, 9, "f", "E"),
  print(2, 9, "f+2"),
  ...head(1, 1, { style: "hat", face: "shades" }),
  ...sunhat(1, 0))

sprite("ppl_guest_b", { w: 10, h: 18, form: true, outline: "auto" },
  // sundress: torso + flared skirt, short legs
  ...legs(1, 9, "h", "o-2"),
  ...armL(1, 9, "h", "h"), ...armR(1, 9, "h", "h"),
  block(2, 9, 6, 4, "o", { bevel: 1 }),
  cyl(1, 12, 8, 3, "o", { taper: -0.5 }),
  px(2, 9, "h"), px(7, 9, "h"),
  hline(2, 12, 6, "o+2"),
  ...head(1, 1, { style: "long", hair: "L" }),
  ...sunhat(1, 0, "s", "t"),
  paint(2, 5, "SSS.SS", { S: "k" }), px(4, 6, "k"), px(7, 6, "k"))

sprite("ppl_guest_c", { w: 11, h: 18, form: true, outline: "auto" },
  ...legs(2, 9, "h", "d-1"),
  ...armR(2, 9, "h", "b"),
  ...torso(2, 9, "b", "E"),
  print(3, 9, "y"),
  // left arm angled out and down: hand grips a suitcase handle
  px(2, 10, "b"), block(1, 11, 1, 3, "h", { bevel: 1 }), block(0, 14, 2, 1, "h", { bevel: 0 }),
  ...head(2, 1, { style: "short", face: "shades", hair: "l" }),
  // cap visor-less bucket hat
  ball(5.5, 1.5, 3.4, "t", { ry: 2 }), block(1, 2, 10, 1, "t", { bevel: 1 }))

// ---------------------------------------------------------------- kid
sprite("ppl_kid", { w: 8, h: 13, form: true, outline: "auto" },
  block(2, 11, 1, 1, "h", { bevel: 0 }), block(5, 11, 1, 1, "h", { bevel: 0 }),
  hline(1, 12, 2, "u-1"), hline(5, 12, 2, "u-1"),
  block(1, 8, 1, 3, "h", { bevel: 1 }), block(6, 8, 1, 3, "h", { bevel: 1 }),
  block(2, 8, 4, 3, "y", { bevel: 1 }), hline(2, 10, 4, "F"),
  ...head(0, 1, { style: "kid", hair: "L", face: "open" }))

// ---------------------------------------------------------------- lounging (lying on back, head left, propped)
sprite("ppl_lounging", { w: 20, h: 7, form: true, outline: "auto" },
  // straight leg + foot
  block(13, 4, 6, 2, "h", { bevel: 1 }), px(19, 3, "h"), px(19, 4, "h"),
  // bent leg: thigh up to the knee, shin back down
  tube(12.5, 3.5, 15, 1, 0.6, "h"), tube(15, 1, 17, 3.5, 0.5, "h"),
  // torso, trunks
  block(5, 3, 7, 3, "h", { bevel: 1 }),
  block(11, 3, 3, 3, "F", { bevel: 1 }), hline(11, 3, 3, "F+1"),
  // arm along the body
  hline(6, 5, 5, "h-1"), px(11, 5, "h"),
  // head on a pillow-ish tilt
  ball(3, 3, 2.8, "h"),
  paint(0, 0, `
.HHH.
HHHHH
HHH..
HH...
H....`, { H: "l" }),
  paint(3, 2, `
SSS
.S.
..M`, { S: "k", M: "h-2" }))

// ---------------------------------------------------------------- swimmers (bottom edge = waterline)
sprite("_swim_a", { w: 10, h: 9, form: true, outline: "auto" },
  block(0, 7, 10, 2, "H", { bevel: 1 }),
  ...head(1, 0, { skin: "H", style: "wet", hair: "l-1", face: "smile" }))
sprite("_swim_b", { w: 10, h: 9, form: true, outline: "auto" },
  block(0, 7, 10, 2, "h", { bevel: 1 }), hline(2, 8, 2, "t"), hline(6, 8, 2, "t"),
  ...head(1, 0, { style: "bob", hair: "L-1", face: "closed" }))
// crop the outline row under the waterline
sprite("ppl_swimmer_a", { w: 12, h: 10 }, stamp("_swim_a", 0, 0))
sprite("ppl_swimmer_b", { w: 12, h: 10 }, stamp("_swim_b", 0, 0))

sprite("_swim_ring", { w: 12, h: 9, form: true, outline: "auto" },
  ...head(2, 0, { style: "kid", hair: "L", face: "open" }),
  block(3, 7, 6, 1, "h", { bevel: 0 }),
  cyl(0, 6, 12, 3, "o", { dir: "h" }),
  hline(2, 7, 2, "e"), hline(8, 7, 2, "e"),
  block(1, 6, 1, 1, "h", { bevel: 0 }), block(10, 6, 1, 1, "h", { bevel: 0 }))
sprite("ppl_swimmer_ring", { w: 14, h: 10 }, stamp("_swim_ring", 0, 0))

// ---------------------------------------------------------------- sitting (side view facing right, seat at y 9..10)
sprite("ppl_sitting", { w: 10, h: 14, form: true, outline: "auto" },
  block(1, 7, 4, 4, "t", { bevel: 1 }),                    // torso
  block(2, 9, 6, 2, "E", { bevel: 1 }),                    // thigh forward
  block(7, 10, 1, 3, "h", { bevel: 1 }),                   // shin
  hline(7, 13, 3, "d-1"),                                  // shoe
  tube(3, 8, 5.5, 9, 0.5, "h"), px(3, 8, "t"),             // arm on lap
  ...head(0, 0, { style: "side", face: "right" }))

// ---------------------------------------------------------------- sheet
const ALL = ["ppl_receptionist", "ppl_receptionist_b", "ppl_receptionist_wave", "ppl_chef", "ppl_waiter",
  "ppl_guest_a", "ppl_guest_b", "ppl_guest_c", "ppl_kid", "ppl_sitting", "ppl_lounging",
  "ppl_swimmer_a", "ppl_swimmer_b", "ppl_swimmer_ring"]
scene("ppl_sheet", { w: 300, h: 40, bg: "c+1" },
  rect(0, 30, 300, 10, "w"),
  ...ALL.map((n, i) => stamp(n, 4 + i * 21, 8)))
