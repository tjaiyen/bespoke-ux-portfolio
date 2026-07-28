import Link from "next/link";
import type { Metadata } from "next";
import { listPublishedCaseStudies } from "@/lib/mdxLoader";

export const metadata: Metadata = {
  title: "Case Studies",
  description:
    "Enterprise B2B, manufacturing operations, and financial systems design work.",
};

export default function CaseStudiesIndexPage() {
  const studies = listPublishedCaseStudies();

  return (
    <main id="main-content" className="mx-auto w-full max-w-4xl px-6 py-16">
      <h1 className="font-serif text-4xl text-text-main">Case Studies</h1>

      {studies.length === 0 ? (
        <p className="mt-6 font-sans text-text-muted">
          No published case studies yet.
        </p>
      ) : (
        <ul className="mt-10 space-y-8">
          {studies.map((study) => (
            <li
              key={study.slug}
              className="border-b border-border-subtle pb-8 last:border-b-0"
            >
              <h2 className="font-serif text-2xl">
                <Link
                  href={`/case-studies/${study.slug}`}
                  className="inline-flex min-h-11 items-center text-text-main underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-accent-focus focus-visible:outline-none"
                >
                  {study.title}
                </Link>
              </h2>
              <p className="mt-2 font-sans text-text-muted">{study.subtitle}</p>
              <p className="mt-3 font-mono text-sm text-text-muted">
                {study.role} · {study.timeline}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
