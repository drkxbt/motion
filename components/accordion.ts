import { Listeners, uid, type Controller } from "../core/core.js";

export interface AccordionOptions {
  /** Whether opening one section closes the others. */
  single?: boolean;
}

/**
 * Sections that open in place. Each `.m-accordion-item` holds a button and the panel after it; the panel grows
 * from nothing to its own height while its content rises in, with no height measured in script. Closed panels
 * are inert, so focus and screen readers skip them.
 */
export function accordion(root: HTMLElement, options: AccordionOptions = {}): Controller {
  const listeners = new Listeners();
  root.classList.add("m-accordion");
  const items = [...root.querySelectorAll<HTMLElement>(".m-accordion-item")].map((item) => {
    const trigger = item.querySelector<HTMLButtonElement>("button")!;
    const panel = trigger.nextElementSibling as HTMLElement;
    panel.classList.add("m-accordion-panel");
    panel.id ||= uid("panel");
    panel.setAttribute("role", "region");
    panel.setAttribute("aria-labelledby", (trigger.id ||= uid("trigger")));
    trigger.setAttribute("aria-controls", panel.id);
    // The content is wrapped once so the panel can animate its row while the content slides and fades.
    if (!panel.firstElementChild?.classList.contains("m-accordion-content")) {
      const content = document.createElement("div");
      content.className = "m-accordion-content";
      content.append(...panel.childNodes);
      panel.append(content);
    }
    return { trigger, panel };
  });

  const set = (index: number, open: boolean) => {
    const { trigger, panel } = items[index];
    trigger.setAttribute("aria-expanded", String(open));
    panel.inert = !open;
    panel.toggleAttribute("data-open", open);
  };
  items.forEach(({ trigger }, i) => {
    set(i, trigger.getAttribute("aria-expanded") === "true");
    listeners.on(trigger, "click", () => {
      const open = trigger.getAttribute("aria-expanded") !== "true";
      if (open && options.single) items.forEach((_, j) => j !== i && set(j, false));
      set(i, open);
    });
  });

  return {
    destroy() {
      listeners.clear();
      root.classList.remove("m-accordion");
    },
  };
}
