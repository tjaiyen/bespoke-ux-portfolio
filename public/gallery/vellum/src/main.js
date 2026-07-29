/**
 * Decorative 3D backdrop for Vellum: a slowly rotating wireframe torus,
 * hand-drawn on a 2D canvas (self-contained, no deps).
 *
 * The canvas is aria-hidden; ALL meaning lives in the semantic DOM. Under
 * prefers-reduced-motion it draws a single static frame (no animation loop) —
 * which is exactly how the accessibility audit renders it.
 */
const cv = document.getElementById("bg");
const ctx = cv.getContext("2d");
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const dpr = Math.min(window.devicePixelRatio || 1, 2);

function resize() {
  cv.width = Math.max(1, window.innerWidth * dpr);
  cv.height = Math.max(1, window.innerHeight * dpr);
}
window.addEventListener("resize", () => { resize(); if (reduce) draw(0); });
resize();

// Build a torus vertex grid. We keep indices so we can connect neighbours
// into a proper wireframe (rings + tube loops), not just a point cloud.
const R = 1.75, r = 0.6;       // major / minor radius
const SEG = 44;                // segments around the big ring
const SIDE = 16;               // segments around the tube
const verts = [];
for (let i = 0; i < SEG; i++) {
  const u = (i / SEG) * Math.PI * 2;
  for (let j = 0; j < SIDE; j++) {
    const v = (j / SIDE) * Math.PI * 2;
    verts.push([
      (R + r * Math.cos(v)) * Math.cos(u),
      (R + r * Math.cos(v)) * Math.sin(u),
      r * Math.sin(v),
    ]);
  }
}
const idx = (i, j) => (i % SEG) * SIDE + (j % SIDE);

// Wireframe edges: each vertex connects to the next around the ring and the
// next around the tube. That yields the classic torus mesh.
const edges = [];
for (let i = 0; i < SEG; i++) {
  for (let j = 0; j < SIDE; j++) {
    edges.push([idx(i, j), idx(i + 1, j)]);
    edges.push([idx(i, j), idx(i, j + 1)]);
  }
}

const proj = new Array(verts.length);

function draw(t) {
  const w = cv.width, h = cv.height;
  ctx.clearRect(0, 0, w, h);

  // Subtle radial vignette so the far side of the torus fades into the dark.
  const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
  bg.addColorStop(0, "rgba(20, 24, 52, 0.55)");
  bg.addColorStop(1, "rgba(5, 6, 13, 0)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const ax = t * 0.00013 + 0.62;   // slow tilt
  const ay = t * 0.00022;          // slow spin
  const cx = Math.cos(ax), sx = Math.sin(ax);
  const cy = Math.cos(ay), sy = Math.sin(ay);
  const scale = Math.min(w, h) * 0.86;

  // Project every vertex once.
  for (let k = 0; k < verts.length; k++) {
    const p = verts[k];
    const x = p[0], y = p[1], z = p[2];
    const y1 = y * cx - z * sx, z1 = y * sx + z * cx;
    const x2 = x * cy + z1 * sy, z2 = -x * sy + z1 * cy;
    const pz = z2 + 6;
    proj[k] = [
      w / 2 + (x2 * scale) / pz,
      h / 2 + (y1 * scale) / pz,
      z2,
    ];
  }

  ctx.lineWidth = Math.max(0.7, 1.1 * dpr);
  for (const [a, b] of edges) {
    const pa = proj[a], pb = proj[b];
    const depth = ((pa[2] + pb[2]) * 0.5 + 2.4) / 4.8; // 0 far .. 1 near
    const d = Math.max(0, Math.min(1, depth));
    // Teal-to-violet gradient with depth-based opacity — reads as a glowing mesh.
    const rr = Math.round(35 + d * 90);
    const gg = Math.round(120 + d * 100);
    const bb = Math.round(196 + d * 40);
    ctx.strokeStyle = `rgba(${rr}, ${gg}, ${bb}, ${0.08 + d * 0.42})`;
    ctx.beginPath();
    ctx.moveTo(pa[0], pa[1]);
    ctx.lineTo(pb[0], pb[1]);
    ctx.stroke();
  }
}

if (reduce) {
  draw(0);
} else {
  (function loop(t) {
    draw(t);
    requestAnimationFrame(loop);
  })(0);
}
