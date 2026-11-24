// run with: node tests/theme.test.mjs
import assert from "node:assert/strict";
import { initThemeToggle } from "../frontend/js/theme.js";

function setup({ systemDark = false, saved = null, storageThrows = false } = {}) {
  const attrs = {};
  let onClick, onSystemChange, onStorage;
  const button = {
    dataset: {},
    setAttribute: (name, value) => (attrs[name] = value),
    addEventListener: (_, fn) => (onClick = fn),
  };
  const root = { dataset: saved ? { theme: saved } : {} };
  const store = saved ? { "qrix-theme": saved } : {};
  const system = { matches: systemDark, addEventListener: (_, fn) => (onSystemChange = fn) };
  globalThis.document = { documentElement: root, getElementById: () => button };
  globalThis.window = { matchMedia: () => system, addEventListener: (_, fn) => (onStorage = fn) };
  globalThis.localStorage = {
    getItem: (k) => { if (storageThrows) throw new Error("blocked"); return store[k] ?? null; },
    setItem: (k, v) => { if (storageThrows) throw new Error("blocked"); store[k] = v; },
  };
  initThemeToggle();
  return { button, attrs, root, store, system, click: () => onClick(), systemChange: () => onSystemChange(), storage: (key) => onStorage({ key }) };
}

{
  const t = setup();
  assert.equal(t.attrs["aria-label"], "Switch to dark theme", "light page offers dark");
  t.click();
  assert.equal(t.root.dataset.theme, "dark", "a click forces dark");
  assert.equal(t.store["qrix-theme"], "dark", "and remembers it");
  assert.equal(t.attrs["aria-label"], "Switch to light theme", "the label follows");
  t.click();
  assert.equal(t.root.dataset.theme, "light", "a second click forces light");
}

{
  const t = setup({ systemDark: true });
  assert.equal(t.button.dataset.current, "dark", "with nothing stored, the system theme is shown");
  t.system.matches = false;
  t.systemChange();
  assert.equal(t.button.dataset.current, "light", "the button follows a system change");
}

{
  const t = setup({ storageThrows: true });
  t.click();
  assert.equal(t.root.dataset.theme, "dark", "blocked storage still switches the theme for this visit");
}

{
  const t = setup();
  t.store["qrix-theme"] = "dark";
  t.storage("qrix-theme");
  assert.deepEqual([t.root.dataset.theme, t.button.dataset.current], ["dark", "dark"], "a choice from another tab applies here");
  delete t.store["qrix-theme"];
  t.storage("qrix-theme");
  assert.equal(t.root.dataset.theme, undefined, "a cleared choice returns to the system theme");
  t.storage("other-key");
  assert.equal(t.button.dataset.current, "light", "other storage keys are ignored");
}

console.log("theme: ok");
