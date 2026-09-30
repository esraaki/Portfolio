export const HERO_OBJECTS = [
  { id: 'orb-2', asset: 'assets/hero-interactive/object-orb-2.svg', x: 0.41, length: 335, size: 38, note: 'E5' },
  { id: 'orb-4', asset: 'assets/hero-interactive/object-orb-4.svg', x: 0.59, length: 285, size: 40, note: 'B5' },
  { id: 'orb-5', asset: 'assets/hero-interactive/object-orb-5.svg', x: 0.68, length: 235, size: 43, note: 'D6' },
];

export function getInteractionMode({ reducedMotion, coarsePointer, width }) {
  if (reducedMotion) return 'static';
  if (coarsePointer || width < 700) return 'simplified';
  return 'full';
}

export function shouldRunAnimation(mode, visible) {
  return mode !== 'static' && visible;
}

export function configureHeroPhysics(engine, mode) {
  // Paired restoring force and damping: sub-pixel rest within one second at 60Hz.
  engine.gravity.y = 4;
  engine.friction = mode === 'simplified' ? 0.805 : 0.8;
}

export function getOrbLayout(object, index, compact, height) {
  return {
    x: compact ? [0.24, 0.5, 0.76][index] : object.x,
    length: Math.min(object.length + (compact ? 45 : 0), height - 60),
    size: object.size * (compact ? 0.8 : 1),
  };
}

export function createFixedStepRunner(step) {
  const interval = 1000 / 60;
  let previous = null;
  let accumulated = 0;
  return {
    reset() { previous = null; accumulated = 0; },
    advance(time) {
      if (previous === null) { previous = time; return; }
      accumulated += Math.min(100, Math.max(0, time - previous));
      previous = time;
      while (accumulated + 1e-7 >= interval) {
        step();
        accumulated -= interval;
      }
    },
  };
}

export function getTouchImpulse({ mode, bobX, bobY, pointerX, pointerY, size }) {
  if (mode === 'static') return { x: 0, y: 0, strength: 0 };
  return getPointerImpulse({
    bobX, bobY, pointerX, pointerY,
    movementX: pointerX <= bobX ? 10 : -10,
    movementY: 0,
    radius: size / 2 + 18,
  });
}

export function getPointerImpulse({ bobX, bobY, pointerX, pointerY, movementX, movementY, radius }) {
  const dx = bobX - pointerX;
  const dy = bobY - pointerY;
  const distance = Math.hypot(dx, dy);
  if (distance >= radius) return { x: 0, y: 0, strength: 0 };
  const proximity = 1 - distance / radius;
  const pointerSpeed = Math.min(30, Math.hypot(movementX, movementY));
  const separation = proximity * 1.8;
  const clamp = (value, limit) => Math.max(-limit, Math.min(limit, value));
  return {
    x: clamp(movementX * proximity * 0.38 + (distance ? dx / distance : 1) * separation * 0.5, 6.5),
    y: clamp(movementY * proximity * 0.18 + (distance ? dy / distance : 0) * separation * 0.5, 2.5),
    strength: proximity * pointerSpeed * 0.48,
  };
}

export class SoundGate {
  constructor({ startAudio, playNote, now = () => performance.now(), cooldown = 420, threshold = 0.85 }) {
    this.startAudio = startAudio;
    this.playNote = playNote;
    this.now = now;
    this.cooldown = cooldown;
    this.threshold = threshold;
    this.enabled = false;
    this.lastPlayed = new Map();
  }

  async enable() {
    if (!this.enabled) await this.startAudio();
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }

  disturb(id, strength, note) {
    if (!this.enabled || strength < this.threshold) return false;
    const time = this.now();
    if (time - (this.lastPlayed.get(id) ?? -Infinity) < this.cooldown) return false;
    this.lastPlayed.set(id, time);
    this.playNote(note, Math.min(1, strength / 5));
    return true;
  }
}
