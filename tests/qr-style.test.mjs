// run with: node tests/qr-style.test.mjs
import assert from "node:assert/strict";
import { PRESETS, initQRStyle, getQRStyle, logoType, applyStyle, readStyle, styleLink, styleFromHash } from "../frontend/js/qr-style.js";
import { getContrastWarning } from "../frontend/js/color-picker.js";

// no style link unless a test sets one
globalThis.location = { hash: "", pathname: "/", search: "" };
const windowListeners = {};
globalThis.window = { addEventListener: (type, fn) => (windowListeners[type] = fn) };
globalThis.history = { replaceState: (_, __, url) => Object.assign(location, { hash: "", replaced: url }) };

for (const [name, preset] of Object.entries(PRESETS)) {
  const appearance = {
    colorDark: preset["qr-color-text"],
    colorLight: preset["qr-background-text"],
    colorDark2: preset["qr-color2-text"],
    gradient: preset["qr-gradient"],
  };
  assert.equal(getContrastWarning(appearance), "", `${name} preset passes the contrast check`);
  assert.match(appearance.colorDark, /^#[0-9A-F]{6}$/i, `${name} dark color is a valid hex`);
  if (preset["qr-shape"] === "dots") assert.equal(preset["qr-error-correction"], "H", "dots preset uses high error correction");
}

assert.equal(logoType({ name: "logo.WEBP", type: "" }), "image/webp", "a webp with no reported type is typed by extension");
assert.equal(logoType({ name: "logo.svg", type: "image/svg+xml" }), "image/svg+xml", "svg is accepted");
assert.equal(logoType({ name: "anim.gif", type: "image/gif" }), "", "gif is not offered by the picker, so it is refused");
assert.equal(logoType({ name: "notes", type: "" }), "", "no type and no known extension is refused");

// logo picker: a rejected or cancelled pick keeps the current logo and the picker that shows it
{
  const handlers = {};
  const input = { files: [], value: "", addEventListener: (type, fn) => (handlers[type] = fn), dispatchEvent: () => {} };
  const error = { hidden: true, textContent: "" };
  const clear = { hidden: true, addEventListener: (_, fn) => (handlers.clear = fn) };
  const controls = { "qr-logo": input, "qr-logo-clear": clear, "qr-error-correction": { value: "M", disabled: false }, "qr-logo-error": error };
  globalThis.document = { getElementById: (id) => controls[id], querySelectorAll: () => [], addEventListener() {} };
  // reads finish only when the test calls finish(), newest last unless told otherwise
  const pending = [];
  globalThis.FileReader = class {
    readAsDataURL(file) { this.result = `data:${file.type || "application/octet-stream"};base64,${file.name}`; pending.push(this); }
  };
  const finish = (reader = pending.shift()) => reader.onload();
  const fail = (reader = pending.shift()) => reader.onerror();
  const abort = (reader = pending.shift()) => reader.onabort();
  initQRStyle();
  globalThis.DataTransfer = class {
    files = [];
    items = { add: (file) => this.files.push(file) };
  };
  // overwrites the same list in place, the worst case a browser may do on a new pick
  input.files = [];
  const pick = (...files) => { input.files.splice(0, Infinity, ...files); handlers.change(); };

  const first = [{ name: "a.png", type: "image/png", size: 1000 }];
  pick(...first.slice());
  finish();
  assert.equal(getQRStyle().logo, "data:image/png;base64,a.png", "a valid image becomes the logo");

  pick({ name: "b.png", type: "image/png", size: 600 * 1024 });
  assert.equal(getQRStyle().logo, "data:image/png;base64,a.png", "a too-large image keeps the current logo");
  assert.deepEqual(input.files, first, "the picker goes back to the accepted file");
  assert.equal(error.hidden, false, "the rejection is shown");

  pick();
  assert.deepEqual(input.files, first, "a cancelled pick keeps the accepted file");
  assert.equal(getQRStyle().logo, "data:image/png;base64,a.png", "a cancelled pick keeps the logo");
  assert.equal(error.hidden, true, "a cancelled pick clears the message");

  pick({ name: "notes.txt", type: "text/plain", size: 10 });
  assert.equal(error.textContent, "Choose a PNG, JPEG, WebP or SVG image.", "a wrong file type gets its own message");
  assert.equal(error.hidden, false, "and the message is visible");

  handlers.cancel();
  assert.equal(error.hidden, true, "dismissing the dialog (cancel event) clears the message");
  pick({ name: "notes.txt", type: "text/plain", size: 10 });

  handlers.clear();
  assert.equal(error.hidden, true, "removing the logo clears the message");
  assert.equal(getQRStyle().logo, null, "removing the logo clears it");

  pick({ name: "slow.png", type: "image/png", size: 500 * 1024 });
  pick({ name: "quick.png", type: "image/png", size: 2000 });
  const [slow, quick] = pending.splice(0);
  finish(quick);
  finish(slow);
  assert.equal(getQRStyle().logo, "data:image/png;base64,quick.png", "a slow earlier read does not replace a newer pick");

  pick({ name: "pending.png", type: "image/png", size: 1000 });
  pick({ name: "huge.png", type: "image/png", size: 600 * 1024 });
  finish();
  assert.equal(getQRStyle().logo, "data:image/png;base64,quick.png", "a rejected pick cancels a read still pending");
  assert.deepEqual(input.files.map((f) => f.name), ["quick.png"], "and the picker shows the logo in use");

  pick({ name: "broken.png", type: "image/png", size: 1000 });
  fail();
  assert.deepEqual(input.files.map((f) => f.name), ["quick.png"], "a failed read puts the picker back");
  assert.equal(error.textContent, "Could not read that image. Try another file.", "a failed read is reported");
  assert.equal(error.hidden, false, "and the report is visible");
  assert.equal(getQRStyle().logo, "data:image/png;base64,quick.png", "a failed read keeps the logo");

  handlers.cancel();
  pick({ name: "aborted.png", type: "image/png", size: 1000 });
  abort();
  assert.deepEqual(input.files.map((f) => f.name), ["quick.png"], "an aborted read puts the picker back");
  assert.equal(error.hidden, false, "an aborted read is reported");
  assert.equal(getQRStyle().logo, "data:image/png;base64,quick.png", "an aborted read keeps the logo");

  pick({ name: "drawing.svg", type: "", size: 900 });
  finish();
  assert.equal(getQRStyle().logo, "data:image/svg+xml;base64,drawing.svg", "a typeless svg is embedded with its real type");

  pick({ name: "late.png", type: "image/png", size: 1000 });
  handlers.clear();
  finish();
  assert.equal(getQRStyle().logo, null, "a read that finishes after remove does not bring the logo back");
}

// styles arrive from links and storage, so only values a control can hold are applied
{
  const select = (value, ...options) => ({ tagName: "SELECT", value, options: options.map((v) => ({ value: v })), dispatchEvent() { this.sent = true; } });
  const controls = {
    "qr-color-text": { tagName: "INPUT", type: "text", value: "#000000", dispatchEvent() {} },
    "qr-shape": select("square", "square", "rounded", "dots"),
    "qr-size": { tagName: "INPUT", type: "range", min: "128", max: "512", step: "8", value: "256", dispatchEvent() {} },
    "qr-error-correction": { ...select("M", "L", "M", "Q", "H"), disabled: true },
  };
  globalThis.document = { getElementById: (id) => controls[id] };

  applyStyle({ "qr-color-text": "#1f2937", "qr-shape": "dots", "qr-size": "320", "qr-error-correction": "L" });
  assert.deepEqual(readStyle(), { "qr-color-text": "#1f2937", "qr-shape": "dots", "qr-size": "320", "qr-error-correction": "M" }, "valid values apply; a disabled control keeps its value");
  assert.equal(controls["qr-shape"].sent, true, "an applied select tells the page it changed");

  applyStyle({ "qr-color-text": "red;background:url(x)", "qr-shape": "star", "qr-size": "999", "qr-error-correction": "H", "qr-logo": "x" });
  applyStyle({ "qr-size": "321" });
  applyStyle({ "qr-color-text": 5 });
  applyStyle(null);
  assert.deepEqual(readStyle(), { "qr-color-text": "#1f2937", "qr-shape": "dots", "qr-size": "320", "qr-error-correction": "M" }, "bad colors, unknown options, out-of-range or off-step sizes, non-strings and unknown ids are ignored");
}

// a style link carries the style only, and reads back to the same style
{
  const style = { "qr-color-text": "#1F2937", "qr-gradient": "diagonal", "qr-size": "320", "qr-error-correction": "H" };
  const link = styleLink(style, "https://qrix.example/?ref=x#old");
  assert.equal(link, "https://qrix.example/?ref=x#color=1F2937&gradient=diagonal&size=320&ec=H", "the link is the page address plus a readable style hash");
  assert.deepEqual(styleFromHash(new URL(link).hash), style, "the hash reads back to the same style");
  assert.deepEqual(styleFromHash("#url=https://x&text=hi"), {}, "keys that are not style are ignored");
  assert.deepEqual(styleFromHash(""), {}, "no hash is no style");
}

// the last style is restored on load and saved whenever a style control changes
{
  const listeners = {};
  const color = { id: "qr-color-text", tagName: "INPUT", type: "text", value: "#000000", dispatchEvent() {} };
  const controls = { "qr-logo": { addEventListener() {} }, "qr-color-text": color };
  globalThis.document = {
    getElementById: (id) => controls[id],
    querySelectorAll: () => [],
    addEventListener: (type, fn) => (listeners[type] = fn),
  };
  const stored = { "qrix-style": JSON.stringify({ "qr-color-text": "#123456" }) };
  globalThis.localStorage = { getItem: (key) => stored[key] ?? null, setItem: (key, value) => (stored[key] = value) };
  initQRStyle();
  assert.equal(color.value, "#123456", "the remembered style is applied on load");

  color.value = "#654321";
  listeners.input({ target: color });
  assert.deepEqual(JSON.parse(stored["qrix-style"]), { "qr-color-text": "#654321" }, "a style change is remembered");

  stored["qrix-style"] = "not json";
  color.value = "#000000";
  initQRStyle();
  assert.equal(color.value, "#000000", "a broken entry is ignored");
  listeners.input({ target: { id: "qr-url" } });
  assert.equal(stored["qrix-style"], "not json", "content fields are never saved");

  stored["qrix-style"] = JSON.stringify({ "qr-color-text": "#123456" });
  Object.assign(location, { hash: "#color=abcdef", search: "?ref=x" });
  initQRStyle();
  assert.equal(color.value, "#abcdef", "a shared style link wins over the remembered style");
  assert.equal(location.replaced, "/?ref=x", "the style leaves the address once applied");

  location.hash = "#color=fedcba";
  windowListeners.hashchange();
  assert.equal(color.value, "#fedcba", "a style link opened in the same tab applies without a reload");
}

console.log("qr-style: ok");
