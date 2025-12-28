import { getQRData } from "./utils.js";

export function initQRGenerator() {
  const qrContainer = document.querySelector(".qr-code-container");
  const generationSection = document.querySelector(".generation-section");

  if (!qrContainer || !generationSection) {
    console.warn("QR Generator: required elements not found");
    return;
  }

  // Generate QR whenever user types or changes form
  generationSection.addEventListener("input", handleGenerate);
  generationSection.addEventListener("change", handleGenerate);

  function handleGenerate() {
    const data = getQRData();
    if (!data) return;

    renderQR(data);
  }

  function renderQR(text) {
    qrContainer.innerHTML = "";

    new QRCode(qrContainer, {
      text,
      width: 220,
      height: 220,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H,
    });
  }
}
