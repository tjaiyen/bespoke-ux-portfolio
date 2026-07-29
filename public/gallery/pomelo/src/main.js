/**
 * Decorative 3D backdrop for Pomelo — a drift of translucent citrus "bubbles"
 * (spheres in sunset orange, hot pink and zesty lime) floating up a light scene.
 *
 * Built on three.js, vendored locally at ../../_vendor/three.module.js (a relative
 * ES import, so it loads under the strict CSP `default-src 'self'`). No external
 * assets — pure geometry — so nothing hits the network.
 *
 * Contract: the canvas is aria-hidden and NEVER the sole content; all meaning
 * lives in the semantic DOM. Under prefers-reduced-motion we render a single
 * static frame (no animation loop), exactly how the accessibility audit sees it.
 * Text lives on opaque cards above, so contrast stays verifiable.
 */
import * as THREE from "../../_vendor/three.module.js";

const canvas = document.getElementById("bg");
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
camera.position.set(0, 0, 14);

// Citrus palette for the bubbles.
const palette = [0xff6a1f, 0xff3d8b, 0x7bd320, 0xffd400];

const bubbles = [];
const group = new THREE.Group();
scene.add(group);

const geo = new THREE.SphereGeometry(1, 32, 24);
const COUNT = 26;
for (let i = 0; i < COUNT; i++) {
  const mat = new THREE.MeshStandardMaterial({
    color: palette[i % palette.length],
    roughness: 0.25,
    metalness: 0.05,
    transparent: true,
    opacity: 0.6,
  });
  const m = new THREE.Mesh(geo, mat);
  const scale = 0.35 + Math.random() * 1.15;
  m.scale.setScalar(scale);
  m.position.set(
    (Math.random() - 0.5) * 22,
    (Math.random() - 0.5) * 20,
    (Math.random() - 0.5) * 8 - 2,
  );
  bubbles.push({
    mesh: m,
    speed: 0.35 + Math.random() * 0.7,
    drift: (Math.random() - 0.5) * 0.4,
    phase: Math.random() * Math.PI * 2,
  });
  group.add(m);
}

// Bright, cheerful lighting for a light theme.
scene.add(new THREE.AmbientLight(0xffffff, 1.1));
const key = new THREE.DirectionalLight(0xffffff, 1.8);
key.position.set(5, 8, 10);
scene.add(key);
const warm = new THREE.PointLight(0xffb26b, 40);
warm.position.set(-8, -4, 6);
scene.add(warm);
const cool = new THREE.PointLight(0xff8fc4, 30);
cool.position.set(9, 5, 4);
scene.add(cool);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", () => { resize(); if (reduce) renderer.render(scene, camera); });
resize();

const TOP = 11;
const BOTTOM = -11;

if (reduce) {
  renderer.render(scene, camera);
} else {
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const t = clock.getElapsedTime();
    for (const b of bubbles) {
      b.mesh.position.y += b.speed * 0.02;
      b.mesh.position.x += Math.sin(t * 0.5 + b.phase) * 0.008 + b.drift * 0.004;
      if (b.mesh.position.y > TOP) {
        b.mesh.position.y = BOTTOM;
        b.mesh.position.x = (Math.random() - 0.5) * 22;
      }
    }
    group.rotation.z = Math.sin(t * 0.1) * 0.03;
    renderer.render(scene, camera);
  });
}
