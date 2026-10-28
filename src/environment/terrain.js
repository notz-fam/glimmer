// Seabed height and extent, shared by everything that sits on the floor.
export const FLOOR_Y = -13;
export const FLOOR_X = 50; // half width
export const FLOOR_Z_MIN = -48;
export const FLOOR_Z_MAX = 18;

export function floorY(x, z) {
  return (
    FLOOR_Y +
    0.9 * Math.sin(x * 0.13) * Math.cos(z * 0.11) +
    0.35 * Math.sin(x * 0.45 + z * 0.3) +
    0.15 * Math.sin(x * 1.3 - z * 0.9) // small sand ripples
  );
}

// Moving light pattern from the surface, for things lying on the bottom.
export const CAUSTICS = /* glsl */ `
vec3 colorize(vec3 c, vec3 wp) {
  float a = sin(wp.x * 0.9 + uTime * 0.8) * sin(wp.z * 0.8 - uTime * 0.6);
  float b = sin((wp.x + wp.z) * 0.6 - uTime * 0.7) * sin((wp.x - wp.z) * 0.5 + uTime * 0.5);
  float caustic = pow(abs(a + b) * 0.5, 2.0);
  return c * (0.55 + 1.8 * caustic);
}
`;
