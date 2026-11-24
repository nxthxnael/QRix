// run with: node tests/qr-style.test.mjs
import assert from "node:assert/strict";
import { PRESETS, initQRStyle, getQRStyle, logoType } from "../frontend/js/qr-style.js";
import { getContrastWarning } from "../frontend/js/color-picker.js";

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
  globalThis.document = { getElementById: (id) => controls[id], querySelectorAll: () => [] };
  // reads finish only when the test calls finish(), newest last unless told otherwise
  const pending = [];
  globalThis.FileReader = class {
    readAsDataURL(file) { this.result = `data:${file.type || "application/octet-stream"};base64,${file.name}`; pending.push(this); }
  };
  const finish = (reader = pending.shift()) => reader.onload();
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

  handlers.clear();
  assert.equal(error.hidden, true, "removing the logo clears the message");
  assert.equal(getQRStyle().logo, null, "removing the logo clears it");

  pick({ name: "slow.png", type: "image/png", size: 500 * 1024 });
  pick({ name: "quick.png", type: "image/png", size: 2000 });
  const [slow, quick] = pending.splice(0);
  finish(quick);
  finish(slow);
  assert.equal(getQRStyle().logo, "data:image/png;base64,quick.png", "a slow earlier read does not replace a newer pick");

  pick({ name: "drawing.svg", type: "", size: 900 });
  finish();
  assert.equal(getQRStyle().logo, "data:image/svg+xml;base64,drawing.svg", "a typeless svg is embedded with its real type");

  pick({ name: "late.png", type: "image/png", size: 1000 });
  handlers.clear();
  finish();
  assert.equal(getQRStyle().logo, null, "a read that finishes after remove does not bring the logo back");
}

console.log("qr-style: ok");
