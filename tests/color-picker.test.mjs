// run with: node tests/color-picker.test.mjs
import assert from "node:assert/strict";
import { getScanAdvice, getContrastWarning } from "../frontend/js/color-picker.js";

const base = { colorDark: "#000000", colorLight: "#ffffff", colorDark2: "#2563eb" };

assert.equal(getContrastWarning(base), "", "black on white passes");
assert.match(getContrastWarning({ ...base, colorDark: "#ffffff", colorLight: "#000000" }), /lighter/, "inverted colors warn");
assert.match(getContrastWarning({ ...base, colorDark: "#777777", colorLight: "#888888" }), /Low contrast/, "low contrast warns");
assert.equal(getContrastWarning({ ...base, gradient: "diagonal" }), "", "a gradient passes when both stops pass");
assert.match(
  getContrastWarning({ ...base, colorDark2: "#eeeeee", gradient: "horizontal" }),
  /lighter|Low contrast/,
  "a gradient warns when its end color fails"
);
assert.equal(getContrastWarning({ ...base, colorDark2: "#eeeeee" }), "", "the end color is ignored without a gradient");

// the badge under the preview: contrast first, then png pixels per module
{
  const look = { colorDark: "#000000", colorLight: "#ffffff", colorDark2: "#2563eb", gradient: "none", size: 256 };
  assert.deepEqual(getScanAdvice(look, 25), { ok: true, text: "Should scan well" }, "a small dark-on-light code should scan");
  assert.equal(getScanAdvice({ ...look, colorDark: "#ffffff", colorLight: "#000000" }, 25).text, "Inverted colors. Many scanners cannot read it.");
  assert.equal(getScanAdvice({ ...look, colorDark: "#bbbbbb" }, 25).text, "Low contrast. It may not scan.");
  assert.equal(getScanAdvice({ ...look, gradient: "diagonal", colorDark2: "#dddddd" }, 25).ok, false, "a gradient is judged by its lightest stop");
  // 128px over 85 modules plus the quiet zone rounds up to 2px per module
  assert.equal(getScanAdvice({ ...look, size: 128 }, 85).text, "Too dense for this size. Raise the size or PNG scale.");
  assert.equal(getScanAdvice({ ...look, size: 128 }, 85, 2).ok, true, "a bigger png scale fixes density");
}

console.log("color-picker: ok");
