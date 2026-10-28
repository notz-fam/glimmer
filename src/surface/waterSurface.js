import * as THREE from 'three';
import { ParticleCreature } from '../ParticleCreature.js';
import { PointBuilder, rand } from '../creatures/pointBuilder.js';
import { WAVE_GLSL } from './waves.js';

export const RIPPLE_SLOTS = 6;

const DEFORM = /* glsl */ `
uniform vec2 uWaterOffset;
uniform vec4 uRipples[${RIPPLE_SLOTS}]; // x, z, start time, strength
${WAVE_GLSL}
vec3 deform(vec3 p) {
  vec2 q = p.xz + uWaterOffset;
  p.y += waveHeight(q, uTime);
  // rings spreading from where the water was touched
  for (int i = 0; i < ${RIPPLE_SLOTS}; i++) {
    vec4 r = uRipples[i];
    float age = uTime - r.z;
    if (age < 0.0 || age > 4.0) continue;
    float d = distance(q, r.xy);
    float front = age * 4.0;
    p.y += sin((d - front) * 2.2) * exp(-age * 1.1) * smoothstep(2.5, 0.0, abs(d - front)) * 0.4 * r.w;
  }
  return p;
}
`;

const COLORIZE = /* glsl */ `
uniform vec4 uLantern; // world position + strength
uniform float uStarPath;
uniform float uGlint;
vec3 colorize(vec3 c, vec3 wp) {
  float glint = pow(max(0.0, sin(wp.x * 1.7 + uTime * 1.3) * sin(wp.z * 1.3 - uTime * 1.1)), 6.0) * uGlint;
  float lamp = uLantern.w * exp(-distance(wp.xz, uLantern.xz) * 0.22);
  // a road of starlight from the boat toward the north star
  float path = uStarPath * exp(-abs(wp.x - uLantern.x) * 0.12) * smoothstep(0.0, -60.0, wp.z - uLantern.z);
  return c + glint * vec3(0.6, 0.8, 1.0) + lamp * vec3(1.0, 0.72, 0.38) * 1.6 + path * vec3(0.55, 0.7, 1.0);
}
`;

/** The night sea surface: a field of points that swells, glints and ripples. */
export function createWater(scale = 1) {
  const b = new PointBuilder();
  const count = Math.floor(45000 * scale);
  for (let i = 0; i < count; i++) {
    // denser near the viewer, wider further away (roughly the camera's view)
    const z = 18 - 118 * Math.pow(Math.random(), 1.4);
    const x = rand(-1, 1) * (16 + (18 - z) * 0.8);
    b.add(x, 0, z, Math.random());
  }
  const { positions, tints } = b.build();

  const water = new ParticleCreature({
    positions,
    tints,
    colorA: '#1b4a75',
    colorB: '#8fc8ff',
    size: 0.09,
    opacity: 0.45,
    radius: 0, // touching makes ripples instead of scattering
    deform: DEFORM,
    colorize: COLORIZE,
    uniforms: {
      uWaveAmp: { value: 0.6 },
      uWaterOffset: { value: new THREE.Vector2() },
      uRipples: { value: Array.from({ length: RIPPLE_SLOTS }, () => new THREE.Vector4(0, 0, -100, 0)) },
      uLantern: { value: new THREE.Vector4(0, 0, 0, 0) },
      uStarPath: { value: 0 },
      uGlint: { value: 0.5 },
    },
  });

  let next = 0;
  /** Start a ring of waves at world (x, z). */
  water.ripple = (x, z, time, strength = 1) => {
    water.material.uniforms.uRipples.value[next].set(x, z, time, strength);
    next = (next + 1) % RIPPLE_SLOTS;
  };
  return water;
}
