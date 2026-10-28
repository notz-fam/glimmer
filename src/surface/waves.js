// Ocean swell, written twice: GLSL for the water particles, JS so floating
// things (boat, flotsam) bob on exactly the same waves.

export const WAVE_GLSL = /* glsl */ `
uniform float uWaveAmp;
float waveHeight(vec2 q, float t) {
  return uWaveAmp * (
    0.35 * sin(q.x * 0.18 + t * 0.9) +
    0.25 * sin(q.y * 0.23 - t * 0.7 + q.x * 0.07) +
    0.12 * sin((q.x + q.y) * 0.5 + t * 1.6)
  );
}
`;

export function waveHeight(x, z, t, amp) {
  return (
    amp *
    (0.35 * Math.sin(x * 0.18 + t * 0.9) +
      0.25 * Math.sin(z * 0.23 - t * 0.7 + x * 0.07) +
      0.12 * Math.sin((x + z) * 0.5 + t * 1.6))
  );
}
