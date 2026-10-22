import { getQRData } from "./utils.js";
import { getQRAppearance } from "./color-picker.js";
import { buildSvg, QUIET_ZONE } from "./qr-svg.js";
import { getQRStyle } from "./qr-style.js";

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
  const errorCorrection = document.getElementById("qr-error-correction");

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

    const { size } = getQRAppearance();

    // qrcodejs only encodes here; the preview and exports are drawn from its matrix as svg
    qrInstance = new QRCode(document.createElement("div"), {
      text: data,
      width: size,
      height: size,
      correctLevel: QRCode.CorrectLevel[getQRStyle().logo ? "H" : errorCorrection?.value] ?? QRCode.CorrectLevel.H,
    });

    const svg = new DOMParser().parseFromString(svgMarkup({ size }), "image/svg+xml");
    qrContainer.replaceChildren(document.importNode(svg.documentElement, true));

    // Show actions after a short delay for QR code to render
    actionsTimer = setTimeout(() => {
      qrActions.style.display = "flex";
      setTimeout(() => qrActions.classList.add("visible"), 10);
    }, 100);
  }

  function svgMarkup({ size, transparent = false } = {}) {
    const { colorDark, colorLight, colorDark2, gradient } = getQRAppearance();
    return buildSvg({
      model: qrInstance._oQRCode,
      colorDark,
      colorLight,
      colorDark2,
      gradient,
      transparent,
      size,
      ...getQRStyle(),
    });
  }

  // rasterizes the same svg the preview uses so png, svg and preview always match
  async function renderPngBlob() {
    const { size } = getQRAppearance();
    const scale = parseInt(exportScale?.value ?? "1", 10);
    const total = qrInstance._oQRCode.getModuleCount() + QUIET_ZONE * 2;
    // whole pixels per module keep edges crisp
    const px = total * Math.ceil((size * scale) / total);

    const markup = svgMarkup({ size: px, transparent: exportTransparent?.checked });
    const url = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml;charset=utf-8" }));
    try {
      const img = new Image();
      img.src = url;
      await img.decode();

      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = px;
      canvas.getContext("2d").drawImage(img, 0, 0, px, px);
      return await new Promise((resolve, reject) =>
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("png encoding failed"))),
          "image/png"
        )
      );
    } finally {
      URL.revokeObjectURL(url);
    }
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

  function downloadAsSvg() {
    if (!qrInstance) return;

    const svgBlob = new Blob(
      [`<?xml version="1.0" standalone="no"?>\r\n${svgMarkup({ transparent: exportTransparent?.checked })}`],
      { type: "image/svg+xml;charset=utf-8" }
    );
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
      // pass the promise so the write starts inside the click's user activation
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": renderPngBlob() }),
      ]);
      showCopyFeedback("fas fa-check", "Copied!", "#4CAF50");
    } catch (err) {
      console.error("Failed to copy QR code: ", err);
      showCopyFeedback("fas fa-xmark", "Copy failed", "#c0392b");
    }
  }

  const copyLabel = [...copyQrBtn.childNodes].map((node) => node.cloneNode(true));
  let feedbackTimer;

  function showCopyFeedback(iconClass, text, color) {
    clearTimeout(feedbackTimer);
    const icon = document.createElement("i");
    icon.className = iconClass;
    copyQrBtn.replaceChildren(icon, ` ${text}`);
    copyQrBtn.style.backgroundColor = color;

    feedbackTimer = setTimeout(() => {
      copyQrBtn.replaceChildren(...copyLabel.map((node) => node.cloneNode(true)));
      copyQrBtn.style.backgroundColor = "";
    }, 2000);
  }
}
