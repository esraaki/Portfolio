import assert from 'node:assert/strict';
import { HERO_OBJECTS, getOrbLayout, getTouchImpulse, createFixedStepRunner } from '../hero-interactive-core.mjs';

for (const [index, object] of HERO_OBJECTS.entries()) {
  const desktop = getOrbLayout(object, index, false, 650);
  const mobile = getOrbLayout(object, index, true, 430);
  assert.ok(mobile.length > desktop.length, 'Mobile strings should be longer than desktop strings');
  assert.ok(mobile.length + mobile.size / 2 < 430, 'Mobile orbs must remain inside the installation');
}
const touch = { mode: 'simplified', bobX: 100, bobY: 300, pointerX: 100, pointerY: 300, size: 32 };
const tap = getTouchImpulse(touch);
assert.ok(tap.strength > 0 && tap.x !== 0, 'A stationary tap should move the orb without a hover event');
assert.ok(Math.abs(tap.x) <= 2.25, 'Touch should preserve the subtle impulse limit');
assert.equal(getTouchImpulse({ ...touch, mode: 'static' }).strength, 0, 'Reduced motion must ignore taps');
assert.equal(getTouchImpulse({ ...touch, pointerX: 240 }).strength, 0, 'Touches outside the orb should not disturb it');
for (const fps of [30, 60, 120]) {
  let steps = 0;
  const clock = createFixedStepRunner(() => { steps += 1; });
  clock.advance(0);
  for (let frame = 1; frame <= fps; frame += 1) clock.advance(frame * 1000 / fps);
  assert.equal(steps, 60, `${fps}Hz displays should simulate exactly one second of physics`);
  clock.reset();
  clock.advance(10000);
  assert.equal(steps, 60, 'Resuming a paused hero should not simulate the hidden time');
}
console.log('Verified mobile rope lengths, touch-only activation, and refresh-rate independent timing.');
