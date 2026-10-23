// Surfaces & small forms: dome, oval, textures, light pools, small palms and bushes, arrange.
pal({ k: "#1b1630" })
material("c", "#e9d3a8", { steps: 6, at: 3 })   // plaster
material("w", "#b0784a", { steps: 7, at: 4 })   // wood
material("r", "#b5534a", { steps: 6 })          // brick
material("t", "#7fb8c8", { steps: 6 })          // tile
material("u", "#e2554e", { steps: 5, at: 3 })   // red
material("e", "#f1ebe0", { steps: 5, at: 3 })   // white
material("g", "#4f9a34", { steps: 7, at: 4 })   // leaves
material("x", "#c9734a", { steps: 6 })          // terracotta
material("y", "#ffd27a", { steps: 5, at: 3 })   // lamp

sprite("umbrella", { form: { contrast: 0.8 }, outline: "auto" },
  tube(11, 6, 11, 24, 0.6, "w-1"),
  dome(11, 8, 11, 7, "u", { scallop: 4 }),
  stripes(0, 0, 23, 10, ["u", "e"], { center: [11, 1], size: 22, on: "u*" }))

sprite("lamp", { form: true, outline: "auto" },
  vline(3, 0, 4, "w-2"), dome(3, 8, 3, 4, "y"), flat([0, 5, 7, 4]))     // flat: the glowing shade isn't shaded

sprite("egg", { form: true, outline: "auto" }, oval(0, 0, 8, 10, "e"))
sprite("pot_palm", { form: true, outline: "auto" },
  cyl(3, 12, 8, 7, "x", { cap: 1, taper: 1 }), palm(7, 12, { h: 8, lean: 1, trunk: "w", leaf: "g", fronds: 7, len: 8 }))
sprite("bush", { form: true, outline: "auto" }, foliage(8, 6, 7, 5, "g", { size: [1, 2], seed: 3 }))

scene("surfaces_demo", { w: 200, h: 90, bg: "c" },
  rect(0, 0, 100, 60, "r"), bricks(0, 0, 100, 60, "r", { size: 3, len: 7 }),
  rect(100, 0, 100, 60, "c"), stripes(100, 0, 100, 60, ["c", "c-1"], { size: 6 }),
  pool(150, 8, 26, 20, { steps: 1, soft: 0.6 }),
  rect(0, 60, 100, 30, "w"), planks(0, 60, 100, 30, "w", { size: 4, len: 16 }),
  rect(100, 60, 100, 30, "t"), tiles(100, 60, 100, 30, "t", { size: 6 }),
  stamp("lamp", 150, 0, { anchor: "t" }),
  arrange(8, 30, 190, ["umbrella", "egg", "pot_palm", "bush"], { gap: 10 }),
  glow("y", { r: 4, strength: 0.3 }))
