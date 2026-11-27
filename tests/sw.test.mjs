// run with: node tests/sw.test.mjs
// the offline cache must list real files, or the service worker fails to install and qrix never works offline
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";

const root = new URL("../frontend/", import.meta.url);
const sw = readFileSync(new URL("sw.js", root), "utf8");
const shell = [...sw.match(/const SHELL = \[([\s\S]*?)\];/)[1].matchAll(/"(\.\/[^"]*)"/g)].map((m) => m[1]);

for (const path of shell) {
  const file = path === "./" ? "index.html" : path.slice(2);
  assert.ok(existsSync(new URL(file, root)), `${path} is cached for offline use, so it must exist`);
}
for (const file of readdirSync(new URL("js/", root))) {
  assert.ok(shell.includes(`./js/${file}`), `js/${file} is loaded by the page, so it must be cached for offline use`);
}
for (const file of readdirSync(new URL("css/", root))) {
  assert.ok(shell.includes(`./css/${file}`), `css/${file} is loaded by the page, so it must be cached for offline use`);
}

// a hardcoded name has to be bumped by hand when SHELL changes, which is easy to miss
assert.match(sw, /const CACHE = `qrix-\$\{\[\.\.\.SHELL\.join/, "the cache name is derived from SHELL, not hardcoded");
assert.ok(sw.indexOf("const CACHE") > sw.indexOf("const SHELL"), "and it is computed after SHELL is defined");

const html = readFileSync(new URL("index.html", root), "utf8");
const library = html.match(/<script\s+src="(https:[^"]+)"/)[1];
assert.ok(sw.includes(`const LIBRARY = "${library}"`), "the cached qr library is the one the page loads");

const manifest = JSON.parse(readFileSync(new URL("manifest.webmanifest", root), "utf8"));
for (const icon of manifest.icons) assert.ok(existsSync(new URL(icon.src, root)), `${icon.src} in the manifest exists`);
assert.ok(manifest.icons.some((icon) => icon.purpose === "maskable"), "a maskable icon is offered");

console.log("sw: ok");
