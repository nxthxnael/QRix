// the wifi qr format treats \ ; , : " as syntax, so they need a backslash in the ssid and password
export const escapeWifi = (value) => value.replace(/[\\;,:"]/g, "\\$&");

// a readable download name from the code's content, e.g. qrix-example-com;
// wi-fi codes use only the network name, never the password
// fnv-1a, a tiny standard hash: 8 hex characters that tell contents apart, not a security measure
function fingerprint(text) {
  let hash = 0x811c9dc5;
  for (const char of text) hash = Math.imul(hash ^ char.codePointAt(0), 0x01000193);
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function exportName(data) {
  // any wi-fi code is named by its network only; S: counts only where a field starts, so an S:
  // inside another field, like a password, is never read, and a code without one is just "wifi"
  const ssid = data.startsWith("WIFI:") ? (/^WIFI:(?:(?:\\.|[^;\\])*;)*?S:((?:\\.|[^;\\])*)/.exec(data)?.[1] ?? "") : undefined;
  // tel: and mailto: go first, then an optional scheme and an optional www., with or without the scheme
  const text = ssid !== undefined
    ? `wifi ${ssid.replace(/\\(.)/g, "$1")}`
    : data.replace(/^(tel|mailto):/i, "").replace(/^(https?:\/\/)?(www\.)?/i, "");
  const slug = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/, "");
  // browsers may drop non-ascii download names, so any non-ascii content adds a short fingerprint:
  // names stay ascii-safe and different codes still get different files (wi-fi: network name only)
  const suffix = /[^\x00-\x7f]/.test(text) ? `-${fingerprint(text)}` : "";
  return `qrix-${slug || "code"}${suffix}`;
}

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
      // tel: links allow - . ( ) as separators but not spaces, which strict scanners stop at
      const value = activeForm.querySelector("input")?.value.replace(/\s+/g, "");
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
