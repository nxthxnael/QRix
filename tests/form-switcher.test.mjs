// run with: node tests/form-switcher.test.mjs
import assert from "node:assert/strict";
import { initFormSwitcher } from "../frontend/js/form-switcher.js";

const types = ["url", "text", "phone", "wi-fi", "email"];
const events = [];
let focused = null;
const buttons = types.map((type, i) => {
  const button = { dataset: { type }, attrs: { "aria-checked": String(i === 0) }, tabIndex: i === 0 ? 0 : -1, handlers: {} };
  button.setAttribute = (name, value) => (button.attrs[name] = value);
  button.addEventListener = (name, fn) => (button.handlers[name] = fn);
  button.dispatchEvent = (e) => events.push(e);
  button.focus = () => (focused = button);
  return button;
});
const forms = types.map((type, i) => {
  const set = new Set(i === 0 ? ["active"] : []);
  return { dataset: { type }, classList: { toggle: (c, on) => (on ? set.add(c) : set.delete(c)), has: (c) => set.has(c) } };
});
globalThis.document = {
  querySelectorAll: (selector) => (selector === ".qr-type-btn" ? buttons : forms),
  getElementById: () => null,
  querySelector: () => null,
};
const checked = () => types.filter((_, i) => buttons[i].attrs["aria-checked"] === "true");
const key = (i, k) => buttons[i].handlers.keydown({ key: k, preventDefault() {} });

initFormSwitcher();
buttons[1].handlers.click();
assert.deepEqual(checked(), ["text"], "a click checks only that segment");
assert.ok(forms[1].classList.has("active") && !forms[0].classList.has("active"), "and shows its form");
assert.deepEqual(buttons.map((b) => b.tabIndex), [-1, 0, -1, -1, -1], "only the checked segment takes tab focus");
assert.equal(events.at(-1).type, "change", "switching fires change for the generator");
assert.equal(events.at(-1).bubbles, true, "and it bubbles up to the generator section");

key(1, "ArrowRight");
assert.deepEqual([checked(), focused.dataset.type], [["phone"], "phone"], "right arrow selects and focuses the next segment");
key(2, "ArrowLeft");
key(1, "ArrowLeft");
assert.deepEqual(checked(), ["url"], "left arrow moves back");
key(0, "ArrowLeft");
assert.deepEqual(checked(), ["email"], "arrows wrap around the ends");
key(4, "Home");
assert.deepEqual(checked(), ["url"], "home jumps to the first segment");
key(0, "End");
assert.deepEqual(checked(), ["email"], "end jumps to the last segment");
const before = events.length;
key(4, "a");
assert.equal(events.length, before, "other keys do nothing");

console.log("form-switcher: ok");
