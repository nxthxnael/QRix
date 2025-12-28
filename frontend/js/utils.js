export function getQRData() {
  const activeForm = document.querySelector(".form-type.active");
  if (!activeForm) return null;

  const type = activeForm.dataset.type;

  switch (type) {
    case "url":
      return activeForm.querySelector("input")?.value.trim();

    case "text":
      return activeForm.querySelector("textarea")?.value.trim();

    case "phone": {
      const value = activeForm.querySelector("input")?.value.trim();
      return value ? `tel:${value}` : null;
    }

    case "email": {
      const value = activeForm.querySelector("input")?.value.trim();
      return value ? `mailto:${value}` : null;
    }

    case "wifi": {
      const inputs = activeForm.querySelectorAll("input");
      const ssid = inputs[0]?.value;
      const password = inputs[1]?.value;
      const encryption = inputs[2]?.value || "WPA";
      const hidden = inputs[3]?.checked ? "true" : "false";

      if (!ssid) return null;

      return `WIFI:T:${encryption};S:${ssid};P:${password};H:${hidden};`;
    }

    default:
      return null;
  }
}
