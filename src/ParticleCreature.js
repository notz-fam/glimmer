import * as THREE from 'three';
import vertexTemplate from './shaders/creature.vert.glsl?raw';
import fragmentShader from './shaders/creature.frag.glsl?raw';

const IDENTITY_DEFORM = 'vec3 deform(vec3 p) { return p; }';
const IDENTITY_COLORIZE = 'vec3 colorize(vec3 c, vec3 wp) { return c; }';

// Uniforms shared by every creature (time, point scale), updated once per frame.
// The fog / brightness ones are defaults; a layer (see makeLayer) can replace them.
export const sharedUniforms = {
  uTime: { value: 0 },
  uScale: { value: 1 },
  uFogNear: { value: 25 },
  uFogFar: { value: 70 },
  uDim: { value: 1 },
  uWaterY: { value: 0 },
  uDepthFade: { value: 1e6 }, // how quickly things fade with depth below the water
  uClipAbove: { value: 0 }, // 1 = hide anything above the water line
};

/** A set of uniforms shared by everything in one layer (above water, below water, sky). */
export function makeLayer({ dim = 1, fogNear = 25, fogFar = 70, depthFade = 1e6, clipAbove = 0 } = {}) {
  return {
    uDim: { value: dim },
    uFogNear: { value: fogNear },
    uFogFar: { value: fogFar },
    uWaterY: { value: 0 },
    uDepthFade: { value: depthFade },
    uClipAbove: { value: clipAbove },
  };
}

// Spring / scatter tuning
const SPRING = 4.0; // pull back toward the original shape
const DAMPING = 2.4; // velocity decay per second
const PUSH = 45; // push away from the finger
const DRAG_GAIN = 5; // how much the drag direction throws particles

const _inv = new THREE.Matrix4();
const _o = new THREE.Vector3();
const _d = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _n = new THREE.Vector3();
const _wp = new THREE.Vector3();
const _plane = new THREE.Plane();

/**
 * A creature made of points. `positions` is its shape in local space
 * (+x = forward). Each point also has an offset + velocity that the pointer
 * pushes around; a spring brings it back to the shape.
 */
export class ParticleCreature {
  constructor({
    positions,
    tints,
    colorA,
    colorB,
    size = 0.12,
    opacity = 1,
    deform = IDENTITY_DEFORM,
    colorize = IDENTITY_COLORIZE,
    radius = 2.5,
    phase = 0,
    uniforms = {}, // extra uniforms used by `deform` / `colorize`
    attributes = {}, // extra per-point data: { name: [Float32Array, itemSize] }
  }) {
    this.count = positions.length / 3;
    this.base = positions;
    this.offsets = new Float32Array(positions.length);
    this.vel = new Float32Array(positions.length);
    this.random = new Float32Array(this.count);
    for (let i = 0; i < this.count; i++) this.random[i] = Math.random();
    this.radius = radius;
    this.active = false; // true while some particles are still out of place

    const geometry = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(positions, 3);
    this.offAttr = new THREE.BufferAttribute(this.offsets, 3);
    this.offAttr.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', this.posAttr);
    geometry.setAttribute('aOffset', this.offAttr);
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(this.random, 1));
    geometry.setAttribute('aTint', new THREE.BufferAttribute(tints ?? new Float32Array(this.count), 1));
    for (const [name, [array, size]] of Object.entries(attributes)) {
      geometry.setAttribute(name, new THREE.BufferAttribute(array, size));
    }

    this.material = new THREE.ShaderMaterial({
      vertexShader: vertexTemplate.replace('#pragma DEFORM', deform).replace('#pragma COLORIZE', colorize),
      fragmentShader,
      uniforms: {
        ...sharedUniforms,
        uSize: { value: size },
        uOpacity: { value: opacity },
        uPhase: { value: phase },
        uColorA: { value: new THREE.Color(colorA) },
        uColorB: { value: new THREE.Color(colorB ?? colorA) },
        uPresence: { value: 1 },
        ...uniforms,
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geometry, this.material);
    this.points.frustumCulled = false;
    this.object = new THREE.Group();
    this.object.add(this.points);

    this.baseOpacity = opacity;
    // Presence: 0 = hidden, 1 = fully there. Fades toward `presenceTarget`.
    this.presence = 1;
    this.presenceTarget = 1;
  }

  /** Join a layer (call before the first render). */
  setLayer(layer) {
    Object.assign(this.material.uniforms, layer);
    return this;
  }

  /** True while the creature is visible or fading in / out. */
  get live() {
    return this.presence > 0.002 || this.presenceTarget > 0;
  }

  setPresent(on, instant = false) {
    this.presenceTarget = on ? 1 : 0;
    if (instant) {
      this.presence = this.presenceTarget;
      this.material.uniforms.uPresence.value = this.presence;
      this.object.visible = on;
    }
  }

  /** Fade in while the particles fly in from far away and gather into shape. */
  appear(spread = 10) {
    if (this.presenceTarget === 1 && this.presence > 0.5) return;
    this.presenceTarget = 1;
    const off = this.offsets;
    for (let i = 0; i < off.length; i += 3) {
      const u = Math.random() * 2 - 1;
      const th = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      const d = spread * (0.3 + Math.random());
      off[i] = r * Math.cos(th) * d;
      off[i + 1] = u * d;
      off[i + 2] = r * Math.sin(th) * d;
    }
    this.vel.fill(0);
    this.active = true;
    this.offAttr.needsUpdate = true;
  }

  /** Throw every particle a little (dissolving, being touched). */
  shake(strength) {
    if (!this.object.visible) return;
    const v = this.vel;
    for (let i = 0; i < v.length; i++) v[i] += (Math.random() * 2 - 1) * strength;
    this.active = true;
  }

  /** Call after changing `this.base` (e.g. the fish school moving). */
  markBaseDirty() {
    this.posAttr.needsUpdate = true;
  }

  update(dt, pointer, camera) {
    if (this.presence !== this.presenceTarget) {
      this.presence += (this.presenceTarget - this.presence) * (1 - Math.exp(-dt * 1.2));
      if (Math.abs(this.presence - this.presenceTarget) < 0.002) this.presence = this.presenceTarget;
      this.material.uniforms.uPresence.value = this.presence;
    }
    this.object.visible = this.presence > 0.002;
    if (!this.object.visible) return;

    const touching = pointer.inside && this.radius > 0;
    if (!touching && !this.active) return;

    let ox = 0, oy = 0, oz = 0, dx = 0, dy = 0, dz = 0;
    let gx = 0, gy = 0, gz = 0;
    let push = 0;

    if (touching) {
      // Pointer ray in this creature's local space
      this.object.updateMatrixWorld();
      _inv.copy(this.object.matrixWorld).invert();
      _o.copy(pointer.ray.origin).applyMatrix4(_inv);
      _d.copy(pointer.ray.direction).transformDirection(_inv);
      ox = _o.x; oy = _o.y; oz = _o.z;
      dx = _d.x; dy = _d.y; dz = _d.z;

      // Drag velocity measured on a plane through the creature, facing the camera
      camera.getWorldDirection(_n);
      this.object.getWorldPosition(_wp);
      _plane.setFromNormalAndCoplanarPoint(_n, _wp);
      if (
        pointer.ray.intersectPlane(_plane, _a) &&
        pointer.prevRay.intersectPlane(_plane, _b)
      ) {
        _a.applyMatrix4(_inv);
        _b.applyMatrix4(_inv);
        // Movement this frame -> velocity kick in the drag direction
        gx = (_a.x - _b.x) * DRAG_GAIN;
        gy = (_a.y - _b.y) * DRAG_GAIN;
        gz = (_a.z - _b.z) * DRAG_GAIN;
      }

      // Pressing pushes hard, a hovering mouse only nudges, a fresh tap pops.
      push = PUSH * (pointer.down ? 1 : 0.3) * (pointer.burst ? 8 : 1) * dt;
    }

    const base = this.base;
    const off = this.offsets;
    const vel = this.vel;
    const rnd = this.random;
    const R = this.radius;
    const R2 = R * R;
    const damp = Math.exp(-DAMPING * dt);
    const spring = SPRING * dt;
    let energy = 0;

    for (let i = 0, ix = 0; i < this.count; i++, ix += 3) {
      let vx = vel[ix], vy = vel[ix + 1], vz = vel[ix + 2];
      let fx = off[ix], fy = off[ix + 1], fz = off[ix + 2];

      if (touching) {
        // Distance from the particle to the pointer ray
        const rx = base[ix] + fx - ox;
        const ry = base[ix + 1] + fy - oy;
        const rz = base[ix + 2] + fz - oz;
        const t = rx * dx + ry * dy + rz * dz;
        const qx = rx - t * dx, qy = ry - t * dy, qz = rz - t * dz;
        const d2 = qx * qx + qy * qy + qz * qz;
        if (d2 < R2) {
          const dist = Math.sqrt(d2) + 1e-4;
          let f = 1 - dist / R;
          f *= f;
          const p = (push * (0.5 + rnd[i])) / dist;
          vx += (qx * p + gx) * f;
          vy += (qy * p + gy) * f;
          vz += (qz * p + gz) * f;
        }
      }

      vx = (vx - fx * spring) * damp;
      vy = (vy - fy * spring) * damp;
      vz = (vz - fz * spring) * damp;
      fx += vx * dt;
      fy += vy * dt;
      fz += vz * dt;

      vel[ix] = vx; vel[ix + 1] = vy; vel[ix + 2] = vz;
      off[ix] = fx; off[ix + 1] = fy; off[ix + 2] = fz;
      energy += Math.abs(fx) + Math.abs(fy) + Math.abs(fz) + Math.abs(vx) + Math.abs(vy) + Math.abs(vz);
    }

    this.active = energy / this.count > 1e-4;
    if (!this.active) {
      off.fill(0);
      vel.fill(0);
    }
    this.offAttr.needsUpdate = true;
  }
}
