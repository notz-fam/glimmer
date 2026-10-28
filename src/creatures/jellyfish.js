import { ParticleCreature } from '../ParticleCreature.js';
import { PointBuilder, rand } from './pointBuilder.js';

const BELL_R = 1.6;
const BELL_H = 1.3;
const RIM_ANGLE = 1.75; // a little past 90 degrees so the rim flares out

function buildShape(count) {
  const b = new PointBuilder();

  // Bell: outer skin + a fainter inner layer
  const nBell = Math.floor(count * 0.5);
  for (let i = 0; i < nBell; i++) {
    const phi = Math.acos(1 - Math.random() * (1 - Math.cos(RIM_ANGLE))); // even over the dome
    const th = Math.random() * Math.PI * 2;
    const layer = Math.random() < 0.75 ? 1 : rand(0.6, 0.9);
    const r = Math.sin(phi) * BELL_R * layer;
    // wavy rim
    const scallop = 1 + 0.06 * Math.sin(th * 16) * (phi / RIM_ANGLE);
    b.add(Math.cos(th) * r * scallop, Math.cos(phi) * BELL_H * layer, Math.sin(th) * r * scallop, phi / RIM_ANGLE * 0.7);
  }

  const rimY = Math.cos(RIM_ANGLE) * BELL_H;
  const rimR = Math.sin(RIM_ANGLE) * BELL_R;

  // Thin tentacles hanging from the rim
  const nTent = Math.floor(count * 0.32);
  const tentacles = 14;
  for (let k = 0; k < tentacles; k++) {
    const th = (k / tentacles) * Math.PI * 2 + rand(-0.1, 0.1);
    const len = rand(5, 8);
    for (let i = 0; i < nTent / tentacles; i++) {
      const s = Math.random();
      const r = rimR * (0.95 - 0.15 * s);
      b.add(Math.cos(th) * r + rand(-0.03, 0.03), rimY - s * len, Math.sin(th) * r + rand(-0.03, 0.03), 1);
    }
  }

  // Frilly oral arms in the center
  const nArms = count - b.tint.length;
  const arms = 4;
  for (let i = 0; i < nArms; i++) {
    const k = i % arms;
    const s = Math.random();
    const th = (k / arms) * Math.PI * 2 + s * 2.5;
    const frill = 0.35 * (1 - s * 0.6) * Math.abs(Math.sin(s * 30 + k));
    const r = 0.2 + frill * Math.random();
    b.add(Math.cos(th) * r, 0.2 - s * 4, Math.sin(th) * r, 0.85);
  }

  return b.build();
}

// Bell pulses, tentacles trail and sway
const DEFORM = /* glsl */ `
vec3 deform(vec3 p) {
  float pulse = sin(uTime * 1.8 + uPhase);
  if (p.y > -0.4) {
    float h = clamp(1.0 - (p.y + 0.4) / 1.8, 0.0, 1.0);
    p.xz *= 1.0 - 0.18 * pulse * h;
    p.y *= 1.0 + 0.1 * pulse;
  } else {
    float depth = -p.y;
    p.xz *= mix(1.0 - 0.18 * pulse, 1.0, clamp(depth / 4.0, 0.0, 1.0));
    p.x += sin(uTime * 1.2 + uPhase + p.y * 0.7) * depth * 0.07;
    p.z += cos(uTime * 1.0 + uPhase + p.y * 0.6) * depth * 0.07;
    p.y += pulse * 0.15 * clamp(depth / 3.0, 0.0, 1.0);
  }
  return p;
}
`;

const PALETTES = [
  ['#ff7ad9', '#7af0ff'],
  ['#9d8bff', '#ffb3f0'],
  ['#5ff2d0', '#c08bff'],
];

export function createJellyfish({ position, index = 0, scale = 1 }) {
  const { positions, tints } = buildShape(Math.floor(6000 * scale));
  const [colorA, colorB] = PALETTES[index % PALETTES.length];
  const phase = index * 2.1;
  const creature = new ParticleCreature({
    positions,
    tints,
    colorA,
    colorB,
    size: 0.11,
    opacity: 0.7,
    radius: 2.0,
    phase,
    deform: DEFORM,
  });

  const start = position.clone();
  creature.tick = (time) => {
    const o = creature.object;
    o.position.set(
      start.x + Math.sin(time * 0.07 + phase) * 3,
      start.y + Math.sin(time * 0.25 + phase) * 1.5,
      start.z + Math.cos(time * 0.05 + phase) * 2,
    );
    o.rotation.set(Math.sin(time * 0.3 + phase) * 0.15, time * 0.1, Math.cos(time * 0.27 + phase) * 0.15);
  };
  return creature;
}
