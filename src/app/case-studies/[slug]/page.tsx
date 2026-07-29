import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  listPublishedCaseStudies,
  listPublishedSlugs,
  loadCaseStudy,
} from "@/lib/mdxLoader";
import { evidenceFor } from "@/lib/evidence";
import CaseStudyHero from "@/components/site/CaseStudyHero";
import CaseStudyToc from "@/components/site/CaseStudyToc";
import ProjectTypeNotice from "@/components/site/ProjectTypeNotice";

// Static params come from published, schema-valid slugs only. A study with
// published: false is never routed; a study with invalid frontmatter fails the
// build rather than disappearing silently (see mdxLoader deviation 3).
export function generateStaticParams() {
  return listPublishedSlugs().map((slug) => ({ slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!listPublishedSlugs().includes(slug)) return {};
  const { frontmatter } = await loadCaseStudy(slug);
  return { title: frontmatter.title, description: frontmatter.subtitle };
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!listPublishedSlugs().includes(slug)) notFound();

  const { frontmatter, mdx, headings } = await loadCaseStudy(slug);

  // Prev/next within the published set, so a case study is never a dead end.
  const all = listPublishedCaseStudies();
  const i = all.findIndex((s) => s.slug === slug);
  const prev = i > 0 ? all[i - 1] : null;
  const next = i >= 0 && i < all.length - 1 ? all[i + 1] : null;

  return (
    <main id="main-content" className="mx-auto w-full max-w-3xl px-6 py-12 xl:max-w-6xl">
      <Link
        href="/case-studies"
        className="inline-flex min-h-11 items-center font-mono text-sm text-text-muted underline-offset-4 hover:text-text-main hover:underline focus-visible:ring-2 focus-visible:ring-accent-focus focus-visible:outline-none"
      >
        <span aria-hidden="true">←</span>
        <span className="ml-2">All work</span>
      </Link>

      <header className="mt-4 border-b border-border-subtle pb-8">
        <h1 className="font-serif text-4xl leading-tight text-text-main">
          {frontmatter.title}
        </h1>
        <p className="mt-3 font-sans text-lg text-text-muted">
          {frontmatter.subtitle}
        </p>
        <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { k: "Client", v: frontmatter.client },
            { k: "Role", v: frontmatter.role },
            { k: "Timeline", v: frontmatter.timeline },
          ].map(({ k, v }) => (
            <div key={k}>
              <dt className="font-mono text-[11px] tracking-wide text-text-muted uppercase">
                {k}
              </dt>
              <dd className="mt-1 font-sans text-sm text-text-main">{v}</dd>
            </div>
          ))}
        </dl>
        {frontmatter.toolsUsed.length > 0 && (
          <ul className="mt-6 flex flex-wrap gap-2" aria-label="Tools used">
            {frontmatter.toolsUsed.map((t) => (
              <li
                key={t}
                className="rounded-full border border-border-subtle px-3 py-1 font-mono text-xs text-text-muted"
              >
                {t}
              </li>
            ))}
          </ul>
        )}
      </header>

      <ProjectTypeNotice
        projectType={frontmatter.projectType}
        basis={frontmatter.basis}
        metricsBasis={frontmatter.metricsBasis}
      />

      <CaseStudyHero
        evidence={evidenceFor(slug)}
        title={frontmatter.title}
        heroImage={frontmatter.heroImage}
      />

      <div className="mt-12 xl:grid xl:grid-cols-[1fr_15rem] xl:gap-12">
        <article className="prose-case xl:max-w-3xl">{mdx}</article>
        <aside>
          <CaseStudyToc headings={headings} />
        </aside>
      </div>

      <nav
        aria-label="More case studies"
        className="mt-20 grid grid-cols-1 gap-4 border-t border-border-subtle pt-8 sm:grid-cols-2"
      >
        {prev ? (
          <Link
            href={`/case-studies/${prev.slug}`}
            className="rounded-lg border border-border-subtle p-5 focus-visible:ring-2 focus-visible:ring-accent-focus focus-visible:outline-none"
          >
            <span className="font-mono text-[11px] tracking-wide text-text-muted uppercase">
              ← Previous
            </span>
            <span className="mt-2 block font-serif text-lg text-text-main">
              {prev.title}
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link
            href={`/case-studies/${next.slug}`}
            className="rounded-lg border border-border-subtle p-5 sm:text-right focus-visible:ring-2 focus-visible:ring-accent-focus focus-visible:outline-none"
          >
            <span className="font-mono text-[11px] tracking-wide text-text-muted uppercase">
              Next →
            </span>
            <span className="mt-2 block font-serif text-lg text-text-main">
              {next.title}
            </span>
          </Link>
        )}
      </nav>
    </main>
  );
}
