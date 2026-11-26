import { readStyle, applyStyle, cleanStyle, drawThumbnail } from "./qr-style.js";

const KEY = "qrix-brands";
export const MAX_BRANDS = 3;
const MAX_NAME = 30;

// saved styles from storage, cleaned: names are plain text and styles keep only values the controls accept,
// because they are drawn into svg thumbnails
export function loadBrands() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY));
    if (!Array.isArray(list)) return [];
    return list
      .filter((brand) => typeof brand?.name === "string" && brand.name.trim())
      .slice(0, MAX_BRANDS)
      .map((brand) => ({ name: brand.name.trim().slice(0, MAX_NAME), style: cleanStyle(brand.style) }));
  } catch {
    return [];
  }
}

// adds a style, replacing one with the same name; null when the list is already full
export function addBrand(brands, name, style) {
  const rest = brands.filter((brand) => brand.name !== name);
  return rest.length >= MAX_BRANDS ? null : [...rest, { name, style }];
}

// "My style 1", or the lowest number not taken, so a default name never replaces a saved style
export function defaultName(brands) {
  let n = 1;
  while (brands.some((brand) => brand.name === `My style ${n}`)) n++;
  return `My style ${n}`;
}

export function initBrands() {
  const list = document.getElementById("brandButtons");
  const form = document.getElementById("saveBrand");
  const nameInput = document.getElementById("brand-name");
  const submit = form?.querySelector("button");
  const hint = document.getElementById("brand-hint");
  if (!list || !form || !nameInput || !submit || !hint) return;

  let brands = loadBrands();

  // storage may be blocked: the styles then last for this visit, and the visitor is told
  const store = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(brands));
      return true;
    } catch {
      return false;
    }
  };

  function render(message) {
    list.replaceChildren(
      ...brands.map((brand, index) => {
        const item = document.createElement("span");
        item.className = "brand-item";

        const apply = document.createElement("button");
        apply.type = "button";
        apply.className = "preset-btn";
        apply.textContent = brand.name;
        apply.addEventListener("click", () => applyStyle(brand.style));
        drawThumbnail(apply, brand.style, `brand-gradient-${index}`);

        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "brand-remove";
        remove.setAttribute("aria-label", `Remove ${brand.name}`);
        remove.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-x" /></svg>';
        remove.addEventListener("click", () => {
          brands = brands.filter((other) => other !== brand);
          render(store() ? `Removed ${brand.name}.` : "Removed for this visit. This browser blocks saving.");
          // the removed button is gone, so focus goes back to where a new style is named
          nameInput.focus();
        });

        item.append(apply, remove);
        return item;
      })
    );
    list.hidden = !brands.length;
    const full = brands.length >= MAX_BRANDS;
    nameInput.disabled = submit.disabled = full;
    hint.textContent = message ?? (full ? `You have ${MAX_BRANDS} saved styles. Remove one to save another.` : `Saved on this device only, up to ${MAX_BRANDS}.`);
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = nameInput.value.trim().slice(0, MAX_NAME) || defaultName(brands);
    const next = addBrand(brands, name, readStyle());
    if (!next) return;
    brands = next;
    nameInput.value = "";
    render(store() ? `Saved ${name}.` : `Saved ${name} for this visit. This browser blocks saving.`);
  });

  render();
}
