/**
 * YIELD — "Mass In, Mass Out". The 4th dimension is the LINE ITSELF.
 *
 * A Sankey of one hundred kilos through a processing line. Scrolling carries the
 * mass left to right and it splits at each station: what ships as finished good,
 * what leaves as saleable trim, what is simply gone as shrink, and what comes back
 * as rework. Ribbon WIDTH is kilos, so the picture is the yield.
 *
 * A ribbon is drawn as a chain of flat quads whose height is the running mass, so
 * a split is a real narrowing rather than a line that happens to fork. That width
 * encoding is what keeps it from reading as `mycelia`'s network or `grove`'s tree —
 * this is a flow with quantity in it.
 */
import * as THREE from "../../_vendor/three.module.js";
import { createStage, clamp01, mix } from "./stage.js";
import { createLabels } from "./_labels.js";

// Where a hundred kilos actually ends up, and what a kilo of each is worth.
const STREAMS = [
  { key: "finished  68 kg", kg: 68, at: 1.00, y: 0.62, kind: 0 },
  { key: "trim  19 kg", kg: 19, at: 0.42, y: -0.5, kind: 1 },
  { key: "shrink  9 kg", kg: 9, at: 0.66, y: -1.06, kind: 2 },
  { key: "rework  4 kg", kg: 4, at: 0.24, y: 1.34, kind: 3 },
];
const SEG = 40, W = 4.6, SCALE = 0.022;   // world height per kilo

const STATIC = [
  "YIELD  ·  100 KG OF RAW INTAKE",
  "finished  68 kg", "trim  19 kg", "shrink  9 kg", "rework  4 kg",
  "intake", "SOLD AS FINISHED", "%",
];
const L = Object.fromEntries(STATIC.map((s, i) => [s, i]));
const READOUT = 10;

createStage({
  stillAt: 0.8,
  fitWidth: 6.8,   // content width incl. labels — see stage.js
  fov: 42,
  cameraFor: (narrow) => ({ pos: [0, 0.1, narrow ? 8.2 : 6.4], look: [0, 0.05, 0] }),
  framing: (p, narrow, w) => (narrow ? { x: 0, y: 0.2 } : { x: Math.min(1.3, w / 1100) - clamp01((p - 0.8) / 0.18) * 2.7, y: 0.05 }),
  build({ rig, camera }) {
    const inner = new THREE.Group();
    rig.add(inner);

    const off = [], scl = [], kind = [], tt = [], hgt = [];
    const xOf = (u) => -W / 2 + u * W;

    // The trunk: everything still in the main flow, narrowing at each split.
    let running = 100;
    const splits = [...STREAMS].filter((s) => s.kind !== 0).sort((a, b) => a.at - b.at);
    for (let i = 0; i < SEG; i++) {
      const u0 = i / SEG, u1 = (i + 1) / SEG;
      let mass = 100;
      for (const s of splits) if (u1 > s.at) mass -= s.kg;
      const h = mass * SCALE;
      off.push((xOf(u0) + xOf(u1)) / 2, 0, 0);
      scl.push(W / SEG, h, 1);
      kind.push(0); tt.push(u0); hgt.push(h);
    }
    running = 68;

    // Each branch leaves the trunk at its split point and curves to its own lane.
    for (const s of splits) {
      for (let i = 0; i < SEG; i++) {
        const a = i / SEG, b = (i + 1) / SEG;
        const ua = mix(s.at, 1, a), ub = mix(s.at, 1, b);
        const ease = (v) => v * v * (3 - 2 * v);
        const ya = s.y * ease(a), yb = s.y * ease(b);
        off.push((xOf(ua) + xOf(ub)) / 2, (ya + yb) / 2, -0.01);
        scl.push(Math.hypot(xOf(ub) - xOf(ua), yb - ya), s.kg * SCALE, 1);
        kind.push(s.kind); tt.push(ua); hgt.push(s.kg * SCALE);
      }
    }

    const n = kind.length;
    const quad = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = quad.index;
    geo.attributes.position = quad.attributes.position;
    geo.instanceCount = n;
    geo.setAttribute("aOff", new THREE.InstancedBufferAttribute(new Float32Array(off), 3));
    geo.setAttribute("aScl", new THREE.InstancedBufferAttribute(new Float32Array(scl), 3));
    geo.setAttribute("aKind", new THREE.InstancedBufferAttribute(new Float32Array(kind), 1));
    geo.setAttribute("aT", new THREE.InstancedBufferAttribute(new Float32Array(tt), 1));

    const flow = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      transparent: true,
      uniforms: { uFront: { value: 0 } },
      vertexShader: `
        attribute vec3 aOff, aScl;
        attribute float aKind, aT;
        uniform float uFront;
        varying float vKind, vA, vY;
        void main() {
          vKind = aKind;
          vY = position.y;
          // Mass arrives left to right; nothing downstream exists before it does.
          vA = clamp((uFront - aT) / 0.05, 0.0, 1.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position * aScl + aOff, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying float vKind, vA, vY;
        void main() {
          if (vA < 0.02) discard;
          vec3 trunk    = vec3(0.42, 0.62, 0.42);
          vec3 finished = vec3(0.30, 0.66, 0.38);
          vec3 trim     = vec3(0.79, 0.64, 0.16);   // saleable by-product
          vec3 shrink   = vec3(0.94, 0.37, 0.42);   // simply gone
          vec3 rework   = vec3(0.55, 0.61, 1.00);   // costs twice
          vec3 col = trunk;
          col = mix(col, trim,   step(0.5, vKind) * step(vKind, 1.5));
          col = mix(col, shrink, step(1.5, vKind) * step(vKind, 2.5));
          col = mix(col, rework, step(2.5, vKind));
          // A soft top/bottom edge so ribbons read as volume, not as flat bars.
          float e = 1.0 - smoothstep(0.32, 0.5, abs(vY));
          gl_FragColor = vec4(col * (0.55 + e * 0.6), vA * (0.30 + e * 0.55));
        }
      `,
    }));
    flow.frustumCulled = false;
    inner.add(flow);

    const labels = createLabels(STATIC, { withGlyphs: true, color: "#e8f0e8", count: STATIC.length + READOUT });
    inner.add(labels.mesh);

    return { inner, flow, labels, camera, xOf };
  },

  pose({ inner, flow, labels, camera, xOf }, { p, t }) {
    const front = p * 1.08;
    flow.material.uniforms.uFront.value = front;
    inner.rotation.y = Math.sin(t * 0.05) * 0.015;   // before update(): the billboard reads it

    let i = 0;
    const put = (key, x, y, h, a = 1) => labels.set(i++, L[key], x, y, 0.05, h, a);

    put("YIELD  ·  100 KG OF RAW INTAKE", 0, 2.0, 0.145);
    put("intake", -W / 2 - 0.5, 0, 0.1, 0.8);

    for (const s of STREAMS) {
      const shown = front > (s.kind === 0 ? 0.9 : s.at + 0.08);
      const y = s.kind === 0 ? 0 : s.y;
      put(s.key, W / 2 + 0.62, y, 0.1, shown ? 0.95 : 0.3);
    }

    // Yield to date — the only number on the page that matters to a cost roll.
    const done = clamp01((front - 0.9) / 0.12);
    put("SOLD AS FINISHED", -W / 2 + 0.72, -1.72, 0.1, 0.7);
    i = labels.write(i, `${Math.round(mix(100, 68, clamp01(front / 0.9)))}`, -W / 2 + 0.28, -2.0, 0.05, 0.2);
    put("%", -W / 2 + 0.76, -2.02, 0.13, 0.8 + done * 0.2);

    while (i < labels.count) labels.hide(i++);
    labels.update(camera);
  },
});
