/**
 * BEDROCK — "Deep Time Core". The 4th dimension is GEOLOGICAL TIME.
 *
 * Scrolling drills downward through the rock record: a full-bleed plane rendered
 * by an FBM strata shader where scroll shifts the vertical sampling offset. You
 * descend from recent alluvium through rust-iron banding into basalt basement
 * rock, crossing a mineral-turquoise vein on the way — hundreds of millions of
 * years passing as one continuous surface rather than a slideshow.
 *
 * Fidelity comes from layered fractal noise: bedding planes warped by a low-
 * frequency fold, grain at high frequency, contact darkening at each plane, and a
 * directional core highlight so it reads as a cut face rather than a flat texture.
 */
import * as THREE from "../../_vendor/three.module.js";
import { createStage } from "./stage.js";

createStage({
  stillAt: 0.55,
  // The rock face is a backdrop: it stays centred and only drifts with parallax.
  framing: (p, narrow, w) => (narrow ? { x: 0, y: 1.1 } : { x: Math.min(1.4, w / 1100), y: 0.1 }),
  build({ rig }) {
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: { uP: { value: 0 }, uTime: { value: 0 } },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform float uP, uTime;

        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p){
          vec2 i = floor(p), f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1,0)), u.x),
                     mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
        }
        float fbm(vec2 p){
          float v = 0.0, a = 0.5;
          for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
          return v;
        }

        void main() {
          // Descending: scroll shifts WHERE in the column we are sampling.
          float depth = vUv.y * 2.2 - uP * 6.4;

          // Bedding planes warped by a slow fold — strata are never ruler-straight.
          float fold = fbm(vec2(vUv.x * 1.6, depth * 0.35)) * 0.55;
          float bed = depth + fold;

          float band = floor(bed * 3.2);
          float within = fract(bed * 3.2);

          // Palette by epoch: recent alluvium -> rust iron -> basalt basement.
          float age = clamp(-band * 0.06 + 0.5, 0.0, 1.0);
          vec3 alluvium = vec3(0.34, 0.27, 0.19);
          vec3 iron     = vec3(0.46, 0.20, 0.10);
          vec3 basalt   = vec3(0.07, 0.07, 0.08);
          vec3 rock = mix(alluvium, iron, smoothstep(0.15, 0.55, age));
          rock = mix(rock, basalt, smoothstep(0.5, 0.95, age));

          // Per-stratum variation so no two beds read identically.
          rock *= 0.72 + hash(vec2(band, 3.0)) * 0.55;

          // Grain, and contact darkening at each bedding plane.
          float grain = fbm(vec2(vUv.x * 26.0, bed * 34.0));
          rock *= 0.82 + grain * 0.4;
          rock *= 0.55 + smoothstep(0.0, 0.12, within) * 0.45;

          // A NARROW mineral vein cutting the section — the one cool note in the
          // palette. abs(fract-0.5) is 0 only at the band centre, so this must
          // fade AWAY from 0; testing it against a wide offset floods the whole
          // face turquoise and buries every stratum underneath it.
          float vein = smoothstep(0.028, 0.0, abs(fract(bed * 0.32) - 0.5));
          rock = mix(rock, vec3(0.16, 0.70, 0.66), vein * 0.8);

          // Cut face: lit from the left, vignetted so it floats on the ground.
          float lit = 1.0 - smoothstep(0.1, 1.0, abs(vUv.x - 0.32));
          rock *= 0.55 + lit * 0.7;
          float edge = smoothstep(0.0, 0.16, vUv.x) * smoothstep(1.0, 0.84, vUv.x);
          float fade = smoothstep(0.0, 0.14, vUv.y) * smoothstep(1.0, 0.86, vUv.y);

          gl_FragColor = vec4(rock, edge * fade * 0.96);
        }
      `,
    });

    const face = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 11, 1, 1), mat);
    rig.add(face);
    return { mat, face };
  },

  pose({ mat, face }, { p, t }) {
    mat.uniforms.uP.value = p;
    mat.uniforms.uTime.value = t;
    // The core turns a few degrees as you drill — a solid object, not a wall.
    face.rotation.y = -0.16 + Math.sin(t * 0.12) * 0.03 + p * 0.1;
    face.rotation.z = 0.015;
  },
});
