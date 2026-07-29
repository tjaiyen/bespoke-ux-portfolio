/**
 * SOLACE — "Two Clocks". The only template with TWO independent time axes, which
 * is the whole idea: a breath does not speed up because you scrolled faster.
 *
 *   Clock 1 — the BREATH, running on wall time, never on scroll. A 11-second
 *             cycle (4 in · 2 hold · 5 out) that the orb follows exactly, so a
 *             visitor can actually breathe along with it.
 *   Clock 2 — the SESSION, running on scroll. As you descend, the surface
 *             turbulence settles: agitated, high-frequency noise at the start,
 *             smooth and slow by the end. The breath stays; the noise leaves.
 *
 * Under reduced motion the orb holds mid-breath — deliberately at rest rather
 * than frozen mid-agitation.
 */
import * as THREE from "../../_vendor/three.module.js";
import { createStage, clamp01 } from "./stage.js";

createStage({
  stillAt: 0.8,
  build({ rig, scene }) {
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        uBreath: { value: 0 },   // 0..1 within one breath cycle
        uCalm: { value: 0 },     // 0 = unsettled, 1 = settled
        uTime: { value: 0 },
      },
      vertexShader: `
        uniform float uBreath, uCalm, uTime;
        varying vec3 vN; varying float vD;

        vec3 hash3(vec3 p){
          p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
          return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
        }
        float noise(vec3 p){
          vec3 i = floor(p), f = fract(p);
          vec3 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(dot(hash3(i + vec3(0,0,0)), f - vec3(0,0,0)), dot(hash3(i + vec3(1,0,0)), f - vec3(1,0,0)), u.x),
                         mix(dot(hash3(i + vec3(0,1,0)), f - vec3(0,1,0)), dot(hash3(i + vec3(1,1,0)), f - vec3(1,1,0)), u.x), u.y),
                     mix(mix(dot(hash3(i + vec3(0,0,1)), f - vec3(0,0,1)), dot(hash3(i + vec3(1,0,1)), f - vec3(1,0,1)), u.x),
                         mix(dot(hash3(i + vec3(0,1,1)), f - vec3(0,1,1)), dot(hash3(i + vec3(1,1,1)), f - vec3(1,1,1)), u.x), u.y), u.z);
        }

        void main() {
          vN = normalize(normalMatrix * normal);

          // CLOCK 1 — the breath. Scale follows the cycle, and nothing else does.
          float breathe = 0.9 + uBreath * 0.20;

          // CLOCK 2 — the session. Unsettled = fast, fine, restless detail.
          float freq = mix(4.2, 1.5, uCalm);
          float amp  = mix(0.16, 0.035, uCalm);
          float speed = mix(1.5, 0.28, uCalm);
          float n = noise(normal * freq + vec3(0.0, uTime * speed, 0.0));
          vD = n;

          vec3 p = normal * (breathe + n * amp);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p * 1.75, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying vec3 vN; varying float vD;
        uniform float uCalm, uBreath;
        void main() {
          // Soft clay-rose to sage, warming very slightly on the in-breath.
          vec3 rose = vec3(0.86, 0.62, 0.55);
          vec3 sage = vec3(0.55, 0.66, 0.53);
          vec3 col = mix(rose, sage, clamp(uCalm * 0.75 + vD * 0.4, 0.0, 1.0));
          col += uBreath * 0.05;

          // Gentle rim light — a body, not a flat disc.
          float rim = pow(1.0 - abs(vN.z), 2.2);
          col += rim * 0.28;
          // Edges soften as the session settles.
          float a = mix(0.82, 0.95, uCalm) * (0.55 + rim * 0.6);
          gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
        }
      `,
    });

    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 48), mat);
    rig.add(orb);
    scene.add(new THREE.AmbientLight(0xffffff, 1));
    return { orb, mat };
  },

  pose({ orb, mat }, { p, t }) {
    // 11-second cycle: 4s in · 2s hold · 5s out. Wall time only — NEVER scroll.
    const CYCLE = 11;
    const x = (t % CYCLE) / CYCLE;
    let breath;
    if (x < 4 / CYCLE) breath = 0.5 - 0.5 * Math.cos((x / (4 / CYCLE)) * Math.PI);      // inhale
    else if (x < 6 / CYCLE) breath = 1;                                                  // hold
    else breath = 0.5 + 0.5 * Math.cos(((x - 6 / CYCLE) / (5 / CYCLE)) * Math.PI);       // exhale

    mat.uniforms.uBreath.value = breath;
    mat.uniforms.uCalm.value = clamp01((p - 0.05) / 0.7);
    mat.uniforms.uTime.value = t;

    orb.rotation.y = t * 0.05;
    orb.rotation.x = Math.sin(t * 0.06) * 0.1;
  },
});
