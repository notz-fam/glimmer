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
import { createFarReef } from './environment/farReef.js';
import { createLightShafts } from './environment/lightShafts.js';

// Drift-only version: just the ocean and its creatures, no story.

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);

// Fewer particles on phones / tablets
const isMobile = window.matchMedia('(pointer: coarse)').matches;
const scale = isMobile ? 0.6 : 1;

const layer = makeLayer({ fogNear: 25, fogFar: 75 });

const ocean = {
  ...createEnvironment(scale),
  snow: createMarineSnow(scale),
  whale: createWhale(scale),
  manta: createManta(scale),
  stingray: createStingray(scale),
  fish: createFishSchool(scale),
  turtle: createTurtle(scale),
  jelly1: createJellyfish({ position: new THREE.Vector3(-8, 4, -2), index: 0, scale }),
  jelly2: createJellyfish({ position: new THREE.Vector3(10, 6, -8), index: 1, scale }),
  jelly3: createJellyfish({ position: new THREE.Vector3(-3, -1, -16), index: 2, scale }),
};
const near = Object.values(ocean).flat();
for (const c of near) scene.add(c.setLayer(layer).object);

// Far ridges and light from the surface: longer fog, so they fade out further away
const farReef = createFarReef(scale).setLayer(makeLayer({ fogNear: 55, fogFar: 230 }));
const lightShafts = createLightShafts(scale).setLayer(makeLayer({ fogNear: 30, fogFar: 110 }));
scene.add(farReef.object, lightShafts.object);

const everything = [...near, farReef, lightShafts];

const pointer = new Pointer(canvas, camera);

// Optional fullscreen: button (bottom right) or the F key. Hidden where unsupported.
const fsButton = document.getElementById('fullscreen');
const root = document.documentElement;
const requestFs = root.requestFullscreen || root.webkitRequestFullscreen;
const exitFs = document.exitFullscreen || document.webkitExitFullscreen;
const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement;
function toggleFullscreen() {
  if (fsElement()) exitFs.call(document);
  else requestFs.call(root).catch?.(() => {});
}
if (requestFs) {
  fsButton.hidden = false;
  fsButton.addEventListener('click', toggleFullscreen);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'f' || e.key === 'F') toggleFullscreen();
  });
  const sync = () => fsButton.classList.toggle('on', !!fsElement());
  document.addEventListener('fullscreenchange', sync);
  document.addEventListener('webkitfullscreenchange', sync);
}

// Camera floats slowly in front of the scene
const CAM_BASE = new THREE.Vector3(0, 1, 30);
const LOOK_AT = new THREE.Vector3(0, 0, -5);

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // A wider view on portrait screens so the whole scene fits
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

  camera.position.set(
    CAM_BASE.x + Math.sin(time * 0.05) * 3,
    CAM_BASE.y + Math.sin(time * 0.08) * 1,
    CAM_BASE.z,
  );
  camera.lookAt(LOOK_AT);

  pointer.update();
  for (const c of everything) {
    c.tick?.(time, dt, pointer);
    c.update(dt, pointer, camera);
  }
  pointer.endFrame();

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
