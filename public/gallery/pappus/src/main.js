/**
 * PAPPUS — "Letting Go". The 4th dimension is DISPERSAL TIME.
 *
 * The seed head begins intact — 170 seeds packed on a sphere, every one still
 * attached. Scrolling raises the wind, and they release in order rather than all
 * at once, each one then flying its own integrated path: wind, turbulence, gravity
 * and the very high drag that a pappus exists to provide. That drag is why a
 * dandelion seed falls slowly enough to be carried a kilometre, and why it always
 * flies crown-up — the parachute orients itself against the airflow, so each seed
 * here is oriented from its own velocity, not from a fixed rotation.
 *
 * Scrolling back up re-attaches any seed whose release point is once again ahead of
 * the scroll, so the story runs both ways rather than being a one-shot animation.
 * Seeds carried off stage are recirculated back onto the head to keep the air from
 * emptying out.
 */
import * as THREE from "../../_vendor/three.module.js";
import { createStage, clamp01, mix } from "./stage.js";

const N = 170;
const FILAMENTS = 11;

/** One seed: a slender achene below, a crown of pappus filaments above. */
function seedGeometry() {
  const pos = [];
  const col = [];
  const push = (x, y, z, r, g, b) => { pos.push(x, y, z); col.push(r, g, b); };

  // The crown — thin tapered filaments radiating up and out.
  for (let k = 0; k < FILAMENTS; k++) {
    const a = (k / FILAMENTS) * Math.PI * 2;
    const tilt = 0.62 + (k % 3) * 0.07;
    const tx = Math.cos(a) * Math.sin(tilt) * 0.42;
    const tz = Math.sin(a) * Math.sin(tilt) * 0.42;
    const ty = 0.14 + Math.cos(tilt) * 0.42;
    // Base width across the filament, perpendicular to its own direction.
    const px = -Math.sin(a) * 0.014, pz = Math.cos(a) * 0.014;
    push(px, 0.14, pz, 0.38, 0.41, 0.33);
    push(-px, 0.14, -pz, 0.38, 0.41, 0.33);
    push(tx, ty, tz, 0.58, 0.60, 0.52);   // tips catch the light
  }
  // The achene — the seed itself, hanging below the crown.
  push(-0.016, 0.14, 0, 0.36, 0.28, 0.16);
  push(0.016, 0.14, 0, 0.36, 0.28, 0.16);
  push(0, -0.22, 0, 0.24, 0.17, 0.09);

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(col), 3));
  g.computeVertexNormals();
  return g;
}

createStage({
  stillAt: 0.66,
  build({ rig, scene }) {
    const air = new THREE.Group();
    rig.add(air);

    const seeds = new THREE.InstancedMesh(
      seedGeometry(),
      new THREE.MeshStandardMaterial({
        vertexColors: true, roughness: 0.85, side: THREE.DoubleSide,
      }),
      N,
    );
    seeds.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    seeds.frustumCulled = false;
    air.add(seeds);

    const agents = [];
    for (let i = 0; i < N; i++) {
      // Packed on a sphere — the seed head, before anything lets go.
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const phi = i * 2.399963;   // golden angle: even packing, no clumps
      const home = new THREE.Vector3(Math.cos(phi) * r * 1.6, y * 1.6 - 0.2, Math.sin(phi) * r * 1.6);
      agents.push({
        home,
        // Every seed on an intact clock points OUTWARD along its own radius. Left
        // all-upright the head rendered as a rectangular slab of grass instead of
        // a sphere, because the packing grid showed through.
        radial: home.clone().sub(new THREE.Vector3(0, -0.2, 0)).normalize(),
        pos: home.clone(),
        vel: new THREE.Vector3(),
        // Outer seeds go first, as they do — release order runs with the index.
        release: 0.06 + (i / N) * 0.86,
        seed: Math.random(),
        spin: 0.6 + Math.random() * 1.8,
      });
    }

    scene.add(new THREE.AmbientLight(0xf4f6ea, 2.2));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(-2, 5, 4);
    scene.add(sun);

    return {
      air, seeds, agents,
      // Pre-allocated scratch — nothing is constructed inside pose().
      f: new THREE.Vector3(), tmp: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0),
      m: new THREE.Matrix4(), q: new THREE.Quaternion(), qs: new THREE.Quaternion(),
      sc: new THREE.Vector3(1, 1, 1),
    };
  },

  pose(w, { p, t }) {
    const { air, seeds, agents, f, tmp, up, m, q, qs, sc } = w;
    const dt = 1 / 60;
    // A little ahead of zero so the head is already shedding its first few seeds
    // on the landing frame rather than sitting inert.
    // 0.08 clears the earliest release threshold (0.06); at 0.05 every one of the
    // 170 seeds was still attached on the landing frame.
    const front = 0.08 + p * 1.02;
    const wind = mix(0.25, 3.4, clamp01((p - 0.1) / 0.75));

    for (let i = 0; i < N; i++) {
      const a = agents[i];

      if (front <= a.release) {
        // Still attached: hold station on the head, trembling in the rising wind.
        a.pos.copy(a.home);
        a.pos.x += Math.sin(t * 3.1 + a.seed * 20) * 0.012 * wind;
        a.pos.y += Math.cos(t * 2.7 + a.seed * 14) * 0.010 * wind;
        a.vel.set(0, 0, 0);
      } else {
        // Free flight. Wind, turbulence, weight, and a great deal of drag.
        f.set(
          wind * (0.75 + 0.35 * Math.sin(t * 0.3 + a.seed * 5)),
          -0.85,
          0.25 * Math.sin(t * 0.24 + a.seed * 7),
        );
        // Turbulence sampled on position, so neighbouring seeds share eddies.
        f.x += Math.sin(a.pos.y * 1.7 + t * 0.9) * 0.55 * wind * 0.3;
        f.y += Math.sin(a.pos.x * 1.4 - t * 0.7) * 0.62 * wind * 0.3;
        f.z += Math.cos(a.pos.y * 1.1 + t * 0.5) * 0.45 * wind * 0.3;
        // Drag: the entire function of a pappus. Quadratic-ish, strongly damping.
        f.addScaledVector(a.vel, -1.55 * (0.6 + a.vel.length() * 0.5));

        a.vel.addScaledVector(f, dt);
        a.pos.addScaledVector(a.vel, dt);

        // Recirculate once carried off stage, so the air never empties out.
        if (a.pos.x > 8 || a.pos.y < -6.5 || a.pos.y > 7) {
          a.pos.copy(a.home);
          a.vel.set(0, 0, 0);
        }
      }

      // Crown-up: the parachute orients against the airflow. A nearly-still seed
      // has no airflow to orient to, so it simply stays upright.
      const sp = a.vel.length();
      if (sp > 0.05) tmp.copy(a.vel).multiplyScalar(-1 / sp);
      else tmp.copy(a.radial);
      q.setFromUnitVectors(up, tmp);
      qs.setFromAxisAngle(up, t * a.spin + a.seed * 6.283);
      q.multiply(qs);

      m.compose(a.pos, q, sc);
      seeds.setMatrixAt(i, m);
    }
    seeds.instanceMatrix.needsUpdate = true;

    air.rotation.y = Math.sin(t * 0.06) * 0.09 - p * 0.22;
  },
});
