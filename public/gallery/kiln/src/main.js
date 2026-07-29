/**
 * KILN — "The Firing Schedule". The 4th dimension is TEMPERATURE OVER TIME.
 *
 * Scrolling scrubs an eighteen-hour reduction firing. The vessel is a lathed
 * profile — thrown on the wheel — and its SURFACE STATE is the story: raw damp
 * clay, then bisque as the water leaves, then the real blackbody ramp of a kiln
 * coming up to cone 10 (dull red → orange → yellow-white at ~1300°C), then the
 * slow cool where the glaze finally vitrifies into celadon.
 *
 * The emissive colour follows an approximate blackbody curve rather than an
 * arbitrary gradient, which is why the heat reads as heat. Embers rise faster the
 * hotter it gets, and the whole studio is lit BY the kiln — the light in the
 * scene comes from the object, not from a lamp pointed at it.
 */
import * as THREE from "../../_vendor/three.module.js";
import { createStage, clamp01, act, easeInOut } from "./stage.js";

const EMBERS = 900;

/** Approximate blackbody colour for a normalised 0..1 firing temperature. */
function blackbody(k, c) {
  // 0 = cold clay · 0.5 = dull red · 1 = cone 10, ~1300°C.
  // Deliberately tops out ORANGE-YELLOW rather than white: a white-hot peak both
  // misreads the temperature and blows the vessel's silhouette out to a flat blob.
  const r = clamp01(k * 2.2);
  const g = clamp01(k * k * 0.85);
  const b = clamp01(Math.pow(Math.max(0, k - 0.7), 2.0) * 1.6);
  return c.setRGB(r, g, b);
}

createStage({
  stillAt: 0.68,
  build({ rig, scene }) {
    // ---- The vessel: a thrown profile, revolved. ----
    const profile = [];
    for (let i = 0; i <= 26; i++) {
      const u = i / 26;
      // A shouldered jar: narrow foot, full belly, drawn-in neck, flared lip.
      const r =
        0.42 + Math.sin(u * Math.PI * 0.92) * 0.78 - Math.pow(Math.max(0, u - 0.72) * 2.1, 2) * 0.5 +
        (u > 0.94 ? 0.16 : 0);
      profile.push(new THREE.Vector2(Math.max(0.16, r), u * 2.5 - 1.25));
    }
    const vessel = new THREE.Mesh(
      new THREE.LatheGeometry(profile, 72),
      new THREE.MeshStandardMaterial({
        color: 0x6b5445, roughness: 0.92, metalness: 0.0,
        emissive: 0x000000, emissiveIntensity: 1,
      }),
    );
    rig.add(vessel);

    // ---- Embers rising off the piece. ----
    const epos = new Float32Array(EMBERS * 3);
    const eseed = new Float32Array(EMBERS);
    for (let i = 0; i < EMBERS; i++) {
      const th = Math.random() * Math.PI * 2;
      const r = 0.5 + Math.random() * 1.5;
      epos[i * 3] = Math.cos(th) * r;
      epos[i * 3 + 1] = -1.3 + Math.random() * 3.4;
      epos[i * 3 + 2] = Math.sin(th) * r;
      eseed[i] = Math.random();
    }
    const egeo = new THREE.BufferGeometry();
    egeo.setAttribute("position", new THREE.BufferAttribute(epos, 3));
    egeo.setAttribute("aSeed", new THREE.BufferAttribute(eseed, 1));
    const emberMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uHeat: { value: 0 }, uTime: { value: 0 } },
      vertexShader: `
        attribute float aSeed; uniform float uHeat, uTime;
        varying float vA;
        void main() {
          vec3 p = position;
          // Hotter kiln, faster convection.
          float rise = fract(aSeed + uTime * (0.035 + uHeat * 0.1)) * 4.2;
          p.y = -1.4 + rise;
          p.x += sin(uTime * 0.9 + aSeed * 30.0) * 0.16 * uHeat;
          p.z += cos(uTime * 0.8 + aSeed * 21.0) * 0.16 * uHeat;
          vA = uHeat * (1.0 - rise / 4.2);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = (1.6 + 2.2 * uHeat) * (1.0 / -mv.z) * 9.0;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        precision highp float; varying float vA;
        void main() {
          vec2 c = gl_PointCoord - 0.5; float d = length(c);
          if (d > 0.5) discard;
          float core = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(vec3(1.0, 0.55, 0.18) * (0.5 + core), core * vA * 0.6);
        }
      `,
    });
    rig.add(new THREE.Points(egeo, emberMat));

    // The studio is lit BY the kiln — this light IS the firing.
    const kilnLight = new THREE.PointLight(0xff7a2a, 0, 22);
    kilnLight.position.set(0, 0.1, 1.6);
    rig.add(kilnLight);
    scene.add(new THREE.AmbientLight(0x40342c, 0.85));
    const fill = new THREE.DirectionalLight(0xa9bfa0, 0.35);
    fill.position.set(-3, 4, 5);
    scene.add(fill);

    return { vessel, emberMat, kilnLight, tmp: new THREE.Color() };
  },

  pose({ vessel, emberMat, kilnLight, tmp }, { p, t }) {
    // The firing schedule: a long ramp up, a soak at peak, a slower cool.
    const ramp = easeInOut(act(p, 0.06, 0.62));
    const cool = easeInOut(act(p, 0.72, 1.0));
    const heat = clamp01(ramp - cool * 0.92);

    vessel.material.emissive.copy(blackbody(heat, tmp));
    vessel.material.emissiveIntensity = heat * 1.05;

    // Damp clay -> bisque -> vitrified celadon glaze on the way down.
    const glaze = easeInOut(act(p, 0.74, 1.0));
    vessel.material.color.setRGB(
      0.42 - glaze * 0.24,
      0.33 + glaze * 0.16,
      0.27 + glaze * 0.14,
    );
    vessel.material.roughness = 0.92 - glaze * 0.62;   // glaze turns to glass

    kilnLight.intensity = heat * 26;
    emberMat.uniforms.uHeat.value = heat;
    emberMat.uniforms.uTime.value = t;

    // Still turning on the wheel, slowing as the piece sets.
    vessel.rotation.y = t * 0.22 * (1 - p * 0.6) + p * 1.4;
    vessel.rotation.x = 0.06;
  },
});
