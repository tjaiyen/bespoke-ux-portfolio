#!/usr/bin/env node
/**
 * Screenshot every published gallery site.
 *
 * Served over HTTP rather than opened from file:// — the sites are ES modules importing a
 * shared three.js, and module imports are blocked on file:// by CORS. A file:// run
 * produces a page that loads but never renders its scene, which photographs as an empty
 * background and looks like a broken site rather than a broken harness.
 *
 * Each shot waits for the WebGL scene to actually paint before capturing, otherwise the
 * whole point of a 3D gallery is 47 pictures of a blank canvas.
 *
 * Usage: PA11Y_CHROME_PATH=<chrome> node scripts/gallery-shots.mjs [--only <slug>]
 * Exit 0 = every site captured · 1 = at least one failed.
 */
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import puppeteer from "puppeteer";

const GALLERY = path.join(process.cwd(), "public", "gallery");
const SHOTS = path.join(GALLERY, "_shots");
// Cards display at roughly 380 CSS px, so a full 1280-wide capture ships ~3x the pixels
// anyone sees. Capturing the desktop LAYOUT at 1280 but rasterising below 1:1 keeps the
// composition and cuts the bytes.
const SCALE = Number(process.env.SHOT_SCALE ?? 0.75);
const only = process.argv.includes("--only")
  ? process.argv[process.argv.indexOf("--only") + 1]
  : undefined;

const slugs = fs
  .readdirSync(path.join(GALLERY, "_receipts"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(/\.json$/, ""))
  .filter((s) => !only || s === only)
  .sort();

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split("?")[0]);
  const file = path.join(GALLERY, rel);
  if (!file.startsWith(GALLERY) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404).end("not found");
    return;
  }
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] ?? "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

fs.mkdirSync(SHOTS, { recursive: true });
const browser = await puppeteer.launch({
  headless: true,
  executablePath: process.env.PA11Y_CHROME_PATH || undefined,
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    // Headless Chrome has no GPU; SwiftShader gives it a real WebGL context so the
    // screenshots show the scene a visitor sees instead of an empty stage.
    "--enable-unsafe-swiftshader",
    "--use-gl=angle",
    "--use-angle=swiftshader",
  ],
});

const failed = [];
for (const slug of slugs) {
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: SCALE });
    await page.goto(`http://localhost:${port}/${slug}/index.html`, {
      waitUntil: "networkidle0",
      timeout: 45000,
    });
    // Give the scene time to compile shaders and render a few frames.
    await new Promise((r) => setTimeout(r, 2600));

    // Is there a canvas, and does it occupy real space? Deliberately NOT readPixels: an
    // earlier version of this check called it after the frame had been composited, when
    // the drawing buffer is already cleared unless `preserveDrawingBuffer` is set. It
    // returned "uniform" for all 47 sites — every one of which was in fact rendering
    // correctly. The check was wrong, not the output, and the only reason that was
    // caught is that the screenshots were opened and looked at.
    const canvas = await page.evaluate(() => {
      const c = document.querySelector("canvas");
      if (!c) return { present: false };
      const r = c.getBoundingClientRect();
      return { present: true, w: Math.round(r.width), h: Math.round(r.height) };
    });

    await page.screenshot({ path: path.join(SHOTS, `${slug}.png`), type: "png" });
    const bytes = fs.statSync(path.join(SHOTS, `${slug}.png`)).size;
    const kb = (bytes / 1024).toFixed(0);

    // A byte floor is a heuristic, not proof — but a flat 1280x800 PNG compresses to a
    // few KB, so anything this size has real varied content in it. Stated as the
    // heuristic it is rather than dressed up as a render check.
    const thin = bytes < 25_000;
    const noCanvas = !canvas.present || canvas.w < 40 || canvas.h < 40;
    console.log(
      `  ${slug.padEnd(18)} ${String(kb).padStart(4)} KB   canvas ${
        canvas.present ? `${canvas.w}x${canvas.h}` : "MISSING"
      }${thin ? "   ⚠ suspiciously small — open it" : ""}`,
    );
    if (noCanvas) failed.push(`${slug} (canvas missing or tiny)`);
    if (thin) failed.push(`${slug} (screenshot under the byte floor)`);
  } catch (e) {
    console.log(`  ${slug.padEnd(18)} FAILED — ${String(e).slice(0, 70)}`);
    failed.push(slug);
  } finally {
    await page.close();
  }
}

await browser.close();
server.close();

console.log(
  `\n${slugs.length - failed.length}/${slugs.length} captured` +
    (failed.length ? `\nfailed: ${failed.join(", ")}` : ""),
);
process.exit(failed.length ? 1 : 0);
