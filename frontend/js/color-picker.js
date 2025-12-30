let qrAppearance = {
  size: 256,
  colorDark: "#000000",
  colorLight: "#ffffff",
};

export function initColorPicker(onChange) {
  const colorInput = document.getElementById("qr-color");
  const bgInput = document.getElementById("qr-background");
  const sizeInput = document.getElementById("qr-size");
  const sizeLabel = document.getElementById("qr-size-value");
  const colorText = document.getElementById("qr-color-text");
  const bgText = document.getElementById("qr-background-text");

  function syncColorInputs(picker, textInput, property) {
    // Update text when picker changes
    picker.addEventListener("input", () => {
      textInput.value = picker.value.toUpperCase();
      qrAppearance[property] = picker.value;
      if (onChange) onChange(qrAppearance);
    });

    // Update picker when text changes
    textInput.addEventListener("input", () => {
      const val = textInput.value;
      if (/^#[0-9A-F]{6}$/i.test(val)) {
        picker.value = val;
        qrAppearance[property] = val;
        if (onChange) onChange(qrAppearance);
      }
    });
  }

  if (colorInput && colorText) {
    syncColorInputs(colorInput, colorText, "colorDark");
  } else if (colorInput) {
    colorInput.addEventListener("input", () => {
      qrAppearance.colorDark = colorInput.value;
      if (onChange) onChange(qrAppearance);
    });
  }

  if (bgInput && bgText) {
    syncColorInputs(bgInput, bgText, "colorLight");
  } else if (bgInput) {
    bgInput.addEventListener("input", () => {
      qrAppearance.colorLight = bgInput.value;
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
