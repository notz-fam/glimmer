import { ParticleCreature } from '../ParticleCreature.js';
import { PointBuilder, rand } from './pointBuilder.js';

const HALF_LEN = 2.6; // disc half length (x)
const HALF_WIDTH = 2.8; // disc half width (z)

// Rounded disc: pointier snout in front, rounder at the back. Returns 0 at center, 1 at the edge.
function discShape(x, z) {
  const n = x > 0 ? 1.45 : 1.9;
  return Math.pow(Math.abs((x - 0.2) / HALF_LEN), n) + Math.pow(Math.abs(z / HALF_WIDTH), n);
}

function buildShape(count) {
  const b = new PointBuilder();

  // Disc body, top darker and belly pale
  const nDisc = Math.floor(count * 0.8);
  for (let i = 0; i < nDisc; ) {
    const x = rand(-HALF_LEN + 0.2, HALF_LEN + 0.2);
    const z = rand(-HALF_WIDTH, HALF_WIDTH);
    const e = discShape(x, z);
    if (e > 1) continue;
    i++;
    const thick = 0.38 * Math.pow(1 - e, 0.7);
    const top = Math.random() < 0.6;
    b.add(x, (top ? 1 : -0.6) * thick * rand(0.85, 1), z, top ? 0 : 1);
  }

  // Eyes: two small bumps on top
  const nEyes = Math.floor(count * 0.02);
  for (let i = 0; i < nEyes; i++) {
    const side = i % 2 ? 1 : -1;
    const a = Math.random() * Math.PI * 2;
    const r = 0.13 * Math.sqrt(Math.random());
    b.add(1.0 + Math.cos(a) * r, 0.42 + rand(0, 0.06), side * 0.5 + Math.sin(a) * r, 0.5);
  }

  // Small pelvic fins at the back
  const nPelvic = Math.floor(count * 0.05);
  for (let i = 0; i < nPelvic; i++) {
    const side = i % 2 ? 1 : -1;
    const s = Math.random();
    b.add(-2.1 - s * 0.7, rand(-0.05, 0.05), side * (0.25 + Math.random() * 0.55 * (1 - s)), 0.2);
  }

  // Long whip tail with a spine
  const nTail = count - b.tint.length;
  for (let i = 0; i < nTail; i++) {
    const s = Math.random();
    const x = -2.3 - s * 7.2;
    const r = 0.13 * (1 - s) + 0.02;
    let y = rand(-r, r);
    if (s > 0.2 && s < 0.28) y += (0.28 - s) * 3; // spine pointing up and back
    b.add(x, y, rand(-r, r), 0.15);
  }

  return b.build();
}

// A wave ripples along the edges from front to back, tail trails behind
const DEFORM = /* glsl */ `
vec3 deform(vec3 p) {
  float az = abs(p.z);
  float edge = smoothstep(0.8, 2.8, az);
  p.y += sin(uTime * 3.2 - p.x * 1.6 + az * 0.3) * 0.32 * edge;
  if (p.x < -2.4) {
    float k = -(p.x + 2.4);
    p.z += sin(uTime * 1.6 + p.x * 0.6) * k * 0.08;
    p.y += sin(uTime * 1.1 + p.x * 0.4) * k * 0.03;
  }
  return p;
}
`;

export function createStingray(scale = 1) {
  const { positions, tints } = buildShape(Math.floor(12000 * scale));
  const creature = new ParticleCreature({
    positions,
    tints,
    colorA: '#b08a68',
    colorB: '#f2e8da',
    size: 0.11,
    opacity: 0.6,
    radius: 2.2,
    deform: DEFORM,
  });

  // Glides low over the seabed
  creature.tick = (time) => {
    const a = time * 0.06 + 2.5;
    const o = creature.object;
    o.position.set(Math.cos(a) * 18, -10 + Math.sin(a * 2) * 0.6, Math.sin(a) * 6 - 6);
    const vx = -Math.sin(a) * 18;
    const vz = Math.cos(a) * 6;
    o.rotation.set(Math.sin(a) * 0.12, Math.atan2(-vz, vx), Math.cos(a * 2) * 0.06, 'YXZ');
  };
  return creature;
}
