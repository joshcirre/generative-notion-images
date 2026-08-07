import { clamp, clamp01 } from './noise'

export type HSL = [number, number, number]
export type Faces = { top: string; left: string; right: string }

export function hexToHsl(hex: string): HSL {
  const n = parseInt(hex.slice(1), 16)
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }
  return [h * 360, s * 100, l * 100]
}

export function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360 / 360
  s = clamp(s, 0, 100) / 100
  l = clamp(l, 0, 100) / 100
  const f = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  let r: number, g: number, b: number
  if (s === 0) { r = g = b = l } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = f(p, q, h + 1 / 3); g = f(p, q, h); b = f(p, q, h - 1 / 3)
  }
  const to = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0')
  return '#' + to(r) + to(g) + to(b)
}

export function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16)
  const ch = (shift: number) => {
    const x = (pa >> shift) & 255, y = (pb >> shift) & 255
    return Math.round(x + (y - x) * clamp01(t))
  }
  return '#' + [ch(16), ch(8), ch(0)].map(v => v.toString(16).padStart(2, '0')).join('')
}

export function tint(base: string, amount: number): string {
  const [h, s, l] = hexToHsl(base)
  return hslToHex(h, s * (1 - amount * 0.55), l + (100 - l) * amount)
}

/**
 * Face shading for one block color.
 *
 * `light` is a compass angle: it decides which of the two visible side faces
 * catches the light and which falls into shade, so the whole scene reads as lit
 * from one direction. `contrast` scales how far apart the three faces sit.
 */
export function facesFor(base: string, light: number, contrast: number): Faces {
  const [h, s, l] = hexToHsl(base)
  const k = contrast / 100
  const rad = (light * Math.PI) / 180
  // Left faces point down-left, right faces down-right; project the light onto
  // each normal so rotating the source swaps which side is bright.
  const leftFacing = Math.cos(rad - (5 * Math.PI) / 4)
  const rightFacing = Math.cos(rad - (7 * Math.PI) / 4)
  const shade = (facing: number) => hslToHex(h, s, clamp(l + facing * 13 * k - 8 * k, 4, 96))
  return {
    top: hslToHex(h, Math.max(s - 4 * k, 0), clamp(l + 15 * k, 4, 94)),
    left: shade(leftFacing),
    right: shade(rightFacing),
  }
}

/** Darken a color toward black — used for the light falling off down a column. */
export function darken(hex: string, amount: number): string {
  const [h, s, l] = hexToHsl(hex)
  return hslToHex(h, s, l * (1 - clamp01(amount)))
}

export function lighten(hex: string, amount: number): string {
  const [h, s, l] = hexToHsl(hex)
  return hslToHex(h, s, l + (100 - l) * clamp01(amount))
}
