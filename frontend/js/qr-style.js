// shortcut: bigger logos are rejected so the svg and png stay small, raise it if users hit it
const MAX_LOGO_BYTES = 512 * 1024;

let logo = null;

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
  let previousLevel;
  if (!input) return;

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
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > MAX_LOGO_BYTES) {
      alert("Choose an image smaller than 512 KB.");
      input.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      logo = reader.result;
      lockLevel();
      if (clear) clear.hidden = false;
      redraw();
    };
    reader.readAsDataURL(file);
  });

  clear?.addEventListener("click", () => {
    logo = null;
    unlockLevel();
    input.value = "";
    clear.hidden = true;
    redraw();
  });
}
