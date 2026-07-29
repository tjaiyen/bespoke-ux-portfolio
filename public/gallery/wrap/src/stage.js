/**
 * stage4d — the shared runtime behind every Blocksmith immersive template.
 *
 * THE MODEL: the canvas is a STAGE, not wallpaper. Content panels are compact and
 * offset; tall interlude bands carry no body text at all; and TIME is the authored
 * fourth dimension — scroll position IS the timeline, so the visitor advances the
 * scene themselves rather than watching a loop.
 *
 * What this runtime owns (so a scene file only describes its own world):
 *   - sizing / DPR clamping / resize
 *   - scroll progress → damped lerp, so motion glides instead of snapping
 *   - pointer + device-tilt parallax
 *   - scroll-reactive FRAMING: because the canvas is fixed its screen position is
 *     constant while the OPEN areas move as you scroll, so the rig follows the
 *     layout (phone: rides high under a bottom-docked hero, settles centre for the
 *     full-viewport interludes; desktop: sits opposite the docked panel and crosses
 *     when the panel side changes). ONE source of truth, read by both resize and
 *     frame — hard-coding it in two places is what once parked the subject dead
 *     centre on mobile, i.e. directly behind the text panel.
 *   - prefers-reduced-motion: renders exactly ONE static frame at the story's most
 *     representative moment, with NO animation loop and NO scroll/pointer/tilt
 *     listeners attached at all.
 *
 * A scene supplies: build(ctx) → world, and pose(world, s) each frame, where
 * s = { p, t, mx, my, narrow } (p = story progress 0→1, t = seconds).
 */
import * as THREE from "../../_vendor/three.module.js";

export const clamp01 = (x) => Math.min(1, Math.max(0, x));
/** Progress of one act: 0 before it starts, 1 once complete. */
export const act = (p, from, to) => clamp01((p - from) / (to - from));
export const easeInOut = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
export const mix = (a, b, k) => a + (b - a) * k;

export function createStage(opts) {
  const {
    canvas = document.getElementById("bg"),
    build,
    pose,
    /** Story moment rendered when the visitor prefers reduced motion. */
    stillAt = 0.65,
    /** Where the subject sits so it lands in OPEN space, not behind a panel. */
    framing = (p, narrow, width) => {
      // Phone: hero docks its panel at the BOTTOM, so the subject rides high to
      // fill the reserved clear band, then settles to centre for the interludes.
      if (narrow) return { x: 0, y: 2.5 - clamp01((p - 0.06) / 0.16) * 2.2 };
      // Desktop: hero and features panels dock LEFT so the subject sits right of
      // centre — but the CONTACT panel docks RIGHT. Without this cross-over the
      // subject spends the whole end of the page hidden behind that panel.
      const side = Math.min(2.6, width / 620);
      const cross = clamp01((p - 0.8) / 0.18);
      return { x: side - cross * (side * 2), y: 0.2 };
    },
    cameraFor = (narrow) => ({ pos: [0, narrow ? 0 : 0.4, narrow ? 11 : 8.4], look: [0, 0, 0] }),
    /** World-space width the scene must keep on screen, labels included.
     *  `cameraFor` is only told whether the viewport is narrow, so an authored
     *  distance is really tuned for ONE aspect ratio. A phone is about 0.46 where
     *  a laptop is 1.6, and the same distance then covers a third of the width —
     *  which is how a labelled instrument ends up cropped in half. Declare this
     *  and the camera pulls back far enough to fit at whatever the real aspect
     *  turns out to be. Scenes that render a phenomenon rather than an instrument
     *  leave it unset: cropping a plume loses nothing, cropping an axis does. */
    fitWidth = 0,
    fov = 50,
    background = null,
  } = opts;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: !background });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  if (background) scene.background = new THREE.Color(background);
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 200);
  const rig = new THREE.Group();
  scene.add(rig);

  // NOTE the <=: the generated CSS uses `@media (max-width: 720px)`, which is
  // INCLUSIVE. `< 720` would make JS pick desktop framing at exactly 720px while
  // CSS applied the mobile layout — the subject gets shoved sideways and clipped
  // by the now-full-width hero panel. The two must agree on the boundary itself.
  let narrow = window.innerWidth <= 720;
  const ctx = { THREE, scene, camera, rig, renderer, get narrow() { return narrow; } };
  const world = build(ctx);

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    narrow = w <= 720; // must match the initial value AND the CSS media query
    const cam = cameraFor(narrow);
    camera.position.set(cam.pos[0], cam.pos[1], cam.pos[2]);
    const rigScale = narrow ? 0.9 : 1;
    if (fitWidth) {
      // Push straight back along the authored view direction — never re-aim it —
      // so the composition the scene was framed for survives the fit. Only ever
      // FARTHER: at desktop aspect the authored distance already fits, so this is
      // a no-op there and the existing framing is untouched.
      const look = new THREE.Vector3(cam.look[0], cam.look[1], cam.look[2]);
      const need = ((fitWidth / 2) * rigScale) / (Math.tan((fov * Math.PI) / 360) * camera.aspect);
      const have = camera.position.distanceTo(look);
      if (need > have) camera.position.sub(look).multiplyScalar(need / have).add(look);
    }
    camera.lookAt(cam.look[0], cam.look[1], cam.look[2]);
    rig.scale.setScalar(rigScale);
    const f = framing(0, narrow, w);
    rig.position.set(f.x, f.y, 0);
    if (world.resize) world.resize(w, h, narrow);
  }

  function scrollProgress() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    return max > 0 ? clamp01(window.scrollY / max) : 0;
  }

  /** Apply framing + parallax, then hand the scene its own posing. */
  function frame(p, t, mx, my) {
    const f = framing(p, narrow, window.innerWidth);
    rig.position.x = f.x + mx * 0.5;
    rig.position.y = f.y - my * 0.35;
    rig.rotation.y = mx * 0.18;
    rig.rotation.x = my * 0.12;
    pose(world, { p, t, mx, my, narrow });
  }

  resize();

  if (reduce) {
    // One representative still. No loop, no listeners that would imply motion.
    window.addEventListener("resize", () => { resize(); frame(stillAt, 0, 0, 0); renderer.render(scene, camera); });
    frame(stillAt, 0, 0, 0);
    renderer.render(scene, camera);
    return { renderer, scene, camera, rig, world, reduced: true };
  }

  window.addEventListener("resize", resize);

  let targetP = scrollProgress(), curP = targetP;
  window.addEventListener("scroll", () => { targetP = scrollProgress(); }, { passive: true });

  let tmx = 0, tmy = 0, mx = 0, my = 0;
  window.addEventListener("pointermove", (e) => {
    tmx = (e.clientX / window.innerWidth) * 2 - 1;
    tmy = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });
  // Phones have no cursor — let a gentle tilt drive the same parallax.
  window.addEventListener("deviceorientation", (e) => {
    if (e.gamma == null || e.beta == null) return;
    tmx = clamp01((e.gamma + 30) / 60) * 2 - 1;
    tmy = clamp01((e.beta - 20) / 60) * 2 - 1;
  }, { passive: true });

  renderer.setAnimationLoop((tms) => {
    const t = tms * 0.001;
    curP += (targetP - curP) * 0.07;   // damped: scrolling glides
    mx += (tmx - mx) * 0.05;
    my += (tmy - my) * 0.05;
    frame(curP, t, mx, my);
    renderer.render(scene, camera);
  });

  return { renderer, scene, camera, rig, world, reduced: false };
}
