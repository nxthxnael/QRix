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
  const exportError = document.getElementById("exportError");

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
    // any change, including a new export scale, makes an earlier png failure stale
    if (exportError) exportError.hidden = true;
    // export options only change the downloaded file, not the preview
    if (event?.target.closest(".qr-actions")) return;

    clearTimeout(actionsTimer);
    const data = getQRData();
    if (!data) return showEmpty("Enter content to generate code");

    const { size } = getQRAppearance();

    // qrcodejs only encodes here; the preview and exports are drawn from its matrix as svg
    try {
      qrInstance = new QRCode(document.createElement("div"), {
        text: data,
        width: size,
        height: size,
        correctLevel: QRCode.CorrectLevel[getQRStyle().logo ? "H" : errorCorrection?.value] ?? QRCode.CorrectLevel.H,
      });
    } catch {
      // qrcodejs throws when the content does not fit; never leave the previous code exportable
      return showEmpty(typeof QRCode === "undefined"
        ? "The QR library did not load. Check your connection and reload."
        : "Too long for a QR code. Shorten it or lower the error correction.");
    }

    const svg = new DOMParser().parseFromString(svgMarkup({ size }), "image/svg+xml");
    qrContainer.replaceChildren(document.importNode(svg.documentElement, true));

    // Show actions after a short delay for QR code to render
    actionsTimer = setTimeout(() => {
      qrActions.style.display = "flex";
      setTimeout(() => qrActions.classList.add("visible"), 10);
    }, 100);
  }

  function showEmpty(message) {
    qrInstance = null;
    const text = document.createElement("p");
    text.textContent = message;
    qrContainer.replaceChildren(text);
    qrActions.style.display = "none";
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

    if (exportError) exportError.hidden = true;
    const exporting = qrInstance;
    let blob;
    try {
      blob = await renderPngBlob();
    } catch (err) {
      console.error("Failed to export PNG: ", err);
    }
    // the code changed while this render ran, so neither its file nor its failure matches the screen
    if (exporting !== qrInstance) return;
    if (!blob) {
      if (exportError) {
        exportError.textContent = "Could not create the PNG. Try a smaller scale.";
        exportError.hidden = false;
      }
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

    const copying = qrInstance;
    try {
      // pass the promise so the write starts inside the click's user activation
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": renderPngBlob() }),
      ]);
      // like the png export, an outcome for a code no longer on screen is not shown
      if (copying !== qrInstance) return;
      if (exportError) exportError.hidden = true;
      showCopyFeedback("check", "Copied!", "#4CAF50");
    } catch (err) {
      console.error("Failed to copy QR code: ", err);
      if (copying !== qrInstance) return;
      showCopyFeedback("x", "Copy failed", "#c0392b");
    }
  }

  const copyLabel = [...copyQrBtn.childNodes].map((node) => node.cloneNode(true));
  let feedbackTimer;

  function showCopyFeedback(iconName, text, color) {
    clearTimeout(feedbackTimer);
    const SVG = "http://www.w3.org/2000/svg";
    const icon = document.createElementNS(SVG, "svg");
    icon.setAttribute("class", "icon");
    icon.setAttribute("aria-hidden", "true");
    const use = document.createElementNS(SVG, "use");
    use.setAttribute("href", `#i-${iconName}`);
    icon.append(use);
    copyQrBtn.replaceChildren(icon, ` ${text}`);
    copyQrBtn.style.backgroundColor = color;

    feedbackTimer = setTimeout(() => {
      copyQrBtn.replaceChildren(...copyLabel.map((node) => node.cloneNode(true)));
      copyQrBtn.style.backgroundColor = "";
    }, 2000);
  }
}
