"use client";

import { useEffect, useRef } from "react";
import { FRAGMENT_SHADER, VERTEX_SHADER } from "./variance.frag";

/**
 * The stage: a fixed, full-viewport WebGL backdrop the page scrolls over.
 *
 * Two rules make this safe to put behind a portfolio that argues for accessibility:
 *
 *  1. No text ever sits on it. Content lives in opaque token-coloured panels above; the
 *     interlude bands where the scene performs alone carry no prose. That is what lets a
 *     contrast audit computed from flat token values stay true with a canvas underneath.
 *  2. It is decorative in the technical sense — aria-hidden, not focusable, and
 *     pointer-events: none — so it contributes nothing to the accessibility tree and
 *     cannot appear in the tab order.
 *
 * Scroll position is the timeline: `u_scroll` drives how far the variance has settled,
 * so the visitor advances the scene rather than watching a loop.
 *
 * Mounted per-page (home and about) rather than in the root layout, so no other route
 * pays for the JS.
 */

/** Tokens the shader samples. Order matters — it maps to the uniform list below. */
const TOKENS = [
  "--bg-app",
  "--text-muted",
  "--accent-brand",
  "--status-positive",
] as const;

/** Resolve a CSS custom property to linear 0..1 RGB via the browser's own colour parser. */
function readTokens(probe: HTMLElement): number[][] {
  return TOKENS.map((name) => {
    probe.style.color = `var(${name})`;
    const parts = getComputedStyle(probe).color.match(/[\d.]+/g);
    if (!parts || parts.length < 3) return [0, 0, 0];
    return [
      Number(parts[0]) / 255,
      Number(parts[1]) / 255,
      Number(parts[2]) / 255,
    ];
  });
}

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    // Fail quietly to the caller — a shader bug must degrade to "no backdrop", never to
    // a broken page. The message is still surfaced for anyone with a console open.
    console.warn("[stage] shader compile failed:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export default function VarianceStage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Boot the stage only once the browser is idle. Compiling a shader and starting a
    // rAF loop during load competes with the main thread exactly when it is finishing
    // paint, and measurement showed it: Lighthouse put the home page at 0.87 against a
    // 0.90 floor with the stage initialising eagerly. Deferring gives the page its LCP
    // and interactivity first, then the backdrop starts. The timeout is a backstop for
    // a main thread that never actually goes idle.
    let cancelled = false;
    let disposeStage: () => void = () => {};

    const ric = (
      window as unknown as {
        requestIdleCallback?: (
          cb: () => void,
          o?: { timeout: number },
        ) => number;
        cancelIdleCallback?: (h: number) => void;
      }
    ).requestIdleCallback;

    const boot = () => {
      if (cancelled) return;
      disposeStage = init() ?? (() => {});
    };

    const handle = ric
      ? ric(boot, { timeout: 2500 })
      : window.setTimeout(boot, 300);

    return () => {
      cancelled = true;
      if (ric) {
        (
          window as unknown as { cancelIdleCallback?: (h: number) => void }
        ).cancelIdleCallback?.(handle);
      } else {
        clearTimeout(handle);
      }
      disposeStage();
    };

    function init(): (() => void) | undefined {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const gl =
        (canvas.getContext("webgl", {
          antialias: false,
          alpha: false,
          depth: false,
        }) as WebGLRenderingContext | null) ?? null;
      // No WebGL (old browser, blocklisted GPU, headless without swiftshader): render
      // nothing at all. The page is designed to read correctly without the backdrop.
      if (!gl) return;

      const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
      const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
      if (!vs || !fs) return;

      const program = gl.createProgram();
      if (!program) return;
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.warn("[stage] link failed:", gl.getProgramInfoLog(program));
        return;
      }
      gl.useProgram(program);

      // One full-screen triangle pair.
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 3, -1, -1, 3]),
        gl.STATIC_DRAW,
      );
      const aPos = gl.getAttribLocation(program, "a_pos");
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      const u = {
        res: gl.getUniformLocation(program, "u_res"),
        time: gl.getUniformLocation(program, "u_time"),
        scroll: gl.getUniformLocation(program, "u_scroll"),
        pointer: gl.getUniformLocation(program, "u_pointer"),
        bg: gl.getUniformLocation(program, "u_bg"),
        ink: gl.getUniformLocation(program, "u_ink"),
        brand: gl.getUniformLocation(program, "u_brand"),
        signal: gl.getUniformLocation(program, "u_signal"),
      };

      // Colour probe. Hidden, inert, and removed on cleanup.
      const probe = document.createElement("span");
      probe.setAttribute("aria-hidden", "true");
      probe.style.cssText =
        "position:absolute;width:0;height:0;visibility:hidden";
      document.body.appendChild(probe);

      const pushTokens = () => {
        const [bg, ink, brand, signal] = readTokens(probe);
        gl.uniform3fv(u.bg, bg);
        gl.uniform3fv(u.ink, ink);
        gl.uniform3fv(u.brand, brand);
        gl.uniform3fv(u.signal, signal);
      };

      let width = 0;
      let height = 0;
      const resize = () => {
        // Clamped so a 3x phone and a 2x retina laptop render the same pixel count.
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = Math.round(window.innerWidth * dpr);
        const h = Math.round(window.innerHeight * dpr);
        if (w === width && h === height) return;
        width = w;
        height = h;
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
        gl.uniform2f(u.res, w, h);
      };

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
      const scheme = window.matchMedia("(prefers-color-scheme: dark)");

      let scroll = 0;
      let scrollTarget = 0;
      let px = 0;
      let py = 0;
      let pxTarget = 0;
      let pyTarget = 0;
      let raf = 0;
      let running = false;

      const readScroll = () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        scrollTarget =
          max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      };

      const onPointer = (e: PointerEvent) => {
        pxTarget = (e.clientX / window.innerWidth) * 2 - 1;
        pyTarget = (e.clientY / window.innerHeight) * 2 - 1;
      };

      const render = (t: number) => {
        resize();
        gl.uniform1f(u.time, t / 1000);
        gl.uniform1f(u.scroll, scroll);
        gl.uniform2f(u.pointer, px, py);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        // Test hook. Prediction 6 of the verification plan asserts that reduced motion
        // produces exactly ONE draw call; reading the source cannot establish that, and
        // this is what the Puppeteer probe counts.
        (window as unknown as { __stageFrames?: number }).__stageFrames =
          ((window as unknown as { __stageFrames?: number }).__stageFrames ??
            0) + 1;
      };

      const loop = (t: number) => {
        scroll += (scrollTarget - scroll) * 0.08;
        px += (pxTarget - px) * 0.05;
        py += (pyTarget - py) * 0.05;
        render(t);
        raf = requestAnimationFrame(loop);
      };

      const start = () => {
        if (running || reduce.matches) return;
        running = true;
        raf = requestAnimationFrame(loop);
      };
      const stop = () => {
        running = false;
        cancelAnimationFrame(raf);
      };

      // A single settled frame, not a blank one. Someone who asked for less motion should
      // still get the resolved image the scene exists to arrive at.
      const drawStatic = () => {
        scroll = 1;
        px = 0;
        py = 0;
        pushTokens();
        render(0);
      };

      const onVisibility = () => (document.hidden ? stop() : start());
      const onMotionChange = () => {
        stop();
        if (reduce.matches) drawStatic();
        else start();
      };
      const onSchemeChange = () => {
        pushTokens();
        if (reduce.matches) drawStatic();
      };
      // The theme can now change without the OS preference changing — the header toggle
      // writes `.light`/`.dark` on <html>. Watching only the media query would leave the
      // backdrop painted in the previous palette after a toggle, which is most obvious
      // under reduced motion, where nothing redraws to correct it.
      const classObserver = new MutationObserver(onSchemeChange);
      classObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
      const onContextLost = (e: Event) => {
        e.preventDefault();
        stop();
      };

      pushTokens();
      resize();
      readScroll();
      scroll = reduce.matches ? 1 : scrollTarget;

      // A fixed full-viewport canvas is always intersecting, so an IntersectionObserver
      // would be dead code here. Tab visibility is the real "nobody is looking" signal.
      window.addEventListener("scroll", readScroll, { passive: true });
      window.addEventListener("resize", readScroll);
      window.addEventListener("pointermove", onPointer, { passive: true });
      document.addEventListener("visibilitychange", onVisibility);
      canvas.addEventListener("webglcontextlost", onContextLost);
      reduce.addEventListener("change", onMotionChange);
      scheme.addEventListener("change", onSchemeChange);

      if (reduce.matches) drawStatic();
      else start();

      return () => {
        stop();
        window.removeEventListener("scroll", readScroll);
        window.removeEventListener("resize", readScroll);
        window.removeEventListener("pointermove", onPointer);
        document.removeEventListener("visibilitychange", onVisibility);
        canvas.removeEventListener("webglcontextlost", onContextLost);
        reduce.removeEventListener("change", onMotionChange);
        scheme.removeEventListener("change", onSchemeChange);
        classObserver.disconnect();
        probe.remove();
        gl.deleteBuffer(buffer);
        gl.deleteProgram(program);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
      };
    }
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      // Negative z-index puts it above the page's propagated body background and below
      // every block-level box, so no content needs a z-index of its own to stay clear
      // of it. pointer-events:none keeps it out of hit-testing entirely.
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
    />
  );
}
