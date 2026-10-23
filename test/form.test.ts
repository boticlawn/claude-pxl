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
