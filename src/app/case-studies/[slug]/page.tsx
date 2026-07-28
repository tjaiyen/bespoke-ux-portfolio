import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { listPublishedSlugs, loadCaseStudy } from "@/lib/mdxLoader";

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

  const { frontmatter, mdx } = await loadCaseStudy(slug);

  return (
    <main id="main-content" className="mx-auto w-full max-w-3xl px-6 py-16">
      <header className="border-b border-border-subtle pb-8">
        <h1 className="font-serif text-4xl text-text-main">
          {frontmatter.title}
        </h1>
        <p className="mt-3 font-sans text-lg text-text-muted">
          {frontmatter.subtitle}
        </p>
        <dl className="mt-6 grid grid-cols-1 gap-3 font-mono text-sm text-text-muted sm:grid-cols-3">
          <div>
            <dt className="sr-only">Client</dt>
            <dd>{frontmatter.client}</dd>
          </div>
          <div>
            <dt className="sr-only">Role</dt>
            <dd>{frontmatter.role}</dd>
          </div>
          <div>
            <dt className="sr-only">Timeline</dt>
            <dd>{frontmatter.timeline}</dd>
          </div>
        </dl>
      </header>

      <article className="prose-case mt-10">{mdx}</article>
    </main>
  );
}
