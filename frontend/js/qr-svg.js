// clear border the qr standard asks for, measured in modules
export const QUIET_ZONE = 4;

const FINDER = 7;

// the three 7x7 position squares scanners lock onto
const isFinder = (count, row, col) =>
  (row < FINDER && (col < FINDER || col >= count - FINDER)) || (row >= count - FINDER && col < FINDER);

const square = (x, y) => `M${x} ${y}h1v1h-1z`;

const rounded = (x, y) =>
  `M${x + 0.3} ${y}h0.4a0.3 0.3 0 0 1 0.3 0.3v0.4a0.3 0.3 0 0 1-0.3 0.3h-0.4a0.3 0.3 0 0 1-0.3-0.3v-0.4a0.3 0.3 0 0 1 0.3-0.3z`;

// shortcut: full-diameter dots, smaller ones failed to decode in jsQR; shrink only after real phone scan tests
const dots = (x, y) => `M${x} ${y + 0.5}a0.5 0.5 0 1 0 1 0a0.5 0.5 0 1 0-1 0z`;

export const SHAPES = { square, rounded, dots };

// [x1, y1, x2, y2] of the linear gradient across the code, as fractions of its box
const GRADIENTS = { horizontal: [0, 0, 1, 0], vertical: [0, 0, 0, 1], diagonal: [0, 0, 1, 1] };

// clockwise and counter-clockwise rounded rects; the opposite winding cuts the ring hole
const rr = (x, y, w, h, r) =>
  `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1-${r} ${r}h-${w - 2 * r}a${r} ${r} 0 0 1-${r}-${r}v-${h - 2 * r}a${r} ${r} 0 0 1 ${r}-${r}z`;
const rrHole = (x, y, w, h, r) =>
  `M${x + r} ${y}a${r} ${r} 0 0 0-${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 0 ${r} ${r}h${w - 2 * r}a${r} ${r} 0 0 0 ${r}-${r}v-${h - 2 * r}a${r} ${r} 0 0 0-${r}-${r}z`;

// outer ring radius, ring hole radius, centre radius for each corner style
const CORNERS = { square: [0, 0, 0], rounded: [1.6, 0.8, 0.8], circle: [3.5, 2.5, 1.5] };

function finder(x, y, style) {
  const [outer, hole, center] = CORNERS[style] ?? CORNERS.square;
  if (!outer) return `M${x} ${y}h7v7h-7zM${x + 1} ${y + 1}v5h5v-5zM${x + 2} ${y + 2}h3v3h-3z`;
  return rr(x, y, 7, 7, outer) + rrHole(x + 1, y + 1, 5, 5, hole) + rr(x + 2, y + 2, 3, 3, center);
}

// model needs getModuleCount() and isDark(row, col); size adds width/height for the preview
export function buildSvg({
  model,
  colorDark,
  colorLight,
  colorDark2,
  gradient = "none",
  transparent = false,
  size,
  shape = "square",
  corner = "square",
}) {
  const count = model.getModuleCount();
  const total = count + QUIET_ZONE * 2;
  const draw = SHAPES[shape] ?? square;
  let path = "";
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (model.isDark(row, col) && !isFinder(count, row, col)) path += draw(col + QUIET_ZONE, row + QUIET_ZONE);
    }
  }
  // finders are drawn whole so their ring and centre can take a corner style
  for (const [row, col] of [[0, 0], [0, count - FINDER], [count - FINDER, 0]]) {
    path += finder(col + QUIET_ZONE, row + QUIET_ZONE, corner);
  }
  const dimensions = size ? ` width="${size}" height="${size}" style="max-width:100%;height:auto"` : "";
  const vector = GRADIENTS[gradient];
  const defs = vector
    ? `<defs><linearGradient id="qr-gradient-fill" x1="${vector[0]}" y1="${vector[1]}" x2="${vector[2]}" y2="${vector[3]}"><stop offset="0" stop-color="${colorDark}"/><stop offset="1" stop-color="${colorDark2}"/></linearGradient></defs>`
    : "";
  const fill = vector ? "url(#qr-gradient-fill)" : colorDark;
  const rendering = shape === "square" && corner === "square" ? "crispEdges" : "geometricPrecision";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}"${dimensions} shape-rendering="${rendering}">` +
    defs +
    (transparent ? "" : `<rect width="${total}" height="${total}" fill="${colorLight}"/>`) +
    `<path d="${path}" fill="${fill}"/></svg>`
  );
}
