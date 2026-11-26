import { detectPaste } from "./utils.js";

export function initFormSwitcher() {
  const typeButtons = document.querySelectorAll(".qr-type-btn");
  const forms = document.querySelectorAll(".form-type");

  const pasteNote = document.getElementById("pasteNote");

  function select(button) {
    const selectedType = button.dataset.type;
    // any type change ends what a paste note said; a paste sets its own note after this
    if (pasteNote) pasteNote.textContent = "";

    // a radio group: one checked segment, and only it takes tab focus
    typeButtons.forEach((btn) => {
      btn.setAttribute("aria-checked", String(btn === button));
      btn.tabIndex = btn === button ? 0 : -1;
    });

    forms.forEach((form) => {
      form.classList.toggle("active", form.dataset.type === selectedType);
    });

    // the generator redraws on change, so the preview follows the new type
    button.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // arrow keys move and select like native radios; home and end jump to the ends
  const KEYS = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

  typeButtons.forEach((button, index) => {
    button.addEventListener("click", () => select(button));
    button.addEventListener("keydown", (event) => {
      const last = typeButtons.length - 1;
      const target =
        event.key === "Home" ? 0
        : event.key === "End" ? last
        : event.key in KEYS ? (index + KEYS[event.key] + typeButtons.length) % typeButtons.length
        : null;
      if (target === null) return;
      event.preventDefault();
      select(typeButtons[target]);
      typeButtons[target].focus();
    });
  });

  // a paste that is clearly another type switches to it and fills its fields, and says so
  const section = document.querySelector(".generation-section");
  section?.addEventListener("paste", (event) => {
    const field = event.target;
    const form = field.closest?.(".form-type");
    // a password is pasted as it is, whatever it looks like
    if (!form || field.tagName !== "INPUT" || field.id === "wifi-password") return;
    const found = detectPaste((event.clipboardData?.getData("text") ?? "").trim(), form.dataset.type);
    const button = [...typeButtons].find((btn) => btn.dataset.type === found?.type);
    if (!button) return;
    event.preventDefault();
    const switched = found.type !== form.dataset.type;
    if (switched) select(button);
    for (const [selector, value] of Object.entries(found.values)) {
      const control = document.querySelector(`.form-type[data-type="${found.type}"] ${selector}`);
      if (!control) continue;
      if (control.type === "checkbox") control.checked = value;
      else control.value = value;
      control.dispatchEvent(new Event(control.tagName === "SELECT" || control.type === "checkbox" ? "change" : "input", { bubbles: true }));
    }
    document.querySelector(`.form-type[data-type="${found.type}"] input`)?.focus();
    // the note explains a type change; a paste that only cleaned its own field needs none
    if (pasteNote && switched) pasteNote.textContent = `Pasted as ${button.textContent.trim()}.`;
  });

  // Password row visibility
  const encryptionSelect = document.getElementById("wifi-encryption");
  const passwordRow = document.getElementById("wifi-password-row");

  if (encryptionSelect && passwordRow) {
    encryptionSelect.addEventListener("change", () => {
      const isOpenNetwork = encryptionSelect.value === "nopass";
      passwordRow.style.display = isOpenNetwork ? "none" : "block";
    });
  }
}
