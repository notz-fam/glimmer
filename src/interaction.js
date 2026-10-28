import * as THREE from 'three';

/**
 * A screen position turned into a 3D ray from the camera.
 * Creatures scatter around this ray. `prevRay` is last frame's ray (drag speed).
 */
export class ScreenPointer {
  constructor(camera) {
    this.camera = camera;
    this.ndc = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.ray = new THREE.Ray();
    this.prevRay = new THREE.Ray();
    this.inside = false; // whether it affects anything right now
    this.down = false; // pressed = strong push, otherwise a gentle nudge
    this.burst = false; // one-frame pop
    this.fresh = true; // no previous ray yet -> avoid a fake huge drag
  }

  /** Move to a point in normalized device coords (-1..1). */
  setNdc(x, y) {
    this.ndc.set(x, y);
  }

  /** Call once per frame before updating creatures. */
  update() {
    this.raycaster.setFromCamera(this.ndc, this.camera);
    if (this.fresh) {
      this.prevRay.copy(this.raycaster.ray);
      this.fresh = false;
    } else {
      this.prevRay.copy(this.ray);
    }
    this.ray.copy(this.raycaster.ray);
  }

  /** Call at the end of the frame. */
  endFrame() {
    this.burst = false;
  }
}

/** Mouse / touch driven pointer. */
export class Pointer extends ScreenPointer {
  constructor(dom, camera) {
    super(camera);

    const setFromEvent = (e) => {
      const rect = dom.getBoundingClientRect();
      this.setNdc(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
    };

    dom.addEventListener('pointerdown', (e) => {
      setFromEvent(e);
      if (!this.inside) this.fresh = true;
      this.inside = true;
      this.down = true;
      this.burst = true;
      try {
        dom.setPointerCapture(e.pointerId);
      } catch {
        // synthetic events have no capturable pointer
      }
    });

    dom.addEventListener('pointermove', (e) => {
      setFromEvent(e);
      if (!this.inside) this.fresh = true;
      // Touch only counts while the finger is down
      if (e.pointerType === 'mouse' || this.down) this.inside = true;
    });

    const release = (e) => {
      this.down = false;
      if (e.pointerType !== 'mouse') this.inside = false;
    };
    dom.addEventListener('pointerup', release);
    dom.addEventListener('pointercancel', release);
    dom.addEventListener('pointerleave', () => {
      if (!this.down) this.inside = false;
    });
  }
}
