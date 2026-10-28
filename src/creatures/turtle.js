import { ParticleCreature } from '../ParticleCreature.js';
import { PointBuilder, rand } from './pointBuilder.js';

// A sea turtle (+x = forward): domed shell with plate lines, head, four flippers.
function buildShape(count) {
  const b = new PointBuilder();

  // Shell: a flattened dome, with darker seams between the plates
  for (let i = 0; i < count * 0.55; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random());
    const x = Math.cos(a) * r * 1.2;
    const z = Math.sin(a) * r * 0.95;
    const top = Math.random() < 0.75;
    const y = top ? 0.45 * Math.sqrt(Math.max(0, 1 - r * r)) : -0.08;
    const seam = Math.abs(Math.sin(x * 4.5) * Math.sin(z * 4.5)) < 0.08 ? 0 : 0.5;
    b.add(x, y, z, top ? seam : 0.9);
  }
  // Head and neck
  for (let i = 0; i < count * 0.08; i++) {
    const u = rand(-1, 1);
    const th = Math.random() * Math.PI * 2;
    const r = Math.sqrt(1 - u * u);
    b.add(1.45 + Math.cos(th) * r * 0.25, 0.05 + u * 0.16, Math.sin(th) * r * 0.18, 0.8);
  }
  // Flippers: long front pair, short back pair
  const flippers = [
    [0.55, 1, 1.3, 0.35],
    [0.55, -1, 1.3, 0.35],
    [-0.85, 1, 0.55, 0.22],
    [-0.85, -1, 0.55, 0.22],
  ];
  const per = Math.floor((count * 0.37) / 4);
  for (const [x0, side, len, chord] of flippers) {
    for (let i = 0; i < per; i++) {
      const s = Math.random();
      const w = chord * (1 - s * 0.7);
      b.add(x0 - s * len * 0.35 - Math.random() * w, rand(-0.02, 0.02), side * (0.85 + s * len), 0.7);
    }
  }
  return b.build();
}

// Front flippers sweep like wings; back flippers paddle
const DEFORM = /* glsl */ `
vec3 deform(vec3 p) {
  float az = abs(p.z);
  float reach = max(0.0, az - 0.85);
  float front = step(0.0, p.x);
  p.y += sin(uTime * 1.6) * reach * mix(0.3, 0.7, front);
  p.x += cos(uTime * 1.6) * reach * 0.15 * front;
  return p;
}
`;

export function createTurtle(scale = 1) {
  const { positions, tints } = buildShape(Math.floor(7000 * scale));
  const creature = new ParticleCreature({
    positions,
    tints,
    colorA: '#2f7d62',
    colorB: '#c8f0c0',
    size: 0.09,
    opacity: 0.75,
    radius: 1.6,
    deform: DEFORM,
  });

  // Slow circles close beneath the surface, near the boat
  creature.tick = (time) => {
    const a = time * 0.12;
    const o = creature.object;
    o.position.set(2 + Math.cos(a) * 5, 12.5 + Math.sin(time * 0.4) * 0.4, -1 + Math.sin(a) * 4);
    const vx = -Math.sin(a) * 5;
    const vz = Math.cos(a) * 4;
    o.rotation.set(0, Math.atan2(-vz, vx), Math.sin(time * 0.4) * 0.08, 'YXZ');
  };
  return creature;
}
