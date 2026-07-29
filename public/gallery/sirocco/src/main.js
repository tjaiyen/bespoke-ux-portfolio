/**
 * SIROCCO — "The Migrating Field". The 4th dimension is WIND TIME.
 *
 * Scrolling advances seasons of wind across a dune sea, rendered on a single plane
 * by an FBM heightfield shader: transverse dune crests are built from
 * layered noise, then ADVECTED — the sampling coordinate shifts and shears with
 * scroll, so the whole field migrates downwind and re-forms rather than merely
 * scrolling past. Crests sharpen on the windward side and slip away on the lee,
 * which is how a dune actually moves: grains climb one face and avalanche down the
 * other, and the shape travels while the sand stays behind.
 *
 * Lit as low golden-hour sun raking across the crests, because a dune field with
 * the sun overhead is a flat beige nothing — the light IS the subject.
 *
 * Heightfield in the FRAGMENT shader, not CPU vertex displacement: displacing
 * thousands of vertices per frame is a cost class nothing else here has proven, and
 * buys no fidelity a raked-light shading model does not already give.
 */
import * as THREE from "../../_vendor/three.module.js";
import { createStage } from "./stage.js";

createStage({
  stillAt: 0.6,
  framing: (p, narrow, w) => (narrow ? { x: 0, y: 0.9 } : { x: Math.min(1.5, w / 1080), y: 0.1 }),
  build({ rig }) {
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: { uP: { value: 0 }, uTime: { value: 0 } },
      vertexShader: `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
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
          for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.04; a *= 0.5; }
          return v;
        }

        // Dune height at a point. Transverse crests perpendicular to the wind,
        // warped by a large-scale drift so the field is never a corrugation.
        float dunes(vec2 q, float march) {
          // Advection: the whole field travels downwind as the seasons pass.
          q.x -= march * 1.9;
          // Large-scale meander of the dune train.
          float warp = fbm(q * 0.35 + vec2(march * 0.4, 0.0)) * 1.5;
          // Crests: a ridged wave, sharpened so slip faces read as edges.
          float ridge = 1.0 - abs(sin(q.x * 1.5 + warp + q.y * 0.35));
          ridge = pow(ridge, 1.7);
          // Secondary dunes riding the primary train.
          float second = fbm(q * 1.6 + vec2(march * 0.9, march * 0.2)) * 0.45;
          return ridge * 0.8 + second;
        }

        void main() {
          // Perspective: sample far more ground near the horizon than at our feet.
          float horizon = 0.62;
          float d = max(0.0001, horizon - vUv.y);
          vec2 q = vec2((vUv.x - 0.5) / d * 0.9, 1.0 / d);
          float march = uP * 1.6 + uTime * 0.006;

          float h = dunes(q, march);

          // Raked light: shade from the gradient along the wind axis. A crest lit
          // on the windward face and shadowed on the slip face is the whole read.
          float e = 0.06;
          float hx = dunes(q + vec2(e, 0.0), march) - dunes(q - vec2(e, 0.0), march);
          float hy = dunes(q + vec2(0.0, e), march) - dunes(q - vec2(0.0, e), march);
          vec3 n = normalize(vec3(-hx, 0.55 * e * 2.0, -hy));
          vec3 sun = normalize(vec3(-0.72, 0.30, 0.62));   // low, and behind-left
          float lam = clamp(dot(n, sun), 0.0, 1.0);

          // Golden hour: warm where lit, cool violet where the slip face is shaded.
          vec3 lit   = vec3(0.98, 0.80, 0.48);
          vec3 shade = vec3(0.36, 0.28, 0.34);
          vec3 col = mix(shade, lit, pow(lam, 0.75));

          // Crest highlight — wind-polished sand catches the sun hardest at the top.
          col += vec3(1.0, 0.88, 0.66) * smoothstep(0.85, 1.25, h) * 0.35;

          // Airborne sand hazes out the distance.
          float haze = smoothstep(0.0, 0.42, d);
          col = mix(vec3(0.93, 0.84, 0.70), col, haze);

          // Grain: fine sand texture, denser close to the viewer.
          col *= 0.94 + hash(vUv * 900.0) * 0.12 * haze;

          // Sky above the horizon, and feathered edges so the plane never shows.
          float ground = smoothstep(horizon + 0.005, horizon - 0.02, vUv.y);
          vec3 sky = mix(vec3(0.99, 0.86, 0.66), vec3(0.72, 0.74, 0.86), smoothstep(0.62, 1.0, vUv.y));
          col = mix(sky, col, ground);

          float edge = smoothstep(0.0, 0.14, vUv.x) * smoothstep(1.0, 0.86, vUv.x);
          float fade = smoothstep(0.0, 0.10, vUv.y) * smoothstep(1.0, 0.90, vUv.y);
          gl_FragColor = vec4(col, edge * fade * 0.97);
        }
      `,
    });

    const field = new THREE.Mesh(new THREE.PlaneGeometry(9.5, 10.5, 1, 1), mat);
    rig.add(field);
    return { mat, field };
  },

  pose({ mat, field }, { p, t }) {
    mat.uniforms.uP.value = p;
    mat.uniforms.uTime.value = t;
    // The viewpoint turns a few degrees across the field as the seasons pass.
    field.rotation.y = -0.1 + Math.sin(t * 0.05) * 0.02 + p * 0.14;
    field.rotation.z = -0.02;
  },
});
