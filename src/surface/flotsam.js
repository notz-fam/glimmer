import { ParticleCreature } from '../ParticleCreature.js';
import { PointBuilder, rand } from '../creatures/pointBuilder.js';

// Things drifting on the water. Each is small, so it uses a fine point size.
const common = { size: 0.07, opacity: 0.9, radius: 0.6 };

/** A loop of rope whose end has come undone. */
export function createRopeCoil() {
  const b = new PointBuilder();
  for (let i = 0; i < 900; i++) {
    const a = Math.random() * Math.PI * 1.7; // not a closed loop
    const tube = Math.random() * Math.PI * 2;
    const R = 0.55 + 0.04 * Math.sin(a * 12); // twisted strands
    const r = 0.07;
    b.add(Math.cos(a) * (R + Math.cos(tube) * r), Math.sin(tube) * r, Math.sin(a) * (R + Math.cos(tube) * r), 0.3);
  }
  // loose end, unravelling into separate strands
  for (let i = 0; i < 300; i++) {
    const s = Math.random();
    const strand = Math.floor(Math.random() * 3) - 1;
    const a = Math.PI * 1.7 + s * 0.8;
    const R = 0.55 + s * 0.6;
    b.add(Math.cos(a) * R + strand * s * 0.18, rand(-0.02, 0.02), Math.sin(a) * R + strand * s * 0.1, 0.6);
  }
  return new ParticleCreature({ ...b.build(), colorA: '#c9a47a', colorB: '#f1dcbc', ...common });
}

/** A glass bottle with a rolled letter glowing inside. */
export function createBottle() {
  const b = new PointBuilder();
  for (let i = 0; i < 900; i++) {
    const x = rand(-0.45, 0.5);
    const r = x > 0.25 ? 0.07 + (0.5 - x) * 0.1 : 0.17; // neck
    const a = Math.random() * Math.PI * 2;
    b.add(x, Math.sin(a) * r, Math.cos(a) * r, 0.2);
  }
  for (let i = 0; i < 260; i++) {
    const a = Math.random() * Math.PI * 2;
    b.add(rand(-0.3, 0.15), Math.sin(a) * 0.07, Math.cos(a) * 0.07, 1); // the letter
  }
  return new ParticleCreature({ ...b.build(), colorA: '#7fe0d0', colorB: '#fff1c4', ...common });
}

/** A single white feather. */
export function createFeather() {
  const b = new PointBuilder();
  for (let i = 0; i < 160; i++) b.add(rand(-0.75, 0.75), 0, 0, 1); // shaft
  for (let i = 0; i < 1000; i++) {
    const s = rand(-0.6, 0.75);
    const side = Math.random() < 0.5 ? -1 : 1;
    const w = 0.2 * Math.sqrt(Math.max(0, 1 - Math.pow((s - 0.05) / 0.72, 2)));
    const v = Math.random() * w;
    b.add(s - v * 0.4, Math.sin(v * 6) * 0.02, side * v, 0.6); // barbs angled back
  }
  return new ParticleCreature({ ...b.build(), colorA: '#cfe6ff', colorB: '#ffffff', ...common });
}

/** A small folded paper boat. */
export function createPaperBoat() {
  const b = new PointBuilder();
  const n = 1100;
  for (let i = 0; i < n; i++) {
    const r = Math.random();
    if (r < 0.45) {
      // hull: two slanted sides meeting at a flat bottom
      const x = rand(-0.45, 0.45);
      const w = 0.16 * (1 - Math.abs(x) / 0.55);
      const side = Math.random() < 0.5 ? -1 : 1;
      const h = Math.random() * 0.14;
      b.add(x * (1 - h * 1.5), h, side * w * (1 - h * 3), 0.2);
    } else {
      // sail: a triangle rising from the middle
      const u = Math.random();
      const v = Math.random() * (1 - u);
      b.add((u - 0.5) * 0.5 + v * 0.25, 0.12 + v * 0.38, rand(-0.01, 0.01), 0.7);
    }
  }
  return new ParticleCreature({ ...b.build(), colorA: '#dfe8f5', colorB: '#ffffff', ...common });
}
