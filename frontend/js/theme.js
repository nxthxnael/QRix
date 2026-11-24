const KEY = "qrix-theme";

// storage can throw (private mode, blocked site data); the toggle then works for this visit only
function stored() {
  try {
    const value = localStorage.getItem(KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

export function initThemeToggle() {
  const button = document.getElementById("themeToggle");
  if (!button) return;
  const system = window.matchMedia("(prefers-color-scheme: dark)");
  const current = () => document.documentElement.dataset.theme ?? (system.matches ? "dark" : "light");

  const render = () => {
    const theme = current();
    button.dataset.current = theme;
    button.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
  };

  button.addEventListener("click", () => {
    const next = current() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {}
    render();
  });

  // with no choice stored, the page follows the system live, so the button must too
  system.addEventListener("change", () => {
    if (!stored()) render();
  });

  // a choice made in another open tab applies here too, so this tab cannot overwrite it later
  window.addEventListener("storage", (event) => {
    if (event.key !== KEY) return;
    const theme = stored();
    if (theme) document.documentElement.dataset.theme = theme;
    else delete document.documentElement.dataset.theme;
    render();
  });
  render();
}
