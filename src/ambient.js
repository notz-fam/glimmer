import { ParticleCreature } from './ParticleCreature.js';
import { rand } from './creatures/pointBuilder.js';

// "Marine snow": slow specks drifting upward through the whole scene
const DEFORM = /* glsl */ `
vec3 deform(vec3 p) {
  p.y = mod(p.y + uTime * 0.25 * (0.3 + aRandom) + 20.0, 40.0) - 20.0;
  p.x += sin(uTime * 0.2 + aRandom * 10.0) * 0.6;
  p.z += cos(uTime * 0.15 + aRandom * 7.0) * 0.6;
  return p;
}
`;

export function createMarineSnow(scale = 1) {
  const count = Math.floor(3000 * scale);
  const positions = new Float32Array(count * 3);
  const tints = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = rand(-45, 45);
    positions[i * 3 + 1] = rand(-20, 20);
    positions[i * 3 + 2] = rand(-45, 22);
    tints[i] = Math.random();
  }
  return new ParticleCreature({
    positions,
    tints,
    colorA: '#5d8fb5',
    colorB: '#ffffff',
    size: 0.08,
    opacity: 0.35,
    radius: 0, // background only, not touchable
    deform: DEFORM,
  });
}
