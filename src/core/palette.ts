import { type Color, parseHex, TRANSPARENT, toHex } from "./color.ts";
import { PxError, didYouMean } from "./errors.ts";
import { colorList } from "./util.ts";

export const INDEX_KEYS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const RESERVED = new Set([".", "_", " ", "#"]);

export const BUILTIN: Record<string, string[]> = {
  pico8: ["000000", "1d2b53", "7e2553", "008751", "ab5236", "5f574f", "c2c3c7", "fff1e8",
          "ff004d", "ffa300", "ffec27", "00e436", "29adff", "83769c", "ff77a8", "ffccaa"],
  sweetie16: ["1a1c2c", "5d275d", "b13e53", "ef7d57", "ffcd75", "a7f070", "38b764", "257179",
              "29366f", "3b5dc9", "41a6f6", "73eff7", "f4f4f4", "94b0c2", "566c86", "333c57"],
  db16: ["140c1c", "442434", "30346d", "4e4a4e", "854c30", "346524", "d04648", "757161",
         "597dce", "d27d2c", "8595a1", "6daa2c", "d2aa99", "6dc2ca", "dad45e", "deeed6"],
  endesga32: ["be4a2f", "d77643", "ead4aa", "e4a672", "b86f50", "733e39", "3e2731", "a22633",
              "e43b44", "f77622", "feae34", "fee761", "63c74d", "3e8948", "265c42", "193c3e",
              "124e89", "0099db", "2ce8f5", "ffffff", "c0cbdc", "8b9bb4", "5a6988", "3a4466",
              "262b44", "181425", "ff0044", "68386c", "b55088", "f6757a", "e8b796", "c28569"],
  gray8: ["000000", "242424", "494949", "6d6d6d", "929292", "b6b6b6", "dbdbdb", "ffffff"],
};

/** What a color spec resolves to: a color, or null for "skip this pixel". */
export type Resolved = Color | null;

/**
 * Immutable palette: single-char keys -> colors, plus light/dark ramps.
 * Ramps are strings of keys from dark to light ("kDdu"); shade() steps left, light() right.
 */
export class Palette {
  readonly keys: ReadonlyMap<string, Color>;
  readonly list: readonly Color[];
  readonly order: readonly string[];
  readonly aliases: ReadonlySet<string>;
  /** Ramps as key lists, dark -> light. Keys are single chars, or generated material keys ("o-2"). */
  readonly ramps: readonly (readonly string[])[];

  constructor(keys: Map<string, Color>, list: Color[], order: string[], aliases: Set<string>, ramps: (readonly string[])[]) {
    this.keys = keys;
    this.list = list;
    this.order = order;
    this.aliases = aliases;
    this.ramps = ramps;
  }

  static fromColors(colors: (string | number)[]): Palette {
    const keys = new Map<string, Color>(), list: Color[] = [], order: string[] = [];
    colors.forEach((c, i) => {
      const v = typeof c === "number" ? c >>> 0 : parseHex(c);
      if (v === undefined) throw new PxError(`bad palette color '${c}'`);
      list.push(v);
      const k = INDEX_KEYS[i];
      if (k) { keys.set(k, v); order.push(k); }
    });
    return new Palette(keys, list, order, new Set(), []);
  }

  static builtin(name: string): Palette {
    const cols = BUILTIN[name];
    if (!cols) throw new PxError(`unknown palette '${name}'${didYouMean(name, Object.keys(BUILTIN))} (have: ${Object.keys(BUILTIN).join(", ")})`);
    return Palette.fromColors(cols);
  }

  /** Add/override keys: { g: 11 (index), X: "#123456", h: "k" (copy another key) }. */
  extend(aliases: Record<string, string | number>): Palette {
    const keys = new Map(this.keys), order = [...this.order], al = new Set(this.aliases);
    for (const k of Object.keys(aliases)) {
      const v = aliases[k];
      if ([...k].length !== 1) throw new PxError(`palette key must be one character, got '${k}'`);
      if (RESERVED.has(k)) throw new PxError(`palette key '${k}' is reserved (. _ space #)`);
      let c: Color | undefined;
      if (typeof v === "number") {
        c = this.list[v];
        if (c === undefined) throw new PxError(`palette index ${v} out of range for key '${k}' (0..${this.list.length - 1})`);
      } else if ([...v].length === 1) {
        c = keys.get(v);
        if (c === undefined) throw new PxError(`key '${k}' refers to unknown key '${v}'`);
      } else {
        c = parseHex(v);
        if (c === undefined) throw new PxError(`bad color '${v}' for key '${k}' (use "#rrggbb")`);
      }
      if (!keys.has(k)) order.push(k);
      keys.set(k, c);
      al.add(k);
    }
    return new Palette(keys, [...this.list], order, al, [...this.ramps]);
  }

  withRamps(ramps: (string | readonly string[])[]): Palette {
    const lists = ramps.map((r) => (typeof r === "string" ? [...r] : [...r]));
    for (const r of lists)
      for (const k of r) if (!this.keys.has(k)) throw new PxError(`ramp "${r.join("")}" uses unknown key '${k}'${didYouMean(k, this.order)}`);
    return new Palette(new Map(this.keys), [...this.list], [...this.order], new Set(this.aliases), [...this.ramps, ...lists]);
  }

  /**
   * Add generated keys (material ramps): `named` keys are user-facing, the rest are derived
   * ("o-2", "o+1") and usable in ops but not in grid strings. The list becomes a ramp, dark -> light.
   */
  withMaterial(entries: [string, Color][], named: string): Palette {
    const keys = new Map(this.keys), order = [...this.order], al = new Set(this.aliases);
    for (const [k, c] of entries) {
      if (!keys.has(k)) order.push(k);
      keys.set(k, c);
      if (k === named) al.add(k);
    }
    // A redefined material replaces its old ramp.
    const ramps = this.ramps.filter((r) => !r.includes(named));
    return new Palette(keys, [...this.list], order, al, [...ramps, entries.map(([k]) => k)]);
  }

  /** Ramp containing color c and its index there (first ramp wins), or undefined. */
  rampOf(c: Color): { ramp: readonly Color[]; i: number } | undefined {
    this.rampIndex ??= (() => {
      const m = new Map<Color, { ramp: readonly Color[]; i: number }>();
      for (const r of this.ramps) {
        const cols = r.map((k) => this.keys.get(k)!);
        cols.forEach((col, i) => { if (!m.has(col)) m.set(col, { ramp: cols, i }); });
      }
      return m;
    })();
    return this.rampIndex.get(c);
  }
  private rampIndex?: Map<Color, { ramp: readonly Color[]; i: number }>;

  /** Key char, "#hex", "." (skip -> null) or "_" (erase -> transparent). */
  resolve(spec: unknown): Resolved {
    if (spec === "." ) return null;
    if (spec === "_") return TRANSPARENT;
    if (typeof spec === "number") return spec >>> 0;
    if (typeof spec !== "string" || spec === "") throw new PxError(`color must be a palette key or "#hex", got ${JSON.stringify(spec)}`);
    if (spec.startsWith("#")) {
      const c = parseHex(spec);
      if (c === undefined) throw new PxError(`bad color '${spec}'`);
      return c;
    }
    const c = this.keys.get(spec) ?? this.stepped(spec);
    if (c === undefined) {
      const hint = this.keys.has(spec.toLowerCase()) ? ` (did you mean '${spec.toLowerCase()}'?)`
        : this.keys.has(spec.toUpperCase()) ? ` (did you mean '${spec.toUpperCase()}'?)` : "";
      const named = this.order.filter((k) => [...k].length === 1);
      const steps = this.order.length > named.length ? '; material steps like "o-1" / "o+2" also work' : "";
      throw new PxError(`unknown color key '${spec}'${hint} (have: ${named.join("")}${steps})`);
    }
    return c;
  }

  /** Colors of a key list: keys, steps ("o-1"), hex, and families ("z*" = every tone of z's ramp). */
  resolveSet(keys: string | string[]): Set<Color> {
    const out = new Set<Color>();
    for (const k of colorList(keys)) {
      if (k.length > 1 && k.endsWith("*") && !k.startsWith("#")) {
        const base = this.resolve(k.slice(0, -1));
        const r = base === null ? undefined : this.rampOf(base);
        if (!r) throw new PxError(`'${k}': key '${k.slice(0, -1)}' is in no ramp, so it has no family`);
        r.ramp.forEach((c) => out.add(c));
        continue;
      }
      const c = this.resolve(k);
      if (c !== null) out.add(c);
    }
    return out;
  }

  /** "o-2" / "o+1": a key stepped along its ramp (clamped at the ends). */
  private stepped(spec: string): Color | undefined {
    // Chains add up: "p+1-1" = "p", handy when helpers build steps from a step.
    const m = /^(.+?)((?:[+-]\d+)+)$/u.exec(spec);
    if (!m) return undefined;
    const base = this.keys.get(m[1]);
    if (base === undefined) return undefined;
    const r = this.rampOf(base);
    if (!r) throw new PxError(`'${spec}': key '${m[1]}' is in no ramp (use material() or ramps())`);
    const off = (m[2].match(/[+-]\d+/g) ?? []).reduce((a, v) => a + Number(v), 0);
    return r.ramp[Math.max(0, Math.min(r.ramp.length - 1, r.i + off))];
  }

  /**
   * Color map for swap / recolor. When both sides are on ramps (materials), the whole ramp is
   * swapped step by step, aligned at the two keys: { h: "H" } recolors h-2..h+1 to H-2..H+1, so
   * variants work after form shading.
   */
  swapMap(swap: Record<string, string>): Map<Color, Color> {
    const m = new Map<Color, Color>();
    for (const from of Object.keys(swap)) {
      const a = this.resolve(from), b = this.resolve(swap[from]);
      if (a === null || b === null) continue;
      const ra = this.rampOf(a), rb = this.rampOf(b);
      if (ra && rb && ra.ramp !== rb.ramp) {
        ra.ramp.forEach((c, i) => {
          if (!m.has(c)) m.set(c, rb.ramp[Math.max(0, Math.min(rb.ramp.length - 1, rb.i + i - ra.i))]);
        });
      }
      m.set(a, b);
    }
    return m;
  }

  /** Map color -> darker (dir -1) or lighter (dir +1) neighbour along the ramps. */
  stepMap(dir: -1 | 1): Map<Color, Color> {
    if (!this.ramps.length) throw new PxError('no ramps defined: add ramps("kDdu", ...) (dark -> light) after pal()');
    const m = new Map<Color, Color>();
    for (const r of this.ramps) {
      const ks = r;
      for (let i = 0; i < ks.length; i++) {
        const to = ks[i + dir];
        if (to === undefined) continue;
        const a = this.keys.get(ks[i])!, b = this.keys.get(to)!;
        if (!m.has(a)) m.set(a, b);
      }
    }
    return m;
  }

  /** Color -> key, preferring named aliases over index keys. */
  reverse(): Map<Color, string> {
    const r = new Map<Color, string>();
    for (const k of this.order) {
      const c = this.keys.get(k)!;
      const cur = r.get(c);
      if (cur === undefined || (this.aliases.has(k) && !this.aliases.has(cur))) r.set(c, k);
    }
    return r;
  }

  /** Key -> "#hex" for viewers. */
  table(): Record<string, string> {
    const t: Record<string, string> = {};
    for (const k of this.order) t[k] = toHex(this.keys.get(k)!);
    return t;
  }
}
