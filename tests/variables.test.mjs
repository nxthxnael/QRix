// run with: node tests/variables.test.mjs
// plain css cannot share one block between "system prefers dark" and "visitor picked dark",
// so the dark palette is written twice; this keeps the two copies identical
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../frontend/css/variables.css", import.meta.url), "utf8");

// the declarations inside the first { } after a selector, normalised one per entry
function block(selector) {
  const start = css.indexOf(selector);
  assert.notEqual(start, -1, `${selector} exists`);
  const open = css.indexOf("{", start + selector.length);
  const body = css.slice(open + 1, css.indexOf("}", open));
  return body.split(";").map((line) => line.replace(/\/\*.*?\*\//gs, "").trim()).filter(Boolean).sort();
}

const systemDark = block(':root:not([data-theme="light"])');
const chosenDark = block(':root[data-theme="dark"]');
assert.ok(systemDark.length > 10, "the dark palette was found");
assert.deepEqual(chosenDark, systemDark, "the system dark and chosen dark palettes are identical");

const light = new Set(block(":root {").map((line) => line.split(":")[0]));
for (const line of systemDark) {
  const name = line.split(":")[0];
  if (name.startsWith("--")) assert.ok(light.has(name), `${name} also has a light value`);
}

console.log("variables: ok");
