// Light/dark button. theme-init.js has already applied the saved choice (or
// the device setting) before the page painted; this keeps it in sync.

const KEY = "panel.theme";

// The icon shows the theme a tap switches to: a moon in light, a sun in dark.
const SUN =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const MOON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M20.4 14.6A8.5 8.5 0 0 1 9.4 3.6a8.5 8.5 0 1 0 11 11z"/></svg>';

const root = document.documentElement;

function savedTheme() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function mountThemeToggle(host) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "theme-toggle";
  button.setAttribute("aria-label", "Тёмная тема");

  function sync() {
    const dark = root.dataset.theme === "dark";
    button.setAttribute("aria-pressed", String(dark));
    button.title = dark ? "Светлая тема" : "Тёмная тема";
    button.innerHTML = dark ? SUN : MOON;
  }

  button.addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    // Apply the new colours with fades switched off, so the whole page swaps
    // at once; reading offsetHeight makes the browser apply them right here.
    root.classList.add("theme-swapping");
    root.dataset.theme = next;
    void document.body.offsetHeight;
    root.classList.remove("theme-swapping");
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Not remembered, but the button still works for this page.
    }
    sync();
  });

  // Until someone taps the button, follow the device as it changes.
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (event) => {
    if (savedTheme()) return;
    root.dataset.theme = event.matches ? "dark" : "light";
    sync();
  });

  sync();
  host.replaceChildren(button);
}
