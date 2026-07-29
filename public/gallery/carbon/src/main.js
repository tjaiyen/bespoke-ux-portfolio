/**
 * CARBON — "Two Axes". The 4th dimension is the SECOND AXIS ARRIVING.
 *
 * Act one is the view every plant already has: products ranked by margin, in a
 * row. Act two adds the axis nobody puts next to it — emissions per case — and the
 * row scatters into a field. The best-margin line turns out to sit at 2.4 kg CO2e
 * against a 0.9 kg portfolio median, which is a mix decision rather than a
 * reporting one.
 *
 * Bubbles are instanced BILLBOARDED QUADS with the disc cut in the fragment
 * shader, not `Points`. `gl_PointSize` is measured in pixels and is driver-clamped
 * under software rendering, so a radius encoding volume would silently lie about
 * the third variable — and world-space quads also let a label sit beside a bubble
 * at a known offset.
 */
import * as THREE from "../../_vendor/three.module.js";
import { createStage, clamp01 } from "./stage.js";
import { createLabels } from "./_labels.js";

const N = 46, W = 4.2, H = 2.6;
const MEDIAN_CO2 = 0.9, WORST = 2.4;

const STATIC = [
  "MARGIN vs EMISSIONS  ·  46 SKUs",
  "contribution margin →", "↑ kg CO₂e per case",
  "portfolio median", "highest margin", "kg", "MEDIAN",
];
const L = Object.fromEntries(STATIC.map((s, i) => [s, i]));
const READOUT = 10;

createStage({
  stillAt: 0.8,
  fitWidth: 6.2,   // content width incl. labels — see stage.js
  fov: 42,
  cameraFor: (narrow) => ({ pos: [0, 0, narrow ? 8.0 : 6.4], look: [0, 0, 0] }),
  framing: (p, narrow, w) => (narrow ? { x: 0, y: 0.2 } : { x: Math.min(1.4, w / 1050) - clamp01((p - 0.8) / 0.18) * 2.8, y: 0.05 }),
  build({ rig, camera }) {
    const inner = new THREE.Group();
    rig.add(inner);

    let seed = 7712; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

    // Margin and intensity are only loosely related, which is the whole point: a
    // strong correlation would make the second axis redundant.
    const skus = [];
    for (let i = 0; i < N; i++) {
      const margin = 0.06 + rnd() * 0.9;
      const co2 = Math.max(0.15, 0.35 + rnd() * 1.5 + margin * 0.55 * (rnd() > 0.35 ? 1 : -0.4));
      skus.push({ margin, co2, vol: 0.15 + Math.pow(rnd(), 1.9) });
    }
    // The headline case the copy quotes: the top-margin SKU is also near the worst.
    skus.sort((a, b) => b.margin - a.margin);
    skus[0].co2 = WORST; skus[0].vol = 0.85;

    const aRow = new Float32Array(N * 2), aField = new Float32Array(N * 2);
    const aR = new Float32Array(N), aHot = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const s = skus[i];
      // Act one: a margin-ranked row on one line.
      aRow[i * 2] = -W / 2 + (i / (N - 1)) * W;
      aRow[i * 2 + 1] = 0;
      // Act two: margin across, intensity up.
      aField[i * 2] = -W / 2 + s.margin * W;
      aField[i * 2 + 1] = -H / 2 + (s.co2 / 2.8) * H;
      aR[i] = 0.055 + Math.sqrt(s.vol) * 0.13;   // area, not radius, carries volume
      aHot[i] = s.co2 > MEDIAN_CO2 * 1.6 ? 1 : 0;
    }

    const quad = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = quad.index;
    geo.attributes.position = quad.attributes.position;
    geo.attributes.uv = quad.attributes.uv;
    geo.instanceCount = N;
    geo.setAttribute("aRow", new THREE.InstancedBufferAttribute(aRow, 2));
    geo.setAttribute("aField", new THREE.InstancedBufferAttribute(aField, 2));
    geo.setAttribute("aR", new THREE.InstancedBufferAttribute(aR, 1));
    geo.setAttribute("aHot", new THREE.InstancedBufferAttribute(aHot, 1));

    const bubbles = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uSpread: { value: 0 } },
      vertexShader: `
        attribute vec2 aRow, aField;
        attribute float aR, aHot;
        uniform float uSpread;
        varying vec2 vUv;
        varying float vHot;
        void main() {
          vUv = uv;
          vHot = aHot;
          vec2 c = mix(aRow, aField, uSpread);
          vec3 p = vec3(c + position.xy * aR * 2.0, 0.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        varying float vHot;
        void main() {
          // The disc is cut here, so the radius is in WORLD units and honestly
          // encodes volume at any zoom.
          float d = length(vUv - 0.5) * 2.0;
          if (d > 1.0) discard;
          float rim = smoothstep(0.62, 1.0, d);
          vec3 low  = vec3(0.18, 0.42, 0.23);
          vec3 high = vec3(0.72, 0.45, 0.10);
          vec3 col = mix(low, high, vHot);
          gl_FragColor = vec4(col * (0.75 + rim * 0.7), mix(0.34, 0.95, rim));
        }
      `,
    }));
    bubbles.frustumCulled = false;
    inner.add(bubbles);

    /* ---------- axes, and the median line the field is judged against ---------- */
    const axMat = new THREE.MeshBasicMaterial({ color: 0x4f5d52, transparent: true, opacity: 0.35 });
    const xA = new THREE.Mesh(new THREE.BoxGeometry(W, 0.008, 0.008), axMat);
    xA.position.y = -H / 2; inner.add(xA);
    const yA = new THREE.Mesh(new THREE.BoxGeometry(0.008, H, 0.008), axMat);
    yA.position.x = -W / 2; inner.add(yA);

    const med = new THREE.Mesh(new THREE.BoxGeometry(W, 0.01, 0.01),
      new THREE.MeshBasicMaterial({ color: 0x2f6b3a, transparent: true, opacity: 0 }));
    med.position.y = -H / 2 + (MEDIAN_CO2 / 2.8) * H;
    inner.add(med);

    const labels = createLabels(STATIC, { withGlyphs: true, color: "#16201a", count: STATIC.length + READOUT });
    inner.add(labels.mesh);

    return { inner, bubbles, med, labels, camera, top: skus[0] };
  },

  pose({ inner, bubbles, med, labels, camera, top }, { p, t }) {
    const spread = clamp01((p - 0.16) / 0.5);
    bubbles.material.uniforms.uSpread.value = spread;
    med.material.opacity = spread * 0.6;
    inner.rotation.y = Math.sin(t * 0.05) * 0.012;   // before update(): the billboard reads it

    let i = 0;
    const put = (key, x, y, h, a = 1) => labels.set(i++, L[key], x, y, 0.05, h, a);

    put("MARGIN vs EMISSIONS  ·  46 SKUs", 0, H / 2 + 0.42, 0.145);
    put("contribution margin →", 0, -H / 2 - 0.28, 0.095, 0.65);
    put("↑ kg CO₂e per case", -W / 2 - 0.52, 0, 0.095, 0.3 + spread * 0.4);

    put("portfolio median", W / 2 - 0.72, -H / 2 + (MEDIAN_CO2 / 2.8) * H + 0.16, 0.09, spread * 0.7);
    put("MEDIAN", -W / 2 + 0.3, H / 2 + 0.14, 0.09, 0.6);
    i = labels.write(i, `${MEDIAN_CO2.toFixed(1)}`, -W / 2 + 0.78, H / 2 + 0.14, 0.05, 0.12, 0.7);
    put("kg", -W / 2 + 1.02, H / 2 + 0.13, 0.1, 0.6);

    // The headline SKU, called out once the second axis exists.
    put("highest margin", W / 2 - 0.5, H / 2 + 0.14, 0.09, 0.4 + spread * 0.5);
    i = labels.write(i, `${top.co2.toFixed(1)}`, W / 2 + 0.16, H / 2 + 0.14, 0.05, 0.12, 0.4 + spread * 0.55);

    while (i < labels.count) labels.hide(i++);
    labels.update(camera);
  },
});
