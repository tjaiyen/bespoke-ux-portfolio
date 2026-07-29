/**
 * BASELINE — "The Fork". The 4th dimension is PROGRAM TIME.
 *
 * Three cumulative S-curves over 36 months of a programme:
 *   BCWS — planned value. Known from month zero, so it is drawn full length from
 *          the start. It is the baseline; that is the whole point of it.
 *   BCWP — earned value, revealed only as far as the current month.
 *   ACWP — actual cost, likewise.
 *
 * The curves are not decorative splines. They are computed from the identities a
 * programme is actually measured by: BCWP = BCWS x SPI and ACWP = BCWP / CPI, with
 * SPI drifting to 0.96 and CPI to 0.92. So the gap that opens between the earned
 * line and the actual line IS the cost variance, at the right magnitude.
 *
 * Past the current month a fourth line forks upward to the independent estimate at
 * completion, EAC = BAC / CPI — about 1.09x the budget. That fork is visible in
 * month four and briefed in month twenty; the instrument exists to close that gap.
 *
 * Everything is precomputed in build(); pose() writes one uniform.
 */
import * as THREE from "../../_vendor/three.module.js";
import { createStage, clamp01, mix } from "./stage.js";
import { createLabels } from "./_labels.js";

const SEG = 108;              // samples per curve
const CPI_END = 0.92;
const SPI_END = 0.96;
// Extents are capped deliberately: at W=3.5 the 36-month axis ran off the right
// edge while the CPI/SPI readouts sat behind the docked panel on the left.
const W = 2.85;               // half-width: month 0 at -W, month 36 at +W
const HGT = 2.35;             // world height of BAC

/** Classic cumulative S-curve: slow start, steep middle, long tail. */
const sCurve = (u) => u * u * (3 - 2 * u);
const spiAt = (u) => mix(1, SPI_END, sCurve(clamp01(u * 1.1)));
const cpiAt = (u) => mix(1, CPI_END, sCurve(clamp01(u * 1.1)));

const STATIC = [
  "CUMULATIVE VALUE  ·  36-MONTH PROGRAMME",
  "BCWS  planned", "BCWP  earned", "ACWP  actual", "EAC  projected",
  "BAC", "month 0", "month 12", "month 24", "month 36",
  "CPI", "SPI", "EAC / BAC",
];
const L = Object.fromEntries(STATIC.map((s, i) => [s, i]));
const READOUT = 18;
// Hoisted out of pose(): four arrays a frame otherwise.
const MONTH_TICKS = [["month 0", 0], ["month 12", 1 / 3], ["month 24", 2 / 3], ["month 36", 1]];

createStage({
  stillAt: 0.72,
  fitWidth: 7.2,   // content width incl. labels — see stage.js
  fov: 44,
  cameraFor: (narrow) => ({ pos: [0, 1.35, narrow ? 9.6 : 7.6], look: [0, 1.25, 0] }),
  framing: (p, narrow, w) => (narrow ? { x: 0, y: 0.3 } : { x: Math.min(1.75, w / 730) - clamp01((p - 0.8) / 0.18) * 3.4, y: 0.1 }),
  build({ rig, camera }) {
    const inner = new THREE.Group();
    rig.add(inner);

    /* ---------- four curves, each a chain of flat segments ---------- */
    // Kind 0 BCWS, 1 BCWP, 2 ACWP, 3 EAC. All lie in the XY plane, so a segment
    // needs only a 2D offset, a length and one rotation about Z.
    const off = [], scl = [], ang = [], tt = [], kind = [];
    const pushChain = (fn, k, from, to) => {
      let px = null, py = null;
      for (let i = 0; i <= SEG; i++) {
        const u = from + (to - from) * (i / SEG);
        const x = -W + u * 2 * W;
        const y = fn(u) * HGT;
        if (px !== null) {
          const dx = x - px, dy = y - py;
          off.push((px + x) / 2, (py + y) / 2, 0);
          scl.push(Math.hypot(dx, dy), 1, 1);
          ang.push(Math.atan2(dy, dx));
          tt.push(u);
          kind.push(k);
        }
        px = x; py = y;
      }
    };

    const bcws = (u) => sCurve(u);
    const bcwp = (u) => sCurve(u) * spiAt(u);
    const acwp = (u) => (sCurve(u) * spiAt(u)) / cpiAt(u);
    pushChain(bcws, 0, 0, 1);
    pushChain(bcwp, 1, 0, 1);
    pushChain(acwp, 2, 0, 1);
    // NOTE: the EAC is NOT part of this precomputed set. It has to originate at
    // wherever the actuals stand RIGHT NOW, and static geometry cannot express a
    // curve whose start moves with the scroll — an earlier version blended from
    // u=0 and drew a fork floating ~0.7 world units clear of the ACWP line it was
    // supposed to be forking from. It is one segment, transformed in pose().

    const n = ang.length;
    const box = new THREE.BoxGeometry(1, 0.035, 0.035);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = box.index;
    geo.attributes.position = box.attributes.position;
    geo.instanceCount = n;
    geo.setAttribute("aOff", new THREE.InstancedBufferAttribute(new Float32Array(off), 3));
    geo.setAttribute("aScl", new THREE.InstancedBufferAttribute(new Float32Array(scl), 3));
    geo.setAttribute("aAng", new THREE.InstancedBufferAttribute(new Float32Array(ang), 1));
    geo.setAttribute("aT", new THREE.InstancedBufferAttribute(new Float32Array(tt), 1));
    geo.setAttribute("aKind", new THREE.InstancedBufferAttribute(new Float32Array(kind), 1));

    const curves = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      transparent: true,
      uniforms: { uNow: { value: 0 } },
      vertexShader: `
        attribute vec3 aOff;
        attribute vec3 aScl;
        attribute float aAng;
        attribute float aT;
        attribute float aKind;
        uniform float uNow;
        varying float vKind;
        varying float vA;
        void main() {
          vKind = aKind;
          // The plan is known from month zero and is drawn whole. Earned and actual
          // exist only as far as the programme has run. The EAC fork lives ahead of
          // the current month — it is a projection, not a record.
          float past   = step(aT, uNow);
          float isPlan = step(aKind, 0.5);
          vA = max(isPlan * 0.55, (1.0 - isPlan) * past);
          vec3 p = position * aScl;
          float c = cos(aAng), s = sin(aAng);
          vec3 r = vec3(p.x * c - p.y * s, p.x * s + p.y * c, p.z);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(r + aOff, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying float vKind;
        varying float vA;
        void main() {
          if (vA < 0.01) discard;
          vec3 plan   = vec3(0.56, 0.64, 0.77);   // the baseline you agreed
          vec3 earned = vec3(0.96, 0.62, 0.15);   // what you have actually delivered
          vec3 actual = vec3(0.76, 0.25, 0.06);   // what it has actually cost
          vec3 col = plan;
          col = mix(col, earned, step(0.5, vKind) * step(vKind, 1.5));
          col = mix(col, actual, step(1.5, vKind));
          gl_FragColor = vec4(col, vA);
        }
      `,
    }));
    curves.frustumCulled = false;
    inner.add(curves);

    /* ---------- axes and the current-month cursor ---------- */
    const axisMat = new THREE.MeshBasicMaterial({ color: 0x6b7688, transparent: true, opacity: 0.5 });
    const xAxis = new THREE.Mesh(new THREE.BoxGeometry(W * 2, 0.012, 0.012), axisMat);
    inner.add(xAxis);
    const yAxis = new THREE.Mesh(new THREE.BoxGeometry(0.012, HGT * 1.12, 0.012), axisMat);
    yAxis.position.set(-W, HGT * 0.56, 0);
    inner.add(yAxis);
    const bacLine = new THREE.Mesh(new THREE.BoxGeometry(W * 2, 0.008, 0.008), axisMat);
    bacLine.position.y = HGT;
    inner.add(bacLine);

    // The projection: a straight run from today's actuals to BAC / CPI at month 36.
    const eacEnd = 1 / CPI_END;
    const eac = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.035, 0.035),
      new THREE.MeshBasicMaterial({ color: 0xdb524a, transparent: true, opacity: 0 }),
    );
    inner.add(eac);

    const cursor = new THREE.Mesh(
      new THREE.BoxGeometry(0.016, HGT * 1.3, 0.016),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.55 }),
    );
    cursor.position.y = HGT * 0.6;
    inner.add(cursor);

    const labels = createLabels(STATIC, {
      withGlyphs: true,
      color: "#e8ecf3",
      count: STATIC.length + READOUT,
    });
    inner.add(labels.mesh);

    return { inner, curves, cursor, labels, camera, eac, eacEnd, acwp };
  },

  pose({ inner, curves, cursor, labels, camera, eac, eacEnd, acwp }, { p, t }) {
    const now = p;
    curves.material.uniforms.uNow.value = now;
    cursor.position.x = -W + now * 2 * W;
    cursor.material.opacity = 0.4 + 0.15 * Math.sin(t * 2.2);

    // The EAC starts ON the actuals at the current month, by construction.
    const x0 = -W + now * 2 * W, y0 = acwp(now) * HGT;
    const x1 = W, y1 = eacEnd * HGT;
    const dx = x1 - x0, dy = y1 - y0;
    eac.scale.x = Math.max(0.0001, Math.hypot(dx, dy));
    eac.rotation.z = Math.atan2(dy, dx);
    eac.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0);
    eac.material.opacity = clamp01((now - 0.08) * 6) * 0.9;

    const cpi = cpiAt(now);
    const spi = spiAt(now);

    inner.rotation.y = Math.sin(t * 0.05) * 0.02;   // before update(): the billboard reads this rotation
    let i = 0;
    const put = (key, x, y, h, a = 1) => labels.set(i++, L[key], x, y, 0.02, h, a);

    put("CUMULATIVE VALUE  ·  36-MONTH PROGRAMME", -0.05, HGT * 1.34, 0.135);
    put("BAC", -W - 0.42, HGT, 0.13, 0.8);
    for (let k = 0; k < MONTH_TICKS.length; k++) {
      put(MONTH_TICKS[k][0], -W + MONTH_TICKS[k][1] * 2 * W, -0.28, 0.125, 0.75);
    }

    // Legend, stacked so four entries never collide on one line.
    put("BCWS  planned", -W + 1.02, HGT * 1.12, 0.1, 0.75);
    put("BCWP  earned", -W + 1.02, HGT * 1.00, 0.1, 0.95);
    put("ACWP  actual", -W + 1.02, HGT * 0.88, 0.1, 0.95);
    put("EAC  projected", -W + 1.02, HGT * 0.76, 0.1, clamp01((now - 0.08) * 6) * 0.9);

    // Live indices — the two numbers a programme is actually judged on.
    put("CPI", W - 1.62, HGT * 1.12, 0.1, 0.7);
    put("SPI", W - 0.95, HGT * 1.12, 0.1, 0.7);
    put("EAC / BAC", W - 0.16, HGT * 1.12, 0.1, 0.7);
    i = labels.write(i, cpi.toFixed(2), W - 1.78, HGT * 0.96, 0.02, 0.175);
    i = labels.write(i, spi.toFixed(2), W - 1.11, HGT * 0.96, 0.02, 0.175);
    i = labels.write(i, (1 / cpi).toFixed(2), W - 0.36, HGT * 0.96, 0.02, 0.175);
    while (i < labels.count) labels.hide(i++);
    labels.update(camera);

  },
});
