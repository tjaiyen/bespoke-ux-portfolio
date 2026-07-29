/**
 * Auréa — decorative 3D backdrop (vendored three.js, relative import).
 *
 * A quiet, luxe field: a slow-drifting constellation of faint gold points and
 * a few softly-lit faceted forms suspended in charcoal darkness. Purely
 * decorative — the canvas is aria-hidden and all meaning lives in the DOM.
 * Under prefers-reduced-motion it renders a single static frame (no loop).
 * No external assets — pure geometry, so nothing hits the network.
 */
import * as THREE from "../../_vendor/three.module.js";

const canvas = document.getElementById("bg");
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0d0c0a, 0.06);

const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
camera.position.set(0, 0, 9);

const GOLD = 0xd8b26a;

// --- Faint drifting dust of gold points -------------------------------------
const count = 420;
const positions = new Float32Array(count * 3);
for (let i = 0; i < count; i++) {
  positions[i * 3 + 0] = (Math.random() - 0.5) * 26;
  positions[i * 3 + 1] = (Math.random() - 0.5) * 16;
  positions[i * 3 + 2] = (Math.random() - 0.5) * 18 - 4;
}
const dustGeo = new THREE.BufferGeometry();
dustGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
const dust = new THREE.Points(
  dustGeo,
  new THREE.PointsMaterial({
    color: GOLD,
    size: 0.045,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  }),
);
scene.add(dust);

// --- A few suspended faceted gems (octahedra) --------------------------------
const gemGroup = new THREE.Group();
const gemMat = new THREE.MeshStandardMaterial({
  color: GOLD,
  emissive: 0x2a1f0d,
  roughness: 0.28,
  metalness: 0.85,
  flatShading: true,
});
const gemSpecs = [
  { s: 1.15, x: -4.4, y: 1.6, z: -2 },
  { s: 0.7, x: 4.6, y: -1.8, z: -1 },
  { s: 0.5, x: 2.2, y: 2.4, z: -3.5 },
  { s: 0.85, x: -3.0, y: -2.2, z: -4 },
];
const gems = gemSpecs.map((g) => {
  const m = new THREE.Mesh(new THREE.OctahedronGeometry(g.s, 0), gemMat);
  m.position.set(g.x, g.y, g.z);
  m.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
  gemGroup.add(m);
  return m;
});
scene.add(gemGroup);

// --- Lighting: warm, low, restrained ----------------------------------------
scene.add(new THREE.AmbientLight(0x3a3020, 0.9));
const key = new THREE.PointLight(0xffe6b0, 40);
key.position.set(6, 7, 8);
scene.add(key);
const rim = new THREE.PointLight(0xd8b26a, 16);
rim.position.set(-8, -4, 4);
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
  gems.forEach((m, i) => m.rotation.set(0.5 + i * 0.2, 0.3 + i * 0.15, 0));
  renderer.render(scene, camera);
} else {
  renderer.setAnimationLoop((t) => {
    const s = t * 0.001;
    dust.rotation.y = s * 0.05;
    gemGroup.rotation.y = Math.sin(s * 0.15) * 0.15;
    gems.forEach((m, i) => {
      m.rotation.x += 0.0011 + i * 0.0002;
      m.rotation.y += 0.0016 + i * 0.0003;
      m.position.y += Math.sin(s * 0.6 + i) * 0.0016;
    });
    renderer.render(scene, camera);
  });
}
