import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Binary typography constraint (CLAUDE.md): NEVER Inter, Arial, or system sans-serif.
// Playfair Display headers / Plus Jakarta Sans body / JetBrains Mono for data + design tokens.
// Loaded via next/font so files are self-hosted — no render-blocking external CSS and no
// FOUT-induced layout shift (CLS = 0 is a hard CI gate).
const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Product Design Portfolio — Enterprise B2B, Manufacturing Ops, Financial Systems",
  description:
    "Case studies in translating ERP and financial data into real-time operational visibility tools.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfairDisplay.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg-app font-sans text-text-main">
        {/* WCAG 2.4.1 Bypass Blocks. Lives in the layout, not per-page: every template
            has a #main-content target, so a per-page skip link means any route whose
            author forgets it silently loses the bypass mechanism. Placed first in the
            body so it is first in tab order on every route. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded focus:bg-bg-surface focus:px-4 focus:py-3 focus:text-text-main focus-visible:ring-2 focus-visible:ring-accent-focus focus-visible:outline-none"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
