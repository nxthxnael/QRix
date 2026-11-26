export function initFormSwitcher() {
  const typeButtons = document.querySelectorAll(".qr-type-btn");
  const forms = document.querySelectorAll(".form-type");

  function select(button) {
    const selectedType = button.dataset.type;

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
