// functions/eslint.config.js
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    // Global ignores
    ignores: [
      "lib/**", // Build output
      "node_modules/**",
      "eslint.config.js", // Ignore self if linting project root
    ],
  },
  {
    // Base configuration for TypeScript files in src/
    files: ["src/**/*.ts"],
    languageOptions: {
      ecmaVersion: 2021, // Or latest like 2022
      sourceType: "module",
      parserOptions: {
        project: true, // Enable rules requiring type information
        tsconfigRootDir: import.meta.dirname, // Correctly locate tsconfig.json
      },
      globals: {
        ...globals.node, // Add node environment globals
      },
    },
    // Start with recommended TypeScript rules
    // Then add rules requiring type checking
    extends: [
      ...tseslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      // Consider adding stylistic rules later if desired:
      // ...tseslint.configs.stylistic
    ],
    rules: {
      // --- Recommended Overrides & Additions ---
      // Warn on floating promises (crucial for Firebase Functions)
      "@typescript-eslint/no-floating-promises": "warn",
      // Warn on unused variables (ignoring those starting with _)
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      // Allow explicit any, but maybe warn later
      "@typescript-eslint/no-explicit-any": "off",
      // Allow require statements (needed for commonjs dynamic imports sometimes)
      "@typescript-eslint/no-var-requires": "off",
      // Enforce double quotes for consistency
      "quotes": ["warn", "double"],
      // Add any other project-specific rules here
    },
  }
  // You could add more specific configs here, e.g., for test files
);
