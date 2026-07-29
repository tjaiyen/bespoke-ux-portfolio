/**
 * UMBRA — "Two Minutes Fifty-One". The 4th dimension is CONTACT TIME.
 *
 * Scrolling runs an eclipse from first contact to totality. The moon crosses a
 * limb-darkened, granulating sun; the sky darkens only in the last moments — as it
 * really does, because a 90%-covered sun is still blindingly bright — and at second
 * contact the photosphere breaks into Baily's beads through the lunar valleys,
 * a pink chromosphere ring flashes, prominences stand off the limb, and the corona
 * opens out in streamers that follow the sun's magnetic field: equatorial streamers
 * long and flat, polar plumes short and fine.
 *
 * The eclipse itself is one fragment shader over a single plane; the starfield is a
 * separate point layer. Composing it from discs and sprites would have given a logo
 * of an eclipse — the interesting part of totality is entirely in how light falls off.
 */
import * as THREE from "../../_vendor/three.module.js";
import { createStage, clamp01, easeInOut, mix } from "./stage.js";

const RS = 1.0;    // sun radius, in shader units
const RM = 1.035;  // the moon is very slightly the larger disc — this is a TOTAL eclipse

createStage({
  stillAt: 0.82,   // the reduced-motion still is totality
  build({ rig }) {
    const sky = new THREE.Group();
    rig.add(sky);

    /* ---------- stars, revealed only as the sky actually darkens ---------- */
    const SN = 500;
    const sp = new Float32Array(SN * 3);
    const ss = new Float32Array(SN);
    for (let i = 0; i < SN; i++) {
      sp[i * 3] = (Math.random() - 0.5) * 24;
      sp[i * 3 + 1] = (Math.random() - 0.5) * 15;
      sp[i * 3 + 2] = -7 - Math.random() * 6;
      ss[i] = Math.random();
    }
    const sgeo = new THREE.BufferGeometry();
    sgeo.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    sgeo.setAttribute("aSeed", new THREE.BufferAttribute(ss, 1));
    const smat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uDark: { value: 0 }, uTime: { value: 0 } },
      vertexShader: `
        attribute float aSeed;
        uniform float uDark, uTime;
        varying float vA;
        void main() {
          vA = uDark * (0.4 + 0.6 * abs(sin(uTime * 0.7 + aSeed * 27.0)));
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = (1.0 + aSeed * 2.4) * (1.0 / -mv.z) * 8.0;
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
          gl_FragColor = vec4(vec3(0.90, 0.92, 1.0) * core, core * vA * 0.9);
        }
      `,
    });
    sky.add(new THREE.Points(sgeo, smat));

    /* ---------- the eclipse itself ---------- */
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uMoon: { value: new THREE.Vector2(3.4, 0.55) },
        uCover: { value: 0 },
        uTotal: { value: 0 },
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform vec2 uMoon;
        uniform float uCover, uTotal, uTime;

        const float RS = ${RS.toFixed(3)};
        const float RM = ${RM.toFixed(3)};

        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p){
          vec2 i = floor(p), f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1,0)), u.x),
                     mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
        }
        float fbm(vec2 p){
          float v = 0.0, a = 0.5;
          for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.05; a *= 0.5; }
          return v;
        }

        void main() {
          vec2 q = (vUv - 0.5) * 6.0;
          float ds = length(q);              // distance from sun centre
          vec2  qm = q - uMoon;
          float dm = length(qm);             // distance from moon centre
          float ang = atan(q.y, q.x);

          vec3 col = vec3(0.0);

          /* ---- photosphere: limb-darkened, granulating ---- */
          float disc = smoothstep(RS, RS - 0.012, ds);
          // Classic limb darkening — the edge of the sun is genuinely dimmer.
          float mu = sqrt(max(0.0, 1.0 - (ds / RS) * (ds / RS)));
          float limb = 0.32 + 0.68 * pow(mu, 0.55);
          float gran = 0.90 + 0.10 * fbm(q * 14.0 + uTime * 0.05);
          vec3 photo = vec3(1.0, 0.96, 0.88) * limb * gran;

          // The moon: an utterly black disc, edge slightly rough (its terrain).
          float terrain = 1.0 + (fbm(vec2(ang * 9.0, 2.0)) - 0.5) * 0.012;
          float moonEdge = RM * terrain;
          float outsideMoon = smoothstep(moonEdge - 0.006, moonEdge + 0.006, dm);

          col += photo * disc * outsideMoon;

          /* ---- corona: only real once the photosphere is gone ---- */
          // Streamers follow the field: long and flat at the equator, short fine
          // plumes at the poles. That anisotropy is what makes a corona read as
          // a corona rather than a glow.
          float equator = pow(abs(cos(ang)), 1.4);
          float polar   = pow(abs(sin(ang)), 6.0);
          float reachC  = mix(0.55, 2.1, equator) + polar * 0.25;
          float streak  = 0.45 + 0.85 * fbm(vec2(ang * 4.2, ds * 0.9 + 3.0));
          float fine    = 0.65 + 0.35 * fbm(vec2(ang * 26.0, ds * 2.0));
          float falloff = exp(-max(0.0, ds - RS) / (reachC * 0.42));
          float corona  = falloff * streak * fine * smoothstep(RS - 0.05, RS + 0.02, ds);
          col += vec3(0.93, 0.95, 1.0) * corona * uTotal * 0.95;

          /* ---- chromosphere: a thin pink ring at the moment of contact ---- */
          float ring = smoothstep(0.055, 0.0, abs(dm - moonEdge));
          // Brightest DURING the contact transition, gone at mid-totality.
          float contact = uTotal * (1.0 - uTotal) * 4.0;
          col += vec3(1.0, 0.34, 0.44) * ring * contact * 1.5;

          /* ---- Baily's beads: photosphere through lunar valleys ---- */
          float beadN = fbm(vec2(ang * 34.0, 7.0));
          float beads = smoothstep(0.62, 0.95, beadN) * smoothstep(0.035, 0.0, abs(dm - moonEdge));
          col += vec3(1.0, 0.97, 0.90) * beads * contact * 3.2 * disc;

          /* ---- prominences: standing loops of plasma at the limb ---- */
          float pr = smoothstep(0.72, 1.0, fbm(vec2(ang * 7.0, 11.0)));
          float prShape = smoothstep(0.10, 0.0, dm - moonEdge) * smoothstep(-0.01, 0.02, dm - moonEdge);
          col += vec3(1.0, 0.26, 0.36) * pr * prShape * uTotal * 1.6;

          /* ---- daylight scatter: the sky only dims at the very end ---- */
          // A 90% eclipsed sun still lights the landscape; the collapse is late
          // and fast, which is the part nobody is prepared for.
          float day = pow(1.0 - uCover, 0.42);
          col += vec3(0.42, 0.46, 0.62) * day * 0.10 * exp(-ds * 0.5);

          float edge = smoothstep(0.0, 0.10, vUv.x) * smoothstep(1.0, 0.90, vUv.x);
          float fade = smoothstep(0.0, 0.10, vUv.y) * smoothstep(1.0, 0.90, vUv.y);
          float a = clamp(max(max(col.r, col.g), col.b), 0.0, 1.0);
          gl_FragColor = vec4(col, a * edge * fade);
        }
      `,
    });

    const plate = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 8.4, 1, 1), mat);
    sky.add(plate);

    return { sky, mat, smat, plate };
  },

  pose({ sky, mat, smat, plate }, { p, t }) {
    // First contact is already under way on the landing frame — the moon has taken
    // its first bite rather than sitting off in clear sky.
    const travel = easeInOut(clamp01(p / 0.76));
    // 1.85, not 2.02: separation must start BELOW RS+RM (2.035) or the discs
    // never touch and the landing frame shows an untouched sun — the exact
    // 'sitting off in clear sky' this is supposed to avoid.
    const mx = mix(1.85, 0, travel) + (p > 0.76 ? (p - 0.76) * -0.22 : 0);
    const my = mix(0.62, 0.015, travel);
    mat.uniforms.uMoon.value.set(mx, my);
    mat.uniforms.uTime.value = t;

    // Coverage from real disc separation, so the darkening tracks the geometry.
    const sep = Math.hypot(mx, my);
    const cover = clamp01(1 - sep / (RS + RM));
    mat.uniforms.uCover.value = cover;
    // Totality is the narrow window where the moon fully contains the sun.
    const total = clamp01((cover - 0.90) / 0.09);
    mat.uniforms.uTotal.value = total;

    smat.uniforms.uTime.value = t;
    smat.uniforms.uDark.value = Math.pow(cover, 9);   // stars arrive late, and fast

    plate.rotation.z = Math.sin(t * 0.04) * 0.02;
    sky.rotation.y = Math.sin(t * 0.03) * 0.03;
  },
});
