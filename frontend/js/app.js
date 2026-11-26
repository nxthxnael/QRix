import { initFormSwitcher } from "./form-switcher.js";
import { initQRGenerator } from "./qr-generator.js";
import { initColorPicker } from "./color-picker.js";
import { initQRStyle } from "./qr-style.js";
import { togglePassword } from "./utils.js";
import { initThemeToggle } from "./theme.js";

document.addEventListener("DOMContentLoaded", () => {
  initFormSwitcher();
  initColorPicker();
  initQRStyle();
  initQRGenerator();
  togglePassword();
  initThemeToggle();
});
