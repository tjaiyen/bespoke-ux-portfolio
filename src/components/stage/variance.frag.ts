/**
 * "Variance settling" — the fragment shader behind the stage.
 *
 * The scene is a bundle of horizontal traces. At the top of the page they are spread
 * across the viewport, each wandering on its own noise seed: unreconciled variance, many
 * numbers that do not agree. As `u_scroll` advances they converge on one line and their
 * wander decays, until what is left is a single settled signal.
 *
 * That is the portfolio's own subject rendered as its backdrop — month-end drift
 * resolving into a traceable number — and the resolution is driven by scroll position,
 * so the visitor performs it rather than watching a loop.
 *
 * Every colour arrives as a uniform sampled from the site's design tokens at runtime
 * (see VarianceStage), so the scene inherits the contrast-verified palette and follows
 * the light/dark switch without a second definition to keep in sync.
 *
 * GLSL ES 1.00 (WebGL 1). Kept to cheap primitives — value noise, four fbm octaves, a
 * fixed 14-iteration loop — because this runs every frame on whatever GPU shows up.
 */

export const VERTEX_SHADER = /* glsl */ `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

export const FRAGMENT_SHADER = /* glsl */ `
precision mediump float;

uniform vec2  u_res;
uniform float u_time;
uniform float u_scroll;   // 0 = drifting, 1 = settled
uniform vec2  u_pointer;  // -1..1, damped
uniform vec3  u_bg;       // --bg-app
uniform vec3  u_ink;      // --text-muted
uniform vec3  u_brand;    // --accent-brand
uniform vec3  u_signal;   // --status-positive

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.02;
    a *= 0.5;
  }
  return v;
}

const int TRACES = 14;

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / u_res.y;
  vec2 p = vec2(uv.x * aspect, uv.y);

  // Ease the settle so the page spends most of its length in motion and resolves
  // decisively near the end — a linear collapse reads as a fade, not a resolution.
  float s = smoothstep(0.05, 0.92, u_scroll);
  s = s * s * (3.0 - 2.0 * s);

  float glow = 0.0;   // accumulated halo, the diffuse body of the bundle
  float core = 0.0;   // accumulated line cores, the crisp signal

  // The halo radius shrinks with the spread. Holding it fixed makes the settled bundle
  // 14 overlapping halos — a fat blur where the whole point is a single crisp line.
  float haloR = mix(0.042, 0.017, s);
  float weight = mix(0.30, 0.72, s);

  for (int i = 0; i < TRACES; i++) {
    float fi = float(i) / float(TRACES - 1);   // 0..1
    float offset = fi - 0.5;                   // -0.5..0.5

    // How far the bundle is spread, and how hard each trace wanders. Both collapse
    // toward the centre line as the page resolves.
    float spread = mix(0.88, 0.016, s);
    float amp    = mix(0.090, 0.004, s);
    float speed  = mix(0.150, 0.045, s);

    float seed = fi * 37.19;
    float wander = (fbm(vec2(p.x * 2.2 + u_time * speed + seed, seed)) - 0.5) * 2.0 * amp;

    // Pointer parallax: outer traces lean further than inner ones, so moving the
    // cursor tilts the bundle instead of sliding it.
    float lean = (u_pointer.y * 0.045 + u_pointer.x * 0.012) * offset * 2.0;

    float y = 0.5 + offset * spread + wander + lean;
    float d = abs(p.y - y);

    // Slight per-trace variation so the bundle does not read as machine-drawn.
    float vary = 0.75 + 0.25 * hash(vec2(seed, 3.0));

    core += smoothstep(0.0030, 0.0, d);
    glow += smoothstep(haloR, 0.0, d) * weight * vary;
  }

  // Drifting mass reads as muted ink tinted toward brand; the settled signal takes the
  // positive token. The colour shift is the second channel telling you it resolved.
  vec3 drifting = mix(u_ink, u_brand, 0.30);
  vec3 settled  = mix(u_brand, u_signal, 0.50);
  vec3 lineCol  = mix(drifting, settled, s);

  // The hot core runs away from the background: a highlight on a dark theme, an ink-dark
  // centre on a light one. One expression instead of two palettes to keep in sync.
  float bgLum = dot(u_bg, vec3(0.2126, 0.7152, 0.0722));
  vec3 hot = mix(settled, vec3(1.0 - step(0.5, bgLum)), 0.22);

  vec3 col = u_bg;
  col = mix(col, lineCol, clamp(glow, 0.0, 1.0));
  col = mix(col, hot, clamp(core, 0.0, 1.0) * mix(0.30, 0.48, s));

  // Vignette pulls attention to the centre band without a hard edge.
  float vig = smoothstep(1.05, 0.30, length(uv - 0.5));
  col = mix(u_bg, col, 0.35 + 0.65 * vig);

  // Static dither. Gradients this shallow band badly on 8-bit displays, and animated
  // grain would shimmer under the reduced-motion single frame.
  col += (hash(gl_FragCoord.xy) - 0.5) * 0.012;

  gl_FragColor = vec4(col, 1.0);
}
`;
