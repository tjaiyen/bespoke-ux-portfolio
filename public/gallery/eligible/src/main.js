/**
 * ELIGIBLE — "The Haircut". The 4th dimension is CERTIFICATION ORDER.
 *
 * A squarified treemap of ~760 inventory lots, tile area proportional to dollars.
 * Scrolling applies the borrowing-base carve-outs in the order a field examiner
 * takes them — aged stock, then consignment, then the PACA grower trust — and at
 * each step the excluded tiles drop out and the survivors RE-PACK into the smaller
 * rectangle that is left. $376K gross becomes $199K advanceable.
 *
 * Re-packing is what makes it read as a certificate rather than a bar chart: the
 * eligible pool is a rectangle that keeps its shape while losing half its area.
 *
 * All four packings (gross, then after each carve-out) are computed ONCE in
 * build() and stored per tile as four rects. pose() writes a single uniform, and
 * the vertex shader chains three mixes between them — the same trick meander uses
 * for its path. A tile that dies freezes at its own death stage and falls away, so
 * scrubbing back up the page re-packs the book exactly.
 */
import * as THREE from "../../_vendor/three.module.js";
import { createStage, clamp01 } from "./stage.js";
import { createLabels } from "./_labels.js";

const W = 4.6, H = 3.0;              // world size of the gross rectangle
const GROSS_K = 376, ELIGIBLE_K = 199, PACA_K = 12;
// Carve-outs in examiner order. The two middle figures are what remains once the
// eligible pool and the PACA trust claim are taken out of the gross book.
const AGED_K = 96, CONSIGN_K = 69;

const STATIC = [
  "BORROWING BASE  ·  FROZEN INVENTORY",
  "eligible", "aged", "consignment", "PACA trust",
  "GROSS", "ADVANCEABLE", "K",
];
const L = Object.fromEntries(STATIC.map((s, i) => [s, i]));
const READOUT = 12;

/** Squarified treemap: lays values into `rect` keeping tiles near-square. */
function squarify(values, rect) {
  const out = new Array(values.length);
  const idx = values.map((v, i) => i).sort((a, b) => values[b] - values[a]);
  let [x, y, w, h] = rect;
  let total = 0;
  for (const v of values) total += v;
  let remaining = total;
  let i = 0;
  while (i < idx.length) {
    const horizontal = w >= h;
    const side = horizontal ? h : w;
    const scale = (horizontal ? w : h) / Math.max(1e-9, remaining);
    // Grow a row while it improves the worst aspect ratio.
    let rowSum = 0, best = Infinity, end = i;
    for (let j = i; j < idx.length; j++) {
      const s = rowSum + values[idx[j]];
      const depth = s * scale;
      let worst = 0;
      for (let k = i; k <= j; k++) {
        const len = (values[idx[k]] / Math.max(1e-9, s)) * side;
        worst = Math.max(worst, Math.max(depth / Math.max(1e-9, len), len / Math.max(1e-9, depth)));
      }
      if (worst > best) break;
      best = worst; rowSum = s; end = j;
    }
    const depth = rowSum * scale;
    let cursor = 0;
    for (let k = i; k <= end; k++) {
      const frac = values[idx[k]] / Math.max(1e-9, rowSum);
      const len = frac * side;
      out[idx[k]] = horizontal
        ? [x, y + cursor, depth, len]
        : [x + cursor, y, len, depth];
      cursor += len;
    }
    if (horizontal) { x += depth; w -= depth; } else { y += depth; h -= depth; }
    remaining -= rowSum;
    i = end + 1;
  }
  for (let k = 0; k < out.length; k++) if (!out[k]) out[k] = [x, y, 0, 0];
  return out;
}

createStage({
  stillAt: 0.78,
  fitWidth: 5.8,   // content width incl. labels — see stage.js
  fov: 42,
  cameraFor: (narrow) => ({ pos: [0, 0.1, narrow ? 8.2 : 6.6], look: [0, 0.05, 0] }),
  framing: (p, narrow, w) => (narrow ? { x: 0, y: 0.2 } : { x: Math.min(1.5, w / 1000) - clamp01((p - 0.8) / 0.18) * 3.0, y: 0.1 }),
  build({ rig, camera }) {
    const inner = new THREE.Group();
    rig.add(inner);

    /* ---------- a book of lots, tagged by what excludes them ---------- */
    // Deterministic: a seeded generator, so the packing is identical every load
    // and the tracked preview keeps matching the site.
    let seed = 20260727;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

    const lots = [];
    const fill = (totalK, act, count) => {
      const raw = [];
      let sum = 0;
      for (let i = 0; i < count; i++) { const v = 0.2 + Math.pow(rnd(), 2.2) * 4; raw.push(v); sum += v; }
      for (const v of raw) lots.push({ k: (v / sum) * totalK, act });
    };
    // act 0 survives every carve-out; 1/2/3 die at that stage.
    fill(ELIGIBLE_K, 0, 380);
    fill(AGED_K, 1, 190);
    fill(CONSIGN_K, 2, 130);
    fill(PACA_K, 3, 60);

    const n = lots.length;
    const RECT = [-W / 2, -H / 2, W, H];
    // Four packings: gross, and after each carve-out in examiner order.
    const packs = [];
    for (let stage = 0; stage <= 3; stage++) {
      const live = lots.map((l) => (l.act === 0 || l.act > stage ? l.k : 0));
      packs.push(squarify(live, RECT));
    }

    const a0 = new Float32Array(n * 4), a1 = new Float32Array(n * 4);
    const a2 = new Float32Array(n * 4), a3 = new Float32Array(n * 4);
    const aAct = new Float32Array(n), aSeed = new Float32Array(n);
    const put = (arr, i, r) => { arr[i * 4] = r[0]; arr[i * 4 + 1] = r[1]; arr[i * 4 + 2] = r[2]; arr[i * 4 + 3] = r[3]; };
    for (let i = 0; i < n; i++) {
      put(a0, i, packs[0][i]); put(a1, i, packs[1][i]);
      put(a2, i, packs[2][i]); put(a3, i, packs[3][i]);
      // 99 = survives everything; the shader compares against the stage clock.
      aAct[i] = lots[i].act === 0 ? 99 : lots[i].act;
      aSeed[i] = rnd();
    }

    const quad = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = quad.index;
    geo.attributes.position = quad.attributes.position;
    geo.instanceCount = n;
    geo.setAttribute("aR0", new THREE.InstancedBufferAttribute(a0, 4));
    geo.setAttribute("aR1", new THREE.InstancedBufferAttribute(a1, 4));
    geo.setAttribute("aR2", new THREE.InstancedBufferAttribute(a2, 4));
    geo.setAttribute("aR3", new THREE.InstancedBufferAttribute(a3, 4));
    geo.setAttribute("aAct", new THREE.InstancedBufferAttribute(aAct, 1));
    geo.setAttribute("aSeed", new THREE.InstancedBufferAttribute(aSeed, 1));

    const tiles = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      transparent: true,
      uniforms: { uStage: { value: 0 } },
      vertexShader: `
        attribute vec4 aR0, aR1, aR2, aR3;
        attribute float aAct;
        attribute float aSeed;
        uniform float uStage;
        varying float vAct;
        varying float vDead;
        varying vec2 vLocal;
        void main() {
          // A tile stops re-packing at the moment it is carved out.
          float death = aAct;
          float raw = min(uStage, death);
          // SNAP, don't lerp linearly. Any midpoint between two treemaps is not
          // itself a treemap — tiles slide through each other and the packing shows
          // gaps. Easing hard means most of each stage rests on a clean tessellation
          // and the re-pack reads as a quick settle rather than a broken layout.
          float prog = floor(raw) + smoothstep(0.72, 0.90, fract(raw));
          // Chained mixes: GLSL ES 1.0 cannot index an attribute array.
          vec4 r = aR0;
          r = mix(r, aR1, clamp(prog, 0.0, 1.0));
          r = mix(r, aR2, clamp(prog - 1.0, 0.0, 1.0));
          r = mix(r, aR3, clamp(prog - 2.0, 0.0, 1.0));

          float age = max(0.0, uStage - death);
          vDead = step(death, uStage);
          vAct = aAct;
          vLocal = position.xy;

          // A 1px-ish gutter so the packing reads as tiles, not a solid field.
          vec2 size = max(vec2(0.0), r.zw - 0.008);
          vec2 centre = r.xy + r.zw * 0.5;
          vec3 p = vec3(centre + position.xy * size, 0.0);
          // Carved tiles fall away and shrink — deterministic in uStage, so
          // scrubbing back restores the packing exactly.
          p.y -= age * age * 3.2;
          p.x += (aSeed - 0.5) * age * 0.8;
          p.z += age * 0.4;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying float vAct;
        varying float vDead;
        varying vec2 vLocal;
        uniform float uStage;
        void main() {
          vec3 eligible = vec3(0.29, 0.64, 1.00);   // advanceable collateral
          vec3 aged     = vec3(0.96, 0.69, 0.24);   // warn
          vec3 consign  = vec3(0.55, 0.61, 1.00);   // info
          vec3 paca     = vec3(0.94, 0.37, 0.42);   // bad — outranks the bank
          vec3 col = eligible;
          col = mix(col, aged,    step(0.5, vAct) * step(vAct, 1.5));
          col = mix(col, consign, step(1.5, vAct) * step(vAct, 2.5));
          col = mix(col, paca,    step(2.5, vAct) * step(vAct, 3.5));
          // The source's severity treatment: a low tint fill under a brighter edge.
          float edge = max(abs(vLocal.x), abs(vLocal.y));
          float rim = smoothstep(0.38, 0.5, edge);
          float a = mix(0.30, 0.85, rim) * (1.0 - vDead * 0.55);
          gl_FragColor = vec4(col * (0.55 + rim * 0.75), a);
        }
      `,
    }));
    tiles.frustumCulled = false;
    inner.add(tiles);

    const labels = createLabels(STATIC, { withGlyphs: true, color: "#e9eef8", count: STATIC.length + READOUT });
    inner.add(labels.mesh);

    return { inner, tiles, labels, camera };
  },

  pose({ inner, tiles, labels, camera }, { p, t }) {
    const stage = p * 3;
    tiles.material.uniforms.uStage.value = stage;
    inner.rotation.y = Math.sin(t * 0.05) * 0.02;   // before update(): the billboard reads it

    // Value still standing = gross minus whatever has been carved so far.
    const carved = (stage >= 1 ? AGED_K : AGED_K * clamp01(stage))
      + (stage >= 2 ? CONSIGN_K : CONSIGN_K * clamp01(stage - 1))
      + (stage >= 3 ? PACA_K : PACA_K * clamp01(stage - 2));
    const standing = GROSS_K - carved;

    let i = 0;
    const put = (key, x, y, h, a = 1) => labels.set(i++, L[key], x, y, 0.05, h, a);

    // Everything sits OUTSIDE the packed rectangle. Labels over the tiles were
    // unreadable against them, and anything left of the map disappears behind the
    // docked panel at panel-heavy scroll positions.
    put("BORROWING BASE  ·  FROZEN INVENTORY", -W / 2 + 1.32, H / 2 + 0.34, 0.145);

    // The running certificate figure, top-right and clear of the panel.
    // The whole readout sits ABOVE the rectangle's top edge (H / 2). At H / 2 - 0.02
    // the gross figure landed on the edge itself and read through the tiles.
    put("ADVANCEABLE", W / 2 - 0.52, H / 2 + 0.62, 0.105, 0.75);
    i = labels.write(i, `${Math.round(standing)}`, W / 2 - 0.98, H / 2 + 0.36, 0.05, 0.2);
    put("K", W / 2 - 0.32, H / 2 + 0.35, 0.14, 0.8);
    put("GROSS", W / 2 - 0.52, H / 2 + 0.14, 0.09, 0.5);
    i = labels.write(i, `${GROSS_K}`, W / 2 - 0.9, H / 2 + 0.14, 0.05, 0.11, 0.5);

    // Legend in a row beneath the map, dimming as each carve-out is taken.
    const keys = ["eligible", "aged", "consignment", "PACA trust"];
    for (let k = 0; k < 4; k++) {
      const gone = k > 0 && stage >= k;
      put(keys[k], -W / 2 + 0.42 + k * 1.24, -H / 2 - 0.3, 0.11, gone ? 0.32 : 0.92);
    }

    while (i < labels.count) labels.hide(i++);
    labels.update(camera);
  },
});
