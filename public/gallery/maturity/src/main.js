/**
 * MATURITY — "The Dent". The 4th dimension is the RE-SCORE.
 *
 * Seven finance domains on a radar, scored 0 to 4. Scrolling morphs last year's
 * polygon into this year's and then calls out the axis that is holding the rest
 * back — systems, data and automation at 1.6, the lowest by a distance.
 *
 * The polygon is a seven-triangle fan whose radii live in a `uniform float uR[7]`
 * and are read in the VERTEX shader from a per-vertex axis index, so re-scoring is
 * seven uniform writes rather than a geometry rebuild. No triangulation is needed
 * for a star-shaped polygon around its own centre.
 *
 * The target ring, the axes and last year's shape are all drawn from the first
 * frame — a radar whose scores start at zero is a dot, and a dot is not a landing
 * frame anyone can read.
 */
import * as THREE from "../../_vendor/three.module.js";
import { createStage, clamp01, mix } from "./stage.js";
import { createLabels } from "./_labels.js";

const AXES = [
  { key: "close", last: 2.4, now: 2.9 },
  { key: "controls", last: 2.8, now: 3.1 },
  { key: "reporting", last: 2.1, now: 2.6 },
  { key: "systems & data", last: 1.3, now: 1.6 },
  { key: "planning", last: 2.0, now: 2.4 },
  { key: "costing", last: 2.6, now: 3.0 },
  { key: "talent", last: 2.2, now: 2.5 },
];
const N = AXES.length, MAXS = 4, R = 1.9;

const STATIC = [
  "FINANCE MATURITY  ·  0 TO 4",
  ...AXES.map((a) => a.key),
  "last year", "this year", "target", "WEAKEST AXIS", "of 4",
];
const L = Object.fromEntries(STATIC.map((s, i) => [s, i]));
const READOUT = 10;
const ANG = (i) => (i / N) * Math.PI * 2 + Math.PI / 2;

createStage({
  stillAt: 0.8,
  fitWidth: 5.6,   // content width incl. labels — see stage.js
  fov: 42,
  cameraFor: (narrow) => ({ pos: [0, 0, narrow ? 7.6 : 6.2], look: [0, 0, 0] }),
  framing: (p, narrow, w) => (narrow ? { x: 0, y: 0.2 } : { x: Math.min(1.5, w / 980) - clamp01((p - 0.8) / 0.18) * 3.0, y: 0.05 }),
  build({ rig, camera }) {
    const inner = new THREE.Group();
    rig.add(inner);

    /* ---------- the polygon, as a fan around the centre ---------- */
    // Each triangle is (centre, axis i, axis i+1). The vertex carries WHICH axis it
    // belongs to, and the shader looks its radius up in the uniform array.
    const pos = [], axisIdx = [];
    for (let i = 0; i < N; i++) {
      pos.push(0, 0, 0); axisIdx.push(-1);            // centre
      pos.push(1, 0, 0); axisIdx.push(i);
      pos.push(1, 0, 0); axisIdx.push((i + 1) % N);
    }
    const fanGeo = new THREE.BufferGeometry();
    fanGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pos), 3));
    fanGeo.setAttribute("aAxis", new THREE.BufferAttribute(new Float32Array(axisIdx), 1));

    const RADIUS_LOOKUP = Array.from({ length: N },
      (_, i) => `if (a < ${i}.5) return uR[${i}];`).join("\n          ");

    const fan = new THREE.Mesh(fanGeo, new THREE.ShaderMaterial({
      transparent: true, side: THREE.DoubleSide, depthWrite: false,
      uniforms: { uR: { value: new Float32Array(N) }, uFill: { value: 0 } },
      vertexShader: `
        attribute float aAxis;
        uniform float uR[${N}];
        varying float vEdge;
        // GLSL ES 1.0 cannot index a uniform array with a varying value, so the
        // lookup is unrolled. Seven branches, resolved at compile time.
        float radiusOf(float a) {
          ${RADIUS_LOOKUP}
          return uR[0];
        }
        void main() {
          vEdge = step(0.0, aAxis);
          float r = aAxis < 0.0 ? 0.0 : radiusOf(aAxis);
          float ang = (max(aAxis, 0.0) / ${N}.0) * 6.2831853 + 1.5707963;
          vec3 p = vec3(cos(ang) * r, sin(ang) * r, 0.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying float vEdge;
        uniform float uFill;
        void main() {
          // The source's severity treatment: a low tint, brighter toward the edge.
          gl_FragColor = vec4(vec3(0.48, 0.36, 0.12), (0.10 + vEdge * 0.16) * uFill);
        }
      `,
    }));
    inner.add(fan);

    /* ---------- rings, axes and the two outlines ---------- */
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x8a7a58, transparent: true, opacity: 0.22 });
    for (let s = 1; s <= MAXS; s++) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(R * s / MAXS - 0.004, R * s / MAXS + 0.004, 64),
        s === 3 ? new THREE.MeshBasicMaterial({ color: 0x7a5c1f, transparent: true, opacity: 0.5 }) : ringMat);
      inner.add(ring);
    }
    for (let i = 0; i < N; i++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(R, 0.005, 0.005), ringMat);
      spoke.position.set(Math.cos(ANG(i)) * R / 2, Math.sin(ANG(i)) * R / 2, 0);
      spoke.rotation.z = ANG(i);
      inner.add(spoke);
    }

    /** An outline as N flat segments, transformed each frame from the scores. */
    const outline = (colour, op) => {
      const segs = [];
      for (let i = 0; i < N; i++) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(1, 0.016, 0.016),
          new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: op }));
        inner.add(m); segs.push(m);
      }
      return segs;
    };
    const lastRing = outline(0x9a8f76, 0.4);
    const nowRing = outline(0x8a6a24, 0.95);

    const labels = createLabels(STATIC, { withGlyphs: true, color: "#1c1a16", count: STATIC.length + READOUT });
    inner.add(labels.mesh);

    return { inner, fan, lastRing, nowRing, labels, camera, scores: new Float32Array(N) };
  },

  pose(w, { p, t }) {
    const { inner, fan, lastRing, nowRing, labels, camera, scores } = w;
    inner.rotation.z = Math.sin(t * 0.04) * 0.01;   // before update(): the billboard reads it

    // Act one holds last year; act two morphs to this year's re-score.
    const k = clamp01((p - 0.18) / 0.5);
    for (let i = 0; i < N; i++) scores[i] = mix(AXES[i].last, AXES[i].now, k);
    fan.material.uniforms.uR.value.set(scores.map((s) => (s / MAXS) * R));
    fan.material.uniforms.uFill.value = 0.6 + k * 0.4;

    // Both outlines, laid segment by segment from the scores.
    const place = (segs, radii) => {
      for (let i = 0; i < N; i++) {
        const a0 = ANG(i), a1 = ANG((i + 1) % N);
        const x0 = Math.cos(a0) * radii[i], y0 = Math.sin(a0) * radii[i];
        const x1 = Math.cos(a1) * radii[(i + 1) % N], y1 = Math.sin(a1) * radii[(i + 1) % N];
        const m = segs[i];
        m.scale.x = Math.max(0.0001, Math.hypot(x1 - x0, y1 - y0));
        m.rotation.z = Math.atan2(y1 - y0, x1 - x0);
        m.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0.01);
      }
    };
    place(lastRing, AXES.map((a) => (a.last / MAXS) * R));
    place(nowRing, Array.from(scores, (s) => (s / MAXS) * R));
    for (const m of lastRing) m.material.opacity = 0.4 * (1 - k * 0.5);

    let i = 0;
    const put = (key, x, y, h, a = 1) => labels.set(i++, L[key], x, y, 0.05, h, a);

    put("FINANCE MATURITY  ·  0 TO 4", 0, R + 0.76, 0.145);
    for (let a = 0; a < N; a++) {
      const rr = R + 0.3;
      // The weakest axis is called out once the re-score has landed.
      const weakest = a === 3;
      put(AXES[a].key, Math.cos(ANG(a)) * rr, Math.sin(ANG(a)) * rr, 0.098,
        weakest ? 0.5 + k * 0.5 : 0.62);
    }
    put("last year", -R - 0.5, -R - 0.3, 0.09, 0.45);
    put("this year", -R - 0.5, -R - 0.52, 0.09, 0.4 + k * 0.55);
    put("target", -R - 0.5, -R - 0.74, 0.09, 0.4);

    put("WEAKEST AXIS", R - 0.1, -R - 0.3, 0.098, 0.5 + k * 0.4);
    i = labels.write(i, scores[3].toFixed(1), R - 0.42, -R - 0.62, 0.05, 0.19, 0.5 + k * 0.5);
    put("of 4", R + 0.14, -R - 0.63, 0.1, 0.5 + k * 0.4);

    while (i < labels.count) labels.hide(i++);
    labels.update(camera);
  },
});
