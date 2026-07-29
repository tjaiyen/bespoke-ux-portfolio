/**
 * PLY — "Forty Plies, One Cure". The 4th dimension is the LAYUP SCHEDULE.
 *
 * A quasi-isotropic skin builds one ply at a time on a mandrel, each ply laid at
 * 0, +45, -45 or 90 degrees, and the orientation is legible because every ply is
 * drawn as its own bundle of parallel fibre tows rotated to that angle. Stack them
 * and you get the woven look a real laminate has from above.
 *
 * The last third of the scroll is the autoclave: once the fortieth ply is down the
 * part goes in once, and the corner gauge runs the cure to 350F at 85 psi. Nothing
 * that went in wrong comes back out right, which is the whole cost argument.
 *
 * The mandrel is visible at p = 0 — an empty tool is the honest opening frame for a
 * layup, and a scene that starts at zero plies would simply start blank.
 */
import * as THREE from "../../_vendor/three.module.js";
import { createStage, clamp01 } from "./stage.js";
import { createLabels } from "./_labels.js";

const PLIES = 40;
const TOWS = 14;                 // fibre tows drawn per ply
const ANGLES = [0, 45, -45, 90]; // the quasi-isotropic stacking sequence
const THICK = 0.055;             // world thickness per ply
const SPAN = 2.5;
const LAYUP_END = 0.68;          // scroll fraction where the layup finishes
const CURE_F = 350;

const STATIC = [
  "QUASI-ISOTROPIC SKIN  ·  40 PLIES",
  "0°", "+45°", "−45°", "90°",
  "PLY", "AUTOCLAVE", "°F", "psi",
];
const L = Object.fromEntries(STATIC.map((s, i) => [s, i]));
const READOUT = 14;
// Hoisted out of pose().
const ANGLE_KEYS = ["0°", "+45°", "−45°", "90°"];

createStage({
  stillAt: 0.62,
  fitWidth: 6.2,   // content width incl. labels — see stage.js
  fov: 42,
  cameraFor: (narrow) => ({ pos: [narrow ? 3.6 : 4.6, 3.4, narrow ? 10.4 : 8.6], look: [0, 0.85, 0] }),
  framing: (p, narrow, w) => (narrow ? { x: 0, y: 0.3 } : { x: Math.min(1.35, w / 1150) - clamp01((p - 0.8) / 0.18) * 2.8, y: 0.15 }),
  build({ rig, scene, camera }) {
    const inner = new THREE.Group();
    rig.add(inner);

    /* ---------- the mandrel: present before anything is laid on it ---------- */
    const mandrel = new THREE.Mesh(
      new THREE.BoxGeometry(SPAN * 1.18, 0.16, SPAN * 0.78),
      new THREE.MeshStandardMaterial({ color: 0x6d6558, roughness: 0.55, metalness: 0.35 }),
    );
    mandrel.position.y = -0.1;
    inner.add(mandrel);

    /* ---------- every tow of every ply, instanced ---------- */
    const n = PLIES * TOWS;
    const aBorn = new Float32Array(n);
    const aOff = new Float32Array(n * 3);
    const aAng = new Float32Array(n);
    const aKind = new Float32Array(n);
    let k = 0;
    for (let ply = 0; ply < PLIES; ply++) {
      const angDeg = ANGLES[ply % ANGLES.length];
      const ang = (angDeg * Math.PI) / 180;
      for (let tow = 0; tow < TOWS; tow++) {
        const across = (tow / (TOWS - 1) - 0.5) * SPAN * 0.92;
        aBorn[k] = ply / PLIES;
        // Lay the tow across the ply's own axis, then rotate the whole ply.
        aOff[k * 3] = -Math.sin(ang) * across;
        aOff[k * 3 + 1] = ply * THICK;
        aOff[k * 3 + 2] = Math.cos(ang) * across;
        aAng[k] = ang;
        aKind[k] = ply % ANGLES.length;
        k++;
      }
    }
    const towGeo = new THREE.BoxGeometry(SPAN * 1.02, THICK * 0.82, SPAN / TOWS * 0.72);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = towGeo.index;
    geo.attributes.position = towGeo.attributes.position;
    geo.attributes.normal = towGeo.attributes.normal;
    geo.instanceCount = n;
    geo.setAttribute("aBorn", new THREE.InstancedBufferAttribute(aBorn, 1));
    geo.setAttribute("aOff", new THREE.InstancedBufferAttribute(aOff, 3));
    geo.setAttribute("aAng", new THREE.InstancedBufferAttribute(aAng, 1));
    geo.setAttribute("aKind", new THREE.InstancedBufferAttribute(aKind, 1));

    const tows = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      transparent: true,
      uniforms: { uFront: { value: 0 }, uCure: { value: 0 } },
      vertexShader: `
        attribute float aBorn;
        attribute vec3 aOff;
        attribute float aAng;
        attribute float aKind;
        uniform float uFront, uCure;
        varying float vKind;
        varying float vLit;
        varying float vA;
        void main() {
          float g = clamp((uFront - aBorn) / 0.035, 0.0, 1.0);
          vA = g;
          vKind = aKind;
          vLit = 0.55 + max(normal.y, 0.0) * 0.45;
          vec3 p = position * g;
          float c = cos(aAng), s = sin(aAng);
          vec3 r = vec3(p.x * c - p.z * s, p.y, p.x * s + p.z * c);
          // Cure consolidates the stack: the laminate compacts under pressure.
          vec3 o = aOff;
          o.y *= 1.0 - uCure * 0.16;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(r + o, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying float vKind;
        varying float vLit;
        varying float vA;
        uniform float uCure;
        void main() {
          if (vA < 0.02) discard;
          // Each orientation reads as its own tone, so the stacking sequence is
          // legible from above rather than being forty identical grey sheets.
          vec3 c0 = vec3(0.16, 0.17, 0.19);
          vec3 c1 = vec3(0.40, 0.33, 0.20);
          vec3 c2 = vec3(0.26, 0.30, 0.30);
          vec3 c3 = vec3(0.52, 0.44, 0.26);
          vec3 col = c0;
          col = mix(col, c1, step(0.5, vKind) * step(vKind, 1.5));
          col = mix(col, c2, step(1.5, vKind) * step(vKind, 2.5));
          col = mix(col, c3, step(2.5, vKind));
          // Resin flows and the laminate darkens and gains gloss in the autoclave.
          col = mix(col, col * 0.72 + vec3(0.05, 0.03, 0.01), uCure);
          gl_FragColor = vec4(col * vLit, vA);
        }
      `,
    }));
    tows.frustumCulled = false;
    inner.add(tows);

    /* ---------- the cure gauge, demoted to a corner ---------- */
    const gauge = new THREE.Group();
    gauge.position.set(2.15, 1.45, 0);
    inner.add(gauge);
    const track = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 1.5, 0.06),
      new THREE.MeshBasicMaterial({ color: 0x9d9384, transparent: true, opacity: 0.5 }),
    );
    gauge.add(track);
    const fill = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 1, 0.1),
      new THREE.MeshBasicMaterial({ color: 0xb3421c }),
    );
    gauge.add(fill);

    scene.add(new THREE.AmbientLight(0xfff6e8, 2.0));
    const sun = new THREE.DirectionalLight(0xffffff, 1.5);
    sun.position.set(-3, 6, 4);
    scene.add(sun);

    const labels = createLabels(STATIC, { withGlyphs: true, color: "#211f1b", count: STATIC.length + READOUT });
    inner.add(labels.mesh);

    return { inner, tows, fill, labels, camera };
  },

  pose({ inner, tows, fill, labels, camera }, { p, t }) {
    // Act one lays the plies; act two closes the autoclave.
    const front = clamp01(p / LAYUP_END) * 1.02;
    const cure = clamp01((p - LAYUP_END) / (1 - LAYUP_END));
    tows.material.uniforms.uFront.value = front;
    tows.material.uniforms.uCure.value = cure;

    // Cure profile: ramp, hold, and the temperature the resin actually needs.
    const tempF = 70 + (CURE_F - 70) * clamp01(cure * 1.8);
    const psi = 85 * clamp01(cure * 2.2);
    fill.scale.y = Math.max(0.001, cure * 1.5);
    fill.position.y = -0.75 + cure * 0.75;

    const plyNo = Math.min(PLIES, Math.round(front * PLIES));
    const top = PLIES * THICK * (1 - cure * 0.16);

    inner.rotation.y = -0.2 + Math.sin(t * 0.05) * 0.05 + p * 0.28;   // before update(): the billboard reads this rotation
    let i = 0;
    const put = (key, x, y, z, h, a = 1) => labels.set(i++, L[key], x, y, z, h, a);

    put("QUASI-ISOTROPIC SKIN  ·  40 PLIES", 0.05, top + 1.32, 0, 0.135);

    // The stacking sequence, as a key beside the laminate.
    for (let a = 0; a < 4; a++) {
      put(ANGLE_KEYS[a], -2.55, top + 0.92 - a * 0.24, 0, 0.12, 0.55 + (plyNo % 4 === a ? 0.45 : 0));
    }

    put("PLY", 1.25, top + 0.95, 0, 0.11, 0.7);
    i = labels.write(i, `${plyNo}`, 1.25, top + 0.66, 0, 0.24);

    // Corner gauge readout — only meaningful once the part is in the autoclave.
    const ca = clamp01(cure * 4);
    put("AUTOCLAVE", 2.15, 2.44, 0, 0.11, 0.4 + ca * 0.5);
    i = labels.write(i, `${Math.round(tempF)}`, 1.86, 2.18, 0, 0.17, 0.35 + ca * 0.65);
    put("°F", 2.46, 2.18, 0, 0.13, 0.35 + ca * 0.65);
    i = labels.write(i, `${Math.round(psi)}`, 1.86, 1.92, 0, 0.14, 0.3 + ca * 0.6);
    put("psi", 2.34, 1.92, 0, 0.11, 0.3 + ca * 0.6);
    while (i < labels.count) labels.hide(i++);
    labels.update(camera);

  },
});
