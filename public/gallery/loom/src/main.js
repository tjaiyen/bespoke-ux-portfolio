/**
 * LOOM — "Pick by Pick". The 4th dimension is CONSTRUCTION TIME.
 *
 * Scrolling throws the shuttle. The warp is dressed first — vertical threads under
 * tension, nothing but potential — and then the weft is laid in ONE PICK AT A
 * TIME, bottom to bottom, each pass alternating over and under the warp exactly
 * as a plain weave does. You watch cloth come into existence rather than watching
 * finished cloth wave about.
 *
 * Once a region is woven it stops behaving like loose thread and starts behaving
 * like fabric: the drape ripple only applies where cloth actually exists.
 */
import * as THREE from "../../_vendor/three.module.js";
import { createStage, clamp01 } from "./stage.js";

const WARPS = 46;   // vertical threads
const PICKS = 40;   // horizontal passes of the shuttle
const W = 4.6, H = 4.0;

createStage({
  stillAt: 0.72,
  build({ rig, scene }) {
    // The loom gets its OWN group. Rotating `rig` directly (e.g. via
    // `warp.parent.rotation`) would silently overwrite the runtime's pointer/tilt
    // parallax, which is applied to the rig immediately before pose() runs.
    const loom = new THREE.Group();
    rig.add(loom);

    // Warp: dressed up front, always present, under tension.
    const warp = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.028, H, 0.028),
      new THREE.MeshStandardMaterial({ color: 0xd9cdb8, roughness: 0.85 }),
      WARPS,
    );
    warp.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    loom.add(warp);

    // Weft: laid in progressively, alternating indigo and madder.
    const weft = new THREE.InstancedMesh(
      new THREE.BoxGeometry(W, 0.03, 0.03),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }),
      PICKS,
    );
    weft.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    weft.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(PICKS * 3), 3);
    loom.add(weft);

    // The shuttle itself — it should be visible doing the work.
    const shuttle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.42, 8),
      new THREE.MeshStandardMaterial({ color: 0x2f4b8f, roughness: 0.5 }),
    );
    shuttle.rotation.z = Math.PI / 2;
    loom.add(shuttle);

    scene.add(new THREE.AmbientLight(0xfff6e8, 1.7));
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(2, 4, 5);
    scene.add(key);

    const indigo = new THREE.Color(0x2f4b8f);
    const madder = new THREE.Color(0xa63f35);
    const linen = new THREE.Color(0xcfc0a6);

    return { loom, warp, weft, shuttle, indigo, madder, linen, m: new THREE.Matrix4(), v: new THREE.Vector3(), q: new THREE.Quaternion(), e: new THREE.Euler(), s: new THREE.Vector3(1, 1, 1), c: new THREE.Color() };
  },

  pose(w, { p, t }) {
    const { loom, warp, weft, shuttle, indigo, madder, linen, m, v, q, e, s, c } = w;

    // How much cloth exists yet.
    const woven = clamp01((p - 0.04) / 0.82) * PICKS;

    for (let i = 0; i < WARPS; i++) {
      const x = (i / (WARPS - 1) - 0.5) * W;
      // Warp is pulled taut; unwoven warp above the cloth line sways free.
      const clothTop = -H / 2 + (woven / PICKS) * H;
      const free = clamp01((0 - clothTop) * 0.4 + 0.2);
      v.set(x, 0, Math.sin(i * 0.9 + t * 0.5) * 0.02 * free);
      e.set(0, 0, Math.sin(i * 0.7 + t * 0.4) * 0.008 * free);
      q.setFromEuler(e);
      m.compose(v, q, s);
      warp.setMatrixAt(i, m);
    }
    warp.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < PICKS; i++) {
      const laid = clamp01(woven - i);          // 0 = not yet thrown, 1 = seated
      const y = -H / 2 + (i / (PICKS - 1)) * H;
      // A pick drops into the fell of the cloth as it is beaten in.
      const drop = (1 - laid) * 0.5;
      // Plain weave: alternate passes ride in front of / behind the warp.
      const z = (i % 2 === 0 ? 0.032 : -0.032) * laid;
      // Cloth that exists drapes; thread that does not exist yet cannot.
      const drape = Math.sin(i * 0.5 + t * 0.7) * 0.03 * laid;

      v.set(0, y + drop, z + drape);
      s.set(laid, 1, 1);                        // the shuttle draws it across
      e.set(0, 0, 0);
      q.setFromEuler(e);
      m.compose(v, q, s);
      weft.setMatrixAt(i, m);

      c.copy(i % 7 === 0 ? madder : i % 3 === 0 ? indigo : linen).multiplyScalar(0.55 + laid * 0.45);
      weft.instanceColor.setXYZ(i, c.r, c.g, c.b);
    }
    weft.instanceMatrix.needsUpdate = true;
    weft.instanceColor.needsUpdate = true;

    // The shuttle rides the pick currently being thrown.
    const active = Math.min(PICKS - 1, Math.floor(woven));
    const frac = woven - active;
    shuttle.position.set((frac - 0.5) * W, -H / 2 + (active / (PICKS - 1)) * H, 0.09);
    shuttle.visible = woven > 0 && woven < PICKS;

    loom.rotation.y = -0.32 + Math.sin(t * 0.12) * 0.06 + p * 0.5;
    loom.rotation.x = 0.12;
  },
});
