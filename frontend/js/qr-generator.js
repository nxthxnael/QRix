import { getQRData, exportName } from "./utils.js";
import { getQRAppearance, getScanAdvice } from "./color-picker.js";
import { buildSvg, QUIET_ZONE } from "./qr-svg.js";
import { getQRStyle } from "./qr-style.js";

let qrInstance = null;
// the content behind qrInstance, used to name downloads
let qrData = null;

// shown faded until the visitor types, so the preview and style choices are never an empty box
const EXAMPLE = "https://github.com/nxthxnael/QRix";

// shortcut: fixed delay, not a download-complete signal, enough for the browser to start reading the blob
const REVOKE_DELAY_MS = 10000;

export function initQRGenerator() {
  const qrContainer = document.querySelector(".qr-code-container");
  const generationSection = document.querySelector(".generation-section");
  const qrActions = document.querySelector(".qr-actions");
  const downloadPngBtn = document.getElementById("downloadPngBtn");
  const downloadSvgBtn = document.getElementById("downloadSvgBtn");
  const copyQrBtn = document.getElementById("copyQrBtn");
  const shareQrBtn = document.getElementById("shareQrBtn");
  const exportScale = document.getElementById("exportScale");
  const exportTransparent = document.getElementById("exportTransparent");
  const errorCorrection = document.getElementById("qr-error-correction");
  const exportError = document.getElementById("exportError");
  const exportNote = document.getElementById("exportNote");
  const scanBadge = document.getElementById("scanBadge");

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

  // the system share sheet, offered only where it can take an image file (mostly phones)
  const canShareFiles = () => {
    try {
      return Boolean(navigator.canShare?.({ files: [new File([""], "qrix.png", { type: "image/png" })] }));
    } catch {
      return false;
    }
  };
  if (shareQrBtn && canShareFiles()) {
    shareQrBtn.hidden = false;
    shareQrBtn.addEventListener("click", shareCode);
  }

  let actionsTimer;

  function generateQR(event) {
    // any change, including a new export scale, makes an earlier png failure stale
    if (exportError) exportError.hidden = true;
    // export options only change the downloaded file, and naming a saved style changes nothing yet;
    // the png scale still changes how many pixels each module gets
    if (event?.target.closest(".qr-actions, .save-brand")) return updateBadge();
    // a new code makes the download note stale; export options leave it, so its one-time link is not lost
    if (exportNote) exportNote.replaceChildren();

    clearTimeout(actionsTimer);
    const data = getQRData();

    const { size } = getQRAppearance();

    // qrcodejs only encodes here; the preview and exports are drawn from its matrix as svg
    try {
      qrInstance = new QRCode(document.createElement("div"), {
        text: data ?? EXAMPLE,
        width: size,
        height: size,
        correctLevel: QRCode.CorrectLevel[getQRStyle().logo ? "H" : errorCorrection?.value] ?? QRCode.CorrectLevel.H,
      });
    } catch {
      // qrcodejs throws when the content does not fit; never leave the previous code exportable
      if (typeof QRCode === "undefined") return showEmpty("The QR library did not load. Check your connection and reload.");
      // error correction lives in the customize panel, so open it where the message points
      const customize = document.getElementById("customize");
      if (customize) customize.open = true;
      return showEmpty("Too long for a QR code. Shorten it, or lower the error correction under Customize.");
    }

    const svg = new DOMParser().parseFromString(svgMarkup({ size }), "image/svg+xml");
    qrContainer.replaceChildren(document.importNode(svg.documentElement, true));

    qrData = data;
    // the example is a preview only: nothing to export until the visitor's own content is in
    qrContainer.toggleAttribute("data-example", !data);
    if (!data) {
      qrInstance = null;
      hideActions();
      const caption = document.createElement("p");
      // something typed but not enough for a code, such as a wi-fi name without its password
      const started = [...document.querySelectorAll(".form-type.active input")].some((input) => input.type !== "checkbox" && input.value.trim());
      caption.textContent = started ? "Example. Finish the form to make your code." : "Example. Enter your content to make yours.";
      qrContainer.append(caption);
      return;
    }

    updateBadge();

    // Show actions after a short delay for QR code to render
    actionsTimer = setTimeout(() => {
      qrActions.hidden = false;
      // kept in actionsTimer too, so a code cleared in these 10ms cannot leave .visible behind
      actionsTimer = setTimeout(() => qrActions.classList.add("visible"), 10);
    }, 100);
  }

  function showEmpty(message) {
    qrInstance = null;
    qrContainer.removeAttribute("data-example");
    const text = document.createElement("p");
    text.textContent = message;
    qrContainer.replaceChildren(text);
    hideActions();
  }

  // drops .visible too, so the actions fade in again the next time a code is ready
  function hideActions() {
    qrActions.hidden = true;
    qrActions.classList.remove("visible");
    updateBadge();
  }

  // whether the code on screen should scan; shown only for a code that can be exported
  function updateBadge() {
    if (!scanBadge) return;
    scanBadge.hidden = !qrInstance;
    if (!qrInstance) return;
    const advice = getScanAdvice(getQRAppearance(), qrInstance._oQRCode.getModuleCount(), parseInt(exportScale?.value ?? "1", 10));
    scanBadge.dataset.ok = advice.ok;
    scanBadge.querySelector("use")?.setAttribute("href", advice.ok ? "#i-check" : "#i-alert");
    const text = scanBadge.querySelector("span");
    if (text) text.textContent = advice.text;
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
    link.download = `${exportName(qrData)}.png`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
    showDownloadNote();
  }

  function downloadAsSvg() {
    if (!qrInstance) return;

    const svgBlob = new Blob(
      [`<?xml version="1.0" standalone="no"?>\r\n${svgMarkup({ transparent: exportTransparent?.checked })}`],
      { type: "image/svg+xml;charset=utf-8" }
    );
    const svgUrl = URL.createObjectURL(svgBlob);

    const link = document.createElement("a");
    link.download = `${exportName(qrData)}.svg`;
    link.href = svgUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(svgUrl), REVOKE_DELAY_MS);
    showDownloadNote();
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
      showCopyFeedback("check", "Copied!", "success");
      // a copied code is usually pasted into something printed, so it gets the same reminder
      showDownloadNote("Copied");
    } catch (err) {
      console.error("Failed to copy QR code: ", err);
      if (copying !== qrInstance) return;
      showCopyFeedback("x", "Copy failed", "error");
    }
  }

  async function shareCode() {
    if (!qrInstance) return;
    if (exportError) exportError.hidden = true;
    const sharing = qrInstance;
    try {
      const blob = await renderPngBlob();
      if (sharing !== qrInstance) return;
      await navigator.share({ files: [new File([blob], `${exportName(qrData)}.png`, { type: "image/png" })] });
      if (sharing === qrInstance) showDownloadNote("Shared");
    } catch (err) {
      // closing the share sheet is not a failure
      if (err?.name === "AbortError" || sharing !== qrInstance) return;
      console.error("Failed to share QR code: ", err);
      if (exportError) {
        exportError.textContent = "Could not share the code. Download the PNG instead.";
        exportError.hidden = false;
      }
    }
  }

  let noteTimer;

  // after a download or copy: a reminder to test-scan, and once per visitor a quiet link to the repository
  function showDownloadNote(done = "Downloaded") {
    if (!exportNote) return;
    clearTimeout(noteTimer);
    exportNote.replaceChildren(`${done}. Scan it with your phone camera before you print it.`);
    // asked unless the mark is both unread and saved now, so a failed save can never repeat the link
    let asked;
    try {
      asked = localStorage.getItem("qrix-star-asked") === "1";
      localStorage.setItem("qrix-star-asked", "1");
    } catch {
      asked = true;
    }
    if (!asked) {
      const link = document.createElement("a");
      link.href = "https://github.com/nxthxnael/QRix";
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = "star it on GitHub";
      exportNote.append(" QRix is free and open source: ", link, ".");
    }
    // never hide it under someone who has tabbed to its link; check again a little later
    const hide = () => {
      if (exportNote.contains(document.activeElement)) noteTimer = setTimeout(hide, 2000);
      else exportNote.replaceChildren();
    };
    noteTimer = setTimeout(hide, asked ? 6000 : 12000);
  }

  const copyLabel = [...copyQrBtn.childNodes].map((node) => node.cloneNode(true));
  let feedbackTimer;

  function showCopyFeedback(iconName, text, state) {
    clearTimeout(feedbackTimer);
    const SVG = "http://www.w3.org/2000/svg";
    const icon = document.createElementNS(SVG, "svg");
    icon.setAttribute("class", "icon");
    icon.setAttribute("aria-hidden", "true");
    const use = document.createElementNS(SVG, "use");
    use.setAttribute("href", `#i-${iconName}`);
    icon.append(use);
    copyQrBtn.replaceChildren(icon, ` ${text}`);
    // the colors live in css, keyed by this state
    copyQrBtn.dataset.feedback = state;

    feedbackTimer = setTimeout(() => {
      copyQrBtn.replaceChildren(...copyLabel.map((node) => node.cloneNode(true)));
      delete copyQrBtn.dataset.feedback;
    }, 2000);
  }

  // draw the faded example right away, so the preview is never an empty box
  generateQR();
}
