import { getQRData } from "./utils.js";
import { getQRAppearance } from "./color-picker.js";

let qrInstance = null;

// shortcut: fixed delay, not a download-complete signal, enough for the browser to start reading the blob
const REVOKE_DELAY_MS = 10000;

export function initQRGenerator() {
  const qrContainer = document.querySelector(".qr-code-container");
  const generationSection = document.querySelector(".generation-section");
  const qrActions = document.querySelector(".qr-actions");
  const downloadPngBtn = document.getElementById("downloadPngBtn");
  const downloadSvgBtn = document.getElementById("downloadSvgBtn");
  const copyQrBtn = document.getElementById("copyQrBtn");
  const exportScale = document.getElementById("exportScale");
  const exportTransparent = document.getElementById("exportTransparent");

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

  let actionsTimer;

  function generateQR(event) {
    // export options only change the downloaded file, not the preview
    if (event?.target.closest(".qr-actions")) return;

    clearTimeout(actionsTimer);
    const data = getQRData();
    if (!data) {
      qrInstance = null;
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
    });

    // Show actions after a short delay for QR code to render
    actionsTimer = setTimeout(() => {
      qrActions.style.display = "flex";
      setTimeout(() => qrActions.classList.add("visible"), 10);
    }, 100);
  }

  // draws the module matrix on a fresh canvas so any scale stays crisp
  function renderPngBlob() {
    const { size, colorDark, colorLight } = getQRAppearance();
    const scale = parseInt(exportScale?.value ?? "1", 10);
    const model = qrInstance._oQRCode;
    const count = model.getModuleCount();
    const cell = Math.ceil((size * scale) / count);

    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = count * cell;
    const ctx = canvas.getContext("2d");
    if (!exportTransparent?.checked) {
      ctx.fillStyle = colorLight;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.fillStyle = colorDark;
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (model.isDark(row, col)) ctx.fillRect(col * cell, row * cell, cell, cell);
      }
    }
    return new Promise((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("png encoding failed"))),
        "image/png"
      )
    );
  }

  async function downloadAsPng() {
    if (!qrInstance) return;

    let blob;
    try {
      blob = await renderPngBlob();
    } catch (err) {
      console.error("Failed to export PNG: ", err);
      alert("Could not create the PNG. Try a smaller scale.");
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = "qrcode.png";
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
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
      (exportTransparent?.checked
        ? ""
        : `<rect width="${count}" height="${count}" fill="${colorLight}"/>`) +
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
    setTimeout(() => URL.revokeObjectURL(svgUrl), REVOKE_DELAY_MS);
  }

  async function copyToClipboard() {
    if (!qrInstance) return;

    try {
      const blob = await renderPngBlob();
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
