# pxl form & environment: depth from shape

Flat fills read as stickers. Depth comes from four things, and pxl now computes all of them:
**materials** (ramps with hue shift), **form** (surfaces with normals, lit from one direction),
**edges** (selective outline, contact shadows) and **space** (water, foliage, sky, haze).

The rule: draw objects as *surfaces in a material's base tone*, then let `form()` light them.
Never hand-place `shade()` regions to fake volume.

## Resolution: detail(k)

`detail(2)` at the top of a file renders everything at twice the resolution while you keep
writing logical coordinates. Positions and sizes scale, so curves, form shading, palms, foliage,
water and textures get twice the detail; **1px lengths stay 1px** (outlines, seams, rails, cords),
which is what makes the result look finer rather than just bigger. Single pixels (`px`, grid
chars, `c.plot`/`c.surf` from your own functions) become k x k blocks, so hand-drawn pixel art keeps
its shape. Use 2 for detailed scenes (e.g. a 480x270 layout rendered at 960x540); props built for
detail 1 work unchanged. CLI: `pxl build art.px.js --detail 2` overrides it.

## Materials

```js
material("o", "#d0703c")                       // terracotta: 6 tones, base at index 3
material("q", "#22b3c9", { steps: 7, at: 4 })  // more tones, base higher up (room for shadows)
material("c", "#eef0f2", { steps: 5, at: 3, shift: 0.5 })
```

One base color becomes a perceptual (OKLCH) ramp: shadows rotate toward blue-violet and keep
their saturation, lights rotate toward warm yellow and lose a little chroma. That's what makes
hand-made pixel-art ramps look alive instead of muddy.

- `o` is the base tone; steps are `"o-1"`, `"o-2"` (darker) and `"o+1"`, `"o+2"` (lighter),
  clamped at the ends. Step keys work in every op and option, not in grid strings.
- Options: `steps` (default 6), `at` (index of the base, default ~60% up), `shift` (hue-shift
  strength, 0 = plain), `dark` / `light` (OKLab lightness of the ends), `cool` / `warm` (target
  hues, default 265 / 90).
- Materials are ramps: `shade()`, `light()`, `shadow()`, `glow({ ramp })` all step along them.
- 7–12 materials with 5–7 tones each is normal for a rich scene. Give every material its own key.

## Form primitives

They paint the base color *and* a surface normal per pixel.

| Op | Shape |
|---|---|
| `ball(cx, cy, r, c, { ry, depth })` | sphere / oval (fruit, heads, bushes, lamps, rocks) |
| `cyl(x, y, w, h, c, { cap, capColor, bulge, taper, dir })` | standing cylinder in box x,y,w,h: `cap` = px of visible top ellipse; `bulge` barrels; `taper` pots/cups; `dir: "h"` logs, pipes |
| `block(x, y, w, h, c, { top, side, sideAt, bevel, topColor, sideColor })` | box: front face + `top` px top face + `side` px side face (oblique); `bevel` rounds the front edges |
| `tube(x0, y0, x1, y1, r, c, { r1 })` | capsule along a line, tapering to `r1` (limbs, branches, pipes, ropes) |
| `oval(x, y, w, h, c, { depth })` | ellipsoid filling a box exactly (heads, eggs, fruit: easier than `ball` for even sizes) |
| `dome(cx, by, rx, ry, c, { scallop })` | half ellipsoid on a flat base at row `by` (umbrellas, domes, mushroom caps, lamp shades); `scallop` = wavy rim |
| `bump("dome" \| "bevel" \| "luma")` | give normals to anything already drawn (from lighting.md) |
| `arch(x, y, w, h, c, ring?)` | flat shape: rectangle with a half-ellipse top (windows, doors, arcades) |

Sprites made only of ops may leave out `{ w, h }`: the size is taken from what they paint
(from 0,0 to the furthest painted pixel). Give it explicitly when you need empty margins.

Details painted *onto* a surface afterwards (`hline`, `px`, a label, plank seams in a step color)
keep the surface's normal, so they get shaded with it: a band around a barrel curves with it.
Stamped sprites bring their normals along, flipped correctly.

## form({ light, contrast, dither, bounce, rim, spec, on, where })

Turns every pixel that has a normal and a ramp color into the right step of its ramp:

- `light`: `"tl"` (default), `"t"`, `"tr"`, `"l"`, `"r"`, `"front"` or `[x, y, z]` (y down, z toward the viewer). **Use one light direction per scene.**
- `contrast` (1): how many steps the light spreads over. 0.6 for soft things (clouds, cloth), 1.2 for hard ones.
- `dither` (0.2): ordered dither on band seams; 0 = hard cel bands.
- `bounce` (0.6): reflected light into undersides. `rim` (1): extra step on the silhouette facing away from the light. `spec` (0): a highlight pop on the brightest spot.

Where to call it:
- **Sprites**: `sprite("pot", { form: true, outline: "auto" }, cyl(...), ball(...))` runs it on the finished sprite (after mirror/flip, so `mx` halves are lit correctly).
- **Scenes / layers**: put `form()` after what it should light. Pixels are shaded once: a shaded sprite stamped into a scene that calls `form()` again is left alone. Unshaded stamped sprites get lit by the scene's light, which is the most consistent option for a whole scene.
- Run `form()` on a layer *before* `haze`, since hazed colors leave the ramps.

## Surfaces: textures, light pools, flat areas

Construction belongs on surfaces, as seams in step colors (they keep the surface's normal):

| Op | Use |
|---|---|
| `planks(x, y, w, h, c, { size, len, dir, seam, on })` | floorboards, decks, siding: boards `size` px apart, staggered joints every `len` |
| `bricks(x, y, w, h, c, { size, len, seam, on })` | brick / stone courses with offset joints and a lit corner per brick |
| `tiles(x, y, w, h, c, { size, seam, on })` | square tiles with grout |
| `stripes(x, y, w, h, colors, { size, dir, center, on })` | stripes (`dir` v/h/d); `center: [x, y]` makes fan stripes (umbrellas), size = degrees |
| `pool(cx, cy, rx, ry, { steps, soft, on })` | warm light pool: steps the wall/floor lighter (lamps, windows); the opposite of `shadow` |
| `flat(where)` | drop normals in a region so form() leaves it as painted (glowing panes, screens, labels) |

`grid(x, y, str, map)` paints a grid string at (x, y); `map` lets chars stand for any color spec
(`{ e: "l-2", m: "u-1" }`), so faces and decals can use material steps. It keeps the normals under it.

`arrange(x, y, w, ["a", "b*"], { gap })` lays assets out in rows, bottoms aligned (contact sheets,
shelves of jars, rows of plants).

## Edges

- `outlineOpen: "b"` (sprite option): no outline on those sides (`t b l r`), for things standing in water or cut by a frame.
- `outline: "auto"` (sprite option): selective outline. 1px lines (cords, rods) stay 1px, narrow gaps inside an object stay open. Each outline pixel takes the darkest tone of the material it borders, one step lighter on the lit side. Outlines get colored, not black.
- `shadow(cx, cy, rx, ry, { steps, soft, on })`: contact shadow under an object, stepping the ground darker along its ramp with a dithered rim. Every object that stands on something needs one. Draw it on the ground before stamping the object.

## Environment brushes

| Op | What it makes |
|---|---|
| `water(x, y, w, h, c, { depth, shadow, ripples, len, glints, reflect, foam, seed })` | horizontal ripple strokes in the water material's tones, `depth: [top, bottom]` ramp offsets (e.g. `[-1, 1]`), `shadow` rows darkened under a dock, glints |
| `reflect(x, y, w, len, { keys, on, steps })` | reflections below surface row `y` for `len` rows: whatever stands above becomes a darker step of the water, wobbling and broken by waves. Draw posts/walls first, then reflect |
| `foam(around, { on, c, keep })` | white water where objects of keys `around` meet the water `on` (rocks, posts, swimmers) |
| `caustics(x, y, w, h, { scale, width, steps, on })` | light net on pool floors / shallow sand |
| `palm(x, y, { h, lean, trunk, leaf, fronds, len, nuts })` | palm from its base: ringed curved trunk, drooping fronds with leaflets (needs `form()` after) |
| `foliage(cx, cy, rx, ry, c, { size, count, flowers, bloom, tips })` | bush / tree crown / hedge from leaf clumps; `flowers: "p"` sprinkles blossoms (bougainvillea, hibiscus) |
| `cloud(x, y, w, h, c, { puffs })` | cumulus with flat base (form it with `contrast: 1`, `rim: 0`) |
| `mountain(x, baseY, w, h, c, { peak, rough, gullies })` | ridge with lit/shadowed slopes and creases |

All take `seed` to reroll.

## Key families

Anywhere a list of keys is taken (`on`, `around`, `keys`, `glow`, `emit`, `foam`, `c.is`), `"z*"` means
every tone of material z's ramp. After `form()` a rock is z-2..z+2, so write `foam("z*", { on: "q*" })`.

## Placing by the feet

`stamp("room_bed_double", 120, 80, { anchor: "b" })` puts the sprite's bottom-center at (120, 80):
props stand on a floor line without knowing their size (outline included). Anchors: `tl` (default),
`t`, `tr`, `l`, `c`, `r`, `bl`, `b`, `br`.

`swap` / `rswap` / `recolor` between two materials swap the whole ramp step by step:
`{ base: "guest", swap: { h: "H", t: "o" } }` makes a variant even after form shading.

## Space: haze and layers

`layer("far", { haze: 0.45, hazeColor: "a+1" }, ...)` pushes a layer toward the sky color
(aerial perspective). Typical stack, back to front:

1. sky (`grad`), clouds (`cloud` + `form`), 
2. far land (`mountain` + `form`, haze 0.4–0.6),
3. mid ground (sea, buildings, haze 0–0.15),
4. foreground (full contrast, darkest darks, strongest outlines).

Value hierarchy matters more than detail: far = light and low contrast, near = full range.

## Density checklist (what makes a scene read as "rich")

- Every room/area has a back wall, a floor line, furniture in front, and 3+ small props (lamp, plant, picture, rug).
- Plants everywhere: pots on floors, vines down walls (`foliage` with small `size`), flowers in clumps.
- Repeated elements vary: `reseed`, `rswap`, `rflip`.
- Light sources glow: `glow("l", { r: 5, strength: 0.4 })` on lamps after `form()`.
- Objects connect to the ground: contact `shadow()` under everything, `foam` where things touch water.
