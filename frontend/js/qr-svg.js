// clear border the qr standard asks for, measured in modules
export const QUIET_ZONE = 4;

// model needs getModuleCount() and isDark(row, col); size adds width/height for the preview
export function buildSvg({ model, colorDark, colorLight, transparent = false, size }) {
  const count = model.getModuleCount();
  const total = count + QUIET_ZONE * 2;
  let path = "";
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (model.isDark(row, col)) path += `M${col + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`;
    }
  }
  const dimensions = size ? ` width="${size}" height="${size}" style="max-width:100%;height:auto"` : "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}"${dimensions} shape-rendering="crispEdges">` +
    (transparent ? "" : `<rect width="${total}" height="${total}" fill="${colorLight}"/>`) +
    `<path d="${path}" fill="${colorDark}"/></svg>`
  );
}
