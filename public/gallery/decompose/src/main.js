/**
 * DECOMPOSE — "Price Times Quantity". The 4th dimension is the SPLIT ITSELF.
 *
 * The oldest decomposition in cost accounting, drawn as the rectangle it actually
 * is. Standard hours across, standard rate up; the actual outturn is a bigger
 * rectangle, and the difference between them is the variance. Scrolling splits
 * that difference into the part you paid more per hour for (rate) and the part you
 * used more hours for (efficiency), plus the joint corner where both moved.
 *
 * Drawn as SMALL MULTIPLES across six cost centres rather than as one hero
 * rectangle. A single box is a diagram; six of them side by side is the actual
 * finding — a plant-level variance near zero routinely hides one centre badly over
 * and another badly under, and only the grid shows that.
 */
import * as THREE from "../../_vendor/three.module.js";
import { createStage, clamp01 } from "./stage.js";
import { createLabels } from "./_labels.js";

// Six centres: standard hours/rate normalised to 1.00, and what actually happened.
const CENTRES = [
  { key: "blanch", ah: 1.18, ar: 1.10 },
  { key: "freeze", ah: 1.04, ar: 1.02 },
  { key: "pack", ah: 0.92, ar: 1.14 },
  { key: "sort", ah: 1.26, ar: 0.97 },
  { key: "palletise", ah: 0.96, ar: 0.94 },
  { key: "sanitation", ah: 1.12, ar: 1.22 },
];
const COLS = 3, CELL = 1.72, BOX = 0.8;
const TOTAL_MISS = 360;   // the example the copy quotes: $180 rate + $180 efficiency

const STATIC = [
  "LABOUR VARIANCE  ·  SIX COST CENTRES",
  ...CENTRES.map((c) => c.key),
  "standard", "rate", "efficiency", "joint", "TOTAL MISS", "$",
];
const L = Object.fromEntries(STATIC.map((s, i) => [s, i]));
const READOUT = 10;
const LEGEND = ["standard", "rate", "efficiency", "joint"];

createStage({
  stillAt: 0.76,
  fitWidth: 5.8,   // content width incl. labels — see stage.js
  fov: 42,
  cameraFor: (narrow) => ({ pos: [0, 0, narrow ? 8.6 : 6.8], look: [0, 0, 0] }),
  framing: (p, narrow, w) => (narrow ? { x: 0, y: 0.2 } : { x: Math.min(1.3, w / 1100) - clamp01((p - 0.8) / 0.18) * 2.7, y: 0.05 }),
  build({ rig, camera }) {
    const inner = new THREE.Group();
    rig.add(inner);

    // Four quads per centre: the standard box, then rate, efficiency and joint.
    const off = [], scl = [], kind = [], cell = [];
    CENTRES.forEach((c, idx) => {
      const cx = (idx % COLS - (COLS - 1) / 2) * CELL;
      const cy = (0.5 - Math.floor(idx / COLS)) * CELL * 0.92;
      const x0 = cx - BOX / 2, y0 = cy - BOX / 2;
      const sw = BOX, sh = BOX;                    // the standard, by definition 1x1
      const aw = BOX * c.ah, ah = BOX * c.ar;
      const push = (x, y, w, h, k) => {
        if (Math.abs(w) < 1e-4 || Math.abs(h) < 1e-4) return;
        off.push(x + w / 2, y + h / 2, k === 0 ? -0.01 : 0);
        scl.push(Math.abs(w), Math.abs(h), 1);
        kind.push(k); cell.push(idx);
      };
      push(x0, y0, sw, sh, 0);                             // the standard
      push(x0, y0 + sh, Math.min(sw, aw), ah - sh, 1);     // rate: extra $ per hour
      push(x0 + sw, y0, aw - sw, Math.min(sh, ah), 2);     // efficiency: extra hours
      push(x0 + sw, y0 + sh, aw - sw, ah - sh, 3);         // the joint corner
    });

    const n = kind.length;
    const quad = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = quad.index;
    geo.attributes.position = quad.attributes.position;
    geo.instanceCount = n;
    geo.setAttribute("aOff", new THREE.InstancedBufferAttribute(new Float32Array(off), 3));
    geo.setAttribute("aScl", new THREE.InstancedBufferAttribute(new Float32Array(scl), 3));
    geo.setAttribute("aKind", new THREE.InstancedBufferAttribute(new Float32Array(kind), 1));
    geo.setAttribute("aCell", new THREE.InstancedBufferAttribute(new Float32Array(cell), 1));

    const boxes = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      transparent: true,
      uniforms: { uSplit: { value: 0 } },
      vertexShader: `
        attribute vec3 aOff, aScl;
        attribute float aKind, aCell;
        uniform float uSplit;
        varying float vKind, vA;
        varying vec2 vLocal;
        void main() {
          vKind = aKind;
          vLocal = position.xy;
          // Centres reveal in reading order, so the grid fills rather than blinks.
          float t = clamp((uSplit - aCell * 0.06) / 0.5, 0.0, 1.0);
          vA = aKind < 0.5 ? 1.0 : t;
          // Variance pieces grow out of the standard box as the split happens.
          vec3 s = aScl;
          if (aKind > 0.5) s = vec3(aScl.x * t, aScl.y * t, 1.0);
          vec3 o = aOff;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position * s + o, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying float vKind, vA;
        varying vec2 vLocal;
        void main() {
          if (vA < 0.02) discard;
          vec3 std  = vec3(0.62, 0.64, 0.66);   // what the standard allowed
          vec3 rate = vec3(0.70, 0.20, 0.12);   // paid more per hour
          vec3 eff  = vec3(0.25, 0.29, 0.36);   // used more hours
          vec3 joint= vec3(0.55, 0.42, 0.30);   // both moved at once
          vec3 col = std;
          col = mix(col, rate,  step(0.5, vKind) * step(vKind, 1.5));
          col = mix(col, eff,   step(1.5, vKind) * step(vKind, 2.5));
          col = mix(col, joint, step(2.5, vKind));
          float edge = max(abs(vLocal.x), abs(vLocal.y));
          float rim = smoothstep(0.40, 0.5, edge);
          gl_FragColor = vec4(col * (0.72 + rim * 0.5), vA * mix(0.20, 0.92, rim));
        }
      `,
    }));
    boxes.frustumCulled = false;
    inner.add(boxes);

    const labels = createLabels(STATIC, { withGlyphs: true, color: "#111111", count: STATIC.length + READOUT });
    inner.add(labels.mesh);

    return { inner, boxes, labels, camera };
  },

  pose({ inner, boxes, labels, camera }, { p, t }) {
    const split = clamp01((p - 0.12) / 0.6) * 1.4;
    boxes.material.uniforms.uSplit.value = split;
    inner.rotation.y = Math.sin(t * 0.05) * 0.012;   // before update(): the billboard reads it

    let i = 0;
    const put = (key, x, y, h, a = 1) => labels.set(i++, L[key], x, y, 0.05, h, a);

    put("LABOUR VARIANCE  ·  SIX COST CENTRES", 0, CELL * 1.14, 0.145);
    for (let idx = 0; idx < CENTRES.length; idx++) {
      const cx = (idx % COLS - (COLS - 1) / 2) * CELL;
      const cy = (0.5 - Math.floor(idx / COLS)) * CELL * 0.92;
      put(CENTRES[idx].key, cx - BOX / 2 + 0.12, cy - BOX / 2 - 0.16, 0.093, 0.8);
    }

    const shown = clamp01(split);
    for (let k = 0; k < LEGEND.length; k++) {
      put(LEGEND[k], -CELL * 1.34 + k * 0.94, -CELL * 1.14, 0.092, k === 0 ? 0.6 : 0.35 + shown * 0.6);
    }

    put("TOTAL MISS", CELL * 1.12, -CELL * 1.14, 0.095, 0.7);
    put("$", CELL * 0.84, -CELL * 1.38, 0.14, 0.8);
    i = labels.write(i, `${Math.round(TOTAL_MISS * shown)}`, CELL * 0.96, -CELL * 1.38, 0.05, 0.19);

    while (i < labels.count) labels.hide(i++);
    labels.update(camera);
  },
});
