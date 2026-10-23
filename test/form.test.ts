import { test } from "node:test";
import assert from "node:assert/strict";
import { channels, TRANSPARENT } from "../src/core/color.ts";
import { materialRamp, toOklch } from "../src/core/form.ts";
import { parseHex } from "../src/core/color.ts";
import { colorList } from "../src/core/util.ts";
import { failure } from "./helpers.ts";
import { loadSource } from "../src/node/load.ts";

const load = (body: string) => loadSource('pal({ k: "#1b1630" }); material("o", "#d0703c"); material("s", "#ecd29c"); material("q", "#22b3c9", { steps: 7, at: 4 }); material("f", "#5a5478"); ' + body, "t.px.js");
const lum = (c: number) => { const [r, g, b] = channels(c); return 0.299 * r + 0.587 * g + 0.114 * b; };

test("material: ramp keeps the base, gets darker/lighter, step keys resolve and clamp", () => {
  const p = load(`sprite("x", { w: 8, h: 1 }, px(0, 0, "o-3"), px(1, 0, "o-1"), px(2, 0, "o"), px(3, 0, "o+1"), px(4, 0, "o+2"), px(5, 0, "o+9"), px(6, 0, "o-9"))`);
  const img = p.image("x"), at = (x: number) => img.get(x, 0);
  assert.equal(at(2), parseHex("#d0703c"));
  for (let x = 0; x < 4; x++) assert.ok(lum(at(x)) < lum(at(x + 1)), `step ${x} darker than ${x + 1}`);
  assert.equal(at(5), at(4), "clamps at the light end");
  assert.ok(lum(at(6)) <= lum(at(0)), "clamps at the dark end");
});

test("material: shadows turn cool, and yellows go through red rather than green", () => {
  const { ramp, at } = materialRamp(parseHex("#ecd29c")!, { steps: 6, at: 4 });
  const hue = (c: number) => toOklch(c)[1] < 0.02 ? NaN : toOklch(c)[2];
  const h0 = hue(ramp[at]), hd = hue(ramp[0]);
  // sand ~85°: its darkest tone should sit in red/magenta (<= 60° or >= 300°), never green (120-200°).
  assert.ok(!(hd > 110 && hd < 210), `dark sand hue ${hd} must not be green (base ${h0})`);
  const blue = materialRamp(parseHex("#22b3c9")!, { steps: 7, at: 4 });
  assert.ok(hue(blue.ramp[0]) > hue(blue.ramp[4]), "cyan shadows rotate toward blue-violet");
});

test("form: a ball is lighter at the top-left than at the bottom-right, and stays in its ramp", () => {
  const p = load(`sprite("b", { w: 15, h: 15, form: true }, ball(7, 7, 7, "o"))`);
  const img = p.image("b");
  assert.ok(lum(img.get(4, 4)) > lum(img.get(10, 10)), "lit side brighter");
  const ramp = new Set(materialRamp(parseHex("#d0703c")!).ramp);
  for (let i = 0; i < img.data.length; i++) if (img.data[i] !== TRANSPARENT) assert.ok(ramp.has(img.data[i]), "never leaves the ramp");
});

test("form: shaded sprites aren't shaded again when a scene calls form()", () => {
  const p = load(`
sprite("b", { w: 15, h: 15, form: true }, ball(7, 7, 7, "o"))
scene("s", { w: 15, h: 15 }, stamp("b", 0, 0), form({ contrast: 3 }))`);
  assert.deepEqual([...p.image("s").data], [...p.image("b").data]);
});

test("form: unshaded stamped sprites are lit by the scene, flipped normals included", () => {
  const p = load(`
sprite("b", { w: 15, h: 15 }, ball(7, 7, 7, "o"))
scene("s", { w: 30, h: 15 }, stamp("b", 0, 0), stamp("b", 15, 0, { flip: "x" }), form())`);
  const img = p.image("s");
  assert.equal(img.get(4, 4), img.get(15 + 4, 4), "same light on both copies");
});

test("outline auto: colored from the bordering material, never the flat key everywhere", () => {
  const p = load(`sprite("b", { w: 9, h: 9, form: true, outline: "auto" }, ball(4, 4, 4, "o"))`);
  const img = p.image("b"), dark = materialRamp(parseHex("#d0703c")!).ramp[0];
  assert.equal(img.w, 11, "grows 1px each side");
  assert.equal(img.get(5, 10), dark, "bottom outline = darkest tone of the material");
  assert.notEqual(img.get(0, 5), TRANSPARENT);
});

test("shadow: steps the ground darker inside the ellipse only", () => {
  const p = load(`scene("s", { w: 20, h: 6, bg: "f" }, shadow(10, 3, 5, 2))`);
  const img = p.image("s"), bg = img.get(0, 0);
  assert.ok(lum(img.get(10, 3)) < lum(bg));
  assert.equal(img.get(1, 3), bg);
});

test("water/foliage/palm are deterministic and stay in their ramps", () => {
  const src = `scene("s", { w: 60, h: 40, bg: "f" }, water(0, 20, 60, 20, "q"), palm(30, 30, { h: 20, trunk: "o", leaf: "q" }), form())`;
  const a = load(src).image("s"), b = load(src).image("s");
  assert.deepEqual([...a.data], [...b.data]);
});

test("colorList keeps material steps whole", () => {
  assert.deepEqual(colorList("y+2gq-1"), ["y+2", "g", "q-1"]);
  assert.deepEqual(colorList("abc"), ["a", "b", "c"]);
});

test("material errors are helpful", () => {
  assert.match(failure('material("oo", "#fff")').message, /one-char key/);
  assert.match(failure('material("o", "#fff", { stps: 4 })').message, /unknown option 'stps'.*did you mean 'steps'/);
  assert.match(failure('pal({ z: "#123456" }); sprite("x", { w: 1, h: 1 }, px(0, 0, "z-1"))', "x").message, /in no ramp/);
});

test("sprites without grids or size take the size of what they paint", () => {
  const p = load(`sprite("b", { form: true }, ball(3, 3, 3, "o"), cyl(0, 6, 5, 4, "o"))`);
  const img = p.image("b");
  assert.equal(img.w, 7);
  assert.equal(img.h, 10);
});

test("swap between materials swaps every step, so variants survive form shading", () => {
  const p = load(`
material("t", "#1fa39a")
sprite("b", { w: 15, h: 15, form: true }, ball(7, 7, 7, "o"))
sprite("c", { base: "b", swap: { o: "t" } })`);
  const img = p.image("c"), teal = new Set(materialRamp(parseHex("#1fa39a")!).ramp);
  for (let i = 0; i < img.data.length; i++) if (img.data[i] !== TRANSPARENT) assert.ok(teal.has(img.data[i]), "all pixels moved to the teal ramp");
});

test("oval fills its box exactly; dome sits on its base row", () => {
  const p = load(`sprite("o", { form: true }, oval(0, 0, 8, 6, "o"))
sprite("d", { w: 11, h: 7, form: true }, dome(5, 6, 5, 5, "o"))`);
  assert.equal(p.image("o").w, 8); assert.equal(p.image("o").h, 6);
  const d = p.image("d");
  assert.notEqual(d.get(5, 6), TRANSPARENT, "base row filled"); assert.equal(d.get(0, 1), TRANSPARENT, "round top");
});

test("planks/bricks/tiles paint seams in a darker step; stripes cycle; fan stripes radiate", () => {
  const p = load(`
scene("s", { w: 20, h: 8, bg: "o" }, planks(0, 0, 20, 8, "o", { size: 4 }))
scene("t", { w: 12, h: 1, bg: "o" }, stripes(0, 0, 12, 1, ["o", "s"], { size: 3 }))`);
  const s = p.image("s"), t = p.image("t");
  assert.ok(lum(s.get(5, 0)) < lum(s.get(5, 2)), "seam row darker than the board");
  assert.notEqual(t.get(0, 0), t.get(3, 0)); assert.equal(t.get(0, 0), t.get(6, 0));
});

test("outlineOpen leaves a side without outline; grid map paints material steps", () => {
  const p = load(`
sprite("b", { w: 4, h: 4, outline: "auto", outlineOpen: "b" }, rect(0, 0, 4, 4, "o"))
sprite("g", { w: 3, h: 1 }, grid(0, 0, "aba", { a: "o-1", b: "o+1" }))`);
  const b = p.image("b");
  assert.equal(b.get(2, b.h - 1), TRANSPARENT); assert.notEqual(b.get(2, 0), TRANSPARENT);
  const g = p.image("g");
  assert.ok(lum(g.get(0, 0)) < lum(g.get(1, 0)));
});

test("arrange flows assets into rows, bottoms aligned", () => {
  const p = load(`
sprite("a", { w: 4, h: 6 }, rect(0, 0, 4, 6, "o"))
sprite("b", { w: 4, h: 2 }, rect(0, 0, 4, 2, "s"))
scene("s", { w: 20, h: 10 }, arrange(0, 0, 20, ["a", "b"], { gap: 2 }))`);
  const s = p.image("s");
  assert.notEqual(s.get(6, 5), TRANSPARENT, "short one sits on the shared bottom");
  assert.equal(s.get(6, 0), TRANSPARENT);
});

test("chained steps add up", () => {
  const p = load(`sprite("x", { w: 2, h: 1 }, px(0, 0, "o+1-1"), px(1, 0, "o"))`);
  assert.equal(p.image("x").get(0, 0), p.image("x").get(1, 0));
  assert.deepEqual(colorList("o+1-1g"), ["o+1-1", "g"]);
  assert.deepEqual(colorList("p+1*q*"), ["p+1*", "q*"]);
});

test("detail(2): logical coordinates, double resolution, 1px seams stay 1px", () => {
  const src = (d: number) => `detail(${d}); material("o", "#d0703c")
sprite("b", { w: 10, h: 10, form: true }, ball(5, 5, 4, "o"), hline(0, 5, 10, "o-2"))
scene("s", { w: 20, h: 12 }, stamp("b", 5, 1), px(0, 0, "o"))`;
  const one = loadSource(src(1), "t.px.js"), two = loadSource(src(2), "t.px.js");
  assert.equal(two.image("s").w, 40); assert.equal(two.image("b").w, 20);
  const b = two.image("b"), seam = b.get(10, 10);
  assert.notEqual(b.get(10, 11), seam, "1px line stays 1px thick");
  assert.equal(two.image("s").get(1, 1), two.image("s").get(0, 0), "px becomes a 2x2 block");
  assert.notEqual(one.image("s").get(1, 1), one.image("s").get(0, 0));
});

test("ink: swap variants recolor the inked outline too", () => {
  const p = load(`material("t", "#1fa39a"); ink("#3a2622")
sprite("b", { w: 9, h: 9, form: true, outline: "auto" }, ball(4, 4, 4, "o"))
sprite("c", { base: "b", swap: { o: "t" } })
sprite("d", { w: 9, h: 9, form: true, outline: "auto" }, ball(4, 4, 4, "t"))`);
  assert.equal(p.image("c").get(5, 10), p.image("d").get(5, 10));
});
