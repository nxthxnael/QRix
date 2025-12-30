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
    const svg = qrContainer.querySelector("svg");
    if (!svg) return;

    const pngUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = "qrcode.png";
    link.href = pngUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = parseInt(svg.getAttribute("width"));
      canvas.height = parseInt(svg.getAttribute("height"));
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      const pngUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = "qrcode.png";
      link.href = pngUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  function downloadAsSvg() {
    if (!qrInstance) return;

    const svg = qrContainer.querySelector("svg");
    if (!svg) return;

    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(svg);
    svgString = '<?xml version="1.0" standalone="no"?>\r\n' + svgString;

    const svgBlob = new Blob([svgString], {
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
    if (!qrInstance) return;

    try {
      const canvas = qrContainer.querySelector("canvas");
      if (!canvas) return;
      const svg = qrContainer.querySelector("svg");
      if (!svg) return;

      canvas.toBlob(async (blob) => {
        const item = new ClipboardItem({ "image/png": blob });
        await navigator.clipboard.write([item]);
        showCopyFeedback();
      });
      const svgData = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = parseInt(svg.getAttribute("width"));
        canvas.height = parseInt(svg.getAttribute("height"));
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        canvas.toBlob(async (blob) => {
          const item = new ClipboardItem({ "image/png": blob });
          await navigator.clipboard.write([item]);
          showCopyFeedback();
          URL.revokeObjectURL(url);
        });
      };
      img.src = url;
    } catch (err) {
      console.error("Failed to copy QR code: ", err);
      // Fallback to basic copy if Clipboard API fails
      try {
        const canvas = qrContainer.querySelector("canvas");
        canvas.toBlob((blob) => {
          const item = new ClipboardItem({ "image/png": blob });
          navigator.clipboard.write([item]).then(() => {
            showCopyFeedback();
          });
        });
      } catch (e) {
        console.error("Fallback copy also failed: ", e);
      }
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
