import { reducedMotion, type Controller } from "../core/core.js";

/* Numbers and waiting: a counter whose digits roll like an odometer, a spinner, and a progress bar. Skeleton
   placeholders are CSS alone (`.m-skeleton`). */

export interface Slot {
  key: string;
  char: string;
  digit: boolean;
}

/**
 * Splits a formatted number into slots keyed from the right, so the units digit stays the units digit when the
 * number grows a place: 999 to 1,000 rolls three digits and adds two slots instead of redrawing all of them.
 */
export function slots(text: string): Slot[] {
  const chars = [...text];
  const isDigit = (char: string) => char >= "0" && char <= "9";
  const first = chars.findIndex(isDigit);
  const last = chars.length - 1 - [...chars].reverse().findIndex(isDigit);
  let digitsRight = chars.filter(isDigit).length;
  return chars.map((char, i) => {
    if (isDigit(char)) {
      digitsRight--;
      return { key: `d${digitsRight}`, char, digit: true };
    }
    if (first < 0 || i < first) return { key: `p${i}`, char, digit: false };
    if (i > last) return { key: `s${chars.length - 1 - i}`, char, digit: false };
    return { key: `m${digitsRight}`, char, digit: false };
  });
}

/**
 * The strip position that shows `digit`, moving from `position` in `direction`: forward when the number grows,
 * so digits roll up, and backward when it shrinks. The strip holds 0 to 9 three times; positions settle back
 * into the middle copy after each roll.
 */
export function rollTarget(position: number, digit: number, direction: 1 | -1): number {
  const current = ((position % 10) + 10) % 10;
  return direction > 0 ? position + ((digit - current + 10) % 10) : position - ((current - digit + 10) % 10);
}

const LINE = 1.2;
const strip = () => {
  const element = document.createElement("span");
  element.className = "m-strip";
  for (let i = 0; i < 30; i++) {
    const digit = document.createElement("span");
    digit.textContent = String(i % 10);
    element.append(digit);
  }
  return element;
};

export interface CounterOptions {
  value?: number;
  /** Intl.NumberFormat options, or a function that turns the value into text. */
  format?: Intl.NumberFormatOptions | ((value: number) => string);
  locale?: string;
}

export interface Counter extends Controller {
  readonly value: number;
  set(value: number): void;
}

/**
 * A number that rolls to its new value digit by digit. Digits are tabular, so the width only changes when a place
 * is added or removed, and those slots grow in or fold away. Screen readers get the plain formatted number.
 */
export function counter(element: HTMLElement, options: CounterOptions = {}): Counter {
  const { format, locale } = options;
  const toText = typeof format === "function" ? format : (value: number) => new Intl.NumberFormat(locale, format).format(value);
  element.classList.add("m-counter");
  const spoken = document.createElement("span");
  spoken.className = "m-sr";
  const track = document.createElement("span");
  track.className = "m-counter-track";
  track.setAttribute("aria-hidden", "true");
  const previous = [...element.childNodes];
  element.replaceChildren(spoken, track);

  const live = new Map<string, { element: HTMLElement; position: number; char: string; roll: number }>();
  let value = options.value ?? 0;

  // Moves a strip to the middle copy of its digit without animating; the digit on screen does not change.
  const settle = (key: string, roll?: number) => {
    const slot = live.get(key);
    // A roll that a newer one replaced must not snap the strip out from under it.
    if (!slot || (roll !== undefined && roll !== slot.roll)) return;
    const strip = slot.element.firstElementChild as HTMLElement;
    slot.position = 10 + (slot.position % 10);
    strip.dataset.snap = "";
    strip.style.transform = `translateY(${-LINE * slot.position}em)`;
    void strip.offsetWidth;
    delete strip.dataset.snap;
  };

  const render = (next: number, animate: boolean) => {
    const direction: 1 | -1 = next >= value ? 1 : -1;
    value = next;
    const text = toText(next);
    spoken.textContent = text;
    const wanted = slots(text);
    const keys = new Set(wanted.map((slot) => slot.key));

    for (const [key, slot] of live) {
      if (keys.has(key)) continue;
      live.delete(key);
      if (!animate) {
        slot.element.remove();
        continue;
      }
      slot.element.style.maxWidth = `${slot.element.offsetWidth}px`;
      void slot.element.offsetWidth;
      slot.element.dataset.leaving = "";
      slot.element.style.maxWidth = "0px";
      setTimeout(() => slot.element.remove(), 400);
    }

    let before: Element | null = null;
    wanted.forEach((wish, order) => {
      let slot = live.get(wish.key);
      if (slot && slot.char !== wish.char && !wish.digit) {
        slot.element.textContent = wish.char;
        slot.char = wish.char;
      }
      if (!slot) {
        const holder = document.createElement("span");
        holder.className = wish.digit ? "m-slot m-digit" : "m-slot m-sym";
        const position = wish.digit ? 10 + Number(wish.char) : 0;
        if (wish.digit) {
          const digits = strip();
          digits.style.transform = `translateY(${-LINE * position}em)`;
          holder.append(digits);
        } else {
          holder.textContent = wish.char;
        }
        slot = { element: holder, position, char: wish.char, roll: 0 };
        live.set(wish.key, slot);
        if (before) before.after(holder);
        else track.prepend(holder);
        if (animate) {
          holder.dataset.entering = "";
          requestAnimationFrame(() => requestAnimationFrame(() => delete holder.dataset.entering));
        }
      } else if (wish.digit) {
        // Values that change faster than a roll lasts finish the last roll at once, so the strip never runs out.
        if (slot.position < 10 || slot.position > 19) settle(wish.key);
        const target = rollTarget(slot.position, Number(wish.char), direction);
        if (target !== slot.position) {
          slot.position = target;
          slot.char = wish.char;
          const roll = ++slot.roll;
          const digits = slot.element.firstElementChild as HTMLElement;
          // Lower places start a beat later, the way an odometer's wheels push the next one along.
          digits.style.transitionDelay = animate ? `${Math.min(order, 6) * 18}ms` : "0ms";
          digits.style.transform = `translateY(${-LINE * target}em)`;
          if (animate && !reducedMotion()) {
            const key = wish.key;
            digits.addEventListener("transitionend", () => settle(key, roll), { once: true });
          } else {
            settle(wish.key);
          }
        }
      }
      before = slot.element;
    });
  };

  render(value, false);
  return {
    get value() {
      return value;
    },
    set: (next: number) => render(next, true),
    destroy() {
      element.classList.remove("m-counter");
      element.replaceChildren(...previous);
    },
  };
}

/** A spinner of eight bars that fade in turn. Fast on purpose: a quick spinner makes the wait feel shorter. */
export function spinner(label = "Loading"): HTMLElement {
  const element = document.createElement("span");
  element.className = "m-spinner";
  element.setAttribute("role", "status");
  element.setAttribute("aria-label", label);
  for (let i = 0; i < 8; i++) element.append(document.createElement("i"));
  return element;
}

export interface ProgressOptions {
  value?: number;
  max?: number;
  label?: string;
}

export interface Progress extends Controller {
  set(value: number): void;
  /** For work whose length is unknown: a band sweeps across until `set` is called. */
  indeterminate(): void;
}

/** A progress bar that eases to each new value instead of jumping. */
export function progress(element: HTMLElement, options: ProgressOptions = {}): Progress {
  const { max = 100, label } = options;
  element.classList.add("m-progress");
  element.setAttribute("role", "progressbar");
  element.setAttribute("aria-valuemin", "0");
  element.setAttribute("aria-valuemax", String(max));
  if (label) element.setAttribute("aria-label", label);
  const bar = document.createElement("span");
  bar.className = "m-progress-bar";
  element.append(bar);

  const set = (next: number) => {
    const clamped = Math.min(max, Math.max(0, next));
    element.removeAttribute("data-indeterminate");
    element.setAttribute("aria-valuenow", String(clamped));
    bar.style.transform = `scaleX(${clamped / max})`;
  };
  set(options.value ?? 0);

  return {
    set,
    indeterminate() {
      element.setAttribute("data-indeterminate", "");
      element.removeAttribute("aria-valuenow");
      bar.style.transform = "";
    },
    destroy() {
      bar.remove();
      element.classList.remove("m-progress");
    },
  };
}
