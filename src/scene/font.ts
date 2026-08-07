import { rng } from './noise'
import type { Symmetry } from './types'

// 5x7 pixel font, carried over from the original block-letter tool.
export const GLYPH_W = 5
export const GLYPH_H = 7

export const FONT: Record<string, string[]> = {
  A: ['.XXX.', 'X...X', 'X...X', 'XXXXX', 'X...X', 'X...X', 'X...X'],
  B: ['XXXX.', 'X...X', 'X...X', 'XXXX.', 'X...X', 'X...X', 'XXXX.'],
  C: ['.XXX.', 'X...X', 'X....', 'X....', 'X....', 'X...X', '.XXX.'],
  D: ['XXXX.', 'X...X', 'X...X', 'X...X', 'X...X', 'X...X', 'XXXX.'],
  E: ['XXXXX', 'X....', 'X....', 'XXXX.', 'X....', 'X....', 'XXXXX'],
  F: ['XXXXX', 'X....', 'X....', 'XXXX.', 'X....', 'X....', 'X....'],
  G: ['.XXX.', 'X...X', 'X....', 'X.XXX', 'X...X', 'X...X', '.XXXX'],
  H: ['X...X', 'X...X', 'X...X', 'XXXXX', 'X...X', 'X...X', 'X...X'],
  I: ['.XXX.', '..X..', '..X..', '..X..', '..X..', '..X..', '.XXX.'],
  J: ['..XXX', '...X.', '...X.', '...X.', '...X.', 'X..X.', '.XX..'],
  K: ['X...X', 'X..X.', 'X.X..', 'XX...', 'X.X..', 'X..X.', 'X...X'],
  L: ['X....', 'X....', 'X....', 'X....', 'X....', 'X....', 'XXXXX'],
  M: ['X...X', 'XX.XX', 'X.X.X', 'X.X.X', 'X...X', 'X...X', 'X...X'],
  N: ['X...X', 'XX..X', 'X.X.X', 'X..XX', 'X...X', 'X...X', 'X...X'],
  O: ['.XXX.', 'X...X', 'X...X', 'X...X', 'X...X', 'X...X', '.XXX.'],
  P: ['XXXX.', 'X...X', 'X...X', 'XXXX.', 'X....', 'X....', 'X....'],
  Q: ['.XXX.', 'X...X', 'X...X', 'X...X', 'X.X.X', 'X..X.', '.XX.X'],
  R: ['XXXX.', 'X...X', 'X...X', 'XXXX.', 'X.X..', 'X..X.', 'X...X'],
  S: ['.XXXX', 'X....', 'X....', '.XXX.', '....X', '....X', 'XXXX.'],
  T: ['XXXXX', '..X..', '..X..', '..X..', '..X..', '..X..', '..X..'],
  U: ['X...X', 'X...X', 'X...X', 'X...X', 'X...X', 'X...X', '.XXX.'],
  V: ['X...X', 'X...X', 'X...X', 'X...X', 'X...X', '.X.X.', '..X..'],
  W: ['X...X', 'X...X', 'X...X', 'X.X.X', 'X.X.X', 'XX.XX', 'X...X'],
  X: ['X...X', 'X...X', '.X.X.', '..X..', '.X.X.', 'X...X', 'X...X'],
  Y: ['X...X', 'X...X', '.X.X.', '..X..', '..X..', '..X..', '..X..'],
  Z: ['XXXXX', '....X', '...X.', '..X..', '.X...', 'X....', 'XXXXX'],
  '0': ['.XXX.', 'X...X', 'X..XX', 'X.X.X', 'XX..X', 'X...X', '.XXX.'],
  '1': ['..X..', '.XX..', '..X..', '..X..', '..X..', '..X..', '.XXX.'],
  '2': ['.XXX.', 'X...X', '....X', '...X.', '..X..', '.X...', 'XXXXX'],
  '3': ['XXXXX', '...X.', '..X..', '...X.', '....X', 'X...X', '.XXX.'],
  '4': ['...X.', '..XX.', '.X.X.', 'X..X.', 'XXXXX', '...X.', '...X.'],
  '5': ['XXXXX', 'X....', 'XXXX.', '....X', '....X', 'X...X', '.XXX.'],
  '6': ['..XX.', '.X...', 'X....', 'XXXX.', 'X...X', 'X...X', '.XXX.'],
  '7': ['XXXXX', '....X', '...X.', '..X..', '.X...', '.X...', '.X...'],
  '8': ['.XXX.', 'X...X', 'X...X', '.XXX.', 'X...X', 'X...X', '.XXX.'],
  '9': ['.XXX.', 'X...X', 'X...X', '.XXXX', '....X', '...X.', '.XX..'],
  '!': ['..X..', '..X..', '..X..', '..X..', '..X..', '.....', '..X..'],
  '?': ['.XXX.', 'X...X', '....X', '...X.', '..X..', '.....', '..X..'],
  '+': ['.....', '..X..', '..X..', 'XXXXX', '..X..', '..X..', '.....'],
  '-': ['.....', '.....', '.....', 'XXXXX', '.....', '.....', '.....'],
  '/': ['....X', '....X', '...X.', '..X..', '.X...', 'X....', 'X....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.XX..', '.XX..'],
}

/** A glyph as a 35-character row-major mask, or null when unsupported. */
export function glyphMask(ch: string): string | null {
  const rows = FONT[ch.toUpperCase()]
  if (!rows) return null
  return rows.map(r => [...r].map(c => (c === 'X' ? '1' : '0')).join('')).join('')
}

export const isValidMask = (mask: string) => /^[01]{35}$/.test(mask)

/** Filled cells of a mask as {x, z}: x is the column, z the height off the ground. */
export function maskCells(mask: string): Array<{ x: number; z: number }> {
  const cells: Array<{ x: number; z: number }> = []
  for (let y = 0; y < GLYPH_H; y++) {
    for (let x = 0; x < GLYPH_W; x++) {
      if (mask[y * GLYPH_W + x] === '1') cells.push({ x, z: GLYPH_H - 1 - y })
    }
  }
  return cells
}

/**
 * An abstract block mark on the same 5x7 grid the letters use — so a generated
 * icon can be hand-tweaked afterwards in the very same editor.
 *
 * Symmetry is what separates a mark from noise: only the left half (or the top
 * left quadrant) is rolled, and the rest is reflected.
 */
export function generateMask(seed: number, density: number, symmetry: Symmetry): string {
  const rand = rng(Math.imul(seed || 1, 2246822519) ^ 0x27d4eb2d)
  for (let i = 0; i < 3; i++) rand()

  const grid = new Array(GLYPH_W * GLYPH_H).fill('0')
  const set = (x: number, y: number, on: boolean) => {
    if (x < 0 || x >= GLYPH_W || y < 0 || y >= GLYPH_H) return
    grid[y * GLYPH_W + x] = on ? '1' : '0'
  }

  const halfW = symmetry === 'none' ? GLYPH_W : Math.ceil(GLYPH_W / 2)
  const halfH = symmetry === 'quarter' ? Math.ceil(GLYPH_H / 2) : GLYPH_H
  const d = density / 100

  for (let y = 0; y < halfH; y++) {
    for (let x = 0; x < halfW; x++) {
      const on = rand() < d
      set(x, y, on)
      if (symmetry !== 'none') set(GLYPH_W - 1 - x, y, on)
      if (symmetry === 'quarter') {
        set(x, GLYPH_H - 1 - y, on)
        set(GLYPH_W - 1 - x, GLYPH_H - 1 - y, on)
      }
    }
  }

  // A mark that is nearly empty reads as a mistake rather than a design.
  const filled = grid.filter(c => c === '1').length
  if (filled < 6) {
    for (let y = 2; y < 5; y++) {
      set(2, y, true)
      set(1, y, true)
      set(3, y, true)
    }
  }
  return grid.join('')
}

/** The single editable character, or null when the text isn't exactly one glyph. */
export function soleGlyph(text: string): string | null {
  const chars = [...text.toUpperCase()].filter(ch => FONT[ch])
  return chars.length === 1 ? chars[0]! : null
}
