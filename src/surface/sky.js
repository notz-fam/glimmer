import { ParticleCreature } from '../ParticleCreature.js';
import { PointBuilder, rand } from '../creatures/pointBuilder.js';

const SKY_R = 160;
export const POLARIS_POS = { x: 0, y: 22, z: -150 }; // relative to the sky dome (north, a little above the horizon)

/** Star dome. Its brightness (uOpacity) changes with the story. */
export function createStars(scale = 1) {
  const b = new PointBuilder();
  const count = Math.floor(3500 * Math.max(scale, 0.8));
  for (let i = 0; i < count; i++) {
    const y = rand(0.03, 1);
    const th = Math.random() * Math.PI * 2;
    const r = Math.sqrt(1 - y * y);
    b.add(Math.cos(th) * r * SKY_R, y * SKY_R, Math.sin(th) * r * SKY_R, Math.pow(Math.random(), 3));
  }
  const { positions, tints } = b.build();
  return new ParticleCreature({
    positions,
    tints,
    colorA: '#8fb4ff',
    colorB: '#ffffff',
    size: 0.45,
    opacity: 0.35,
    radius: 0,
  });
}

const POLARIS_DEFORM = /* glsl */ `
vec3 deform(vec3 p) {
  float a = uTime * 0.05;
  float c = cos(a), s = sin(a);
  p.xy = mat2(c, -s, s, c) * p.xy;
  return p * (1.0 + 0.06 * sin(uTime * 1.7));
}
`;

/** The north star: a bright core with four long rays and a soft halo. */
export function createPolaris() {
  const b = new PointBuilder();
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 0.7;
  for (let i = 0; i < 360; i++) b.add(gauss(), gauss(), gauss() * 0.3, 1); // bright core
  for (let i = 0; i < 320; i++) b.add(gauss() * 3, gauss() * 3, 0, 0.15); // soft glow
  // rays: four long, four short on the diagonals, densest near the center
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    const len = k % 2 ? 4 : 10;
    for (let i = 0; i < (k % 2 ? 50 : 120); i++) {
      const d = Math.pow(Math.random(), 2.2) * len;
      b.add(Math.cos(a) * d + rand(-0.05, 0.05), Math.sin(a) * d + rand(-0.05, 0.05), 0, 0.7);
    }
  }
  const { positions, tints } = b.build();
  const polaris = new ParticleCreature({
    positions,
    tints,
    colorA: '#9fd0ff',
    colorB: '#fffbe6',
    size: 0.9,
    opacity: 1,
    radius: 0,
    deform: POLARIS_DEFORM,
  });
  polaris.object.position.set(POLARIS_POS.x, POLARIS_POS.y, POLARIS_POS.z);
  return polaris;
}

// The Little Dipper, hanging below the north star (sky units, before scaling)
const DIPPER = [
  [-4, -3],
  [-7, -7],
  [-9, -11],
  [-14, -12],
  [-13, -18],
  [-8, -17],
];

function smallStar(rayLen) {
  const b = new PointBuilder();
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 0.45;
  for (let i = 0; i < 140; i++) b.add(gauss(), gauss(), 0, 1);
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2 + Math.PI / 4;
    for (let i = 0; i < 30; i++) {
      const d = Math.pow(Math.random(), 2) * rayLen;
      b.add(Math.cos(a) * d, Math.sin(a) * d, 0, 0.6);
    }
  }
  return b.build();
}

/** Six stars that light up one by one as the journey goes on. The north star completes them. */
export function createDipper() {
  return DIPPER.map(([x, y]) => {
    const star = new ParticleCreature({ ...smallStar(2.2), colorA: '#9fd0ff', colorB: '#fffbe6', size: 0.55, opacity: 0.9, radius: 0 });
    star.object.position.set(POLARIS_POS.x + x * 1.05, POLARIS_POS.y + y * 1.05, POLARIS_POS.z);
    return star;
  });
}

/** A faint glow low over the northern horizon; it brightens as the end comes near. */
export function createNorthGlow() {
  const b = new PointBuilder();
  const gauss = () => Math.random() + Math.random() + Math.random() - 1.5;
  for (let i = 0; i < 5000; i++) b.add(gauss() * 55, Math.pow(Math.random(), 2.5) * 12, gauss() * 4, Math.random());
  const glow = new ParticleCreature({ ...b.build(), colorA: '#24467d', colorB: '#8fb6f0', size: 1.3, opacity: 0, radius: 0 });
  glow.object.position.set(0, 0, -150);
  return glow;
}

/** A shooting star: a bright head with a fading tail (tail points along -x). */
export function createShootingStar() {
  const b = new PointBuilder();
  for (let i = 0; i < 260; i++) {
    const s = Math.pow(Math.random(), 1.6);
    b.add(-s * 14, rand(-0.12, 0.12) * (1 - s), 0, 1 - s);
  }
  return new ParticleCreature({ ...b.build(), colorA: '#7fa8ff', colorB: '#ffffff', size: 0.8, opacity: 1, radius: 0 });
}

const PULSE = /* glsl */ `
vec3 deform(vec3 p) { return p * (1.0 + 0.25 * sin(uTime * 1.3)); }
`;

/** A small warm light far away on the horizon, like a distant shore. */
export function createFarLight() {
  const b = new PointBuilder();
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 0.6;
  for (let i = 0; i < 300; i++) b.add(gauss(), gauss() * 0.6, 0, Math.random());
  for (let i = 0; i < 160; i++) b.add(gauss() * 6, -Math.abs(gauss()) * 0.3, 0, 0); // reflection-like smear
  const light = new ParticleCreature({ ...b.build(), colorA: '#ff9a4a', colorB: '#fff0c8', size: 0.9, opacity: 0.8, radius: 0, deform: PULSE });
  light.object.position.set(26, 2.5, -140); // kept within view even on a tall phone screen
  return light;
}
