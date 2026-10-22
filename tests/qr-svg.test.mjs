// run with: node tests/qr-svg.test.mjs
import assert from "node:assert/strict";
import { buildSvg, QUIET_ZONE } from "../frontend/js/qr-svg.js";

const model = { getModuleCount: () => 2, isDark: (row, col) => row === col };
const total = 2 + QUIET_ZONE * 2;
const base = { model, colorDark: "#000000", colorLight: "#ffffff" };

const svg = buildSvg(base);
assert.ok(svg.includes(`viewBox="0 0 ${total} ${total}"`), "viewBox includes the quiet zone");
assert.ok(svg.includes(`M${QUIET_ZONE} ${QUIET_ZONE}h7v7h-7z`), "finder is drawn whole, offset by the quiet zone");
assert.ok(!svg.includes(`M${QUIET_ZONE + 1} ${QUIET_ZONE}h1`), "finder modules are not drawn one by one");
assert.ok(svg.includes('<rect width="'), "background rect is drawn by default");
assert.ok(!buildSvg({ ...base, transparent: true }).includes("<rect"), "transparent drops the background");
assert.ok(buildSvg({ ...base, size: 256 }).includes('width="256"'), "size adds dimensions for the preview");
assert.ok(!svg.includes("width=\"256\""), "export svg has no fixed dimensions");

const big = { getModuleCount: () => 21, isDark: (row, col) => (row === 10 && col === 10) || (row === 0 && col === 0) };
const rounded = buildSvg({ ...base, model: big, shape: "rounded" });
assert.ok(rounded.includes("a0.3 0.3"), "rounded shape draws arcs for data modules");
assert.ok(rounded.includes(`M${QUIET_ZONE} ${QUIET_ZONE}h7v7h-7z`), "finders stay square with the square corner style");
assert.ok(buildSvg({ ...base, model: big, shape: "dots" }).includes("a0.5 0.5"), "dots shape draws circles");
assert.ok(buildSvg({ ...base, model: big, shape: "nope" }).includes("h1v1h-1z"), "unknown shape falls back to square");
assert.ok(buildSvg({ ...base, model: big, corner: "rounded" }).includes("a1.6 1.6"), "rounded corner style rounds the finder ring");
assert.ok(buildSvg({ ...base, model: big, corner: "circle" }).includes("a3.5 3.5"), "circle corner style draws a round finder");
assert.ok(buildSvg({ ...base, model: big, corner: "nope" }).includes(`M${QUIET_ZONE} ${QUIET_ZONE}h7v7h-7z`), "unknown corner falls back to square");

console.log("qr-svg: ok");
