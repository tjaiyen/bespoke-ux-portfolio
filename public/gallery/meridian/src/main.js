/**
 * Meridian — decorative hero backdrop.
 * A single dramatic, slowly-rotating abstract concrete form, floating in a
 * near-monochrome, gallery-quiet space. Built on the vendored three.js
 * (../../_vendor/three.module.js), loads no external assets, and honours
 * prefers-reduced-motion by rendering one static frame.
 *
 * The canvas is aria-hidden and never the sole content — all meaning lives in
 * the semantic DOM. Text sits on opaque cards so contrast stays verifiable.
 */
import * as THREE from "../../_vendor/three.module.js";

const canvas = document.getElementById("bg");
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
camera.position.set(0, 0, 9);

// One dramatic abstract concrete form: a chamfered, faceted mass.
// Assembled from a few intersecting solids to read as a single monolith.
const concrete = new THREE.MeshStandardMaterial({
  color: 0xcfccc4,
  roughness: 0.92,
  metalness: 0.02,
  flatShading: true,
});

const form = new THREE.Group();

const slab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 2.4, 2, 2, 2), concrete);
slab.rotation.set(0.0, 0.0, 0.0);
form.add(slab);

const wedge = new THREE.Mesh(new THREE.CylinderGeometry(0, 1.9, 2.6, 4), concrete);
wedge.rotation.set(0.2, Math.PI / 4, 0.5);
wedge.position.set(0.7, 0.4, 0.3);
wedge.scale.set(1, 1, 0.7);
form.add(wedge);

const bar = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.7, 0.7), concrete);
bar.position.set(-0.3, -1.1, 0.6);
bar.rotation.set(0, 0, 0.18);
form.add(bar);

const ico = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, 0), concrete);
ico.position.set(-0.9, 0.9, -0.4);
form.add(ico);

form.rotation.set(0.35, -0.5, 0);
scene.add(form);

// Quiet gallery lighting: soft fill + one directional key for crisp facets.
scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const key = new THREE.DirectionalLight(0xffffff, 2.1);
key.position.set(5, 7, 6);
scene.add(key);
const rim = new THREE.DirectionalLight(0xe6e3db, 0.6);
rim.position.set(-6, -2, -4);
scene.add(rim);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  // Nudge the form off-centre so it reads as a hero centrepiece beside content.
  form.position.x = w > 900 ? 2.2 : 0;
}
window.addEventListener("resize", () => { resize(); if (reduce) renderer.render(scene, camera); });
resize();

if (reduce) {
  renderer.render(scene, camera);
} else {
  renderer.setAnimationLoop((t) => {
    form.rotation.y = -0.5 + t * 0.00006;
    form.rotation.x = 0.35 + Math.sin(t * 0.00004) * 0.06;
    renderer.render(scene, camera);
  });
}
