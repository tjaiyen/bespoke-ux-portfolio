import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored + generated gallery output. public/gallery holds self-contained sites
    // produced by the Blocksmith engine, including a vendored three.js build. It is
    // third-party/generated artefact code, not source we author — linting it reports
    // style findings we would never act on and would drown real ones.
    "public/gallery/**",
  ]),
]);

export default eslintConfig;
