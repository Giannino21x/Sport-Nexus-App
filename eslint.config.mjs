import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Design handoff bundle — Originals des Designers, nicht unser Code.
    ".design-bundle/**",
    // Reverse-engineering helper scripts — dürfen lockerer sein.
    "scripts/**",
    "supabase/seed/**",
  ]),
  // Daten-Hooks (Supabase fetch + setState in Effect) sind ein bewusstes Pattern.
  // React-19-strict-Rules würden ein vollständiges react-query/SWR-Setup
  // verlangen — out of scope für jetzt. Lokal abschalten, damit echte Bugs
  // sichtbar bleiben.
  {
    files: ["lib/hooks.ts", "components/settings-context.tsx"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/static-components": "off",
    },
  },
]);

export default eslintConfig;
