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
    // Local ML/runtime assets (not part of Next.js frontend lint scope):
    "**/.venv/**",
    "ml/**",
    "data/**",
    "training_required_pack/**",
    "newdevmodel/**",
  ]),
]);

export default eslintConfig;
