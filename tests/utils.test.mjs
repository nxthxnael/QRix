// run with: node tests/utils.test.mjs
import assert from "node:assert/strict";
import { getQRData, escapeWifi, togglePassword } from "../frontend/js/utils.js";

// minimal stand-in for the active form: selector -> element
function useForm(type, controls) {
  const form = { dataset: { type }, querySelector: (selector) => controls[selector] ?? null };
  globalThis.document = { querySelector: (selector) => (selector === ".form-type.active" ? form : null) };
}

useForm("text", { "#qr-text": { value: "  hello  " } });
assert.equal(getQRData(), "hello", "text type reads the text input");

useForm("text", { "#qr-text": { value: "   " } });
assert.equal(getQRData(), null, "blank text gives no payload");

// phone, email and url read the form's only input
useForm("phone", { input: { value: " +254 700 000000 " } });
assert.equal(getQRData(), "tel:+254 700 000000", "phone becomes a trimmed tel: link");

useForm("phone", { input: { value: "  " } });
assert.equal(getQRData(), null, "blank phone gives no payload");

useForm("email", { input: { value: " name@example.com " } });
assert.equal(getQRData(), "mailto:name@example.com", "email becomes a trimmed mailto: link");

useForm("email", { input: { value: "" } });
assert.equal(getQRData(), null, "blank email gives no payload");

useForm("url", { input: { value: " https://example.com " } });
assert.equal(getQRData(), "https://example.com", "url is used as typed, trimmed");

const wifi = (ssid, password, encryption = "WPA") => ({
  "#wifi-ssid": { value: ssid },
  "#wifi-password": { value: password },
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

// the eye button flips the input type, its label and its icon together
{
  const input = { type: "password" };
  const classes = new Set(["fa-eye"]);
  const icon = { classList: { toggle: (name, on) => (on ? classes.add(name) : classes.delete(name)) } };
  const attrs = {};
  let onClick;
  const button = {
    querySelector: () => icon,
    setAttribute: (name, value) => (attrs[name] = value),
    addEventListener: (_, handler) => (onClick = handler),
  };
  globalThis.document = { getElementById: (id) => ({ "wifi-password": input, "toggle-password": button })[id] };
  togglePassword();

  onClick();
  assert.deepEqual([input.type, attrs["aria-pressed"], attrs["aria-label"], [...classes]], ["text", "true", "Hide password", ["fa-eye-slash"]], "first click shows the password");
  onClick();
  assert.deepEqual([input.type, attrs["aria-pressed"], attrs["aria-label"], [...classes]], ["password", "false", "Show password", ["fa-eye"]], "second click hides it again");
}

useForm("wi-fi", wifi("Home", ""));
assert.equal(getQRData(), null, "a wpa network with no password gives no code");

useForm("wi-fi", wifi("Home", "", "WEP"));
assert.equal(getQRData(), null, "a wep network with no password gives no code");

console.log("utils: ok");
