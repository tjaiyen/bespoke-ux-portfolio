/**
 * Verdant — decorative botanical backdrop.
 *
 * A calm, unhurried drift of soft rounded "seed-pod" spheres in warm earthy
 * tones (sage, clay, cream) over a light ground. Purely decorative: the canvas
 * is aria-hidden and all meaning lives in the semantic DOM. Under
 * prefers-reduced-motion we render ONE static frame (no animation loop).
 * No external assets — pure geometry, loads under CSP default-src 'self'.
 */
import * as THREE from "../../_vendor/three.module.js";

const canvas = document.getElementById("bg");
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 100);
camera.position.set(0, 0, 12);

// Warm earthy material palette
const palette = [0x8fa07f, 0x6f8464, 0xc98a68, 0xa5583a, 0xe7dcc4];

const group = new THREE.Group();
scene.add(group);

const pods = [];
const COUNT = 14;
for (let i = 0; i < COUNT; i++) {
  const r = 0.5 + Math.random() * 1.1;
  // Soft rounded shapes: high-segment spheres, gently squashed pods.
  const geo = new THREE.SphereGeometry(r, 40, 32);
  const color = palette[i % palette.length];
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.85,
    metalness: 0.02,
    flatShading: false,
  });
  const mesh = new THREE.Mesh(geo, mat);

  mesh.position.set(
    (Math.random() - 0.5) * 16,
    (Math.random() - 0.5) * 10,
    (Math.random() - 0.5) * 6 - 2,
  );
  mesh.scale.set(1, 0.82 + Math.random() * 0.3, 1);
  mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);

  mesh.userData = {
    baseY: mesh.position.y,
    driftSpeed: 0.06 + Math.random() * 0.12,
    driftAmp: 0.4 + Math.random() * 0.7,
    phase: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.08,
  };
  group.add(mesh);
  pods.push(mesh);
}

// Soft, warm lighting for a gentle daylit feel
scene.add(new THREE.AmbientLight(0xfbf5e8, 0.85));
const sun = new THREE.DirectionalLight(0xfff3dd, 1.5);
sun.position.set(-4, 6, 8);
scene.add(sun);
const fill = new THREE.DirectionalLight(0x9fb08c, 0.5);
fill.position.set(6, -3, 4);
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
  for (const p of pods) p.rotation.x += 0.2;
  group.rotation.y = 0.15;
  renderer.render(scene, camera);
}

if (reduce) {
  drawStatic();
} else {
  renderer.setAnimationLoop((t) => {
    const s = t * 0.001;
    for (const p of pods) {
      const u = p.userData;
      p.position.y = u.baseY + Math.sin(s * u.driftSpeed * 3 + u.phase) * u.driftAmp;
      p.rotation.x += u.spin * 0.02;
      p.rotation.z += u.spin * 0.012;
    }
    group.rotation.y = Math.sin(s * 0.05) * 0.12;
    renderer.render(scene, camera);
  });
}
