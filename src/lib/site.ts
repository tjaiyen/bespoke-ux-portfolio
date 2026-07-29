/**
 * Single source of identity for the site.
 *
 * Contact fields are intentionally null. Publishing an email address or profile URL is
 * an outward decision — filling these in is what puts them on the public internet, so
 * that is TJ's call, not a default. Every consumer renders only the links that are set,
 * so the footer degrades cleanly while they are empty rather than shipping placeholders
 * that read as real.
 */
export const site = {
  name: "Theerayut Jaiyen",
  shortName: "TJ",
  role: "Product Designer",
  discipline: "Enterprise B2B · Manufacturing Operations · Financial Systems",
  tagline:
    "A former manufacturing cost accountant who turns ERP and financial data into real-time operational visibility tools.",

  // ---- TJ: fill these in before launch -------------------------------------
  email: null as string | null, // e.g. "you@example.com"
  linkedin: null as string | null, // e.g. "https://www.linkedin.com/in/…"
  github: null as string | null,
  resumeHref: null as string | null, // e.g. "/resume.pdf"
  // --------------------------------------------------------------------------
} as const;

export type ContactLink = { label: string; href: string };

/** Only the contact links that have actually been configured. */
export function contactLinks(): ContactLink[] {
  const out: ContactLink[] = [];
  if (site.email) out.push({ label: "Email", href: `mailto:${site.email}` });
  if (site.linkedin) out.push({ label: "LinkedIn", href: site.linkedin });
  if (site.github) out.push({ label: "GitHub", href: site.github });
  if (site.resumeHref) out.push({ label: "Résumé", href: site.resumeHref });
  return out;
}

export const NAV = [
  { href: "/", label: "Home" },
  { href: "/case-studies", label: "Work" },
  { href: "/gallery", label: "Gallery" },
  { href: "/design-system", label: "Design system" },
  { href: "/about", label: "About" },
] as const;
