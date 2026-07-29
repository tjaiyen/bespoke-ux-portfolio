/**
 * MEANDER — "One Cohort of Water". The 4th dimension is RESIDENCE TIME.
 *
 * Scrolling carries a single body of water all the way round the cycle: it lifts
 * off the sea as vapour, gathers into cloud, falls as rain, runs the length of a
 * catchment, and returns to the sea it started from. The particles travel together
 * as one cohort with a modest spread, so you are watching THIS water move — not a
 * diagram of water in general.
 *
 * Each phase has its own signature, because water does not behave the same way in
 * each: vapour disperses widely, cloud churns tightly, rain elongates into vertical
 * streaks, a river narrows into a sinuous channel, and the sea flattens out wide.
 *
 * Normal blending, not additive: this site's ground is near-white, and additive
 * points on a light background wash out to nothing.
 */
import * as THREE from "../../_vendor/three.module.js";
import { createStage } from "./stage.js";

const N = 2300;
// A share of the particles are held STATIC across the whole loop, at low alpha:
// the cycle itself stays faintly visible while the bright cohort travels through
// it. Without this the scene is one small blob and reads as a blob, not a cycle.
const GHOST = 0.45;

createStage({
  stillAt: 0.62,
  build({ rig }) {
    const seed = new Float32Array(N * 3);
    const off = new Float32Array(N);
    const rnd = new Float32Array(N);
    const ghost = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      seed[i * 3] = (Math.random() - 0.5) * 2;
      seed[i * 3 + 1] = (Math.random() - 0.5) * 2;
      seed[i * 3 + 2] = (Math.random() - 0.5) * 2;
      // Spread along the loop: enough that the cohort reads as a body of water
      // with a leading and trailing edge, not a single rigid clump.
      ghost[i] = i / N < GHOST ? 1 : 0;
      // Ghosts are spread over the ENTIRE loop; the cohort keeps a tight spread so
      // it still reads as one body of water with a leading and trailing edge.
      off[i] = ghost[i] ? Math.random() : ((i / N - GHOST) / (1 - GHOST)) * 0.22;
      rnd[i] = Math.random();
    }

    const geo = new THREE.BufferGeometry();
    // `position` is unused as a position — the path is computed in the shader —
    // but three.js requires the attribute, so it carries the dispersion seed.
    geo.setAttribute("position", new THREE.BufferAttribute(seed, 3));
    geo.setAttribute("aOff", new THREE.BufferAttribute(off, 1));
    geo.setAttribute("aRnd", new THREE.BufferAttribute(rnd, 1));
    geo.setAttribute("aGhost", new THREE.BufferAttribute(ghost, 1));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uU: { value: 0 }, uTime: { value: 0 } },
      vertexShader: `
        attribute float aOff;
        attribute float aRnd;
        attribute float aGhost;
        uniform float uU, uTime;
        varying float vPhase;
        varying float vA;

        // The cycle as a smooth path through its stations: sea, rising, cloud,
        // falling, headwater, river, and back to the sea.
        vec3 pathAt(float u) {
          vec3 p = vec3(-3.5, -2.9, 0.0);                                  // the sea
          p = mix(p, vec3(-1.3,  0.4,  0.8), smoothstep(0.00, 0.18, u));   // rising
          p = mix(p, vec3( 2.0,  2.9,  0.2), smoothstep(0.18, 0.34, u));   // cloud
          p = mix(p, vec3( 1.5,  0.6, -0.6), smoothstep(0.34, 0.50, u));   // falling
          p = mix(p, vec3( 0.8, -1.8,  0.5), smoothstep(0.50, 0.64, u));   // headwater
          p = mix(p, vec3(-1.6, -2.5, -0.7), smoothstep(0.64, 0.82, u));   // the river
          p = mix(p, vec3(-3.5, -2.9,  0.0), smoothstep(0.82, 1.00, u));   // the sea
          return p;
        }

        void main() {
          // Ghosts hold a fixed station on the loop; the cohort advances with scroll.
          float u = mix(fract(uU + aOff), aOff, aGhost);
          vPhase = u;

          // Phase weights — each station has its own signature.
          float fVapor = 1.0 - smoothstep(0.16, 0.30, u);
          float fCloud = smoothstep(0.16, 0.30, u) * (1.0 - smoothstep(0.34, 0.44, u));
          float fRain  = smoothstep(0.34, 0.44, u) * (1.0 - smoothstep(0.56, 0.64, u));
          float fRiver = smoothstep(0.56, 0.64, u) * (1.0 - smoothstep(0.84, 0.92, u));
          float fSea   = smoothstep(0.84, 0.92, u);

          vec3 base = pathAt(u);
          float s = aRnd * 6.2831853;

          // Dispersion: wide as vapour, tight in cloud, narrow in the channel.
          float spread = fVapor * 1.45 + fCloud * 0.70 + fRain * 0.42 + fRiver * 0.26 + fSea * 1.85;
          vec3 disp = position * spread;
          // Rain elongates vertically; the sea flattens and runs wide.
          disp.y *= mix(1.0, 2.3, fRain);
          disp.y *= mix(1.0, 0.10, fSea);
          disp.x *= mix(1.0, 2.5, fSea);
          // The river meanders — a lateral sinuosity along the channel.
          disp.z += sin(u * 34.0 + s) * 0.5 * fRiver;

          // Vapour drifts, cloud churns, rain falls straight, the channel is steady.
          vec3 drift = vec3(
            sin(uTime * 0.45 + s) * (fVapor * 0.5 + fCloud * 0.28),
            cos(uTime * 0.38 + s * 1.7) * (fVapor * 0.4 + fCloud * 0.22),
            sin(uTime * 0.33 + s * 2.1) * (fVapor * 0.35 + fSea * 0.2)
          );

          vec3 pos = base + disp + drift;

          // Vapour is faint and large; rain is small, dark and definite.
          vA = fVapor * 0.30 + fCloud * 0.42 + fRain * 0.80 + fRiver * 0.72 + fSea * 0.46;
          float sz = fVapor * 9.0 + fCloud * 8.0 + fRain * 3.4 + fRiver * 4.2 + fSea * 5.5;
          // The standing cycle sits well back from the travelling cohort.
          vA *= mix(1.0, 0.26, aGhost);
          sz *= mix(1.0, 0.62, aGhost);

          vec4 mv = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = (sz + aRnd * 2.0) * (1.0 / -mv.z) * 8.0;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        precision highp float;
        varying float vPhase;
        varying float vA;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if (d > 0.5) discard;
          float core = smoothstep(0.5, 0.05, d);

          // Colours dark enough to read against a near-white ground.
          vec3 vapour = vec3(0.62, 0.70, 0.74);
          vec3 cloud  = vec3(0.45, 0.53, 0.58);
          vec3 rain   = vec3(0.09, 0.36, 0.44);
          vec3 river  = vec3(0.06, 0.38, 0.42);
          vec3 sea    = vec3(0.05, 0.28, 0.34);

          vec3 col = vapour;
          col = mix(col, cloud, smoothstep(0.16, 0.30, vPhase));
          col = mix(col, rain,  smoothstep(0.36, 0.46, vPhase));
          col = mix(col, river, smoothstep(0.58, 0.66, vPhase));
          col = mix(col, sea,   smoothstep(0.86, 0.94, vPhase));

          gl_FragColor = vec4(col, core * vA);
        }
      `,
    });

    const water = new THREE.Points(geo, mat);
    // `position` holds a dispersion seed, not a position, so three's derived
    // bounding sphere does not enclose the shader-computed path and the whole
    // cohort can be frustum-culled away.
    water.frustumCulled = false;
    rig.add(water);

    // Sea level — the datum the whole cycle returns to.
    const level = new THREE.Mesh(
      new THREE.PlaneGeometry(13, 0.012),
      new THREE.MeshBasicMaterial({ color: 0x0f6070, transparent: true, opacity: 0.28 }),
    );
    level.position.y = -2.9;
    rig.add(level);

    return { water, mat, level };
  },

  pose({ water, mat }, { p, t }) {
    // Start just off zero so the landing frame already shows vapour lifting rather
    // than a cohort sitting flat on the sea.
    mat.uniforms.uU.value = 0.04 + p * 0.94;
    mat.uniforms.uTime.value = t;
    water.rotation.y = Math.sin(t * 0.06) * 0.08 + p * 0.2;
  },
});
