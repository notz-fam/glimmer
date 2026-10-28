import * as THREE from 'three';
import { SCENES, ENDING, START_ENV, TITLE, TOTAL_LIGHTS, POLARIS_LINE } from './scenes.js';
import { BOW_LOCAL, LANTERN_LOCAL, ROPE_LOCAL, GIFT_LOCAL } from '../surface/boat.js';
import { POLARIS_POS } from '../surface/sky.js';
import { waveHeight } from '../surface/waves.js';

// Under the water at the very start: an empty seabed
const TITLE_OCEAN = ['sand', 'rocks', 'snow', 'kelp', 'coralBranch', 'coralFan', 'bubbles'];

// How close (world units) the pointer ray must pass to touch each thing
const RADIUS = {
  traveler: 1.0, lantern: 1.1, boatRope: 0.9, gift: 0.8, scar0: 0.8, scar1: 0.8, scar2: 0.8,
  rope: 1.4, bottle: 1.4, paperBoat: 1.4, feather: 1.4, bird: 1.4,
  jelly1: 3.5, jelly2: 4, whale: 7, fish: 6, manta: 5, turtle: 3.2,
  shootingStar: 14, farLight: 14, polaris: 22,
};

// Flotsam drifts from far away to a resting spot near the boat (relative to the boat)
const FLOTSAM_PATH = {
  rope: [new THREE.Vector3(-16, 0, -10), new THREE.Vector3(-3.6, 0, -1.6)],
  bottle: [new THREE.Vector3(14, 0, -14), new THREE.Vector3(3.6, 0, -2.4)],
  paperBoat: [new THREE.Vector3(15, 0, -4), new THREE.Vector3(4.2, 0, 1.6)],
  feather: [new THREE.Vector3(-12, 0, -16), new THREE.Vector3(-2.8, 0, -3.4)],
};

const STAR_COLOR = new THREE.Color('#cfe6ff');
const HINT_COLOR = new THREE.Color('#ffe2a8');
const PLANKTON = new THREE.Color('#5ff2d0');
const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _water = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const ease = (u) => u * u * (3 - 2 * u);

export class Story {
  /**
   * ctx: { camera, pointer, ocean, layers, water, stars, polaris, dipper, northGlow,
   *        shootingStar, farLight, boat, rain, flotsam, bird, motes, narration, hud }
   */
  constructor(ctx) {
    Object.assign(this, ctx);
    this.started = false;
    this.ended = false;
    this.env = { ...START_ENV };
    this.goal = { ...START_ENV };
    this.level = 0; // lights in the lantern now
    this.gathered = 0; // lights gathered over the whole journey
    this.progress = 0; // 0..1, drives the "nearing the end" signs
    this.time = 0;
    this.timers = [];
    this.remaining = [];
    this.camOffset = new THREE.Vector3(0, 4.6, 14);
    this.camGoal = this.camOffset.clone();
    this.lookOffset = new THREE.Vector3(0, 0.3, -3);
    this.lookGoal = this.lookOffset.clone();
    this.glow = {};
    this.glowKeys = [];
    this.flotsamState = {};
    this.birdState = { phase: 'hidden', t: 0 };
    this.giftReady = false;
    this.shoot = { enabled: false, active: false, t: 0, wait: 0, from: new THREE.Vector3(), to: new THREE.Vector3() };
    this.hold = 0;
    this.trace = { len: 0, last: null };
    this.turnNorth = false;
    this.sailSpeed = 0;
    this.sailing = false;
    this.polarisReady = false;
    this.endReady = false;
    this.lastRipple = 0;
    this.lastActivity = 0;
    this.lastHint = 0;
    this.northGlowLevel = 0;
    this._lantern = new THREE.Vector3();
    this._polaris = new THREE.Vector3();

    for (const [key, c] of Object.entries(this.ocean)) {
      for (const x of [].concat(c)) x.setPresent(TITLE_OCEAN.includes(key), true);
    }
    for (const c of [...Object.values(this.flotsam), this.bird, this.polaris, ...this.dipper, this.shootingStar, this.farLight, this.boat.gift]) {
      c.setPresent(false, true);
    }
    this.boat.setLantern(0);
    this.showOverlay('title');
  }

  after(seconds, fn) {
    this.timers.push({ at: this.time + seconds, fn });
  }

  creatures(key) {
    return [].concat(this.ocean[key] ?? []);
  }

  // ---------- flow: scenes made of beats, one running into the next ----------

  start() {
    this.started = true;
    this.lastActivity = this.time;
    this.showOverlay(null);
    this.startScene(0);
  }

  startScene(i) {
    this.sceneIndex = i;
    this.scene = SCENES[i];
    this.beatIndex = -1;
    Object.assign(this.goal, this.scene.env);
    this.nextBeat();
  }

  nextBeat() {
    this.beatIndex++;
    if (this.beatIndex >= this.scene.beats.length) return this.startScene(this.sceneIndex + 1);

    const beat = (this.beat = this.scene.beats[this.beatIndex]);
    this.advancing = false;
    this.remaining = (beat.targets ?? []).map((t) => ({ kind: 'touch', ...t, left: t.times ?? 1, used: 0 }));
    this.hold = 0;
    this.trace.len = 0;
    Object.assign(this.goal, beat.env);
    for (const ev of beat.events ?? []) this.event(ev);
    if (beat.say) this.after(0.8, () => this.narration.show(beat.say));
    if (beat.wait) {
      this.advancing = true;
      this.after(beat.wait, () => this.nextBeat());
    }
  }

  /** Things that happen when a beat starts. */
  event(name) {
    const [kind, key] = name.split(':');
    if (kind === 'appear') {
      for (const c of this.creatures(key)) c.appear(12);
      if (key === 'fish' || key === 'manta') this.glowKeys.push(key); // they shine in the dark
    } else if (kind === 'flotsam') {
      const [from, to] = FLOTSAM_PATH[key];
      this.flotsamState[key] = { from, to, t: 0, done: false };
      this.flotsam[key].appear(4);
    } else if (kind === 'shootingStar') {
      Object.assign(this.shoot, { enabled: true, active: false, wait: 1.5 });
    } else if (kind === 'farLight') {
      this.farLight.appear(6);
    } else if (kind === 'bird') {
      this.after(1.5, () => {
        this.birdState = { phase: 'flying', t: 0 };
        this.bird.appear(5);
      });
    } else if (kind === 'birdLoop') {
      this.birdState = { phase: 'loop', t: 0 };
    } else if (kind === 'polaris') {
      this.glowKeys = [];
      this.lookGoal.set(0, 4, -40); // look up toward the northern sky
      this.after(3.5, () => this.releaseLights());
    }
  }

  /** The end: every gathered light rises to the sky and becomes the north star. */
  releaseLights() {
    const n = this.level;
    let arrived = 0;
    if (n === 0) this.formPolaris();
    for (let i = 0; i < n; i++) {
      this.after(i * 0.2, () => {
        this.level--;
        this.motes.launch(this.boat.toWorld(LANTERN_LOCAL, _a), () => this.polarisWorld(), {
          duration: 3.4,
          lift: 10,
          color: STAR_COLOR,
          size: 1.2,
          onArrive: () => {
            arrived++;
            if (arrived === n) this.formPolaris();
          },
        });
      });
    }
  }

  formPolaris() {
    this.polaris.appear(30);
    Object.assign(this.goal, { stars: 1, starPath: 1, pose: 2 });
    this.narration.show(POLARIS_LINE);
    this.turnNorth = true;
    this.after(2.5, () => (this.polarisReady = true));
  }

  finish() {
    this.after(4.5, () => {
      this.ended = true;
      this.sailing = true;
      this.narration.clear(true);
      this.camGoal.set(0, 11, 30);
      this.lookGoal.set(0, 6, -40);
      this.showOverlay('ending');
      this.after(3, () => (this.endReady = true));
    });
  }

  // ---------- touching ----------

  /** Nearest touchable target of the given kinds along the pointer ray. */
  pick(kinds) {
    const ray = this.pointer.ray;
    let best = null;
    let bestAlong = Infinity;
    for (const t of this.remaining) {
      if (t.left <= 0 || !kinds.includes(t.kind)) continue;
      const r = this.targetPos(t.key, _v);
      if (!r) continue;
      const along = _b.copy(_v).sub(ray.origin).dot(ray.direction);
      if (along > 0 && along < bestAlong && ray.distanceToPoint(_v) < r) {
        best = t;
        bestAlong = along;
        _a.copy(_v);
      }
    }
    return best && { target: best, pos: _a.clone() };
  }

  onTap() {
    if (!this.started) return this.start();
    if (this.ended) {
      if (this.endReady) location.reload();
      return;
    }
    this.lastActivity = this.time;

    const onWater = this.pointer.ray.intersectPlane(_water, _w);
    if (onWater) this.water.ripple(_w.x, _w.z, this.time, 1);

    const hit = this.pick(['touch']);
    if (hit) return this.collect(hit.target, hit.pos);
    // The shooting star is fast: touching anywhere in the sky while it passes counts
    const shot = this.remaining.find((t) => t.key === 'shootingStar' && t.left > 0);
    if (shot && this.shoot.active && this.pointer.ray.direction.y > 0) {
      return this.collect(shot, this.shootingStar.object.getWorldPosition(new THREE.Vector3()));
    }
    const water = this.remaining.find((t) => t.kind === 'water' && t.left > 0);
    if (water && onWater) this.collect(water, _w.clone().setY(0.3));
  }

  /** Called every frame while a finger is down: drawing on the water, holding a light. */
  whileDown(dt) {
    const time = this.time;
    const onWater = this.pointer.ray.intersectPlane(_water, _w);

    // Drawing on the water leaves a glowing trail (like sea sparkle)
    if (onWater) {
      if (time - this.lastRipple > 0.18) {
        this.lastRipple = time;
        this.water.ripple(_w.x, _w.z, time, 0.6);
      }
      for (let k = 0; k < 3; k++) {
        _b.set(_w.x + (Math.random() - 0.5) * 0.4, 0.05, _w.z + (Math.random() - 0.5) * 0.4);
        this.motes.sparkle(_b, PLANKTON, { fade: 0.35, rise: 0.04, spread: 0.15, size: 0.14 });
      }
      if (this.trace.last && this.trace.last.distanceTo(_w) < 3) this.trace.len += this.trace.last.distanceTo(_w);
      this.trace.last = (this.trace.last ?? new THREE.Vector3()).copy(_w);
      const tr = this.remaining.find((t) => t.kind === 'trace' && t.left > 0);
      if (tr && this.trace.len >= tr.length) {
        this.trace.len = 0;
        this.collect(tr, _w.clone().setY(0.3));
      }
    }

    // Keeping a finger on something
    const hit = this.pick(['hold']);
    if (hit) {
      this.hold += dt;
      this.lastActivity = time;
      if (Math.random() < 0.6) this.motes.sparkle(hit.pos, HINT_COLOR, { fade: 1.2, rise: 0.6, spread: 1.2 });
      if (this.hold >= hit.target.hold) {
        this.hold = 0;
        this.collect(hit.target, hit.pos);
      }
    } else {
      this.hold = Math.max(0, this.hold - dt * 2);
    }
  }

  /** World position of a target; returns its touch radius, or 0 if it can't be touched now. */
  targetPos(key, out) {
    const boat = this.boat;
    switch (key) {
      case 'traveler':
        boat.toWorld(boat.travelerLocal(out), out);
        break;
      case 'lantern':
        boat.toWorld(LANTERN_LOCAL, out);
        break;
      case 'boatRope':
        boat.toWorld(ROPE_LOCAL, out);
        break;
      case 'gift':
        if (!this.giftReady) return 0;
        boat.toWorld(GIFT_LOCAL, out);
        break;
      case 'scar0':
      case 'scar1':
      case 'scar2':
        boat.toWorld(boat.scars[+key[4]].center, out);
        break;
      case 'rope':
      case 'bottle':
      case 'paperBoat':
      case 'feather': {
        const st = this.flotsamState[key];
        if (!st || st.done || st.t < 3) return 0;
        this.flotsam[key].object.getWorldPosition(out);
        break;
      }
      case 'fish': {
        const fish = this.ocean.fish;
        if (!fish.live) return 0;
        fish.object.localToWorld(out.copy(fish.center));
        break;
      }
      case 'bird':
        if (this.birdState.phase !== 'perched') return 0;
        this.bird.object.getWorldPosition(out);
        break;
      case 'shootingStar':
        if (!this.shoot.active || this.shoot.t < 0.15) return 0;
        this.shootingStar.object.getWorldPosition(out);
        break;
      case 'farLight':
        if (!this.farLight.live) return 0;
        this.farLight.object.getWorldPosition(out);
        break;
      case 'polaris':
        if (!this.polarisReady) return 0;
        this.polaris.object.getWorldPosition(out);
        break;
      default: {
        const c = this.ocean[key];
        if (!c?.live) return 0;
        c.object.getWorldPosition(out);
      }
    }
    return RADIUS[key] ?? 1.2;
  }

  collect(t, pos) {
    const line = t.lines[Math.min(t.used, t.lines.length - 1)];
    t.used++;
    t.left--;
    this.lastActivity = this.time;
    this.narration.show(line);
    this.react(t.key);

    if (t.key === 'polaris') return this.finish();
    this.motes.launch(pos, () => this.boat.toWorld(LANTERN_LOCAL, this._lantern), {
      onArrive: () => {
        this.level++;
        this.gathered++;
        this.revealDipper();
      },
    });
  }

  /** How the touched thing responds. */
  react(key) {
    const boat = this.boat;
    if (this.flotsam[key]) {
      this.flotsam[key].shake(2.5);
      this.flotsam[key].setPresent(false);
      this.flotsamState[key].done = true;
    } else if (key.startsWith('scar')) {
      const scar = boat.scars[+key[4]];
      scar.shake(0.8);
      scar.setPresent(false); // the wound fades away
    } else if (key === 'traveler') {
      boat.traveler.shake(0.4);
    } else if (key === 'boatRope') {
      boat.hull.shake(0.3);
    } else if (key === 'gift') {
      boat.gift.shake(1);
      boat.gift.setPresent(false);
    } else if (key === 'bird') {
      this.bird.shake(0.4);
    } else if (key === 'shootingStar') {
      this.shoot.enabled = false;
      this.shootingStar.setPresent(false);
    } else if (key === 'farLight') {
      this.farLight.setPresent(false); // it goes out
    } else if (key !== 'lantern' && key !== 'polaris') {
      for (const c of this.creatures(key)) c.shake(1.5);
    }
  }

  /** The Little Dipper fills in, one star for every seventh of the journey. */
  revealDipper() {
    const shown = Math.min(this.dipper.length, Math.floor((this.gathered / TOTAL_LIGHTS) * (this.dipper.length + 1)));
    for (let i = 0; i < shown; i++) if (this.dipper[i].presenceTarget === 0) this.dipper[i].appear(8);
  }

  polarisWorld() {
    return this.stars.object.localToWorld(this._polaris.set(POLARIS_POS.x, POLARIS_POS.y, POLARIS_POS.z));
  }

  // ---------- per frame ----------

  update(dt, time) {
    this.time = time;
    for (let i = this.timers.length - 1; i >= 0; i--) {
      if (time >= this.timers[i].at) this.timers.splice(i, 1)[0].fn();
    }

    // Beat done -> next one, once the last light has reached the lantern
    if (this.started && !this.ended && !this.advancing && this.remaining.length &&
        this.remaining.every((t) => t.left <= 0) && this.motes.inFlight === 0 && this.beat.targets[0].key !== 'polaris') {
      this.advancing = true;
      this.after(2.2, () => this.nextBeat());
    }

    if (this.pointer.burst) this.onTap();
    if (this.pointer.down && this.started && !this.ended) this.whileDown(dt);
    else this.trace.last = null;

    this.progress += (this.gathered / TOTAL_LIGHTS - this.progress) * (1 - Math.exp(-dt * 0.5));
    this.updateWorld(dt, time);
    this.updateBoat(dt, time);
    this.updateFlotsam(dt, time);
    this.updateBird(dt, time);
    this.updateShootingStar(dt);
    this.updateCamera(dt, time);
    this.updateHints(time);
  }

  updateWorld(dt) {
    const k = 1 - Math.exp(-dt * 0.7);
    for (const key of Object.keys(this.env)) {
      const rate = key === 'pose' ? 1 - Math.exp(-dt * 0.35) : k;
      this.env[key] += (this.goal[key] - this.env[key]) * rate;
    }
    const e = this.env;
    const wu = this.water.material.uniforms;
    wu.uWaveAmp.value = e.wave;
    wu.uGlint.value = e.glint;
    wu.uStarPath.value = e.starPath;
    this.stars.material.uniforms.uOpacity.value = 0.95 * e.stars;
    this.rain.material.uniforms.uOpacity.value = 0.9 * e.rain;
    this.layers.below.uDim.value = e.below;
    this.layers.above.uDim.value = e.above;
    this.hud.veil.style.opacity = e.veil.toFixed(3);
    this.boat.setPose(e.pose);

    // The north horizon slowly brightens as the journey nears its end
    const glowGoal = this.polaris.presenceTarget ? 0.45 : 0.03 + this.progress * 0.3;
    this.northGlowLevel += (glowGoal - this.northGlowLevel) * k;
    this.northGlow.material.uniforms.uOpacity.value = this.northGlowLevel * (1 - e.veil);

    // The guiding stars fade in the dark too, but never fully disappear
    for (const d of this.dipper) d.material.uniforms.uOpacity.value = 0.9 * Math.min(1, Math.max(0.3, e.stars * 2.5));

    // Creatures that shine in the dark
    for (const key of ['fish', 'manta']) {
      const g = (this.glow[key] ?? 0) + ((this.glowKeys.includes(key) && e.veil > 0.1 ? 1 : 0) - (this.glow[key] ?? 0)) * k;
      this.glow[key] = g;
      for (const c of this.creatures(key)) c.material.uniforms.uOpacity.value = c.baseOpacity * (1 + 3 * g);
    }

    // Holding the lantern makes it swell
    this.boat.lantern.material.uniforms.uPulse.value = this.hold * 0.25;
  }

  updateBoat(dt, time) {
    const boat = this.boat;
    if (this.turnNorth) {
      boat.heading += (Math.PI / 2 - boat.heading) * (1 - Math.exp(-dt * 0.5));
    } else {
      // Drifting aimlessly at first; little by little it comes to face north
      const drift = 0.35 + Math.sin(time * 0.05) * 0.25 * (1 - this.progress);
      boat.heading = drift + (Math.PI / 2 - drift) * this.progress * 0.6;
    }
    if (this.sailing) {
      this.sailSpeed += (1.4 - this.sailSpeed) * (1 - Math.exp(-dt * 0.4));
      boat.group.position.x += Math.cos(boat.heading) * this.sailSpeed * dt;
      boat.group.position.z -= Math.sin(boat.heading) * this.sailSpeed * dt;
    }
    boat.float(time, this.env.wave);
    boat.setLantern(this.level / TOTAL_LIGHTS);

    // The sea, rain and sky travel with the boat
    const p = boat.group.position;
    this.water.object.position.set(p.x, 0, p.z);
    const wu = this.water.material.uniforms;
    wu.uWaterOffset.value.set(p.x, p.z);
    boat.toWorld(LANTERN_LOCAL, this._lantern);
    wu.uLantern.value.set(this._lantern.x, this._lantern.y, this._lantern.z, (this.level / TOTAL_LIGHTS) * 0.9);
    this.rain.object.position.set(p.x, 0, p.z);
  }

  updateFlotsam(dt, time) {
    const bp = this.boat.group.position;
    for (const [key, st] of Object.entries(this.flotsamState)) {
      if (st.done) continue;
      st.t += dt;
      const o = this.flotsam[key].object;
      o.position.copy(st.from).lerp(st.to, ease(Math.min(1, st.t / 14))).add(bp);
      o.position.y = waveHeight(o.position.x, o.position.z, time, this.env.wave) + 0.06;
      o.rotation.y += dt * 0.12;
      o.rotation.z = Math.sin(time * 0.8 + st.from.x) * 0.15;
    }
  }

  updateBird(dt, time) {
    const st = this.birdState;
    if (st.phase === 'hidden') return;
    const o = this.bird.object;
    const flap = this.bird.material.uniforms.uFlap;
    const bp = this.boat.group.position;
    const perch = this.boat.toWorld(BOW_LOCAL, _b).add(_v.set(0, 0.2, 0));
    const prev = o.position.clone();
    st.t += dt;

    const curve = (p0, p1, p2, u) => {
      const a = 1 - u;
      o.position.set(
        a * a * p0.x + 2 * a * u * p1.x + u * u * p2.x,
        a * a * p0.y + 2 * a * u * p1.y + u * u * p2.y,
        a * a * p0.z + 2 * a * u * p1.z + u * u * p2.z,
      );
    };

    if (st.phase === 'flying') {
      // swoop down from the sky to the bow
      const u = ease(Math.min(1, st.t / 7));
      curve(_a.set(bp.x + 12, 9, bp.z - 16), _w.set(bp.x + 4, 7, bp.z - 4), perch, u);
      flap.value = 1;
      if (u >= 1) Object.assign(st, { phase: 'perched', t: 0 });
    } else if (st.phase === 'loop') {
      // circles high over the boat
      const a = st.t * 0.75;
      o.position.set(bp.x + Math.cos(a) * 7, 5 + Math.sin(st.t * 1.3) * 0.8, bp.z - 2 + Math.sin(a) * 7);
      flap.value = 1;
      if (st.t > 8.4) Object.assign(st, { phase: 'returning', t: 0, from: o.position.clone() });
    } else if (st.phase === 'returning') {
      const u = ease(Math.min(1, st.t / 3));
      curve(st.from, _w.set((st.from.x + perch.x) / 2, 4, (st.from.z + perch.z) / 2), perch, u);
      flap.value = 1;
      if (u >= 1) {
        Object.assign(st, { phase: 'perched', t: 0 });
        this.boat.gift.appear(2);
        this.giftReady = true;
      }
    } else {
      o.position.copy(perch);
      o.position.y += Math.abs(Math.sin(time * 1.3)) * 0.02;
      flap.value = Math.max(0, flap.value - dt * 1.2);
    }

    if (st.phase === 'perched') {
      o.rotation.set(0, this.boat.heading + Math.PI, 0); // faces back toward the traveler
    } else {
      const vx = o.position.x - prev.x;
      const vz = o.position.z - prev.z;
      if (Math.abs(vx) + Math.abs(vz) > 1e-5) o.rotation.set(0, Math.atan2(-vz, vx), 0);
    }
  }

  /** A shooting star crosses the sky again and again until it's caught. */
  updateShootingStar(dt) {
    const s = this.shoot;
    if (!s.enabled) return;
    const star = this.shootingStar;
    if (!s.active) {
      s.wait -= dt;
      if (s.wait > 0) return;
      s.active = true;
      s.t = 0;
      // Pick the path on screen so it is always in view (any aspect ratio), then place it far away in the sky
      const top = 0.55 + Math.random() * 0.25;
      this.skyPoint(-0.75 + Math.random() * 0.2, top, s.from);
      this.skyPoint(0.35 + Math.random() * 0.3, top - 0.3, s.to);
      star.object.rotation.set(0, 0, Math.atan2(s.to.y - s.from.y, s.to.x - s.from.x));
      star.setPresent(true, true);
    }
    s.t += dt;
    const u = s.t / 4.2;
    star.object.position.copy(s.from).lerp(s.to, u);
    if (u >= 1) {
      s.active = false;
      s.wait = 4;
      star.setPresent(false, true);
    }
  }

  /** A point in the sky dome (its local space) seen at screen position (x, y) in -1..1. */
  skyPoint(x, y, out) {
    const cam = this.camera;
    out.set(x, y, 0.5).unproject(cam).sub(cam.position).normalize().multiplyScalar(130).add(cam.position);
    return this.stars.object.worldToLocal(out);
  }

  updateCamera(dt, time) {
    const k = 1 - Math.exp(-dt * 0.6);
    this.camOffset.lerp(this.camGoal, k);
    this.lookOffset.lerp(this.lookGoal, k);
    const bp = this.boat.group.position;
    const cam = this.camera;
    cam.position.set(bp.x, 0, bp.z).add(this.camOffset);
    cam.position.x += Math.sin(time * 0.07) * 0.8;
    cam.position.y += Math.sin(time * 0.11) * 0.25;
    cam.lookAt(_v.set(bp.x, 0, bp.z).add(this.lookOffset));
    cam.updateMatrixWorld();
    this.stars.object.position.set(cam.position.x, 0, cam.position.z);

    // Keep the CSS sky gradient's horizon where the real horizon is
    _v.set(cam.position.x, 0, cam.position.z - 1000).project(cam);
    this.hud.bg.style.setProperty('--h', `${((1 - (_v.y * 0.5 + 0.5)) * 100).toFixed(1)}%`);
  }

  /** If nothing has happened for a while, quietly sparkle around what can be touched. */
  updateHints(time) {
    if (!this.started || this.ended || time - this.lastActivity < 12 || time - this.lastHint < 5) return;
    this.lastHint = time;
    for (const t of this.remaining) {
      if (t.left <= 0) continue;
      if (t.kind === 'water' || t.kind === 'trace') {
        this.motes.hint(this.boat.toWorld(_v.set(0, 0, 2.6), _w).setY(0.15), t.kind === 'trace' ? PLANKTON : HINT_COLOR, 1.2);
      } else if (this.targetPos(t.key, _w)) {
        this.motes.hint(_w, HINT_COLOR, Math.min(2.5, RADIUS[t.key] * 0.7));
      }
      break;
    }
  }

  // ---------- title / ending ----------

  showOverlay(kind) {
    const o = this.hud.overlay;
    if (kind === 'title') {
      o.innerHTML = `
        <h1>${TITLE.name}</h1>
        <p class="sub">${TITLE.sub}</p>
        <p class="blink">タップしてはじめる</p>
        <p class="hint">${TITLE.hint}</p>`;
    } else if (kind === 'ending') {
      o.innerHTML = `
        <p class="end-line">${ENDING.line}</p>
        <p class="blink">${ENDING.again}</p>`;
    }
    o.classList.toggle('show', !!kind);
    o.classList.toggle('ending', kind === 'ending');
  }
}
