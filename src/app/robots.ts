import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Internal verification harness — also noindex via its own metadata. Both are
        // set because robots.txt only asks crawlers not to fetch; the meta tag is what
        // keeps an already-known URL out of the index.
        disallow: ["/design-system"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
