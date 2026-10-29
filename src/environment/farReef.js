import { ParticleCreature } from '../ParticleCreature.js';
import { PointBuilder, rand } from '../creatures/pointBuilder.js';
import { FLOOR_Y, FLOOR_Z_MIN } from './terrain.js';

// The far distance: rows of rocky ridges beyond the seabed, fading into the blue.
// Only their tops catch the light from above, so they read as soft outlines.
// Meant for its own layer with long fog, so each row further back is hazier.

const BOTTOM = FLOOR_Y - 2;

// z: how far back, base / amp: ridge height, peaks: [x, height, width] for pinnacles
const RIDGES = [
  { z: -78, base: -4, amp: 4, seed: 1.3, peaks: [[-34, 9, 5], [41, 7, 4]], share: 0.34 },
  { z: -108, base: 1, amp: 6, seed: 4.1, peaks: [[-8, 11, 7], [62, 10, 6]], share: 0.34 },
  { z: -140, base: 6, amp: 8, seed: 7.7, peaks: [[-70, 14, 10], [25, 9, 9]], share: 0.32 },
];

function ridgeHeight({ base, amp, seed, peaks }, x) {
  let h = base + amp * (0.5 * Math.sin(x * 0.045 + seed) + 0.3 * Math.sin(x * 0.11 + seed * 2) + 0.2 * Math.sin(x * 0.31 + seed * 3));
  for (const [px, ph, pw] of peaks) h += ph * Math.exp(-(((x - px) / pw) ** 2));
  return h;
}

export function createFarReef(scale = 1) {
  const b = new PointBuilder();
  const count = Math.floor(30000 * scale);

  for (const ridge of RIDGES) {
    const half = 95 + (-ridge.z - 78) * 0.9; // wider further back, to fill the view
    const n = Math.floor(count * ridge.share);
    for (let i = 0; i < n; i++) {
      const x = rand(-half, half);
      const top = ridgeHeight(ridge, x);
      const z = ridge.z + rand(-6, 6) + 2 * Math.sin(x * 0.07 + ridge.seed);
      if (i < n * 0.06) {
        b.add(x, top + rand(-2.5, 1.2), z, 0.6); // soft lit ridge
      } else {
        const e = 1 - Math.pow(Math.random(), 1.3); // a little denser toward the top
        b.add(x, BOTTOM + (top - BOTTOM) * e + rand(-1, 1), z, 0.2 + 0.45 * e * e);
      }
    }
  }

  // A faint floor joining the near seabed to the ridges
  const floorN = Math.floor(count * 0.2);
  for (let i = 0; i < floorN; i++) {
    const z = rand(-150, FLOOR_Z_MIN + 4);
    const x = rand(-1, 1) * (60 + -z * 0.6);
    b.add(x, FLOOR_Y - 0.6 + 0.8 * Math.sin(x * 0.09) * Math.cos(z * 0.07), z, rand(0.1, 0.4));
  }

  return new ParticleCreature({
    ...b.build(),
    colorA: '#05142a',
    colorB: '#6f9cc4',
    size: 2.2,
    opacity: 0.2,
    radius: 0, // far away, not touchable
  });
}
