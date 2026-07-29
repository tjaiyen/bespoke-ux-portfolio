/**
 * FATHOM — "Redshift Journey". The 4th dimension is COSMIC LOOKBACK TIME.
 *
 * Scrolling travels outward through the universe, which — really, not as a
 * metaphor — means travelling backward through time: the further out you go, the
 * older the light reaching you. Stars are laid out in a spiral disc with a depth
 * coordinate, and as you descend each one shifts along the blackbody-to-redshift
 * ramp (blue-white → gold → deep red) the further away it is, until the field
 * gives way to the microwave background: the oldest light there is, arriving as
 * a wall of faint noise.
 *
 * The astronomy is the art direction here — nothing is coloured arbitrarily.
 */
import * as THREE from "../../_vendor/three.module.js";
import { createStage, clamp01 } from "./stage.js";

const STARS = 7000;
const CMB = 2600;

createStage({
  stillAt: 0.6,
  build({ rig }) {
    // ---- The near/mid field: a spiral disc with real depth. ----
    const pos = new Float32Array(STARS * 3);
    const dist = new Float32Array(STARS);
    const seed = new Float32Array(STARS);
    for (let i = 0; i < STARS; i++) {
      const arm = Math.floor(Math.random() * 2) * Math.PI;
      const r = Math.pow(Math.random(), 0.62) * 5.4;
      const th = arm + r * 0.85 + (Math.random() - 0.5) * 0.75;
      pos[i * 3] = Math.cos(th) * r + (Math.random() - 0.5) * 0.5;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 0.9 * (1 - r / 7);
      pos[i * 3 + 2] = Math.sin(th) * r * 0.55 + (Math.random() - 0.5) * 0.5;
      dist[i] = clamp01(r / 5.4);
      seed[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aDist", new THREE.BufferAttribute(dist, 1));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));

    const starMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uP: { value: 0 }, uTime: { value: 0 } },
      vertexShader: `
        attribute float aDist; attribute float aSeed;
        uniform float uP, uTime;
        varying float vZ; varying float vTwinkle;
        void main() {
          // Travelling outward: the further out a star is, the older its light.
          vZ = clamp(aDist + uP * 0.85, 0.0, 1.4);
          vTwinkle = 0.75 + 0.25 * sin(uTime * 1.6 + aSeed * 40.0);
          vec3 p = position;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float size = mix(3.4, 1.5, aDist) * (1.0 - uP * 0.3);
          gl_PointSize = size * (1.0 / -mv.z) * 9.0;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        precision highp float;
        varying float vZ; varying float vTwinkle;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if (d > 0.5) discard;
          float core = smoothstep(0.5, 0.0, d);
          // The redshift ramp: hot blue-white -> solar gold -> deep red.
          vec3 hot  = vec3(0.86, 0.91, 1.00);
          vec3 gold = vec3(0.98, 0.80, 0.42);
          vec3 red  = vec3(0.74, 0.21, 0.16);
          vec3 col = mix(hot, gold, smoothstep(0.1, 0.62, vZ));
          col = mix(col, red, smoothstep(0.6, 1.15, vZ));
          gl_FragColor = vec4(col * (0.5 + core * 0.9), core * 0.62 * vTwinkle);
        }
      `,
    });
    const field = new THREE.Points(geo, starMat);
    rig.add(field);

    // ---- The microwave background: the oldest light, a shell of faint noise. ----
    const cpos = new Float32Array(CMB * 3);
    const cseed = new Float32Array(CMB);
    for (let i = 0; i < CMB; i++) {
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      const r = 9.2 + Math.random() * 0.5;
      cpos[i * 3] = Math.sin(ph) * Math.cos(th) * r;
      cpos[i * 3 + 1] = Math.cos(ph) * r * 0.7;
      cpos[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r;
      cseed[i] = Math.random();
    }
    const cgeo = new THREE.BufferGeometry();
    cgeo.setAttribute("position", new THREE.BufferAttribute(cpos, 3));
    cgeo.setAttribute("aSeed", new THREE.BufferAttribute(cseed, 1));
    const cmbMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uReveal: { value: 0 }, uTime: { value: 0 } },
      vertexShader: `
        attribute float aSeed; uniform float uReveal, uTime;
        varying float vA;
        void main() {
          vA = uReveal * (0.35 + 0.65 * fract(sin(aSeed * 91.7) * 43758.5453));
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = (2.0 + 3.0 * uReveal) * (1.0 / -mv.z) * 9.0;
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
          gl_FragColor = vec4(vec3(0.62, 0.16, 0.13) * (0.6 + core), core * vA * 0.5);
        }
      `,
    });
    const cmb = new THREE.Points(cgeo, cmbMat);
    rig.add(cmb);

    return { field, starMat, cmb, cmbMat };
  },

  pose({ field, starMat, cmb, cmbMat }, { p, t }) {
    starMat.uniforms.uP.value = p;
    starMat.uniforms.uTime.value = t;
    // The disc turns slowly and tips as you travel out of its plane.
    field.rotation.y = t * 0.035 + p * 0.9;
    field.rotation.x = -0.32 + p * 0.42;
    field.scale.setScalar(1 + p * 0.55);          // outward travel
    // The background only emerges at the very end of the journey.
    cmbMat.uniforms.uReveal.value = clamp01((p - 0.72) / 0.28);
    cmbMat.uniforms.uTime.value = t;
    cmb.rotation.y = -t * 0.02;
  },
});
