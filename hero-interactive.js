import { HERO_OBJECTS, SoundGate, getInteractionMode, getPointerImpulse, getTouchImpulse, getOrbLayout, createFixedStepRunner, shouldRunAnimation, configureHeroPhysics } from './hero-interactive-core.mjs';

const ENABLE_INTERACTIVE_HERO = true;
const root = document.querySelector('.hero-installation');

if (root && ENABLE_INTERACTIVE_HERO) {
  root.removeAttribute('aria-hidden');
  const canvas = root.querySelector('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const hero = root.closest('.hero');
  const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const coarseQuery = matchMedia('(pointer: coarse)');
  let mode = getInteractionMode({ reducedMotion: reducedQuery.matches, coarsePointer: coarseQuery.matches, width: innerWidth });
  let engine;
  let items = [];
  let frameId;
  let visible = true;
  let resizeTimer;
  let synth;
  let audioPromise;
  let audioArmed = false;
  const pointer = { x: -1000, y: -1000, lastX: -1000, lastY: -1000, movementX: 0, movementY: 0 };
  const physicsClock = createFixedStepRunner(stepPhysics);

  const ensureTone = () => {
    if (audioPromise) return audioPromise;
    audioPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'vendor/Tone.js';
      script.onload = resolve;
      script.onerror = () => { script.remove(); audioPromise = null; reject(new Error('Audio library unavailable')); };
      document.head.appendChild(script);
    });
    return audioPromise;
  };

  const sound = new SoundGate({
    startAudio: () => {
      // Resume synchronously in the trusted gesture, including Safari touchend/click.
      const starting = Tone.start();
      return starting.then(() => {
        if (Tone.getContext().state !== 'running') throw new Error('Audio context is still suspended');
        synth ??= new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'sine' },
          envelope: { attack: 0.008, decay: 0.5, sustain: 0, release: 1.1 },
          volume: -22,
        }).toDestination();
      });
    },
    playNote: note => synth?.triggerAttackRelease(note, '16n'),
  });

  function sizeCanvas() {
    const rect = root.getBoundingClientRect();
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    return { width: rect.width, height: rect.height, ratio };
  }

  function build() {
    cancelAnimationFrame(frameId);
    physicsClock.reset();
    mode = getInteractionMode({ reducedMotion: reducedQuery.matches, coarsePointer: coarseQuery.matches, width: innerWidth });
    root.dataset.mode = mode;
    root.querySelectorAll('.hero-object').forEach(node => node.remove());
    const { width, height } = sizeCanvas();
    engine = new VerletJS(width, height, canvas);
    configureHeroPhysics(engine, mode);
    engine.bounds = particle => {
      particle.pos.x = Math.max(4, Math.min(width - 4, particle.pos.x));
      particle.pos.y = Math.max(4, Math.min(height - 4, particle.pos.y));
    };
    const compact = coarseQuery.matches || innerWidth < 700;
    items = HERO_OBJECTS.map((config, index) => {
      const layout = getOrbLayout(config, index, compact, height);
      const anchorX = width * layout.x;
      const composite = engine.lineSegments([
        new Vec2(anchorX, 4),
        new Vec2(anchorX, 4 + layout.length),
      ], mode === 'simplified' ? 0.97 : 0.95);
      composite.pin(0, new Vec2(anchorX, 4));
      const image = document.createElement('img');
      image.className = 'hero-object';
      image.src = config.asset;
      image.alt = '';
      image.draggable = false;
      image.style.setProperty('--object-size', `${layout.size}px`);
      root.appendChild(image);
      return { config, layout, anchor: composite.particles[0], bob: composite.particles[1], image };
    });
    // Start at the solver's resting position, not with a visible gravity drop.
    if (mode !== 'static') for (let i = 0; i < 120; i += 1) engine.frame(6);
    if (mode === 'static') { sound.disable(); audioArmed = false; }
    else ensureTone().catch(() => {});
    render();
    if (shouldRunAnimation(mode, visible)) frameId = requestAnimationFrame(tick);
  }

  function disturbWithPointer(item) {
    const bob = item.bob;
    const impulse = getPointerImpulse({
      bobX: bob.pos.x,
      bobY: bob.pos.y,
      pointerX: pointer.x,
      pointerY: pointer.y,
      movementX: pointer.movementX,
      movementY: pointer.movementY,
      radius: item.config.size * 0.8 + 52,
    });
    applyImpulse(item, impulse);
  }

  function applyImpulse(item, impulse) {
    if (!impulse.strength || mode === 'static') return;
    item.bob.pos.x += impulse.x;
    item.bob.pos.y += impulse.y;
    sound.disturb(item.config.id, impulse.strength, item.config.note);
  }

  function render() {
    const context = canvas.getContext('2d');
    const ratio = canvas.width / Math.max(1, root.getBoundingClientRect().width);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);
    context.strokeStyle = 'rgba(90, 90, 86, 0.42)';
    context.lineWidth = 0.55;
    items.forEach(item => {
      const { anchor, bob, image } = item;
      context.beginPath();
      context.moveTo(anchor.pos.x, anchor.pos.y);
      context.lineTo(bob.pos.x, bob.pos.y);
      context.stroke();
      context.beginPath();
      context.arc(anchor.pos.x, 3, 1.5, 0, Math.PI * 2);
      context.fillStyle = '#767670';
      context.fill();
      const angle = Math.atan2(bob.pos.y - anchor.pos.y, bob.pos.x - anchor.pos.x) - Math.PI / 2;
      image.style.left = `${bob.pos.x}px`;
      image.style.top = `${bob.pos.y}px`;
      image.style.setProperty('--object-angle', `${angle}rad`);
    });
  }

  function stepPhysics() {
    items.forEach(disturbWithPointer);
    pointer.movementX = 0;
    pointer.movementY = 0;
    engine.frame(6);
  }

  function tick(time) {
    if (!shouldRunAnimation(mode, visible)) return;
    physicsClock.advance(time);
    render();
    frameId = requestAnimationFrame(tick);
  }

  hero.addEventListener('pointermove', event => {
    if (mode === 'static') return;
    if (event.pointerType === 'touch' && !event.buttons) return;
    const rect = root.getBoundingClientRect();
    pointer.lastX = pointer.x;
    pointer.lastY = pointer.y;
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    pointer.movementX = pointer.lastX < -900 ? 0 : pointer.x - pointer.lastX;
    pointer.movementY = pointer.lastY < -900 ? 0 : pointer.y - pointer.lastY;
  }, { passive: true });
  const clearPointer = () => {
    pointer.x = pointer.y = -1000;
    pointer.movementX = pointer.movementY = 0;
  };
  hero.addEventListener('pointerleave', clearPointer);
  hero.addEventListener('pointercancel', clearPointer);
  hero.addEventListener('pointerup', event => { if (event.pointerType === 'touch') clearPointer(); });
  hero.addEventListener('pointerdown', event => {
    if (mode === 'static' || event.pointerType !== 'touch') return;
    const rect = root.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    pointer.x = x;
    pointer.y = y;
    items.forEach(item => applyImpulse(item, getTouchImpulse({
      mode, bobX: item.bob.pos.x, bobY: item.bob.pos.y,
      pointerX: x, pointerY: y, size: item.layout.size,
    })));
  }, { passive: true });

    const armSound = async event => {
      if (audioArmed || mode === 'static') return;
      if (event.type === 'pointerdown' && event.pointerType === 'touch') return;
      if (!window.Tone) { ensureTone().catch(() => {}); return; }
      audioArmed = true;
      try {
        await sound.enable();
        if (mode === 'static') { sound.disable(); audioArmed = false; }
      } catch {
        audioArmed = false;
      }
    };
    addEventListener('pointerdown', armSound, { passive: true });
    addEventListener('pointerup', armSound, { passive: true });
    addEventListener('click', armSound, { passive: true });
    addEventListener('keydown', armSound);

  const rebuild = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(build, 120); };
  addEventListener('resize', rebuild, { passive: true });
  reducedQuery.addEventListener?.('change', build);
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    cancelAnimationFrame(frameId);
    physicsClock.reset();
    if (shouldRunAnimation(mode, visible)) frameId = requestAnimationFrame(tick);
  }, { rootMargin: '80px 0px' });
  visibilityObserver.observe(root);
  build();
} else if (root) {
  root.hidden = true;
}
