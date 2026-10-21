import { getQRData } from "./utils.js";
import { getQRAppearance } from "./color-picker.js";

let qrInstance = null;

export function initQRGenerator() {
  const qrContainer = document.querySelector(".qr-code-container");
  const generationSection = document.querySelector(".generation-section");
  const qrActions = document.querySelector(".qr-actions");
  const downloadPngBtn = document.getElementById("downloadPngBtn");
  const downloadSvgBtn = document.getElementById("downloadSvgBtn");
  const copyQrBtn = document.getElementById("copyQrBtn");

  if (
    !qrContainer ||
    !generationSection ||
    !qrActions ||
    !downloadPngBtn ||
    !downloadSvgBtn ||
    !copyQrBtn
  ) {
    console.warn("QR Generator: required elements not found");
    return;
  }

  generationSection.addEventListener("input", generateQR);
  generationSection.addEventListener("change", generateQR);

  // Add event listeners for the action buttons
  downloadPngBtn.addEventListener("click", downloadAsPng);
  downloadSvgBtn.addEventListener("click", downloadAsSvg);
  copyQrBtn.addEventListener("click", copyToClipboard);

  function generateQR() {
    const data = getQRData();
    if (!data) {
      qrContainer.innerHTML = "<p>Enter content to generate code</p>";
      qrActions.style.display = "none";
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
      correctLevel: QRCode.CorrectLevel.H,
      useSVG: true,
    });

    // Show actions after a short delay for QR code to render
    setTimeout(() => {
      qrActions.style.display = "flex";
      setTimeout(() => qrActions.classList.add("visible"), 10);
    }, 100);
  }

  function downloadAsPng() {
    if (!qrInstance) return;

    const canvas = qrContainer.querySelector("canvas");
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = "qrcode.png";
    link.href = canvas.toDataURL("image/png");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // qrcodejs only draws svg inside svg documents, so build it from the module matrix
  function buildSvg() {
    const { colorDark, colorLight } = getQRAppearance();
    const model = qrInstance._oQRCode;
    const count = model.getModuleCount();
    let path = "";
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (model.isDark(row, col)) path += `M${col} ${row}h1v1h-1z`;
      }
    }
    return (
      `<?xml version="1.0" standalone="no"?>
` +
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${count} ${count}" shape-rendering="crispEdges">` +
      `<rect width="${count}" height="${count}" fill="${colorLight}"/>` +
      `<path d="${path}" fill="${colorDark}"/></svg>`
    );
  }

  function downloadAsSvg() {
    if (!qrInstance) return;

    const svgBlob = new Blob([buildSvg()], {
      type: "image/svg+xml;charset=utf-8",
    });
    const svgUrl = URL.createObjectURL(svgBlob);

    const link = document.createElement("a");
    link.download = "qrcode.svg";
    link.href = svgUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(svgUrl);
  }

  async function copyToClipboard() {
    const canvas = qrContainer.querySelector("canvas");
    if (!qrInstance || !canvas) return;

    try {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve));
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      showCopyFeedback();
    } catch (err) {
      console.error("Failed to copy QR code: ", err);
    }
  }

  function showCopyFeedback() {
    const originalText = copyQrBtn.innerHTML;
    copyQrBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
    copyQrBtn.style.backgroundColor = "#4CAF50";

    setTimeout(() => {
      copyQrBtn.innerHTML = originalText;
      copyQrBtn.style.backgroundColor = "";
    }, 2000);
  }
}
