// Form shading: depth from shape instead of hand-placed shade() regions.
//
// - material(): one base color -> a perceptual ramp (OKLCH) whose shadows rotate toward cool
//   blue-violet and whose lights rotate toward warm yellow, like hand-made pixel-art ramps.
// - Form primitives (ball, cyl, block, tube) paint a material's base tone and write surface
//   normals (Img.norm). form() then turns every unshaded pixel that has a normal into a ramp step,
//   from one light direction: lit faces step up, the terminator dithers, shadows step down, a little
//   bounce light comes back from below and a rim catches the far silhouette. The result never leaves
//   the palette. Shaded pixels are flagged (negative normal z) so a scene's form() doesn't shade
//   stamped, already-shaded sprites a second time.
// - selout(): the outline takes the darkest steps of whatever it borders (lighter on the lit side)
//   instead of one flat black.
import { type Color, TRANSPARENT, channels, darken, pack } from "./color.ts";
import { PxError } from "./errors.ts";
import { Img } from "./image.ts";
import type { Palette } from "./palette.ts";
import { bayer } from "./util.ts";

// ------------------------------------------------------------------ color math (OKLab / OKLCH)

const toLin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const toSrgb = (v: number) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);

export function toOklch(c: Color): [number, number, number] {
  const [r8, g8, b8] = channels(c);
  const r = toLin(r8 / 255), g = toLin(g8 / 255), b = toLin(b8 / 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360];
}

function oklchToRgb(L: number, C: number, h: number): [number, number, number] | undefined {
  const a = C * Math.cos((h * Math.PI) / 180), b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  if (rgb.some((v) => v < -0.0005 || v > 1.0005)) return undefined;
  return rgb.map((v) => Math.round(Math.max(0, Math.min(1, toSrgb(Math.max(0, v)))) * 255)) as [number, number, number];
}

/** OKLCH -> packed color, reducing chroma until it fits sRGB. */
export function fromOklch(L: number, C: number, h: number): Color {
  L = Math.max(0, Math.min(1, L));
  for (let c = C; c >= 0; c -= 0.004) {
    const rgb = oklchToRgb(L, c, h);
    if (rgb) return pack(rgb[0], rgb[1], rgb[2]);
  }
  const v = Math.round(toSrgb(L ** 3) * 255);
  return pack(v, v, v);
}

/** Move hue h toward target by amt (0..1) along the shorter way round. */
function toward(h: number, target: number, amt: number, warmPath = false): number {
  let d = ((target - h + 540) % 360) - 180;
  // Yellows sit opposite blue-violet: their shadows must turn through orange and red,
  // never through green (that's what makes sand and blond hair go olive).
  if (warmPath && d > 140) d -= 360;
  return (((h + d * amt) % 360) + 360) % 360;
}

export interface MaterialOpts {
  /** Number of tones, dark -> light (default 6). */
  steps?: number;
  /** Index of the base color in the ramp (default: about 60% up, so there's room for shadows). */
  at?: number;
  /** Hue shift strength (default 1; 0 = plain darker/lighter). */
  shift?: number;
  /** Lightness of the darkest tone, OKLab L 0..1 (default: base - 0.42, at least 0.14). */
  dark?: number;
  /** Lightness of the lightest tone (default: base + 0.26, at most 0.96). */
  light?: number;
  /** Hue shadows rotate toward (default 265, blue-violet). */
  cool?: number;
  /** Hue lights rotate toward (default 90, warm yellow). */
  warm?: number;
}

/** A material ramp around `base`, dark -> light; ramp[at] is exactly `base`. */
export function materialRamp(base: Color, o: MaterialOpts = {}): { ramp: Color[]; at: number } {
  const n = Math.max(2, Math.min(12, Math.round(o.steps ?? 6)));
  const at = Math.max(0, Math.min(n - 1, Math.round(o.at ?? (n - 1) * 0.6)));
  const [L, C, h] = toOklch(base);
  const shift = o.shift ?? 1;
  const dark = o.dark ?? Math.max(0.14, Math.min(L - 0.12, L - 0.42));
  const light = o.light ?? Math.min(0.96, Math.max(L + 0.08, L + 0.26));
  const ramp: Color[] = [];
  for (let i = 0; i < n; i++) {
    if (i === at) { ramp.push(base); continue; }
    if (i < at) {
      const t = (at - i) / Math.max(1, at); // 0 at base .. 1 darkest
      const Li = L + (dark - L) * t;
      // Shadows: hue toward cool, chroma holds (slightly up) then fades in the deepest tones.
      const Ci = C * (1 + 0.15 * t - 0.45 * t * t) + 0.012 * t * shift;
      ramp.push(fromOklch(Li, Math.max(0, Ci), toward(h, o.cool ?? 265, 0.32 * t * shift, true)));
    } else {
      const t = (i - at) / Math.max(1, n - 1 - at); // 0 at base .. 1 lightest
      const Li = L + (light - L) * t;
      // Lights: hue toward warm, chroma drops so highlights don't go neon.
      const Ci = C * (1 - 0.38 * t);
      ramp.push(fromOklch(Li, Math.max(0, Ci), toward(h, o.warm ?? 90, 0.22 * t * shift)));
    }
  }
  return { ramp, at };
}

// ------------------------------------------------------------------ light direction

export type LightSpec = "tl" | "t" | "tr" | "l" | "r" | "front" | [number, number, number] | [number, number];

/** Direction toward the light (x right, y down, z toward the viewer), normalized. */
export function lightDir(spec: LightSpec = "tl"): [number, number, number] {
  const presets: Record<string, [number, number, number]> = {
    tl: [-0.55, -0.7, 0.55], t: [0, -0.8, 0.6], tr: [0.55, -0.7, 0.55],
    l: [-0.85, -0.2, 0.5], r: [0.85, -0.2, 0.5], front: [-0.2, -0.3, 0.93],
  };
  let v: number[];
  if (typeof spec === "string") {
    const p = presets[spec];
    if (!p) throw new PxError(`light: unknown direction '${spec}' (tl, t, tr, l, r, front, or [x, y, z])`);
    v = p;
  } else if (Array.isArray(spec) && (spec.length === 2 || spec.length === 3)) v = spec.length === 2 ? [spec[0], spec[1], 0.6] : [...spec];
  else throw new PxError(`light must be a preset or [x, y, z], got ${JSON.stringify(spec)}`);
  const d = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / d, v[1] / d, v[2] / d];
}

// ------------------------------------------------------------------ the form pass

export interface FormOpts {
  /** Where the light comes from (default "tl"). */
  light?: LightSpec;
  /** How many ramp steps the light spreads over, relative to the ramp (default 1). */
  contrast?: number;
  /** 0 = hard bands, 1 = ordered dither across each band seam (default 0.35). */
  dither?: number;
  /** Light coming back from below into shadows, in steps (default 0.6). */
  bounce?: number;
  /** Extra steps on the silhouette facing away from the light (default 1; 0 = off). */
  rim?: number;
  /** Extra step on the brightest spot (default 0; 1 = a pop of specular). */
  spec?: number;
  /** Only these keys ("*" any, default). */
  on?: string;
}

/**
 * Shade every pixel of img that has an unshaded normal and a color on a ramp. `ok` limits the
 * pixels (clip / where). Shaded pixels get their normal's z negated (the "done" flag).
 */
export function applyForm(img: Img, pal: Palette, o: FormOpts = {}, ok?: (i: number) => boolean): void {
  const nm = img.norm;
  if (!nm) return;
  const L = lightDir(o.light);
  const contrast = o.contrast ?? 1, dither = o.dither ?? 0.35, bounce = o.bounce ?? 0.6, rim = o.rim ?? 1, spec = o.spec ?? 0;
  const front = L[2]; // how lit a face looking straight at the viewer is: base color stays there
  const { w, h } = img;
  const out = img.data.slice();
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (nm[i * 3 + 2] <= 0 || (ok && !ok(i))) continue;
      const c = img.data[i];
      if (c === TRANSPARENT) continue;
      const r = pal.rampOf(c);
      if (!r) continue;
      const nx = nm[i * 3] / 127, ny = nm[i * 3 + 1] / 127, nz = nm[i * 3 + 2] / 127;
      const d = nx * L[0] + ny * L[1] + nz * L[2];
      const n = r.ramp.length;
      // Steps per unit of light: spread the light over roughly the whole ramp.
      const k = contrast * (n - 1) * 0.85;
      // Lit side: linear in d. Shadow side (d < 0) flattens: core shadow, not a black pit.
      let off = d >= 0 ? (d - front) * k : (-front + d * 0.35) * k;
      // Bounce: faces pointing down catch light reflected from the ground.
      if (d < 0.25 && ny > 0) off += bounce * ny * (1 - Math.max(0, d) * 4);
      if (spec && d > 0.94) off += spec;
      // Rim: silhouette pixels facing away from the light.
      if (rim && d < 0.2 && edge(img, x, y) && nx * L[0] + ny * L[1] < -0.15) off += rim * 0.8;
      const t = r.i + off;
      let lo = Math.floor(t), f = t - lo;
      // Ordered dither only in the middle of each band seam; elsewhere round.
      const thr = 0.5 + (bayer(x, y) - 0.5) * dither;
      if (f > thr) lo++;
      out[i] = r.ramp[Math.max(0, Math.min(n - 1, lo))];
      nm[i * 3 + 2] = -Math.max(1, nm[i * 3 + 2]);
    }
  img.data.set(out);
}

function edge(img: Img, x: number, y: number): boolean {
  return img.get(x - 1, y) === TRANSPARENT || img.get(x + 1, y) === TRANSPARENT
    || img.get(x, y - 1) === TRANSPARENT || img.get(x, y + 1) === TRANSPARENT;
}

// ------------------------------------------------------------------ selective outline

/**
 * 1px outline whose color comes from what it borders: the darkest tone of that pixel's ramp, one
 * step lighter on the side facing the light. Colors outside any ramp get a dark version of
 * themselves. Grows the canvas by 1 on every side, like outline.
 */
export function selout(img: Img, pal: Palette, light: LightSpec = "tl", darkKey?: Color): Img {
  const src = img.pad(1), o = src.copy();
  const L = lightDir(light);
  const op = (x: number, y: number) => src.get(x, y) !== TRANSPARENT;
  const dirs: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let y = 0; y < src.h; y++)
    for (let x = 0; x < src.w; x++) {
      if (op(x, y)) continue;
      let best: Color | undefined, litSide = 0, cnt = 0;
      for (const [dx, dy] of dirs) {
        if (!op(x + dx, y + dy)) continue;
        cnt++;
        // The object is at (dx, dy) from here: this outline pixel faces the light when -d·L > 0.
        litSide += -(dx * L[0] + dy * L[1]);
        const c = src.get(x + dx, y + dy), r = pal.rampOf(c);
        const cand = r ? r.ramp[0] : darken(c, 0.72);
        if (best === undefined || lum(cand) < lum(best)) best = cand;
      }
      if (!cnt || best === undefined) continue;
      if (litSide / cnt > 0.25) {
        const r = pal.rampOf(best);
        if (r && r.ramp.length > 2) best = r.ramp[1];
      } else if (darkKey !== undefined && lum(darkKey) < lum(best)) best = darkKey;
      o.set(x, y, best);
    }
  return o;
}

function lum(c: Color): number {
  const [r, g, b] = channels(c);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}
