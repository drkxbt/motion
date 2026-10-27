import { test } from "node:test";
import assert from "node:assert/strict";
import { nextIndex, rollTarget, settled, slots, stackLayout, stepSpring } from "../dist/index.js";

const keys = (text) => slots(text).map((slot) => `${slot.key}:${slot.char}`);

test("digits are keyed from the right, so the units stay the units when a place is added", () => {
  assert.deepEqual(keys("999"), ["d2:9", "d1:9", "d0:9"]);
  assert.deepEqual(keys("1,000"), ["d3:1", "m3:,", "d2:0", "d1:0", "d0:0"]);
  // Shared keys mean 999 to 1,000 rolls three wheels and adds two slots.
  const before = new Set(slots("999").map((slot) => slot.key));
  const added = slots("1,000").filter((slot) => !before.has(slot.key)).map((slot) => slot.char);
  assert.deepEqual(added, ["1", ","]);
});

test("prefixes, suffixes and decimal points get keys of their own", () => {
  assert.deepEqual(keys("$12.50"), ["p0:$", "d3:1", "d2:2", "m2:.", "d1:5", "d0:0"]);
  assert.deepEqual(keys("45%"), ["d1:4", "d0:5", "s0:%"]);
  assert.deepEqual(keys("—"), ["p0:—"]);
});

test("a wheel rolls forward when the number grows and backward when it shrinks", () => {
  // From 9 (position 19) up to 0 goes forward one step, not back nine.
  assert.equal(rollTarget(19, 0, 1), 20);
  // From 0 (position 10) down to 9 goes back one step.
  assert.equal(rollTarget(10, 9, -1), 9);
  assert.equal(rollTarget(13, 7, 1), 17);
  assert.equal(rollTarget(17, 3, -1), 13);
  assert.equal(rollTarget(15, 5, 1), 15);
  // A full lap the long way stays on the 30-digit strip from any settled position.
  for (let digit = 0; digit < 10; digit++) {
    for (let to = 0; to < 10; to++) {
      for (const direction of [1, -1]) {
        const target = rollTarget(10 + digit, to, direction);
        assert.ok(target >= 0 && target < 30, `${digit} to ${to} lands on ${target}`);
        assert.equal(((target % 10) + 10) % 10, to);
      }
    }
  }
});

test("arrow keys wrap around the tabs; Home and End jump to the ends", () => {
  assert.equal(nextIndex(0, "ArrowRight", 4), 1);
  assert.equal(nextIndex(3, "ArrowRight", 4), 0);
  assert.equal(nextIndex(0, "ArrowLeft", 4), 3);
  assert.equal(nextIndex(2, "ArrowDown", 4), 3);
  assert.equal(nextIndex(2, "Home", 4), 0);
  assert.equal(nextIndex(1, "End", 4), 3);
  assert.equal(nextIndex(1, "a", 4), null);
});

test("closed toasts peek out behind the newest; open, they stack with a gap", () => {
  const heights = [52, 70, 52, 52];
  assert.deepEqual(stackLayout(heights, false, 3), [
    { y: -0, scale: 1, opacity: 1 },
    { y: -10, scale: 0.95, opacity: 1 },
    { y: -20, scale: 0.9, opacity: 1 },
    { y: -30, scale: 0.85, opacity: 0 },
  ]);
  assert.deepEqual(stackLayout(heights, true, 3).map((slot) => slot.y), [-0, -62, -142, -204]);
  assert.equal(stackLayout(heights, true, 3)[3].opacity, 0);
});

test("the spring eases out, overshoots a little at most, and comes to rest on its target", () => {
  let spring = { value: 0, velocity: 0 };
  let peak = 0;
  let steps = 0;
  while (!settled(spring, 10) && steps < 1000) {
    spring = stepSpring(spring, 10, 1 / 60, { stiffness: 220, damping: 18 });
    peak = Math.max(peak, spring.value);
    steps++;
  }
  assert.ok(steps < 300, `settled after ${steps} frames`);
  assert.ok(Math.abs(spring.value - 10) < 0.01);
  assert.ok(peak < 12.5, `peak ${peak}`);
});
