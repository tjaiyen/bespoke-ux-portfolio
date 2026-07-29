/**
 * LIGATURE — "The Setting". The 4th dimension is TYPOGRAPHIC ASSEMBLY TIME.
 *
 * A thousand loose glyphs drift in space; scrolling draws them together until
 * they resolve into one enormous letterform, hold, and then scatter into the next
 * letter. Type building itself out of type.
 *
 * The unconventional part: there is no font file and no text geometry. The target
 * letterform is discovered at runtime by rendering a glyph to an offscreen 2D
 * canvas, reading its pixels, and sampling the opaque ones as target positions —
 * so the shape is real type, rendered by the same rasteriser that will render the
 * page's own copy, with zero bytes of external asset and nothing to violate the
 * self-contained CSP.
 */
import * as THREE from "../../_vendor/three.module.js";
import { createStage, clamp01, act, easeInOut } from "./stage.js";

const COUNT = 1400;
const LETTERS = ["A", "&", "g"];

/** Sample the opaque pixels of a rasterised glyph into normalised XY targets. */
function glyphPoints(ch, count) {
  const S = 128;
  const c = document.createElement("canvas");
  c.width = S; c.height = S;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.fillStyle = "#000"; g.fillRect(0, 0, S, S);
  g.fillStyle = "#fff";
  g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `700 ${Math.round(S * 0.86)}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  g.fillText(ch, S / 2, S / 2 + S * 0.03);
  const d = g.getImageData(0, 0, S, S).data;

  const hits = [];
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (d[(y * S + x) * 4] > 128) hits.push([x, y]);
    }
  }
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const [x, y] = hits.length ? hits[(Math.random() * hits.length) | 0] : [S / 2, S / 2];
    out[i * 3] = (x / S - 0.5) * 5.2;
    out[i * 3 + 1] = -(y / S - 0.5) * 5.2;
    out[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
  }
  return out;
}

createStage({
  stillAt: 0.45,
  background: null,
  build({ rig }) {
    const targets = LETTERS.map((ch) => glyphPoints(ch, COUNT));

    const scatter = new Float32Array(COUNT * 3);
    const seed = new Float32Array(COUNT);
    const rot = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      scatter[i * 3] = (Math.random() - 0.5) * 13;
      scatter[i * 3 + 1] = (Math.random() - 0.5) * 9;
      scatter[i * 3 + 2] = (Math.random() - 0.5) * 4;
      seed[i] = Math.random();
      rot[i] = Math.random() * Math.PI;
    }

    // Each "glyph" is a small quad; instancing keeps 1,400 of them cheap.
    const inst = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(0.115, 0.155),
      new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
      COUNT,
    );
    inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    rig.add(inst);

    // One red accent glyph per composition — the foundry's signal colour.
    const accents = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(0.115, 0.155),
      new THREE.MeshBasicMaterial({ color: 0xd81e34, transparent: true, opacity: 0.95, side: THREE.DoubleSide }),
      90,
    );
    accents.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    rig.add(accents);

    return { inst, accents, targets, scatter, seed, rot, m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), v: new THREE.Vector3(), s: new THREE.Vector3(1, 1, 1) };
  },

  pose(w, { p, t }) {
    const { inst, accents, targets, scatter, seed, rot, m, q, e, v, s } = w;

    // Three compositions across the scroll: assemble, hold, dissolve, re-form.
    const stage = clamp01(p * 2.35);
    const which = Math.min(LETTERS.length - 1, Math.floor(stage));
    const local = stage - which;
    // Assemble in the first 45% of each act, hold, then loosen before the next.
    const gather = easeInOut(clamp01(local / 0.45)) * (1 - easeInOut(clamp01((local - 0.82) / 0.18)));

    const target = targets[which];

    for (let i = 0; i < COUNT; i++) {
      const sd = seed[i];
      const drift = (1 - gather);
      v.set(
        scatter[i * 3] * drift + target[i * 3] * gather + Math.sin(t * 0.5 + sd * 20) * 0.06 * drift,
        scatter[i * 3 + 1] * drift + target[i * 3 + 1] * gather + Math.cos(t * 0.45 + sd * 17) * 0.06 * drift,
        scatter[i * 3 + 2] * drift + target[i * 3 + 2] * gather,
      );
      // Loose glyphs tumble; set glyphs snap upright — the moment of resolution.
      e.set(0, 0, rot[i] * (1 - gather) + Math.sin(t * 0.3 + sd * 12) * 0.5 * (1 - gather));
      q.setFromEuler(e);
      const sc = 0.55 + gather * 0.65;
      s.set(sc, sc, sc);
      m.compose(v, q, s);
      inst.setMatrixAt(i, m);

      if (i < 90) {
        const j = (i * 15 + 7) % COUNT;
        v.set(
          scatter[j * 3] * drift + target[j * 3] * gather,
          scatter[j * 3 + 1] * drift + target[j * 3 + 1] * gather,
          (scatter[j * 3 + 2] * drift + target[j * 3 + 2] * gather) + 0.06,
        );
        m.compose(v, q, s);
        accents.setMatrixAt(i, m);
      }
    }
    inst.instanceMatrix.needsUpdate = true;
    accents.instanceMatrix.needsUpdate = true;

    inst.parent.rotation.z = Math.sin(t * 0.1) * 0.01;
  },
});
