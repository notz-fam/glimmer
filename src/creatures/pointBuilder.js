// Collects points + tint values, then hands them out as typed arrays.
export class PointBuilder {
  constructor() {
    this.pos = [];
    this.tint = [];
  }

  add(x, y, z, tint = 0) {
    this.pos.push(x, y, z);
    this.tint.push(tint);
  }

  build() {
    return {
      positions: new Float32Array(this.pos),
      tints: new Float32Array(this.tint),
    };
  }
}

export const rand = (min = 0, max = 1) => min + Math.random() * (max - min);
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
