import { type Color, TRANSPARENT } from "./color.ts";
import { Img } from "./image.ts";
import type { Palette, Resolved } from "./palette.ts";
import { PxError } from "./errors.ts";
import { glyph, lineWidth } from "./font.ts";
import type { BallOpts, BlockOpts, BumpOpts, CylOpts, DomeOpts, LampOpts, ShadowOpts, TextureOpts, TubeOpts, PlaceOpts, ScatterOpts, TextOpts, Timeline, TilemapOpts, WireOpts } from "./model.ts";
import { bump, dirOf, setNormal } from "./normals.ts";
import { applyForm, type FormOpts } from "./form.ts";
import * as N from "./nature.ts";
import { bayer, colorList, gridRows, hash, inPoly, polyBounds, type Region, regionPred, rng } from "./util.ts";

/** How a canvas reaches other assets. */
export interface Resolver {
  /**
   * Built image of an asset; seed != 0 rerolls its random choices; t is the time in ms (animated
   * assets). `track` false: don't make the caller animated by this lookup (frozen frames).
   */
  image(name: string, seed: number, t?: number, track?: boolean): Img;
  /** How the asset changes over time, or undefined if it's still. */
  timeline(name: string, seed: number): Timeline | undefined;
  /** Names a reference can stand for: group members, glob matches, or itself. */
  candidates(name: string): string[];
}

type Pred = (x: number, y: number) => boolean;

/**
 * Drawing surface over an image. Coordinates are relative to (ox, oy); colors are palette
 * keys, "#hex", "." (skip) or "_" (erase). All writes go through plot(), which honours clip().
 */
export class Canvas {
  img: Img;
  pal: Palette;
  res: Resolver;
  ox: number;
  oy: number;
  /** Reseed offset applied to every random choice made on this canvas. */
  seed: number;
  /** Time in ms of this build: placed anims show the frame at this time. */
  t = 0;
  /** Inside an anim: the frame being drawn and the frame count (for procedural animation). */
  frame = 0;
  frames = 1;
  /** Building an anim (frame() items allowed). */
  inAnim = false;
  /** Composite below the current layer (absolute coords), for `below` masks. */
  below?: Img;
  /** Called after each top-level (non-nested) op call; used for tracing. */
  onOp?: (name: string, args: unknown[]) => void;
  /** Art-file location of the op item currently running (set by the builder). */
  loc?: string;
  private clipPred?: Pred;
  /** Nesting depth of op calls (internal). */
  _depth = 0;
  private rev?: Map<Color, string>;

  constructor(img: Img, pal: Palette, res: Resolver, ox = 0, oy = 0, seed = 0) {
    this.img = img;
    this.pal = pal;
    this.res = res;
    this.ox = ox;
    this.oy = oy;
    this.seed = seed;
  }

  /** Inside an anim: frame / frames, 0 (first frame) up to just below 1. */
  get phase(): number { return this.frame / this.frames; }

  get w(): number { return this.img.w; }
  get h(): number { return this.img.h; }

  color(c: unknown): Resolved {
    return this.pal.resolve(c);
  }

  /** Write an already-resolved color (null = skip); true if it landed. */
  plot(x: number, y: number, c: Resolved): boolean {
    if (c === null) return false;
    x = Math.floor(x);
    y = Math.floor(y);
    if (this.clipPred && !this.clipPred(x, y)) return false;
    if (!this.img.inside(this.ox + x, this.oy + y)) return false;
    this.img.set(this.ox + x, this.oy + y, c);
    return true;
  }

  get(x: number, y: number): Color {
    return this.img.get(this.ox + Math.floor(x), this.oy + Math.floor(y));
  }

  /** Palette key at (x, y): "." when transparent, "?" when not in the palette. */
  key(x: number, y: number): string {
    const c = this.get(x, y);
    if (c === TRANSPARENT) return ".";
    this.rev ??= this.pal.reverse();
    return this.rev.get(c) ?? "?";
  }

  /** Pixel is one of `keys` ("*" = any opaque, "." = transparent). */
  is(x: number, y: number, keys: string): boolean {
    if (keys === ".") return this.get(x, y) === TRANSPARENT;
    return this.colorTest(keys)(this.get(x, y));
  }

  /** Seeded random generator that follows this canvas's reseed offset. */
  rng(seed = 1): () => number {
    return rng(hash(seed, 0, this.seed));
  }

  private colorTest(on: string): (c: Color) => boolean {
    if (on === "*") return (c) => c !== TRANSPARENT;
    const set = this.pal.resolveSet(on);
    return (c) => set.has(c);
  }

  /** Mask predicate over canvas coords; `below` reads the composite under this layer. */
  maskAt(on: string | undefined, below = false): Pred {
    if (on === undefined) return () => true;
    const test = this.colorTest(on);
    if (below) {
      const b = this.below;
      if (!b) return (x, y) => test(this.get(x, y));
      return (x, y) => {
        const own = this.get(x, y);
        return test(own !== TRANSPARENT ? own : b.get(this.ox + x, this.oy + y));
      };
    }
    return (x, y) => test(this.get(x, y));
  }

  /** Run `fn` with drawing restricted to `region` (nests by intersection). */
  clip(region: Region, fn: () => void): void {
    const prev = this.clipPred, p = regionPred(region);
    this.clipPred = prev ? (x, y) => prev(x, y) && p(x, y) : p;
    try { fn(); } finally { this.clipPred = prev; }
  }

  // ---------------------------------------------------------------- shapes

  px(x: number, y: number, c: string): void {
    this.plot(x, y, this.color(c));
  }

  rect(x: number, y: number, w: number, h: number, c: string): void {
    const col = this.color(c);
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.plot(xx, yy, col);
  }

  box(x: number, y: number, w: number, h: number, c: string): void {
    const col = this.color(c);
    for (let xx = x; xx < x + w; xx++) { this.plot(xx, y, col); this.plot(xx, y + h - 1, col); }
    for (let yy = y + 1; yy < y + h - 1; yy++) { this.plot(x, yy, col); this.plot(x + w - 1, yy, col); }
  }

  /** Bresenham line; width > 1 uses a round brush. */
  line(x0: number, y0: number, x1: number, y1: number, c: string, width = 1): void {
    const col = this.color(c);
    const brush: number[] = [];
    if (width > 1) {
      const f = width % 2 === 0 ? 0.5 : 0, r2 = (width / 2) ** 2;
      const lo = -Math.floor((width - 1) / 2), hi = Math.ceil((width - 1) / 2);
      for (let oy = lo; oy <= hi; oy++)
        for (let ox = lo; ox <= hi; ox++) if ((ox - f) ** 2 + (oy - f) ** 2 <= r2) brush.push(ox, oy);
    } else brush.push(0, 0);
    x0 = Math.floor(x0); y0 = Math.floor(y0); x1 = Math.floor(x1); y1 = Math.floor(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      for (let i = 0; i < brush.length; i += 2) this.plot(x0 + brush[i], y0 + brush[i + 1], col);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  hline(x: number, y: number, len: number, c: string): void { this.rect(x, y, len, 1, c); }
  vline(x: number, y: number, len: number, c: string): void { this.rect(x, y, 1, len, c); }

  /** Ellipse centered at (cx, cy); `ring` draws only the 1px border. */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: string, ring = false): void {
    const col = this.color(c);
    const ax = rx + 0.5, ay = ry + 0.5;
    const inside = (x: number, y: number) => (x / ax) ** 2 + (y / ay) ** 2 <= 1;
    for (let y = -ry; y <= ry; y++)
      for (let x = -rx; x <= rx; x++)
        if (inside(x, y) && (!ring || !(inside(x - 1, y) && inside(x + 1, y) && inside(x, y - 1) && inside(x, y + 1))))
          this.plot(cx + x, cy + y, col);
  }

  circ(cx: number, cy: number, r: number, c: string): void { this.ellipse(cx, cy, r, r, c); }
  ring(cx: number, cy: number, r: number, c: string): void { this.ellipse(cx, cy, r, r, c, true); }

  /** Filled polygon [x0,y0, x1,y1, ...] with vertices on pixel corners. */
  poly(pts: number[], c: string): void {
    if (!Array.isArray(pts) || pts.length < 6 || pts.length % 2) throw new PxError("poly needs [x0,y0, x1,y1, x2,y2, ...]");
    const col = this.color(c), inside = inPoly(pts), b = polyBounds(pts);
    for (let y = Math.floor(b.y0); y < Math.ceil(b.y1); y++)
      for (let x = Math.floor(b.x0); x < Math.ceil(b.x1); x++) if (inside(x, y)) this.plot(x, y, col);
  }

  /** 4-connected flood fill of the region containing (x, y). */
  fill(x: number, y: number, c: string): void {
    const col = this.color(c);
    if (col === null) return;
    const img = this.img;
    const sx = this.ox + Math.floor(x), sy = this.oy + Math.floor(y);
    if (!img.inside(sx, sy)) return;
    const target = img.get(sx, sy);
    if (target === col) return;
    const seen = new Uint8Array(img.w * img.h);
    const stack = [sx, sy];
    while (stack.length) {
      const py = stack.pop()!, px = stack.pop()!;
      if (!img.inside(px, py)) continue;
      const i = py * img.w + px;
      if (seen[i] || img.data[i] !== target) continue;
      seen[i] = 1;
      this.plot(px - this.ox, py - this.oy, col);
      stack.push(px + 1, py, px - 1, py, px, py + 1, px, py - 1);
    }
  }

  // ---------------------------------------------------------------- texture

  /** Ordered dither: c2 covers `density` of the area, c1 the rest. */
  dither(x: number, y: number, w: number, h: number, c1: string, c2: string, density = 0.5): void {
    const a = this.color(c1), b = this.color(c2);
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++) this.plot(xx, yy, bayer(xx, yy) < density ? b : a);
  }

  /** Banded gradient through colors with dithered seams. dir "v" (default) or "h"; soft 0..1. */
  grad(x: number, y: number, w: number, h: number, colors: string | string[], dir: "v" | "h" = "v", soft = 0.5): void {
    const cols = colorList(colors).map((c) => this.color(c));
    const n = cols.length;
    if (!n) throw new PxError("grad needs at least one color");
    const len = dir === "h" ? w : h;
    for (let yy = 0; yy < h; yy++)
      for (let xx = 0; xx < w; xx++) {
        const pos = dir === "h" ? xx : yy;
        const f = len > 1 ? (pos / (len - 1)) * (n - 1) : 0;
        const i = Math.floor(f);
        let col: Resolved;
        if (i >= n - 1) col = cols[n - 1];
        else {
          let t = f - i;
          t = soft > 0 ? (t - 0.5) / soft + 0.5 : t >= 0.5 ? 1 : 0;
          col = bayer(x + xx, y + yy) < t ? cols[i + 1] : cols[i];
        }
        this.plot(x + xx, y + yy, col);
      }
  }

  /** Deterministic scatter of colors over `density` of the area; `on` limits it to those keys. */
  noise(x: number, y: number, w: number, h: number, colors: string | string[], density = 0.1, seed = 1, on?: string): void {
    const cols = colorList(colors).map((c) => this.color(c));
    const ok = this.maskAt(on);
    const r = this.rng(seed);
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++)
        if (r() < density) {
          const pick = cols[Math.floor(r() * cols.length)];
          if (ok(xx, yy)) this.plot(xx, yy, pick);
        }
  }

  /** Apply a color map inside a region `steps` times; density < 1 dithers it. */
  remap(map: Map<Color, Color>, where?: Region, steps = 1, density = 1): void {
    const ok = regionPred(where);
    for (let y = -this.oy; y < this.img.h - this.oy; y++)
      for (let x = -this.ox; x < this.img.w - this.ox; x++) {
        if (!ok(x, y) || (density < 1 && bayer(x, y) >= density)) continue;
        let c = this.get(x, y);
        for (let i = 0; i < steps; i++) c = map.get(c) ?? c;
        this.plot(x, y, c);
      }
  }

  /** Recolor { m: "M" } inside a region. */
  recolor(map: Record<string, string>, where?: Region, density = 1): void {
    this.remap(this.swapMap(map), where, 1, density);
  }

  /** Step colors darker along the palette ramps inside a region. */
  shade(where?: Region, steps = 1, density = 1): void {
    this.remap(this.pal.stepMap(-1), where, steps, density);
  }

  /** Step colors lighter along the palette ramps inside a region. */
  light(where?: Region, steps = 1, density = 1): void {
    this.remap(this.pal.stepMap(1), where, steps, density);
  }

  swapMap(swap: Record<string, string>): Map<Color, Color> {
    return this.pal.swapMap(swap);
  }


  // ---------------------------------------------------------------- assets

  /** Pick one candidate of `name` and transform it; random choices seeded by (a, b). */
  asset(name: string, opts: PlaceOpts = {}, a = 0, b = 0): Img {
    const list = this.res.candidates(name);
    const r = rng(hash(a, b, (opts.seed ?? 0) + this.seed));
    let inner = this.seed;
    if (opts.reseed === true) inner += (hash(a, b, opts.seed ?? 0) % 99991) + 1;
    else if (typeof opts.reseed === "number") inner += opts.reseed;
    const pick = list[Math.floor(r() * list.length)];
    let t = this.t, track = true;
    if (opts.frame !== undefined || opts.delay || opts.rdelay) {
      const tl = this.res.timeline(pick, inner);
      if (tl) {
        if (opts.frame !== undefined) {
          t = frameStart(tl, opts.frame);
          track = false;
        } else {
          // Shifts snap to the anim's step so combined timelines stay on a frame grid.
          let d = opts.delay ?? 0;
          if (opts.rdelay) d += rng(hash(a, b, (opts.seed ?? 0) + this.seed + 7919))() * tl.loop;
          t += Math.round(d / tl.step) * tl.step;
        }
      }
    }
    let src = this.res.image(pick, inner, t, track);
    const swap = opts.rswap ? opts.rswap[Math.floor(r() * opts.rswap.length)] : opts.swap;
    if (swap && Object.keys(swap).length) src = src.remap(this.swapMap(swap));
    if (opts.flip) src = src.flip(opts.flip);
    if (opts.rflip) {
      let f = "";
      for (const ax of opts.rflip) if ((ax === "x" || ax === "y") && r() < 0.5) f += ax;
      if (f) src = src.flip(f as "x" | "y" | "xy");
    }
    if (opts.rot) src = src.rot(opts.rot);
    return src;
  }

  /** Draw an image at canvas coords; with a predicate, only onto pixels it accepts. Lamps come along. */
  put(src: Img, x: number, y: number, ok?: Pred): void {
    if (src.lamps?.length) {
      const dx = this.ox + Math.floor(x), dy = this.oy + Math.floor(y);
      (this.img.lamps ??= []).push(...src.lamps.map((l) => ({ ...l, x: l.x + dx, y: l.y + dy })));
    }
    if (!ok && !this.clipPred) {
      this.img.blit(src, this.ox + x, this.oy + y);
      return;
    }
    for (let yy = 0; yy < src.h; yy++)
      for (let xx = 0; xx < src.w; xx++) {
        const c = src.data[yy * src.w + xx];
        if (c === TRANSPARENT || (ok && !ok(x + xx, y + yy)) || !this.plot(x + xx, y + yy, c)) continue;
        const i = (this.oy + Math.floor(y) + yy) * this.img.w + this.ox + Math.floor(x) + xx, j = yy * src.w + xx;
        if (src.norm) {
          const n = this.img.normals();
          n.set(src.norm.subarray(j * 3, j * 3 + 3), i * 3);
        } else if (this.img.norm) this.img.norm[i * 3 + 2] = 0;
      }
  }

  stamp(name: string, x = 0, y = 0, opts?: PlaceOpts): void {
    const src = this.asset(name, opts, x, y);
    const a = opts?.anchor ?? "tl";
    // anchor: which point of the sprite (x, y) refers to. "b" = bottom-center (feet, pots, posts).
    const ax = a.includes("l") ? 0 : a.includes("r") ? src.w - 1 : Math.floor(src.w / 2);
    const ay = a.startsWith("t") ? 0 : a.startsWith("b") ? src.h - 1 : a === "l" || a === "r" || a === "c" ? Math.floor(src.h / 2) : 0;
    this.put(src, x - ax, y - ay);
  }

  tile(name: string, x: number, y: number, cols = 1, rows = 1, opts?: PlaceOpts): void {
    const step = this.res.image(this.res.candidates(name)[0], 0);
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const tx = x + c * step.w, ty = y + r * step.h;
        this.put(this.asset(name, opts, tx, ty), tx, ty);
      }
  }

  /** Tile `name` over an area; edge tiles are cut to fit. */
  pattern(name: string, x: number, y: number, w: number, h: number, opts?: PlaceOpts): void {
    const step = this.res.image(this.res.candidates(name)[0], 0);
    for (let ty = y; ty < y + h; ty += step.h)
      for (let tx = x; tx < x + w; tx += step.w) {
        let src = this.asset(name, opts, tx, ty);
        const cw = Math.min(src.w, x + w - tx), ch = Math.min(src.h, y + h - ty);
        if (cw < src.w || ch < src.h) src = src.sub(0, 0, cw, ch);
        this.put(src, tx, ty);
      }
  }

  /** Character map of tiles: tilemap(`gg\ndd`, { map: { g: "grass" }, size: 16 }). */
  tilemap(str: string, opts: TilemapOpts): void {
    if (typeof str !== "string") throw new PxError("tilemap(str, { map, size }) needs the map string first");
    if (!opts?.map) throw new PxError("tilemap needs { map: { char: assetName } }");
    const rows = gridRows(str);
    const x0 = opts.x ?? 0, y0 = opts.y ?? 0;
    rows.forEach((row, r) => {
      [...row].forEach((ch, i) => {
        if (ch === "." || ch === " ") return;
        const name = opts.map[ch];
        if (!name) throw new PxError(`tilemap: no tile for '${ch}' (row ${r}, col ${i}); map has: ${Object.keys(opts.map).join(" ")}`);
        const step = opts.w && opts.h ? null : this.res.image(this.res.candidates(name)[0], 0);
        const tx = x0 + i * (opts.w ?? opts.size ?? step!.w), ty = y0 + r * (opts.h ?? opts.size ?? step!.h);
        this.put(this.asset(name, opts, tx, ty), tx, ty);
      });
    });
  }

  /** Brush: `count` random picks of `name` centered at random points in the area. */
  scatter(name: string, x: number, y: number, w: number, h: number, count: number, opts: ScatterOpts = {}): void {
    const r = rng(hash(x * 31 + w, y * 17 + h, (opts.seed ?? 0) + this.seed));
    const ok = this.maskAt(opts.on, opts.below);
    let placed = 0, tries = 0;
    while (placed < count && tries < count * 30) {
      tries++;
      const cx = x + Math.floor(r() * w), cy = y + Math.floor(r() * h);
      if (!ok(cx, cy)) continue;
      const src = this.asset(name, opts, cx, cy);
      this.put(src, cx - Math.floor(src.w / 2), cy - Math.floor(src.h / 2), opts.clip ? ok : undefined);
      placed++;
    }
  }

  /** Grid string at (x, y): one char per pixel; "." keeps, "_" erases. */
  /**
   * Grid string at (x, y). `map` turns chars into any color spec ({ e: "l-2", m: "u-1" }), so
   * grids can use material steps; unmapped chars are palette keys. Keeps the normals underneath,
   * so a face painted on a ball is shaded with it.
   */
  grid(x: number, y: number, s: string, map?: Record<string, string>): void {
    gridRows(String(s)).forEach((row, r) => {
      [...row].forEach((ch, i) => {
        if (ch === "." || ch === " ") return;
        let c: Resolved;
        try { c = this.color(map?.[ch] ?? ch); } catch (e) {
          throw new PxError(`${(e as Error).message} at grid row ${r}, col ${i}`);
        }
        this.plot(x + i, y + r, c);
      });
    });
  }

  /** Hanging cable sagging `sag` px; `hang` stamps an asset/group under it every `every` px. */
  wire(x0: number, y0: number, x1: number, y1: number, sag: number, c: string, opts: WireOpts = {}): void {
    const at = (t: number): [number, number] => [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + sag * 4 * t * (1 - t)];
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) + Math.abs(sag) * 2 + 1;
    let px = x0, py = y0;
    for (let i = 1; i <= n; i++) {
      const [fx, fy] = at(i / n);
      const qx = Math.round(fx), qy = Math.round(fy);
      this.line(px, py, qx, qy, c);
      px = qx; py = qy;
    }
    if (!opts.hang || x1 === x0) return;
    const every = opts.every ?? 6, span = Math.abs(x1 - x0), dir = Math.sign(x1 - x0);
    for (let d = opts.start ?? Math.floor(every / 2); d < span; d += every) {
      const [, fy] = at(d / span);
      const hx = x0 + dir * d, hy = Math.round(fy);
      const src = this.asset(opts.hang, opts, hx, hy);
      this.put(src, hx - Math.floor(src.w / 2), hy + 1);
    }
  }

  /** Light source at (x, y): lights the scene when a lighting() item runs; travels with stamps. */
  lamp(x: number, y: number, opts: LampOpts = {}): void {
    const c = this.color(opts.color ?? "#fff");
    if (c === null || c === TRANSPARENT) throw new PxError(`lamp color must be a visible color, got '${opts.color}'`);
    const r = opts.r ?? 32;
    if (!(r > 0)) throw new PxError(`lamp r must be > 0, got ${r}`);
    (this.img.lamps ??= []).push({ x: this.ox + Math.floor(x), y: this.oy + Math.floor(y), r, color: c, power: opts.power ?? 1, z: opts.z ?? 8 });
  }

  /** Generate surface normals for this canvas's opaque pixels (see normals.ts). */
  bump(shape: BumpOpts["shape"] = "dome", opts: BumpOpts = {}): void {
    const { w, h } = this.img, mask = new Uint8Array(w * h);
    const keys = this.maskAt(opts.on ?? "*"), inside = opts.where === undefined ? undefined : regionPred(opts.where);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const cx = x - this.ox, cy = y - this.oy;
        if (keys(cx, cy) && (!inside || inside(cx, cy)) && (!this.clipPred || this.clipPred(cx, cy))) mask[y * w + x] = 1;
      }
    bump(this.img, mask, { ...opts, shape });
  }

  /** Paint normals with a numpad grid: 8 faces up, 3 down-right, 5 the viewer; qweasdzxc are softer. */
  normals(x: number, y: number, s: string): void {
    gridRows(String(s)).forEach((row, r) => {
      [...row].forEach((ch, i) => {
        let d;
        try { d = dirOf(ch); } catch (e) { throw new PxError(`${(e as Error).message} at row ${r}, col ${i}`); }
        const px = Math.floor(x) + i, py = Math.floor(y) + r;
        if (d === null || (this.clipPred && !this.clipPred(px, py)) || !this.img.inside(this.ox + px, this.oy + py)) return;
        const k = (this.oy + py) * this.img.w + this.ox + px;
        if (d === "none") { if (this.img.norm) this.img.norm[k * 3 + 2] = 0; }
        else setNormal(this.img.normals(), k, d[0], d[1], d[2]);
      });
    });
  }

  // ---------------------------------------------------------------- form primitives

  /** Plot c and give it surface normal (nx, ny, nz) (ny down, nz toward the viewer). */
  surf(x: number, y: number, c: Resolved | string, nx: number, ny: number, nz: number): void {
    if (typeof c === "string") c = this.color(c);
    if (!this.plot(x, y, c)) return;
    setNormal(this.img.normals(), (this.oy + Math.floor(y)) * this.img.w + this.ox + Math.floor(x), nx, ny, Math.max(0.05, nz));
  }

  /** Arch: a w x h rectangle whose top is a half ellipse (windows, doors, arcades); ring = 1px border. */
  arch(x: number, y: number, w: number, h: number, c: string, ring = false): void {
    const col = this.color(c), rx = w / 2, ry = Math.min(h, rx);
    const inside = (xx: number, yy: number) => {
      if (xx < 0 || yy < 0 || xx >= w || yy >= h) return false;
      if (yy >= ry) return true;
      const dx = (xx + 0.5 - rx) / rx, dy = (yy + 0.5 - ry) / ry;
      return dx * dx + dy * dy <= 1;
    };
    for (let yy = 0; yy < h; yy++)
      for (let xx = 0; xx < w; xx++) {
        if (!inside(xx, yy)) continue;
        if (ring && inside(xx - 1, yy) && inside(xx + 1, yy) && inside(xx, yy - 1) && inside(xx, yy + 1)
          && inside(xx - 1, yy - 1) && inside(xx + 1, yy - 1)) continue;
        this.plot(x + xx, y + yy, col);
      }
  }

  /** Sphere / ellipsoid: center (cx, cy), radius r (ry for an oval). */
  ball(cx: number, cy: number, r: number, c: string, opts: BallOpts = {}): void {
    const col = this.color(c), rx = r, ry = opts.ry ?? r, d = opts.depth ?? 1;
    if (!(rx > 0 && ry > 0)) throw new PxError(`ball: radius must be > 0`);
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / (rx + 0.5), dy = (y - cy) / (ry + 0.5), q = dx * dx + dy * dy;
        if (q > 1) continue;
        this.surf(x, y, col, dx * d, dy * d, Math.sqrt(1 - q));
      }
  }

  /**
   * Cylinder (barrels, pots, pillars, trunks, posts): box (x, y, w, h). `cap` = height of the visible
   * top ellipse (0 = seen straight from the side), `bulge` = px the middle swells, dir "h" lies down.
   */
  cyl(x: number, y: number, w: number, h: number, c: string, opts: CylOpts = {}): void {
    const col = this.color(c), capC = opts.capColor ? this.color(opts.capColor) : col;
    const cap = Math.max(0, Math.round(opts.cap ?? 0)), bulge = opts.bulge ?? 0, taper = opts.taper ?? 0;
    const horiz = opts.dir === "h";
    const W = horiz ? h : w, H = horiz ? w : h;
    const put = (u: number, v: number, cc: Resolved, nu: number, nv: number, nz: number) =>
      horiz ? this.surf(x + v, y + u, cc, nv, nu, nz) : this.surf(x + u, y + v, cc, nu, nv, nz);
    const half = W / 2;
    for (let v = 0; v < H; v++) {
      const tv = H > 1 ? v / (H - 1) : 0;
      const hw = half + Math.sin(tv * Math.PI) * bulge - taper * tv;
      // Bottom edge follows the cap's ellipse so the base looks round, not cut off.
      for (let u = Math.floor(half - hw); u < Math.ceil(half + hw); u++) {
        const a = (u + 0.5 - half) / hw;
        if (Math.abs(a) > 1) continue;
        if (cap && v > H - 1 - cap) {
          const e = (v - (H - 1 - cap)) / (cap + 0.5);
          if (a * a + e * e > 1) continue;
        }
        if (cap && v < cap * 2) {
          const e = (v - cap) / (cap + 0.5);
          if (v < cap && a * a + e * e > 1) continue;
          if (a * a + e * e <= 1) { put(u, v, capC, a * 0.25, -0.9, 0.45); continue; }
        }
        // Slope of the bulge tilts the normal up/down a little.
        const slope = (Math.cos(tv * Math.PI) * bulge * Math.PI) / Math.max(1, H) - taper / Math.max(1, H);
        put(u, v, col, a, -slope * 0.8, Math.sqrt(Math.max(0, 1 - a * a)));
      }
    }
  }

  /**
   * Box seen from the front with an optional top face (`top` px tall) and side face (`side` px wide,
   * on the right unless sideAt: "l"), in oblique projection; `bevel` rounds the front edges.
   * The whole thing fits (x, y, w + side, h).
   */
  block(x: number, y: number, w: number, h: number, c: string, opts: BlockOpts = {}): void {
    const col = this.color(c);
    const topC = opts.topColor ? this.color(opts.topColor) : col, sideC = opts.sideColor ? this.color(opts.sideColor) : col;
    const top = Math.max(0, Math.round(opts.top ?? 0)), side = Math.max(0, Math.round(opts.side ?? 0));
    const bev = Math.max(0, opts.bevel ?? 1), left = opts.sideAt === "l";
    const fx = left ? x + side : x, fy = y + top, fh = h - top;
    // front
    for (let yy = 0; yy < fh; yy++)
      for (let xx = 0; xx < w; xx++) {
        let nx = 0, ny = 0.06;
        if (bev) {
          const dl = xx, dr = w - 1 - xx, dt = yy, db = fh - 1 - yy;
          if (dl < bev) nx -= 0.7 * (1 - dl / bev); if (dr < bev) nx += 0.7 * (1 - dr / bev);
          if (dt < bev) ny -= 0.7 * (1 - dt / bev); if (db < bev) ny += 0.7 * (1 - db / bev);
        }
        this.surf(fx + xx, fy + yy, col, nx, ny, 1);
      }
    // top face: rows above the front, sheared toward the side face
    for (let r = 0; r < top; r++) {
      const sh = top ? Math.round((side * (top - r)) / top) : 0;
      const x0 = left ? fx - sh : fx + sh;
      for (let xx = 0; xx < w; xx++) this.surf(x0 + xx, y + r, topC, 0, -1, 0.32);
    }
    // side face
    for (let k = 0; k < side; k++) {
      const lift = side ? Math.round((top * (k + 1)) / side) : 0;
      const sx = left ? fx - 1 - k : fx + w + k;
      for (let yy = -lift; yy < fh - lift; yy++) this.surf(sx, fy + yy, sideC, left ? -1 : 1, 0.05, 0.4);
    }
  }

  /** Round tube / capsule from (x0, y0) to (x1, y1), radius r (r1 at the end): limbs, pipes, branches. */
  tube(x0: number, y0: number, x1: number, y1: number, r: number, c: string, opts: TubeOpts = {}): void {
    const col = this.color(c), r1 = opts.r1 ?? r, R = Math.max(r, r1);
    const dx = x1 - x0, dy = y1 - y0, len2 = dx * dx + dy * dy || 1;
    for (let y = Math.floor(Math.min(y0, y1) - R - 1); y <= Math.ceil(Math.max(y0, y1) + R + 1); y++)
      for (let x = Math.floor(Math.min(x0, x1) - R - 1); x <= Math.ceil(Math.max(x0, x1) + R + 1); x++) {
        const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / len2));
        const vx = x - (x0 + dx * t), vy = y - (y0 + dy * t), rr = r + (r1 - r) * t, rt = rr + (rr < 1.5 ? 0.3 : 0.5);
        const q = (vx * vx + vy * vy) / (rt * rt);
        if (q > 1) continue;
        this.surf(x, y, col, vx / rt, vy / rt, Math.sqrt(1 - q));
      }
  }

  /** Shade everything on this canvas that has an unshaded surface (see form.ts). */
  form(opts: FormOpts & { where?: Region } = {}): void {
    const { w } = this.img, inside = opts.where === undefined ? undefined : regionPred(opts.where);
    const keys = opts.on ? this.maskAt(opts.on) : undefined;
    applyForm(this.img, this.pal, opts, (i) => {
      const x = (i % w) - this.ox, y = Math.floor(i / w) - this.oy;
      return (!inside || inside(x, y)) && (!keys || keys(x, y)) && (!this.clipPred || this.clipPred(x, y));
    });
  }

  /**
   * Half ellipsoid standing on its flat base (umbrella canopies, domes, mushroom caps, sign tops):
   * center of the base (cx, by), radii rx / ry (height). `scallop` = width of a wavy lower edge.
   */
  dome(cx: number, by: number, rx: number, ry: number, c: string, opts: DomeOpts = {}): void {
    const col = this.color(c), sc = opts.scallop ?? 0, d = opts.depth ?? 1;
    for (let y = Math.floor(by - ry); y <= by + (sc ? 1 : 0); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / (rx + 0.5), dy = (y - by) / (ry + 0.5), q = dx * dx + dy * dy;
        if (q > 1 && y <= by) continue;
        if (y > by) {   // scallops hang below the rim
          if (!sc || Math.abs(dx) > 1) continue;
          const ph = ((x - cx + rx) % sc) / sc;
          if (Math.abs(ph - 0.5) > 0.3) continue;
        }
        this.surf(x, y, col, dx * d, (Math.min(0.3, dy) * 0.6 - 0.1) * d, Math.sqrt(Math.max(0.05, 1 - Math.min(1, q))) + 0.25);
      }
  }

  /** Ellipsoid filling the box (x, y, w, h) exactly: heads, eggs, fruit, lumps. */
  oval(x: number, y: number, w: number, h: number, c: string, opts: { depth?: number } = {}): void {
    const col = this.color(c), d = opts.depth ?? 1, rx = w / 2, ry = h / 2;
    for (let yy = 0; yy < h; yy++)
      for (let xx = 0; xx < w; xx++) {
        const dx = (xx + 0.5 - rx) / rx, dy = (yy + 0.5 - ry) / ry, q = dx * dx + dy * dy;
        if (q > 1.08) continue;
        this.surf(x + xx, y + yy, col, dx * d, dy * d, Math.sqrt(Math.max(0, 1 - Math.min(1, q))));
      }
  }

  /** Warm light pool: step what's here lighter inside an ellipse, dithered toward the rim (lamp light on walls). */
  pool(cx: number, cy: number, rx: number, ry: number, opts: ShadowOpts = {}): void {
    this.ellipseSteps(this.pal.stepMap(1), cx, cy, rx, ry, opts);
  }

  /** Remove surface normals in a region: what's painted there stays exactly as drawn (glowing panes, labels). */
  flat(where?: Region): void {
    const n = this.img.norm;
    if (!n) return;
    const ok = regionPred(where);
    for (let y = -this.oy; y < this.img.h - this.oy; y++)
      for (let x = -this.ox; x < this.img.w - this.ox; x++)
        if (ok(x, y) && (!this.clipPred || this.clipPred(x, y))) n[((this.oy + y) * this.img.w + this.ox + x) * 3 + 2] = 0;
  }

  // ---------------------------------------------------------------- surface textures
  // They paint seams in step colors onto what's there (only on `on` keys, default any opaque),
  // keeping the surface normals: draw the material first, then its construction.

  private seam(x: number, y: number, c: Resolved, on?: (x: number, y: number) => boolean): void {
    if (!on || on(x, y)) this.plot(x, y, c);
  }

  /** Floorboards / siding / decking: rows of boards `size` px apart with staggered butt joints. */
  planks(x: number, y: number, w: number, h: number, c: string, opts: TextureOpts = {}): void {
    const s = opts.size ?? 4, len = opts.len ?? 14, dark = this.color(opts.seam ?? `${c}-1`), lit = this.color(`${c}+1`);
    const on = opts.on ? this.maskAt(opts.on) : undefined, vert = opts.dir === "v";
    const W = vert ? h : w, H = vert ? w : h, at = (u: number, v: number, col: Resolved) => vert ? this.seam(x + v, y + u, col, on) : this.seam(x + u, y + v, col, on);
    for (let v = 0, row = 0; v < H; v += s, row++) {
      for (let u = 0; u < W; u++) at(u, v, dark);
      if (s > 2) for (let u = 0; u < W; u++) at(u, v + 1, lit);   // lit lip of each board
      const off = (row * 5) % len;
      for (let u = -off; u < W; u += len) if (u > 0) for (let k = 1; k < s; k++) at(u, v + k, dark);
    }
  }

  /** Brick / stone courses with offset joints. */
  bricks(x: number, y: number, w: number, h: number, c: string, opts: TextureOpts = {}): void {
    const bh = opts.size ?? 3, bw = opts.len ?? 7, dark = this.color(opts.seam ?? `${c}-1`), lit = this.color(`${c}+1`);
    const on = opts.on ? this.maskAt(opts.on) : undefined;
    for (let yy = 0, row = 0; yy < h; yy += bh + 1, row++) {
      for (let xx = 0; xx < w; xx++) this.seam(x + xx, y + yy + bh, dark, on);
      const off = row % 2 ? Math.floor(bw / 2) : 0;
      for (let xx = -off; xx < w; xx += bw + 1) {
        if (xx >= 0) for (let k = 0; k < bh; k++) this.seam(x + xx, y + yy + k, dark, on);
        if (xx + 1 >= 0 && xx + 1 < w) this.seam(x + xx + 1, y + yy, lit, on);   // a lit corner per brick
      }
    }
  }

  /** Square tiles with grout lines (floors, pools, kitchens). */
  tiles(x: number, y: number, w: number, h: number, c: string, opts: TextureOpts = {}): void {
    const s = opts.size ?? 5, dark = this.color(opts.seam ?? `${c}-1`), on = opts.on ? this.maskAt(opts.on) : undefined;
    for (let yy = 0; yy < h; yy++)
      for (let xx = 0; xx < w; xx++) if (xx % s === s - 1 || yy % s === s - 1) this.seam(x + xx, y + yy, dark, on);
  }

  /** Stripes of the given colors, each `size` px wide (awnings, wallpaper, umbrellas, towels). */
  stripes(x: number, y: number, w: number, h: number, colors: string | string[], opts: TextureOpts = {}): void {
    const cols = colorList(colors).map((k) => this.color(k)), s = opts.size ?? 2, on = opts.on ? this.maskAt(opts.on) : undefined;
    for (let yy = 0; yy < h; yy++)
      for (let xx = 0; xx < w; xx++) {
        let u = opts.dir === "h" ? yy : opts.dir === "d" ? xx + yy : xx, k: number;
        if (opts.center) {
          // Fan: stripes radiate from a point (umbrellas, parasols, sunbursts); size = degrees each.
          const a = (Math.atan2(y + yy - opts.center[1], x + xx - opts.center[0]) * 180) / Math.PI + 360;
          k = Math.floor(a / (opts.size ?? 20));
        } else k = Math.floor(u / s);
        this.seam(x + xx, y + yy, cols[((k % cols.length) + cols.length) % cols.length], on);
      }
  }

  /** Lay assets out in rows from (x, y), wrapping at width w, bottoms aligned (contact sheets, shelves, galleries). */
  arrange(x: number, y: number, w: number, names: string[], opts: { gap?: number } = {}): void {
    const gap = opts.gap ?? 4;
    const imgs = names.flatMap((n) => this.res.candidates(n)).map((n) => this.asset(n));
    let cx = x, row: Img[] = [], rowX: number[] = [], cy = y;
    const flush = () => {
      const rh = Math.max(0, ...row.map((i) => i.h));
      row.forEach((im, k) => this.put(im, rowX[k], cy + rh - im.h));
      cy += rh + gap; cx = x; row = []; rowX = [];
    };
    for (const im of imgs) {
      if (row.length && cx + im.w > x + w) flush();
      row.push(im); rowX.push(cx); cx += im.w + gap;
    }
    if (row.length) flush();
  }

  /** Soft contact / drop shadow: step what's here darker inside an ellipse, dithered at the rim. */
  shadow(cx: number, cy: number, rx: number, ry: number, opts: ShadowOpts = {}): void {
    this.ellipseSteps(this.pal.stepMap(-1), cx, cy, rx, ry, opts);
  }

  private ellipseSteps(map: Map<Color, Color>, cx: number, cy: number, rx: number, ry: number, opts: ShadowOpts): void {
    const steps = opts.steps ?? 1, soft = Math.max(0, Math.min(1, opts.soft ?? 0.45));
    const keys = opts.on ? this.maskAt(opts.on) : undefined;
    const e = (x: number, y: number) => ((x - cx) / (rx + 0.5)) ** 2 + ((y - cy) / (ry + 0.5)) ** 2;
    const core = (x: number, y: number) => e(x, y) <= 1 - soft && (!keys || keys(x, y));
    const rim = (x: number, y: number) => { const v = e(x, y); return v > 1 - soft && v <= 1 && (!keys || keys(x, y)); };
    this.remap(map, core, steps, 1);
    this.remap(map, rim, steps, 0.5);
    if (steps > 1) this.remap(map, (x, y) => e(x, y) <= (1 - soft) * 0.45 && (!keys || keys(x, y)), 1, 0.5);
  }

  // ---------------------------------------------------------------- environment brushes (nature.ts)

  water(x: number, y: number, w: number, h: number, c: string, opts: N.WaterOpts = {}): void { N.water(this, x, y, w, h, c, opts); }
  reflect(x: number, y: number, w: number, len: number, opts: N.ReflectOpts = {}): void { N.reflect(this, x, y, w, len, opts); }
  foam(around: string, opts: N.FoamOpts = {}): void { N.foam(this, around, opts); }
  caustics(x: number, y: number, w: number, h: number, opts: N.CausticsOpts = {}): void { N.caustics(this, x, y, w, h, opts); }
  palm(x: number, y: number, opts: N.PalmOpts = {}): void { N.palm(this, x, y, opts); }
  foliage(cx: number, cy: number, rx: number, ry: number, c: string, opts: N.FoliageOpts = {}): void { N.foliage(this, cx, cy, rx, ry, c, opts); }
  cloud(x: number, y: number, w: number, h: number, c: string, opts: N.CloudOpts = {}): void { N.cloud(this, x, y, w, h, c, opts); }
  mountain(x: number, baseY: number, w: number, h: number, c: string, opts: N.MountainOpts = {}): void { N.mountain(this, x, baseY, w, h, c, opts); }

  /** Text in the built-in 3x5 font. */
  text(x: number, y: number, s: string, c: string, opts: TextOpts = {}): void {
    s = String(s);
    if (opts.shadow) this.text(x + 1, y + 1, s, opts.shadow, { ...opts, shadow: undefined });
    const col = this.color(c);
    const sc = opts.scale ?? 1, gap = opts.gap ?? 1, lead = opts.lead ?? 1;
    let ly = y;
    for (const line of s.split("\n")) {
      const lw = lineWidth(line, opts);
      let cx = opts.align === "c" ? x - Math.floor(lw / 2) : opts.align === "r" ? x - lw + 1 : x;
      for (const ch of line) {
        const rows = glyph(ch);
        rows.forEach((row, r) => {
          for (let b = 0; b < row.length; b++)
            if (row[b] === "#")
              for (let yy = 0; yy < sc; yy++) for (let xx = 0; xx < sc; xx++) this.plot(cx + b * sc + xx, ly + r * sc + yy, col);
        });
        cx += (rows[0].length + gap) * sc;
      }
      ly += (5 + lead) * sc;
    }
  }
}

/** Start time (ms) of frame `n` of a timeline. */
export function frameStart(tl: Timeline, n: number): number {
  if (!tl.durations) return Math.max(0, Math.floor(n)) * tl.step;
  const d = tl.durations, k = ((Math.floor(n) % d.length) + d.length) % d.length;
  let t = 0;
  for (let i = 0; i < k; i++) t += d[i];
  return t;
}

/** Ops callable from art files; each top-level call can be traced as one painting step. */
export const OPS = [
  "px", "rect", "box", "line", "hline", "vline", "ellipse", "circ", "ring", "poly", "fill",
  "dither", "grad", "noise", "recolor", "shade", "light",
  "stamp", "tile", "pattern", "tilemap", "scatter", "grid", "wire", "text", "lamp", "bump", "normals",
  "arch", "ball", "oval", "dome", "cyl", "block", "tube", "form", "shadow", "pool", "flat", "planks", "bricks", "tiles", "stripes", "arrange",
  "water", "reflect", "foam", "caustics", "palm", "foliage", "cloud", "mountain",
] as const;
export type OpName = (typeof OPS)[number];

// Wrap ops so only the outermost call reports to onOp (ring -> ellipse, text -> plot, ...).
for (const name of OPS) {
  const proto = Canvas.prototype as unknown as Record<string, (...a: unknown[]) => unknown>;
  const fn = proto[name];
  proto[name] = function (this: Canvas, ...args: unknown[]) {
    this._depth++;
    let ok = false;
    try {
      const r = fn.apply(this, args);
      ok = true;
      return r;
    } finally {
      this._depth--;
      if (ok && this._depth === 0 && this.onOp) this.onOp(name, args);
    }
  };
}
