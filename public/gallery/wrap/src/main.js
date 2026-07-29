/**
 * WRAP — "The Climb". The 4th dimension is ABSORPTION.
 *
 * One direct labour dollar enters at the bottom and leaves the top as a billable
 * rate. Scrolling walks it up the four levels of the stack:
 *
 *   direct labour               1.00
 *   + fringe        @  30%      1.30
 *   + overhead      @ 110%      2.73     (applied to labour + fringe)
 *   + G&A           @  12%      3.06     (applied to total cost input)
 *
 * The slab widths are the running total, so the shape of the stack IS the wrap —
 * you can see that two thirds of a billable hour is indirect before anyone argues
 * about it.
 *
 * The rising cost particles are a pure function of (p, seed, t) with a modulo
 * phase, never an accumulating `y += v*dt`. Integrated flow is the classic trap in
 * a scrubbable scene: it looks fine going down the page and cannot recover coming
 * back up.
 */
import * as THREE from "../../_vendor/three.module.js";
import { createStage, clamp01 } from "./stage.js";
import { createLabels } from "./_labels.js";

// Cumulative cost of one direct labour dollar after each pool absorbs.
const LEVELS = [
  { key: "DIRECT LABOUR", total: 1.0 },
  { key: "+ FRINGE  30%", total: 1.3 },
  { key: "+ OVERHEAD  110%", total: 2.73 },
  { key: "+ G&A  12%", total: 3.06 },
];
const TOP = 3.4;                 // world height of the whole stack
const SLAB = TOP / LEVELS.length;
const PARTICLES = 620;

const STATIC = [
  "ONE DIRECT LABOUR DOLLAR, WRAPPED",
  ...LEVELS.map((l) => l.key),
  "BILLABLE RATE", "×",
];
const L = Object.fromEntries(STATIC.map((s, i) => [s, i]));
const READOUT = 10;

createStage({
  stillAt: 0.7,
  fitWidth: 5.8,   // content width incl. labels — see stage.js
  fov: 44,
  cameraFor: (narrow) => ({ pos: [narrow ? 2.2 : 3.0, 1.9, narrow ? 8.8 : 7.0], look: [0, 1.75, 0] }),
  framing: (p, narrow, w) => (narrow ? { x: 0, y: 0.25 } : { x: Math.min(1.3, w / 980) - clamp01((p - 0.8) / 0.18) * 2.8, y: 0.05 }),
  build({ rig, scene, camera }) {
    const inner = new THREE.Group();
    rig.add(inner);

    /* ---------- the four pools ---------- */
    const slabs = [];
    for (let i = 0; i < LEVELS.length; i++) {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(1, SLAB * 0.86, 0.9),
        new THREE.MeshStandardMaterial({
          color: i === LEVELS.length - 1 ? 0x111111 : 0x2c3440,
          roughness: 0.85, transparent: true, opacity: 0,
        }),
      );
      m.position.y = SLAB * (i + 0.5);
      inner.add(m);
      slabs.push(m);
    }

    /* ---------- cost rising through the stack ---------- */
    const seed = new Float32Array(PARTICLES);
    const lane = new Float32Array(PARTICLES);
    for (let i = 0; i < PARTICLES; i++) {
      seed[i] = Math.random();
      lane[i] = Math.random() * 2 - 1;
    }
    const pgeo = new THREE.BufferGeometry();
    pgeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(PARTICLES * 3), 3));
    pgeo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    pgeo.setAttribute("aLane", new THREE.BufferAttribute(lane, 1));
    const pmat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uP: { value: 0 }, uTime: { value: 0 }, uTop: { value: TOP } },
      vertexShader: `
        attribute float aSeed;
        attribute float aLane;
        uniform float uP, uTime, uTop;
        varying float vA;
        varying float vY;
        void main() {
          // Phase is a pure function of seed and time — modulo, never integrated,
          // so scrubbing the page backwards is exact rather than merely plausible.
          float phase = fract(aSeed + uTime * 0.11);
          // Cost only climbs as far as the pools that have been unlocked.
          float ceiling = uTop * clamp(uP * 1.25, 0.16, 1.0);
          float y = phase * ceiling;
          vY = y / uTop;
          // The column widens as it absorbs: the stack's own profile.
          float w = 0.5 + vY * 1.3;
          float x = aLane * w;
          float z = sin(aSeed * 31.0) * 0.34;
          vA = (1.0 - phase) * 0.85;
          vec4 mv = modelViewMatrix * vec4(x, y, z, 1.0);
          gl_PointSize = (2.0 + aSeed * 4.0) * (1.0 / -mv.z) * 8.0;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        precision highp float;
        varying float vA;
        varying float vY;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if (d > 0.5) discard;
          float core = smoothstep(0.5, 0.0, d);
          // Direct dollars enter red and are progressively absorbed into the stack.
          vec3 direct   = vec3(0.70, 0.20, 0.12);
          vec3 absorbed = vec3(0.25, 0.29, 0.36);
          gl_FragColor = vec4(mix(direct, absorbed, vY) * core, core * vA * 0.55);
        }
      `,
    });
    inner.add(new THREE.Points(pgeo, pmat));

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 0.02, 1.3),
      new THREE.MeshBasicMaterial({ color: 0x9aa0a8, transparent: true, opacity: 0.55 }),
    );
    inner.add(base);

    scene.add(new THREE.AmbientLight(0xffffff, 2.0));
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(-2, 5, 4);
    scene.add(key);

    const labels = createLabels(STATIC, { withGlyphs: true, color: "#16181c", count: STATIC.length + READOUT });
    inner.add(labels.mesh);

    return { inner, slabs, pmat, labels, camera };
  },

  pose({ inner, slabs, pmat, labels, camera }, { p, t }) {
    pmat.uniforms.uP.value = p;
    pmat.uniforms.uTime.value = t;

    // Each pool absorbs in turn as the scroll climbs the stack.
    const climb = p * LEVELS.length;
    inner.rotation.y = Math.sin(t * 0.06) * 0.05;   // before update(): the billboard reads this rotation
    let i = 0;
    const put = (key, x, y, h, a = 1) => labels.set(i++, L[key], x, y, 0.6, h, a);

    put("ONE DIRECT LABOUR DOLLAR, WRAPPED", 0.15, TOP * 1.13, 0.15);

    for (let k = 0; k < LEVELS.length; k++) {
      const on = clamp01(climb - k);
      const width = LEVELS[k].total * 0.95;
      slabs[k].scale.x = 0.35 + on * (width - 0.35);
      slabs[k].material.opacity = 0.14 + on * 0.72;
      // Level captions sit to the right of their own slab, clear of the stack.
      put(LEVELS[k].key, 2.35, SLAB * (k + 0.5), 0.13, 0.35 + on * 0.6);
    }

    // The running total, interpolated ALONG THE LEVELS — not a linear ramp in p.
    // A ramp read 2.03 at p=0.5 while the slabs beside it showed 1.30, so the
    // headline number contradicted the picture it was captioning.
    const seg = Math.min(LEVELS.length - 1, Math.floor(climb));
    const frac = clamp01(climb - seg);
    const from = seg === 0 ? 1 : LEVELS[seg - 1].total;
    const total = climb >= LEVELS.length ? LEVELS[LEVELS.length - 1].total : from + (LEVELS[seg].total - from) * frac;
    put("BILLABLE RATE", -2.25, TOP * 0.95, 0.115, 0.7);
    i = labels.write(i, `${total.toFixed(2)}`, -2.45, TOP * 0.8, 0.6, 0.3);
    put("×", -1.72, TOP * 0.8 + 0.02, 0.2, 0.8);
    while (i < labels.count) labels.hide(i++);
    labels.update(camera);

  },
});
