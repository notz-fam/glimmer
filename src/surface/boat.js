import * as THREE from 'three';
import { ParticleCreature } from '../ParticleCreature.js';
import { PointBuilder, rand } from '../creatures/pointBuilder.js';
import { waveHeight } from './waves.js';

// Boat local space: +x = bow (forward), y = up, z = side (+z faces the viewer at first)
const HALF_LEN = 2;
export const LANTERN_LOCAL = new THREE.Vector3(1.75, 1.15, 0);
export const BOW_LOCAL = new THREE.Vector3(2.05, 0.3, 0);
export const ROPE_LOCAL = new THREE.Vector3(1.97, 0.0, 1.0); // a point on the trailing rope
export const GIFT_LOCAL = new THREE.Vector3(0.2, 0.05, 0.3); // where the seabird's gift lands
// Traveler's middle in each pose (curled, sitting up, standing)
const TRAVELER_CENTERS = [new THREE.Vector3(-0.35, 0.3, 0), new THREE.Vector3(-0.45, 0.5, 0), new THREE.Vector3(-0.3, 0.9, 0)];

const halfWidth = (x) => 0.72 * Math.pow(Math.max(0, 1 - Math.pow(x / HALF_LEN, 2)), 0.7);
const depth = (x) => 0.5 * Math.pow(Math.max(0, 1 - Math.pow(x / HALF_LEN, 2)), 0.5) + 0.05;
const sheer = (x) => 0.18 * Math.pow(x / HALF_LEN, 2); // ends rise a little

function ellipsoid(b, cx, cy, cz, rx, ry, rz, n, tint) {
  for (let i = 0; i < n; i++) {
    const u = rand(-1, 1);
    const th = Math.random() * Math.PI * 2;
    const r = Math.sqrt(1 - u * u) * (Math.random() < 0.8 ? 1 : Math.random());
    b.add(cx + Math.cos(th) * r * rx, cy + u * ry, cz + Math.sin(th) * r * rz, tint);
  }
}

function buildHull(scale) {
  const b = new PointBuilder();
  const n = Math.floor(4400 * scale + 1600);

  // Hull: half-ellipse cross sections, with darker plank lines
  for (let i = 0; i < n * 0.7; i++) {
    const x = rand(-HALF_LEN, HALF_LEN);
    const th = Math.random() * Math.PI;
    const plank = Math.abs(Math.sin(th * 5)) < 0.15 ? 0.15 : 0;
    b.add(x, sheer(x) - Math.sin(th) * depth(x), Math.cos(th) * halfWidth(x), plank);
  }
  // Gunwale (top rim), brighter
  for (let i = 0; i < n * 0.14; i++) {
    const x = rand(-HALF_LEN, HALF_LEN);
    const side = Math.random() < 0.5 ? -1 : 1;
    b.add(x, sheer(x) + rand(0, 0.04), side * halfWidth(x), 0.3);
  }
  // Seat plank across the middle
  for (let i = 0; i < n * 0.05; i++) b.add(0.45 + rand(-0.12, 0.12), -0.12, rand(-1, 1) * halfWidth(0.45) * 0.95, 0.2);
  // Lantern pole at the bow
  for (let i = 0; i < 120; i++) b.add(1.75 + rand(-0.02, 0.02), 0.15 + Math.random() * 0.85, rand(-0.02, 0.02), 0.4);
  // Frayed rope: tied at the bow, trailing into the water, its end coming apart
  for (let i = 0; i < n * 0.1; i++) {
    const s = Math.random();
    const fray = s > 0.8 ? (s - 0.8) * 5 : 0;
    b.add(
      2.0 + s * 1.2 - s * s * 3.2 + rand(-1, 1) * 0.3 * fray,
      0.25 - s * 0.6 + rand(-0.02, 0.02),
      0.35 + s * 1.8 + Math.sin(s * 9) * 0.15 + rand(-1, 1) * 0.5 * fray,
      0.55,
    );
  }
  return b.build();
}

// ---------- the traveler: one set of points, three poses ----------

// [share of points, pose A curled, pose B sitting up, pose C standing], each pose = [center, radii]
const BODY = [
  [0.34, [[-0.45, 0.22, 0], [0.17, 0.3, 0.24]], [[-0.5, 0.42, 0], [0.14, 0.3, 0.22]], [[-0.3, 0.85, 0], [0.13, 0.3, 0.2]]], // torso
  [0.16, [[-0.15, 0.48, 0], [0.15, 0.15, 0.15]], [[-0.48, 0.88, 0], [0.15, 0.15, 0.15]], [[-0.27, 1.33, 0], [0.15, 0.15, 0.15]]], // head
  [0.08, [[-0.2, 0.2, 0.1], [0.22, 0.08, 0.08]], [[-0.25, 0.12, 0.1], [0.25, 0.08, 0.08]], [[-0.3, 0.42, 0.09], [0.08, 0.2, 0.08]]], // thigh
  [0.08, [[-0.2, 0.2, -0.1], [0.22, 0.08, 0.08]], [[-0.25, 0.12, -0.1], [0.25, 0.08, 0.08]], [[-0.3, 0.42, -0.09], [0.08, 0.2, 0.08]]],
  [0.07, [[-0.02, 0.1, 0.1], [0.08, 0.17, 0.08]], [[0.08, 0.02, 0.1], [0.2, 0.07, 0.07]], [[-0.3, 0.08, 0.09], [0.07, 0.18, 0.07]]], // shin
  [0.07, [[-0.02, 0.1, -0.1], [0.08, 0.17, 0.08]], [[0.08, 0.02, -0.1], [0.2, 0.07, 0.07]], [[-0.3, 0.08, -0.09], [0.07, 0.18, 0.07]]],
  [0.1, [[-0.12, 0.3, 0.2], [0.2, 0.06, 0.06]], [[-0.48, 0.38, 0.25], [0.06, 0.22, 0.06]], [[-0.32, 0.78, 0.22], [0.05, 0.22, 0.05]]], // arm
  [0.1, [[-0.12, 0.3, -0.2], [0.2, 0.06, 0.06]], [[-0.48, 0.38, -0.25], [0.06, 0.22, 0.06]], [[-0.02, 1.12, -0.18], [0.26, 0.05, 0.05]]], // arm pointing ahead
];

const POSE = /* glsl */ `
attribute vec3 aPoseB;
attribute vec3 aPoseC;
uniform float uPose; // 0 curled, 1 sitting up, 2 standing
vec3 deform(vec3 p) {
  if (uPose < 1.0) return mix(p, aPoseB, smoothstep(0.0, 1.0, uPose));
  return mix(aPoseB, aPoseC, smoothstep(0.0, 1.0, uPose - 1.0));
}
`;

function buildTraveler(n) {
  const a = [], bArr = [], c = [], tint = [];
  for (const [share, ...poses] of BODY) {
    for (let i = 0; i < n * share; i++) {
      // one random point on a unit sphere, placed into each pose's ellipsoid
      const u = rand(-1, 1);
      const th = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u) * (Math.random() < 0.8 ? 1 : Math.random());
      const s = [Math.cos(th) * r, u, Math.sin(th) * r];
      [a, bArr, c].forEach((out, k) => {
        const [center, radii] = poses[k];
        out.push(center[0] + s[0] * radii[0], center[1] + s[1] * radii[1], center[2] + s[2] * radii[2]);
      });
      tint.push(Math.random() * 0.4 + 0.6);
    }
  }
  return {
    positions: new Float32Array(a),
    tints: new Float32Array(tint),
    attributes: { aPoseB: [new Float32Array(bArr), 3], aPoseC: [new Float32Array(c), 3] },
  };
}

// ---------- scars: three old cracks on the side facing the viewer ----------

const CRACKS = [
  [-1.2, 0.9],
  [0.1, 1.1],
  [1.0, 0.7],
];

function buildScar([x0, len]) {
  const b = new PointBuilder();
  const center = new THREE.Vector3();
  const n = 170;
  for (let i = 0; i < n; i++) {
    const s = Math.random();
    const x = x0 + s * len;
    const th = 0.5 + Math.sin(s * 14 + x0) * 0.25 + s * 0.4;
    const p = [x, sheer(x) - Math.sin(th) * depth(x), Math.cos(th) * halfWidth(x) * 1.02];
    b.add(...p, 0);
    center.x += p[0] / n;
    center.y += p[1] / n;
    center.z += p[2] / n;
  }
  return { ...b.build(), center };
}

function buildLantern() {
  const b = new PointBuilder();
  ellipsoid(b, 0, 0, 0, 0.13, 0.16, 0.13, 260, 1); // flame / glass
  for (let i = 0; i < 140; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.pow(Math.random(), 0.5) * 0.55;
    b.add(Math.cos(a) * r, rand(-0.35, 0.35) * (1 - r), Math.sin(a) * r, 0);
  }
  return b.build();
}

const FLICKER = /* glsl */ `
uniform float uPulse;
vec3 deform(vec3 p) {
  return p * (1.0 + 0.08 * sin(uTime * 11.0 + aRandom * 6.0) * sin(uTime * 7.0) + uPulse * 0.5);
}
`;

/**
 * The little boat: hull + rope, a traveler who changes pose as the story goes on,
 * three scars that heal one by one, a lantern that grows with gathered light,
 * and a small gift the seabird brings.
 */
export function createBoat(scale = 1) {
  const group = new THREE.Group();
  const hull = new ParticleCreature({ ...buildHull(scale), colorA: '#b5835a', colorB: '#ffe0b8', size: 0.075, opacity: 0.85, radius: 0.5 });
  const traveler = new ParticleCreature({
    ...buildTraveler(Math.floor(1200 * scale + 400)),
    colorA: '#ffe0b8',
    colorB: '#fff4e0',
    size: 0.07,
    opacity: 0.85,
    radius: 0.4,
    deform: POSE,
    uniforms: { uPose: { value: 0 } },
  });
  const scars = CRACKS.map(buildScar).map((s) => {
    const c = new ParticleCreature({ ...s, colorA: '#ff4a5e', size: 0.07, opacity: 0.9, radius: 0 });
    c.center = s.center;
    return c;
  });
  const lantern = new ParticleCreature({
    ...buildLantern(),
    colorA: '#ff9a3c',
    colorB: '#fff3cf',
    size: 0.16,
    opacity: 0.3,
    radius: 0,
    deform: FLICKER,
    uniforms: { uPulse: { value: 0 } },
  });
  lantern.object.position.copy(LANTERN_LOCAL);

  const giftShape = new PointBuilder();
  ellipsoid(giftShape, 0, 0, 0, 0.07, 0.07, 0.07, 160, 1);
  const gift = new ParticleCreature({ ...giftShape.build(), colorA: '#bff4ff', colorB: '#ffffff', size: 0.09, opacity: 1, radius: 0, deform: FLICKER, uniforms: { uPulse: { value: 0.3 } } });
  gift.object.position.copy(GIFT_LOCAL);

  group.add(hull.object, traveler.object, lantern.object, gift.object, ...scars.map((s) => s.object));

  const boat = { group, hull, traveler, scars, lantern, gift, parts: [hull, traveler, lantern, gift, ...scars], heading: 0.35 };

  /** 0..1: how much light the lantern holds. */
  boat.setLantern = (x) => {
    lantern.material.uniforms.uOpacity.value = 0.25 + 0.95 * x;
    lantern.material.uniforms.uSize.value = 0.16 + 0.16 * x;
  };

  /** 0 curled up, 1 sitting up, 2 standing and pointing ahead. */
  boat.setPose = (x) => {
    traveler.material.uniforms.uPose.value = x;
  };

  /** Traveler's middle for the current pose (local space). */
  boat.travelerLocal = (out = new THREE.Vector3()) => {
    const pose = traveler.material.uniforms.uPose.value;
    const i = Math.min(1, Math.floor(pose));
    return out.copy(TRAVELER_CENTERS[i]).lerp(TRAVELER_CENTERS[i + 1], Math.min(1, pose - i));
  };

  /** Float on the waves at its position, facing `heading`. */
  boat.float = (time, amp) => {
    const p = group.position;
    const th = boat.heading;
    const fx = Math.cos(th), fz = -Math.sin(th); // forward
    const sx = Math.sin(th), sz = Math.cos(th); // side
    const hc = waveHeight(p.x, p.z, time, amp);
    const hb = waveHeight(p.x + fx * 1.8, p.z + fz * 1.8, time, amp);
    const hs = waveHeight(p.x - fx * 1.8, p.z - fz * 1.8, time, amp);
    const hl = waveHeight(p.x + sx * 0.7, p.z + sz * 0.7, time, amp);
    const hr = waveHeight(p.x - sx * 0.7, p.z - sz * 0.7, time, amp);
    p.y = (hc + hb + hs) / 3 + 0.12;
    group.rotation.set(Math.atan2(hl - hr, 1.4) * 0.8, th, Math.atan2(hb - hs, 3.6), 'YXZ');
  };

  boat.toWorld = (local, out = new THREE.Vector3()) => group.localToWorld(out.copy(local));
  return boat;
}
