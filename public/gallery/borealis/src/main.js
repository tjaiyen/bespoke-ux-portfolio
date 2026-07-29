/**
 * BOREALIS — "The Curtain". The 4th dimension is SOLAR-WIND TIME.
 *
 * Scrolling turns up the solar wind. Three nested curtain planes are drawn by an
 * FBM flow-field shader: the lower edge of each curtain undulates, vertical rays
 * drift along it, and the emission climbs from oxygen green at the bottom into the
 * nitrogen magenta that only appears high in the atmosphere when the wind is
 * strong — which is why a weak aurora is green and a strong one goes red at the top.
 *
 * At rest the sky is not empty: stars and a faint quiet arc are always present, so
 * the landing frame is a night sky rather than a blank canvas.
 */
import * as THREE from "../../_vendor/three.module.js";
import { createStage } from "./stage.js";

const CURTAIN_FS = `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime, uWind, uOff, uHue;

  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1,0)), u.x),
               mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
  }
  float fbm(vec2 p){
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.07; a *= 0.5; }
    return v;
  }

  void main() {
    float x = vUv.x + uOff;
    // The foot of the curtain folds and drifts — it is never a straight line.
    float base = 0.10 + fbm(vec2(x * 2.4, uTime * 0.06 + uOff)) * 0.30;

    // Emission starts sharply at the foot and fades upward; a stronger wind
    // pushes the glow higher up the field lines.
    float above = smoothstep(base, base + 0.04, vUv.y);
    float reach = 0.34 + uWind * 0.46;
    float fade  = 1.0 - smoothstep(base, base + reach, vUv.y);

    // Vertical rays: field-aligned striations sliding along the curtain.
    float rays = fbm(vec2(x * 26.0 + uTime * 0.14, vUv.y * 1.1 + uTime * 0.04));
    rays = pow(0.30 + rays * 0.85, 2.1);

    float h = clamp((vUv.y - base) / reach, 0.0, 1.0);
    vec3 green   = vec3(0.24, 0.98, 0.58);   // atomic oxygen, ~100-150 km
    vec3 teal    = vec3(0.30, 0.85, 0.86);
    vec3 magenta = vec3(0.78, 0.32, 0.92);   // nitrogen, only when driven hard
    vec3 col = mix(green, teal, smoothstep(0.15, 0.6, h));
    // Clamped: uWind runs to 1.35, and an unclamped mix() weight above 1
    // extrapolates PAST magenta into an oversaturated false colour.
    col = mix(col, magenta, clamp(smoothstep(0.55, 1.0, h) * uHue * uWind, 0.0, 1.0));

    // Feather the plane edges so the geometry never reveals itself.
    float edge = smoothstep(0.0, 0.13, vUv.x) * smoothstep(1.0, 0.87, vUv.x);

    float a = above * fade * rays * edge * uWind * 0.72;
    gl_FragColor = vec4(col, a);
  }
`;

createStage({
  stillAt: 0.66,
  // A sky is a backdrop: it stays broadly centred and only drifts with parallax.
  framing: (p, narrow, w) => (narrow ? { x: 0, y: 1.0 } : { x: Math.min(1.5, w / 1050), y: 0.15 }),
  build({ rig }) {
    const sky = new THREE.Group();
    rig.add(sky);

    /* ---------- stars: always present, so p=0 is never an empty frame ---------- */
    const SN = 900;
    const sp = new Float32Array(SN * 3);
    const ss = new Float32Array(SN);
    for (let i = 0; i < SN; i++) {
      sp[i * 3] = (Math.random() - 0.5) * 26;
      sp[i * 3 + 1] = (Math.random() - 0.5) * 16;
      sp[i * 3 + 2] = -6 - Math.random() * 8;
      ss[i] = Math.random();
    }
    const sgeo = new THREE.BufferGeometry();
    sgeo.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    sgeo.setAttribute("aSeed", new THREE.BufferAttribute(ss, 1));
    const smat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uDim: { value: 0 } },
      vertexShader: `
        attribute float aSeed;
        uniform float uTime, uDim;
        varying float vA;
        void main() {
          // Scintillation, and stars near a bright curtain get washed out.
          vA = (0.35 + 0.65 * abs(sin(uTime * 0.6 + aSeed * 31.0))) * (1.0 - uDim * 0.55);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = (1.0 + aSeed * 2.6) * (1.0 / -mv.z) * 8.0;
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
          gl_FragColor = vec4(vec3(0.86, 0.92, 1.0) * core, core * vA * 0.85);
        }
      `,
    });
    sky.add(new THREE.Points(sgeo, smat));

    /* ---------- three nested curtains at different depths ---------- */
    const curtains = [];
    const layout = [
      { z: -3.2, w: 24, h: 13, off: 0.0, x: -0.6, rot: 0.05 },
      { z: -1.2, w: 19, h: 11, off: 3.7, x: 1.1, rot: -0.09 },
      { z: 0.8, w: 15, h: 9.5, off: 8.2, x: -1.4, rot: 0.14 },
    ];
    for (const l of layout) {
      const mat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: { uTime: { value: 0 }, uWind: { value: 0 }, uOff: { value: l.off }, uHue: { value: 1 } },
        vertexShader: `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `,
        fragmentShader: CURTAIN_FS,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(l.w, l.h, 1, 1), mat);
      mesh.position.set(l.x, 1.2, l.z);
      mesh.rotation.z = l.rot;
      sky.add(mesh);
      curtains.push({ mesh, mat, base: l.rot });
    }

    return { sky, curtains, smat };
  },

  pose({ sky, curtains, smat }, { p, t }) {
    // Never zero: a quiet arc is always up there, which is act one. Raised from
    // 0.22 after the landing frame measured effectively unpainted — "quiet" has
    // to still be visible, or act one is just an empty canvas.
    const wind = 0.44 + p * 0.85;
    smat.uniforms.uTime.value = t;
    smat.uniforms.uDim.value = Math.min(1, wind);

    for (let i = 0; i < curtains.length; i++) {
      const c = curtains[i];
      c.mat.uniforms.uTime.value = t;
      // Nearer curtains respond a little harder — a substorm does not light the
      // whole sky evenly.
      c.mat.uniforms.uWind.value = Math.min(1.35, wind * (0.78 + i * 0.16));
      c.mat.uniforms.uHue.value = p;
      // Slow furling. All other motion lives inside the shader.
      c.mesh.rotation.z = c.base + Math.sin(t * 0.07 + i * 2.1) * 0.045;
    }

    sky.rotation.y = Math.sin(t * 0.04) * 0.05;
    sky.position.y = -p * 0.6;
  },
});
