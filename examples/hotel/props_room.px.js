include("palette.px.js")
// Room props for the island hotel cross-section (room ~44px floor to ceiling).
// Built from form primitives in base tones; form() + outline "auto" give depth.
// Details (seams, weave, piping, knobs) are painted in step colors onto the surfaces.

const S = { form: true, outline: "auto" }

// rattan weave: checker of a darker step inside a box
const weave = (x, y, w, h, c = "w-1") => (cv) => {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if ((xx + yy) % 2 === 0) cv.px(xx, yy, c)
}

// ---------------------------------------------------------------- beds
sprite("room_bed_double", { ...S, w: 28, h: 14 },
  // headboard (left): wood with rounded top and a rattan panel
  block(0, 1, 5, 13, "w", { bevel: 1 }), ball(2, 2, 2, "w"),
  weave(1, 3, 3, 6),
  // frame + legs
  block(4, 9, 24, 3, "w", { bevel: 1 }), hline(5, 10, 22, "w-1"),
  rect(5, 12, 2, 2, "d"), rect(25, 12, 2, 2, "d"),
  // mattress / sheet
  block(5, 5, 23, 5, "e", { bevel: 1 }),
  // pillows
  ball(8, 4, 3, "e", { ry: 2 }), ball(12, 4, 3, "e", { ry: 2 }), px(10, 5, "e-1"),
  // blanket draped over the front: folded sheet edge, stitched hem
  block(14, 5, 14, 7, "t", { bevel: 1 }),
  hline(14, 5, 14, "e"), hline(14, 6, 14, "t-1"),
  (c) => { for (let x = 16; x < 28; x += 3) c.px(x, 9, "t+1") },
  hline(14, 11, 14, "t-1"))
const toCoral = { t: "o", "t-1": "o-1", "t+1": "o+1", "t-2": "o-2", "t+2": "o+2", "t-3": "o-3" }
sprite("room_bed_double_coral", { base: "room_bed_double", swap: toCoral })

sprite("room_bed_twin", { ...S, w: 18, h: 12 },
  block(0, 1, 4, 11, "w", { bevel: 1 }), ball(2, 2, 2, "w"), weave(1, 3, 2, 5),
  block(3, 8, 15, 2, "w", { bevel: 1 }),
  rect(4, 10, 2, 2, "d"), rect(15, 10, 2, 2, "d"),
  block(4, 4, 14, 5, "e", { bevel: 1 }),
  ball(7, 3, 3, "e", { ry: 2 }),
  block(10, 4, 8, 6, "t", { bevel: 1 }), hline(10, 4, 8, "e"), hline(10, 5, 8, "t-1"),
  px(12, 8, "t+1"), px(15, 8, "t+1"))

sprite("room_bunk", { ...S, w: 18, h: 24 },
  // posts
  tube(1, 1, 1, 23, 1, "w"), tube(16, 1, 16, 23, 1, "w"),
  // upper bunk: rail, mattress, blue blanket
  block(2, 8, 14, 2, "w", { bevel: 1 }),
  block(2, 4, 14, 4, "e", { bevel: 1 }), ball(5, 3, 2, "e", { ry: 1.5 }),
  block(8, 4, 8, 5, "b", { bevel: 1 }), hline(8, 4, 8, "e"), px(10, 7, "b+1"), px(13, 7, "b+1"),
  hline(2, 2, 14, "w"), hline(2, 3, 14, "w-1"),
  // lower bunk: teal
  block(2, 19, 14, 2, "w", { bevel: 1 }),
  block(2, 15, 14, 4, "e", { bevel: 1 }), ball(5, 14, 2, "e", { ry: 1.5 }),
  block(8, 15, 8, 5, "t", { bevel: 1 }), hline(8, 15, 8, "e"), px(10, 18, "t+1"), px(13, 18, "t+1"),
  // ladder on the right
  vline(12, 9, 14, "d"), vline(15, 9, 14, "d"),
  hline(13, 11, 2, "d+1"), hline(13, 14, 2, "d+1"), hline(13, 17, 2, "d+1"), hline(13, 22, 2, "d+1"),
  // post caps
  ball(1, 1, 1, "y"), ball(16, 1, 1, "y"))

sprite("room_nightstand", { ...S, w: 7, h: 8 },
  block(0, 0, 7, 7, "w", { top: 2, bevel: 1 }),
  hline(1, 4, 5, "w-1"), px(3, 3, "y"), px(3, 5, "y"),
  rect(0, 7, 1, 1, "d"), rect(6, 7, 1, 1, "d"))

// ---------------------------------------------------------------- lights
sprite("room_lamp_table", { ...S, w: 5, h: 9 },
  cyl(0, 0, 5, 4, "e", { taper: -1, cap: 1 }), hline(0, 3, 5, "o"),
  tube(2, 4, 2, 7, 0.6, "y"), cyl(1, 7, 3, 2, "y", { cap: 1 }))

sprite("room_lamp_pendant", { ...S, w: 5, h: 14 },
  vline(2, 0, 8, "d-1"), px(2, 7, "y-1"),
  cyl(0, 8, 5, 5, "y", { taper: -1, cap: 1 }),
  hline(1, 13, 3, "y+2"),
  glow("y+2", { r: 3, strength: 0.5 }))

sprite("room_fan", { ...S, w: 22, h: 6 },
  rect(10, 0, 2, 2, "y-1"), vline(10, 0, 3, "z"), vline(11, 0, 3, "z"),
  tube(1, 4, 8, 3, 1, "d", { r1: 1.2 }), tube(13, 3, 20, 4, 1.2, "d", { r1: 1 }),
  ball(10.5, 3, 2.5, "y", { ry: 1.5 }), ball(10.5, 5, 1.5, "e", { ry: 1 }))

// ---------------------------------------------------------------- wall decor
sprite("room_picture_wide", { ...S, w: 16, h: 10 },
  block(0, 0, 16, 10, "d", { bevel: 1 }),
  rect(2, 2, 12, 3, "a+1"), rect(2, 4, 12, 1, "a+2"),
  rect(2, 5, 12, 3, "q"), hline(2, 5, 12, "q+1"), hline(2, 7, 12, "q-1"),
  // island with a palm
  hline(8, 5, 4, "s"), hline(9, 4, 2, "s+1"), vline(10, 2, 3, "d+1"), hline(8, 2, 5, "g"), px(12, 3, "g"), px(8, 3, "g"),
  px(4, 3, "e"), px(5, 2, "e"), px(6, 3, "e"),
  px(1, 0, "y"))

sprite("room_picture_tall", { ...S, w: 8, h: 10 },
  block(0, 0, 8, 10, "d", { bevel: 1 }),
  rect(2, 2, 4, 6, "c+1"),
  line(3, 8, 4, 4, "w-1"), px(4, 3, "g"), px(2, 3, "g"), px(3, 2, "g"), px(5, 2, "g"), px(5, 4, "g-1"), px(2, 4, "g-1"), px(4, 2, "g+1"),
  hline(2, 7, 4, "s"))

sprite("room_mirror_round", { ...S, w: 9, h: 9 },
  ball(4, 4, 4, "w"), (c) => { for (let a = 0; a < 16; a += 2) c.px(Math.round(4 + 4 * Math.cos(a * Math.PI / 8)), Math.round(4 + 4 * Math.sin(a * Math.PI / 8)), "w-1") },
  circ(4, 4, 2, "j"), px(3, 3, "j+2"), px(4, 2, "j+1"), px(2, 4, "j+1"))

sprite("room_shelf", { ...S, w: 16, h: 7 },
  // books
  block(1, 1, 2, 4, "b", { bevel: 0 }), block(3, 0, 2, 5, "o"), block(5, 2, 2, 3, "t"), line(7, 4, 9, 2, "y", 2),
  // jar with lid
  cyl(11, 2, 3, 3, "j", { cap: 1 }), hline(11, 1, 3, "d"), px(12, 3, "y"),
  // tiny succulent
  ball(15, 2, 1, "g"),
  rect(14, 3, 2, 2, "x"),
  block(0, 5, 16, 2, "d", { bevel: 1 }))

// ---------------------------------------------------------------- plants
sprite("room_plant_small", { ...S, w: 8, h: 12 },
  cyl(1, 6, 6, 6, "x", { cap: 1, taper: 1, capColor: "x+1" }), hline(1, 7, 6, "x-1"),
  foliage(4, 3, 4, 3, "g", { size: [1, 2] }))

sprite("room_plant_big", { ...S, w: 14, h: 22 },
  // stems
  line(7, 16, 4, 6, "v"), line(7, 16, 10, 5, "v"), line(7, 16, 7, 3, "v"), line(7, 16, 2, 11, "v"), line(7, 16, 12, 11, "v"),
  // big leaves: tapered capsules
  tube(4, 7, 1, 2, 2.2, "g", { r1: 0.6 }),
  tube(10, 6, 13, 1, 2.2, "g", { r1: 0.6 }),
  tube(7, 5, 7, 0, 1.8, "v", { r1: 0.5 }),
  tube(3, 11, 0, 14, 2, "v", { r1: 0.6 }),
  tube(11, 11, 13, 15, 2, "g", { r1: 0.6 }),
  // mid-ribs
  line(4, 7, 2, 3, "g+1"), line(10, 6, 12, 2, "g+1"), line(11, 11, 12, 14, "g+1"),
  cyl(3, 15, 8, 7, "x", { cap: 1, taper: 1, capColor: "x-1" }), hline(3, 17, 8, "x+1"))

sprite("room_plant_palm", { ...S, w: 12, h: 24 },
  palm(6, 17, { h: 15, lean: 1, len: 7, fronds: 7, trunk: "w", leaf: "g" }),
  cyl(2, 16, 8, 8, "x", { cap: 1, taper: 1, capColor: "x-1" }), hline(2, 18, 8, "x+1"))

sprite("room_vine", { ...S, w: 6, h: 28 },
  (c) => {
    for (let y = 0; y < 28; y++) c.px(Math.round(2.5 + Math.sin(y / 3.5) * 1.2), y, "v")
    for (let y = 2; y < 27; y += 3) {
      const x = Math.round(2.5 + Math.sin(y / 3.5) * 1.2), side = (y / 3) % 2 < 1 ? -1 : 1
      c.ball(x + side * 1.5, y + 1, 1.5, y % 2 ? "g" : "v+1", { ry: 1 })
    }
  },
  px(4, 9, "f"), px(1, 18, "f"), px(4, 24, "f+1"))

// ---------------------------------------------------------------- seating
sprite("room_armchair", { ...S, w: 12, h: 11, mx: true },
  // rattan back + arm
  block(1, 0, 5, 8, "w", { bevel: 1 }), ball(4, 2, 3, "w", { ry: 2 }), weave(2, 1, 4, 5),
  block(0, 4, 3, 6, "w", { bevel: 1 }), hline(0, 5, 3, "w-1"), hline(0, 7, 3, "w-1"),
  // cushion
  block(3, 5, 3, 3, "t", { bevel: 1 }), hline(3, 7, 3, "t-1"), px(3, 3, "t"), px(4, 3, "t"), px(5, 3, "t"), px(5, 4, "t"), px(4, 4, "t"), px(3, 4, "t"),
  rect(1, 10, 1, 1, "d"), rect(5, 9, 1, 2, "w-2"))

sprite("room_sofa", { ...S, w: 26, h: 10, mx: true },
  block(1, 0, 12, 6, "t", { bevel: 1 }),                    // back
  block(0, 3, 4, 6, "t", { bevel: 1 }), ball(2, 3, 2, "t"),    // arm
  block(3, 2, 5, 4, "t", { bevel: 1 }), vline(8, 2, 4, "t-1"), // back cushions
  block(8, 2, 5, 4, "t", { bevel: 1 }),
  block(4, 5, 9, 3, "t", { bevel: 1 }), vline(12, 5, 3, "t-1"), // seat cushions
  hline(0, 8, 13, "t-1"),
  ball(6, 4, 2, "o"), px(6, 4, "o+1"),                       // throw pillow
  rect(1, 9, 1, 1, "d"), rect(12, 9, 1, 1, "d"))

// ---------------------------------------------------------------- storage
sprite("room_wardrobe", { ...S, w: 12, h: 26 },
  block(0, 2, 12, 23, "w", { bevel: 1 }),
  block(0, 0, 12, 2, "w", { bevel: 1 }), hline(0, 2, 12, "w-2"),
  vline(6, 3, 21, "w-2"),
  (c) => { for (let y = 5; y < 21; y += 2) { c.hline(1, y, 4, "w-1"); c.hline(7, y, 4, "w-1") } },
  px(5, 13, "y"), px(7, 13, "y"),
  rect(1, 25, 2, 1, "d"), rect(9, 25, 2, 1, "d"))

sprite("room_suitcase", { ...S, w: 6, h: 8 },
  hline(2, 0, 2, "z"), px(1, 1, "z"), px(4, 1, "z"),
  block(0, 2, 6, 6, "o", { bevel: 1 }), vline(2, 2, 6, "d"), vline(3, 2, 6, "d"), px(4, 4, "y"), px(1, 5, "e"))

sprite("room_surfboard", { ...S, w: 5, h: 22 },
  ball(2, 11, 2.5, "e", { ry: 11 }), vline(2, 1, 20, "u"), hline(0, 15, 5, "t"), hline(0, 16, 5, "t-1"))

// ---------------------------------------------------------------- windows & doors
sprite("room_window_arch", { ...S, w: 12, h: 22 },
  arch(1, 0, 10, 20, "e"), bump("bevel", { on: "e", w: 1 }),
  arch(2, 1, 8, 18, "j"),
  recolor({ j: "a+1" }, [2, 0, 8, 7]), recolor({ j: "a+2" }, [2, 7, 8, 3]),
  recolor({ j: "q" }, [2, 10, 8, 4]), recolor({ j: "q-1" }, [2, 14, 8, 5]),
  hline(2, 10, 8, "q+1"), hline(6, 9, 3, "m"), px(4, 4, "e"), px(5, 4, "e"),
  vline(5, 1, 18, "e"), vline(6, 1, 18, "e-1"), hline(2, 11, 8, "e"),
  block(0, 19, 12, 3, "e", { bevel: 1 }), hline(1, 21, 10, "e-1"))

sprite("room_door_arch", { ...S, w: 14, h: 28 },
  arch(0, 0, 14, 28, "e"), bump("bevel", { on: "e", w: 1 }),
  arch(2, 2, 10, 26, "j"),
  recolor({ j: "a+1" }, [2, 0, 10, 10]), recolor({ j: "a+2" }, [2, 10, 10, 3]),
  recolor({ j: "q" }, [2, 13, 10, 4]), recolor({ j: "s" }, [2, 17, 10, 3]),
  hline(2, 13, 10, "q+1"), px(4, 6, "e"), px(5, 6, "e"),
  // leaves: center mullion, transoms, kick panels
  vline(6, 2, 26, "e"), vline(7, 2, 26, "e-1"),
  hline(2, 9, 10, "e"), hline(2, 15, 10, "e"),
  rect(2, 20, 10, 8, "e"), box(3, 21, 3, 6, "e-1"), box(8, 21, 3, 6, "e-1"),
  px(5, 17, "y"), px(8, 17, "y"))

// ---------------------------------------------------------------- counters & tables
sprite("room_desk_reception", { ...S, w: 40, h: 12 },
  // top: papers, bell, small plant
  rect(6, 2, 6, 2, "e"), hline(7, 2, 4, "e-1"), px(13, 3, "e+1"),
  ball(31, 2, 2, "y", { ry: 1.5 }), hline(29, 3, 5, "z"), px(31, 0, "y+1"),
  cyl(20, 1, 2, 3, "o"), px(21, 0, "f"), px(20, 0, "g"),
  // counter
  block(0, 4, 40, 2, "d", { bevel: 1 }),
  block(1, 6, 38, 6, "w", { bevel: 1 }),
  (c) => { for (const x of [3, 15, 27]) { c.box(x, 7, 10, 4, "w-2"); for (let y = 8; y < 10; y++) for (let xx = x + 1; xx < x + 9; xx++) if ((xx + y) % 2 === 0) c.px(xx, y, "w-1") } })

sprite("room_buffet", { ...S, w: 56, h: 13 },
  // juice dispensers (glass with juice, metal tap)
  cyl(2, 0, 5, 5, "j", { cap: 1 }), rect(3, 2, 3, 3, "y"), cyl(9, 0, 5, 5, "j", { cap: 1 }), rect(10, 2, 3, 3, "u"),
  px(4, 5, "z"), px(11, 5, "z"),
  // plate stack
  cyl(17, 3, 6, 3, "e", { cap: 1 }), hline(17, 4, 6, "e-1"),
  // fruit bowl
  ball(27, 3, 2, "y"), ball(30, 2, 2, "u"), ball(32, 3, 2, "g"),
  cyl(25, 4, 10, 2, "w", { taper: 2 }),
  // croissant basket
  tube(39, 3, 43, 3, 1.2, "y-1"), tube(43, 2, 47, 3, 1.2, "y-1"), px(41, 3, "w"), px(45, 3, "w"),
  cyl(38, 4, 11, 2, "w", { taper: 1 }), weave(39, 4, 9, 1, "w-1"),
  // pineapple
  ball(52, 3, 2, "y", { ry: 2 }), px(52, 0, "g"), px(51, 0, "g"), px(53, 1, "g"),
  // table with white cloth
  block(0, 6, 56, 7, "e", { bevel: 1 }),
  hline(0, 7, 56, "t"), hline(0, 11, 56, "e-1"),
  (c) => { for (let x = 2; x < 56; x += 4) c.px(x, 12, "t") })

sprite("room_table_dining", { ...S, w: 18, h: 12, mx: true },
  // chair (left, facing in)
  block(0, 1, 2, 11, "w", { bevel: 0 }), weave(0, 2, 2, 4),
  block(0, 7, 5, 2, "w", { bevel: 1 }), vline(4, 9, 3, "w-1"),
  // table
  block(3, 5, 6, 2, "d", { bevel: 1 }), vline(8, 7, 5, "d"), hline(6, 11, 3, "d"),
  // vase + flowers
  cyl(8, 3, 1, 2, "j"), px(8, 1, "f"), px(7, 0, "f+1"), px(8, 2, "g"), px(7, 2, "y"))

sprite("room_rug", { ...S, w: 24, h: 3 },
  block(1, 0, 22, 3, "o", { bevel: 1 }), hline(2, 1, 20, "e"),
  (c) => { for (let x = 3; x < 22; x += 4) { c.px(x, 1, "t"); c.px(x + 1, 0, "o-1"); c.px(x + 1, 2, "o-1") } },
  px(0, 0, "e"), px(0, 2, "e"), px(23, 0, "e"), px(23, 2, "e"))

// ---------------------------------------------------------------- overview
const ROOM = [
  "room_bed_double", "room_bed_double_coral", "room_bed_twin", "room_bunk", "room_wardrobe", "room_door_arch", "room_window_arch",
  "room_nightstand", "room_lamp_table", "room_lamp_pendant", "room_fan", "room_mirror_round", "room_picture_wide", "room_picture_tall",
  "room_plant_small", "room_plant_big", "room_plant_palm", "room_vine", "room_armchair", "room_sofa", "room_shelf",
  "room_desk_reception", "room_buffet", "room_table_dining", "room_rug", "room_suitcase", "room_surfboard",
]

// final sizes (after outline), used to lay out the overview grid
const SZ = {
  room_bed_double: [30, 16], room_bed_double_coral: [30, 16], room_bed_twin: [20, 14], room_bunk: [20, 26],
  room_wardrobe: [14, 28], room_door_arch: [16, 30], room_window_arch: [14, 24], room_nightstand: [9, 10],
  room_lamp_table: [7, 11], room_lamp_pendant: [7, 16], room_fan: [24, 8], room_mirror_round: [11, 11],
  room_picture_wide: [18, 12], room_picture_tall: [10, 12], room_plant_small: [10, 14], room_plant_big: [16, 24],
  room_plant_palm: [14, 26], room_vine: [8, 30], room_armchair: [14, 13], room_sofa: [28, 12], room_shelf: [18, 9],
  room_desk_reception: [42, 14], room_buffet: [58, 15], room_table_dining: [20, 14], room_rug: [26, 5],
  room_suitcase: [8, 10], room_surfboard: [7, 24],
}
const ROWS = [
  ["room_bed_double", "room_bed_double_coral", "room_bed_twin", "room_bunk", "room_wardrobe", "room_door_arch", "room_window_arch"],
  ["room_sofa", "room_armchair", "room_table_dining", "room_nightstand", "room_lamp_table", "room_suitcase", "room_surfboard", "room_plant_small", "room_plant_big", "room_plant_palm"],
  ["room_desk_reception", "room_buffet", "room_rug"],
  ["room_lamp_pendant", "room_fan", "room_vine", "room_mirror_round", "room_picture_wide", "room_picture_tall", "room_shelf"],
]
const GAP = 4, SHEET_W = 184
const rowH = ROWS.map((r) => Math.max(...r.map((n) => SZ[n][1])))
const SHEET_H = rowH.reduce((a, h) => a + h + GAP + 3, GAP)
scene("room_sheet", { w: SHEET_W, h: SHEET_H, bg: "c+1" }, (c) => {
  let y = GAP
  ROWS.forEach((row, i) => {
    const base = y + rowH[i]
    const hanging = i === 3
    if (!hanging) c.rect(0, base - 1, SHEET_W, 3 + 1, "w")
    else c.rect(0, y - 2, SHEET_W, 2, "c-1")
    let x = GAP
    for (const n of row) {
      const [w, h] = SZ[n]
      c.stamp(n, x, hanging ? y - 1 : base - h + 1)
      x += w + GAP
    }
    y = base + GAP + 3
  })
})
