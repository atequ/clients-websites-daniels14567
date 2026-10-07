// Loaded as a plain script in <head>, before the stylesheet paints, so a page
// never flashes the wrong theme. A saved choice wins; otherwise the device's.
(function () {
  var theme = null;
  try {
    theme = localStorage.getItem("panel.theme");
  } catch (e) {
    // Storage can be blocked; fall back to the device setting.
  }
  if (theme !== "light" && theme !== "dark") {
    theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  document.documentElement.dataset.theme = theme;
})();
