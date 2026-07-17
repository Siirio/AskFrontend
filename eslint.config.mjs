import path from "node:path";

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
const SLICES =
  "auth|search|catalog|services|chats|requests|profile|business-cabinet";
const SLICE_SET = new Set(SLICES.split("|"));
const TOOLBOX = new Set(["shared", "design-system", "lib"]);

/**
 * The R4 "element" a path belongs to — one slice, `app/`, or one toolbox folder
 * — taken from the segment after the LAST `/src/` (so the identical logic maps
 * both the real tree and the `lint-fixtures/src/` proof tree). null = outside
 * every known element.
 */
function elementOf(absPath) {
  const norm = absPath.replace(/\\/g, "/");
  const idx = norm.lastIndexOf("/src/");
  if (idx === -1) return null;
  const seg = norm.slice(idx + "/src/".length).split("/")[0];
  if (!seg) return null;
  if (seg === "app") return "app";
  if (SLICE_SET.has(seg) || TOOLBOX.has(seg)) return seg;
  return null;
}

/**
 * R4 teeth (§4). A relative import may stay WITHIN an element, but crossing
 * elements MUST use the `@/` alias. Off-the-shelf rules cannot express this — a
 * `../` inside a slice is legal — and a relative escape to a *legal* target
 * slips past `boundaries/dependencies`, which classifies by resolved path, not
 * by how the import is written. This custom rule closes exactly that gap, and
 * is proven, not assumed (lint-fixtures/src/auth/bad-r4-relative-escape.ts).
 */
const noCrossElementRelativeImport = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Cross-element imports must use the @/ alias, not a relative path (R4)",
    },
    schema: [],
    messages: {
      crossElement:
        "R4: cross-element import must use the '@/' alias, not a relative path — '{{source}}' reaches from '{{fromEl}}' into '{{toEl}}'.",
    },
  },
  create(context) {
    const filename = context.filename ?? context.getFilename();
    const fromEl = elementOf(filename);
    if (!fromEl) return {};

    function check(source) {
      const value = source && source.value;
      if (typeof value !== "string" || !value.startsWith(".")) return;
      const toEl = elementOf(path.resolve(path.dirname(filename), value));
      if (toEl && toEl !== fromEl) {
        context.report({
          node: source,
          messageId: "crossElement",
          data: { source: value, fromEl, toEl },
        });
      }
    }

    return {
      ImportDeclaration: (node) => check(node.source),
      ExportNamedDeclaration: (node) => node.source && check(node.source),
      ExportAllDeclaration: (node) => node.source && check(node.source),
      ImportExpression: (node) =>
        node.source && node.source.type === "Literal" && check(node.source),
    };
  },
};

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
      local: {
        rules: {
          "no-cross-element-relative-import": noCrossElementRelativeImport,
        },
      },
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
      // R4 teeth — a relative import that escapes its element to a LEGAL target
      // is invisible to boundaries/dependencies; this catches it (custom rule).
      "local/no-cross-element-relative-import": "error",
    },
  },
];
