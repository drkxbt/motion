import { Listeners, announce, finePointer, reducedMotion, settled, stepSpring, svg, type Controller, type Spring } from "../core/core.js";
import { icon } from "../icons/icons.js";

/* Buttons. Every `.m-btn` scales down a touch while pressed (CSS alone). The enhancers here add behaviour on top
   of a button you already have and keep its markup and label. */

export type AsyncState = "idle" | "loading" | "success" | "error";

export interface AsyncButtonOptions {
  /** Read to screen readers while the action runs. */
  loading?: string;
  /** Shown beside the tick when the action succeeds. Empty keeps the tick alone. */
  success?: string;
  /** Shown beside the cross when it fails; a function gets the error. */
  error?: string | ((error: unknown) => string);
  /** How long success or failure stays before the button returns to its label, in ms. */
  hold?: number;
  /** The shortest time the spinner shows, so a fast action does not flash, in ms. */
  minimum?: number;
}

export interface AsyncButton extends Controller {
  readonly state: AsyncState;
  /** Runs the action as if the button were clicked. */
  run(): Promise<void>;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A button that runs an async action and shows what happened: a spinner while it runs, then a tick or a cross,
 * then its label again. The label and the status share one grid cell, so the button never changes width.
 */
export function asyncButton(button: HTMLButtonElement, action: () => unknown, options: AsyncButtonOptions = {}): AsyncButton {
  const { loading = "Working", success = "", error = "Something went wrong", hold = 1600, minimum = 450 } = options;
  const listeners = new Listeners();
  const label = document.createElement("span");
  label.className = "m-label";
  label.append(...button.childNodes);
  const statusText = document.createElement("span");
  statusText.className = "m-status-text";
  const status = document.createElement("span");
  status.className = "m-status";
  status.setAttribute("aria-hidden", "true");
  // The three glyphs share one cell and stay rendered, so the tick can draw itself when success arrives.
  const glyphs = document.createElement("span");
  glyphs.className = "m-status-glyphs";
  glyphs.append(
    svg('<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" pathLength="100"/>', "m-spin"),
    svg('<path class="m-draw" pathLength="1" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="m5 12.5 4.5 4.5L19 7.5"/>', "m-done"),
    svg('<path fill="none" stroke="currentColor" stroke-linecap="round" d="M7 7l10 10M17 7 7 17"/>', "m-cross"),
  );
  status.append(glyphs, statusText);
  button.append(label, status);
  button.classList.add("m-async");
  button.dataset.state = "idle";

  let state: AsyncState = "idle";
  const set = (next: AsyncState, text = "") => {
    state = next;
    button.dataset.state = next;
    statusText.textContent = text;
    button.toggleAttribute("aria-busy", next === "loading");
    // Kept focusable while busy, so a keyboard user does not lose their place.
    button.setAttribute("aria-disabled", String(next !== "idle"));
  };

  async function run() {
    if (state !== "idle") return;
    set("loading");
    announce(loading);
    const started = performance.now();
    let outcome: AsyncState = "success";
    let message = success;
    try {
      await action();
    } catch (failure) {
      outcome = "error";
      message = typeof error === "function" ? error(failure) : error;
    }
    await wait(Math.max(0, minimum - (performance.now() - started)));
    set(outcome, message);
    announce(message || (outcome === "success" ? "Done" : "Failed"));
    await wait(hold);
    set("idle");
  }

  listeners.on(button, "click", () => void run());
  return {
    get state() {
      return state;
    },
    run,
    destroy() {
      listeners.clear();
      button.classList.remove("m-async");
      button.removeAttribute("aria-busy");
      button.removeAttribute("aria-disabled");
      delete button.dataset.state;
      button.replaceChildren(...label.childNodes);
    },
  };
}

export interface CopyButtonOptions {
  /** Announced, and shown in `label` if there is one, after a copy. */
  copied?: string;
  failed?: string;
  /** How long the tick stays, in ms. */
  duration?: number;
  /** An element inside the button whose text swaps to `copied` for a moment. */
  label?: HTMLElement | null;
  /** Adds the copy icon when the button has none. Off keeps a button's own icon and styles. */
  icon?: boolean;
  /** Called after each successful copy. */
  onCopy?: () => void;
}

export interface CopyButton extends Controller {
  copy(): Promise<boolean>;
}

async function writeClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  // Pages served over plain HTTP have no clipboard API; the old command still works there.
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.cssText = "position:fixed;opacity:0;pointer-events:none";
  document.body.append(area);
  area.select();
  const ok = document.execCommand("copy");
  area.remove();
  if (!ok) throw new Error("copy was refused");
}

/**
 * Copies text and shows it worked: the copy glyph turns into a tick for a moment and the result is announced.
 * The button gets `data-copied` while the tick shows, so its own styles can respond too. A button with no icon
 * gets one.
 */
export function copyButton(button: HTMLElement, text: string | (() => string), options: CopyButtonOptions = {}): CopyButton {
  const { copied = "Copied", failed = "Copy failed. Select the text and copy it by hand.", duration = 1500, label = null } = options;
  const listeners = new Listeners();
  const added = options.icon === false || button.querySelector(".m-icon-copy") ? null : icon("copy");
  if (added) button.prepend(added);
  const idle = label?.textContent ?? "";
  let timer = 0;

  async function copy() {
    try {
      await writeClipboard(typeof text === "function" ? text() : text);
    } catch {
      announce(failed);
      return false;
    }
    clearTimeout(timer);
    button.dataset.copied = "";
    if (label) label.textContent = copied;
    announce(copied);
    options.onCopy?.();
    timer = window.setTimeout(() => {
      delete button.dataset.copied;
      if (label) label.textContent = idle;
    }, duration);
    return true;
  }

  listeners.on(button, "click", () => void copy());
  return {
    copy,
    destroy() {
      listeners.clear();
      clearTimeout(timer);
      added?.remove();
      delete button.dataset.copied;
    },
  };
}

export interface HoldButtonOptions {
  /** How long to hold, in ms. */
  duration?: number;
  onConfirm: () => void;
  /** Announced when the hold completes. */
  confirmed?: string;
  /** Announced to screen reader users, who press rather than hold: a second press within three seconds confirms. */
  again?: string;
}

/**
 * A button for actions that should not happen by accident: a fill sweeps across it while it is held, and the
 * action runs only if it is held to the end. Letting go early sends the fill back quickly. Works with a mouse, a
 * finger, Space or Enter; a screen reader's click, which cannot be held, asks for a second press instead.
 */
export function holdButton(button: HTMLButtonElement, options: HoldButtonOptions): Controller {
  const { duration = 1200, onConfirm, confirmed = "Confirmed", again = "Press again to confirm" } = options;
  const listeners = new Listeners();
  // The fill carries a copy of the label in the inverse colours, so the text changes colour exactly where the fill
  // has reached.
  const fill = document.createElement("span");
  fill.className = "m-hold-fill";
  fill.setAttribute("aria-hidden", "true");
  fill.append(...[...button.childNodes].map((node) => node.cloneNode(true)));
  button.append(fill);
  button.classList.add("m-hold");
  button.style.setProperty("--m-hold", `${duration}ms`);

  let timer = 0;
  let done = false;
  let armedUntil = 0;
  const confirm = () => {
    done = true;
    delete button.dataset.holding;
    button.dataset.state = "done";
    navigator.vibrate?.(12);
    announce(confirmed);
    onConfirm();
    window.setTimeout(() => {
      done = false;
      delete button.dataset.state;
    }, 1400);
  };
  const start = () => {
    if (done || button.dataset.holding !== undefined) return;
    button.dataset.holding = "";
    timer = window.setTimeout(confirm, duration);
  };
  const cancel = () => {
    clearTimeout(timer);
    delete button.dataset.holding;
  };

  listeners.on<PointerEvent>(button, "pointerdown", (event) => {
    if (event.button !== 0) return;
    button.setPointerCapture(event.pointerId);
    start();
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) listeners.on(button, type, cancel);
  listeners.on<KeyboardEvent>(button, "keydown", (event) => {
    if ((event.key === " " || event.key === "Enter") && !event.repeat) {
      event.preventDefault();
      start();
    }
  });
  listeners.on<KeyboardEvent>(button, "keyup", (event) => {
    if (event.key === " " || event.key === "Enter") {
      // Stops Space from clicking on the way up.
      event.preventDefault();
      cancel();
    }
  });
  // A click with no pointer or key behind it (detail 0) comes from assistive technology.
  listeners.on<MouseEvent>(button, "click", (event) => {
    if (event.detail !== 0 || done) return;
    if (performance.now() < armedUntil) {
      armedUntil = 0;
      confirm();
    } else {
      armedUntil = performance.now() + 3000;
      announce(again);
    }
  });
  listeners.on(button, "blur", cancel);
  // A long press on a phone would otherwise open the context menu halfway through.
  listeners.on(button, "contextmenu", (event) => event.preventDefault());

  return {
    destroy() {
      cancel();
      listeners.clear();
      fill.remove();
      button.classList.remove("m-hold");
    },
  };
}

export interface MagneticOptions {
  /** How far the element follows the pointer, as a share of the pointer's distance from its centre. */
  strength?: number;
  /** How far outside the element the pull starts, in px. */
  reach?: number;
}

/**
 * The element leans toward the pointer as it comes near and springs back when it leaves. Only with a mouse or
 * trackpad, and not at all when reduced motion is on.
 */
export function magnetic(element: HTMLElement, options: MagneticOptions = {}): Controller {
  const { strength = 0.28, reach = 28 } = options;
  const listeners = new Listeners();
  if (!finePointer() || reducedMotion()) return { destroy() {} };

  let x: Spring = { value: 0, velocity: 0 };
  let y: Spring = { value: 0, velocity: 0 };
  let target = { x: 0, y: 0 };
  let frame = 0;
  let last = 0;

  const tick = (now: number) => {
    const dt = Math.min(0.032, (now - last) / 1000 || 0.016);
    last = now;
    const config = { stiffness: 220, damping: 18 };
    x = stepSpring(x, target.x, dt, config);
    y = stepSpring(y, target.y, dt, config);
    element.style.translate = `${x.value.toFixed(2)}px ${y.value.toFixed(2)}px`;
    frame = settled(x, target.x) && settled(y, target.y) ? 0 : requestAnimationFrame(tick);
  };
  const move = (next: { x: number; y: number }) => {
    target = next;
    if (!frame) {
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }
  };

  listeners.on<PointerEvent>(window, "pointermove", (event) => {
    const rect = element.getBoundingClientRect();
    // The rectangle includes the current lean, so take it back out to find where the element really sits.
    const cx = rect.left + rect.width / 2 - x.value;
    const cy = rect.top + rect.height / 2 - y.value;
    const dx = event.clientX - cx;
    const dy = event.clientY - cy;
    const inside = Math.abs(dx) < rect.width / 2 + reach && Math.abs(dy) < rect.height / 2 + reach;
    move(inside ? { x: dx * strength, y: dy * strength } : { x: 0, y: 0 });
  }, { passive: true });
  listeners.on(document, "pointerleave", () => move({ x: 0, y: 0 }));

  return {
    destroy() {
      listeners.clear();
      cancelAnimationFrame(frame);
      element.style.translate = "";
    },
  };
}
