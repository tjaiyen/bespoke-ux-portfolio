/**
 * SLOPE — "Down the Curve". The 4th dimension is CUMULATIVE PRODUCTION.
 *
 * A depth-axis instrument, not a chart on a wall. 512 unit-markers recede into the
 * screen; each bar's HEIGHT is that unit's cost, decaying on an 85% Wright slope.
 *
 * The corridor is FIXED and the front moves along it. An earlier version dollied the
 * corridor past the camera, which put unit one a metre from the lens as a wall of
 * blue — the whole curve has to stay in frame for the shape to be readable, and what
 * scroll advances is the boundary between what you have built and what you have not.
 *
 * The markers are spaced by DOUBLING rather than by unit index, because that is the
 * variable learning actually runs on: each equal step into the screen is one
 * doubling of cumulative output and a further 15% off unit cost. It also makes the
 * bars crowd together as you go, which is the honest picture — late doublings take
 * hundreds of units to earn.
 *
 * The front between ACTUAL and FORECAST is the whole point of the thing: bars
 * behind the scroll position are produced units in your own cost history, bars
 * ahead are what the fitted curve says the rest of the buy should cost.
 *
 * Reveal is by uniform — geometry is built once and `pose()` writes two floats, so
 * 512 bars cost one draw call and no per-frame matrix work.
 */
import * as THREE from "../../_vendor/three.module.js";
import { createStage, clamp01 } from "./stage.js";
import { createLabels } from "./_labels.js";

const UNITS = 512;
const DOUBLINGS = 9;                       // 2^9 = 512
const SLOPE = 0.85;                        // aerospace airframe learning slope
const B = Math.log(SLOPE) / Math.log(2);   // Wright exponent, ~-0.2345
const SPACING = 1.5;                       // world units per doubling
const H = 3.0;                             // world height of first-unit cost

const STATIC = [
  "UNIT COST  ·  85% LEARNING SLOPE",
  "ACTUAL", "FORECAST",
  "100%", "50%", "25%",
  "unit 1", "unit 8", "unit 64", "unit 512",
  "CUMULATIVE UNIT", "UNIT COST",
];
const L = Object.fromEntries(STATIC.map((s, i) => [s, i]));
const READOUT_BUDGET = 14;
// Hoisted: rebuilding this table inside pose() allocated five arrays a frame.
const DEPTH_TICKS = [["unit 1", 0, 0.15], ["unit 8", 3, 0.17], ["unit 64", 6, 0.2], ["unit 512", 9, 0.26]];

createStage({
  stillAt: 0.6,
  fitWidth: 5.2,   // content width incl. labels — see stage.js
  fov: 46,
  // Three-quarter view. Looking straight down the corridor stacks all 512 bars
  // behind unit one and you see a sliver; offsetting the camera sideways is what
  // turns the depth axis into something you can actually read a curve off.
  cameraFor: (narrow) => ({ pos: [narrow ? 3.8 : 5.2, 1.75, narrow ? 9.4 : 7.4], look: [-0.2, 1.55, -5.0] }),
  // A chart must not drift the way a natural subject can, and the camera is
  // already off-axis — so it only steps aside far enough to clear the panel.
  framing: (p, narrow, w) => (narrow ? { x: 0, y: 0.35 } : { x: Math.min(0.9, w / 1500) - clamp01((p - 0.8) / 0.18) * 2.4, y: 0.15 }),
  build({ rig, camera }) {
    const inner = new THREE.Group();
    rig.add(inner);

    /* ---------- the unit-cost bars ---------- */
    const box = new THREE.BoxGeometry(1, 1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = box.index;
    geo.attributes.position = box.attributes.position;
    geo.attributes.normal = box.attributes.normal;
    geo.instanceCount = UNITS;

    const aZ = new Float32Array(UNITS);
    const aH = new Float32Array(UNITS);
    const aD = new Float32Array(UNITS);
    for (let i = 0; i < UNITS; i++) {
      const unit = i + 1;
      const d = Math.log2(unit);            // doublings elapsed at this unit
      aD[i] = d;
      aZ[i] = -d * SPACING;
      aH[i] = Math.pow(unit, B) * H;        // Wright: T_n = T_1 * n^b
    }
    geo.setAttribute("aZ", new THREE.InstancedBufferAttribute(aZ, 1));
    geo.setAttribute("aH", new THREE.InstancedBufferAttribute(aH, 1));
    geo.setAttribute("aD", new THREE.InstancedBufferAttribute(aD, 1));

    const bars = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      transparent: true,
      uniforms: { uFront: { value: 0 } },
      vertexShader: `
        attribute float aZ;
        attribute float aH;
        attribute float aD;
        uniform float uFront;
        varying float vProduced;
        varying float vTop;
        varying float vFade;
        void main() {
          vProduced = step(aD, uFront);
          vTop = step(0.5, normal.y);
          vec3 p = position;
          p.x *= 0.20;
          p.z *= 0.20;
          p.y = (p.y + 0.5) * aH;           // stand the bar on y = 0
          float z = aZ + p.z;
          // Fade the far end rather than letting the late doublings — which crowd
          // into the last two units of depth — stack into a solid wall.
          // Edges ascending: smoothstep with edge0 > edge1 is undefined in GLSL ES 1.0.
          vFade = 1.0 - (1.0 - smoothstep(-13.6, -7.0, z)) * 0.72;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p.x, p.y, z, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying float vProduced;
        varying float vTop;
        varying float vFade;
        void main() {
          vec3 actual   = vec3(0.12, 0.31, 0.47);   // produced units: your own history
          vec3 forecast = vec3(0.70, 0.74, 0.79);   // ahead of the front: the fit
          vec3 col = mix(forecast, actual, vProduced);
          col *= 0.86 + vTop * 0.20;                // catch the top face
          gl_FragColor = vec4(col, (0.35 + vProduced * 0.6) * vFade);
        }
      `,
    }));
    bars.frustumCulled = false;
    inner.add(bars);

    /* ---------- axis furniture ---------- */
    const axisMat = new THREE.MeshBasicMaterial({ color: 0x8d99a6, transparent: true, opacity: 0.45 });
    // Gridlines run the length of the corridor so the cost level is readable at
    // any depth, not just at the near end.
    for (const frac of [1, 0.5, 0.25]) {
      const g = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 14.4), axisMat);
      g.position.set(-1.15, frac * H, -6.9);
      inner.add(g);
    }
    const yAxis = new THREE.Mesh(new THREE.BoxGeometry(0.018, H * 1.06, 0.018), axisMat);
    yAxis.position.set(-1.15, H * 0.53, 0.2);
    inner.add(yAxis);

    // The front cursor: the boundary between produced and forecast, and the one
    // thing scroll actually moves.
    const cursor = new THREE.Mesh(
      new THREE.PlaneGeometry(0.85, H * 1.12),
      new THREE.MeshBasicMaterial({ color: 0xb3341f, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }),
    );
    cursor.position.y = H * 0.575;
    inner.add(cursor);

    /* ---------- labels ---------- */
    const labels = createLabels(STATIC, {
      withGlyphs: true,
      color: "#2a3340",
      count: STATIC.length + READOUT_BUDGET,
    });
    inner.add(labels.mesh);

    return { inner, bars, labels, cursor, camera };
  },

  pose({ inner, bars, labels, cursor, camera }, { p, t }) {
    // Scroll advances the ACTUAL/FORECAST front along a corridor that never moves.
    const front = p * DOUBLINGS;
    bars.material.uniforms.uFront.value = front;
    cursor.position.z = -front * SPACING;
    cursor.material.opacity = 0.13 + 0.06 * Math.sin(t * 1.8);

    inner.rotation.y = Math.sin(t * 0.05) * 0.015;   // before update(): the billboard reads this rotation
    let i = 0;
    const put = (key, x, y, z, h, a = 1) => labels.set(i++, L[key], x, y, z, h, a);

    // Title sits above everything; the legend goes BELOW it, on its own line —
    // sharing a line put "FORECAST" straight through "LEARNING SLOPE".
    put("UNIT COST  ·  85% LEARNING SLOPE", 0.35, H * 1.26, 0.6, 0.16);
    put("ACTUAL", -0.1, H * 1.07, 0.6, 0.12, 0.95);
    put("FORECAST", 0.85, H * 1.07, 0.6, 0.12, 0.5);

    // Cost axis, at the near end and static.
    put("100%", -1.62, H, 0.2, 0.145);
    put("50%", -1.59, H * 0.5, 0.2, 0.145);
    put("25%", -1.59, H * 0.25, 0.2, 0.145);
    put("UNIT COST", -1.62, H * 1.07, 0.2, 0.11, 0.7);

    // Depth ticks mark fixed positions on a fixed corridor. They shrink with
    // distance like everything else, so the far ones are set larger.
    for (let k = 0; k < DEPTH_TICKS.length; k++) {
      const tk = DEPTH_TICKS[k];
      put(tk[0], 0.0, -0.32, -tk[1] * SPACING, tk[2], 0.85);
    }
    put("CUMULATIVE UNIT", 0.0, -0.66, 0.2, 0.115, 0.7);

    // Live readout — where the front is right now.
    const unit = Math.max(1, Math.round(Math.pow(2, front)));
    const pct = Math.pow(SLOPE, front) * 100;
    i = labels.write(i, `${unit}`, 2.15, H * 0.9, 0.4, 0.28);
    i = labels.write(i, `${pct.toFixed(1)}%`, 2.15, H * 0.66, 0.4, 0.2);
    while (i < labels.count) labels.hide(i++);
    labels.update(camera);

  },
});
