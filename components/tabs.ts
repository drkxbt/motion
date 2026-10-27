import { Listeners, type Controller } from "../core/core.js";

export interface TabsOptions {
  /** "underline" slides a bar under the active tab; "pill" slides a filled pill behind it and recolours the
   *  label it passes over. */
  variant?: "underline" | "pill";
  /** "auto" selects a tab as arrow keys reach it; "manual" waits for Enter or Space. */
  activation?: "auto" | "manual";
  onChange?: (index: number, tab: HTMLElement) => void;
}

export interface Tabs extends Controller {
  readonly index: number;
  select(index: number, focus?: boolean): void;
}

/** Where focus goes from `current` for a key, or null for keys tabs do not handle. Wraps at both ends. */
export function nextIndex(current: number, key: string, count: number): number | null {
  if (key === "ArrowRight" || key === "ArrowDown") return (current + 1) % count;
  if (key === "ArrowLeft" || key === "ArrowUp") return (current - 1 + count) % count;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return null;
}

/**
 * A tab list with an indicator that glides from one tab to the next. Give it an element holding buttons; each
 * button's aria-controls names its panel. Arrow keys, Home and End move between tabs.
 *
 * The pill variant draws a second, filled copy of the labels over the first and clips it to the active tab, so
 * the text colour changes exactly where the pill is, mid-slide included.
 */
export function tabs(list: HTMLElement, options: TabsOptions = {}): Tabs {
  const { variant = "underline", activation = "auto" } = options;
  const listeners = new Listeners();
  const items = [...list.querySelectorAll<HTMLElement>(":scope > button, :scope > [role='tab']")];
  list.classList.add("m-tabs", `m-tabs-${variant}`);
  list.setAttribute("role", "tablist");
  for (const tab of items) {
    tab.setAttribute("role", "tab");
    tab.classList.add("m-tab");
  }
  let index = Math.max(0, items.findIndex((tab) => tab.getAttribute("aria-selected") === "true"));

  const indicator = document.createElement("span");
  indicator.setAttribute("aria-hidden", "true");
  if (variant === "pill") {
    indicator.className = "m-tabs-fill";
    for (const tab of items) {
      const copy = document.createElement("span");
      copy.className = "m-tab";
      copy.append(...[...tab.childNodes].map((node) => node.cloneNode(true)));
      indicator.append(copy);
    }
  } else {
    indicator.className = "m-tabs-bar";
  }
  list.append(indicator);

  const place = () => {
    const tab = items[index];
    if (!tab) return;
    const left = tab.offsetLeft;
    const width = tab.offsetWidth;
    if (variant === "pill") {
      const right = list.clientWidth - left - width;
      indicator.style.clipPath = `inset(${tab.offsetTop}px ${right}px ${list.clientHeight - tab.offsetTop - tab.offsetHeight}px ${left}px round 999px)`;
    } else {
      indicator.style.transform = `translateX(${left}px)`;
      indicator.style.width = `${width}px`;
    }
  };

  const select = (next: number, focus = false) => {
    if (!items[next]) return;
    const changed = next !== index;
    index = next;
    items.forEach((tab, i) => {
      const active = i === index;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
      const panel = document.getElementById(tab.getAttribute("aria-controls") ?? "");
      if (panel) panel.hidden = !active;
    });
    if (focus) items[index].focus();
    place();
    if (changed) options.onChange?.(index, items[index]);
  };

  items.forEach((tab, i) => {
    listeners.on(tab, "click", () => select(i));
    listeners.on<KeyboardEvent>(tab, "keydown", (event) => {
      const target = nextIndex(i, event.key, items.length);
      if (target === null) return;
      event.preventDefault();
      if (activation === "auto") select(target, true);
      else items[target].focus();
    });
  });

  select(index);
  // The first placement happens without a slide; after that every move glides.
  requestAnimationFrame(() => list.classList.add("m-tabs-ready"));
  const resize = new ResizeObserver(place);
  resize.observe(list);
  document.fonts?.ready.then(place);

  return {
    get index() {
      return index;
    },
    select,
    destroy() {
      listeners.clear();
      resize.disconnect();
      indicator.remove();
      list.classList.remove("m-tabs", `m-tabs-${variant}`, "m-tabs-ready");
    },
  };
}

/**
 * Just the gliding bar, for tab lists that already manage their own state: it follows whichever child matches
 * `active` (aria-selected="true" by default) and moves whenever that changes.
 */
export function slidingIndicator(list: HTMLElement, active = '[aria-selected="true"]'): Controller {
  list.classList.add("m-slider");
  const bar = document.createElement("span");
  bar.className = "m-tabs-bar";
  bar.setAttribute("aria-hidden", "true");
  list.append(bar);

  const place = () => {
    const tab = list.querySelector<HTMLElement>(`:scope > ${active}`);
    bar.hidden = !tab;
    if (!tab) return;
    bar.style.transform = `translateX(${tab.offsetLeft}px)`;
    bar.style.width = `${tab.offsetWidth}px`;
  };
  place();
  requestAnimationFrame(() => list.classList.add("m-tabs-ready"));
  const watch = new MutationObserver(place);
  watch.observe(list, { subtree: true, attributes: true, attributeFilter: ["aria-selected", "aria-current", "class"] });
  const resize = new ResizeObserver(place);
  resize.observe(list);
  document.fonts?.ready.then(place);

  return {
    destroy() {
      watch.disconnect();
      resize.disconnect();
      bar.remove();
      list.classList.remove("m-slider", "m-tabs-ready");
    },
  };
}
