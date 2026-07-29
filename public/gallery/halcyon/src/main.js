/**
 * Decorative 3D backdrop for Halcyon — a slowly rotating wireframe "synth module"
 * built from vendored three.js (../../_vendor/three.module.js, a relative ES import so
 * it loads under strict CSP `default-src 'self'`). Pure geometry, no external
 * assets, so nothing hits the network.
 *
 * Contract: the canvas is aria-hidden and NEVER the sole content — all meaning
 * lives in the semantic DOM. Under prefers-reduced-motion this renders a single
 * static frame (no animation loop), exactly how the accessibility audit sees it.
 */
import * as THREE from "../../_vendor/three.module.js";

const canvas = document.getElementById("bg");
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x04040a, 0.055);

const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
camera.position.set(0, 0.4, 9);

// --- The synth module: a chrome-neon wireframe assembly ------------------
const module = new THREE.Group();

const MAGENTA = 0xff3fb4;
const CYAN = 0x38e6f0;
const CHROME = 0xcdd4e6;

// Main chassis — a broad, shallow box in chrome wireframe.
const chassis = new THREE.Mesh(
  new THREE.BoxGeometry(5.2, 2.6, 1.2, 6, 3, 2),
  new THREE.MeshBasicMaterial({ color: CHROME, wireframe: true, transparent: true, opacity: 0.28 }),
);
module.add(chassis);

// A row of glowing "knobs" — cyan wireframe cylinders across the faceplate.
const knobGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.5, 20, 1, true);
const knobMat = new THREE.MeshBasicMaterial({ color: CYAN, wireframe: true, transparent: true, opacity: 0.6 });
for (let i = 0; i < 4; i++) {
  const knob = new THREE.Mesh(knobGeo, knobMat);
  knob.rotation.x = Math.PI / 2;
  knob.position.set(-1.65 + i * 1.1, 0.55, 0.7);
  module.add(knob);
}

// A bank of magenta "sliders" — thin tall boxes.
const sliderMat = new THREE.MeshBasicMaterial({ color: MAGENTA, wireframe: true, transparent: true, opacity: 0.55 });
for (let i = 0; i < 5; i++) {
  const slider = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.0, 0.18), sliderMat);
  slider.position.set(-1.8 + i * 0.9, -0.55, 0.68);
  module.add(slider);
}

// An orbiting torus — the modulation ring — for a subtle retrofuturist halo.
const ring = new THREE.Mesh(
  new THREE.TorusGeometry(3.7, 0.05, 8, 120),
  new THREE.MeshBasicMaterial({ color: CYAN, wireframe: true, transparent: true, opacity: 0.35 }),
);
ring.rotation.x = Math.PI / 2.4;
module.add(ring);

const ring2 = new THREE.Mesh(
  new THREE.TorusGeometry(4.4, 0.04, 8, 120),
  new THREE.MeshBasicMaterial({ color: MAGENTA, wireframe: true, transparent: true, opacity: 0.25 }),
);
ring2.rotation.x = Math.PI / 1.9;
module.add(ring2);

module.rotation.set(0.35, -0.5, 0.06);
scene.add(module);

// --- Starfield: scattered points for cinematic deep space ----------------
const starCount = 420;
const starPos = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  starPos[i * 3] = (Math.random() - 0.5) * 40;
  starPos[i * 3 + 1] = (Math.random() - 0.5) * 26;
  starPos[i * 3 + 2] = -8 - Math.random() * 22;
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
const stars = new THREE.Points(
  starGeo,
  new THREE.PointsMaterial({ color: 0xcdd4e6, size: 0.05, transparent: true, opacity: 0.5 }),
);
scene.add(stars);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", () => { resize(); if (reduce) renderer.render(scene, camera); });
resize();

if (reduce) {
  renderer.render(scene, camera);
} else {
  renderer.setAnimationLoop((t) => {
    module.rotation.y = -0.5 + t * 0.00006;
    module.rotation.x = 0.35 + Math.sin(t * 0.0002) * 0.06;
    ring.rotation.z = t * 0.0001;
    ring2.rotation.z = -t * 0.00008;
    stars.rotation.y = t * 0.00002;
    renderer.render(scene, camera);
  });
}
