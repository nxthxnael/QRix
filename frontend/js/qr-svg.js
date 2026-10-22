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

// model needs getModuleCount() and isDark(row, col); size adds width/height for the preview
export function buildSvg({ model, colorDark, colorLight, transparent = false, size, shape = "square" }) {
  const count = model.getModuleCount();
  const total = count + QUIET_ZONE * 2;
  const draw = SHAPES[shape] ?? square;
  let path = "";
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (!model.isDark(row, col)) continue;
      // finder squares stay square so the code scans reliably whatever the data shape is
      path += (isFinder(count, row, col) ? square : draw)(col + QUIET_ZONE, row + QUIET_ZONE);
    }
  }
  const dimensions = size ? ` width="${size}" height="${size}" style="max-width:100%;height:auto"` : "";
  const rendering = shape === "square" ? "crispEdges" : "geometricPrecision";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}"${dimensions} shape-rendering="${rendering}">` +
    (transparent ? "" : `<rect width="${total}" height="${total}" fill="${colorLight}"/>`) +
    `<path d="${path}" fill="${colorDark}"/></svg>`
  );
}
