import { Listeners, type Controller } from "../core/core.js";

export interface SwitchOptions {
  onChange?: (on: boolean) => void;
}

export interface Switch extends Controller {
  readonly checked: boolean;
  set(on: boolean): void;
}

/**
 * An on/off switch on a `<button>`. The thumb slides across, and stretches a little while it is pressed, the way a
 * finger squashes it. The state lives in aria-checked, so screen readers and the styles read the same thing.
 */
export function switchControl(button: HTMLButtonElement, options: SwitchOptions = {}): Switch {
  const listeners = new Listeners();
  button.classList.add("m-switch");
  button.setAttribute("role", "switch");
  if (!button.hasAttribute("aria-checked")) button.setAttribute("aria-checked", "false");
  const added = button.querySelector(".m-switch-thumb") ? null : document.createElement("span");
  if (added) {
    added.className = "m-switch-thumb";
    added.setAttribute("aria-hidden", "true");
    button.append(added);
  }

  const set = (on: boolean) => {
    if (on === (button.getAttribute("aria-checked") === "true")) return;
    button.setAttribute("aria-checked", String(on));
    options.onChange?.(on);
  };
  listeners.on(button, "click", () => set(button.getAttribute("aria-checked") !== "true"));

  return {
    get checked() {
      return button.getAttribute("aria-checked") === "true";
    },
    set,
    destroy() {
      listeners.clear();
      added?.remove();
    },
  };
}
