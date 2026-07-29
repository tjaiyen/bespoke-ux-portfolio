/**
 * VOLT — decorative pulsing 3D energy orb backdrop.
 * Vendored three.js, no network. Canvas is aria-hidden; all meaning is in the DOM.
 * Under prefers-reduced-motion: a single static frame, no animation loop.
 */
import * as THREE from "../../_vendor/three.module.js";

const canvas = document.getElementById("bg");
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
camera.position.set(0, 0, 7);

// Central energy orb — a bright icosphere core.
const core = new THREE.Mesh(
  new THREE.IcosahedronGeometry(1.6, 3),
  new THREE.MeshStandardMaterial({
    color: 0xff1f9c, emissive: 0xff1f9c, emissiveIntensity: 0.6,
    roughness: 0.25, metalness: 0.5, flatShading: true,
  }),
);
scene.add(core);

// Wireframe energy shell around the core.
const shell = new THREE.Mesh(
  new THREE.IcosahedronGeometry(2.3, 2),
  new THREE.MeshBasicMaterial({ color: 0x4d9bff, wireframe: true, transparent: true, opacity: 0.5 }),
);
scene.add(shell);

// A second acid-yellow orbital ring group.
const ring = new THREE.Mesh(
  new THREE.TorusGeometry(3.1, 0.04, 12, 120),
  new THREE.MeshBasicMaterial({ color: 0xf5f000, transparent: true, opacity: 0.75 }),
);
ring.rotation.x = 1.1;
scene.add(ring);

// Sparkling particle field for density.
const count = 700;
const positions = new Float32Array(count * 3);
for (let i = 0; i < count; i++) {
  const r = 5 + Math.random() * 9;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
  positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
  positions[i * 3 + 2] = r * Math.cos(phi);
}
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
const particles = new THREE.Points(
  pGeo,
  new THREE.PointsMaterial({ color: 0x4d9bff, size: 0.06, transparent: true, opacity: 0.8 }),
);
scene.add(particles);

// Lights.
scene.add(new THREE.AmbientLight(0x2a1a55, 1.2));
const key = new THREE.PointLight(0xff1f9c, 90); key.position.set(4, 4, 6); scene.add(key);
const fill = new THREE.PointLight(0x1f6bff, 70); fill.position.set(-5, -3, 4); scene.add(fill);
const rim = new THREE.PointLight(0xf5f000, 40); rim.position.set(0, 6, -4); scene.add(rim);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", () => { resize(); if (reduce) renderer.render(scene, camera); });
resize();

if (reduce) {
  core.rotation.set(0.5, 0.4, 0);
  shell.rotation.set(-0.3, 0.2, 0);
  renderer.render(scene, camera);
} else {
  renderer.setAnimationLoop((t) => {
    const s = 1 + Math.sin(t * 0.003) * 0.12; // pulse
    core.scale.setScalar(s);
    core.rotation.x = t * 0.0003;
    core.rotation.y = t * 0.0005;
    shell.rotation.x = -t * 0.0004;
    shell.rotation.y = t * 0.0003;
    shell.scale.setScalar(1 + Math.sin(t * 0.003 + 1) * 0.06);
    ring.rotation.z = t * 0.0004;
    particles.rotation.y = t * 0.00008;
    key.intensity = 90 + Math.sin(t * 0.004) * 40;
    renderer.render(scene, camera);
  });
}
