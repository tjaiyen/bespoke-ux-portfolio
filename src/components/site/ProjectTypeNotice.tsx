/**
 * Concept-project disclosure.
 *
 * Non-negotiable and deliberately unmissable. These case studies are composite concept
 * work grounded in real domain experience — they were originally published with implied
 * employment (a role title, overlapping date ranges, a named reporting line) and metrics
 * stated as measured outcomes. A reader has to know what they are looking at BEFORE they
 * read a number, not in a footnote after it.
 *
 * This is not a hedge. Concept work is legitimate portfolio evidence; presenting it as
 * client history is what fails, and it fails at the interview rather than at the page.
 */
export default function ProjectTypeNotice({
  projectType,
  basis,
  metricsBasis,
}: {
  projectType: "concept" | "client";
  basis: string;
  metricsBasis: "measured" | "modelled";
}) {
  if (projectType === "client") return null;

  return (
    <aside
      aria-labelledby="concept-notice-heading"
      className="mt-8 rounded-lg border border-accent-brand/40 bg-bg-surface p-6"
    >
      <h2
        id="concept-notice-heading"
        className="flex items-center gap-2 font-mono text-[11px] tracking-widest text-accent-brand uppercase"
      >
        Concept project
      </h2>
      <p className="mt-3 font-sans text-sm leading-relaxed text-text-main">
        This is a self-directed concept, not a client engagement. No organisation
        commissioned it and it was not shipped to production.{" "}
        {metricsBasis === "modelled" && (
          <>
            <strong>The figures below are modelled from stated assumptions, not
            measured results.</strong>{" "}
          </>
        )}
        The problem, the constraints, and the domain reasoning come from direct
        experience.
      </p>
      <p className="mt-3 font-sans text-sm leading-relaxed text-text-muted">
        <span className="font-mono text-[11px] tracking-wide uppercase">
          Grounded in:{" "}
        </span>
        {basis}
      </p>
    </aside>
  );
}

/** Compact variant for cards in listings, where the full notice would drown the entry. */
export function ConceptBadge({
  projectType,
}: {
  projectType: "concept" | "client";
}) {
  if (projectType === "client") return null;
  return (
    <span className="inline-flex items-center rounded-full border border-accent-brand/40 px-2.5 py-0.5 font-mono text-[10px] tracking-widest text-accent-brand uppercase">
      Concept
    </span>
  );
}
