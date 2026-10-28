import { ParticleCreature } from '../ParticleCreature.js';
import { rand } from '../creatures/pointBuilder.js';
import { ROCKS, rockTop } from './seabed.js';

const HEIGHT = 26;

// Bubbles rise and wobble, then wrap back to the vent (local y = 0)
const RISE = /* glsl */ `
vec3 deform(vec3 p) {
  float y = mod(p.y + uTime * (1.2 + aRandom * 1.2), ${HEIGHT.toFixed(1)});
  float spread = 0.3 + y * 0.05;
  p.x += sin(uTime * 3.0 + aRandom * 50.0 + y * 0.8) * 0.15 * spread;
  p.z += cos(uTime * 2.5 + aRandom * 40.0 + y * 0.7) * 0.15 * spread;
  p.y = y;
  return p;
}
`;

// A stream of bubbles from the top of a few rocks
export function createBubbles(scale = 1) {
  const vents = [ROCKS[0], ROCKS[2], ROCKS[4]];
  return vents.map((rock) => {
    const count = Math.floor(260 * scale);
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = rand(-0.3, 0.3);
      positions[i * 3 + 1] = rand(0, HEIGHT);
      positions[i * 3 + 2] = rand(-0.3, 0.3);
    }
    const bubbles = new ParticleCreature({
      positions,
      colorA: '#bff4ff',
      size: 0.16,
      opacity: 0.45,
      radius: 0, // moves in the shader, so not touchable
      deform: RISE,
    });
    bubbles.object.position.set(rock[0], rockTop(rock), rock[1]);
    return bubbles;
  });
}
