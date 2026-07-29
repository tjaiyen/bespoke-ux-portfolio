/**
 * Prefix a path in `public/` with the deploy basePath.
 *
 * Next applies `basePath` automatically to route links and to its own `/_next/` assets,
 * but NOT to raw strings pointing at files in `public/` — and with `images.unoptimized`
 * (required by static export) it does not rewrite `<Image src>` either. The result on a
 * GitHub Pages project site is a page that loads with a 200 while every hero image and
 * every gallery link 404s.
 *
 * Found by `scripts/check-publish.mjs` (PUB2), not by any build or a11y gate — all of
 * which pass, because at `/` the unprefixed paths are correct.
 *
 * `NEXT_PUBLIC_*` is inlined at build time, so this is safe on both server and client.
 * When the site deploys at a domain root the basePath is empty and this is the identity
 * function.
 */
export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

export function assetPath(p: string): string {
  if (!BASE_PATH || !p.startsWith("/")) return p;
  return `${BASE_PATH}${p}`;
}
