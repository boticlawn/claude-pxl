include("palette.px.js")
material("E", "#c9b384", { steps: 5, at: 3 })   // khaki shorts / trousers
material("F", "#34406e", { steps: 5, at: 3 })   // navy (waiter trousers, vest)

const paint = (x0, y0, g, map) => (c) => {
  g.trim().split("\n").forEach((row, y) => [...row.trim()].forEach((ch, x) => {
    const col = ch === "_" ? "_" : map[ch]
    if (col) c.px(x0 + x, y0 + y, col)
  }))
}
const HAIR = {
  short: `
_.HHHH._
.HHHHHH.
HHHHHHHH
HH...HHH
H......H`,
}
const head = (x, y, skin = "h", hair = "l", style = "short") => [
  ball(x + 3.5, y + 3.5, 3.6, skin, { ry: 3.6 }),
  paint(x, y, HAIR[style], { H: hair }),
  paint(x, y + 4, `
..E..E..
..E..E..
.C.MM.C.
_......_`, { E: "l-1", M: skin + "-2", C: "o+1" }),
]
// standing body, 8 wide (x..x+7), torso top at y; returns 9 rows (y..y+8)
const body = (x, y, shirt, pants = "E", skin = "h", shoe = "d-1") => [
  block(x + 2, y + 6, 1, 2, skin, { bevel: 1 }), block(x + 5, y + 6, 1, 2, skin, { bevel: 1 }),   // legs
  hline(x + 1, y + 8, 2, shoe), hline(x + 5, y + 8, 2, shoe),
  block(x, y + 1, 1, 4, skin, { bevel: 1 }), block(x + 7, y + 1, 1, 4, skin, { bevel: 1 }),       // arms
  block(x, y + 1, 1, 1, shirt, { bevel: 0 }), block(x + 7, y + 1, 1, 1, shirt, { bevel: 0 }),     // sleeves
  block(x + 1, y, 6, 5, shirt, { bevel: 1 }),
  block(x + 1, y + 5, 6, 1, pants, { bevel: 0 }),
]
sprite("ppl_guest_a", { w: 8, h: 17, form: true, outline: "auto" },
  ...body(0, 8, "f"), ...head(0, 0))
