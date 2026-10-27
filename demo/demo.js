import {
  accordion,
  asyncButton,
  copyButton,
  counter,
  holdButton,
  icon,
  magnetic,
  menu,
  progress,
  spinner,
  switchControl,
  tabs,
  toast,
  toggle,
  tooltips,
} from "../dist/index.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Icons stand in for their placeholders, so each one is a direct child of the button whose state it shows.
for (const slot of $$("[data-icon]")) slot.replaceWith(icon(slot.dataset.icon));

// Theme: the sun-and-moon icon, dogfooded.
const themeButton = $("[data-theme-toggle]");
themeButton.append(icon("theme"));
themeButton.addEventListener("click", () => {
  const dark = toggle(themeButton);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  themeButton.setAttribute("aria-label", dark ? "Light theme" : "Dark theme");
});

// Buttons
for (const button of $$("[data-async]")) {
  const fails = button.dataset.async === "fail";
  asyncButton(button, () => wait(1100).then(() => {
    if (fails) throw new Error("offline");
  }), { success: fails ? "" : "Saved", error: "No connection" });
}
for (const button of $$("[data-copy]")) copyButton(button, button.dataset.copy);
for (const button of $$("[data-hold]")) holdButton(button, { onConfirm: () => toast("Deleted for good", { type: "success" }) });
for (const element of $$("[data-magnetic]")) magnetic(element);
for (const button of $$("[data-like]")) {
  const likes = counter($("[data-like-count]", button), { value: 128 });
  button.addEventListener("click", () => likes.set(likes.value + (toggle(button) ? 1 : -1)));
}

// Icons
for (const button of $$("[data-toggle]")) {
  button.addEventListener("click", () => {
    if (button.dataset.toggle === "expanded") {
      button.setAttribute("aria-expanded", String(button.getAttribute("aria-expanded") !== "true"));
    } else {
      toggle(button);
    }
  });
}
for (const button of $$("[data-download]")) {
  const glyph = $(".m-icon", button);
  button.addEventListener("click", async () => {
    if (glyph.dataset.state) return;
    glyph.dataset.state = "loading";
    await wait(1400);
    glyph.dataset.state = "done";
    await wait(1600);
    delete glyph.dataset.state;
  });
}

// Components
for (const button of $$("[data-switch]")) switchControl(button);
for (const list of $$("[data-tabs]")) tabs(list, { variant: list.dataset.tabs });
tooltips();
const toasts = {
  success: () => toast("Changes saved", { type: "success" }),
  undo: () => toast("Conversation archived", { action: { label: "Undo", onClick: () => toast("Brought back", { type: "success" }) } }),
  error: () => toast("Could not reach the server", { type: "error" }),
};
for (const button of $$("[data-toast]")) button.addEventListener("click", toasts[button.dataset.toast]);
for (const root of $$("[data-accordion]")) accordion(root, { single: true });
for (const trigger of $$("[data-menu]")) {
  const list = trigger.nextElementSibling;
  menu(trigger, list);
  list.addEventListener("click", (event) => {
    const item = event.target.closest("button");
    if (item) toast(`${item.textContent} chosen`);
  });
}

// Numbers and loading
const number = counter($("[data-counter]"), { value: 1284 });
for (const button of $$("[data-step]")) {
  button.addEventListener("click", () => {
    const step = button.dataset.step;
    number.set(step === "random" ? Math.round(Math.random() * 120000) : Math.max(0, number.value + Number(step)));
  });
}
const spinners = $("[data-spinners]");
const waiting = Object.assign(document.createElement("span"), { className: "m-btn waiting" });
waiting.append(spinner("Loading results"), "Loading");
spinners.append(spinner(), Object.assign(spinner(), { className: "m-spinner spinner-big" }), waiting);

const profile = $("[data-skeleton]");
const placeholder = profile.innerHTML;
const loadProfile = async () => {
  profile.innerHTML = placeholder;
  profile.setAttribute("aria-busy", "true");
  await wait(1500);
  profile.innerHTML = '<span class="avatar"></span><span class="lines"><span class="profile-name">drk</span><span class="profile-sub">Builds in the open</span></span>';
  profile.removeAttribute("aria-busy");
};
$("[data-reload]").addEventListener("click", loadProfile);
loadProfile();

const bar = progress($("[data-progress]"), { label: "Upload" });
let running = false;
$("[data-run]").addEventListener("click", async () => {
  if (running) return;
  running = true;
  for (const value of [0, 18, 34, 41, 66, 82, 100]) {
    bar.set(value);
    await wait(420);
  }
  running = false;
});
$("[data-unknown]").addEventListener("click", () => bar.indeterminate());
