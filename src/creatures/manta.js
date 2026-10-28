import { ParticleCreature } from '../ParticleCreature.js';
import { PointBuilder, rand } from './pointBuilder.js';

const SPAN = 5; // half wingspan

// Wing outline for u = |z| / SPAN (0 = center line, 1 = wing tip)
const leadingEdge = (u) => 2.2 - 3.0 * Math.pow(u, 1.6);
const trailingEdge = (u) => -2.2 + 1.2 * u;

function buildShape(count) {
  const b = new PointBuilder();

  // Flat diamond body; top points dark, belly points pale
  const nBody = Math.floor(count * 0.84);
  for (let i = 0; i < nBody; ) {
    const z = rand(-SPAN, SPAN);
    const u = Math.abs(z) / SPAN;
    const x = rand(-2.2, 2.2);
    if (x > leadingEdge(u) || x < trailingEdge(u)) continue;
    i++;
    const thick = 0.45 * Math.pow(1 - u, 1.5) * (1 - Math.pow(x / 2.4, 2));
    const top = Math.random() < 0.55;
    const y = (top ? 1 : -1) * thick * rand(0.85, 1);
    b.add(x, y, z, top ? 0 : 1);
  }

  // Cephalic fins (the two "horns" at the front)
  const nHorn = Math.floor(count * 0.08);
  for (let i = 0; i < nHorn; i++) {
    const side = i % 2 ? 1 : -1;
    const s = Math.random();
    b.add(2.0 + s * 0.9, -0.1 - s * 0.25 + rand(-0.05, 0.05), side * (0.75 + rand(-0.12, 0.12) - s * 0.1), 0.5);
  }

  // Long thin tail
  const nTail = count - b.tint.length;
  for (let i = 0; i < nTail; i++) {
    const s = Math.random();
    b.add(-2.0 - s * 5, rand(-0.03, 0.03), rand(-0.03, 0.03), 0.3);
  }

  return b.build();
}

// Wings flap like slow flying, tail whips
const DEFORM = /* glsl */ `
vec3 deform(vec3 p) {
  float az = abs(p.z);
  p.y += sin(uTime * 1.5 - az * 0.35) * 0.07 * az * az;
  if (p.x < -2.2) {
    p.z += sin(uTime * 2.0 + p.x * 0.8) * -(p.x + 2.2) * 0.12;
  }
  return p;
}
`;

export function createManta(scale = 1) {
  const { positions, tints } = buildShape(Math.floor(14000 * scale));
  const creature = new ParticleCreature({
    positions,
    tints,
    colorA: '#3fa6c8',
    colorB: '#e6f6ff',
    size: 0.11,
    opacity: 0.6,
    radius: 2.2,
    deform: DEFORM,
  });

  // Glides on a loop above the whale, the other way round
  creature.tick = (time) => {
    const a = -time * 0.09 + 1.5;
    const o = creature.object;
    o.position.set(Math.cos(a) * 16, 5 + Math.sin(a * 3) * 1.2, Math.sin(a) * 7 - 6);
    const vx = Math.sin(a) * 16;
    const vz = -Math.cos(a) * 7;
    o.rotation.set(Math.sin(a) * 0.25, Math.atan2(-vz, vx), Math.cos(a * 3) * 0.15, 'YXZ');
  };
  return creature;
}
