// run with: node tests/utils.test.mjs
import assert from "node:assert/strict";
import { getQRData, escapeWifi } from "../frontend/js/utils.js";

// minimal stand-in for the active form: selector -> element
function useForm(type, controls) {
  const form = { dataset: { type }, querySelector: (selector) => controls[selector] ?? null };
  globalThis.document = { querySelector: (selector) => (selector === ".form-type.active" ? form : null) };
}

useForm("text", { "#qr-text": { value: "  hello  " } });
assert.equal(getQRData(), "hello", "text type reads the text input");

useForm("text", { "#qr-text": { value: "   " } });
assert.equal(getQRData(), null, "blank text gives no payload");

const wifi = (ssid, password, encryption = "WPA") => ({
  'input[type="text"]': { value: ssid },
  'input[type="password"]': { value: password },
  "#wifi-encryption": { value: encryption },
  "#hidden": { checked: false },
});

useForm("wi-fi", wifi("Home", "secret"));
assert.equal(getQRData(), "WIFI:T:WPA;S:Home;P:secret;H:false;", "wi-fi type builds a wifi payload");

useForm("wi-fi", wifi("Cafe", "", "nopass"));
assert.equal(getQRData(), "WIFI:T:nopass;S:Cafe;H:false;", "open network leaves the password out");

assert.equal(escapeWifi('a\\b;c,d:e"f'), 'a\\\\b\\;c\\,d\\:e\\"f', "escapes every wifi syntax character");

useForm("wi-fi", wifi("My;Net", "abc;123"));
assert.equal(getQRData(), "WIFI:T:WPA;S:My\\;Net;P:abc\\;123;H:false;", "ssid and password keep their semicolons");

console.log("utils: ok");
