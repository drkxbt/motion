import { replay, svg, uid } from "../core/core.js";

/* Animated icons. Each one has two states and moves between them on its own: put it inside a button and toggle
   the button's aria-pressed, aria-expanded or aria-checked, or set `data-on` on the icon itself. Nothing here
   needs script after the icon is made; the motion lives in motion.css. */

export type IconName = "menu" | "play" | "heart" | "bell" | "theme" | "download" | "check" | "eye" | "arrow" | "chevron" | "copy";

const LINE = 'fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"';

const MARKUP: Record<Exclude<IconName, "play" | "theme" | "copy">, string> = {
  // Three bars that fold into a cross.
  menu: `<g ${LINE}><path class="m-bar m-bar-1" d="M4 7h16"/><path class="m-bar m-bar-2" d="M4 12h16"/><path class="m-bar m-bar-3" d="M4 17h16"/></g>`,
  // An outline that fills and pops, with a ring of sparks.
  heart: `<g class="m-sparks" fill="currentColor">${'<circle cx="12" cy="12" r="1.3"/>'.repeat(8)}</g>
    <path class="m-heart" ${LINE} d="M12 20.3s-7.8-4.6-7.8-10.4A4.4 4.4 0 0 1 12 7.1a4.4 4.4 0 0 1 7.8 2.8c0 5.8-7.8 10.4-7.8 10.4Z"/>`,
  // A bell that swings from its top and settles; the clapper swings the other way.
  bell: `<g class="m-bell" ${LINE}><path d="M6.5 10.5a5.5 5.5 0 0 1 11 0c0 4.2 1.5 5.7 2 6.5h-15c.5-.8 2-2.3 2-6.5Z"/><path d="M12 3.2V5"/></g>
    <path class="m-clapper" ${LINE} d="M10 19.6a2.2 2.2 0 0 0 4 0"/>`,
  // A tray with an arrow that drops into it and turns into a tick.
  download: `<g ${LINE}><path d="M4.5 15.5v2.3c0 1.2 1 2.2 2.2 2.2h10.6c1.2 0 2.2-1 2.2-2.2v-2.3"/>
    <g class="m-arrow-down"><path d="M12 4v10.5"/><path d="m7.5 10 4.5 4.5 4.5-4.5"/></g>
    <path class="m-draw m-tick" pathLength="1" d="m8 11.5 3 3 5.2-6"/></g>`,
  // A ring with a tick that draws itself inside it.
  check: `<g ${LINE}><circle class="m-ring" cx="12" cy="12" r="8.6"/><path class="m-draw" pathLength="1" d="m8.2 12.3 2.6 2.6 5-5.4"/></g>`,
  // An eye; a slash draws across it when it is on.
  eye: `<g ${LINE}><path d="M2.8 12c2-4.1 5.1-6.2 9.2-6.2s7.2 2.1 9.2 6.2c-2 4.1-5.1 6.2-9.2 6.2S4.8 16.1 2.8 12Z"/><circle cx="12" cy="12" r="2.8"/>
    <path class="m-draw m-slash" pathLength="1" d="M4 4l16 16"/></g>`,
  // An arrow that nudges forward when its button is hovered.
  arrow: `<g class="m-nudge" ${LINE}><path d="M5 12h13.5"/><path d="m13 6.5 5.5 5.5-5.5 5.5"/></g>`,
  // A chevron that turns over when its button is expanded.
  chevron: `<path class="m-turn" ${LINE} d="m6 9.5 6 6 6-6"/>`,
};

/** Sun and moon. The moon is the sun's disc grown and bitten by a mask, so the two morph into each other. */
function theme(): SVGSVGElement {
  const id = uid("moon");
  const rays = Array.from({ length: 8 }, (_, i) => {
    const angle = (i * Math.PI) / 4;
    const [x1, y1, x2, y2] = [8.3, 10.6].flatMap((r) => [12 + Math.cos(angle) * r, 12 + Math.sin(angle) * r]).map((n) => n.toFixed(2));
    return `<path d="M${x1} ${y1}L${x2} ${y2}"/>`;
  }).join("");
  return svg(
    `<mask id="${id}"><rect width="24" height="24" fill="#fff"/><circle class="m-bite" cx="21" cy="3" r="6.5" fill="#000"/></mask>
     <circle class="m-disc" cx="12" cy="12" r="5" fill="currentColor" mask="url(#${id})"/>
     <g class="m-rays" fill="none" stroke="currentColor" stroke-linecap="round">${rays}</g>`,
    "m-icon m-icon-theme",
  );
}

/** Play and pause as two halves that reshape: two bars become the two halves of a triangle. Drawn with clip
 *  paths rather than SVG paths so the morph runs the same in every browser. */
function play(): HTMLElement {
  const element = document.createElement("span");
  element.className = "m-icon m-icon-play";
  element.setAttribute("aria-hidden", "true");
  element.append(document.createElement("i"), document.createElement("i"));
  return element;
}

/** Copy and its tick, stacked; one fades into the other. */
function copy(): HTMLElement {
  const element = document.createElement("span");
  element.className = "m-icon m-icon-copy";
  element.setAttribute("aria-hidden", "true");
  element.append(
    svg(`<g ${LINE}><rect x="8.5" y="8.5" width="11" height="11" rx="2.2"/><path d="M15.5 8.5V6.7c0-1.2-1-2.2-2.2-2.2H6.7c-1.2 0-2.2 1-2.2 2.2v6.6c0 1.2 1 2.2 2.2 2.2h1.8"/></g>`, "m-copy-glyph"),
    svg(`<path ${LINE} d="m5 12.5 4.5 4.5L19 7.5"/>`, "m-copy-tick"),
  );
  return element;
}

/** Makes an icon. It is decorative: label the button that holds it, not the icon. */
export function icon(name: IconName): SVGSVGElement | HTMLElement {
  if (name === "theme") return theme();
  if (name === "play") return play();
  if (name === "copy") return copy();
  if (!(name in MARKUP)) throw new RangeError(`no icon called "${name}"`);
  const element = svg(MARKUP[name as keyof typeof MARKUP], `m-icon m-icon-${name}`);
  // Each spark's angle is set through the style object, not a style attribute, so a strict Content Security
  // Policy without 'unsafe-inline' still lets them fan out.
  element.querySelectorAll<SVGElement>(".m-sparks circle").forEach((spark, i) => spark.style.setProperty("--a", `${i * 45}deg`));
  return element;
}

/** Flips a toggle button's aria-pressed and returns the new state. */
export function toggle(button: HTMLElement): boolean {
  const on = button.getAttribute("aria-pressed") !== "true";
  button.setAttribute("aria-pressed", String(on));
  return on;
}

/** Rings a bell icon once, for a notification that arrives while the bell stays on. */
export const ring = (bell: Element) => replay(bell, "m-ringing");

/** Bursts a heart icon once more, for a second like. */
export const burst = (heart: Element) => replay(heart, "m-bursting");
