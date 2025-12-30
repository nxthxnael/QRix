import { initFormSwitcher } from "./form-switcher.js";
import { initQRGenerator } from "./qr-generator.js";
import { initColorPicker } from "./color-picker.js";

document.addEventListener("DOMContentLoaded", () => {
  initFormSwitcher();
  initColorPicker();
  initQRGenerator();
});
