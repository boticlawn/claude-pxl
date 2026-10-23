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
  // shadowed inside of the frame (back panel) so the bunks read as a box, no pin-holes
  rect(2, 3, 12, 6, "d-1"), rect(2, 10, 12, 9, "d-1"),
  // posts with brass caps
  block(0, 1, 2, 23, "w", { bevel: 1 }), block(14, 1, 2, 23, "w", { bevel: 1 }),
  // upper bunk: guard rail, mattress, blue blanket, rail
  block(2, 2, 12, 2, "w", { bevel: 1 }), vline(5, 2, 2, "w-1"), vline(8, 2, 2, "w-1"), vline(11, 2, 2, "w-1"),
  block(2, 5, 12, 3, "e", { bevel: 1 }), ball(4, 4.5, 2, "e", { ry: 1.2 }),
  block(7, 5, 7, 4, "b", { bevel: 1 }), hline(7, 5, 7, "e"), px(9, 7, "b+1"), px(12, 7, "b+1"),
  block(2, 8, 12, 2, "w", { bevel: 1 }), hline(2, 9, 12, "w-1"),
  // lower bunk: teal
  block(2, 15, 12, 3, "e", { bevel: 1 }), ball(4, 14.5, 2, "e", { ry: 1.2 }),
  block(7, 15, 7, 4, "t", { bevel: 1 }), hline(7, 15, 7, "e"), px(9, 17, "t+1"), px(12, 17, "t+1"),
  block(2, 18, 12, 2, "w", { bevel: 1 }), hline(2, 19, 12, "w-1"),
  ball(1, 1, 1.2, "y"), ball(15, 1, 1.2, "y"),
  // ladder leaning on the right post
  line(16, 3, 17, 23, "d"), (c) => { for (const y of [6, 11, 16, 21]) c.px(16 + (y > 12 ? 1 : 0), y, "d+1") })

sprite("room_nightstand", { ...S, w: 7, h: 8 },
  block(0, 0, 7, 7, "w", { top: 2, bevel: 1 }),
  hline(1, 4, 5, "w-1"), px(3, 3, "y"), px(3, 5, "y"),
  rect(0, 7, 1, 1, "d"), rect(6, 7, 1, 1, "d"))

// ---------------------------------------------------------------- lights
sprite("room_lamp_table", { ...S, w: 5, h: 9 },
  cyl(0, 0, 5, 4, "e", { taper: -1, cap: 1 }), hline(0, 3, 5, "o"),
  tube(2, 4, 2, 7, 0.6, "y"), cyl(1, 7, 3, 2, "y", { cap: 1 }))

sprite("_pendant_shade", { ...S, w: 7, h: 14 },
  cyl(2, 7, 3, 2, "d", { cap: 0 }),
  cyl(0, 9, 7, 4, "y", { taper: -2, cap: 0 }), hline(1, 9, 5, "y-1"),
  hline(0, 13, 7, "y+2"), glow("y+2", { r: 3, strength: 0.4 }))
// the cord is drawn on the outlined result so it stays 1px thin
sprite("room_lamp_pendant", { base: "_pendant_shade" }, vline(4, 0, 8, "d-2"))

sprite("_fan", { ...S, w: 22, h: 6 },
  // thin blades with a lit top edge, brass motor housing, glass light below
  tube(9, 3, 1, 4, 0.8, "d", { r1: 1.1 }), tube(13, 3, 21, 4, 0.8, "d", { r1: 1.1 }),
  cyl(8, 2, 6, 3, "y", { cap: 0, bulge: 1 }), hline(8, 3, 6, "y-1"),
  ball(11, 5, 1.5, "e", { ry: 1 }))
sprite("room_fan", { base: "_fan" }, rect(11, 0, 2, 3, "z-1"), hline(11, 0, 2, "z"))

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
  rect(1, 1, 6, 8, "a+2"), rect(1, 7, 6, 2, "s"), hline(1, 6, 6, "q"),
  line(3, 8, 4, 3, "w-1"),
  hline(2, 2, 4, "g"), px(1, 3, "g-1"), px(6, 3, "g-1"), px(4, 1, "g"), px(5, 3, "g"), px(3, 3, "g-1"),
  px(5, 1, "e"))

sprite("room_mirror_round", { ...S, w: 9, h: 9 },
  ball(4, 4, 4, "w"), (c) => { for (let a = 0; a < 16; a += 2) c.px(Math.round(4 + 4 * Math.cos(a * Math.PI / 8)), Math.round(4 + 4 * Math.sin(a * Math.PI / 8)), "w-1") },
  circ(4, 4, 2, "j"), px(3, 3, "j+2"), px(4, 2, "j+1"), px(2, 4, "j+1"))

sprite("room_shelf", { ...S, w: 16, h: 6 },
  // books (flat spines with a lit left edge), one leaning
  rect(1, 0, 2, 4, "b"), vline(1, 0, 4, "b+1"), hline(1, 1, 2, "y"),
  rect(3, 1, 2, 3, "o"), vline(3, 1, 3, "o+1"), hline(3, 2, 2, "e"),
  rect(5, 0, 1, 4, "t"),
  line(6, 3, 8, 1, "y"), line(7, 3, 9, 1, "y-1"),
  // jar with lid and shells
  cyl(10, 1, 3, 3, "j", { cap: 0 }), hline(10, 0, 3, "d"), px(11, 2, "o+1"), px(10, 3, "s"),
  // tiny succulent pot
  rect(14, 2, 2, 2, "x"), ball(14.5, 1, 1.2, "g"),
  block(0, 4, 16, 2, "d", { bevel: 1 }))

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
  // slender ringed trunk
  (c) => { for (let y = 8; y < 18; y++) c.rect(Math.round(5 + (17 - y) * 0.08), y, 2, 1, y % 2 ? "w" : "w-1") },
  // drooping fronds: tapered tubes from the crown, back ones darker
  tube(6, 7, 1, 6, 1, "g-1", { r1: 0.4 }), tube(6, 7, 11, 5, 1, "g-1", { r1: 0.4 }),
  tube(6, 7, 2, 2, 1.1, "g", { r1: 0.4 }), tube(6, 7, 10, 1, 1.1, "g", { r1: 0.4 }),
  tube(6, 7, 0, 10, 1.1, "g", { r1: 0.4 }), tube(6, 7, 11, 11, 1.1, "g", { r1: 0.4 }),
  tube(6, 7, 6, 0, 1, "g", { r1: 0.4 }),
  // leaflet notches along the fronds
  px(3, 8, "g-2"), px(9, 9, "g-2"), px(3, 4, "g+1"), px(9, 3, "g+1"),
  ball(6, 7, 1.3, "w-1"),
  cyl(3, 17, 6, 7, "x", { cap: 0, taper: 1 }), block(2, 16, 8, 2, "x", { bevel: 1 }), hline(2, 17, 8, "x-1"), px(4, 20, "x+1"))

sprite("room_vine", { ...S, w: 6, h: 28 },
  (c) => {
    const sx = (y) => Math.round(2.5 + Math.sin(y / 4) * 1.2)
    for (let y = 0; y < 27; y++) c.px(sx(y), y, "v")
    let side = -1
    for (let y = 2; y < 27; y += 3) {
      const x = sx(y)
      c.tube(x, y, x + side * 2.5, y + 2, 1.1, y % 2 ? "g" : "v+1", { r1: 0.4 })
      side = -side
    }
  },
  px(4, 9, "f"), px(1, 17, "f"), px(4, 24, "f+1"))

// ---------------------------------------------------------------- seating
sprite("room_armchair", { ...S, w: 12, h: 11, mx: true },
  // round rattan back with horizontal wicker rows
  ball(6, 4.5, 6, "w", { ry: 4.5 }),
  (c) => { for (let y = 1; y < 9; y += 2) c.hline(0, y, 6, "w-1") },
  // cushions
  block(2, 3, 4, 3, "t", { bevel: 1 }), block(2, 6, 4, 2, "t", { bevel: 1 }), hline(2, 6, 4, "t+1"), px(4, 4, "t+1"),
  // arm and legs
  block(0, 5, 2, 4, "w", { bevel: 1 }), px(0, 6, "w-1"), px(0, 8, "w-1"),
  hline(1, 8, 5, "w-1"), rect(1, 9, 1, 2, "d"))

sprite("room_sofa", { ...S, w: 26, h: 10, mx: true },
  block(1, 0, 12, 8, "t", { bevel: 1 }),                       // body
  vline(12, 1, 4, "t-1"), hline(2, 4, 11, "t-1"),               // cushion seams
  px(9, 2, "t-1"),                                              // button
  hline(3, 5, 10, "t+1"), vline(12, 5, 3, "t-1"),                // seat front + seam
  block(0, 3, 3, 6, "t", { bevel: 1 }), hline(0, 3, 3, "t+1"), hline(0, 7, 3, "t-1"),  // arm
  block(3, 2, 3, 3, "o", { bevel: 1 }), px(4, 3, "o+1"),          // throw pillow
  hline(0, 8, 13, "t-2"),
  rect(1, 9, 1, 1, "d"), rect(12, 9, 1, 1, "d"))

// ---------------------------------------------------------------- storage
sprite("room_wardrobe", { ...S, w: 12, h: 26 },
  block(0, 2, 12, 23, "w", { bevel: 1 }),
  block(0, 0, 12, 2, "w", { bevel: 1 }), hline(0, 2, 12, "w-2"),
  vline(6, 3, 21, "w-2"),
  (c) => { for (let y = 5; y < 21; y += 2) { c.hline(1, y, 4, "w-1"); c.hline(7, y, 4, "w-1") } },
  px(5, 13, "y"), px(7, 13, "y"),
  rect(1, 25, 2, 1, "d"), rect(9, 25, 2, 1, "d"))

sprite("_suitcase", { ...S, w: 6, h: 8 },
  block(0, 2, 6, 6, "o", { bevel: 1 }), hline(0, 4, 6, "o-1"),
  vline(1, 2, 6, "d"), vline(4, 2, 6, "d"), px(1, 4, "y"), px(4, 4, "y"),   // straps + buckles
  px(2, 6, "e"), px(3, 6, "t"))                                         // travel stickers
// handle drawn after the outline so it stays a thin loop
sprite("room_suitcase", { base: "_suitcase" }, hline(3, 1, 2, "z-1"), px(2, 2, "z-1"), px(5, 2, "z-1"))

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
  // chair facing the table: tall back, cushioned seat, legs
  block(0, 1, 2, 11, "w", { bevel: 1 }), ball(1, 1, 1, "w"), px(0, 3, "w-1"), px(0, 5, "w-1"),
  block(1, 7, 3, 2, "t", { bevel: 1 }), vline(3, 9, 3, "w-1"),
  // table: wide top with cloth edge + pedestal
  block(4, 5, 5, 2, "d", { bevel: 1 }), hline(4, 6, 5, "e"), rect(8, 7, 1, 4, "d"), hline(6, 11, 3, "d"),
  // vase + flowers, plate
  cyl(8, 3, 2, 2, "j", { cap: 0 }), px(8, 1, "f"), px(9, 0, "f+1"), px(8, 2, "g"), px(7, 1, "g"),
  hline(5, 4, 2, "e"))

sprite("room_rug", { ...S, w: 24, h: 3 },
  block(1, 0, 22, 3, "o", { bevel: 1 }), hline(2, 1, 20, "e"),
  (c) => { for (let x = 3; x < 22; x += 4) { c.px(x, 1, "t"); c.px(x + 1, 0, "o-1"); c.px(x + 1, 2, "o-1") } },
  px(0, 0, "e"), px(0, 2, "e"), px(23, 0, "e"), px(23, 2, "e"))

// ---------------------------------------------------------------- overview

// final sizes (after outline), used to lay out the overview grid
const SZ = {
  room_bed_double: [30, 16], room_bed_double_coral: [30, 16], room_bed_twin: [20, 14], room_bunk: [20, 26],
  room_wardrobe: [14, 28], room_door_arch: [16, 30], room_window_arch: [14, 24], room_nightstand: [9, 10],
  room_lamp_table: [7, 11], room_lamp_pendant: [9, 16], room_fan: [24, 8], room_mirror_round: [11, 11],
  room_picture_wide: [18, 12], room_picture_tall: [10, 12], room_plant_small: [10, 14], room_plant_big: [16, 24],
  room_plant_palm: [14, 26], room_vine: [8, 30], room_armchair: [14, 13], room_sofa: [28, 12], room_shelf: [18, 8],
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
