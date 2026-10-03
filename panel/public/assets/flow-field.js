// Canvas particle flow-field background.
// Ported from KokonutUI "Flow Field" (MIT, https://github.com/kokonut-labs/kokonutui).

const THEMES = {
  aurora: { hueStart: 120, hueRange: 200, saturation: 90, lightness: 62, bg: "5, 5, 8", trailAlpha: 0.06 },
  ember: { hueStart: 0, hueRange: 55, saturation: 95, lightness: 58, bg: "8, 4, 2", trailAlpha: 0.07 },
  ocean: { hueStart: 180, hueRange: 90, saturation: 88, lightness: 60, bg: "2, 6, 10", trailAlpha: 0.06 },
};

// Particle counts are tuned for a 1920×1080 screen and scaled by area,
// so phones don't run a desktop-sized simulation.
const DENSITY = { sparse: 600, medium: 1200, dense: 2000 };
const REFERENCE_AREA = 1920 * 1080;

function fieldAngle(x, y, t) {
  const s = 0.0025;
  return (
    Math.sin(x * s + t * 0.0007) * Math.PI +
    Math.cos(y * s + t * 0.0005) * Math.PI +
    Math.sin((x + y) * s * 0.6 + t * 0.0009) * Math.PI * 0.6 +
    Math.cos((x - y) * s * 0.4 + t * 0.0006) * Math.PI * 0.4
  );
}

export function mountFlowField({ theme = "ocean", density = "medium", opacity = 1 } = {}) {
  const cfg = THEMES[theme];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const root = document.createElement("div");
  root.className = "flow-field";
  root.setAttribute("aria-hidden", "true");
  root.style.setProperty("--ff-bg", cfg.bg);
  root.style.setProperty("--ff-opacity", String(opacity));

  const canvas = document.createElement("canvas");
  root.append(canvas);
  document.body.prepend(root);

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let width = 0;
  let height = 0;
  let time = 0;
  let particles = [];

  const respawn = (p) => {
    p.x = Math.random() * width;
    p.y = Math.random() * height;
    p.hue = cfg.hueStart + Math.random() * cfg.hueRange;
  };

  const spawn = () => {
    const maxLife = 200 + Math.floor(Math.random() * 300);
    const p = { speed: 1.1 + Math.random() * 1.8, life: Math.floor(Math.random() * maxLife), maxLife };
    respawn(p);
    return p;
  };

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = `rgb(${cfg.bg})`;
    ctx.fillRect(0, 0, width, height);

    const scale = Math.min(Math.max((width * height) / REFERENCE_AREA, 0.35), 1.2);
    particles = Array.from({ length: Math.round(DENSITY[density] * scale) }, spawn);
  };

  const step = () => {
    time++;
    ctx.fillStyle = `rgba(${cfg.bg}, ${cfg.trailAlpha})`;
    ctx.fillRect(0, 0, width, height);

    for (const p of particles) {
      const angle = fieldAngle(p.x, p.y, time);
      p.x += Math.cos(angle) * p.speed;
      p.y += Math.sin(angle) * p.speed;
      p.life++;

      if (p.life > p.maxLife) {
        respawn(p);
        p.life = 0;
        continue;
      }

      if (p.x < 0) p.x += width;
      else if (p.x > width) p.x -= width;
      if (p.y < 0) p.y += height;
      else if (p.y > height) p.y -= height;

      const progress = p.life / p.maxLife;
      const alpha = Math.min(progress * 8, 1) * Math.min((1 - progress) * 6, 1) * 0.9;
      const hue = (p.hue + (angle / (Math.PI * 2)) * 70 + 360) % 360;

      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.3, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, ${cfg.saturation}%, ${cfg.lightness}%, ${alpha})`;
      ctx.fill();
    }
  };

  // With reduced motion, paint one settled frame of trails and stop.
  const paintStill = () => {
    resize();
    for (let i = 0; i < 90; i++) step();
  };

  if (reducedMotion) {
    paintStill();
    let timer;
    window.addEventListener("resize", () => {
      clearTimeout(timer);
      timer = setTimeout(paintStill, 150);
    });
    return;
  }

  const loop = () => {
    step();
    requestAnimationFrame(loop);
  };

  resize();
  let timer;
  window.addEventListener("resize", () => {
    clearTimeout(timer);
    timer = setTimeout(resize, 150);
  });
  requestAnimationFrame(loop);
}
