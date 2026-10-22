// run with: node tests/qr-style.test.mjs
import assert from "node:assert/strict";
import { PRESETS } from "../frontend/js/qr-style.js";
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

console.log("qr-style: ok");
