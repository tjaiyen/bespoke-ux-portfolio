/**
 * PRISM — "The Optical Path". The 4th dimension is LIGHT'S JOURNEY THROUGH GLASS.
 *
 * Scrolling advances a single beam along its path, and every act is a real thing
 * light does:
 *   ACT I   a white beam travels in and reaches the glass
 *   ACT II  it refracts — and because dispersion is wavelength-dependent, violet
 *           bends hardest and red least, so the fan opens in spectral ORDER
 *   ACT III the separated wavelengths land as caustics and shimmer
 *   ACT IV  they reconverge to one beam — "one source of truth"
 *
 * Rebuilt on the shared stage4d runtime so it matches its nine siblings: damped
 * scroll lerp, pointer + tilt parallax, scroll-reactive framing, and one static
 * reduced-motion frame with no loop. The beams are now additive GLSL geometry
 * with soft radial falloff and a travelling intensity front rather than flat
 * cylinders, and the dust motes are lit by whichever wavelength passes through
 * them — which is what makes the light read as volume rather than as line art.
 */
import * as THREE from "../../_vendor/three.module.js";
import { createStage, clamp01, act, easeInOut } from "./stage.js";

// Wavelength-ordered, and the fan angles follow that order: violet bends most.
const SPECTRUM = [
  { hex: 0xff3b30, bend: 0.00 }, // red — least refracted
  { hex: 0xff9500, bend: 0.16 },
  { hex: 0xffcc00, bend: 0.32 },
  { hex: 0x34c759, bend: 0.50 },
  { hex: 0x32ade6, bend: 0.68 },
  { hex: 0x0a84ff, bend: 0.84 },
  { hex: 0x7c5cff, bend: 1.00 }, // violet — most refracted
];
const MOTES = 520;

/** A soft-edged additive beam: bright core, falloff to nothing at the edges. */
function beamMaterial(color) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color(color) }, uIntensity: { value: 0 }, uFront: { value: 0 } },
    vertexShader: `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: `
      precision highp float;
      varying vec2 vUv;
      uniform vec3 uColor;
      uniform float uIntensity, uFront;
      void main() {
        // Radial falloff across the beam's width — a shaft of light, not a bar.
        float across = abs(vUv.y - 0.5) * 2.0;
        float body = pow(1.0 - across, 2.2);
        // The beam only exists up to how far the light has travelled.
        float reach = smoothstep(uFront + 0.06, uFront - 0.02, vUv.x);
        // A brighter head where the wavefront currently is.
        float head = smoothstep(0.10, 0.0, abs(vUv.x - uFront));
        float a = uIntensity * body * reach * (0.55 + head * 0.9);
        gl_FragColor = vec4(uColor * (0.7 + head * 1.1), a);
      }
    `,
  });
}

createStage({
  stillAt: 0.68,
  build({ rig, scene }) {
    // ---- The glass prism. ----
    const tri = new THREE.Shape();
    const s = 1.6;
    tri.moveTo(0, s);
    tri.lineTo(-s * 0.866, -s * 0.5);
    tri.lineTo(s * 0.866, -s * 0.5);
    tri.closePath();
    const geo = new THREE.ExtrudeGeometry(tri, {
      depth: 1.4, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2,
    });
    geo.center();

    const prism = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({
      color: 0xffffff, metalness: 0, roughness: 0.05, transparent: true, opacity: 0.26,
      clearcoat: 1, clearcoatRoughness: 0.1, emissive: 0x0a0a14, ior: 1.5,
    }));
    rig.add(prism);
    prism.add(new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({ color: 0xafc4ff, transparent: true, opacity: 0.6 }),
    ));

    // ---- The incoming white beam. ----
    const whiteMat = beamMaterial(0xffffff);
    const white = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 0.34), whiteMat);
    white.position.set(-3.9, 0.1, 0.02);
    rig.add(white);

    // ---- The dispersed spectrum. ----
    const spectrum = new THREE.Group();
    spectrum.position.set(0.35, -0.05, 0);
    rig.add(spectrum);
    const beams = SPECTRUM.map(({ hex }) => {
      const mat = beamMaterial(hex);
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 0.24), mat);
      mesh.position.set(3.2, 0, 0);
      const pivot = new THREE.Group();
      pivot.add(mesh);
      spectrum.add(pivot);
      return { pivot, mat };
    });

    // ---- Caustics on the floor. ----
    const ground = new THREE.Group();
    ground.position.set(2.5, -2.5, -0.5);
    ground.rotation.z = -0.15;
    rig.add(ground);
    const streaks = SPECTRUM.map(({ hex }, i) => {
      const t = i / (SPECTRUM.length - 1);
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(2.7, 0.085),
        new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      m.position.set(0, (t - 0.5) * 0.95, 0);
      m.rotation.z = 0.05 * (t - 0.5);
      ground.add(m);
      return m;
    });

    // ---- Dust motes, lit by whatever wavelength is passing through them. ----
    const mpos = new Float32Array(MOTES * 3);
    const mseed = new Float32Array(MOTES);
    for (let i = 0; i < MOTES; i++) {
      mpos[i * 3] = (Math.random() - 0.5) * 15;
      mpos[i * 3 + 1] = (Math.random() - 0.5) * 9;
      mpos[i * 3 + 2] = (Math.random() - 0.5) * 5;
      mseed[i] = Math.random();
    }
    const mgeo = new THREE.BufferGeometry();
    mgeo.setAttribute("position", new THREE.BufferAttribute(mpos, 3));
    mgeo.setAttribute("aSeed", new THREE.BufferAttribute(mseed, 1));
    const moteMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uSplit: { value: 0 } },
      vertexShader: `
        attribute float aSeed;
        uniform float uTime, uSplit;
        varying float vTint;
        void main() {
          vec3 p = position;
          p.y = mod(p.y + uTime * 0.08 + aSeed * 9.0 + 4.5, 9.0) - 4.5;
          // Motes sitting in the fan pick up its colour once the beam has split.
          vTint = uSplit * smoothstep(1.6, 0.0, abs(p.y - p.x * 0.12)) * step(0.0, p.x);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = (1.4 + aSeed * 1.6) * (1.0 / -mv.z) * 9.0;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        precision highp float;
        varying float vTint;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if (d > 0.5) discard;
          float core = smoothstep(0.5, 0.0, d);
          vec3 col = mix(vec3(0.72, 0.78, 1.0), vec3(1.0, 0.72, 0.95), vTint);
          gl_FragColor = vec4(col * (0.5 + core * 0.8), core * 0.42);
        }
      `,
    });
    rig.add(new THREE.Points(mgeo, moteMat));

    scene.add(new THREE.AmbientLight(0x8a7bff, 0.5));
    const key = new THREE.PointLight(0xffffff, 40); key.position.set(3, 4, 6); scene.add(key);
    const rim = new THREE.PointLight(0x35d0e0, 25); rim.position.set(-4, -2, 4); scene.add(rim);

    return { prism, whiteMat, beams, spectrum, streaks, ground, moteMat };
  },

  pose({ prism, whiteMat, beams, spectrum, streaks, ground, moteMat }, { p, t }) {
    // ACT I — the beam travels in and reaches the glass.
    const arrive = easeInOut(act(p, 0.0, 0.34));
    whiteMat.uniforms.uIntensity.value = 0.30 + arrive * 0.55;
    whiteMat.uniforms.uFront.value = arrive;

    // ACT II/III — dispersion. Violet bends hardest, so the fan opens in order.
    const split = easeInOut(act(p, 0.28, 0.66));
    const spread = 0.14 + split * 0.66;
    beams.forEach(({ pivot, mat }, i) => {
      const { bend } = SPECTRUM[i];
      pivot.rotation.z = (bend - 0.5) * spread;
      // Each wavelength emerges just after the one that bends less than it.
      const stagger = clamp01((split - bend * 0.18) / 0.82);
      mat.uniforms.uIntensity.value = stagger * 0.85;
      mat.uniforms.uFront.value = stagger;
    });

    // Caustics land, then shimmer.
    const land = easeInOut(act(p, 0.5, 0.82));
    streaks.forEach((m, i) => {
      m.material.opacity = land * (0.16 + 0.09 * Math.sin(t * 1.2 + i * 0.6));
      m.position.x = (1 - land) * -1.5;
    });
    ground.position.y = -2.5 + land * 0.25;

    // ACT IV — reconvergence to a single beam.
    const converge = easeInOut(act(p, 0.84, 1.0));
    spectrum.scale.setScalar(1 - converge * 0.34);
    spectrum.rotation.z = Math.sin(t * 0.5) * 0.05 - converge * 0.12;

    prism.rotation.y = p * Math.PI * 1.6 + t * 0.12;
    prism.rotation.x = 0.15 + Math.sin(t * 0.3) * 0.07;

    moteMat.uniforms.uTime.value = t;
    moteMat.uniforms.uSplit.value = split;
  },
});
