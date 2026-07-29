/**
 * CALDERA — "The Cooling Front". The 4th dimension is SOLIDIFICATION TIME.
 *
 * Scrolling cools a lava lake. ~250 hexagonal columns are packed on a real hex
 * lattice; each begins as a flat, glowing pool of melt and RISES into a jointed
 * basalt column as the cooling front reaches it. Columnar jointing is what actually
 * happens when basalt contracts as it cools — it cracks into hexagons and the
 * cracks propagate down into the flow, which is why the Giant's Causeway looks
 * built.
 *
 * The front radiates outward from the centre, so the field solidifies as a visible
 * wave rather than all at once, and each column breaks at its own height.
 *
 * Deliberately instanced geometry rather than bedrock's flat strata shader: this
 * story is about rock acquiring STRUCTURE, which a shader plane cannot show.
 */
import * as THREE from "../../_vendor/three.module.js";
import { createStage, clamp01, mix } from "./stage.js";

createStage({
  stillAt: 0.68,
  cameraFor: (narrow) => ({ pos: [0, narrow ? 2.6 : 2.2, narrow ? 12 : 9.2], look: [0, -0.6, 0] }),
  build({ rig, scene }) {
    // Its own group — rotating `rig` would overwrite the runtime's parallax.
    const field = new THREE.Group();
    rig.add(field);

    const W = 0.46;             // column across-flats spacing
    const H = W * 0.866;        // hex row pitch
    const R = 9;
    const cols = [];
    let maxR = 0.001;
    for (let q = -R; q <= R; q++) {
      for (let r = -R; r <= R; r++) {
        const x = (q + r / 2) * W;
        const z = r * H;
        const d = Math.hypot(x, z);
        if (d > R * W * 0.92) continue;
        maxR = Math.max(maxR, d);
        cols.push({ x, z, d, seed: Math.random() });
      }
    }
    // Cooling front radiates from the centre outward.
    for (const c of cols) c.born = c.d / maxR;

    const rock = new THREE.InstancedMesh(
      // 6 radial segments = a hexagonal prism. Flat-shaded so each face catches
      // the light separately and the jointing reads.
      new THREE.CylinderGeometry(W * 0.5, W * 0.5, 1, 6, 1, false),
      new THREE.MeshStandardMaterial({ roughness: 0.88, metalness: 0.04, flatShading: true }),
      cols.length,
    );
    rock.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    field.add(rock);

    // Embers riding the still-molten surface — this is what supplies the heat
    // glow, since emissive cannot vary per instance on a shared material.
    const EN = 700;
    const ep = new Float32Array(EN * 3);
    const es = new Float32Array(EN);
    for (let i = 0; i < EN; i++) {
      const a = Math.random() * Math.PI * 2;
      const rr = Math.sqrt(Math.random()) * maxR;
      ep[i * 3] = Math.cos(a) * rr;
      // Seeded ON the lava surface. The columns' bases are pinned at y=-2.2, so
      // seeding at 0 left the brightest embers floating in a detached band two
      // units above the pool — most visible at p=0, dead centre of frame.
      ep[i * 3 + 1] = -2.2;
      ep[i * 3 + 2] = Math.sin(a) * rr;
      es[i] = Math.random();
    }
    const egeo = new THREE.BufferGeometry();
    egeo.setAttribute("position", new THREE.BufferAttribute(ep, 3));
    egeo.setAttribute("aSeed", new THREE.BufferAttribute(es, 1));
    const emat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uP: { value: 0 }, uTime: { value: 0 } },
      vertexShader: `
        attribute float aSeed;
        uniform float uP, uTime;
        varying float vA;
        void main() {
          float s = aSeed * 6.2831853;
          // Embers only survive over rock that has not yet set.
          float here = length(position.xz) / ${maxR.toFixed(4)};
          float solid = smoothstep(0.0, 0.55, uP * 1.5 - here * 0.9);
          float rise = fract(aSeed + uTime * 0.09);
          vec3 pos = position;
          pos.y += rise * 2.6;
          pos.x += sin(uTime * 0.5 + s) * 0.25 * rise;
          pos.z += cos(uTime * 0.42 + s) * 0.25 * rise;
          vA = (1.0 - solid) * (1.0 - rise) * 0.9;
          vec4 mv = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = (2.0 + aSeed * 5.0) * (1.0 / -mv.z) * 8.0;
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
          gl_FragColor = vec4(vec3(1.0, 0.52, 0.16) * core, core * vA * 0.55);
        }
      `,
    });
    const embers = new THREE.Points(egeo, emat);
    field.add(embers);

    scene.add(new THREE.AmbientLight(0xffddbb, 0.9));
    const key = new THREE.DirectionalLight(0xfff0dd, 2.0);
    key.position.set(4, 7, 3);
    scene.add(key);
    // A low warm light from inside the field, so molten rock reads lit from below.
    const heat = new THREE.PointLight(0xff6a1a, 6, 14, 2);
    heat.position.set(0, -0.4, 0);
    scene.add(heat);

    return {
      field, rock, embers, emat, cols, heat, maxR,
      m: new THREE.Matrix4(), v: new THREE.Vector3(), s: new THREE.Vector3(),
      q: new THREE.Quaternion(), c: new THREE.Color(),
    };
  },

  pose(w, { p, t }) {
    const { field, rock, emat, cols, heat, m, v, s, q, c } = w;
    emat.uniforms.uP.value = p;
    emat.uniforms.uTime.value = t;

    for (let i = 0; i < cols.length; i++) {
      const col = cols[i];
      // The cooling front sweeps outward; each column then sets over its own window.
      const solid = clamp01((p * 1.5 - col.born * 0.9) / 0.55);
      // Molten rock is a flat pool; solid rock stands up. Break height varies —
      // real colonnades are never level across the top.
      const full = 1.5 + col.seed * 1.9;
      const h = mix(0.08, full, solid);
      // Melt still churns; set rock does not move at all.
      const churn = (1 - solid) * Math.sin(t * 1.3 + col.seed * 9 + col.d * 2.2) * 0.06;

      s.set(1, h, 1);
      v.set(col.x, -2.2 + h * 0.5 + churn, col.z);
      q.identity();
      m.compose(v, q, s);
      rock.setMatrixAt(i, m);

      // Molten orange → obsidian. Cooling runs through a dull red first, the way
      // basalt actually loses its glow, rather than fading straight to black.
      const molten = c.setRGB(1.0, 0.38, 0.08);
      if (solid < 0.5) molten.setRGB(1.0, mix(0.38, 0.16, solid * 2), mix(0.08, 0.05, solid * 2));
      else {
        const k = (solid - 0.5) * 2;
        molten.setRGB(mix(1.0, 0.13, k), mix(0.16, 0.12, k), mix(0.05, 0.12, k));
      }
      rock.setColorAt(i, molten);
    }
    rock.instanceMatrix.needsUpdate = true;
    if (rock.instanceColor) rock.instanceColor.needsUpdate = true;

    // The heat dies with the field.
    heat.intensity = 6 * (1 - clamp01(p * 1.35));
    field.rotation.y = -0.35 + Math.sin(t * 0.07) * 0.05 + p * 0.42;
  },
});
