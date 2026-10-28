import * as THREE from 'three';
import { sharedUniforms, makeLayer } from './ParticleCreature.js';
import { Pointer } from './interaction.js';
import { createWhale } from './creatures/whale.js';
import { createJellyfish } from './creatures/jellyfish.js';
import { createManta } from './creatures/manta.js';
import { createFishSchool } from './creatures/fishSchool.js';
import { createStingray } from './creatures/stingray.js';
import { createTurtle } from './creatures/turtle.js';
import { createMarineSnow } from './ambient.js';
import { createEnvironment } from './environment/index.js';
import { createWater } from './surface/waterSurface.js';
import { createStars, createPolaris, createDipper, createNorthGlow, createShootingStar, createFarLight } from './surface/sky.js';
import { createBoat } from './surface/boat.js';
import { createRain } from './surface/rain.js';
import { createRopeCoil, createBottle, createFeather, createPaperBoat } from './surface/flotsam.js';
import { createSeabird } from './surface/seabird.js';
import { Motes } from './story/Motes.js';
import { Narration } from './story/narration.js';
import { Story } from './story/Story.js';

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);

// Fewer particles on phones / tablets
const isMobile = window.matchMedia('(pointer: coarse)').matches;
const scale = isMobile ? 0.6 : 1;

// Three layers with their own brightness and fog
const layers = {
  above: makeLayer({ fogNear: 18, fogFar: 140 }),
  below: makeLayer({ dim: 0.35, fogNear: 15, fogFar: 90, depthFade: 70, clipAbove: 1 }), // seen through the water
  sky: makeLayer({ fogNear: 1000, fogFar: 2000 }),
};

// ---------- under the water: the existing ocean, lowered beneath the surface ----------
const below = new THREE.Group();
below.position.y = -16;
scene.add(below);
const ocean = {
  ...createEnvironment(scale),
  snow: createMarineSnow(scale),
  whale: createWhale(scale),
  manta: createManta(scale),
  stingray: createStingray(scale),
  fish: createFishSchool(scale),
  turtle: createTurtle(scale),
  jelly1: createJellyfish({ position: new THREE.Vector3(-5, 10, -7), index: 0, scale }), // close under the boat
  jelly2: createJellyfish({ position: new THREE.Vector3(10, 6, -8), index: 1, scale }),
  jelly3: createJellyfish({ position: new THREE.Vector3(-3, -1, -16), index: 2, scale }),
};
const oceanList = Object.values(ocean).flat();
for (const c of oceanList) below.add(c.setLayer(layers.below).object);

// ---------- on the water and in the sky ----------
const water = createWater(scale).setLayer(layers.above);
const stars = createStars(scale).setLayer(layers.sky);
const polaris = createPolaris().setLayer(layers.sky);
const dipper = createDipper().map((s) => s.setLayer(layers.sky));
const northGlow = createNorthGlow().setLayer(layers.sky);
const shootingStar = createShootingStar().setLayer(layers.sky);
const farLight = createFarLight().setLayer(layers.sky);
const skyThings = [polaris, ...dipper, northGlow, shootingStar, farLight];
for (const s of skyThings) stars.object.add(s.object); // all of these travel with the sky dome
const boat = createBoat(scale);
for (const p of boat.parts) p.setLayer(layers.above);
const rain = createRain(scale).setLayer(layers.above);
const flotsam = { rope: createRopeCoil(), bottle: createBottle(), paperBoat: createPaperBoat(), feather: createFeather() };
for (const f of Object.values(flotsam)) f.setLayer(layers.above);
const bird = createSeabird().setLayer(layers.above);
const motes = new Motes();

scene.add(water.object, stars.object, boat.group, rain.object, bird.object, motes.group);
for (const f of Object.values(flotsam)) scene.add(f.object);

const everything = [...oceanList, water, stars, ...skyThings, ...boat.parts, rain, ...Object.values(flotsam), bird];

// ---------- the story ----------
const $ = (id) => document.getElementById(id);
const pointer = new Pointer(canvas, camera);
const story = new Story({
  camera,
  pointer,
  ocean,
  layers,
  water,
  stars,
  polaris,
  dipper,
  northGlow,
  shootingStar,
  farLight,
  boat,
  rain,
  flotsam,
  bird,
  motes,
  narration: new Narration($('narration')),
  hud: {
    overlay: $('overlay'),
    veil: $('veil'),
    bg: $('night'),
  },
});

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // A wider view on portrait screens so the boat and its surroundings fit
  camera.fov = camera.aspect < 1 ? 50 + (1 / camera.aspect - 1) * 14 : 50;
  camera.updateProjectionMatrix();
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  sharedUniforms.uScale.value = (size.y * 0.5) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
}
window.addEventListener('resize', resize);
resize();

const clock = new THREE.Clock();

function frame() {
  const dt = Math.min(clock.getDelta(), 1 / 30);
  const time = clock.elapsedTime;
  sharedUniforms.uTime.value = time;

  pointer.update();
  story.update(dt, time);
  for (const c of everything) {
    if (!c.live) continue;
    c.tick?.(time, dt, pointer);
    c.update(dt, pointer, camera);
  }
  motes.update(dt);
  pointer.endFrame();

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
