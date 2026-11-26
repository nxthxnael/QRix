// run with: node tests/qr-generator.test.mjs
// the browser is stubbed down to what the generator touches; real rendering is covered in qr-svg.test.mjs
import assert from "node:assert/strict";

// timers only run when the test says so, so the note never hides by itself mid-check
const timers = [];
globalThis.setTimeout = (fn) => timers.push(fn);
globalThis.clearTimeout = () => {};

const element = (extra = {}) => ({
  handlers: {},
  addEventListener(type, fn) { this.handlers[type] = fn; },
  setAttribute() {},
  ...extra,
});

// the note keeps its children so the test can read its text and find the github link;
// a plain object, because spreading it into element() would freeze its getters
const note = {
  children: [],
  replaceChildren(...nodes) { this.children = nodes; },
  append(...nodes) { this.children.push(...nodes); },
  contains: () => false,
  get text() { return this.children.map((node) => (typeof node === "string" ? node : node.textContent)).join(""); },
  get link() { return this.children.find((node) => typeof node !== "string"); },
};
const input = { value: "" };
const form = { dataset: { type: "url" }, querySelector: () => input };
const container = element({ replaceChildren() {}, append() {}, toggleAttribute() {}, removeAttribute() {}, contains: (node) => node === container });
const classes = new Set();
const actions = element({ hidden: true, classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name) } });
const section = element();
const ids = {
  downloadPngBtn: element(),
  downloadSvgBtn: element(),
  copyQrBtn: element({ childNodes: [], dataset: {}, replaceChildren() {} }),
  exportNote: note,
  exportError: { hidden: true },
};
const selectors = { ".qr-code-container": container, ".generation-section": section, ".qr-actions": actions, ".form-type.active": form };

globalThis.document = {
  querySelector: (selector) => selectors[selector] ?? null,
  querySelectorAll: () => [],
  getElementById: (id) => ids[id] ?? null,
  createElement: () => ({ click() {}, append() {} }),
  createElementNS: () => ({ setAttribute() {}, append() {} }),
  importNode: (node) => node,
  body: { appendChild() {}, removeChild() {} },
  activeElement: null,
  handlers: {},
  addEventListener(type, fn) { this.handlers[type] = fn; },
};
globalThis.getSelection = () => "";
globalThis.DOMParser = class { parseFromString() { return { documentElement: {} }; } };
globalThis.QRCode = class {
  static CorrectLevel = { L: 1, M: 0, Q: 3, H: 2 };
  _oQRCode = { getModuleCount: () => 21, isDark: () => false };
};
const stored = {};
globalThis.localStorage = { getItem: (key) => stored[key] ?? null, setItem: (key, value) => (stored[key] = value) };
// the png render is not drawn here; its rejected promise is caught like a browser's clipboard would
globalThis.ClipboardItem = class { constructor(items) { Object.values(items).forEach((blob) => blob.catch(() => {})); } };
Object.defineProperty(globalThis, "navigator", { value: { platform: "Win32", clipboard: { write: async () => {} } }, configurable: true });

const { initQRGenerator } = await import("../frontend/js/qr-generator.js");
initQRGenerator();

const type = (value) => {
  input.value = value;
  section.handlers.input({ target: { closest: () => null } });
};
const click = async (id) => {
  await ids[id].handlers.click();
};

// the faded example has nothing to export
await click("downloadSvgBtn");
assert.equal(note.text, "", "the example cannot be downloaded");

type("https://example.com");
await click("downloadSvgBtn");
assert.match(note.text, /^Downloaded\. Scan it with your phone camera before you print it\./, "a download reminds to test-scan");
assert.equal(note.link?.href, "https://github.com/nxthxnael/QRix", "the first download links to the repository");

await click("downloadSvgBtn");
assert.equal(note.link, undefined, "the link is shown only once per visitor");

await click("copyQrBtn");
assert.equal(note.text, "Copied. Scan it with your phone camera before you print it.", "a copy gets the same reminder");

type("https://example.org");
assert.equal(note.text, "", "a new code clears the reminder for the old one");

// the actions fade in once a code is ready, and lose the fade state when the example comes back
while (timers.length) timers.shift()();
assert.ok(!actions.hidden && classes.has("visible"), "a ready code shows the actions");
type("");
assert.ok(actions.hidden && !classes.has("visible"), "back to the example, the actions are hidden and will fade in again");
type("https://example.org");

// shortcuts act only while a code is ready, and copy only from the focused preview
{
  // the png render fails here by design and logs it; keep the test output readable
  const logError = console.error;
  console.error = () => {};
  const press = (key, extra = {}) => {
    const event = { key, ctrlKey: true, metaKey: false, altKey: false, shiftKey: false, prevented: false, preventDefault() { this.prevented = true; }, ...extra };
    document.handlers.keydown(event);
    return event.prevented;
  };
  type("");
  assert.equal(press("s"), false, "ctrl+s on the example leaves the browser's save alone");
  type("https://example.net");
  assert.equal(press("s", { metaKey: true, ctrlKey: false }), false, "cmd+s is the mac shortcut, not the windows one");
  assert.equal(press("S"), true, "ctrl+s downloads the ready code");
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(ids.exportError.textContent, "Could not create the PNG. Try a smaller scale.", "and goes through the png download");
  assert.equal(press("c"), false, "ctrl+c elsewhere is the browser's copy");
  document.activeElement = container;
  globalThis.getSelection = () => "selected words";
  assert.equal(press("c"), false, "ctrl+c with text selected copies the text");
  globalThis.getSelection = () => "";
  assert.equal(press("c"), true, "ctrl+c on the focused preview copies the code");
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(note.text, /^Copied\./, "through the same copy as the button");
  assert.equal(press("s", { shiftKey: true }), false, "ctrl+shift+s is left alone");
  assert.equal(press("s", { repeat: true }), false, "a held ctrl+s does not download again");
  document.activeElement = null;
  type("https://example.org");
  console.error = logError;
}

// a browser that refuses to save the mark never shows the link, rather than showing it every time
delete stored["qrix-star-asked"];
globalThis.localStorage.setItem = () => { throw new Error("quota"); };
await click("downloadSvgBtn");
assert.equal(note.link, undefined, "the link is never shown when storage cannot be written");

console.log("qr-generator: ok");
