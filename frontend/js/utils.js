// the wifi qr format treats \ ; , : " as syntax, so they need a backslash in the ssid and password
export const escapeWifi = (value) => value.replace(/[\\;,:"]/g, "\\$&");

export function getQRData() {
  const activeForm = document.querySelector(".form-type.active");
  if (!activeForm) return null;

  const type = activeForm.dataset.type;

  switch (type) {
    case "url": {
      const value = activeForm.querySelector("input")?.value.trim();
      return value || null;
    }

    case "text": {
      const value = activeForm.querySelector("#qr-text")?.value.trim();
      return value || null;
    }

    case "phone": {
      const value = activeForm.querySelector("input")?.value.trim();
      return value ? `tel:${value}` : null;
    }

    case "email": {
      const value = activeForm.querySelector("input")?.value.trim();
      return value ? `mailto:${value}` : null;
    }

    case "wi-fi": {
      // by id, because the eye button switches the password input's type
      const ssid = activeForm.querySelector("#wifi-ssid")?.value.trim();
      const password = activeForm.querySelector("#wifi-password")?.value ?? "";
      const encryption =
        activeForm.querySelector("#wifi-encryption")?.value || "WPA";
      const hidden = activeForm.querySelector("#hidden")?.checked
        ? "true"
        : "false";

      if (!ssid) return null;
      // a secured network with no password gives a code phones cannot join
      if (encryption !== "nopass" && !password) return null;

      const passwordPart = encryption === "nopass" ? "" : `P:${escapeWifi(password)};`;

      return `WIFI:T:${encryption};S:${escapeWifi(ssid)};${passwordPart}H:${hidden};`;
    }

    default:
      return null;
  }
}

export function togglePassword() {
  const passwordInput = document.getElementById("wifi-password");
  const togglePasswordBtn = document.getElementById("toggle-password");

  if (togglePasswordBtn && passwordInput) {
    const icon = togglePasswordBtn.querySelector("use");
    togglePasswordBtn.addEventListener("click", () => {
      const show = passwordInput.type === "password";
      passwordInput.type = show ? "text" : "password";
      togglePasswordBtn.setAttribute("aria-pressed", String(show));
      togglePasswordBtn.setAttribute("aria-label", show ? "Hide password" : "Show password");
      icon?.setAttribute("href", show ? "#i-eye-off" : "#i-eye");
    });
  }
}
