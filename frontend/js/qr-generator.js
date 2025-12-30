import { getQRData } from "./utils.js";
import { getQRAppearance } from "./color-picker.js";

let qrInstance = null;

export function initQRGenerator() {
  const qrContainer = document.querySelector(".qr-code-container");
  const generationSection = document.querySelector(".generation-section");

  if (!qrContainer || !generationSection) {
    console.warn("QR Generator: required elements not found");
    return;
  }

  generationSection.addEventListener("input", generateQR);
  generationSection.addEventListener("change", generateQR);

  function generateQR() {
    const data = getQRData();
    if (!data) {
      qrContainer.innerHTML = "<p>Enter content to generate code</p>";
      return;
    }

    const { size, colorDark, colorLight } = getQRAppearance();

    qrContainer.innerHTML = "";

    qrInstance = new QRCode(qrContainer, {
      text: data,
      width: size,
      height: size,
      colorDark,
      colorLight,
    });
  }
}
