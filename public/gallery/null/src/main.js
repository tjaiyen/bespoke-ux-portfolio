/**
 * Decorative 3D backdrop for NULL — a single stark wireframe cube.
 * three.js is vendored locally (../../_vendor/three.module.js), so nothing hits
 * the network under the strict CSP. The canvas is aria-hidden and never the
 * sole content. Under prefers-reduced-motion we render one static frame.
 */
import * as THREE from "../../_vendor/three.module.js";

const canvas = document.getElementById("bg");
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(0, 0, 7);

// A single stark wireframe cube — blunt, utilitarian, anti-design.
const INK = 0x0d0d0b;
const ACID = 0xb4ff00;

const cubeGeo = new THREE.BoxGeometry(3, 3, 3);
const edges = new THREE.EdgesGeometry(cubeGeo);

// Near-black outline cube.
const cube = new THREE.LineSegments(
  edges,
  new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.85 }),
);
scene.add(cube);

// A slightly smaller acid-green wireframe cube nested inside for a raw accent.
const inner = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(1.6, 1.6, 1.6)),
  new THREE.LineBasicMaterial({ color: ACID, transparent: true, opacity: 0.5 }),
);
scene.add(inner);

// Push the whole rig to the corner so it reads as a decorative accent.
cube.position.set(2.6, 0.4, 0);
inner.position.copy(cube.position);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", () => { resize(); if (reduce) renderer.render(scene, camera); });
resize();

if (reduce) {
  cube.rotation.set(0.6, 0.8, 0.15);
  inner.rotation.copy(cube.rotation);
  renderer.render(scene, camera);
} else {
  renderer.setAnimationLoop((t) => {
    cube.rotation.x = t * 0.00012 + 0.4;
    cube.rotation.y = t * 0.00018;
    inner.rotation.x = -t * 0.00016;
    inner.rotation.y = -t * 0.00022;
    renderer.render(scene, camera);
  });
}
