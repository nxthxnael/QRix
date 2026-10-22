let qrAppearance = {
  size: 256,
  colorDark: "#000000",
  colorLight: "#ffffff",
  colorDark2: "#2563eb",
  gradient: "none",
};

// WCAG relative luminance of a #rrggbb color
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const channel = parseInt(hex.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// shortcut: 3:1 is a rule of thumb for phone scanners, not a guarantee; tune it after real scan tests
const MIN_CONTRAST = 3;

function pairWarning(colorDark, colorLight) {
  const dark = luminance(colorDark);
  const light = luminance(colorLight);
  if (dark > light) {
    return "The code is lighter than its background. Many scanners cannot read inverted codes.";
  }
  if ((light + 0.05) / (dark + 0.05) < MIN_CONTRAST) {
    return "Low contrast between the code and its background. It may not scan reliably.";
  }
  return "";
}

// a gradient has to pass at both of its colors
export function getContrastWarning({ colorDark, colorLight, colorDark2, gradient = "none" }) {
  const stops = gradient === "none" ? [colorDark] : [colorDark, colorDark2];
  return stops.map((stop) => pairWarning(stop, colorLight)).find(Boolean) ?? "";
}

export function initColorPicker(onChange) {
  const colorInput = document.getElementById("qr-color");
  const bgInput = document.getElementById("qr-background");
  const sizeInput = document.getElementById("qr-size");
  const sizeLabel = document.getElementById("qr-size-value");
  const colorText = document.getElementById("qr-color-text");
  const bgText = document.getElementById("qr-background-text");
  const color2Input = document.getElementById("qr-color2");
  const color2Text = document.getElementById("qr-color2-text");
  const gradientSelect = document.getElementById("qr-gradient");
  const warning = document.getElementById("qr-contrast-warning");

  function updateWarning() {
    if (!warning) return;
    warning.textContent = getContrastWarning(qrAppearance);
    warning.hidden = !warning.textContent;
  }

  function syncColorInputs(picker, textInput, property) {
    // Update text when picker changes
    picker.addEventListener("input", () => {
      textInput.value = picker.value.toUpperCase();
      qrAppearance[property] = picker.value;
      updateWarning();
      if (onChange) onChange(qrAppearance);
    });

    // Update picker when text changes
    textInput.addEventListener("input", () => {
      const val = textInput.value;
      if (/^#[0-9A-F]{6}$/i.test(val)) {
        picker.value = val;
        qrAppearance[property] = val;
        updateWarning();
        if (onChange) onChange(qrAppearance);
      }
    });
  }

  if (colorInput && colorText) {
    syncColorInputs(colorInput, colorText, "colorDark");
  } else if (colorInput) {
    colorInput.addEventListener("input", () => {
      qrAppearance.colorDark = colorInput.value;
      updateWarning();
      if (onChange) onChange(qrAppearance);
    });
  }

  if (bgInput && bgText) {
    syncColorInputs(bgInput, bgText, "colorLight");
  } else if (bgInput) {
    bgInput.addEventListener("input", () => {
      qrAppearance.colorLight = bgInput.value;
      updateWarning();
      if (onChange) onChange(qrAppearance);
    });
  }

  if (color2Input && color2Text) syncColorInputs(color2Input, color2Text, "colorDark2");

  if (gradientSelect) {
    gradientSelect.addEventListener("change", () => {
      qrAppearance.gradient = gradientSelect.value;
      updateWarning();
      if (onChange) onChange(qrAppearance);
    });
  }

  if (sizeInput) {
    sizeInput.addEventListener("input", () => {
      qrAppearance.size = parseInt(sizeInput.value, 10);
      if (sizeLabel) sizeLabel.textContent = `${qrAppearance.size}px`;
      if (onChange) onChange(qrAppearance);
    });
  }
}

export function getQRAppearance() {
  return qrAppearance;
}
