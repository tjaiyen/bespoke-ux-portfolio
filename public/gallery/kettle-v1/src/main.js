/**
 * Decorative 3D steam accent for Kettle & Cloud, built on three.js
 * (vendored locally at ../../_vendor/three.module.js — a relative ES import, so it
 * loads under the strict CSP `default-src 'self'` with no CDN and no network).
 *
 * Contract: the canvas is aria-hidden and NEVER the sole content — all meaning
 * lives in the semantic DOM. Under prefers-reduced-motion this renders a single
 * static frame (no animation loop), exactly how the accessibility audit sees it.
 *
 * The scene: a few soft, translucent "steam" ribbons drifting gently upward
 * behind the opaque content — a single quiet accent, warm and calm.
 */
import * as THREE from "../../_vendor/three.module.js";

const canvas = document.getElementById("bg");
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
camera.position.set(0, 0, 9);

// Soft warm lighting to match the tea-room palette.
scene.add(new THREE.AmbientLight(0xfff4e0, 0.9));
const key = new THREE.PointLight(0xfff0d6, 40);
key.position.set(3, 6, 8);
scene.add(key);

// Build a handful of gentle "steam" wisps: thin, translucent tube curves that
// wave slowly like rising vapour.
const wisps = [];
const WISP_COUNT = 5;
const tint = new THREE.Color(0xbcae94);

for (let i = 0; i < WISP_COUNT; i++) {
  const baseX = (i - (WISP_COUNT - 1) / 2) * 2.6;
  const points = [];
  const segments = 14;
  for (let s = 0; s <= segments; s++) {
    const t = s / segments;
    points.push(new THREE.Vector3(baseX, (t - 0.5) * 12, 0));
  }
  const curve = new THREE.CatmullRomCurve3(points);
  const geo = new THREE.TubeGeometry(curve, 60, 0.10, 8, false);
  const mat = new THREE.MeshStandardMaterial({
    color: tint,
    transparent: true,
    opacity: 0.16,
    roughness: 1,
    metalness: 0,
  });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
  wisps.push({ mesh, basePoints: points.map((p) => p.clone()), curve, phase: i * 1.3, speed: 0.4 + i * 0.08 });
}

function updateWisp(w, time) {
  const pts = w.curve.points;
  for (let s = 0; s < pts.length; s++) {
    const base = w.basePoints[s];
    const t = s / (pts.length - 1);
    const sway = Math.sin(time * w.speed + w.phase + t * 4) * (0.5 + t * 0.9);
    pts[s].x = base.x + sway;
    pts[s].z = Math.cos(time * w.speed * 0.7 + w.phase + t * 3) * (0.4 + t * 0.7);
  }
  const geo = new THREE.TubeGeometry(w.curve, 60, 0.10, 8, false);
  w.mesh.geometry.dispose();
  w.mesh.geometry = geo;
}

function resize() {
  const width = window.innerWidth, height = window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", () => { resize(); if (reduce) renderer.render(scene, camera); });
resize();

if (reduce) {
  // Static frame: give the wisps a settled, gentle shape and render once.
  wisps.forEach((w) => updateWisp(w, w.phase));
  renderer.render(scene, camera);
} else {
  renderer.setAnimationLoop((ms) => {
    const time = ms * 0.0005;
    for (const w of wisps) updateWisp(w, time);
    renderer.render(scene, camera);
  });
}
