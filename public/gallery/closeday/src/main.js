/**
 * CLOSE — "Eleven Tasks". The 4th dimension is the CLOSE CLOCK.
 *
 * Forty close tasks as a Gantt across five days. Scrolling runs the clock: each
 * bar fills as its task is worked, blocked tasks wait visibly for their
 * predecessor, and the eleven tasks on the critical path light up while the other
 * twenty-nine — the ones with slack — stay quiet.
 *
 * The point the chart is making is subtractive. Everyone's instinct is to optimise
 * the forty-item list; only eleven of them can move the date at all, and the chart
 * exists to make the other twenty-nine visibly irrelevant.
 *
 * A task's fill is a pure function of the clock, so scrubbing back un-runs the
 * close exactly rather than leaving bars stuck full.
 */
import * as THREE from "../../_vendor/three.module.js";
import { createStage, clamp01 } from "./stage.js";
import { createLabels } from "./_labels.js";

const TASKS = 40, DAYS = 5, CRITICAL = 11;
const W = 4.6, ROWH = 0.115;

const STATIC = [
  "THE FIVE-DAY CLOSE  ·  40 TASKS",
  "day 1", "day 2", "day 3", "day 4", "day 5",
  "critical path", "has slack", "ON THE PATH", "of 40", "DAY",
];
const L = Object.fromEntries(STATIC.map((s, i) => [s, i]));
const READOUT = 12;
const DAY_KEYS = ["day 1", "day 2", "day 3", "day 4", "day 5"];

createStage({
  stillAt: 0.82,
  fitWidth: 5.4,   // content width incl. labels — see stage.js
  fov: 42,
  cameraFor: (narrow) => ({ pos: [0, 0, narrow ? 8.2 : 6.6], look: [0, 0, 0] }),
  framing: (p, narrow, w) => (narrow ? { x: 0, y: 0.2 } : { x: Math.min(1.35, w / 1080) - clamp01((p - 0.8) / 0.18) * 2.8, y: 0.05 }),
  build({ rig, camera }) {
    const inner = new THREE.Group();
    rig.add(inner);

    let seed = 5051; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

    // The critical path is a genuine chain: each of its tasks starts where the
    // previous one ended, and together they span the whole five days. Everything
    // else is scheduled around them with real slack.
    const tasks = [];
    let cursor = 0;
    for (let c = 0; c < CRITICAL; c++) {
      const dur = (DAYS / CRITICAL) * (0.75 + rnd() * 0.5);
      tasks.push({ start: cursor, dur, crit: true });
      cursor = Math.min(DAYS, cursor + dur);
    }
    // Rescale so the chain lands exactly on day 5 — the path IS the close length.
    const scale = DAYS / cursor;
    for (const t of tasks) { t.start *= scale; t.dur *= scale; }
    for (let k = tasks.length; k < TASKS; k++) {
      const dur = 0.25 + rnd() * 1.1;
      tasks.push({ start: rnd() * (DAYS - dur), dur, crit: false });
    }
    // Critical tasks first so the eye reads the chain as one band.
    tasks.sort((a, b) => (b.crit - a.crit) || (a.start - b.start));

    const aStart = new Float32Array(TASKS), aDur = new Float32Array(TASKS);
    const aRow = new Float32Array(TASKS), aCrit = new Float32Array(TASKS);
    for (let i = 0; i < TASKS; i++) {
      aStart[i] = tasks[i].start; aDur[i] = tasks[i].dur;
      aRow[i] = i; aCrit[i] = tasks[i].crit ? 1 : 0;
    }

    const quad = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = quad.index;
    geo.attributes.position = quad.attributes.position;
    geo.attributes.uv = quad.attributes.uv;
    geo.instanceCount = TASKS;
    geo.setAttribute("aStart", new THREE.InstancedBufferAttribute(aStart, 1));
    geo.setAttribute("aDur", new THREE.InstancedBufferAttribute(aDur, 1));
    geo.setAttribute("aRow", new THREE.InstancedBufferAttribute(aRow, 1));
    geo.setAttribute("aCrit", new THREE.InstancedBufferAttribute(aCrit, 1));

    const bars = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      transparent: true,
      uniforms: { uClock: { value: 0 }, uPath: { value: 0 } },
      vertexShader: `
        attribute float aStart, aDur, aRow, aCrit;
        uniform float uClock, uPath;
        varying float vCrit, vFill, vU;
        void main() {
          vCrit = aCrit;
          vU = uv.x;
          // How far this task has actually been worked, purely from the clock.
          vFill = clamp((uClock - aStart) / max(0.0001, aDur), 0.0, 1.0);
          float x0 = -${(W / 2).toFixed(2)} + (aStart / ${DAYS}.0) * ${W.toFixed(2)};
          float w  = (aDur / ${DAYS}.0) * ${W.toFixed(2)};
          float y  = ${((TASKS - 1) / 2).toFixed(1)} * ${ROWH} - aRow * ${ROWH};
          vec3 p = vec3(x0 + (position.x + 0.5) * w, y + position.y * ${(ROWH * 0.66).toFixed(3)}, 0.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying float vCrit, vFill, vU;
        uniform float uPath;
        void main() {
          vec3 slackC = vec3(0.42, 0.48, 0.56);
          vec3 critC  = vec3(0.13, 0.31, 0.43);
          vec3 hot    = vec3(0.48, 0.32, 0.19);
          // Once the path is called out, the 29 with slack recede and the 11 that
          // set the date come forward. That contrast IS the argument.
          vec3 done = mix(critC, hot, vCrit * uPath);
          float worked = step(vU, vFill);
          vec3 col = mix(slackC, done, worked);
          float a = mix(0.13, mix(0.55, 0.95, vCrit * uPath + (1.0 - uPath) * 0.5), worked);
          gl_FragColor = vec4(col, a);
        }
      `,
    }));
    bars.frustumCulled = false;
    inner.add(bars);

    /* ---------- day gridlines and the running clock ---------- */
    const gMat = new THREE.MeshBasicMaterial({ color: 0x4f5c6e, transparent: true, opacity: 0.22 });
    const HH = TASKS * ROWH;
    for (let d = 0; d <= DAYS; d++) {
      const g = new THREE.Mesh(new THREE.BoxGeometry(0.006, HH, 0.006), gMat);
      g.position.x = -W / 2 + (d / DAYS) * W;
      inner.add(g);
    }
    const clock = new THREE.Mesh(new THREE.BoxGeometry(0.014, HH * 1.06, 0.014),
      new THREE.MeshBasicMaterial({ color: 0x22506e, transparent: true, opacity: 0.6 }));
    inner.add(clock);

    const labels = createLabels(STATIC, { withGlyphs: true, color: "#131a24", count: STATIC.length + READOUT });
    inner.add(labels.mesh);

    return { inner, bars, clock, labels, camera, HH };
  },

  pose({ inner, bars, clock, labels, camera, HH }, { p, t }) {
    const day = p * DAYS;
    const path = clamp01((p - 0.55) / 0.3);
    bars.material.uniforms.uClock.value = day;
    bars.material.uniforms.uPath.value = path;
    clock.position.x = -W / 2 + (Math.min(day, DAYS) / DAYS) * W;
    clock.material.opacity = 0.45 + 0.15 * Math.sin(t * 2.2);
    inner.rotation.y = Math.sin(t * 0.05) * 0.012;   // before update(): the billboard reads it

    let i = 0;
    const put = (key, x, y, h, a = 1) => labels.set(i++, L[key], x, y, 0.05, h, a);
    const top = HH / 2;

    put("THE FIVE-DAY CLOSE  ·  40 TASKS", 0, top + 0.42, 0.145);
    for (let d = 0; d < DAYS; d++) {
      put(DAY_KEYS[d], -W / 2 + ((d + 0.5) / DAYS) * W, top + 0.14, 0.09, day > d ? 0.85 : 0.45);
    }

    put("critical path", -W / 2 + 0.5, -top - 0.28, 0.092, 0.4 + path * 0.55);
    put("has slack", -W / 2 + 1.5, -top - 0.28, 0.092, 0.55 - path * 0.2);

    put("ON THE PATH", W / 2 - 0.62, -top - 0.28, 0.095, 0.5 + path * 0.4);
    i = labels.write(i, `${CRITICAL}`, W / 2 - 0.98, -top - 0.56, 0.05, 0.19, 0.4 + path * 0.6);
    put("of 40", W / 2 - 0.62, -top - 0.57, 0.098, 0.5 + path * 0.4);

    put("DAY", -W / 2 - 0.02, -top - 0.56, 0.09, 0.6);
    i = labels.write(i, `${Math.min(DAYS, day).toFixed(1)}`, -W / 2 + 0.34, -top - 0.56, 0.05, 0.12, 0.75);

    while (i < labels.count) labels.hide(i++);
    labels.update(camera);
  },
});
