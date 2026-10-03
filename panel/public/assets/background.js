import { mountPixelSnow } from "./pixel-snow.js";

// The panel's background, shared by every page. Settings picked on
// https://reactbits.dev/backgrounds/pixel-snow; anything not listed keeps the
// component's default.
export function mountBackground() {
  mountPixelSnow({
    variant: "snowflake",
    pixelResolution: 500,
    flakeSize: 0.013,
    farPlane: 50,
    density: 0.4,
  });
}
