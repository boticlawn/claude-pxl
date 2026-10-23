// Form shading: materials + form primitives + form() + selective outline.
// Every object here is a primitive in a base color; the light and the outline are computed.

pal({ k: "#1b1630" })
material("o", "#d0703c")              // terracotta
material("b", "#4f86b8")              // painted blue
material("s", "#d9c39a")              // sand / plaster
material("w", "#9a6a44")              // wood
material("g", "#5aa05a")              // leaf green
material("f", "#5a5478", { steps: 5 }) // floor

sprite("pot", { w: 18, h: 22, form: true, outline: "auto" },
  cyl(1, 8, 16, 14, "o", { cap: 2, taper: 2, capColor: "o+1" }),
  hline(1, 11, 16, "o-1"),                         // rim band painted onto the surface: it gets shaded too
  ball(9, 6, 6, "g", { ry: 5 }), ball(4, 7, 4, "g"), ball(14, 7, 4, "g"))

sprite("barrel", { w: 18, h: 24, form: true, outline: "auto" },
  cyl(1, 0, 16, 24, "w", { cap: 2, bulge: 1.5, capColor: "w+1" }),
  hline(0, 6, 18, "b-1"), hline(0, 18, 18, "b-1"))

sprite("crate", { w: 26, h: 26, form: true, outline: "auto" },
  block(0, 0, 20, 26, "s", { top: 6, side: 6, bevel: 1 }),
  line(1, 8, 18, 24, "s-1"), line(1, 24, 18, 8, "s-1"))

sprite("orb", { w: 24, h: 24, form: { spec: 1 }, outline: "auto" }, ball(12, 12, 11, "b"))

sprite("post", { w: 10, h: 30, form: true, outline: "auto" },
  tube(5, 4, 5, 26, 3, "w"), ball(5, 3, 4, "w"))

scene("form_demo", { w: 200, h: 80, bg: "f-2" },
  rect(0, 58, 200, 22, "f"),
  shadow(24, 59, 13, 3, { steps: 2 }), shadow(56, 59, 12, 3, { steps: 2 }), shadow(92, 59, 16, 3, { steps: 2 }),
  shadow(132, 59, 12, 3, { steps: 2 }), shadow(170, 59, 7, 2, { steps: 2 }),
  stamp("pot", 14, 37), stamp("barrel", 46, 35), stamp("crate", 78, 33), stamp("orb", 120, 35), stamp("post", 164, 29),
  text(100, 6, "FORM + MATERIAL + SELOUT", "s+2", { align: "c" }))
