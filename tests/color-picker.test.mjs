// run with: node tests/color-picker.test.mjs
import assert from "node:assert/strict";
import { getContrastWarning } from "../frontend/js/color-picker.js";

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

console.log("color-picker: ok");
