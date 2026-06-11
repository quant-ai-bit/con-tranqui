import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "@next/next/no-img-element": "off"
    }
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/generated/**",
    "uploads/**",
    "reports/**",
    "node_modules/**",
    "dev.db",
    "test_*.mjs",
    "test_*.js",
    "inspect_docx.py",
    "extract_template_styles.py"
  ]),
]);

export default eslintConfig;


