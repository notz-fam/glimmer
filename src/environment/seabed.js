import { ParticleCreature } from '../ParticleCreature.js';
import { PointBuilder, rand, clamp } from '../creatures/pointBuilder.js';
import { floorY, CAUSTICS, FLOOR_X, FLOOR_Z_MIN, FLOOR_Z_MAX } from './terrain.js';

// Sandy floor covered in caustic light
export function createSand(scale = 1) {
  const b = new PointBuilder();
  const count = Math.floor(40000 * scale);
  for (let i = 0; i < count; i++) {
    const x = rand(-FLOOR_X, FLOOR_X);
    const z = rand(FLOOR_Z_MIN, FLOOR_Z_MAX);
    const y = floorY(x, z);
    // Ripple crests are lighter than troughs
    const tint = clamp(0.35 + rand(-0.3, 0.4) + Math.sin(x * 1.3 - z * 0.9) * 0.25, 0, 1);
    b.add(x, y + rand(0, 0.08), z, tint);
  }
  const { positions, tints } = b.build();
  return new ParticleCreature({
    positions,
    tints,
    colorA: '#3f7fa8',
    colorB: '#f0e2b8',
    size: 0.13,
    opacity: 0.9,
    radius: 2.2,
    colorize: CAUSTICS,
  });
}

// Rocks: lumpy, half-buried blobs. [x, z, size]
export const ROCKS = [
  [-20, -2, 3.5],
  [-14, -10, 2.4],
  [17, -4, 3],
  [24, 4, 2.2],
  [6, -20, 4],
  [-30, -18, 5],
  [-6, 8, 1.4],
  [33, -22, 4.5],
];

export function rockTop(rock) {
  const [x, z, s] = rock;
  return floorY(x, z) + s * 0.35; // center sits 0.25*s below the floor, height is 0.6*s
}

export function createRocks(scale = 1) {
  const b = new PointBuilder();
  const total = Math.floor(14000 * scale);
  const area = ROCKS.reduce((sum, r) => sum + r[2] * r[2], 0);

  ROCKS.forEach(([cx, cz, s], k) => {
    const n = Math.floor((total * s * s) / area);
    const baseY = floorY(cx, cz) - s * 0.25;
    for (let i = 0; i < n; ) {
      // random direction on a sphere
      const u = rand(-1, 1);
      const th = Math.random() * Math.PI * 2;
      const r1 = Math.sqrt(1 - u * u);
      const dx = r1 * Math.cos(th), dy = u, dz = r1 * Math.sin(th);
      const lump = 1 + 0.22 * Math.sin(dx * 3 + k) * Math.sin(dy * 4 + k * 2) + 0.12 * Math.sin(dz * 6 + k * 3);
      const r = s * lump * (Math.random() < 0.9 ? 1 : Math.random());
      const x = cx + dx * r;
      const y = baseY + dy * r * 0.6;
      const z = cz + dz * r * 0.85;
      if (y < floorY(x, z)) continue; // buried part
      i++;
      b.add(x, y, z, clamp(dy * 0.8 + 0.35 + rand(-0.2, 0.2), 0, 1));
    }
  });

  const { positions, tints } = b.build();
  return new ParticleCreature({
    positions,
    tints,
    colorA: '#3d6688',
    colorB: '#a8c6d6',
    size: 0.12,
    opacity: 0.85,
    radius: 2.0,
    colorize: CAUSTICS,
  });
}
