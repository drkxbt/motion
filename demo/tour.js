// A looping tour for recordings: ?scene=overview, buttons, icons, components or loading. Each scene runs a
// timeline of events once per period and ends where it began, so one recorded period loops without a seam.
import { accordion, asyncButton, configureToasts, counter, icon, magnetic, menu, progress, spinner, switchControl, tabs, toast, toggle, tooltip } from "../dist/index.js";

const scene = new URLSearchParams(location.search).get("scene") ?? "overview";
const stage = document.querySelector("[data-tour]");
stage.dataset.scene = scene;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const html = (markup) => {
  const template = document.createElement("template");
  template.innerHTML = markup.trim();
  return template.content.firstElementChild;
};
const fillIcons = (root) => {
  for (const slot of root.querySelectorAll("[data-icon]")) slot.replaceWith(icon(slot.dataset.icon));
  return root;
};
const tile = (name, sub, body) => {
  const element = html(`<section class="tile"><div class="stage stage-col"></div><p class="tile-name">${name}</p><p class="tile-sub">${sub}</p></section>`);
  element.querySelector(".stage").append(fillIcons(html(`<div class="row">${body}</div>`)));
  stage.append(element);
  return element;
};

const events = [];
const at = (ms, run) => events.push({ ms, run });
let PERIOD = 7000;

// Moves a fake pointer so the magnetic effect has something to follow.
function orbit(target, from, to) {
  const tick = (t) => {
    if (t < from || t > to + 700) return;
    const rect = target.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const near = t <= to;
    const angle = ((t - from) / (to - from)) * Math.PI * 2;
    const x = near ? cx + Math.cos(angle) * 70 : cx + 400;
    const y = near ? cy + Math.sin(angle) * 26 : cy;
    window.dispatchEvent(new PointerEvent("pointermove", { clientX: x, clientY: y, pointerType: "mouse" }));
    target.classList.toggle("tour-hover", near);
  };
  frames.push(tick);
}
const frames = [];

function buttonsScene(compact = false) {
  if (!compact) {
    const press = tile("Press", "Every button gives a little", '<button class="m-btn m-btn-primary" type="button">Save changes</button><button class="m-btn" type="button">Cancel</button>');
    const [primary, secondary] = press.querySelectorAll("button");
    at(500, () => primary.classList.add("tour-press"));
    at(680, () => primary.classList.remove("tour-press"));
    at(3900, () => secondary.classList.add("tour-press"));
    at(4080, () => secondary.classList.remove("tour-press"));
  }

  const asyncTile = tile("Async", "Spinner, then a tick or a cross", '<button class="m-btn m-btn-primary" type="button">Save changes</button><button class="m-btn" type="button">Publish</button>');
  const [ok, fail] = asyncTile.querySelectorAll("button");
  const okRun = asyncButton(ok, () => wait(1000), { success: "Saved" });
  const failRun = asyncButton(fail, () => wait(1000).then(() => Promise.reject(new Error("offline"))), { error: "No connection" });
  at(900, () => okRun.run());
  at(4300, () => failRun.run());
  if (compact) return;

  const copy = tile("Copy", "The glyph turns into a tick", '<div class="snippet"><code>npm i github:drkxbt/motion</code><button class="m-btn m-btn-square" type="button" aria-label="Copy"><span data-icon="copy"></span></button></div>');
  const copyButton = copy.querySelector("button");
  at(1500, () => (copyButton.dataset.copied = ""));
  at(3000, () => delete copyButton.dataset.copied);
  at(5000, () => (copyButton.dataset.copied = ""));
  at(6500, () => delete copyButton.dataset.copied);

  const hold = tile("Hold to confirm", "Let go early and it runs back", '<button class="m-btn hold" type="button"><span>Hold to delete</span></button>');
  const holdButton = hold.querySelector("button");
  holdButton.classList.add("m-hold");
  holdButton.style.setProperty("--m-hold", "1200ms");
  const fill = html('<span class="m-hold-fill" aria-hidden="true"><span>Hold to delete</span></span>');
  holdButton.append(fill);
  at(1100, () => (holdButton.dataset.holding = ""));
  at(2300, () => {
    delete holdButton.dataset.holding;
    holdButton.dataset.state = "done";
  });
  at(3500, () => delete holdButton.dataset.state);
  at(4600, () => (holdButton.dataset.holding = ""));
  at(5250, () => delete holdButton.dataset.holding);

  const magnet = tile("Magnetic", "Leans toward the pointer", '<a class="m-btn m-btn-primary" href="#">Get started<span data-icon="arrow"></span></a>');
  const link = magnet.querySelector("a");
  magnetic(link);
  orbit(link, 900, 4600);

  const like = tile("Like", "Pops, sparks, and the count rolls", '<button class="m-btn like" type="button" aria-pressed="false"><span data-icon="heart"></span><span></span></button>');
  const likeButton = like.querySelector("button");
  const likes = counter(likeButton.querySelector("span:last-child"), { value: 128 });
  at(2100, () => likes.set(likes.value + (toggle(likeButton) ? 1 : -1)));
  at(5300, () => likes.set(likes.value + (toggle(likeButton) ? 1 : -1)));
}

function iconsScene() {
  PERIOD = 6400;
  const names = [["menu", "Menu", "expanded"], ["play", "Play"], ["heart", "Like"], ["bell", "Notify"], ["theme", "Theme"], ["download", "Download", "download"], ["check", "Done"], ["eye", "Hide"], ["chevron", "More", "expanded"], ["arrow", "Next", "hover"]];
  names.forEach(([name, label, kind], i) => {
    const element = fillIcons(html(`<div class="icon-tile"><button class="icon-toggle-bare" type="button"><span data-icon="${name}"></span></button><span>${label}</span></div>`));
    stage.append(element);
    const holder = element.querySelector("button");
    const glyph = holder.firstElementChild;
    const on = 300 + i * 170;
    const off = 3500 + i * 170;
    if (kind === "expanded") {
      at(on, () => holder.setAttribute("aria-expanded", "true"));
      at(off, () => holder.setAttribute("aria-expanded", "false"));
    } else if (kind === "download") {
      at(on, () => (glyph.dataset.state = "loading"));
      at(on + 1300, () => (glyph.dataset.state = "done"));
      at(off + 400, () => delete glyph.dataset.state);
    } else if (kind === "hover") {
      at(on, () => holder.classList.add("tour-hover"));
      at(on + 500, () => holder.classList.remove("tour-hover"));
      at(off, () => holder.classList.add("tour-hover"));
      at(off + 500, () => holder.classList.remove("tour-hover"));
    } else {
      at(on, () => holder.setAttribute("aria-pressed", "true"));
      at(off, () => holder.setAttribute("aria-pressed", "false"));
    }
  });
}

function tabsTile() {
  const element = tile("Tabs", "A pill or a bar that glides", "");
  const row = element.querySelector(".row");
  row.style.flexDirection = "column";
  row.style.alignItems = "center";
  row.append(
    html('<div data-pill><button type="button">Day</button><button type="button" aria-selected="true">Week</button><button type="button">Month</button><button type="button">Year</button></div>'),
    html('<div data-under><button type="button" aria-selected="true">Overview</button><button type="button">Activity</button><button type="button">Settings</button></div>'),
  );
  const pill = tabs(row.querySelector("[data-pill]"), { variant: "pill" });
  const under = tabs(row.querySelector("[data-under]"));
  [[1000, 2], [2400, 3], [3800, 0], [5400, 1]].forEach(([ms, i]) => at(ms, () => pill.select(i)));
  [[1700, 1], [3100, 2], [4600, 0]].forEach(([ms, i]) => at(ms, () => under.select(i)));
}

function componentsScene() {
  PERIOD = 8000;
  configureToasts({ position: "bottom-right" });
  const switches = tile("Switch", "Slides, and stretches while pressed", "");
  const row = switches.querySelector(".row");
  row.style.flexDirection = "column";
  row.append(
    html('<label class="setting"><span>Notifications</span><button type="button" aria-checked="true"></button></label>'),
    html('<label class="setting"><span>Weekly digest</span><button type="button"></button></label>'),
  );
  const [first, second] = [...row.querySelectorAll("button")].map((button) => switchControl(button));
  at(800, () => second.set(true));
  at(2600, () => first.set(false));
  at(4800, () => second.set(false));
  at(6400, () => first.set(true));

  tabsTile();

  const faq = tile("Accordion", "Grows to its own height", "");
  faq.querySelector(".row").append(fillIcons(html(`<div class="faq">
    <div class="m-accordion-item"><button type="button">Does it need a framework?<span data-icon="chevron"></span></button><div><p>No. Plain CSS and a few small functions.</p></div></div>
    <div class="m-accordion-item"><button type="button">What about reduced motion?<span data-icon="chevron"></span></button><div><p>Movement stops; states change at once.</p></div></div></div>`)));
  accordion(faq.querySelector(".faq"), { single: true });
  const [q1, q2] = faq.querySelectorAll(".m-accordion-item > button");
  at(1200, () => q1.click());
  at(3700, () => q2.click());
  at(6200, () => q2.click());

  const menuTile = tile("Menu", "Grows out of its button", '<div class="m-menu"><button class="m-btn" type="button">Options<span data-icon="chevron"></span></button><div><button type="button">Edit</button><button type="button">Duplicate</button><button type="button">Archive</button></div></div>');
  const trigger = menuTile.querySelector(".m-menu > button");
  const list = trigger.nextElementSibling;
  const options = menu(trigger, list);
  const items = list.querySelectorAll("button");
  at(1500, () => options.open());
  at(2100, () => items[1].classList.add("tour-focus"));
  at(3500, () => {
    items[1].classList.remove("tour-focus");
    options.close();
  });

  const tips = tile("Tooltip", "The next ones show at once", '<button class="m-btn m-btn-square" type="button" aria-label="Copy link"><span data-icon="copy"></span></button><button class="m-btn m-btn-square" type="button" aria-label="Like"><span data-icon="heart"></span></button><button class="m-btn m-btn-square" type="button" aria-label="Notifications"><span data-icon="bell"></span></button><button class="m-btn m-btn-square" type="button" aria-label="Download"><span data-icon="download"></span></button>');
  const triggers = [...tips.querySelectorAll("button")];
  triggers.forEach((button) => tooltip(button, { delay: 400 }));
  const enter = (i) => triggers[i].dispatchEvent(new PointerEvent("pointerenter", { pointerType: "mouse" }));
  const leave = (i) => triggers[i].dispatchEvent(new PointerEvent("pointerleave", { pointerType: "mouse" }));
  at(4300, () => enter(0));
  at(5300, () => { leave(0); enter(1); });
  at(5900, () => { leave(1); enter(2); });
  at(6500, () => { leave(2); enter(3); });
  at(7200, () => leave(3));

  tile("Toast", "Stacks, opens on hover, swipes away", "");
  let shown = [];
  at(900, () => shown.push(toast("Changes saved", { type: "success", duration: 60000 })));
  at(1500, () => shown.push(toast("Conversation archived", { duration: 60000, action: { label: "Undo", onClick() {} } })));
  at(2100, () => shown.push(toast("Could not reach the server", { type: "error", duration: 60000 })));
  at(3200, () => document.querySelector(".m-toaster ol")?.dispatchEvent(new PointerEvent("pointerenter")));
  at(4600, () => document.querySelector(".m-toaster ol")?.dispatchEvent(new PointerEvent("pointerleave")));
  at(5400, () => shown.pop()?.dismiss());
  at(5900, () => shown.pop()?.dismiss());
  at(6400, () => shown.pop()?.dismiss());
}

function loadingScene() {
  PERIOD = 7000;
  const count = tile("Counter", "Rolls up when it grows, down when it shrinks", '<span class="big-number"></span>');
  const number = counter(count.querySelector(".big-number"), { value: 1284 });
  [[700, 1297], [1900, 12480], [3300, 9876], [4700, 98765], [5900, 1284]].forEach(([ms, value]) => at(ms, () => number.set(value)));

  const spin = tile("Spinner", "Quick on purpose", "");
  const waiting = html('<span class="m-btn waiting"></span>');
  waiting.append(spinner("Loading results"), "Loading");
  spin.querySelector(".row").append(spinner(), Object.assign(spinner(), { className: "m-spinner spinner-big" }), waiting);

  const skeleton = tile("Skeleton", "The shape of what is coming", '<div class="profile"></div>');
  const profile = skeleton.querySelector(".profile");
  const placeholder = '<span class="m-skeleton avatar-sk"></span><span class="lines"><span class="m-skeleton m-skeleton-line" style="width: 70%"></span><span class="m-skeleton m-skeleton-line" style="width: 45%"></span></span>';
  const loaded = '<span class="avatar"></span><span class="lines"><span class="profile-name">drk</span><span class="profile-sub">Builds in the open</span></span>';
  profile.innerHTML = placeholder;
  at(1900, () => (profile.innerHTML = loaded));
  at(5300, () => (profile.innerHTML = placeholder));

  const bar = tile("Progress", "Eases to each value, or sweeps", '<span class="progress"></span>');
  const meter = progress(bar.querySelector(".progress"), { label: "Upload" });
  [[600, 24], [1300, 58], [2000, 81], [2700, 100]].forEach(([ms, value]) => at(ms, () => meter.set(value)));
  at(3700, () => meter.indeterminate());
  at(6100, () => meter.set(0));
}

function overviewScene() {
  PERIOD = 8000;
  buttonsScene(true);
  const like = tile("Like", "Pops, sparks, and the count rolls", '<button class="m-btn like" type="button" aria-pressed="false"><span data-icon="heart"></span><span></span></button>');
  const likeButton = like.querySelector("button");
  const likes = counter(likeButton.querySelector("span:last-child"), { value: 128 });
  at(1800, () => likes.set(likes.value + (toggle(likeButton) ? 1 : -1)));
  at(5600, () => likes.set(likes.value + (toggle(likeButton) ? 1 : -1)));

  const glyphs = tile("Icons", "Two states each, moving on their own", '<div class="icon-row"><button class="icon-toggle-bare" type="button" aria-expanded="false"><span data-icon="menu"></span></button><button class="icon-toggle-bare" type="button" aria-pressed="false"><span data-icon="play"></span></button><button class="icon-toggle-bare" type="button" aria-pressed="false"><span data-icon="theme"></span></button><button class="icon-toggle-bare" type="button" aria-pressed="false"><span data-icon="bell"></span></button><button class="icon-toggle-bare" type="button" aria-pressed="false"><span data-icon="check"></span></button></div>');
  [...glyphs.querySelectorAll("button")].forEach((button, i) => {
    const attr = button.hasAttribute("aria-expanded") ? "aria-expanded" : "aria-pressed";
    at(700 + i * 220, () => button.setAttribute(attr, "true"));
    at(4300 + i * 220, () => button.setAttribute(attr, "false"));
  });

  tabsTile();

  const count = tile("Counter", "Digits roll like an odometer", '<span class="big-number"></span>');
  const number = counter(count.querySelector(".big-number"), { value: 1284 });
  [[1000, 1297], [2600, 12480], [4400, 9876], [6400, 1284]].forEach(([ms, value]) => at(ms, () => number.set(value)));

  configureToasts({ position: "bottom-right" });
  const switches = tile("Switch and toast", "Small states, said clearly", '<label class="setting"><span>Notifications</span><button type="button" aria-checked="false"></button></label>');
  const control = switchControl(switches.querySelector("label button"));
  let note = null;
  at(1400, () => {
    control.set(true);
    note = toast("Notifications on", { type: "success", duration: 60000 });
  });
  at(4800, () => note?.dismiss());
  at(5600, () => control.set(false));
}

({ overview: overviewScene, buttons: buttonsScene, icons: iconsScene, components: componentsScene, loading: loadingScene }[scene] ?? overviewScene)();

await document.fonts.ready;
await wait(300);
const start = performance.now();
// For a recorder: the loop's period and its first frame in wall-clock milliseconds, to cut exactly one loop.
window.tour = { period: PERIOD, start: performance.timeOrigin + start };
let last = -1;
const crossed = (from, to, ms) => (from <= to ? ms > from && ms <= to : ms > from || ms <= to);
function frame(now) {
  const t = (now - start) % PERIOD;
  for (const event of events) if (crossed(last, t, event.ms)) event.run();
  for (const tick of frames) tick(t);
  last = t;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
