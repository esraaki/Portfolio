import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const {
  HERO_OBJECTS,
  getPointerImpulse,
  getInteractionMode,
  shouldRunAnimation,
  SoundGate,
} = await import('../hero-interactive-core.mjs');

assert.equal(
  getInteractionMode({ reducedMotion: true, coarsePointer: false, width: 1440 }),
  'static',
  'Reduced-motion visitors should receive a static installation',
);
assert.equal(
  getInteractionMode({ reducedMotion: false, coarsePointer: true, width: 390 }),
  'simplified',
  'Small touch devices should receive simplified motion',
);
assert.equal(
  getInteractionMode({ reducedMotion: false, coarsePointer: false, width: 1440 }),
  'full',
  'Desktop pointer devices should receive the full interaction',
);
assert.equal(shouldRunAnimation('full', true), true, 'Visible desktop motion should run');
assert.equal(shouldRunAnimation('full', false), false, 'Offscreen motion should pause');
assert.equal(shouldRunAnimation('static', true), false, 'Reduced-motion mode should never animate');

const impulse = getPointerImpulse({
  bobX: 100,
  bobY: 100,
  pointerX: 122,
  pointerY: 104,
  movementX: 18,
  movementY: 3,
  radius: 80,
});
assert.ok(impulse.x > 1.5, 'A nearby pointer sweep should create a fluid, clearly visible horizontal impulse');
assert.ok(impulse.strength > 1, 'A nearby pointer sweep should cross the chime disturbance threshold');
assert.deepEqual(
  getPointerImpulse({ bobX: 100, bobY: 100, pointerX: 400, pointerY: 400, movementX: 20, movementY: 20, radius: 80 }),
  { x: 0, y: 0, strength: 0 },
  'Distant pointer movement should not affect an object',
);
const fastImpulse = getPointerImpulse({
  bobX: 100,
  bobY: 100,
  pointerX: 102,
  pointerY: 100,
  movementX: 200,
  movementY: 100,
  radius: 80,
});
assert.ok(Math.abs(fastImpulse.x) >= 5, 'A deliberate fast sweep should create clearly visible orb travel');
assert.ok(Math.abs(fastImpulse.x) <= 6.5 && Math.abs(fastImpulse.y) <= 2.5, 'Fast sweeps should stay polished rather than launching objects');

assert.equal(HERO_OBJECTS.length, 3, 'The installation should expose three replaceable objects');
assert.ok(
  Math.max(...HERO_OBJECTS.map(object => object.length)) - Math.min(...HERO_OBJECTS.map(object => object.length)) >= 90,
  'The three strings should have clearly distinct lengths',
);
assert.deepEqual(
  HERO_OBJECTS.map(object => object.asset),
  [2, 4, 5].map(number => `assets/hero-interactive/object-orb-${number}.svg`),
  'The three foreground orbs should remain independently replaceable',
);
await Promise.all(HERO_OBJECTS.map(async object => {
  assert.match(object.asset, /^assets\/hero-interactive\/[a-z0-9-]+\.svg$/);
  await access(path.join(root, object.asset));
}));

let starts = 0;
let notes = 0;
const sound = new SoundGate({
  startAudio: async () => { starts += 1; },
  playNote: () => { notes += 1; },
  now: () => 1000,
  cooldown: 350,
});

assert.equal(sound.disturb('one', 2), false, 'Movement must stay silent before explicit consent');
assert.equal(notes, 0);
const enabling = sound.enable();
assert.equal(starts, 1, 'Audio resume must be invoked immediately inside the gesture, not after a script-load await');
await enabling;
assert.equal(starts, 1, 'Explicit enablement should unlock audio once');
assert.equal(sound.disturb('one', 0.2), false, 'Minor ambient movement should not make sound');
assert.equal(sound.disturb('one', 2), true, 'A meaningful disturbance should make one note');
assert.equal(sound.disturb('one', 2), false, 'Repeated movement inside the cooldown should be silent');
assert.equal(notes, 1);
sound.disable();
assert.equal(sound.disturb('two', 2), false, 'Disabling sound should immediately silence the installation');
let attempts = 0;
const retrySound = new SoundGate({
  startAudio: async () => { if (++attempts === 1) throw new Error('Context suspended'); },
  playNote: () => {},
});
await assert.rejects(retrySound.enable());
assert.equal(retrySound.enabled, false, 'Failed unlock must not mark sound as enabled');
await retrySound.enable();
assert.equal(retrySound.enabled, true, 'A later gesture must be able to retry audio unlock');

const html = await readFile(path.join(root, 'index.html'), 'utf8');
const heroScript = await readFile(path.join(root, 'hero-interactive.js'), 'utf8');
assert.doesNotMatch(heroScript, /now - item\.lastImpulse < 130/, 'Visual movement should not be discarded by an interaction throttle');
assert.match(html, /class="hero-installation"/, 'Hero should contain the isolated installation mount');
assert.match(html, /hero-interactive\.css/, 'Interactive hero styles should load independently');
assert.match(html, /hero-interactive\.js/, 'Interactive hero behavior should load independently');
assert.match(html, /© 2026 Made with ❤️ by Esraa Salah/, 'Footer should display the requested attribution');

console.log('Verified hero interaction modes, local assets, and explicit sound consent.');
