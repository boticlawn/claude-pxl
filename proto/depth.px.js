// Prototype: same three objects, "how agents use pxl today" (left) vs form-shaded (right).
// Form shading = per-pixel normal from the shape -> light -> quantized onto a hue-shifted ramp,
// Bayer dither on band seams, bounce/rim light, ambient occlusion, contact shadow, sel-out.

pal({ k: "#1b1630", o: "#c8743a", O: "#8a4a2a", b: "#5a7fa8", B: "#3a5478", s: "#d8c8a8", g: "#3a3550", G: "#2a2640" })

// ---- hue-shifted ramp: shadows go cooler/more saturated, lights warmer/desaturated ----
const hex = (r, g, b) => "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")
function hsl2rgb(h, s, l) {
  h = ((h % 360) + 360) % 360
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return hex((r + m) * 255, (g + m) * 255, (b + m) * 255)
}
function ramp(hue, sat, n = 6) {
  const out = []
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)                       // 0 dark .. 1 light
    // dark -> rotate toward blue-purple (250°), light -> toward warm yellow (55°), shortest way
    const toward = (h0, tgt, amt) => { const d = ((tgt - h0 + 540) % 360) - 180; return h0 + d * amt }
    const h = t < 0.5 ? toward(hue, 255, (0.5 - t) * 0.7) : toward(hue, 55, (t - 0.5) * 0.6)
    const s = sat * (t < 0.5 ? 0.85 + t * 0.5 : 1.1 - (t - 0.5) * 0.9)
    const l = 0.14 + t * 0.68
    out.push(hsl2rgb(h, Math.min(1, s), l))
  }
  return out
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
const L = norm([-0.55, -0.65, 0.55])          // light from upper left, a bit toward viewer
function norm(v) { const d = Math.hypot(...v); return v.map((x) => x / d) }

// Shade one pixel: n = surface normal, ao 0..1, returns ramp color
function shadePx(x, y, n, R, ao = 1, bounce = [0.3, 0.9, 0.2]) {
  let d = Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2])
  const b = Math.max(0, n[0] * bounce[0] + n[1] * bounce[1] - 0.2) * 0.18   // floor bounce
  let v = (0.18 + 0.82 * d + b) * ao
  v = Math.max(0, Math.min(0.999, v)) * (R.length - 1)
  const lo = Math.floor(v), f = v - lo
  const pick = f * 16 > BAYER[(y & 3) * 4 + (x & 3)] + 4 && f > 0.35 && f < 0.65 ? lo + 1 : f >= 0.65 ? lo + 1 : lo
  return R[Math.min(R.length - 1, pick)]
}

const ORANGE = ramp(22, 0.7, 5), BLUE = ramp(208, 0.5, 5), SAND = ramp(36, 0.4, 5)

// ---------------- LEFT: typical flat agent output ----------------
function flatSet(c, ox) {
  c.ellipse(ox + 20, 46, 13, 13, "o"); c.ellipse(ox + 16, 41, 4, 4, "s")          // ball + one highlight
  c.rect(ox + 40, 30, 18, 26, "b"); c.rect(ox + 40, 30, 4, 26, "B")                  // barrel: rect + darker strip
  c.hline(ox + 40, 36, 18, "B"); c.hline(ox + 40, 49, 18, "B")
  c.poly([ox + 66, 38, ox + 80, 31, ox + 94, 38, ox + 80, 45], "s")                  // cube: 3 flat faces
  c.poly([ox + 66, 38, ox + 80, 45, ox + 80, 59, ox + 66, 52], "o")
  c.poly([ox + 80, 45, ox + 94, 38, ox + 94, 52, ox + 80, 59], "O")
}

// ---------------- RIGHT: form-shaded ----------------
function formSet(c, ox) {
  const floorY = 59
  // contact shadows first (on the floor), soft via dither
  const shadow = (cx, cy, rx, ry) => {
    for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++) {
      const e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
      if (e > 1) continue
      if (e < 0.45 || BAYER[(y & 3) * 4 + (x & 3)] > 7) c.px(x, y, "G")
    }
  }
  shadow(ox + 22, floorY, 15, 3); shadow(ox + 50, floorY, 12, 3); shadow(ox + 82, floorY, 16, 3)

  // sphere
  const scx = ox + 20, scy = 46, r = 13
  for (let y = scy - r; y <= scy + r; y++) for (let x = scx - r; x <= scx + r; x++) {
    const dx = (x + 0.5 - scx) / r, dy = (y + 0.5 - scy) / r, q = dx * dx + dy * dy
    if (q > 1) continue
    const n = [dx, dy, Math.sqrt(1 - q)]
    const ao = dy > 0.55 ? 1 - (dy - 0.55) * 0.9 : 1            // occlusion near the floor
    c.px(x, y, shadePx(x, y, n, ORANGE, ao))
  }
  // cylinder (barrel) with bulge + hoops
  const bx = ox + 40, bw = 19, by = 30, bh = 27
  for (let y = by; y < by + bh; y++) {
    const ty = (y - by) / (bh - 1), bulge = Math.round(Math.sin(ty * Math.PI) * 1.5)
    for (let x = bx - bulge; x < bx + bw + bulge; x++) {
      const u = ((x + 0.5 - (bx - bulge)) / (bw + 2 * bulge)) * 2 - 1
      const ny = (ty - 0.5) * -0.35
      let n = norm([u, ny, Math.sqrt(Math.max(0, 1 - u * u))])
      const hoop = y === by + 6 || y === by + bh - 7
      const ao = (y > by + bh - 4 ? 0.8 : 1) * (hoop ? 0.62 : 1)
      c.px(x, y, shadePx(x, y, n, hoop ? ORANGE.slice(0, 3) : BLUE, ao))
    }
  }
  // top ellipse of barrel (lit, faces up)
  for (let x = bx; x < bx + bw; x++) { c.px(x, by, BLUE[4]); c.px(x, by + 1, BLUE[4]) }
  // cube: faces get their own normal + edge highlight on the lit edge + AO at the base
  const top = [ox + 68, 38, ox + 82, 31, ox + 96, 38, ox + 82, 45]
  c.clip(top, () => { for (let y = 29; y < 47; y++) for (let x = ox + 66; x < ox + 98; x++) c.px(x, y, shadePx(x, y, norm([0, -1, 0.25]), SAND)) })
  c.clip([ox + 68, 38, ox + 82, 45, ox + 82, 59, ox + 68, 52], () => {
    for (let y = 36; y < 60; y++) for (let x = ox + 66; x < ox + 84; x++) c.px(x, y, shadePx(x, y, norm([-0.7, 0, 0.7]), SAND, 1 - Math.max(0, y - 52) * 0.06))
  })
  c.clip([ox + 82, 45, ox + 96, 38, ox + 96, 52, ox + 82, 59], () => {
    for (let y = 36; y < 60; y++) for (let x = ox + 80; x < ox + 98; x++) c.px(x, y, shadePx(x, y, norm([0.7, 0, 0.7]), SAND, 1 - Math.max(0, y - 52) * 0.06))
  })
  c.line(ox + 68, 38, ox + 82, 45, SAND[4]); c.line(ox + 82, 45, ox + 82, 58, SAND[4])  // lit edges
}

// selective outline: darkest ramp step of the neighbour, not flat black
function selout(c, x0, x1) {
  const pts = []
  for (let y = 0; y < c.h; y++) for (let x = x0; x < x1; x++) {
    if (c.is(x, y, "*") && !c.is(x, y, "gG")) continue
    const ns = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => c.is(x + dx, y + dy, "*") && !c.is(x + dx, y + dy, "gG"))
    if (ns.length) pts.push([x, y])
  }
  for (const [x, y] of pts) c.px(x, y, y > 40 ? "#1b1630" : "#3a2a48")   // lighter outline on the lit top
}

scene("depth_compare", { w: 200, h: 72, bg: "g" },
  rect(0, 59, 200, 13, "G"),
  layer("flat", { }, (c) => flatSet(c, 4)),
  (c) => {   // left side: the usual flat black outline:"k"
    const pts = []
    for (let y = 0; y < c.h; y++) for (let x = 0; x < 100; x++)
      if (c.is(x, y, "gG") && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => c.is(x + dx, y + dy, "*") && !c.is(x + dx, y + dy, "gGk"))) pts.push([x, y])
    for (const [x, y] of pts) c.px(x, y, "k")
  },
  layer("form", { }, (c) => formSet(c, 102)),
  (c) => selout(c, 101, 200),
  text(28, 4, "PXL HEUTE", "s"), text(122, 4, "FORM-SHADING", "s"),
  vline(100, 0, 72, "k"))
