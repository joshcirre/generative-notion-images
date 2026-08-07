// Shared pieces for the isometric block tools (index.html, header.html).
// Plain script, not a module, so both pages still open straight off disk.
const ISO = (() => {

// ---------- 5x7 pixel font ----------
const FONT = {
  A:['.XXX.','X...X','X...X','XXXXX','X...X','X...X','X...X'],
  B:['XXXX.','X...X','X...X','XXXX.','X...X','X...X','XXXX.'],
  C:['.XXX.','X...X','X....','X....','X....','X...X','.XXX.'],
  D:['XXXX.','X...X','X...X','X...X','X...X','X...X','XXXX.'],
  E:['XXXXX','X....','X....','XXXX.','X....','X....','XXXXX'],
  F:['XXXXX','X....','X....','XXXX.','X....','X....','X....'],
  G:['.XXX.','X...X','X....','X.XXX','X...X','X...X','.XXXX'],
  H:['X...X','X...X','X...X','XXXXX','X...X','X...X','X...X'],
  I:['.XXX.','..X..','..X..','..X..','..X..','..X..','.XXX.'],
  J:['..XXX','...X.','...X.','...X.','...X.','X..X.','.XX..'],
  K:['X...X','X..X.','X.X..','XX...','X.X..','X..X.','X...X'],
  L:['X....','X....','X....','X....','X....','X....','XXXXX'],
  M:['X...X','XX.XX','X.X.X','X.X.X','X...X','X...X','X...X'],
  N:['X...X','XX..X','X.X.X','X..XX','X...X','X...X','X...X'],
  O:['.XXX.','X...X','X...X','X...X','X...X','X...X','.XXX.'],
  P:['XXXX.','X...X','X...X','XXXX.','X....','X....','X....'],
  Q:['.XXX.','X...X','X...X','X...X','X.X.X','X..X.','.XX.X'],
  R:['XXXX.','X...X','X...X','XXXX.','X.X..','X..X.','X...X'],
  S:['.XXXX','X....','X....','.XXX.','....X','....X','XXXX.'],
  T:['XXXXX','..X..','..X..','..X..','..X..','..X..','..X..'],
  U:['X...X','X...X','X...X','X...X','X...X','X...X','.XXX.'],
  V:['X...X','X...X','X...X','X...X','X...X','.X.X.','..X..'],
  W:['X...X','X...X','X...X','X.X.X','X.X.X','XX.XX','X...X'],
  X:['X...X','X...X','.X.X.','..X..','.X.X.','X...X','X...X'],
  Y:['X...X','X...X','.X.X.','..X..','..X..','..X..','..X..'],
  Z:['XXXXX','....X','...X.','..X..','.X...','X....','XXXXX'],
  '0':['.XXX.','X...X','X..XX','X.X.X','XX..X','X...X','.XXX.'],
  '1':['..X..','.XX..','..X..','..X..','..X..','..X..','.XXX.'],
  '2':['.XXX.','X...X','....X','...X.','..X..','.X...','XXXXX'],
  '3':['XXXXX','...X.','..X..','...X.','....X','X...X','.XXX.'],
  '4':['...X.','..XX.','.X.X.','X..X.','XXXXX','...X.','...X.'],
  '5':['XXXXX','X....','XXXX.','....X','....X','X...X','.XXX.'],
  '6':['..XX.','.X...','X....','XXXX.','X...X','X...X','.XXX.'],
  '7':['XXXXX','....X','...X.','..X..','.X...','.X...','.X...'],
  '8':['.XXX.','X...X','X...X','.XXX.','X...X','X...X','.XXX.'],
  '9':['.XXX.','X...X','X...X','.XXXX','....X','...X.','.XX..'],
};
const GLYPH_W = 5, GLYPH_H = 7;

// ---------- isometric cube metrics ----------
const EDGE = 40;                          // vertical edge of a cube
const HW = EDGE * Math.cos(Math.PI / 6);  // half-width of the top rhombus
const HH = EDGE / 2;                      // half-height of the top rhombus

// ---------- color helpers ----------
function hexToHsl(hex) {
  const n = parseInt(hex.slice(1), 16);
  let r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h * 360, s * 100, l * 100];
}
function hslToHex(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  const f = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = f(p, q, h + 1/3); g = f(p, q, h); b = f(p, q, h - 1/3);
  }
  const to = v => Math.round(v * 255).toString(16).padStart(2, '0');
  return '#' + to(r) + to(g) + to(b);
}
function shadesFromBase(base) {
  const [h, s, l] = hexToHsl(base);
  return {
    top: hslToHex(h, Math.max(s - 4, 0), Math.min(l + 15, 92)),
    left: hslToHex(h, s, Math.max(l - 11, 6)),
    right: base,
  };
}
// Lightened / desaturated version of a color, for tints and backdrops.
function tint(base, amount) {
  const [h, s, l] = hexToHsl(base);
  return hslToHex(h, s * (1 - amount * 0.55), l + (100 - l) * amount);
}
// Straight RGB blend, for stepping a color ramp.
function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = shift => Math.round(((pa >> shift) & 255) + (((pb >> shift) & 255) - ((pa >> shift) & 255)) * t);
  return '#' + [ch(16), ch(8), ch(0)].map(v => v.toString(16).padStart(2, '0')).join('');
}

const PRESETS = ['#d9411e', '#1e6fd9', '#1f9d55', '#7c3aed', '#e8930c', '#d92662', '#0d9494', '#3d4451'];

// ---------- geometry ----------
// Cells of a glyph as {x, z}: x is the column, z the height off the ground.
function glyphCells(ch) {
  const glyph = FONT[ch];
  if (!glyph) return null;
  const cells = [];
  for (let y = 0; y < GLYPH_H; y++)
    for (let x = 0; x < GLYPH_W; x++)
      if (glyph[y][x] === 'X') cells.push({ x, z: GLYPH_H - 1 - y });
  return cells;
}

// Top-face edge extents (in cube units) for a tilt direction and block depth.
// The glyph runs along one horizontal axis, the depth along the other.
function extents(dir, depth) {
  return dir === 'rise'
    ? { dl: depth, dr: 1, riseSign: -1 }
    : { dl: 1, dr: depth, riseSign: 1 };
}

// The three visible faces of one block, as [points, fill] pairs.
// (Sx, Sy) is the bottom corner of the block's top face; s scales the cube.
function blockFaces(Sx, Sy, dl, dr, colors, s = 1) {
  const hw = HW * s, hh = HH * s, e = EDGE * s;
  const Wx = Sx - dl * hw, Wy = Sy - dl * hh;               // up-left corner
  const Ex = Sx + dr * hw, Ey = Sy - dr * hh;               // up-right corner
  const Tx = Sx + (dr - dl) * hw, Ty = Sy - (dr + dl) * hh; // back corner
  return [
    [`${Wx},${Wy} ${Tx},${Ty} ${Ex},${Ey} ${Sx},${Sy}`, colors.top],
    [`${Wx},${Wy} ${Sx},${Sy} ${Sx},${Sy + e} ${Wx},${Wy + e}`, colors.left],
    [`${Sx},${Sy} ${Ex},${Ey} ${Ex},${Ey + e} ${Sx},${Sy + e}`, colors.right],
  ];
}

// Screen-space bounds of a block, given the same arguments as blockFaces.
function blockBounds(Sx, Sy, dl, dr, s = 1) {
  return {
    minX: Sx - dl * HW * s, maxX: Sx + dr * HW * s,
    minY: Sy - (dl + dr) * HH * s, maxY: Sy + EDGE * s,
  };
}

// ---------- painting ----------
// polys is [[points, fill], ...] in back-to-front order. Self-stroking each
// face closes antialiasing gaps between adjacent polygons.
// seamColor paints the seams between blocks; pass null to cut them out
// instead, so whatever is behind (background, gradient, nothing) shows through.
function paintPolys(polys, { seam = 0, seamColor = null, id = 'seams' } = {}) {
  const fills = polys.map(([p, f]) =>
    `<polygon points="${p}" fill="${f}" stroke="${f}" stroke-width="0.75"/>`).join('');
  if (seam <= 0) return fills;
  if (seamColor) {
    return polys.map(([p, f]) =>
      `<polygon points="${p}" fill="${f}" stroke="${seamColor}" stroke-width="${seam}" stroke-linejoin="round"/>`).join('');
  }
  // Mask: white keeps the face, black seam lines cut gaps. Same paint order as
  // the fills, so nearer blocks cover the seams of the blocks they hide.
  const mask = polys.map(([p]) =>
    `<polygon points="${p}" fill="#fff" stroke="#000" stroke-width="${seam}" stroke-linejoin="round"/>`).join('');
  return `<defs><mask id="${id}">${mask}</mask></defs><g mask="url(#${id})">${fills}</g>`;
}

// ---------- misc ----------
// mulberry32 — seeded so a given seed always lays out the same scatter.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function download(url, name) {
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
}

// Rasterize an SVG string to a PNG download at an exact pixel size.
function exportPNG(svg, w, h, name) {
  const sized = svg.replace('<svg ', `<svg width="${w}" height="${h}" `);
  const url = URL.createObjectURL(new Blob([sized], { type: 'image/svg+xml' }));
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(url);
    canvas.toBlob(blob => {
      const pngUrl = URL.createObjectURL(blob);
      download(pngUrl, name);
      setTimeout(() => URL.revokeObjectURL(pngUrl), 5000);
    }, 'image/png');
  };
  img.src = url;
}

function exportSVG(svg, name) {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  download(url, name);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

return { FONT, GLYPH_W, GLYPH_H, EDGE, HW, HH, PRESETS,
         hexToHsl, hslToHex, shadesFromBase, tint, mix,
         glyphCells, extents, blockFaces, blockBounds, paintPolys,
         rng, download, exportPNG, exportSVG };
})();

if (typeof module !== 'undefined') module.exports = ISO; // also usable from node
