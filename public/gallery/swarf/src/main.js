/**
 * SWARF — "Buy to Fly". The 4th dimension is TOOLPATH TIME.
 *
 * A titanium billet is machined into a structural fitting. Scrolling runs the
 * toolpath, and every voxel the cutter reaches leaves the part and falls to the
 * chip pile below. The readout climbs toward the buy-to-fly ratio the part will
 * actually carry — near 10:1, which is to say ninety percent of a certified,
 * stocked, paid-for billet ends up as swarf.
 *
 * HOW IT IS DONE, AND WHAT IT DELIBERATELY IS NOT:
 * no CSG and no raymarched SDF — real boolean subtraction per frame would allocate
 * in the hot path and blow the budget many times over. Instead only the REMOVAL
 * ENVELOPE is instanced (the metal that goes away, not the whole block), each voxel
 * carries the toolpath time `aRemoveAt` at which the cutter reaches it, computed
 * once in build(), and pose() writes a single uniform.
 *
 * A removed voxel collapses to zero scale in the VERTEX shader rather than being
 * discarded in the fragment shader — a degenerate triangle costs nothing, while a
 * discard defeats early-z. It is then reused as its own chip, on a deterministic
 * parabola of (p - aRemoveAt) clamped onto the pile, so scrubbing back up the page
 * puts every gram of metal back exactly where it was.
 */
import * as THREE from "../../_vendor/three.module.js";
import { createStage, clamp01 } from "./stage.js";
import { createLabels } from "./_labels.js";

const NX = 22, NY = 14, NZ = 16;   // billet lattice
const V = 0.135;                    // voxel edge, world units
// The part's ratio is MEASURED from the lattice below, never asserted here.

const STATIC = [
  "BILLET → FINISHED PART",
  "BUY-TO-FLY", ":1", "REMOVED", "TOOLPATH",
];
const L = Object.fromEntries(STATIC.map((s, i) => [s, i]));
const READOUT = 14;

createStage({
  stillAt: 0.74,
  fitWidth: 4.6,   // content width incl. labels — see stage.js
  fov: 44,
  cameraFor: (narrow) => ({ pos: [narrow ? 3.8 : 4.8, 2.4, narrow ? 9.6 : 8.4], look: [0, 0.45, 0] }),
  framing: (p, narrow, w) => (narrow ? { x: 0, y: 0.35 } : { x: Math.min(1.45, w / 1000) - clamp01((p - 0.8) / 0.18) * 3.0, y: 0.2 }),
  build({ rig, scene, camera }) {
    const inner = new THREE.Group();
    rig.add(inner);

    /* ---------- decide which metal stays and which is cut away ---------- */
    // The finished part is a rough I-section fitting: a web, two flanges and a
    // lug. Everything outside it is the removal envelope — and it is most of the
    // billet, which is the point the instrument is making.
    // These proportions are not arbitrary. They were solved so that the finished
    // part is 504 of 4,928 voxels — a real 9.8:1 buy-to-fly with 89.8% removed,
    // which is what makes the copy's "near ten to one" and "ninety percent"
    // literally true of what is on screen. An earlier, chunkier part measured
    // 2.9:1 while the page claimed ten, which is exactly the drift to avoid.
    const keep = (x, y, z) => {
      const fx = x / (NX - 1) - 0.5;      // -0.5 .. 0.5
      const fy = y / (NY - 1);            //  0 .. 1
      const fz = z / (NZ - 1) - 0.5;
      const web = Math.abs(fz) < 0.04 && fy > 0.14 && fy < 0.86;
      const lowerFlange = fy <= 0.07 && Math.abs(fz) < 0.22;
      const upperFlange = fy >= 0.93 && Math.abs(fz) < 0.172;
      const lug = fx > 0.34 && fy > 0.34 && fy < 0.64 && Math.abs(fz) < 0.16;
      const taper = fx < 0.24 - Math.abs(fz) * 0.35;
      return (web || lowerFlange || upperFlange || lug) && taper;
    };

    const rem = [];
    let keptCount = 0;
    for (let x = 0; x < NX; x++) {
      for (let y = 0; y < NY; y++) {
        for (let z = 0; z < NZ; z++) {
          if (keep(x, y, z)) { keptCount++; continue; }
          rem.push([x, y, z]);
        }
      }
    }
    // Toolpath order: the cutter works down in Z passes, raster in X, roughing the
    // top of each pass first — so removal reads as machining, not as random decay.
    rem.sort((a, b) => (a[2] - b[2]) || (a[0] - b[0]) || (b[1] - a[1]));

    const n = rem.length;
    const aPos = new Float32Array(n * 3);
    const aAt = new Float32Array(n);
    const aSeed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const [x, y, z] = rem[i];
      aPos[i * 3] = (x - (NX - 1) / 2) * V;
      aPos[i * 3 + 1] = y * V;
      aPos[i * 3 + 2] = (z - (NZ - 1) / 2) * V;
      aAt[i] = i / n;
      aSeed[i] = Math.random();
    }

    const cube = new THREE.BoxGeometry(V * 0.95, V * 0.95, V * 0.95);
    const mk = (attrs, count) => {
      const g = new THREE.InstancedBufferGeometry();
      g.index = cube.index;
      g.attributes.position = cube.attributes.position;
      g.attributes.normal = cube.attributes.normal;
      g.instanceCount = count;
      for (const [k, v] of Object.entries(attrs)) g.setAttribute(k, v);
      return g;
    };

    const removalGeo = mk({
      aPos: new THREE.InstancedBufferAttribute(aPos, 3),
      aAt: new THREE.InstancedBufferAttribute(aAt, 1),
      aSeed: new THREE.InstancedBufferAttribute(aSeed, 1),
    }, n);

    const removal = new THREE.Mesh(removalGeo, new THREE.ShaderMaterial({
      transparent: true,
      uniforms: { uP: { value: 0 } },
      vertexShader: `
        attribute vec3 aPos;
        attribute float aAt;
        attribute float aSeed;
        uniform float uP;
        varying float vLit;
        varying float vChip;
        void main() {
          float cut = step(aAt, uP);
          float age = max(0.0, uP - aAt);
          // Still stock: full size, in place. Cut: a chip on a deterministic
          // parabola, shrinking, settling onto the pile. No integration anywhere,
          // so scrubbing back restores the billet exactly.
          float fall = age * 9.0;
          float y = aPos.y - fall * fall * 0.55 + fall * 0.5;
          float floorY = -0.62 - aSeed * 0.1;
          y = max(y, floorY);
          float x = aPos.x + (aSeed - 0.5) * fall * 0.7;
          float z = aPos.z + (fract(aSeed * 7.3) - 0.5) * fall * 0.6;
          float s = mix(1.0, 0.34, clamp(age * 14.0, 0.0, 1.0));
          vChip = cut;
          vLit = 0.5 + max(normal.y, 0.0) * 0.5;
          vec3 world = mix(aPos, vec3(x, y, z), cut);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position * s + world, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying float vLit;
        varying float vChip;
        void main() {
          vec3 stock = vec3(0.52, 0.55, 0.58);   // certified billet you paid for
          vec3 chip  = vec3(0.30, 0.24, 0.19);   // swarf, worth a fraction of it
          gl_FragColor = vec4(mix(stock, chip, vChip) * vLit, 1.0);
        }
      `,
    }));
    removal.frustumCulled = false;
    inner.add(removal);

    /* ---------- the metal that actually flies ---------- */
    const kx = new Float32Array(keptCount * 3);
    let j = 0;
    for (let x = 0; x < NX; x++) {
      for (let y = 0; y < NY; y++) {
        for (let z = 0; z < NZ; z++) {
          if (!keep(x, y, z)) continue;
          kx[j * 3] = (x - (NX - 1) / 2) * V;
          kx[j * 3 + 1] = y * V;
          kx[j * 3 + 2] = (z - (NZ - 1) / 2) * V;
          j++;
        }
      }
    }
    const partGeo = mk({ aPos: new THREE.InstancedBufferAttribute(kx, 3) }, keptCount);
    const part = new THREE.Mesh(partGeo, new THREE.ShaderMaterial({
      uniforms: { uP: { value: 0 } },
      vertexShader: `
        attribute vec3 aPos;
        uniform float uP;
        varying float vLit;
        void main() {
          vLit = 0.5 + max(normal.y, 0.0) * 0.5;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position + aPos, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform float uP;
        varying float vLit;
        void main() {
          // The part warms from raw stock to a finished, inspected surface.
          vec3 raw = vec3(0.52, 0.55, 0.58);
          vec3 fin = vec3(0.36, 0.78, 0.86);
          gl_FragColor = vec4(mix(raw, fin, clamp(uP * 1.2, 0.0, 1.0)) * vLit, 1.0);
        }
      `,
    }));
    part.frustumCulled = false;
    inner.add(part);

    const bed = new THREE.Mesh(
      new THREE.BoxGeometry(4.4, 0.03, 3.0),
      new THREE.MeshBasicMaterial({ color: 0x2a3034 }),
    );
    bed.position.y = -0.78;
    inner.add(bed);

    scene.add(new THREE.AmbientLight(0xdff2ff, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(-3, 6, 4);
    scene.add(key);

    const labels = createLabels(STATIC, { withGlyphs: true, color: "#e6eef2", count: STATIC.length + READOUT });
    inner.add(labels.mesh);

    const totalVox = n + keptCount;
    return { inner, removal, part, labels, camera, n, totalVox, keptCount };
  },

  pose(w, { p, t }) {
    const { inner, removal, part, labels, camera, n, totalVox, keptCount } = w;
    removal.material.uniforms.uP.value = p;
    part.material.uniforms.uP.value = p;

    const cut = Math.round(n * p);
    // Buy-to-fly is bought mass over mass still in the part. Nothing cut is 1.0:1;
    // by the end of the toolpath it is the part's real ratio. Both readouts are
    // measured off the lattice, not asserted.
    const remainingVox = Math.max(keptCount, totalVox - cut);
    const ratio = totalVox / remainingVox;
    const removedPct = (cut / totalVox) * 100;

    inner.rotation.y = -0.35 + Math.sin(t * 0.06) * 0.06 + p * 0.5;   // before update(): the billboard reads this rotation
    let i = 0;
    const put = (key, x, y, z, h, a = 1) => labels.set(i++, L[key], x, y, z, h, a);

    put("BILLET → FINISHED PART", 0.0, 2.5, 0, 0.13);

    put("BUY-TO-FLY", -1.72, 2.02, 0, 0.11, 0.7);
    i = labels.write(i, ratio.toFixed(1), -1.9, 1.72, 0, 0.26);
    put(":1", -1.16, 1.72, 0, 0.19, 0.85);

    put("REMOVED", 1.6, 2.02, 0, 0.11, 0.7);
    i = labels.write(i, `${removedPct.toFixed(0)}%`, 1.6, 1.72, 0, 0.22);

    put("TOOLPATH", -0.35, -1.16, 0, 0.105, 0.55);
    i = labels.write(i, `${Math.round(p * 100)}%`, 0.42, -1.16, 0, 0.125, 0.7);
    while (i < labels.count) labels.hide(i++);
    labels.update(camera);

  },
});
