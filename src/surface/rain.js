import { ParticleCreature } from '../ParticleCreature.js';
import { rand } from '../creatures/pointBuilder.js';

const HEIGHT = 24;

// Each drop is a short stack of points falling together, so it reads as a streak
const FALL = /* glsl */ `
vec3 deform(vec3 p) {
  p.y = mod(p.y - uTime * 16.0, ${HEIGHT.toFixed(1)}) - 1.0;
  return p;
}
`;

/** Rain around the boat. Its strength is its uOpacity. */
export function createRain(scale = 1) {
  const drops = Math.floor(1800 * scale + 400);
  const per = 5;
  const positions = new Float32Array(drops * per * 3);
  for (let d = 0; d < drops; d++) {
    const x = rand(-26, 26);
    const z = rand(-40, 18);
    const y = rand(0, HEIGHT);
    for (let k = 0; k < per; k++) {
      const i = (d * per + k) * 3;
      positions[i] = x;
      positions[i + 1] = y + k * 0.12;
      positions[i + 2] = z;
    }
  }
  return new ParticleCreature({
    positions,
    colorA: '#b8dcff',
    size: 0.07,
    opacity: 0,
    radius: 0,
    deform: FALL,
  });
}
