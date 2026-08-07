// Deterministic noise. Everything here is a pure function of its arguments, so
// a seed always reproduces the same design.

export function hash2(x: number, y: number, seed: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 1274126177)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const smooth = (t: number) => t * t * (3 - 2 * t)
export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)
export const frac = (x: number) => x - Math.floor(x)
export const mod = (n: number, m: number) => ((n % m) + m) % m

export function vnoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x), iy = Math.floor(y)
  const sx = smooth(x - ix), sy = smooth(y - iy)
  const top = lerp(hash2(ix, iy, seed), hash2(ix + 1, iy, seed), sx)
  const bot = lerp(hash2(ix, iy + 1, seed), hash2(ix + 1, iy + 1, seed), sx)
  return lerp(top, bot, sy)
}

export function fbm(x: number, y: number, seed: number, octaves: number): number {
  let sum = 0, amp = 1, total = 0, f = 1
  for (let i = 0; i < octaves; i++) {
    sum += vnoise(x * f, y * f, seed + i * 101) * amp
    total += amp
    amp *= 0.5
    f *= 2
  }
  return sum / total
}

// Domain warping: offset the sample point by another noise field. Small amounts
// loosen up the grid; large amounts melt straight features into organic ones.
export function warpPoint(x: number, y: number, seed: number, amount: number): [number, number] {
  if (amount <= 0) return [x, y]
  const k = amount * 2.4
  return [
    x + (vnoise(x * 0.55 + 11.3, y * 0.55, seed + 991) - 0.5) * k,
    y + (vnoise(x * 0.55, y * 0.55 + 7.1, seed + 419) - 0.5) * k,
  ]
}

// mulberry32
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
