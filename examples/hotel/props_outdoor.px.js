include("palette.px.js")
// Outdoor props for the island hotel (dock, beach, pool, lagoon).
// Everything is built from form primitives in base tones; form() lights it from the top-left
// and outline "auto" draws colored selective outlines. Details are step colors painted on top.

material("C", "#d9b77e", { steps: 6, at: 3 })   // rope / bamboo
const S = { form: true, outline: "auto" }

// Surface pixel with a dome normal over the ellipse (cx, cy, rx, ry): lets lattices, fringes and
// cut shapes shade as if they were one rounded body.
function domeSurf(c, x, y, col, cx, cy, rx, ry, flat = 1) {
  const dx = (x - cx) / (rx + 0.5), dy = (y - cy) / (ry + 0.5)
  const q = Math.min(0.96, dx * dx + dy * dy)
  c.surf(x, y, col, dx * flat, dy * flat, Math.sqrt(1 - q))
}

// ---------------------------------------------------------------- beach umbrella
// Shallow dome canopy, 6 gores alternating stripe/white, scalloped hem, wooden pole.
function umbrella(name, stripe) {
  const cx = 11, cy = 8, R = 11, ry = 6
  sprite(name, { form: { contrast: 0.8 }, outline: "auto", w: 23, h: 24 },
    tube(11, 9, 11, 23, 0.5, "w"),
    px(11, 14, "w-2"),                                                // pole joint
    (c) => {
      const e = c.color("e"), u = c.color(stripe)
      const gore = (x, y) => {
        const yy = Math.min(y, cy)
        const hw = (R + 0.5) * Math.sqrt(Math.max(0.01, 1 - ((yy - cy) / (ry + 0.5)) ** 2))
        const phi = Math.asin(Math.max(-1, Math.min(1, (x - cx) / hw)))
        return Math.floor((phi / Math.PI + 0.5) * 6 - 1e-6) % 2 === 0 ? u : e
      }
      for (let y = cy - ry; y <= cy; y++)
        for (let x = cx - R; x <= cx + R; x++) {
          const dx = (x - cx) / (R + 0.5), dy = (y - cy) / (ry + 0.5), q = dx * dx + dy * dy
          if (q > 1) continue
          c.surf(x, y, gore(x, y), dx, dy * 1.3 - 0.15, Math.sqrt(1 - q))
        }
      // scalloped hem: one half-disc per gore, hanging under the rim
      for (let k = 0; k < 6; k++) {
        const sx = cx - R + 1.8 + k * 3.7
        for (let y = cy + 1; y <= cy + 2; y++)
          for (let x = Math.floor(sx - 2); x <= Math.ceil(sx + 2); x++) {
            const dx = (x - sx) / 2.1, dy = (y - cy) / 2.3
            if (dx * dx + dy * dy > 1) continue
            c.surf(x, y, gore(x, cy), (x - cx) / R, 0.6, 0.6)
          }
      }
    },
    ball(cx, cy - ry - 1, 1, "w"))                                    // finial
}
umbrella("out_umbrella", "u")
umbrella("out_umbrella_teal", "t")

// ---------------------------------------------------------------- sun lounger
sprite("out_lounger", { ...S, w: 22, h: 9 },
  // legs (A-frame at the foot, straight at the head)
  vline(6, 6, 3, "w-1"), vline(18, 6, 3, "w-1"), vline(19, 6, 3, "w-2"),
  // slatted wooden seat frame + slanted back rest
  block(5, 5, 17, 2, "w", { bevel: 1 }),
  tube(1, 1, 5, 6, 0.7, "w"),
  // white cushion on seat and back
  block(6, 3, 15, 2, "e", { bevel: 1 }),
  tube(2, 0, 6, 4, 0.7, "e"),
  (c) => { for (let x = 9; x < 21; x += 4) c.px(x, 4, "e-1") },      // quilting
  // folded teal towel hanging over the foot end
  block(13, 2, 8, 2, "t", { bevel: 1 }), block(20, 2, 2, 6, "t", { bevel: 1 }),
  hline(13, 3, 7, "e"), vline(21, 4, 3, "e"))

// ---------------------------------------------------------------- tiki bar
// One tier of straw: a short sloped band (top faces the sky) ending in a fringe of strands with a
// ragged hem. Tiers are drawn bottom-up like shingles, so each hem hangs over the tier below and
// casts a 1px shadow onto it.
function thatch(c, x0, x1, y0, h, key, seed, below) {
  const rnd = c.rng(seed)
  const base = c.color(key), dark = c.color(key + "-1"), lite = c.color(key + "+1")
  const mid = (x0 + x1) / 2, half = (x1 - x0) / 2
  for (let x = x0; x <= x1; x++) {
    const edge = Math.abs(x - mid) / half                              // 0 center .. 1 eaves
    const top = y0 + Math.round(Math.max(0, edge - 0.8) * 10)          // hipped corners
    const len = h - [0, 0, 1, 0, 1, 1, 0][(x + seed) % 7]               // bundles: ragged in 2-3px groups
    const streak = (x * 7 + seed * 3) % 9 === 0 ? 0 : (x * 5 + seed) % 11 === 0 ? 1 : 0.5   // regular strand rhythm
    for (let y = top; y < y0 + len; y++) {
      const t = (y - y0) / h
      let col = base
      if (t > 0.3 && streak < 0.2) col = dark                          // strand gaps
      else if (t > 0.3 && streak > 0.9) col = lite                     // sunlit strands
      c.surf(x, y, col, (x - mid) / half * 0.5, t < 0.3 ? -0.8 : -0.2 + t * 0.9, t < 0.3 ? 0.6 : 1)   // fringe curls under toward the hem
    }
    if (below) c.px(x, y0 + len, "w-1")                                // hem shadow on the tier below
  }
}
sprite("out_tiki_bar", { form: { dither: 0.1 }, outline: "auto", w: 56, h: 36 },
  // dim back wall under the roof, shelf with bottles
  rect(5, 10, 46, 12, "d-2"),
  block(8, 18, 40, 2, "d", { bevel: 1 }),
  (c) => {
    const cols = ["g", "j", "u", "C", "t", "y", "j", "g", "u", "b", "t"]
    for (let i = 0; i < cols.length; i++) {
      const x = 10 + i * 3.5, tall = [4, 5, 3, 4, 5, 3][i % 6], xx = Math.round(x)
      c.cyl(xx, 18 - tall, 2, tall, cols[i])
      c.px(xx, 17 - tall, cols[i] + "-2")                              // cap
      if (tall > 3) c.px(xx, 16, "e")                                  // label
    }
  },
  // bamboo posts with joints
  tube(3, 10, 3, 35, 1.2, "C"), tube(52, 10, 52, 35, 1.2, "C"),
  (c) => { for (const x of [3, 52]) for (let y = 16; y < 35; y += 6) c.hline(x - 1, y, 3, "C-2") },
  // counter: dark wooden top, bamboo front, sign in the middle
  block(6, 20, 44, 16, "C", { top: 2, topColor: "d+1", bevel: 1 }),
  (c) => { for (let x = 8; x < 50; x += 3) c.vline(x, 23, 13, "C-1") },
  hline(6, 22, 44, "d-1"), hline(6, 34, 44, "C-2"),
  block(29, 24, 13, 7, "d", { bevel: 1 }), text(30, 25, "BAR", "y+1"),
  px(29, 24, "z+2"), px(41, 24, "z+2"),                                 // nail heads
  // roof: three straw tiers (back to front), ridge pole on top
  (c) => {
    thatch(c, 0, 55, 9, 6, "y", 5)
    thatch(c, 3, 52, 5, 6, "y", 4, "y")
    thatch(c, 9, 46, 1, 6, "y", 3, "y")
  },
  tube(10, 1, 45, 1, 1, "d"), ball(9, 1, 1.5, "d"), ball(46, 1, 1.5, "d"),
  // stools: teal seat, wooden pole, foot ring
  (c) => {
    for (const x of [11, 22, 46]) {
      c.vline(x, 31, 4, "d-1"); c.hline(x - 2, 35, 5, "d-1"); c.hline(x - 1, 33, 3, "z+1")
      c.cyl(x - 3, 29, 7, 3, "t", { cap: 1, capColor: "t+1" })
    }
  })

// ---------------------------------------------------------------- motor boat
// Waterline = bottom row. Hull poly with a rising bow; dome relief, stripe painted along the sheer.
sprite("out_boat", { form: { dither: 0.1 }, outline: "auto", w: 64, h: 22 },
  // bimini canopy on two poles over the cockpit
  vline(12, 3, 9, "z+1"), vline(30, 3, 9, "z+1"),
  block(9, 0, 25, 3, "t", { bevel: 1 }),
  hline(9, 2, 25, "t-1"),                                              // valance seam
  // helm seat in the open cockpit
  block(20, 7, 5, 4, "t", { bevel: 1 }), block(18, 9, 9, 2, "t", { bevel: 1 }),
  // cabin + slanted windshield
  block(30, 5, 12, 7, "e", { bevel: 1 }),
  poly([39, 5, 43, 5, 49, 11, 42, 11], "j"),
  line(40, 6, 45, 11, "j+1"),
  rect(32, 7, 5, 2, "j-1"),
  // hull
  poly([4, 11, 50, 10, 64, 7, 61, 12, 54, 22, 6, 22, 4, 16], "e"),
  bump("dome", { on: "e", depth: 1.2, where: [0, 10, 64, 12] }),
  line(5, 11, 50, 10, "e+1"), line(50, 10, 62, 8, "e+1"),            // deck edge / rub rail
  poly([4, 15, 50, 14, 61, 11, 60, 13, 51, 16, 4, 17], "b"),            // blue sheer stripe
  rect(39, 12, 2, 1, "b-1"), rect(44, 12, 2, 1, "b-1"),                // portholes
  hline(7, 20, 46, "e-1"),                                             // boot line
  // bow rail
  line(46, 9, 62, 6, "z+1"), px(54, 7, "z+1"),
  // rope coil on the foredeck and a bow line down to the water
  ball(55, 7, 2, "C", { ry: 1 }), px(55, 7, "C-2"),
  line(63, 8, 63, 14, "C"), line(62, 15, 60, 21, "C"),
  // outboard motor: cowling, shaft, cavitation plate at the waterline
  block(0, 6, 5, 6, "z", { bevel: 1 }), hline(1, 8, 3, "z-1"), px(1, 7, "e"),
  rect(1, 12, 2, 9, "z-1"), hline(0, 21, 4, "z-1"))

// ---------------------------------------------------------------- shore rocks
// Lumps in two depths (back lumps a step darker), flat wet base, glossy highlights, algae line.
const ROCK = { form: { contrast: 0.9, spec: 1 }, outline: "auto" }
function rock(name, w, h, lumps, cracks, seed) {
  sprite(name, { ...ROCK, w, h },
    ...lumps.map(([x, y, r, ry, back]) => ball(x, y, r, back ? "z-1" : "z", { ry })),
    ...cracks.map(([x0, y0, x1, y1]) => line(x0, y0, x1, y1, "z-2")),
    (c) => {                                                           // wet dark band + algae at the base
      const rnd = c.rng(seed)
      for (let x = 0; x < w; x++) {
        if (!c.is(x, h - 1, "*")) continue
        c.px(x, h - 1, "z-2")
        if (rnd() < 0.45 && c.is(x, h - 2, "*")) c.px(x, h - 2, rnd() < 0.5 ? "v" : "v-1")
      }
    })
}
rock("out_rock_a", 22, 10, [[14, 5, 7, 5, 1], [6, 6, 6, 4], [16, 7, 5, 3], [19, 8, 3, 2]], [[11, 3, 12, 7], [17, 5, 18, 7]], 3)
rock("out_rock_b", 14, 8, [[8, 4, 5, 4, 1], [5, 5, 5, 3], [11, 6, 3, 2]], [[8, 3, 9, 6]], 4)
rock("out_rock_c", 30, 12, [[17, 6, 8, 6, 1], [9, 7, 8, 5], [23, 8, 6, 4], [27, 10, 3, 2], [3, 10, 3, 2]], [[13, 3, 14, 9], [20, 6, 21, 10], [6, 6, 8, 9]], 5)

// ---------------------------------------------------------------- coral & sea life
// Sea fan: a lattice of radial ribs and arcs, shaded as one curved fan.
// No outline: an outline would fill every net hole (it treats 1px gaps as edges), and a soft
// unoutlined edge suits things seen through water. Rim light + a dark bottom row keep it readable.
sprite("out_coral_fan", { form: { rim: 1.5, dither: 0, contrast: 0.8 }, w: 14, h: 12 },
  (c) => {
    const col = c.color("i")
    for (let y = 0; y < 11; y++)
      for (let x = 0; x < 14; x++) {
        const u = (x + 0.5 - 7) / 7, v = (y + 0.5 - 11) / 11
        if (u * u + v * v <= 1) domeSurf(c, x, y, col, 7, 6, 7, 6, 0.8)
      }
    // net holes in staggered rows, then the ribs over them so the ribs stay continuous
    for (let y = 2; y < 10; y += 2) for (let x = (y % 4 ? 2 : 4); x < 13; x += 3) if (c.is(x, y, "i")) c.px(x, y, "_")
    for (const [x, y] of [[0, 8], [1, 4], [4, 1], [7, 0], [10, 1], [12, 4], [13, 8]]) c.line(7, 10, x, y, "i-1")
    for (const [x, y] of [[2, 1], [11, 1], [0, 5], [13, 5], [5, 0], [9, 0]]) c.px(x, y, "_")
  },
  tube(7, 9, 7, 11, 0.8, "i-2"))
// Branching coral: a trunk splitting twice, magenta polyp tips painted on the ends.
sprite("out_coral_branch", { ...S, w: 12, h: 12 },
  tube(6, 11, 6, 7, 1.2, "o", { r1: 1 }),
  tube(6, 8, 3, 4, 1, "o", { r1: 0.7 }), tube(6, 8, 9, 5, 1, "o", { r1: 0.7 }),
  tube(3, 5, 1, 1, 0.7, "o", { r1: 0.6 }), tube(3, 5, 4, 1, 0.6, "o"),
  tube(9, 6, 11, 3, 0.6, "o"), tube(9, 6, 8, 2, 0.6, "o"), tube(6, 8, 6, 3, 0.7, "o"),
  px(1, 1, "f"), px(4, 1, "f"), px(11, 3, "f"), px(8, 2, "f"), px(6, 3, "f"),
  px(5, 9, "o-2"), px(7, 6, "o-2"))
sprite("out_coral_brain", { ...S, w: 12, h: 8 },
  ball(6, 7, 6, "g", { ry: 6.5 }),
  (c) => {                                                           // meandering grooves
    for (const [a, b, d, e] of [[2, 5, 3, 3], [3, 3, 6, 2], [6, 2, 7, 4], [7, 4, 9, 3], [9, 3, 10, 5],
      [4, 6, 5, 4], [5, 4, 7, 6], [8, 6, 9, 6], [1, 7, 2, 7]]) c.line(a, b, d, e, "g-2")
  },
  px(4, 2, "y"), px(5, 1, "y"), px(8, 2, "y"), px(2, 4, "y"), px(10, 4, "y"), px(6, 4, "y"))
sprite("out_seaweed", { ...S, w: 6, h: 14 },
  (c) => {                                                             // two wavy blades, front one taller
    for (let y = 13; y > 4; y--) c.tube(4 + Math.sin(y * 0.6 + 2) * 0.9, y, 4 + Math.sin((y - 1) * 0.6 + 2) * 0.9, y - 1, 0.5, "g-1")
    for (let y = 13; y > 0; y--) c.tube(2 + Math.sin(y * 0.55) * 1.1, y, 2 + Math.sin((y - 1) * 0.55) * 1.1, y - 1, 0.45 + (y / 14) * 0.4, "g")
  })

// Fish face left. Body pixels get dome relief; fins and eye are painted.
function fish(name, body, rows, extra = []) {
  const h = rows.length, w = rows[0].length
  sprite(name, { ...S, w, h },
    (c) => { rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === "B") c.px(x, y, body); else if (ch === "T") c.px(x, y, extra.tail ?? body + "-1") })) },
    bump("dome", { on: body, depth: 1.2 }),
    ...extra)
}
fish("out_fish_yellow", "y", [".BBB.T", "BBBBTT", ".BBB.T"], [px(1, 1, "l"), px(3, 0, "y+1")])
fish("out_fish_blue", "b", [".BBB.T", "BBBBTT", ".BBB.T"], [px(1, 1, "l"), px(4, 1, "y"), px(5, 0, "y"), px(5, 1, "y"), px(5, 2, "y")])
fish("out_fish_striped", "o", ["..BBB..", ".BBBBBT", "BBBBBTT", ".BBBB.T"], [vline(2, 1, 3, "e"), vline(4, 0, 4, "e"), px(1, 2, "l")])

// ---------------------------------------------------------------- small dock & pool props
sprite("out_lifering", { ...S, w: 9, h: 9 },
  (c) => {
    const cx = 4, cy = 4, Rr = 2.9, rt = 1.7, u = c.color("u"), e = c.color("e")
    for (let y = 0; y < 9; y++)
      for (let x = 0; x < 9; x++) {
        const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) || 0.001
        const off = (d - Rr) / rt
        if (Math.abs(off) > 1) continue
        const ang = Math.atan2(dy, dx), seg = Math.floor((ang + Math.PI) / (Math.PI / 4)) % 2
        c.surf(x, y, seg ? u : e, (dx / d) * off, (dy / d) * off, Math.sqrt(1 - off * off))
      }
  },
  px(4, 0, "C"), px(4, 8, "C"), px(0, 4, "C"), px(8, 4, "C"))          // rope grips
sprite("out_lantern", { ...S, w: 5, h: 8 },
  px(2, 0, "z+1"),                                                     // hanging ring
  block(0, 1, 5, 2, "z", { bevel: 1 }),
  rect(1, 3, 3, 3, "y"), vline(2, 3, 3, "y+1"), px(2, 4, "e"),      // lit glass + flame: flat (no normal)
  vline(0, 3, 3, "z-1"), vline(4, 3, 3, "z-1"),
  block(0, 6, 5, 2, "z", { bevel: 1 }),
  glow("y", { r: 2, strength: 0.35 }))
sprite("out_post", { ...S, w: 7, h: 18 },
  cyl(1, 0, 5, 18, "d", { cap: 1, capColor: "d+1" }),
  vline(3, 9, 6, "d-1"), px(2, 12, "d-1"), hline(1, 16, 5, "d-1"),   // grain, wet line
  // rope wrapped twice around the post
  cyl(0, 4, 7, 3, "C"), (c) => { for (let x = 0; x < 7; x++) c.px(x, 4 + (x % 3 === 0 ? 1 : 0), "C-1") },
  px(0, 7, "C"), px(0, 8, "C-1"))
sprite("out_rope_coil", { ...S, w: 7, h: 4 },
  ball(3, 2, 3, "C", { ry: 1.6 }),
  // coiled turns: a dark groove ring, the hole in the middle, the loose end
  hline(1, 1, 5, "C-1"), px(1, 2, "C-1"), px(5, 2, "C-1"), hline(2, 2, 3, "C"), px(3, 2, "C-2"),
  px(6, 3, "C"))
sprite("out_pool_ladder", { ...S, w: 6, h: 10 },
  // two rails that arch over the pool edge (top) and drop into the water, three treads
  tube(1, 9, 1, 2, 0.3, "z+1"), tube(4, 9, 4, 2, 0.3, "z+1"),
  tube(1, 2, 2, 0, 0.3, "z+1"), tube(4, 2, 5, 0, 0.3, "z+1"),
  hline(2, 4, 2, "z"), hline(2, 6, 2, "z"), hline(2, 8, 2, "z"))
sprite("out_towel_stack", { ...S, w: 8, h: 6 },
  block(0, 4, 8, 2, "o", { bevel: 1 }), block(1, 2, 7, 2, "t", { bevel: 1 }), block(0, 0, 8, 2, "e", { bevel: 1 }),
  vline(7, 0, 2, "e-1"), hline(1, 3, 6, "t+1"), px(2, 5, "o+1"), px(5, 5, "o+1"))
sprite("out_beach_ball", { ...S, w: 5, h: 5 },
  ball(2, 2, 2, "e"),
  (c) => {
    for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) {
      if (!c.is(x, y, "e")) continue
      c.px(x, y, x < 2 ? "u" : x > 2 ? "b" : "e")
    }
  },
  px(2, 0, "y"), px(2, 4, "y"))

// ---------------------------------------------------------------- plants
// Potted areca palm: stems fan out of a terracotta pot, leaflets hang off each stem.
sprite("out_palm_potted", { ...S, w: 14, h: 22 },
  cyl(3, 15, 8, 7, "x", { cap: 1, taper: 1, capColor: "l+1" }), hline(3, 16, 8, "x+1"), hline(4, 19, 6, "x-1"),
  (c) => {
    const rnd = c.rng(4)
    const stems = [[-6, -5, 1], [-3, -11, 0], [0, -13, 0], [3, -11, 0], [6, -6, 1], [-5, -9, 0], [5, -9, 0]]
    for (const [dx, dy, low] of stems) {
      const x0 = 7, y0 = 15, n = 14
      let px = x0, py = y0
      for (let s = 1; s <= n; s++) {
        const t = s / n
        const x = x0 + dx * t, y = y0 + dy * t + t * t * (low ? 4 : 3)
        c.tube(px, py, x, y, 0.3, low ? "g-1" : "g")
        if (s > 4 && s % 2 === 0) {                                      // leaflets hang down/out
          const side = dx >= 0 ? 1 : -1
          c.tube(x, y, x + side * 1.2, y + 2 + rnd() * 0.8, 0.3, low ? "g-1" : "g")
          c.tube(x, y, x - side * 0.8, y + 1.6, 0.3, "g-1")
        }
        px = x; py = y
      }
    }
  })
sprite("out_flower_bush", { ...S, w: 20, h: 12 },
  foliage(10, 7, 9, 5, "g", { flowers: "f", size: [2, 3], bloom: 0.6, seed: 4 }))
sprite("out_hibiscus", { ...S, w: 10, h: 10 },
  foliage(5, 5.5, 4, 3.5, "g", { size: [1.5, 2.5], count: 16, seed: 6 }),
  (c) => {                                                             // three blossoms: 5 petals + stamen
    for (const [x, y] of [[3, 3], [7, 4], [5, 7]]) {
      // painted blossom (keeps the bush's normals, so it shades with the clump under it)
      for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1], [1, 1], [-1, -1]]) c.px(x + dx, y + dy, "u")
      c.px(x, y, "y+1")
    }
  })

// ---------------------------------------------------------------- outdoor stairs
// Side view: pink stepped side wall with cream treads, white handrail on posts.
sprite("out_stairs", { ...S, w: 24, h: 20 },
  (c) => {
    for (let i = 0; i < 5; i++) {
      const x = i * 5, y = 17 - i * 3
      c.block(x, y, 24 - x, 20 - y, "p", { top: 1, topColor: "c+1", bevel: 0 })
    }
  },
  bump("bevel", { on: "p", w: 1 }),
  line(1, 19, 23, 6, "p+1"),                                            // coping along the stringer
  hline(0, 19, 24, "p-2"),                                              // plinth
  (c) => {                                                             // tread shadow under each nosing
    for (let i = 1; i < 5; i++) c.hline(i * 5, 17 - i * 3 + 1, 24 - i * 5, "p-1")
  },
  (c) => {
    for (let i = 0; i < 5; i += 2) { const x = i * 5 + 2; c.vline(x, 17 - i * 3 - 5, 5, "e") }
    c.line(2, 12, 22, 0, "e"); c.vline(22, 0, 3, "e")
  })

// ---------------------------------------------------------------- hotel sign
sprite("out_sign_hotel", { ...S, w: 40, h: 16 },
  tube(6, 12, 6, 15, 0.8, "d"), tube(33, 12, 33, 15, 0.8, "d"),          // legs
  (c) => {
    const col = c.color("r")
    for (let y = 0; y < 13; y++)
      for (let x = 0; x < 40; x++) {
        const top = 4 - 4 * Math.sqrt(Math.max(0, 1 - ((x - 19.5) / 20) ** 2))
        if (y >= top) c.plot(x, y, col)
      }
  },
  bump("bevel", { on: "r", w: 2 }),
  (c) => {                                                           // inset cream border
    for (let x = 2; x < 38; x++) {
      const top = 4 - 4 * Math.sqrt(Math.max(0, 1 - ((x - 19.5) / 20) ** 2))
      c.px(x, Math.ceil(top) + 1, "r-1")
    }
    c.hline(2, 11, 36, "r-1")
  },
  text(15, 5, "HOTEL", "c+1"),
  // palm icon: curved trunk, four drooping fronds, a coconut
  px(8, 10, "c+1"), px(8, 9, "c+1"), px(9, 8, "c+1"), px(9, 7, "c+1"),
  hline(6, 5, 3, "c+1"), px(5, 6, "c+1"), hline(10, 5, 3, "c+1"), px(13, 6, "c+1"),
  px(7, 4, "c+1"), px(11, 4, "c+1"), px(9, 6, "c+1"))

// ---------------------------------------------------------------- overview sheet
// All out_* sprites on sand in a flowing grid, then a 60px lagoon strip with the boat, rocks,
// coral, seaweed and fish placed in the water.
const SHEET = [
  "out_umbrella", "out_umbrella_teal", "out_lounger", "out_tiki_bar", "out_stairs", "out_sign_hotel",
  "out_palm_potted", "out_flower_bush", "out_hibiscus", "out_lifering", "out_lantern", "out_post",
  "out_rope_coil", "out_pool_ladder", "out_towel_stack", "out_beach_ball",
  "out_boat", "out_rock_a", "out_rock_b", "out_rock_c", "out_coral_fan", "out_coral_branch",
  "out_coral_brain", "out_seaweed", "out_fish_yellow", "out_fish_blue", "out_fish_striped",
]
const SEA = ["q-2", "q-1", "q", "q+1", "q+2", "q+3", "q-3"]         // every tone of the water ramp
const WY = 112                                                       // water surface row
scene("out_sheet", { w: 240, h: 172, bg: "s+1" },
  (c) => {
    let x = 4, y = 4, hmax = 0
    for (const n of SHEET) {
      const img = c.asset(n)
      if (x + img.w > c.w - 4) { x = 4; y += hmax + 4; hmax = 0 }
      c.put(img, x, y); x += img.w + 4; hmax = Math.max(hmax, img.h)
    }
  },
  // lagoon strip: the boat's hull bottom row (last row before its outline) sits on row WY - 1,
  // so the water's top row is its waterline; water() then adds the reflection + foam.
  stamp("out_boat", 8, WY - 23),
  water(0, WY, 240, 60, "q", { depth: [0, -2], reflect: "*", reflectLen: 10, ripples: 0.18, seed: 3 }),
  // shore rocks half sunk in the water
  stamp("out_rock_c", 92, WY - 6), stamp("out_rock_a", 124, WY - 4), stamp("out_rock_b", 148, WY - 2),
  foam(["z-3", "z-2", "z-1", "z", "z+1", "z+2", "v", "v-1"], { on: SEA, c: "e" }),
  // sea floor: coral garden, seaweed and fish below the surface
  stamp("out_coral_brain", 170, 160), stamp("out_coral_fan", 186, 156), stamp("out_coral_branch", 204, 158),
  stamp("out_seaweed", 222, 154), stamp("out_seaweed", 162, 156, { flip: "x" }), stamp("out_coral_fan", 120, 158, { flip: "x" }),
  stamp("out_fish_yellow", 186, 136), stamp("out_fish_blue", 206, 142, { flip: "x" }), stamp("out_fish_striped", 140, 140))
