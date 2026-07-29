/**
 * Decorative 3D backdrop for Cobalt, built on vendored three.js
 * (../../_vendor/three.module.js — a relative ES import under strict CSP).
 *
 * A calm, slowly drifting field of points with a soft wireframe globe — evokes
 * a quiet constellation of data. Purely decorative: the canvas is aria-hidden and
 * never the sole content. Under prefers-reduced-motion it renders ONE static
 * frame (no animation loop). No external assets are loaded.
 */
import * as THREE from "../../_vendor/three.module.js";

const canvas = document.getElementById("bg");
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
camera.position.set(0, 0, 8);

// Theme colors (decorative only; all text contrast lives in the opaque DOM).
const ACCENT = 0xa1db43;
const MUTED = 0x6f7a58;

// Soft wireframe globe — a calm centerpiece.
const globe = new THREE.Mesh(
  new THREE.IcosahedronGeometry(2.6, 2),
  new THREE.MeshBasicMaterial({ color: MUTED, wireframe: true, transparent: true, opacity: 0.28 }),
);
scene.add(globe);

// Drifting point field — a quiet constellation of data points.
const COUNT = 700;
const positions = new Float32Array(COUNT * 3);
for (let i = 0; i < COUNT; i++) {
  const r = 4 + Math.random() * 6;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
  positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
  positions[i * 3 + 2] = r * Math.cos(phi);
}
const pointsGeo = new THREE.BufferGeometry();
pointsGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
const points = new THREE.Points(
  pointsGeo,
  new THREE.PointsMaterial({ color: ACCENT, size: 0.055, transparent: true, opacity: 0.85, sizeAttenuation: true }),
);
scene.add(points);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", () => { resize(); if (reduce) renderer.render(scene, camera); });
resize();

if (reduce) {
  globe.rotation.set(0.4, 0.6, 0);
  points.rotation.set(0.4, 0.6, 0);
  renderer.render(scene, camera);
} else {
  renderer.setAnimationLoop((t) => {
    const s = t * 0.00006;
    globe.rotation.y = s;
    globe.rotation.x = s * 0.5;
    points.rotation.y = -s * 0.7;
    renderer.render(scene, camera);
  });
}
