// run with: node tests/utils.test.mjs
import assert from "node:assert/strict";
import { getQRData, escapeWifi, togglePassword, exportName, parseWifi, detectPaste } from "../frontend/js/utils.js";

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

useForm("phone", { input: { value: "TEL:+254 700" } });
assert.equal(getQRData(), "tel:+254700", "a typed tel: link is not doubled");

useForm("email", { input: { value: " mailto:a@b.co " } });
assert.equal(getQRData(), "mailto:a@b.co", "a typed mailto: link is not doubled");

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
assert.equal(exportName(`WIFI:T:WPA;S:${escapeWifi("a\\b:c;d")};P:x;H:false;`), "qrix-wifi-a-b-c-d", "escaped backslash, colon and semicolon stay inside the network name");
assert.equal(exportName("WIFI:P:secret;S:Home;;"), "qrix-wifi-home", "the network name is found after a password field");
assert.equal(exportName("WIFI:T:WPA;P:xS:leak;S:Home;;"), "qrix-wifi-home", "an S: inside the password is not read as the network name");
assert.equal(exportName("WIFI:T:WPA;P:secret;;"), "qrix-wifi", "no network name gives a plain wi-fi name, not the password");
{
  // a backslash can only start an escape, so a long run of them is read in one pass, not retried
  const start = Date.now();
  exportName(`WIFI:${"\\".repeat(3000)}x`);
  assert.ok(Date.now() - start < 100, "a long run of backslashes is named quickly");
}
assert.equal(exportName("!!!"), "qrix-code", "no usable ascii characters falls back to code");
assert.equal(exportName("www.example.com"), "qrix-example-com", "www. goes even without a scheme");
assert.match(exportName("こんにちは 世界"), /^qrix-code-[0-9a-f]{8}$/, "non-latin text gets an ascii-safe name");
assert.notEqual(exportName("日本"), exportName("中国"), "different non-latin content gets different names");
assert.equal(exportName("日本"), exportName("日本"), "the same content always gets the same name");
assert.match(exportName("WIFI:T:WPA;S:مقهى;P:x;H:false;"), /^qrix-wifi-[0-9a-f]{8}$/, "a non-latin network name gets a fingerprint");
assert.equal(exportName("WIFI:T:WPA;S:مقهى;P:one;H:false;"), exportName("WIFI:T:WPA;S:مقهى;P:two;H:false;"), "the wi-fi fingerprint ignores the password");
assert.match(exportName("café menu"), /^qrix-caf-menu-[0-9a-f]{8}$/, "partly latin text keeps its ascii part and adds a fingerprint");
assert.equal(exportName("a".repeat(80)).length, "qrix-".length + 40, "long content is cut to 40 characters");

// pasted wi-fi strings read back to the fields they were made from
assert.deepEqual(parseWifi(`WIFI:T:WPA;S:${escapeWifi("My;Home")};P:${escapeWifi('p:w\\"')};H:true;;`), { T: "WPA", S: "My;Home", P: 'p:w\\"', H: "true" }, "escaped characters are unescaped");
assert.equal(parseWifi("https://x"), null, "only wi-fi strings are parsed");
assert.equal(parseWifi("WIFI:"), null, "a wi-fi string with no network name is no network");
assert.deepEqual(parseWifi(`WIFI:T:WPA;S:${escapeWifi("a:b")};P:x;H:false;`), { T: "WPA", S: "a:b", P: "x", H: "false" }, "the generator's own output parses, with a single closing ;");
assert.equal(parseWifi("WIFI:S:Home"), null, "an unterminated field is rejected");
assert.equal(parseWifi("WIFI:S:A;X:1;;"), null, "an unknown key is rejected");
assert.equal(parseWifi("WIFI:S:A;S:B;;"), null, "a repeated key is rejected");
assert.equal(parseWifi("WIFI:S:A;;WIFI:S:B;;"), null, "two wi-fi strings stuck together are rejected");
assert.equal(parseWifi("WIFI:S:a:b;;"), null, "an unescaped colon in a value is rejected");
assert.equal(parseWifi("WIFI:S:A;;;"), null, "only one closing ; is allowed");
{
  // escapes and plain characters never overlap, so a long run of backslashes is read in one pass
  const start = Date.now();
  parseWifi(`WIFI:S:${"\\".repeat(3001)}`);
  assert.ok(Date.now() - start < 100, "a long run of backslashes is rejected quickly");
}
assert.equal(detectPaste("WIFI: is down again", "text"), null, "text that only starts like a wi-fi string pastes as usual");

const wifiPaste = (text, type = "url") => detectPaste(text, type)?.values;
assert.deepEqual(wifiPaste("WIFI:S:Cafe;T:WPA2;P:pw;;"), { "#wifi-ssid": "Cafe", "#wifi-password": "pw", "#wifi-encryption": "WPA", "#hidden": false }, "wpa2 and other wpa names map to the wpa option");
assert.equal(wifiPaste("WIFI:T:WEP;S:A;P:x;;")["#wifi-encryption"], "WEP");
assert.equal(wifiPaste("WIFI:S:Open;;")["#wifi-encryption"], "nopass", "no type and no password is an open network");
assert.equal(wifiPaste("WIFI:S:A;T:nopass;H:true;;")["#hidden"], true);
assert.equal(detectPaste("WIFI:S:A;;", "wi-fi")?.type, "wi-fi", "a wi-fi string pasted into the wi-fi form still fills every field");

assert.equal(detectPaste("https://example.com/a?b=1", "text")?.type, "url", "a link switches from text");
assert.equal(detectPaste("https://example.com", "url"), null, "a link into the url field is an ordinary paste");
assert.deepEqual(detectPaste("mailto:Ann@Example.com?subject=hi", "url")?.values, { "#qr-email": "Ann@Example.com" }, "mailto keeps the address only");
assert.equal(detectPaste("ann@example.com", "text")?.type, "email", "an email address switches from text");
assert.equal(detectPaste("https://user@example.com", "url"), null, "a link with a user name is still a link");
assert.deepEqual(detectPaste("tel:+254700000000", "text")?.values, { "#qr-phone": "+254700000000" }, "tel: switches and drops the scheme");
assert.equal(detectPaste("+1 (555) 010-0199", "url")?.type, "phone", "a bare phone number switches from the url field");
assert.deepEqual(detectPaste("tel:+254700000000", "phone")?.values, { "#qr-phone": "+254700000000" }, "a tel: link into the phone form drops its scheme, so it is not added twice");
assert.deepEqual(detectPaste("MAILTO:ann@example.com", "email")?.values, { "#qr-email": "ann@example.com" }, "a mailto: link into the email form drops its scheme");
assert.equal(detectPaste("ann@example.com", "email"), null, "a plain address into the email form pastes as usual");
assert.equal(detectPaste("+1 (555) 010-0199", "text"), null, "but not from text, where a number may be meant as text");
assert.equal(detectPaste("12345", "url"), null, "too few digits is not a phone number");
assert.equal(detectPaste("hello world", "url"), null, "plain text pastes as usual");
assert.equal(detectPaste("example.com", "text"), null, "a bare domain in text stays text");

console.log("utils: ok");
