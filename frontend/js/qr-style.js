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

  document.querySelectorAll("[data-preset]").forEach((button) =>
    button.addEventListener("click", () => {
      for (const [id, value] of Object.entries(PRESETS[button.dataset.preset] ?? {})) {
        const control = document.getElementById(id);
        // a logo keeps the error correction locked on high
        if (!control || control.disabled) continue;
        control.value = value;
        control.dispatchEvent(new Event(control.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
      }
    })
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
