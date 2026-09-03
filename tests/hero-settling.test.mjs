import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { HERO_OBJECTS, configureHeroPhysics, getOrbLayout, createFixedStepRunner } from '../hero-interactive-core.mjs';

// Exercise the actual vendored solver, not a substitute physics formula.
const scope = {};
scope.window = scope;
vm.runInNewContext(await readFile(new URL('../vendor/verlet-1.0.0.js', import.meta.url), 'utf8'), scope);
let combinations = 0;
for (const mode of ['full', 'simplified']) {
  for (const [index, object] of HERO_OBJECTS.entries()) {
   for (const fps of [30, 60, 120]) {
    const { length } = getOrbLayout(object, index, mode === 'simplified', mode === 'simplified' ? 430 : 650);
    const engine = new scope.VerletJS(600, 650, { getContext: () => ({}) });
    configureHeroPhysics(engine, mode);
    const rope = engine.lineSegments([new scope.Vec2(300, 0), new scope.Vec2(300, length)], .95);
    rope.pin(0);
    const bob = rope.particles[1];
    for (let frame = 0; frame < 120; frame += 1) engine.frame(6);
    const restY = bob.pos.y;
    // Multiple maximum-strength samples before release, not just a single nudge.
    for (let frame = 0; frame < 30; frame += 1) {
      if (frame % 8 === 0) { bob.pos.x += 2.25; bob.pos.y += 1.5; }
      engine.frame(6);
    }
    let maximumLateOffset = 0;
    const clock = createFixedStepRunner(() => engine.frame(6));
    clock.advance(0);
    for (let frame = 1; frame <= fps * 3; frame += 1) {
      clock.advance(frame * 1000 / fps);
      if (frame >= fps) maximumLateOffset = Math.max(maximumLateOffset, Math.hypot(bob.pos.x - 300, bob.pos.y - restY));
    }
    assert.ok(maximumLateOffset < 1, `${mode}, ${length}px rope at ${fps}Hz should return within 1px by 1 second and stay there; got ${maximumLateOffset}`);
    combinations += 1;
   }
  }
}
console.log(`Verified ${combinations} rope/mode/refresh-rate combinations settle within 1px by 1 second after repeated sweeps.`);
