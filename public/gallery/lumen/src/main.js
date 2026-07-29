/**
 * Lumen — decorative 3D backdrop (three.js, vendored locally).
 *
 * A calm, slow-drifting field of soft points plus a gently rotating
 * wireframe icosahedron, tinted to the studio's dark/gold theme. Purely
 * decorative: the canvas is aria-hidden and never the sole content.
 *
 * Under prefers-reduced-motion it renders a single static frame (no loop).
 * Loads no external assets — safe under the strict CSP.
 */
import * as THREE from "../../_vendor/three.module.js";

const canvas = document.getElementById("bg");
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a0b11, 0.06);

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
camera.position.set(0, 0, 9);

// --- Drifting point field -------------------------------------------------
const COUNT = 900;
const positions = new Float32Array(COUNT * 3);
for (let i = 0; i < COUNT; i++) {
  positions[i * 3 + 0] = (Math.random() - 0.5) * 26;
  positions[i * 3 + 1] = (Math.random() - 0.5) * 18;
  positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
}
const pointGeo = new THREE.BufferGeometry();
pointGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
const points = new THREE.Points(
  pointGeo,
  new THREE.PointsMaterial({ color: 0xd8a24a, size: 0.05, transparent: true, opacity: 0.7, sizeAttenuation: true }),
);
scene.add(points);

// --- Central calm form ----------------------------------------------------
const shape = new THREE.Mesh(
  new THREE.IcosahedronGeometry(2.6, 1),
  new THREE.MeshStandardMaterial({
    color: 0xe7c07a,
    wireframe: true,
    emissive: 0x2a1e08,
    roughness: 0.6,
    metalness: 0.3,
    transparent: true,
    opacity: 0.28,
  }),
);
scene.add(shape);

scene.add(new THREE.AmbientLight(0xbfae8a, 0.7));
const key = new THREE.PointLight(0xffffff, 40);
key.position.set(6, 5, 8);
scene.add(key);
const rim = new THREE.PointLight(0xd8a24a, 25);
rim.position.set(-7, -4, 3);
scene.add(rim);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", () => { resize(); if (reduce) renderer.render(scene, camera); });
resize();

if (reduce) {
  shape.rotation.set(0.4, 0.6, 0);
  points.rotation.set(0.1, 0.2, 0);
  renderer.render(scene, camera);
} else {
  renderer.setAnimationLoop((t) => {
    const s = t * 0.001;
    shape.rotation.x = s * 0.06;
    shape.rotation.y = s * 0.09;
    points.rotation.y = s * 0.02;
    points.rotation.x = Math.sin(s * 0.1) * 0.05;
    camera.position.x = Math.sin(s * 0.15) * 0.6;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  });
}
