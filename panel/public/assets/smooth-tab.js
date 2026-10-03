// Segmented tabs with a spring-animated sliding indicator.
// Ported from KokonutUI "Smooth Tab" (MIT, https://github.com/kokonut-labs/kokonutui).

// Bake the original spring (stiffness 400, damping 30, mass 1) into a CSS
// linear() easing so the indicator moves with the same overshoot, no library.
function springEasing(stiffness = 400, damping = 30, samples = 40) {
  const w0 = Math.sqrt(stiffness);
  const zeta = damping / (2 * w0);
  const wd = w0 * Math.sqrt(1 - zeta * zeta);
  const decay = zeta * w0;
  const duration = -Math.log(0.001) / decay;

  const points = [];
  for (let i = 0; i <= samples; i++) {
    const t = (i / samples) * duration;
    const x = 1 - Math.exp(-decay * t) * (Math.cos(wd * t) + (decay / wd) * Math.sin(wd * t));
    points.push(i === samples ? "1" : x.toFixed(4));
  }
  return { easing: `linear(${points.join(", ")})`, ms: Math.round(duration * 1000) };
}

const SPRING = springEasing();
const supportsLinear = CSS.supports("transition-timing-function", "linear(0, 1)");

export function createSmoothTab(host, { items, selected, label, onChange }) {
  let current = selected ?? items[0].id;

  const list = document.createElement("div");
  list.className = "smooth-tab";
  list.setAttribute("role", "tablist");
  if (label) list.setAttribute("aria-label", label);
  if (supportsLinear) {
    list.style.setProperty("--st-ease", SPRING.easing);
    list.style.setProperty("--st-duration", `${SPRING.ms}ms`);
  }

  const indicator = document.createElement("div");
  indicator.className = "smooth-tab-indicator";
  indicator.setAttribute("aria-hidden", "true");
  list.append(indicator);

  // Without a tone the gradient label would have no colours and vanish.
  const toneOf = (item) => item.tone ?? "blue";

  const buttons = new Map();
  for (const item of items) {
    const button = document.createElement("button");
    button.type = "button";
    button.id = `tab-${item.id}`;
    button.setAttribute("role", "tab");
    button.classList.add(`tone-${toneOf(item)}`);
    if (item.controls) button.setAttribute("aria-controls", item.controls);

    const title = document.createElement("span");
    title.className = "label";
    title.textContent = item.title;
    const count = document.createElement("span");
    count.className = "count";
    button.append(title, count);

    button.addEventListener("click", () => select(item.id, true));
    button.addEventListener("keydown", (event) => onKeyDown(event, item.id));
    buttons.set(item.id, { button, count, item });
    list.append(button);
  }

  host.replaceChildren(list);

  function place(animate) {
    const { button, item } = buttons.get(current);
    if (!animate) indicator.style.transition = "none";
    indicator.style.width = `${button.offsetWidth}px`;
    indicator.style.transform = `translateX(${button.offsetLeft}px)`;
    // The tone class drives the indicator's gradient; its colours are
    // registered properties, so they fade as the indicator slides.
    indicator.className = `smooth-tab-indicator tone-${toneOf(item)}`;
    if (!animate) {
      indicator.getBoundingClientRect();
      indicator.style.transition = "";
    }
  }

  function select(id, focus) {
    if (id === current) return;
    const ids = [...buttons.keys()];
    const direction = ids.indexOf(id) > ids.indexOf(current) ? 1 : -1;
    current = id;
    sync();
    place(true);
    if (focus) buttons.get(id).button.focus();
    onChange?.(id, direction);
  }

  function sync() {
    for (const [id, { button }] of buttons) {
      const isSelected = id === current;
      button.setAttribute("aria-selected", String(isSelected));
      button.tabIndex = isSelected ? 0 : -1;
    }
  }

  function onKeyDown(event, id) {
    const ids = [...buttons.keys()];
    const index = ids.indexOf(id);
    const next = {
      ArrowRight: ids[(index + 1) % ids.length],
      ArrowLeft: ids[(index - 1 + ids.length) % ids.length],
      Home: ids[0],
      End: ids[ids.length - 1],
    }[event.key];
    if (!next) return;
    event.preventDefault();
    select(next, true);
  }

  sync();
  place(false);
  new ResizeObserver(() => place(false)).observe(list);

  return {
    get selected() {
      return current;
    },
    // Only re-measure when a label actually changes, so a render that runs
    // mid-slide doesn't snap the indicator to its end position.
    setCounts(counts) {
      let changed = false;
      for (const [id, { count }] of buttons) {
        const text = String(counts[id] ?? "");
        if (count.textContent !== text) {
          count.textContent = text;
          changed = true;
        }
      }
      if (changed) place(false);
    },
  };
}
