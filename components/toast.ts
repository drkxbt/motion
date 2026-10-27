import { svg } from "../core/core.js";

export interface ToastOptions {
  type?: "info" | "success" | "error";
  /** How long it stays, in ms. The clock stops while the stack is open or the tab is hidden. */
  duration?: number;
  action?: { label: string; onClick: () => void };
}

export interface ToasterOptions {
  position?: "bottom-center" | "bottom-right";
  /** How many toasts show at once; older ones wait behind. */
  visible?: number;
}

export interface StackSlot {
  y: number;
  scale: number;
  opacity: number;
}

const GAP = 10;
const PEEK = 10;

/**
 * Where each toast sits, newest first. Closed, the older ones peek out above the newest, a little smaller each;
 * open, they lay out in a column with a gap. Anything past `visible` fades out.
 */
export function stackLayout(heights: number[], expanded: boolean, visible = 3): StackSlot[] {
  let offset = 0;
  return heights.map((height, i) => {
    const slot = expanded
      ? { y: -offset, scale: 1, opacity: i < visible ? 1 : 0 }
      : { y: -PEEK * Math.min(i, visible), scale: 1 - 0.05 * Math.min(i, visible), opacity: i < visible ? 1 : 0 };
    offset += height + GAP;
    return slot;
  });
}

interface Entry {
  element: HTMLLIElement;
  height: number;
  remaining: number;
  started: number;
  timer: number;
  dismiss: () => void;
}

let settings: Required<ToasterOptions> = { position: "bottom-center", visible: 3 };
let region: HTMLElement | null = null;
let list: HTMLOListElement | null = null;
let entries: Entry[] = [];
let expanded = false;

/** Sets where toasts appear and how many show. Call it before the first toast. */
export function configureToasts(options: ToasterOptions): void {
  settings = { ...settings, ...options };
  if (region) region.dataset.position = settings.position;
}

const paused = () => expanded || document.hidden;

function layout() {
  if (!list) return;
  const front = entries[0]?.height ?? 0;
  const slots = stackLayout(entries.map((entry) => entry.height), expanded, settings.visible);
  entries.forEach((entry, i) => {
    const { element } = entry;
    // A toast being dragged follows the finger, and one still entering takes its slot on its own next frame.
    if (element.dataset.dragging !== undefined || element.dataset.entering !== undefined) return;
    const slot = slots[i];
    element.style.zIndex = String(entries.length - i);
    element.style.opacity = String(slot.opacity);
    element.style.transform = `translateY(${slot.y}px) scale(${slot.scale})`;
    // Closed, an older toast takes the newest one's height, so the stack reads as one card with edges behind it.
    element.style.height = !expanded && i > 0 ? `${front}px` : `${entry.height}px`;
    element.toggleAttribute("inert", slot.opacity === 0);
  });
  const shown = entries.slice(0, settings.visible);
  const open = shown.reduce((sum, entry) => sum + entry.height + GAP, 0) - GAP;
  const closed = front + PEEK * Math.max(0, shown.length - 1);
  list.style.height = `${Math.max(0, expanded ? open : closed)}px`;
}

function clock() {
  for (const entry of entries) {
    clearTimeout(entry.timer);
    if (paused()) {
      if (entry.started) entry.remaining -= performance.now() - entry.started;
      entry.started = 0;
    } else {
      entry.started = performance.now();
      entry.timer = window.setTimeout(entry.dismiss, Math.max(0, entry.remaining));
    }
  }
}

function ensureRegion(): HTMLOListElement {
  if (list && region?.isConnected) return list;
  region = document.createElement("section");
  region.className = "m-toaster";
  region.dataset.position = settings.position;
  region.setAttribute("aria-label", "Notifications");
  list = document.createElement("ol");
  list.setAttribute("aria-live", "polite");
  region.append(list);
  document.body.append(region);
  const setExpanded = (next: boolean) => {
    if (expanded === next) return;
    expanded = next;
    region!.toggleAttribute("data-expanded", next);
    layout();
    clock();
  };
  list.addEventListener("pointerenter", () => setExpanded(true));
  list.addEventListener("pointerleave", () => setExpanded(false));
  list.addEventListener("focusin", () => setExpanded(true));
  list.addEventListener("focusout", (event) => {
    if (!list!.contains(event.relatedTarget as Node)) setExpanded(false);
  });
  document.addEventListener("visibilitychange", clock);
  return list;
}

const GLYPHS = {
  success: '<path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="m6 12.5 4 4 8-9"/>',
  error: '<path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" d="M12 7v6.5M12 17h.01"/>',
  info: '<path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" d="M12 11v6M12 7.5h.01"/>',
};

/** Shows a short notice at the edge of the screen. Swipe it away, close it, or let it time out. */
export function toast(message: string, options: ToastOptions = {}): { dismiss(): void } {
  const { type = "info", duration = 4000, action } = options;
  const host = ensureRegion();
  const element = document.createElement("li");
  element.className = "m-toast";
  element.dataset.type = type;
  if (type === "error") element.setAttribute("role", "alert");

  const glyph = svg(GLYPHS[type], "m-toast-glyph");
  const text = document.createElement("p");
  text.className = "m-toast-text";
  text.textContent = message;
  element.append(glyph, text);
  if (action) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "m-toast-action";
    button.textContent = action.label;
    button.addEventListener("click", () => {
      action.onClick();
      entry.dismiss();
    });
    element.append(button);
  }
  const close = document.createElement("button");
  close.type = "button";
  close.className = "m-toast-close";
  close.setAttribute("aria-label", "Dismiss");
  close.append(svg('<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M7 7l10 10M17 7 7 17"/>', "m-toast-x"));
  element.append(close);

  const entry: Entry = {
    element,
    height: 0,
    remaining: duration,
    started: 0,
    timer: 0,
    dismiss: () => {
      if (!entries.includes(entry)) return;
      clearTimeout(entry.timer);
      entries = entries.filter((other) => other !== entry);
      element.dataset.removed = "";
      element.style.opacity = "0";
      layout();
      setTimeout(() => element.remove(), 220);
    },
  };
  close.addEventListener("click", entry.dismiss);
  swipe(entry);

  // Enters from below the edge: placed off-screen first, then moved to its slot on the next frame.
  element.dataset.entering = "";
  host.prepend(element);
  entry.height = element.offsetHeight;
  entries.unshift(entry);
  requestAnimationFrame(() => {
    delete element.dataset.entering;
    layout();
  });
  clock();
  return { dismiss: entry.dismiss };
}

/** Drag down to dismiss. A quick flick is enough even when it travels only a little. */
function swipe(entry: Entry) {
  const { element } = entry;
  let startY = 0;
  let startTime = 0;
  let base = "";
  let pointer: number | null = null;

  element.addEventListener("pointerdown", (event) => {
    if (pointer !== null || (event.target as Element).closest("button")) return;
    pointer = event.pointerId;
    element.setPointerCapture(event.pointerId);
    startY = event.clientY;
    startTime = performance.now();
    base = element.style.transform;
    element.dataset.dragging = "";
  });
  element.addEventListener("pointermove", (event) => {
    if (event.pointerId !== pointer) return;
    const dy = event.clientY - startY;
    // Pulling the wrong way meets resistance instead of a wall.
    const moved = dy > 0 ? dy : dy * 0.15;
    element.style.transform = `${base} translateY(${moved}px)`;
  });
  const release = (event: PointerEvent) => {
    if (event.pointerId !== pointer) return;
    pointer = null;
    const dy = event.clientY - startY;
    const velocity = Math.abs(dy) / Math.max(1, performance.now() - startTime);
    delete element.dataset.dragging;
    if (dy > 0 && (dy > 48 || velocity > 0.11)) {
      element.style.transform = `${base} translateY(${dy + element.offsetHeight}px)`;
      entry.dismiss();
    } else {
      layout();
    }
  };
  element.addEventListener("pointerup", release);
  element.addEventListener("pointercancel", release);
}
