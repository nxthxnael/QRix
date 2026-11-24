// shortcut: bigger logos are rejected so the svg and png stay small, raise it if users hit it
const MAX_LOGO_BYTES = 512 * 1024;

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
  // the file behind the current logo, put back when a new pick is cancelled or rejected;
  // kept as a File because a browser may reuse and overwrite the input's own FileList
  let accepted = null;
  // numbers each read so a slow one cannot land after a newer pick or after remove
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

  const redraw = () => input.dispatchEvent(new Event("input", { bubbles: true }));

  input.addEventListener("change", () => {
    const file = input.files[0];
    const problem = !file ? ""
      : !file.type.startsWith("image/") ? "Choose a PNG, JPEG, WebP or SVG image."
      : file.size > MAX_LOGO_BYTES ? "Choose an image smaller than 512 KB."
      : "";
    const invalid = Boolean(problem);
    if (error) {
      error.textContent = problem;
      error.hidden = !invalid;
    }
    if (!file || invalid) {
      if (accepted) {
        const restored = new DataTransfer();
        restored.items.add(accepted);
        input.files = restored.files;
      } else input.value = "";
      return;
    }
    accepted = file;
    const read = ++latestRead;
    const reader = new FileReader();
    reader.onload = () => {
      if (read !== latestRead) return;
      logo = reader.result;
      lockLevel();
      if (clear) clear.hidden = false;
      redraw();
    };
    reader.readAsDataURL(file);
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
