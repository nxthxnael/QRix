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
      const value = activeForm.querySelector("textarea")?.value.trim();
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

    case "wifi": {
      const ssid = activeForm.querySelector('input[type="text"]')?.value.trim();
      const password = activeForm.querySelector(
        'input[type="password"]'
      )?.value;
      const encryption =
        activeForm.querySelector("#wifi-encryption")?.value || "WPA";
      const hidden = activeForm.querySelector("#hidden")?.checked
        ? "true"
        : "false";

      if (!ssid) return null;

      const passwordPart = encryption === "nopass" ? "" : `P:${password};`;

      return `WIFI:T:${encryption};S:${ssid};${passwordPart}H:${hidden};`;
    }

    default:
      return null;
  }
}

export function togglePassword() {
  const passwordInput = document.getElementById("wifi-password");
  const togglePasswordBtn = document.getElementById("toggle-password");

  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener("click", () => {
      const type =
        passwordInput.getAttribute("type") === "password" ? "text" : "password";
      passwordInput.setAttribute("type", type);
      togglePasswordBtn.classList.toggle("fa-eye");
      togglePasswordBtn.classList.toggle("fa-eye-slash");
    });
  }
}
