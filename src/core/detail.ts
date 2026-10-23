// detail(k): author in logical pixels, render at k times the resolution.
//
// Every op called from an art file gets its geometry scaled by k before it runs: positions and
// sizes grow, so form primitives, curves, palms, foliage and textures come out with k times the
// detail. Lengths of 1 px stay 1 px (seams, rails, cords, outlines), which is exactly what makes a
// detailed render look finer instead of just bigger. Single pixels (px, grid chars) become k x k
// blocks so hand-placed pixel art keeps its shape.
import type { Region } from "./util.ts";

/** Per op, the kind of each positional argument: p position, l length, a point list, r region, o options, - untouched. */
const ARGS: Record<string, string> = {
  px: "pp-", dot: "pp-", rect: "ppll-", box: "ppll-", line: "pppp-l", hline: "ppl-", vline: "ppl-",
  ellipse: "ppll--", circ: "ppl-", ring: "ppl-", poly: "a-", fill: "pp-",
  dither: "ppll---", grad: "ppll---", noise: "ppll----", recolor: "-r-", shade: "r--", light: "r--",
  stamp: "-ppo", tile: "-pp--o", pattern: "-ppllo", tilemap: "-o", scatter: "-ppll-o",
  wire: "ppppl-o", text: "pp--o", lamp: "ppo", bump: "-o",
  arch: "ppll--", ball: "ppl-o", oval: "ppll-o", dome: "ppll-o", cyl: "ppll-o", block: "ppll-o", tube: "ppppl-o",
  form: "o", shadow: "ppllo", pool: "ppllo", flat: "r",
  planks: "ppll-o", bricks: "ppll-o", tiles: "ppll-o", stripes: "ppll-o", arrange: "ppl-o",
  water: "ppll-o", reflect: "ppllo", foam: "-o", caustics: "ppllo", palm: "ppo", foliage: "ppll-o", cloud: "ppll-o", mountain: "ppll-o",
  glow: "-o", lighting: "o", clip: "r",
};

/** Option keys holding lengths (numbers or number pairs) or positions. */
const LEN_KEYS = new Set([
  "r", "r1", "ry", "z", "w", "cap", "top", "side", "bevel", "bulge", "taper", "size", "len", "h", "lean",
  "gap", "every", "start", "reflectLen", "shadow", "scallop", "x", "y", "scale", "cell", "skyReach", "sag", "dx", "dy",
]);

const len = (v: number, k: number) => (Math.abs(v) <= 1 ? v : v * k);

function scaleRegion(r: Region, k: number): Region {
  if (r == null) return r;
  if (typeof r === "function") return (x: number, y: number) => r(Math.floor(x / k), Math.floor(y / k));
  if (Array.isArray(r)) return r.length === 3 ? [r[0] * k, r[1] * k, r[2] * k] : r.map((v) => v * k);
  return r;
}

function scaleOpts(name: string, o: Record<string, unknown>, k: number): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(o)) {
    if (key === "where") out[key] = scaleRegion(v as Region, k);
    else if (key === "cast" && v && typeof v === "object") out[key] = scaleOpts("cast", v as Record<string, unknown>, k);
    else if (key === "cast" && v === true) out[key] = { dx: 2 * k, dy: k };
    else if (key === "center" && Array.isArray(v)) out[key] = v.map((n) => (n as number) * k);
    // stripes in fan mode: size is degrees, not pixels; text/caustics scale is a factor of k
    else if (key === "size" && name === "stripes" && o.center) out[key] = v;
    else if (LEN_KEYS.has(key) && typeof v === "number") out[key] = len(v, k);
    else if (LEN_KEYS.has(key) && Array.isArray(v) && v.every((n) => typeof n === "number")) out[key] = v.map((n) => len(n as number, k));
    else out[key] = v;
  }
  if (name === "text") out.scale = ((o.scale as number) ?? 1) * k;
  return out;
}

/** Scale an op call's arguments for detail k (k = 1 returns them unchanged). */
export function scaleArgs(name: string, args: unknown[], k: number): unknown[] {
  if (k === 1) return args;
  const spec = ARGS[name];
  if (!spec) return args;
  return args.map((v, i) => {
    const t = spec[i] ?? "-";
    if (t === "p" && typeof v === "number") return v * k;
    if (t === "l" && typeof v === "number") return len(v, k);
    if (t === "a" && Array.isArray(v)) return v.map((n) => (typeof n === "number" ? n * k : n));
    if (t === "r") return scaleRegion(v as Region, k);
    if (t === "o" && v && typeof v === "object" && !Array.isArray(v)) return scaleOpts(name, v as Record<string, unknown>, k);
    return v;
  });
}
