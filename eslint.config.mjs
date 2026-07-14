import tsParser from "@typescript-eslint/parser";
import boundaries from "eslint-plugin-boundaries";
import importPlugin from "eslint-plugin-import";

/**
 * Import laws R1–R5 — ARCHITECTURE_PATTERN_FRONTEND.md §4, enforced per §8.
 *
 * Element patterns are anchored with a leading `**` so the SAME settings and
 * rules govern both the real tree (`src/…`) and the proof tree
 * (`lint-fixtures/src/…`). §8: the config must be proven, not assumed —
 * `npm run lint:fixtures` asserts ESLint FAILS on every fixture.
 *
 * The slice list MUST stay in sync with architecture §2; `boundaries/no-unknown-dependencies`
 * and `boundaries/no-unknown-files` turn a forgotten sync into a lint error.
 */
const SLICES = "auth|search|catalog|services|chats|requests|profile|business-cabinet";

export default [
  {
    files: ["src/**/*.{ts,tsx}", "lint-fixtures/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module",
    },
    plugins: {
      boundaries,
      import: importPlugin,
    },
    settings: {
      "import/resolver": {
        typescript: {
          project: ["./tsconfig.json", "./lint-fixtures/tsconfig.json"],
          noWarnOnMultipleProjects: true,
        },
      },
      // import/no-cycle traverses imported modules; it needs to know how to
      // parse .ts/.tsx files it visits.
      "import/parsers": {
        "@typescript-eslint/parser": [".ts", ".tsx"],
      },
      "import/extensions": [".ts", ".tsx"],
      "boundaries/elements": [
        { type: "app", pattern: "**/src/app" },
        { type: "slice", pattern: `**/src/(${SLICES})`, capture: ["slice"] },
        { type: "shared", pattern: "**/src/(shared|design-system|lib)" },
      ],
    },
    rules: {
      // R1 (downward only) + R2 (cross-slice via index.ts only) + R3 (no
      // slice imports app/), in the plugin's ONE canonical rule.
      // eslint-plugin-boundaries v7 folded §8's "element-types" and
      // "entry-point" rules into "dependencies" (both old names are
      // deprecated, entry-point is removed in v8); the laws are unchanged —
      // see the dated §8 note in ARCHITECTURE_PATTERN_FRONTEND.md.
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          policies: [
            {
              from: { element: { type: "app" } },
              allow: [
                { element: { type: "app" } },
                { element: { type: "shared" } },
                // …slices only through the door (R2), even for app
                { element: { type: "slice", fileInternalPath: "index.ts" } },
              ],
            },
            {
              from: { element: { type: "slice" } },
              allow: [
                { element: { type: "shared" } },
                // cross-slice allowed… but only via the slice's index.ts (R2)
                { element: { type: "slice", fileInternalPath: "index.ts" } },
              ],
            },
            {
              from: { element: { type: "shared" } },
              allow: [{ element: { type: "shared" } }],
            },
          ],
        },
      ],
      // §10 teeth — a file outside every element / an unlisted top-level folder
      // (v7 canonical name for §8's "boundaries/no-unknown")
      "boundaries/no-unknown-files": "error",
      "boundaries/no-unknown-dependencies": "error",
      // R5 teeth — boundaries cannot detect cycles
      "import/no-cycle": ["error", { maxDepth: 4 }],
    },
  },
];
