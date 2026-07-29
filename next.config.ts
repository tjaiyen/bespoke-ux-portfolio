import type { NextConfig } from "next";

/**
 * Static export is OPT-IN via `NEXT_OUTPUT=export` (see `npm run build:static`).
 *
 * It is not the default because `next start` refuses to run against an exported build,
 * and the whole verification workflow — `npm start` then `npm run a11y` — depends on it.
 * Making export the default would silently trade the gates for a deploy convenience.
 *
 * `NEXT_PUBLIC_BASE_PATH` exists because a GitHub Pages *project* site serves from
 * `/<repo>/`, not `/`. Without it Next emits root-absolute asset URLs (`/_next/...`):
 * the HTML loads with a 200 and every stylesheet, font and image 404s, so the page
 * renders as raw unstyled text. Verified by serving the export under a subpath — HTML
 * 200, assets 404. Leave it unset for a user site, a custom domain, or Vercel.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, "") || "";
const isExport = process.env.NEXT_OUTPUT === "export";

const nextConfig: NextConfig = {
  ...(isExport ? { output: "export" as const } : {}),
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
  // The Next image optimizer is a server feature; an exported build has no server.
  // Every <Image> still declares width/height, so CLS stays 0 (asserted in CI).
  ...(isExport ? { images: { unoptimized: true } } : {}),
};

export default nextConfig;
