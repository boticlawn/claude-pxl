// Island hotel benchmark scene, 480x270: cross-section hotel on a dock, beach, pool, lagoon.
// Reference target: dense cozy Caribbean pixel art. Structure + environment live here; the props
// come from props_room / props_outdoor / people.
include("palette.px.js")

const W = 480, H = 270
// Building geometry
const BX0 = 18, BX1 = 334            // outer facade
const TOWER = 70                     // left pink tower ends here
const FLOORS = [                     // interior top, floor line (props stand on floorY)
  { top: 42, floor: 80 },
  { top: 88, floor: 126 },
  { top: 134, floor: 176 },
]
const COLS = [TOWER, 158, 246, BX1 - 6]   // white pillars between rooms
const DOCK_Y = 180, SEA_Y = 120

// ---------------------------------------------------------------- reusable parts

for (const f of FLOORS) {
  const h = f.floor - f.top + 6
  sprite("_pillar_" + f.top, { w: 6, h, form: true }, cyl(0, 0, 6, h, "e"), block(0, 0, 6, 2, "e"), block(0, h - 3, 6, 3, "e"))
}

/** Back wall, floor and ceiling of one room. */
function room(c, x0, x1, f, wall) {
  const t = f.top, fl = f.floor
  c.rect(x0, t, x1 - x0, fl - t, wall)
  // wainscot + rail, a ceiling shadow band, a warm light pool high on the wall
  c.rect(x0, fl - 9, x1 - x0, 9, wall + "-1")
  c.hline(x0, fl - 10, x1 - x0, "e")
  c.dither(x0, t, x1 - x0, 3, wall + "-1", wall, 0.5)
  c.light([x0, t + 3, x1 - x0, 10], 1, 0.25)
  // wooden floor with plank seams
  c.rect(x0, fl, x1 - x0, 4, "w")
  c.hline(x0, fl, x1 - x0, "w+1")
  for (let x = x0 + 3; x < x1; x += 9) c.px(x, fl + 2, "w-1")
}

sprite("_bulb", { w: 3, h: 3, form: true }, ball(1, 1, 1.2, "y+1"))
sprite("_baluster", { w: 3, h: 6, form: true }, tube(1, 0, 1, 5, 0.9, "e"))

/** White railing: top rail + balusters, standing on y. */
function railing(c, x0, x1, y) {
  for (let x = x0; x < x1; x += 3) c.stamp("_baluster", x, y - 6)
  c.block(x0, y - 7, x1 - x0, 2, "e", { bevel: 0 })
}

// ---------------------------------------------------------------- the scene

scene("hotel", { w: W, h: H, bg: "a" },
  // sky: deeper blue up top, pale at the horizon; sun; clouds
  layer("sky",
    grad(0, 0, W, SEA_Y, ["a-1", "a", "a+1", "a+2"], "v", 0.3),
    ball(440, 20, 7, "y+2"),
    cloud(380, 44, 64, 18, "e", { seed: 3 }), cloud(452, 62, 34, 10, "e", { seed: 8 }), cloud(250, 12, 40, 10, "e", { seed: 5 }),
    form({ contrast: 1.1, rim: 0 })),
  glow("y+2", { r: 10, strength: 0.35, where: [400, 0, 80, 40] }),
  // far island: mountain, a little hazed
  layer("far", { haze: 0.35, hazeColor: "a+2" },
    mountain(330, SEA_Y + 1, 150, 62, "m", { peak: 0.45, seed: 11 }),
    mountain(300, SEA_Y + 1, 60, 16, "v", { peak: 0.6, seed: 4, gullies: 0.4 }),
    foliage(395, SEA_Y - 4, 40, 4, "v", { size: [1, 2], seed: 9, tips: false }),
    (c) => { for (let i = 0; i < 9; i++) c.px(380 + i * 6 + (i % 3), SEA_Y - 3 - (i % 2), i % 2 ? "e" : "p+1") },   // village
    form({ contrast: 0.9 })),
  // sea: deep blue far away, turquoise lagoon in front
  water(0, SEA_Y, W, 50, "n", { depth: [0, 1], ripples: 0.16, len: [3, 10], seed: 1 }),
  hline(0, SEA_Y, W, "n+2"),
  water(0, SEA_Y + 50, W, H - SEA_Y - 50, "q", { depth: [-2, 1], ripples: 0.2, seed: 2 }),
  dither(0, SEA_Y + 47, W, 6, "n", "q-2", 0.5),

  // beach on the right, wet edge, pool
  layer("beach",
    poly([300, 182, 330, 160, 380, 150, W, 146, W, 226, 440, 222, 400, 214, 350, 206, 312, 200], "s"),
    poly([312, 200, 350, 206, 400, 214, 440, 222, W, 226, W, 230, 440, 226, 398, 218, 348, 210, 310, 203], "s-2"),
    block(346, 172, 120, 22, "e", { top: 3, bevel: 1 }),                     // pool rim
    water(350, 176, 112, 15, "q", { depth: [1, 1], ripples: 0.12, glints: 6, foam: 0, seed: 7 }),
    caustics(350, 176, 112, 15, { scale: 6, width: 0.16, on: "q+1" }),
    form()),

  // ---------------- building
  layer("interior", (c) => {
    const walls = [["c", "c", "c"], ["c", "c", "c"], ["c", "c", "c"]]
    FLOORS.forEach((f, i) => {
      for (let r = 0; r < COLS.length - 1; r++) room(c, COLS[r] + 6, COLS[r + 1], f, walls[i][r])
      room(c, BX0 + 4, TOWER, f, "p+1")                                         // tower rooms: pink stairwell
    })
  }),
  layer("structure",
    // floor slabs and the roof slab
    (c) => {
      for (const f of FLOORS) { c.block(BX0, f.floor + 4, BX1 - BX0, 4, "e", { bevel: 1 }); c.hline(BX0, f.floor + 7, BX1 - BX0, "p-1") }
      c.block(BX0 - 2, FLOORS[0].top - 6, BX1 - BX0 + 4, 6, "e", { bevel: 1 })
    },
    // pink outer walls left/right and the tower front with arches
    rect(BX0, FLOORS[0].top, 4, DOCK_Y - FLOORS[0].top, "p"),
    rect(BX1 - 2, FLOORS[0].top, 4, DOCK_Y - FLOORS[0].top, "p"),
    (c) => {
      for (const x of COLS) for (const f of FLOORS) c.stamp("_pillar_" + f.top, x, f.top - 1)
    },
    // roof: teal tiles with ridge and eave
    block(BX0 + 4, 26, BX1 - BX0 - 8, 10, "r", { top: 3, bevel: 0 }),
    (c) => { for (let x = BX0 + 6; x < BX1 - 4; x += 4) c.vline(x, 29, 7, "r-1") },
    hline(BX0 + 2, 35, BX1 - BX0 - 4, "r-2"),
    form()),
  layer("tower_front", { },
    rect(BX0 + 4, FLOORS[0].top, TOWER - BX0 - 4, DOCK_Y - FLOORS[0].top, "p"),
    (c) => { for (const f of FLOORS) { c.arch(BX0 + 12, f.top + 6, 22, f.floor - f.top - 4, "_"); c.arch(BX0 + 14, f.top + 8, 18, f.floor - f.top - 8, "e", true) } },
    bump("bevel", { w: 1, on: "p" }),
    form()),

  layer("arcade", (c) => {
    // Ground floor: pink spandrels with arches over each room; upper floors get balcony rails.
    const f = FLOORS[2]
    for (let r = 0; r < COLS.length - 1; r++) {
      const x0 = COLS[r] + 6, x1 = COLS[r + 1], w = x1 - x0
      c.rect(x0, f.top, w, 16, "p")
      const aw = Math.floor((w - 4) / 2)
      c.clip([x0, f.top, w, 16], () => {
        for (const ax of [x0 + 2, x0 + 2 + aw]) { c.arch(ax + 1, f.top + 3, aw - 2, 60, "_"); c.arch(ax + 1, f.top + 3, aw - 2, 60, "e", true) }
      })
      c.hline(x0, f.top, w, "p+1")
    }
    for (const f2 of FLOORS.slice(0, 2)) railing(c, COLS[COLS.length - 2] + 6, COLS[COLS.length - 1], f2.floor)
    railing(c, BX0 + 2, TOWER, 26)                     // roof terrace on the tower
  }, bump("bevel", { w: 1, on: "p" }), form()),
  wire(BX0 + 8, 20, BX1 - 8, 20, 7, "d-1", { hang: "_bulb", every: 9 }),
  glow("y+1", { r: 5, strength: 0.3, where: [0, 0, 340, 40] }),

  // ---------------- dock and pier
  layer("dock",
    (c) => { for (let x = 6; x < 330; x += 26) c.cyl(x, DOCK_Y + 4, 6, 24, "d", { cap: 1 }) },
    (c) => { for (let x = 30; x < 120; x += 30) c.cyl(x, 218, 6, 22, "d", { cap: 1 }) },
    block(0, DOCK_Y, 336, 7, "w", { top: 3, bevel: 0 }),
    (c) => { for (let x = 4; x < 336; x += 7) c.vline(x, DOCK_Y + 3, 4, "w-1") },
    hline(0, DOCK_Y + 6, 336, "d-1"),
    poly([20, 187, 120, 187, 128, 216, 36, 216], "w"),                         // pier going toward the viewer
    (c) => { for (let y = 190; y < 216; y += 3) c.line(20 + (y - 187) * 0.55, y, 120 + (y - 187) * 0.28, y, "w-1") },
    block(34, 216, 96, 4, "w", { bevel: 0 }),
    form()),
  shade([0, DOCK_Y + 7, 336, 5], 1), shade([0, DOCK_Y + 12, 336, 4], 1, 0.5),
  reflect(0, DOCK_Y + 28, 336, 16, { seed: 3 }),
  reflect(28, 240, 100, 14, { seed: 4 }),
  foam("d", { on: "q" }),

  // ---------------- palms and greenery
  layer("green",
    palm(330, 205, { h: 110, lean: 26, r: 4, trunk: "w", leaf: "g", fronds: 12, len: 52, nuts: "d-1", seed: 2 }),
    palm(400, 182, { h: 92, lean: 18, r: 3.5, trunk: "w", leaf: "g", fronds: 11, len: 46, nuts: "d-1", seed: 6 }),
    palm(34, 44, { h: 30, lean: -6, trunk: "w", leaf: "g", fronds: 9, len: 20, seed: 4 }),
    foliage(22, 150, 14, 12, "g", { flowers: "f", bloom: 0.8, seed: 3 }),
    foliage(310, 180, 14, 8, "g", { flowers: "f", seed: 8 }),
    foliage(462, 150, 20, 10, "v", { seed: 12 }),
    form()),
  glow("y+1", { r: 4, strength: 0.25 }))
