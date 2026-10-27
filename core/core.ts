/* Shared plumbing: motion and pointer preferences, a polite live region, listeners that come off together, a
   damped spring, and small DOM helpers. */

/** What every enhancer returns: `destroy()` removes its listeners and the elements it added. */
export interface Controller {
  destroy(): void;
}

const matches = (query: string) => typeof matchMedia === "function" && matchMedia(query).matches;

/** Whether the visitor asked for less motion. Read at the moment of use, so a change in settings applies at once. */
export const reducedMotion = () => matches("(prefers-reduced-motion: reduce)");

/** Whether the pointer is a mouse or trackpad. Effects that follow the pointer make no sense under a finger. */
export const finePointer = () => matches("(hover: hover) and (pointer: fine)");

/** A set of event listeners removed in one call. */
export class Listeners {
  private offs: Array<() => void> = [];

  on<T extends Event = Event>(target: EventTarget, type: string, handler: (event: T) => void, options?: AddEventListenerOptions): void {
    const listener = handler as EventListener;
    target.addEventListener(type, listener, options);
    this.offs.push(() => target.removeEventListener(type, listener, options));
  }

  clear(): void {
    for (const off of this.offs.splice(0)) off();
  }
}

let region: HTMLElement | null = null;

/** Reads a short message to screen readers without moving focus. */
export function announce(message: string): void {
  if (typeof document === "undefined") return;
  if (!region?.isConnected) {
    region = document.createElement("div");
    region.className = "m-sr";
    region.setAttribute("aria-live", "polite");
    region.setAttribute("aria-atomic", "true");
    document.body.append(region);
  }
  const live = region;
  // Emptied first, so the same message is read again when it repeats.
  live.textContent = "";
  setTimeout(() => (live.textContent = message), 60);
}

let counter = 0;
/** An id unique to this page, for aria-controls, aria-describedby and SVG masks. */
export const uid = (prefix: string) => `m-${prefix}-${++counter}`;

const SVG_NS = "http://www.w3.org/2000/svg";

/** An SVG icon from its inner markup, hidden from assistive technology and drawn in the current text colour. */
export function svg(markup: string, className: string, viewBox = "0 0 24 24"): SVGSVGElement {
  const element = document.createElementNS(SVG_NS, "svg");
  element.setAttribute("viewBox", viewBox);
  element.setAttribute("class", className);
  element.setAttribute("aria-hidden", "true");
  element.setAttribute("focusable", "false");
  element.innerHTML = markup;
  return element;
}

/** Restarts a CSS animation tied to a class, even when the class is already there. */
export function replay(element: Element, className: string): void {
  element.classList.remove(className);
  // Reading layout here makes the browser drop the old animation before the class comes back.
  void (element as HTMLElement).offsetWidth;
  element.classList.add(className);
  element.addEventListener("animationend", () => element.classList.remove(className), { once: true });
}

export interface Spring {
  value: number;
  velocity: number;
}

export interface SpringConfig {
  stiffness?: number;
  damping?: number;
  mass?: number;
}

/** One step of a damped spring toward `target`, `dt` in seconds. Effects built on it ease out and settle like
 *  something physical, and keep their speed when the target moves mid-flight. */
export function stepSpring(spring: Spring, target: number, dt: number, config: SpringConfig = {}): Spring {
  const { stiffness = 170, damping = 22, mass = 1 } = config;
  const force = -stiffness * (spring.value - target) - damping * spring.velocity;
  const velocity = spring.velocity + (force / mass) * dt;
  return { value: spring.value + velocity * dt, velocity };
}

/** Whether a spring has come to rest at `target`. */
export const settled = (spring: Spring, target: number, epsilon = 0.01) =>
  Math.abs(spring.value - target) < epsilon && Math.abs(spring.velocity) < epsilon;

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
