import { initFormSwitcher } from "./form-switcher.js";
import { initQRGenerator } from "./qr-generator.js";
import { initColorPicker } from "./color-picker.js";
import { initQRStyle } from "./qr-style.js";
import { initBrands } from "./brands.js";
import { togglePassword } from "./utils.js";
import { initThemeToggle } from "./theme.js";

document.addEventListener("DOMContentLoaded", () => {
  initFormSwitcher();
  initColorPicker();
  initQRStyle();
  initBrands();
  initQRGenerator();
  togglePassword();
  initThemeToggle();
});

// offline support; a browser without it, or a failed registration, simply works online only
if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
