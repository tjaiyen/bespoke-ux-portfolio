/**
 * Readable text inside a stage4d canvas — axis ticks, legends, live numeric
 * readouts — for the instrument templates.
 *
 * WHY THIS EXISTS: the first twenty scenes render natural phenomena and need no
 * legible type. The command-center batch plots real cost data, so a cost
 * accountant has to be able to READ the axes. Five scenes need that, so it is
 * extracted once rather than copied five times (same reasoning as _serve.mjs).
 *
 * HOW: one 2D canvas is rasterised ONCE in build() into a texture atlas, and every
 * label is an instance of a single quad indexed into that atlas by a per-instance
 * UV rect. One draw call, one texture upload, zero per-frame allocation.
 *
 *   - No font file and no network: the atlas is drawn with the same system-font
 *     rasteriser that renders the page's own copy, exactly as ligature discovers
 *     its letterforms. The CSP is `default-src 'self'` and stays satisfied.
 *   - NOT THREE.Sprite: a Sprite is its own draw call, which would throw away the
 *     entire point of the atlas at ~25 labels per scene.
 *   - Rasterised at 2x the worst-case device size, once. The renderer clamps DPR
 *     to 2, so a tick label that is ~60x15 CSS px needs ~256x64 texels to stay
 *     crisp instead of mushy. It is never re-rasterised on resize.
 *   - Billboarded TOWARD THE CAMERA: the runtime writes rig.rotation every frame
 *     for pointer/tilt parallax, and a world-space label would keystone and smear.
 *     Each frame the quads take `inverse(meshWorldRotation) * cameraWorldRotation`,
 *     so the instrument tilts underneath while the numbers stay square to the
 *     viewer, like a HUD. Cancelling only the parent's rotation is NOT enough — it
 *     leaves the labels facing world -Z, which is correct only while the camera
 *     happens to look down that axis and skews visibly the moment it does not.
 *
 * ACCESSIBILITY — READ THIS BEFORE USING IT. The gate requires every <canvas> to
 * be aria-hidden (packages/audit/src/axe.ts:245), so text drawn here is INVISIBLE
 * to assistive tech. Anything rendered through this module is decoration over data
 * that must ALSO exist in the DOM. The act chips cannot carry it — they sit inside
 * `<div class="stage" aria-hidden="true">` — so the figures belong in the hero
 * `sub` or the `features[].p` copy, which are the only carriers that are both
 * visible and exposed.
 */
import * as THREE from "../../_vendor/three.module.js";

const ATLAS_W = 1024;
const ATLAS_H = 512;
/** Texel height per rasterised label — 2x the worst-case device size of a tick. */
const CELL_H = 64;
const PAD = 4;

/**
 * Rasterise a list of strings into one atlas.
 * Returns { texture, rects } where rects[i] = [u0, v0, du, dv] and aspect[i] is
 * the label's width/height, so a caller can size each quad without distortion.
 */
function buildAtlas(strings, { color = "#ffffff", weight = 600, family = 'ui-sans-serif, system-ui, "Helvetica Neue", Helvetica, Arial, sans-serif' } = {}) {
  const c = document.createElement("canvas");
  c.width = ATLAS_W;
  c.height = ATLAS_H;
  const g = c.getContext("2d");
  g.clearRect(0, 0, ATLAS_W, ATLAS_H);
  const px = Math.round(CELL_H * 0.62);
  g.font = `${weight} ${px}px ${family}`;
  g.textBaseline = "middle";
  g.fillStyle = color;

  const rects = [];
  const aspect = [];
  let x = PAD;
  let y = PAD;
  for (const s of strings) {
    const w = Math.ceil(g.measureText(s).width) + PAD * 2;
    // A label wider than the atlas can never fit on any row. Without this the
    // wrap below silently draws it clipped and emits a UV rect with du > 1, which
    // samples wrapped texels — a font substitution on another platform is enough
    // to trigger it, so it fails loudly instead.
    if (w > ATLAS_W - PAD * 2) {
      throw new Error(`_labels: "${s}" is ${w}px wide, wider than the ${ATLAS_W}px atlas — shorten it or lower CELL_H`);
    }
    if (x + w > ATLAS_W) { x = PAD; y += CELL_H; }
    if (y + CELL_H > ATLAS_H) {
      throw new Error(`_labels: atlas overflow at "${s}" — ${strings.length} labels exceed ${ATLAS_W}x${ATLAS_H}`);
    }
    g.fillText(s, x + PAD, y + CELL_H / 2);
    rects.push([x / ATLAS_W, 1 - (y + CELL_H) / ATLAS_H, w / ATLAS_W, CELL_H / ATLAS_H]);
    aspect.push(w / CELL_H);
    x += w + PAD;
  }

  const texture = new THREE.CanvasTexture(c);
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return { texture, rects, aspect };
}

/**
 * A billboarded label layer.
 *
 * @param strings  every label the scene can ever show, in a fixed order. Live
 *                 readouts should enumerate their glyph set (e.g. "0".."9", ".",
 *                 ":", "$") and be composed from single-glyph instances.
 * @param opts.count  instance budget; defaults to strings.length. Give a larger
 *                    budget when composing multi-glyph readouts.
 * @returns { mesh, set, hide, count, aspect, update }
 *   set(i, labelIndex, x, y, z, height, opacity) places instance i.
 *   update() must be called once per frame AFTER placing, from pose().
 */
export function createLabels(strings, opts = {}) {
  const { color, weight, family, opacity = 1, withGlyphs = false } = opts;
  // With `withGlyphs`, the digit set is appended to the atlas so live readouts can
  // be composed glyph by glyph from the SAME texture — a changing number must not
  // mean re-rasterising, which would be a per-frame upload.
  const all = withGlyphs ? [...strings, ...GLYPHS] : strings;
  const glyphBase = strings.length;
  const count = opts.count ?? all.length;
  const { texture, rects, aspect } = buildAtlas(all, { color, weight, family });

  const geo = new THREE.InstancedBufferGeometry();
  const base = new THREE.PlaneGeometry(1, 1);
  geo.index = base.index;
  geo.attributes.position = base.attributes.position;
  geo.attributes.uv = base.attributes.uv;
  geo.instanceCount = count;

  const uvRect = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4);
  const offset = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
  const scale = new THREE.InstancedBufferAttribute(new Float32Array(count * 2), 2);
  const alpha = new THREE.InstancedBufferAttribute(new Float32Array(count), 1);
  for (const a of [uvRect, offset, scale, alpha]) a.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute("aUvRect", uvRect);
  geo.setAttribute("aOffset", offset);
  geo.setAttribute("aScale", scale);
  geo.setAttribute("aAlpha", alpha);

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uMap: { value: texture }, uBillboard: { value: new THREE.Matrix3() }, uOpacity: { value: opacity } },
    vertexShader: `
      attribute vec4 aUvRect;
      attribute vec3 aOffset;
      attribute vec2 aScale;
      attribute float aAlpha;
      uniform mat3 uBillboard;
      varying vec2 vUv;
      varying float vAlpha;
      void main() {
        vUv = aUvRect.xy + uv * aUvRect.zw;
        vAlpha = aAlpha;
        // Billboard: counter-rotate the quad by the inverse of the parent's world
        // rotation so the label stays square to the viewer while the instrument
        // tilts under it. Scaling happens in the quad's own plane, before rotating.
        vec3 local = uBillboard * vec3(position.x * aScale.x, position.y * aScale.y, 0.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(aOffset + local, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform sampler2D uMap;
      uniform float uOpacity;
      varying vec2 vUv;
      varying float vAlpha;
      void main() {
        vec4 t = texture2D(uMap, vUv);
        if (t.a < 0.02) discard;
        gl_FragColor = vec4(t.rgb, t.a * vAlpha * uOpacity);
      }
    `,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;   // instances are placed in the shader
  mesh.renderOrder = 10;        // labels read on top of the instrument

  // Pre-allocated: nothing below is constructed per frame. `decompose` needs
  // somewhere to put the position and scale it extracts even though only the
  // rotation is wanted, so those two scratch vectors exist purely to be discarded.
  const q = new THREE.Quaternion();
  const qc = new THREE.Quaternion();
  const m4 = new THREE.Matrix4();
  const m3 = new THREE.Matrix3();
  const junkPos = new THREE.Vector3();
  const junkScale = new THREE.Vector3();
  // Hoisted: `for (const a of [uvRect, …])` inside update() allocated an array and
  // an iterator every frame, in every scene using this module.
  const ATTRS = [uvRect, offset, scale, alpha];

  return {
    mesh,
    count,
    aspect,
    /** Place instance `i` showing `strings[labelIndex]`, centred at (x,y,z). */
    set(i, labelIndex, x, y, z, height, a = 1) {
      const r = rects[labelIndex];
      uvRect.setXYZW(i, r[0], r[1], r[2], r[3]);
      offset.setXYZ(i, x, y, z);
      scale.setXY(i, height * aspect[labelIndex], height);
      alpha.setX(i, a);
    },
    /** Park an unused instance so it draws nothing. */
    hide(i) {
      scale.setXY(i, 0, 0);
      alpha.setX(i, 0);
    },
    /**
     * Compose a live readout from single glyphs, left-aligned at x. Requires
     * `withGlyphs`. Returns the next free instance index, so a caller can lay out
     * several readouts and then `hide()` whatever budget it did not use.
     */
    write(i, text, x, y, z, height, a = 1) {
      let cursor = x;
      // Indexed, not `for..of`: a string iterator is an allocation, and this runs
      // every frame. Silently overrunning `count` would be worse than truncating —
      // the writes vanish into a typed array AND the caller's hide() sweep never
      // reaches the tail — so the budget is enforced here.
      for (let k = 0; k < text.length; k++) {
        if (i >= count) {
          throw new Error(`_labels: readout "${text}" overruns the instance budget (${count}) — raise it`);
        }
        const gi = GLYPHS.indexOf(text[k]);
        if (gi < 0) { cursor += height * 0.3; continue; }   // unknown char = a space
        const li = glyphBase + gi;
        const w = height * aspect[li];
        this.set(i++, li, cursor + w / 2, y, z, height, a);
        cursor += w * 0.92;   // glyph cells carry side padding; tighten it slightly
      }
      return i;
    },
    /**
     * Call once per frame from pose(), after placing. `camera` comes from the
     * build() context — without it the labels can only face world -Z.
     */
    update(camera) {
      mesh.updateWorldMatrix(true, false);
      // Undo the parent's world rotation, then adopt the camera's: the result is a
      // quad square to the viewer no matter how the rig is tilted or where the
      // camera sits. matrixWorld would otherwise be a frame stale, which the
      // 5%/frame parallax lerp hides, but updating explicitly keeps it exact.
      mesh.matrixWorld.decompose(junkPos, q, junkScale);
      q.invert();
      if (camera) { camera.getWorldQuaternion(qc); q.multiply(qc); }
      m4.makeRotationFromQuaternion(q);
      m3.setFromMatrix4(m4);
      mat.uniforms.uBillboard.value.copy(m3);
      for (let k = 0; k < ATTRS.length; k++) ATTRS[k].needsUpdate = true;
    },
  };
}

/** Digits and punctuation a live numeric readout needs, in a fixed order. */
export const GLYPHS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", ".", ",", ":", "$", "%", "×", "−", "/"];
