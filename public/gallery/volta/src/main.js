/**
 * VOLTA — "Twenty-Four Hours of Grid". The 4th dimension is TIME OF DAY.
 *
 * Scrolling runs a full day through a storage asset. An energy ribbon arcs across
 * a field of instanced grid nodes, and the DIRECTION OF FLOW REVERSES at dusk:
 * through the middle of the day surplus solar runs INTO the bank and the charge
 * front travels left-to-right; at the evening peak the bank discharges and the
 * front runs back the other way, into the grid.
 *
 * The palette is the clock — cool dawn, bright lime midday, deep blue night — so
 * the hero art is also, honestly, a duty-cycle chart.
 */
import * as THREE from "../../_vendor/three.module.js";
import { createStage, clamp01 } from "./stage.js";

const COLS = 26, ROWS = 13;
const NODES = COLS * ROWS;

createStage({
  stillAt: 0.35,
  build({ rig, scene }) {
    // ---- The grid: instanced nodes that light as charge passes through. ----
    const nodes = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.045, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0x8de02f, transparent: true }),
      NODES,
    );
    nodes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    nodes.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(NODES * 3), 3);
    rig.add(nodes);

    const home = [];
    for (let x = 0; x < COLS; x++) {
      for (let y = 0; y < ROWS; y++) {
        home.push(new THREE.Vector3(
          (x - (COLS - 1) / 2) * 0.34,
          (y - (ROWS - 1) / 2) * 0.34,
          Math.sin(x * 0.6) * 0.18 + Math.cos(y * 0.5) * 0.18,
        ));
      }
    }

    // ---- The ribbon: a tube whose emissive band travels along it. ----
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-4.6, -1.5, 0.6),
      new THREE.Vector3(-2.2, 1.2, -0.4),
      new THREE.Vector3(0.2, -0.9, 0.5),
      new THREE.Vector3(2.5, 1.4, -0.3),
      new THREE.Vector3(4.7, -0.6, 0.4),
    ]);
    const ribbonMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uFront: { value: 0 }, uDir: { value: 1 }, uTint: { value: new THREE.Color(0x8de02f) } },
      vertexShader: `
        varying float vU;
        void main() { vU = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: `
        precision highp float;
        varying float vU;
        uniform float uFront, uDir;
        uniform vec3 uTint;
        void main() {
          // A charge front travelling along the ribbon, direction set by uDir.
          float u = uDir > 0.0 ? vU : 1.0 - vU;
          float d = abs(u - uFront);
          float pulse = smoothstep(0.22, 0.0, d);
          float base = 0.10;
          gl_FragColor = vec4(uTint * (base + pulse * 1.5), base * 0.55 + pulse * 0.8);
        }
      `,
    });
    const ribbon = new THREE.Mesh(new THREE.TubeGeometry(curve, 220, 0.055, 10, false), ribbonMat);
    rig.add(ribbon);

    scene.add(new THREE.AmbientLight(0xffffff, 1));

    return { nodes, home, ribbonMat, ribbon, m: new THREE.Matrix4(), v: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3(), c: new THREE.Color(), day: new THREE.Color(0x8de02f), night: new THREE.Color(0x7fa8c9) };
  },

  pose(w, { p, t }) {
    const { nodes, home, ribbonMat, ribbon, m, v, q, s, c, day, night } = w;

    // p is the clock: 0 = dawn, 0.5 = dusk, 1 = deep night.
    const charging = p < 0.52;
    const solar = Math.sin(clamp01(p / 0.52) * Math.PI);        // solar bell curve
    const demand = clamp01((p - 0.5) / 0.35);                    // evening peak

    ribbonMat.uniforms.uDir.value = charging ? 1 : -1;
    ribbonMat.uniforms.uFront.value = (t * 0.22) % 1;
    ribbonMat.uniforms.uTint.value.copy(charging ? day : night);

    for (let i = 0; i < NODES; i++) {
      const h = home[i];
      // Which nodes are energised sweeps across the field with the flow.
      const along = (h.x + 4.4) / 8.8;
      const front = charging ? (t * 0.16) % 1 : 1 - ((t * 0.16) % 1);
      const near = smoothstepish(Math.abs(along - front));
      const level = charging ? solar : demand;
      const lit = 0.16 + near * level * 0.95;

      v.set(h.x, h.y + Math.sin(t * 0.5 + i * 0.3) * 0.03, h.z);
      s.setScalar(0.6 + near * level * 1.5);
      m.compose(v, q, s);
      nodes.setMatrixAt(i, m);

      c.copy(charging ? day : night).multiplyScalar(lit);
      nodes.instanceColor.setXYZ(i, c.r, c.g, c.b);
    }
    nodes.instanceMatrix.needsUpdate = true;
    nodes.instanceColor.needsUpdate = true;

    ribbon.rotation.y = Math.sin(t * 0.1) * 0.08 + p * 0.25;
    nodes.rotation.y = ribbon.rotation.y;
  },
});

function smoothstepish(d) {
  const x = clamp01(1 - d / 0.28);
  return x * x * (3 - 2 * x);
}
