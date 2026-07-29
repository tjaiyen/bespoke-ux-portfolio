/**
 * Decorative "steam" backdrop for Kettle & Cloud, built on vendored three.js
 * (../../_vendor/three.module.js — a relative ES import under strict CSP).
 *
 * Soft warm wisps drift gently upward like rising steam. Pure geometry, no
 * external assets. The canvas is aria-hidden and never the sole content — all
 * meaning lives in the semantic DOM. Under prefers-reduced-motion we render a
 * single static frame with no animation loop.
 */
import * as THREE from "../../_vendor/three.module.js";

const canvas = document.getElementById("bg");
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
camera.position.set(0, 0, 14);

// Warm earthy steam palette.
const palette = [0xd9b98a, 0xc98a3c, 0xe4d3ba, 0xb9946a, 0xd7c3a3];

// A soft round sprite texture drawn on an offscreen canvas (no network).
function makePuffTexture() {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,0.9)");
  g.addColorStop(0.35, "rgba(255,255,255,0.45)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const puff = makePuffTexture();

const wisps = [];
const COUNT = 40;
for (let i = 0; i < COUNT; i++) {
  const mat = new THREE.SpriteMaterial({
    map: puff,
    color: palette[i % palette.length],
    transparent: true,
    opacity: 0.14 + Math.random() * 0.16,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  const x = (Math.random() - 0.5) * 26;
  const y = (Math.random() - 0.5) * 20;
  const z = -4 - Math.random() * 8;
  sprite.position.set(x, y, z);
  const s = 2.4 + Math.random() * 4.2;
  sprite.scale.set(s, s, 1);
  sprite.userData = {
    baseX: x,
    speed: 0.15 + Math.random() * 0.35,
    sway: 0.6 + Math.random() * 1.4,
    phase: Math.random() * Math.PI * 2,
  };
  scene.add(sprite);
  wisps.push(sprite);
}

const topY = 12;
const botY = -12;

function frame(elapsed) {
  for (const w of wisps) {
    const d = w.userData;
    w.position.y += d.speed * 0.016;
    if (w.position.y > topY) {
      w.position.y = botY;
      d.baseX = (Math.random() - 0.5) * 26;
    }
    w.position.x = d.baseX + Math.sin(elapsed * 0.0004 * d.sway + d.phase) * 1.6;
  }
  renderer.render(scene, camera);
}

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", () => { resize(); if (reduce) frame(0); });
resize();

if (reduce) {
  frame(0); // single static frame, no animation loop
} else {
  renderer.setAnimationLoop((t) => frame(t));
}
