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
  ]),
  {
    // Extension content scripts share globals through the manifest's script
    // list rather than imports, so cross-file references look unused here.
    files: ["extension/**/*.js"],
    languageOptions: {
      globals: { chrome: "readonly", TRO_I18N: "readonly", TRO_SITES: "readonly" },
    },
    rules: { "@typescript-eslint/no-unused-vars": "off" },
  },
]);

export default eslintConfig;
