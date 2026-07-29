/**
 * Decorative 3D backdrop for Beacon, built on vendored three.js
 * (../../_vendor/three.module.js — a relative ES import under strict CSP).
 *
 * Theme: a calm grid of "monitors" — small nodes gently pulsing like healthy
 * uptime checks, plus a slow radar-like sweep ring. Trustworthy and quiet.
 *
 * Contract: the canvas is aria-hidden and never the sole content. Under
 * prefers-reduced-motion it renders ONE static frame (no animation loop).
 * No external assets are loaded.
 */
import * as THREE from "../../_vendor/three.module.js";

const canvas = document.getElementById("bg");
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
camera.position.set(0, 0, 12);

const TEAL = 0x2ec4b6;
const BLUE = 0x3d8bff;

// --- A grid of node "beacons" ---
const group = new THREE.Group();
scene.add(group);

const nodeGeo = new THREE.SphereGeometry(0.12, 16, 16);
const cols = 9, rows = 6, spacing = 2.0;
const nodes = [];
for (let x = 0; x < cols; x++) {
  for (let y = 0; y < rows; y++) {
    const mat = new THREE.MeshStandardMaterial({
      color: (x + y) % 3 === 0 ? BLUE : TEAL,
      emissive: (x + y) % 3 === 0 ? 0x0a2a55 : 0x0a3d38,
      roughness: 0.4,
      metalness: 0.3,
    });
    const node = new THREE.Mesh(nodeGeo, mat);
    node.position.set(
      (x - (cols - 1) / 2) * spacing,
      (y - (rows - 1) / 2) * spacing,
      Math.sin(x * 0.6 + y * 0.4) * 0.6,
    );
    node.userData.phase = (x + y) * 0.5;
    node.userData.baseZ = node.position.z;
    group.add(node);
    nodes.push(node);
  }
}
group.rotation.x = -0.25;
group.rotation.y = 0.35;

// --- A slow radar sweep ring ---
const ring = new THREE.Mesh(
  new THREE.RingGeometry(3.4, 3.5, 64),
  new THREE.MeshBasicMaterial({ color: TEAL, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
);
ring.rotation.x = -0.25;
ring.rotation.y = 0.35;
scene.add(ring);

// Lights
scene.add(new THREE.AmbientLight(0x9fb4ff, 0.7));
const key = new THREE.PointLight(0xffffff, 90);
key.position.set(6, 8, 10);
scene.add(key);
const fill = new THREE.PointLight(TEAL, 40);
fill.position.set(-8, -4, 6);
scene.add(fill);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", () => { resize(); if (reduce) renderer.render(scene, camera); });
resize();

function drawStatic() {
  for (const n of nodes) {
    const s = 1 + Math.sin(n.userData.phase) * 0.25;
    n.scale.setScalar(s);
  }
  ring.scale.setScalar(1);
  renderer.render(scene, camera);
}

if (reduce) {
  drawStatic();
} else {
  renderer.setAnimationLoop((t) => {
    const time = t * 0.001;
    for (const n of nodes) {
      const s = 1 + Math.sin(time * 1.5 + n.userData.phase) * 0.35;
      n.scale.setScalar(s);
      n.position.z = n.userData.baseZ + Math.sin(time * 0.8 + n.userData.phase) * 0.3;
    }
    group.rotation.y = 0.35 + Math.sin(time * 0.15) * 0.12;
    // radar-like pulse
    const pulse = (time * 0.4) % 1;
    ring.scale.setScalar(0.4 + pulse * 1.4);
    ring.material.opacity = 0.4 * (1 - pulse);
    renderer.render(scene, camera);
  });
}
