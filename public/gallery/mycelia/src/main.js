/**
 * MYCELIA — "Nine Days in the Dark". The 4th dimension is COLONISATION TIME.
 *
 * Scrolling runs a grow cycle. From a single inoculation point, hyphae extend to
 * the nearest unclaimed site, then the next — the network spreading outward through
 * the substrate exactly as far as it has had time to.
 *
 * What makes this a NETWORK and not a tree is ANASTOMOSIS: once two hyphae from
 * different branches grow close enough, they FUSE, and the new link closes a loop.
 * Those fusion links are drawn in gold, so you can watch the topology stop being
 * branching and start being connected — which is the entire reason a mycelium can
 * move nutrients between two points by more than one route, and the reason the
 * grown part holds together as a material.
 *
 * Deliberately distinct from grove, which is one root, one crown, no loops.
 */
import * as THREE from "../../_vendor/three.module.js";
import { createStage, clamp01 } from "./stage.js";

const NODES = 190;
const FUSE_R = 0.92;   // hyphae closer than this fuse

createStage({
  stillAt: 0.72,
  build({ rig, scene }) {
    const net = new THREE.Group();
    rig.add(net);

    /* ---------- sites in the substrate ---------- */
    const pts = [];
    for (let i = 0; i < NODES; i++) {
      // Flattened volume — a colonised block of substrate, wider than it is deep.
      const a = Math.random() * Math.PI * 2;
      const r = Math.pow(Math.random(), 0.55) * 4.3;
      pts.push(new THREE.Vector3(
        Math.cos(a) * r * 1.15,
        (Math.random() - 0.5) * 4.6,
        Math.sin(a) * r * 0.5,
      ));
    }
    pts[0].set(0, 0, 0); // the inoculation point

    /* ---------- growth: nearest-site extension from the colonised set ---------- */
    const edges = [];
    const inSet = new Array(NODES).fill(false);
    inSet[0] = true;
    const best = new Float32Array(NODES).fill(Infinity);
    const from = new Int32Array(NODES).fill(0);
    for (let i = 1; i < NODES; i++) { best[i] = pts[i].distanceTo(pts[0]); from[i] = 0; }

    for (let added = 1; added < NODES; added++) {
      let pick = -1, bd = Infinity;
      for (let i = 0; i < NODES; i++) if (!inSet[i] && best[i] < bd) { bd = best[i]; pick = i; }
      if (pick < 0) break;
      inSet[pick] = true;
      // Born in the order the front reached it — that IS the growth curve.
      edges.push({ a: from[pick], b: pick, born: added / NODES, fuse: false });
      for (let i = 0; i < NODES; i++) {
        if (inSet[i]) continue;
        const d = pts[i].distanceTo(pts[pick]);
        if (d < best[i]) { best[i] = d; from[i] = pick; }
      }
    }

    // Reach order, so a fusion cannot appear before both its ends exist.
    const reach = new Float32Array(NODES);
    for (const e of edges) reach[e.b] = e.born;

    /* ---------- anastomosis: fusions that close loops ---------- */
    const linked = new Set(edges.map((e) => `${Math.min(e.a, e.b)}-${Math.max(e.a, e.b)}`));
    for (let i = 0; i < NODES; i++) {
      for (let j = i + 1; j < NODES; j++) {
        if (pts[i].distanceTo(pts[j]) > FUSE_R) continue;
        const key = `${i}-${j}`;
        if (linked.has(key)) continue;
        if (Math.random() > 0.42) continue;
        linked.add(key);
        edges.push({ a: i, b: j, born: clamp01(Math.max(reach[i], reach[j]) + 0.04), fuse: true });
      }
    }

    /* ---------- geometry ---------- */
    const AXIS = new THREE.Vector3(0, 1, 0);
    const segs = edges.map((e) => {
      const a = pts[e.a], b = pts[e.b];
      const dir = b.clone().sub(a);
      const len = dir.length();
      return {
        pos: a.clone().add(b).multiplyScalar(0.5),
        quat: new THREE.Quaternion().setFromUnitVectors(AXIS, dir.normalize()),
        len,
        // Deliberately fine. At 0.028 the network rendered as a chunky wireframe
        // polyhedron rather than hyphae; thread-thin is what makes it read as
        // something grown rather than something modelled.
        rad: e.fuse ? 0.009 : 0.013,
        born: e.born,
        fuse: e.fuse,
      };
    });

    const hyphae = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(1, 1, 1, 5),
      new THREE.MeshStandardMaterial({ roughness: 0.72, metalness: 0.05 }),
      segs.length,
    );
    hyphae.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    hyphae.frustumCulled = false;
    net.add(hyphae);

    /* ---------- growing tips, and nutrient pulses running the network ---------- */
    const tp = new Float32Array(NODES * 3);
    const tb = new Float32Array(NODES);
    for (let i = 0; i < NODES; i++) {
      tp[i * 3] = pts[i].x; tp[i * 3 + 1] = pts[i].y; tp[i * 3 + 2] = pts[i].z;
      tb[i] = reach[i];
    }
    const tgeo = new THREE.BufferGeometry();
    tgeo.setAttribute("position", new THREE.BufferAttribute(tp, 3));
    tgeo.setAttribute("aBorn", new THREE.BufferAttribute(tb, 1));
    const tmat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uFront: { value: 0 }, uTime: { value: 0 } },
      vertexShader: `
        attribute float aBorn;
        uniform float uFront, uTime;
        varying float vA;
        void main() {
          float live = step(aBorn, uFront);
          // Brightest right at the advancing front, then settling to a pulse as
          // nutrients move through the established network.
          float tip = 1.0 - smoothstep(0.0, 0.12, uFront - aBorn);
          float pulse = 0.35 + 0.30 * sin(uTime * 1.6 - aBorn * 22.0);
          vA = live * max(tip, pulse * 0.7);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = (3.0 + tip * 9.0) * (1.0 / -mv.z) * 8.0;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        precision highp float;
        varying float vA;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if (d > 0.5) discard;
          float core = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(vec3(0.86, 0.94, 0.62) * core, core * vA * 0.6);
        }
      `,
    });
    net.add(new THREE.Points(tgeo, tmat));

    scene.add(new THREE.AmbientLight(0x9fb08a, 1.5));
    const key = new THREE.DirectionalLight(0xe8f0d4, 1.5);
    key.position.set(2, 4, 5);
    scene.add(key);
    const under = new THREE.PointLight(0xc9a227, 3.5, 12, 2);
    under.position.set(-1.5, -2.5, 2);
    scene.add(under);

    return {
      net, hyphae, segs, tmat,
      m: new THREE.Matrix4(), v: new THREE.Vector3(), s: new THREE.Vector3(), c: new THREE.Color(),
    };
  },

  pose(w, { p, t }) {
    const { net, hyphae, segs, tmat, m, v, s, c } = w;
    // Offset so day one already shows a real colonised patch. At 0.10 the landing
    // frame was a handful of threads — technically not blank, but far too sparse
    // to open on.
    const front = 0.22 + p * 0.86;
    tmat.uniforms.uFront.value = front;
    tmat.uniforms.uTime.value = t;

    for (let i = 0; i < segs.length; i++) {
      const sg = segs[i];
      // Each hypha extends over its own short window once the front reaches it.
      const g = clamp01((front - sg.born) / 0.07);
      // Fusion links thicken slightly after forming — a fused junction bulks up.
      const thick = sg.rad * (sg.fuse ? 0.7 + g * 0.6 : 1);
      s.set(thick * g, sg.len * g, thick * g);
      v.copy(sg.pos);
      m.compose(v, sg.quat, s);
      hyphae.setMatrixAt(i, m);
      // Gold marks the fusions, so the loops are legible as they close.
      if (sg.fuse) c.setRGB(0.79, 0.64, 0.16);
      else c.setRGB(0.88, 0.86, 0.76);
      hyphae.setColorAt(i, c);
    }
    hyphae.instanceMatrix.needsUpdate = true;
    if (hyphae.instanceColor) hyphae.instanceColor.needsUpdate = true;

    net.rotation.y = -0.3 + Math.sin(t * 0.07) * 0.1 + p * 0.55;
    net.rotation.x = Math.sin(t * 0.05) * 0.04;
  },
});
