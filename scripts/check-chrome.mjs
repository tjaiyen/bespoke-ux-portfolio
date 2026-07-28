#!/usr/bin/env node
/**
 * Preflight: prove a usable Chrome exists BEFORE any audit runs.
 *
 * Why this exists. Puppeteer's bundled download truncates silently on macOS ARM — the
 * installer reports success and leaves a ~448 KB stub with no framework binary, so every
 * launch dies on dlopen. In CI the failure mode is worse than a crash: if
 * PA11Y_CHROME_PATH resolves to an empty string (e.g. `${{ env.CHROME_PATH }}` is not
 * set on the runner), puppeteer falls back to that same broken bundled path. The a11y
 * steps then fail for an environment reason that looks nothing like an a11y finding, or —
 * worse, if someone later adds `continue-on-error` to stop the noise — pass while
 * auditing nothing. That is the R15 "green but inert gate" shape, in the gate meant to
 * catch accessibility regressions.
 *
 * So: resolve, launch, load a page, and exit 1 with actionable guidance if any step
 * fails. Cheap, and it turns a confusing downstream failure into a clear upstream one.
 */
import puppeteer from "puppeteer";

const explicit = process.env.PA11Y_CHROME_PATH?.trim();

const candidates = [
  explicit,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  process.env.CHROME_PATH?.trim(),
].filter(Boolean);

async function tryLaunch(execPath) {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: execPath || undefined,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent("<h1>preflight</h1>");
    const ok = (await page.$eval("h1", (el) => el.textContent)) === "preflight";
    if (!ok) throw new Error("page evaluated but returned unexpected content");
    return await browser.version();
  } finally {
    await browser.close();
  }
}

for (const candidate of candidates) {
  try {
    const version = await tryLaunch(candidate);
    console.log(`chrome preflight OK — ${version}`);
    console.log(`  path: ${candidate}`);
    if (!explicit) {
      console.log(
        "  NOTE: PA11Y_CHROME_PATH was not set; this path was auto-detected.\n" +
          "  Set it explicitly in CI so the audit does not depend on discovery order.",
      );
    }
    process.exit(0);
  } catch (err) {
    console.error(`  unusable: ${candidate || "(puppeteer bundled)"} — ${String(err.message).split("\n")[0]}`);
  }
}

// Last resort: puppeteer's own bundled browser, explicitly (not as a silent fallback).
try {
  const version = await tryLaunch(undefined);
  console.log(`chrome preflight OK — ${version} (puppeteer bundled)`);
  process.exit(0);
} catch (err) {
  console.error(`  unusable: (puppeteer bundled) — ${String(err.message).split("\n")[0]}`);
}

console.error(
  "\nERROR: no usable Chrome found. The accessibility audits cannot run.\n" +
    "This is an ENVIRONMENT failure, not an accessibility finding — do not silence it.\n\n" +
    "Fix one of:\n" +
    "  • export PA11Y_CHROME_PATH=/path/to/chrome   (local: /Applications/Google Chrome.app/Contents/MacOS/Google Chrome)\n" +
    "  • npx puppeteer browsers install chrome      (verify the bundle is >100MB afterwards — it truncates silently)\n" +
    "  • in CI, confirm ${{ env.CHROME_PATH }} actually resolves on the runner\n",
);
process.exit(1);
