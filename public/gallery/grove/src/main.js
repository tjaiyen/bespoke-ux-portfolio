/**
 * GROVE — "Twenty Years in Twenty Seconds". The 4th dimension is GROWTH TIME.
 *
 * Scrolling advances two decades. A recursive tree is generated once, then
 * REVEALED in branch order — each segment only appears once its birth-year has
 * passed, so the trunk thickens before the limbs and the crown fills last, the
 * way a tree actually grows. Leaves arrive with the canopy and cycle through the
 * seasons as the years pass: spring green, summer deep, autumn gold, and the bare
 * branches of winter before the next year begins.
 *
 * Every segment is an instance of one cylinder and every leaf an instance of one
 * quad, so a full canopy costs two draw calls.
 */
import * as THREE from "../../_vendor/three.module.js";
import { createStage, clamp01 } from "./stage.js";

createStage({
  stillAt: 0.72,
  build({ rig, scene }) {
    // Its own group: rotating `rig` directly would overwrite the runtime's
    // pointer/tilt parallax, which is applied to the rig just before pose().
    const tree = new THREE.Group();
    rig.add(tree);

    const segs = [];   // {pos, quat, len, rad, born}
    const leaves = []; // {pos, born, seed}

    // Recursive growth. `born` is the normalised year the segment appears.
    (function branch(origin, dir, len, rad, depth, born) {
      if (depth > 6 || len < 0.09) {
        if (depth > 2) {
          for (let i = 0; i < 3; i++) {
            leaves.push({
              pos: origin.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3)),
              born: clamp01(born + 0.06),
              seed: Math.random(),
            });
          }
        }
        return;
      }
      const end = origin.clone().add(dir.clone().multiplyScalar(len));
      const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      segs.push({ pos: origin.clone().add(end).multiplyScalar(0.5), quat, len, rad, born });

      const kids = depth < 2 ? 2 : (Math.random() < 0.72 ? 2 : 3);
      for (let i = 0; i < kids; i++) {
        const spread = 0.42 + Math.random() * 0.45;
        const az = (i / kids) * Math.PI * 2 + Math.random() * 1.1 + depth;
        const nd = dir.clone()
          .applyAxisAngle(new THREE.Vector3(Math.cos(az), 0, Math.sin(az)), spread)
          .normalize();
        // Later branches are born later — that IS the growth curve.
        branch(end, nd, len * (0.68 + Math.random() * 0.14), rad * 0.66, depth + 1, born + 0.115);
      }
    })(new THREE.Vector3(0, -2.2, 0), new THREE.Vector3(0, 1, 0), 1.5, 0.15, 0, 0);

    const wood = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.7, 1, 1, 6),
      new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 0.95 }),
      segs.length,
    );
    wood.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    tree.add(wood);

    const leaf = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(0.17, 0.17),
      new THREE.MeshStandardMaterial({ color: 0x2f6b3a, roughness: 0.8, side: THREE.DoubleSide, transparent: true }),
      leaves.length,
    );
    leaf.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    tree.add(leaf);

    scene.add(new THREE.AmbientLight(0xdfe6d2, 1.5));
    const sun = new THREE.DirectionalLight(0xffe9b8, 1.6);
    sun.position.set(3, 6, 4);
    scene.add(sun);

    return {
      tree, wood, leaf, segs, leaves,
      m: new THREE.Matrix4(), v: new THREE.Vector3(), s: new THREE.Vector3(),
      q: new THREE.Quaternion(), e: new THREE.Euler(), c: new THREE.Color(),
    };
  },

  pose(w, { p, t }) {
    const { tree, wood, leaf, segs, leaves, m, v, s, q, e, c } = w;
    // Start the clock slightly AHEAD of zero. With year = p*1.05 the trunk
    // (born = 0) scales from 0, so at p = 0 — the frame every visitor lands on —
    // the canvas was completely blank. Year one should already show a seedling.
    const year = 0.18 + p * 0.95;

    for (let i = 0; i < segs.length; i++) {
      const sg = segs[i];
      // A segment extends from nothing over its own growth window.
      const g = clamp01((year - sg.born) / 0.16);
      const sway = Math.sin(t * 0.6 + i * 0.35) * 0.012 * (1 - sg.born);
      s.set(sg.rad * g, sg.len * g, sg.rad * g);
      v.copy(sg.pos);
      e.setFromQuaternion(sg.quat);
      e.z += sway;
      q.setFromEuler(e);
      m.compose(v, q, s);
      wood.setMatrixAt(i, m);
    }
    wood.instanceMatrix.needsUpdate = true;

    // Seasons cycle roughly five times across twenty years.
    const season = (p * 5) % 1;
    if (season < 0.3) c.setRGB(0.42, 0.66, 0.30);        // spring
    else if (season < 0.58) c.setRGB(0.18, 0.42, 0.22);  // summer
    else if (season < 0.82) c.setRGB(0.72, 0.52, 0.18);  // autumn
    else c.setRGB(0.55, 0.44, 0.30);                     // late fall
    leaf.material.color.copy(c);
    // Winter strips the canopy back to bare branches.
    leaf.material.opacity = season > 0.9 ? clamp01((1 - season) * 10) : 1;

    for (let i = 0; i < leaves.length; i++) {
      const lf = leaves[i];
      const g = clamp01((year - lf.born) / 0.2);
      const flutter = Math.sin(t * 1.6 + lf.seed * 30) * 0.28;
      v.copy(lf.pos);
      v.x += Math.sin(t * 0.8 + lf.seed * 12) * 0.04;
      e.set(flutter, lf.seed * 6.283, flutter * 0.6);
      q.setFromEuler(e);
      s.setScalar(g);
      m.compose(v, q, s);
      leaf.setMatrixAt(i, m);
    }
    leaf.instanceMatrix.needsUpdate = true;

    tree.rotation.y = Math.sin(t * 0.08) * 0.12 + p * 0.35;
  },
});
