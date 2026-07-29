/**
 * TRIPWIRE — "The Gate". The 4th dimension is DOCUMENT FLOW.
 *
 * Three lanes run left to right — invoice, purchase order, goods receipt — each
 * carrying its own documents. At the gate they have to arrive as a matched triple.
 * Matched sets converge onto one line and pass; a price break, a quantity break or
 * a duplicate deflects out of the flow and never reaches payment.
 *
 * Every document's position is `fract(seed + p·k + t·drift)` — a modulo phase, not
 * an integrated one. Documents therefore occupy the same place at the same scroll
 * position no matter which direction you arrived from, which is the difference
 * between a scrubbable scene and one that only works downward.
 */
import * as THREE from "../../_vendor/three.module.js";
import { createStage, clamp01 } from "./stage.js";
import { createLabels } from "./_labels.js";

const PER_LANE = 64, LANES = 3;
const W = 5.0, LANE_Y = 0.82, GATE_U = 0.60;

const STATIC = [
  "THREE-WAY MATCH  ·  ONE MONTH OF AP",
  "invoice", "purchase order", "goods receipt",
  "MATCHED", "HELD", "price", "quantity", "duplicate", "GATE",
];
const L = Object.fromEntries(STATIC.map((s, i) => [s, i]));
const READOUT = 12;
const FAULTS = [["price", 0], ["quantity", 1], ["duplicate", 2]];

createStage({
  stillAt: 0.7,
  fitWidth: 6.8,   // content width incl. labels — see stage.js
  fov: 42,
  cameraFor: (narrow) => ({ pos: [0, 0, narrow ? 8.6 : 6.6], look: [0, 0, 0] }),
  framing: (p, narrow, w) => (narrow ? { x: 0, y: 0.2 } : { x: Math.min(1.2, w / 1150) - clamp01((p - 0.8) / 0.18) * 2.6, y: 0.05 }),
  build({ rig, camera }) {
    const inner = new THREE.Group();
    rig.add(inner);

    let seed = 3319; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

    // One fault code per transaction, shared by all three of its documents — a
    // mismatch is a property of the SET, not of any single piece of paper.
    const fault = [];
    for (let k = 0; k < PER_LANE; k++) {
      const r = rnd();
      fault.push(r < 0.72 ? 0 : r < 0.83 ? 1 : r < 0.92 ? 2 : 3);   // 0 clean, 1 price, 2 qty, 3 dup
    }
    const held = fault.filter((f) => f > 0).length;

    const n = PER_LANE * LANES;
    const aSeed = new Float32Array(n), aLane = new Float32Array(n), aFault = new Float32Array(n);
    let i = 0;
    for (let k = 0; k < PER_LANE; k++) {
      const s = (k + rnd() * 0.6) / PER_LANE;
      for (let lane = 0; lane < LANES; lane++, i++) {
        aSeed[i] = s;
        aLane[i] = lane - 1;                   // -1, 0, +1
        aFault[i] = fault[k];
      }
    }

    const quad = new THREE.PlaneGeometry(0.15, 0.1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = quad.index;
    geo.attributes.position = quad.attributes.position;
    geo.instanceCount = n;
    geo.setAttribute("aSeed", new THREE.InstancedBufferAttribute(aSeed, 1));
    geo.setAttribute("aLane", new THREE.InstancedBufferAttribute(aLane, 1));
    geo.setAttribute("aFault", new THREE.InstancedBufferAttribute(aFault, 1));

    const docs = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      transparent: true,
      uniforms: { uP: { value: 0 }, uTime: { value: 0 } },
      vertexShader: `
        attribute float aSeed, aLane, aFault;
        uniform float uP, uTime;
        varying float vFault, vPast, vA;
        void main() {
          // Modulo phase — pure in (seed, p, t), so scrubbing back is exact.
          float u = fract(aSeed + uP * 0.55 + uTime * 0.035);
          float x = -${(W / 2).toFixed(2)} + u * ${W.toFixed(2)};

          float conv = smoothstep(${(GATE_U - 0.14).toFixed(2)}, ${(GATE_U + 0.03).toFixed(2)}, u);
          float clean = step(aFault, 0.5);
          vPast = step(${GATE_U.toFixed(2)}, u);
          vFault = aFault;

          // Clean sets converge onto the payment line; held sets are pushed out of
          // the flow at the gate and fall away.
          float laneY = aLane * ${LANE_Y.toFixed(2)};
          float y = mix(laneY, clean * 0.0 + (1.0 - clean) * (laneY + 1.05 + aLane * 0.2), conv);
          float dropped = (1.0 - clean) * conv;
          y -= dropped * pow(max(0.0, u - ${GATE_U.toFixed(2)}) * 3.4, 2.0) * 1.6;

          // Fade in at the left edge and out at the right, so nothing pops.
          vA = smoothstep(0.0, 0.06, u) * (1.0 - smoothstep(0.9, 1.0, u));
          vec3 pos = position * mix(1.0, 0.72, dropped);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos + vec3(x, y, 0.0), 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying float vFault, vPast, vA;
        void main() {
          vec3 pending = vec3(0.42, 0.50, 0.64);
          vec3 paid    = vec3(0.29, 0.64, 1.00);
          vec3 price   = vec3(0.96, 0.69, 0.24);
          vec3 qty     = vec3(0.55, 0.61, 1.00);
          vec3 dup     = vec3(0.94, 0.37, 0.42);
          vec3 col = pending;
          col = mix(col, paid, step(vFault, 0.5) * vPast);
          col = mix(col, price, step(0.5, vFault) * step(vFault, 1.5) * vPast);
          col = mix(col, qty,   step(1.5, vFault) * step(vFault, 2.5) * vPast);
          col = mix(col, dup,   step(2.5, vFault) * vPast);
          gl_FragColor = vec4(col, vA * 0.92);
        }
      `,
    }));
    docs.frustumCulled = false;
    inner.add(docs);

    /* ---------- the lanes, and the gate they have to clear ---------- */
    const lineMat = new THREE.MeshBasicMaterial({ color: 0x4a5468, transparent: true, opacity: 0.3 });
    for (let lane = -1; lane <= 1; lane++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(W * GATE_U + 0.1, 0.006, 0.006), lineMat);
      m.position.set(-W / 2 + (W * GATE_U) / 2, lane * LANE_Y, -0.02);
      inner.add(m);
    }
    const paidLine = new THREE.Mesh(new THREE.BoxGeometry(W * (1 - GATE_U), 0.008, 0.008),
      new THREE.MeshBasicMaterial({ color: 0x4aa3ff, transparent: true, opacity: 0.35 }));
    paidLine.position.set(-W / 2 + W * GATE_U + (W * (1 - GATE_U)) / 2, 0, -0.02);
    inner.add(paidLine);

    const gate = new THREE.Mesh(new THREE.BoxGeometry(0.014, LANE_Y * 2.5, 0.014),
      new THREE.MeshBasicMaterial({ color: 0x6ee7ff, transparent: true, opacity: 0.5 }));
    gate.position.x = -W / 2 + W * GATE_U;
    inner.add(gate);

    const labels = createLabels(STATIC, { withGlyphs: true, color: "#e9eef8", count: STATIC.length + READOUT });
    inner.add(labels.mesh);

    return { inner, docs, gate, labels, camera, held };
  },

  pose({ inner, docs, gate, labels, camera, held }, { p, t }) {
    docs.material.uniforms.uP.value = p;
    docs.material.uniforms.uTime.value = t;
    gate.material.opacity = 0.34 + 0.14 * Math.sin(t * 2.4);
    inner.rotation.y = Math.sin(t * 0.05) * 0.015;   // before update(): the billboard reads it

    let i = 0;
    const put = (key, x, y, h, a = 1) => labels.set(i++, L[key], x, y, 0.05, h, a);

    put("THREE-WAY MATCH  ·  ONE MONTH OF AP", -0.1, LANE_Y * 1.6 + 0.5, 0.145);
    put("invoice", -W / 2 - 0.62, LANE_Y, 0.1, 0.8);
    put("purchase order", -W / 2 - 0.62, 0, 0.1, 0.8);
    put("goods receipt", -W / 2 - 0.62, -LANE_Y, 0.1, 0.8);
    put("GATE", -W / 2 + W * GATE_U, LANE_Y * 1.42, 0.095, 0.7);

    put("MATCHED", W / 2 - 0.5, -LANE_Y * 1.5, 0.1, 0.75);
    i = labels.write(i, `${PER_LANE - held}`, W / 2 - 0.9, -LANE_Y * 1.5 - 0.28, 0.05, 0.19);
    put("HELD", W / 2 - 0.5, LANE_Y * 1.62, 0.1, 0.75);
    i = labels.write(i, `${held}`, W / 2 - 0.86, LANE_Y * 1.62 + 0.26, 0.05, 0.19, 0.9);

    // The three ways a set can fail, keyed to the colours above the gate.
    for (let k = 0; k < FAULTS.length; k++) {
      put(FAULTS[k][0], -W / 2 + W * GATE_U + 0.55 + k * 0.72, LANE_Y * 1.42, 0.09, 0.6);
    }

    while (i < labels.count) labels.hide(i++);
    labels.update(camera);
  },
});
