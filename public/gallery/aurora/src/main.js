/**
 * Aurora Labs — decorative 3D crystal backdrop, built on three.js (vendored
 * locally at ../../_vendor/three.module.js — a relative ES import under the strict
 * CSP `default-src 'self'`, no external assets).
 *
 * Contract: the canvas is aria-hidden and NEVER the sole content — all meaning
 * lives in the semantic DOM. Under prefers-reduced-motion this renders a single
 * static frame (no animation loop), exactly how the accessibility audit sees it.
 *
 * The crystal reacts to nothing: it slowly morphs and drifts on a fixed clock,
 * indifferent to pointer or scroll — calm, ambient, decorative.
 */
import * as THREE from "../../_vendor/three.module.js";

const canvas = document.getElementById("bg");
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x05060f, 0.06);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(0, 0, 7);

// --- The crystal ------------------------------------------------------------
// A faceted icosahedron whose vertices we nudge each frame, so it appears to
// slowly morph and breathe. Deep-indigo body with a cyan inner glow.
const geometry = new THREE.IcosahedronGeometry(2.1, 4);
const basePositions = geometry.attributes.position.array.slice();
const vertexCount = geometry.attributes.position.count;

// Precompute a stable per-vertex phase so the morph is smooth and repeatable.
const phases = new Float32Array(vertexCount);
for (let i = 0; i < vertexCount; i++) phases[i] = (i % 97) * 0.13;

const crystal = new THREE.Mesh(
  geometry,
  new THREE.MeshPhysicalMaterial({
    color: 0x3a2fb0,
    emissive: 0x120a4a,
    metalness: 0.35,
    roughness: 0.18,
    transmission: 0.35,
    thickness: 1.4,
    clearcoat: 0.6,
    clearcoatRoughness: 0.3,
    flatShading: true,
  }),
);
scene.add(crystal);

// A crisp wireframe overlay to accent the facets in cyan.
const wire = new THREE.LineSegments(
  new THREE.WireframeGeometry(geometry),
  new THREE.LineBasicMaterial({ color: 0x35e0e6, transparent: true, opacity: 0.28 }),
);
crystal.add(wire);

// --- Lights: indigo ambient + cyan/indigo key lights ------------------------
scene.add(new THREE.AmbientLight(0x2a2f66, 1.1));
const cyanLight = new THREE.PointLight(0x35e0e6, 90, 40);
cyanLight.position.set(5, 3, 5);
scene.add(cyanLight);
const indigoLight = new THREE.PointLight(0x6a5cff, 70, 40);
indigoLight.position.set(-6, -2, 3);
scene.add(indigoLight);

// --- Ambient star dust ------------------------------------------------------
const dustCount = 380;
const dustPos = new Float32Array(dustCount * 3);
for (let i = 0; i < dustCount; i++) {
  dustPos[i * 3] = (Math.random() - 0.5) * 26;
  dustPos[i * 3 + 1] = (Math.random() - 0.5) * 18;
  dustPos[i * 3 + 2] = (Math.random() - 0.5) * 20 - 4;
}
const dustGeo = new THREE.BufferGeometry();
dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
const dust = new THREE.Points(
  dustGeo,
  new THREE.PointsMaterial({ color: 0x8aa0ff, size: 0.045, transparent: true, opacity: 0.6 }),
);
scene.add(dust);

const posAttr = geometry.attributes.position;

function morph(time) {
  // Displace each vertex along its normal-ish direction using its base position,
  // producing a gentle, continuous shimmer of the facets.
  for (let i = 0; i < vertexCount; i++) {
    const ix = i * 3;
    const bx = basePositions[ix];
    const by = basePositions[ix + 1];
    const bz = basePositions[ix + 2];
    const len = Math.sqrt(bx * bx + by * by + bz * bz) || 1;
    const wobble = 1 + 0.06 * Math.sin(time * 0.6 + phases[i]);
    posAttr.array[ix] = bx * wobble;
    posAttr.array[ix + 1] = by * wobble;
    posAttr.array[ix + 2] = bz * wobble;
  }
  posAttr.needsUpdate = true;
  geometry.computeVertexNormals();
}

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", () => { resize(); if (reduce) renderer.render(scene, camera); });
resize();

if (reduce) {
  // Single static frame — no animation loop.
  crystal.rotation.set(0.5, 0.4, 0);
  morph(2.0);
  renderer.render(scene, camera);
} else {
  renderer.setAnimationLoop((tMs) => {
    const t = tMs * 0.001;
    crystal.rotation.x = t * 0.05;
    crystal.rotation.y = t * 0.08;
    morph(t);
    dust.rotation.y = t * 0.01;
    renderer.render(scene, camera);
  });
}
