// Registry of line colors made by mixing a material color toward the ink, so swap/recolor can
// follow them: a variant that swaps t -> o also swaps the teal-ink lines to coral-ink lines.
import { type Color, channels, pack } from "./color.ts";

const made = new Map<Color, { src: Color; ink: Color; t: number }>();

export function mixRgb(a: Color, b: Color, t: number): Color {
  const [r1, g1, b1] = channels(a), [r2, g2, b2] = channels(b);
  return pack(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

/** Mix src toward ink and remember where the result came from. */
export function inked(src: Color, ink: Color, t: number): Color {
  const c = mixRgb(src, ink, t);
  if (c !== src && !made.has(c)) made.set(c, { src, ink, t });
  return c;
}

/** Extend a color map so inked versions of mapped colors map to inked versions of their targets. */
export function followInk(m: Map<Color, Color>): void {
  for (const [c, info] of made) {
    if (m.has(c)) continue;
    const to = m.get(info.src);
    if (to !== undefined) m.set(c, mixRgb(to, info.ink, info.t));
  }
}
