import { ParticleCreature } from '../ParticleCreature.js';
import { PointBuilder, rand, clamp } from './pointBuilder.js';

const LENGTH = 12;
const HALF = LENGTH / 2;

// Body radius along the body, t = 0 at the tail stock, 1 at the head
const bodyRadius = (t) => 2.0 * Math.pow(Math.sin(Math.PI * Math.pow(t, 1.35)), 0.6) + 0.12;

function buildShape(count) {
  const b = new PointBuilder();

  // Body: mostly surface points, some inside for volume
  const nBody = Math.floor(count * 0.7);
  for (let i = 0; i < nBody; ) {
    const t = Math.random();
    const r = bodyRadius(t);
    if (Math.random() * 2.15 > r) continue; // more points where the body is thick
    i++;
    const a = Math.random() * Math.PI * 2;
    const rr = Math.random() < 0.85 ? r * rand(0.93, 1.0) : r * Math.sqrt(Math.random());
    let y = Math.sin(a) * rr;
    if (y < 0) y *= 0.82; // flatter belly
    const z = Math.cos(a) * rr;
    b.add(-HALF + t * LENGTH, y, z, clamp(-Math.sin(a) * 1.6, 0, 1));
  }

  // Long pectoral fins (humpback style)
  const nFin = Math.floor(count * 0.1);
  for (let side = -1; side <= 1; side += 2) {
    const root = { x: 1.6, y: -0.9, z: side * 1.5 };
    const dir = norm(-0.45, -0.55, side * 0.75);
    for (let i = 0; i < nFin / 2; i++) {
      const u = Math.random();
      const w = 0.9 * Math.sqrt(1 - u) * Math.min(1, u * 4 + 0.35);
      const v = rand(-0.5, 0.5) * w;
      const len = u * 4.2;
      b.add(
        root.x + dir.x * len + v,
        root.y + dir.y * len + rand(-0.05, 0.05),
        root.z + dir.z * len,
        0.6,
      );
    }
  }

  // Small dorsal fin
  const nDorsal = Math.floor(count * 0.02);
  for (let i = 0; i < nDorsal; i++) {
    const u = Math.random();
    const h = 0.7 * (1 - u);
    b.add(-2.2 + u * 1.4 - h * 0.5, 1.5 + Math.random() * h, rand(-0.06, 0.06), 0);
  }

  // Tail flukes, spread horizontally
  const nFluke = count - b.tint.length;
  for (let i = 0; i < nFluke; i++) {
    const s = rand(-1, 1);
    const as = Math.abs(s);
    const lead = -HALF - 0.1 - 1.2 * Math.pow(as, 1.2);
    const chord = 0.25 + 1.0 * Math.pow(1 - as, 0.6) - 0.35 * Math.exp(-as * 12); // notch in the middle
    const x = lead - Math.random() * chord;
    b.add(x, rand(-0.06, 0.06) * (1 - as), s * 3.3, 0.3);
  }

  return b.build();
}

function norm(x, y, z) {
  const l = Math.hypot(x, y, z);
  return { x: x / l, y: y / l, z: z / l };
}

// Up-and-down tail beat, stronger toward the tail
const DEFORM = /* glsl */ `
vec3 deform(vec3 p) {
  float k = clamp((1.5 - p.x) / 8.0, 0.0, 1.0);
  p.y += k * k * 1.6 * sin(uTime * 1.4 - p.x * 0.45);
  // pectoral fins slowly flap
  float fin = step(1.2, abs(p.z)) * step(p.y, -0.8) * step(-4.0, p.x);
  p.y += fin * sin(uTime * 0.9) * 0.25 * (abs(p.z) - 1.2);
  return p;
}
`;

export function createWhale(scale = 1) {
  const { positions, tints } = buildShape(Math.floor(30000 * scale));
  const creature = new ParticleCreature({
    positions,
    tints,
    colorA: '#3a8fe0',
    colorB: '#c4ecff',
    size: 0.13,
    opacity: 0.55,
    radius: 2.8,
    deform: DEFORM,
  });

  // Slow, wide loop through the scene
  creature.tick = (time) => {
    const a = time * 0.07 + Math.PI * 0.6; // start side-on, crossing the middle
    const o = creature.object;
    o.position.set(Math.cos(a) * 15, 2 + Math.sin(a * 2) * 1.5, Math.sin(a) * 6 - 5);
    const vx = -Math.sin(a) * 15;
    const vz = Math.cos(a) * 6;
    o.rotation.set(0, Math.atan2(-vz, vx), Math.cos(a * 2) * 0.08, 'YXZ');
  };
  return creature;
}
