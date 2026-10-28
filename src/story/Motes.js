import * as THREE from 'three';
import { sharedUniforms } from '../ParticleCreature.js';

const MAX_MOTES = 48;
const MAX_TRAIL = 3000;

function pointsMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uScale: sharedUniforms.uScale },
    vertexShader: /* glsl */ `
      uniform float uScale;
      attribute vec3 aColor;
      attribute float aLife;
      attribute float aSize;
      varying vec3 vColor;
      varying float vLife;
      void main() {
        vColor = aColor;
        vLife = aLife;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aLife > 0.0 ? max(2.0, aSize * uScale / -mv.z) : 0.0;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vLife;
      void main() {
        if (vLife <= 0.0) discard;
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vColor, a * a * vLife);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  });
}

/** A Points cloud backed by plain arrays: position, color, life, size. */
class Pool {
  constructor(max) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.color = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.size = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    this.attrs = [
      new THREE.BufferAttribute(this.pos, 3),
      new THREE.BufferAttribute(this.color, 3),
      new THREE.BufferAttribute(this.life, 1),
      new THREE.BufferAttribute(this.size, 1),
    ];
    for (const a of this.attrs) a.setUsage(THREE.DynamicDrawUsage);
    ['position', 'aColor', 'aLife', 'aSize'].forEach((n, i) => g.setAttribute(n, this.attrs[i]));
    this.points = new THREE.Points(g, pointsMaterial());
    this.points.frustumCulled = false;
    this.points.renderOrder = 20;
  }
  flush() {
    for (const a of this.attrs) a.needsUpdate = true;
  }
}

const WARM = new THREE.Color('#ffd58a');
const _p = new THREE.Vector3();

/**
 * Lights of the story: each flies on a curved path from where something was
 * touched to a target (the lantern, later the north star), leaving a trail.
 */
export class Motes {
  constructor() {
    this.group = new THREE.Group();
    this.motes = new Pool(MAX_MOTES);
    this.trail = new Pool(MAX_TRAIL);
    this.trailVel = new Float32Array(MAX_TRAIL * 3);
    this.trailDecay = new Float32Array(MAX_TRAIL);
    this.trailNext = 0;
    this.flying = [];
    this.group.add(this.trail.points, this.motes.points);
  }

  get inFlight() {
    return this.flying.length;
  }

  /**
   * from: Vector3 start. to(): returns the (possibly moving) destination.
   * onArrive is called when it lands.
   */
  launch(from, to, { duration = 1.8, delay = 0, lift = 3, color = WARM, size = 0.35, onArrive } = {}) {
    this.flying.push({ from: from.clone(), to, t: -delay, duration, lift, color, size, onArrive });
  }

  emitTrail(p, color) {
    this.sparkle(p, color, { fade: 1.4, rise: 0.5, spread: 0.6 });
  }

  /**
   * One loose sparkle. fade = life lost per second, rise = upward drift,
   * spread = random sideways drift, size = point size.
   */
  sparkle(p, color, { fade = 1.4, rise = 0.5, spread = 0.6, size = 0.08 + Math.random() * 0.08 } = {}) {
    const i = this.trailNext;
    this.trailNext = (i + 1) % MAX_TRAIL;
    const t = this.trail;
    t.pos.set([p.x, p.y, p.z], i * 3);
    t.color.set([color.r, color.g, color.b], i * 3);
    t.life[i] = 1;
    t.size[i] = size;
    this.trailDecay[i] = fade;
    this.trailVel.set([(Math.random() - 0.5) * spread, rise * (0.6 + Math.random() * 0.8), (Math.random() - 0.5) * spread], i * 3);
  }

  /** A ring of sparkles around a point: a quiet "touch here" hint. */
  hint(p, color, radius = 0.8) {
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      _p.set(p.x + Math.cos(a) * radius, p.y + Math.sin(a) * radius * 0.5, p.z + Math.sin(a) * radius * 0.3);
      this.sparkle(_p, color, { fade: 0.9, rise: 0.25, spread: 0.1, size: 0.1 });
    }
  }

  update(dt) {
    // Flying motes: quadratic curve that arcs upward
    const m = this.motes;
    m.life.fill(0);
    for (let k = this.flying.length - 1; k >= 0; k--) {
      const f = this.flying[k];
      f.t += dt;
      if (f.t < 0) continue;
      const u = Math.min(1, f.t / f.duration);
      const e = u * u * (3 - 2 * u);
      const to = f.to();
      const mid = _p.copy(f.from).lerp(to, 0.5);
      mid.y += f.lift + f.from.distanceTo(to) * 0.15;
      const a = 1 - e;
      const x = a * a * f.from.x + 2 * a * e * mid.x + e * e * to.x;
      const y = a * a * f.from.y + 2 * a * e * mid.y + e * e * to.y;
      const z = a * a * f.from.z + 2 * a * e * mid.z + e * e * to.z;
      const slot = k % MAX_MOTES;
      m.pos.set([x, y, z], slot * 3);
      m.color.set([f.color.r, f.color.g, f.color.b], slot * 3);
      m.life[slot] = 1;
      m.size[slot] = f.size * (1 + 0.25 * Math.sin(f.t * 20));
      _p.set(x, y, z);
      for (let n = 0; n < 3; n++) this.emitTrail(_p, f.color);
      if (u >= 1) {
        this.flying.splice(k, 1);
        f.onArrive?.();
      }
    }
    m.flush();

    // Trail sparkles drift up and fade
    const t = this.trail;
    for (let i = 0; i < MAX_TRAIL; i++) {
      if (t.life[i] <= 0) continue;
      t.pos[i * 3] += this.trailVel[i * 3] * dt;
      t.pos[i * 3 + 1] += this.trailVel[i * 3 + 1] * dt;
      t.pos[i * 3 + 2] += this.trailVel[i * 3 + 2] * dt;
      t.life[i] = Math.max(0, t.life[i] - dt * this.trailDecay[i]);
    }
    t.flush();
  }
}
