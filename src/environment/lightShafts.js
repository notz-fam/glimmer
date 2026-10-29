import { ParticleCreature } from '../ParticleCreature.js';
import { PointBuilder, rand } from '../creatures/pointBuilder.js';
import { FLOOR_Y } from './terrain.js';

// Bands of light slanting down from the surface. Bright near the top, fading
// before they reach the floor; each one slowly sways and breathes on its own.

const TOP = 26; // above the top of the view
const SLANT_X = 0.32; // drift per unit of depth (light comes from the upper left)
const SLANT_Z = 0.1;
const FADE = TOP - (FLOOR_Y + 3); // fully faded a little above the floor

const DEFORM = /* glsl */ `
attribute float aShaft;
vec3 deform(vec3 p) {
  float down = ${TOP.toFixed(1)} - p.y;
  p.x += sin(uTime * 0.13 + aShaft * 5.0) * down * 0.035;
  p.z += cos(uTime * 0.11 + aShaft * 3.0) * down * 0.02;
  return p;
}
`;

// Brightness swells per band, and soft ripples run down along it (the moving surface)
const COLORIZE = /* glsl */ `
vec3 colorize(vec3 c, vec3 wp) {
  float breathe = 0.5 + 0.5 * sin(uTime * 0.3 + aShaft * 11.0);
  float ripple = 0.75 + 0.25 * sin(wp.y * 0.45 + uTime * 1.1 + aShaft * 20.0);
  return c * (0.35 + 0.9 * breathe) * ripple;
}
`;

export function createLightShafts(scale = 1) {
  const b = new PointBuilder();
  const shaftIds = [];
  const shafts = 11;
  const per = Math.floor(1900 * scale);

  for (let k = 0; k < shafts; k++) {
    // spread across the view, never right in front of the camera
    const x0 = -40 + (80 * (k + rand(0.1, 0.9))) / shafts - 6;
    const z0 = rand(-44, 0);
    const width = rand(1.2, 4);
    const id = Math.random();
    for (let i = 0; i < per; i++) {
      const down = FADE * Math.pow(Math.random(), 1.3); // denser toward the top
      // soft edges: wide bell-shaped spread around the center line
      const gx = (Math.random() + Math.random() + Math.random() - 1.5) * width * 1.3;
      const gz = (Math.random() + Math.random() + Math.random() - 1.5) * width;
      const core = Math.exp(-(gx * gx) / (width * width) * 2);
      const fade = Math.pow(1 - down / FADE, 1.4);
      b.add(x0 + down * SLANT_X + gx, TOP - down, z0 + down * SLANT_Z + gz, fade * (0.4 + 0.6 * core));
      shaftIds.push(id);
    }
  }

  return new ParticleCreature({
    ...b.build(),
    colorA: '#000000', // tint 0 = no light (additive blending)
    colorB: '#9fd8f0',
    size: 2.2,
    opacity: 0.045,
    radius: 0, // light, not touchable
    deform: DEFORM,
    colorize: COLORIZE,
    attributes: { aShaft: [new Float32Array(shaftIds), 1] },
  });
}
