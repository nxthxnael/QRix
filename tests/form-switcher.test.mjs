// run with: node tests/form-switcher.test.mjs
import assert from "node:assert/strict";
import { initFormSwitcher } from "../frontend/js/form-switcher.js";

const classList = () => {
  const set = new Set();
  return { add: (c) => set.add(c), remove: (c) => set.delete(c), toggle: (c, on) => (on ? set.add(c) : set.delete(c)), has: (c) => set.has(c) };
};
const events = [];
const buttons = ["url", "text"].map((type) => {
  const button = { dataset: { type }, classList: classList(), dispatchEvent: (e) => events.push(e) };
  button.addEventListener = (_, fn) => (button.onClick = fn);
  return button;
});
const forms = ["url", "text"].map((type) => ({ dataset: { type }, classList: classList() }));
globalThis.document = {
  querySelectorAll: (selector) => (selector === ".qr-type-btn" ? buttons : forms),
  getElementById: () => null,
};

initFormSwitcher();
buttons[1].onClick();
assert.ok(forms[1].classList.has("active"), "the text form becomes active");
assert.equal(events.length, 1, "switching type fires one event");
assert.equal(events[0].type, "change", "the event is change, which the generator redraws on");
assert.equal(events[0].bubbles, true, "it bubbles up to the generator section");

console.log("form-switcher: ok");
