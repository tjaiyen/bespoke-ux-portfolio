/**
 * SKEIN — "The Formation". The 4th dimension is COORDINATION TIME.
 *
 * A live boid simulation: 40 birds each steer by the three classic local rules —
 * separation, alignment, cohesion — evaluated against their actual neighbours every
 * frame. At the start the social weights are near zero, so they fly as scattered
 * singles; scrolling ramps alignment and cohesion until they move as one body.
 *
 * BE PRECISE ABOUT WHAT IS EMERGENT AND WHAT IS NOT. The flocking is genuinely
 * simulated and the cohering behaviour does emerge from it. The V ITSELF DOES NOT:
 * each bird has an authored slot, applied as a positional constraint that ramps in
 * with scroll. Pure boids cohere into a blob, not a chevron. Calling the V emergent
 * would be a nicer story and a false one.
 *
 * Deliberately small (40 birds, O(n²) neighbour checks = 1,600 scalar comparisons
 * a frame, which costs nothing) and every vector in the inner loop is pre-allocated
 * in build(): flocking maths is exactly the shape that tempts per-frame allocation.
 */
import * as THREE from "../../_vendor/three.module.js";
import { createStage, clamp01, mix } from "./stage.js";

const N = 40;
const SEP_R = 0.85, NEI_R = 2.4;
const MAXSPEED = 2.5, MAXFORCE = 3.6;

createStage({
  stillAt: 0.72,
  cameraFor: (narrow) => ({ pos: [0, narrow ? 0.4 : 0.8, narrow ? 13 : 10.5], look: [0, 0, 0] }),
  build({ rig, scene }) {
    const flock = new THREE.Group();
    rig.add(flock);

    // A swept delta silhouette — nose, two wingtips, tail. Reads as a bird from
    // essentially any angle, which a cone or a sphere does not.
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array([
      0, 0, 0.34, -0.42, 0.05, -0.14, 0, 0.02, -0.20,
      0, 0, 0.34, 0, 0.02, -0.20, 0.42, 0.05, -0.14,
    ]), 3));
    g.computeVertexNormals();

    const birds = new THREE.InstancedMesh(
      g,
      new THREE.MeshStandardMaterial({ color: 0x1b2530, roughness: 0.7, side: THREE.DoubleSide }),
      N,
    );
    birds.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    flock.add(birds);

    const agents = [];
    for (let i = 0; i < N; i++) {
      agents.push({
        pos: new THREE.Vector3((Math.random() - 0.5) * 11, (Math.random() - 0.5) * 5.5, (Math.random() - 0.5) * 7),
        vel: new THREE.Vector3(Math.random() - 0.5, (Math.random() - 0.5) * 0.3, Math.random() - 0.5)
          .normalize().multiplyScalar(1.2 + Math.random()),
        slot: new THREE.Vector3(),
        seed: Math.random(),
      });
    }

    // V-formation slots: a leader, then pairs stepping back and out.
    //
    // Laid out in the SCREEN plane (x across, y up) rather than in x/z. A V built
    // into the depth axis is almost entirely foreshortened from the camera and
    // reads as a clump; this way the chevron is legible. Kept compact, too — an
    // earlier version spanned ~12 units, well outside the containment radius, so
    // the slot pull and the containment force fought each other to a standstill.
    for (let i = 0; i < N; i++) {
      const rank = Math.ceil(i / 2);
      const side = i % 2 === 0 ? 1 : -1;
      agents[i].slot.set(-rank * 0.30, side * rank * 0.20, -rank * 0.06);
    }

    scene.add(new THREE.AmbientLight(0xf2f6fb, 2.1));
    const sun = new THREE.DirectionalLight(0xffffff, 1.5);
    sun.position.set(-3, 6, 5);
    scene.add(sun);

    return {
      flock, birds, agents,
      // Pre-allocated scratch — reused for every bird, every frame. Never `new`
      // anything below this line.
      sep: new THREE.Vector3(), ali: new THREE.Vector3(), coh: new THREE.Vector3(),
      tmp: new THREE.Vector3(), acc: new THREE.Vector3(), slotW: new THREE.Vector3(),
      head: new THREE.Vector3(),
      m: new THREE.Matrix4(), q: new THREE.Quaternion(), qr: new THREE.Quaternion(),
      sc: new THREE.Vector3(1, 1, 1), fwd: new THREE.Vector3(0, 0, 1),
    };
  },

  pose(w, { p, t }) {
    const { flock, birds, agents, sep, ali, coh, tmp, acc, slotW, head, m, q, qr, sc, fwd } = w;
    const dt = 1 / 60;

    // Act 1 → 2: the social rules and the formation pull both come up together.
    const lock = clamp01((p - 0.30) / 0.55);
    const social = mix(0.06, 1, clamp01((p - 0.12) / 0.5));

    // The whole formation swings slowly across the sky as it travels.
    // Small, slow yaw only: the V is laid out in the screen plane, so a large
    // yaw would rotate it back into depth and undo its legibility.
    const yaw = Math.sin(t * 0.06) * 0.14;
    const cy = Math.cos(yaw), sy = Math.sin(yaw);

    for (let i = 0; i < N; i++) {
      const a = agents[i];
      sep.set(0, 0, 0); ali.set(0, 0, 0); coh.set(0, 0, 0);
      let nSep = 0, nNei = 0;

      // O(n²) over 40 agents — 1,600 scalar distance checks, negligible.
      for (let j = 0; j < N; j++) {
        if (i === j) continue;
        const b = agents[j];
        const d = a.pos.distanceTo(b.pos);
        if (d > NEI_R || d === 0) continue;
        if (d < SEP_R) {
          tmp.subVectors(a.pos, b.pos).divideScalar(d * d);
          sep.add(tmp);
          nSep++;
        }
        ali.add(b.vel);
        coh.add(b.pos);
        nNei++;
      }

      acc.set(0, 0, 0);
      if (nSep > 0) {
        sep.divideScalar(nSep).setLength(MAXSPEED).sub(a.vel).clampLength(0, MAXFORCE);
        // Separation is never relaxed — birds avoid collision even when scattered.
        acc.addScaledVector(sep, 1.7);
      }
      if (nNei > 0) {
        ali.divideScalar(nNei).setLength(MAXSPEED).sub(a.vel).clampLength(0, MAXFORCE);
        acc.addScaledVector(ali, 1.15 * social);
        coh.divideScalar(nNei).sub(a.pos).setLength(MAXSPEED).sub(a.vel).clampLength(0, MAXFORCE);
        acc.addScaledVector(coh, 0.85 * social);
      }

      // Soft containment so the flock stays on stage rather than drifting off it.
      const r = a.pos.length();
      if (r > 7.5) acc.addScaledVector(tmp.copy(a.pos).multiplyScalar(-1 / r), (r - 7.5) * 2.2);

      a.vel.addScaledVector(acc, dt).clampLength(0.55, MAXSPEED);
      a.pos.addScaledVector(a.vel, dt);

      // Formation slot, rotated from formation-local into world space, then applied
      // as a POSITIONAL constraint rather than another force. A force alone fights
      // the minimum-speed clamp: a bird sitting on its slot still gets pushed to
      // 0.55 units/s and orbits it forever instead of holding station.
      slotW.set(a.slot.x * cy - a.slot.z * sy, a.slot.y, a.slot.x * sy + a.slot.z * cy);
      if (lock > 0) {
        a.pos.lerp(slotW, lock * 0.11);
        // Once in formation the whole skein shares one heading, which is also what
        // keeps each bird's orientation stable when it is no longer manoeuvring.
        head.set(cy * 2.0, 0, sy * 2.0);
        a.vel.lerp(head, lock * 0.09);
      }

      // Orient along travel, with a wingbeat roll. Scattered birds beat harder
      // than birds holding a line in someone else's draft.
      const roll = Math.sin(t * (7.5 - lock * 3.2) + a.seed * 12) * mix(0.42, 0.14, lock);
      tmp.copy(a.vel).normalize();
      q.setFromUnitVectors(fwd, tmp);   // heading
      qr.setFromAxisAngle(fwd, roll);   // then bank about the bird's own axis
      q.multiply(qr);
      m.compose(a.pos, q, sc);
      birds.setMatrixAt(i, m);
    }
    birds.instanceMatrix.needsUpdate = true;
    flock.rotation.y = Math.sin(t * 0.05) * 0.06;
  },
});
