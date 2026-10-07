// Light/dark switch. theme-init.js has already applied the saved choice (or
// the device setting) before the page painted; this keeps it in sync.

const KEY = "panel.theme";

const SUN =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const MOON =
  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.4 14.6A8.5 8.5 0 0 1 9.4 3.6a8.5 8.5 0 1 0 11 11z"/></svg>';

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
  button.className = "theme-switch";
  button.setAttribute("role", "switch");
  button.setAttribute("aria-label", "Тёмная тема");
  button.title = "Тёмная тема";

  const track = document.createElement("span");
  track.className = "theme-switch-track";
  const thumb = document.createElement("span");
  thumb.className = "theme-switch-thumb";
  thumb.setAttribute("aria-hidden", "true");
  track.append(thumb);
  button.append(track);

  function sync() {
    const dark = root.dataset.theme === "dark";
    button.setAttribute("aria-checked", String(dark));
    thumb.innerHTML = dark ? MOON : SUN;
  }

  button.addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Not remembered, but the switch still works for this page.
    }
    sync();
  });

  // Until someone flips the switch, follow the device as it changes.
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (event) => {
    if (savedTheme()) return;
    root.dataset.theme = event.matches ? "dark" : "light";
    sync();
  });

  sync();
  host.replaceChildren(button);
}
