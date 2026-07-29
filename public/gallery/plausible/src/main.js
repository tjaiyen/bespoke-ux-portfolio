/**
 * PLAUSIBLE — "The Band". The 4th dimension is SIMULATION DEPTH.
 *
 * A Monte Carlo of a season's landed cost. Scrolling runs the simulation: one
 * witness path first, then a fan of them, and finally the percentile envelope they
 * imply — P5 to P95 with the median drawn through it. The standard cost sits as a
 * flat line across the band, and the whole argument of the page is whether it sits
 * INSIDE it.
 *
 * BUDGET, DELIBERATELY: 32 witness paths and 4 percentile chains at 56 segments
 * each is ~2,000 box instances — under half of `swarf`, which is the ~6fps scene
 * under software rendering. Two hundred individual paths would have been prettier
 * and would have cost four times the frame. A shader-drawn envelope was rejected
 * for the same reason in reverse: SwiftShader is fill-bound, and one large
 * transparent quad costs more than two thousand hairlines.
 *
 * Paths come from a SEEDED generator in build(), so the band is identical on every
 * load and the tracked preview keeps matching the site.
 */
import * as THREE from "../../_vendor/three.module.js";
import { createStage, clamp01, mix } from "./stage.js";
import { createLabels } from "./_labels.js";

const SEG = 56, WITNESS = 32, SIMS = 600;
const W = 3.0, H = 2.3;
const STANDARD = 0.54;            // $/lb standard being tested
const Q4_SWING = 0.177;           // the seasonal spike a flat average hides

const STATIC = [
  "SIMULATED LANDED COST  ·  ONE SEASON",
  "P95", "P75", "median", "P25", "P5", "standard",
  "Q1", "Q2", "Q3", "Q4", "$/lb", "PATHS UNDER THE STANDARD",
];
const L = Object.fromEntries(STATIC.map((s, i) => [s, i]));
const READOUT = 14;
const PATHS_KEY = "PATHS UNDER THE STANDARD";
const QUARTERS = [["Q1", 0], ["Q2", 1 / 3], ["Q3", 2 / 3], ["Q4", 1]];

createStage({
  stillAt: 0.82,
  fitWidth: 4.8,   // content width incl. labels — see stage.js
  fov: 42,
  cameraFor: (narrow) => ({ pos: [0, 0.1, narrow ? 8.0 : 6.4], look: [0, 0.05, 0] }),
  framing: (p, narrow, w) => (narrow ? { x: 0, y: 0.25 } : { x: Math.min(1.5, w / 1000) - clamp01((p - 0.8) / 0.18) * 3.0, y: 0.1 }),
  build({ rig, camera }) {
    const inner = new THREE.Group();
    rig.add(inner);

    let seed = 90210; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const gauss = () => (rnd() + rnd() + rnd() + rnd() - 2) * 0.7;   // cheap, adequate

    /* ---------- simulate a full season of cost, many times ---------- */
    // Correlated drift plus a real Q4 seasonal spike — simulating the inputs as
    // independent would produce a band far too narrow to be useful.
    const path = () => {
      const out = new Array(SEG + 1);
      let v = 0.5 + gauss() * 0.012;
      for (let i = 0; i <= SEG; i++) {
        const u = i / SEG;
        v += gauss() * 0.0135;
        const season = Math.pow(clamp01((u - 0.62) / 0.38), 1.7) * Q4_SWING * (0.82 + rnd() * 0.38);
        out[i] = v * (1 + season);
      }
      return out;
    };
    const all = [];
    for (let s = 0; s < SIMS; s++) all.push(path());

    // Percentile chains across the simulated set.
    const pct = (q) => {
      const out = new Array(SEG + 1);
      const col = new Array(SIMS);
      for (let i = 0; i <= SEG; i++) {
        for (let s = 0; s < SIMS; s++) col[s] = all[s][i];
        col.sort((a, b) => a - b);
        out[i] = col[Math.min(SIMS - 1, Math.floor(q * SIMS))];
      }
      return out;
    };
    const chains = [
      { pts: pct(0.95), kind: 0 }, { pts: pct(0.75), kind: 1 },
      { pts: pct(0.50), kind: 2 }, { pts: pct(0.25), kind: 1 }, { pts: pct(0.05), kind: 0 },
    ];
    for (let i = 0; i < WITNESS; i++) chains.push({ pts: all[i * 7], kind: 3 });

    // Map cost to world Y. The band's own extremes set the scale, so the standard
    // line sits where it honestly falls rather than being framed to look fine.
    let lo = Infinity, hi = -Infinity;
    for (const v of chains[0].pts) hi = Math.max(hi, v);
    for (const v of chains[4].pts) lo = Math.min(lo, v);
    lo = Math.min(lo, STANDARD * 0.94); hi = Math.max(hi, STANDARD * 1.02);
    // Clamped: a handful of extreme witness paths would otherwise set the scale
    // for everything and squash the band into the floor of the frame.
    const yOf = (v) => Math.max(-H / 2 - 0.12, Math.min(H / 2 + 0.12, (-H / 2) + ((v - lo) / (hi - lo)) * H));
    const xOf = (u) => -W / 2 + u * W;

    const off = [], scl = [], ang = [], kind = [], tt = [];
    for (const c of chains) {
      for (let i = 0; i < SEG; i++) {
        const x0 = xOf(i / SEG), y0 = yOf(c.pts[i]);
        const x1 = xOf((i + 1) / SEG), y1 = yOf(c.pts[i + 1]);
        off.push((x0 + x1) / 2, (y0 + y1) / 2, c.kind === 3 ? -0.02 : 0);
        scl.push(Math.hypot(x1 - x0, y1 - y0), 1, 1);
        ang.push(Math.atan2(y1 - y0, x1 - x0));
        kind.push(c.kind);
        tt.push(i / SEG);
      }
    }
    const n = ang.length;
    const box = new THREE.BoxGeometry(1, 0.022, 0.022);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = box.index;
    geo.attributes.position = box.attributes.position;
    geo.instanceCount = n;
    geo.setAttribute("aOff", new THREE.InstancedBufferAttribute(new Float32Array(off), 3));
    geo.setAttribute("aScl", new THREE.InstancedBufferAttribute(new Float32Array(scl), 3));
    geo.setAttribute("aAng", new THREE.InstancedBufferAttribute(new Float32Array(ang), 1));
    geo.setAttribute("aKind", new THREE.InstancedBufferAttribute(new Float32Array(kind), 1));
    geo.setAttribute("aT", new THREE.InstancedBufferAttribute(new Float32Array(tt), 1));

    const curves = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      transparent: true,
      uniforms: { uRun: { value: 0 }, uFan: { value: 0 }, uBand: { value: 0 } },
      vertexShader: `
        attribute vec3 aOff, aScl;
        attribute float aAng, aKind, aT;
        uniform float uRun, uFan, uBand;
        varying float vKind, vA;
        void main() {
          vKind = aKind;
          float drawn = step(aT, uRun);
          float isW = step(2.5, aKind);
          // Act one draws one witness path, then fans in the rest; act two fades
          // the individual paths back and brings the percentile band forward.
          float wA = drawn * mix(0.10, 0.30, uFan) * (1.0 - uBand * 0.55);
          float bA = drawn * uBand;
          vA = mix(bA, wA, isW);
          vec3 p = position * aScl;
          float c = cos(aAng), s = sin(aAng);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(vec3(p.x * c - p.y * s, p.x * s + p.y * c, p.z) + aOff, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying float vKind, vA;
        void main() {
          if (vA < 0.01) discard;
          vec3 outer  = vec3(0.35, 0.44, 0.72);   // P5 / P95
          vec3 inner_ = vec3(0.29, 0.64, 1.00);   // P25 / P75
          vec3 median = vec3(0.43, 0.91, 1.00);
          vec3 witness= vec3(0.55, 0.61, 1.00);
          vec3 col = outer;
          col = mix(col, inner_, step(0.5, vKind) * step(vKind, 1.5));
          col = mix(col, median, step(1.5, vKind) * step(vKind, 2.5));
          col = mix(col, witness, step(2.5, vKind));
          gl_FragColor = vec4(col, vA);
        }
      `,
    }));
    curves.frustumCulled = false;
    inner.add(curves);

    /* ---------- the standard being tested ---------- */
    const std = new THREE.Mesh(
      new THREE.BoxGeometry(W, 0.018, 0.018),
      new THREE.MeshBasicMaterial({ color: 0xf5b13d, transparent: true, opacity: 0 }),
    );
    std.position.y = yOf(STANDARD);
    inner.add(std);

    const axis = new THREE.Mesh(new THREE.BoxGeometry(W, 0.008, 0.008),
      new THREE.MeshBasicMaterial({ color: 0x8a97ad, transparent: true, opacity: 0.35 }));
    axis.position.y = -H / 2;
    inner.add(axis);

    const labels = createLabels(STATIC, { withGlyphs: true, color: "#e9eef8", count: STATIC.length + READOUT });
    inner.add(labels.mesh);

    // Where the standard actually falls in the final distribution.
    const finalCol = all.map((a) => a[SEG]).sort((x, y) => x - y);
    let below = 0;
    for (const v of finalCol) if (v < STANDARD) below++;
    return { inner, curves, std, labels, camera, yOf, xOf, pctBelow: below / SIMS, p95: pct(0.95)[SEG], p5: pct(0.05)[SEG] };
  },

  pose(w, { p, t }) {
    const { inner, curves, std, labels, camera, yOf, pctBelow, p95, p5 } = w;
    const u = curves.material.uniforms;
    u.uRun.value = clamp01(p / 0.34);
    u.uFan.value = clamp01((p - 0.22) / 0.3);
    u.uBand.value = clamp01((p - 0.5) / 0.28);
    std.material.opacity = clamp01((p - 0.6) / 0.2) * 0.9;
    inner.rotation.y = Math.sin(t * 0.05) * 0.015;   // before update(): the billboard reads it

    let i = 0;
    const put = (key, x, y, h, a = 1) => labels.set(i++, L[key], x, y, 0.05, h, a);

    put("SIMULATED LANDED COST  ·  ONE SEASON", 0, H / 2 + 0.42, 0.145);
    for (let k = 0; k < QUARTERS.length; k++) {
      put(QUARTERS[k][0], -W / 2 + QUARTERS[k][1] * W, -H / 2 - 0.24, 0.1, 0.7);
    }
    put("$/lb", -W / 2 - 0.42, H / 2 - 0.1, 0.095, 0.6);

    // Band edges, revealed with the band itself.
    const bA = clamp01((p - 0.5) / 0.28);
    put("P95", W / 2 + 0.3, yOf(p95), 0.1, bA * 0.85);
    put("P5", W / 2 + 0.28, yOf(p5), 0.1, bA * 0.85);
    const sA = clamp01((p - 0.6) / 0.2);
    put("standard", W / 2 + 0.42, yOf(0.54), 0.1, sA * 0.95);

    // The verdict: what share of simulated seasons land under the standard.
    put(PATHS_KEY, -W / 2 + 0.86, H / 2 + 0.16, 0.085, 0.6);
    i = labels.write(i, `${Math.round(pctBelow * 100)}%`, -W / 2 - 0.22, H / 2 + 0.16, 0.05, 0.13, sA * 0.8);

    while (i < labels.count) labels.hide(i++);
    labels.update(camera);
  },
});
