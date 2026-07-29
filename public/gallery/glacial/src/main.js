/**
 * GLACIAL — "The Melt Season". The 4th dimension is THAW TIME.
 *
 * The deliberate INVERSE of tidal: where that column runs chaos → crystalline
 * order (seawater becoming drinkable), this one runs order → chaos. ~8,000
 * particles begin locked in a hexagonal ice lattice nine hundred years old and
 * progressively break free into turbulent meltwater as you scroll.
 *
 * The release is staggered by height so the melt arrives as a FRONT sweeping down
 * from the sun-facing surface, and each particle carries its own release seed —
 * ice does not fail uniformly, it fails at its flaws first.
 *
 * Palette runs the other way too: luminous ice-blue and silver at the top, warm
 * amber meltwater at the bottom.
 */
import * as THREE from "../../_vendor/three.module.js";
import { createStage, clamp01 } from "./stage.js";

const NX = 26, NY = 22, NZ = 14;
const N = NX * NY * NZ;

createStage({
  stillAt: 0.58,
  build({ rig }) {
    const lattice = new Float32Array(N * 3);
    const melt = new Float32Array(N * 3);
    const seed = new Float32Array(N);
    const height = new Float32Array(N);

    const SP = 0.34;
    let i = 0;
    for (let x = 0; x < NX; x++) {
      for (let y = 0; y < NY; y++) {
        for (let z = 0; z < NZ; z++, i++) {
          // Origin: a hexagonal-ish ice lattice. Alternate rows are offset so it
          // reads as crystal packing rather than a plain cubic grid.
          const stagger = (y % 2) * SP * 0.5;
          lattice[i * 3] = (x - (NX - 1) / 2) * SP + stagger;
          lattice[i * 3 + 1] = (y - (NY - 1) / 2) * SP;
          lattice[i * 3 + 2] = (z - (NZ - 1) / 2) * SP;

          // Destination: meltwater, pooling wider and lower than the ice stood.
          const r = 1.9 + Math.random() * 2.9;
          const th = Math.random() * Math.PI * 2;
          const ph = Math.acos(2 * Math.random() - 1);
          melt[i * 3] = Math.sin(ph) * Math.cos(th) * r * 1.35;
          melt[i * 3 + 1] = Math.cos(ph) * r * 0.55 - 1.6;
          melt[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r * 0.9;

          seed[i] = Math.random();
          height[i] = y / (NY - 1); // 1 = sun-facing surface, melts first
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(lattice, 3));
    geo.setAttribute("aMelt", new THREE.BufferAttribute(melt, 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    geo.setAttribute("aHeight", new THREE.BufferAttribute(height, 1));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uP: { value: 0 }, uTime: { value: 0 }, uSize: { value: 12 } },
      vertexShader: `
        attribute vec3 aMelt;
        attribute float aSeed;
        attribute float aHeight;
        uniform float uP, uTime, uSize;
        varying float vFree;
        void main() {
          // The thaw front descends from the sun-facing surface, and each particle
          // releases on its own flaw — ice fails unevenly.
          float front = uP * 1.7 - (1.0 - aHeight) * 0.5;
          float free = smoothstep(0.04, 0.9, front - aSeed * 0.18);
          vFree = free;

          float s = aSeed * 6.2831853;

          // Locked ice only shivers; the amplitude is tiny and shrinks with depth.
          vec3 locked = position + vec3(
            sin(uTime * 1.1 + s) * 0.012,
            cos(uTime * 0.9 + s * 1.4) * 0.012,
            0.0
          );

          // Released water is fully turbulent, and gains energy as it warms.
          vec3 flow = aMelt + vec3(
            sin(uTime * 0.62 + s) * 0.46,
            cos(uTime * 0.48 + s * 1.9) * 0.30,
            sin(uTime * 0.41 + s * 2.6) * 0.40
          ) * free;

          vec3 pos = mix(locked, flow, free);
          // The whole body sinks as it loses its structure.
          pos.y -= uP * 0.9;

          vec4 mv = modelViewMatrix * vec4(pos, 1.0);
          // Crystal facets catch light; meltwater droplets are smaller.
          gl_PointSize = uSize * (1.25 - free * 0.55) * (1.0 / -mv.z) * 8.0;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        precision highp float;
        varying float vFree;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if (d > 0.5) discard;
          float core = smoothstep(0.5, 0.0, d);
          vec3 ice  = vec3(0.62, 0.86, 0.98);   // luminous glacial blue
          vec3 water = vec3(0.92, 0.70, 0.38);  // warm amber meltwater
          vec3 col = mix(ice, water, vFree);
          // Restrained: additive points stack fast and blow out to white.
          float a = core * mix(0.40, 0.24, vFree);
          gl_FragColor = vec4(col * (0.38 + core * 0.55), a);
        }
      `,
    });

    const body = new THREE.Points(geo, mat);
    rig.add(body);

    // The meltwater line — rises as the ice gives itself up.
    const pool = new THREE.Mesh(
      new THREE.PlaneGeometry(15, 0.016),
      new THREE.MeshBasicMaterial({ color: 0xe0b57a, transparent: true, opacity: 0 }),
    );
    rig.add(pool);

    return { body, mat, pool };
  },

  pose({ body, mat, pool }, { p, t }) {
    mat.uniforms.uP.value = p;
    mat.uniforms.uTime.value = t;
    // Locked ice barely turns; once it is water it moves freely.
    body.rotation.y = t * 0.03 + p * 0.62;
    body.rotation.x = Math.sin(t * 0.16) * 0.04 * p;
    pool.position.y = -3.4 + p * 1.5;
    pool.material.opacity = clamp01((p - 0.3) * 1.4) * 0.3;
  },
});
