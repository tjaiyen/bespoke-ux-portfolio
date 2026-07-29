/**
 * Decorative 3D steam backdrop for Kettle & Cloud, built on three.js
 * (vendored locally at ../../_vendor/three.module.js — a relative ES import, so it
 * loads under the strict CSP `default-src 'self'`).
 *
 * Contract: the canvas is aria-hidden and NEVER the sole content — all meaning
 * lives in the semantic DOM. Under prefers-reduced-motion this renders a single
 * static frame (no animation loop). No external assets are fetched.
 *
 * The scene is large-scale, drifting steam: many soft, additive plumes rising
 * and swaying against a warm gradient — dramatic yet calm behind opaque cards.
 */
import * as THREE from "../../_vendor/three.module.js";

const canvas = document.getElementById("bg");
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x1a0f08, 0.03);

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
camera.position.set(0, 1.5, 16);
camera.lookAt(0, 3, 0);

// --- Warm ambient glow filling the space ---
scene.add(new THREE.AmbientLight(0xffd9a0, 0.7));
const glow = new THREE.PointLight(0xe8a54b, 40, 60);
glow.position.set(0, -6, 4);
scene.add(glow);
const rim = new THREE.PointLight(0xc2410c, 20, 50);
rim.position.set(-10, 8, -6);
scene.add(rim);

/**
 * Build a soft radial "steam puff" texture procedurally (canvas 2D) — no
 * external image, so it stays self-contained under CSP.
 */
function makePuffTexture() {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0.0, "rgba(255,248,235,0.85)");
  g.addColorStop(0.35, "rgba(250,235,210,0.45)");
  g.addColorStop(0.7, "rgba(232,190,140,0.14)");
  g.addColorStop(1.0, "rgba(232,190,140,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

const puffTex = makePuffTexture();

// --- Several rising steam columns, each a group of drifting puffs ---
const COLUMNS = 5;
const PUFFS_PER_COLUMN = 16;
const puffs = [];
const material = new THREE.SpriteMaterial({
  map: puffTex,
  transparent: true,
  opacity: 0.6,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  color: 0xfff1dc,
});

for (let col = 0; col < COLUMNS; col++) {
  const baseX = (col - (COLUMNS - 1) / 2) * 6 + (Math.random() - 0.5) * 2;
  const baseZ = -4 - Math.random() * 8;
  const swaySeed = Math.random() * Math.PI * 2;
  const speed = 0.35 + Math.random() * 0.35;
  for (let i = 0; i < PUFFS_PER_COLUMN; i++) {
    const sprite = new THREE.Sprite(material.clone());
    const t = i / PUFFS_PER_COLUMN; // 0 at base, 1 at top
    const scale = 2.2 + t * 5.5 + Math.random() * 1.2;
    sprite.scale.set(scale, scale, 1);
    sprite.position.set(baseX, -8 + t * 22, baseZ);
    sprite.material.opacity = (1 - t) * 0.5 + 0.08;
    scene.add(sprite);
    puffs.push({
      sprite,
      baseX,
      phase: t,                       // vertical progress 0..1
      swaySeed: swaySeed + i * 0.4,
      speed,
      swayAmp: 1.2 + t * 2.4,
      spin: (Math.random() - 0.5) * 0.3,
    });
  }
}

function updatePuffs(time) {
  for (const p of puffs) {
    // advance vertical phase, wrap around
    let ph = (p.phase + time * 0.02 * p.speed) % 1;
    const y = -8 + ph * 22;
    const sway = Math.sin(time * 0.0006 * (p.speed * 3) + p.swaySeed) * p.swayAmp;
    p.sprite.position.x = p.baseX + sway;
    p.sprite.position.y = y;
    // fade in from base, fade out near top
    const fade = Math.sin(ph * Math.PI);
    p.sprite.material.opacity = fade * (0.55 - ph * 0.25) + 0.04;
    p.sprite.material.rotation += p.spin * 0.01;
  }
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
  updatePuffs(1200);
  renderer.render(scene, camera);
} else {
  renderer.setAnimationLoop((t) => {
    updatePuffs(t * 0.06);
    camera.position.x = Math.sin(t * 0.00008) * 0.8;
    camera.lookAt(0, 4, 0);
    renderer.render(scene, camera);
  });
}
