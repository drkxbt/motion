import { Listeners, clamp, uid, type Controller } from "../core/core.js";

export interface TooltipOptions {
  /** The text; defaults to the trigger's data-tooltip, then its aria-label. */
  text?: string;
  /** The side to prefer. It flips when there is no room. */
  side?: "top" | "bottom";
  /** How long the pointer rests before the first tooltip shows, in ms. */
  delay?: number;
}

const GAP = 8;
const EDGE = 8;
// Once a tooltip has shown, the next one within this window appears at once and without animation, so moving
// along a toolbar reads the labels as fast as the pointer moves.
const WARM_MS = 400;
let lastShown = 0;
let open: (() => void) | null = null;

/**
 * A short label for a control, shown on hover or keyboard focus. The first one waits a moment so passing over a
 * control does not flash it; neighbours shown right after skip the wait and the animation. It grows from the side
 * that faces its trigger, closes on Escape, and never shows for touch, where there is no hover.
 */
export function tooltip(trigger: HTMLElement, options: TooltipOptions = {}): Controller {
  const listeners = new Listeners();
  const text = options.text ?? trigger.dataset.tooltip ?? trigger.getAttribute("aria-label") ?? "";
  const tip = document.createElement("div");
  tip.className = "m-tooltip";
  tip.id = uid("tip");
  tip.setAttribute("role", "tooltip");
  tip.textContent = text;
  tip.hidden = true;
  document.body.append(tip);
  // A tooltip that only repeats the accessible name would be read twice, so it is linked only when it adds to it.
  const describes = text !== trigger.getAttribute("aria-label");
  if (describes) trigger.setAttribute("aria-describedby", [trigger.getAttribute("aria-describedby"), tip.id].filter(Boolean).join(" "));

  let timer = 0;
  const place = () => {
    const box = trigger.getBoundingClientRect();
    const width = tip.offsetWidth;
    const height = tip.offsetHeight;
    const roomAbove = box.top - GAP - height > EDGE;
    const side = options.side === "bottom" || !roomAbove ? "bottom" : "top";
    const centre = box.left + box.width / 2;
    const left = clamp(centre - width / 2, EDGE, innerWidth - width - EDGE);
    const top = side === "top" ? box.top - GAP - height : box.bottom + GAP;
    tip.dataset.side = side;
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
    // Grows out of the trigger even when the edge of the screen pushed it sideways.
    tip.style.transformOrigin = `${centre - left}px ${side === "top" ? "100%" : "0"}`;
  };

  const show = (instant: boolean) => {
    clearTimeout(timer);
    if (open && open !== hide) open();
    open = hide;
    tip.hidden = false;
    tip.toggleAttribute("data-instant", instant);
    place();
    requestAnimationFrame(() => tip.setAttribute("data-open", ""));
  };
  const hide = () => {
    clearTimeout(timer);
    if (tip.hidden) return;
    lastShown = performance.now();
    tip.removeAttribute("data-open");
    if (open === hide) open = null;
    const done = () => {
      if (!tip.hasAttribute("data-open")) tip.hidden = true;
    };
    if (tip.hasAttribute("data-instant")) done();
    else setTimeout(done, 140);
  };
  const request = () => {
    const warm = performance.now() - lastShown < WARM_MS || open !== null;
    if (warm) show(true);
    else timer = window.setTimeout(() => show(false), options.delay ?? 450);
  };

  listeners.on<PointerEvent>(trigger, "pointerenter", (event) => {
    if (event.pointerType !== "touch") request();
  });
  listeners.on(trigger, "pointerleave", hide);
  listeners.on(trigger, "pointerdown", hide);
  listeners.on(trigger, "focus", () => {
    if (trigger.matches(":focus-visible")) show(performance.now() - lastShown < WARM_MS);
  });
  listeners.on(trigger, "blur", hide);
  listeners.on<KeyboardEvent>(document, "keydown", (event) => {
    if (event.key === "Escape") hide();
  });
  listeners.on(window, "scroll", hide, { passive: true, capture: true });

  return {
    destroy() {
      hide();
      listeners.clear();
      tip.remove();
      if (describes) {
        const rest = (trigger.getAttribute("aria-describedby") ?? "").split(" ").filter((id) => id && id !== tip.id);
        if (rest.length) trigger.setAttribute("aria-describedby", rest.join(" "));
        else trigger.removeAttribute("aria-describedby");
      }
    },
  };
}

/** Tooltips for every element under `root` that has a data-tooltip attribute. */
export function tooltips(root: ParentNode = document, selector = "[data-tooltip]"): Controller {
  const made = [...root.querySelectorAll<HTMLElement>(selector)].map((trigger) => tooltip(trigger));
  return { destroy: () => made.forEach((one) => one.destroy()) };
}
