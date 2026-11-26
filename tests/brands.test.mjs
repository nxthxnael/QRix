// run with: node tests/brands.test.mjs
import assert from "node:assert/strict";
import { loadBrands, addBrand, defaultName, MAX_BRANDS } from "../frontend/js/brands.js";

// one color control is enough to check that stored styles are cleaned
const controls = { "qr-color-text": { tagName: "INPUT", type: "text" } };
globalThis.document = { getElementById: (id) => controls[id] };
const stored = {};
globalThis.localStorage = { getItem: (key) => stored[key] ?? null };

stored["qrix-brands"] = JSON.stringify([
  { name: "  Acme  ", style: { "qr-color-text": "#112233" } },
  { name: "Bad", style: { "qr-color-text": '"/><script>alert(1)</script>', "qr-logo": "x" } },
  { name: 5, style: {} },
  { name: "x".repeat(50), style: null },
  { name: "Fourth", style: {} },
]);
assert.deepEqual(loadBrands(), [
  { name: "Acme", style: { "qr-color-text": "#112233" } },
  { name: "Bad", style: {} },
  { name: "x".repeat(30), style: {} },
], "names are trimmed and cut, bad entries and markup-carrying values are dropped, at most three are kept");

stored["qrix-brands"] = "not json";
assert.deepEqual(loadBrands(), [], "a broken entry loads as no styles");
stored["qrix-brands"] = JSON.stringify({ name: "A" });
assert.deepEqual(loadBrands(), [], "a non-list loads as no styles");
globalThis.localStorage = { getItem() { throw new Error("blocked"); } };
assert.deepEqual(loadBrands(), [], "blocked storage loads as no styles");

const two = [{ name: "A", style: {} }, { name: "B", style: {} }];
assert.deepEqual(addBrand(two, "C", { k: 1 }).map((b) => b.name), ["A", "B", "C"], "a new name is added at the end");
assert.deepEqual(addBrand(two, "A", { k: 2 }), [{ name: "B", style: {} }, { name: "A", style: { k: 2 } }], "the same name replaces the old style");
const full = [...two, { name: "C", style: {} }];
assert.equal(full.length, MAX_BRANDS);
assert.equal(addBrand(full, "D", {}), null, "a full list takes no new name");
assert.equal(addBrand(full, "B", {}).length, MAX_BRANDS, "a full list can still replace a style by name");

assert.equal(defaultName([]), "My style 1");
assert.equal(defaultName([{ name: "My style 1" }, { name: "My style 3" }]), "My style 2", "the default name takes the lowest free number");

console.log("brands: ok");
