// run with: node tests/utils.test.mjs
import assert from "node:assert/strict";
import { getQRData, escapeWifi, togglePassword, exportName } from "../frontend/js/utils.js";

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
assert.equal(getQRData(), "tel:+254700000000", "phone becomes a tel: link without spaces");

useForm("phone", { input: { value: "+1 (555) 010-0199" } });
assert.equal(getQRData(), "tel:+1(555)010-0199", "allowed separators stay, spaces go");

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
  // records attributes by name, so setting the wrong attribute fails the test
  const iconAttrs = { href: "#i-eye" };
  const icon = { setAttribute: (name, value) => (iconAttrs[name] = value) };
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
  assert.deepEqual([input.type, attrs["aria-pressed"], attrs["aria-label"], iconAttrs.href], ["text", "true", "Hide password", "#i-eye-off"], "first click shows the password");
  onClick();
  assert.deepEqual([input.type, attrs["aria-pressed"], attrs["aria-label"], iconAttrs.href], ["password", "false", "Show password", "#i-eye"], "second click hides it again");
}

useForm("wi-fi", wifi("Home", ""));
assert.equal(getQRData(), null, "a wpa network with no password gives no code");

useForm("wi-fi", wifi("Home", "", "WEP"));
assert.equal(getQRData(), null, "a wep network with no password gives no code");

assert.equal(exportName("https://www.example.com/path?q=1"), "qrix-example-com-path-q-1", "urls drop the scheme and www");
assert.equal(exportName("tel:+254700000000"), "qrix-254700000000", "phone numbers drop tel:");
assert.equal(exportName("mailto:Name@Example.com"), "qrix-name-example-com", "emails drop mailto: and lowercase");
assert.equal(exportName("WIFI:T:WPA;S:My\\;Home;P:secret123;H:false;"), "qrix-wifi-my-home", "wi-fi uses the unescaped network name");
assert.ok(!exportName("WIFI:T:WPA;S:Home;P:secret123;H:false;").includes("secret"), "the wi-fi password never reaches the file name");
assert.equal(exportName("!!!"), "qrix-code", "no usable ascii characters falls back to code");
assert.equal(exportName("www.example.com"), "qrix-example-com", "www. goes even without a scheme");
assert.match(exportName("こんにちは 世界"), /^qrix-code-[0-9a-f]{8}$/, "non-latin text gets an ascii-safe name");
assert.notEqual(exportName("日本"), exportName("中国"), "different non-latin content gets different names");
assert.equal(exportName("日本"), exportName("日本"), "the same content always gets the same name");
assert.match(exportName("WIFI:T:WPA;S:مقهى;P:x;H:false;"), /^qrix-wifi-[0-9a-f]{8}$/, "a non-latin network name gets a fingerprint");
assert.equal(exportName("WIFI:T:WPA;S:مقهى;P:one;H:false;"), exportName("WIFI:T:WPA;S:مقهى;P:two;H:false;"), "the wi-fi fingerprint ignores the password");
assert.match(exportName("café menu"), /^qrix-caf-menu-[0-9a-f]{8}$/, "partly latin text keeps its ascii part and adds a fingerprint");
assert.equal(exportName("a".repeat(80)).length, "qrix-".length + 40, "long content is cut to 40 characters");

console.log("utils: ok");
