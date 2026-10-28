import { ParticleCreature } from '../ParticleCreature.js';
import { PointBuilder, rand } from '../creatures/pointBuilder.js';

// A small glowing seabird (+x = forward). uFlap: 1 = flying, 0 = perched with wings folded.
const FLAP = /* glsl */ `
uniform float uFlap;
vec3 deform(vec3 p) {
  float w = max(0.0, abs(p.z) - 0.1);
  p.y += sin(uTime * 9.0) * uFlap * w * 0.9;
  p.z *= mix(0.3, 1.0, uFlap);
  p.y += (1.0 - uFlap) * w * 0.25; // folded wings rest on the back
  return p;
}
`;

function ellipsoid(b, cx, cy, cz, rx, ry, rz, n, tint) {
  for (let i = 0; i < n; i++) {
    const u = rand(-1, 1);
    const th = Math.random() * Math.PI * 2;
    const r = Math.sqrt(1 - u * u);
    b.add(cx + Math.cos(th) * r * rx, cy + u * ry, cz + Math.sin(th) * r * rz, tint);
  }
}

export function createSeabird() {
  const b = new PointBuilder();
  ellipsoid(b, 0, 0, 0, 0.3, 0.12, 0.12, 500, 0.6); // body
  ellipsoid(b, 0.3, 0.09, 0, 0.1, 0.09, 0.09, 220, 1); // head
  for (let i = 0; i < 60; i++) b.add(0.4 + Math.random() * 0.14, 0.07, rand(-0.015, 0.015), 1); // beak
  // wings: long, tapering, swept back a little
  for (let i = 0; i < 900; i++) {
    const s = Math.random();
    const side = Math.random() < 0.5 ? -1 : 1;
    const chord = 0.24 * (1 - s * 0.75);
    b.add(0.05 - s * 0.22 - Math.random() * chord, rand(-0.01, 0.01), side * (0.1 + s * 0.85), 0.3);
  }
  // forked tail
  for (let i = 0; i < 120; i++) {
    const s = Math.random();
    const side = Math.random() < 0.5 ? -1 : 1;
    b.add(-0.3 - s * 0.25, 0, side * s * 0.12, 0.3);
  }
  return new ParticleCreature({
    ...b.build(),
    colorA: '#9fe8ff',
    colorB: '#ffffff',
    size: 0.07,
    opacity: 1,
    radius: 0.4,
    deform: FLAP,
    uniforms: { uFlap: { value: 1 } },
  });
}
