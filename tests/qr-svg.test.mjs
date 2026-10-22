// run with: node tests/qr-svg.test.mjs
import assert from "node:assert/strict";
import { buildSvg, QUIET_ZONE } from "../frontend/js/qr-svg.js";

const model = { getModuleCount: () => 2, isDark: (row, col) => row === col };
const total = 2 + QUIET_ZONE * 2;
const base = { model, colorDark: "#000000", colorLight: "#ffffff" };

const svg = buildSvg(base);
assert.ok(svg.includes(`viewBox="0 0 ${total} ${total}"`), "viewBox includes the quiet zone");
assert.ok(svg.includes(`M${QUIET_ZONE} ${QUIET_ZONE}h1v1h-1z`), "first dark module is offset by the quiet zone");
assert.ok(!svg.includes(`M${QUIET_ZONE + 1} ${QUIET_ZONE}h`), "light modules are not drawn");
assert.ok(svg.includes('<rect width="'), "background rect is drawn by default");
assert.ok(!buildSvg({ ...base, transparent: true }).includes("<rect"), "transparent drops the background");
assert.ok(buildSvg({ ...base, size: 256 }).includes('width="256"'), "size adds dimensions for the preview");
assert.ok(!svg.includes("width=\"256\""), "export svg has no fixed dimensions");

console.log("qr-svg: ok");
