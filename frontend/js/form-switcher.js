export function initFormSwitcher() {
  const typeButtons = document.querySelectorAll(".qr-type-btn");
  const forms = document.querySelectorAll(".form-type");

  typeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const selectedType = button.dataset.type;

      // Update active button
      typeButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      // Show matching form
      forms.forEach((form) => {
        form.classList.toggle("active", form.dataset.type === selectedType);
      });

      // the generator redraws on change, so the preview follows the new type
      button.dispatchEvent(new Event("change", { bubbles: true }));
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
