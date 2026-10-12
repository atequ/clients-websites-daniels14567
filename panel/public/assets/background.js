// Animated light beams behind every page.
// Ported from KokonutUI "Beams Background" (MIT, https://github.com/kokonut-labs/kokonutui),
// recoloured: soft white beams glowing on black in dark mode, and the reverse,
// faint graphite beams on light grey, in light mode.

// Per theme: beam colour as HSL (the hue drifts across a range so beams carry
// a faint pearl tint) and an overall strength.
const PALETTES = {
  dark: { hueBase: 200, hueRange: 60, saturation: 40, lightness: 95, strength: 1.8 },
  light: { hueBase: 215, hueRange: 30, saturation: 12, lightness: 30, strength: 0.85 },
};

const BEAM_COUNT = 30;

// The beams are blurred heavily, so drawing them at half resolution looks the
// same and costs a quarter of the pixels.
const SCALE = 0.5;

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function createBeam(width, height, palette) {
  return {
    x: Math.random() * width * 1.5 - width * 0.25,
    y: Math.random() * height * 1.5 - height * 0.25,
    width: 30 + Math.random() * 60,
    length: height * 2.5,
    angle: -35 + Math.random() * 10,
    speed: 0.6 + Math.random() * 1.2,
    opacity: 0.12 + Math.random() * 0.16,
    hue: palette.hueBase + Math.random() * palette.hueRange,
    pulse: Math.random() * Math.PI * 2,
    pulseSpeed: 0.02 + Math.random() * 0.03,
  };
}

// A beam that has risen off the top comes back from below, spread across three
// columns so the screen stays evenly covered.
function resetBeam(beam, index, width, height, palette) {
  const spacing = width / 3;
  beam.y = height + 100;
  beam.x = (index % 3) * spacing + spacing / 2 + (Math.random() - 0.5) * spacing * 0.5;
  beam.width = 100 + Math.random() * 100;
  beam.length = height * 2.5;
  beam.speed = 0.5 + Math.random() * 0.4;
  beam.hue = palette.hueBase + (index * palette.hueRange) / BEAM_COUNT;
  beam.opacity = 0.2 + Math.random() * 0.1;
}

function drawBeam(ctx, beam, palette) {
  ctx.save();
  ctx.translate(beam.x, beam.y);
  ctx.rotate((beam.angle * Math.PI) / 180);

  const alpha = beam.opacity * (0.8 + Math.sin(beam.pulse) * 0.2) * palette.strength;
  const color = (a) => `hsla(${beam.hue}, ${palette.saturation}%, ${palette.lightness}%, ${a})`;

  const gradient = ctx.createLinearGradient(0, 0, 0, beam.length);
  gradient.addColorStop(0, color(0));
  gradient.addColorStop(0.1, color(alpha * 0.5));
  gradient.addColorStop(0.4, color(alpha));
  gradient.addColorStop(0.6, color(alpha));
  gradient.addColorStop(0.9, color(alpha * 0.5));
  gradient.addColorStop(1, color(0));

  ctx.fillStyle = gradient;
  ctx.fillRect(-beam.width / 2, 0, beam.width, beam.length);
  ctx.restore();
}

export function mountBackground() {
  const root = document.createElement("div");
  root.className = "beams";
  root.setAttribute("aria-hidden", "true");
  const canvas = document.createElement("canvas");
  root.append(canvas);
  document.body.prepend(root);

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const palette = () => PALETTES[document.documentElement.dataset.theme === "dark" ? "dark" : "light"];

  let width = 0;
  let height = 0;
  let beams = [];

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.ceil(width * SCALE);
    canvas.height = Math.ceil(height * SCALE);
    // Work in CSS pixels; the transform maps them onto the smaller canvas.
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    beams = Array.from({ length: BEAM_COUNT }, () => createBeam(width, height, palette()));
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const current = palette();
    for (const beam of beams) drawBeam(ctx, beam, current);
  }

  // Speeds are per 60 Hz frame; scaling by elapsed time keeps the motion the
  // same on faster screens.
  let last = 0;
  let frame = 0;
  function tick(now) {
    const step = last ? Math.min((now - last) / (1000 / 60), 3) : 1;
    last = now;
    const current = palette();
    beams.forEach((beam, index) => {
      beam.y -= beam.speed * step;
      beam.pulse += beam.pulseSpeed * step;
      if (beam.y + beam.length < -100) resetBeam(beam, index, width, height, current);
    });
    draw();
    frame = requestAnimationFrame(tick);
  }

  function start() {
    cancelAnimationFrame(frame);
    last = 0;
    if (reducedMotion.matches) draw();
    else frame = requestAnimationFrame(tick);
  }

  resize();
  start();

  window.addEventListener("resize", () => {
    resize();
    if (reducedMotion.matches) draw();
  });
  reducedMotion.addEventListener("change", start);

  // Recolour straight away when the theme button is tapped, even when still.
  new MutationObserver(draw).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
}
