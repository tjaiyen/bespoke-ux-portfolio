/**
 * CHAIN — "Five Links". The 4th dimension is AUDIT ORDER.
 *
 * FSMA 204 requires five Critical Tracking Events per lot, each with complete key
 * data. This is 44 lots as parallel five-node chains, and scrolling runs the audit
 * one event column at a time — growing, receiving, transforming, creating,
 * shipping — the way a records request actually works its way through a book.
 *
 * A missing event leaves a hole and the link into it goes red. One lot here is
 * missing all five: an unbroken row of red that would not survive a 24-hour FDA
 * records request at any price.
 *
 * Deliberately RECTILINEAR. An organic web would read as `mycelia`; a chain of
 * custody is a grid, and looking like one is the point.
 */
import * as THREE from "../../_vendor/three.module.js";
import { createStage, clamp01 } from "./stage.js";
import { createLabels } from "./_labels.js";

const LOTS = 44, EVENTS = 5;
// ROWH is set so 44 rows fit the frustum with room for the header and footer
// labels — at 0.135 the grid was ~6 units tall and the title fell off the top.
const COLW = 1.02, ROWH = 0.092;

const STATIC = [
  "CRITICAL TRACKING EVENTS  ·  44 LOTS",
  "growing", "receiving", "transforming", "creating", "shipping",
  "COMPLETE", "GAPS", "of 220 events",
];
const L = Object.fromEntries(STATIC.map((s, i) => [s, i]));
const READOUT = 12;
const EVENT_KEYS = ["growing", "receiving", "transforming", "creating", "shipping"];

createStage({
  stillAt: 0.8,
  fitWidth: 5.6,   // content width incl. labels — see stage.js
  fov: 42,
  cameraFor: (narrow) => ({ pos: [0, 0, narrow ? 9.6 : 7.6], look: [0, 0, 0] }),
  framing: (p, narrow, w) => (narrow ? { x: 0, y: 0.2 } : { x: Math.min(1.4, w / 1050) - clamp01((p - 0.8) / 0.18) * 2.9, y: 0.05 }),
  build({ rig, camera }) {
    const inner = new THREE.Group();
    rig.add(inner);

    let seed = 4204; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

    // Which events each lot is missing. Most books are nearly clean, a handful of
    // lots have a hole, and exactly one is missing everything.
    const present = [];
    for (let r = 0; r < LOTS; r++) {
      const row = [];
      for (let e = 0; e < EVENTS; e++) row.push(rnd() > 0.055);
      present.push(row);
    }
    for (let e = 0; e < EVENTS; e++) present[Math.floor(LOTS * 0.61)][e] = false;

    let gaps = 0;
    for (const row of present) for (const ok of row) if (!ok) gaps++;

    const X0 = -COLW * (EVENTS - 1) / 2;
    const Y0 = -ROWH * (LOTS - 1) / 2;

    /* ---------- nodes ---------- */
    const nN = LOTS * EVENTS;
    const nPos = new Float32Array(nN * 3), nOk = new Float32Array(nN), nCol = new Float32Array(nN);
    let k = 0;
    for (let r = 0; r < LOTS; r++) {
      for (let e = 0; e < EVENTS; e++, k++) {
        nPos[k * 3] = X0 + e * COLW;
        nPos[k * 3 + 1] = Y0 + r * ROWH;
        nPos[k * 3 + 2] = 0;
        nOk[k] = present[r][e] ? 1 : 0;
        nCol[k] = e;
      }
    }
    const nodeGeo = new THREE.InstancedBufferGeometry();
    const nq = new THREE.PlaneGeometry(0.13, 0.055);
    nodeGeo.index = nq.index;
    nodeGeo.attributes.position = nq.attributes.position;
    nodeGeo.instanceCount = nN;
    nodeGeo.setAttribute("aPos", new THREE.InstancedBufferAttribute(nPos, 3));
    nodeGeo.setAttribute("aOk", new THREE.InstancedBufferAttribute(nOk, 1));
    nodeGeo.setAttribute("aCol", new THREE.InstancedBufferAttribute(nCol, 1));

    const NODE_VS = `
      attribute vec3 aPos;
      attribute float aOk;
      attribute float aCol;
      uniform float uFront;
      varying float vOk, vOn;
      void main() {
        vOk = aOk;
        // The audit works column by column: an event is only judged once checked.
        vOn = clamp((uFront - aCol) / 0.5, 0.0, 1.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position + aPos, 1.0);
      }`;
    const NODE_FS = `
      precision highp float;
      varying float vOk, vOn;
      void main() {
        vec3 ok  = vec3(0.37, 0.81, 0.68);   // captured, complete
        vec3 bad = vec3(0.94, 0.37, 0.42);   // missing
        vec3 col = mix(bad, ok, vOk);
        // Unchecked events sit as faint placeholders rather than as nothing, so the
        // book has a shape before the audit reaches it.
        float a = mix(0.10, vOk > 0.5 ? 0.72 : 0.95, vOn);
        gl_FragColor = vec4(col * (0.5 + vOn * 0.6), a);
      }`;
    const nodes = new THREE.Mesh(nodeGeo, new THREE.ShaderMaterial({
      transparent: true, uniforms: { uFront: { value: 0 } },
      vertexShader: NODE_VS, fragmentShader: NODE_FS,
    }));
    nodes.frustumCulled = false;
    inner.add(nodes);

    /* ---------- links between consecutive events ---------- */
    const nL = LOTS * (EVENTS - 1);
    const lPos = new Float32Array(nL * 3), lOk = new Float32Array(nL), lCol = new Float32Array(nL);
    k = 0;
    for (let r = 0; r < LOTS; r++) {
      for (let e = 0; e < EVENTS - 1; e++, k++) {
        lPos[k * 3] = X0 + e * COLW + COLW / 2;
        lPos[k * 3 + 1] = Y0 + r * ROWH;
        lPos[k * 3 + 2] = -0.01;
        // A link is only intact if BOTH ends were captured.
        lOk[k] = present[r][e] && present[r][e + 1] ? 1 : 0;
        lCol[k] = e + 1;
      }
    }
    const linkGeo = new THREE.InstancedBufferGeometry();
    const lq = new THREE.PlaneGeometry(COLW - 0.14, 0.012);
    linkGeo.index = lq.index;
    linkGeo.attributes.position = lq.attributes.position;
    linkGeo.instanceCount = nL;
    linkGeo.setAttribute("aPos", new THREE.InstancedBufferAttribute(lPos, 3));
    linkGeo.setAttribute("aOk", new THREE.InstancedBufferAttribute(lOk, 1));
    linkGeo.setAttribute("aCol", new THREE.InstancedBufferAttribute(lCol, 1));
    const links = new THREE.Mesh(linkGeo, new THREE.ShaderMaterial({
      transparent: true, uniforms: { uFront: { value: 0 } },
      vertexShader: NODE_VS, fragmentShader: `
        precision highp float;
        varying float vOk, vOn;
        void main() {
          vec3 ok  = vec3(0.31, 0.62, 0.55);
          vec3 bad = vec3(0.94, 0.37, 0.42);
          gl_FragColor = vec4(mix(bad, ok, vOk), mix(0.06, vOk > 0.5 ? 0.42 : 0.9, vOn));
        }`,
    }));
    links.frustumCulled = false;
    inner.add(links);

    const labels = createLabels(STATIC, { withGlyphs: true, color: "#e6eef2", count: STATIC.length + READOUT });
    inner.add(labels.mesh);

    return { inner, nodes, links, labels, camera, gaps, X0, Y0 };
  },

  pose(w, { p, t }) {
    const { inner, nodes, links, labels, camera, gaps, X0, Y0 } = w;
    const front = p * (EVENTS + 0.4);
    nodes.material.uniforms.uFront.value = front;
    links.material.uniforms.uFront.value = front;
    inner.rotation.y = Math.sin(t * 0.05) * 0.015;   // before update(): the billboard reads it

    // Gaps found so far — only events the audit has actually reached count.
    const cols = clamp01(front / EVENTS);
    const found = Math.round(gaps * cols);
    const checked = Math.round(LOTS * EVENTS * cols);

    let i = 0;
    const put = (key, x, y, h, a = 1) => labels.set(i++, L[key], x, y, 0.05, h, a);
    const top = -Y0 + 0.3;

    put("CRITICAL TRACKING EVENTS  ·  44 LOTS", 0, top + 0.42, 0.145);
    for (let e = 0; e < EVENTS; e++) {
      put(EVENT_KEYS[e], X0 + e * COLW, top + 0.1, 0.1, front > e ? 0.95 : 0.4);
    }

    put("GAPS", X0 - 0.02, Y0 - 0.34, 0.1, 0.75);
    i = labels.write(i, `${found}`, X0 - 0.34, Y0 - 0.58, 0.05, 0.19);
    put("of 220 events", X0 + 0.36, Y0 - 0.58, 0.095, 0.6);

    put("COMPLETE", -X0 - 0.6, Y0 - 0.34, 0.1, 0.75);
    i = labels.write(i, `${checked - found}`, -X0 - 0.6, Y0 - 0.58, 0.05, 0.19, 0.85);

    while (i < labels.count) labels.hide(i++);
    labels.update(camera);
  },
});
