// The data an art file produces. Definitions are plain data + closures; nothing is drawn
// until build time, so references between assets are order-independent.
import type { Palette } from "./palette.ts";
import type { Canvas } from "./canvas.ts";
import type { Region } from "./util.ts";

/** A drawing op recorded with where it was written. */
export interface Op {
  __op: true;
  name: string;
  args: unknown[];
  loc?: string;
}

export interface LayerOpts {
  x?: number;
  y?: number;
  hidden?: boolean;
  /** Blend layer: instead of drawing, step what's below darker/lighter where this layer is opaque. */
  shade?: boolean | number | Record<string, string>;
  light?: boolean | number | Record<string, string>;
  /** Fraction (0..1) of a blend layer's pixels that apply (ordered dither). */
  density?: number;
  /** Opaque pixels block light (lighting()). */
  solid?: boolean;
  /** Opaque pixels are back walls: they stop sky light from entering but let light pass. */
  wall?: boolean;
  /** Pixels this layer leaves visible ignore lighting (skies, backdrops). */
  unlit?: boolean;
  /** Aerial perspective: push the layer this far (0..1) toward hazeColor before compositing. */
  haze?: number;
  /** Haze color: key or "#hex" (default: a pale sky blue). */
  hazeColor?: string;
}

export interface Layer {
  __layer: true;
  name: string;
  opts: LayerOpts;
  items: Item[];
  loc?: string;
}

/** Body items: grid strings, ops, custom functions, layers. */
export type Item = string | Op | Layer | ((c: Canvas) => void);

export interface AssetOpts {
  w?: number;
  h?: number;
  base?: string;
  mx?: boolean | "c";
  my?: boolean | "c";
  swap?: Record<string, string>;
  flip?: "x" | "y" | "xy";
  rot?: 90 | 180 | 270;
  /** Outline color, or "auto" for a selective outline (darkest tone of what it borders). */
  outline?: string;
  outline8?: string;
  /** false: outline only the outer silhouette; holes (lattices, nets, rings) stay open. */
  outlineHoles?: boolean;
  /** Sides that get no outline ("b" = bottom: things standing in water or cut by a frame). */
  outlineOpen?: string;
  /** false: ignore the project's ink() for this asset; a number overrides its mix (0.3 = light lines for foliage). */
  ink?: boolean | number;
  /** Inner contour lines: false = none for this asset, a number = strength. */
  inner?: boolean | number;
  /** Keys / families that never get inner lines (painted decoration: "a*q*" for a picture's sky and sea). */
  innerSkip?: string;
  /** Form-shade the finished asset (after mirror/flip/rot, before outline). */
  form?: boolean | import("./form.ts").FormOpts;
  crop?: boolean;
  /** Also export each layer as its own PNG. */
  layers?: boolean;
  /** Scene background color. */
  bg?: string;
  /** anim: default frame rate (frames per second, default 8). */
  fps?: number;
  /** anim: frame count when there are no frame() items (procedural, via c.frame / c.phase). */
  frames?: number;
  /** anim: false = play once and hold the last frame (default true). */
  loop?: boolean;
}

export type AssetKind = "sprite" | "scene" | "anim";

/** Options of a frame() item inside an anim. */
export interface FrameOpts {
  /** Duration in ms (default 1000 / fps). */
  ms?: number;
  /** Duration in frames of the anim's fps (2 = twice as long). */
  hold?: number;
}

/**
 * How an asset changes over time. Anims know their own frame durations; anything that places an
 * anim (sprites, scenes) inherits a combined loop and step.
 */
export interface Timeline {
  /** Loop length in ms. */
  loop: number;
  /** Time resolution in ms: frames change at multiples of this. */
  step: number;
  /** Own frame durations in ms (anims only). */
  durations?: number[];
  /** anim loop: false (holds the last frame). */
  once?: boolean;
}

export interface AssetDef {
  kind: AssetKind;
  name: string;
  opts: AssetOpts;
  items: Item[];
  pal: Palette;
  loc?: string;
}

export interface GroupDef {
  name: string;
  members: string[];
  loc?: string;
}

export interface SheetOpts {
  cols?: number;
  pad?: number;
}

export interface SheetDef {
  name: string;
  entries: string[];
  opts: SheetOpts;
  loc?: string;
}

/** Options for stamp / tile / pattern / tilemap / scatter / wire hangs. */
export interface PlaceOpts {
  flip?: "x" | "y" | "xy";
  rot?: 90 | 180 | 270;
  swap?: Record<string, string>;
  /** Random flips per placement. */
  rflip?: "x" | "y" | "xy";
  /** Random recolor per placement; {} = keep. */
  rswap?: Record<string, string>[];
  seed?: number;
  /** Rebuild the placed asset with its own random choices (true = derived from position). */
  reseed?: boolean | number;
  /** Animated assets: show this frame index, frozen. */
  frame?: number;
  /** Animated assets: start this many ms later (desync copies). */
  delay?: number;
  /** Animated assets: random start time per placement (true), seeded like other picks. */
  rdelay?: boolean;
  /** stamp: drop shadow onto what's behind (walls, floors): true or { dx, dy, steps, density }. */
  cast?: boolean | CastOpts;
  /** stamp: which point of the sprite (x, y) is: "tl" (default), "t", "tr", "l", "c", "r", "bl", "b", "br". */
  anchor?: "tl" | "t" | "tr" | "l" | "c" | "r" | "bl" | "b" | "br";
}

export interface CastOpts {
  /** Offset away from the light in px (default 2, 1: down-right for top-left light). */
  dx?: number;
  dy?: number;
  /** Ramp steps darker (default 1). */
  steps?: number;
  /** 0..1 dithered coverage for soft shadows (default 1). */
  density?: number;
}

export interface ScatterOpts extends PlaceOpts {
  /** Center must land on these keys ("*" = any opaque). */
  on?: string;
  /** Only paint onto `on` pixels. */
  clip?: boolean;
  /** Masks read the composite below the current layer instead of the layer itself. */
  below?: boolean;
}

export interface TilemapOpts extends PlaceOpts {
  map: Record<string, string>;
  size?: number;
  w?: number;
  h?: number;
  x?: number;
  y?: number;
}

export interface WireOpts extends PlaceOpts {
  hang?: string;
  every?: number;
  start?: number;
}

export interface LampOpts {
  /** Reach in pixels through open space (default 32). */
  r?: number;
  /** Light color: key or "#hex" (default white). */
  color?: string;
  /** Brightness multiplier at the source (default 1; > 1 overexposes). */
  power?: number;
  /** Height above the picture in px (default 8): lower = more raking light on normal maps. */
  z?: number;
}

export interface BumpOpts {
  /** "dome" (default): blobs bulge; "bevel": edges slope over `w` px; "luma": brighter = higher. */
  shape?: "dome" | "bevel" | "luma";
  /** Bevel width in px (default 2). */
  w?: number;
  /** Steepness multiplier (default 1). */
  depth?: number;
  /** Only these keys ("*" any opaque, default): other keys act as the edges (bevel each brick). */
  on?: string;
  /** Only pixels in this region. */
  where?: Region;
}

export interface LightingOpts {
  /** Light-grid cell size in px (default 4): bigger = blockier, Terraria-like. */
  cell?: number;
  /** Minimum light everywhere, 0..1 (default 0). */
  ambient?: number;
  /** Ambient light color (default white). */
  ambientColor?: string;
  /** Sky light level 0..1 for cells open to the sky (default 0 = none). */
  sky?: number;
  skyColor?: string;
  /** How far sky light spreads from open cells, in px (default 24). */
  skyReach?: number;
  /** Fraction of light lost per 8px of solid, 0..1 (default 0.4): brighter light reaches deeper. */
  block?: number;
  /** Interpolate between cells instead of blocky steps. */
  smooth?: boolean;
  /** Keys that ignore lighting (flames, windows, lava). */
  emit?: string;
  /** Spread shape: "round" (8 neighbours, default) or "diamond" (4, Terraria-like). */
  shape?: "round" | "diamond";
  /** How strongly normal maps (bump / normals) shape the light, 0 = ignore them (default 1). */
  relief?: number;
  /** Direction sky light comes from, [dx, dy] (default [0, -1]: straight down). */
  skyDir?: [number, number];
}

export interface GlowOpts {
  /** Only pixels inside this region glow (the halo itself can spread past it). */
  where?: Region;
  /** Halo radius in px (default 6). */
  r?: number;
  /** Color mode: how strongly the halo brightens what's around, 0..1+ (default 0.5). */
  strength?: number;
  /** Color mode: one tint for the halo instead of each glowing pixel's own color. */
  color?: string;
  /** Quantize the falloff into this many rings (crisp pixel-art halo); 0 = smooth (default). */
  bands?: number;
  /** Ramp mode: step neighbours up to this many shades lighter along the ramps (stays in palette). */
  ramp?: number;
}

export interface BallOpts {
  /** Vertical radius (oval); default r. */
  ry?: number;
  /** How strongly the sides curve away, 0..1+ (default 1; lower = flatter, like a cushion). */
  depth?: number;
}

export interface CylOpts {
  /** Height of the visible top ellipse in px (0 = pure side view). */
  cap?: number;
  /** Color of the top face (default: the body color). */
  capColor?: string;
  /** Px the middle swells (barrels, vases). */
  bulge?: number;
  /** Px each side narrows toward the bottom (pots, cups; negative widens). */
  taper?: number;
  /** "v" standing (default), "h" lying (logs, pipes): w/h stay the box size. */
  dir?: "v" | "h";
}

export interface BlockOpts {
  /** Height of the top face in px (0 = none). */
  top?: number;
  /** Width of the side face in px (0 = none). */
  side?: number;
  /** "r" (default) or "l". */
  sideAt?: "r" | "l";
  /** Px of rounded edge on the front face (default 1, 0 = sharp). */
  bevel?: number;
  topColor?: string;
  sideColor?: string;
}

export interface DomeOpts {
  /** Width of each scallop hanging under the rim in px (0 = straight rim). */
  scallop?: number;
  /** Shift the scallops sideways in px (line them up with stripes). */
  phase?: number;
  depth?: number;
}

export interface TextureOpts {
  /** Board / brick / tile / stripe size in px. */
  size?: number;
  /** Board or brick length in px. */
  len?: number;
  /** Seam color (default: one step darker than the material). */
  seam?: string;
  /** "h" (default) / "v" boards; stripes: "v" (default) / "h" / "d" diagonal. */
  dir?: "h" | "v" | "d";
  /** Only paint onto these keys. */
  on?: string;
  /** stripes: radiate from this point instead (fan stripes); size = degrees per stripe. */
  center?: [number, number];
}

export interface TubeOpts {
  /** Radius at the end point (default: same as the start). */
  r1?: number;
}

export interface ShadowOpts {
  /** Ramp steps darker (default 1). */
  steps?: number;
  /** Fraction of the radius that dithers out (default 0.45). */
  soft?: number;
  /** Only darken these keys. */
  on?: string;
}

export interface TextOpts {
  scale?: number;
  gap?: number;
  lead?: number;
  align?: "l" | "c" | "r";
  shadow?: string;
}

export type { Region };

export function isOp(v: unknown): v is Op {
  return typeof v === "object" && v !== null && (v as Op).__op === true;
}

export function isLayer(v: unknown): v is Layer {
  return typeof v === "object" && v !== null && (v as Layer).__layer === true;
}
