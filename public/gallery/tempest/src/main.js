/**
 * TEMPEST — "Charge and Discharge". The 4th dimension is STORM TIME, and it runs
 * at two wildly different rates in the same scroll.
 *
 * Act one takes most of the page: a charged cloud mass slowly builds turbulence and
 * potential, brightening as separation increases. Act two takes a fraction of it —
 * at a threshold the stepped leader finds ground and a fractal bolt propagates down
 * the whole canvas in a few frames, then flickers and holds. Nine hours of outage
 * and forty microseconds of discharge, on one timeline.
 *
 * This is the deliberate INVERSE of grove: the same recursive branch generator, run
 * once over twenty years of growth there, and here over an instant. The recursion
 * runs ONCE in build() and the bolt is only REVEALED in pose() — regenerating a
 * fractal every frame would allocate in the hot path and flicker randomly rather
 * than deliberately.
 */
import * as THREE from "../../_vendor/three.module.js";
import { createStage, clamp01, mix } from "./stage.js";

const TRIGGER = 0.76;   // inside the second interlude band, where no panel overlaps
const CN = 4200;

createStage({
  stillAt: 0.84,        // the still frame every reduced-motion visitor gets IS the strike
  build({ rig, scene }) {
    const storm = new THREE.Group();
    rig.add(storm);

    /* ---------- the cloud: a charged, turbulent mass ---------- */
    const cp = new Float32Array(CN * 3);
    const cs = new Float32Array(CN);
    for (let i = 0; i < CN; i++) {
      // Flattened ellipsoid — cloud base is far wider than it is deep.
      const a = Math.random() * Math.PI * 2;
      const r = Math.pow(Math.random(), 0.6);
      cp[i * 3] = Math.cos(a) * r * 5.4;
      cp[i * 3 + 1] = 2.6 + (Math.random() - 0.5) * 1.7 - r * 0.5;
      cp[i * 3 + 2] = Math.sin(a) * r * 2.6;
      cs[i] = Math.random();
    }
    const cgeo = new THREE.BufferGeometry();
    cgeo.setAttribute("position", new THREE.BufferAttribute(cp, 3));
    cgeo.setAttribute("aSeed", new THREE.BufferAttribute(cs, 1));
    const cmat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uP: { value: 0 }, uTime: { value: 0 }, uFlash: { value: 0 } },
      vertexShader: `
        attribute float aSeed;
        uniform float uP, uTime, uFlash;
        varying float vCharge;
        void main() {
          float s = aSeed * 6.2831853;
          // Turbulence climbs as the cell organises.
          float energy = 0.25 + uP * 1.1;
          vec3 pos = position + vec3(
            sin(uTime * 0.5 + s) * 0.5,
            cos(uTime * 0.37 + s * 1.6) * 0.3,
            sin(uTime * 0.44 + s * 2.2) * 0.4
          ) * energy;
          // Charge collects in pockets rather than evenly through the cloud.
          vCharge = smoothstep(0.45, 1.0, sin(s * 3.1 + uTime * 0.7) * 0.5 + 0.5) * uP + uFlash;
          vec4 mv = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = (5.0 + aSeed * 12.0) * (1.0 / -mv.z) * 8.0;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        precision highp float;
        varying float vCharge;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if (d > 0.5) discard;
          float core = smoothstep(0.5, 0.0, d);
          // Tuned up from an earlier, far darker pairing: measured against the
          // near-black ground the cloud was rendering at under 0.1% coverage, so
          // act one — the entire charge build — was invisible until the strike.
          vec3 dark = vec3(0.20, 0.23, 0.36);   // unlit storm cloud
          vec3 lit  = vec3(0.76, 0.80, 1.00);   // charged, and lit from within
          vec3 col = mix(dark, lit, clamp(vCharge, 0.0, 1.0));
          gl_FragColor = vec4(col * (0.5 + core * 0.8), core * 0.19);
        }
      `,
    });
    const cloud = new THREE.Points(cgeo, cmat);
    storm.add(cloud);

    /* ---------- the bolt: generated ONCE, revealed later ---------- */
    const segs = [];
    let maxDist = 0.001;
    const AXIS = new THREE.Vector3(0, 1, 0);
    (function step(origin, dir, len, rad, depth, dist) {
      // Segment budget: the halo pass is additive and wide, so every extra segment
      // costs real fill rate. 210 is enough for a fully jagged channel with forks.
      if (segs.length > 210 || depth > 3 || origin.y < -3.6 || len < 0.05) return;
      // A stepped leader does not travel straight — it jinks hard every step, and
      // the jink has to be large relative to the step or it reads as a rope.
      const nd = dir.clone()
        .add(new THREE.Vector3((Math.random() - 0.5) * 1.5, -Math.random() * 0.30, (Math.random() - 0.5) * 0.8))
        .normalize();
      const end = origin.clone().addScaledVector(nd, len);
      segs.push({
        pos: origin.clone().add(end).multiplyScalar(0.5),
        quat: new THREE.Quaternion().setFromUnitVectors(AXIS, nd),
        len, rad, dist,
      });
      maxDist = Math.max(maxDist, dist + len);
      // The main channel continues, tapering as it goes.
      step(end, nd, len * 0.98, rad * 0.97, depth, dist + len);
      // Forks: thinner, shorter, and mostly dying before they reach ground.
      if (Math.random() < 0.3 && depth < 3) {
        const fd = nd.clone()
          .add(new THREE.Vector3((Math.random() - 0.5) * 2.6, -0.25, (Math.random() - 0.5) * 1.4))
          .normalize();
        step(end, fd, len * 0.72, rad * 0.55, depth + 1, dist + len);
      }
    // Core radius is deliberately TINY. At 0.05 the main channel rendered as a
    // segmented grey rope with every cylinder seam visible, while the thin forks
    // off it looked like real lightning — the fix was to make the whole channel
    // as fine as those forks and let the halo carry the brightness.
    })(new THREE.Vector3(0.6, 3.1, 0.2), new THREE.Vector3(0, -1, 0), 0.32, 0.016, 0, 0);

    // Drawn in two passes: a wide soft violet halo and a thin white-hot core.
    // A single mid-brightness cylinder chain reads as a grey rope — the core/glow
    // separation is what makes it read as a discharge.
    const geom = new THREE.CylinderGeometry(1, 1, 1, 6);
    const halo = new THREE.InstancedMesh(
      geom,
      new THREE.MeshBasicMaterial({
        color: 0x7c6cff, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
      segs.length,
    );
    const bolt = new THREE.InstancedMesh(
      geom,
      new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
      segs.length,
    );
    for (const mesh of [halo, bolt]) {
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      storm.add(mesh);
    }

    // Ground return — the strike point lights the surface under the channel.
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 9),
      new THREE.MeshBasicMaterial({
        color: 0x8fa0ff, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -3.0;
    storm.add(ground);

    scene.add(new THREE.AmbientLight(0x8890c0, 0.6));

    return {
      storm, cloud, cmat, bolt, halo, segs, maxDist, ground,
      m: new THREE.Matrix4(), v: new THREE.Vector3(), s: new THREE.Vector3(),
    };
  },

  pose(w, { p, t }) {
    const { storm, cmat, bolt, halo, segs, maxDist, ground, m, v, s } = w;
    cmat.uniforms.uP.value = clamp01(p / TRIGGER);
    cmat.uniforms.uTime.value = t;

    // Before the trigger there is no bolt at all — only a cloud gaining potential.
    const fired = p >= TRIGGER;
    const since = fired ? (p - TRIGGER) / (1 - TRIGGER) : 0;
    // The leader propagates down the channel almost instantly.
    const reach = clamp01(since / 0.10) * maxDist;

    if (fired) {
      // The channel is thickest at the return stroke, then thins to an afterglow.
      const swell = mix(2.6, 1.0, clamp01(since / 0.3));
      for (let i = 0; i < segs.length; i++) {
        const sg = segs[i];
        // A segment only exists once the leader has travelled past it.
        const on = sg.dist <= reach ? 1 : 0;
        const core = sg.rad * swell * on;
        s.set(core, sg.len * on, core);
        v.copy(sg.pos);
        m.compose(v, sg.quat, s);
        bolt.setMatrixAt(i, m);
        // The halo is the same channel, several times wider.
        s.set(core * 5.0, sg.len * on, core * 5.0);
        m.compose(v, sg.quat, s);
        halo.setMatrixAt(i, m);
      }
      bolt.instanceMatrix.needsUpdate = true;
      halo.instanceMatrix.needsUpdate = true;

      // Brilliant at the strike, then a flickering afterglow that holds — a real
      // channel restrikes several times before it dies.
      const decay = mix(1, 0.55, clamp01((since - 0.1) / 0.4));
      const flicker = 0.74 + 0.26 * Math.sin(t * 47 + Math.sin(t * 13) * 3);
      bolt.material.opacity = decay * flicker;
      halo.material.opacity = 0.38 * decay * flicker;
      ground.material.opacity = 0.22 * decay * flicker;
      cmat.uniforms.uFlash.value = 0.9 * decay * flicker;
    } else {
      bolt.material.opacity = 0;
      halo.material.opacity = 0;
      ground.material.opacity = 0;
      cmat.uniforms.uFlash.value = 0;
    }

    storm.rotation.y = Math.sin(t * 0.05) * 0.08 + p * 0.2;
  },
});
