/**
 * Decorative 3D backdrop: a floating faceted "summit" (the goal metaphor) that
 * slowly hovers and rotates, tinted with Ascend's warm accent colors. Vendored
 * three.js (relative import) — no network, CSP-safe. Canvas is aria-hidden and
 * never the sole content. Under prefers-reduced-motion a single static frame is
 * drawn (no animation loop), exactly how the audit renders it.
 */
import * as THREE from "../../_vendor/three.module.js";

const canvas = document.getElementById("bg");
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
camera.position.set(0, 0.4, 7);

// Group holding the summit peak so we can hover + rotate it as one goal shape.
const summit = new THREE.Group();
scene.add(summit);

// Main peak: a cone (a stylized mountain summit).
const peak = new THREE.Mesh(
  new THREE.ConeGeometry(1.7, 3.0, 5),
  new THREE.MeshStandardMaterial({ color: 0xff7a3d, flatShading: true, roughness: 0.45, metalness: 0.25, emissive: 0x3a1405 }),
);
peak.position.y = -0.2;
summit.add(peak);

// A smaller golden foothill peak beside it for depth.
const foothill = new THREE.Mesh(
  new THREE.ConeGeometry(1.0, 1.7, 5),
  new THREE.MeshStandardMaterial({ color: 0xffb03d, flatShading: true, roughness: 0.5, metalness: 0.2, emissive: 0x3a2405 }),
);
foothill.position.set(1.6, -0.9, -0.6);
summit.add(foothill);

// A glowing flag/marker at the top: a small octahedron.
const flag = new THREE.Mesh(
  new THREE.OctahedronGeometry(0.28),
  new THREE.MeshStandardMaterial({ color: 0x2fd6a6, emissive: 0x0d5540, roughness: 0.3, metalness: 0.4 }),
);
flag.position.set(0, 1.55, 0);
summit.add(flag);

// Wireframe halo ring around the summit — a "progress" motif in 3D.
const halo = new THREE.Mesh(
  new THREE.TorusGeometry(2.6, 0.03, 12, 120),
  new THREE.MeshBasicMaterial({ color: 0xffb03d }),
);
halo.rotation.x = Math.PI / 2.2;
scene.add(halo);

scene.add(new THREE.AmbientLight(0xffd9b0, 0.55));
const key = new THREE.PointLight(0xffffff, 70);
key.position.set(4, 6, 6);
scene.add(key);
const rim = new THREE.PointLight(0x2fd6a6, 25);
rim.position.set(-5, -2, 3);
scene.add(rim);

summit.rotation.y = -0.4;

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
    summit.rotation.y = -0.4 + Math.sin(t * 0.00018) * 0.35;
    summit.position.y = Math.sin(t * 0.0006) * 0.18;
    flag.rotation.y = t * 0.0012;
    halo.rotation.z = t * 0.00025;
    renderer.render(scene, camera);
  });
}
