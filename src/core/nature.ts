// Environment brushes: water, caustics, foam, palms, foliage, clouds, mountains.
// They build on the form layer: leaves, clouds and mountains write surface normals, so one form()
// pass lights them with everything else. Water is painted directly in ramp steps (it's flat).
// All randomness comes from the canvas rng, so builds are reproducible.
import type { Canvas } from "./canvas.ts";
import { type Color, TRANSPARENT, channels, pack } from "./color.ts";
import { fromOklch, toOklch } from "./form.ts";
import { PxError } from "./errors.ts";
import { bayer } from "./util.ts";

/** The material ramp a color key belongs to, as colors dark -> light, plus the key's index. */
function rampFor(c: Canvas, key: string, what: string): { ramp: readonly Color[]; i: number } {
  const col = c.color(key);
  if (col === null || col === TRANSPARENT) throw new PxError(`${what}: needs a visible color, got '${key}'`);
  const r = c.pal.rampOf(col);
  if (!r) throw new PxError(`${what}: '${key}' must be on a ramp (define it with material())`);
  return r;
}

const at = (r: readonly Color[], i: number) => r[Math.max(0, Math.min(r.length - 1, Math.round(i)))];

/** Mix two colors in OKLab, t = share of b. */
export function mixOk(a: Color, b: Color, t: number): Color {
  const [l1, c1, h1] = toOklch(a), [l2, c2, h2] = toOklch(b);
  const A1 = c1 * Math.cos((h1 * Math.PI) / 180), B1 = c1 * Math.sin((h1 * Math.PI) / 180);
  const A2 = c2 * Math.cos((h2 * Math.PI) / 180), B2 = c2 * Math.sin((h2 * Math.PI) / 180);
  const L = l1 + (l2 - l1) * t, A = A1 + (A2 - A1) * t, B = B1 + (B2 - B1) * t;
  return fromOklch(L, Math.hypot(A, B), ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360);
}

function nearest(c: Color, cands: readonly Color[]): Color {
  const [r, g, b] = channels(c);
  let best = cands[0], bd = Infinity;
  for (const k of cands) {
    const [r2, g2, b2] = channels(k), d = (r - r2) ** 2 * 0.3 + (g - g2) ** 2 * 0.59 + (b - b2) ** 2 * 0.11;
    if (d < bd) { bd = d; best = k; }
  }
  return best;
}

// ------------------------------------------------------------------ water

export interface ReflectOpts {
  /** Only reflect these keys ("*" = anything opaque that isn't the water, default). */
  keys?: string;
  /** Only draw onto these keys (default: any color on a ramp). */
  on?: string;
  /** Steps darker than the water under it (default 1; dark things reflect 1 more). */
  steps?: number;
  seed?: number;
}

/**
 * Reflections in water whose surface is row y: for len rows below it, pixels of things standing
 * above take a darker step of the water they're on, wobbling sideways and broken up by waves.
 */
export function reflect(cv: Canvas, x: number, y: number, w: number, len: number, o: ReflectOpts = {}): void {
  const rnd = cv.rng(o.seed ?? 17), steps = o.steps ?? 1;
  const keyTest = !o.keys || o.keys === "*" ? undefined : (xx: number, yy: number) => cv.is(xx, yy, o.keys!);
  const onTest = o.on ? cv.maskAt(o.on) : undefined;
  const hits: [number, number, Color][] = [];
  for (let d = 0; d < len; d++) {
    const wob = Math.round(Math.sin(d * 1.3 + (o.seed ?? 0) * 0.7) * (d / Math.max(1, len)) * 1.5);
    const fade = 1 - d / len;
    for (let xx = x; xx < x + w; xx++) {
      const tx = xx, ty = y + d, sx = xx + wob, sy = y - 1 - d;
      const water = cv.get(tx, ty), src = cv.get(sx, sy);
      if (src === TRANSPARENT || water === TRANSPARENT) continue;
      const wr = cv.pal.rampOf(water);
      if (!wr || wr.ramp.includes(src) || (onTest && !onTest(tx, ty)) || (keyTest && !keyTest(sx, sy))) continue;
      if (bayer(tx, ty) > fade * 0.9 + 0.1 || rnd() < 0.15 * (1 - fade) + 0.06) continue;
      const [r8, g8, b8] = channels(src), dark = 0.299 * r8 + 0.587 * g8 + 0.114 * b8 < 90 ? 1 : 0;
      hits.push([tx, ty, at(wr.ramp, wr.i - steps - dark)]);
    }
  }
  for (const [hx, hy, col] of hits) cv.plot(hx, hy, col);
}

export interface WaterOpts {
  /** Ramp offset at the top and bottom edge, e.g. [-1, 1] (default [0, 0]). */
  depth?: [number, number];
  /** Rows under the top edge in shadow (under a dock), one step darker, dithered out (default 0). */
  shadow?: number;
  /** Fraction of pixels covered by ripple strokes (default 0.22). */
  ripples?: number;
  /** Ripple stroke length range in px (default [2, 7]). */
  len?: [number, number];
  /** Number of 1px glints (default: area / 220). */
  glints?: number;
  /** Reflect what's above the top edge: "*" or the keys to reflect (default none). */
  reflect?: string;
  /** How far down reflections reach in px (default h / 2). */
  reflectLen?: number;
  /** Foam under everything standing right above the top row: width in px (default 0; prefer foam()). */
  foam?: number;
  seed?: number;
}

/** A body of water from (x, y), w x h, in material `c` (its base tone is the open-water color). */
export function water(cv: Canvas, x: number, y: number, w: number, h: number, c: string, o: WaterOpts = {}): void {
  const R = rampFor(cv, c, "water"), r = R.ramp, base = R.i, rnd = cv.rng(o.seed ?? 11);
  const [d0, d1] = o.depth ?? [0, 0];
  const shadow = o.shadow ?? 0, dens = o.ripples ?? 0.22, [l0, l1] = o.len ?? [2, 7];
  // Remember what stands above the waterline before we paint (reflections, foam).
  const above = (xx: number, d: number) => cv.get(xx, y - 1 - d);
  const standing: boolean[] = [];
  for (let xx = x; xx < x + w; xx++) standing.push(above(xx, 0) !== TRANSPARENT && !r.includes(above(xx, 0)));
  const off = new Float32Array(w * h);
  // Base: depth gradient + dock shadow.
  for (let yy = 0; yy < h; yy++)
    for (let xx = 0; xx < w; xx++) {
      let t = base + d0 + (d1 - d0) * (h > 1 ? yy / (h - 1) : 0);
      if (yy < shadow) t -= 1 - (yy / shadow) * 0.9;
      off[yy * w + xx] = t;
    }
  // Ripples: short horizontal strokes, lighter or darker, longer and sparser further away (top).
  const strokes = Math.round(w * h * dens / ((l0 + l1) / 2));
  for (let s = 0; s < strokes; s++) {
    const yy = Math.floor(rnd() * h), xx = Math.floor(rnd() * w);
    const far = 1 - yy / Math.max(1, h);
    const len = Math.round(l0 + (l1 - l0) * (rnd() * 0.6 + far * 0.4));
    const up = rnd() < 0.55 ? 1 : -1;
    for (let k = 0; k < len; k++) if (xx + k < w) off[yy * w + xx + k] += up;
    // A ripple often has a darker partner line right under its light stroke.
    if (up > 0 && yy + 1 < h && rnd() < 0.5) for (let k = 1; k < len - 1; k++) if (xx + k < w) off[(yy + 1) * w + xx + k] -= 0.6;
  }
  const pick = (xx: number, yy: number, t: number) => {
    const lo = Math.floor(t), f = t - lo;
    return at(r, f > bayer(x + xx, y + yy) * 0.6 + 0.2 ? lo + 1 : lo);
  };
  for (let yy = 0; yy < h; yy++)
    for (let xx = 0; xx < w; xx++) cv.plot(x + xx, y + yy, pick(xx, yy, off[yy * w + xx]));
  if (o.reflect) reflect(cv, x, y, w, o.reflectLen ?? Math.round(h / 2), { keys: o.reflect, seed: o.seed });
  // Foam ring where posts, rocks and walls meet the surface.
  const fw = o.foam ?? 0;
  if (fw > 0)
    for (let xx = 0; xx < w; xx++) {
      const here = standing[xx], left = standing[xx - 1], right = standing[xx + 1];
      if (here) for (let k = 0; k < fw; k++) cv.plot(x + xx, y + k, at(r, r.length - 1));
      else if (left || right) cv.plot(x + xx, y, at(r, r.length - 1 - (rnd() < 0.5 ? 0 : 1)));
    }
  const glints = o.glints ?? Math.round((w * h) / 220);
  for (let g = 0; g < glints; g++) cv.plot(x + Math.floor(rnd() * w), y + Math.floor(rnd() * h), at(r, r.length - 1));
}

export interface FoamOpts {
  /** Only water of these keys gets foam (default: any opaque). */
  on?: string;
  /** Foam color (default: the lightest tone of the water it lands on). */
  c?: string;
  /** Break the ring up: fraction kept 0..1 (default 0.8). */
  keep?: number;
  seed?: number;
}

/** White-water ring around pixels of `around` (rocks, posts, swimmers) where they touch water. */
export function foam(cv: Canvas, around: string, o: FoamOpts = {}): void {
  const isObj = (x: number, y: number) => cv.is(x, y, around);
  const onWater = o.on ? (x: number, y: number) => cv.is(x, y, o.on!) : (x: number, y: number) => cv.get(x, y) !== TRANSPARENT && !isObj(x, y);
  const fixed = o.c ? cv.color(o.c) : null, keep = o.keep ?? 0.8, rnd = cv.rng(o.seed ?? 5);
  const hits: [number, number, Color][] = [];
  for (let y = -cv.oy; y < cv.img.h - cv.oy; y++)
    for (let x = -cv.ox; x < cv.img.w - cv.ox; x++) {
      if (!onWater(x, y)) continue;
      // Foam sits where the object meets the surface: under its bottom edge and beside its lowest
      // couple of rows, not along posts or walls that rise out of the water.
      const low = (nx: number, ny: number) => isObj(nx, ny) && (!isObj(nx, ny + 1) || !isObj(nx, ny + 2));
      if (!(low(x - 1, y) || low(x + 1, y) || isObj(x, y - 1) || isObj(x - 1, y - 1) || isObj(x + 1, y - 1))) continue;
      if (rnd() > keep) continue;
      const rr = cv.pal.rampOf(cv.get(x, y));
      hits.push([x, y, fixed ?? (rr ? rr.ramp[rr.ramp.length - 1] : pack(255, 255, 255))]);
    }
  for (const [x, y, col] of hits) cv.plot(x, y, col);
}

export interface CausticsOpts {
  /** Cell size in px (default 7). */
  scale?: number;
  /** Line thickness 0..1 (default 0.18). */
  width?: number;
  /** Steps lighter (default 1). */
  steps?: number;
  /** Only on these keys. */
  on?: string;
  seed?: number;
}

/** Wobbly light net (pool floors, shallow sand): Voronoi cell borders stepped lighter. */
export function caustics(cv: Canvas, x: number, y: number, w: number, h: number, o: CausticsOpts = {}): void {
  const s = o.scale ?? 7, wid = o.width ?? 0.18, rnd = cv.rng(o.seed ?? 3);
  const gw = Math.ceil(w / s) + 2, gh = Math.ceil(h / s) + 2;
  const pts: [number, number][] = [];
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) pts.push([(i - 1 + rnd()) * s, (j - 1 + rnd() * 0.8) * s * 0.6]);
  const map = cv.pal.stepMap(1), keys = o.on ? cv.maskAt(o.on) : undefined;
  const near = (px: number, py: number) => {
    let a = Infinity, b = Infinity;
    const ci = Math.floor(px / s) + 1, cj = Math.floor(py / (s * 0.6)) + 1;
    for (let j = cj - 1; j <= cj + 1; j++)
      for (let i = ci - 1; i <= ci + 1; i++) {
        const p = pts[j * gw + i];
        if (!p) continue;
        const d = Math.hypot(p[0] - px, (p[1] - py) * 1.4);
        if (d < a) { b = a; a = d; } else if (d < b) b = d;
      }
    return (b - a) / s;
  };
  cv.remap(map, (xx, yy) => xx >= x && yy >= y && xx < x + w && yy < y + h && (!keys || keys(xx, yy)) && near(xx - x, yy - y) < wid, o.steps ?? 1);
}

// ------------------------------------------------------------------ vegetation

export interface PalmOpts {
  /** Trunk height in px (default 40). */
  h?: number;
  /** Horizontal offset of the crown from the base (default 6). */
  lean?: number;
  /** Trunk material key (default "w"). */
  trunk?: string;
  /** Leaf material key (default "g"). */
  leaf?: string;
  /** Number of fronds (default 9). */
  fronds?: number;
  /** Frond length in px (default h * 0.55). */
  len?: number;
  /** Coconut key, or "" for none (default: none). */
  nuts?: string;
  /** Trunk radius at the base in px (default: scales with h, 2.6 at h 40). */
  r?: number;
  seed?: number;
}

/** A palm from its base (x, y): curved, ringed trunk; drooping fronds with leaflets. */
export function palm(cv: Canvas, x: number, y: number, o: PalmOpts = {}): void {
  const H = o.h ?? 40, lean = o.lean ?? 6, rnd = cv.rng(o.seed ?? 1);
  const trunk = o.trunk ?? "w", leaf = o.leaf ?? "g";
  const cx = x + lean, cy = y - H;
  // Trunk: quadratic curve, thick at the base, ring marks one step darker.
  const bx = x + lean * 0.1, by = y - H * 0.5;
  const pt = (t: number): [number, number] => [
    (1 - t) ** 2 * x + 2 * (1 - t) * t * bx + t * t * cx,
    (1 - t) ** 2 * y + 2 * (1 - t) * t * by + t * t * cy,
  ];
  const segs = Math.max(4, Math.round(H / 3));
  const r0 = o.r ?? Math.max(1.6, 1.2 + H * 0.035), r1 = r0 * 0.55;
  for (let s = 0; s < segs; s++) {
    const [ax, ay] = pt(s / segs), [qx, qy] = pt((s + 1) / segs);
    const ra = r0 + (r1 - r0) * (s / segs), rb = r0 + (r1 - r0) * ((s + 1) / segs);
    cv.tube(ax, ay, qx, qy, ra, s % 2 ? trunk : `${trunk}-1`, { r1: rb });
  }
  // Fronds: back ones first (they end up darker under the front ones once form() runs).
  const n = o.fronds ?? 9, L = o.len ?? H * 0.55, crownR = Math.max(1, r1 * 1.2);
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => Math.sin((a / n) * Math.PI * 2) - Math.sin((b / n) * Math.PI * 2));
  for (const i of order) {
    const ang = (i / n) * Math.PI * 2 + rnd() * 0.4;
    const dirx = Math.cos(ang), back = Math.sin(ang); // back > 0: frond points away from the viewer
    const len = L * (0.75 + rnd() * 0.35) * (0.55 + 0.45 * Math.abs(dirx));
    const droop = 0.55 + rnd() * 0.35;
    const lift = -0.55 - 0.25 * back; // fronds start rising, then droop
    let px = cx, py = cy, vx = dirx * 1, vy = lift;
    const steps = Math.round(len);
    if (len < 16) {
      // Small palms: each frond is one tapering, drooping blade with a few short leaflets;
      // full leaflet fans just merge into a blob at this size.
      const tone = back > 0.3 ? `${leaf}-1` : leaf;
      let qx = cx, qy = cy;
      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        vy += (droop * 2.2) / steps;
        const d = Math.hypot(vx, vy) || 1;
        const nx2 = qx + vx / d, ny2 = qy + vy / d;
        cv.tube(qx, qy, nx2, ny2, 1 - t * 0.7, tone, { r1: 1 - (t + 1 / steps) * 0.7 });
        if (s % 3 === 2) cv.surf(nx2 + (-vy / d), ny2 + 1, tone, 0, 0.5, 0.8);
        qx = nx2; qy = ny2;
      }
      continue;
    }
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      vy += (droop * 2.2) / steps;
      const d = Math.hypot(vx, vy) || 1;
      px += vx / d; py += vy / d;
      // Midrib, then leaflets on both sides, longest in the middle, pointing down-out.
      const tone = back > 0.3 ? `${leaf}-1` : leaf;
      cv.surf(px, py, cv.color(tone), -vy / d * 0.3, -0.5, 1);
      const ll = Math.round(Math.sin(t * Math.PI * 0.9 + 0.2) * (len * 0.16) + 1);
      const nxp = -vy / d, nyp = vx / d; // perpendicular
      for (const side of [1, -1]) {
        if (s % 2 === (side > 0 ? 0 : 1)) continue; // alternate sides: separate leaflets, not a sheet
        let lx = px, ly = py;
        const sx = nxp * side * 0.55 + vx / d * 0.45, sy = nyp * side * 0.55 + 0.75;
        for (let k = 0; k < ll; k++) {
          lx += sx; ly += sy;
          // Upper leaflets face the sky, lower ones face down: form() lights them differently.
          cv.surf(lx, ly, cv.color(tone), sx * 0.4, side * nyp > 0 ? 0.6 : -0.7, 0.8);
        }
      }
    }
  }
  if (o.nuts) for (const [dx, dy] of [[-1, 2], [2, 2], [0, 3]]) cv.ball(cx + dx, cy + dy, 1.2, o.nuts);
}

export interface FoliageOpts {
  /** Leaf clump radius range (default [2, 4]). */
  size?: [number, number];
  /** Number of clumps (default: area / 9). */
  count?: number;
  /** Flower key sprinkled on the lit tops of clumps (bougainvillea, hibiscus). */
  flowers?: string;
  /** Fraction of clumps that carry flowers (default 0.5). */
  bloom?: number;
  /** Ragged leaf tips on the silhouette (default true). */
  tips?: boolean;
  seed?: number;
}

/**
 * A bush / tree crown / hedge: overlapping leaf clumps inside the ellipse (cx, cy, rx, ry),
 * drawn back (top) to front (bottom) as little form surfaces, so form() gives the clumpy,
 * lit-from-above look. Use a darker step of the leaf color for clumps you want further back.
 */
export function foliage(cv: Canvas, cx: number, cy: number, rx: number, ry: number, c: string, o: FoliageOpts = {}): void {
  const rnd = cv.rng(o.seed ?? 7), [s0, s1] = o.size ?? [2, 4];
  // Enough clumps to close the crown whatever the clump size (small bushes stay dense).
  const ravg = (s0 + s1) / 2;
  const count = o.count ?? Math.max(4, Math.round((rx * ry) / (ravg * ravg * 0.45)));
  const clumps: [number, number, number][] = [];
  for (let i = 0; i < count; i++) {
    const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd());
    clumps.push([cx + Math.cos(a) * d * rx, cy + Math.sin(a) * d * ry, s0 + rnd() * (s1 - s0)]);
  }
  clumps.sort((a, b) => a[1] - b[1]);
  const col = cv.color(c), back = cv.color(`${c}-1`);
  for (const [x, y, r] of clumps) {
    // Clumps in the upper back half sit one step back, the rest in the base tone.
    const c2 = y < cy - ry * 0.35 && rnd() < 0.5 ? back : col;
    for (let yy = Math.floor(y - r); yy <= Math.ceil(y + r); yy++)
      for (let xx = Math.floor(x - r); xx <= Math.ceil(x + r); xx++) {
        const dx = (xx - x) / (r + 0.5), dy = (yy - y) / (r + 0.5), q = dx * dx + dy * dy;
        if (q > 1) continue;
        cv.surf(xx, yy, c2, dx, dy * 0.8 - 0.25, Math.sqrt(1 - q));
      }
  }
  if (o.tips ?? true) {
    const tips = Math.round(count * 0.8);
    for (let i = 0; i < tips; i++) {
      const a = rnd() * Math.PI * 2;
      const ex = cx + Math.cos(a) * (rx + 0.5), ey = cy + Math.sin(a) * (ry + 0.5);
      cv.surf(ex, ey, col, Math.cos(a), Math.sin(a), 0.6);
      if (rnd() < 0.5) cv.surf(ex + Math.sign(Math.cos(a)), ey + (Math.sin(a) > 0 ? 1 : 0), col, Math.cos(a), Math.sin(a) + 0.4, 0.5);
    }
  }
  if (o.flowers) {
    const fl = cv.color(o.flowers), bloom = o.bloom ?? 0.5;
    for (const [x, y, r] of clumps) {
      if (rnd() > bloom) continue;
      const n = 2 + Math.floor(rnd() * 3);
      for (let k = 0; k < n; k++) {
        const fx = x + (rnd() - 0.6) * r, fy = y - r * 0.4 + (rnd() - 0.5) * r * 0.8;
        cv.surf(fx, fy, fl, -0.3, -0.6, 0.8);
        if (rnd() < 0.4) cv.surf(fx + 1, fy, fl, 0.2, -0.3, 0.9);
      }
    }
  }
}

// ------------------------------------------------------------------ sky and land

export interface CloudOpts {
  /** Number of puffs (default w / 5). */
  puffs?: number;
  seed?: number;
}

/** A cumulus cloud with a flat base: puffs on a bottom line from (x, y + h) w px wide, h tall. */
export function cloud(cv: Canvas, x: number, y: number, w: number, h: number, c: string, o: CloudOpts = {}): void {
  const rnd = cv.rng(o.seed ?? 9), col = cv.color(c), n = o.puffs ?? Math.max(3, Math.round(w / 5));
  const baseY = y + h;
  const puffs: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i / (n - 1) : 0.5;
    const hump = Math.sin(t * Math.PI); // tallest in the middle
    const r = Math.max(2, h * (0.35 + 0.55 * hump) * (0.75 + rnd() * 0.4));
    puffs.push([x + t * w, baseY - r * 0.8, r]);
  }
  for (const [px, py, r] of puffs)
    for (let yy = Math.floor(py - r); yy <= Math.min(baseY, Math.ceil(py + r)); yy++)
      for (let xx = Math.floor(px - r); xx <= Math.ceil(px + r); xx++) {
        const dx = (xx - px) / (r + 0.5), dy = (yy - py) / (r + 0.5), q = dx * dx + dy * dy;
        if (q > 1) continue;
        // Flatter, softer normals than a ball: clouds are lit but not glossy.
        cv.surf(xx, yy, col, dx * 0.7, dy * 0.7 + (yy > baseY - 2 ? 0.5 : 0), Math.sqrt(1 - q) + 0.3);
      }
}

export interface MountainOpts {
  /** Ridge roughness 0..1 (default 0.5). */
  rough?: number;
  /** Peak position along the width, 0..1 (default 0.5). */
  peak?: number;
  /** Gully strength: vertical creases on the slopes (default 1). */
  gullies?: number;
  seed?: number;
}

/** A mountain / hill range standing on (x, baseY), w wide, up to h tall; slopes carry normals. */
export function mountain(cv: Canvas, x: number, baseY: number, w: number, h: number, c: string, o: MountainOpts = {}): void {
  const rnd = cv.rng(o.seed ?? 13), col = cv.color(c), rough = o.rough ?? 0.5, peak = o.peak ?? 0.5, gul = o.gullies ?? 1;
  // Ridge: a peaked envelope plus midpoint-displacement detail.
  const W = Math.max(2, Math.round(w)), ridge = new Float32Array(W + 1);
  const n = 1 << Math.ceil(Math.log2(W));
  const md = new Float32Array(n + 1);
  for (let step = n, amp = 1; step > 1; step >>= 1, amp *= 0.55)
    for (let i = 0; i < n; i += step) md[i + step / 2] = (md[i] + md[i + step]) / 2 + (rnd() - 0.5) * amp;
  for (let i = 0; i <= W; i++) {
    const t = i / W, d = Math.abs(t - peak) / Math.max(peak, 1 - peak);
    const env = Math.max(0, 1 - d ** 1.2);
    ridge[i] = h * (env * (1 - rough * 0.4) + md[Math.round((i / W) * n)] * rough * 0.5 * env);
  }
  const seedN = Math.floor(rnd() * 1e6);
  const vnoise = (px: number, py: number) => {
    const xi = Math.floor(px), yi = Math.floor(py), fx = px - xi, fy = py - yi;
    const hsh = (a: number, b: number) => { let q = Math.imul(a, 374761393) ^ Math.imul(b, 668265263) ^ seedN; q = Math.imul(q ^ (q >>> 13), 1274126177); return ((q ^ (q >>> 16)) >>> 0) / 4294967296; };
    const sm = (t: number) => t * t * (3 - 2 * t);
    const a = hsh(xi, yi), b = hsh(xi + 1, yi), cc = hsh(xi, yi + 1), dd = hsh(xi + 1, yi + 1);
    return a + (b - a) * sm(fx) + (cc - a) * sm(fy) + (a - b - cc + dd) * sm(fx) * sm(fy);
  };
  for (let i = 0; i < W; i++) {
    const top = baseY - Math.max(0, ridge[i]);
    const slope = (ridge[Math.min(W, i + 1)] - ridge[Math.max(0, i - 1)]) / 2;
    for (let yy = Math.floor(top); yy < baseY; yy++) {
      const depth = (yy - top) / Math.max(1, h);
      // Gullies: creases running down the slope, fading toward the foot.
      // Creases follow the fall line: noise stretched vertically, sampled across the slope.
      const nx = vnoise(i / 3.2 + slope * yy * 0.05, yy / 14) - 0.5, nx2 = vnoise(i / 1.6, yy / 6 + 50) - 0.5;
      const crease = (nx * 1.6 + nx2 * 0.6) * gul * (1 - depth * 0.6);
      cv.surf(x + i, yy, col, -slope * 1.6 + crease, -0.35 - (1 - depth) * 0.4, 1);
    }
  }
}

// ------------------------------------------------------------------ haze (layer option)

/** Push a layer toward the haze color (aerial perspective): amount 0..1, in OKLab. */
export function hazeImg(data: Uint32Array, color: Color, amount: number): void {
  const cache = new Map<Color, Color>();
  for (let i = 0; i < data.length; i++) {
    const c = data[i];
    if (c === TRANSPARENT) continue;
    let m = cache.get(c);
    if (m === undefined) { m = mixOk(c, color, amount); cache.set(c, m); }
    data[i] = m;
  }
}
