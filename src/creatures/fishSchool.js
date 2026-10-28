import * as THREE from 'three';
import { ParticleCreature } from '../ParticleCreature.js';
import { rand } from './pointBuilder.js';

const POINTS_PER_FISH = 40;
const BOUNDS = { x: 20, y: 9, zMin: -16, zMax: 6 };
const MIN_SPEED = 2.5;
const MAX_SPEED = 5.5;

// One small fish in its own frame (+x = forward)
function fishTemplate() {
  const pts = [];
  for (let i = 0; i < POINTS_PER_FISH; i++) {
    if (i < POINTS_PER_FISH * 0.8) {
      const x = rand(-0.35, 0.4);
      const r = 0.13 * Math.sqrt(Math.max(0, 1 - Math.pow(x / 0.42, 2)));
      const a = Math.random() * Math.PI * 2;
      pts.push([x, Math.sin(a) * r, Math.cos(a) * r * 0.5]);
    } else {
      // forked tail
      const s = Math.random();
      const side = Math.random() < 0.5 ? 1 : -1;
      pts.push([-0.35 - s * 0.22, side * s * 0.16, 0]);
    }
  }
  return pts;
}

const _ray = new THREE.Vector3();
const _q = new THREE.Vector3();
const _ro = new THREE.Vector3();
const _rd = new THREE.Vector3();
const _inv = new THREE.Matrix4();

export function createFishSchool(scale = 1) {
  const fishCount = Math.max(60, Math.floor(200 * scale));
  const template = fishTemplate();
  const n = fishCount * POINTS_PER_FISH;
  const positions = new Float32Array(n * 3);
  const tints = new Float32Array(n);

  const fish = [];
  for (let f = 0; f < fishCount; f++) {
    const golden = Math.random() < 0.15 ? 1 : rand(0, 0.25);
    for (let i = 0; i < POINTS_PER_FISH; i++) tints[f * POINTS_PER_FISH + i] = golden;
    fish.push({
      p: new THREE.Vector3().randomDirection().multiplyScalar(4 * Math.cbrt(Math.random())).add(new THREE.Vector3(0, 0, -4)),
      v: new THREE.Vector3(rand(-1, 1), rand(-0.3, 0.3), rand(-1, 1)).setLength(rand(MIN_SPEED, MAX_SPEED)),
      phase: Math.random() * Math.PI * 2,
    });
  }

  const creature = new ParticleCreature({
    positions,
    tints,
    colorA: '#9fd8ff',
    colorB: '#ffd36e',
    size: 0.09,
    opacity: 0.85,
    radius: 1.5,
  });

  const target = new THREE.Vector3();
  const sep = new THREE.Vector3();
  const ali = new THREE.Vector3();
  const coh = new THREE.Vector3();
  const acc = new THREE.Vector3();
  const fwd = new THREE.Vector3();
  const side = new THREE.Vector3();
  const up = new THREE.Vector3();
  const worldUp = new THREE.Vector3(0, 1, 0);

  creature.center = new THREE.Vector3(); // middle of the school (local space)

  creature.tick = (time, dt, pointer) => {
    // Pointer ray in the school's own space (it may live inside a moved group)
    if (pointer.inside) {
      creature.object.updateMatrixWorld();
      _inv.copy(creature.object.matrixWorld).invert();
      _ro.copy(pointer.ray.origin).applyMatrix4(_inv);
      _rd.copy(pointer.ray.direction).transformDirection(_inv);
    }

    // The school wanders toward a slowly moving goal
    target.set(Math.sin(time * 0.13) * 14, Math.sin(time * 0.21) * 5, -5 + Math.cos(time * 0.17) * 7);

    for (let i = 0; i < fishCount; i++) {
      const a = fish[i];
      sep.set(0, 0, 0);
      ali.set(0, 0, 0);
      coh.set(0, 0, 0);
      let near = 0;

      for (let j = 0; j < fishCount; j++) {
        if (i === j) continue;
        const b = fish[j];
        const dx = a.p.x - b.p.x, dy = a.p.y - b.p.y, dz = a.p.z - b.p.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 > 12) continue;
        if (d2 < 0.8) sep.x += dx / (d2 + 0.01), sep.y += dy / (d2 + 0.01), sep.z += dz / (d2 + 0.01);
        ali.add(b.v);
        coh.add(b.p);
        near++;
      }

      acc.set(0, 0, 0);
      acc.addScaledVector(sep, 1.5);
      if (near > 0) {
        acc.addScaledVector(ali.divideScalar(near).sub(a.v), 0.6);
        acc.addScaledVector(coh.divideScalar(near).sub(a.p), 0.5);
      }
      acc.addScaledVector(_q.copy(target).sub(a.p), 0.08);

      // Stay inside the tank
      if (Math.abs(a.p.x) > BOUNDS.x) acc.x -= Math.sign(a.p.x) * 4;
      if (Math.abs(a.p.y) > BOUNDS.y) acc.y -= Math.sign(a.p.y) * 4;
      if (a.p.z < BOUNDS.zMin) acc.z += 4;
      if (a.p.z > BOUNDS.zMax) acc.z -= 4;

      // Flee from the finger / cursor
      if (pointer.inside) {
        _ray.copy(a.p).sub(_ro);
        const t = _ray.dot(_rd);
        _q.copy(_rd).multiplyScalar(t);
        _ray.sub(_q); // perpendicular from ray to fish
        const d = _ray.length();
        const R = pointer.down ? 5 : 3;
        if (d < R) acc.addScaledVector(_ray.normalize(), (1 - d / R) * (pointer.down ? 60 : 20));
      }

      a.v.addScaledVector(acc, dt);
      const speed = a.v.length();
      if (speed > MAX_SPEED) a.v.multiplyScalar(MAX_SPEED / speed);
      else if (speed < MIN_SPEED) a.v.multiplyScalar(MIN_SPEED / Math.max(speed, 1e-3));
    }

    // Move fish and write their points
    creature.center.set(0, 0, 0);
    for (let f = 0; f < fishCount; f++) {
      const a = fish[f];
      a.p.addScaledVector(a.v, dt);
      creature.center.addScaledVector(a.p, 1 / fishCount);
      fwd.copy(a.v).normalize();
      side.crossVectors(fwd, worldUp).normalize();
      up.crossVectors(side, fwd);
      const wiggle = Math.sin(time * 14 + a.phase);

      for (let i = 0; i < POINTS_PER_FISH; i++) {
        const [lx, ly, lz0] = template[i];
        const lz = lz0 + wiggle * 0.25 * Math.max(0, -lx - 0.05);
        const k = (f * POINTS_PER_FISH + i) * 3;
        positions[k] = a.p.x + fwd.x * lx + up.x * ly + side.x * lz;
        positions[k + 1] = a.p.y + fwd.y * lx + up.y * ly + side.y * lz;
        positions[k + 2] = a.p.z + fwd.z * lx + up.z * ly + side.z * lz;
      }
    }
    creature.markBaseDirty();
  };

  return creature;
}
