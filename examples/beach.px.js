// Environment test: sky, clouds, hazy mountain, sea with reflections and foam, dock, palm, bushes.
pal({ k: "#1b1630" })
material("a", "#5fb2ec", { steps: 6 })                // sky
material("c", "#eef0f2", { steps: 5, at: 3 })         // cloud white
material("m", "#4f8a6a", { steps: 6 })                // mountain green
material("q", "#22b3c9", { steps: 7, at: 4 })         // sea turquoise
material("d", "#2c78b8", { steps: 6 })                // deep sea
material("s", "#ecd29c", { steps: 6, at: 4 })         // sand
material("w", "#a86d3c", { steps: 6 })                // wood
material("t", "#9c7450", { steps: 6 })                // palm trunk
material("g", "#4ea64a", { steps: 7, at: 4 })         // leaves
material("p", "#e0459a", { steps: 5, at: 3 })         // bougainvillea
material("r", "#5b5e6e", { steps: 6 })                // rock

scene("beach", { w: 240, h: 135, bg: "a" },
  layer("sky", grad(0, 0, 240, 70, ["a+1", "a", "a-1"].reverse(), "v")),
  layer("clouds", cloud(140, 14, 46, 14, "c"), cloud(198, 30, 30, 9, "c", { seed: 4 }), cloud(8, 20, 34, 10, "c", { seed: 2 }), form({ contrast: 1.1, rim: 0 })),
  layer("far", { haze: 0.45, hazeColor: "a+1" },
    mountain(120, 70, 130, 38, "m", { peak: 0.55, seed: 3 }), mountain(70, 70, 80, 18, "m", { peak: 0.4, seed: 8 }),
    form({ light: "tl", contrast: 0.8 })),
  // sea: horizon to front, deeper and darker toward the bottom
  water(0, 70, 240, 65, "q", { depth: [-1, 0], ripples: 0.2 }),
  hline(0, 70, 240, "q+2"),
  // beach wedge on the right
  poly([150, 135, 175, 92, 240, 84, 240, 135], "s"), noise(150, 84, 90, 51, ["s-1", "s+1"], 0.05, 4, "s"),
  // dock with posts standing in the water (reflected)
  (c) => { for (let x = 6; x < 120; x += 22) c.cyl(x, 96, 5, 16, "w", { cap: 1 }) },
  block(0, 92, 120, 6, "w", { top: 3, bevel: 0 }),
  (c) => { for (let x = 4; x < 120; x += 8) c.vline(x, 95, 3, "w-1") },     // plank seams
  reflect(0, 112, 125, 14),
  foam("w", { on: "q" }),
  // rocks with foam
  ball(134, 124, 9, "r", { ry: 5 }), ball(124, 128, 6, "r", { ry: 4 }),
  form(),
  foam("r", { on: "q" }),
  // palm + flowering bush on the beach
  palm(205, 112, { h: 58, lean: -14, trunk: "t", leaf: "g", fronds: 11, nuts: "t-2", seed: 3 }),
  foliage(176, 104, 16, 9, "g", { flowers: "p", seed: 5 }),
  shadow(206, 113, 10, 2, { steps: 1 }),
  form())
