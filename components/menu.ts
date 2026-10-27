import { Listeners, uid, type Controller } from "../core/core.js";

export interface MenuOptions {
  /** Which edge of the trigger the menu lines up with; it also grows from that corner. */
  align?: "start" | "end";
}

export interface Menu extends Controller {
  open(focusFirst?: boolean): void;
  close(returnFocus?: boolean): void;
}

/**
 * A dropdown menu. It grows out of the corner nearest its trigger rather than its own centre, and opens and closes
 * fast, because menus are used many times a day. Arrow keys, Home and End move through the items, Escape closes
 * and gives focus back, and a click anywhere else closes it. Wrap the trigger and the list in one element.
 */
export function menu(trigger: HTMLButtonElement, list: HTMLElement, options: MenuOptions = {}): Menu {
  const listeners = new Listeners();
  list.classList.add("m-menu-list");
  list.dataset.align = options.align ?? "start";
  list.setAttribute("role", "menu");
  list.id ||= uid("menu");
  trigger.setAttribute("aria-haspopup", "menu");
  trigger.setAttribute("aria-controls", list.id);
  trigger.setAttribute("aria-expanded", "false");
  const items = () => [...list.querySelectorAll<HTMLElement>("a, button")];
  for (const item of items()) {
    item.setAttribute("role", "menuitem");
    item.tabIndex = -1;
  }

  const isOpen = () => trigger.getAttribute("aria-expanded") === "true";
  const open = (focusFirst = false) => {
    trigger.setAttribute("aria-expanded", "true");
    list.setAttribute("data-open", "");
    if (focusFirst) items()[0]?.focus();
  };
  const close = (returnFocus = false) => {
    if (!isOpen()) return;
    trigger.setAttribute("aria-expanded", "false");
    list.removeAttribute("data-open");
    if (returnFocus) trigger.focus();
  };

  listeners.on(trigger, "click", () => (isOpen() ? close() : open()));
  listeners.on<KeyboardEvent>(trigger, "keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      open();
      const all = items();
      all[event.key === "ArrowDown" ? 0 : all.length - 1]?.focus();
    }
  });
  listeners.on<KeyboardEvent>(list, "keydown", (event) => {
    const all = items();
    const at = all.indexOf(document.activeElement as HTMLElement);
    const go = (index: number) => {
      event.preventDefault();
      all[(index + all.length) % all.length]?.focus();
    };
    if (event.key === "ArrowDown") go(at + 1);
    else if (event.key === "ArrowUp") go(at - 1);
    else if (event.key === "Home") go(0);
    else if (event.key === "End") go(all.length - 1);
    else if (event.key === "Escape") {
      event.preventDefault();
      close(true);
    } else if (event.key === "Tab") close();
  });
  listeners.on(list, "click", (event) => {
    if ((event.target as Element).closest("[role='menuitem']")) close(true);
  });
  listeners.on<PointerEvent>(document, "pointerdown", (event) => {
    const target = event.target as Node;
    if (!list.contains(target) && !trigger.contains(target)) close();
  });

  return {
    open,
    close,
    destroy() {
      listeners.clear();
      close();
    },
  };
}
