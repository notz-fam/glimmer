uniform float uTime;
uniform float uScale;
uniform float uSize;
uniform float uPhase;
uniform float uOpacity;
uniform float uFogNear;
uniform float uFogFar;
uniform float uDim;
uniform float uPresence;
uniform float uWaterY;
uniform float uDepthFade;
uniform float uClipAbove;
uniform vec3 uColorA;
uniform vec3 uColorB;

attribute vec3 aOffset;
attribute float aRandom;
attribute float aTint;

varying vec3 vColor;
varying float vAlpha;

// Each creature injects its own `vec3 deform(vec3 p)` here (swimming motion).
#pragma DEFORM

// Optional `vec3 colorize(vec3 color, vec3 worldPos)` (e.g. caustic light on the seabed).
#pragma COLORIZE

void main() {
  vec3 p = deform(position);

  float scatter = length(aOffset);
  p += aOffset;

  // Small shimmer so the body never looks static
  p += 0.03 * vec3(
    sin(uTime * 1.3 + aRandom * 40.0),
    cos(uTime * 1.1 + aRandom * 30.0),
    sin(uTime * 0.9 + aRandom * 20.0)
  );

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;

  float depth = -mv.z;
  float size = uSize * (0.55 + aRandom * 0.9);
  gl_PointSize = max(1.0, size * uScale / depth);

  // Scattered particles glow brighter
  float glow = clamp(scatter * 0.35, 0.0, 1.0);
  vColor = mix(uColorA, uColorB, aTint);
  vec3 wp = (modelMatrix * vec4(p, 1.0)).xyz;
  vColor = colorize(vColor, wp);
  vColor = mix(vColor, vec3(0.75, 0.95, 1.0), glow * 0.6);

  float twinkle = 0.75 + 0.25 * sin(uTime * 2.0 + aRandom * 60.0);
  float fog = 1.0 - smoothstep(uFogNear, uFogFar, depth);
  // Seen through the water: deeper = dimmer, and nothing pokes above the surface
  float under = clamp((uWaterY - wp.y) / uDepthFade, 0.0, 1.0);
  float clip = uClipAbove > 0.5 && wp.y > uWaterY ? 0.0 : 1.0;
  vAlpha = uOpacity * twinkle * fog * (1.0 + glow) * uDim * uPresence * (1.0 - under * 0.8) * clip;
}
