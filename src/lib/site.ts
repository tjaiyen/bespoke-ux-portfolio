/**
 * Single source of identity for the site.
 *
 * Publishing an email address or profile URL is an outward decision, so these were held
 * at null until TJ chose (2026-07-29: email + LinkedIn). Every consumer renders only the
 * links that are set, so the set stays honest as fields are added — nothing here is a
 * placeholder pretending to be real.
 */
export const site = {
  name: "Theerayut Jaiyen",
  shortName: "TJ",
  role: "Product Designer",
  discipline: "Enterprise B2B · Manufacturing Operations · Financial Systems",
  tagline:
    "A former manufacturing cost accountant who turns ERP and financial data into real-time operational visibility tools.",

  email: "tjaiyen.sterling@gmail.com" as string | null,
  linkedin: "https://www.linkedin.com/in/jaiyentheerayut/" as string | null,
  github: null as string | null,
  // Drop the PDF at public/resume.pdf and set this to "/resume.pdf". The link then
  // appears in the footer and on About automatically — nothing else to wire.
  resumeHref: null as string | null,
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
