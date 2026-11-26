import { buildSvg } from "./qr-svg.js";

// shortcut: bigger logos are rejected so the svg and png stay small, raise it if users hit it
const MAX_LOGO_BYTES = 512 * 1024;

// same formats as the picker's accept list, by extension for systems that report no type
const LOGO_TYPES = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", svg: "image/svg+xml" };

// the logo's image type, or "" when it is not an offered format
export function logoType(file) {
  if (file.type) return Object.values(LOGO_TYPES).includes(file.type) ? file.type : "";
  return LOGO_TYPES[file.name.split(".").pop().toLowerCase()] ?? "";
}

let logo = null;

// control id -> value; color texts take #RRGGBB and are read by the color picker on input
export const PRESETS = {
  classic: { "qr-shape": "square", "qr-corner": "square", "qr-gradient": "none", "qr-color-text": "#000000", "qr-background-text": "#FFFFFF" },
  soft: { "qr-shape": "rounded", "qr-corner": "rounded", "qr-gradient": "none", "qr-color-text": "#1F2937", "qr-background-text": "#FFFFFF" },
  dots: { "qr-shape": "dots", "qr-corner": "circle", "qr-gradient": "none", "qr-color-text": "#111827", "qr-background-text": "#FFFFFF", "qr-error-correction": "H" },
  ocean: { "qr-shape": "rounded", "qr-corner": "rounded", "qr-gradient": "diagonal", "qr-color-text": "#0F172A", "qr-color2-text": "#2563EB", "qr-background-text": "#FFFFFF" },
};

// every control a style is made of, keyed by id; gradient comes before its end color
export const STYLE_IDS = ["qr-color-text", "qr-background-text", "qr-gradient", "qr-color2-text", "qr-shape", "qr-corner", "qr-size", "qr-error-correction"];

// the current style as id -> value, the same shape as a preset
export function readStyle() {
  return Object.fromEntries(STYLE_IDS.map((id) => [id, document.getElementById(id)?.value]).filter(([, value]) => value !== undefined));
}

// a value the control can really hold; styles also come from links and storage, so nothing else gets in
function accepts(control, value) {
  if (typeof value !== "string") return false;
  if (control.tagName === "SELECT") return [...control.options].some((option) => option.value === value);
  if (control.type === "range") {
    const n = Number(value);
    return Number.isInteger(n) && n >= Number(control.min) && n <= Number(control.max) && (n - Number(control.min)) % Number(control.step) === 0;
  }
  return /^#[0-9a-f]{6}$/i.test(value);
}

// sets each known control the style names and tells the page, like the visitor changing it
export function applyStyle(style) {
  for (const id of STYLE_IDS) {
    const control = document.getElementById(id);
    // a logo keeps the error correction locked on high
    if (!control || control.disabled || !accepts(control, style?.[id])) continue;
    control.value = style[id];
    control.dispatchEvent(new Event(control.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
  }
}

// short, readable names for a style link; colors go without their #
const LINK_KEYS = { "qr-color-text": "color", "qr-background-text": "bg", "qr-gradient": "gradient", "qr-color2-text": "color2", "qr-shape": "shape", "qr-corner": "corner", "qr-size": "size", "qr-error-correction": "ec" };

// the page address with the style in its hash, e.g. #color=1f2937&shape=rounded; content is never included
export function styleLink(style, address) {
  const params = new URLSearchParams();
  for (const [id, key] of Object.entries(LINK_KEYS)) if (style[id] !== undefined) params.set(key, style[id].replace(/^#/, ""));
  return `${address.split("#")[0]}#${params}`;
}

// the style a link carries, unchecked: applyStyle decides what may be used
export function styleFromHash(hash) {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const style = {};
  for (const [id, key] of Object.entries(LINK_KEYS)) {
    const value = params.get(key);
    if (value !== null) style[id] = id.endsWith("-text") ? `#${value}` : value;
  }
  return style;
}

// a tiny code in each preset's own style, so the buttons show the look instead of naming it
function drawPresetThumbnails() {
  if (typeof QRCode === "undefined") return;
  // qrcodejs only encodes; its private matrix is what the svg renderer draws, as in the generator
  const model = new QRCode(document.createElement("div"), { text: "QRix", correctLevel: QRCode.CorrectLevel.L })._oQRCode;
  document.querySelectorAll("[data-preset]").forEach((button) => {
    const preset = PRESETS[button.dataset.preset];
    if (!preset) return;
    const markup = buildSvg({
      model,
      colorDark: preset["qr-color-text"],
      colorLight: preset["qr-background-text"],
      colorDark2: preset["qr-color2-text"],
      gradient: preset["qr-gradient"],
      shape: preset["qr-shape"],
      corner: preset["qr-corner"],
      size: 28,
      gradientId: `preset-gradient-${button.dataset.preset}`,
    });
    const svg = new DOMParser().parseFromString(markup, "image/svg+xml").documentElement;
    svg.setAttribute("aria-hidden", "true");
    button.prepend(document.importNode(svg, true));
  });
}

// reads the style controls at render time, like the export options do
export function getQRStyle() {
  return {
    shape: document.getElementById("qr-shape")?.value ?? "square",
    corner: document.getElementById("qr-corner")?.value ?? "square",
    logo,
  };
}

// the logo arrives asynchronously, so a fresh input event tells the generator to redraw
export function initQRStyle() {
  const input = document.getElementById("qr-logo");
  const clear = document.getElementById("qr-logo-clear");
  const level = document.getElementById("qr-error-correction");
  const error = document.getElementById("qr-logo-error");
  let previousLevel;
  // the file behind the current logo, set only once its read succeeds and put back when a
  // later pick fails; kept as a File because a browser may reuse the input's own FileList
  let accepted = null;
  // numbers each read so a slow one cannot land after a newer pick, a failed pick or remove
  let latestRead = 0;
  if (!input) return;

  // the customize panel reopens the way the visitor left it; storage may be blocked, which only loses that
  const panel = document.getElementById("customize");
  try {
    if (panel && localStorage.getItem("qrix-customize") === "open") panel.open = true;
  } catch {}
  panel?.addEventListener("toggle", () => {
    try {
      localStorage.setItem("qrix-customize", panel.open ? "open" : "closed");
    } catch {}
  });

  drawPresetThumbnails();

  // the last style comes back on the next visit; blocked storage or a bad entry only loses that
  try {
    applyStyle(JSON.parse(localStorage.getItem("qrix-style")));
  } catch {}
  const remember = (event) => {
    if (!STYLE_IDS.includes(event.target.id)) return;
    try {
      localStorage.setItem("qrix-style", JSON.stringify(readStyle()));
    } catch {}
  };
  document.addEventListener("input", remember);
  document.addEventListener("change", remember);

  // a shared style link wins over the remembered style, then leaves the address so a reload keeps later changes;
  // also on hashchange, for a link opened in a tab already showing the page
  const applySharedStyle = () => {
    const shared = styleFromHash(location.hash);
    if (!Object.keys(shared).length) return;
    applyStyle(shared);
    history.replaceState(null, "", location.pathname + location.search);
  };
  applySharedStyle();
  window.addEventListener("hashchange", applySharedStyle);

  const linkButton = document.getElementById("copyStyleLink");
  let linkTimer;
  linkButton?.addEventListener("click", async () => {
    clearTimeout(linkTimer);
    try {
      await navigator.clipboard.writeText(styleLink(readStyle(), location.href));
      linkButton.textContent = "Link copied";
    } catch {
      linkButton.textContent = "Copy failed";
    }
    linkTimer = setTimeout(() => (linkButton.textContent = "Copy style link"), 2000);
  });

  document.querySelectorAll("[data-preset]").forEach((button) =>
    button.addEventListener("click", () => applyStyle(PRESETS[button.dataset.preset]))
  );

  // a logo needs high error correction, so show that and lock the select until the logo goes
  const lockLevel = () => {
    if (!level || level.disabled) return;
    previousLevel = level.value;
    level.value = "H";
    level.disabled = true;
  };
  const unlockLevel = () => {
    if (!level) return;
    level.value = previousLevel ?? level.value;
    level.disabled = false;
  };

  const restorePicker = () => {
    if (!accepted) {
      input.value = "";
      return;
    }
    const restored = new DataTransfer();
    restored.items.add(accepted);
    input.files = restored.files;
  };

  const redraw = () => input.dispatchEvent(new Event("input", { bubbles: true }));

  input.addEventListener("change", () => {
    const file = input.files[0];
    const problem = !file ? ""
      : !logoType(file) ? "Choose a PNG, JPEG, WebP or SVG image."
      : file.size > MAX_LOGO_BYTES ? "Choose an image smaller than 512 KB."
      : "";
    const invalid = Boolean(problem);
    if (error) {
      error.textContent = problem;
      error.hidden = !invalid;
    }
    if (!file || invalid) {
      latestRead++;
      restorePicker();
      return;
    }
    const read = ++latestRead;
    const reader = new FileReader();
    // an aborted read ends like a failed one: the picker goes back and the visitor is told
    reader.onerror = reader.onabort = () => {
      if (read !== latestRead) return;
      restorePicker();
      if (error) {
        error.textContent = "Could not read that image. Try another file.";
        error.hidden = false;
      }
    };
    reader.onload = () => {
      if (read !== latestRead) return;
      accepted = file;
      // a typeless file reads as octet-stream, which browsers will not draw as svg
      logo = reader.result.replace(/^data:[^;,]*/, `data:${logoType(file)}`);
      lockLevel();
      if (clear) clear.hidden = false;
      redraw();
    };
    reader.readAsDataURL(file);
  });

  // current browsers fire cancel, not change, when the dialog is dismissed; the picker is untouched then
  input.addEventListener("cancel", () => {
    if (error) error.hidden = true;
  });

  clear?.addEventListener("click", () => {
    logo = null;
    accepted = null;
    latestRead++;
    if (error) error.hidden = true;
    unlockLevel();
    input.value = "";
    clear.hidden = true;
    redraw();
  });
}
