import { ParticleCreature } from '../ParticleCreature.js';
import { PointBuilder, rand, clamp } from '../creatures/pointBuilder.js';
import { floorY, FLOOR_Y } from './terrain.js';

// ---------- Kelp: tall swaying strands with leaf blades ----------

const KELP_CLUSTERS = [
  [-24, 2],
  [-19, -8],
  [22, -2],
  [27, -12],
  [-8, -26],
  [12, -30],
  [-35, -25],
  [38, -8],
];

const KELP_SWAY = /* glsl */ `
vec3 deform(vec3 p) {
  float h = max(0.0, p.y - (${FLOOR_Y.toFixed(1)} - 0.5));
  p.x += sin(uTime * 0.6 + p.x * 0.15 + p.z * 0.1 + p.y * 0.18) * h * h * 0.006;
  p.z += cos(uTime * 0.5 + p.x * 0.12 + p.y * 0.15) * h * h * 0.004;
  return p;
}
`;

export function createKelp(scale = 1) {
  const b = new PointBuilder();
  const perStrand = Math.floor(600 * scale);

  for (const [cx, cz] of KELP_CLUSTERS) {
    const strands = 4 + Math.floor(Math.random() * 4);
    for (let s = 0; s < strands; s++) {
      const x0 = cx + rand(-2, 2);
      const z0 = cz + rand(-2, 2);
      const y0 = floorY(x0, z0);
      const height = rand(10, 17);
      const twist = Math.random() * Math.PI * 2;

      for (let i = 0; i < perStrand; i++) {
        const t = Math.random();
        const y = y0 + t * height;
        // gentle helix for the stem
        const sx = x0 + Math.sin(t * 6 + twist) * 0.25;
        const sz = z0 + Math.cos(t * 6 + twist) * 0.25;
        if (i % 3 === 0 || t < 0.08) {
          b.add(sx + rand(-0.04, 0.04), y, sz + rand(-0.04, 0.04), t * 0.6);
        } else {
          // leaf blade sticking out at alternating sides
          const leaf = Math.floor(t * height / 0.8);
          const ang = leaf * 2.4 + twist;
          const len = rand(0, 1) * (0.6 + 0.8 * Math.sin(Math.PI * t));
          const droop = -len * 0.35;
          b.add(sx + Math.cos(ang) * len, y + droop + rand(-0.08, 0.08), sz + Math.sin(ang) * len, clamp(t + 0.2, 0, 1));
        }
      }
    }
  }

  const { positions, tints } = b.build();
  return new ParticleCreature({
    positions,
    tints,
    colorA: '#2fa37a',
    colorB: '#c4ff8f',
    size: 0.11,
    opacity: 0.85,
    radius: 1.8,
    deform: KELP_SWAY,
  });
}

// ---------- Coral: branching colonies and flat sea fans ----------

const CORAL_SWAY = /* glsl */ `
vec3 deform(vec3 p) {
  float h = max(0.0, p.y - (${FLOOR_Y.toFixed(1)}));
  p.x += sin(uTime * 0.9 + p.y * 0.8 + p.z) * 0.04 * h;
  return p;
}
`;

/**
 * Grows a branching structure as a list of segments.
 * `flat` keeps branches in one vertical plane (sea fan).
 */
function grow(segments, x, y, z, dx, dy, dz, len, depth, thick, flat) {
  const ex = x + dx * len, ey = y + dy * len, ez = z + dz * len;
  segments.push({ x, y, z, ex, ey, ez, len, thick, tip: depth === 0 });
  if (depth === 0) return;

  const children = flat ? 2 : 2 + Math.floor(Math.random() * 2);
  for (let c = 0; c < children; c++) {
    let nx, ny, nz;
    if (flat) {
      // rotate within the x-y plane
      const a = (c === 0 ? -1 : 1) * rand(0.3, 0.7);
      nx = dx * Math.cos(a) - dy * Math.sin(a);
      ny = dx * Math.sin(a) + dy * Math.cos(a);
      nz = 0;
    } else {
      nx = dx + rand(-0.7, 0.7);
      ny = dy + rand(0.1, 0.6); // keep growing upward
      nz = dz + rand(-0.7, 0.7);
    }
    const l = Math.hypot(nx, ny, nz);
    grow(segments, ex, ey, ez, nx / l, ny / l, nz / l, len * rand(0.62, 0.8), depth - 1, thick * 0.75, flat);
  }
}

function buildColonies(colonies, count, { flat, depth, len, thick }) {
  const segments = [];
  for (const [cx, cz, size, yaw = 0] of colonies) {
    const y0 = floorY(cx, cz);
    const start = segments.length;
    if (flat) {
      grow(segments, 0, 0, 0, 0, 1, 0, len * size, depth, thick, true);
    } else {
      // a few trunks per colony
      for (let k = 0; k < 3; k++) {
        const dx = rand(-0.4, 0.4), dz = rand(-0.4, 0.4);
        const l = Math.hypot(dx, 1, dz);
        grow(segments, rand(-0.4, 0.4), 0, rand(-0.4, 0.4), dx / l, 1 / l, dz / l, len * size, depth, thick, false);
      }
    }
    // place / rotate the colony
    const c = Math.cos(yaw), s = Math.sin(yaw);
    for (let i = start; i < segments.length; i++) {
      const g = segments[i];
      [g.x, g.z] = [cx + g.x * c - g.z * s, cz + g.x * s + g.z * c];
      [g.ex, g.ez] = [cx + g.ex * c - g.ez * s, cz + g.ex * s + g.ez * c];
      g.y += y0;
      g.ey += y0;
    }
  }

  // Spread points over segments by length
  const total = segments.reduce((sum, g) => sum + g.len, 0);
  const b = new PointBuilder();
  for (const g of segments) {
    const n = Math.max(2, Math.round((count * g.len) / total));
    for (let i = 0; i < n; i++) {
      const t = Math.random();
      const r = g.thick * Math.sqrt(Math.random());
      const a = Math.random() * Math.PI * 2;
      b.add(
        g.x + (g.ex - g.x) * t + Math.cos(a) * r,
        g.y + (g.ey - g.y) * t,
        g.z + (g.ez - g.z) * t + Math.sin(a) * r,
        g.tip ? clamp(0.6 + t * 0.4, 0, 1) : t * 0.3,
      );
    }
  }
  return b.build();
}

// [x, z, size, yaw]
const BRANCH_CORALS = [
  [-10, -4, 1.0],
  [8, -8, 1.2],
  [15, 6, 0.8],
  [-17, 6, 0.9],
  [2, -14, 1.3],
  [-26, -6, 1.1],
  [28, -6, 1.0],
  [-2, 2, 0.6],
];

const SEA_FANS = [
  [-5, -18, 1.3, 0.3],
  [20, -16, 1.1, -0.4],
  [-22, -12, 1.0, 0.8],
  [11, -2, 0.7, -0.2],
];

export function createCorals(scale = 1) {
  const branch = buildColonies(BRANCH_CORALS, Math.floor(12000 * scale), { flat: false, depth: 3, len: 1.5, thick: 0.22 });
  const fans = buildColonies(SEA_FANS, Math.floor(8000 * scale), { flat: true, depth: 5, len: 1.9, thick: 0.1 });

  return [
    new ParticleCreature({
      ...branch,
      colorA: '#ff6f91',
      colorB: '#ffc27a',
      size: 0.11,
      opacity: 0.6,
      radius: 1.6,
      deform: CORAL_SWAY,
    }),
    new ParticleCreature({
      ...fans,
      colorA: '#9b5cff',
      colorB: '#ff7ad9',
      size: 0.1,
      opacity: 0.6,
      radius: 1.6,
      deform: CORAL_SWAY,
    }),
  ];
}
