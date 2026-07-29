/**
 * TIDAL — "The Desalination Column". The 4th dimension is DEPTH-AS-TIME.
 *
 * Scrolling descends the water column, and the water changes state as you go:
 * ~9,000 particles begin as warm, turbulent, disordered brine and progressively
 * resolve into a cold crystalline lattice — you watch seawater BECOME drinkable.
 * The transition is staggered per-particle by height, so order sweeps downward
 * through the column like a front rather than snapping all at once.
 *
 * Fidelity comes from a custom GLSL point shader (soft additive cores, per-particle
 * colour interpolation, size that grows as a particle locks into the lattice)
 * rather than from raw geometry count.
 *
 * Contract: canvas is aria-hidden decoration, never the sole content; reduced
 * motion renders one still frame via the shared runtime.
 */
import * as THREE from "../../_vendor/three.module.js";
import { createStage, clamp01 } from "./stage.js";

const NX = 30, NY = 20, NZ = 15;
const N = NX * NY * NZ;

createStage({
  stillAt: 0.62,
  build({ rig }) {
    const chaos = new Float32Array(N * 3);
    const lattice = new Float32Array(N * 3);
    const seed = new Float32Array(N);
    const depth = new Float32Array(N);

    // Open enough that the lattice reads as STRUCTURE rather than a solid mass —
    // additive points stacking in a tight grid blow out to white very quickly.
    const SP = 0.33;
    let i = 0;
    for (let x = 0; x < NX; x++) {
      for (let y = 0; y < NY; y++) {
        for (let z = 0; z < NZ; z++, i++) {
          // Ordered destination: a clean cubic lattice — pure water.
          lattice[i * 3] = (x - (NX - 1) / 2) * SP;
          lattice[i * 3 + 1] = (y - (NY - 1) / 2) * SP;
          lattice[i * 3 + 2] = (z - (NZ - 1) / 2) * SP;
          // Origin: suspended brine, scattered and unstructured.
          const r = 2.1 + Math.random() * 2.6;
          const th = Math.random() * Math.PI * 2;
          const ph = Math.acos(2 * Math.random() - 1);
          chaos[i * 3] = Math.sin(ph) * Math.cos(th) * r * 1.25;
          chaos[i * 3 + 1] = Math.cos(ph) * r;
          chaos[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r * 0.8;
          seed[i] = Math.random();
          depth[i] = y / (NY - 1); // lets order sweep DOWN as a front
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(chaos, 3));
    geo.setAttribute("aLattice", new THREE.BufferAttribute(lattice, 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    geo.setAttribute("aDepth", new THREE.BufferAttribute(depth, 1));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uP: { value: 0 }, uTime: { value: 0 }, uSize: { value: 13 } },
      vertexShader: `
        attribute vec3 aLattice;
        attribute float aSeed;
        attribute float aDepth;
        uniform float uP, uTime, uSize;
        varying float vOrder;
        void main() {
          // Order arrives as a FRONT sweeping down the column, not all at once.
          float front = uP * 1.65 - aDepth * 0.55;
          float order = smoothstep(0.05, 0.85, front);
          vOrder = order;

          float s = aSeed * 6.2831853;
          vec3 turb = vec3(
            sin(uTime * 0.55 + s) * 0.42,
            cos(uTime * 0.43 + s * 1.7) * 0.34,
            sin(uTime * 0.37 + s * 2.3) * 0.30
          ) * (1.0 - order);

          // The lattice breathes faintly so it reads as water, not a solid.
          vec3 settled = aLattice + vec3(
            sin(uTime * 0.8 + s) * 0.012,
            cos(uTime * 0.7 + s) * 0.012,
            0.0
          );

          vec3 pos = mix(position + turb, settled, order);
          pos.y += uP * 1.15;

          vec4 mv = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = uSize * (0.75 + order * 0.75) * (1.0 / -mv.z) * 8.0;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        precision highp float;
        varying float vOrder;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if (d > 0.5) discard;
          float core = smoothstep(0.5, 0.0, d);
          vec3 brine = vec3(0.78, 0.66, 0.44);   // warm mineral suspension
          vec3 pure  = vec3(0.30, 0.88, 0.96);   // clarity
          vec3 col = mix(brine, pure, vOrder);
          // Deliberately restrained: with additive blending across thousands of
          // overlapping points, "brighter" reads as blown-out, not as luminous.
          float a = core * mix(0.26, 0.42, vOrder);
          gl_FragColor = vec4(col * (0.34 + core * 0.5), a);
        }
      `,
    });

    const field = new THREE.Points(geo, mat);
    rig.add(field);

    // A thermocline line — a horizon that sinks past you during the descent.
    const band = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 0.018),
      new THREE.MeshBasicMaterial({ color: 0x35d0e0, transparent: true, opacity: 0.25 }),
    );
    rig.add(band);

    return { field, mat, band };
  },

  pose({ field, mat, band }, { p, t }) {
    mat.uniforms.uP.value = p;
    mat.uniforms.uTime.value = t;
    // Ordered water turns slower — it has settled.
    field.rotation.y = t * 0.06 + p * 0.5;
    field.rotation.x = Math.sin(t * 0.2) * 0.05;
    band.position.y = 2.6 - p * 5.6;
    band.material.opacity = 0.28 * (1 - clamp01(Math.abs(p - 0.5) * 2.4));
  },
});
